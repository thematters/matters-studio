import { useMemo, useRef, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";

import { Button } from "../components/Button";
import { TextField } from "../components/TextField";
import { ApiError, downloadBlob } from "../lib/api";
import { renderClientFallback } from "../lib/render-fallback";
import { useToast } from "../components/Toast";

import styles from "./campaign-tools.module.css";

export const Route = createFileRoute("/campaign-tools")({
  component: CampaignToolsPage,
});

const GRAPHQL_ENDPOINT = "https://server.matters.town/graphql";
const USER_DATA_ENDPOINT = "https://user-data-api.matters.one";

type TemplateId = "annual-2022" | "thankyou-2023" | "identity-card" | "nomad-vote";

interface TemplateConfig {
  id: TemplateId;
  title: string;
  shortTitle: string;
  description: string;
  sourceRepo: string;
  sourceDeployment: string;
  width: number;
  height: number;
}

interface Profile {
  userName: string;
  displayName: string;
  description: string;
  walletAddress: string;
  hasNFTs: boolean;
}

interface AnnualStats {
  createdAt?: string;
  numReadings?: number;
  numWritings?: number;
  numDonatedArticles?: number;
  numAppreciatedArticles?: number;
  numFollowedAuthors?: number;
  numComments?: number;
}

interface CampaignForm {
  userName: string;
  displayName: string;
  description: string;
  thankYouText: string;
  aka: string;
  callForVoteText: string;
  campaignUrl: string;
  posterStyle: "green" | "gold" | "purple";
  yearKeywords: string;
  stats: AnnualStats;
  walletAddress: string;
  hasNFTs: boolean;
}

const TEMPLATES: TemplateConfig[] = [
  {
    id: "annual-2022",
    title: "2022 年度創作成就卡",
    shortTitle: "年度成就",
    description: "從年度資料 API 讀取 Matters 作者的創作、閱讀、互動統計，產出分享卡。",
    sourceRepo: "thematters/user-data-project-2022",
    sourceDeployment: "userdata-of-the-year-2022.matters.one",
    width: 1080,
    height: 1080,
  },
  {
    id: "thankyou-2023",
    title: "2023 致謝詞小卡",
    shortTitle: "致謝卡",
    description: "輸入 Matters ID 與 50 字內致謝詞，產出年末感謝卡。",
    sourceRepo: "thematters/thankyou-card",
    sourceDeployment: "thankyou-card-2023.matters.town",
    width: 1080,
    height: 1080,
  },
  {
    id: "identity-card",
    title: "Matters Identity Card",
    shortTitle: "身份卡",
    description: "把 Matters profile、簡介與錢包狀態整理成身份展示卡。",
    sourceRepo: "thematters/matters-identity",
    sourceDeployment: "identity.matters.town",
    width: 1080,
    height: 1080,
  },
  {
    id: "nomad-vote",
    title: "Nomad Matters 拉票海報",
    shortTitle: "拉票海報",
    description: "輸入提案連結與拉票文案，產出 2024 Nomad Matters 投票宣傳圖。",
    sourceRepo: "thematters/campaign-call-for-vote",
    sourceDeployment: "nomad-matters-call-for-vote.matters.town",
    width: 1080,
    height: 1350,
  },
];

const DEFAULT_FORM: CampaignForm = {
  userName: "matty",
  displayName: "Matty",
  description: "Matters.Town 作者",
  thankYouText: "謝謝過去一年仍然願意書寫、閱讀與回應的自己。",
  aka: "",
  callForVoteText: "邀請你為我的遊牧者提案投下關鍵一票。",
  campaignUrl: "https://matters.town",
  posterStyle: "green",
  yearKeywords: "Web3 Matters",
  stats: {
    numReadings: 12036,
    numWritings: 48,
    numDonatedArticles: 16,
    numAppreciatedArticles: 291,
    numFollowedAuthors: 87,
    numComments: 136,
  },
  walletAddress: "",
  hasNFTs: false,
};

function CampaignToolsPage() {
  const toast = useToast();
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const [templateId, setTemplateId] = useState<TemplateId>("thankyou-2023");
  const [form, setForm] = useState<CampaignForm>(DEFAULT_FORM);
  const selectedTemplate = TEMPLATES.find((template) => template.id === templateId) ?? TEMPLATES[0];
  const previewSrcDoc = useMemo(
    () => buildCampaignToolHtml(selectedTemplate, form),
    [selectedTemplate, form]
  );

  const update = (patch: Partial<CampaignForm>) => setForm((prev) => ({ ...prev, ...patch }));

  const profileMutation = useMutation({
    mutationFn: () => loadProfile(form.userName),
    onSuccess: (profile) => {
      update({
        displayName: profile.displayName,
        description: profile.description,
        walletAddress: profile.walletAddress,
        hasNFTs: profile.hasNFTs,
      });
      toast.show({ text: "已讀取 Matters profile", variant: "positive" });
    },
    onError: () => {
      toast.show({ text: "讀取 profile 失敗，請確認 Matters ID", variant: "negative" });
    },
  });

  const annualStatsMutation = useMutation({
    mutationFn: () => loadAnnualStats(form.userName),
    onSuccess: (stats) => {
      update({ stats });
      toast.show({ text: "已讀取年度資料", variant: "positive" });
    },
    onError: () => {
      toast.show({ text: "年度資料讀取失敗，已保留目前表單資料", variant: "negative" });
    },
  });

  const renderMutation = useMutation({
    mutationFn: async () => {
      const iframe = iframeRef.current;
      if (!iframe) throw new ApiError("preview iframe not mounted", 0, null);
      return renderClientFallback(iframe, {
        width: selectedTemplate.width,
        height: selectedTemplate.height,
        pixelRatio: 2,
      });
    },
    onSuccess: (blob) => {
      downloadBlob(blob, `matters-${selectedTemplate.id}-${Date.now()}.png`);
      toast.show({ text: "下載成功", variant: "positive" });
    },
    onError: () => {
      toast.show({ text: "下載失敗，請重新整理後再試", variant: "negative" });
    },
  });

  const previewScale = selectedTemplate.height > selectedTemplate.width ? 0.4 : 0.5;

  return (
    <section className={styles.page}>
      <header className={styles.pageHeader}>
        <div>
          <Link to="/" className={styles.back}>
            ← 回到 Studio
          </Link>
          <h1 className={styles.title}>活動模板</h1>
          <p className={styles.lede}>
            舊 Vercel 活動小站的 Studio 版本。選模板、填資料、預覽後下載 PNG。
          </p>
        </div>
      </header>

      <div className={styles.templateGrid} role="radiogroup" aria-label="選擇活動模板">
        {TEMPLATES.map((template) => {
          const selected = template.id === selectedTemplate.id;
          return (
            <button
              key={template.id}
              type="button"
              role="radio"
              aria-checked={selected}
              className={`${styles.templateButton} ${selected ? styles.templateButtonActive : ""}`}
              onClick={() => setTemplateId(template.id)}
            >
              <span className={styles.templateTitle}>{template.shortTitle}</span>
              <span className={styles.templateDesc}>{template.description}</span>
            </button>
          );
        })}
      </div>

      <div className={styles.layout}>
        <div className={styles.formCol}>
          <div className={styles.sourceBox}>
            <span>{selectedTemplate.title}</span>
            <small>
              來源：{selectedTemplate.sourceRepo} / {selectedTemplate.sourceDeployment}
            </small>
          </div>

          <div className={styles.inlineFields}>
            <TextField
              label="Matters ID"
              value={form.userName}
              onChange={(e) => update({ userName: normalizeUserName(e.target.value) })}
            />
            <Button
              variant="secondary"
              size="large"
              loading={profileMutation.isPending}
              onClick={() => profileMutation.mutate()}
            >
              讀取 profile
            </Button>
          </div>

          <TextField
            label="顯示名稱"
            value={form.displayName}
            onChange={(e) => update({ displayName: e.target.value })}
          />

          <TemplateFields
            templateId={selectedTemplate.id}
            form={form}
            onChange={update}
            onLoadAnnualStats={() => annualStatsMutation.mutate()}
            isLoadingAnnualStats={annualStatsMutation.isPending}
          />
        </div>

        <div className={styles.previewCol}>
          <div className={styles.previewLabel}>
            預覽 ({selectedTemplate.width}×{selectedTemplate.height})
          </div>
          <div
            className={styles.previewFrame}
            style={{
              width: selectedTemplate.width * previewScale,
              height: selectedTemplate.height * previewScale,
            }}
          >
            <iframe
              ref={iframeRef}
              title="活動模板預覽"
              srcDoc={previewSrcDoc}
              sandbox="allow-same-origin"
              className={styles.previewIframe}
              style={{
                width: selectedTemplate.width,
                height: selectedTemplate.height,
                transform: `scale(${previewScale})`,
              }}
            />
          </div>
        </div>
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
        <Button variant="secondary" size="large" onClick={() => setForm(DEFAULT_FORM)}>
          重設
        </Button>
      </footer>
    </section>
  );
}

interface TemplateFieldsProps {
  templateId: TemplateId;
  form: CampaignForm;
  onChange: (patch: Partial<CampaignForm>) => void;
  onLoadAnnualStats: () => void;
  isLoadingAnnualStats: boolean;
}

function TemplateFields({
  templateId,
  form,
  onChange,
  onLoadAnnualStats,
  isLoadingAnnualStats,
}: TemplateFieldsProps) {
  if (templateId === "annual-2022") {
    return (
      <>
        <div className={styles.inlineFields}>
          <TextField
            label="年度關鍵字"
            value={form.yearKeywords}
            onChange={(e) => onChange({ yearKeywords: e.target.value })}
          />
          <Button
            variant="secondary"
            size="large"
            loading={isLoadingAnnualStats}
            onClick={onLoadAnnualStats}
          >
            讀取年度資料
          </Button>
        </div>
        <div className={styles.statsGrid}>
          <NumberField
            label="閱讀數"
            value={form.stats.numReadings}
            onChange={(numReadings) => onChange({ stats: { ...form.stats, numReadings } })}
          />
          <NumberField
            label="文章數"
            value={form.stats.numWritings}
            onChange={(numWritings) => onChange({ stats: { ...form.stats, numWritings } })}
          />
          <NumberField
            label="贊助文章"
            value={form.stats.numDonatedArticles}
            onChange={(numDonatedArticles) =>
              onChange({ stats: { ...form.stats, numDonatedArticles } })
            }
          />
          <NumberField
            label="被讚賞文章"
            value={form.stats.numAppreciatedArticles}
            onChange={(numAppreciatedArticles) =>
              onChange({ stats: { ...form.stats, numAppreciatedArticles } })
            }
          />
          <NumberField
            label="追蹤作者"
            value={form.stats.numFollowedAuthors}
            onChange={(numFollowedAuthors) =>
              onChange({ stats: { ...form.stats, numFollowedAuthors } })
            }
          />
          <NumberField
            label="留言數"
            value={form.stats.numComments}
            onChange={(numComments) => onChange({ stats: { ...form.stats, numComments } })}
          />
        </div>
      </>
    );
  }

  if (templateId === "thankyou-2023") {
    return (
      <>
        <TextField
          label="致謝詞"
          multiline
          rows={3}
          maxLength={50}
          helperText={`${form.thankYouText.length}/50`}
          value={form.thankYouText}
          onChange={(e) => onChange({ thankYouText: e.target.value.slice(0, 50) })}
        />
        <TextField
          label="別名 / 補充署名"
          value={form.aka}
          onChange={(e) => onChange({ aka: e.target.value })}
        />
      </>
    );
  }

  if (templateId === "identity-card") {
    return (
      <>
        <TextField
          label="自我介紹"
          multiline
          rows={3}
          value={form.description}
          onChange={(e) => onChange({ description: e.target.value })}
        />
        <TextField
          label="錢包地址"
          value={form.walletAddress}
          onChange={(e) => onChange({ walletAddress: e.target.value })}
        />
        <label className={styles.checkboxRow}>
          <input
            type="checkbox"
            checked={form.hasNFTs}
            onChange={(e) => onChange({ hasNFTs: e.target.checked })}
          />
          <span>顯示 Traveloggers / NFT badge</span>
        </label>
      </>
    );
  }

  return (
    <>
      <TextField
        label="拉票文案"
        multiline
        rows={3}
        maxLength={42}
        helperText={`${form.callForVoteText.length}/42`}
        value={form.callForVoteText}
        onChange={(e) => onChange({ callForVoteText: e.target.value.slice(0, 42) })}
      />
      <TextField
        label="提案連結"
        value={form.campaignUrl}
        onChange={(e) => onChange({ campaignUrl: e.target.value })}
      />
      <div className={styles.segmented} role="radiogroup" aria-label="海報樣式">
        {[["green", "綠"] as const, ["gold", "金"] as const, ["purple", "紫"] as const].map(
          ([value, label]) => (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={form.posterStyle === value}
              className={`${styles.segment} ${form.posterStyle === value ? styles.segmentActive : ""}`}
              onClick={() => onChange({ posterStyle: value })}
            >
              {label}
            </button>
          )
        )}
      </div>
    </>
  );
}

function NumberField({
  label,
  value,
  onChange,
}: {
  label: string;
  value?: number;
  onChange: (value: number) => void;
}) {
  return (
    <TextField
      label={label}
      type="number"
      min={0}
      value={value ?? 0}
      onChange={(e) => onChange(Number(e.target.value) || 0)}
    />
  );
}

async function loadProfile(userName: string): Promise<Profile> {
  const cleanName = normalizeUserName(userName);
  const query = `query GetUserInfo($userName: String!) {
    user(input: { userName: $userName }) {
      userName
      displayName
      avatar
      info {
        description
        cryptoWallet {
          address
          hasNFTs
        }
      }
    }
  }`;

  const res = await fetch(GRAPHQL_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, variables: { userName: cleanName } }),
  });
  const json = (await res.json()) as {
    data?: {
      user?: {
        userName?: string;
        displayName?: string;
        info?: {
          description?: string;
          cryptoWallet?: { address?: string; hasNFTs?: boolean };
        };
      };
    };
    errors?: unknown[];
  };
  const user = json.data?.user;
  if (!res.ok || !user || json.errors?.length) {
    throw new Error("profile not found");
  }
  return {
    userName: user.userName ?? cleanName,
    displayName: user.displayName?.trim() || cleanName,
    description: user.info?.description?.trim() || "",
    walletAddress: user.info?.cryptoWallet?.address ?? "",
    hasNFTs: Boolean(user.info?.cryptoWallet?.hasNFTs),
  };
}

