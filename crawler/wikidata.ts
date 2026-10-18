import { USER_AGENT } from "./fetcher.ts";

export interface Institution {
  qid: string;
  name: string;
  website: string;
  domain: string;
  city: string;
  students: number | null;
}

export function institutionQuery(countryCode: string, limit: number, simple = false): string {
  const code = countryCode.toUpperCase().replace(/[^A-Z]/g, "").slice(0, 2);
  return `SELECT ?uni ?uniLabel ?website ?cityLabel ?students WHERE {
  ?country wdt:P297 "${code}".
  ${simple ? "VALUES ?type { wd:Q3918 wd:Q875538 wd:Q902104 wd:Q15936437 wd:Q1371037 } ?uni wdt:P31 ?type;" : "?uni wdt:P31/wdt:P279* wd:Q3918;"}
       wdt:P17 ?country;
       wdt:P856 ?website.
  FILTER NOT EXISTS { ?uni wdt:P576 ?dissolved. }
  OPTIONAL { ?uni wdt:P131 ?city. }
  OPTIONAL { ?uni wdt:P2196 ?students. }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en,de,fr,es,it,nl,[AUTO_LANGUAGE]". }
}
ORDER BY DESC(?students)
LIMIT ${Math.max(1, Math.min(limit * 3, 600))}`;
}

export function registrableDomain(host: string): string {
  const parts = host.toLowerCase().replace(/^www\d?\./, "").split(".");
  const secondLevel = new Set(["ac", "edu", "co", "com", "org", "gov", "net"]);
  if (parts.length >= 3 && secondLevel.has(parts[parts.length - 2]) && parts[parts.length - 1].length === 2) {
    return parts.slice(-3).join(".");
  }
  return parts.slice(-2).join(".");
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
  for (const simple of [false, true]) {
    const url = `https://query.wikidata.org/sparql?format=json&query=${encodeURIComponent(institutionQuery(countryCode, limit, simple))}`;
    for (let attempt = 0; attempt < 2; attempt++) {
      const res = await fetchImpl(url, { headers: { "User-Agent": USER_AGENT, Accept: "application/sparql-results+json" } });
      if (res.ok) return parseInstitutions(await res.json(), limit);
      if (res.status !== 429 && res.status < 500) throw new Error(`Wikidata returned HTTP ${res.status}`);
      await sleep(5000 * (attempt + 1));
    }
  }
  throw new Error("Wikidata is not responding");
}
