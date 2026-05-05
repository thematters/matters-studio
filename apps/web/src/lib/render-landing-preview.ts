export interface LandingData {
  eyebrow: string;
  title: string;
  deck: string;
  dateLine: string;
  locationLine: string;
  cta: string;
  ctaUrl: string;
  sections: string;
  agenda: string;
  speakers: string;
  formUrl: string;
  deploySlug: string;
  backgroundUrl: string;
}

export function buildLandingHtml(data: LandingData): string {
  const sections = parseSections(data.sections);
  const agenda = parseAgenda(data.agenda);
  const speakers = parseSpeakers(data.speakers);
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
  ${agenda.length ? renderAgenda(agenda) : ""}
  ${speakers.length ? renderSpeakers(speakers) : ""}
  ${data.formUrl ? renderForm(data) : ""}
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
.module-section {
  width: min(1120px, calc(100% - 64px));
  margin: 0 auto;
  padding: 72px 0;
  border-bottom: 1px solid var(--m-rule);
}
.module-head {
  display: grid;
  grid-template-columns: minmax(0, 320px) minmax(0, 1fr);
  gap: 48px;
  margin-bottom: 36px;
}
.module-head h2 {
  margin: 0;
  font-size: 36px;
  line-height: 48px;
  font-weight: 600;
}
.module-head p {
  margin: 0;
  color: var(--m-muted);
  font-size: 18px;
  line-height: 30px;
}
.agenda-list {
  border-top: 2px solid var(--m-ink);
}
.agenda-item {
  display: grid;
  grid-template-columns: 180px 1fr;
  gap: 32px;
  padding: 20px 0;
  border-bottom: 1px solid var(--m-rule);
}
.agenda-time {
  color: var(--m-purple);
  font-size: 15px;
  line-height: 22px;
  font-weight: 600;
}
.agenda-body h3 {
  margin: 0 0 8px;
  font-size: 24px;
  line-height: 34px;
  font-weight: 600;
}
.agenda-body p {
  max-width: 760px;
  margin: 0;
  color: var(--m-muted);
  font-size: 16px;
  line-height: 26px;
}
.speaker-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
}
.speaker-card {
  min-height: 180px;
  padding: 22px;
  border: 1px solid var(--m-rule);
  border-radius: 8px;
  background: var(--m-white);
}
.speaker-card h3 {
  margin: 0 0 8px;
  font-size: 24px;
  line-height: 34px;
  font-weight: 600;
}
.speaker-role {
  margin: 0 0 18px;
  color: var(--m-purple);
  font-size: 14px;
  line-height: 22px;
  font-weight: 600;
}
.speaker-topic {
  margin: 0;
  color: var(--m-muted);
  font-size: 16px;
  line-height: 26px;
}
.form-wrap {
  display: grid;
  grid-template-columns: minmax(0, 0.9fr) minmax(0, 1.1fr);
  gap: 32px;
  align-items: start;
}
.form-copy h2 {
  max-width: 520px;
  margin: 0 0 18px;
  font-size: 36px;
  line-height: 48px;
  font-weight: 600;
}
.form-copy p {
  max-width: 520px;
  margin: 0 0 24px;
  color: var(--m-muted);
  font-size: 18px;
  line-height: 30px;
}
.form-frame {
  width: 100%;
  min-height: 620px;
  border: 1px solid var(--m-rule);
  border-radius: 8px;
  background: var(--m-soft);
}
.form-fallback {
  color: var(--m-purple);
  text-decoration: none;
  font-size: 16px;
  line-height: 24px;
  font-weight: 600;
}
@media (max-width: 720px) {
  .topbar { padding: 12px 16px; }
  .hero { padding: 72px 20px 36px; }
  .hero::after { left: 20px; right: 20px; }
  .content-section,
  .module-section { width: calc(100% - 40px); padding: 48px 0; }
  .module-head,
  .agenda-item,
  .form-wrap { grid-template-columns: 1fr; gap: 18px; }
  .speaker-grid { grid-template-columns: 1fr; }
  .form-frame { min-height: 560px; }
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

function parseAgenda(input: string): Array<{ time: string; title: string; body: string }> {
  return input
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 8)
    .map((item) => {
      const [time = "", title = item, body = ""] = item.split("|").map((part) => part.trim());
      return { time, title, body };
    });
}

function parseSpeakers(input: string): Array<{ name: string; role: string; topic: string }> {
  return input
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 9)
    .map((item) => {
      const [name = item, role = "", topic = ""] = item.split("|").map((part) => part.trim());
      return { name, role, topic };
    });
}

function renderAgenda(items: Array<{ time: string; title: string; body: string }>): string {
  return `<section class="module-section">
    <div class="module-head">
      <h2>Agenda</h2>
      <p>用清楚時段、討論主題與產出期待，讓參與者知道每一段的決策重點。</p>
    </div>
    <div class="agenda-list">
      ${items
        .map(
          (item) => `<article class="agenda-item">
        <p class="agenda-time">${escapeHtml(item.time)}</p>
        <div class="agenda-body">
          <h3>${escapeHtml(item.title)}</h3>
          ${item.body ? `<p>${escapeHtml(item.body)}</p>` : ""}
        </div>
      </article>`
        )
        .join("")}
    </div>
  </section>`;
}

function renderSpeakers(items: Array<{ name: string; role: string; topic: string }>): string {
  return `<section class="module-section">
    <div class="module-head">
      <h2>Speakers</h2>
      <p>講者資訊保持精簡，讓主題、身分與活動關聯一眼可讀。</p>
    </div>
    <div class="speaker-grid">
      ${items
        .map(
          (item) => `<article class="speaker-card">
        <h3>${escapeHtml(item.name)}</h3>
        ${item.role ? `<p class="speaker-role">${escapeHtml(item.role)}</p>` : ""}
        ${item.topic ? `<p class="speaker-topic">${escapeHtml(item.topic)}</p>` : ""}
      </article>`
        )
        .join("")}
    </div>
  </section>`;
}

function renderForm(data: LandingData): string {
  return `<section class="module-section">
    <div class="form-wrap">
      <div class="form-copy">
        <p class="section-kicker">Registration</p>
        <h2>${escapeHtml(data.cta)}</h2>
        <p>留下聯絡方式，我們會寄出活動提醒、會前資料與後續公開紀錄。</p>
        <a class="form-fallback" href="${escapeAttr(data.formUrl)}">開啟報名表單</a>
      </div>
      <iframe class="form-frame" title="${escapeAttr(data.cta)}" src="${escapeAttr(data.formUrl)}" loading="lazy"></iframe>
    </div>
  </section>`;
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
