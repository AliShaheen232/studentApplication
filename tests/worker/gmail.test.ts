import { test, describe, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { createHash, randomBytes } from "node:crypto";
import { clock } from "../../worker/lib/clock.ts";
import { buildMime, textToHtml, toGmailRaw } from "../../worker/lib/mime.ts";
import { decryptSecret, encryptSecret } from "../../worker/lib/vault.ts";
import { Client, addUser, createEnv } from "./helpers.ts";

const ALICE = { id: "usr_alice", email: "alice@example.test", password: "AlicePass2026x" };
const BOB = { id: "usr_bob", email: "bob@example.test", password: "BobPass2026yy" };
const KEY = randomBytes(32).toString("base64");

type Call = { url: string; method: string; headers: Headers; body: string };

let calls: Call[];
let handlers: Record<string, (call: Call) => Response>;
let realFetch: typeof fetch;
let realNow: () => number;
let fakeTime: number;

function b64url(obj: unknown): string {
  return Buffer.from(JSON.stringify(obj)).toString("base64url");
}

function idToken(email: string, verified = true): string {
  return `${b64url({ alg: "RS256" })}.${b64url({ email, email_verified: verified })}.sig`;
}

function jsonRes(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json" } });
}

function tokenGrant(overrides: Record<string, unknown> = {}) {
  return jsonRes({
    access_token: "ya29.access-1",
    refresh_token: "1//refresh-1",
    expires_in: 3599,
    scope: "openid https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/gmail.send",
    id_token: idToken("alice.gmail@gmail.com"),
    ...overrides,
  });
}

describe("mime and vault", () => {
  test("vault round trip, and the stored value is not the plaintext", async () => {
    const sealed = await encryptSecret(KEY, "1//secret-refresh");
    assert.doesNotMatch(sealed, /secret-refresh/);
    assert.equal(await decryptSecret(KEY, sealed), "1//secret-refresh");
    await assert.rejects(decryptSecret(randomBytes(32).toString("base64"), sealed));
  });

  test("vault refuses a missing or short key", async () => {
    await assert.rejects(encryptSecret(undefined, "x"), /GMAIL_TOKEN_KEY/);
    await assert.rejects(encryptSecret(randomBytes(16).toString("base64"), "x"), /32 bytes/);
  });

  test("MIME has both parts, encodes UTF-8 subjects and decodes back", () => {
    const mime = buildMime({
      from: "a@gmail.com",
      fromName: "Ali Shaheen",
      to: "admissions@uni.example.edu",
      subject: "Bewerbung für MSc – Informatik",
      text: "Hello,\n\nI am applying.",
    });
    assert.match(mime, /^From: "Ali Shaheen" <a@gmail.com>\r\n/);
    assert.match(mime, /To: admissions@uni.example.edu\r\n/);
    assert.match(mime, /Subject: =\?UTF-8\?B\?/);
    assert.match(mime, /multipart\/alternative/);
    assert.match(mime, /text\/plain; charset="UTF-8"/);
    assert.match(mime, /text\/html; charset="UTF-8"/);
    const decoded = Buffer.from(toGmailRaw(mime), "base64url").toString("utf8");
    assert.equal(decoded, mime);
  });

  test("MIME rejects header injection and bad addresses", () => {
    const base = { from: "a@gmail.com", to: "b@uni.edu", subject: "Hi", text: "x" };
    assert.throws(() => buildMime({ ...base, subject: "Hi\r\nBcc: victim@x.com" }), /line breaks/);
    assert.throws(() => buildMime({ ...base, to: "b@uni.edu\r\nBcc: v@x.com" }), /line breaks/);
    assert.throws(() => buildMime({ ...base, to: "not-an-email" }), /Recipient/);
    assert.throws(() => buildMime({ ...base, subject: "  " }), /Subject/);
  });

  test("plain text is escaped when turned into HTML", () => {
    const html = textToHtml("<script>alert(1)</script>\n\nLine two");
    assert.doesNotMatch(html, /<script>/);
    assert.match(html, /&lt;script&gt;/);
    assert.match(html, /<p>Line two<\/p>/);
  });
});

describe("gmail routes", () => {
  let env: ReturnType<typeof createEnv>["env"];
  let raw: ReturnType<typeof createEnv>["raw"];

  beforeEach(() => {
    realNow = clock.now;
    fakeTime = Date.parse("2026-10-18T10:00:00Z");
    clock.now = () => fakeTime;
    ({ env, raw } = createEnv());
    env.GOOGLE_CLIENT_ID = "client-123.apps.googleusercontent.com";
    env.GOOGLE_CLIENT_SECRET = "shh-secret";
    env.GMAIL_TOKEN_KEY = KEY;
    addUser(raw, ALICE);
    addUser(raw, BOB);

    calls = [];
    handlers = {};
    realFetch = globalThis.fetch;
    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
      const call: Call = {
        url,
        method: init?.method || "GET",
        headers: new Headers(init?.headers),
        body: init?.body ? String(init.body) : "",
      };
      calls.push(call);
      const key = Object.keys(handlers).find((k) => url.startsWith(k));
      if (!key) throw new Error(`Unexpected fetch to ${url}`);
      return handlers[key](call);
    }) as typeof fetch;
  });

  afterEach(() => {
    globalThis.fetch = realFetch;
    clock.now = realNow;
  });

  async function loggedIn(user = ALICE) {
    const c = new Client(env);
    assert.equal((await c.login(user.email, user.password)).status, 200);
    return c;
  }

  async function startConnect(c: Client) {
    const res = await c.request("POST", "/api/gmail/connect", { body: {} });
    assert.equal(res.status, 200);
    return new URL(res.data.url);
  }

  async function connect(c: Client) {
    handlers["https://oauth2.googleapis.com/token"] = () => tokenGrant();
    const auth = await startConnect(c);
    const res = await c.request("GET", `/api/gmail/callback?code=auth-code&state=${auth.searchParams.get("state")}`);
    assert.equal(res.status, 302);
    assert.equal(res.headers.get("Location"), "/gmail?gmail=connected");
  }

  test("status needs a session", async () => {
    assert.equal((await new Client(env).request("GET", "/api/gmail/status")).status, 401);
  });

  test("status starts disconnected and reports config", async () => {
    const c = await loggedIn();
    const res = await c.request("GET", "/api/gmail/status");
    assert.equal(res.data.connected, false);
    assert.equal(res.data.configured, true);
    delete env.GOOGLE_CLIENT_SECRET;
    assert.equal((await c.request("GET", "/api/gmail/status")).data.configured, false);
  });

  test("connect without server config returns 503", async () => {
    delete env.GOOGLE_CLIENT_ID;
    const c = await loggedIn();
    assert.equal((await c.request("POST", "/api/gmail/connect", { body: {} })).status, 503);
  });

  test("connect needs CSRF", async () => {
    const c = await loggedIn();
    assert.equal((await c.request("POST", "/api/gmail/connect", { body: {}, csrf: false })).status, 403);
  });

  test("connect builds a Google URL with send scope, offline access and PKCE", async () => {
    const c = await loggedIn();
    const url = await startConnect(c);
    assert.equal(url.origin + url.pathname, "https://accounts.google.com/o/oauth2/v2/auth");
    const p = url.searchParams;
    assert.equal(p.get("client_id"), env.GOOGLE_CLIENT_ID);
    assert.equal(p.get("redirect_uri"), "https://app.adminpath.com/api/gmail/callback");
    assert.equal(p.get("scope"), "openid email https://www.googleapis.com/auth/gmail.send");
    assert.doesNotMatch(p.get("scope")!, /readonly/);
    assert.equal(p.get("access_type"), "offline");
    assert.equal(p.get("prompt"), "consent");
    assert.equal(p.get("code_challenge_method"), "S256");
    assert.match(p.get("state")!, /^[0-9a-f]{64}$/);
    const row = raw.prepare("SELECT state_hash FROM oauth_states WHERE user_id = ?").get(ALICE.id) as { state_hash: string };
    assert.notEqual(row.state_hash, p.get("state"));
  });

  test("callback stores encrypted tokens and the verified Google email", async () => {
    const c = await loggedIn();
    handlers["https://oauth2.googleapis.com/token"] = () => tokenGrant();
    const auth = await startConnect(c);
    const res = await c.request("GET", `/api/gmail/callback?code=auth-code&state=${auth.searchParams.get("state")}`);
    assert.equal(res.headers.get("Location"), "/gmail?gmail=connected");

    const sent = new URLSearchParams(calls[0].body);
    assert.equal(sent.get("grant_type"), "authorization_code");
    assert.equal(sent.get("code"), "auth-code");
    assert.equal(sent.get("redirect_uri"), "https://app.adminpath.com/api/gmail/callback");
    const challenge = createHash("sha256").update(sent.get("code_verifier")!).digest("base64url");
    assert.equal(challenge, auth.searchParams.get("code_challenge"));

    const row = raw.prepare("SELECT * FROM gmail_tokens WHERE user_id = ?").get(ALICE.id) as Record<string, string>;
    assert.equal(row.email, "alice.gmail@gmail.com");
    assert.equal(row.status, "connected");
    assert.doesNotMatch(row.encrypted_refresh_token, /refresh-1/);
    assert.equal(await decryptSecret(KEY, row.encrypted_refresh_token), "1//refresh-1");

    const status = await c.request("GET", "/api/gmail/status");
    assert.equal(status.data.connected, true);
    assert.equal(status.data.email, "alice.gmail@gmail.com");
    assert.equal(status.data.test_passed, false);
  });

  test("state is single use", async () => {
    const c = await loggedIn();
    handlers["https://oauth2.googleapis.com/token"] = () => tokenGrant();
    const state = (await startConnect(c)).searchParams.get("state");
    await c.request("GET", `/api/gmail/callback?code=x&state=${state}`);
    const again = await c.request("GET", `/api/gmail/callback?code=x&state=${state}`);
    assert.equal(again.headers.get("Location"), "/gmail?gmail=expired");
  });

  test("state from another user is refused", async () => {
    const alice = await loggedIn(ALICE);
    const bob = await loggedIn(BOB);
    handlers["https://oauth2.googleapis.com/token"] = () => tokenGrant();
    const state = (await startConnect(alice)).searchParams.get("state");
    const res = await bob.request("GET", `/api/gmail/callback?code=x&state=${state}`);
    assert.equal(res.headers.get("Location"), "/gmail?gmail=expired");
    assert.equal(calls.length, 0);
  });

  test("state expires after 10 minutes", async () => {
    const c = await loggedIn();
    const state = (await startConnect(c)).searchParams.get("state");
    fakeTime += 11 * 60_000;
    const res = await c.request("GET", `/api/gmail/callback?code=x&state=${state}`);
    assert.equal(res.headers.get("Location"), "/gmail?gmail=expired");
  });

  test("callback without a session goes back to login", async () => {
    const res = await new Client(env).request("GET", "/api/gmail/callback?code=x&state=y");
    assert.equal(res.headers.get("Location"), "/gmail?gmail=login_required");
  });

  test("user declining on Google's screen", async () => {
    const c = await loggedIn();
    const res = await c.request("GET", "/api/gmail/callback?error=access_denied&state=x");
    assert.equal(res.headers.get("Location"), "/gmail?gmail=denied");
  });

  test("unticked send permission is refused and revoked", async () => {
    const c = await loggedIn();
    handlers["https://oauth2.googleapis.com/token"] = () => tokenGrant({ scope: "openid email" });
    handlers["https://oauth2.googleapis.com/revoke"] = () => new Response("", { status: 200 });
    const state = (await startConnect(c)).searchParams.get("state");
    const res = await c.request("GET", `/api/gmail/callback?code=x&state=${state}`);
    assert.equal(res.headers.get("Location"), "/gmail?gmail=missing_scope");
    assert.ok(calls.some((x) => x.url.startsWith("https://oauth2.googleapis.com/revoke")));
    assert.equal(raw.prepare("SELECT COUNT(*) AS n FROM gmail_tokens").get()!.n, 0);
  });

  test("unverified Google email is refused", async () => {
    const c = await loggedIn();
    handlers["https://oauth2.googleapis.com/token"] = () => tokenGrant({ id_token: idToken("x@gmail.com", false) });
    handlers["https://oauth2.googleapis.com/revoke"] = () => new Response("", { status: 200 });
    const state = (await startConnect(c)).searchParams.get("state");
    const res = await c.request("GET", `/api/gmail/callback?code=x&state=${state}`);
    assert.equal(res.headers.get("Location"), "/gmail?gmail=unverified_email");
  });

  test("test email goes to the student's own Gmail through the Gmail API", async () => {
    const c = await loggedIn();
    await connect(c);
    handlers["https://gmail.googleapis.com/gmail/v1/users/me/messages/send"] = () => jsonRes({ id: "msg-1", threadId: "t-1" });
    const res = await c.request("POST", "/api/gmail/test", { body: {} });
    assert.equal(res.status, 200);
    const send = calls.at(-1)!;
    assert.equal(send.headers.get("Authorization"), "Bearer ya29.access-1");
    const mime = Buffer.from(JSON.parse(send.body).raw, "base64url").toString("utf8");
    assert.match(mime, /From: alice.gmail@gmail.com/);
    assert.match(mime, /To: alice.gmail@gmail.com/);
    assert.match(mime, /Subject: AdmitPath test email/);
    const status = await c.request("GET", "/api/gmail/status");
    assert.equal(status.data.test_passed, true);
  });

  test("expired access token is refreshed before sending", async () => {
    const c = await loggedIn();
    await connect(c);
    fakeTime += 2 * 3600_000;
    handlers["https://oauth2.googleapis.com/token"] = (call) => {
      assert.equal(new URLSearchParams(call.body).get("grant_type"), "refresh_token");
      assert.equal(new URLSearchParams(call.body).get("refresh_token"), "1//refresh-1");
      return jsonRes({ access_token: "ya29.access-2", expires_in: 3599 });
    };
    handlers["https://gmail.googleapis.com/gmail/v1/users/me/messages/send"] = () => jsonRes({ id: "m", threadId: "t" });
    assert.equal((await c.request("POST", "/api/gmail/test", { body: {} })).status, 200);
    assert.equal(calls.at(-1)!.headers.get("Authorization"), "Bearer ya29.access-2");
  });

  test("revoked access asks the student to reconnect", async () => {
    const c = await loggedIn();
    await connect(c);
    fakeTime += 2 * 3600_000;
    handlers["https://oauth2.googleapis.com/token"] = () => jsonRes({ error: "invalid_grant", error_description: "Token has been expired or revoked." }, 400);
    const res = await c.request("POST", "/api/gmail/test", { body: {} });
    assert.equal(res.status, 409);
    assert.equal(res.data.reason, "reconnect_required");
    const status = await c.request("GET", "/api/gmail/status");
    assert.equal(status.data.connected, false);
    assert.equal(status.data.needs_reconnect, true);
    assert.equal(status.data.status_label, "Reconnect required");
  });

  test("Gmail rate limit is reported as 429", async () => {
    const c = await loggedIn();
    await connect(c);
    handlers["https://gmail.googleapis.com/gmail/v1/users/me/messages/send"] = () =>
      jsonRes({ error: { code: 429, message: "Rate limit", errors: [{ reason: "rateLimitExceeded" }] } }, 429);
    assert.equal((await c.request("POST", "/api/gmail/test", { body: {} })).status, 429);
  });

  test("test email before connecting", async () => {
    const c = await loggedIn();
    const res = await c.request("POST", "/api/gmail/test", { body: {} });
    assert.equal(res.status, 409);
    assert.equal(res.data.reason, "not_connected");
  });

  test("disconnect revokes at Google and deletes the token", async () => {
    const c = await loggedIn();
    await connect(c);
    handlers["https://oauth2.googleapis.com/revoke"] = () => new Response("", { status: 200 });
    const res = await c.request("POST", "/api/gmail/disconnect", { body: {} });
    assert.equal(res.status, 200);
    const revoke = calls.find((x) => x.url.startsWith("https://oauth2.googleapis.com/revoke"))!;
    assert.equal(new URLSearchParams(revoke.body).get("token"), "1//refresh-1");
    assert.equal(raw.prepare("SELECT COUNT(*) AS n FROM gmail_tokens").get()!.n, 0);
    assert.equal((await c.request("GET", "/api/gmail/status")).data.connected, false);
  });

  test("one student's Gmail is invisible to another", async () => {
    const alice = await loggedIn(ALICE);
    await connect(alice);
    const bob = await loggedIn(BOB);
    const status = await bob.request("GET", "/api/gmail/status");
    assert.equal(status.data.connected, false);
    assert.equal(status.data.email, null);
    assert.equal((await bob.request("POST", "/api/gmail/test", { body: {} })).status, 409);
  });

  test("reconnecting resets the test-email gate", async () => {
    const c = await loggedIn();
    await connect(c);
    handlers["https://gmail.googleapis.com/gmail/v1/users/me/messages/send"] = () => jsonRes({ id: "m", threadId: "t" });
    await c.request("POST", "/api/gmail/test", { body: {} });
    handlers["https://oauth2.googleapis.com/revoke"] = () => new Response("", { status: 200 });
    await connect(c);
    assert.equal((await c.request("GET", "/api/gmail/status")).data.test_passed, false);
  });
});
