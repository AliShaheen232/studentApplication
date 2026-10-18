import type { Router } from "../router.ts";
import { FIELDS_OF_STUDY } from "../../core/discoveryData.ts";
import { analyzePage } from "../../crawler/extract.ts";
import { fieldMatcher, classifySubjects } from "../../crawler/fields.ts";
import { addToSearch } from "../../crawler/searchIndex.ts";
import { registrableDomain } from "../../crawler/wikidata.ts";
import { clock, sqlTimestamp } from "../lib/clock.ts";
import { error, json, readJson } from "../lib/http.ts";
import {
  fetchLivePage,
  LIVE_CLAIM_MINUTES,
  LIVE_FRESH_DAYS,
  LIVE_GLOBAL_DAY,
  LIVE_MAX_PAGES,
  LIVE_PAGE_SIZE,
  LIVE_PER_USER_DAY,
  sha1Hex,
} from "../lib/live.ts";
import { resolveCountry } from "../lib/search.ts";
import { requireAuth } from "../middleware.ts";
import type { D1PreparedStatement, Env } from "../types.ts";
import { coverage, STUDY_LEVELS } from "./catalog.ts";

const SUBJECTS = FIELDS_OF_STUDY.map((f) => f.name);
const DAY = 86400_000;

function pick(list: string[], value: unknown): string | null {
  const v = typeof value === "string" ? value.trim().toLowerCase() : "";
  return v ? (list.find((x) => x.toLowerCase() === v) ?? null) : null;
}

function dailyCap(env: Env): number {
  const n = Number(env.LIVE_CRAWLS_PER_DAY);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : LIVE_GLOBAL_DAY;
}

interface LiveRow {
  status: string | null;
  claimed_by: string | null;
  started_at: string | null;
  finished_at: string | null;
}

export function crawlState(row: LiveRow, now = clock.now()): "fresh" | "running" | "queued" | "stale" | "new" {
  if (row.status === "backup" || row.status === "backup_running") return "queued";
  if (row.status === "done" && row.finished_at && row.finished_at > sqlTimestamp(now - LIVE_FRESH_DAYS * DAY)) return "fresh";
  if (row.status === "running" && row.started_at && row.started_at > sqlTimestamp(now - LIVE_CLAIM_MINUTES * 60_000)) return "running";
  return row.finished_at ? "stale" : "new";
}

interface InstitutionRow extends LiveRow {
  id: string;
  name: string;
  city: string | null;
  website: string;
  domain: string;
  ranking: number | null;
  levels: string | null;
  tagged: number;
  programs_found: number | null;
}

const INSTITUTION_COLS = `u.id, u.name, u.city, u.website, u.domain, u.ranking,
  lc.status, lc.claimed_by, lc.started_at, lc.finished_at, lc.programs_found`;

