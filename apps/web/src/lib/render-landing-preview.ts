export interface LandingData {
  eyebrow: string;
  title: string;
  deck: string;
  dateLine: string;
  locationLine: string;
  cta: string;
  ctaUrl: string;
  sections: string;
  backgroundUrl: string;
}

export function buildLandingHtml(data: LandingData): string {
  const sections = parseSections(data.sections);
  const background = data.backgroundUrl
    ? ` style="--hero-bg: url('${escapeAttr(data.backgroundUrl)}')"`
    : "";

  return `<!doctype html>
<html lang="zh-Hant">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${escapeHtml(data.title)} - Matters Landing</title>
<style>
${landingCss()}
</style>
</head>
<body${background}>
<header class="topbar">
  <strong>Matters Studio</strong>
  <a href="${escapeAttr(data.ctaUrl)}">${escapeHtml(data.cta)}</a>
</header>
<main>
  <section class="hero">
    <div class="hero-media"></div>
    <div class="hero-copy">
      <p class="eyebrow">${escapeHtml(data.eyebrow)}</p>
      <h1>${lineBreaks(data.title)}</h1>
      <p class="deck">${escapeHtml(data.deck)}</p>
      <div class="meta">
        <span>${escapeHtml(data.dateLine)}</span>
        <span>${escapeHtml(data.locationLine)}</span>
      </div>
      <a class="cta" href="${escapeAttr(data.ctaUrl)}">${escapeHtml(data.cta)}</a>
    </div>
  </section>
  ${sections
    .map(
      (section) => `<section class="content-section">
    <p class="section-kicker">${escapeHtml(section.kicker)}</p>
    <h2>${escapeHtml(section.title)}</h2>
    <p>${escapeHtml(section.body)}</p>
  </section>`
    )
    .join("")}
</main>
</body>
</html>`;
}

function landingCss(): string {
  return `
:root {
  --m-purple: #7258ff;
  --m-neon: #c3f432;
  --m-purple-soft: #f5f3ff;
  --m-black: #000000;
  --m-ink: #333333;
  --m-muted: #808080;
  --m-rule: #dddddd;
  --m-soft: #f7f7f7;
  --m-white: #ffffff;
  --font-ui: PingFang TC, Noto Sans TC, system-ui, sans-serif;
  --font-serif: Noto Serif TC, serif;
}
* { box-sizing: border-box; }
html, body { margin: 0; min-height: 100%; background: var(--m-white); color: var(--m-ink); font-family: var(--font-ui); }
.topbar {
  position: sticky;
  top: 0;
  z-index: 2;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 32px;
  background: rgba(255,255,255,0.94);
  border-bottom: 1px solid var(--m-rule);
}
.topbar strong { font-size: 16px; line-height: 24px; }
.topbar a { color: var(--m-purple); text-decoration: none; font-size: 14px; line-height: 22px; }
.hero {
  position: relative;
  min-height: 92vh;
  display: grid;
  align-items: end;
  padding: 96px 32px 48px;
  overflow: hidden;
}
.hero::after {
  content: "";
  position: absolute;
  left: 32px;
  right: 32px;
  bottom: 0;
  height: 1px;
  background: var(--m-rule);
}
.hero-media {
  position: absolute;
  inset: 0;
  background-image: linear-gradient(90deg, rgba(255,255,255,0.96) 0%, rgba(255,255,255,0.86) 42%, rgba(255,255,255,0.42) 100%), var(--hero-bg);
  background-size: cover;
  background-position: center;
}
.hero-copy {
  position: relative;
  width: min(1120px, 100%);
  margin: 0 auto;
}
.eyebrow,
.section-kicker {
  margin: 0 0 16px;
  color: var(--m-purple);
  font-size: 13px;
  line-height: 20px;
  font-weight: 600;
  text-transform: uppercase;
}
h1 {
  max-width: 880px;
  margin: 0 0 24px;
  font-family: var(--font-serif);
  font-size: clamp(48px, 8vw, 104px);
  line-height: 1.08;
  font-weight: 700;
}
.deck {
  max-width: 720px;
  margin: 0 0 28px;
  color: var(--m-muted);
  font-size: 20px;
  line-height: 32px;
}
.meta {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 32px;
}
.meta span {
  display: inline-flex;
  padding: 6px 12px;
  border: 1px solid var(--m-rule);
  border-radius: 999px;
  background: var(--m-white);
  font-size: 14px;
  line-height: 22px;
}
.cta {
  display: inline-flex;
  min-height: 48px;
  align-items: center;
  justify-content: center;
  padding: 12px 32px;
  border-radius: 999px;
  background: var(--m-purple);
  color: var(--m-white);
  text-decoration: none;
  font-size: 16px;
  line-height: 24px;
}
.content-section {
  width: min(1120px, calc(100% - 64px));
  margin: 0 auto;
  padding: 72px 0;
  border-bottom: 1px solid var(--m-rule);
}
.content-section h2 {
  max-width: 720px;
  margin: 0 0 18px;
  font-size: 36px;
  line-height: 48px;
  font-weight: 600;
}
.content-section p:last-child {
  max-width: 780px;
  margin: 0;
  color: var(--m-muted);
  font-size: 18px;
  line-height: 30px;
}
@media (max-width: 720px) {
  .topbar { padding: 12px 16px; }
  .hero { padding: 72px 20px 36px; }
  .hero::after { left: 20px; right: 20px; }
  .content-section { width: calc(100% - 40px); padding: 48px 0; }
}
`;
}

function parseSections(input: string): Array<{ kicker: string; title: string; body: string }> {
  return input
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 6)
    .map((item, index) => {
      const [title = item, body = ""] = item.split("|").map((part) => part.trim());
      return { kicker: String(index + 1).padStart(2, "0"), title, body };
    });
}

function lineBreaks(input: string): string {
  return escapeHtml(input).replace(/\n/g, "<br />");
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function escapeAttr(value: string): string {
  return escapeHtml(value).replace(/'/g, "&#39;");
}
