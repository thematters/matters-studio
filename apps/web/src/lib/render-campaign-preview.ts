import mattersMarkSvg from "../og-template/shared/matters-mark-black-filled.svg?raw";

const MARK_DATA_URI = `data:image/svg+xml;utf8,${encodeURIComponent(mattersMarkSvg)}`;

export interface CampaignVisualData {
  kicker: string;
  headline: string;
  deck: string;
  cta: string;
  backgroundUrl: string;
  width: number;
  height: number;
  categoryId?: string;
}

interface VisualVariant {
  accent: string;
  brandColor: string;
  deckColor: string;
  headlineColor: string;
  kickerColor: string;
  layout: "campaign" | "quote" | "event" | "freewrite" | "seven-day";
  markFilter: string;
  veil: string;
}

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escapeAttr(input: string): string {
  return input.replace(/&/g, "&amp;").replace(/"/g, "&quot;");
}

export function buildCampaignPreviewHtml(data: CampaignVisualData): string {
  const variant = variantForCategory(data.categoryId);
  const base = Math.min(data.width, data.height);
  const padding = clamp(Math.round(base * 0.067), 32, 72);
  const kickerSize = clamp(Math.round(base * 0.022), 15, 24);
  const brandSize = clamp(Math.round(base * 0.022), 15, 24);
  const headlineSize = clamp(Math.round(base * headlineScale(variant.layout)), 34, 72);
  const deckSize = clamp(Math.round(base * 0.024), 17, 26);
  const ctaSize = clamp(Math.round(base * 0.022), 15, 24);
  const mainWidth = Math.round(data.width * mainWidthRatio(variant.layout, data));
  const deckWidth = Math.round(
    data.width * (variant.layout === "event" ? 0.46 : data.width > data.height ? 0.5 : 0.62)
  );
  const headlineLines = data.height < 760 ? 3 : 4;
  const deckLines = data.height < 760 ? 2 : 3;
  const mainClass = `main main-${variant.layout}`;
  const headlineClass = `headline headline-${variant.layout}`;
  const deckClass = `deck deck-${variant.layout}`;

  return `<!doctype html>
<html lang="zh-Hant">
  <head>
    <meta charset="utf-8" />
    <style>
      @import url("https://fonts.googleapis.com/css2?family=Noto+Sans+TC:wght@400;500;600;700;800&family=Noto+Serif+TC:wght@600;700&display=swap");
      * { box-sizing: border-box; }
      html, body { margin: 0; width: ${data.width}px; height: ${data.height}px; }
      body {
        font-family: "Noto Sans TC", system-ui, sans-serif;
        background: #111;
      }
      .canvas {
        width: ${data.width}px;
        height: ${data.height}px;
        position: relative;
        overflow: hidden;
        color: #fff;
        background: #111;
      }
      .background {
        position: absolute;
        inset: 0;
        width: 100%;
        height: 100%;
        object-fit: cover;
      }
      .veil {
        position: absolute;
        inset: 0;
        background: ${variant.veil};
      }
      .content {
        position: relative;
        z-index: 1;
        height: 100%;
        padding: ${padding}px;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
      }
      .top {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 24px;
      }
      .kicker {
        color: ${variant.kickerColor};
        font-size: ${kickerSize}px;
        line-height: 1;
        font-weight: 800;
        text-transform: uppercase;
      }
      .brand {
        display: inline-flex;
        align-items: center;
        gap: 10px;
        font-size: ${brandSize}px;
        font-weight: 700;
        color: ${variant.brandColor};
      }
      .brand img {
        height: ${Math.max(15, Math.round(brandSize * 0.92))}px;
        width: auto;
        filter: ${variant.markFilter};
      }
      .main {
        max-width: ${mainWidth}px;
      }
      .main-quote,
      .main-seven-day {
        align-self: center;
        text-align: center;
      }
      .main-freewrite {
        margin-top: auto;
        margin-bottom: auto;
      }
      .main-event {
        align-self: flex-start;
      }
      .headline {
        margin: 0;
        font-family: "Noto Serif TC", serif;
        font-size: ${headlineSize}px;
        line-height: 1.18;
        font-weight: 700;
        letter-spacing: 0;
        color: ${variant.headlineColor};
        text-wrap: balance;
        display: -webkit-box;
        -webkit-line-clamp: ${headlineLines};
        -webkit-box-orient: vertical;
        overflow: hidden;
      }
      .headline-event,
      .headline-campaign {
        font-family: "Noto Sans TC", system-ui, sans-serif;
        font-weight: 800;
      }
      .headline-seven-day {
        font-family: "Noto Sans TC", system-ui, sans-serif;
        font-weight: 800;
        letter-spacing: 0;
      }
      .deck {
        width: ${deckWidth}px;
        max-width: 100%;
        margin: ${Math.max(14, Math.round(padding * 0.39))}px 0 0;
        color: ${variant.deckColor};
        font-size: ${deckSize}px;
        line-height: 1.5;
        font-weight: 500;
        display: -webkit-box;
        -webkit-line-clamp: ${deckLines};
        -webkit-box-orient: vertical;
        overflow: hidden;
      }
      .deck-quote,
      .deck-seven-day {
        margin-left: auto;
        margin-right: auto;
      }
      .bottom {
        display: flex;
        align-items: center;
        gap: 18px;
      }
      .rule {
        width: ${clamp(Math.round(base * 0.078), 44, 84)}px;
        height: ${clamp(Math.round(base * 0.0046), 3, 5)}px;
        background: ${variant.accent};
      }
      .cta {
        font-size: ${ctaSize}px;
        font-weight: 800;
        color: ${variant.brandColor};
      }
      .quoteMark {
        color: ${variant.accent};
        font-size: ${clamp(Math.round(base * 0.095), 56, 96)}px;
        line-height: .7;
        margin-bottom: 18px;
      }
      .eventMeta {
        width: fit-content;
        max-width: 100%;
        margin-top: ${Math.max(18, Math.round(padding * 0.44))}px;
        padding: 14px 18px;
        border: 1px solid ${variant.accent};
        color: ${variant.deckColor};
        font-size: ${Math.max(15, Math.round(deckSize * 0.74))}px;
        line-height: 1.55;
      }
    </style>
  </head>
  <body>
    <div class="canvas">
      <img class="background" src="${escapeAttr(data.backgroundUrl)}" alt="" />
      <div class="veil"></div>
      <div class="content">
        <header class="top">
          <div class="kicker">${escapeHtml(data.kicker)}</div>
          <div class="brand"><img src="${MARK_DATA_URI}" alt="" /> Matters</div>
        </header>
        <main class="${mainClass}">
          ${variant.layout === "quote" ? '<div class="quoteMark">“</div>' : ""}
          <h1 class="${headlineClass}">${escapeHtml(data.headline)}</h1>
          <p class="${deckClass}">${escapeHtml(data.deck)}</p>
          ${variant.layout === "event" ? `<div class="eventMeta">${escapeHtml(data.cta)}</div>` : ""}
        </main>
        <footer class="bottom">
          <div class="rule"></div>
          <div class="cta">${escapeHtml(data.cta)}</div>
        </footer>
      </div>
    </div>
  </body>
</html>`;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function headlineScale(layout: VisualVariant["layout"]): number {
  if (layout === "event") return 0.05;
  if (layout === "quote") return 0.058;
  if (layout === "freewrite") return 0.052;
  if (layout === "seven-day") return 0.062;
  return 0.061;
}

function mainWidthRatio(layout: VisualVariant["layout"], data: CampaignVisualData): number {
  if (layout === "quote") return data.width > data.height ? 0.62 : 0.74;
  if (layout === "event") return data.width > data.height ? 0.52 : 0.7;
  if (layout === "freewrite") return data.width > data.height ? 0.54 : 0.68;
  if (layout === "seven-day") return data.width > data.height ? 0.55 : 0.72;
  return data.width > data.height ? 0.58 : 0.7;
}

function variantForCategory(categoryId?: string): VisualVariant {
  if (categoryId === "matters-town-core") {
    return {
      accent: "#00A68E",
      brandColor: "#2C6F65",
      deckColor: "rgba(44,111,101,.75)",
      headlineColor: "#2C6F65",
      kickerColor: "#D4B94F",
      layout: "freewrite",
      markFilter: "none",
      veil: "linear-gradient(90deg, rgba(255,250,226,.92), rgba(255,250,226,.72) 54%, rgba(255,250,226,.32)), radial-gradient(circle at 12% 18%, rgba(0,166,142,.18), transparent 30%), radial-gradient(circle at 88% 18%, rgba(246,222,125,.24), transparent 32%)",
    };
  }
  if (categoryId === "matters-town-quotes") {
    return {
      accent: "#DCC878",
      brandColor: "#F2E8C8",
      deckColor: "rgba(255,255,255,.82)",
      headlineColor: "#FFFFFF",
      kickerColor: "#DCC878",
      layout: "quote",
      markFilter: "invert(1)",
      veil: "linear-gradient(90deg, rgba(7,23,26,.84), rgba(7,23,26,.58)), radial-gradient(circle at 50% 20%, rgba(220,200,120,.22), transparent 40%)",
    };
  }
  if (categoryId === "matters-lab-social" || categoryId === "the-space") {
    return {
      accent: "#2EE8D6",
      brandColor: "#F6FFFF",
      deckColor: "rgba(238,255,255,.86)",
      headlineColor: "#FFFFFF",
      kickerColor: "#2EE8D6",
      layout: "event",
      markFilter: "invert(1)",
      veil: "linear-gradient(90deg, rgba(3,5,16,.88), rgba(10,7,24,.72) 48%, rgba(10,7,24,.28)), radial-gradient(circle at 12% 18%, rgba(114,88,255,.55), transparent 30%), radial-gradient(circle at 92% 78%, rgba(46,232,214,.44), transparent 34%)",
    };
  }
  if (categoryId === "freewrite-core" || categoryId === "freewrite-seasonal") {
    return {
      accent: "#90BCD7",
      brandColor: "#607391",
      deckColor: "rgba(73,87,115,.72)",
      headlineColor: "#7FAED0",
      kickerColor: "#9BBED4",
      layout: "freewrite",
      markFilter: "none",
      veil: "linear-gradient(90deg, rgba(255,255,255,.92), rgba(255,255,255,.76) 56%, rgba(255,255,255,.32)), radial-gradient(circle at 18% 16%, rgba(195,244,50,.16), transparent 32%)",
    };
  }
  if (categoryId === "seven-day-book") {
    return {
      accent: "#C3F432",
      brandColor: "#F4F2FF",
      deckColor: "rgba(244,242,255,.82)",
      headlineColor: "#FFFFFF",
      kickerColor: "#C3F432",
      layout: "seven-day",
      markFilter: "invert(1)",
      veil: "linear-gradient(180deg, rgba(13,10,54,.86), rgba(16,12,72,.72)), radial-gradient(circle at 20% 18%, rgba(195,244,50,.22), transparent 28%), radial-gradient(circle at 86% 80%, rgba(114,88,255,.42), transparent 34%)",
    };
  }
  if (categoryId === "traveloggers") {
    return {
      accent: "#2D9F8C",
      brandColor: "#2E4B45",
      deckColor: "rgba(46,75,69,.72)",
      headlineColor: "#244A43",
      kickerColor: "#2D9F8C",
      layout: "freewrite",
      markFilter: "none",
      veil: "linear-gradient(90deg, rgba(255,250,239,.9), rgba(255,250,239,.62) 58%, rgba(255,250,239,.25)), radial-gradient(circle at 88% 18%, rgba(255,191,132,.28), transparent 32%)",
    };
  }
  return {
    accent: "#C3F432",
    brandColor: "#FFFFFF",
    deckColor: "rgba(255,255,255,.84)",
    headlineColor: "#FFFFFF",
    kickerColor: "#C3F432",
    layout: "campaign",
    markFilter: "invert(1)",
    veil: "linear-gradient(90deg, rgba(0,0,0,.82) 0%, rgba(0,0,0,.58) 42%, rgba(0,0,0,.16) 100%), radial-gradient(circle at 12% 14%, rgba(195,244,50,.35), transparent 28%), radial-gradient(circle at 88% 82%, rgba(114,88,255,.44), transparent 35%)",
  };
}
