/**
 * POST /ai/generate-background
 *
 * Generates a text-free background image through OpenAI Images API.
 *
 * Secrets:
 *   - OPENAI_API_KEY
 *
 * Vars:
 *   - OPENAI_IMAGE_MODEL           default gpt-image-2
 *   - OPENAI_IMAGE_FALLBACK_MODEL  default gpt-image-1
 */
import type { Context } from "hono";
import type { Env } from "./env";
import { parseAllowedOrigins } from "./env";

interface GenerateBackgroundRequest {
  brief?: string;
  categoryId?: string;
  textSafeArea?: string;
  size?: "1024x1024" | "1536x1024" | "1024x1536" | "2048x2048";
  quality?: "auto" | "low" | "medium" | "high";
  model?: string;
}

interface OpenAIImageResponse {
  data?: Array<{ b64_json?: string; url?: string }>;
  error?: { message?: string };
}

const BASE_PROMPT = [
  "Create a text-free editorial background for Matters.",
  "Visual language: Taiwanese long-form writing community, digital commons, reading, publishing, thoughtful public conversation.",
  "Use Matters purple #7258FF and lime #C3F432 as accents, with enough neutral or dark space for Traditional Chinese text overlay.",
  "Hard constraints: no readable text, no fake logos, no UI screenshots, no QR codes, no watermark.",
].join("\n");
const MAX_BRIEF_LENGTH = 1800;
const ALLOWED_SIZES = new Set(["1024x1024", "1536x1024", "1024x1536", "2048x2048"]);
const ALLOWED_QUALITIES = new Set(["auto", "low", "medium", "high"]);

export async function generateBackgroundHandler(c: Context<{ Bindings: Env }>) {
  const originGuard = enforceAllowedOrigin(c);
  if (originGuard) return originGuard;

  const rateLimitGuard = await enforceImageRateLimit(c);
  if (rateLimitGuard) return rateLimitGuard;

  let body: GenerateBackgroundRequest;
  try {
    body = (await c.req.json()) as GenerateBackgroundRequest;
  } catch {
    return c.json({ error: "invalid_json" }, 400);
  }

  const brief = body.brief?.trim();
  if (!brief) {
    return c.json({ error: "missing_brief" }, 400);
  }
  if (brief.length > MAX_BRIEF_LENGTH) {
    return c.json(
      {
        error: "brief_too_long",
        maxLength: MAX_BRIEF_LENGTH,
      },
      400
    );
  }

  const apiKey = c.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    return c.json(
      {
        error: "openai_not_configured",
        message: "Set OPENAI_API_KEY via `wrangler secret put OPENAI_API_KEY`.",
      },
      503
    );
  }

  const requestedModel = body.model?.trim() || c.env.OPENAI_IMAGE_MODEL?.trim() || "gpt-image-2";
  const fallbackModel = c.env.OPENAI_IMAGE_FALLBACK_MODEL?.trim() || "gpt-image-1";
  const size = ALLOWED_SIZES.has(body.size ?? "") ? body.size : "1024x1024";
  const quality = ALLOWED_QUALITIES.has(body.quality ?? "") ? body.quality : "auto";
  const prompt = [
    BASE_PROMPT,
    "",
    `Category: ${body.categoryId || "unspecified"}`,
    `Text safe area: ${body.textSafeArea || "leave a clear text-safe area on the left side"}`,
    "",
    "Job brief:",
    brief,
  ].join("\n");

  const first = await callOpenAIImage({
    apiKey,
    model: requestedModel,
    prompt,
    size,
    quality,
  });

  let activeModel = requestedModel;
  let upstream = first.upstream;
  let payload = first.payload;

  const shouldFallback =
    !upstream.ok && /verified|verification|organization/i.test(payload.error?.message || "");
  if (shouldFallback && fallbackModel && fallbackModel !== requestedModel) {
    const second = await callOpenAIImage({
      apiKey,
      model: fallbackModel,
      prompt,
      size,
      quality,
    });
    activeModel = fallbackModel;
    upstream = second.upstream;
    payload = second.payload;
  }

  if (!upstream.ok) {
    return c.json(
      {
        error: "openai_error",
        status: upstream.status,
        message: payload.error?.message || "OpenAI returned an error.",
      },
      502
    );
  }

  const image = payload.data?.[0];
  if (!image?.b64_json && !image?.url) {
    return c.json({ error: "openai_empty_image" }, 502);
  }

  let bytes: Uint8Array;
  if (image.b64_json) {
    bytes = base64ToBytes(image.b64_json);
  } else {
    const imageRes = await fetch(image.url!);
    if (!imageRes.ok) return c.json({ error: "openai_image_download_failed" }, 502);
    bytes = new Uint8Array(await imageRes.arrayBuffer());
  }

  return new Response(bytes, {
    status: 200,
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "no-store",
      "X-OpenAI-Image-Model": activeModel,
      "X-OpenAI-Image-Requested-Model": requestedModel,
    },
  });
}

