# Deployment (Cloudflare)

## What changed
All deploy config lives in `wrangler.toml`. There are no named environments and no `.env.production`.

## Files
- `wrangler.toml`: `main = "worker/index.ts"`, routes, `[assets]` (serves `dist/`), D1 binding, R2 binding, `[vars]`.
- `server.ts`: local Express dev server only. `requireSecret()` makes secrets mandatory when `NODE_ENV=production`.

## How it works
- `routes` must stay above the first `[table]` in `wrangler.toml`. Anything placed after `[vars]` becomes a var.
- Wrangler does not pass `vars` or bindings down into `[env.*]` sections, which is why the file stays flat.
- Non-secret config goes in `[vars]`. Secrets never go in `wrangler.toml`.

## How to run
- First time: `npm install` (adds Wrangler), `npx wrangler login`.
- Migrations: `npm run db:migrate:remote`.
- First admin: `npm run create-user -- --email you@example.com --name "Your Name" --role admin`.
- Deploy: `npm run worker:deploy` (builds the frontend, then `wrangler deploy`, no `--env` flag).
- Secrets: `wrangler secret put DATA_ENCRYPTION_KEY`, then the same for `STRIPE_WEBHOOK_SECRET`, `STRIPE_SECRET_KEY`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `APP_SECRET`, `GEMINI_API_KEY`.
- Local dev: `npm run dev` with `.env`, or `.dev.vars` for `wrangler dev`.
- `APP_ORIGIN` (`[vars]`, `https://app.adminpath.com`) is the address used for Google OAuth redirect URIs. `wrangler dev` rewrites request URLs to the first route's host (`http://adminpath.com`), so `.dev.vars` sets `APP_ORIGIN=http://127.0.0.1:8787` locally. Dev is pinned to port 8787 (`[dev]` in `wrangler.toml`).
- `wrangler dev` uses the real Cloudflare D1 and R2 (`remote = true` on both bindings). Local dev writes go to production data. There is no local database.

## Config keys
`[vars]`: HOST, DAILY_CAP_DEFAULT, MIN_SEND_GAP_SEC, MAX_SEND_GAP_SEC, TZ_WINDOW_START_HOUR, TZ_WINDOW_END_HOUR, MAX_BOUNCE_RATE_PERCENT, FOLLOW_UP_MIN_DAYS, STORAGE_PROVIDER, SESSION_TTL_HOURS, LOGIN_MAX_FAILURES, LOGIN_LOCKOUT_MINUTES, LOGIN_IP_MAX_FAILURES.

## Known limits
- The Worker only serves the routes ported so far (see `docs/worker-migration.md`). Everything else returns 404 until its stage is done, and the current frontend still expects Bearer tokens.

## Unverified
- No deploy was run, and `wrangler deploy --dry-run` has not been run. The TOML was parsed and checked, and the Worker bundles and type-checks.
