import { createHash } from "node:crypto";
import { gzipSync } from "node:zlib";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { sqlTimestamp } from "../worker/lib/clock.ts";
import { countryName } from "./countries.ts";
import { isLimitError, type Db, type Statement } from "./d1.ts";
import type { PoliteFetcher } from "./fetcher.ts";
import { anyFieldMatcher, classifySubjects } from "./fields.ts";
import { crawlUniversity, pool } from "./job.ts";
import { addToSearch, removeFromSearch, searchableSubjects, UNRANKED } from "./searchIndex.ts";
import type { Institution } from "./wikidata.ts";

const DAY = 86400_000;
export const REFRESH_DAYS = 100;

function hash(s: string, len = 16): string {
  return createHash("sha1").update(s).digest("hex").slice(0, len);
}

export function universityId(domain: string): string {
  return `univ_${hash(domain, 12)}`;
}

export function programId(domain: string, level: string, name: string): string {
  return `prog_${hash(`${domain}|${level}|${name.toLowerCase()}`)}`;
}

export class WriteBudget {
  private db: Db;
  private day: string;
  private limit: number;
  private base: number;
  private manual = 0;
  private saved = 0;
  used = 0;

  constructor(db: Db, now: number, limit: number) {
    this.db = db;
    this.day = new Date(now).toISOString().slice(0, 10);
    this.limit = limit;
    this.base = db.rowsWritten?.() ?? 0;
  }

  spent(): number {
    const metered = this.db.rowsWritten?.();
    return (metered === undefined ? this.manual : metered - this.base) - this.saved;
  }

  async load(): Promise<void> {
    const { results } = await this.db.query<{ rows_written: number }>("SELECT rows_written FROM crawl_budget WHERE day = ?", [this.day]);
    this.used = Number(results[0]?.rows_written ?? 0);
  }

  remaining(): number {
    return this.limit - this.used - this.spent();
  }

  add(rows: number): void {
    this.manual += rows;
  }

  async save(): Promise<void> {
    const spent = this.spent();
    if (spent <= 0) return;
    await this.db.query(
      `INSERT INTO crawl_budget (day, rows_written) VALUES (?, ?)
       ON CONFLICT(day) DO UPDATE SET rows_written = crawl_budget.rows_written + excluded.rows_written`,
      [this.day, spent],
    );
    this.used += spent;
    this.saved += spent;
  }
}

async function run(db: Db, budget: WriteBudget, statements: Statement[]): Promise<void> {
  if (!statements.length) return;
  await db.batch(statements);
  budget.add(statements.length);
}

export async function importCountries(
  db: Db,
  budget: WriteBudget,
  codes: string[],
  fetchInstitutions: (code: string, limit: number) => Promise<Institution[]>,
  now: number,
  log: (msg: string) => void = () => {},
): Promise<number> {
  const { results: known } = await db.query<{ country_code: string; imported_at: string | null }>(
    "SELECT country_code, imported_at FROM crawl_countries",
  );
  const importedAt = new Map(known.map((r) => [r.country_code, r.imported_at]));
  const due = codes.filter((c) => {
    const at = importedAt.get(c);
    return !at || at <= sqlTimestamp(now - REFRESH_DAYS * DAY);
  });

  let imported = 0;
  for (const code of due) {
    if (budget.remaining() < 2000) break;
    let list: Institution[];
    try {
      list = await fetchInstitutions(code, 5000);
    } catch (err) {
      log(`Skipped ${code}: ${err instanceof Error ? err.message : err}`);
      continue;
    }
    const name = countryName(code);
    const stamp = sqlTimestamp(now);
    const statements: Statement[] = [];
    for (const inst of list) {
      const id = universityId(inst.domain);
      statements.push({
        sql: `INSERT INTO universities (id, name, country, country_code, city, website, domain, source_url, source_type, last_verified)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'wikidata', NULL)
              ON CONFLICT(domain) DO UPDATE SET country_code = excluded.country_code,
                city = CASE WHEN universities.city = '' THEN excluded.city ELSE universities.city END`,
        params: [id, inst.name, name, code, inst.city, inst.website, inst.domain, `https://www.wikidata.org/wiki/${inst.qid}`],
      });
      statements.push({
        sql: `INSERT INTO institution_queue (domain, university_id, qid, name, country_code, website, students, status)
              VALUES (?, (SELECT id FROM universities WHERE domain = ?), ?, ?, ?, ?, ?, 'pending')
              ON CONFLICT(domain) DO UPDATE SET qid = excluded.qid, name = excluded.name, website = excluded.website,
                students = excluded.students, country_code = excluded.country_code`,
        params: [inst.domain, inst.domain, inst.qid, inst.name, code, inst.website, inst.students],
      });
    }
    statements.push({
      sql: `INSERT INTO crawl_countries (country_code, country, institutions_total, imported_at) VALUES (?, ?, ?, ?)
            ON CONFLICT(country_code) DO UPDATE SET country = excluded.country, institutions_total = excluded.institutions_total,
              imported_at = excluded.imported_at`,
      params: [code, name, list.length, stamp],
    });
    await run(db, budget, statements);
    await budget.save();
    imported++;
    log(`Imported ${list.length} institutions for ${name}`);
  }
  return imported;
}

