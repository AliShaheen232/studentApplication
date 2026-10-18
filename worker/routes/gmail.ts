import type { Router } from "../router.ts";
import type { Env } from "../types.ts";
import { clock, sqlTimestamp } from "../lib/clock.ts";
import { randomHex, sha256Hex } from "../lib/crypto.ts";
import { GmailNotReady, getAccount, sendAsStudent } from "../lib/gmailAccount.ts";
import {
  GMAIL_SEND_SCOPE,
  GoogleError,
  buildAuthUrl,
  emailFromIdToken,
  exchangeCode,
  googleConfig,
  pkceChallenge,
  redirectUri,
  revokeToken,
} from "../lib/google.ts";
import { clientIp, error, json, publicOrigin } from "../lib/http.ts";
import { decryptSecret, encryptSecret } from "../lib/vault.ts";
import { requireAuth } from "../middleware.ts";

const STATE_TTL_MS = 10 * 60_000;

function backToGmail(result: string): Response {
  return new Response(null, {
    status: 302,
    headers: { Location: `/gmail?gmail=${encodeURIComponent(result)}`, "Cache-Control": "no-store" },
  });
}

async function audit(env: Env, userId: string, email: string, action: string, ip: string, details: Record<string, unknown>) {
  await env.adminpath_prod_d1
    .prepare(
      `INSERT INTO audit_logs (id, actor_id, actor_email, action, target_type, target_id, details_json, ip_address)
       VALUES (?, ?, ?, ?, 'gmail_token', ?, ?, ?)`,
    )
    .bind(`aud_${randomHex(6)}`, userId, email, action, userId, JSON.stringify(details), ip)
    .run();
}

function ensureSettings(env: Env, userId: string) {
  return env.adminpath_prod_d1
    .prepare("INSERT INTO settings (user_id) VALUES (?) ON CONFLICT(user_id) DO NOTHING")
    .bind(userId);
}

