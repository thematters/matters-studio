/**
 * Frontend env reader. All values come from Vite's `VITE_*` env at build time.
 * Defaults assume local dev with the Worker on port 8787.
 */
export const API_BASE_URL: string =
  import.meta.env.VITE_API_BASE_URL?.trim() || "http://localhost:8787";

/** When set to "1", `/render-image` falls back to client-side render via html-to-image. Off by default. */
export const RENDER_FALLBACK: boolean = import.meta.env.VITE_RENDER_FALLBACK === "1";
