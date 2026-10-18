import { USER_AGENT } from "../../crawler/fetcher.ts";
import { isAllowed, parseRobots, type RobotsRules } from "../../crawler/robots.ts";

export const LIVE_MAX_PAGES = 8;
export const LIVE_FRESH_DAYS = 100;
export const LIVE_CLAIM_MINUTES = 15;
export const LIVE_PER_USER_DAY = 60;
export const LIVE_GLOBAL_DAY = 400;
export const LIVE_PAGE_BYTES = 200_000;
export const LIVE_HOST_GAP_MS = 1500;
export const LIVE_PAGE_SIZE = 15;

export async function sha1Hex(s: string, len = 16): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-1", new TextEncoder().encode(s));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("").slice(0, len);
}

interface EdgeCache {
  match(req: Request): Promise<Response | undefined>;
  put(req: Request, res: Response): Promise<void>;
}

function edge(): EdgeCache | null {
  return (globalThis as { caches?: { default?: EdgeCache } }).caches?.default ?? null;
}

async function robotsFor(origin: string): Promise<RobotsRules> {
  const cache = edge();
  const key = new Request(`https://live-robots.admitpath/${encodeURIComponent(origin)}`);
  const hit = cache ? await cache.match(key) : undefined;
  if (hit) return (await hit.json()) as RobotsRules;
  let rules: RobotsRules = { allow: [], disallow: [] };
  try {
    const res = await fetch(`${origin}/robots.txt`, { headers: { "User-Agent": USER_AGENT }, redirect: "follow", signal: AbortSignal.timeout(8000) });
    if (res.ok) rules = parseRobots(await res.text(), "AdmitPathBot");
    else if (res.status >= 500) rules = { allow: [], disallow: ["/"] };
  } catch {
    rules = { allow: [], disallow: [] };
  }
  if (cache) await cache.put(key, new Response(JSON.stringify(rules), { headers: { "Cache-Control": "public, max-age=86400" } }));
  return rules;
}

async function hostWait(host: string, gapMs: number): Promise<number> {
  const cache = edge();
  if (!cache) return 0;
  const key = new Request(`https://live-throttle.admitpath/${encodeURIComponent(host)}`);
  const hit = await cache.match(key);
  const last = hit ? Number(await hit.text()) : 0;
  const now = Date.now();
  if (last && now - last < gapMs) return gapMs - (now - last);
  await cache.put(key, new Response(String(now), { headers: { "Cache-Control": "public, max-age=60" } }));
  return 0;
}

async function readCapped(res: Response, maxBytes: number): Promise<string> {
  if (!res.body) return "";
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let out = "";
  let bytes = 0;
  while (bytes < maxBytes) {
    const { done, value } = await reader.read();
    if (done) break;
    bytes += value.byteLength;
    out += decoder.decode(value, { stream: true });
  }
  await reader.cancel().catch(() => {});
  return out.slice(0, maxBytes);
}

export type PageFetch = { kind: "page"; url: string; html: string } | { kind: "wait"; ms: number } | { kind: "skip"; reason: string };

export async function fetchLivePage(target: URL, sameSite: (host: string) => boolean): Promise<PageFetch> {
  const rules = await robotsFor(target.origin);
  if (!isAllowed(rules, target.pathname + target.search)) return { kind: "skip", reason: "robots.txt" };
  const gap = Math.max(LIVE_HOST_GAP_MS, Math.min((rules.crawlDelaySec ?? 0) * 1000, 10_000));
  const wait = await hostWait(target.host, gap);
  if (wait > 0) return { kind: "wait", ms: wait };
  let res: Response;
  try {
    res = await fetch(target.toString(), {
      headers: { "User-Agent": USER_AGENT, Accept: "text/html,application/xhtml+xml", "Accept-Language": "en,*;q=0.5" },
      redirect: "follow",
      signal: AbortSignal.timeout(12_000),
    });
  } catch {
    return { kind: "skip", reason: "unreachable" };
  }
  if (res.status === 429 || res.status === 503) return { kind: "wait", ms: 10_000 };
  if (!res.ok) return { kind: "skip", reason: `HTTP ${res.status}` };
  const type = res.headers.get("Content-Type") || "";
  if (type && !type.includes("html")) return { kind: "skip", reason: "not html" };
  const finalUrl = res.url || target.toString();
  try {
    if (!sameSite(new URL(finalUrl).hostname)) return { kind: "skip", reason: "redirected off site" };
  } catch {
    return { kind: "skip", reason: "bad redirect" };
  }
  return { kind: "page", url: finalUrl, html: await readCapped(res, LIVE_PAGE_BYTES) };
}
