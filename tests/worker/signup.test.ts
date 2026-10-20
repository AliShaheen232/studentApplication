import { test, describe, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { clock } from "../../worker/lib/clock.ts";
import { validateProfile } from "../../worker/lib/profile.ts";
import { Client, addUser, createEnv } from "./helpers.ts";

const CLIENT_ID = "client-123.apps.googleusercontent.com";

let realFetch: typeof fetch;
let realNow: () => number;
let fakeTime: number;
let tokenBodies: URLSearchParams[];
let nextIdentity: Record<string, unknown>;

function b64url(obj: unknown): string {
  return Buffer.from(JSON.stringify(obj)).toString("base64url");
}

function idToken(claims: Record<string, unknown>): string {
  return `${b64url({ alg: "RS256" })}.${b64url(claims)}.sig`;
}

export const GOOD_PROFILE = {
  full_name: "Ali Shaheen",
  nationality: "Pakistan",
  country_of_residence: "Pakistan",
  linkedin_url: "https://www.linkedin.com/in/ali",
  current_degree_level: "Bachelor",
  field_of_study: "Computer Science",
  current_institution: "FAST NUCES",
  graduation_year: 2025,
  gpa: 3.4,
  max_gpa: 4,
  target_level: "Master",
  subjects: ["Computer Science", "Artificial Intelligence"],
  countries: ["Germany", "Netherlands"],
  intake_term: "Fall 2027",
  budget_max: 5000,
  currency: "EUR",
  funding: "partial",
  english_test: "ielts",
  ielts_score: 7,
  german_level: "A2",
  work_experience_years: 1.5,
  research_interests: "Computer vision for low-light scenes",
  experience: "Working student at a charging company",
  academic_achievements: "Dean's list",
  preferred_universities: "TU Munich",
  additional_preferences: "",
};

describe("profile validation", () => {
  const now = new Date("2026-10-18T00:00:00Z");

  test("a complete profile passes and builds the qualification text", () => {
    const { values, errors } = validateProfile(GOOD_PROFILE, now);
    assert.deepEqual(errors, {});
    assert.equal(values.qualification, "Bachelor in Computer Science");
    assert.equal(values.subjects, "Computer Science, Artificial Intelligence");
    assert.equal(values.ielts_score, 7);
    assert.equal(values.toefl_score, null);
    assert.equal(values.additional_preferences, null);
  });

  test("required fields are reported", () => {
    const { errors } = validateProfile({}, now);
    for (const key of ["full_name", "nationality", "country_of_residence", "current_degree_level", "field_of_study", "gpa", "max_gpa", "target_level", "subjects", "countries", "intake_term", "budget_max", "currency", "english_test"]) {
      assert.ok(errors[key], `expected error for ${key}`);
    }
  });

  test("GPA cannot exceed the scale", () => {
    assert.ok(validateProfile({ ...GOOD_PROFILE, gpa: 4.5, max_gpa: 4 }, now).errors.gpa);
    assert.equal(validateProfile({ ...GOOD_PROFILE, gpa: 85, max_gpa: 100 }, now).errors.gpa, undefined);
    assert.ok(validateProfile({ ...GOOD_PROFILE, max_gpa: 7 }, now).errors.max_gpa);
  });

  test("English score must match the chosen test", () => {
    assert.ok(validateProfile({ ...GOOD_PROFILE, ielts_score: 7.3 }, now).errors.ielts_score);
    assert.ok(validateProfile({ ...GOOD_PROFILE, english_test: "toefl", toefl_score: 130 }, now).errors.toefl_score);
    const planned = validateProfile({ ...GOOD_PROFILE, english_test: "planned", ielts_score: 9 }, now);
    assert.deepEqual(planned.errors, {});
    assert.equal(planned.values.ielts_score, null);
  });

  test("subjects and countries must come from the lists", () => {
    assert.ok(validateProfile({ ...GOOD_PROFILE, subjects: ["Basket weaving"] }, now).errors.subjects);
    assert.ok(validateProfile({ ...GOOD_PROFILE, countries: ["Atlantis"] }, now).errors.countries);
    assert.ok(validateProfile({ ...GOOD_PROFILE, countries: ["India"] }, now).errors.countries);
    const ten = ["Germany", "Netherlands", "Serbia", "Russia", "Spain", "Japan", "Canada", "Ukraine", "Turkey", "Australia"];
    assert.equal(validateProfile({ ...GOOD_PROFILE, countries: ten }, now).errors.countries, undefined);
    assert.ok(validateProfile({ ...GOOD_PROFILE, countries: [...ten, "France"] }, now).errors.countries);
    assert.ok(validateProfile({ ...GOOD_PROFILE, subjects: [] }, now).errors.subjects);
    const seven = ["Computer Science", "Artificial Intelligence", "Data Science", "Software Engineering", "Information Technology", "Engineering", "Finance"];
    assert.equal(validateProfile({ ...GOOD_PROFILE, subjects: seven }, now).errors.subjects, undefined);
    assert.ok(validateProfile({ ...GOOD_PROFILE, subjects: [...seven, "Law"] }, now).errors.subjects);
  });

  test("earlier education is kept as a checked list", () => {
    const rows = [
      { level: "School (Matric)", subject: "Science", institution: "City School", year: 2015, grade: "A*" },
      { level: "BS (Hons.)", subject: "Business", institution: "VU", year: "2021", grade: "2.86/4" },
      { level: "", subject: "ignored" },
    ];
    const ok = validateProfile({ ...GOOD_PROFILE, education_history: rows }, now);
    assert.equal(ok.errors.education_history, undefined);
    const saved = JSON.parse(String(ok.values.education_history));
    assert.equal(saved.length, 2);
    assert.equal(saved[1].year, 2021);
    assert.equal(validateProfile(GOOD_PROFILE, now).values.education_history, null);
    const old = validateProfile({ ...GOOD_PROFILE, education_history: [{ level: "Bachelor / BS", year: 2020 }, { level: "BS (Lateral)" }, { level: "MPhil" }] }, now);
    assert.equal(old.errors.education_history, undefined);
    assert.deepEqual(JSON.parse(String(old.values.education_history)).map((r: { level: string }) => r.level), ["BS (Hons.)", "BS (Lateral)", "MPhil"]);
    assert.ok(validateProfile({ ...GOOD_PROFILE, education_history: [{ level: "Kindergarten" }] }, now).errors.education_history);
    assert.ok(validateProfile({ ...GOOD_PROFILE, education_history: [{ level: "PhD", year: 1800 }] }, now).errors.education_history);
    assert.ok(validateProfile({ ...GOOD_PROFILE, education_history: Array(9).fill({ level: "PhD" }) }, now).errors.education_history);
  });

  test("work experience is kept per field with dates", () => {
    const rows = [
      { field: "Sales", role: "Executive", start: "2018-01", end: "2020-01" },
      { field: "Logistics", start: "2023-06", end: "" },
      { field: "", start: "2020-01" },
    ];
    const ok = validateProfile({ ...GOOD_PROFILE, work_history: rows }, now);
    assert.equal(ok.errors.work_history, undefined);
    const saved = JSON.parse(String(ok.values.work_history));
    assert.equal(saved.length, 2);
    assert.equal(saved[1].end, null);
    assert.ok(validateProfile({ ...GOOD_PROFILE, work_history: [{ field: "Sales", start: "2020-05", end: "2019-01" }] }, now).errors.work_history);
    assert.ok(validateProfile({ ...GOOD_PROFILE, work_history: [{ field: "Sales", start: "soon" }] }, now).errors.work_history);
    assert.ok(validateProfile({ ...GOOD_PROFILE, work_history: [{ field: "Sales", start: "2090-01" }] }, now).errors.work_history);
    assert.ok(validateProfile({ ...GOOD_PROFILE, work_history: Array(6).fill({ field: "Sales", start: "2020-01" }) }, now).errors.work_history);
  });

  test("intake must be in the future window and LinkedIn must be https", () => {
    assert.ok(validateProfile({ ...GOOD_PROFILE, intake_term: "Fall 2020" }, now).errors.intake_term);
    assert.ok(validateProfile({ ...GOOD_PROFILE, intake_term: "Autumn 2027" }, now).errors.intake_term);
    assert.ok(validateProfile({ ...GOOD_PROFILE, linkedin_url: "javascript:alert(1)" }, now).errors.linkedin_url);
  });
});

describe("google sign-in and onboarding", () => {
  let env: ReturnType<typeof createEnv>["env"];
  let raw: ReturnType<typeof createEnv>["raw"];

  beforeEach(() => {
    realNow = clock.now;
    fakeTime = Date.parse("2026-10-18T10:00:00Z");
    clock.now = () => fakeTime;
    ({ env, raw } = createEnv());
    env.GOOGLE_CLIENT_ID = CLIENT_ID;
    env.GOOGLE_CLIENT_SECRET = "shh";
    tokenBodies = [];
    nextIdentity = {
      sub: "google-sub-1",
      aud: CLIENT_ID,
      iss: "https://accounts.google.com",
      email: "Ali.Shaheen@gmail.com",
      email_verified: true,
      name: "Ali Shaheen",
    };
    realFetch = globalThis.fetch;
    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input instanceof Request ? input.url : input);
      if (url !== "https://oauth2.googleapis.com/token") throw new Error(`Unexpected fetch ${url}`);
      tokenBodies.push(new URLSearchParams(String(init?.body)));
      return new Response(JSON.stringify({ access_token: "a", expires_in: 3599, id_token: idToken(nextIdentity), scope: "openid email profile" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }) as typeof fetch;
  });

  afterEach(() => {
    globalThis.fetch = realFetch;
    clock.now = realNow;
  });

  async function start(c: Client) {
    const res = await c.request("GET", "/api/auth/google/start");
    assert.equal(res.status, 302);
    return new URL(res.headers.get("Location")!);
  }

  async function googleSignIn(c: Client) {
    const google = await start(c);
    const res = await c.request("GET", `/api/auth/google/callback?code=abc&state=${google.searchParams.get("state")}`);
    assert.equal(res.status, 302);
    const me = await c.request("GET", "/api/auth/me");
    if (me.status === 200) c.csrf = me.data.csrf_token;
    return res.headers.get("Location");
  }

  test("start sends the browser to Google with login scopes only", async () => {
    const c = new Client(env);
    const google = await start(c);
    assert.equal(google.origin + google.pathname, "https://accounts.google.com/o/oauth2/v2/auth");
    assert.equal(google.searchParams.get("scope"), "openid email profile");
    assert.equal(google.searchParams.get("redirect_uri"), "https://app.adminpath.com/api/auth/google/callback");
    assert.equal(google.searchParams.get("prompt"), "select_account");
    assert.equal(google.searchParams.get("access_type"), null);
    assert.equal(google.searchParams.get("code_challenge_method"), "S256");
    assert.equal(c.cookie("ap_gstate"), google.searchParams.get("state"));
  });

  test("already signed in: the button still goes to Google and the old session is replaced", async () => {
    addUser(raw, { id: "usr_admin", email: "admin@example.test", password: "Admin2026pass", role: "admin" });
    const c = new Client(env);
    await c.login("admin@example.test", "Admin2026pass");
    const oldSession = c.cookie("ap_session")!;
    const google = await start(c);
    assert.equal(google.origin, "https://accounts.google.com");
    await c.request("GET", `/api/auth/google/callback?code=abc&state=${google.searchParams.get("state")}`);
    assert.equal((await c.request("GET", "/api/auth/me")).data.email, "ali.shaheen@gmail.com");
    const replay = new Client(env);
    replay.setCookie("ap_session", oldSession);
    assert.equal((await replay.request("GET", "/api/auth/me")).status, 401);
  });

  test("APP_ORIGIN decides the redirect URI, not the rewritten request host", async () => {
    env.APP_ORIGIN = "http://127.0.0.1:8787";
    const google = await start(new Client(env));
    assert.equal(google.searchParams.get("redirect_uri"), "http://127.0.0.1:8787/api/auth/google/callback");
  });

  test("start without Google config goes back to login with an error", async () => {
    delete env.GOOGLE_CLIENT_SECRET;
    const res = await new Client(env).request("GET", "/api/auth/google/start");
    assert.equal(res.headers.get("Location"), "/login?error=google_not_configured");
  });

  test("first Google sign-in creates a student and sends them to onboarding", async () => {
    const c = new Client(env);
    assert.equal(await googleSignIn(c), "/onboarding");
    const body = tokenBodies[0];
    assert.equal(body.get("redirect_uri"), "https://app.adminpath.com/api/auth/google/callback");
    assert.ok(body.get("code_verifier"));

    const me = await c.request("GET", "/api/auth/me");
    assert.equal(me.status, 200);
    assert.equal(me.data.email, "ali.shaheen@gmail.com");
    assert.equal(me.data.role, "student");
    assert.equal(me.data.full_name, "Ali Shaheen");
    assert.equal(me.data.onboarding_complete, false);
    assert.equal(me.data.student_profile.gpa, null);
    assert.equal(me.data.student_profile.countries, null);
    assert.equal(c.cookie("ap_gstate"), undefined);
    const audit = raw.prepare("SELECT action FROM audit_logs").all() as { action: string }[];
    assert.ok(audit.some((a) => a.action === "SIGNUP_GOOGLE"));
  });

  test("second sign-in finds the same account", async () => {
    await googleSignIn(new Client(env));
    await googleSignIn(new Client(env));
    assert.equal(raw.prepare("SELECT COUNT(*) AS n FROM users").get()!.n, 1);
  });

  test("Google sign-in links to an existing account with the same email", async () => {
    addUser(raw, { id: "usr_existing", email: "ali.shaheen@gmail.com", password: "Existing2026pw" });
    raw.prepare("UPDATE students SET onboarding_completed_at = '2026-01-01 00:00:00' WHERE user_id = 'usr_existing'").run();
    const c = new Client(env);
    assert.equal(await googleSignIn(c), "/dashboard");
    assert.equal((await c.request("GET", "/api/auth/me")).data.id, "usr_existing");
    const row = raw.prepare("SELECT google_sub FROM users WHERE id = 'usr_existing'").get() as { google_sub: string };
    assert.equal(row.google_sub, "google-sub-1");
  });

  test("an account already linked to another Google user is not taken over", async () => {
    addUser(raw, { id: "usr_existing", email: "ali.shaheen@gmail.com", password: "Existing2026pw" });
    raw.prepare("UPDATE users SET google_sub = 'other-sub' WHERE id = 'usr_existing'").run();
    const c = new Client(env);
    assert.equal(await googleSignIn(c), "/login?error=google_conflict");
    assert.equal((await c.request("GET", "/api/auth/me")).status, 401);
  });

  test("admins land on the admin dashboard", async () => {
    addUser(raw, { id: "usr_admin", email: "ali.shaheen@gmail.com", password: "Admin2026pass", role: "admin" });
    assert.equal(await googleSignIn(new Client(env)), "/admin/dashboard");
  });

  test("unverified Google email is refused", async () => {
    nextIdentity.email_verified = false;
    assert.equal(await googleSignIn(new Client(env)), "/login?error=google_unverified");
    assert.equal(raw.prepare("SELECT COUNT(*) AS n FROM users").get()!.n, 0);
  });

  test("id_token for another app is refused", async () => {
    nextIdentity.aud = "someone-else.apps.googleusercontent.com";
    assert.equal(await googleSignIn(new Client(env)), "/login?error=google_failed");
  });

  test("callback without the browser's state cookie is refused (login CSRF)", async () => {
    const attacker = new Client(env);
    const google = await start(attacker);
    const victim = new Client(env);
    const res = await victim.request("GET", `/api/auth/google/callback?code=abc&state=${google.searchParams.get("state")}`);
    assert.equal(res.headers.get("Location"), "/login?error=google_expired");
    assert.equal(tokenBodies.length, 0);
  });

  test("state is single use and expires", async () => {
    const c = new Client(env);
    const state = (await start(c)).searchParams.get("state")!;
    fakeTime += 11 * 60_000;
    const late = await c.request("GET", `/api/auth/google/callback?code=abc&state=${state}`);
    assert.equal(late.headers.get("Location"), "/login?error=google_expired");
  });

  test("declining on Google returns to login", async () => {
    const res = await new Client(env).request("GET", "/api/auth/google/callback?error=access_denied");
    assert.equal(res.headers.get("Location"), "/login?error=google_denied");
  });

  test("suspended accounts cannot sign in with Google", async () => {
    addUser(raw, { id: "usr_s", email: "ali.shaheen@gmail.com", password: "Suspend2026pw", status: "suspended" });
    assert.equal(await googleSignIn(new Client(env)), "/login?error=suspended");
  });

  test("Google-only accounts cannot sign in with an empty password", async () => {
    await googleSignIn(new Client(env));
    const res = await new Client(env).request("POST", "/api/auth/login", { body: { email: "ali.shaheen@gmail.com", password: "x" } });
    assert.equal(res.status, 401);
  });

  test("onboarding: saving the profile completes it and later edits keep it complete", async () => {
    const c = new Client(env);
    await googleSignIn(c);
    const bad = await c.request("PUT", "/api/profile", { body: { full_name: "Ali" } });
    assert.equal(bad.status, 400);
    assert.ok(bad.data.fields.countries);
    assert.equal((await c.request("GET", "/api/auth/me")).data.onboarding_complete, false);

    const ok = await c.request("PUT", "/api/profile", { body: GOOD_PROFILE });
    assert.equal(ok.status, 200);
    assert.equal(ok.data.profile.onboarding_complete, true);
    assert.equal(ok.data.profile.countries, "Germany, Netherlands");
    assert.equal(ok.data.profile.qualification, "Bachelor in Computer Science");
    const firstDone = ok.data.profile.onboarding_completed_at;

    fakeTime += 86400_000;
    const edit = await c.request("PUT", "/api/profile", { body: { ...GOOD_PROFILE, gpa: 3.6 } });
    assert.equal(edit.data.profile.gpa, 3.6);
    assert.equal(edit.data.profile.onboarding_completed_at, firstDone);

    const me = await c.request("GET", "/api/auth/me");
    assert.equal(me.data.onboarding_complete, true);
    assert.equal(me.data.full_name, "Ali Shaheen");
    assert.equal((await googleSignIn(new Client(env))), "/dashboard");
  });

  test("profile save needs CSRF and a session", async () => {
    const c = new Client(env);
    await googleSignIn(c);
    assert.equal((await c.request("PUT", "/api/profile", { body: GOOD_PROFILE, csrf: false })).status, 403);
    assert.equal((await new Client(env).request("PUT", "/api/profile", { body: GOOD_PROFILE })).status, 401);
  });

  test("profiles are private to each student", async () => {
    addUser(raw, { id: "usr_bob", email: "bob@example.test", password: "BobPass2026yy", fullName: "Bob" });
    const ali = new Client(env);
    await googleSignIn(ali);
    await ali.request("PUT", "/api/profile", { body: GOOD_PROFILE });
    const bob = new Client(env);
    await bob.login("bob@example.test", "BobPass2026yy");
    const bobProfile = await bob.request("GET", "/api/profile");
    assert.equal(bobProfile.data.full_name, "Bob");
    assert.notEqual(bobProfile.data.countries, "Germany, Netherlands");
  });

  test("admins have no student profile to save", async () => {
    addUser(raw, { id: "usr_admin", email: "admin@example.test", password: "Admin2026pass", role: "admin" });
    const c = new Client(env);
    await c.login("admin@example.test", "Admin2026pass");
    assert.equal((await c.request("PUT", "/api/profile", { body: GOOD_PROFILE })).status, 403);
  });

  test("PKCE verifier matches the challenge sent to Google", async () => {
    const c = new Client(env);
    const google = await start(c);
    await c.request("GET", `/api/auth/google/callback?code=abc&state=${google.searchParams.get("state")}`);
    const challenge = createHash("sha256").update(tokenBodies[0].get("code_verifier")!).digest("base64url");
    assert.equal(challenge, google.searchParams.get("code_challenge"));
  });
});
