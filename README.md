# Matters Studio

Internal tooling app for the Matters team. Phase 9 of the
[Matters Design System](https://github.com/thematters/design-system) ecosystem.

**Phase 9.1 MVP** ships a single user-facing wizard: an OG Image generator
that replaces the `pnpm template:render og-image …` CLI with a web form.
PM fills 7 fields → live iframe preview → "Download PNG". Includes an
"✨ AI suggest title" button that calls Anthropic Claude through a Worker.

Production target: <https://studio.matters.town> (gated by Cloudflare Access).

## Stack

| Layer        | Pick                                                                            |
| ------------ | ------------------------------------------------------------------------------- |
| Frontend     | Vite + React 19 + TypeScript                                                    |
| Routing      | TanStack Router (file-based)                                                    |
| Server state | TanStack Query                                                                  |
| Styling      | CSS Modules + tokens.css (vendored from DS)                                     |
| Components   | Vendored from `@matters/design-system-react` (Button, TextField, Dialog, Toast) |
| Backend      | Hono on Cloudflare Workers                                                      |
| AI proxy     | Anthropic Claude via Workers `fetch`                                            |
| Render proxy | Calls existing `services/render` (Phase 6)                                      |
| Auth         | Cloudflare Access (DNS-level)                                                   |
| Deploy       | Cloudflare Pages + Workers                                                      |

## Repo layout

```
matters-studio/
├── apps/
│   └── web/         # Vite + React frontend (Cloudflare Pages)
└── workers/
    └── api/         # Hono on Cloudflare Workers
```

## Quick start

Requires Node 20+ and pnpm 9+.

```bash
pnpm install

# Start the frontend (http://localhost:5173)
pnpm dev

# In another terminal: start the Worker (http://localhost:8787)
pnpm dev:api
```

The frontend talks to the Worker at `VITE_API_BASE_URL`
(defaults to `http://localhost:8787`).

## Validation

```bash
pnpm typecheck
pnpm lint
pnpm format:check
pnpm --filter @matters-studio/web build
```

## Deploy

This bootstrap PR does **not** deploy. After merge:

### Frontend → Cloudflare Pages

```bash
cd apps/web
pnpm build
wrangler pages deploy dist --project-name matters-studio
```

Or connect the repo in the Cloudflare dashboard: build command
`pnpm --filter @matters-studio/web build`, output `apps/web/dist`.

Set the production env var:

- `VITE_API_BASE_URL=https://api.studio.matters.town`

### Worker → Cloudflare Workers

```bash
cd workers/api
wrangler secret put ANTHROPIC_API_KEY
# Edit wrangler.toml: set RENDER_SERVICE_URL and ALLOWED_ORIGINS for production
wrangler deploy
```

### Cloudflare Access

In the Cloudflare dashboard, add an Access policy on
`studio.matters.town` (and optionally `api.studio.matters.town`) that
gates entry to the Matters Google Workspace identity provider. No code
change required.

## Vendoring

The frontend vendors a few things from
[`thematters/design-system`](https://github.com/thematters/design-system)
rather than depending on its npm packages (which are not yet published
publicly). See [`apps/web/README.md`](apps/web/README.md#vendoring) for
how to refresh them when DS bumps versions.

## Phase 9.2+ roadmap

- Social card / newsletter wizards
- Slides editor (Markdown → MD-style deck)
- Activity / landing page builder
- Draft saving via Cloudflare KV
- Asset upload via R2
