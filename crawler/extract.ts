import type { FieldMatcher } from "./fields.ts";
import { registrableDomain } from "./wikidata.ts";

export type Level = "Bachelor" | "Master" | "PhD" | "MBA";

export interface ProgramCandidate {
  name: string;
  level: Level;
  degree: string;
  url: string;
  language: string | null;
}

export interface ContactCandidate {
  email: string;
  name: string;
  role: string;
  type: "role" | "personal";
  sourceUrl: string;
}

const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", ndash: "–", mdash: "—", auml: "ä", ouml: "ö", uuml: "ü", Auml: "Ä", Ouml: "Ö", Uuml: "Ü", szlig: "ß", eacute: "é", egrave: "è", aacute: "á", iacute: "í", oacute: "ó", uacute: "ú", ntilde: "ñ", ccedil: "ç", shy: "", zwnj: "", zwj: "", hellip: "…", lsquo: "‘", rsquo: "’", ldquo: "“", rdquo: "”", copy: "©", reg: "®", agrave: "à", acirc: "â", ecirc: "ê", euml: "ë", icirc: "î", ocirc: "ô", ucirc: "û", ugrave: "ù", oslash: "ø", aring: "å", aelig: "æ", Eacute: "É", ccaron: "č", scaron: "š" };

export function decodeEntities(s: string): string {
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e: string) => {
    if (e[0] === "#") {
      const code = e[1] === "x" || e[1] === "X" ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      return Number.isFinite(code) && code > 0 && code < 0x110000 ? String.fromCodePoint(code) : m;
    }
    return ENTITIES[e] ?? m;
  });
}

export function cleanText(html: string): string {
  return decodeEntities(html.replace(/<[^>]*>/g, " ")).replace(/[\u00ad\u200b-\u200d]/g, "").replace(/\s+/g, " ").trim();
}

export function stripNoise(html: string): string {
  return html
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<(script|style|noscript|svg|template)\b[\s\S]*?<\/\1>/gi, " ");
}

export interface Anchor {
  href: string;
  text: string;
  host?: string;
  path?: string;
}

export function anchors(html: string, baseUrl: string): Anchor[] {
  const out: Anchor[] = [];
  let base: URL;
  try {
    base = new URL(baseUrl);
  } catch {
    return out;
  }
  const re = /<a\b([^>]*)>([\s\S]*?)<\/a>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    const href = /\bhref\s*=\s*("([^"]*)"|'([^']*)'|([^\s>]+))/i.exec(m[1]);
    const raw = href ? (href[2] ?? href[3] ?? href[4] ?? "") : "";
    if (!raw || /^(javascript:|tel:|#)/i.test(raw)) continue;
    const inner = m[2].includes("<") || m[2].includes("&") ? cleanText(m[2]) : m[2].replace(/\s+/g, " ").trim();
    const title = inner ? "" : /\btitle\s*=\s*"([^"]*)"/i.exec(m[1])?.[1] ?? "";
    const text = inner || cleanText(title);
    if (raw[0] === "/" && raw[1] !== "/" && /^[\w\-./~%]*$/.test(raw)) {
      out.push({ href: base.origin + raw, text, host: base.hostname, path: raw });
      continue;
    }
    let abs: URL;
    try {
      abs = new URL(raw.includes("&") ? decodeEntities(raw) : raw, base);
    } catch {
      continue;
    }
    if (abs.protocol !== "https:" && abs.protocol !== "http:") continue;
    out.push({ href: abs.toString(), text, host: abs.hostname, path: abs.pathname });
  }
  return out;
}

function blocks(html: string): string[] {
  const out: string[] = [];
  const re = /<(h[1-4]|li|dt|td|option|strong)\b[^>]*>([\s\S]*?)<\/\1>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    const t = cleanText(m[2]);
    if (t) out.push(t);
  }
  return out;
}