export function registerGmailRoutes(router: Router): void {
  router.get("/api/gmail/status", requireAuth, async (c) => {
    const account = await getAccount(c.env, c.user!.id);
    const settings = await c.env.adminpath_prod_d1
      .prepare("SELECT last_test_sent_at FROM settings WHERE user_id = ?")
      .bind(c.user!.id)
      .first<{ last_test_sent_at: string | null }>();
    const connected = account?.status === "connected";
    const needsReconnect = account?.status === "reconnect_required";
    return json({
      configured: googleConfig(c.env) !== null,
      connected,
      needs_reconnect: needsReconnect,
      email: account?.email ?? null,
      scopes: account?.scopes ?? GMAIL_SEND_SCOPE,
      connected_since: account?.created_at ?? null,
      last_test_sent_at: settings?.last_test_sent_at ?? null,
      test_passed: connected && !!settings?.last_test_sent_at,
      last_error: account?.last_error ?? null,
      status_label: connected ? "Authorized & Active" : needsReconnect ? "Reconnect required" : "Disconnected",
    });
  });

  router.post("/api/gmail/connect", requireAuth, async (c) => {
    const cfg = googleConfig(c.env);
    if (!cfg) return error(503, "Gmail connection is not set up on the server yet.", { configured: false });

    const state = randomHex(32);
    const verifier = randomHex(48);
    const redirect = redirectUri(c.env, publicOrigin(c.env, c.url));
    const db = c.env.adminpath_prod_d1;
    await db.batch([
      db.prepare("DELETE FROM oauth_states WHERE user_id = ? OR expires_at <= ?").bind(c.user!.id, sqlTimestamp()),
      db
        .prepare("INSERT INTO oauth_states (state_hash, user_id, code_verifier, redirect_uri, expires_at) VALUES (?, ?, ?, ?, ?)")
        .bind(await sha256Hex(state), c.user!.id, verifier, redirect, sqlTimestamp(clock.now() + STATE_TTL_MS)),
    ]);

    const url = buildAuthUrl({
      clientId: cfg.clientId,
      redirectUri: redirect,
      state,
      challenge: await pkceChallenge(verifier),
    });
    return json({ url });
  });

  router.get("/api/gmail/callback", async (c) => {
    const params = c.url.searchParams;
    if (!c.user) return backToGmail("login_required");
    if (params.get("error")) return backToGmail(params.get("error") === "access_denied" ? "denied" : "error");

    const state = params.get("state") || "";
    const code = params.get("code") || "";
    if (!state || !code) return backToGmail("error");

    const db = c.env.adminpath_prod_d1;
    const stateHash = await sha256Hex(state);
    const saved = await db
      .prepare("SELECT user_id, code_verifier, redirect_uri, expires_at FROM oauth_states WHERE state_hash = ?")
      .bind(stateHash)
      .first<{ user_id: string; code_verifier: string; redirect_uri: string; expires_at: string }>();
    await db.prepare("DELETE FROM oauth_states WHERE state_hash = ?").bind(stateHash).run();
    if (!saved || saved.user_id !== c.user.id || saved.expires_at <= sqlTimestamp()) return backToGmail("expired");

    const cfg = googleConfig(c.env);
    if (!cfg) return backToGmail("not_configured");

    let tokens;
    try {
      tokens = await exchangeCode(cfg, code, saved.redirect_uri, saved.code_verifier);
    } catch (err) {
      console.error("Gmail code exchange failed", err instanceof GoogleError ? err.code : err);
      return backToGmail("error");
    }

    const scopes = (tokens.scope || "").split(" ").filter(Boolean);
    const identity = emailFromIdToken(tokens.id_token);
    const problem = !scopes.includes(GMAIL_SEND_SCOPE)
      ? "missing_scope"
      : !identity?.verified
        ? "unverified_email"
        : !tokens.refresh_token
          ? "no_refresh_token"
          : null;
    if (problem || !identity || !tokens.refresh_token) {
      await revokeToken(tokens.refresh_token || tokens.access_token).catch(() => {});
      return backToGmail(problem || "error");
    }

    const previous = await getAccount(c.env, c.user.id);
    const key = c.env.GMAIL_TOKEN_KEY;
    const now = sqlTimestamp();
    await db.batch([
      db
        .prepare(
          `INSERT INTO gmail_tokens (user_id, email, encrypted_refresh_token, encrypted_access_token, token_expires_at, scopes, status, last_sync_at, created_at, last_error)
           VALUES (?, ?, ?, ?, ?, ?, 'connected', ?, ?, NULL)
           ON CONFLICT(user_id) DO UPDATE SET email = excluded.email, encrypted_refresh_token = excluded.encrypted_refresh_token,
             encrypted_access_token = excluded.encrypted_access_token, token_expires_at = excluded.token_expires_at,
             scopes = excluded.scopes, status = 'connected', last_sync_at = excluded.last_sync_at,
             created_at = excluded.created_at, last_error = NULL`,
        )
        .bind(
          c.user.id,
          identity.email,
          await encryptSecret(key, tokens.refresh_token),
          await encryptSecret(key, tokens.access_token),
          sqlTimestamp(clock.now() + tokens.expires_in * 1000),
          scopes.join(" "),
          now,
          now,
        ),
      ensureSettings(c.env, c.user.id),
      db
        .prepare("UPDATE settings SET gmail_connected = 1, gmail_email = ?, last_test_sent_at = NULL WHERE user_id = ?")
        .bind(identity.email, c.user.id),
    ]);

    if (previous?.encrypted_refresh_token) {
      const old = await decryptSecret(key, previous.encrypted_refresh_token).catch(() => null);
      if (old && old !== tokens.refresh_token) await revokeToken(old).catch(() => {});
    }
    await audit(c.env, c.user.id, c.user.email, "GMAIL_ACCOUNT_CONNECTED", clientIp(c.req), { connected_email: identity.email });
    return backToGmail("connected");
  });

  router.post("/api/gmail/disconnect", requireAuth, async (c) => {
    const account = await getAccount(c.env, c.user!.id);
    if (account?.encrypted_refresh_token) {
      try {
        await revokeToken(await decryptSecret(c.env.GMAIL_TOKEN_KEY, account.encrypted_refresh_token));
      } catch (err) {
        console.error("Gmail revoke failed", err instanceof GoogleError ? err.code : "decrypt");
      }
    }
    const db = c.env.adminpath_prod_d1;
    await db.batch([
      db.prepare("DELETE FROM gmail_tokens WHERE user_id = ?").bind(c.user!.id),
      db.prepare("UPDATE settings SET gmail_connected = 0, gmail_email = NULL, last_test_sent_at = NULL WHERE user_id = ?").bind(c.user!.id),
    ]);
    if (account) {
      await audit(c.env, c.user!.id, c.user!.email, "GMAIL_ACCOUNT_DISCONNECTED", clientIp(c.req), { email: account.email });
    }
    return json({ success: true, message: "Gmail disconnected and access revoked." });
  });

  router.post("/api/gmail/test", requireAuth, async (c) => {
    const account = await getAccount(c.env, c.user!.id);
    if (!account) return error(409, "Connect your Gmail account first.", { reason: "not_connected" });
    try {
      const sent = await sendAsStudent(c.env, c.user!.id, {
        to: account.email,
        subject: "AdmitPath test email",
        text: [
          "This is a test email from AdmitPath.",
          "",
          "If you can read this in your Gmail inbox, your account is connected and AdmitPath can send your approved university emails from this address.",
          "",
          "You can disconnect at any time from the Gmail page in AdmitPath or from your Google Account security settings.",
        ].join("\n"),
      });
      const db = c.env.adminpath_prod_d1;
      const now = sqlTimestamp();
      await db.batch([
        ensureSettings(c.env, c.user!.id),
        db.prepare("UPDATE settings SET last_test_sent_at = ? WHERE user_id = ?").bind(now, c.user!.id),
      ]);
      return json({
        success: true,
        message: `Test email sent to ${sent.from}. Check your inbox to confirm it arrived.`,
        message_id: sent.id,
        last_test_sent_at: now,
      });
    } catch (err) {
      if (err instanceof GmailNotReady) return error(409, err.message, { reason: err.reason });
      if (err instanceof GoogleError && err.rateLimited) {
        return error(429, "Gmail is rate limiting this account. Try again later.", { reason: "rate_limited" });
      }
      console.error("Gmail test send failed", err instanceof GoogleError ? `${err.status} ${err.code}` : err);
      return error(502, "Gmail could not send the test email. Try again, or reconnect Gmail.", { reason: "send_failed" });
    }
  });
}
