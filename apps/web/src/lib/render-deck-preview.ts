export interface DeckSlideData {
  title: string;
  subtitle: string;
  eventName: string;
  supporter: string;
  organizer: string;
  topic: string;
  thesis: string;
  coreQuestions: string;
  agenda: string;
  closingLines: string;
  backgroundUrl: string;
}

const BRAND_MARK = "Matters Lab";

export function buildDeckHtml(data: DeckSlideData): string {
  const questions = lines(data.coreQuestions).slice(0, 3);
  const agenda = lines(data.agenda).slice(0, 7);
  const closing = lines(data.closingLines).slice(0, 3);
  const backgroundStyle = data.backgroundUrl
    ? ` style="--cover-bg: url('${escapeAttr(data.backgroundUrl)}')"`
    : "";

  return `<!doctype html>
<html lang="zh-Hant">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${escapeHtml(data.title)} - Matters Deck</title>
<style>
${deckCss()}
</style>
</head>
<body>
<main class="deck"${backgroundStyle}>
  <section class="slide cover">
    <div class="cover-art"></div>
    <p class="cover-meta">${escapeHtml(data.eventName)}</p>
    <h1>${lineBreaks(data.title)}</h1>
    <p class="cover-sub">${escapeHtml(data.subtitle)}</p>
    <div class="cover-foot">
      ${metaBlock("支持單位", data.supporter)}
      ${metaBlock("提案單位", data.organizer)}
      ${metaBlock("子題", data.topic)}
    </div>
  </section>

  <section class="slide">
    ${eyebrow("02", "Context")}
    <h2>為什麼是這個題目</h2>
    <div class="rule"></div>
    <div class="callout">${lineBreaks(data.thesis)}</div>
  </section>

  <section class="slide">
    ${eyebrow("03", "Questions")}
    <h2>三個核心問題</h2>
    <ol class="numbered">
      ${questions.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}
    </ol>
  </section>

  <section class="slide section-divider">
    <p class="sec-num">01</p>
    <p class="sec-label">SECTION ONE</p>
    <h2>${escapeHtml(data.topic || "共同問題意識")}</h2>
    <p>${escapeHtml(data.subtitle)}</p>
  </section>

  <section class="slide">
    ${eyebrow("04", "Agenda")}
    <h2>議程與時間分配</h2>
    <div class="agenda">
      <div class="agenda-row head"><span>時段</span><span>內容</span><span>分鐘</span></div>
      ${agenda.map((item) => agendaRow(item)).join("")}
    </div>
  </section>

  <section class="slide">
    ${eyebrow("05", "Summary")}
    <h2>三句話總結</h2>
    <div class="three-lines">
      ${closing.map((item, index) => `<div class="three-line"><span>${index + 1}</span><p>${escapeHtml(item)}</p></div>`).join("")}
    </div>
  </section>
</main>
</body>
</html>`;
}

