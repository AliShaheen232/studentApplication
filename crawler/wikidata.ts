import { USER_AGENT } from "./fetcher.ts";

export interface Institution {
  qid: string;
  name: string;
  website: string;
  domain: string;
  city: string;
  students: number | null;
}

export const PAGE_SIZE = 800;

export function institutionQuery(countryCode: string, limit: number, simple = false, offset = 0): string {
  const code = countryCode.toUpperCase().replace(/[^A-Z]/g, "").slice(0, 2);
  const pageSize = Math.max(1, Math.min(limit, PAGE_SIZE));
  const types = simple
    ? "VALUES ?type { wd:Q3918 wd:Q875538 wd:Q902104 wd:Q15936437 } ?uni wdt:P31 ?type;"
    : "?uni wdt:P31/wdt:P279* wd:Q3918;";
  return `SELECT ?uni ?uniLabel ?website ?cityLabel ?students WHERE {
  {
    SELECT ?uni (SAMPLE(?site) AS ?website) (SAMPLE(?place) AS ?city) (MAX(?count) AS ?students) WHERE {
      ?country wdt:P297 "${code}".
      ${types}
           wdt:P17 ?country;
           wdt:P856 ?site.
      FILTER NOT EXISTS { ?uni wdt:P576 ?dissolved. }
      OPTIONAL { ?uni wdt:P131 ?place. }
      OPTIONAL { ?uni wdt:P2196 ?count. }
    }
    GROUP BY ?uni
    ORDER BY DESC(?students) ?uni
    LIMIT ${pageSize}
    OFFSET ${Math.max(0, offset)}
  }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en,de,fr,es,it,nl,[AUTO_LANGUAGE]". }
}`;
}

const SECOND_LEVEL = new Set(["ac", "edu", "co", "com", "org", "gov", "net"]);
const domainCache = new Map<string, string>();

export function registrableDomain(host: string): string {
  const hit = domainCache.get(host);
  if (hit !== undefined) return hit;
  const parts = host.toLowerCase().replace(/^www\d?\./, "").split(".");
  const out = parts.length >= 3 && SECOND_LEVEL.has(parts[parts.length - 2]) && parts[parts.length - 1].length === 2
    ? parts.slice(-3).join(".")
    : parts.slice(-2).join(".");
  if (domainCache.size > 5000) domainCache.clear();
  domainCache.set(host, out);
  return out;
}

export function parseInstitutions(data: unknown, limit: number): Institution[] {
  const bindings = (data as { results?: { bindings?: Record<string, { value: string }>[] } })?.results?.bindings ?? [];
  const byDomain = new Map<string, Institution>();
  for (const b of bindings) {
    const qid = b.uni?.value?.split("/").pop() || "";
    const name = b.uniLabel?.value || "";
    const site = b.website?.value || "";
    if (!qid || !name || /^Q\d+$/.test(name) || !site) continue;
    let url: URL;
    try {
      url = new URL(site);
    } catch {
      continue;
    }
    if (url.protocol !== "http:" && url.protocol !== "https:") continue;
    const domain = registrableDomain(url.hostname);
    const students = b.students?.value ? Number(b.students.value) : null;
    const city = b.cityLabel?.value && !/^Q\d+$/.test(b.cityLabel.value) ? b.cityLabel.value : "";
    const prev = byDomain.get(domain);
    if (!prev || (students ?? 0) > (prev.students ?? 0)) {
      byDomain.set(domain, { qid, name, website: `${url.protocol}//${url.host}/`, domain, city: city || prev?.city || "", students });
    }
  }
  return [...byDomain.values()].sort((a, b) => (b.students ?? 0) - (a.students ?? 0)).slice(0, limit);
}

export async function fetchInstitutions(
  countryCode: string,
  limit: number,
  fetchImpl: typeof fetch = fetch,
  sleep: (ms: number) => Promise<void> = (ms) => new Promise((r) => setTimeout(r, ms)),
): Promise<Institution[]> {
  const all = new Map<string, Institution>();
  for (const simple of [false, true]) {
    let failed = false;
    for (let offset = 0; offset < limit; offset += PAGE_SIZE) {
      const url = `https://query.wikidata.org/sparql?format=json&query=${encodeURIComponent(institutionQuery(countryCode, limit - offset, simple, offset))}`;
      let rows: unknown = null;
      for (let attempt = 0; attempt < 2; attempt++) {
        const res = await fetchImpl(url, { headers: { "User-Agent": USER_AGENT, Accept: "application/sparql-results+json" } });
        if (res.ok) {
          rows = await res.json();
          break;
        }
        if (res.status !== 429 && res.status < 500) throw new Error(`Wikidata returned HTTP ${res.status}`);
        await sleep(5000 * (attempt + 1));
      }
      if (rows === null) {
        failed = true;
        break;
      }
      const bindings = (rows as { results?: { bindings?: unknown[] } })?.results?.bindings ?? [];
      for (const inst of parseInstitutions(rows, PAGE_SIZE)) {
        const prev = all.get(inst.domain);
        if (!prev || (inst.students ?? 0) > (prev.students ?? 0)) all.set(inst.domain, inst);
      }
      if (bindings.length < Math.min(PAGE_SIZE, limit - offset)) return finish(all, limit);
      await sleep(1500);
    }
    if (!failed) return finish(all, limit);
    if (all.size) return finish(all, limit);
  }
  throw new Error("Wikidata is not responding");
}

function finish(all: Map<string, Institution>, limit: number): Institution[] {
  return [...all.values()].sort((a, b) => (b.students ?? 0) - (a.students ?? 0)).slice(0, limit);
}
