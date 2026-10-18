import type { Env } from "../types.ts";
import { clock, sqlTimestamp } from "./clock.ts";
import { GoogleError, googleConfig, refreshAccessToken, sendGmailRaw } from "./google.ts";
import { buildMime, toGmailRaw, type OutgoingEmail } from "./mime.ts";
import { decryptSecret, encryptSecret } from "./vault.ts";

export interface GmailAccount {
  user_id: string;
  email: string;
  encrypted_refresh_token: string | null;
  encrypted_access_token: string | null;
  token_expires_at: string | null;
  scopes: string | null;
  status: string;
  created_at: string | null;
  last_error: string | null;
}

export class GmailNotReady extends Error {
  reason: "not_configured" | "not_connected" | "reconnect_required";
  constructor(reason: GmailNotReady["reason"], message: string) {
    super(message);
    this.reason = reason;
  }
}

export function getAccount(env: Env, userId: string): Promise<GmailAccount | null> {
  return env.adminpath_prod_d1.prepare("SELECT * FROM gmail_tokens WHERE user_id = ?").bind(userId).first<GmailAccount>();
}

export async function markReconnect(env: Env, userId: string, reason: string): Promise<void> {
  await env.adminpath_prod_d1.batch([
    env.adminpath_prod_d1
      .prepare("UPDATE gmail_tokens SET status = 'reconnect_required', encrypted_access_token = NULL, last_error = ? WHERE user_id = ?")
      .bind(reason.slice(0, 300), userId),
    env.adminpath_prod_d1.prepare("UPDATE settings SET gmail_connected = 0 WHERE user_id = ?").bind(userId),
  ]);
}

async function accessTokenFor(env: Env, account: GmailAccount): Promise<string> {
  const expiresMs = account.token_expires_at ? Date.parse(account.token_expires_at.replace(" ", "T") + "Z") : 0;
  if (account.encrypted_access_token && expiresMs - clock.now() > 60_000) {
    return decryptSecret(env.GMAIL_TOKEN_KEY, account.encrypted_access_token);
  }
  const cfg = googleConfig(env);
  if (!cfg) throw new GmailNotReady("not_configured", "Gmail sending is not configured on the server.");
  if (!account.encrypted_refresh_token) {
    throw new GmailNotReady("reconnect_required", "Your Gmail connection expired. Please reconnect Gmail.");
  }
  const refreshToken = await decryptSecret(env.GMAIL_TOKEN_KEY, account.encrypted_refresh_token);
  try {
    const tokens = await refreshAccessToken(cfg, refreshToken);
    const encrypted = await encryptSecret(env.GMAIL_TOKEN_KEY, tokens.access_token);
    await env.adminpath_prod_d1
      .prepare("UPDATE gmail_tokens SET encrypted_access_token = ?, token_expires_at = ?, last_sync_at = ?, last_error = NULL WHERE user_id = ?")
      .bind(encrypted, sqlTimestamp(clock.now() + tokens.expires_in * 1000), sqlTimestamp(), account.user_id)
      .run();
    return tokens.access_token;
  } catch (err) {
    if (err instanceof GoogleError && err.revoked) {
      await markReconnect(env, account.user_id, "Google access was revoked or expired.");
      throw new GmailNotReady("reconnect_required", "Google access was revoked or expired. Please reconnect Gmail.");
    }
    throw err;
  }
}

export async function sendAsStudent(
  env: Env,
  userId: string,
  mail: Omit<OutgoingEmail, "from">,
): Promise<{ id: string; threadId: string; from: string }> {
  const account = await getAccount(env, userId);
  if (!account) throw new GmailNotReady("not_connected", "Connect your Gmail account first.");
  if (account.status !== "connected") {
    throw new GmailNotReady("reconnect_required", "Your Gmail connection needs to be renewed. Please reconnect Gmail.");
  }
  const raw = toGmailRaw(buildMime({ ...mail, from: account.email }));
  const token = await accessTokenFor(env, account);
  try {
    const sent = await sendGmailRaw(token, raw);
    return { ...sent, from: account.email };
  } catch (err) {
    if (err instanceof GoogleError && err.status === 401) {
      await markReconnect(env, userId, "Gmail rejected the access token.");
      throw new GmailNotReady("reconnect_required", "Gmail rejected the connection. Please reconnect Gmail.");
    }
    throw err;
  }
}
