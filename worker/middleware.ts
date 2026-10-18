import type { Middleware } from "./router.ts";
import { timingSafeEqual } from "./lib/crypto.ts";
import { error, publicOrigin } from "./lib/http.ts";
import { CSRF_HEADER, resolveSession } from "./lib/session.ts";

const UNSAFE = new Set(["POST", "PUT", "PATCH", "DELETE"]);

export const sameOrigin: Middleware = async (c, next) => {
  if (UNSAFE.has(c.req.method)) {
    const origin = c.req.headers.get("Origin");
    if (origin && origin !== c.url.origin && origin !== publicOrigin(c.env, c.url)) {
      return error(403, "Cross-origin request blocked.");
    }
  }
  return next();
};

export const loadSession: Middleware = async (c, next) => {
  const found = await resolveSession(c.env, c.req);
  if (found) {
    c.user = found.user;
    c.session = found.session;
  }
  return next();
};

export const requireCsrf: Middleware = async (c, next) => {
  if (UNSAFE.has(c.req.method) && c.session) {
    const sent = c.req.headers.get(CSRF_HEADER) || "";
    if (!sent || !timingSafeEqual(sent, c.session.csrfToken)) {
      return error(403, "Missing or invalid CSRF token.");
    }
  }
  return next();
};

export const requireAuth: Middleware = async (c, next) => {
  if (!c.user) return error(401, "Authentication required. Please sign in.");
  if (c.user.status === "suspended" || c.user.status === "deactivated") {
    return error(403, "Your account has been suspended or deactivated. Please contact your administrator.");
  }
  return next();
};

export const requireAdmin: Middleware = async (c, next) => {
  if (!c.user) return error(401, "Authentication required. Please sign in.");
  if (c.user.role !== "admin" || c.user.status !== "active") {
    return error(403, "Administrator access required.");
  }
  return next();
};
