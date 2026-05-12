import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";

import { Button } from "../components/Button";
import { TextField } from "../components/TextField";
import { useToast } from "../components/Toast";
import {
  ApiError,
  blobToDataUrl,
  downloadTextFile,
  generateBackground,
  type GenerateBackgroundRequest,
} from "../lib/api";
import { downloadDeckHandoff, downloadDeckPptx, openDeckPdf } from "../lib/export-deck";
import { BACKGROUND_URLS } from "../lib/render-preview";
import { buildDeckHtml, type DeckSlideData } from "../lib/render-deck-preview";

import styles from "./deck-builder.module.css";

export const Route = createFileRoute("/deck-builder")({
  component: DeckBuilderPage,
});

const DEFAULT_DECK: DeckSlideData = {
  title: "平台使用者是商品、\n是消費者，還是公民？",
  subtitle: "實踐平台審查演算法開源與其中的治理難題",
  eventName: "TWIGF 2026",
  supporter: "TWNIC 網路社群計畫",
  organizer: "Matters Lab",
  topic: "資料商品化與人權保障",
  thesis:
    "主流社群平台用演算法決定言論的可見度，但決策邏輯被視為商業機密，使用者被下架也無從理解、無從救濟。",
  coreQuestions:
    "內容治理的權力結構如何影響使用者權利與公共利益？\n公開審查演算法後，要怎樣建立可被公民理解與檢驗的透明度？\n高風險群體如何在防詐、反操弄、反暴力與表意自由之間找出方案？",
  agenda:
    "00:00 – 02:00 | 主持人開場 | 2\n02:00 – 14:00 | 問題意識與平台脈絡 | 12\n14:00 – 35:00 | 講者案例與方法 | 21\n35:00 – 57:00 | 開放 Q&A | 22\n57:00 – 60:00 | 結語與後續產出 | 3",
  closingLines:
    "平台治理的戰場是可見度與程序。\n開源演算法不是目的，讓治理可被理解才是目的。\n平台同時是治理者也是被治理者。",
  backgroundUrl: BACKGROUND_URLS["5"],
};

