# Cloudflare Worker migration

## Why
`server.ts` is an Express server (`app.listen`, `node:sqlite`, `fs`, `child_process`, Vite middleware). None of that runs on Cloudflare Workers, so the backend is being moved to `worker/`, one area at a time. `server.ts` stays as the local dev server until every route is ported.

## Approach
- No runtime dependencies. `worker/router.ts` is a small router on the standard `fetch` API. Hono was the plan, but the npm registry was not reachable from the build machine, so nothing could be installed or tested. The router keeps the same shape (`get/post/... (path, ...middleware, handler)`), so swapping to Hono later is mechanical.
- D1 for data (`adminpath_prod_d1`), R2 for documents (`adminpath_student_documents`), static frontend from `dist/` via the `ASSETS` binding.
- Tests run on plain Node 22 (`node --test`) with a D1 stand-in built on `node:sqlite` that applies every file in `migrations/`. No network, no Wrangler needed.

## Stages
| Stage | Scope | Status |
|---|---|---|
| 1 | Worker skeleton, D1 types, router, `/api/health`, auth (login, me, logout), sessions, CSRF, lockout | Done |
| 2 | Frontend switches to cookie auth; remove `x-impersonate-role` and `localStorage` tokens; real admin login | Done |
| 3 | Public and catalog reads: universities, programs, contacts, discovery (`docs/catalog.md`); plans still pending | Done |
| 3b | Live crawler on GitHub Actions with 30-day search cache (`docs/crawler.md`) | Done |
| 4 | Profile, documents on R2, shortlists, matcher | Pending |
| 5a | Gmail OAuth connect, disconnect, test email (`docs/gmail-oauth.md`) | Done |
| 2b | Google sign-up/sign-in, onboarding, `/api/profile` (`docs/auth.md`, `docs/profile.md`) | Done |
| 5 | Compose, drafts, queue with caps and windows, sent, compliance | Pending |
| 6 | Admin routes, checkout, payment webhook | Pending |
| 7 | Remove Express from `server.ts`, make `wrangler dev` the dev server | Pending |

Until stage 7, a Worker deploy only serves the routes listed as done. Pages that call unported routes (universities, programs, profile, documents, drafts, queue, admin) show empty data. The Express dev server (`npm run dev`) no longer works with the frontend, because the frontend now uses cookie login.

## Files (stage 1)
- `worker/index.ts`: entry point, route registration, ASSETS fallback, error handler.
- `worker/router.ts`: router and middleware chain.
- `worker/middleware.ts`: `sameOrigin`, `loadSession`, `requireCsrf`, `requireAuth`, `requireAdmin`.
- `worker/routes/auth.ts`: `/api/auth/login`, `/api/auth/me`, `/api/auth/logout`.
- `worker/lib/`: `crypto.ts` (PBKDF2, hashing, password rules), `session.ts`, `throttle.ts`, `http.ts`, `clock.ts`.
- `worker/types.ts`: minimal D1, R2 and Env types (no `@cloudflare/workers-types` needed).
- `migrations/0003_auth_hardening.sql`.
- `tests/worker/`: `helpers.ts` (D1 stand-in, test client), `auth.test.ts`.
- `scripts/create-user.ts`: creates an admin or student in D1.
- `tsconfig.worker.json`: strict type-check for `worker/`.

## How to run
- Tests: `npm run test:worker`
- Type-check: `npm run typecheck:worker`
- Local Worker: `npm run db:migrate:local`, then `npm run worker:dev`
- Deploy: `npm run db:migrate:remote`, then `npm run worker:deploy`

## Unverified
- `wrangler dev` and `wrangler deploy` were not run (Wrangler could not be installed on the build machine).
- Behaviour on the real D1 service (tests use `node:sqlite`, which is the same SQLite engine D1 is built on).
