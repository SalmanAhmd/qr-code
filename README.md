# LinkCraft — QR Code Generator + URL Shortener

LinkCraft is a full-stack web application that combines two tools in one page:

- **QR Code Generator** — render QR codes locally in the browser, customise them and download them as PNG.
- **URL Shortener** — store long URLs in a database, hand out short links and redirect visitors to the original destination.

Everything works end to end: a short link is a real record in SQLite, opening it performs a real HTTP
redirect, and a QR code can be generated for that short link.

For a full technical and product walkthrough — request flows, state ownership, data model, threat
model and extension guide — see [`docs/DEVELOPER_GUIDE.md`](docs/DEVELOPER_GUIDE.md).

---

## Table of contents

1. [Features](#features)
2. [Tech stack](#tech-stack)
3. [Project structure](#project-structure)
4. [Prerequisites](#prerequisites)
5. [Installation](#installation)
6. [Environment variables](#environment-variables)
7. [Database setup and migrations](#database-setup-and-migrations)
8. [Development](#development)
9. [Production build and deployment](#production-build-and-deployment)
10. [How URL shortening and redirects work](#how-url-shortening-and-redirects-work)
11. [API reference](#api-reference)
12. [Testing](#testing)
13. [Linting, formatting and type checking](#linting-formatting-and-type-checking)
14. [Security notes](#security-notes)
15. [Accessibility and performance](#accessibility-and-performance)
16. [Developer guide](docs/DEVELOPER_GUIDE.md)

---

## Features

### QR Code Generator

- Validates the input as an HTTP/HTTPS URL (a missing protocol is filled in with `https://`).
- Renders the QR code **entirely in the browser** with the [`qrcode`](https://www.npmjs.com/package/qrcode)
  package — no server round trip, the link never leaves the device.
- Customisation: output size (256 / 512 / 1024 px), foreground colour, background colour, error
  correction level (L / M / Q / H) and ready-made colour presets.
- Warns when the chosen colours have a low contrast, because such a code is hard to scan.
- Live preview on a `<canvas>`, high-resolution PNG download, one-click copy of the encoded link.
- Regenerates automatically when the URL changes, and has a clear/reset button.
- Meaningful empty state, loading indicator and inline validation messages.

### URL Shortener

- Sends the long URL to `POST /api/shorten` and only reports success once the **server confirmed it**.
- Returns a real, randomly generated short code (base58, 8 characters, `crypto.randomInt`).
- Displays the short URL with copy and "open in a new tab" buttons.
- Generates a QR code for the short link and keeps both associated in the interface.
- Loading state, friendly error messages (validation, network, rate limit, storage) and protection
  against duplicate submissions.

### History

- **Shortened links** are read back from the server (`GET /api/links`), so they are shared and survive
  restarts. Each entry shows the original URL, the short URL, the click count and actions to copy,
  open, download the QR code or preview it.
- **QR history** is stored in the browser's local storage only, with an explicit opt-in switch and a
  privacy notice. It can be cleared with one click.

---

## Tech stack

| Layer     | Technology                                                                        |
| --------- | --------------------------------------------------------------------------------- |
| Frontend  | React 19, TypeScript, Vite 7, Tailwind CSS 4, lucide-react, `qrcode`               |
| Backend   | Node.js, Express 5, TypeScript, helmet, cors, express-rate-limit                  |
| Database  | SQLite via `better-sqlite3` (WAL mode)                                             |
| Tests     | Vitest, Testing Library (client), Supertest (server)                               |
| Tooling   | ESLint 9 (flat config), Prettier, npm workspaces, concurrently                     |

---

## Project structure

```
.
├── client/                     # React single page app
│   ├── public/favicon.svg
│   ├── src/
│   │   ├── components/         # Header, Hero, QRCodeGenerator, URLShortener,
│   │   │                       # QRCodePreview, QrThumbnail, HistoryList, About, Footer…
│   │   ├── lib/                # qr, url-validation, api, clipboard, storage, link-store
│   │   ├── pages/              # Home, NotFound
│   │   ├── test/setup.ts
│   │   ├── App.tsx
│   │   ├── index.css           # Tailwind entry point + design tokens
│   │   └── main.tsx
│   ├── vite.config.ts          # dev server + /api proxy
│   └── vitest.config.ts
├── server/                     # Express API + redirect server
│   ├── src/
│   │   ├── db/                 # database.ts (connection + migrations), migrate-cli.ts
│   │   ├── middleware/         # rate-limit.ts, error-handler.ts
│   │   ├── routes/             # shorten.ts, links.ts, redirect.ts
│   │   ├── services/           # url-service.ts, code-generator.ts
│   │   ├── app.ts              # express app factory
│   │   ├── config.ts           # environment configuration
│   │   └── index.ts            # server entry point
│   └── tests/                  # supertest + unit tests
├── .env.example
├── eslint.config.js
└── package.json                # npm workspaces + shared scripts
```

---

## Prerequisites

- **Node.js 20.19+ or 22+** (the project is developed on Node 22)
- **npm 10+** (ships with Node 20/22)
- No database server is required — SQLite is a local file.

Check your installation:

```bash
node -v
npm -v
```

---

## Installation

```bash
git clone <your-repository-url> linkcraft
cd linkcraft
npm install          # installs the root, client and server workspaces at once
cp .env.example .env # then edit BASE_URL and the other values
```

`better-sqlite3` ships with prebuilt binaries for common platforms. If no prebuild matches your
system, npm compiles it from source (requires Python and a C++ toolchain).

---

## Environment variables

Configuration is read from `.env` in the repository root **and** in `server/`. Values already present
in the environment always win; a `server/.env` overrides the root file.

| Variable                        | Default                  | Description                                                            |
| ------------------------------- | ------------------------ | ---------------------------------------------------------------------- |
| `NODE_ENV`                      | `development`            | `development` \| `production` \| `test`                                 |
| `PORT`                          | `4000`                   | Port the Express server listens on                                     |
| `BASE_URL`                      | `http://localhost:4000`  | **Public** base URL used to build short links — set your real domain    |
| `DATABASE_PATH`                 | `data/linkcraft.db`      | SQLite file location, relative to `server/`                            |
| `CORS_ORIGIN`                   | `*` (dev)                | Comma separated list of allowed browser origins                        |
| `TRUST_PROXY`                   | `false`                  | Proxy hops to trust (`1`, `true`, or an Express trust-proxy value)     |
| `SERVE_CLIENT`                  | `true` in production     | Serve the built SPA from the Express server                            |
| `CLIENT_DIST_PATH`              | `client/dist`            | Where the built client lives, relative to the repository root          |
| `RATE_LIMIT_WINDOW_MS`          | `900000`                 | Global rate limit window (15 min)                                      |
| `RATE_LIMIT_MAX`                | `300`                    | Global requests per window and IP                                      |
| `SHORTEN_RATE_LIMIT_WINDOW_MS`  | `3600000`                | Shortening rate limit window (1 h)                                      |
| `SHORTEN_RATE_LIMIT_MAX`        | `30`                     | Shortening requests per window and IP                                  |
| `BLOCK_PRIVATE_DESTINATIONS`    | `true` in production     | Reject links to private/loopback addresses                             |
| `VITE_API_BASE_URL`             | *(empty)*                | Client only: API base URL. Empty = same origin as the page             |
| `VITE_DEV_API_TARGET`           | `http://localhost:4000`  | Client only: backend the Vite dev server proxies `/api` to             |

> No secret is ever shipped to the browser. The client bundle only contains public configuration
> (variables prefixed with `VITE_`).

---

## Database setup and migrations

The database is a single SQLite file. Migrations run automatically on server start, so a fresh
checkout works without any manual step.

Manual commands:

```bash
npm run db:migrate        # apply pending migrations
npm run db:reset          # drop everything and re-apply the migrations
```

The schema:

```sql
CREATE TABLE short_links (
  code            TEXT PRIMARY KEY,   -- random short code
  original_url    TEXT NOT NULL,      -- destination
  created_at      TEXT NOT NULL,
  clicks          INTEGER NOT NULL DEFAULT 0,
  last_clicked_at TEXT
);
CREATE INDEX idx_short_links_created_at ON short_links (created_at DESC);
```

Applied migrations are tracked in `schema_migrations`. To add one, append an entry to
`server/src/db/database.ts`:

```ts
{
  id: 3,
  name: 'add_referrers',
  up: `ALTER TABLE short_links ADD COLUMN referrer TEXT;`,
}
```

---

## Development

Run both workspaces with one command:

```bash
npm run dev
```

- Client: <http://localhost:5173> (Vite dev server, proxies `/api` to the backend)
- Server: <http://localhost:4000> (Express API and redirects)

Or run them separately:

```bash
npm run dev:server   # tsx watch src/index.ts
npm run dev:client   # vite
```

The Vite dev server proxies `/api` and `/healthz` to `http://localhost:4000`, so the browser only
ever talks to one origin and no CORS configuration is needed during development.

---

## Production build and deployment

```bash
npm run build        # builds the client (client/dist) and the server (server/dist)
npm start            # runs the compiled server
```

In production the Express server serves the compiled single page app **and** handles the short link
redirects from the same origin, which is the simplest deployment:

```bash
NODE_ENV=production \
BASE_URL=https://links.your-domain.com \
DATABASE_PATH=data/linkcraft.db \
PORT=3000 \
npm start
```

Behind a reverse proxy (nginx, Caddy, Fly.io, Railway, Render, …):

1. Set `BASE_URL` to your **public** domain, e.g. `https://links.your-domain.com`. Never hardcode
   it in the source — it is read from the environment.
2. Set `TRUST_PROXY=1` so rate limiting sees the real client IP.
3. Set `CORS_ORIGIN=https://your-domain.com` if the API is served from a different origin than the
   page.
4. Forward `X-Forwarded-Proto` / `X-Forwarded-For` and terminate TLS at the proxy.
5. Persist the SQLite file (a mounted volume) so short links survive redeploys.

Example nginx snippet:

```nginx
server {
  listen 443 ssl http2;
  server_name links.your-domain.com;

  location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_set_header Host              $host;
    proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}
```

If you host the frontend separately (e.g. Vercel, Netlify), build the client with
`VITE_API_BASE_URL=https://api.your-domain.com` and point `BASE_URL` at the same public API domain.

---

## How URL shortening and redirects work

1. The client validates the URL and sends `POST /api/shorten` with `{ "url": "…" }`.
2. The server validates it again:
   - the value must be a string, at most 2048 characters;
   - it must parse as an absolute URL with the `http:` or `https:` protocol;
   - the host must exist, must not be a private/loopback address (in production) and must not point
     back at the LinkCraft service itself.
3. The server looks for an existing mapping of the exact same URL. If one exists it is reused
   (`reused: true`, HTTP 200) instead of creating a duplicate. Otherwise a random code is generated
   with `crypto.randomInt` from a base58 alphabet (8 characters ≈ 1.3 × 10¹⁴ possibilities) and
   inserted into SQLite. Unique-constraint collisions are retried automatically.
4. The response contains `originalUrl`, `shortUrl`, `code`, `createdAt`, `clicks` and `reused`.
5. Opening `GET /:code` looks the code up in the database and answers with a `302 Found` redirect to
   the original URL (incrementing the click counter). Unknown codes return a styled `404` page.

Because the mapping lives in the database (not in the browser), a short link keeps working after a
server restart and works for everyone who opens it.

---

## API reference

### `POST /api/shorten`

```jsonc
// request
{ "url": "https://example.com/some/long/path" }

// 201 Created (or 200 when an existing code is reused)
{
  "originalUrl": "https://example.com/some/long/path",
  "shortUrl": "https://your-domain.com/abc123",
  "code": "abc123",
  "createdAt": "2026-01-01T00:00:00.000Z",
  "clicks": 0,
  "reused": false
}
```

Errors use a consistent envelope:

```json
{ "error": { "code": "INVALID_URL", "message": "A \"url\" field is required." } }
```

| Status | `error.code`                                                  |
| ------ | ------------------------------------------------------------- |
| 400    | `INVALID_URL`, `INVALID_BODY`, `UNSUPPORTED_PROTOCOL`, `URL_TOO_LONG`, `BLOCKED_DESTINATION` |
| 429    | `RATE_LIMITED`                                                 |
| 503    | `STORAGE_ERROR`                                                |
| 500    | `INTERNAL_ERROR`                                               |

### `GET /api/links?limit=25`

Returns `{ "links": [{ code, originalUrl, shortUrl, createdAt, clicks, lastClickedAt }] }`, newest
first.

### `GET /api/links/:code`

Returns a single link or `404 NOT_FOUND`.

### `GET /:code`

`302` redirect to the stored destination, or a `404` page for unknown codes.

### `GET /healthz`

`{ "status": "ok", "uptime": 42 }`

---

## Testing

```bash
npm test                # server tests, then client tests
npm run test --workspace server
npm run test --workspace client
```

Server tests (Vitest + Supertest) cover shortening, validation, unique code generation, collision
handling, redirects, click counting, unknown codes and rate limiting. Client tests (Vitest +
Testing Library) cover URL validation, QR generation, the generator and shortener components, error
handling and the local history storage.

---

## Linting, formatting and type checking

```bash
npm run lint            # ESLint (flat config, TypeScript + React rules)
npm run typecheck       # tsc --noEmit for the client and the server
npm run format          # Prettier
npm run format:check    # verify formatting without writing
```

---

## Security notes

- **Validation on both ends** — the browser validates for fast feedback, the server validates
  authoritatively.
- **Only `http` and `https` destinations** are accepted, and the redirect handler re-checks the
  stored protocol before redirecting.
- **No open redirect to internal networks** — loopback, link-local (including the cloud metadata
  address), RFC1918 and `.local`/`.internal` hosts are blocked in production, and links that point
  back at the shortener itself are rejected.
- **Rate limiting** — a global limit for every request plus a stricter limit for `POST /api/shorten`,
  both per IP, answering with `429`.
- **Security headers** — helmet sets CSP, `X-Content-Type-Options`, `X-Frame-Options`,
  `Referrer-Policy` and more.
- **Secrets stay on the server** — configuration comes from environment variables and only
  `VITE_`-prefixed values reach the browser bundle.
- **Bounded input** — JSON bodies are limited to 16 kB and URLs to 2048 characters.
- **No client-side storage as a source of truth** — short links live in SQLite; local storage only
  holds an optional, clearly disclosed QR history.

---

## Accessibility and performance

- Semantic landmarks (`header`, `main`, `section`, `footer`), a skip link and labelled form controls.
- Every icon-only button has an `aria-label`; loading and error messages are announced via
  `aria-live` / `role="alert"`.
- Visible focus rings, keyboard operable menus, and contrast-checked colour presets.
- The QR code is drawn on a canvas only when the input changes, and the preview is memoised so
  re-renders stay cheap.
- An empty state explains what to do before anything is generated.

---

## License

MIT — use it, fork it, ship it.
