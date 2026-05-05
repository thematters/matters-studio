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

export async function generateBackgroundHandler(c: Context<{ Bindings: Env }>) {
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
  const size = body.size || "1024x1024";
  const quality = body.quality || "auto";
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
