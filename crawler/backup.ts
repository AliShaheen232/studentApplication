import { createHash } from "node:crypto";
import { sqlTimestamp } from "../worker/lib/clock.ts";
import { programId } from "./bulk.ts";
import type { Db, Statement } from "./d1.ts";
import type { PoliteFetcher } from "./fetcher.ts";
import { classifySubjects, fieldMatcher } from "./fields.ts";
import { crawlUniversity } from "./job.ts";
import { addToSearch, UNRANKED } from "./searchIndex.ts";

export interface BackupRow {
  university_id: string;
  subject: string;
  name: string;
  website: string;
  domain: string;
  country_code: string;
}

export async function claimBackups(db: Db, limit: number, now: number): Promise<BackupRow[]> {
  await db.query("UPDATE live_crawls SET status = 'backup' WHERE status = 'backup_running' AND started_at < ?", [sqlTimestamp(now - 2 * 3600_000)]);
  const { results } = await db.query<BackupRow>(
    `SELECT lc.university_id, lc.subject, u.name, u.website, u.domain, u.country_code
     FROM live_crawls lc JOIN universities u ON u.id = lc.university_id
     WHERE lc.status = 'backup' ORDER BY lc.finished_at LIMIT ?`,
    [limit],
  );
  for (const r of results) {
    await db.query("UPDATE live_crawls SET status = 'backup_running', started_at = ? WHERE university_id = ? AND subject = ?", [
      sqlTimestamp(now),
      r.university_id,
      r.subject,
    ]);
  }
  return results;
}

export async function runBackup(db: Db, fetcher: PoliteFetcher, row: BackupRow, now: number, maxPages = 12): Promise<number> {
  const stamp = sqlTimestamp(now);
  const inst = { qid: "", name: row.name, website: row.website, domain: row.domain, city: "", students: null };
  const result = await crawlUniversity(fetcher, inst, fieldMatcher(row.subject), maxPages).catch(() => ({ programs: [], contacts: [], pages: 0 }));
  const statements: Statement[] = [];
  const levels = new Set<string>();
  for (const p of result.programs) {
    const id = programId(row.domain, p.level, p.name);
    const subjects = [...new Set([row.subject, ...classifySubjects(p.name)])];
    levels.add(p.level);
    statements.push({
      sql: `INSERT INTO programs (id, university_id, name, level, original_degree, department, language, duration_months, tuition, deadline,
              requirements, program_url, admissions_url, subject_category, application_mode, source_url, source_type, last_verified, removed_at)
            VALUES (?, ?, ?, ?, ?, NULL, ?, NULL, NULL, NULL, NULL, ?, NULL, ?, 'portal_and_email', ?, 'official_website', ?, NULL)
            ON CONFLICT(id) DO UPDATE SET removed_at = NULL, last_verified = excluded.last_verified WHERE programs.removed_at IS NOT NULL`,
      params: [id, row.university_id, p.name, p.level, p.degree, p.language, p.url, subjects.join(", "), p.url, stamp],
    });
    statements.push(...addToSearch({ id, universityId: row.university_id, countryCode: row.country_code, level: p.level }, subjects));
  }
  if (levels.size) {
    statements.push({
      sql: `INSERT INTO university_subjects (country_code, subject, university_id, rank_sort, levels)
            SELECT ?, ?, id, COALESCE(ranking, ${UNRANKED}), ? FROM universities WHERE id = ?
            ON CONFLICT(country_code, subject, university_id) DO UPDATE SET levels = excluded.levels`,
      params: [row.country_code, row.subject, [...levels].sort().join(","), row.university_id],
    });
  }
  for (const c of result.contacts.slice(0, 3)) {
    statements.push({
      sql: `INSERT INTO contacts (id, university_id, department, name, role, email, email_type, phone, source_url, fetched_at)
            VALUES (?, ?, NULL, ?, ?, ?, ?, NULL, ?, ?) ON CONFLICT(university_id, email) DO NOTHING`,
      params: [`cnt_${createHash("sha1").update(`${row.university_id}|${c.email}`).digest("hex").slice(0, 16)}`, row.university_id, c.name, c.role, c.email, c.type, c.sourceUrl, stamp],
    });
  }
  statements.push({
    sql: `UPDATE live_crawls SET status = ?, finished_at = ?, pages = ?, programs_found = ?, last_error = ? WHERE university_id = ? AND subject = ?`,
    params: [
      result.pages > 0 ? "done" : "failed",
      stamp,
      result.pages,
      result.programs.length,
      result.pages > 0 ? null : "Website could not be fetched by the background crawler",
      row.university_id,
      row.subject,
    ],
  });
  await db.batch(statements);
  return result.programs.length;
}
