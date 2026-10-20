import { test, describe, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { Client, addUser, createEnv } from "./helpers.ts";

const PAGE = `<html><body><h1>Contact</h1><p>Admissions office: admissions@example.edu.au</p></body></html>`;

describe("compose", () => {
  let env: ReturnType<typeof createEnv>["env"];
  let raw: ReturnType<typeof createEnv>["raw"];
  let alice: Client;
  let realFetch: typeof fetch;
  let fetched: string[];

  beforeEach(async () => {
    ({ env, raw } = createEnv());
    addUser(raw, { id: "usr_a", email: "a@example.test", password: "AlicePass2026x" });
    alice = new Client(env);
    await alice.login("a@example.test", "AlicePass2026x");
    raw.prepare("INSERT INTO universities (id, name, country, country_code, city, website, domain) VALUES ('univ_x', 'Example University', 'Australia', 'AU', '', 'https://www.example.edu.au/', 'example.edu.au')").run();
    raw.prepare("INSERT INTO programs (id, university_id, name, level) VALUES ('prog_x', 'univ_x', 'Computer Science (M.Sc.)', 'Master')").run();
    fetched = [];
    realFetch = globalThis.fetch;
    globalThis.fetch = (async (input: RequestInfo | URL) => {
      const url = String(input instanceof Request ? input.url : input);
      fetched.push(url);
      if (url.endsWith("/robots.txt")) return new Response("", { status: 404 });
      return new Response(PAGE, { headers: { "Content-Type": "text/html" } });
    }) as typeof fetch;
  });

  afterEach(() => {
    globalThis.fetch = realFetch;
  });

  const generate = () => alice.request("POST", "/api/compose/generate", { body: { program_id: "prog_x", template_key: "academic_inquiry" } });

  test("draft uses a generic greeting and offers a contact search when no email is known", async () => {
    const res = await generate();
    assert.equal(res.status, 200);
    assert.equal(res.data.recipient_email, "");
    assert.equal(res.data.can_search, true);
    assert.ok(res.data.body_text.startsWith("Dear Admissions Team,"));
    assert.ok(res.data.body_text.includes("Computer Science (M.Sc.)"));
    assert.equal((await alice.request("POST", "/api/compose/generate", { body: { program_id: "missing" } })).status, 404);
  });

  test("draft only states the education and work history the student gave", async () => {
    raw.prepare("INSERT OR REPLACE INTO students (user_id, full_name, current_degree_level, field_of_study, current_institution, graduation_year, graduation_month, gpa, max_gpa, work_experience_years, work_field, subjects, intake_term) VALUES ('usr_a', 'Ali Khan', 'Bachelor', 'Software Engineering', 'Test University', 2024, 7, 3.2, 4, 2, 'web development', 'Data Science', 'Fall 2027')").run();
    const text = (await generate()).data.body_text as string;
    assert.ok(text.includes("I completed my Bachelor in Software Engineering at Test University in July 2024 with a grade of 3.2/4."));
    assert.ok(text.includes("2 years of work experience in web development."));
    assert.ok(!text.includes("Data Science"));
    assert.ok(!text.toLowerCase().includes("stop"));
    raw.prepare("UPDATE students SET education_history = ? WHERE user_id = 'usr_a'").run(JSON.stringify([
      { level: "School (Matric)", subject: "Science", institution: "City School", year: 2012 },
      { level: "BS (Hons.)", subject: "Business Administration", institution: "VU", year: 2019 },
    ]));
    const paras = ((await generate()).data.body_text as string).split("\n\n");
    assert.ok(paras[2].startsWith("I completed my Bachelor in Software Engineering"));
    assert.ok(paras[2].includes("Before that, I completed my BS (Hons.) in Business Administration at VU in 2019 and my School (Matric) in Science at City School in 2012."));
    assert.ok(paras[3].startsWith("I also have 2 years of work experience") || paras[3].startsWith("I have"));
    assert.ok(!paras[2].includes("experience"));
    const history = JSON.stringify([
      { field: "Sales", start: "2018-01", end: "2020-01" },
      { field: "Project Management", start: "2020-02", end: "2023-02" },
      { field: "Logistics", start: "2024-01", end: null },
    ]);
    raw.prepare("UPDATE students SET work_history = ?, work_experience_years = 7 WHERE user_id = 'usr_a'").run(history);
    const multi = (await generate()).data.body_text as string;
    assert.ok(multi.includes("I have 7 years of professional experience: 2 years in Sales, 3 years in Project Management and"));
    assert.ok(multi.includes("in Logistics (current)."));
    raw.prepare("UPDATE students SET work_history = NULL WHERE user_id = 'usr_a'").run();
    raw.prepare("UPDATE students SET current_degree_level = NULL, work_experience_years = 0, work_field = NULL WHERE user_id = 'usr_a'").run();
    const bare = (await generate()).data.body_text as string;
    assert.ok(!bare.includes("work experience") && !bare.includes("Before that"));
  });

  test("eligibility template asks if the student qualifies and adds nationality and test score", async () => {
    raw.prepare("INSERT OR REPLACE INTO students (user_id, full_name, nationality, english_test, ielts_score, gpa, max_gpa) VALUES ('usr_a', 'Ali Khan', 'Pakistani', 'ielts', 6.5, 3.2, 4)").run();
    const res = await alice.request("POST", "/api/compose/generate", { body: { program_id: "prog_x", template_key: "eligibility_check" } });
    assert.ok(res.data.body_text.includes("am I eligible for admission"));

    assert.ok(res.data.body_text.includes("My IELTS score is 6.5."));
  });

  test("find-contact reads the university's own site once and keeps the email", async () => {
    const found = await alice.request("POST", "/api/compose/find-contact", { body: { university_id: "univ_x" } });
    assert.equal(found.data.recipient_email, "admissions@example.edu.au");
    assert.ok(fetched.every((u) => u.includes("example.edu.au")));
    const before = fetched.length;
    await alice.request("POST", "/api/compose/find-contact", { body: { university_id: "univ_x" } });
    assert.equal(fetched.length, before);
    const res = await generate();
    assert.equal(res.data.recipient_email, "admissions@example.edu.au");
    assert.equal(res.data.can_search, false);
  });

  test("a university with no email on its site is not searched again", async () => {
    globalThis.fetch = (async (input: RequestInfo | URL) => {
      const url = String(input instanceof Request ? input.url : input);
      if (url.endsWith("/robots.txt")) return new Response("", { status: 404 });
      return new Response("<html><body>Hello</body></html>", { headers: { "Content-Type": "text/html" } });
    }) as typeof fetch;
    const first = await alice.request("POST", "/api/compose/find-contact", { body: { university_id: "univ_x" } });
    assert.equal(first.data.recipient_email, "");
    assert.equal((await generate()).data.can_search, false);
  });

  test("send needs a valid recipient and a connected Gmail", async () => {
    const bad = await alice.request("POST", "/api/compose/send", { body: { recipient_email: "nope", subject: "s", body_text: "b" } });
    assert.equal(bad.status, 400);
    const noGmail = await alice.request("POST", "/api/compose/send", { body: { recipient_email: "x@example.edu.au", subject: "s", body_text: "b", program_id: "prog_x" } });
    assert.equal(noGmail.status, 400);
    assert.equal(noGmail.data.code, "not_connected");
    assert.equal((await new Client(env).request("POST", "/api/compose/send", { body: {} })).status, 401);
  });
});
