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

/**
 * Background image identifier — keys into the 6 designer-provided
 * illustrations vendored at `og-template/shared/backgrounds/<id>.jpg`.
 *
 * The wizard requires a background; there is no "blank" option (the
 * canvas dimensions match the designer's compositions, so without a
 * background the result would just be empty white).
 */
export type OgBackgroundId = "1" | "2" | "3" | "4" | "5" | "6";

export const OG_BACKGROUND_IDS: readonly OgBackgroundId[] = ["1", "2", "3", "4", "5", "6"] as const;

export interface OgImageData {
  background: OgBackgroundId;
  title: string;
  summary: string;
  authorName: string;
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
  /**
   * Optional context fields. The form no longer collects tag/topic
   * (Phase 9.1 simplified the OG layout to title + summary + author),
   * but we keep these here as optional pass-throughs in case the API
   * Worker's prompt benefits from them — and so older callers don't
   * have to change shape.
   */
  tag?: string;
  topic?: string;
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
