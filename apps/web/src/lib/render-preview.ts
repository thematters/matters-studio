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
 *   - og-template/shared/matters-mark-color.svg
 *
 * The shared CSS files are bundled by Vite as raw strings (`?raw` suffix).
 */
import templateHtml from "../og-template/template.html?raw";
import sharedTokensCss from "../og-template/shared/tokens.css?raw";
import sharedBaseCss from "../og-template/shared/template-base.css?raw";
import mattersMarkSvg from "../og-template/shared/matters-mark-color.svg?raw";

import type { OgImageData } from "./api";

/** Inline-encode the brand mark SVG as a data URI so the iframe doesn't fetch it. */
const MARK_DATA_URI = `data:image/svg+xml;utf8,${encodeURIComponent(mattersMarkSvg)}`;

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
 * the result renders without external requests (other than Google Fonts).
 */
export function buildPreviewHtml(data: OgImageData): string {
  // Step 1: replace external stylesheet links with inline <style> blocks.
  let html = templateHtml
    .replace(
      /<link rel="stylesheet" href="..\/shared\/tokens.css" \/>/,
      `<style data-inline="tokens">${sharedTokensCss}</style>`
    )
    .replace(
      /<link rel="stylesheet" href="..\/shared\/template-base.css" \/>/,
      `<style data-inline="base">${sharedBaseCss}</style>`
    )
    .replace(/"\.\.\/shared\/matters-mark-color\.svg"/g, `"${escapeAttr(MARK_DATA_URI)}"`);

  // Step 2: substitute `{{key}}` placeholders.
  // Avatar URL goes into an `src=` attribute → escape as attribute.
  // Everything else becomes text content → escape as HTML text.
  html = html
    .replace(/\{\{tag\}\}/g, escapeHtml(data.tag))
    .replace(/\{\{topic\}\}/g, escapeHtml(data.topic))
    .replace(/\{\{title\}\}/g, escapeHtml(data.title))
    .replace(/\{\{summary\}\}/g, escapeHtml(data.summary))
    .replace(/\{\{authorName\}\}/g, escapeHtml(data.authorName))
    .replace(/\{\{authorHandle\}\}/g, escapeHtml(data.authorHandle))
    .replace(/\{\{authorAvatarUrl\}\}/g, escapeAttr(data.authorAvatarUrl));

  return html;
}

/** Default seed values shown when the wizard first loads. */
export const DEFAULT_OG_DATA: OgImageData = {
  tag: "創作",
  topic: "深度長文",
  title: "在馬特市寫字的第七年",
  summary: "從兩百個讀者到兩萬個。中間發生了什麼？",
  authorName: "豆泥",
  authorHandle: "mashbean",
  authorAvatarUrl:
    "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&h=200&fit=crop",
};
