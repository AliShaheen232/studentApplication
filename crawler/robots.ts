export interface RobotsRules {
  allow: string[];
  disallow: string[];
  crawlDelaySec?: number;
}

export function parseRobots(text: string, agent: string): RobotsRules {
  const groups: { agents: string[]; rules: RobotsRules }[] = [];
  let current: { agents: string[]; rules: RobotsRules } | null = null;
  let lastWasAgent = false;

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.replace(/#.*$/, "").trim();
    if (!line) continue;
    const idx = line.indexOf(":");
    if (idx < 0) continue;
    const key = line.slice(0, idx).trim().toLowerCase();
    const value = line.slice(idx + 1).trim();
    if (key === "user-agent") {
      if (!current || !lastWasAgent) {
        current = { agents: [], rules: { allow: [], disallow: [] } };
        groups.push(current);
      }
      current.agents.push(value.toLowerCase());
      lastWasAgent = true;
      continue;
    }
    lastWasAgent = false;
    if (!current) continue;
    if (key === "disallow" && value) current.rules.disallow.push(value);
    if (key === "allow" && value) current.rules.allow.push(value);
    if (key === "crawl-delay" && Number.isFinite(Number(value))) current.rules.crawlDelaySec = Number(value);
  }

  const name = agent.toLowerCase();
  const specific = groups.find((g) => g.agents.some((a) => a !== "*" && name.includes(a)));
  const wildcard = groups.find((g) => g.agents.includes("*"));
  return (specific || wildcard)?.rules ?? { allow: [], disallow: [] };
}

function patternToRegex(pattern: string): RegExp {
  const anchored = pattern.endsWith("$");
  const body = (anchored ? pattern.slice(0, -1) : pattern)
    .split("*")
    .map((part) => part.replace(/[.+?^${}()|[\]\\]/g, "\\$&"))
    .join(".*");
  return new RegExp(`^${body}${anchored ? "$" : ""}`);
}

export function isAllowed(rules: RobotsRules, path: string): boolean {
  let best: { len: number; allow: boolean } | null = null;
  for (const [list, allow] of [
    [rules.disallow, false],
    [rules.allow, true],
  ] as const) {
    for (const p of list) {
      if (patternToRegex(p).test(path) && (!best || p.length > best.len || (p.length === best.len && allow))) {
        best = { len: p.length, allow };
      }
    }
  }
  return best ? best.allow : true;
}
