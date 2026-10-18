import type { Router } from "../router.ts";
import { FIELDS_OF_STUDY, GLOBAL_COUNTRIES } from "../../core/discoveryData.ts";
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
};

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
  const where: string[] = [];
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
  const sql = `${PROGRAM_SELECT}${where.length ? ` WHERE ${where.join(" AND ")}` : ""} ORDER BY (u.ranking IS NULL), u.ranking ASC, p.name ASC LIMIT 500`;
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

  router.get("/api/discovery/countries", () => json(GLOBAL_COUNTRIES));
  router.get("/api/discovery/fields", () => json(FIELDS_OF_STUDY));

  router.get("/api/discovery/results", async (c) => {
    const maxRaw = c.url.searchParams.get("max_tuition");
    const countryParam = param(c.url, "country_code", 3) || param(c.url, "country");
    const country = countryParam ? resolveCountry(countryParam) : null;
    const field = param(c.url, "field");
    const base: Filters = {
      country: country?.code || countryParam,
      field,
      q: param(c.url, "q"),
      maxTuition: maxRaw ? Number(maxRaw) : null,
    };
    const db = c.env.adminpath_prod_d1;
    const { sql, params } = programQuery(base);
    let { results } = await db.prepare(sql).bind(...params).all<Record<string, unknown>>();
    if (!results.length && country && countryParam !== country.code) {
      const byName = programQuery({ ...base, country: country.name });
      results = (await db.prepare(byName.sql).bind(...byName.params).all<Record<string, unknown>>()).results;
    }

    const counts: Record<string, number> = {};
    for (const p of results) {
      const lvl = (p.level as string) || "Other";
      counts[lvl] = (counts[lvl] || 0) + 1;
    }
    const level = param(c.url, "level", 20).toLowerCase();
    const programs = level ? results.filter((p) => String(p.level || "").toLowerCase() === level) : results;
    const institutions = new Set(results.map((p) => p.university_id)).size;
    const search = country && field ? await searchStatus(c.env, country.code, field) : null;

    return json({
      programs,
      total_count: programs.length,
      available_study_levels: Object.entries(counts).map(([lvl, count]) => ({ level: lvl, label: LEVEL_LABELS[lvl] || lvl, count })),
      search,
      stats: {
        institutionsDiscovered: institutions,
        programmesExtracted: results.length,
        pagesInspected: search?.pages_inspected ?? 0,
        lastUpdated: search?.fetched_at ?? null,
      },
    });
  });

  router.post("/api/discovery/jobs", requireAuth, async (c) => {
    const body = await readJson<{ country?: unknown; country_code?: unknown; field?: unknown; preferences?: unknown }>(c.req);
    const countryRaw = typeof body?.country_code === "string" && body.country_code.trim()
      ? body.country_code
      : typeof body?.country === "string" ? body.country : "";
    const field = typeof body?.field === "string" ? body.field.replace(/\s+/g, " ").trim().slice(0, 80) : "";
    const country = resolveCountry(String(countryRaw).slice(0, 100));
    if (!country || field.length < 2) return error(400, "Choose a country from the list and a field of study.");

    const db = c.env.adminpath_prod_d1;
    const key = searchKey(country.code, field);
    const now = sqlTimestamp();
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
