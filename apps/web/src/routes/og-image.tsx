import { useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";

import { Button } from "../components/Button";
import { TextField } from "../components/TextField";
import { Dialog } from "../components/Dialog";
import { useToast } from "../components/Toast";

import { ApiError, downloadBlob, renderImage, suggestTitle, type OgImageData } from "../lib/api";
import { renderClientFallback } from "../lib/render-fallback";
import { buildPreviewHtml, DEFAULT_OG_DATA } from "../lib/render-preview";
import { RENDER_FALLBACK } from "../lib/env";

import styles from "./og-image.module.css";

export const Route = createFileRoute("/og-image")({
  component: OgImagePage,
});

const DEBOUNCE_MS = 300;

function useDebounced<T>(value: T, delayMs: number): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = window.setTimeout(() => setV(value), delayMs);
    return () => window.clearTimeout(t);
  }, [value, delayMs]);
  return v;
}

function OgImagePage() {
  const [form, setForm] = useState<OgImageData>(DEFAULT_OG_DATA);
  const [suggestionOpen, setSuggestionOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const toast = useToast();
  // Owned here (not in PreviewColumn) so the client-side fallback can read
  // iframe.contentDocument when the user clicks "下載 PNG".
  const previewIframeRef = useRef<HTMLIFrameElement | null>(null);

  // Debounce form before re-rendering the preview iframe.
  const debouncedForm = useDebounced(form, DEBOUNCE_MS);
  const previewSrcDoc = useMemo(() => buildPreviewHtml(debouncedForm), [debouncedForm]);

  const update = (patch: Partial<OgImageData>) => setForm((prev) => ({ ...prev, ...patch }));

  const renderMutation = useMutation({
    mutationFn: async () => {
      // Client-side fallback: rasterize the live preview iframe via
      // html-to-image. Used when the server-side renderer (Playwright on
      // Fly/CF Browser Rendering) isn't deployed yet — see Phase 9.1 README.
      if (RENDER_FALLBACK) {
        const iframe = previewIframeRef.current;
        if (!iframe) throw new ApiError("preview iframe not mounted", 0, null);
        return renderClientFallback(iframe, { width: 1200, height: 630, pixelRatio: 2 });
      }
      return renderImage({ template: "og-image", data: form, scale: 2 });
    },
    onSuccess: (blob) => {
      downloadBlob(blob, `matters-og-${Date.now()}.png`);
      toast.show({ text: "下載成功", variant: "positive" });
    },
    onError: (err) => {
      const msg = err instanceof ApiError ? `下載失敗 (${err.status})` : "下載失敗，請稍後再試";
      toast.show({ text: msg, variant: "negative" });
    },
  });

  const suggestMutation = useMutation({
    mutationFn: () =>
      suggestTitle({
        currentTitle: form.title,
        summary: form.summary,
        tag: form.tag,
        topic: form.topic,
      }),
    onSuccess: (res) => {
      setSuggestions(res.suggestions);
      setSuggestionOpen(true);
    },
    onError: (err) => {
      const msg = err instanceof ApiError ? `AI 建議出錯 (${err.status})` : "AI 建議出錯";
      toast.show({ text: msg, variant: "negative" });
    },
  });

  const handleReset = () => setForm(DEFAULT_OG_DATA);

  const handlePickSuggestion = (title: string) => {
    update({ title });
    setSuggestionOpen(false);
  };

  return (
    <section className={styles.page}>
      <header className={styles.pageHeader}>
        <div>
          <Link to="/" className={styles.back}>
            ← 回到 Studio
          </Link>
          <h1 className={styles.title}>OG 圖</h1>
          <p className={styles.lede}>填表 → 即時預覽 → 下載 PNG。輸出尺寸 1200×630。</p>
        </div>
      </header>

      <div className={styles.layout}>
        <FormColumn
          form={form}
          onChange={update}
          onSuggestTitle={() => suggestMutation.mutate()}
          isSuggesting={suggestMutation.isPending}
        />

        <PreviewColumn srcDoc={previewSrcDoc} iframeRef={previewIframeRef} />
      </div>

      <footer className={styles.actions}>
        <Button
          variant="primary"
          size="large"
          loading={renderMutation.isPending}
          onClick={() => renderMutation.mutate()}
        >
          下載 PNG
        </Button>
        <Button variant="secondary" size="large" onClick={handleReset}>
          重新填寫
        </Button>
      </footer>

      <SuggestionDialog
        open={suggestionOpen}
        onClose={() => setSuggestionOpen(false)}
        suggestions={suggestions}
        onPick={handlePickSuggestion}
      />
    </section>
  );
}

interface FormColumnProps {
  form: OgImageData;
  onChange: (patch: Partial<OgImageData>) => void;
  onSuggestTitle: () => void;
  isSuggesting: boolean;
}

function FormColumn({ form, onChange, onSuggestTitle, isSuggesting }: FormColumnProps) {
  return (
    <div className={styles.formCol}>
      <div className={styles.row}>
        <TextField
          label="標籤 (Tag)"
          helperText="建議 ≤ 4 字。例如「創作」、「議題」。"
          value={form.tag}
          onChange={(e) => onChange({ tag: e.target.value })}
        />
        <TextField
          label="主題 (Topic)"
          helperText="可選。例如「深度長文」。"
          value={form.topic}
          onChange={(e) => onChange({ topic: e.target.value })}
        />
      </div>

      <div className={styles.titleField}>
        <div className={styles.titleLabelRow}>
          <span className={styles.titleLabel}>標題</span>
          <button
            type="button"
            className={styles.aiButton}
            onClick={onSuggestTitle}
            disabled={isSuggesting}
            aria-label="AI 建議標題"
          >
            {isSuggesting ? "思考中…" : "✨ AI 建議"}
          </button>
        </div>
        <TextField
          labelHidden
          label="標題"
          value={form.title}
          onChange={(e) => onChange({ title: e.target.value })}
        />
      </div>

      <TextField
        multiline
        label="摘要 (Summary)"
        rows={3}
        value={form.summary}
        onChange={(e) => onChange({ summary: e.target.value })}
      />

      <div className={styles.row}>
        <TextField
          label="作者名稱"
          value={form.authorName}
          onChange={(e) => onChange({ authorName: e.target.value })}
        />
        <TextField
          label="作者帳號"
          helperText="不含 @。"
          value={form.authorHandle}
          onChange={(e) => onChange({ authorHandle: e.target.value })}
        />
      </div>

      <TextField
        label="作者頭像 URL"
        helperText="貼上公開可存取的 https URL。"
        value={form.authorAvatarUrl}
        onChange={(e) => onChange({ authorAvatarUrl: e.target.value })}
      />
    </div>
  );
}

interface PreviewColumnProps {
  srcDoc: string;
  iframeRef: React.RefObject<HTMLIFrameElement | null>;
}

function PreviewColumn({ srcDoc, iframeRef }: PreviewColumnProps) {
  return (
    <div className={styles.previewCol}>
      <div className={styles.previewLabel}>預覽 (1200×630, 50%)</div>
      <div className={styles.previewFrame}>
        <iframe
          ref={iframeRef}
          title="OG 預覽"
          srcDoc={srcDoc}
          className={styles.previewIframe}
          sandbox="allow-same-origin"
        />
      </div>
    </div>
  );
}

interface SuggestionDialogProps {
  open: boolean;
  onClose: () => void;
  suggestions: string[];
  onPick: (title: string) => void;
}

function SuggestionDialog({ open, onClose, suggestions, onPick }: SuggestionDialogProps) {
  return (
    <Dialog open={open} onClose={onClose} size="medium">
      <Dialog.Title>AI 建議標題</Dialog.Title>
      <Dialog.Body>
        {suggestions.length === 0 ? (
          <p>沒有建議。</p>
        ) : (
          <ul className={styles.suggestionList}>
            {suggestions.map((s, i) => (
              <li key={i}>
                <button type="button" className={styles.suggestionItem} onClick={() => onPick(s)}>
                  {s}
                </button>
              </li>
            ))}
          </ul>
        )}
      </Dialog.Body>
      <Dialog.Actions>
        <Button variant="tertiary" onClick={onClose}>
          取消
        </Button>
      </Dialog.Actions>
    </Dialog>
  );
}