export interface QueueRow {
  domain: string;
  university_id: string;
  qid: string | null;
  name: string;
  country_code: string;
  website: string;
  students: number | null;
  attempts: number;
  last_crawled_at?: string | null;
  programs_found?: number | null;
  tags?: string | null;
}

export type BulkMode = "tags" | "full";

export function parseTags(raw: string | null | undefined): Record<string, string[]> {
  try {
    const v = raw ? JSON.parse(raw) : {};
    return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, string[]>) : {};
  } catch {
    return {};
  }
}

export function tagsFrom(programs: { name: string; level: string }[]): Record<string, string[]> {
  const out: Record<string, Set<string>> = {};
  for (const p of programs) {
    for (const subject of classifySubjects(p.name)) (out[subject] ??= new Set()).add(p.level);
  }
  return Object.fromEntries(Object.entries(out).map(([k, v]) => [k, [...v].sort()]));
}

export function rankFallback(students: number | null | undefined): number {
  return UNRANKED + 900_000 - Math.min(Math.max(Number(students) || 0, 0), 899_999);
}

export async function claimInstitutions(db: Db, limit: number, now: number): Promise<QueueRow[]> {
  const stamp = sqlTimestamp(now);
  await db.query("UPDATE institution_queue SET status = 'pending' WHERE status = 'running' AND claimed_at < ?", [
    sqlTimestamp(now - 2 * 3600_000),
  ]);
  const cols = "domain, university_id, qid, name, country_code, website, students, attempts, last_crawled_at, programs_found, tags";
  const { results } = await db.query<QueueRow>(
    `SELECT ${cols} FROM institution_queue INDEXED BY idx_iq_pending WHERE status = 'pending' ORDER BY students DESC LIMIT ?`,
    [limit],
  );
  if (results.length < limit) {
    for (const status of ["failed", "done"]) {
      const { results: due } = await db.query<QueueRow>(
        `SELECT ${cols} FROM institution_queue WHERE status = ? AND next_crawl_at <= ? ORDER BY next_crawl_at LIMIT ?`,
        [status, stamp, limit - results.length],
      );
      results.push(...due);
      if (results.length >= limit) break;
    }
  }
  if (!results.length) return [];
  await db.query(
    `UPDATE institution_queue SET status = 'running', claimed_at = ? WHERE domain IN (${results.map(() => "?").join(", ")})`,
    [stamp, ...results.map((r) => r.domain)],
  );
  return results;
}

interface ExistingProgram {
  id: string;
  name: string;
  level: string;
  original_degree: string | null;
  language: string | null;
  program_url: string | null;
  subject_category: string | null;
  source_type: string | null;
  removed_at: string | null;
}

export interface InstitutionOutcome {
  domain: string;
  countryCode: string;
  pages: number;
  found: number;
  inserted: number;
  updated: number;
  removed: number;
  writes: number;
}

