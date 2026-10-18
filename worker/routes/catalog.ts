import type { Router } from "../router.ts";
import { DESTINATION_COUNTRIES } from "../../core/destinations.ts";
import { FIELDS_OF_STUDY } from "../../core/discoveryData.ts";
import { clock, sqlTimestamp } from "../lib/clock.ts";
import { randomHex } from "../lib/crypto.ts";
import { error, json, readJson } from "../lib/http.ts";
import { requireAuth } from "../middleware.ts";
import { MAX_QUEUED_PER_DAY, resolveCountry, searchKey } from "../lib/search.ts";
import type { Env } from "../types.ts";

export interface SearchStatus {
  search_key: string;
  status: string;
  stale: boolean;
  fetched_at: string | null;
  expires_at: string | null;
  requested_at: string | null;
  institutions_count: number;
  programs_count: number;
  pages_inspected: number;
  last_error: string | null;
}

async function searchStatus(env: Env, countryCode: string, field: string): Promise<SearchStatus | null> {
  const row = await env.adminpath_prod_d1
    .prepare(
      `SELECT search_key, status, fetched_at, expires_at, requested_at, institutions_count, programs_count, pages_inspected, last_error
       FROM search_cache WHERE search_key = ?`,
    )
    .bind(searchKey(countryCode, field))
    .first<Omit<SearchStatus, "stale">>();
  if (!row) return null;
  return { ...row, stale: !!row.expires_at && row.expires_at <= sqlTimestamp() };
}

export interface Coverage {
  country_code: string;
  institutions_total: number;
  institutions_checked: number;
  institutions_with_programs: number;
  last_update: string | null;
}

export async function coverage(env: Env, countryCode: string): Promise<Coverage | null> {
  const row = await env.adminpath_prod_d1
    .prepare(
      `SELECT country_code, institutions_total, COALESCE(institutions_checked, 0) AS institutions_checked,
         COALESCE(institutions_with_programs, 0) AS institutions_with_programs, last_update
       FROM crawl_countries WHERE country_code = ? AND imported_at IS NOT NULL`,
    )
    .bind(countryCode)
    .first<Coverage>();
  return row ?? null;
}

async function dispatchCrawler(env: Env): Promise<void> {
  const token = typeof env.GITHUB_DISPATCH_TOKEN === "string" ? env.GITHUB_DISPATCH_TOKEN : "";
  const repo = typeof env.GITHUB_REPO === "string" ? env.GITHUB_REPO : "";
  if (!token || !/^[\w.-]+\/[\w.-]+$/.test(repo)) return;
  try {
    const res = await fetch(`https://api.github.com/repos/${repo}/dispatches`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "User-Agent": "AdmitPath-Worker",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ event_type: "crawl" }),
    });
    if (!res.ok) console.error("Crawler dispatch failed", res.status);
  } catch (err) {
    console.error("Crawler dispatch error", err instanceof Error ? err.message : err);
  }
}

const LEVEL_LABELS: Record<string, string> = {
  Bachelor: "Bachelor's / Undergraduate",
  Master: "Master's / Graduate",
  PhD: "PhD / Doctoral",
  MBA: "MBA",
};
export const STUDY_LEVELS = Object.keys(LEVEL_LABELS);
export const PAGE_SIZE = 50;
const CACHE_SECONDS = 1800;

function pick(list: string[], value: string): string | null {
  const v = value.trim().toLowerCase();
  return list.find((x) => x.toLowerCase() === v) ?? null;
}

interface EdgeCache {
  match(req: Request): Promise<Response | undefined>;
  put(req: Request, res: Response): Promise<void>;
}

function edgeCache(): EdgeCache | null {
  return (globalThis as { caches?: { default?: EdgeCache } }).caches?.default ?? null;
}

function like(value: string): string {
  return `%${value.toLowerCase().replace(/[%_\\]/g, "\\$&")}%`;
}

function param(url: URL, key: string, max = 100): string {
  const v = (url.searchParams.get(key) || "").trim();
  return v && v !== "all" ? v.slice(0, max) : "";
}

const PROGRAM_SELECT = `SELECT p.*, u.name AS university_name, u.country, u.country_code, u.city, u.ranking, u.domain, u.website
  FROM programs p JOIN universities u ON p.university_id = u.id`;

interface Filters {
  country?: string;
  field?: string;
  q?: string;
  level?: string;
  maxTuition?: number | null;
}

