export interface D1Result<T = Record<string, unknown>> {
  results: T[];
  success: boolean;
  meta: { changes?: number; last_row_id?: number; [key: string]: unknown };
}

export interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement;
  first<T = Record<string, unknown>>(column?: string): Promise<T | null>;
  all<T = Record<string, unknown>>(): Promise<D1Result<T>>;
  run(): Promise<D1Result>;
}

export interface D1Database {
  prepare(query: string): D1PreparedStatement;
  batch(statements: D1PreparedStatement[]): Promise<D1Result[]>;
}

export interface R2Bucket {
  get(key: string): Promise<{ arrayBuffer(): Promise<ArrayBuffer> } | null>;
  put(key: string, value: ArrayBuffer | Uint8Array, options?: unknown): Promise<unknown>;
  delete(key: string | string[]): Promise<void>;
}

export interface AssetsFetcher {
  fetch(request: Request): Promise<Response>;
}

export interface Env {
  adminpath_prod_d1: D1Database;
  adminpath_student_documents: R2Bucket;
  ASSETS?: AssetsFetcher;
  SESSION_TTL_HOURS?: string;
  LOGIN_MAX_FAILURES?: string;
  LOGIN_LOCKOUT_MINUTES?: string;
  LOGIN_IP_MAX_FAILURES?: string;
  COOKIE_SECURE?: string;
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
  GOOGLE_REDIRECT_URI?: string;
  GMAIL_TOKEN_KEY?: string;
  APP_ORIGIN?: string;
  GITHUB_DISPATCH_TOKEN?: string;
  GITHUB_REPO?: string;
  [key: string]: unknown;
}

export interface AuthUser {
  id: string;
  email: string;
  role: string;
  status: string;
}

export interface SessionInfo {
  tokenHash: string;
  csrfToken: string;
  expiresAt: string;
}