export async function crawlInstitution(
  db: Db,
  fetcher: PoliteFetcher,
  row: QueueRow,
  opts: { maxPages: number; maxPrograms: number; now: number; mode?: BulkMode },
): Promise<InstitutionOutcome> {
  const stamp = sqlTimestamp(opts.now);
  const inst: Institution = { qid: row.qid ?? "", name: row.name, website: row.website, domain: row.domain, city: "", students: row.students };
  const result = await crawlUniversity(fetcher, inst, anyFieldMatcher, opts.maxPages, opts.maxPrograms).catch(() => ({
    institution: inst,
    programs: [],
    contacts: [],
    pages: 0,
  }));

  const statements: Statement[] = [];
  const outcome: InstitutionOutcome = { domain: row.domain, countryCode: row.country_code, pages: result.pages, found: result.programs.length, inserted: 0, updated: 0, removed: 0, writes: 0 };

  const coverageUpdate = (programsFound: number): Statement => ({
    sql: `UPDATE crawl_countries SET institutions_checked = COALESCE(institutions_checked, 0) + ?,
            institutions_with_programs = MAX(0, COALESCE(institutions_with_programs, 0) + ?), last_update = ? WHERE country_code = ?`,
    params: [row.last_crawled_at ? 0 : 1, (programsFound > 0 ? 1 : 0) - ((row.programs_found ?? 0) > 0 ? 1 : 0), stamp, row.country_code],
  });

  if (result.pages === 0) {
    const attempts = row.attempts + 1;
    statements.push(coverageUpdate(row.programs_found ?? 0));
    statements.push({
      sql: `UPDATE institution_queue SET status = 'failed', attempts = ?, last_crawled_at = ?, next_crawl_at = ?, pages = 0,
              last_error = 'Website could not be fetched (offline, blocked or robots.txt)' WHERE domain = ?`,
      params: [attempts, stamp, sqlTimestamp(opts.now + (attempts < 3 ? 1 : REFRESH_DAYS) * DAY), row.domain],
    });
    await db.batch(statements);
    outcome.writes = statements.length;
    return outcome;
  }

  let tags = parseTags(row.tags);
  if ((opts.mode ?? "full") === "tags") {
    const found = tagsFrom(result.programs);
    const next: Record<string, string[]> = { ...tags };
    for (const [subject, levels] of Object.entries(found)) {
      const merged = [...new Set([...(tags[subject] ?? []), ...levels])].sort();
      if (tags[subject] && merged.join(",") === [...tags[subject]].sort().join(",")) continue;
      statements.push({
        sql: `INSERT INTO university_subjects (country_code, subject, university_id, rank_sort, levels)
              SELECT ?, ?, id, COALESCE(ranking, ?), ? FROM universities WHERE id = ?
              ON CONFLICT(country_code, subject, university_id) DO UPDATE SET levels = excluded.levels`,
        params: [row.country_code, subject, rankFallback(row.students), merged.join(","), row.university_id],
      });
      if (!tags[subject]) outcome.inserted++;
      else outcome.updated++;
      next[subject] = merged;
    }
    tags = next;
  } else {
    const { results: existing } = await db.query<ExistingProgram>(
      `SELECT id, name, level, original_degree, language, program_url, subject_category, source_type, removed_at
       FROM programs WHERE university_id = ?`,
      [row.university_id],
    );
    const byId = new Map(existing.map((p) => [p.id, p]));
    const seen = new Set<string>();

    for (const p of result.programs) {
      const id = programId(row.domain, p.level, p.name);
      if (seen.has(id)) continue;
      seen.add(id);
      const subjects = classifySubjects(p.name).join(", ") || "Other";
      const prev = byId.get(id);
      const key = { id, universityId: row.university_id, countryCode: row.country_code, level: p.level };
      if (!prev) {
        statements.push({
          sql: `INSERT INTO programs (id, university_id, name, level, original_degree, department, language, duration_months, tuition, deadline,
                  requirements, program_url, admissions_url, subject_category, application_mode, source_url, source_type, last_verified, removed_at)
                VALUES (?, ?, ?, ?, ?, NULL, ?, NULL, NULL, NULL, NULL, ?, NULL, ?, 'portal_and_email', ?, 'official_website', ?, NULL)`,
          params: [id, row.university_id, p.name, p.level, p.degree, p.language, p.url, subjects, p.url, stamp],
        });
        statements.push(...addToSearch(key, searchableSubjects(subjects)));
        outcome.inserted++;
      } else if (
        prev.removed_at ||
        prev.name !== p.name ||
        prev.program_url !== p.url ||
        (prev.language ?? null) !== (p.language ?? prev.language ?? null) ||
        prev.subject_category !== subjects
      ) {
        statements.push({
          sql: `UPDATE programs SET name = ?, program_url = ?, source_url = ?, language = COALESCE(?, language), subject_category = ?,
                  last_verified = ?, removed_at = NULL WHERE id = ?`,
          params: [p.name, p.url, p.url, p.language, subjects, stamp, id],
        });
        if (prev.removed_at || prev.subject_category !== subjects) {
          const before = prev.removed_at ? [] : searchableSubjects(prev.subject_category);
          const after = searchableSubjects(subjects);
          statements.push(...removeFromSearch(key, before.filter((s) => !after.includes(s))));
          statements.push(...addToSearch(key, after.filter((s) => !before.includes(s))));
        }
        outcome.updated++;
      }
    }

    if (result.programs.length > 0 && result.pages >= 2) {
      const gone = existing.filter((p) => p.source_type === "official_website" && !p.removed_at && !seen.has(p.id));
      for (const p of gone) {
        statements.push({ sql: "UPDATE programs SET removed_at = ? WHERE id = ?", params: [stamp, p.id] });
        statements.push(...removeFromSearch({ id: p.id, countryCode: row.country_code, level: p.level }, searchableSubjects(p.subject_category)));
      }
      outcome.removed = gone.length;
    }
  }

  if (result.contacts.length) {
    const { results: known } = await db.query<{ email: string }>("SELECT email FROM contacts WHERE university_id = ?", [row.university_id]);
    const have = new Set(known.map((k) => k.email));
    for (const c of result.contacts) {
      if (have.has(c.email)) continue;
      statements.push({
        sql: `INSERT INTO contacts (id, university_id, department, name, role, email, email_type, phone, source_url, fetched_at)
              VALUES (?, ?, NULL, ?, ?, ?, ?, NULL, ?, ?) ON CONFLICT(university_id, email) DO NOTHING`,
        params: [`cnt_${hash(`${row.university_id}|${c.email}`)}`, row.university_id, c.name, c.role, c.email, c.type, c.sourceUrl, stamp],
      });
    }
  }

  const jitterDays = parseInt(hash(row.domain, 4), 16) % 4;
  statements.push({ sql: "UPDATE universities SET last_verified = ? WHERE id = ?", params: [stamp, row.university_id] });
  statements.push(coverageUpdate(result.programs.length));
  statements.push({
    sql: `UPDATE institution_queue SET status = 'done', attempts = 0, last_crawled_at = ?, next_crawl_at = ?, programs_found = ?,
            pages = ?, last_error = ?, tags = ? WHERE domain = ?`,
    params: [
      stamp,
      sqlTimestamp(opts.now + (REFRESH_DAYS + jitterDays) * DAY),
      result.programs.length,
      result.pages,
      result.programs.length ? null : "No programmes recognised on the pages visited",
      Object.keys(tags).length ? JSON.stringify(tags) : row.tags ?? null,
      row.domain,
    ],
  });

  await db.batch(statements);
  outcome.writes = statements.length;
  return outcome;
}

