import type { Router } from "../router.ts";
import type { AuthUser, Env } from "../types.ts";
import { clock, sqlTimestamp } from "../lib/clock.ts";
import { randomHex, sha256Hex, timingSafeEqual } from "../lib/crypto.ts";
import { GoogleError, buildAuthUrl, exchangeCode, googleClient, identityFromIdToken, pkceChallenge } from "../lib/google.ts";
import { clientIp, parseCookies, publicOrigin, serializeCookie } from "../lib/http.ts";
import { createSession, destroySession, purgeExpiredSessions } from "../lib/session.ts";
import { audit } from "./auth.ts";

const STATE_COOKIE = "ap_gstate";
const STATE_PATH = "/api/auth/google";
const STATE_TTL_SEC = 600;

function redirect(location: string, cookies: string[] = []): Response {
  const headers = new Headers({ Location: location, "Cache-Control": "no-store" });
  for (const cookie of cookies) headers.append("Set-Cookie", cookie);
  return new Response(null, { status: 302, headers });
}

function stateCookie(env: Env, value: string, maxAge: number): string {
  return serializeCookie(STATE_COOKIE, value, {
    httpOnly: true,
    secure: env.COOKIE_SECURE !== "false",
    sameSite: "Lax",
    path: STATE_PATH,
    maxAge,
  });
}

async function landingFor(env: Env, user: AuthUser): Promise<string> {
  if (user.role === "admin") return "/admin/dashboard";
  const row = await env.adminpath_prod_d1
    .prepare("SELECT onboarding_completed_at FROM students WHERE user_id = ?")
    .bind(user.id)
    .first<{ onboarding_completed_at: string | null }>();
  return row?.onboarding_completed_at ? "/dashboard" : "/onboarding";
}

type UserRow = AuthUser & { google_sub: string | null };

async function findOrCreateUser(
  env: Env,
  identity: { sub: string; email: string; name: string | null },
): Promise<{ user: UserRow; created: boolean } | { conflict: true }> {
  const db = env.adminpath_prod_d1;
  const cols = "id, email, role, status, google_sub";
  const bySub = await db.prepare(`SELECT ${cols} FROM users WHERE google_sub = ?`).bind(identity.sub).first<UserRow>();
  if (bySub) return { user: bySub, created: false };

  const byEmail = await db.prepare(`SELECT ${cols} FROM users WHERE email = ?`).bind(identity.email).first<UserRow>();
  if (byEmail) {
    if (byEmail.google_sub && byEmail.google_sub !== identity.sub) return { conflict: true };
    await db.prepare("UPDATE users SET google_sub = ? WHERE id = ?").bind(identity.sub, byEmail.id).run();
    return { user: { ...byEmail, google_sub: identity.sub }, created: false };
  }

  const id = `usr_${randomHex(8)}`;
  const now = sqlTimestamp();
  await db.batch([
    db
      .prepare("INSERT INTO users (id, email, password_hash, salt, role, status, google_sub, created_at) VALUES (?, ?, '', '', 'student', 'active', ?, ?)")
      .bind(id, identity.email, identity.sub, now),
    db
      .prepare(
        `INSERT INTO students (user_id, full_name, nationality, country_of_residence, gpa, max_gpa, qualification, target_level,
           intake_term, subjects, countries, preferred_universities, budget_max, ielts_score, toefl_score, updated_at)
         VALUES (?, ?, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, ?)`,
      )
      .bind(id, identity.name || identity.email.split("@")[0], now),
    db.prepare("INSERT INTO settings (user_id) VALUES (?) ON CONFLICT(user_id) DO NOTHING").bind(id),
  ]);
  return { user: { id, email: identity.email, role: "student", status: "active", google_sub: identity.sub }, created: true };
}

export function registerGoogleLoginRoutes(router: Router): void {
  router.get("/api/auth/google/start", async (c) => {
    const cfg = googleClient(c.env);
    if (!cfg) return redirect("/login?error=google_not_configured");

    const state = randomHex(32);
    const verifier = randomHex(48);
    const redirectUri = `${publicOrigin(c.env, c.url)}/api/auth/google/callback`;
    const db = c.env.adminpath_prod_d1;
    await db.batch([
      db.prepare("DELETE FROM login_states WHERE expires_at <= ?").bind(sqlTimestamp()),
      db
        .prepare("INSERT INTO login_states (state_hash, code_verifier, redirect_uri, expires_at) VALUES (?, ?, ?, ?)")
        .bind(await sha256Hex(state), verifier, redirectUri, sqlTimestamp(clock.now() + STATE_TTL_SEC * 1000)),
    ]);

    const url = buildAuthUrl({
      clientId: cfg.clientId,
      redirectUri,
      state,
      challenge: await pkceChallenge(verifier),
      purpose: "login",
    });
    return redirect(url, [stateCookie(c.env, state, STATE_TTL_SEC)]);
  });

  router.get("/api/auth/google/callback", async (c) => {
    const clear = stateCookie(c.env, "", 0);
    const fail = (reason: string) => redirect(`/login?error=${reason}`, [clear]);
    const params = c.url.searchParams;
    if (params.get("error")) return fail(params.get("error") === "access_denied" ? "google_denied" : "google_failed");

    const state = params.get("state") || "";
    const code = params.get("code") || "";
    const cookieState = parseCookies(c.req.headers.get("Cookie"))[STATE_COOKIE] || "";
    if (!state || !code || !cookieState || !timingSafeEqual(state, cookieState)) return fail("google_expired");

    const db = c.env.adminpath_prod_d1;
    const stateHash = await sha256Hex(state);
    const saved = await db
      .prepare("SELECT code_verifier, redirect_uri, expires_at FROM login_states WHERE state_hash = ?")
      .bind(stateHash)
      .first<{ code_verifier: string; redirect_uri: string; expires_at: string }>();
    await db.prepare("DELETE FROM login_states WHERE state_hash = ?").bind(stateHash).run();
    if (!saved || saved.expires_at <= sqlTimestamp()) return fail("google_expired");

    const cfg = googleClient(c.env);
    if (!cfg) return fail("google_not_configured");

    let tokens;
    try {
      tokens = await exchangeCode(cfg, code, saved.redirect_uri, saved.code_verifier);
    } catch (err) {
      console.error("Google login code exchange failed", err instanceof GoogleError ? err.code : err);
      return fail("google_failed");
    }

    const identity = identityFromIdToken(tokens.id_token, cfg.clientId);
    if (!identity || !identity.sub) return fail("google_failed");
    if (!identity.verified) return fail("google_unverified");

    let found;
    try {
      found = await findOrCreateUser(c.env, identity);
    } catch (err) {
      console.error("Google login account lookup failed", err instanceof Error ? err.message : err);
      return fail("google_failed");
    }
    if ("conflict" in found) return fail("google_conflict");
    const { user, created } = found;
    if (user.status === "suspended" || user.status === "deactivated") return fail("suspended");

    const ip = clientIp(c.req);
    if (c.session) await destroySession(c.env, c.session.tokenHash);
    await purgeExpiredSessions(c.env);
    const { cookies } = await createSession(c.env, user.id, { ip, userAgent: c.req.headers.get("User-Agent") || "" });
    await audit(c.env, user.id, user.email, created ? "SIGNUP_GOOGLE" : "LOGIN_GOOGLE", ip, { note: created ? "Account created with Google" : "Signed in with Google" });

    return redirect(await landingFor(c.env, user), [clear, ...cookies]);
  });
}
