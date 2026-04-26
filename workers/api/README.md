# `@matters-studio/api`

Hono on Cloudflare Workers. Backend for Matters Studio.

## Routes

| Method | Path                | Purpose                                 |
| ------ | ------------------- | --------------------------------------- |
| GET    | `/healthz`          | CF probe / smoke test                   |
| POST   | `/render-image`     | Proxy to `services/render` (PNG bytes)  |
| POST   | `/ai/suggest-title` | Anthropic Claude → 3 alternative titles |

## Local dev

```bash
pnpm dev          # wrangler dev → http://localhost:8787
pnpm typecheck
```

To exercise `/ai/suggest-title` locally, create
`workers/api/.dev.vars` (gitignored) with:

```
ANTHROPIC_API_KEY=sk-ant-...
```

Wrangler injects `.dev.vars` as secrets in `wrangler dev` mode.

## Deploy

```bash
# Set the Anthropic key as a secret (will not appear in wrangler.toml)
wrangler secret put ANTHROPIC_API_KEY

# Edit wrangler.toml [vars] for production:
#   RENDER_SERVICE_URL = "https://render.matters.town"
#   ALLOWED_ORIGINS    = "https://studio.matters.town"

wrangler deploy
```

## Env / secrets

| Name                 | Type   | Required | Notes                                                                                   |
| -------------------- | ------ | -------- | --------------------------------------------------------------------------------------- |
| `ANTHROPIC_API_KEY`  | secret | yes      | Set via `wrangler secret put ANTHROPIC_API_KEY`.                                        |
| `RENDER_SERVICE_URL` | var    | yes      | Base URL of `services/render`. Without it `/render-image` 503s.                         |
| `ALLOWED_ORIGINS`    | var    | yes      | Comma-separated CORS origins. e.g. `http://localhost:5173,https://studio.matters.town`. |
| `ANTHROPIC_MODEL`    | var    | no       | Defaults to `claude-sonnet-4-5-20250929`.                                               |

## Notes

- Auth lives at the DNS layer (Cloudflare Access). The Worker itself
  trusts every caller and assumes Access already authenticated them.
- `/render-image` is a thin pass-through; size limits and rate limits
  are intentionally deferred to Phase 10. If you expose this beyond
  the Studio domain, add abuse mitigation first.