function enforceAllowedOrigin(c: Context<{ Bindings: Env }>): Response | null {
  const origin = c.req.header("Origin")?.trim();
  const allowedOrigins = parseAllowedOrigins(c.env);
  if (!origin || !allowedOrigins.includes(origin)) {
    return c.json(
      {
        error: "origin_not_allowed",
        message: "Image generation is only available from the Studio web app.",
      },
      403
    );
  }
  return null;
}

async function enforceImageRateLimit(c: Context<{ Bindings: Env }>): Promise<Response | null> {
  const kv = c.env.MATTERS_STUDIO_RATE_LIMIT;
  if (!kv) {
    return c.json(
      {
        error: "rate_limit_not_configured",
        message: "Image generation rate limiting is not configured.",
      },
      503
    );
  }

  const limit = positiveInt(c.env.AI_IMAGE_RATE_LIMIT_PER_HOUR, 20);
  const windowSeconds = positiveInt(c.env.AI_IMAGE_RATE_LIMIT_WINDOW_SECONDS, 3600);
  const nowSeconds = Math.floor(Date.now() / 1000);
  const windowStart = Math.floor(nowSeconds / windowSeconds) * windowSeconds;
  const resetAt = windowStart + windowSeconds;
  const key = await rateLimitKey(c, windowStart);
  const current = Number.parseInt((await kv.get(key)) ?? "0", 10);

  if (Number.isFinite(current) && current >= limit) {
    const retryAfter = Math.max(1, resetAt - nowSeconds);
    return c.json(
      {
        error: "rate_limited",
        limit,
        resetAt,
        message: `Image generation is limited to ${limit} requests per hour.`,
      },
      429,
      {
        "Retry-After": String(retryAfter),
        "X-RateLimit-Limit": String(limit),
        "X-RateLimit-Remaining": "0",
        "X-RateLimit-Reset": String(resetAt),
      }
    );
  }

  const next = Number.isFinite(current) ? current + 1 : 1;
  await kv.put(key, String(next), { expirationTtl: windowSeconds + 120 });
  return null;
}

async function rateLimitKey(c: Context<{ Bindings: Env }>, windowStart: number): Promise<string> {
  const ip =
    c.req.header("CF-Connecting-IP") ??
    c.req.header("X-Forwarded-For")?.split(",")[0]?.trim() ??
    "unknown-ip";
  const userAgent = (c.req.header("User-Agent") ?? "unknown-agent").slice(0, 180);
  const digest = await sha256Hex(`${ip}\n${userAgent}`);
  return `ai-image:${windowStart}:${digest}`;
}

async function sha256Hex(input: string): Promise<string> {
  const bytes = new TextEncoder().encode(input);
  const hash = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(hash)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function positiveInt(input: string | undefined, fallback: number): number {
  const value = Number.parseInt(input ?? "", 10);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

async function callOpenAIImage({
  apiKey,
  model,
  prompt,
  size,
  quality,
}: {
  apiKey: string;
  model: string;
  prompt: string;
  size: GenerateBackgroundRequest["size"];
  quality: GenerateBackgroundRequest["quality"];
}): Promise<{ upstream: Response; payload: OpenAIImageResponse }> {
  const upstream = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      prompt,
      size,
      quality,
      n: 1,
    }),
  });
  const payload = (await upstream.json().catch(() => ({}))) as OpenAIImageResponse;
  return { upstream, payload };
}

function base64ToBytes(input: string): Uint8Array {
  const binary = atob(input);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}