function deckCss(): string {
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
  --font-mono: ui-monospace, SFMono-Regular, Menlo, monospace;
}
* { box-sizing: border-box; }
html, body { margin: 0; background: var(--m-black); color: var(--m-ink); font-family: var(--font-ui); }
.deck { display: grid; gap: 24px; padding: 24px; }
.slide {
  position: relative;
  width: 1280px;
  height: 720px;
  overflow: hidden;
  background: var(--m-white);
  color: var(--m-ink);
  padding: 72px 80px 68px;
}
.slide::after {
  content: "${BRAND_MARK}";
  position: absolute;
  right: 42px;
  bottom: 36px;
  color: var(--m-muted);
  font-size: 13px;
  font-weight: 600;
}
.cover {
  display: flex;
  flex-direction: column;
  padding-right: 520px;
}
.cover-art {
  position: absolute;
  inset: 0 0 0 auto;
  width: 44%;
  height: 100%;
  background-image: linear-gradient(90deg, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0.42) 32%, rgba(255,255,255,0.04) 72%), var(--cover-bg);
  background-size: cover;
  background-position: center;
  opacity: 0.94;
}
.cover-art::before {
  content: "";
  position: absolute;
  inset: 0 auto 0 0;
  width: 8px;
  background: var(--m-purple);
}
.cover-art::after {
  content: "";
  position: absolute;
  left: 8px;
  top: 0;
  width: 5px;
  height: 38%;
  background: var(--m-neon);
}
.cover-meta,
.eyebrow {
  margin: 0 0 24px;
  color: var(--m-purple);
  font-size: 17px;
  line-height: 24px;
  font-weight: 600;
  text-transform: uppercase;
}
.eyebrow .num {
  display: inline-flex;
  margin-right: 16px;
  padding: 2px 8px;
  background: var(--m-neon);
  color: var(--m-ink);
}
h1 {
  position: relative;
  max-width: 620px;
  margin: 0 0 28px;
  font-family: var(--font-serif);
  font-size: 56px;
  line-height: 1.18;
  font-weight: 700;
}
h2 {
  margin: 0 0 28px;
  font-size: 52px;
  line-height: 1.2;
  font-weight: 600;
}
.cover-sub {
  max-width: 590px;
  margin: 0;
  color: var(--m-muted);
  font-size: 24px;
  line-height: 1.45;
}
.cover-foot {
  position: relative;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 26px;
  width: 590px;
  margin-top: auto;
  padding-top: 24px;
  border-top: 1px solid var(--m-rule);
}
.meta .label {
  margin: 0 0 8px;
  color: var(--m-muted);
  font-size: 15px;
  line-height: 22px;
  font-weight: 600;
}
.meta .value {
  margin: 0;
  font-size: 20px;
  line-height: 30px;
  font-weight: 500;
}
.rule { width: 64px; height: 4px; margin: 0 0 32px; background: var(--m-purple); }
.callout {
  max-width: 960px;
  padding: 28px 36px;
  border-left: 6px solid var(--m-purple);
  background: var(--m-soft);
  font-size: 31px;
  line-height: 1.55;
}
.numbered {
  display: grid;
  gap: 28px;
  margin: 0;
  padding: 0;
  list-style: none;
  counter-reset: item;
}
.numbered li {
  counter-increment: item;
  position: relative;
  padding-left: 74px;
  font-size: 30px;
  line-height: 1.5;
}
.numbered li::before {
  content: counter(item, decimal-leading-zero);
  position: absolute;
  left: 0;
  top: -4px;
  color: var(--m-purple);
  font-family: var(--font-serif);
  font-size: 38px;
  font-weight: 700;
}
.section-divider { display: flex; flex-direction: column; justify-content: center; background: var(--m-black); color: var(--m-white); }
.section-divider::after { color: rgba(255,255,255,0.62); }
.section-divider .sec-num {
  margin: 0 0 24px;
  color: var(--m-neon);
  font-family: var(--font-serif);
  font-size: 136px;
  line-height: 1;
  font-weight: 700;
}
.section-divider .sec-label {
  margin: 0 0 18px;
  color: var(--m-neon);
  font-size: 16px;
  line-height: 24px;
  font-weight: 600;
  text-transform: uppercase;
}
.section-divider h2 { max-width: 960px; font-family: var(--font-serif); font-size: 68px; }
.section-divider p:last-child { max-width: 900px; margin: 0; color: rgba(255,255,255,0.72); font-size: 25px; line-height: 1.55; }
.agenda { border-top: 2px solid var(--m-ink); }
.agenda-row { display: grid; grid-template-columns: 190px 1fr 80px; gap: 24px; padding: 13px 16px; border-bottom: 1px solid var(--m-rule); align-items: baseline; }
.agenda-row.head { color: var(--m-muted); font-size: 14px; font-weight: 600; text-transform: uppercase; }
.agenda-row span { font-size: 22px; line-height: 1.4; }
.agenda-row span:first-child,
.agenda-row span:last-child { font-family: var(--font-mono); color: var(--m-muted); }
.agenda-row span:last-child { text-align: right; color: var(--m-ink); font-weight: 600; }
.three-lines { display: grid; gap: 28px; margin-top: 32px; }
.three-line { display: grid; grid-template-columns: 90px 1fr; gap: 32px; align-items: start; padding-bottom: 24px; border-bottom: 1px solid var(--m-rule); }
.three-line span { color: var(--m-purple); font-family: var(--font-serif); font-size: 64px; line-height: 1; font-weight: 700; }
.three-line p { margin: 0; font-size: 32px; line-height: 1.5; }
strong { background: linear-gradient(transparent 62%, var(--m-neon) 62%, var(--m-neon) 92%, transparent 92%); font-weight: 600; }
@media print {
  body { background: var(--m-white); }
  .deck { display: block; padding: 0; }
  .slide { page-break-after: always; }
}
`;
}

function agendaRow(input: string): string {
  const [time = "", what = input, minutes = ""] = input.split("|").map((item) => item.trim());
  return `<div class="agenda-row"><span>${escapeHtml(time)}</span><span>${escapeHtml(what)}</span><span>${escapeHtml(minutes)}</span></div>`;
}

function eyebrow(num: string, label: string): string {
  return `<p class="eyebrow"><span class="num">${num}</span>${escapeHtml(label)}</p>`;
}

function metaBlock(label: string, value: string): string {
  return `<div class="meta"><p class="label">${escapeHtml(label)}</p><p class="value">${escapeHtml(value)}</p></div>`;
}

function lines(input: string): string[] {
  return input
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);
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
