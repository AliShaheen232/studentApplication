import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { readdirSync, readFileSync, mkdtempSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { Db } from "../../crawler/d1.ts";
import { detectLevel, extractEmails, extractPrograms, scoreLink } from "../../crawler/extract.ts";
import { PoliteFetcher } from "../../crawler/fetcher.ts";
import { fieldMatcher } from "../../crawler/fields.ts";
import { claimNext, failJob, runSearch } from "../../crawler/job.ts";
import { isAllowed, parseRobots } from "../../crawler/robots.ts";
import { fetchInstitutions, parseInstitutions, registrableDomain, type Institution } from "../../crawler/wikidata.ts";
import { sqlTimestamp } from "../../worker/lib/clock.ts";

const MIGRATIONS = join(import.meta.dirname, "..", "..", "migrations");

function sqliteDb(): { db: Db; raw: DatabaseSync } {
  const raw = new DatabaseSync(":memory:");
  raw.exec("PRAGMA foreign_keys = ON;");
  for (const f of readdirSync(MIGRATIONS).filter((x) => x.endsWith(".sql")).sort()) raw.exec(readFileSync(join(MIGRATIONS, f), "utf8"));
  const db: Db = {
    async query(sql, params = []) {
      const stmt = raw.prepare(sql);
      if (/^\s*select/i.test(sql)) return { results: stmt.all(...(params as never[])) as never[], changes: 0 };
      const info = stmt.run(...(params as never[]));
      return { results: [], changes: Number(info.changes) };
    },
    async batch(statements) {
      raw.exec("BEGIN");
      try {
        for (const s of statements) raw.prepare(s.sql).run(...((s.params ?? []) as never[]));
        raw.exec("COMMIT");
      } catch (e) {
        raw.exec("ROLLBACK");
        throw e;
      }
    },
  };
  return { db, raw };
}

function site(pages: Record<string, { body: string; type?: string; status?: number }>): typeof fetch {
  return (async (input: RequestInfo | URL) => {
    const url = String(input instanceof Request ? input.url : input);
    const page = pages[url];
    if (!page) return new Response("not found", { status: 404, headers: { "Content-Type": "text/html" } });
    const res = new Response(page.body, { status: page.status ?? 200, headers: { "Content-Type": page.type ?? "text/html; charset=utf-8" } });
    Object.defineProperty(res, "url", { value: url });
    return res;
  }) as typeof fetch;
}

const noSleep = { minDelayMs: 0, sleep: async () => {} };

describe("robots.txt", () => {
  const rules = parseRobots("User-agent: *\nDisallow: /intern/\nAllow: /intern/public\nDisallow: /*.pdf$\nCrawl-delay: 2\n\nUser-agent: BadBot\nDisallow: /", "AdmitPathBot");
  test("disallow, longer allow wins, wildcard and $ anchors", () => {
    assert.equal(isAllowed(rules, "/studium"), true);
    assert.equal(isAllowed(rules, "/intern/secret"), false);
    assert.equal(isAllowed(rules, "/intern/public/page"), true);
    assert.equal(isAllowed(rules, "/files/guide.pdf"), false);
    assert.equal(rules.crawlDelaySec, 2);
  });
  test("a group for our bot overrides *", () => {
    const own = parseRobots("User-agent: *\nDisallow:\n\nUser-agent: admitpathbot\nDisallow: /", "AdmitPathBot");
    assert.equal(isAllowed(own, "/anything"), false);
  });
});

describe("institutions from Wikidata", () => {
  test("registrable domains", () => {
    assert.equal(registrableDomain("www.tum.de"), "tum.de");
    assert.equal(registrableDomain("www.ox.ac.uk"), "ox.ac.uk");
    assert.equal(registrableDomain("www.cs.utoronto.ca"), "utoronto.ca");
    assert.equal(registrableDomain("uni-heidelberg.de"), "uni-heidelberg.de");
  });

  test("parse, dedupe by domain, skip unlabelled entries, sort by students", () => {
    const b = (qid: string, name: string, site: string, students?: number, city = "Munich") => ({
      uni: { value: `http://www.wikidata.org/entity/${qid}` },
      uniLabel: { value: name },
      website: { value: site },
      cityLabel: { value: city },
      ...(students ? { students: { value: String(students) } } : {}),
    });
    const list = parseInstitutions(
      {
        results: {
          bindings: [
            b("Q1", "Small College", "https://small.de", 900),
            b("Q2", "Technical University of Munich", "https://www.tum.de/en", 50000),
            b("Q2", "Technical University of Munich", "https://tum.de", 50000),
            b("Q3", "Q3", "https://unlabelled.de"),
            b("Q4", "Ftp Uni", "ftp://x.de"),
          ],
        },
      },
      10,
    );
    assert.deepEqual(list.map((i) => i.domain), ["tum.de", "small.de"]);
    assert.equal(list[0].website, "https://www.tum.de/");
  });
});

describe("wikidata request", () => {
  test("falls back to the simpler query when the full one times out", async () => {
    const queries: string[] = [];
    const fake = (async (u: RequestInfo | URL) => {
      const q = decodeURIComponent(String(u).split("query=")[1]);
      queries.push(q);
      if (q.includes("P279*")) return new Response("timeout", { status: 500 });
      return new Response(JSON.stringify({ results: { bindings: [{ uni: { value: "x/Q1" }, uniLabel: { value: "Uni" }, website: { value: "https://u.de" } }] } }));
    }) as typeof fetch;
    const list = await fetchInstitutions("de", 5, fake, async () => {});
    assert.equal(list.length, 1);
    assert.ok(queries[0].includes('wdt:P297 "DE"'));
    assert.ok(queries.at(-1)!.includes("VALUES ?type"));
  });
});

describe("wikidata paging", () => {
  test("pages through a large country and dedupes by domain", async () => {
    const offsets: number[] = [];
    const fake = (async (u: RequestInfo | URL) => {
      const q = decodeURIComponent(String(u).split("query=")[1]);
      const offset = Number(/OFFSET (\d+)/.exec(q)![1]);
      offsets.push(offset);
      const n = offset === 0 ? 800 : 50;
      const bindings = Array.from({ length: n }, (_, i) => {
        const k = offset + i;
        return { uni: { value: `x/Q${k + 1}` }, uniLabel: { value: `Uni ${k}` }, website: { value: `https://u${k}.de` }, students: { value: String(10000 - k) } };
      });
      return new Response(JSON.stringify({ results: { bindings } }));
    }) as typeof fetch;
    const list = await fetchInstitutions("de", 5000, fake, async () => {});
    assert.deepEqual(offsets, [0, 800]);
    assert.equal(list.length, 850);
    assert.equal(list[0].domain, "u0.de");
  });
});

describe("field matching and degree detection", () => {
  const cs = fieldMatcher("Computer Science");
  test("multilingual synonyms", () => {
    assert.ok(cs.matches("Informatik (M.Sc.)"));
    assert.ok(cs.matches("MSc Computer Science"));
    assert.ok(cs.matches("Master Informatique"));
    assert.equal(cs.matches("History of Art (B.A.)"), false);
  });
  test("custom search terms", () => {
    const rob = fieldMatcher("Robotics");
    assert.ok(rob.matches("M.Sc. Robotics, Cognition, Intelligence"));
  });
  test("levels", () => {
    assert.equal(detectLevel("Informatik (M.Sc.)")?.level, "Master");
    assert.equal(detectLevel("Informatik (M.Sc.)")?.degree, "M.Sc.");
    assert.equal(detectLevel("Bachelor of Science in Computing")?.level, "Bachelor");
    assert.equal(detectLevel("PhD in Computer Science")?.level, "PhD");
    assert.equal(detectLevel("Executive MBA")?.level, "MBA");
    assert.equal(detectLevel("Linguistics MA")?.level, "Master");
    assert.equal(detectLevel("data management"), null);
  });
});

const TUM_HOME = `<html><head><title>TUM</title></head><body>
  <nav><a href="/en/studies">Studies</a> <a href="/en/news">News</a> <a href="https://twitter.com/tum">Twitter</a>
  <a href="/en/studies/degree-programs">Degree programs</a> <a href="https://other.edu/study">Other uni</a></nav>
  <p>Contact: studium@tum.de, press@tum.de, max.mustermann@tum.de, someone@gmail.com</p>
</body></html>`;

const TUM_PROGRAMS = `<html><head><title>Degree programs | TUM</title></head><body>
  <h1>Degree programs</h1>
  <ul>
    <li><a href="/en/studies/informatics-msc">Informatics (M.Sc.)</a></li>
    <li><a href="/en/studies/informatics-bsc">Informatics (B.Sc.)</a></li>
    <li><a href="/en/studies/history">History (B.A.)</a></li>
    <li><a href="/en/studies/apply">Apply now for Computer Science</a></li>
    <li><a href="/en/studies/ml-module">Machine Learning module</a></li>
    <li><a href="/en/studies/dei-msc">Data Engineering and Analytics (M.Sc.) taught in English</a></li>
  </ul>
  <h3>Doctorate in Computer Science</h3>
  <p>International office: international [at] tum.de</p>
  <script>var x = "Informatics (M.Sc.) fake";</script>
</body></html>`;

describe("extraction", () => {
  const cs = fieldMatcher("Computer Science");
  test("programs from a catalogue page, noise ignored", () => {
    const progs = extractPrograms(TUM_PROGRAMS, "https://www.tum.de/en/studies/degree-programs", cs, "tum.de");
    const names = progs.map((p) => `${p.level}: ${p.name}`).sort();
    assert.deepEqual(names, [
      "Bachelor: Informatics (B.Sc.)",
      "Master: Informatics (M.Sc.)",
      "PhD: Doctorate in Computer Science",
    ]);
    assert.equal(progs.find((p) => p.level === "Master")?.url, "https://www.tum.de/en/studies/informatics-msc");
  });

  test("Data Science field finds the English-taught program", () => {
    const ds = fieldMatcher("Data Science");
    const progs = extractPrograms(TUM_PROGRAMS, "https://www.tum.de/en/studies/degree-programs", ds, "tum.de");
    assert.equal(progs.length, 1);
    assert.equal(progs[0].language, "English");
    assert.equal(progs[0].name, "Data Engineering and Analytics (M.Sc.)");
  });

  test("context level from a Master's listing page", () => {
    const html = `<html><head><title>Master's programmes</title></head><body><a href="/cs">Computer Science</a><a href="/news">Computer Science news</a></body></html>`;
    const progs = extractPrograms(html, "https://uni.example.org/masters", cs, "example.org");
    assert.deepEqual(progs.map((p) => [p.level, p.name]), [["Master", "Computer Science"]]);
  });

  test("emails: own domain only, role first, obfuscation, skip press", () => {
    const home = extractEmails(TUM_HOME, "https://www.tum.de/", "tum.de");
    const byEmail = Object.fromEntries(home.map((c) => [c.email, c]));
    assert.equal(byEmail["studium@tum.de"].type, "role");
    assert.equal(byEmail["studium@tum.de"].name, "Student Advisory Service");
    assert.equal(byEmail["max.mustermann@tum.de"].type, "personal");
    assert.equal(byEmail["press@tum.de"], undefined);
    assert.equal(byEmail["someone@gmail.com"], undefined);
    const prog = extractEmails(TUM_PROGRAMS, "https://www.tum.de/x", "tum.de");
    assert.equal(prog[0].email, "international@tum.de");
  });

  test("link scoring stays on site and skips news and social", () => {
    const score = (href: string, text: string) => scoreLink({ href, text }, "tum.de", cs);
    assert.ok(score("https://www.tum.de/en/studies/degree-programs", "Degree programs") > 0);
    assert.ok(score("https://www.tum.de/en/informatics", "Informatics") > score("https://www.tum.de/en/studies", "Studies"));
    assert.equal(score("https://www.tum.de/en/news", "News"), 0);
    assert.equal(score("https://twitter.com/tum", "Twitter"), 0);
    assert.equal(score("https://other.edu/study", "Study"), 0);
  });
});

describe("polite fetcher", () => {
  test("obeys robots.txt, skips non-HTML, blocks host after 403", async () => {
    const calls: string[] = [];
    const base = site({
      "https://u.de/robots.txt": { body: "User-agent: *\nDisallow: /private", type: "text/plain" },
      "https://u.de/ok": { body: "<p>ok</p>" },
      "https://u.de/file": { body: "%PDF", type: "application/pdf" },
      "https://v.de/robots.txt": { body: "", type: "text/plain", status: 404 },
      "https://v.de/forbidden": { body: "no", status: 403 },
      "https://v.de/after": { body: "<p>never</p>" },
    });
    const f = new PoliteFetcher({ ...noSleep, fetchImpl: (async (u: RequestInfo | URL, i?: RequestInit) => (calls.push(String(u)), base(u, i))) as typeof fetch });
    assert.ok(await f.get("https://u.de/ok"));
    assert.equal(await f.get("https://u.de/private/x"), null);
    assert.ok(!calls.includes("https://u.de/private/x"));
    assert.equal(await f.get("https://u.de/file"), null);
    assert.equal(await f.get("https://v.de/forbidden"), null);
    assert.equal(await f.get("https://v.de/after"), null);
    assert.ok(!calls.includes("https://v.de/after"));
    assert.equal(await f.get("mailto:x@y.de"), null);
  });

  test("sends the AdmitPath user agent", async () => {
    let ua = "";
    const f = new PoliteFetcher({
      ...noSleep,
      fetchImpl: (async (_u: RequestInfo | URL, init?: RequestInit) => {
        ua = new Headers(init?.headers).get("User-Agent") || "";
        return new Response("<p></p>", { headers: { "Content-Type": "text/html" } });
      }) as typeof fetch,
    });
    await f.get("https://w.de/");
    assert.match(ua, /^AdmitPathBot\/1\.0/);
  });
});

describe("search job pipeline", () => {
  const NOW = Date.parse("2026-10-18T10:00:00Z");
  const tum: Institution = { qid: "Q157808", name: "Technical University of Munich", website: "https://www.tum.de/", domain: "tum.de", city: "Munich", students: 50000 };
  const empty: Institution = { qid: "Q9", name: "Art Academy", website: "https://art.de/", domain: "art.de", city: "Berlin", students: 500 };
  const pages = site({
    "https://www.tum.de/robots.txt": { body: "", type: "text/plain" },
    "https://www.tum.de/": { body: TUM_HOME },
    "https://www.tum.de/en/studies": { body: "<p>Studies</p>" },
    "https://www.tum.de/en/studies/degree-programs": { body: TUM_PROGRAMS },
    "https://art.de/robots.txt": { body: "", type: "text/plain" },
    "https://art.de/": { body: "<p>Painting (B.A.)</p>" },
  });

  function queue(raw: DatabaseSync, field = "Computer Science") {
    raw
      .prepare("INSERT INTO search_cache (search_key, country, country_code, field, status, requested_at, attempts) VALUES (?, 'Germany', 'DE', ?, 'pending', ?, 0)")
      .run(`DE|${field.toLowerCase()}`, field, sqlTimestamp(NOW));
  }

  test("crawls, stores programs, contacts and a JSON snapshot, cached for 100 days", async () => {
    const { db, raw } = sqliteDb();
    queue(raw);
    const job = await claimNext(db, NOW);
    assert.ok(job);
    assert.equal((raw.prepare("SELECT status FROM search_cache").get() as { status: string }).status, "running");
    const out = mkdtempSync(join(tmpdir(), "crawl-"));
    const summary = await runSearch(db, new PoliteFetcher({ ...noSleep, fetchImpl: pages }), job!, {
      maxUniversities: 10,
      maxPagesPerUniversity: 10,
      concurrency: 2,
      outputDir: out,
      now: () => NOW,
      institutions: async () => [tum, empty],
    });

    assert.equal(summary.programs.length, 3);
    assert.equal(summary.institutions_with_programs, 1);
    const row = raw.prepare("SELECT * FROM search_cache").get() as Record<string, string | number>;
    assert.equal(row.status, "ready");
    assert.equal(row.programs_count, 3);
    assert.equal(row.expires_at, sqlTimestamp(NOW + 100 * 86400_000));
    assert.equal(JSON.parse(String(row.results_json)).programs.length, 3);
    assert.ok(existsSync(join(out, "DE_computer_science.json")));

    const tumRow = raw.prepare("SELECT id, name, country_code, last_verified FROM universities WHERE domain = 'tum.de'").get() as Record<string, string>;
    assert.equal(tumRow.id, "univ_tum");
    assert.equal(tumRow.name, "Technical University of Munich (TUM)");
    assert.equal(tumRow.last_verified, sqlTimestamp(NOW));
    assert.equal(raw.prepare("SELECT COUNT(*) AS n FROM universities WHERE domain = 'art.de'").get()!.n, 0);

    const progs = raw.prepare("SELECT name, level, subject_category, source_type FROM programs WHERE source_type = 'official_website' ORDER BY name").all() as Record<string, string>[];
    assert.equal(progs.length, 3);
    assert.ok(progs.every((p) => p.subject_category === "Computer Science"));
    const contacts = raw.prepare("SELECT email, email_type FROM contacts WHERE university_id = 'univ_tum' AND fetched_at IS NOT NULL ORDER BY email").all() as Record<string, string>[];
    assert.deepEqual(contacts.map((c) => c.email), ["international@tum.de", "max.mustermann@tum.de", "studium@tum.de"]);
  });

  test("re-running the same search updates rows instead of duplicating", async () => {
    const { db, raw } = sqliteDb();
    queue(raw);
    const opts = { maxUniversities: 10, maxPagesPerUniversity: 10, concurrency: 1, now: () => NOW, institutions: async () => [tum] };
    await runSearch(db, new PoliteFetcher({ ...noSleep, fetchImpl: pages }), (await claimNext(db, NOW))!, opts);
    raw.prepare("UPDATE search_cache SET status = 'pending'").run();
    await runSearch(db, new PoliteFetcher({ ...noSleep, fetchImpl: pages }), (await claimNext(db, NOW))!, opts);
    assert.equal(raw.prepare("SELECT COUNT(*) AS n FROM programs WHERE source_type = 'official_website'").get()!.n, 3);
  });

  test("a second field adds to the subject list of shared programs", async () => {
    const { db, raw } = sqliteDb();
    queue(raw, "Computer Science");
    queue(raw, "Artificial Intelligence");
    const opts = { maxUniversities: 10, maxPagesPerUniversity: 10, concurrency: 1, now: () => NOW, institutions: async () => [tum] };
    const page = site({
      "https://www.tum.de/robots.txt": { body: "", type: "text/plain" },
      "https://www.tum.de/": { body: `<a href="/p">Computer Science and Artificial Intelligence (M.Sc.)</a>` },
    });
    await runSearch(db, new PoliteFetcher({ ...noSleep, fetchImpl: page }), (await claimNext(db, NOW))!, opts);
    await runSearch(db, new PoliteFetcher({ ...noSleep, fetchImpl: page }), (await claimNext(db, NOW + 1))!, opts);
    const cat = raw.prepare("SELECT subject_category FROM programs WHERE source_type = 'official_website'").get() as { subject_category: string };
    assert.equal(cat.subject_category, "Computer Science, Artificial Intelligence");
  });

  test("no results: ready with a note, retried after 7 days", async () => {
    const { db, raw } = sqliteDb();
    queue(raw, "Law");
    const job = (await claimNext(db, NOW))!;
    await runSearch(db, new PoliteFetcher({ ...noSleep, fetchImpl: pages }), job, {
      maxUniversities: 10, maxPagesPerUniversity: 5, concurrency: 1, now: () => NOW, institutions: async () => [empty],
    });
    const row = raw.prepare("SELECT status, programs_count, expires_at, last_error FROM search_cache").get() as Record<string, string | number>;
    assert.equal(row.status, "ready");
    assert.equal(row.programs_count, 0);
    assert.equal(row.expires_at, sqlTimestamp(NOW + 7 * 86400_000));
    assert.match(String(row.last_error), /No Law programmes found on 1 university/);
  });

  test("claiming is exclusive, stuck jobs are requeued, failures give up after 3 attempts", async () => {
    const { db, raw } = sqliteDb();
    queue(raw);
    const a = await claimNext(db, NOW);
    assert.ok(a);
    assert.equal(await claimNext(db, NOW), null);
    const b = await claimNext(db, NOW + 46 * 60_000);
    assert.ok(b);
    assert.equal(b!.attempts, 2);
    await failJob(db, b!, "boom");
    assert.equal((raw.prepare("SELECT status FROM search_cache").get() as { status: string }).status, "pending");
    const c = await claimNext(db, NOW + 47 * 60_000);
    await failJob(db, c!, "boom again");
    const row = raw.prepare("SELECT status, last_error FROM search_cache").get() as Record<string, string>;
    assert.equal(row.status, "failed");
    assert.equal(row.last_error, "boom again");
  });
});
