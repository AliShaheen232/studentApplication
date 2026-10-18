import type { Env } from "../types.ts";
import { clock, sqlTimestamp } from "./clock.ts";

function num(value: unknown, fallback: number): number {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

export function throttleConfig(env: Env) {
  return {
    maxFailures: num(env.LOGIN_MAX_FAILURES, 5),
    lockoutMinutes: num(env.LOGIN_LOCKOUT_MINUTES, 15),
    ipMaxFailures: num(env.LOGIN_IP_MAX_FAILURES, 20),
  };
}

async function recentFailures(env: Env, identifier: string, sinceMs: number): Promise<{ count: number; latest: string | null }> {
  const row = await env.adminpath_prod_d1
    .prepare(
      `SELECT COUNT(*) AS n, MAX(attempt_time) AS latest FROM login_attempts
       WHERE identifier = ? AND success = 0 AND attempt_time > ?
         AND attempt_time > COALESCE((SELECT MAX(attempt_time) FROM login_attempts WHERE identifier = ? AND success = 1), '')`,
    )
    .bind(identifier, sqlTimestamp(sinceMs), identifier)
    .first<{ n: number; latest: string | null }>();
  return { count: Number(row?.n ?? 0), latest: row?.latest ?? null };
}

export async function checkLoginAllowed(
  env: Env,
  email: string,
  ip: string,
): Promise<{ allowed: true } | { allowed: false; retryAfterSec: number }> {
  const cfg = throttleConfig(env);
  const windowMs = cfg.lockoutMinutes * 60_000;
  const since = clock.now() - windowMs;

  for (const [identifier, limit] of [
    [`email:${email}`, cfg.maxFailures],
    [`ip:${ip}`, cfg.ipMaxFailures],
  ] as const) {
    const { count, latest } = await recentFailures(env, identifier, since);
    if (count >= limit) {
      const latestMs = latest ? Date.parse(latest.replace(" ", "T") + "Z") : clock.now();
      const retryAfterSec = Math.max(1, Math.ceil((latestMs + windowMs - clock.now()) / 1000));
      return { allowed: false, retryAfterSec };
    }
  }
  return { allowed: true };
}

export async function recordAttempt(env: Env, email: string, ip: string, success: boolean): Promise<void> {
  const ts = sqlTimestamp();
  const db = env.adminpath_prod_d1;
  const insert = "INSERT INTO login_attempts (identifier, attempt_time, success) VALUES (?, ?, ?)";
  const statements = [db.prepare(insert).bind(`email:${email}`, ts, success ? 1 : 0)];
  if (!success) statements.push(db.prepare(insert).bind(`ip:${ip}`, ts, 0));
  await db.batch(statements);
}
