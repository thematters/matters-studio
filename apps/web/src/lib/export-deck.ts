import { downloadTextFile } from "./api";
import { loadWindowGlobal } from "./external-scripts";
import type { DeckSlideData } from "./render-deck-preview";

const PPTXGEN_CDN = "https://cdn.jsdelivr.net/npm/pptxgenjs@4.0.1/dist/pptxgen.bundle.js";
const SLIDE_W = 13.333;
const SLIDE_H = 7.5;
const PURPLE = "7258FF";
const NEON = "C3F432";
const BLACK = "000000";
const INK = "333333";
const MUTED = "808080";
const RULE = "DDDDDD";
const SOFT = "F7F7F7";
const WHITE = "FFFFFF";

interface PptxConstructor {
  new (): PptxPresentation;
}

interface PptxPresentation {
  layout: string;
  author: string;
  company: string;
  subject: string;
  title: string;
  ShapeType?: Record<string, unknown>;
  addSlide(): PptxSlide;
  writeFile(options: { fileName: string; compression?: boolean }): Promise<string>;
}

interface PptxSlide {
  background?: { color: string };
  addText(text: string, options: Record<string, unknown>): void;
  addShape(shape: unknown, options: Record<string, unknown>): void;
  addImage(options: Record<string, unknown>): void;
}

export function openDeckPdf(html: string): void {
  const printWindow = window.open("", "_blank");
  if (!printWindow) {
    downloadTextFile(html, "matters-deck-print.html");
    return;
  }

  printWindow.document.open();
  printWindow.document.write(
    html.replace(
      "</style>",
      `
@page { size: 1280px 720px; margin: 0; }
</style>`
    )
  );
  printWindow.document.close();
  window.setTimeout(() => {
    printWindow.focus();
    printWindow.print();
  }, 500);
}

export async function downloadDeckPptx(data: DeckSlideData): Promise<void> {
  const PptxGenJS = await loadWindowGlobal<PptxConstructor>(PPTXGEN_CDN, "PptxGenJS");
  const pptx = new PptxGenJS();
  pptx.layout = "LAYOUT_WIDE";
  pptx.author = "Matters Studio";
  pptx.company = "Matters";
  pptx.subject = data.eventName;
  pptx.title = data.title.replace(/\n/g, " ");

  const shape = pptx.ShapeType ?? {};
  const rect = shape.rect ?? "rect";
  const line = shape.line ?? "line";
  const coverImage = await imageToDataUri(data.backgroundUrl).catch(() => null);

  addCoverSlide(pptx.addSlide(), rect, data, coverImage);
  addContextSlide(pptx.addSlide(), rect, line, data);
  addQuestionsSlide(pptx.addSlide(), rect, line, data);
  addDividerSlide(pptx.addSlide(), rect, data);
  addAgendaSlide(pptx.addSlide(), rect, line, data);
  addSummarySlide(pptx.addSlide(), rect, line, data);

  await pptx.writeFile({ fileName: "matters-deck.pptx", compression: true });
}

export function buildDeckGoogleSlidesPrompt(data: DeckSlideData): string {
  return `Matters Studio Google Slides handoff

Goal
- Import matters-deck.pptx into Google Slides.
- Preserve the 16:9 layout, title hierarchy, black/white editorial surfaces, purple section codes, and lime highlight accents.

Deck metadata
- Event: ${data.eventName}
- Topic: ${data.topic}
- Organizer: ${data.organizer}
- Supporter: ${data.supporter}

Recommended checks after import
- Cover: title stays in the left safe area; generated artwork stays on the right.
- Body slides: no text overlaps the Matters Lab footer mark.
- Agenda: time, content, minutes stay in three columns.
- Fonts: prefer Noto Serif TC for titles and Noto Sans TC for body text.
`;
}

export function downloadDeckHandoff(data: DeckSlideData, prompt: string, html: string): void {
  const body = `# Matters Studio Deck Handoff

## Use Case

Turn this generated Matters deck into a polished Google Slides or PowerPoint file.

## Design Rules

- 16:9 format.
- Cover image belongs to the right side only; left side is a text-safe area.
- Use black/white editorial surfaces, serif Chinese titles, purple section codes, and lime highlight accents.
- Interior slides should prioritize hierarchy and spacing over decorative backgrounds.

## Image Prompt

\`\`\`text
${prompt}
\`\`\`

## Deck Data

\`\`\`json
${JSON.stringify(data, null, 2)}
\`\`\`

## Google Slides Import Notes

${buildDeckGoogleSlidesPrompt(data)}

## Generated HTML

\`\`\`html
${html}
\`\`\`
`;

  downloadTextFile(body, "matters-deck-agent-handoff.md", "text/markdown");
}

