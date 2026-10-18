import { createHash } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { sqlTimestamp } from "../worker/lib/clock.ts";
import { CACHE_DAYS } from "../worker/lib/search.ts";
import type { Db, Statement } from "./d1.ts";
import { anchors, extractEmails, extractPrograms, scoreLink, type ContactCandidate, type ProgramCandidate } from "./extract.ts";
import type { PoliteFetcher } from "./fetcher.ts";
import { fieldMatcher, type FieldMatcher } from "./fields.ts";
import type { Institution } from "./wikidata.ts";

export interface SearchJob {
  search_key: string;
  country: string;
  country_code: string;
  field: string;
  attempts: number;
}

export interface CrawlOptions {
  maxUniversities: number;
  maxPagesPerUniversity: number;
  concurrency: number;
  outputDir?: string;
  now?: () => number;
  institutions: (countryCode: string, limit: number) => Promise<Institution[]>;
}

export interface UniversityResult {
  institution: Institution;
  programs: ProgramCandidate[];
  contacts: ContactCandidate[];
  pages: number;
}

const EMPTY_RESULT_DAYS = 7;

function hash(s: string, len = 16): string {
  return createHash("sha1").update(s).digest("hex").slice(0, len);
}

export async function crawlUniversity(fetcher: PoliteFetcher, inst: Institution, matcher: FieldMatcher, maxPages: number): Promise<UniversityResult> {
  const queue: { url: string; score: number; depth: number }[] = [{ url: inst.website, score: 100, depth: 0 }];
  const seen = new Set<string>([inst.website]);
  const programs = new Map<string, ProgramCandidate>();
  const contacts = new Map<string, ContactCandidate>();
  let pages = 0;

  while (queue.length && pages < maxPages) {
    queue.sort((a, b) => b.score - a.score);
    const next = queue.shift()!;
    const page = await fetcher.get(next.url);
    if (!page) continue;
    pages++;

    for (const p of extractPrograms(page.html, page.url, matcher, inst.domain)) {
      const key = `${p.level}|${p.name.toLowerCase()}`;
      if (!programs.has(key)) programs.set(key, p);
    }
    for (const c of extractEmails(page.html, page.url, inst.domain)) {
      if (!contacts.has(c.email)) contacts.set(c.email, c);
    }
    if (next.depth >= 2) continue;
    for (const a of anchors(page.html, page.url)) {
      const url = a.href.split("#")[0];
      if (seen.has(url)) continue;
      const score = scoreLink(a, inst.domain, matcher);
      if (score <= 0) continue;
      seen.add(url);
      queue.push({ url, score: score - next.depth, depth: next.depth + 1 });
    }
  }

  const sortedContacts = [...contacts.values()].sort((a, b) => (a.type === b.type ? 0 : a.type === "role" ? -1 : 1)).slice(0, 5);
  return { institution: inst, programs: [...programs.values()].slice(0, 60), contacts: sortedContacts, pages };
}

async function pool<T, R>(items: T[], size: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let i = 0;
  const workers = Array.from({ length: Math.min(size, items.length) }, async () => {
    while (i < items.length) {
      const idx = i++;
      out[idx] = await fn(items[idx]);
    }
  });
  await Promise.all(workers);
  return out;
}