function DeckBuilderPage() {
  const toast = useToast();
  const [form, setForm] = useState<DeckSlideData>(DEFAULT_DECK);
  const [exportMode, setExportMode] = useState<"pptx" | "google" | null>(null);
  const [prompt, setPrompt] = useState(
    "Text-free cover background for a Matters Lab policy workshop deck. Abstract public digital governance, civic conversation, transparent algorithmic systems, purple and lime accents, clean left text safe area, no readable text, no logo."
  );
  const html = useMemo(() => buildDeckHtml(form), [form]);
  const update = (patch: Partial<DeckSlideData>) => setForm((prev) => ({ ...prev, ...patch }));

  const generateMutation = useMutation({
    mutationFn: () =>
      generateBackground({
        brief: prompt,
        categoryId: "deck-builder",
        textSafeArea: "left side text-safe area for large Traditional Chinese deck title",
        size: "1536x1024" satisfies GenerateBackgroundRequest["size"],
        quality: "auto",
      }),
    onSuccess: async (blob) => {
      const url = await blobToDataUrl(blob);
      update({ backgroundUrl: url });
      toast.show({ text: "簡報封面底圖已生成", variant: "positive" });
    },
    onError: (err) => {
      const msg = err instanceof ApiError ? `底圖生成失敗 (${err.status})` : "底圖生成失敗";
      toast.show({ text: msg, variant: "negative" });
    },
  });

  const downloadHtml = () => {
    downloadTextFile(html, "matters-deck.html");
    toast.show({ text: "HTML 簡報已下載", variant: "positive" });
  };

  const exportPptx = async () => {
    setExportMode("pptx");
    try {
      await downloadDeckPptx(form);
      toast.show({ text: "PPTX 已下載", variant: "positive" });
    } catch {
      toast.show({ text: "PPTX 匯出失敗，請改用 HTML 或 PDF", variant: "negative" });
    } finally {
      setExportMode(null);
    }
  };

  const exportGoogleSlides = async () => {
    const googleWindow = window.open(
      "https://docs.google.com/presentation/u/0/create",
      "_blank",
      "noopener,noreferrer"
    );
    setExportMode("google");
    try {
      await downloadDeckPptx(form);
      googleWindow?.focus();
      toast.show({ text: "已下載 PPTX，並開啟 Google Slides 匯入入口", variant: "positive" });
    } catch {
      toast.show({ text: "Google Slides 交接失敗，請先下載 PPTX", variant: "negative" });
    } finally {
      setExportMode(null);
    }
  };

  const downloadHandoff = () => {
    downloadDeckHandoff(form, prompt, html);
    toast.show({ text: "簡報 agent handoff 已下載", variant: "positive" });
  };

  return (
    <section className={styles.page}>
      <header className={styles.pageHeader}>
        <Link to="/" className={styles.back}>
          ← 回到 Studio
        </Link>
        <h1 className={styles.title}>簡報</h1>
        <p className={styles.lede}>
          產生 16:9 Matters deck HTML。視覺取 TWIGF 2026 deck 的黑白版面、serif
          大標、紫色章節與螢光綠重點線。
        </p>
      </header>

      <div className={styles.layout}>
        <div className={styles.formCol}>
          <section className={styles.fieldStack}>
            <h2 className={styles.sectionTitle}>1. 封面</h2>
            <TextField
              multiline
              rows={3}
              label="主標"
              value={form.title}
              onChange={(event) => update({ title: event.target.value })}
            />
            <TextField
              multiline
              rows={2}
              label="副標"
              value={form.subtitle}
              onChange={(event) => update({ subtitle: event.target.value })}
            />
            <div className={styles.twoCol}>
              <TextField
                label="場次"
                value={form.eventName}
                onChange={(event) => update({ eventName: event.target.value })}
              />
              <TextField
                label="子題"
                value={form.topic}
                onChange={(event) => update({ topic: event.target.value })}
              />
            </div>
            <div className={styles.twoCol}>
              <TextField
                label="支持單位"
                value={form.supporter}
                onChange={(event) => update({ supporter: event.target.value })}
              />
              <TextField
                label="提案單位"
                value={form.organizer}
                onChange={(event) => update({ organizer: event.target.value })}
              />
            </div>
          </section>

          <section className={styles.fieldStack}>
            <h2 className={styles.sectionTitle}>2. 內容結構</h2>
            <TextField
              multiline
              rows={4}
              label="問題意識"
              value={form.thesis}
              onChange={(event) => update({ thesis: event.target.value })}
            />
            <TextField
              multiline
              rows={5}
              label="三個核心問題"
              value={form.coreQuestions}
              onChange={(event) => update({ coreQuestions: event.target.value })}
            />
            <TextField
              multiline
              rows={6}
              label="議程"
              value={form.agenda}
              onChange={(event) => update({ agenda: event.target.value })}
            />
            <TextField
              multiline
              rows={4}
              label="三句話總結"
              value={form.closingLines}
              onChange={(event) => update({ closingLines: event.target.value })}
            />
          </section>

          <section className={styles.fieldStack}>
            <h2 className={styles.sectionTitle}>3. 封面底圖</h2>
            <div className={styles.selectorGrid}>
              {(["1", "3", "5", "6"] as const).map((id) => (
                <button
                  key={id}
                  type="button"
                  className={styles.selector}
                  onClick={() => update({ backgroundUrl: BACKGROUND_URLS[id] })}
                >
                  <span className={styles.selectorTitle}>範例底圖 {id}</span>
                  <span className={styles.selectorMeta}>套用在封面右側</span>
                </button>
              ))}
            </div>
            <TextField
              multiline
              rows={4}
              label="OpenAI Image Prompt"
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
            />
            <div className={styles.actions}>
              <Button
                variant="secondary"
                loading={generateMutation.isPending}
                onClick={() => generateMutation.mutate()}
              >
                生成封面底圖
              </Button>
            </div>
          </section>
        </div>

        <aside className={styles.previewCol}>
          <div className={styles.previewLabel}>預覽 (1280×720, 50%)</div>
          <div className={styles.previewFrame}>
            <iframe title="簡報預覽" srcDoc={html} className={styles.previewIframe} />
          </div>
          <section className={styles.panel}>
            <h2 className={styles.sectionTitle}>設計與交付</h2>
            <ul className={styles.hintList}>
              <li>簡報比活動圖更適合嚴格黑白底、紫色章節碼與螢光綠重點線。</li>
              <li>封面可生圖，但內頁以資訊層級與留白為主，避免每頁都放背景圖。</li>
              <li>Google Slides 目前採 PPTX 匯入；真正直接寫入需要 Google OAuth。</li>
            </ul>
          </section>
          <section className={styles.panel}>
            <h2 className={styles.sectionTitle}>匯出</h2>
            <div className={styles.exportGrid}>
              <Button variant="secondary" onClick={() => openDeckPdf(html)}>
                匯出 PDF
              </Button>
              <Button variant="secondary" loading={exportMode === "pptx"} onClick={exportPptx}>
                匯出 PPTX
              </Button>
              <Button
                variant="secondary"
                loading={exportMode === "google"}
                onClick={exportGoogleSlides}
              >
                Google Slides
              </Button>
              <Button variant="secondary" onClick={downloadHandoff}>
                Agent handoff
              </Button>
            </div>
          </section>
          <div className={styles.actions}>
            <Button variant="primary" size="large" onClick={downloadHtml}>
              下載 HTML
            </Button>
          </div>
        </aside>
      </div>
    </section>
  );
}
