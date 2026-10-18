export interface Statement {
  sql: string;
  params?: unknown[];
}

export interface Db {
  query<T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<{ results: T[]; changes: number }>;
  batch(statements: Statement[]): Promise<void>;
  rowsWritten?(): number;
}

export function isLimitError(e: unknown): boolean {
  return /limit|exceeded|quota/i.test(String((e as Error)?.message ?? e));
}

export function d1Rest(opts: { accountId: string; databaseId: string; token: string }): Db {
  const url = `https://api.cloudflare.com/client/v4/accounts/${opts.accountId}/d1/database/${opts.databaseId}/query`;

  let written = 0;

  async function call(body: unknown) {
    for (let attempt = 0; ; attempt++) {
      const res = await fetch(url, {
        method: "POST",
        headers: { Authorization: `Bearer ${opts.token}`, "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await res.json().catch(() => ({}))) as {
        success?: boolean;
        errors?: { message: string }[];
        result?: { results: unknown[]; meta?: { changes?: number; rows_written?: number } }[];
      };
      if (res.ok && data.success) {
        for (const r of data.result ?? []) written += Number(r.meta?.rows_written ?? r.meta?.changes ?? 0);
        return data.result ?? [];
      }
      const msg = data.errors?.map((e) => e.message).join("; ") || `HTTP ${res.status}`;
      if (attempt < 3 && (res.status === 429 || res.status >= 500)) {
        await new Promise((r) => setTimeout(r, 1000 * 2 ** attempt));
        continue;
      }
      throw new Error(`D1 query failed: ${msg}`);
    }
  }

  return {
    rowsWritten: () => written,
    async query(sql, params = []) {
      const [first] = await call({ sql, params });
      return { results: (first?.results ?? []) as never[], changes: Number(first?.meta?.changes ?? 0) };
    },
    async batch(statements) {
      for (let i = 0; i < statements.length; i += 50) {
        await call({ batch: statements.slice(i, i + 50).map((s) => ({ sql: s.sql, params: s.params ?? [] })) });
      }
    },
  };
}