function programQuery(f: Filters): { sql: string; params: unknown[] } {
  const where: string[] = ["p.removed_at IS NULL"];
  const params: unknown[] = [];
  if (f.country) {
    where.push("(LOWER(u.country) = LOWER(?) OR LOWER(u.country_code) = LOWER(?))");
    params.push(f.country, f.country);
  }
  if (f.field) {
    where.push("(LOWER(p.subject_category) LIKE ? ESCAPE '\\' OR LOWER(p.name) LIKE ? ESCAPE '\\')");
    params.push(like(f.field), like(f.field));
  }
  if (f.q) {
    where.push("(LOWER(p.name) LIKE ? ESCAPE '\\' OR LOWER(u.name) LIKE ? ESCAPE '\\' OR LOWER(p.department) LIKE ? ESCAPE '\\')");
    params.push(like(f.q), like(f.q), like(f.q));
  }
  if (f.level) {
    where.push("LOWER(p.level) = LOWER(?)");
    params.push(f.level);
  }
  if (typeof f.maxTuition === "number" && Number.isFinite(f.maxTuition)) {
    where.push("(p.tuition IS NULL OR p.tuition <= ?)");
    params.push(f.maxTuition);
  }
  const sql = `${PROGRAM_SELECT}${where.length ? ` WHERE ${where.join(" AND ")}` : ""} ORDER BY (u.ranking IS NULL), u.ranking ASC, p.name ASC LIMIT 1000`;
  return { sql, params };
}

