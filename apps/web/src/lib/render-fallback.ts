/**
 * Client-side render fallback.
 *
 * When the Playwright-backed render service isn't deployed (or is down),
 * we rasterize the live preview <iframe> directly in the browser using
 * `html-to-image`. The output dimensions match what the server-side
 * renderer would produce: 1200×630 logical px, optionally with
 * `pixelRatio: 2` for retina output (2400×1260).
 *
 * Trade-offs vs. Playwright:
 *   - No font shaping differences across machines (good)
 *   - Fonts/SVG/cross-origin images may render slightly differently (so-so)
 *   - Free, no extra service to maintain (good)
 *   - Only works while the user has the page open (acceptable for MVP)
 *
 * Wire-up: gated by `VITE_RENDER_FALLBACK=1` in Vite env. See lib/env.ts.
 */
import { toBlob } from "html-to-image";

import { ApiError } from "./api";

interface RenderClientOptions {
  /** Logical pixel width of the output PNG. */
  width: number;
  /** Logical pixel height of the output PNG. */
  height: number;
  /** Output multiplier; 2 = retina. Default 2. */
  pixelRatio?: number;
}

/**
 * Rasterize the contents of a same-origin <iframe> to a PNG Blob.
 *
 * The iframe must be `sandbox="allow-same-origin"` (or unsandboxed) so we
 * can reach `contentDocument`. The OG preview iframe in `og-image.tsx` is
 * configured this way.
 *
 * Throws `ApiError` with status 0 (client-side) on every failure path so
 * the calling mutation's error handler treats it consistently with the
 * server-side path.
 */
export async function renderClientFallback(
  iframe: HTMLIFrameElement,
  { width, height, pixelRatio = 2 }: RenderClientOptions,
): Promise<Blob> {
  const doc = iframe.contentDocument;
  const node = doc?.body;
  if (!doc || !node) {
    throw new ApiError("preview iframe document not ready", 0, null);
  }

  // html-to-image walks the live DOM and inlines computed styles; passing
  // explicit width/height pins the output regardless of the iframe's own
  // CSS-driven layout (the iframe is shown at 50% scale in the UI).
  let blob: Blob | null;
  try {
    blob = await toBlob(node, {
      width,
      height,
      pixelRatio,
      // Match the template's intended canvas; html-to-image otherwise
      // takes the body's bounding rect, which can clip on some browsers.
      style: {
        width: `${width}px`,
        height: `${height}px`,
      },
      // Trust the inlined SVG/CSS; don't attempt to fetch resources.
      cacheBust: false,
      skipFonts: false,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "render failed";
    throw new ApiError(`client render failed: ${message}`, 0, null);
  }

  if (!blob) {
    throw new ApiError("client render returned empty blob", 0, null);
  }
  return blob;
}
