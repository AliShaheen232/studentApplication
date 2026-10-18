import type { AuthUser, Env, SessionInfo } from "./types.ts";
import { error } from "./lib/http.ts";

export interface Ctx {
  req: Request;
  env: Env;
  url: URL;
  params: Record<string, string>;
  user?: AuthUser;
  session?: SessionInfo;
}

export type Handler = (c: Ctx) => Response | Promise<Response>;
export type Middleware = (c: Ctx, next: () => Promise<Response>) => Promise<Response>;

interface Route {
  method: string;
  pattern: RegExp;
  keys: string[];
  chain: Middleware[];
  handler: Handler;
}

function compile(path: string): { pattern: RegExp; keys: string[] } {
  const keys: string[] = [];
  const source = path
    .split("/")
    .map((seg) => {
      if (seg.startsWith(":")) {
        keys.push(seg.slice(1));
        return "([^/]+)";
      }
      return seg.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    })
    .join("/");
  return { pattern: new RegExp(`^${source}/?$`), keys };
}

export class Router {
  private routes: Route[] = [];
  private global: Middleware[] = [];

  use(mw: Middleware): this {
    this.global.push(mw);
    return this;
  }

  on(method: string, path: string, ...rest: [...Middleware[], Handler]): this {
    const handler = rest.pop() as Handler;
    const { pattern, keys } = compile(path);
    this.routes.push({ method, pattern, keys, chain: rest as Middleware[], handler });
    return this;
  }

  get(path: string, ...rest: [...Middleware[], Handler]): this {
    return this.on("GET", path, ...rest);
  }
  post(path: string, ...rest: [...Middleware[], Handler]): this {
    return this.on("POST", path, ...rest);
  }
  put(path: string, ...rest: [...Middleware[], Handler]): this {
    return this.on("PUT", path, ...rest);
  }
  patch(path: string, ...rest: [...Middleware[], Handler]): this {
    return this.on("PATCH", path, ...rest);
  }
  delete(path: string, ...rest: [...Middleware[], Handler]): this {
    return this.on("DELETE", path, ...rest);
  }

  match(method: string, pathname: string): { route: Route; params: Record<string, string> } | "method" | null {
    let pathMatched = false;
    for (const route of this.routes) {
      const m = route.pattern.exec(pathname);
      if (!m) continue;
      pathMatched = true;
      if (route.method !== method && !(method === "HEAD" && route.method === "GET")) continue;
      const params: Record<string, string> = {};
      route.keys.forEach((k, i) => {
        params[k] = decodeURIComponent(m[i + 1]);
      });
      return { route, params };
    }
    return pathMatched ? "method" : null;
  }

  async handle(req: Request, env: Env): Promise<Response | null> {
    const url = new URL(req.url);
    const found = this.match(req.method, url.pathname);
    if (found === null) return null;
    if (found === "method") return error(405, "Method not allowed.");
    const ctx: Ctx = { req, env, url, params: found.params };
    const chain = [...this.global, ...found.route.chain];
    const run = async (i: number): Promise<Response> => {
      if (i < chain.length) return chain[i](ctx, () => run(i + 1));
      return found.route.handler(ctx);
    };
    return run(0);
  }
}