export async function runSearch(db: Db, fetcher: PoliteFetcher, job: SearchJob, opts: CrawlOptions) {
  const now = opts.now ?? Date.now;
  const matcher = fieldMatcher(job.field);
  const institutions = await opts.institutions(job.country_code, opts.maxUniversities);
  const results = await pool(institutions, opts.concurrency, (inst) =>
    crawlUniversity(fetcher, inst, matcher, opts.maxPagesPerUniversity).catch(() => ({ institution: inst, programs: [], contacts: [], pages: 0 })),
  );
  const useful = results.filter((r) => r.programs.length > 0);
  const stamp = sqlTimestamp(now());
  const pages = results.reduce((n, r) => n + r.pages, 0);

  const uniStatements: Statement[] = useful.map((r) => ({
    sql: `INSERT INTO universities (id, name, country, country_code, city, website, domain, source_url, source_type, last_verified)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'wikidata+official_website', ?)
          ON CONFLICT(domain) DO UPDATE SET last_verified = excluded.last_verified, country_code = excluded.country_code,
            city = CASE WHEN universities.city = '' THEN excluded.city ELSE universities.city END`,
    params: [
      `univ_${hash(r.institution.domain, 12)}`,
      r.institution.name,
      job.country,
      job.country_code,
      r.institution.city,
      r.institution.website,
      r.institution.domain,
      `https://www.wikidata.org/wiki/${r.institution.qid}`,
      stamp,
    ],
  }));
  await db.batch(uniStatements);

  const ids = new Map<string, string>();
  for (let i = 0; i < useful.length; i += 50) {
    const domains = useful.slice(i, i + 50).map((r) => r.institution.domain);
    const { results: rows } = await db.query<{ id: string; domain: string; name: string }>(
      `SELECT id, domain, name FROM universities WHERE domain IN (${domains.map(() => "?").join(", ")})`,
      domains,
    );
    for (const row of rows) ids.set(row.domain, row.id);
  }

  const snapshot: Record<string, unknown>[] = [];
  const programStatements: Statement[] = [];
  const contactStatements: Statement[] = [];
  for (const r of useful) {
    const uniId = ids.get(r.institution.domain);
    if (!uniId) continue;
    for (const p of r.programs) {
      const id = `prog_${hash(`${r.institution.domain}|${p.level}|${p.name.toLowerCase()}`)}`;
      programStatements.push({
        sql: `INSERT INTO programs (id, university_id, name, level, original_degree, department, language, duration_months, tuition, deadline,
                requirements, program_url, admissions_url, subject_category, application_mode, source_url, source_type, last_verified)
              VALUES (?, ?, ?, ?, ?, NULL, ?, NULL, NULL, NULL, NULL, ?, NULL, ?, 'portal_and_email', ?, 'official_website', ?)
              ON CONFLICT(id) DO UPDATE SET name = excluded.name, program_url = excluded.program_url, source_url = excluded.source_url,
                language = COALESCE(excluded.language, programs.language), last_verified = excluded.last_verified,
                subject_category = CASE WHEN programs.subject_category IS NULL OR programs.subject_category = '' THEN excluded.subject_category
                  WHEN instr(LOWER(programs.subject_category), LOWER(excluded.subject_category)) > 0
                  THEN programs.subject_category ELSE programs.subject_category || ', ' || excluded.subject_category END`,
        params: [id, uniId, p.name, p.level, p.degree, p.language, p.url, matcher.field, p.url, stamp],
      });
      snapshot.push({
        id,
        university_id: uniId,
        university_name: r.institution.name,
        city: r.institution.city,
        domain: r.institution.domain,
        website: r.institution.website,
        name: p.name,
        level: p.level,
        original_degree: p.degree,
        language: p.language,
        program_url: p.url,
      });
    }
    for (const c of r.contacts) {
      contactStatements.push({
        sql: `INSERT INTO contacts (id, university_id, department, name, role, email, email_type, phone, source_url, fetched_at)
              VALUES (?, ?, NULL, ?, ?, ?, ?, NULL, ?, ?)
              ON CONFLICT(university_id, email) DO UPDATE SET source_url = excluded.source_url, fetched_at = excluded.fetched_at`,
        params: [`cnt_${hash(`${uniId}|${c.email}`)}`, uniId, c.name, c.role, c.email, c.type, c.sourceUrl, stamp],
      });
    }
  }
  await db.batch(programStatements);
  await db.batch(contactStatements);

  const days = snapshot.length ? CACHE_DAYS : EMPTY_RESULT_DAYS;
  const summary = {
    search_key: job.search_key,
    country: job.country,
    country_code: job.country_code,
    field: job.field,
    fetched_at: stamp,
    institutions_checked: institutions.length,
    institutions_with_programs: useful.length,
    pages_inspected: pages,
    programs: snapshot,
  };
  await db.query(
    `UPDATE search_cache SET status = 'ready', results_json = ?, institutions_count = ?, programs_count = ?, pages_inspected = ?,
       fetched_at = ?, expires_at = ?, last_error = ? WHERE search_key = ?`,
    [
      JSON.stringify(summary),
      useful.length,
      snapshot.length,
      pages,
      stamp,
      sqlTimestamp(now() + days * 86400_000),
      snapshot.length ? null : `No ${job.field} programmes found on ${institutions.length} university websites.`,
      job.search_key,
    ],
  );

  if (opts.outputDir) {
    mkdirSync(opts.outputDir, { recursive: true });
    writeFileSync(join(opts.outputDir, `${job.search_key.replace(/[^a-z0-9]+/gi, "_")}.json`), JSON.stringify(summary, null, 2));
  }
  return summary;
}

export async function claimNext(db: Db, now: number): Promise<SearchJob | null> {
  await db.query(
    "UPDATE search_cache SET status = 'pending' WHERE status = 'running' AND claimed_at < ?",
    [sqlTimestamp(now - 45 * 60_000)],
  );
  const { results } = await db.query<SearchJob>(
    "SELECT search_key, country, country_code, field, attempts FROM search_cache WHERE status = 'pending' ORDER BY requested_at ASC LIMIT 1",
  );
  const job = results[0];
  if (!job) return null;
  const { changes } = await db.query(
    "UPDATE search_cache SET status = 'running', claimed_at = ?, attempts = attempts + 1 WHERE search_key = ? AND status = 'pending'",
    [sqlTimestamp(now), job.search_key],
  );
  return changes === 1 ? { ...job, attempts: job.attempts + 1 } : null;
}

export async function failJob(db: Db, job: SearchJob, message: string): Promise<void> {
  await db.query("UPDATE search_cache SET status = ?, last_error = ? WHERE search_key = ?", [
    job.attempts >= 3 ? "failed" : "pending",
    message.slice(0, 500),
    job.search_key,
  ]);
}