function addCoverSlide(
  slide: PptxSlide,
  rect: unknown,
  data: DeckSlideData,
  coverImage: string | null
): void {
  slide.background = { color: WHITE };
  if (coverImage) {
    slide.addImage({ data: coverImage, x: 7.25, y: 0, w: 6.08, h: SLIDE_H });
  } else {
    slide.addShape(rect, {
      x: 7.25,
      y: 0,
      w: 6.08,
      h: SLIDE_H,
      fill: { color: "F5F3FF" },
      line: { color: "F5F3FF", transparency: 100 },
    });
  }
  slide.addShape(rect, {
    x: 0,
    y: 0,
    w: 7.55,
    h: SLIDE_H,
    fill: { color: WHITE },
    line: { color: WHITE, transparency: 100 },
  });
  slide.addShape(rect, {
    x: 7.1,
    y: 0,
    w: 0.08,
    h: SLIDE_H,
    fill: { color: PURPLE },
    line: { color: PURPLE, transparency: 100 },
  });
  slide.addText(data.eventName.toUpperCase(), textOpts(0.84, 0.62, 6.1, 0.3, 11, PURPLE, true));
  slide.addText(data.title, {
    ...textOpts(0.84, 1.24, 6.25, 2.2, 36, BLACK, true),
    fontFace: "Noto Serif TC",
    breakLine: false,
    fit: "shrink",
  });
  slide.addText(data.subtitle, textOpts(0.84, 3.7, 5.85, 0.72, 17, MUTED, false));

  const footerY = 6.15;
  addMeta(slide, "支持單位", data.supporter, 0.84, footerY);
  addMeta(slide, "提案單位", data.organizer, 2.86, footerY);
  addMeta(slide, "子題", data.topic, 4.86, footerY);
  addBrand(slide, "01");
}

function addContextSlide(
  slide: PptxSlide,
  rect: unknown,
  line: unknown,
  data: DeckSlideData
): void {
  baseSlide(slide, rect, line, "02", "Context");
  slide.addText("為什麼是這個題目", titleOpts());
  slide.addShape(rect, {
    x: 0.84,
    y: 2.15,
    w: 0.72,
    h: 0.05,
    fill: { color: PURPLE },
    line: { color: PURPLE, transparency: 100 },
  });
  slide.addShape(rect, {
    x: 0.84,
    y: 2.55,
    w: 10.4,
    h: 2.35,
    fill: { color: SOFT },
    line: { color: SOFT, transparency: 100 },
  });
  slide.addShape(rect, {
    x: 0.84,
    y: 2.55,
    w: 0.08,
    h: 2.35,
    fill: { color: PURPLE },
    line: { color: PURPLE, transparency: 100 },
  });
  slide.addText(data.thesis, textOpts(1.2, 2.85, 9.55, 1.72, 20, INK, false));
}

function addQuestionsSlide(
  slide: PptxSlide,
  rect: unknown,
  line: unknown,
  data: DeckSlideData
): void {
  baseSlide(slide, rect, line, "03", "Questions");
  slide.addText("三個核心問題", titleOpts());
  splitLines(data.coreQuestions)
    .slice(0, 3)
    .forEach((item, index) => {
      const y = 2.1 + index * 1.32;
      slide.addText(String(index + 1).padStart(2, "0"), {
        ...textOpts(0.84, y - 0.06, 0.58, 0.42, 21, PURPLE, true),
        fontFace: "Noto Serif TC",
      });
      slide.addText(item, textOpts(1.62, y, 9.35, 0.82, 19, INK, false));
    });
}

function addDividerSlide(slide: PptxSlide, rect: unknown, data: DeckSlideData): void {
  slide.background = { color: BLACK };
  slide.addShape(rect, {
    x: 0,
    y: 0,
    w: SLIDE_W,
    h: SLIDE_H,
    fill: { color: BLACK },
    line: { color: BLACK, transparency: 100 },
  });
  slide.addText("01", {
    ...textOpts(0.84, 1.25, 2.2, 1.15, 68, NEON, true),
    fontFace: "Noto Serif TC",
  });
  slide.addText("SECTION ONE", textOpts(0.94, 2.58, 3.2, 0.32, 10, NEON, true));
  slide.addText(data.topic || "共同問題意識", {
    ...textOpts(0.84, 3.1, 9.4, 1.1, 36, WHITE, true),
    fontFace: "Noto Serif TC",
  });
  slide.addText(data.subtitle, textOpts(0.84, 4.42, 8.1, 0.75, 17, "BDBDBD", false));
  slide.addText("Matters Lab", textOpts(11.35, 6.88, 1.1, 0.2, 8, "BDBDBD", true));
}

