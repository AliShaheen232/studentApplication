import { test, describe, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { Client, addUser, createEnv } from "./helpers.ts";
import { crawlState } from "../../worker/routes/live.ts";
import { sqlTimestamp } from "../../worker/lib/clock.ts";

const HOME = `<html><head><title>Example University</title></head><body>
  <a href="/study/master">Master's programmes</a>
  <a href="https://elsewhere.org/cs">Partner portal</a>
  <ul><li><a href="/study/master/cs">Computer Science (M.Sc.)</a></li><li><a href="/study/bachelor/law">Law (LL.B.)</a></li></ul>
  <p>Questions? admissions@example.edu.au</p></body></html>`;

describe("live discovery", () => {
  let env: ReturnType<typeof createEnv>["env"];
  let raw: ReturnType<typeof createEnv>["raw"];
  let alice: Client;
  let bob: Client;
  let realFetch: typeof fetch;
  let fetched: string[];
  let robots: string;

  beforeEach(async () => {
    ({ env, raw } = createEnv());
    addUser(raw, { id: "usr_a", email: "a@example.test", password: "AlicePass2026x" });
    addUser(raw, { id: "usr_b", email: "b@example.test", password: "BobPass2026yy" });
    alice = new Client(env);
    bob = new Client(env, "203.0.113.11");
    await alice.login("a@example.test", "AlicePass2026x");
    await bob.login("b@example.test", "BobPass2026yy");

    for (const [id, name, domain, students] of [
      ["univ_tagged", "Tagged University", "tagged.edu.au", 1000],
      ["univ_new", "Example University", "example.edu.au", 30000],
      ["univ_small", "Small College", "small.edu.au", 50],
    ] as const) {
      raw.prepare("INSERT INTO universities (id, name, country, country_code, city, website, domain) VALUES (?, ?, 'Australia', 'AU', '', ?, ?)")
        .run(id, name, `https://www.${domain}/`, domain);
      raw.prepare("INSERT INTO institution_queue (domain, university_id, name, country_code, website, students, status) VALUES (?, ?, ?, 'AU', ?, ?, 'pending')")
        .run(domain, id, name, `https://www.${domain}/`, students);
    }
    raw.prepare("UPDATE institution_queue SET status = 'done', last_crawled_at = ? WHERE university_id = 'univ_tagged'").run(sqlTimestamp());
    raw.prepare("INSERT INTO university_subjects (country_code, subject, university_id, rank_sort, levels) VALUES ('AU', 'Computer Science', 'univ_tagged', 100500, 'Master')").run();

    fetched = [];
    robots = "";
    realFetch = globalThis.fetch;
    globalThis.fetch = (async (input: RequestInfo | URL) => {
      const url = String(input instanceof Request ? input.url : input);
      fetched.push(url);
      if (url.endsWith("/robots.txt")) return robots ? new Response(robots) : new Response("", { status: 404 });
      return new Response(HOME, { headers: { "Content-Type": "text/html" } });
    }) as typeof fetch;
  });

  afterEach(() => {
    globalThis.fetch = realFetch;
  });

  const list = (c: Client, page = 0) => c.request("GET", `/api/discovery/institutions?country_code=AU&field=Computer%20Science&level=Master&page=${page}`);
  const start = (c: Client, id = "univ_new") => c.request("POST", "/api/discovery/live/start", { body: { university_id: id, field: "Computer Science" } });
  const step = (c: Client, url: string, id = "univ_new") => c.request("POST", "/api/discovery/live/step", { body: { university_id: id, field: "Computer Science", url } });
  const finish = (c: Client, id = "univ_new") => c.request("POST", "/api/discovery/live/finish", { body: { university_id: id, field: "Computer Science" } });

  test("lists tagged universities first, then unchecked ones by size", async () => {
    const res = await list(alice);
    assert.equal(res.status, 200);
    assert.deepEqual(res.data.institutions.map((i: { id: string }) => i.id), ["univ_tagged", "univ_new", "univ_small"]);
    assert.equal(res.data.institutions[0].tagged, true);
    assert.equal(res.data.institutions[1].status, "new");
    assert.equal(res.data.page_size, 15);
    assert.equal(res.data.has_more, false);
    assert.equal((await alice.request("GET", "/api/discovery/institutions?country_code=AU&field=Computer%20Science")).status, 400);
  });

  test("start, step and finish crawl one university and keep the result", async () => {
    assert.equal((await new Client(env).request("POST", "/api/discovery/live/start", { body: { university_id: "univ_new", field: "Computer Science" } })).status, 401);
    const s = await start(alice);
    assert.equal(s.data.status, "started");
    assert.equal(s.data.start_url, "https://www.example.edu.au/");
    assert.equal((await start(bob)).data.status, "busy");
    assert.equal((await step(bob, "https://www.example.edu.au/")).status, 409);
    assert.equal((await step(alice, "https://evil.example.com/")).status, 400);

    const r = await step(alice, "https://www.example.edu.au/");
    assert.equal(r.status, 200);
    assert.equal(r.data.status, "ok");
    assert.deepEqual(r.data.programs.map((p: { name: string; level: string }) => `${p.level} ${p.name}`), ["Master Computer Science (M.Sc.)"]);
    assert.ok(r.data.links.some((l: { url: string }) => l.url === "https://www.example.edu.au/study/master/cs"));
    assert.ok(!r.data.links.some((l: { url: string }) => l.url.includes("elsewhere.org")));
    assert.equal(r.data.pages, 1);
    assert.equal(raw.prepare("SELECT COUNT(*) AS n FROM program_search WHERE university_id = 'univ_new' AND subject = 'Computer Science' AND level = 'Master'").get()!.n, 1);
    assert.equal(raw.prepare("SELECT levels FROM university_subjects WHERE university_id = 'univ_new' AND subject = 'Computer Science'").get()!.levels, "Master");
    assert.equal(raw.prepare("SELECT COUNT(*) AS n FROM contacts WHERE university_id = 'univ_new'").get()!.n, 1);

    await step(alice, "https://www.example.edu.au/study/master");
    assert.equal(raw.prepare("SELECT COUNT(*) AS n FROM programs WHERE university_id = 'univ_new'").get()!.n, 1);

    const f = await finish(alice);
    assert.equal(f.data.status, "done");
    assert.equal((await finish(alice)).status, 409);
    const budget = raw.prepare("SELECT live_crawls, rows_written FROM crawl_budget").get() as { live_crawls: number; rows_written: number };
    assert.equal(budget.live_crawls, 1);
    assert.ok(budget.rows_written > 0);

    const after = await list(bob);
    const uni = after.data.institutions.find((i: { id: string }) => i.id === "univ_new");
    assert.equal(uni.status, "fresh");
    assert.equal(uni.tagged, true);
    assert.equal(uni.programs[0].name, "Computer Science (M.Sc.)");
    assert.equal((await start(bob)).data.status, "fresh");
  });

  test("robots.txt is respected and pages are capped per university", async () => {
    robots = "User-agent: *\nDisallow: /";
    await start(alice);
    const r = await step(alice, "https://www.example.edu.au/");
    assert.equal(r.data.skipped, "robots.txt");
    assert.deepEqual(r.data.programs, []);
    assert.ok(!fetched.includes("https://www.example.edu.au/"));
    raw.prepare("UPDATE live_crawls SET pages = 8").run();
    assert.equal((await step(alice, "https://www.example.edu.au/")).data.status, "done");
  });

  test("daily and per-student limits stop new checks", async () => {
    raw.prepare("INSERT INTO crawl_budget (day, rows_written, live_crawls) VALUES (?, 0, 400)").run(sqlTimestamp().slice(0, 10));
    const r = await start(alice);
    assert.equal(r.status, 429);
    assert.equal(r.data.status, "limit");
    raw.prepare("DELETE FROM crawl_budget").run();
    raw.prepare("INSERT INTO usage_ledger (id, user_id, date, discovery_searches) VALUES ('u1', 'usr_a', ?, 60)").run(sqlTimestamp().slice(0, 10));
    assert.equal((await start(alice)).status, 429);
    assert.equal((await start(bob)).data.status, "started");
  });

  test("checked universities without the subject drop out of the unchecked list", async () => {
    raw.prepare("INSERT INTO live_crawls (university_id, subject, status, finished_at, programs_found) VALUES ('univ_small', 'Computer Science', 'done', ?, 0)").run(sqlTimestamp());
    const res = await list(alice);
    assert.deepEqual(res.data.institutions.map((i: { id: string }) => i.id), ["univ_tagged", "univ_new"]);
  });

  test("crawl state ages out", () => {
    const now = Date.parse("2026-10-18T12:00:00Z");
    assert.equal(crawlState({ status: "done", claimed_by: null, started_at: null, finished_at: sqlTimestamp(now - 86400_000) }, now), "fresh");
    assert.equal(crawlState({ status: "done", claimed_by: null, started_at: null, finished_at: sqlTimestamp(now - 31 * 86400_000) }, now), "stale");
    assert.equal(crawlState({ status: "running", claimed_by: "x", started_at: sqlTimestamp(now - 60_000), finished_at: null }, now), "running");
    assert.equal(crawlState({ status: "running", claimed_by: "x", started_at: sqlTimestamp(now - 20 * 60_000), finished_at: null }, now), "new");
  });
});