export function registerCatalogRoutes(router: Router): void {
  router.get("/api/universities", async (c) => {
    const where: string[] = [];
    const params: unknown[] = [];
    const country = param(c.url, "country");
    const q = param(c.url, "q");
    const maxTuition = Number(c.url.searchParams.get("max_tuition"));
    if (country) {
      where.push("LOWER(country) = LOWER(?)");
      params.push(country);
    }
    if (q) {
      where.push("(LOWER(name) LIKE ? ESCAPE '\\' OR LOWER(city) LIKE ? ESCAPE '\\')");
      params.push(like(q), like(q));
    }
    if (c.url.searchParams.get("max_tuition") && Number.isFinite(maxTuition)) {
      where.push("tuition_min <= ?");
      params.push(maxTuition);
    }
    const { results } = await c.env.adminpath_prod_d1
      .prepare(`SELECT * FROM universities${where.length ? ` WHERE ${where.join(" AND ")}` : ""} ORDER BY (ranking IS NULL), ranking ASC, name ASC LIMIT 500`)
      .bind(...params)
      .all();
    return json(results);
  });

  router.get("/api/universities/:id", async (c) => {
    const db = c.env.adminpath_prod_d1;
    const university = await db.prepare("SELECT * FROM universities WHERE id = ?").bind(c.params.id).first();
    if (!university) return error(404, "University not found.");
    const [programs, contacts] = await Promise.all([
      db.prepare("SELECT * FROM programs WHERE university_id = ?").bind(c.params.id).all(),
      c.user ? db.prepare("SELECT * FROM contacts WHERE university_id = ?").bind(c.params.id).all() : Promise.resolve({ results: [] }),
    ]);
    return json({ university, programs: programs.results, contacts: contacts.results });
  });

  router.get("/api/programs", async (c) => {
    const { sql, params } = programQuery({
      country: param(c.url, "country"),
      field: param(c.url, "subject"),
      q: param(c.url, "q"),
      level: param(c.url, "level", 20),
    });
    const { results } = await c.env.adminpath_prod_d1.prepare(sql).bind(...params).all();
    return json(results);
  });

  router.get("/api/programs/:id", async (c) => {
    const db = c.env.adminpath_prod_d1;
    const program = await db
      .prepare(
        `SELECT p.*, u.name AS university_name, u.country, u.country_code, u.city, u.ranking, u.domain, u.website, u.tuition_min, u.tuition_max
         FROM programs p JOIN universities u ON p.university_id = u.id WHERE p.id = ?`,
      )
      .bind(c.params.id)
      .first<{ university_id: string }>();
    if (!program) return error(404, "Program not found.");
    const contacts = c.user
      ? (await db.prepare("SELECT * FROM contacts WHERE university_id = ?").bind(program.university_id).all()).results
      : [];
    return json({ program, contacts });
  });

  router.get("/api/contacts", requireAuth, async (c) => {
    const { results } = await c.env.adminpath_prod_d1
      .prepare(
        `SELECT c.*, u.name AS university_name, u.country FROM contacts c
         JOIN universities u ON c.university_id = u.id ORDER BY u.name ASC LIMIT 1000`,
      )
      .all();
    return json(results);
  });

  router.get("/api/discovery/countries", () => json(DESTINATION_COUNTRIES));
  router.get("/api/discovery/fields", () => json(FIELDS_OF_STUDY));

  router.get("/api/discovery/results", async (c) => {
    const countryParam = param(c.url, "country_code", 3) || param(c.url, "country");
    const country = countryParam ? resolveCountry(countryParam) : null;
    const field = pick(FIELDS_OF_STUDY.map((f) => f.name), param(c.url, "field"));
    const level = pick(STUDY_LEVELS, param(c.url, "level", 20));
    if (!country || !field || !level) return error(400, "Choose a destination country, field of study and study level.");
    const maxRaw = Number(c.url.searchParams.get("max_tuition"));
    const maxTuition = c.url.searchParams.get("max_tuition") && Number.isFinite(maxRaw) && maxRaw > 0 ? Math.round(maxRaw) : null;
    const q = param(c.url, "q", 60).toLowerCase();
    const page = Math.min(Math.max(Math.floor(Number(c.url.searchParams.get("page")) || 0), 0), 200);

    const cache = edgeCache();
    const cacheKey = new Request(
      `https://discovery-cache.admitpath/${country.code}/${encodeURIComponent(field)}/${level}?max=${maxTuition ?? ""}&q=${encodeURIComponent(q)}&page=${page}`,
    );
    const hit = cache ? await cache.match(cacheKey) : undefined;
    if (hit) return new Response(hit.body, hit);

    const where = ["s.country_code = ?", "s.subject = ?", "s.level = ?", "p.removed_at IS NULL"];
    const params: unknown[] = [country.code, field, level];
    if (maxTuition !== null) {
      where.push("(s.tuition IS NULL OR s.tuition <= ?)");
      params.push(maxTuition);
    }
    if (q) {
      where.push("(LOWER(p.name) LIKE ? ESCAPE '\\' OR LOWER(u.name) LIKE ? ESCAPE '\\' OR LOWER(u.city) LIKE ? ESCAPE '\\')");
      params.push(like(q), like(q), like(q));
    }
    const { results } = await c.env.adminpath_prod_d1
      .prepare(
        `SELECT p.*, u.name AS university_name, u.country, u.country_code, u.city, u.ranking, u.domain, u.website
         FROM program_search s JOIN programs p ON p.id = s.program_id JOIN universities u ON u.id = s.university_id
         WHERE ${where.join(" AND ")} ORDER BY s.rank_sort, s.program_id LIMIT ? OFFSET ?`,
      )
      .bind(...params, PAGE_SIZE + 1, page * PAGE_SIZE)
      .all<Record<string, unknown>>();
    const programs = results.slice(0, PAGE_SIZE);
    const cover = await coverage(c.env, country.code);
    const search = cover ? null : await searchStatus(c.env, country.code, field);

    const res = json({
      programs,
      page,
      page_size: PAGE_SIZE,
      has_more: results.length > PAGE_SIZE,
      filters: { country_code: country.code, field, level, max_tuition: maxTuition },
      available_study_levels: STUDY_LEVELS.map((lvl) => ({ level: lvl, label: LEVEL_LABELS[lvl] })),
      search,
      coverage: cover,
      stats: {
        institutionsDiscovered: cover?.institutions_with_programs ?? search?.institutions_count ?? 0,
        programmesExtracted: page * PAGE_SIZE + programs.length,
        pagesInspected: cover ? 0 : (search?.pages_inspected ?? 0),
        lastUpdated: cover?.last_update ?? search?.fetched_at ?? null,
      },
    });
    if (cache && (cover || search?.status === "ready")) {
      res.headers.set("Cache-Control", `public, max-age=${CACHE_SECONDS}`);
      await cache.put(cacheKey, res.clone());
    }
    return res;
  });

  router.post("/api/discovery/jobs", requireAuth, async (c) => {
    const body = await readJson<{ country?: unknown; country_code?: unknown; field?: unknown; level?: unknown; preferences?: unknown }>(c.req);
    const countryRaw = typeof body?.country_code === "string" && body.country_code.trim()
      ? body.country_code
      : typeof body?.country === "string" ? body.country : "";
    const field = typeof body?.field === "string" ? body.field.replace(/\s+/g, " ").trim().slice(0, 80) : "";
    const country = resolveCountry(String(countryRaw).slice(0, 100));
    if (!country || field.length < 2) return error(400, "Choose a country from the list and a field of study.");

    const db = c.env.adminpath_prod_d1;
    const key = searchKey(country.code, field);
    const now = sqlTimestamp();
    const cover = await coverage(c.env, country.code);
    if (cover) {
      const subject = pick(FIELDS_OF_STUDY.map((f) => f.name), field) ?? field;
      const level = typeof body?.level === "string" ? pick(STUDY_LEVELS, body.level) : null;
      const counts = await db
        .prepare(
          `SELECT COUNT(*) AS n, COUNT(DISTINCT university_id) AS u FROM program_search
           WHERE country_code = ? AND subject = ?${level ? " AND level = ?" : ""}`,
        )
        .bind(...(level ? [country.code, subject, level] : [country.code, subject]))
        .first<{ n: number; u: number }>();
      const n = Number(counts?.n ?? 0);
      const institutions = Number(counts?.u ?? 0);
      const what = `${n} ${level ? `${level} ` : ""}${subject} programmes at ${institutions} universities in ${country.name}`;
      const done = cover.institutions_checked >= cover.institutions_total;
      return json({
        success: true,
        job_id: null,
        search_key: key,
        status: "ready",
        institutions_discovered: institutions,
        programmes_extracted: n,
        coverage: cover,
        message: done
          ? `${what}.`
          : `${what} so far. ${cover.institutions_checked} of ${cover.institutions_total} universities checked; more are added every hour.`,
      });
    }
    const existing = await searchStatus(c.env, country.code, field);

    let status: string;
    let message: string;
    if (existing && existing.status === "ready" && !existing.stale) {
      status = "ready";
      message = `Showing saved results for ${field} in ${country.name} (updated ${existing.fetched_at?.slice(0, 10)}).`;
    } else if (existing && (existing.status === "pending" || existing.status === "running")) {
      status = existing.status;
      message = `${field} in ${country.name} is already being collected from university websites. Check back in a few minutes.`;
    } else {
      const recent = await db
        .prepare("SELECT COUNT(*) AS n FROM search_cache WHERE requested_by = ? AND requested_at > ?")
        .bind(c.user!.id, sqlTimestamp(clock.now() - 86400_000))
        .first<{ n: number }>();
      if (Number(recent?.n ?? 0) >= MAX_QUEUED_PER_DAY) {
        return error(429, `You can start up to ${MAX_QUEUED_PER_DAY} new searches a day. Saved searches still work.`);
      }
      await db
        .prepare(
          `INSERT INTO search_cache (search_key, country, country_code, field, status, requested_at, requested_by, attempts)
           VALUES (?, ?, ?, ?, 'pending', ?, ?, 0)
           ON CONFLICT(search_key) DO UPDATE SET status = 'pending', requested_at = excluded.requested_at,
             requested_by = excluded.requested_by, attempts = CASE WHEN search_cache.status = 'failed' THEN search_cache.attempts ELSE 0 END,
             last_error = NULL`,
        )
        .bind(key, country.name, country.code, field, now, c.user!.id)
        .run();
      await dispatchCrawler(c.env);
      status = "pending";
      message = existing?.stale
        ? `Refreshing ${field} in ${country.name}. Showing results from ${existing.fetched_at?.slice(0, 10)} until the new crawl finishes.`
        : `Collecting ${field} programmes in ${country.name} from official university websites. This usually takes 5 to 15 minutes.`;
    }

    const id = `disc_${randomHex(8)}`;
    await db
      .prepare(
        `INSERT INTO discovery_jobs (id, student_id, country, country_code, field, parameters_json, status, current_stage,
           institutions_discovered, programmes_extracted, pages_inspected, started_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        id,
        c.user!.id,
        country.name,
        country.code,
        field,
        JSON.stringify(body?.preferences ?? {}).slice(0, 2000),
        status === "ready" ? "completed" : "pending",
        message,
        existing?.institutions_count ?? 0,
        existing?.programs_count ?? 0,
        existing?.pages_inspected ?? 0,
        now,
        now,
      )
      .run();

    return json({
      success: true,
      job_id: id,
      search_key: key,
      status,
      institutions_discovered: existing?.institutions_count ?? 0,
      programmes_extracted: existing?.programs_count ?? 0,
      message,
    });
  });

  router.get("/api/discovery/coverage", async (c) => {
    const { results } = await c.env.adminpath_prod_d1
      .prepare(
        `SELECT country_code, country, institutions_total, COALESCE(institutions_checked, 0) AS institutions_checked
         FROM crawl_countries WHERE imported_at IS NOT NULL ORDER BY country`,
      )
      .all();
    return json(results);
  });

  router.get("/api/discovery/jobs", requireAuth, async (c) => {
    const { results } = await c.env.adminpath_prod_d1
      .prepare("SELECT * FROM discovery_jobs WHERE student_id = ? ORDER BY started_at DESC LIMIT 25")
      .bind(c.user!.id)
      .all();
    return json(results);
  });

  router.get("/api/discovery/jobs/:id", requireAuth, async (c) => {
    const job = await c.env.adminpath_prod_d1
      .prepare("SELECT * FROM discovery_jobs WHERE id = ? AND student_id = ?")
      .bind(c.params.id, c.user!.id)
      .first();
    if (!job) return error(404, "Discovery job not found.");
    return json(job);
  });
}
