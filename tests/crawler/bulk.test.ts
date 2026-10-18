import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { readdirSync, readFileSync, mkdtempSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { Db } from "../../crawler/d1.ts";
import { claimInstitutions, crawlInstitution, importCountries, programId, runBulk, WriteBudget } from "../../crawler/bulk.ts";
import { countryName, targetCountries } from "../../crawler/countries.ts";
import { PoliteFetcher } from "../../crawler/fetcher.ts";
import { classifySubjects } from "../../crawler/fields.ts";
import { detectLevel, extractPrograms, isGenericTitle } from "../../crawler/extract.ts";
import { anyFieldMatcher } from "../../crawler/fields.ts";
import type { Institution } from "../../crawler/wikidata.ts";
import { sqlTimestamp } from "../../worker/lib/clock.ts";

const MIGRATIONS = join(import.meta.dirname, "..", "..", "migrations");
const NOW = Date.parse("2026-10-18T10:00:00Z");
const DAY = 86400_000;

function sqliteDb(): { db: Db; raw: DatabaseSync; writes: () => number } {
  const raw = new DatabaseSync(":memory:");
  raw.exec("PRAGMA foreign_keys = ON;");
  for (const f of readdirSync(MIGRATIONS).filter((x) => x.endsWith(".sql")).sort()) raw.exec(readFileSync(join(MIGRATIONS, f), "utf8"));
  let writes = 0;
  let rows = 0;
  const db: Db = {
    rowsWritten: () => rows,
    async query(sql, params = []) {
      const stmt = raw.prepare(sql);
      if (/^\s*select/i.test(sql)) return { results: stmt.all(...(params as never[])) as never[], changes: 0 };
      const info = stmt.run(...(params as never[]));
      rows += Number(info.changes);
      return { results: [], changes: Number(info.changes) };
    },
    async batch(statements) {
      raw.exec("BEGIN");
      try {
        for (const s of statements) rows += Number(raw.prepare(s.sql).run(...((s.params ?? []) as never[])).changes);
        raw.exec("COMMIT");
        writes += statements.length;
      } catch (e) {
        raw.exec("ROLLBACK");
        throw e;
      }
    },
  };
  return { db, raw, writes: () => writes };
}

function site(pages: Record<string, string>): typeof fetch {
  return (async (input: RequestInfo | URL) => {
    const url = String(input instanceof Request ? input.url : input);
    if (url.endsWith("/robots.txt")) return new Response("", { status: 404 });
    const body = pages[url];
    if (body === undefined) return new Response("nope", { status: 404, headers: { "Content-Type": "text/html" } });
    const res = new Response(body, { headers: { "Content-Type": "text/html" } });
    Object.defineProperty(res, "url", { value: url });
    return res;
  }) as typeof fetch;
}

const noSleep = { minDelayMs: 0, sleep: async () => {} };

const UNI_A: Institution = { qid: "Q1", name: "Alpha University", website: "https://www.alpha.de/", domain: "alpha.de", city: "Berlin", students: 30000 };
const UNI_B: Institution = { qid: "Q2", name: "Beta College", website: "https://beta.de/", domain: "beta.de", city: "Bonn", students: 2000 };
const TUM: Institution = { qid: "Q157808", name: "Technische Universität München", website: "https://www.tum.de/", domain: "tum.de", city: "Munich", students: 50000 };

const ALPHA_V1 = {
  "https://www.alpha.de/": `<a href="/studium">Studium</a> <a href="/news">News</a>`,
  "https://www.alpha.de/studium": `<h1>Studiengänge</h1><ul>
     <li><a href="/s/inf-msc">Informatik (M.Sc.)</a></li>
     <li><a href="/s/bwl-bsc">Betriebswirtschaftslehre (B.Sc.)</a></li>
     <li><a href="/s/phys-phd">Promotion in Physik</a></li>
     <li><a href="/s/all">Master's programmes</a></li>
   </ul><p>Kontakt: studienberatung@alpha.de</p>`,
};

describe("multilingual tagging and filters", () => {
  test("subjects in six languages", () => {
    assert.deepEqual(classifySubjects("计算机科学与技术 硕士"), ["Computer Science"]);
    assert.ok(classifySubjects("Прикладная информатика").includes("Computer Science"));
    assert.ok(classifySubjects("Bilgisayar Mühendisliği").includes("Computer Science"));
    assert.ok(classifySubjects("情報工学専攻").includes("Computer Science"));
    assert.ok(classifySubjects("컴퓨터공학과").includes("Computer Science"));
    assert.deepEqual(classifySubjects("MSc Finance and Economics"), ["Finance", "Economics"]);
    assert.deepEqual(classifySubjects("Pottery"), []);
  });

  test("degree levels in other languages", () => {
    assert.equal(detectLevel("计算机科学 硕士")?.level, "Master");
    assert.equal(detectLevel("Информатика (магистратура)")?.level, "Master");
    assert.equal(detectLevel("Информатика, бакалавриат")?.level, "Bachelor");
    assert.equal(detectLevel("Bilgisayar Mühendisliği Yüksek Lisans")?.level, "Master");
    assert.equal(detectLevel("Bilgisayar Mühendisliği Lisans Programı")?.level, "Bachelor");
    assert.equal(detectLevel("Fizik Doktora")?.level, "PhD");
    assert.equal(detectLevel("情報工学 修士課程")?.level, "Master");
    assert.equal(detectLevel("컴퓨터공학 박사")?.level, "PhD");
  });

  test("generic headings are not programmes", () => {
    assert.equal(isGenericTitle("Master's programmes"), true);
    assert.equal(isGenericTitle("Master of Science"), true);
    assert.equal(isGenericTitle("Informatics (M.Sc.)"), false);
    const html = `<a href="/a">Master's programmes</a><a href="/b">Informatics (M.Sc.)</a><a href="/c">Bachelor of Arts</a>`;
    const names = extractPrograms(html, "https://x.de/", anyFieldMatcher, "x.de").map((p) => p.name);
    assert.deepEqual(names, ["Informatics (M.Sc.)"]);
  });

  test("country list and names", () => {
    const list = targetCountries();
    for (const c of ["DE", "FR", "GB", "PL", "UA", "RU", "TR", "CN", "MY", "SG", "AU", "CA", "US", "KR", "ZA", "JP", "AE", "PK"]) assert.ok(list.includes(c), c);
    assert.deepEqual(targetCountries("de, us x"), ["DE", "US"]);
    assert.equal(countryName("DE"), "Germany");
    assert.equal(countryName("TR"), "Turkey");
  });
});

describe("bulk pipeline", () => {
  test("import loads every institution once and keeps seeded universities", async () => {
    const { db, raw } = sqliteDb();
    const budget = new WriteBudget(db, NOW, 80000);
    await budget.load();
    const n = await importCountries(db, budget, ["DE"], async () => [UNI_A, UNI_B, TUM], NOW);
    assert.equal(n, 1);
    assert.equal(raw.prepare("SELECT COUNT(*) AS n FROM institution_queue WHERE country_code = 'DE'").get()!.n, 3);
    const tum = raw.prepare("SELECT university_id FROM institution_queue WHERE domain = 'tum.de'").get() as { university_id: string };
    assert.equal(tum.university_id, "univ_tum");
    const country = raw.prepare("SELECT country, institutions_total FROM crawl_countries").get() as Record<string, unknown>;
    assert.deepEqual({ ...country }, { country: "Germany", institutions_total: 3 });
    const again = await importCountries(db, budget, ["DE"], async () => { throw new Error("should not be called"); }, NOW + DAY);
    assert.equal(again, 0);
    assert.equal(await importCountries(db, budget, ["DE"], async () => [UNI_A], NOW + 31 * DAY), 1);
  });

  test("claiming prefers never-crawled and larger institutions", async () => {
    const { db } = sqliteDb();
    const budget = new WriteBudget(db, NOW, 80000);
    await importCountries(db, budget, ["DE"], async () => [UNI_B, UNI_A, TUM], NOW);
    const first = await claimInstitutions(db, 2, NOW);
    assert.deepEqual(first.map((r) => r.domain), ["tum.de", "alpha.de"]);
    assert.deepEqual((await claimInstitutions(db, 5, NOW)).map((r) => r.domain), ["beta.de"]);
    assert.equal((await claimInstitutions(db, 5, NOW)).length, 0);
  });

  test("crawl writes only new or changed rows, marks removed programmes, schedules a refresh", async () => {
    const { db, raw } = sqliteDb();
    const budget = new WriteBudget(db, NOW, 80000);
    await importCountries(db, budget, ["DE"], async () => [UNI_A], NOW);
    const [row] = await claimInstitutions(db, 1, NOW);
    const opts = { maxPages: 10, maxPrograms: 300, now: NOW };

    const first = await crawlInstitution(db, new PoliteFetcher({ ...noSleep, fetchImpl: site(ALPHA_V1) }), row, opts);
    assert.equal(first.found, 3);
    assert.equal(first.inserted, 3);
    const progs = raw.prepare("SELECT name, level, subject_category FROM programs WHERE university_id = ? ORDER BY name").all(row.university_id) as Record<string, string>[];
    assert.deepEqual(progs.map((p) => [p.name, p.level, p.subject_category]), [
      ["Betriebswirtschaftslehre (B.Sc.)", "Bachelor", "Business Administration"],
      ["Informatik (M.Sc.)", "Master", "Computer Science"],
      ["Promotion in Physik", "PhD", "Natural Sciences"],
    ]);
    const q = raw.prepare("SELECT status, next_crawl_at FROM institution_queue WHERE domain = 'alpha.de'").get() as Record<string, string>;
    assert.equal(q.status, "done");
    assert.ok(q.next_crawl_at >= sqlTimestamp(NOW + 30 * DAY) && q.next_crawl_at <= sqlTimestamp(NOW + 34 * DAY));
    assert.equal(raw.prepare("SELECT COUNT(*) AS n FROM contacts WHERE email = 'studienberatung@alpha.de'").get()!.n, 1);
    const indexed = raw.prepare("SELECT country_code, subject, level FROM program_search WHERE university_id = ? ORDER BY subject").all(row.university_id) as Record<string, string>[];
    assert.deepEqual(indexed.map((r) => [r.country_code, r.subject, r.level]), [
      ["DE", "Business Administration", "Bachelor"],
      ["DE", "Computer Science", "Master"],
      ["DE", "Natural Sciences", "PhD"],
    ]);
    const cov = raw.prepare("SELECT institutions_checked, institutions_with_programs FROM crawl_countries WHERE country_code = 'DE'").get() as Record<string, number>;
    assert.deepEqual([cov.institutions_checked, cov.institutions_with_programs], [1, 1]);

    const fresh = () => ({ ...row, ...(raw.prepare("SELECT last_crawled_at, programs_found FROM institution_queue WHERE domain = 'alpha.de'").get() as object) });
    const same = await crawlInstitution(db, new PoliteFetcher({ ...noSleep, fetchImpl: site(ALPHA_V1) }), fresh(), { ...opts, now: NOW + 31 * DAY });
    assert.equal(same.inserted + same.updated + same.removed, 0);
    assert.equal(same.writes, 3);

    const v2 = { ...ALPHA_V1, "https://www.alpha.de/studium": ALPHA_V1["https://www.alpha.de/studium"].replace('<li><a href="/s/phys-phd">Promotion in Physik</a></li>', "") };
    const later = await crawlInstitution(db, new PoliteFetcher({ ...noSleep, fetchImpl: site(v2) }), fresh(), { ...opts, now: NOW + 62 * DAY });
    assert.equal(later.removed, 1);
    const removed = raw.prepare("SELECT removed_at FROM programs WHERE id = ?").get(programId("alpha.de", "PhD", "Promotion in Physik")) as { removed_at: string };
    assert.equal(removed.removed_at, sqlTimestamp(NOW + 62 * DAY));
    assert.equal(raw.prepare("SELECT COUNT(*) AS n FROM program_search WHERE university_id = ?").get(row.university_id)!.n, 2);
    const cov2 = raw.prepare("SELECT institutions_checked, institutions_with_programs FROM crawl_countries WHERE country_code = 'DE'").get() as Record<string, number>;
    assert.deepEqual([cov2.institutions_checked, cov2.institutions_with_programs], [1, 1]);
  });

  test("tags mode stores only subjects and levels per university, no programmes", async () => {
    const { db, raw } = sqliteDb();
    const budget = new WriteBudget(db, NOW, 80000);
    await importCountries(db, budget, ["DE"], async () => [UNI_A], NOW);
    const [row] = await claimInstitutions(db, 1, NOW);
    const opts = { maxPages: 10, maxPrograms: 300, now: NOW, mode: "tags" as const };
    const out = await crawlInstitution(db, new PoliteFetcher({ ...noSleep, fetchImpl: site(ALPHA_V1) }), row, opts);
    assert.equal(out.found, 3);
    assert.equal(raw.prepare("SELECT COUNT(*) AS n FROM programs WHERE university_id = ?").get(row.university_id)!.n, 0);
    const tags = raw.prepare("SELECT subject, levels FROM university_subjects WHERE university_id = ? ORDER BY subject").all(row.university_id) as Record<string, string>[];
    assert.deepEqual(tags.map((t) => [t.subject, t.levels]), [
      ["Business Administration", "Bachelor"],
      ["Computer Science", "Master"],
      ["Natural Sciences", "PhD"],
    ]);
    const q = raw.prepare("SELECT tags, status FROM institution_queue WHERE domain = 'alpha.de'").get() as Record<string, string>;
    assert.equal(q.status, "done");
    assert.deepEqual(Object.keys(JSON.parse(q.tags)).sort(), ["Business Administration", "Computer Science", "Natural Sciences"]);

    raw.prepare("UPDATE institution_queue SET status = 'pending', next_crawl_at = NULL").run();
    const [again] = await claimInstitutions(db, 1, NOW + DAY);
    const second = await crawlInstitution(db, new PoliteFetcher({ ...noSleep, fetchImpl: site(ALPHA_V1) }), again, { ...opts, now: NOW + DAY });
    assert.equal(second.inserted + second.updated, 0);
  });

  test("an unreachable site is retried tomorrow and never wipes existing programmes", async () => {
    const { db, raw } = sqliteDb();
    const budget = new WriteBudget(db, NOW, 80000);
    await importCountries(db, budget, ["DE"], async () => [UNI_A], NOW);
    const [row] = await claimInstitutions(db, 1, NOW);
    await crawlInstitution(db, new PoliteFetcher({ ...noSleep, fetchImpl: site(ALPHA_V1) }), row, { maxPages: 10, maxPrograms: 300, now: NOW });
    const down = await crawlInstitution(db, new PoliteFetcher({ ...noSleep, fetchImpl: site({}) }), row, { maxPages: 10, maxPrograms: 300, now: NOW + DAY });
    assert.equal(down.pages, 0);
    const q = raw.prepare("SELECT status, attempts, next_crawl_at FROM institution_queue").get() as Record<string, string | number>;
    assert.equal(q.status, "failed");
    assert.equal(q.attempts, 1);
    assert.equal(q.next_crawl_at, sqlTimestamp(NOW + 2 * DAY));
    assert.equal(raw.prepare("SELECT COUNT(*) AS n FROM programs WHERE removed_at IS NULL AND source_type = 'official_website'").get()!.n, 3);
  });

  test("runBulk stops at the daily write budget and writes a gzipped country snapshot", async () => {
    const { db, raw } = sqliteDb();
    const out = mkdtempSync(join(tmpdir(), "bulk-"));
    const fetchImpl = site({ ...ALPHA_V1, "https://beta.de/": `<a href="/p">Data Science (M.Sc.)</a>` });
    const summary = await runBulk(db, new PoliteFetcher({ ...noSleep, fetchImpl }), {
      countries: ["DE"],
      writeLimitPerDay: 80000,
      timeBudgetMs: 60_000,
      batchSize: 2,
      concurrency: 2,
      maxPages: 10,
      maxPrograms: 300,
      outputDir: out,
      now: () => NOW,
      institutions: async () => [UNI_A, UNI_B],
    });
    assert.equal(summary.importedCountries, 1);
    assert.equal(summary.institutions, 2);
    assert.equal(summary.inserted, 4);
    assert.equal(summary.snapshots.length, 1);
    const snap = JSON.parse(gunzipSync(readFileSync(summary.snapshots[0])).toString());
    assert.equal(snap.country_code, "DE");
    const names = snap.programs.map((x: { name: string }) => x.name);
    for (const n of ["Informatik (M.Sc.)", "Betriebswirtschaftslehre (B.Sc.)", "Promotion in Physik", "Data Science (M.Sc.)"]) assert.ok(names.includes(n), n);
    assert.equal(snap.programs.length, (raw.prepare("SELECT COUNT(*) AS n FROM programs p JOIN universities u ON u.id = p.university_id WHERE u.country_code = 'DE'").get() as { n: number }).n);
    assert.ok(snap.universities.length >= 2);
    assert.equal(snap.contacts, undefined);
    const used = raw.prepare("SELECT rows_written FROM crawl_budget WHERE day = '2026-10-18'").get() as { rows_written: number };
    assert.equal(used.rows_written, summary.writesToday);
    assert.ok(used.rows_written > 0);

    raw.prepare("UPDATE crawl_budget SET rows_written = 79990").run();
    raw.prepare("UPDATE institution_queue SET next_crawl_at = ?").run(sqlTimestamp(NOW - 1));
    const capped = await runBulk(db, new PoliteFetcher({ ...noSleep, fetchImpl }), {
      countries: ["DE"], writeLimitPerDay: 80000, timeBudgetMs: 60_000, batchSize: 2, concurrency: 2, maxPages: 10, maxPrograms: 300,
      outputDir: out, now: () => NOW, institutions: async () => [UNI_A, UNI_B],
    });
    assert.equal(capped.institutions, 0);
    assert.equal(raw.prepare("SELECT COUNT(*) AS n FROM institution_queue WHERE status = 'running'").get()!.n, 0);
  });

  test("hot queries use indexes and never sort whole tables", () => {
    const { raw } = sqliteDb();
    const plan = (sql: string) => (raw.prepare(`EXPLAIN QUERY PLAN ${sql}`).all() as { detail: string }[]).map((r) => r.detail).join(" | ");
    const search = plan(`SELECT p.id FROM program_search s JOIN programs p ON p.id = s.program_id JOIN universities u ON u.id = s.university_id
      WHERE s.country_code = 'DE' AND s.subject = 'Law' AND s.level = 'Master' AND p.removed_at IS NULL ORDER BY s.rank_sort, s.program_id LIMIT 51`);
    assert.match(search, /SEARCH s USING PRIMARY KEY \(country_code=\? AND subject=\? AND level=\?\)/);
    assert.doesNotMatch(search, /TEMP B-TREE/);
    const pending = plan("SELECT domain FROM institution_queue INDEXED BY idx_iq_pending WHERE status = 'pending' ORDER BY students DESC LIMIT 16");
    assert.doesNotMatch(pending, /TEMP B-TREE/);
    const due = plan("SELECT domain FROM institution_queue WHERE status = 'done' AND next_crawl_at <= '2026' ORDER BY next_crawl_at LIMIT 16");
    assert.doesNotMatch(due, /TEMP B-TREE/);
  });

  test("budget counts real rows written and stops cleanly when D1 refuses writes", async () => {
    const { db, raw } = sqliteDb();
    const budget = new WriteBudget(db, NOW, 80000);
    await budget.load();
    await importCountries(db, budget, ["DE"], async () => [UNI_A, UNI_B], NOW);
    assert.ok(budget.used >= 4);
    assert.ok(budget.spent() <= 1);

    const fetchImpl = site({ ...ALPHA_V1, "https://beta.de/": `<a href="/p">Data Science (M.Sc.)</a>` });
    const refusing: typeof db = {
      ...db,
      async batch() {
        throw new Error("D1 query failed: Exceeded daily rows written limit");
      },
    };
    const summary = await runBulk(refusing, new PoliteFetcher({ ...noSleep, fetchImpl }), {
      countries: ["DE"], writeLimitPerDay: 80000, timeBudgetMs: 60_000, batchSize: 2, concurrency: 2, maxPages: 10, maxPrograms: 300,
      outputDir: mkdtempSync(join(tmpdir(), "bulk-")), now: () => NOW, institutions: async () => [UNI_A, UNI_B],
    });
    assert.equal(summary.institutions, 0);
    assert.equal(summary.snapshots.length, 0);
    assert.equal(raw.prepare("SELECT COUNT(*) AS n FROM programs WHERE university_id LIKE 'univ_%' AND source_type = 'official_website'").get()!.n, 0);
  });
});