export function registerLiveRoutes(router: Router): void {
  router.get("/api/discovery/institutions", async (c) => {
    const countryParam = (c.url.searchParams.get("country_code") || c.url.searchParams.get("country") || "").trim().slice(0, 100);
    const country = countryParam ? resolveCountry(countryParam) : null;
    const field = pick(SUBJECTS, c.url.searchParams.get("field"));
    const level = pick(STUDY_LEVELS, c.url.searchParams.get("level"));
    if (!country || !field || !level) return error(400, "Choose a destination country, field of study and study level.");
    const page = Math.min(Math.max(Math.floor(Number(c.url.searchParams.get("page")) || 0), 0), 200);
    const db = c.env.adminpath_prod_d1;
    const offset = page * LIVE_PAGE_SIZE;

    const taggedTotal = Number(
      (await db
        .prepare("SELECT COUNT(*) AS n FROM university_subjects WHERE country_code = ? AND subject = ? AND (levels IS NULL OR instr(levels, ?) > 0)")
        .bind(country.code, field, level)
        .first<{ n: number }>())?.n ?? 0,
    );

    const rows: InstitutionRow[] = [];
    if (offset < taggedTotal) {
      const { results } = await db
        .prepare(
          `SELECT ${INSTITUTION_COLS}, t.levels, 1 AS tagged FROM university_subjects t
           JOIN universities u ON u.id = t.university_id
           LEFT JOIN live_crawls lc ON lc.university_id = t.university_id AND lc.subject = t.subject
           WHERE t.country_code = ? AND t.subject = ? AND (t.levels IS NULL OR instr(t.levels, ?) > 0)
           ORDER BY t.rank_sort, t.university_id LIMIT ? OFFSET ?`,
        )
        .bind(country.code, field, level, LIVE_PAGE_SIZE, offset)
        .all<InstitutionRow>();
      rows.push(...results);
    }
    const need = LIVE_PAGE_SIZE - rows.length;
    const { results: untagged } = await db
      .prepare(
        `SELECT ${INSTITUTION_COLS}, NULL AS levels, 0 AS tagged FROM institution_queue q
         JOIN universities u ON u.id = q.university_id
         LEFT JOIN live_crawls lc ON lc.university_id = q.university_id AND lc.subject = ?
         WHERE q.country_code = ? AND q.status IN ('pending', 'running') AND q.last_crawled_at IS NULL
           AND NOT (COALESCE(lc.status, '') = 'done' AND COALESCE(lc.programs_found, 0) = 0)
         ORDER BY q.students DESC, q.domain LIMIT ? OFFSET ?`,
      )
      .bind(field, country.code, need + 1, Math.max(0, offset - taggedTotal))
      .all<InstitutionRow>();
    rows.push(...untagged.slice(0, need));
    const hasMore = offset + LIVE_PAGE_SIZE < taggedTotal || untagged.length > need;

    const byUni = new Map<string, Record<string, unknown>[]>();
    if (rows.length) {
      const { results: programs } = await db
        .prepare(
          `SELECT p.id, p.university_id, p.name, p.level, p.original_degree, p.language, p.tuition, p.deadline, p.program_url, p.last_verified
           FROM program_search s JOIN programs p ON p.id = s.program_id
           WHERE s.country_code = ? AND s.subject = ? AND s.level = ? AND p.removed_at IS NULL
             AND s.university_id IN (${rows.map(() => "?").join(", ")})
           ORDER BY p.name`,
        )
        .bind(country.code, field, level, ...rows.map((r) => r.id))
        .all<Record<string, unknown>>();
      for (const p of programs) {
        const list = byUni.get(String(p.university_id)) ?? [];
        list.push(p);
        byUni.set(String(p.university_id), list);
      }
    }

    const now = clock.now();
    return json({
      institutions: rows.map((r) => ({
        id: r.id,
        name: r.name,
        city: r.city,
        website: r.website,
        domain: r.domain,
        ranking: r.ranking,
        tagged: !!r.tagged,
        status: crawlState(r, now),
        checked_at: r.finished_at,
        programs: byUni.get(r.id) ?? [],
      })),
      page,
      page_size: LIVE_PAGE_SIZE,
      has_more: hasMore,
      filters: { country_code: country.code, country: country.name, field, level },
      coverage: await coverage(c.env, country.code),
    });
  });

  router.post("/api/discovery/live/start", requireAuth, async (c) => {
    const body = await readJson<{ university_id?: unknown; field?: unknown }>(c.req);
    const field = pick(SUBJECTS, body?.field);
    const universityId = typeof body?.university_id === "string" ? body.university_id.slice(0, 80) : "";
    if (!field || !universityId) return error(400, "Choose a university and a field of study.");
    const db = c.env.adminpath_prod_d1;
    const row = await db
      .prepare(
        `SELECT u.id, u.website, u.domain, lc.status, lc.claimed_by, lc.started_at, lc.finished_at, lc.pages
         FROM universities u LEFT JOIN live_crawls lc ON lc.university_id = u.id AND lc.subject = ? WHERE u.id = ?`,
      )
      .bind(field, universityId)
      .first<LiveRow & { id: string; website: string; domain: string; pages: number | null }>();
    if (!row) return error(404, "University not found.");
    let start: URL;
    try {
      start = new URL(row.website);
      if (start.protocol !== "https:" && start.protocol !== "http:") throw new Error("bad protocol");
    } catch {
      return error(422, "This university has no usable website.");
    }

    const state = crawlState(row);
    if (state === "fresh") return json({ status: "fresh" });
    if (state === "queued") return json({ status: "queued" });
    if (state === "running") {
      return row.claimed_by === c.user!.id
        ? json({ status: "started", start_url: start.toString(), pages: row.pages ?? 0, max_pages: LIVE_MAX_PAGES })
        : json({ status: "busy" });
    }

    const day = sqlTimestamp().slice(0, 10);
    const [global, mine] = await Promise.all([
      db.prepare("SELECT live_crawls FROM crawl_budget WHERE day = ?").bind(day).first<{ live_crawls: number | null }>(),
      db.prepare("SELECT discovery_searches FROM usage_ledger WHERE user_id = ? AND date = ?").bind(c.user!.id, day).first<{ discovery_searches: number | null }>(),
    ]);
    if (Number(global?.live_crawls ?? 0) >= dailyCap(c.env)) {
      return json({ status: "limit", error: "Today's live checks are used up. Saved results still show; new universities are checked tomorrow." }, 429);
    }
    if (Number(mine?.discovery_searches ?? 0) >= LIVE_PER_USER_DAY) {
      return json({ status: "limit", error: `You can check up to ${LIVE_PER_USER_DAY} universities a day. Saved results still show.` }, 429);
    }

    const now = sqlTimestamp();
    await db.batch([
      db
        .prepare(
          `INSERT INTO live_crawls (university_id, subject, status, claimed_by, started_at, pages, programs_found, rows_written, last_error)
           VALUES (?, ?, 'running', ?, ?, 0, 0, 0, NULL)
           ON CONFLICT(university_id, subject) DO UPDATE SET status = 'running', claimed_by = excluded.claimed_by,
             started_at = excluded.started_at, pages = 0, programs_found = 0, rows_written = 0, last_error = NULL`,
        )
        .bind(universityId, field, c.user!.id, now),
      db
        .prepare(
          `INSERT INTO crawl_budget (day, rows_written, live_crawls) VALUES (?, 0, 1)
           ON CONFLICT(day) DO UPDATE SET live_crawls = COALESCE(crawl_budget.live_crawls, 0) + 1`,
        )
        .bind(day),
      db
        .prepare(
          `INSERT INTO usage_ledger (id, user_id, date, discovery_searches, updated_at) VALUES (?, ?, ?, 1, ?)
           ON CONFLICT(user_id, date) DO UPDATE SET discovery_searches = COALESCE(usage_ledger.discovery_searches, 0) + 1,
             updated_at = excluded.updated_at`,
        )
        .bind(`use_${await sha1Hex(`${c.user!.id}|${day}`)}`, c.user!.id, day, now),
    ]);
    return json({ status: "started", start_url: start.toString(), pages: 0, max_pages: LIVE_MAX_PAGES });
  });

  router.post("/api/discovery/live/step", requireAuth, async (c) => {
    const body = await readJson<{ university_id?: unknown; field?: unknown; url?: unknown }>(c.req);
    const field = pick(SUBJECTS, body?.field);
    const universityId = typeof body?.university_id === "string" ? body.university_id.slice(0, 80) : "";
    const rawUrl = typeof body?.url === "string" ? body.url.slice(0, 2000) : "";
    if (!field || !universityId || !rawUrl) return error(400, "Missing university, field or page.");
    const db = c.env.adminpath_prod_d1;
    const row = await db
      .prepare(
        `SELECT u.id, u.domain, u.country_code, lc.status, lc.claimed_by, lc.started_at, lc.finished_at, lc.pages
         FROM live_crawls lc JOIN universities u ON u.id = lc.university_id WHERE lc.university_id = ? AND lc.subject = ?`,
      )
      .bind(universityId, field)
      .first<LiveRow & { id: string; domain: string; country_code: string; pages: number }>();
    if (!row || crawlState(row) !== "running" || row.claimed_by !== c.user!.id) {
      return json({ status: "not_claimed", error: "Start checking this university first." }, 409);
    }
    if (row.pages >= LIVE_MAX_PAGES) return json({ status: "done", pages: row.pages, max_pages: LIVE_MAX_PAGES });

    const site = registrableDomain(row.domain);
    let target: URL;
    try {
      target = new URL(rawUrl);
    } catch {
      return error(400, "Invalid page address.");
    }
    if ((target.protocol !== "https:" && target.protocol !== "http:") || registrableDomain(target.hostname) !== site) {
      return error(400, "Only pages on the university's own website can be checked.");
    }

    const page = await fetchLivePage(target, (host) => registrableDomain(host) === site);
    if (page.kind === "wait") return json({ status: "wait", retry_after_ms: page.ms });

    const stamp = sqlTimestamp();
    const statements: D1PreparedStatement[] = [];
    let programs: { id: string; name: string; level: string; degree: string; url: string; language: string | null }[] = [];
    let links: { url: string; score: number }[] = [];
    if (page.kind === "page") {
      const analysis = analyzePage(page.html, page.url, fieldMatcher(field), site);
      links = analysis.links.sort((a, b) => b.score - a.score).slice(0, 12);
      const unique = new Map<string, (typeof analysis.programs)[number]>();
      for (const p of analysis.programs) unique.set(`${p.level}|${p.name.toLowerCase()}`, p);
      programs = await Promise.all(
        [...unique.values()].slice(0, 12).map(async (p) => ({
          id: `prog_${await sha1Hex(`${row.domain}|${p.level}|${p.name.toLowerCase()}`)}`,
          name: p.name,
          level: p.level,
          degree: p.degree,
          url: p.url,
          language: p.language,
        })),
      );
      for (const p of programs) {
        const subjects = [...new Set([field, ...classifySubjects(p.name)])];
        statements.push(
          db
            .prepare(
              `INSERT INTO programs (id, university_id, name, level, original_degree, department, language, duration_months, tuition, deadline,
                 requirements, program_url, admissions_url, subject_category, application_mode, source_url, source_type, last_verified, removed_at)
               VALUES (?, ?, ?, ?, ?, NULL, ?, NULL, NULL, NULL, NULL, ?, NULL, ?, 'portal_and_email', ?, 'official_website', ?, NULL)
               ON CONFLICT(id) DO UPDATE SET removed_at = NULL, last_verified = excluded.last_verified WHERE programs.removed_at IS NOT NULL`,
            )
            .bind(p.id, row.id, p.name, p.level, p.degree, p.language, p.url, subjects.join(", "), p.url, stamp),
        );
        for (const s of addToSearch({ id: p.id, universityId: row.id, countryCode: row.country_code, level: p.level }, subjects)) {
          statements.push(db.prepare(s.sql).bind(...(s.params ?? [])));
        }
      }
      if (programs.length) {
        const tag = await db
          .prepare("SELECT levels FROM university_subjects WHERE country_code = ? AND subject = ? AND university_id = ?")
          .bind(row.country_code, field, row.id)
          .first<{ levels: string | null }>();
        const before = (tag?.levels ?? "").split(",").filter(Boolean);
        const merged = [...new Set([...before, ...programs.map((p) => p.level)])].sort();
        if (!tag || merged.join(",") !== [...before].sort().join(",")) {
          statements.push(
            db
              .prepare(
                `INSERT INTO university_subjects (country_code, subject, university_id, rank_sort, levels)
                 SELECT ?, ?, id, COALESCE(ranking, 100000), ? FROM universities WHERE id = ?
                 ON CONFLICT(country_code, subject, university_id) DO UPDATE SET levels = excluded.levels`,
              )
              .bind(row.country_code, field, merged.join(","), row.id),
          );
        }
      }
      for (const ct of analysis.contacts.slice(0, 3)) {
        statements.push(
          db
            .prepare(
              `INSERT INTO contacts (id, university_id, department, name, role, email, email_type, phone, source_url, fetched_at)
               VALUES (?, ?, NULL, ?, ?, ?, ?, NULL, ?, ?) ON CONFLICT(university_id, email) DO NOTHING`,
            )
            .bind(`cnt_${await sha1Hex(`${row.id}|${ct.email}`)}`, row.id, ct.name, ct.role, ct.email, ct.type, ct.sourceUrl, stamp),
        );
      }
    }

    let written = 0;
    if (statements.length) {
      for (const r of await db.batch(statements)) written += Number(r.meta?.rows_written ?? r.meta?.changes ?? 0);
    }
    await db
      .prepare(
        `UPDATE live_crawls SET pages = pages + 1, programs_found = programs_found + ?, rows_written = rows_written + ?,
           last_error = ? WHERE university_id = ? AND subject = ?`,
      )
      .bind(programs.length, written + 1, page.kind === "skip" ? page.reason : null, row.id, field)
      .run();

    return json({
      status: "ok",
      page_url: page.kind === "page" ? page.url : target.toString(),
      skipped: page.kind === "skip" ? page.reason : null,
      programs,
      links,
      pages: row.pages + 1,
      max_pages: LIVE_MAX_PAGES,
    });
  });

  router.post("/api/discovery/live/finish", requireAuth, async (c) => {
    const body = await readJson<{ university_id?: unknown; field?: unknown; failed_pages?: unknown }>(c.req);
    const field = pick(SUBJECTS, body?.field);
    const universityId = typeof body?.university_id === "string" ? body.university_id.slice(0, 80) : "";
    const failedPages = Math.min(Math.max(Math.floor(Number(body?.failed_pages) || 0), 0), LIVE_MAX_PAGES);
    if (!field || !universityId) return error(400, "Choose a university and a field of study.");
    const db = c.env.adminpath_prod_d1;
    const row = await db
      .prepare("SELECT status, claimed_by, started_at, finished_at, pages, programs_found, rows_written FROM live_crawls WHERE university_id = ? AND subject = ?")
      .bind(universityId, field)
      .first<LiveRow & { pages: number; programs_found: number; rows_written: number }>();
    if (!row || crawlState(row) !== "running" || row.claimed_by !== c.user!.id) {
      return json({ status: "not_claimed", error: "This university is not being checked by you." }, 409);
    }
    const now = sqlTimestamp();
    const status = failedPages > 0 && !row.programs_found ? "backup" : row.pages > 0 ? "done" : "failed";
    await db.batch([
      db
        .prepare("UPDATE live_crawls SET status = ?, finished_at = ?, last_error = COALESCE(?, last_error) WHERE university_id = ? AND subject = ?")
        .bind(status, now, status === "backup" ? `${failedPages} page(s) failed in the live check` : null, universityId, field),
      db
        .prepare(
          `INSERT INTO crawl_budget (day, rows_written, live_crawls) VALUES (?, ?, 0)
           ON CONFLICT(day) DO UPDATE SET rows_written = crawl_budget.rows_written + excluded.rows_written`,
        )
        .bind(now.slice(0, 10), Number(row.rows_written ?? 0) + 3),
    ]);
    return json({ status, programs_found: row.programs_found, pages: row.pages });
  });
}
