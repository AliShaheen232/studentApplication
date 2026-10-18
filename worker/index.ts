import { Router } from "./router.ts";
import type { Env } from "./types.ts";
import { error, json } from "./lib/http.ts";
import { loadSession, requireCsrf, sameOrigin } from "./middleware.ts";
import { registerAuthRoutes } from "./routes/auth.ts";
import { registerGmailRoutes } from "./routes/gmail.ts";
import { registerGoogleLoginRoutes } from "./routes/googleLogin.ts";
import { registerProfileRoutes } from "./routes/profile.ts";
import { registerCatalogRoutes } from "./routes/catalog.ts";
import { registerLiveRoutes } from "./routes/live.ts";

export function buildRouter(): Router {
  const router = new Router();
  router.use(sameOrigin);
  router.use(loadSession);
  router.use(requireCsrf);

  router.get("/api/health", () =>
    json({
      status: "ok",
      app: "AdminPath SaaS",
      runtime: "Cloudflare Workers + D1",
      rbac_active: true,
    }),
  );

  registerAuthRoutes(router);
  registerGoogleLoginRoutes(router);
  registerGmailRoutes(router);
  registerProfileRoutes(router);
  registerCatalogRoutes(router);
  registerLiveRoutes(router);
  return router;
}

const router = buildRouter();

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url);
    try {
      const res = await router.handle(req, env);
      if (res) return res;
    } catch (err) {
      console.error("Unhandled error", req.method, url.pathname, err instanceof Error ? err.message : err);
      return error(500, "Internal server error.");
    }
    if (url.pathname.startsWith("/api/")) return error(404, "Not found.");
    if (env.ASSETS) return env.ASSETS.fetch(req);
    return error(404, "Not found.");
  },
};
