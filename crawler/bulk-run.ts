import { readFileSync } from "node:fs";
import { runBulk } from "./bulk.ts";
import { targetCountries } from "./countries.ts";
import { d1Rest } from "./d1.ts";
import { PoliteFetcher } from "./fetcher.ts";
import { fetchInstitutions } from "./wikidata.ts";

function env(name: string, fallback?: string): string {
  const v = process.env[name] ?? fallback;
  if (v === undefined || v === "") throw new Error(`Missing environment variable ${name}`);
  return v;
}

const databaseId = process.env.D1_DATABASE_ID || /database_id\s*=\s*"([^"]+)"/.exec(readFileSync("wrangler.toml", "utf8"))?.[1];

const db = d1Rest({
  accountId: env("CLOUDFLARE_ACCOUNT_ID"),
  databaseId: env("D1_DATABASE_ID", databaseId),
  token: env("CLOUDFLARE_API_TOKEN"),
});

const summary = await runBulk(db, new PoliteFetcher(), {
  countries: targetCountries(process.env.CRAWL_COUNTRIES),
  writeLimitPerDay: Number(env("D1_WRITE_BUDGET_PER_DAY", "60000")),
  timeBudgetMs: Number(env("BULK_TIME_BUDGET_MIN", "45")) * 60_000,
  batchSize: Number(env("BULK_BATCH_SIZE", "16")),
  concurrency: Number(env("CRAWL_CONCURRENCY", "8")),
  maxPages: Number(env("BULK_MAX_PAGES", "25")),
  maxPrograms: Number(env("BULK_MAX_PROGRAMS", "300")),
  outputDir: "crawler/output",
  institutions: (code, limit) => fetchInstitutions(code, limit),
  log: (msg) => console.log(msg),
});

console.log(JSON.stringify({ ...summary, snapshots: summary.snapshots.length }, null, 2));
