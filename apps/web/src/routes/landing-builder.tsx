import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";

import { Button } from "../components/Button";
import { TextField } from "../components/TextField";
import { useToast } from "../components/Toast";
import { ApiError, blobToDataUrl, downloadTextFile, generateBackground } from "../lib/api";
import {
  downloadLandingDeployBundle,
  downloadLandingHandoff,
  openCloudflareDeploy,
} from "../lib/export-landing";
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
  agenda:
    "14:00 – 14:10 | 開場與問題設定 | 對齊活動目標、討論範圍與預期產出。\n14:10 – 14:45 | 案例短講 | 從平台治理、演算法透明與社群自治案例切入。\n14:45 – 15:25 | Roundtable | 釐清技術、政策與使用者權利之間的實作難題。\n15:25 – 15:40 | 下一步 | 收斂後續報告、公開材料與社群回饋。",
  speakers:
    "Matters Lab | Host | 公共網路與平台治理\n社群研究者 | Speaker | 使用者權利與治理透明度\n開源技術夥伴 | Speaker | 可檢驗的治理工具與資料流程",
  formUrl: "https://matters.town",
  deploySlug: "matters-public-network-event",
  backgroundUrl: BACKGROUND_URLS["1"],
};

function LandingBuilderPage() {
  const toast = useToast();
  const [form, setForm] = useState<LandingData>(DEFAULT_LANDING);
  const [isBundling, setIsBundling] = useState(false);
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
    onSuccess: async (blob) => {
      const url = await blobToDataUrl(blob);
      update({ backgroundUrl: url });
      toast.show({ text: "活動頁底圖已生成", variant: "positive" });
    },
    onError: (err) => {
      const msg = err instanceof ApiError ? `底圖生成失敗 (${err.status})` : "底圖生成失敗";
      toast.show({ text: msg, variant: "negative" });
    },
  });

  const downloadHtml = () => {
    downloadTextFile(html, "matters-landing.html");
    toast.show({ text: "活動頁 HTML 已下載", variant: "positive" });
  };

  const downloadHandoff = () => {
    downloadLandingHandoff(form, prompt, html);
    toast.show({ text: "活動頁 agent handoff 已下載", variant: "positive" });
  };

  const downloadDeployBundle = async () => {
    setIsBundling(true);
    try {
      await downloadLandingDeployBundle(form, prompt, html);
      toast.show({ text: "部署包已下載", variant: "positive" });
    } catch {
      toast.show({ text: "部署包建立失敗，請先下載 HTML", variant: "negative" });
    } finally {
      setIsBundling(false);
    }
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
            <h2 className={styles.sectionTitle}>3. 活動模組</h2>
            <TextField
              multiline
              rows={5}
              label="Agenda"
              helperText="格式：Time | Title | Detail"
              value={form.agenda}
              onChange={(event) => update({ agenda: event.target.value })}
            />
            <TextField
              multiline
              rows={5}
              label="Speakers"
              helperText="格式：Name | Role | Topic"
              value={form.speakers}
              onChange={(event) => update({ speakers: event.target.value })}
            />
            <div className={styles.twoCol}>
              <TextField
                label="表單 URL"
                value={form.formUrl}
                onChange={(event) => update({ formUrl: event.target.value })}
              />
              <TextField
                label="部署 slug"
                value={form.deploySlug}
                onChange={(event) => update({ deploySlug: event.target.value })}
              />
            </div>
          </section>

          <section className={styles.fieldStack}>
            <h2 className={styles.sectionTitle}>4. Hero 底圖</h2>
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
            <h2 className={styles.sectionTitle}>設計與交付</h2>
            <ul className={styles.hintList}>
              <li>Landing 第一屏可以用生圖，但文字層要回到 DS token 與可讀安全區。</li>
              <li>不要把活動頁做成行銷卡片牆；資訊要以報名決策順序排列。</li>
              <li>交接包含 content JSON、agent brief、standalone HTML 與 Cloudflare 設定。</li>
            </ul>
          </section>
          <section className={styles.panel}>
            <h2 className={styles.sectionTitle}>Handoff / Deploy</h2>
            <div className={styles.exportGrid}>
              <Button variant="secondary" onClick={downloadHandoff}>
                Agent handoff
              </Button>
              <Button variant="secondary" loading={isBundling} onClick={downloadDeployBundle}>
                下載部署包
              </Button>
              <Button variant="secondary" onClick={openCloudflareDeploy}>
                開啟 Cloudflare
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
