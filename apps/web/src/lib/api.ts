/**
 * Studio API client — thin wrappers around the Cloudflare Worker endpoints.
 *
 * The Worker proxies:
 *   - `/render-image` → existing `services/render` (Playwright host)
 *   - `/ai/suggest-title` → Anthropic Claude
 *
 * All routes are POST + JSON. CORS is handled server-side.
 */
import { API_BASE_URL } from "./env";

export interface OgImageData {
  tag: string;
  topic: string;
  title: string;
  summary: string;
  authorName: string;
  authorHandle: string;
  authorAvatarUrl: string;
}

export interface RenderImageRequest {
  template: "og-image";
  data: OgImageData;
  /** Pixel scale, 1 or 2. Defaults server-side to 1. */
  scale?: 1 | 2;
}

export class ApiError extends Error {
  status: number;
  body: unknown;
  constructor(message: string, status: number, body: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.body = body;
  }
}

/** POST /render-image → image/png Blob. */
export async function renderImage(req: RenderImageRequest): Promise<Blob> {
  const res = await fetch(`${API_BASE_URL}/render-image`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(req),
  });
  if (!res.ok) {
    let body: unknown = null;
    try {
      body = await res.json();
    } catch {
      body = await res.text().catch(() => null);
    }
    throw new ApiError(`renderImage failed (${res.status})`, res.status, body);
  }
  return await res.blob();
}

export interface SuggestTitleRequest {
  currentTitle: string;
  summary: string;
  tag: string;
  topic: string;
}

export interface SuggestTitleResponse {
  suggestions: string[];
}

/** POST /ai/suggest-title → 3 alternative titles. */
export async function suggestTitle(req: SuggestTitleRequest): Promise<SuggestTitleResponse> {
  const res = await fetch(`${API_BASE_URL}/ai/suggest-title`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(req),
  });
  let body: unknown = null;
  try {
    body = await res.json();
  } catch {
    body = await res.text().catch(() => null);
  }
  if (!res.ok) {
    throw new ApiError(`suggestTitle failed (${res.status})`, res.status, body);
  }
  return body as SuggestTitleResponse;
}

/** Trigger a browser download of a Blob. */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Defer revoke so Safari can finalize the download.
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}
