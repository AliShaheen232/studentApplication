import type { AuthUser, Env, SessionInfo } from "../types.ts";
import { clock, sqlTimestamp } from "./clock.ts";
import { randomHex, sha256Hex } from "./crypto.ts";
import { parseCookies, serializeCookie } from "./http.ts";

export const SESSION_COOKIE = "ap_session";
export const CSRF_COOKIE = "ap_csrf";
export const CSRF_HEADER = "X-CSRF-Token";

function ttlHours(env: Env): number {
  const n = Number(env.SESSION_TTL_HOURS ?? 168);
  return Number.isFinite(n) && n > 0 ? n : 168;
}

function secureCookies(env: Env): boolean {
  return env.COOKIE_SECURE !== "false";
}

export async function createSession(
  env: Env,
  userId: string,
  meta: { ip: string; userAgent: string },
): Promise<{ token: string; session: SessionInfo; cookies: string[] }> {
  const token = randomHex(32);
  const tokenHash = await sha256Hex(token);
  const csrfToken = randomHex(32);
  const maxAgeSec = ttlHours(env) * 3600;
  const expiresAt = sqlTimestamp(clock.now() + maxAgeSec * 1000);

  await env.adminpath_prod_d1
    .prepare(
      "INSERT INTO sessions (token, user_id, expires_at, created_at, csrf_token, ip_address, user_agent) VALUES (?, ?, ?, ?, ?, ?, ?)",
    )
    .bind(tokenHash, userId, expiresAt, sqlTimestamp(), csrfToken, meta.ip, meta.userAgent.slice(0, 300))
    .run();

  const secure = secureCookies(env);
  const cookies = [
    serializeCookie(SESSION_COOKIE, token, { httpOnly: true, secure, sameSite: "Lax", maxAge: maxAgeSec }),
    serializeCookie(CSRF_COOKIE, csrfToken, { httpOnly: false, secure, sameSite: "Lax", maxAge: maxAgeSec }),
  ];
  return { token, session: { tokenHash, csrfToken, expiresAt }, cookies };
}

export function clearSessionCookies(env: Env): string[] {
  const secure = secureCookies(env);
  return [
    serializeCookie(SESSION_COOKIE, "", { httpOnly: true, secure, sameSite: "Lax", maxAge: 0 }),
    serializeCookie(CSRF_COOKIE, "", { httpOnly: false, secure, sameSite: "Lax", maxAge: 0 }),
  ];
}

export function sessionTokenFrom(req: Request): string | null {
  const token = parseCookies(req.headers.get("Cookie"))[SESSION_COOKIE];
  return token && /^[0-9a-f]{64}$/.test(token) ? token : null;
}

export async function resolveSession(
  env: Env,
  req: Request,
): Promise<{ user: AuthUser; session: SessionInfo } | null> {
  const token = sessionTokenFrom(req);
  if (!token) return null;
  const tokenHash = await sha256Hex(token);
  const row = await env.adminpath_prod_d1
    .prepare(
      `SELECT u.id, u.email, u.role, u.status, s.expires_at, s.csrf_token
       FROM sessions s JOIN users u ON s.user_id = u.id
       WHERE s.token = ? AND s.expires_at > ?`,
    )
    .bind(tokenHash, sqlTimestamp())
    .first<{ id: string; email: string; role: string; status: string; expires_at: string; csrf_token: string | null }>();
  if (!row || !row.csrf_token) return null;
  return {
    user: { id: row.id, email: row.email, role: row.role, status: row.status },
    session: { tokenHash, csrfToken: row.csrf_token, expiresAt: row.expires_at },
  };
}

export async function destroySession(env: Env, tokenHash: string): Promise<void> {
  await env.adminpath_prod_d1.prepare("DELETE FROM sessions WHERE token = ?").bind(tokenHash).run();
}

export async function purgeExpiredSessions(env: Env): Promise<void> {
  await env.adminpath_prod_d1.prepare("DELETE FROM sessions WHERE expires_at <= ?").bind(sqlTimestamp()).run();
}
