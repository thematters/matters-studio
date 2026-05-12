import { useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";

import { Button } from "../components/Button";
import { TextField } from "../components/TextField";
import { useToast } from "../components/Toast";
import catalogJson from "../brand-catalog/cc-branding-categories.json";
import {
  ApiError,
  downloadBlob,
  generateBackground,
  OG_BACKGROUND_IDS,
  type OgBackgroundId,
  type GenerateBackgroundRequest,
} from "../lib/api";
import { BACKGROUND_URLS } from "../lib/render-preview";
import { renderClientFallback } from "../lib/render-fallback";
import { buildCampaignPreviewHtml } from "../lib/render-campaign-preview";

import styles from "./create-visual.module.css";

export const Route = createFileRoute("/create-visual")({
  component: CreateVisualPage,
});

interface Catalog {
  categories: Category[];
  studioUseCases: StudioUseCase[];
}

interface Category {
  id: string;
  label: string;
  productLine: string;
  purpose: string;
  commonOutputSizes: Array<{ size: string; count: number }>;
  typography: { guidance: string[] };
  backgrounds: { guidance: string[] };
  studioWorkflow?: {
    inputs: string[];
    steps: string[];
    layoutRules: string[];
    prompt: string;
  } | null;
}

interface StudioUseCase {
  id: string;
  label: string;
  categories: string[];
  requiredInputs: string[];
  recommendedOutputs: string[];
}

interface VisualForm {
  kicker: string;
  headline: string;
  deck: string;
  cta: string;
  backgroundBrief: string;
  backgroundUrl: string;
}

const catalog = catalogJson as Catalog;

interface OutputOption {
  value: string;
  label: string;
  width: number;
  height: number;
  openAIImageSize: NonNullable<GenerateBackgroundRequest["size"]>;
  textSafeArea: string;
}

const BASE_FORM: VisualForm = {
  kicker: "Matters Campaign",
  headline: "讓背景交給模型，讓文字與版型回到設計系統",
  deck: "選分類、填欄位、產背景，再由 Matters Studio 套上字體、logo、安全區與排版。",
  cta: "matters.town",
  backgroundBrief: "",
  backgroundUrl: BACKGROUND_URLS["1"],
};

const CATEGORY_BACKGROUND: Record<string, OgBackgroundId> = {
  "matters-town-core": "3",
  "matters-town-quotes": "4",
  "matters-town-campaigns": "1",
  "matters-lab-social": "5",
  "freewrite-core": "2",
  "freewrite-seasonal": "3",
  "seven-day-book": "6",
  "the-space": "5",
  traveloggers: "3",
};

function CreateVisualPage() {
  const toast = useToast();
  const previewIframeRef = useRef<HTMLIFrameElement | null>(null);
  const previewWrapRef = useRef<HTMLDivElement | null>(null);
  const generatedBackgroundUrlRef = useRef<string | null>(null);
  const [previewMaxWidth, setPreviewMaxWidth] = useState(540);
  const [useCaseId, setUseCaseId] = useState(catalog.studioUseCases[0]?.id ?? "");
  const selectedUseCase = useMemo(
    () => catalog.studioUseCases.find((item) => item.id === useCaseId),
    [useCaseId]
  );
  const categoriesForUseCase = useMemo(
    () =>
      catalog.categories.filter((category) => selectedUseCase?.categories.includes(category.id)),
    [selectedUseCase]
  );
  const [categoryId, setCategoryId] = useState(
    () => categoriesForUseCase[0]?.id ?? catalog.categories[0]?.id ?? ""
  );
  const selectedCategory =
    categoriesForUseCase.find((category) => category.id === categoryId) ??
    categoriesForUseCase[0] ??
    catalog.categories[0];
  const outputOptions = useMemo(
    () => buildOutputOptions(selectedUseCase, selectedCategory),
    [selectedCategory, selectedUseCase]
  );
  const [outputSize, setOutputSize] = useState(() => outputOptions[0]?.value ?? "1080x1080");
  const selectedOutput =
    outputOptions.find((option) => option.value === outputSize) ??
    outputOptions[0] ??
    sizeToOutputOption("1080x1080");
  const [form, setForm] = useState<VisualForm>(() => ({
    ...BASE_FORM,
    kicker: kickerForCategory(selectedCategory),
    backgroundBrief: promptForCategory(selectedCategory),
    backgroundUrl: backgroundForCategory(selectedCategory),
  }));

  useEffect(() => {
    return () => {
      if (generatedBackgroundUrlRef.current) URL.revokeObjectURL(generatedBackgroundUrlRef.current);
    };
  }, []);

  useEffect(() => {
    const node = previewWrapRef.current;
    if (!node) return;

    const observer = new ResizeObserver(([entry]) => {
      setPreviewMaxWidth(Math.max(280, Math.floor(entry.contentRect.width)));
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const nextCategory = categoriesForUseCase[0];
    if (nextCategory && !categoriesForUseCase.some((category) => category.id === categoryId)) {
      setCategoryId(nextCategory.id);
      setForm((prev) => ({
        ...prev,
        kicker: kickerForCategory(nextCategory),
        backgroundBrief: promptForCategory(nextCategory),
        backgroundUrl: backgroundForCategory(nextCategory),
      }));
    }
  }, [categoriesForUseCase, categoryId]);

  useEffect(() => {
    if (outputOptions.some((option) => option.value === outputSize)) return;
    if (outputOptions[0]) setOutputSize(outputOptions[0].value);
  }, [outputOptions, outputSize]);

  const srcDoc = useMemo(
    () =>
      buildCampaignPreviewHtml({
        kicker: form.kicker,
        headline: form.headline,
        deck: form.deck,
        cta: form.cta,
        backgroundUrl: form.backgroundUrl,
        width: selectedOutput.width,
        height: selectedOutput.height,
        categoryId: selectedCategory?.id,
      }),
    [form, selectedCategory?.id, selectedOutput]
  );

  const update = (patch: Partial<VisualForm>) => setForm((prev) => ({ ...prev, ...patch }));
  const previewScale = Math.min(
    1,
    previewMaxWidth / selectedOutput.width,
    620 / selectedOutput.height
  );
  const previewWidth = Math.round(selectedOutput.width * previewScale);
  const previewHeight = Math.round(selectedOutput.height * previewScale);

  const setBackgroundUrl = (url: string) => {
    if (generatedBackgroundUrlRef.current && generatedBackgroundUrlRef.current !== url) {
      URL.revokeObjectURL(generatedBackgroundUrlRef.current);
      generatedBackgroundUrlRef.current = null;
    }
    update({ backgroundUrl: url });
  };

  const generateMutation = useMutation({
    mutationFn: () =>
      generateBackground({
        brief: form.backgroundBrief,
        categoryId: selectedCategory?.id,
        textSafeArea: selectedOutput.textSafeArea,
        size: selectedOutput.openAIImageSize,
        quality: "auto",
      }),
    onSuccess: (blob) => {
      const url = URL.createObjectURL(blob);
      if (generatedBackgroundUrlRef.current) URL.revokeObjectURL(generatedBackgroundUrlRef.current);
      generatedBackgroundUrlRef.current = url;
      update({ backgroundUrl: url });
      toast.show({ text: "背景已生成", variant: "positive" });
    },
    onError: (err) => {
      const msg = err instanceof ApiError ? `背景生成失敗 (${err.status})` : "背景生成失敗";
      toast.show({ text: msg, variant: "negative" });
    },
  });

  const downloadMutation = useMutation({
    mutationFn: async () => {
      const iframe = previewIframeRef.current;
      if (!iframe) throw new ApiError("preview iframe not mounted", 0, null);
      return renderClientFallback(iframe, {
        width: selectedOutput.width,
        height: selectedOutput.height,
        pixelRatio: 2,
      });
    },
    onSuccess: (blob) => {
      downloadBlob(
        blob,
        `matters-visual-${selectedCategory?.id ?? "custom"}-${selectedOutput.value}.png`
      );
      toast.show({ text: "下載成功", variant: "positive" });
    },
    onError: () => toast.show({ text: "下載失敗", variant: "negative" }),
  });

  const chooseUseCase = (id: string) => {
    setUseCaseId(id);
    const useCase = catalog.studioUseCases.find((item) => item.id === id);
    const nextCategory = catalog.categories.find((category) =>
      useCase?.categories.includes(category.id)
    );
    if (nextCategory) {
      setCategoryId(nextCategory.id);
      setForm((prev) => ({
        ...prev,
        kicker: kickerForCategory(nextCategory),
        backgroundBrief: promptForCategory(nextCategory),
        backgroundUrl: backgroundForCategory(nextCategory),
      }));
    }
    if (useCase?.recommendedOutputs[0]) setOutputSize(useCase.recommendedOutputs[0]);
  };

  const chooseCategory = (category: Category) => {
    setCategoryId(category.id);
    setForm((prev) => ({
      ...prev,
      kicker: kickerForCategory(category),
      backgroundBrief: promptForCategory(category),
      backgroundUrl: backgroundForCategory(category),
    }));
  };

  const resetForm = () => {
    setForm({
      ...BASE_FORM,
      kicker: kickerForCategory(selectedCategory),
      backgroundBrief: promptForCategory(selectedCategory),
      backgroundUrl: backgroundForCategory(selectedCategory),
    });
  };

  return (
    <section className={styles.page}>
      <header className={styles.pageHeader}>
        <Link to="/" className={styles.back}>
          ← 回到 Studio
        </Link>
        <h1 className={styles.title}>快速製圖</h1>
        <p className={styles.lede}>
          選需求與活動分類，Studio 會套用 CC & Branding 的尺寸、字型、底圖 prompt 與安全區規則。
        </p>
      </header>

      <div className={styles.layout}>
        <div className={styles.formCol}>
          <section>
            <h2 className={styles.sectionTitle}>1. 選製圖需求</h2>
            <div className={styles.selectorGrid}>
              {catalog.studioUseCases.map((useCase) => (
                <button
                  key={useCase.id}
                  type="button"
                  className={`${styles.selector} ${useCase.id === useCaseId ? styles.selectorActive : ""}`}
                  onClick={() => chooseUseCase(useCase.id)}
                >
                  <span className={styles.selectorTitle}>{useCase.label}</span>
                  <span className={styles.selectorMeta}>
                    {useCase.recommendedOutputs.join(" / ")}
                  </span>
                </button>
              ))}
            </div>
          </section>

          <section>
            <h2 className={styles.sectionTitle}>2. 選活動分類</h2>
            <div className={styles.selectorGrid}>
              {categoriesForUseCase.map((category) => (
                <button
                  key={category.id}
                  type="button"
                  className={`${styles.selector} ${
                    category.id === selectedCategory?.id ? styles.selectorActive : ""
                  }`}
                  onClick={() => chooseCategory(category)}
                >
                  <span className={styles.selectorTitle}>{category.label}</span>
                  <span className={styles.selectorMeta}>
                    {category.productLine} · {category.commonOutputSizes[0]?.size ?? "custom"}
                  </span>
                </button>
              ))}
            </div>
          </section>

          <section>
            <h2 className={styles.sectionTitle}>3. 選輸出尺寸</h2>
            <div className={styles.sizeGrid}>
              {outputOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  className={`${styles.selector} ${option.value === selectedOutput.value ? styles.selectorActive : ""}`}
                  onClick={() => setOutputSize(option.value)}
                >
                  <span className={styles.selectorTitle}>{option.label}</span>
                  <span className={styles.selectorMeta}>
                    底圖比例 {option.openAIImageSize} · {option.textSafeArea}
                  </span>
                </button>
              ))}
            </div>
          </section>

          <section className={styles.fieldStack}>
            <h2 className={styles.sectionTitle}>4. 填文案</h2>
            <TextField
              label="分類標籤"
              value={form.kicker}
              onChange={(e) => update({ kicker: e.target.value })}
            />
            <TextField
              label="主標"
              value={form.headline}
              onChange={(e) => update({ headline: e.target.value })}
            />
            <TextField
              multiline
              rows={3}
              label="副標 / 補充"
              value={form.deck}
              onChange={(e) => update({ deck: e.target.value })}
            />
            <TextField
              label="CTA"
              value={form.cta}
              onChange={(e) => update({ cta: e.target.value })}
            />
          </section>

          <section className={styles.fieldStack}>
            <h2 className={styles.sectionTitle}>5. 底圖</h2>
            <div className={styles.selectorGrid}>
              {OG_BACKGROUND_IDS.slice(0, 4).map((id) => (
                <button
                  key={id}
                  type="button"
                  className={styles.selector}
                  onClick={() => setBackgroundUrl(BACKGROUND_URLS[id])}
                >
                  <span className={styles.selectorTitle}>範例底圖 {id}</span>
                  <span className={styles.selectorMeta}>先用既有底圖快速試版</span>
                </button>
              ))}
            </div>
            <TextField
              multiline
              rows={5}
              label="OpenAI Image 2 Prompt"
              value={form.backgroundBrief}
              onChange={(e) => update({ backgroundBrief: e.target.value })}
            />
            <div className={styles.actions}>
              <Button
                variant="secondary"
                loading={generateMutation.isPending}
                onClick={() => generateMutation.mutate()}
              >
                生成底圖
              </Button>
            </div>
          </section>
        </div>

        <aside className={styles.previewCol}>
          <div ref={previewWrapRef}>
            <div className={styles.previewLabel}>
              預覽 ({selectedOutput.width}×{selectedOutput.height}, {Math.round(previewScale * 100)}
              %)
            </div>
            <div
              className={styles.previewFrame}
              style={{ width: `${previewWidth}px`, height: `${previewHeight}px` }}
            >
              <iframe
                ref={previewIframeRef}
                title="製圖預覽"
                srcDoc={srcDoc}
                className={styles.previewIframe}
                sandbox="allow-same-origin"
                style={{
                  width: `${selectedOutput.width}px`,
                  height: `${selectedOutput.height}px`,
                  transform: `scale(${previewScale})`,
                }}
              />
            </div>
          </div>

          <section className={styles.panel}>
            <h2 className={styles.sectionTitle}>此分類規則</h2>
            <ul className={styles.hintList}>
              {(
                selectedCategory?.studioWorkflow?.steps ??
                selectedCategory?.backgrounds.guidance ??
                []
              )
                .slice(0, 5)
                .map((item) => (
                  <li key={item}>{item}</li>
                ))}
            </ul>
          </section>

          <div className={styles.actions}>
            <Button
              variant="primary"
              size="large"
              loading={downloadMutation.isPending}
              onClick={() => downloadMutation.mutate()}
            >
              下載 PNG
            </Button>
            <Button variant="secondary" size="large" onClick={resetForm}>
              重新填寫
            </Button>
          </div>
        </aside>
      </div>
    </section>
  );
}

function promptForCategory(category?: Category): string {
  return (
    category?.studioWorkflow?.prompt ??
    "Create a text-free editorial background for Matters. Leave a clean safe area for Traditional Chinese title overlay. No readable text, no logo, no QR code."
  );
}

function backgroundForCategory(category?: Category): string {
  const id = category?.id ? CATEGORY_BACKGROUND[category.id] : undefined;
  return BACKGROUND_URLS[id ?? "1"];
}

function kickerForCategory(category?: Category): string {
  const labels: Record<string, string> = {
    "matters-town-core": "Matters.Town",
    "matters-town-quotes": "Matters Quote",
    "matters-town-campaigns": "Matters Campaign",
    "matters-lab-social": "Matters Lab",
    "freewrite-core": "自由寫",
    "freewrite-seasonal": "自由寫",
    "seven-day-book": "七日書",
    "the-space": "The Space",
    traveloggers: "Traveloggers",
  };
  return category?.id ? (labels[category.id] ?? BASE_FORM.kicker) : BASE_FORM.kicker;
}

function buildOutputOptions(
  useCase: StudioUseCase | undefined,
  category: Category | undefined
): OutputOption[] {
  const values = [
    ...(useCase?.recommendedOutputs ?? []),
    ...(category?.commonOutputSizes ?? []).map((item) => item.size),
    "1080x1080",
  ];
  const unique = [...new Set(values)].slice(0, 8);
  return unique.map(sizeToOutputOption);
}

function sizeToOutputOption(value: string): OutputOption {
  const [widthRaw, heightRaw] = value.split("x").map((item) => Number.parseInt(item, 10));
  const width = Number.isFinite(widthRaw) && widthRaw > 0 ? widthRaw : 1080;
  const height = Number.isFinite(heightRaw) && heightRaw > 0 ? heightRaw : 1080;
  const orientation = width === height ? "square" : width > height ? "landscape" : "portrait";
  const openAIImageSize: OutputOption["openAIImageSize"] =
    orientation === "square"
      ? "1024x1024"
      : orientation === "landscape"
        ? "1536x1024"
        : "1024x1536";
  const textSafeArea =
    orientation === "landscape"
      ? "left side safe area for Traditional Chinese headline and event metadata"
      : orientation === "portrait"
        ? "upper half safe area for Traditional Chinese headline"
        : "left or center safe area for Traditional Chinese headline";

  return {
    value: `${width}x${height}`,
    label: `${width}×${height}`,
    width,
    height,
    openAIImageSize,
    textSafeArea,
  };
}
