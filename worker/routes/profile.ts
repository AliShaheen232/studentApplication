import type { Router } from "../router.ts";
import type { Env } from "../types.ts";
import { sqlTimestamp } from "../lib/clock.ts";
import { error, json, readJson } from "../lib/http.ts";
import { PROFILE_COLUMNS, validateProfile } from "../lib/profile.ts";
import { requireAuth } from "../middleware.ts";

async function loadProfile(env: Env, userId: string) {
  const row = await env.adminpath_prod_d1
    .prepare("SELECT * FROM students WHERE user_id = ?")
    .bind(userId)
    .first<Record<string, unknown>>();
  if (!row) return null;
  delete row.activation_token;
  return { ...row, onboarding_complete: !!row.onboarding_completed_at };
}

export function registerProfileRoutes(router: Router): void {
  router.get("/api/profile", requireAuth, async (c) => {
    const profile = await loadProfile(c.env, c.user!.id);
    return json(profile ?? {});
  });

  router.put("/api/profile", requireAuth, async (c) => {
    if (c.user!.role !== "student") return error(403, "Only student accounts have a profile.");
    const body = await readJson(c.req);
    if (!body) return error(400, "Send the profile as JSON.");

    const { values, errors } = validateProfile(body);
    if (Object.keys(errors).length) {
      return error(400, "Please fix the highlighted fields.", { fields: errors });
    }

    const now = sqlTimestamp();
    const cols = [...PROFILE_COLUMNS];
    const setList = cols.map((col) => `${col} = excluded.${col}`).join(", ");
    await c.env.adminpath_prod_d1
      .prepare(
        `INSERT INTO students (user_id, ${cols.join(", ")}, updated_at, onboarding_completed_at)
         VALUES (?, ${cols.map(() => "?").join(", ")}, ?, ?)
         ON CONFLICT(user_id) DO UPDATE SET ${setList}, updated_at = excluded.updated_at,
           onboarding_completed_at = COALESCE(students.onboarding_completed_at, excluded.onboarding_completed_at)`,
      )
      .bind(c.user!.id, ...cols.map((col) => values[col]), now, now)
      .run();

    return json({ success: true, profile: await loadProfile(c.env, c.user!.id) });
  });
}