export async function markCountriesChanged(db: Db, budget: WriteBudget, codes: Iterable<string>, now: number): Promise<void> {
  const list = [...new Set(codes)];
  if (!list.length) return;
  await run(db, budget, [
    {
      sql: `UPDATE crawl_countries SET changed_at = ? WHERE country_code IN (${list.map(() => "?").join(", ")})`,
      params: [sqlTimestamp(now), ...list],
    },
  ]);
}

export async function writeSnapshots(db: Db, budget: WriteBudget, outputDir: string, now: number, log: (m: string) => void = () => {}): Promise<string[]> {
  const { results: due } = await db.query<{ country_code: string; country: string }>(
    `SELECT country_code, country FROM crawl_countries
     WHERE changed_at IS NOT NULL AND (snapshot_at IS NULL OR snapshot_at < changed_at) AND (snapshot_at IS NULL OR snapshot_at < ?)`,
    [sqlTimestamp(now - DAY + 3600_000)],
  );
  const dir = join(outputDir, "snapshots");
  mkdirSync(dir, { recursive: true });
  const written: string[] = [];

  for (const c of due) {
    const { results: universities } = await db.query<Record<string, unknown>>(
      `SELECT id, name, city, website, domain, last_verified FROM universities WHERE country_code = ? ORDER BY name`,
      [c.country_code],
    );
    const programs: Record<string, unknown>[] = [];
    for (let offset = 0; ; offset += 5000) {
      const { results } = await db.query<Record<string, unknown>>(
        `SELECT p.id, p.university_id, p.name, p.level, p.original_degree, p.language, p.subject_category AS subjects,
                p.program_url, p.source_type, p.last_verified
         FROM programs p JOIN universities u ON p.university_id = u.id
         WHERE u.country_code = ? AND p.removed_at IS NULL ORDER BY p.id LIMIT 5000 OFFSET ?`,
        [c.country_code, offset],
      );
      programs.push(...results);
      if (results.length < 5000) break;
    }
    const snapshot = {
      country_code: c.country_code,
      country: c.country,
      generated_at: sqlTimestamp(now),
      universities,
      programs,
    };
    const file = join(dir, `${c.country_code}.json.gz`);
    writeFileSync(file, gzipSync(JSON.stringify(snapshot)));
    await run(db, budget, [{ sql: "UPDATE crawl_countries SET snapshot_at = ? WHERE country_code = ?", params: [sqlTimestamp(now), c.country_code] }]);
    written.push(file);
    log(`Snapshot ${c.country_code}: ${universities.length} universities, ${programs.length} programmes`);
  }
  return written;
}

