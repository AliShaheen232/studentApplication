import { isAllowed, parseRobots, type RobotsRules } from "./robots.ts";

export const USER_AGENT = "AdmitPathBot/1.0 (+https://app.adminpath.com/bot; university program discovery)";

export interface FetchResult {
  url: string;
  status: number;
  html: string;
}

export interface FetcherOptions {
  fetchImpl?: typeof fetch;
  minDelayMs?: number;
  timeoutMs?: number;
  maxBytes?: number;
  sleep?: (ms: number) => Promise<void>;
}

export class PoliteFetcher {
  private fetchImpl: typeof fetch;
  private minDelayMs: number;
  private timeoutMs: number;
  private maxBytes: number;
  private sleep: (ms: number) => Promise<void>;
  private robots = new Map<string, Promise<RobotsRules>>();
  private nextSlot = new Map<string, number>();
  private blocked = new Set<string>();
  pagesFetched = 0;

  constructor(opts: FetcherOptions = {}) {
    this.fetchImpl = opts.fetchImpl ?? fetch;
    this.minDelayMs = opts.minDelayMs ?? 1500;
    this.timeoutMs = opts.timeoutMs ?? 15000;
    this.maxBytes = opts.maxBytes ?? 2_000_000;
    this.sleep = opts.sleep ?? ((ms) => new Promise((r) => setTimeout(r, ms)));
  }

  private async raw(url: string): Promise<Response> {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), this.timeoutMs);
    try {
      return await this.fetchImpl(url, {
        headers: { "User-Agent": USER_AGENT, Accept: "text/html,application/xhtml+xml", "Accept-Language": "en,*;q=0.5" },
        redirect: "follow",
        signal: ctrl.signal,
      });
    } finally {
      clearTimeout(timer);
    }
  }

  private rulesFor(origin: string): Promise<RobotsRules> {
    let p = this.robots.get(origin);
    if (!p) {
      p = (async () => {
        try {
          const res = await this.raw(`${origin}/robots.txt`);
          if (res.status >= 400 && res.status < 500) return { allow: [], disallow: [] };
          if (!res.ok) return { allow: [], disallow: ["/"] };
          return parseRobots(await res.text(), "AdmitPathBot");
        } catch {
          return { allow: [], disallow: [] };
        }
      })();
      this.robots.set(origin, p);
    }
    return p;
  }

  private async wait(host: string, crawlDelaySec?: number) {
    const delay = Math.max(this.minDelayMs, Math.min((crawlDelaySec ?? 0) * 1000, 10_000));
    const now = Date.now();
    const slot = Math.max(now, this.nextSlot.get(host) ?? 0);
    this.nextSlot.set(host, slot + delay);
    if (slot > now) await this.sleep(slot - now);
  }

  async get(url: string): Promise<FetchResult | null> {
    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      return null;
    }
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return null;
    if (this.blocked.has(parsed.host)) return null;

    const rules = await this.rulesFor(parsed.origin);
    if (!isAllowed(rules, parsed.pathname + parsed.search)) return null;

    for (let attempt = 0; attempt < 2; attempt++) {
      await this.wait(parsed.host, rules.crawlDelaySec);
      let res: Response;
      try {
        res = await this.raw(parsed.toString());
      } catch {
        return null;
      }
      if (res.status === 429 || res.status === 503) {
        if (attempt === 0) {
          const retryAfter = Number(res.headers.get("Retry-After"));
          await this.sleep(Math.min(Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : 5000, 30_000));
          continue;
        }
        this.blocked.add(parsed.host);
        return null;
      }
      if (res.status === 403) {
        this.blocked.add(parsed.host);
        return null;
      }
      if (!res.ok) return null;
      const type = res.headers.get("Content-Type") || "";
      if (type && !type.includes("html")) return null;
      const text = await res.text();
      this.pagesFetched++;
      return { url: res.url || parsed.toString(), status: res.status, html: text.slice(0, this.maxBytes) };
    }
    return null;
  }
}