async function loadAnnualStats(userName: string): Promise<AnnualStats> {
  const cleanName = normalizeUserName(userName);
  const url = new URL(`${USER_DATA_ENDPOINT}/${cleanName}`);
  url.searchParams.set("year", "2022");
  const res = await fetch(url.toString(), { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error("annual stats not found");
  const json = (await res.json()) as { data?: AnnualStats } & AnnualStats;
  return json.data ?? json;
}

function buildCampaignToolHtml(template: TemplateConfig, form: CampaignForm): string {
  const displayName = form.displayName.trim() || form.userName || "Matters 作者";
  const userName = normalizeUserName(form.userName) || "matty";
  const initials = displayName.slice(0, 2).toUpperCase();
  const stats = form.stats;
  const style = posterStyle(form.posterStyle);
  const body = (() => {
    if (template.id === "annual-2022") {
      return `
        <div class="canvas annual">
          <div class="orbit orbit-a"></div>
          <div class="orbit orbit-b"></div>
          <header class="topbar">
            <div class="brandmark"></div>
            <div class="kicker">Matters.Town 2022</div>
          </header>
          <main class="annual-main">
            <p class="eyebrow">我的 ${escapeHtml(form.yearKeywords)} 創作成就</p>
            <h1>${escapeHtml(displayName)}</h1>
            <p class="meta">@${escapeHtml(userName)} 的年度回顧</p>
            <div class="stats">
              ${statCard("閱讀", stats.numReadings)}
              ${statCard("文章", stats.numWritings)}
              ${statCard("贊助文章", stats.numDonatedArticles)}
              ${statCard("被讚賞文章", stats.numAppreciatedArticles)}
              ${statCard("追蹤作者", stats.numFollowedAuthors)}
              ${statCard("留言", stats.numComments)}
            </div>
          </main>
          <footer class="foot">matters.town</footer>
        </div>`;
    }

    if (template.id === "thankyou-2023") {
      return `
        <div class="canvas thankyou">
          <div class="paper">
            <div class="stamp">2023</div>
            <p class="serif-title">給自己的致謝詞</p>
            <h1>${escapeHtml(form.thankYouText || DEFAULT_FORM.thankYouText)}</h1>
            <div class="author">
              <div class="avatar">${escapeHtml(initials)}</div>
              <div>
                <strong>${escapeHtml(displayName)}</strong>
                <span>@${escapeHtml(userName)}${form.aka ? ` / ${escapeHtml(form.aka)}` : ""}</span>
              </div>
            </div>
          </div>
          <footer class="foot">Matters.Town</footer>
        </div>`;
    }

    if (template.id === "identity-card") {
      return `
        <div class="canvas identity">
          <header class="identity-header">
            <div>
              <p>MATTERS IDENTITY</p>
              <h1>${escapeHtml(displayName)}</h1>
            </div>
            <div class="avatar large">${escapeHtml(initials)}</div>
          </header>
          <section class="identity-body">
            <div class="identity-row">
              <span>Handle</span>
              <strong>@${escapeHtml(userName)}</strong>
            </div>
            <div class="identity-row">
              <span>Profile</span>
              <strong>${escapeHtml(form.description || "Matters.Town 作者")}</strong>
            </div>
            <div class="identity-row">
              <span>Wallet</span>
              <strong>${escapeHtml(shortWallet(form.walletAddress) || "未連結")}</strong>
            </div>
          </section>
          <div class="badges">
            <span>Matters.Town</span>
            ${form.hasNFTs ? "<span>Traveloggers</span>" : "<span>Writer</span>"}
          </div>
          <footer class="foot">identity.matters.town</footer>
        </div>`;
    }

    return `
      <div class="canvas vote ${style.className}">
        <header class="vote-top">
          <div class="brandmark light"></div>
          <span>Nomad Matters</span>
        </header>
        <main class="vote-main">
          <p>邀請更多人為你的提案投票</p>
          <h1>${escapeHtml(form.callForVoteText || DEFAULT_FORM.callForVoteText)}</h1>
          <div class="proposal">
            <span>提案連結</span>
            <strong>${escapeHtml(shortUrl(form.campaignUrl))}</strong>
          </div>
        </main>
        <footer class="vote-footer">
          <div>
            <strong>${escapeHtml(displayName)}</strong>
            <span>@${escapeHtml(userName)}</span>
          </div>
          <span>Matters 前往投票</span>
        </footer>
      </div>`;
  })();

  return `<!doctype html>
<html lang="zh-Hant">
  <head>
    <meta charset="utf-8" />
    <style>
      * { box-sizing: border-box; }
      html, body { margin: 0; width: ${template.width}px; height: ${template.height}px; }
      body {
        font-family: PingFang TC, Noto Sans TC, system-ui, sans-serif;
        color: #333;
        background: #f7f7f7;
      }
      .canvas {
        position: relative;
        width: ${template.width}px;
        height: ${template.height}px;
        overflow: hidden;
        padding: 72px;
      }
      .brandmark {
        width: 62px;
        height: 42px;
        background:
          radial-gradient(circle at 32% 50%, currentColor 0 34%, transparent 35%),
          radial-gradient(circle at 68% 50%, currentColor 0 30%, transparent 31%);
        color: #0d6763;
      }
      .brandmark.light { color: #fff; }
      .topbar, .vote-top, .identity-header, .vote-footer, .author {
        display: flex;
        align-items: center;
      }
      .topbar, .vote-top, .identity-header, .vote-footer {
        justify-content: space-between;
      }
      .kicker, .eyebrow, .meta, .foot, .vote-main p, .identity-header p {
        font-size: 28px;
        line-height: 1.4;
        margin: 0;
      }
      .foot {
        position: absolute;
        left: 72px;
        right: 72px;
        bottom: 52px;
        color: rgba(51, 51, 51, .62);
        font-weight: 700;
      }
      .annual {
        background: #f4fbf8;
        color: #123f3c;
      }
      .orbit {
        position: absolute;
        border-radius: 999px;
        border: 2px solid rgba(13, 103, 99, .14);
      }
      .orbit-a { width: 680px; height: 680px; right: -220px; top: -180px; }
      .orbit-b { width: 520px; height: 520px; left: -190px; bottom: -160px; }
      .annual-main { position: relative; margin-top: 78px; }
      .annual h1 {
        font-size: 92px;
        line-height: 1.05;
        margin: 18px 0 10px;
        max-width: 760px;
      }
      .stats {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 18px;
        margin-top: 72px;
      }
      .stat {
        min-height: 142px;
        padding: 24px;
        background: #fff;
        border: 1px solid rgba(13, 103, 99, .16);
        border-radius: 8px;
        box-shadow: 0 12px 24px rgba(13, 103, 99, .08);
      }
      .stat strong {
        display: block;
        font-size: 44px;
        line-height: 1;
        margin-bottom: 16px;
      }
      .stat span {
        font-size: 23px;
        color: rgba(18, 63, 60, .68);
      }
      .thankyou {
        background:
          linear-gradient(135deg, rgba(255,255,255,.72), rgba(255,255,255,.18)),
          radial-gradient(circle at 78% 24%, #d7f0ea 0 18%, transparent 19%),
          radial-gradient(circle at 22% 78%, #f0dcc0 0 20%, transparent 21%),
          #f8efe4;
      }
      .paper {
        width: 100%;
        height: 820px;
        padding: 72px;
        background: rgba(255,255,255,.78);
        border: 1px solid rgba(192,164,107,.34);
        border-radius: 8px;
        box-shadow: 0 24px 80px rgba(98, 70, 42, .16);
      }
      .stamp {
        width: max-content;
        padding: 10px 18px;
        border: 1px solid #c0a46b;
        color: #8a6b2c;
        font-size: 24px;
        font-weight: 800;
      }
      .serif-title {
        margin: 94px 0 20px;
        color: #8a6b2c;
        font-size: 30px;
        font-family: Georgia, Times New Roman, serif;
      }
      .thankyou h1 {
        min-height: 260px;
        margin: 0;
        font-size: 62px;
        line-height: 1.38;
        letter-spacing: 0;
        color: #3f3025;
      }
      .author { gap: 18px; margin-top: 72px; }
      .avatar {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 72px;
        height: 72px;
        border-radius: 50%;
        background: #0d6763;
        color: #fff;
        font-weight: 800;
        font-size: 24px;
      }
      .author strong, .author span {
        display: block;
        font-size: 26px;
        line-height: 1.42;
      }
      .author span { color: #808080; }
      .identity {
        background: #111;
        color: #f7f7f7;
      }
      .identity:before {
        content: "";
        position: absolute;
        inset: 42px;
        border: 1px solid rgba(255,255,255,.18);
        border-radius: 8px;
      }
      .identity-header { position: relative; z-index: 1; align-items: flex-start; }
      .identity-header p { color: #c3f432; font-weight: 800; }
      .identity-header h1 {
        margin: 18px 0 0;
        font-size: 86px;
        line-height: 1.05;
        max-width: 680px;
      }
      .avatar.large {
        width: 160px;
        height: 160px;
        background: #7258ff;
        font-size: 44px;
      }
      .identity-body {
        position: relative;
        z-index: 1;
        display: grid;
        gap: 20px;
        margin-top: 116px;
      }
      .identity-row {
        display: grid;
        grid-template-columns: 180px 1fr;
        gap: 24px;
        padding: 26px 0;
        border-bottom: 1px solid rgba(255,255,255,.18);
      }
      .identity-row span {
        color: rgba(255,255,255,.58);
        font-size: 24px;
      }
      .identity-row strong {
        font-size: 34px;
        line-height: 1.35;
        font-weight: 700;
      }
      .badges {
        position: relative;
        z-index: 1;
        display: flex;
        gap: 18px;
        margin-top: 72px;
      }
      .badges span {
        padding: 14px 22px;
        border: 1px solid rgba(195,244,50,.65);
        border-radius: 999px;
        color: #c3f432;
        font-size: 24px;
        font-weight: 700;
      }
      .vote {
        color: #fff;
        background:
          linear-gradient(160deg, ${style.primary}, ${style.secondary}),
          #123f3c;
      }
      .vote:after {
        content: "";
        position: absolute;
        width: 760px;
        height: 760px;
        right: -260px;
        bottom: -180px;
        border-radius: 50%;
        border: 70px solid rgba(255,255,255,.13);
      }
      .vote-top {
        position: relative;
        z-index: 1;
        font-size: 30px;
        font-weight: 800;
      }
      .vote-main {
        position: relative;
        z-index: 1;
        margin-top: 220px;
      }
      .vote-main p {
        color: rgba(255,255,255,.72);
        font-weight: 700;
      }
      .vote-main h1 {
        max-width: 820px;
        margin: 24px 0 72px;
        font-size: 82px;
        line-height: 1.16;
      }
      .proposal {
        width: 760px;
        max-width: 100%;
        padding: 28px 32px;
        background: rgba(255,255,255,.14);
        border: 1px solid rgba(255,255,255,.24);
        border-radius: 8px;
      }
      .proposal span, .proposal strong {
        display: block;
      }
      .proposal span { font-size: 24px; color: rgba(255,255,255,.7); }
      .proposal strong { margin-top: 10px; font-size: 34px; }
      .vote-footer {
        position: absolute;
        z-index: 1;
        left: 72px;
        right: 72px;
        bottom: 64px;
        font-size: 24px;
      }
      .vote-footer strong, .vote-footer span {
        display: block;
      }
      .vote-footer > span {
        font-weight: 800;
      }
    </style>
  </head>
  <body>${body}</body>
</html>`;
}

function statCard(label: string, value?: number): string {
  return `<div class="stat"><strong>${formatNumber(value ?? 0)}</strong><span>${escapeHtml(label)}</span></div>`;
}

function posterStyle(style: CampaignForm["posterStyle"]) {
  if (style === "gold") {
    return { className: "vote-gold", primary: "#8a6b2c", secondary: "#c58463" };
  }
  if (style === "purple") {
    return { className: "vote-purple", primary: "#4b0ad6", secondary: "#70b388" };
  }
  return { className: "vote-green", primary: "#0d6763", secondary: "#70b388" };
}

function normalizeUserName(input: string): string {
  return input.trim().replace(/^@+/, "").match(/\w+/)?.[0] ?? "";
}

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat("zh-Hant").format(value);
}

function shortWallet(value: string): string {
  const trimmed = value.trim();
  if (trimmed.length <= 14) return trimmed;
  return `${trimmed.slice(0, 6)}...${trimmed.slice(-4)}`;
}

function shortUrl(value: string): string {
  try {
    const url = new URL(value);
    return `${url.hostname}${url.pathname}`.replace(/\/$/, "");
  } catch {
    return value || "matters.town";
  }
}
