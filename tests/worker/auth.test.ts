import { test, describe, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { pbkdf2Sync } from "node:crypto";
import { clock } from "../../worker/lib/clock.ts";
import { pbkdf2Hex, passwordProblems, timingSafeEqual } from "../../worker/lib/crypto.ts";
import { Router } from "../../worker/router.ts";
import { requireAdmin, requireAuth, loadSession } from "../../worker/middleware.ts";
import { json } from "../../worker/lib/http.ts";
import { Client, addUser, createEnv } from "./helpers.ts";

const ALICE = { id: "usr_alice", email: "alice@example.test", password: "AlicePass2026x", fullName: "Alice A" };
const BOB = { id: "usr_bob", email: "bob@example.test", password: "BobPass2026yy", fullName: "Bob B" };
const ADMIN = { id: "usr_admin", email: "admin@example.test", password: "AdminPass2026z", role: "admin" };

let realNow: () => number;
let fakeTime: number;

function advance(ms: number) {
  fakeTime += ms;
}

describe("crypto", () => {
  test("pbkdf2 matches Node pbkdf2Sync used by the old server", async () => {
    const expected = pbkdf2Sync("ScholarPass2026", "abc123salt", 100000, 32, "sha256").toString("hex");
    assert.equal(await pbkdf2Hex("ScholarPass2026", "abc123salt"), expected);
  });

  test("timingSafeEqual", () => {
    assert.equal(timingSafeEqual("abc", "abc"), true);
    assert.equal(timingSafeEqual("abc", "abd"), false);
    assert.equal(timingSafeEqual("abc", "abcd"), false);
  });

  test("password rules", () => {
    assert.ok(passwordProblems("short1").length > 0);
    assert.ok(passwordProblems("onlyletterslong").length > 0);
    assert.ok(passwordProblems("12345678901").length > 0);
    assert.deepEqual(passwordProblems("GoodPassword2026"), []);
  });
});

describe("auth routes", () => {
  let env: ReturnType<typeof createEnv>["env"];
  let raw: ReturnType<typeof createEnv>["raw"];

  beforeEach(() => {
    realNow = clock.now;
    fakeTime = Date.parse("2026-10-18T10:00:00Z");
    clock.now = () => fakeTime;
    ({ env, raw } = createEnv());
    addUser(raw, ALICE);
    addUser(raw, BOB);
    addUser(raw, ADMIN);
  });

  afterEach(() => {
    clock.now = realNow;
  });

  test("health is public", async () => {
    const res = await new Client(env).request("GET", "/api/health");
    assert.equal(res.status, 200);
    assert.equal(res.data.status, "ok");
  });

  test("login with valid credentials sets HttpOnly session cookie and returns no token", async () => {
    const c = new Client(env);
    const res = await c.login(ALICE.email, ALICE.password);
    assert.equal(res.status, 200);
    assert.equal(res.data.user.email, ALICE.email);
    assert.equal(res.data.user.full_name, "Alice A");
    assert.equal(res.data.token, undefined);
    assert.match(res.data.csrf_token, /^[0-9a-f]{64}$/);
    const cookies = res.headers.getSetCookie();
    const session = cookies.find((x) => x.startsWith("ap_session="))!;
    assert.match(session, /HttpOnly/);
    assert.match(session, /Secure/);
    assert.match(session, /SameSite=Lax/);
    const csrf = cookies.find((x) => x.startsWith("ap_csrf="))!;
    assert.doesNotMatch(csrf, /HttpOnly/);
  });

  test("session token is stored hashed, not raw", async () => {
    const c = new Client(env);
    await c.login(ALICE.email, ALICE.password);
    const row = raw.prepare("SELECT token FROM sessions WHERE user_id = ?").get(ALICE.id) as { token: string };
    assert.notEqual(row.token, c.cookie("ap_session"));
    assert.match(row.token, /^[0-9a-f]{64}$/);
  });

  test("email is case-insensitive", async () => {
    const res = await new Client(env).login("  ALICE@Example.Test ", ALICE.password);
    assert.equal(res.status, 200);
  });

  test("wrong password and unknown email give the same 401", async () => {
    const a = await new Client(env).login(ALICE.email, "WrongPass2026");
    const b = await new Client(env).login("nobody@example.test", "WrongPass2026");
    assert.equal(a.status, 401);
    assert.equal(b.status, 401);
    assert.equal(a.data.error, b.data.error);
  });

  test("non-JSON login body is rejected", async () => {
    const c = new Client(env);
    const res = await c.request("POST", "/api/auth/login", {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });
    assert.equal(res.status, 400);
  });

  test("suspended account cannot sign in", async () => {
    raw.prepare("UPDATE users SET status = 'suspended' WHERE id = ?").run(ALICE.id);
    const res = await new Client(env).login(ALICE.email, ALICE.password);
    assert.equal(res.status, 403);
  });

  test("lockout after 5 failures, even with the right password, then recovers", async () => {
    const c = new Client(env);
    for (let i = 0; i < 5; i++) {
      assert.equal((await c.login(ALICE.email, "WrongPass2026")).status, 401);
    }
    const locked = await c.login(ALICE.email, ALICE.password);
    assert.equal(locked.status, 429);
    assert.ok(Number(locked.headers.get("Retry-After")) > 0);
    advance(16 * 60_000);
    assert.equal((await c.login(ALICE.email, ALICE.password)).status, 200);
  });

  test("successful login resets the failure count", async () => {
    const c = new Client(env);
    for (let i = 0; i < 4; i++) await c.login(ALICE.email, "WrongPass2026");
    advance(1000);
    assert.equal((await c.login(ALICE.email, ALICE.password)).status, 200);
    advance(1000);
    for (let i = 0; i < 4; i++) {
      assert.equal((await new Client(env).login(ALICE.email, "WrongPass2026")).status, 401);
    }
  });

  test("per-IP limit blocks spraying across many accounts", async () => {
    const c = new Client(env, "198.51.100.7");
    for (let i = 0; i < 20; i++) await c.login(`user${i}@example.test`, "WrongPass2026");
    assert.equal((await c.login(BOB.email, BOB.password)).status, 429);
    assert.equal((await new Client(env, "198.51.100.8").login(BOB.email, BOB.password)).status, 200);
  });

  test("me requires a session", async () => {
    assert.equal((await new Client(env).request("GET", "/api/auth/me")).status, 401);
  });

  test("me returns the signed-in user only", async () => {
    const a = new Client(env);
    const b = new Client(env);
    await a.login(ALICE.email, ALICE.password);
    await b.login(BOB.email, BOB.password);
    const meA = await a.request("GET", "/api/auth/me");
    const meB = await b.request("GET", "/api/auth/me");
    assert.equal(meA.data.id, ALICE.id);
    assert.equal(meB.data.id, BOB.id);
    assert.equal(meA.data.student_profile.full_name, "Alice A");
    assert.equal(meA.data.student_profile.activation_token, undefined);
    assert.equal(meA.data.csrf_token, a.csrf);
  });

  test("forged session cookie is rejected", async () => {
    const c = new Client(env);
    c.setCookie("ap_session", "a".repeat(64));
    assert.equal((await c.request("GET", "/api/auth/me")).status, 401);
  });

  test("x-impersonate-role header grants nothing", async () => {
    const c = new Client(env);
    const res = await c.request("GET", "/api/auth/me", { headers: { "x-impersonate-role": "admin" } });
    assert.equal(res.status, 401);
  });

  test("Bearer tokens are not accepted", async () => {
    const c = new Client(env);
    await c.login(ALICE.email, ALICE.password);
    const raw = c.cookie("ap_session")!;
    const res = await new Client(env).request("GET", "/api/auth/me", { headers: { Authorization: `Bearer ${raw}` } });
    assert.equal(res.status, 401);
  });

  test("session expires after the TTL", async () => {
    const c = new Client(env);
    await c.login(ALICE.email, ALICE.password);
    advance(167 * 3600_000);
    assert.equal((await c.request("GET", "/api/auth/me")).status, 200);
    advance(2 * 3600_000);
    assert.equal((await c.request("GET", "/api/auth/me")).status, 401);
  });

  test("SESSION_TTL_HOURS is honored", async () => {
    env.SESSION_TTL_HOURS = "1";
    const c = new Client(env);
    await c.login(ALICE.email, ALICE.password);
    advance(61 * 60_000);
    assert.equal((await c.request("GET", "/api/auth/me")).status, 401);
  });

  test("suspending a user locks out an existing session", async () => {
    const c = new Client(env);
    await c.login(ALICE.email, ALICE.password);
    raw.prepare("UPDATE users SET status = 'suspended' WHERE id = ?").run(ALICE.id);
    assert.equal((await c.request("GET", "/api/auth/me")).status, 403);
  });

  test("logout needs the CSRF token", async () => {
    const c = new Client(env);
    await c.login(ALICE.email, ALICE.password);
    const res = await c.request("POST", "/api/auth/logout", { csrf: false });
    assert.equal(res.status, 403);
    assert.equal((await c.request("GET", "/api/auth/me")).status, 200);
  });

  test("CSRF token from another session is rejected", async () => {
    const a = new Client(env);
    const b = new Client(env);
    await a.login(ALICE.email, ALICE.password);
    await b.login(BOB.email, BOB.password);
    const res = await a.request("POST", "/api/auth/logout", { csrf: false, headers: { "X-CSRF-Token": b.csrf! } });
    assert.equal(res.status, 403);
  });

  test("cross-origin POST is blocked", async () => {
    const c = new Client(env);
    await c.login(ALICE.email, ALICE.password);
    const res = await c.request("POST", "/api/auth/logout", { headers: { Origin: "https://evil.example" } });
    assert.equal(res.status, 403);
  });

  test("logout revokes the session server-side", async () => {
    const c = new Client(env);
    await c.login(ALICE.email, ALICE.password);
    const stolen = c.cookie("ap_session")!;
    const res = await c.request("POST", "/api/auth/logout");
    assert.equal(res.status, 200);
    assert.equal(c.cookie("ap_session"), undefined);
    const replay = new Client(env);
    replay.setCookie("ap_session", stolen);
    assert.equal((await replay.request("GET", "/api/auth/me")).status, 401);
    const count = raw.prepare("SELECT COUNT(*) AS n FROM sessions WHERE user_id = ?").get(ALICE.id) as { n: number };
    assert.equal(count.n, 0);
  });

  test("logout and login write audit entries", async () => {
    const c = new Client(env);
    await c.login(ALICE.email, ALICE.password);
    await c.request("POST", "/api/auth/logout");
    const rows = raw.prepare("SELECT action FROM audit_logs WHERE actor_id = ? ORDER BY created_at").all(ALICE.id) as { action: string }[];
    assert.deepEqual(rows.map((r) => r.action).sort(), ["LOGIN", "LOGOUT"]);
  });

  test("requireAdmin allows admins and blocks students", async () => {
    const router = new Router();
    router.use(loadSession);
    router.get("/api/admin/ping", requireAdmin, () => json({ ok: true }));
    router.get("/api/private", requireAuth, (c) => json({ id: c.user!.id }));

    const student = new Client(env);
    const admin = new Client(env);
    await student.login(ALICE.email, ALICE.password);
    await admin.login(ADMIN.email, ADMIN.password);

    const call = async (client: Client, path: string) => {
      const headers = new Headers({ Cookie: `ap_session=${client.cookie("ap_session")}` });
      const res = await router.handle(new Request(`https://app.adminpath.com${path}`, { headers }), env);
      return res!.status;
    };
    assert.equal(await call(student, "/api/admin/ping"), 403);
    assert.equal(await call(admin, "/api/admin/ping"), 200);
    assert.equal(await call(student, "/api/private"), 200);
  });

  test("unknown API path is 404 JSON, wrong method is 405", async () => {
    const c = new Client(env);
    assert.equal((await c.request("GET", "/api/nope")).status, 404);
    assert.equal((await c.request("GET", "/api/auth/login")).status, 405);
  });

  test("non-API paths are served from ASSETS", async () => {
    env.ASSETS = { fetch: async () => new Response("<html>app</html>", { status: 200 }) };
    const res = await new Client(env).request("GET", "/dashboard");
    assert.equal(res.status, 200);
    assert.equal(res.data, "<html>app</html>");
  });
});
