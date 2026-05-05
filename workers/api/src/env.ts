/**
 * Typed Workers env. Mirrors `[vars]` in wrangler.toml plus secrets.
 *
 * Secrets (set via `wrangler secret put`):
 *   - ANTHROPIC_API_KEY   — Anthropic Claude API key.
 *   - OPENAI_API_KEY      — OpenAI Images API key.
 *
 * Vars:
 *   - RENDER_SERVICE_URL  — Base URL of services/render. e.g. https://render.matters.town
 *   - ALLOWED_ORIGINS     — Comma-separated list of CORS origins.
 *   - ANTHROPIC_MODEL     — Claude model name. Default claude-sonnet-4-5-20250929.
 *   - OPENAI_IMAGE_MODEL  — Default image model. Default gpt-image-2.
 *   - OPENAI_IMAGE_FALLBACK_MODEL — Fallback when org verification blocks the default.
 */
export interface Env {
  ANTHROPIC_API_KEY?: string;
  OPENAI_API_KEY?: string;
  RENDER_SERVICE_URL?: string;
  ALLOWED_ORIGINS?: string;
  ANTHROPIC_MODEL?: string;
  OPENAI_IMAGE_MODEL?: string;
  OPENAI_IMAGE_FALLBACK_MODEL?: string;
}

export function parseAllowedOrigins(env: Env): string[] {
  return (env.ALLOWED_ORIGINS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}
