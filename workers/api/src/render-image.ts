/**
 * POST /render-image
 *
 * Proxies a render request to the existing `services/render` host
 * (Playwright + Hono). The render service exposes:
 *
 *     POST {RENDER_SERVICE_URL}/render/:template
 *         body: { ...templateData, scale?: 1 | 2 }
 *         → image/png bytes
 *
 * The Worker is just a thin pass-through that adds CORS and CF Access auth.
 */
import type { Context } from "hono";
import type { Env } from "./env";

interface RenderRequestBody {
  template?: string;
  data?: Record<string, unknown>;
  scale?: number;
}

const ALLOWED_TEMPLATES = new Set(["og-image"]);

export async function renderImageHandler(c: Context<{ Bindings: Env }>) {
  let body: RenderRequestBody;
  try {
    body = (await c.req.json()) as RenderRequestBody;
  } catch {
    return c.json({ error: "invalid_json" }, 400);
  }

  const template = body.template;
  if (!template || !ALLOWED_TEMPLATES.has(template)) {
    return c.json({ error: "unknown_template", template }, 400);
  }

  const renderBase = c.env.RENDER_SERVICE_URL?.trim();
  if (!renderBase) {
    return c.json(
      {
        error: "render_service_not_configured",
        message:
          "Set RENDER_SERVICE_URL in wrangler.toml or the dashboard. The frontend can fall back to client-side rendering when VITE_RENDER_FALLBACK=1.",
      },
      503
    );
  }

  const upstreamUrl = `${renderBase.replace(/\/$/, "")}/render/${template}`;
  const upstreamBody = { ...(body.data ?? {}), scale: body.scale ?? 1 };

  let upstream: Response;
  try {
    upstream = await fetch(upstreamUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(upstreamBody),
    });
  } catch (err) {
    console.error("render upstream fetch failed:", err);
    return c.json({ error: "render_upstream_unreachable" }, 502);
  }

  if (!upstream.ok) {
    const text = await upstream.text().catch(() => "");
    return c.json(
      { error: "render_upstream_error", status: upstream.status, body: text.slice(0, 500) },
      502
    );
  }

  // Stream the PNG back to the browser.
  return new Response(upstream.body, {
    status: 200,
    headers: {
      "Content-Type": upstream.headers.get("Content-Type") ?? "image/png",
      "Cache-Control": "no-store",
    },
  });
}
