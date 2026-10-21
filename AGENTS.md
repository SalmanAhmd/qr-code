# AGENTS.md

npm-workspaces monorepo: `client/` (React 19, Vite 7, Tailwind 4) and `server/` (Express 5, better-sqlite3).
Production is one service: the server serves `client/dist` and handles `/:code` redirects.

## Commands (from repo root)

- `npm run dev` — client on :5173 (proxies `/api`, `/healthz` to :4000) + API on :4000
- `npm run lint` · `npm run typecheck` · `npm test` · `npm run build`
- One server file: `npm run test --workspace server -- tests/shorten.test.ts`
- One client file: `npm run test --workspace client -- src/lib/qr.test.ts`
- `npm run db:migrate` · `npm run db:reset`
- `client` build = `tsc --noEmit && vite build`; `server` build = `tsc` → `server/dist`, run with `npm start`.

## Deploy / runtime gotchas

- **Node 22+ is required** (`better-sqlite3@13` engines), even though root `engines` says >=20.19. On Render set `NODE_VERSION=22`.
- `NODE_ENV=production` makes npm omit devDependencies → `tsc` fails with TS2688 (`node`, `vite/client`, `vitest/globals`). Host build command must be `npm ci --include=dev && npm run build`.
- `BASE_URL` is stored into every generated `shortUrl`; if it is wrong, every short link is broken. Trailing slashes are normalized.
- `npm start` serves the SPA only when `SERVE_CLIENT=true` (default only under `NODE_ENV=production`).
- Env loading: `server/src/config.ts` reads `server/.env` then root `.env` (already-set vars win); `DATABASE_PATH` resolves relative to `server/`, not cwd. Migrations run on boot.
- Migrations are append-only entries in `server/src/db/database.ts`; applied IDs live in `schema_migrations`.

## Server

- Route order in `server/src/app.ts` is load-bearing: API → `/api` JSON 404 → static → `/:code` → error handler. Never add a catch-all SPA fallback; it would shadow short codes.
- Express 5 types `req.params.code` as `string | string[] | undefined`; normalize before use (see `routes/redirect.ts`).
- Keep `import Database from 'better-sqlite3'` as a value import; `import type` type-checks but crashes at runtime.
- Server is ESM + NodeNext: relative imports in TS need `.js` extensions.
- Codes: base58, 8 chars, reserved words skipped, collisions retried; the same destination URL reuses its code (`reused: true`, HTTP 200).
- `POST /api/shorten` is limited to 30 req/hour/IP by default; manual E2E loops can hit 429.
- Route tests: `createTestApp()` in `server/tests/helpers.ts` gives in-memory SQLite and relaxed rate limits; don't boot the real server.

## Client

- ESLint runs React Compiler rules (`eslint-plugin-react-hooks` v7): `set-state-in-effect` is an **error**. Do not call setState in an effect body — derive state or use an external store (`src/lib/link-store.ts` + `useSyncExternalStore`).
- Tailwind 4: `@apply` accepts utilities only, not custom classes. Shared button styles are grouped selectors in `src/index.css`.
- `verbatimModuleSyntax` is on: type-only imports must use `import type`.
- jsdom has no canvas. Component tests mock `../lib/qr` (`renderQrToCanvas`, `downloadQrPng`); real QR/PNG generation is covered in `src/lib/qr.test.ts`.
- History is split: short links come from `/api/links` (server, shared); QR history is opt-in localStorage (`src/lib/storage.ts`). Call `resetLinkStore()` in HistoryList tests.
- Routing is minimal: `App.tsx` renders Home only for `/` and `/index.html`, everything else is the 404 page. In-page nav uses `scrollToSection`, not a router.

## Repo hygiene

- Prettier is configured but the tree is unformatted (`format:check` currently fails); `npm run format` rewrites ~50 files. Run it as its own change, never mixed into a fix.
- No CI, no pre-commit hooks, no other instruction files. `README.md` is the user-facing source for env vars/deploy — update it when config changes.
