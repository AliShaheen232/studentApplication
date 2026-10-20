import type { Router } from "../router.ts";
import { analyzePage } from "../../crawler/extract.ts";
import { anyFieldMatcher } from "../../crawler/fields.ts";
import { registrableDomain } from "../../crawler/wikidata.ts";
import { sqlTimestamp } from "../lib/clock.ts";
import { randomHex } from "../lib/crypto.ts";
import { GmailNotReady, sendAsStudent } from "../lib/gmailAccount.ts";
import { error, json, readJson } from "../lib/http.ts";
import { fetchLivePage, LIVE_FRESH_DAYS, sha1Hex } from "../lib/live.ts";
import { isValidEmail, textToHtml } from "../lib/mime.ts";
import { requireAuth } from "../middleware.ts";
import type { Env } from "../types.ts";

const CONTACT_SUBJECT = "__contact__";
const CONTACT_PAGES = 6;
const DAILY_SEND_LIMIT = 20;
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const CONTACT_PATHS = ["/", "/contact", "/admissions", "/international", "/apply", "/en/contact", "/study/admission"];
const CONTACT_HINT = /contact|admission|apply|international|graduate|enrol|kontakt|zulassung|bewerbung|studienberatung|secretar/i;

interface ProgramRow {
  id: string;
  name: string;
  level: string;
  university_id: string;
  university_name: string;
  website: string;
  domain: string;
}

interface ContactRow {
  id: string;
  name: string | null;
  role: string | null;
  email: string;
  email_type: string | null;
}

async function loadProgram(env: Env, programId: string): Promise<ProgramRow | null> {
  return env.adminpath_prod_d1
    .prepare(
      `SELECT p.id, p.name, p.level, p.university_id, u.name AS university_name, u.website, u.domain
       FROM programs p JOIN universities u ON u.id = p.university_id WHERE p.id = ?`,
    )
    .bind(programId)
    .first<ProgramRow>();
}

async function bestContact(env: Env, universityId: string): Promise<ContactRow | null> {
  return env.adminpath_prod_d1
    .prepare(
      `SELECT id, name, role, email, email_type FROM contacts WHERE university_id = ?
       ORDER BY (email LIKE '%admission%' OR email LIKE '%international%' OR email LIKE '%graduate%' OR email LIKE '%apply%') DESC,
                (email_type = 'role') DESC LIMIT 1`,
    )
    .bind(universityId)
    .first<ContactRow>();
}