export interface BulkOptions {
  countries: string[];
  writeLimitPerDay: number;
  timeBudgetMs: number;
  batchSize: number;
  concurrency: number;
  maxPages: number;
  maxPrograms: number;
  mode?: BulkMode;
  outputDir: string;
  now?: () => number;
  institutions: (code: string, limit: number) => Promise<Institution[]>;
  log?: (msg: string) => void;
}

export async function runBulk(db: Db, fetcher: PoliteFetcher, opts: BulkOptions) {
  const now = opts.now ?? Date.now;
  const log = opts.log ?? (() => {});
  const started = now();
  const budget = new WriteBudget(db, started, opts.writeLimitPerDay);
  await budget.load();

  const imported = await importCountries(db, budget, opts.countries, opts.institutions, now(), log);
  const totals = { institutions: 0, programsFound: 0, inserted: 0, updated: 0, removed: 0, pages: 0 };
  const changed = new Set<string>();

  let perInstitution = 150;
  const reserve = () => Math.max(2000, opts.batchSize * perInstitution * 2);
  let hitLimit = false;
  while (now() - started < opts.timeBudgetMs && budget.remaining() > reserve()) {
    const before = budget.spent();
    const batch = await claimInstitutions(db, opts.batchSize, now());
    if (!batch.length) break;
    let outcomes: InstitutionOutcome[];
    try {
      outcomes = await pool(batch, opts.concurrency, (row) =>
        crawlInstitution(db, fetcher, row, { maxPages: opts.maxPages, maxPrograms: opts.maxPrograms, now: now(), mode: opts.mode }),
      );
    } catch (e) {
      if (!isLimitError(e)) throw e;
      log(`D1 refused writes (${(e as Error).message}); stopping until the daily limit resets.`);
      hitLimit = true;
      break;
    }
    for (const o of outcomes) {
      budget.add(o.writes);
      totals.institutions++;
      totals.programsFound += o.found;
      totals.inserted += o.inserted;
      totals.updated += o.updated;
      totals.removed += o.removed;
      totals.pages += o.pages;
      if (o.inserted || o.updated || o.removed) changed.add(o.countryCode);
    }
    perInstitution = Math.max(perInstitution, Math.ceil((budget.spent() - before) / batch.length));
    await budget.save();
    log(`Batch done: ${totals.institutions} institutions, +${totals.inserted} new, ${totals.updated} updated, ${totals.removed} removed`);
  }

  if (hitLimit) return { importedCountries: imported, ...totals, snapshots: [], writesToday: budget.used };
  if (budget.remaining() <= reserve()) log("Daily D1 write budget reached; continuing in the next run.");
  await db.query(
    `UPDATE institution_queue SET status = 'pending' WHERE status = 'running' AND claimed_at >= ?`,
    [sqlTimestamp(started)],
  );
  await markCountriesChanged(db, budget, changed, now());
  const snapshots = await writeSnapshots(db, budget, opts.outputDir, now(), log);
  await budget.save();
  return { importedCountries: imported, ...totals, snapshots, writesToday: budget.used };
}