function addAgendaSlide(slide: PptxSlide, rect: unknown, line: unknown, data: DeckSlideData): void {
  baseSlide(slide, rect, line, "04", "Agenda");
  slide.addText("議程與時間分配", titleOpts());
  slide.addShape(line, {
    x: 0.84,
    y: 2.06,
    w: 10.8,
    h: 0,
    line: { color: INK, width: 1.4 },
  });
  const rows = splitLines(data.agenda).slice(0, 7);
  rows.forEach((row, index) => {
    const [time = "", what = row, minutes = ""] = row.split("|").map((item) => item.trim());
    const y = 2.32 + index * 0.56;
    slide.addText(time, textOpts(0.98, y, 1.52, 0.28, 10, MUTED, false));
    slide.addText(what, textOpts(2.72, y, 6.8, 0.34, 14, INK, false));
    slide.addText(minutes, {
      ...textOpts(10.1, y, 0.72, 0.28, 12, BLACK, true),
      align: "right",
    });
    slide.addShape(line, {
      x: 0.84,
      y: y + 0.42,
      w: 10.8,
      h: 0,
      line: { color: RULE, width: 0.7 },
    });
  });
}

function addSummarySlide(
  slide: PptxSlide,
  rect: unknown,
  line: unknown,
  data: DeckSlideData
): void {
  baseSlide(slide, rect, line, "05", "Summary");
  slide.addText("三句話總結", titleOpts());
  splitLines(data.closingLines)
    .slice(0, 3)
    .forEach((item, index) => {
      const y = 2.12 + index * 1.32;
      slide.addText(String(index + 1), {
        ...textOpts(0.84, y - 0.06, 0.56, 0.58, 34, PURPLE, true),
        fontFace: "Noto Serif TC",
      });
      slide.addText(item, textOpts(1.72, y, 8.8, 0.62, 20, INK, false));
      slide.addShape(line, {
        x: 0.84,
        y: y + 0.82,
        w: 10.2,
        h: 0,
        line: { color: RULE, width: 0.7 },
      });
    });
}

function baseSlide(
  slide: PptxSlide,
  rect: unknown,
  line: unknown,
  num: string,
  label: string
): void {
  slide.background = { color: WHITE };
  slide.addShape(rect, {
    x: 0,
    y: 0,
    w: SLIDE_W,
    h: SLIDE_H,
    fill: { color: WHITE },
    line: { color: WHITE, transparency: 100 },
  });
  slide.addShape(rect, {
    x: 0.84,
    y: 0.68,
    w: 0.36,
    h: 0.24,
    fill: { color: NEON },
    line: { color: NEON, transparency: 100 },
  });
  slide.addText(num, textOpts(0.91, 0.7, 0.28, 0.18, 8, INK, true));
  slide.addText(label.toUpperCase(), textOpts(1.36, 0.69, 2.3, 0.24, 10, PURPLE, true));
  addBrand(slide, num);
  slide.addShape(line, {
    x: 0.84,
    y: 6.74,
    w: 10.8,
    h: 0,
    line: { color: RULE, width: 0.6 },
  });
}

function addMeta(slide: PptxSlide, label: string, value: string, x: number, y: number): void {
  slide.addText(label, textOpts(x, y, 1.55, 0.22, 8, MUTED, true));
  slide.addText(value, textOpts(x, y + 0.28, 1.68, 0.45, 11, INK, false));
}

function addBrand(slide: PptxSlide, num: string): void {
  slide.addText("Matters Lab", textOpts(11.38, 6.92, 1.18, 0.18, 8, MUTED, true));
  slide.addText(num, textOpts(12.58, 6.92, 0.28, 0.18, 8, MUTED, true));
}

function titleOpts(): Record<string, unknown> {
  return {
    ...textOpts(0.84, 1.18, 8.6, 0.72, 29, BLACK, true),
    fit: "shrink",
  };
}

function textOpts(
  x: number,
  y: number,
  w: number,
  h: number,
  fontSize: number,
  color: string,
  bold: boolean
): Record<string, unknown> {
  return {
    x,
    y,
    w,
    h,
    margin: 0,
    fontFace: "Noto Sans TC",
    fontSize,
    color,
    bold,
    breakLine: false,
    valign: "top",
    fit: "shrink",
  };
}

function splitLines(input: string): string[] {
  return input
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);
}

async function imageToDataUri(url: string): Promise<string> {
  if (!url) throw new Error("missing image URL");
  const res = await fetch(url);
  if (!res.ok) throw new Error(`failed to fetch image ${res.status}`);
  const blob = await res.blob();
  return await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error("failed to read image"));
    reader.readAsDataURL(blob);
  });
}
