import { useMemo, useRef, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";

import { Button } from "../components/Button";
import { TextField } from "../components/TextField";
import { useToast } from "../components/Toast";
import { ApiError, downloadTextFile, generateBackground } from "../lib/api";
import { BACKGROUND_URLS } from "../lib/render-preview";
import { buildLandingHtml, type LandingData } from "../lib/render-landing-preview";

import styles from "./landing-builder.module.css";

export const Route = createFileRoute("/landing-builder")({
  component: LandingBuilderPage,
});

const DEFAULT_LANDING: LandingData = {
  eyebrow: "Matters Lab Event",
  title: "平台治理與公共網路的下一步",
  deck: "以工作坊、公開討論與後續報告，把技術、政策、社群治理放回同一張桌上。",
  dateLine: "2026.06 · Taipei / Online",
  locationLine: "Matters Town",
  cta: "報名活動",
  ctaUrl: "https://matters.town",
  sections:
    "活動重點 | 從案例出發，討論平台透明度、治理工具與使用者權利。\n適合對象 | 社群平台、公共政策、開源技術與數位權利工作者。\n產出形式 | 活動紀錄、公開報告、可延伸的工作坊材料。",
  backgroundUrl: BACKGROUND_URLS["1"],
};

function LandingBuilderPage() {
  const toast = useToast();
  const generatedBackgroundUrlRef = useRef<string | null>(null);
  const [form, setForm] = useState<LandingData>(DEFAULT_LANDING);
  const [prompt, setPrompt] = useState(
    "Text-free hero background for a Matters Lab event landing page. Public digital commons, civic workshop, calm editorial composition, purple and lime accents, clean left text-safe area, no readable text, no logo."
  );
  const html = useMemo(() => buildLandingHtml(form), [form]);
  const update = (patch: Partial<LandingData>) => setForm((prev) => ({ ...prev, ...patch }));

  const generateMutation = useMutation({
    mutationFn: () =>
      generateBackground({
        brief: prompt,
        categoryId: "landing-builder",
        textSafeArea: "left side safe area for hero headline and CTA",
        size: "1536x1024",
        quality: "auto",
      }),
    onSuccess: (blob) => {
      const url = URL.createObjectURL(blob);
      if (generatedBackgroundUrlRef.current) URL.revokeObjectURL(generatedBackgroundUrlRef.current);
      generatedBackgroundUrlRef.current = url;
      update({ backgroundUrl: url });
      toast.show({ text: "活動頁底圖已生成", variant: "positive" });
    },
    onError: (err) => {
      const msg = err instanceof ApiError ? `底圖生成失敗 (${err.status})` : "底圖生成失敗";
      toast.show({ text: msg, variant: "negative" });
    },
  });

  const download = () => {
    downloadTextFile(html, "matters-landing.html");
    toast.show({ text: "活動頁 HTML 已下載", variant: "positive" });
  };

  return (
    <section className={styles.page}>
      <header className={styles.pageHeader}>
        <Link to="/" className={styles.back}>
          ← 回到 Studio
        </Link>
        <h1 className={styles.title}>活動頁</h1>
        <p className={styles.lede}>
          產生 Matters 活動 landing HTML。第一屏保留品牌、活動主張、時間地點與
          CTA，下面接可掃讀的內容區段。
        </p>
      </header>

      <div className={styles.layout}>
        <div className={styles.formCol}>
          <section className={styles.fieldStack}>
            <h2 className={styles.sectionTitle}>1. Hero</h2>
            <div className={styles.twoCol}>
              <TextField
                label="分類標籤"
                value={form.eyebrow}
                onChange={(event) => update({ eyebrow: event.target.value })}
              />
              <TextField
                label="CTA"
                value={form.cta}
                onChange={(event) => update({ cta: event.target.value })}
              />
            </div>
            <TextField
              multiline
              rows={3}
              label="主標"
              value={form.title}
              onChange={(event) => update({ title: event.target.value })}
            />
            <TextField
              multiline
              rows={3}
              label="副標"
              value={form.deck}
              onChange={(event) => update({ deck: event.target.value })}
            />
            <div className={styles.twoCol}>
              <TextField
                label="日期"
                value={form.dateLine}
                onChange={(event) => update({ dateLine: event.target.value })}
              />
              <TextField
                label="地點 / 平台"
                value={form.locationLine}
                onChange={(event) => update({ locationLine: event.target.value })}
              />
            </div>
            <TextField
              label="CTA URL"
              value={form.ctaUrl}
              onChange={(event) => update({ ctaUrl: event.target.value })}
            />
          </section>

          <section className={styles.fieldStack}>
            <h2 className={styles.sectionTitle}>2. 內容區段</h2>
            <TextField
              multiline
              rows={6}
              label="區段"
              value={form.sections}
              onChange={(event) => update({ sections: event.target.value })}
            />
          </section>

          <section className={styles.fieldStack}>
            <h2 className={styles.sectionTitle}>3. Hero 底圖</h2>
            <div className={styles.selectorGrid}>
              {(["1", "2", "4", "5"] as const).map((id) => (
                <button
                  key={id}
                  type="button"
                  className={styles.selector}
                  onClick={() => update({ backgroundUrl: BACKGROUND_URLS[id] })}
                >
                  <span className={styles.selectorTitle}>範例底圖 {id}</span>
                  <span className={styles.selectorMeta}>套用在第一屏</span>
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
                生成 Hero 底圖
              </Button>
            </div>
          </section>
        </div>

        <aside className={styles.previewCol}>
          <div className={styles.previewLabel}>預覽 (desktop, 50%)</div>
          <div className={styles.previewFrame}>
            <iframe title="活動頁預覽" srcDoc={html} className={styles.previewIframe} />
          </div>
          <section className={styles.panel}>
            <h2 className={styles.sectionTitle}>設計建議</h2>
            <ul className={styles.hintList}>
              <li>Landing 第一屏可以用生圖，但文字層要回到 DS token 與可讀安全區。</li>
              <li>不要把活動頁做成行銷卡片牆；資訊要以報名決策順序排列。</li>
              <li>下一步可加表單嵌入、Speaker 模組、agenda 模組與一鍵部署。</li>
            </ul>
          </section>
          <div className={styles.actions}>
            <Button variant="primary" size="large" onClick={download}>
              下載 HTML
            </Button>
          </div>
        </aside>
      </div>
    </section>
  );
}
