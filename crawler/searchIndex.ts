import { FIELDS_OF_STUDY } from "../core/discoveryData.ts";
import type { Statement } from "./d1.ts";

export const UNRANKED = 100000;
const SUBJECTS = new Set(FIELDS_OF_STUDY.map((f) => f.name));

export function searchableSubjects(list: string | null | undefined): string[] {
  return [...new Set((list ?? "").split(",").map((s) => s.trim()).filter((s) => SUBJECTS.has(s)))];
}

export function addToSearch(p: { id: string; universityId: string; countryCode: string; level: string; tuition?: number | null }, subjects: string[]): Statement[] {
  return subjects.map((subject) => ({
    sql: `INSERT OR IGNORE INTO program_search (country_code, subject, level, rank_sort, program_id, university_id, tuition)
          SELECT ?, ?, ?, COALESCE(ranking, ${UNRANKED}), ?, id, ? FROM universities WHERE id = ?`,
    params: [p.countryCode, subject, p.level, p.id, p.tuition ?? null, p.universityId],
  }));
}

export function removeFromSearch(p: { id: string; countryCode: string; level: string }, subjects: string[]): Statement[] {
  return subjects.map((subject) => ({
    sql: "DELETE FROM program_search WHERE country_code = ? AND subject = ? AND level = ? AND program_id = ?",
    params: [p.countryCode, subject, p.level, p.id],
  }));
}
