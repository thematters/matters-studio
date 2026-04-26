/**
 * Matters Studio API — Cloudflare Worker.
 *
 * Routes:
 *   GET  /healthz             → "ok" (CF probe)
 *   POST /render-image        → proxy to services/render
 *   POST /ai/suggest-title    → call Anthropic Claude
 *
 * Auth: none at app level — Cloudflare Access is configured at the DNS layer
 * to gate the Studio domain to Matters team identities.
 */
import { Hono } from "hono";
import { cors } from "hono/cors";

import type { Env } from "./env";
import { parseAllowedOrigins } from "./env";
import { renderImageHandler } from "./render-image";
import { suggestTitleHandler } from "./ai-suggest";

const app = new Hono<{ Bindings: Env }>();

// CORS — origins from env. Empty list = block all (defensive default).
app.use("*", async (c, next) => {
  const origins = parseAllowedOrigins(c.env);
  const middleware = cors({
    origin: (origin) => (origins.includes(origin) ? origin : null),
    allowMethods: ["GET", "POST", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
    maxAge: 86400,
    credentials: false,
  });
  return middleware(c, next);
});

app.get("/healthz", (c) => c.text("ok"));

app.post("/render-image", renderImageHandler);
app.post("/ai/suggest-title", suggestTitleHandler);

app.notFound((c) => c.json({ error: "not_found" }, 404));

app.onError((err, c) => {
  console.error("worker error:", err);
  return c.json({ error: "internal_error", message: err.message }, 500);
});

export default app;
