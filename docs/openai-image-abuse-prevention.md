# OpenAI Image Abuse Prevention

Matters Studio does not use login as a gate for image generation. The production
guardrails are intentionally small and operational:

1. Browser origin allowlist: `/ai/generate-background` only accepts requests from
   configured Studio origins such as `https://design-studio.matters.town`.
2. Anonymous hourly bucket: the Worker hashes `CF-Connecting-IP` plus
   `User-Agent` and allows 20 image generations per hour per bucket.
3. Cloudflare KV counter: the hourly count is stored in
   `MATTERS_STUDIO_RATE_LIMIT` with a short TTL. Raw IPs are not stored.
4. Prompt and output bounds: prompts are capped at 1,800 characters, output size
   is restricted to the Studio-supported OpenAI image sizes, and `n` is fixed at
   `1`.

The limit is configured in `workers/api/wrangler.toml`:

```toml
AI_IMAGE_RATE_LIMIT_PER_HOUR = "20"
AI_IMAGE_RATE_LIMIT_WINDOW_SECONDS = "3600"
```

If abuse increases, raise friction in this order: lower the hourly cap, add a
daily KV bucket, then add Turnstile only around the image-generation action.
Avoid putting login in front of the whole Studio flow unless publishing or
account-specific storage is added later.