function greeting(contact: ContactRow | null): string {
  const name = (contact?.name || "").trim();
  if (contact && contact.email_type === "personal" && /^[\p{L}][\p{L} .'-]{2,60}$/u.test(name)) return `Dear ${name},`;
  return "Dear Admissions Team,";
}

function monthsBetween(start: string, end: string): number {
  const [sy, sm] = start.split("-").map(Number);
  const [ey, em] = end.split("-").map(Number);
  return Math.max(1, (ey - sy) * 12 + (em - sm));
}

function span(months: number): string {
  if (months < 12) return `${months} ${months === 1 ? "month" : "months"}`;
  const years = Math.round((months / 12) * 2) / 2;
  return `${years} ${years === 1 ? "year" : "years"}`;
}

function workParts(student: Record<string, unknown>, now: Date): string {
  const nowMonth = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
  let list: { field: string; start: string; end: string | null }[] = [];
  try {
    const parsed = JSON.parse(String(student.work_history || "[]"));
    if (Array.isArray(parsed)) list = parsed.filter((w) => w && typeof w.field === "string" && typeof w.start === "string");
  } catch {
    list = [];
  }
  const total = Number(student.work_experience_years) || 0;
  if (list.length) {
    const items = list.map((w) => `${span(monthsBetween(w.start, w.end || nowMonth))} in ${w.field}${w.end ? "" : " (current)"}`);
    const head = total > 0 ? `I have ${total} ${total === 1 ? "year" : "years"} of professional experience` : "I have professional experience";
    const joined = items.length > 1 ? `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}` : items[0];
    return `${head}: ${joined}.`;
  }
  const wf = String(student.work_field || "").trim();
  if (total > 0 || wf) return `I also have ${total > 0 ? `${total} ${total === 1 ? "year" : "years"} of ` : ""}work experience${wf ? ` in ${wf}` : ""}.`;
  return "";
}

const LEVEL_ORDER = ["School (Matric)", "School (O-Level)", "College (Intermediate)", "College (A-Level)", "Diploma / Certificate", "ADP", "Bachelor (2 Years)", "BS (Hons.)", "BS (Lateral)", "Post Graduate", "Master", "MS", "MPhil", "PhD"];

function earlierEducation(student: Record<string, unknown>, first: boolean): string {
  let rows: Record<string, unknown>[] = [];
  try {
    const parsed = JSON.parse(String(student.education_history || "[]"));
    if (Array.isArray(parsed)) rows = parsed.filter((r) => r && typeof r.level === "string");
  } catch {
    rows = [];
  }
  rows.sort((x, y) => LEVEL_ORDER.indexOf(String(y.level)) - LEVEL_ORDER.indexOf(String(x.level)));
  const items = rows.map((r) => {
    const subject = String(r.subject || "").trim();
    const school = String(r.institution || "").trim();
    return `my ${r.level}${subject ? ` in ${subject}` : ""}${school ? ` at ${school}` : ""}${r.year ? ` in ${r.year}` : ""}`;
  });
  if (!items.length) return "";
  const joined = items.length > 1 ? `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}` : items[0];
  return `${first ? "I completed" : "Before that, I completed"} ${joined}.`;
}

function academic(student: Record<string, unknown>, now = new Date()): string {
  const level = String(student.current_degree_level || "").trim();
  const field = String(student.field_of_study || "").trim();
  const school = String(student.current_institution || "").trim();
  const year = Number(student.graduation_year) || 0;
  const month = Number(student.graduation_month) || 0;
  const parts: string[] = [];
  if (level && field) {
    const when = year ? `${month >= 1 && month <= 12 ? `${MONTHS[month - 1]} ` : ""}${year}` : "";
    const future = year > now.getUTCFullYear() || (year === now.getUTCFullYear() && month > now.getUTCMonth() + 1);
    const grade = student.gpa && student.max_gpa ? ` with a grade of ${student.gpa}/${student.max_gpa}` : "";
    const verb = future ? "I am completing" : "I completed";
    parts.push(`${verb} my ${level} in ${field}${school ? ` at ${school}` : ""}${when ? `${future ? ", expected in" : " in"} ${when}` : ""}${grade}.`);
  }
  const before = earlierEducation(student, parts.length === 0);
  if (before) parts.push(before);
  return parts.join(" ");
}

function draft(template: string, hook: string, who: string, student: Record<string, unknown>, program: ProgramRow, email: string) {
  const name = String(student.full_name || email.split("@")[0]);
  const intake = String(student.intake_term || "the next intake");
  const tests: Record<string, string> = { ielts: "IELTS", toefl: "TOEFL", pte: "PTE", duolingo: "Duolingo" };
  const test = String(student.english_test || "");
  const score = student[`${test}_score`];
  const eligibility = template === "eligibility_check";
  const nationality = eligibility && student.nationality ? `, and I hold ${student.nationality} nationality` : "";
  const testLine = eligibility && tests[test] && score ? ` My ${tests[test]} score is ${score}.` : "";
  const intro = `My name is ${name}${nationality}.${testLine} I am planning to apply for the ${program.name} at ${program.university_name} for ${intake}.`;
  const ask: Record<string, string> = {
    academic_inquiry: "Could you please confirm the admission requirements, the deadline, and whether international applicants can apply for this intake?",
    eligibility_check: "Based on my background above, am I eligible for admission to this programme? Please tell me whether my degree and grade meet the entry requirements, and whether I need anything else, such as a language certificate or entrance test.",
    research_fit: "Could you please tell me which research groups or supervisors work in this area, and how I can contact them before applying?",
    assistantship_inquiry: "Could you please tell me whether international students can get funding, scholarships or assistantships for this programme?",
  };
  const paragraphs = [who, intro, academic(student), workParts(student, new Date()), hook, ask[template] || ask.academic_inquiry, "Thank you for your time."].filter(Boolean);
  return {
    subject: `Question about ${program.name} (${intake}) - ${name}`,
    body: `${paragraphs.join("\n\n")}\n\nKind regards,\n${name}\n${email}`,
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function searchContacts(env: Env, universityId: string): Promise<number> {
  const uni = await env.adminpath_prod_d1
    .prepare("SELECT id, website, domain FROM universities WHERE id = ?")
    .bind(universityId)
    .first<{ id: string; website: string; domain: string }>();
  if (!uni) return 0;
  const site = registrableDomain(uni.domain);
  const base = new URL(uni.website.startsWith("http") ? uni.website : `https://${uni.domain}/`);
  const queue: { url: string; score: number }[] = CONTACT_PATHS.map((p, i) => ({ url: new URL(p, base).toString(), score: 100 - i }));
  const seen = new Set<string>();
  const stamp = sqlTimestamp();
  let pages = 0;
  let found = 0;
  while (queue.length && pages < CONTACT_PAGES) {
    queue.sort((a, b) => b.score - a.score);
    const next = queue.shift()!;
    if (seen.has(next.url)) continue;
    seen.add(next.url);
    let target: URL;
    try {
      target = new URL(next.url);
    } catch {
      continue;
    }
    if (registrableDomain(target.hostname) !== site) continue;
    let page = await fetchLivePage(target, (host) => registrableDomain(host) === site);
    if (page.kind === "wait") {
      await sleep(Math.min(page.ms, 2500));
      page = await fetchLivePage(target, (host) => registrableDomain(host) === site);
    }
    if (page.kind !== "page") continue;
    pages += 1;
    const analysis = analyzePage(page.html, page.url, anyFieldMatcher, site);
    for (const ct of analysis.contacts.slice(0, 3)) {
      await env.adminpath_prod_d1
        .prepare(
          `INSERT INTO contacts (id, university_id, department, name, role, email, email_type, phone, source_url, fetched_at)
           VALUES (?, ?, NULL, ?, ?, ?, ?, NULL, ?, ?) ON CONFLICT(university_id, email) DO NOTHING`,
        )
        .bind(`cnt_${await sha1Hex(`${uni.id}|${ct.email}`)}`, uni.id, ct.name, ct.role, ct.email, ct.type, ct.sourceUrl, stamp)
        .run();
      found += 1;
    }
    if (found > 0) break;
    for (const l of analysis.links) if (CONTACT_HINT.test(l.url)) queue.push({ url: l.url, score: l.score + 50 });
  }
  await env.adminpath_prod_d1
    .prepare(
      `INSERT INTO live_crawls (university_id, subject, status, finished_at, pages, programs_found) VALUES (?, ?, 'done', ?, ?, ?)
       ON CONFLICT(university_id, subject) DO UPDATE SET status = 'done', finished_at = excluded.finished_at, pages = excluded.pages, programs_found = excluded.programs_found`,
    )
    .bind(uni.id, CONTACT_SUBJECT, stamp, pages, found)
    .run();
  return found;
}

export function registerComposeRoutes(router: Router): void {
  router.post("/api/compose/generate", requireAuth, async (c) => {
    const body = await readJson<{ program_id?: unknown; template_key?: unknown; custom_hook?: unknown }>(c.req);
    const programId = typeof body?.program_id === "string" ? body.program_id : "";
    const program = programId ? await loadProgram(c.env, programId) : null;
    if (!program) return error(404, "Programme not found.");
    const student = (await c.env.adminpath_prod_d1.prepare("SELECT * FROM students WHERE user_id = ?").bind(c.user!.id).first<Record<string, unknown>>()) || {};
    const contact = await bestContact(c.env, program.university_id);
    const hook = typeof body?.custom_hook === "string" ? body.custom_hook.trim().slice(0, 400) : "";
    const template = typeof body?.template_key === "string" ? body.template_key : "academic_inquiry";
    const mail = draft(template, hook, greeting(contact), student, program, c.user!.email);
    const checked = await c.env.adminpath_prod_d1
      .prepare("SELECT finished_at FROM live_crawls WHERE university_id = ? AND subject = ?")
      .bind(program.university_id, CONTACT_SUBJECT)
      .first<{ finished_at: string | null }>();
    const fresh = !!checked?.finished_at && Date.parse(checked.finished_at.replace(" ", "T") + "Z") > Date.now() - LIVE_FRESH_DAYS * 86400_000;
    return json({
      subject: mail.subject,
      body_text: mail.body,
      recipient_email: contact?.email || "",
      contact_id: contact?.id || null,
      university_id: program.university_id,
      can_search: !contact && !fresh,
    });
  });

  router.post("/api/compose/find-contact", requireAuth, async (c) => {
    const body = await readJson<{ university_id?: unknown }>(c.req);
    const universityId = typeof body?.university_id === "string" ? body.university_id.slice(0, 80) : "";
    if (!universityId) return error(400, "Missing university.");
    const existing = await bestContact(c.env, universityId);
    if (!existing) {
      const checked = await c.env.adminpath_prod_d1
        .prepare("SELECT finished_at FROM live_crawls WHERE university_id = ? AND subject = ?")
        .bind(universityId, CONTACT_SUBJECT)
        .first<{ finished_at: string | null }>();
      const fresh = !!checked?.finished_at && Date.parse(checked.finished_at.replace(" ", "T") + "Z") > Date.now() - LIVE_FRESH_DAYS * 86400_000;
      if (!fresh) await searchContacts(c.env, universityId);
    }
    const contact = existing || (await bestContact(c.env, universityId));
    return json({ recipient_email: contact?.email || "", contact_id: contact?.id || null, greeting: greeting(contact) });
  });

  router.post("/api/compose/send", requireAuth, async (c) => {
    const body = await readJson<{ program_id?: unknown; recipient_email?: unknown; subject?: unknown; body_text?: unknown }>(c.req);
    const to = typeof body?.recipient_email === "string" ? body.recipient_email.trim().toLowerCase() : "";
    const subject = typeof body?.subject === "string" ? body.subject.trim().slice(0, 300) : "";
    const text = typeof body?.body_text === "string" ? body.body_text.trim().slice(0, 20000) : "";
    if (!isValidEmail(to)) return error(400, "Enter a valid recipient email.");
    if (!subject || !text) return error(400, "Subject and message are required.");
    const db = c.env.adminpath_prod_d1;
    const today = sqlTimestamp().slice(0, 10);
    const sent = await db.prepare("SELECT COUNT(*) AS n FROM sent_log WHERE user_id = ? AND sent_at >= ?").bind(c.user!.id, today).first<{ n: number }>();
    const used = Number(sent?.n ?? 0);
    if (used >= DAILY_SEND_LIMIT) return error(429, `Daily limit of ${DAILY_SEND_LIMIT} emails reached. It resets at 00:00 UTC.`);
    const program = typeof body?.program_id === "string" ? await loadProgram(c.env, body.program_id) : null;
    try {
      const res = await sendAsStudent(c.env, c.user!.id, { to, subject, text, html: textToHtml(text) });
      await db
        .prepare("INSERT INTO sent_log (id, user_id, recipient_email, university_id, subject, message_id, thread_id) VALUES (?, ?, ?, ?, ?, ?, ?)")
        .bind(`sent_${randomHex(8)}`, c.user!.id, to, program?.university_id ?? null, subject, res.id, res.threadId)
        .run();
      return json({ success: true, message_id: res.id, remaining_daily_quota: DAILY_SEND_LIMIT - used - 1 });
    } catch (err) {
      if (err instanceof GmailNotReady) return error(400, err.message, { code: err.reason });
      console.error("Compose send failed", err instanceof Error ? err.message : err);
      return error(502, "Gmail could not send this email. Try again in a moment.");
    }
  });
}