const DEGREE_PATTERNS: [Level, RegExp, string][] = [
  ["MBA", /(^|[^\p{L}])(e?mba)([^\p{L}]|$)/iu, "MBA"],
  ["PhD", /(^|[^\p{L}])(ph\.?\s?d\.?|d\.?\s?phil\.?|doctorate|doctoral|doctor of|doktorand|promotion|dr\.\s?rer\.|doctorado|dottorato|doctorat)([^\p{L}]|$)/iu, "PhD"],
  ["Master", /(^|[^\p{L}])(m\.?\s?sc\.?|msc|m\.?\s?eng\.?|meng|mres|m\.?\s?phil\.?|mphil|ll\.?\s?m\.?|m\.?\s?ed\.?|master'?s?|masters|máster|maestría|maestria|mastère|laurea magistrale)([^\p{L}]|$)/iu, "Master"],
  ["Bachelor", /(^|[^\p{L}])(b\.?\s?sc\.?|bsc|b\.?\s?eng\.?|beng|ll\.?\s?b\.?|bachelor'?s?|bachelors|licence|licenciatura|grado en|laurea triennale|undergraduate degree)([^\p{L}]|$)/iu, "Bachelor"],
];

const CASED_PATTERNS: [Level, RegExp, string][] = [
  ["Master", /(^|[^\p{L}])(M\.\s?A\.|MA|M\.\s?S\.|MS)([^\p{L}]|$)/u, "M.A."],
  ["Bachelor", /(^|[^\p{L}])(B\.\s?A\.|BA|B\.\s?S\.|BS)([^\p{L}]|$)/u, "B.A."],
];

const INTL_PATTERNS: [Level, RegExp, string][] = [
  ["PhD", /(博士|박사)|(^|[^\p{L}])(аспирантур|doktora)/iu, "PhD"],
  ["Master", /(硕士|碩士|修士|석사)|(^|[^\p{L}])(магистр|yüksek lisans)/iu, "Master"],
  ["Bachelor", /(学士|學士|本科|학사)|(^|[^\p{L}])(бакалавр|lisans([^\p{L}]|$))/iu, "Bachelor"],
];

export function detectLevel(text: string): { level: Level; degree: string } | null {
  for (const [level, re] of DEGREE_PATTERNS) {
    const m = re.exec(text);
    if (m) return { level, degree: normalizeDegree(m[2], level) };
  }
  for (const [level, re] of CASED_PATTERNS) {
    const m = re.exec(text);
    if (m) return { level, degree: normalizeDegree(m[2], level) };
  }
  for (const [level, re, degree] of INTL_PATTERNS) {
    if (re.test(text)) return { level, degree };
  }
  return null;
}

const GENERIC_WORDS = /(^|[^\p{L}])(master'?s?|masters|bachelor'?s?|bachelors|ph\.?\s?d\.?|doctoral|doctorate|doctor|programmes?|programs?|degrees?|study|studies|courses?|of|science|sciences|arts|in|and|the|our|all|overview|international|graduate|undergraduate|postgraduate|m\.?\s?sc\.?|b\.?\s?sc\.?|m\.?\s?a\.?|b\.?\s?a\.?|m\.?\s?eng\.?|b\.?\s?eng\.?|studiengänge|studiengang|studium|research|taught|full-time|part-time|online)(?=[^\p{L}]|$)/giu;

export function isGenericTitle(text: string): boolean {
  const rest = text.replace(GENERIC_WORDS, " ").replace(/[^\p{L}]+/gu, "");
  return rest.length < 3;
}

function normalizeDegree(raw: string, level: Level): string {
  const r = raw.toLowerCase().replace(/[\s.]/g, "");
  const map: Record<string, string> = {
    msc: "M.Sc.", meng: "M.Eng.", mres: "MRes", mphil: "MPhil", llm: "LL.M.", med: "M.Ed.", ma: "M.A.", ms: "M.S.",
    bsc: "B.Sc.", beng: "B.Eng.", llb: "LL.B.", ba: "B.A.", bs: "B.S.", phd: "Ph.D.", dphil: "DPhil", mba: "MBA", emba: "Executive MBA",
  };
  return map[r] ?? (level === "PhD" ? "Ph.D." : level === "MBA" ? "MBA" : level);
}

const EXCLUDE = /(^|[^\p{L}])(news|event|events|apply now|application deadline|deadlines?|scholarships?|faq|contact|login|log in|alumni|newsletter|open day|info ?day|infotag|webinar|workshop|summer school|winter school|module|modul|lecture|vorlesung|seminar|cookie|privacy|datenschutz|impressum|imprint|sitemap|jobs?|career|karriere|podcast|blog|press|presse|tuition fees?|fees and funding|how to apply|requirements|bewerbung|zulassung|research group|chair of|lehrstuhl)([^\p{L}]|$)/iu;

function plausibleTitle(t: string): boolean {
  if (t.length < 6 || t.length > 140) return false;
  const words = t.split(/\s+/).length;
  if (words > 16) return false;
  if (/[?!]$/.test(t) || /https?:\/\//.test(t) || /@/.test(t)) return false;
  if (/^\d/.test(t)) return false;
  return !EXCLUDE.test(t);
}

function tidyName(t: string): string {
  return t
    .replace(/\s*[|·•»›]\s*.*$/, "")
    .replace(/\s+[-–—]\s+(home|overview|startseite)$/i, "")
    .replace(/\s+/g, " ")
    .trim();
}

function pageLevel(url: string, html: string): Level | null {
  const title = cleanText(/<title[^>]*>([\s\S]*?)<\/title>/i.exec(html)?.[1] ?? "");
  const h1 = cleanText(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i.exec(html)?.[1] ?? "");
  const hint = `${decodeURIComponent(new URL(url).pathname)} ${title} ${h1}`.toLowerCase();
  if (/\b(master|masters|postgraduate|graduate-programs|msc)\b/.test(hint)) return "Master";
  if (/\b(bachelor|bachelors|undergraduate|bsc)\b/.test(hint)) return "Bachelor";
  if (/\b(phd|doctoral|doctorate|promotion)\b/.test(hint)) return "PhD";
  return null;
}

const LANGUAGE_PHRASE = /\s*[-–,(]?\s*(taught in english|english[- ]taught|englischsprachig|taught in german|deutschsprachig)\s*\)?/gi;

function languageHint(text: string): string | null {
  if (/(taught in english|english[- ]taught|englischsprachig|\(english\)|in english|language: english)/i.test(text)) return "English";
  if (/(\(german\)|deutschsprachig|unterrichtssprache: deutsch|taught in german)/i.test(text)) return "German";
  return null;
}

export function extractPrograms(
  html: string,
  pageUrl: string,
  matcher: FieldMatcher,
  siteDomain: string,
  pre?: { clean: string; anchors: Anchor[] },
): ProgramCandidate[] {
  const clean = pre?.clean ?? stripNoise(html);
  const found = new Map<string, ProgramCandidate>();
  const ctxLevel = pageLevel(pageUrl, clean);

  const add = (rawText: string, url: string, allowContext: boolean) => {
    if (rawText.length < 6 || rawText.length > 220 || !matcher.matches(rawText)) return;
    const language = languageHint(rawText);
    const text = tidyName(rawText.replace(LANGUAGE_PHRASE, " "));
    if (!plausibleTitle(text) || !matcher.matches(text) || isGenericTitle(text)) return;
    let lvl = detectLevel(text);
    if (!lvl && allowContext && ctxLevel && text.split(/\s+/).length <= 8) lvl = { level: ctxLevel, degree: ctxLevel };
    if (!lvl) return;
    const key = `${lvl.level}|${text.toLowerCase()}`;
    if (!found.has(key)) found.set(key, { name: text, level: lvl.level, degree: lvl.degree, url, language });
  };

  for (const a of pre?.anchors ?? anchors(clean, pageUrl)) {
    let host = a.host ?? "";
    if (!host) {
      try {
        host = new URL(a.href).hostname;
      } catch {
        continue;
      }
    }
    add(a.text, registrableDomain(host) === siteDomain ? a.href : pageUrl, true);
  }
  for (const b of blocks(clean)) add(b, pageUrl, false);
  return [...found.values()];
}

const STUDY_WORDS_INTL = /(专业|招生|研究生|本科|学院|программ|поступ|абитуриент|образовател|入試|大学院|研究科|学部|입학|학과|대학원|bölüm|lisansüstü|aday)/iu;
const STUDY_WORDS = /(stud(y|ies|ium|ieren|iengang|iengaenge|iengänge|ienangebot|ieninteressierte)|program(me)?s?|courses?|course-finder|degrees?|masters?|bachelors?|undergraduate|postgraduate|graduate|prospective|admissions?|formations?|etudes|études|estudios|grados|titulaciones|opleidingen|studeren|utbildning|koulutus|corsi|offerta-formativa|international)/i;
const SKIP_LINK = /(login|logout|news|event|calendar|press|presse|jobs|karriere|career|alumni|shop|donate|spenden|\.pdf$|\.docx?$|\.jpe?g$|\.png$|\.zip$|mailto:|\/search\b|\?q=|facebook|twitter|instagram|linkedin|youtube|tiktok)/i;

export function scoreLink(a: Anchor, siteDomain: string, matcher: FieldMatcher): number {
  let host = a.host;
  let path = a.path;
  if (host === undefined || path === undefined) {
    let url: URL;
    try {
      url = new URL(a.href);
    } catch {
      return 0;
    }
    if (url.protocol !== "https:" && url.protocol !== "http:") return 0;
    host = url.hostname;
    path = url.pathname;
  }
  if (registrableDomain(host) !== siteDomain) return 0;
  try {
    path = decodeURIComponent(path);
  } catch {}
  const hay = `${path} ${a.text}`;
  if (SKIP_LINK.test(hay) || SKIP_LINK.test(a.href)) return 0;
  let score = 0;
  if (STUDY_WORDS.test(hay) || STUDY_WORDS_INTL.test(hay)) score += 2;
  if (matcher.matches(hay)) score += 3;
  if (a.text.length < 140 && detectLevel(a.text)) score += 1;
  if (/\/(en|en-gb|en-us|english)(\/|$)/i.test(path)) score += 1;
  return score;
}

const ROLE_WORDS: [RegExp, string][] = [
  [/(admission|admissions|apply|application|bewerbung|zulassung)/, "Admissions Office"],
  [/(international|intl|incoming|welcome|io$|^io\b|^aaa$|akademisches-auslandsamt|auslandsamt)/, "International Office"],
  [/(study|studies|studium|studien|student|zsb|studienberatung|advis|beratung)/, "Student Advisory Service"],
  [/(grad|master|postgrad|pg|doctoral|phd)/, "Graduate Admissions"],
  [/(info|enquir|inquir|contact|kontakt|office|service)/, "General Enquiries"],
];
const SKIP_EMAIL = /(noreply|no-reply|donotreply|webmaster|datenschutz|privacy|dpo|gdpr|presse|press|media|marketing|abuse|postmaster|hostmaster|security|it-support|helpdesk|servicedesk|hr|personal|jobs|bewerbungen-personal|example)/i;

export function extractEmails(html: string, pageUrl: string, siteDomain: string): ContactCandidate[] {
  const found = new Map<string, ContactCandidate>();
  if (!/@|&#0*64;|&#x0*40;|&commat;|[[(]\s*[aä]t\s*[\])]/i.test(html)) return [];
  const text = html
    .replace(/&#0*64;|&#x0*40;|&commat;/gi, "@")
    .replace(/\s*\[(at|ät)\]\s*/gi, "@")
    .replace(/\s*\((at|ät)\)\s*/gi, "@");
  for (let at = text.indexOf("@"); at !== -1; at = text.indexOf("@", at + 1)) {
    const left = /[a-z0-9][a-z0-9._%+-]{0,63}$/i.exec(text.slice(Math.max(0, at - 64), at));
    const right = /^([a-z0-9-]+\.)+[a-z]{2,}/i.exec(text.slice(at + 1, at + 256));
    if (!left || !right) continue;
    const email = `${left[0]}@${right[0]}`.toLowerCase().replace(/\.+$/, "");
    const [local, host] = email.split("@");
    if (!host || /\.(png|jpe?g|gif|svg|webp)$/.test(host)) continue;
    if (registrableDomain(host) !== siteDomain) continue;
    if (SKIP_EMAIL.test(local)) continue;
    const role = ROLE_WORDS.find(([r]) => r.test(local));
    const personal = !role && /^[a-z]+[._-][a-z]+$/.test(local);
    if (!role && !personal) continue;
    found.set(email, {
      email,
      name: role ? role[1] : local.split(/[._-]/).map((p) => p[0].toUpperCase() + p.slice(1)).join(" "),
      role: role ? role[1] : "Staff",
      type: role ? "role" : "personal",
      sourceUrl: pageUrl,
    });
  }
  return [...found.values()];
}

export interface PageAnalysis {
  programs: ProgramCandidate[];
  contacts: ContactCandidate[];
  links: { url: string; score: number }[];
}

export function analyzePage(html: string, pageUrl: string, matcher: FieldMatcher, siteDomain: string): PageAnalysis {
  const clean = stripNoise(html);
  const list = anchors(clean, pageUrl);
  const programs = extractPrograms(html, pageUrl, matcher, siteDomain, { clean, anchors: list });
  const contacts = extractEmails(clean, pageUrl, siteDomain);
  const seen = new Set<string>();
  const links: { url: string; score: number }[] = [];
  for (const a of list) {
    const url = a.href.split("#")[0];
    if (seen.has(url)) continue;
    seen.add(url);
    const score = scoreLink(a, siteDomain, matcher);
    if (score > 0) links.push({ url, score });
  }
  return { programs, contacts, links };
}
