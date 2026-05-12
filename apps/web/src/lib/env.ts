/**
 * Frontend env reader. Vite injects `VITE_*` values at build time.
 * `design-studio.matters.town` also has a production fallback so a missed build
 * variable does not make the live Studio call a local development Worker.
 */
const LOCAL_API_BASE_URL = "http://localhost:8787";
const PRODUCTION_API_BASE_URL = "https://matters-studio-api.mashbean-581.workers.dev";

const isProductionStudioHost =
  typeof window !== "undefined" && window.location.hostname === "design-studio.matters.town";

export const API_BASE_URL: string =
  import.meta.env.VITE_API_BASE_URL?.trim() ||
  (isProductionStudioHost ? PRODUCTION_API_BASE_URL : LOCAL_API_BASE_URL);

/** When set to "1", `/render-image` falls back to client-side render via html-to-image. Off by default. */
export const RENDER_FALLBACK: boolean = import.meta.env.VITE_RENDER_FALLBACK === "1";
