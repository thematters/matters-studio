/**
 * Build the OG template HTML inline (single self-contained string suitable
 * for an iframe `srcdoc`). The vendored template references CSS files via
 * relative `../shared/...` paths; for srcdoc we inline everything instead so
 * there is no network roundtrip.
 *
 * Vendored sources:
 *   - og-template/template.html
 *   - og-template/shared/template-base.css
 *   - og-template/shared/tokens.css
 *   - og-template/shared/matters-mark-black-filled.svg  (mark glyph)
 *   - og-template/shared/matters-lettering-black.svg    (matters wordmark)
 *   - og-template/shared/backgrounds/{1..6}.jpg         (designer covers)
 *
 * The CSS/SVG assets are bundled inline via `?raw`. The JPG backgrounds
 * are bundled as separate URL-addressable assets via `?url` — Vite emits
 * them as `/assets/<hash>.jpg` and the iframe (sandbox="allow-same-origin")
 * fetches them from the parent origin at preview/render time.
 */
import templateHtml from "../og-template/template.html?raw";
import sharedTokensCss from "../og-template/shared/tokens.css?raw";
import sharedBaseCss from "../og-template/shared/template-base.css?raw";
import mattersMarkSvg from "../og-template/shared/matters-mark-black-filled.svg?raw";
import mattersLetteringSvg from "../og-template/shared/matters-lettering-black.svg?raw";

import bg1Url from "../og-template/shared/backgrounds/1.jpg?url";
import bg2Url from "../og-template/shared/backgrounds/2.jpg?url";
import bg3Url from "../og-template/shared/backgrounds/3.jpg?url";
import bg4Url from "../og-template/shared/backgrounds/4.jpg?url";
import bg5Url from "../og-template/shared/backgrounds/5.jpg?url";
import bg6Url from "../og-template/shared/backgrounds/6.jpg?url";

import type { OgBackgroundId, OgImageData } from "./api";

/** Inline-encode brand assets as data URIs so the iframe doesn't fetch them. */
const MARK_DATA_URI = `data:image/svg+xml;utf8,${encodeURIComponent(mattersMarkSvg)}`;
const LETTERING_DATA_URI = `data:image/svg+xml;utf8,${encodeURIComponent(mattersLetteringSvg)}`;

/**
 * URL lookup for the 6 designer backgrounds.
 *
 * Note: these are ABSOLUTE URLs (Vite emits them as `/assets/<hash>.jpg`
 * relative to the deployed root, or `blob:` URLs in dev). We pass them
 * straight into the iframe's `<img src>` — same-origin sandbox lets the
 * iframe fetch from the parent origin, and html-to-image can read them
 * back into a canvas without CORS taint.
 */
export const BACKGROUND_URLS: Record<OgBackgroundId, string> = {
  "1": bg1Url,
  "2": bg2Url,
  "3": bg3Url,
  "4": bg4Url,
  "5": bg5Url,
  "6": bg6Url,
};

/** Escape a string for safe insertion into HTML text (not attributes/URLs). */
function escapeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Escape a URL for safe insertion as an attribute value. */
function escapeAttr(input: string): string {
  return input.replace(/&/g, "&amp;").replace(/"/g, "&quot;");
}

/**
 * Substitute `{{placeholder}}` with form data, and inline the shared CSS so
 * the result renders without external requests (other than Google Fonts +
 * the bundled JPG background, which is same-origin).
 */
export function buildPreviewHtml(data: OgImageData): string {
  const backgroundUrl = BACKGROUND_URLS[data.background] ?? BACKGROUND_URLS["1"];

  // Step 1: inline the shared CSS + brand SVGs.
  let html = templateHtml
    .replace(
      /<link rel="stylesheet" href="\.\.\/shared\/tokens\.css" \/>/,
      `<style data-inline="tokens">${sharedTokensCss}</style>`,
    )
    .replace(
      /<link rel="stylesheet" href="\.\.\/shared\/template-base\.css" \/>/,
      `<style data-inline="base">${sharedBaseCss}</style>`,
    )
    .replace(
      /"\.\.\/shared\/matters-mark-black-filled\.svg"/g,
      `"${escapeAttr(MARK_DATA_URI)}"`,
    )
    .replace(
      /"\.\.\/shared\/matters-lettering-black\.svg"/g,
      `"${escapeAttr(LETTERING_DATA_URI)}"`,
    );

  // Step 2: substitute `{{key}}` placeholders.
  // Avatar + background URLs go into `src=` attributes → attribute-escape.
  // Text fields become text content → HTML-escape.
  html = html
    .replace(/\{\{backgroundUrl\}\}/g, escapeAttr(backgroundUrl))
    .replace(/\{\{title\}\}/g, escapeHtml(data.title))
    .replace(/\{\{summary\}\}/g, escapeHtml(data.summary))
    .replace(/\{\{authorName\}\}/g, escapeHtml(data.authorName))
    .replace(/\{\{authorAvatarUrl\}\}/g, escapeAttr(data.authorAvatarUrl));

  return html;
}

/**
 * Default seed values shown when the wizard first loads.
 *
 * Author defaults to Matty (@hi176, the Matters founder) so the preview
 * looks like a real matters.town card right out of the gate. Background
 * defaults to "1" (mint cyan with the open-book illustration).
 */
export const DEFAULT_OG_DATA: OgImageData = {
  background: "1",
  title: "在馬特市寫字的第七年",
  summary: "從兩百個讀者到兩萬個。中間發生了什麼？",
  authorName: "Matty",
  authorAvatarUrl:
    "https://imagedelivery.net/kDRCweMmqLnTPNlbum-pYA/prod/avatar/19b36f6e-6311-4cd6-b703-c143a4a49113.png/public",
};
