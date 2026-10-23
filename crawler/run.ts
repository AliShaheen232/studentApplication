import { readFileSync } from "node:fs";
import { claimBackups, runBackup } from "./backup.ts";
import { d1Rest } from "./d1.ts";
import { PoliteFetcher } from "./fetcher.ts";
import { claimNext, failJob, runSearch } from "./job.ts";
import { fetchInstitutions } from "./wikidata.ts";

process.on("uncaughtException", (err) => console.log(`Ignored network error: ${err?.message ?? err}`));
process.on("unhandledRejection", (err) => console.log(`Ignored rejected promise: ${(err as Error)?.message ?? err}`));

function env(name: string, fallback?: string): string {
  const v = process.env[name] ?? fallback;
  if (v === undefined || v === "") throw new Error(`Missing environment variable ${name}`);
  return v;
}

function databaseIdFromWrangler(): string | undefined {
  try {
    return /database_id\s*=\s*"([^"]+)"/.exec(readFileSync("wrangler.toml", "utf8"))?.[1];
  } catch {
    return undefined;
  }
}

const db = d1Rest({
  accountId: env("CLOUDFLARE_ACCOUNT_ID"),
  databaseId: env("D1_DATABASE_ID", databaseIdFromWrangler()),
  token: env("CLOUDFLARE_API_TOKEN"),
});

const maxJobs = Number(env("CRAWL_MAX_JOBS", "3"));
const budgetMs = Number(env("CRAWL_TIME_BUDGET_MIN", "25")) * 60_000;
const started = Date.now();

let done = 0;
while (done < maxJobs && Date.now() - started < budgetMs) {
  const job = await claimNext(db, Date.now());
  if (!job) break;
  console.log(`Crawling ${job.field} in ${job.country} (attempt ${job.attempts})`);
  const fetcher = new PoliteFetcher();
  try {
    const summary = await runSearch(db, fetcher, job, {
      maxUniversities: Number(env("CRAWL_MAX_UNIVERSITIES", "40")),
      maxPagesPerUniversity: Number(env("CRAWL_MAX_PAGES", "10")),
      concurrency: Number(env("CRAWL_CONCURRENCY", "8")),
      outputDir: "crawler/output",
      institutions: (code, limit) => fetchInstitutions(code, limit),
    });
    console.log(
      `Done: ${summary.programs.length} programmes from ${summary.institutions_with_programs}/${summary.institutions_checked} universities, ${summary.pages_inspected} pages`,
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`Failed: ${message}`);
    await failJob(db, job, message);
  }
  done++;
}
console.log(done ? `Processed ${done} search(es).` : "No pending searches.");

const backups = Date.now() - started < budgetMs ? await claimBackups(db, Number(env("BACKUP_MAX", "10")), Date.now()) : [];
const backupFetcher = new PoliteFetcher();
for (const row of backups) {
  const found = await runBackup(db, backupFetcher, row, Date.now()).catch((err) => {
    console.error(`Backup failed for ${row.domain}: ${err instanceof Error ? err.message : err}`);
    return 0;
  });
  console.log(`Backup check ${row.subject} at ${row.domain}: ${found} programme(s)`);
}
