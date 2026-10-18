import type { Env } from "../types.ts";
import { base64UrlEncode, base64UrlDecodeText } from "./vault.ts";

export const GMAIL_SEND_SCOPE = "https://www.googleapis.com/auth/gmail.send";
export const OAUTH_SCOPES = ["openid", "email", GMAIL_SEND_SCOPE];
export const LOGIN_SCOPES = ["openid", "email", "profile"];

const AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const REVOKE_URL = "https://oauth2.googleapis.com/revoke";
const SEND_URL = "https://gmail.googleapis.com/gmail/v1/users/me/messages/send";

export class GoogleError extends Error {
  status: number;
  code: string;
  constructor(message: string, status: number, code: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
  get revoked(): boolean {
    return this.code === "invalid_grant" || this.status === 401;
  }
  get rateLimited(): boolean {
    return this.status === 429 || this.code === "rateLimitExceeded" || this.code === "userRateLimitExceeded";
  }
}

export function googleClient(env: Env): { clientId: string; clientSecret: string } | null {
  const clientId = typeof env.GOOGLE_CLIENT_ID === "string" ? env.GOOGLE_CLIENT_ID.trim() : "";
  const clientSecret = typeof env.GOOGLE_CLIENT_SECRET === "string" ? env.GOOGLE_CLIENT_SECRET.trim() : "";
  return clientId && clientSecret ? { clientId, clientSecret } : null;
}

export function googleConfig(env: Env): { clientId: string; clientSecret: string } | null {
  if (typeof env.GMAIL_TOKEN_KEY !== "string" || !env.GMAIL_TOKEN_KEY) return null;
  return googleClient(env);
}

export function redirectUri(env: Env, origin: string): string {
  const override = typeof env.GOOGLE_REDIRECT_URI === "string" ? env.GOOGLE_REDIRECT_URI.trim() : "";
  return override || `${origin}/api/gmail/callback`;
}

export async function pkceChallenge(verifier: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier));
  return base64UrlEncode(new Uint8Array(digest));
}

export function buildAuthUrl(opts: {
  clientId: string;
  redirectUri: string;
  state: string;
  challenge: string;
  loginHint?: string;
  purpose?: "gmail" | "login";
}): string {
  const login = opts.purpose === "login";
  const params = new URLSearchParams({
    client_id: opts.clientId,
    redirect_uri: opts.redirectUri,
    response_type: "code",
    scope: (login ? LOGIN_SCOPES : OAUTH_SCOPES).join(" "),
    state: opts.state,
    code_challenge: opts.challenge,
    code_challenge_method: "S256",
  });
  if (login) {
    params.set("prompt", "select_account");
  } else {
    params.set("access_type", "offline");
    params.set("prompt", "consent");
    params.set("include_granted_scopes", "true");
  }
  if (opts.loginHint) params.set("login_hint", opts.loginHint);
  return `${AUTH_URL}?${params}`;
}

async function readGoogleError(res: Response): Promise<GoogleError> {
  let code = `http_${res.status}`;
  let message = `Google returned HTTP ${res.status}.`;
  try {
    const body = (await res.json()) as {
      error?: string | { message?: string; status?: string; errors?: { reason?: string }[] };
      error_description?: string;
    };
    if (typeof body.error === "string") {
      code = body.error;
      message = body.error_description || body.error;
    } else if (body.error) {
      code = body.error.errors?.[0]?.reason || body.error.status || code;
      message = body.error.message || message;
    }
  } catch {
    // non-JSON body
  }
  return new GoogleError(message, res.status, code);
}

export interface TokenSet {
  access_token: string;
  expires_in: number;
  refresh_token?: string;
  scope?: string;
  id_token?: string;
}

async function tokenRequest(params: Record<string, string>): Promise<TokenSet> {
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(params),
  });
  if (!res.ok) throw await readGoogleError(res);
  return (await res.json()) as TokenSet;
}

export function exchangeCode(cfg: { clientId: string; clientSecret: string }, code: string, redirect: string, verifier: string) {
  return tokenRequest({
    grant_type: "authorization_code",
    code,
    redirect_uri: redirect,
    client_id: cfg.clientId,
    client_secret: cfg.clientSecret,
    code_verifier: verifier,
  });
}

export function refreshAccessToken(cfg: { clientId: string; clientSecret: string }, refreshToken: string) {
  return tokenRequest({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
    client_id: cfg.clientId,
    client_secret: cfg.clientSecret,
  });
}

export async function revokeToken(token: string): Promise<void> {
  const res = await fetch(REVOKE_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ token }),
  });
  if (!res.ok && res.status !== 400) throw await readGoogleError(res);
}

// The id_token comes straight from Google's token endpoint over TLS, so its
// claims can be read without verifying the signature (OpenID Connect 3.1.3.7).
export interface GoogleIdentity {
  sub: string;
  email: string;
  verified: boolean;
  name: string | null;
}

export function identityFromIdToken(idToken: string | undefined, clientId?: string): GoogleIdentity | null {
  if (!idToken) return null;
  const parts = idToken.split(".");
  if (parts.length !== 3) return null;
  try {
    const claims = JSON.parse(base64UrlDecodeText(parts[1])) as {
      sub?: string;
      aud?: string;
      iss?: string;
      email?: string;
      email_verified?: boolean;
      name?: string;
    };
    if (!claims.email) return null;
    if (clientId && claims.aud !== clientId) return null;
    if (claims.iss && claims.iss !== "https://accounts.google.com" && claims.iss !== "accounts.google.com") return null;
    return {
      sub: typeof claims.sub === "string" ? claims.sub : "",
      email: claims.email.toLowerCase(),
      verified: claims.email_verified === true,
      name: typeof claims.name === "string" && claims.name.trim() ? claims.name.trim().slice(0, 120) : null,
    };
  } catch {
    return null;
  }
}

export function emailFromIdToken(idToken: string | undefined): { email: string; verified: boolean } | null {
  const id = identityFromIdToken(idToken);
  return id ? { email: id.email, verified: id.verified } : null;
}

export async function sendGmailRaw(accessToken: string, raw: string): Promise<{ id: string; threadId: string }> {
  const res = await fetch(SEND_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ raw }),
  });
  if (!res.ok) throw await readGoogleError(res);
  return (await res.json()) as { id: string; threadId: string };
}
