import { test, describe, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { Client, addUser, createEnv } from "./helpers.ts";

describe("catalog and discovery", () => {
  let env: ReturnType<typeof createEnv>["env"];
  let raw: ReturnType<typeof createEnv>["raw"];
  let student: Client;

  beforeEach(async () => {
    ({ env, raw } = createEnv());
    addUser(raw, { id: "usr_a", email: "a@example.test", password: "AlicePass2026x" });
    addUser(raw, { id: "usr_b", email: "b@example.test", password: "BobPass2026yy" });
    student = new Client(env);
    await student.login("a@example.test", "AlicePass2026x");
  });

  test("seed migration loads the curated catalogue with no verification date", () => {
    const counts = raw.prepare("SELECT (SELECT COUNT(*) FROM universities) u, (SELECT COUNT(*) FROM programs) p, (SELECT COUNT(*) FROM contacts) c").get() as Record<string, number>;
    assert.ok(counts.u >= 30 && counts.p >= 25 && counts.c >= 7);
    assert.equal((raw.prepare("SELECT COUNT(*) AS n FROM universities WHERE last_verified IS NOT NULL").get() as { n: number }).n, 0);
  });

  test("countries and fields lists", async () => {
    const countries = await student.request("GET", "/api/discovery/countries");
    assert.ok(countries.data.some((c: { name: string }) => c.name === "Germany"));
    assert.equal(countries.data.length, 58);
    assert.ok(countries.data.some((c: { code: string }) => c.code === "RS"));
    assert.ok(!countries.data.some((c: { code: string }) => c.code === "IN"));
    const fields = await student.request("GET", "/api/discovery/fields");
    assert.ok(fields.data.some((f: { name: string }) => f.name === "Computer Science"));
  });

  test("results need country, field and level and read only matching rows", async () => {
    assert.equal((await student.request("GET", "/api/discovery/results?country=Germany&field=Computer%20Science")).status, 400);
    assert.equal((await student.request("GET", "/api/discovery/results?country=Germany&field=Basket%20weaving&level=Master")).status, 400);
    assert.equal((await student.request("GET", "/api/discovery/results?country=India&field=Computer%20Science&level=Master")).status, 400);
    const res = await student.request("GET", "/api/discovery/results?country=Germany&field=Computer%20Science&level=master");
    assert.equal(res.status, 200);
    assert.ok(res.data.programs.length > 0);
    assert.ok(res.data.programs.every((p: { country: string; level: string }) => p.country === "Germany" && p.level === "Master"));
    assert.deepEqual(res.data.filters, { country_code: "DE", field: "Computer Science", level: "Master", max_tuition: null });
    assert.equal(res.data.stats.programmesExtracted, res.data.programs.length);
    assert.equal(res.data.stats.pagesInspected, 0);
    assert.deepEqual(res.data.available_study_levels.map((l: { level: string }) => l.level), ["Bachelor", "Master", "PhD", "MBA"]);
  });

  test("budget keeps programmes under the limit and those without a listed fee", async () => {
    raw.prepare("UPDATE programs SET tuition = NULL WHERE id = 'prog_mit_cs_ms'").run();
    const res = await student.request("GET", "/api/discovery/results?country_code=US&field=Computer%20Science&level=Master&max_tuition=61000");
    const ids = res.data.programs.map((p: { id: string }) => p.id);
    assert.ok(ids.length >= 1);
    assert.ok(res.data.programs.every((p: { tuition: number | null }) => p.tuition === null || p.tuition <= 61000));
    raw.prepare("UPDATE program_search SET tuition = NULL WHERE program_id = 'prog_mit_cs_ms'").run();
    const again = await student.request("GET", "/api/discovery/results?country_code=US&field=Computer%20Science&level=Master&max_tuition=100");
    assert.deepEqual(again.data.programs.map((p: { id: string }) => p.id), ["prog_mit_cs_ms"]);
  });

  test("results come in pages of 50", async () => {
    const insert = raw.prepare(`INSERT INTO programs (id, university_id, name, level, subject_category) VALUES (?, 'univ_tum', ?, 'Master', 'Law')`);
    const index = raw.prepare(`INSERT INTO program_search (country_code, subject, level, rank_sort, program_id, university_id) VALUES ('DE', 'Law', 'Master', 100000, ?, 'univ_tum')`);
    for (let i = 0; i < 55; i++) {
      insert.run(`prog_law_${String(i).padStart(2, "0")}`, `Law ${i}`);
      index.run(`prog_law_${String(i).padStart(2, "0")}`);
    }
    const first = await student.request("GET", "/api/discovery/results?country_code=DE&field=Law&level=Master");
    assert.equal(first.data.programs.length, 50);
    assert.equal(first.data.has_more, true);
    const second = await student.request("GET", "/api/discovery/results?country_code=DE&field=Law&level=Master&page=1");
    assert.equal(second.data.programs.length, 5);
    assert.equal(second.data.has_more, false);
    assert.equal(second.data.stats.programmesExtracted, 55);
  });

  test("repeated searches for covered countries are served from the edge cache", async () => {
    raw.prepare("INSERT INTO crawl_countries (country_code, country, institutions_total, imported_at, institutions_checked) VALUES ('DE', 'Germany', 3, '2026-10-01 00:00:00.000', 1)").run();
    const store = new Map<string, Response>();
    const g = globalThis as { caches?: unknown };
    const real = g.caches;
    g.caches = { default: { match: async (r: Request) => store.get(r.url)?.clone(), put: async (r: Request, res: Response) => void store.set(r.url, res) } };
    try {
      const url = "/api/discovery/results?country_code=DE&field=Computer%20Science&level=Master";
      const first = await student.request("GET", url);
      assert.equal(store.size, 1);
      raw.prepare("DELETE FROM program_search").run();
      const second = await student.request("GET", url);
      assert.deepEqual(second.data.programs, first.data.programs);
    } finally {
      g.caches = real;
    }
  });

  test("a new search is queued for the crawler and nothing is invented", async () => {
    const before = (raw.prepare("SELECT COUNT(*) AS n FROM universities").get() as { n: number }).n;
    const res = await student.request("POST", "/api/discovery/jobs", { body: { country: "Germany", country_code: "DE", field: "Computer Science" } });
    assert.equal(res.status, 200);
    assert.equal(res.data.status, "pending");
    assert.equal(res.data.search_key, "DE|computer science");
    assert.match(res.data.message, /5 to 15 minutes/);
    const row = raw.prepare("SELECT status, requested_by FROM search_cache WHERE search_key = 'DE|computer science'").get() as Record<string, string>;
    assert.equal(row.status, "pending");
    assert.equal(row.requested_by, "usr_a");
    assert.equal((raw.prepare("SELECT COUNT(*) AS n FROM universities").get() as { n: number }).n, before);
    const results = await student.request("GET", "/api/discovery/results?country=Germany&country_code=DE&field=Computer%20Science&level=Master");
    assert.equal(results.data.search.status, "pending");
  });

  test("the same search again while queued does not queue twice", async () => {
    await student.request("POST", "/api/discovery/jobs", { body: { country_code: "DE", field: "Computer Science" } });
    const again = await student.request("POST", "/api/discovery/jobs", { body: { country_code: "DE", field: "computer   science" } });
    assert.equal(again.data.status, "pending");
    assert.match(again.data.message, /already being collected/);
    assert.equal((raw.prepare("SELECT COUNT(*) AS n FROM search_cache").get() as { n: number }).n, 1);
  });

  test("a fresh cached search is served from the database without crawling", async () => {
    const future = new Date(Date.now() + 10 * 86400_000).toISOString().replace("T", " ").replace("Z", "");
    raw.prepare(`INSERT INTO search_cache (search_key, country, country_code, field, status, institutions_count, programs_count, pages_inspected, fetched_at, expires_at)
      VALUES ('DE|computer science', 'Germany', 'DE', 'Computer Science', 'ready', 12, 40, 90, '2026-10-10 08:00:00.000', ?)`).run(future);
    const res = await student.request("POST", "/api/discovery/jobs", { body: { country_code: "DE", field: "Computer Science" } });
    assert.equal(res.data.status, "ready");
    assert.equal(res.data.programmes_extracted, 40);
    assert.match(res.data.message, /saved results/);
    const results = await student.request("GET", "/api/discovery/results?country_code=DE&field=Computer%20Science&level=Master");
    assert.equal(results.data.search.stale, false);
    assert.equal(results.data.stats.pagesInspected, 90);
    assert.equal(results.data.stats.lastUpdated, "2026-10-10 08:00:00.000");
  });

  test("results older than 30 days are re-queued and old results stay visible", async () => {
    raw.prepare(`INSERT INTO search_cache (search_key, country, country_code, field, status, programs_count, fetched_at, expires_at)
      VALUES ('DE|computer science', 'Germany', 'DE', 'Computer Science', 'ready', 5, '2026-08-01 08:00:00.000', '2026-08-31 08:00:00.000')`).run();
    const res = await student.request("POST", "/api/discovery/jobs", { body: { country_code: "DE", field: "Computer Science" } });
    assert.equal(res.data.status, "pending");
    assert.match(res.data.message, /Refreshing/);
    const results = await student.request("GET", "/api/discovery/results?country_code=DE&field=Computer%20Science&level=Master");
    assert.ok(results.data.programs.length > 0);
    assert.equal(results.data.search.status, "pending");
  });

  test("each student can start 10 new searches a day", async () => {
    const fields = ["Computer Science", "Artificial Intelligence", "Data Science", "Software Engineering", "Information Technology", "Engineering", "Finance", "Economics", "Law", "Design"];
    for (const f of fields) {
      assert.equal((await student.request("POST", "/api/discovery/jobs", { body: { country_code: "DE", field: f } })).status, 200);
    }
    assert.equal((await student.request("POST", "/api/discovery/jobs", { body: { country_code: "DE", field: "Education" } })).status, 429);
  });

  test("imported countries answer instantly from the database with coverage", async () => {
    raw.prepare(`INSERT INTO crawl_countries (country_code, country, institutions_total, imported_at, institutions_checked, institutions_with_programs, last_update)
      VALUES ('DE', 'Germany', 3, '2026-10-01 00:00:00.000', 1, 1, '2026-10-17 09:00:00.000')`).run();
    raw.prepare(`INSERT INTO institution_queue (domain, university_id, name, country_code, website, status, last_crawled_at, programs_found)
      VALUES ('tum.de', 'univ_tum', 'TUM', 'DE', 'https://www.tum.de/', 'done', '2026-10-17 09:00:00.000', 3),
             ('x.de', 'univ_x', 'X', 'DE', 'https://x.de/', 'pending', NULL, 0)`).run();
    const res = await student.request("POST", "/api/discovery/jobs", { body: { country_code: "DE", field: "Computer Science" } });
    assert.equal(res.data.status, "ready");
    assert.ok(res.data.programmes_extracted > 0);
    assert.match(res.data.message, /1 of 3 universities checked/);
    assert.equal((raw.prepare("SELECT COUNT(*) AS n FROM search_cache").get() as { n: number }).n, 0);
    const results = await student.request("GET", "/api/discovery/results?country_code=DE&field=Computer%20Science&level=Master");
    assert.equal(results.data.coverage.institutions_total, 3);
    assert.equal(results.data.coverage.institutions_checked, 1);
    assert.equal(results.data.search, null);
    assert.equal(results.data.stats.lastUpdated, "2026-10-17 09:00:00.000");
    const list = await new Client(env).request("GET", "/api/discovery/coverage");
    assert.deepEqual(list.data.map((c: { country_code: string }) => c.country_code), ["DE"]);
  });

  test("programmes removed from a university website are hidden", async () => {
    const before = await student.request("GET", "/api/discovery/results?country_code=DE&field=Computer%20Science&level=Master");
    const victim = before.data.programs[0].id;
    raw.prepare("UPDATE programs SET removed_at = '2026-10-01 00:00:00.000' WHERE id = ?").run(victim);
    const after = await student.request("GET", "/api/discovery/results?country_code=DE&field=Computer%20Science&level=Master");
    assert.equal(after.data.programs.length, before.data.programs.length - 1);
    assert.ok(!after.data.programs.some((p: { id: string }) => p.id === victim));
  });

  test("unknown countries are rejected", async () => {
    assert.equal((await student.request("POST", "/api/discovery/jobs", { body: { country: "Atlantis", field: "Law" } })).status, 400);
  });

  test("queuing triggers the GitHub crawler when a dispatch token is set", async () => {
    env.GITHUB_DISPATCH_TOKEN = "ghp_test";
    env.GITHUB_REPO = "owner/repo";
    const realFetch = globalThis.fetch;
    const calls: { url: string; body: string; auth: string | null }[] = [];
    globalThis.fetch = (async (u: RequestInfo | URL, init?: RequestInit) => {
      calls.push({ url: String(u), body: String(init?.body), auth: new Headers(init?.headers).get("Authorization") });
      return new Response(null, { status: 204 });
    }) as typeof fetch;
    try {
      await student.request("POST", "/api/discovery/jobs", { body: { country_code: "DE", field: "Law" } });
    } finally {
      globalThis.fetch = realFetch;
    }
    assert.equal(calls.length, 1);
    assert.equal(calls[0].url, "https://api.github.com/repos/owner/repo/dispatches");
    assert.equal(JSON.parse(calls[0].body).event_type, "crawl");
    assert.equal(calls[0].auth, "Bearer ghp_test");
  });

  test("discovery jobs need login, CSRF and stay private", async () => {
    assert.equal((await new Client(env).request("POST", "/api/discovery/jobs", { body: { country: "Germany", field: "CS" } })).status, 401);
    assert.equal((await student.request("POST", "/api/discovery/jobs", { body: { country: "Germany", field: "CS" }, csrf: false })).status, 403);
    assert.equal((await student.request("POST", "/api/discovery/jobs", { body: { country: "", field: "" } })).status, 400);
    const mine = await student.request("POST", "/api/discovery/jobs", { body: { country: "Germany", field: "Computer Science" } });
    assert.equal(mine.status, 200);
    const bob = new Client(env);
    await bob.login("b@example.test", "BobPass2026yy");
    assert.equal((await bob.request("GET", `/api/discovery/jobs/${mine.data.job_id}`)).status, 404);
    assert.equal((await bob.request("GET", "/api/discovery/jobs")).data.length, 0);
  });

  test("LIKE wildcards in search are treated as text", async () => {
    const res = await student.request("GET", "/api/discovery/results?country_code=DE&field=Computer%20Science&level=Master&q=%25");
    assert.equal(res.data.programs.length, 0);
  });

  test("universities, programs and detail routes", async () => {
    const unis = await student.request("GET", "/api/universities?country=Germany");
    assert.ok(unis.data.length >= 1);
    const progs = await student.request("GET", "/api/programs?level=Master");
    assert.ok(progs.data.every((p: { level: string }) => p.level === "Master"));
    const detail = await student.request("GET", `/api/programs/${progs.data[0].id}`);
    assert.equal(detail.status, 200);
    assert.equal(detail.data.program.id, progs.data[0].id);
    assert.equal((await student.request("GET", "/api/programs/nope")).status, 404);
  });

  test("contacts need a login", async () => {
    assert.equal((await new Client(env).request("GET", "/api/contacts")).status, 401);
    const res = await student.request("GET", "/api/contacts");
    assert.ok(res.data.length >= 7);
    const anon = await new Client(env).request("GET", "/api/universities/univ_mit");
    assert.deepEqual(anon.data.contacts, []);
  });
});
