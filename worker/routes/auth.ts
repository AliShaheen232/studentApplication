import type { Router } from "../router.ts";
import type { AuthUser, Env } from "../types.ts";
import { pbkdf2Hex, randomHex, timingSafeEqual } from "../lib/crypto.ts";
import { clientIp, error, json, readJson } from "../lib/http.ts";
import { clearSessionCookies, createSession, destroySession, purgeExpiredSessions } from "../lib/session.ts";
import { checkLoginAllowed, recordAttempt } from "../lib/throttle.ts";
import { requireAuth } from "../middleware.ts";

const DUMMY_SALT = "admitpath-timing-equalizer";

export async function accountSummary(env: Env, user: AuthUser) {
  const db = env.adminpath_prod_d1;
  const [student, subscription, settings, gmail] = await Promise.all([
    db.prepare("SELECT * FROM students WHERE user_id = ?").bind(user.id).first<Record<string, unknown>>(),
    db
      .prepare(
        `SELECT s.*, p.name AS plan_name, p.daily_send_limit, p.monthly_send_limit
         FROM subscriptions s JOIN subscription_plans p ON s.plan_id = p.id
         WHERE s.student_id = ? AND s.status = 'active'
         ORDER BY s.created_at DESC LIMIT 1`,
      )
      .bind(user.id)
      .first<Record<string, unknown>>(),
    db.prepare("SELECT * FROM settings WHERE user_id = ?").bind(user.id).first<Record<string, unknown>>(),
    db.prepare("SELECT email, status FROM gmail_tokens WHERE user_id = ?").bind(user.id).first<{ email: string; status: string }>(),
  ]);
  if (student) delete student.activation_token;
  return {
    id: user.id,
    email: user.email,
    role: user.role,
    status: user.status,
    full_name: (student?.full_name as string) || (user.role === "admin" ? "Administrator" : user.email),
    student_profile: student || null,
    onboarding_complete: user.role !== "student" || !!student?.onboarding_completed_at,
    subscription: subscription || null,
    settings: settings || null,
    gmail: {
      connected: gmail?.status === "connected" || !!settings?.gmail_connected,
      email: gmail?.email || (settings?.gmail_email as string) || null,
    },
  };
}

export async function audit(env: Env, actorId: string, actorEmail: string, action: string, ip: string, details: Record<string, unknown>) {
  await env.adminpath_prod_d1
    .prepare(
      `INSERT INTO audit_logs (id, actor_id, actor_email, action, target_type, target_id, details_json, ip_address)
       VALUES (?, ?, ?, ?, 'session', ?, ?, ?)`,
    )
    .bind(`aud_${randomHex(6)}`, actorId, actorEmail, action, actorId, JSON.stringify(details), ip)
    .run();
}

export function registerAuthRoutes(router: Router): void {
  router.post("/api/auth/login", async (c) => {
    const body = await readJson<{ email?: unknown; password?: unknown }>(c.req);
    const email = typeof body?.email === "string" ? body.email.toLowerCase().trim() : "";
    const password = typeof body?.password === "string" ? body.password : "";
    if (!email || !password || email.length > 254 || password.length > 256) {
      return error(400, "Email and password are required.");
    }

    const ip = clientIp(c.req);
    const gate = await checkLoginAllowed(c.env, email, ip);
    if (!gate.allowed) {
      return json(
        { error: "Too many failed sign-in attempts. Please try again later.", retry_after_sec: gate.retryAfterSec },
        429,
        { "Retry-After": String(gate.retryAfterSec) },
      );
    }

    const row = await c.env.adminpath_prod_d1
      .prepare("SELECT id, email, role, status, password_hash, salt FROM users WHERE email = ?")
      .bind(email)
      .first<AuthUser & { password_hash: string; salt: string }>();

    const hash = await pbkdf2Hex(password, row?.salt ?? DUMMY_SALT);
    const valid = !!row && timingSafeEqual(hash, row.password_hash);

    if (!valid || !row) {
      await recordAttempt(c.env, email, ip, false);
      return error(401, "Invalid email or password.");
    }
    if (row.status === "suspended" || row.status === "deactivated") {
      return error(403, "Your account has been suspended. Please contact your administrator.");
    }

    await recordAttempt(c.env, email, ip, true);
    await purgeExpiredSessions(c.env);
    const user: AuthUser = { id: row.id, email: row.email, role: row.role, status: row.status };
    const { session, cookies } = await createSession(c.env, user.id, {
      ip,
      userAgent: c.req.headers.get("User-Agent") || "",
    });
    await audit(c.env, user.id, user.email, "LOGIN", ip, { note: "Signed in" });

    const headers = new Headers();
    for (const cookie of cookies) headers.append("Set-Cookie", cookie);
    return json({ success: true, csrf_token: session.csrfToken, user: await accountSummary(c.env, user) }, 200, headers);
  });

  router.get("/api/auth/me", requireAuth, async (c) => {
    const summary = await accountSummary(c.env, c.user!);
    return json({ ...summary, csrf_token: c.session!.csrfToken });
  });

  router.post("/api/auth/logout", async (c) => {
    if (c.session && c.user) {
      await audit(c.env, c.user.id, c.user.email, "LOGOUT", clientIp(c.req), { note: "Signed out, session revoked" });
      await destroySession(c.env, c.session.tokenHash);
    }
    const headers = new Headers();
    for (const cookie of clearSessionCookies(c.env)) headers.append("Set-Cookie", cookie);
    return json({ success: true, message: "Logged out successfully." }, 200, headers);
  });
}
