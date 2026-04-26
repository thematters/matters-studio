/**
 * POST /ai/suggest-title
 *
 * Calls Anthropic Claude (Messages API) with a system prompt asking for
 * 3 alternative titles in 繁體中文. Returns `{ suggestions: string[] }`.
 *
 * Default model: claude-sonnet-4-5-20250929. Override via ANTHROPIC_MODEL var.
 *
 * The Anthropic API key is a Workers secret (`ANTHROPIC_API_KEY`).
 */
import type { Context } from "hono";
import type { Env } from "./env";

interface SuggestRequest {
  currentTitle?: string;
  summary?: string;
  tag?: string;
  topic?: string;
}

interface AnthropicMessageContent {
  type: string;
  text?: string;
}

interface AnthropicMessageResponse {
  content?: AnthropicMessageContent[];
  error?: { type?: string; message?: string };
}

const SYSTEM_PROMPT = [
  "你是 Matters 馬特市的編輯助理。讀者是創作者與深度內容讀者。",
  "請為一篇文章建議 3 個替代標題：",
  "- 每個標題 ≤ 50 個繁體中文字元",
  "- 不可使用 clickbait（不要「驚」「真相」「曝光」這類字）",
  "- 鼓勵具象、有畫面感、可引發好奇但保留尊嚴",
  "- 三個標題彼此風格要不同：一個資訊型、一個情緒型、一個提問型",
  "",
  "輸出格式：每行一個標題，不加編號、不加引號、不加任何前後綴或說明。",
].join("\n");

const DEFAULT_MODEL = "claude-sonnet-4-5-20250929";

export async function suggestTitleHandler(c: Context<{ Bindings: Env }>) {
  let body: SuggestRequest;
  try {
    body = (await c.req.json()) as SuggestRequest;
  } catch {
    return c.json({ error: "invalid_json" }, 400);
  }

  const apiKey = c.env.ANTHROPIC_API_KEY?.trim();
  if (!apiKey) {
    return c.json(
      {
        error: "anthropic_not_configured",
        message: "Set ANTHROPIC_API_KEY via `wrangler secret put ANTHROPIC_API_KEY`.",
      },
      503
    );
  }

  const userMessage = [
    `目前標題：${body.currentTitle || "（尚未填寫）"}`,
    `標籤：${body.tag || "（無）"}`,
    `主題：${body.topic || "（無）"}`,
    `摘要：${body.summary || "（無）"}`,
    "",
    "請給我 3 個替代標題。",
  ].join("\n");

  const model = c.env.ANTHROPIC_MODEL?.trim() || DEFAULT_MODEL;

  let upstream: Response;
  try {
    upstream = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model,
        max_tokens: 512,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: userMessage }],
      }),
    });
  } catch (err) {
    console.error("anthropic fetch failed:", err);
    return c.json({ error: "anthropic_unreachable" }, 502);
  }

  let payload: AnthropicMessageResponse;
  try {
    payload = (await upstream.json()) as AnthropicMessageResponse;
  } catch {
    return c.json({ error: "anthropic_invalid_response" }, 502);
  }

  if (!upstream.ok) {
    return c.json(
      {
        error: "anthropic_error",
        status: upstream.status,
        message: payload.error?.message ?? "Anthropic returned an error.",
      },
      502
    );
  }

  const text =
    payload.content?.find((p) => p.type === "text")?.text?.trim() ??
    payload.content
      ?.map((p) => p.text)
      .filter(Boolean)
      .join("\n") ??
    "";

  const suggestions = text
    .split(/\r?\n/)
    .map((line) => line.replace(/^[\s\-•*\d.、]+/, "").trim())
    .filter((line) => line.length > 0)
    .slice(0, 3);

  return c.json({ suggestions });
}
