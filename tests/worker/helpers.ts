import { DatabaseSync } from "node:sqlite";
import { pbkdf2Sync } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import worker from "../../worker/index.ts";
import type { D1Database, D1PreparedStatement, D1Result, Env } from "../../worker/types.ts";

const MIGRATIONS = join(import.meta.dirname, "..", "..", "migrations");

class Statement implements D1PreparedStatement {
  private db: DatabaseSync;
  private sql: string;
  private values: unknown[] = [];

  constructor(db: DatabaseSync, sql: string) {
    this.db = db;
    this.sql = sql;
  }

  bind(...values: unknown[]): D1PreparedStatement {
    const next = new Statement(this.db, this.sql);
    next.values = values.map((v) => (v === undefined ? null : typeof v === "boolean" ? Number(v) : v));
    return next;
  }

  async first<T>(column?: string): Promise<T | null> {
    const row = this.db.prepare(this.sql).get(...(this.values as never[])) as Record<string, unknown> | undefined;
    if (!row) return null;
    return (column ? row[column] : { ...row }) as T;
  }

  async all<T>(): Promise<D1Result<T>> {
    const rows = this.db.prepare(this.sql).all(...(this.values as never[])) as T[];
    return { results: rows.map((r) => ({ ...(r as object) }) as T), success: true, meta: {} };
  }

  async run(): Promise<D1Result> {
    const info = this.db.prepare(this.sql).run(...(this.values as never[]));
    return { results: [], success: true, meta: { changes: Number(info.changes), last_row_id: Number(info.lastInsertRowid) } };
  }
}

export function createD1(): { d1: D1Database; raw: DatabaseSync } {
  const raw = new DatabaseSync(":memory:");
  raw.exec("PRAGMA foreign_keys = ON;");
  for (const file of readdirSync(MIGRATIONS).filter((f) => f.endsWith(".sql")).sort()) {
    raw.exec(readFileSync(join(MIGRATIONS, file), "utf8"));
  }
  const d1: D1Database = {
    prepare: (sql) => new Statement(raw, sql),
    async batch(statements) {
      raw.exec("BEGIN");
      try {
        const out: D1Result[] = [];
        for (const s of statements) out.push(await s.run());
        raw.exec("COMMIT");
        return out;
      } catch (err) {
        raw.exec("ROLLBACK");
        throw err;
      }
    },
  };
  return { d1, raw };
}

export function createEnv(): { env: Env; raw: DatabaseSync } {
  const { d1, raw } = createD1();
  const env: Env = {
    adminpath_prod_d1: d1,
    adminpath_student_documents: { get: async () => null, put: async () => null, delete: async () => {} },
  };
  return { env, raw };
}

export function addUser(
  raw: DatabaseSync,
  opts: { id: string; email: string; password: string; role?: string; status?: string; fullName?: string },
): void {
  const salt = `salt-${opts.id}`;
  const hash = pbkdf2Sync(opts.password, salt, 100000, 32, "sha256").toString("hex");
  raw
    .prepare("INSERT INTO users (id, email, password_hash, salt, role, status) VALUES (?, ?, ?, ?, ?, ?)")
    .run(opts.id, opts.email, hash, salt, opts.role ?? "student", opts.status ?? "active");
  if ((opts.role ?? "student") === "student") {
    raw.prepare("INSERT INTO students (user_id, full_name) VALUES (?, ?)").run(opts.id, opts.fullName ?? opts.email);
  }
}

export class Client {
  private env: Env;
  private cookies = new Map<string, string>();
  csrf: string | null = null;
  ip: string;
  origin = "https://app.adminpath.com";

  constructor(env: Env, ip = "203.0.113.10") {
    this.env = env;
    this.ip = ip;
  }

  cookie(name: string): string | undefined {
    return this.cookies.get(name);
  }

  setCookie(name: string, value: string): void {
    this.cookies.set(name, value);
  }

  async request(method: string, path: string, opts: { body?: unknown; headers?: Record<string, string>; csrf?: boolean } = {}) {
    const headers = new Headers(opts.headers);
    headers.set("CF-Connecting-IP", this.ip);
    if (this.cookies.size) {
      headers.set("Cookie", [...this.cookies].map(([k, v]) => `${k}=${v}`).join("; "));
    }
    if (opts.body !== undefined) headers.set("Content-Type", "application/json");
    if (opts.csrf !== false && this.csrf && method !== "GET") headers.set("X-CSRF-Token", this.csrf);
    const req = new Request(this.origin + path, {
      method,
      headers,
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    });
    const res = await worker.fetch(req, this.env);
    for (const line of res.headers.getSetCookie()) {
      const [pair, ...attrs] = line.split(";");
      const idx = pair.indexOf("=");
      const name = pair.slice(0, idx).trim();
      const value = decodeURIComponent(pair.slice(idx + 1).trim());
      const cleared = attrs.some((a) => a.trim().toLowerCase() === "max-age=0");
      if (cleared || !value) this.cookies.delete(name);
      else this.cookies.set(name, value);
    }
    const text = await res.text();
    let data: any = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = text;
    }
    return { status: res.status, headers: res.headers, data };
  }

  async login(email: string, password: string) {
    const res = await this.request("POST", "/api/auth/login", { body: { email, password } });
    if (res.status === 200) this.csrf = res.data.csrf_token;
    return res;
  }
}
