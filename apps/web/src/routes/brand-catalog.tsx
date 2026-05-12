import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";

import catalogJson from "../brand-catalog/cc-branding-categories.json";

import styles from "./brand-catalog.module.css";

export const Route = createFileRoute("/brand-catalog")({
  component: BrandCatalogPage,
});

interface Catalog {
  generatedAt: string;
  categories: Category[];
  studioUseCases: StudioUseCase[];
}

interface Category {
  id: string;
  label: string;
  productLine: string;
  purpose: string;
  studioReadiness: "high" | "medium" | "reference";
  sourcePages: Array<{
    id: string;
    name: string;
    url: string;
    frameCount: number;
    commonSizes: Array<{ size: string; count: number }>;
  }>;
  sampleFrames: Array<{ id: string; name: string | null; size: string | null; url: string }>;
  commonOutputSizes: Array<{ size: string; count: number }>;
  layoutFamilies: string[];
  typography: {
    fonts: Array<{ font: string; count: number }>;
    fontSizes: Array<{ fontSize: number; count: number }>;
    guidance: string[];
  };
  backgrounds: {
    colors: Array<{ color: string; count: number }>;
    imageFillCount: number;
    gradientFillCount: number;
    guidance: string[];
  };
}

interface StudioUseCase {
  id: string;
  label: string;
  categories: string[];
  requiredInputs: string[];
  recommendedOutputs: string[];
}

const catalog = catalogJson as Catalog;

function BrandCatalogPage() {
  const firstUseCase = catalog.studioUseCases[0]?.id ?? "";
  const [selectedUseCaseId, setSelectedUseCaseId] = useState(firstUseCase);
  const selectedUseCase =
    catalog.studioUseCases.find((useCase) => useCase.id === selectedUseCaseId) ??
    catalog.studioUseCases[0];

  const visibleCategories = useMemo(() => {
    if (!selectedUseCase) return catalog.categories;
    return catalog.categories.filter((category) =>
      selectedUseCase.categories.includes(category.id)
    );
  }, [selectedUseCase]);

  const [selectedCategoryId, setSelectedCategoryId] = useState(
    () => visibleCategories[0]?.id ?? catalog.categories[0]?.id ?? ""
  );
  const selectedCategory =
    visibleCategories.find((category) => category.id === selectedCategoryId) ??
    visibleCategories[0] ??
    catalog.categories[0];

  const chooseUseCase = (id: string) => {
    setSelectedUseCaseId(id);
    const useCase = catalog.studioUseCases.find((item) => item.id === id);
    const nextCategory = catalog.categories.find((category) =>
      useCase?.categories.includes(category.id)
    );
    if (nextCategory) setSelectedCategoryId(nextCategory.id);
  };

  return (
    <section className={styles.page}>
      <header className={styles.pageHeader}>
        <div>
          <Link to="/" className={styles.back}>
            ← 回到 Studio
          </Link>
          <h1 className={styles.title}>品牌製圖分類</h1>
          <p className={styles.lede}>
            依 CC & Branding Figma 整理的活動家族、常用尺寸、字型、底圖與 Studio 欄位契約。
          </p>
        </div>
      </header>

      <div className={styles.layout}>
        <aside className={styles.panel}>
          <h2 className={styles.panelTitle}>製圖需求</h2>
          <div className={styles.useCaseList}>
            {catalog.studioUseCases.map((useCase) => (
              <button
                key={useCase.id}
                type="button"
                className={`${styles.selector} ${
                  selectedUseCase?.id === useCase.id ? styles.selectorActive : ""
                }`}
                onClick={() => chooseUseCase(useCase.id)}
              >
                <span className={styles.selectorTitle}>{useCase.label}</span>
                <span className={styles.selectorMeta}>
                  {useCase.recommendedOutputs.join(" / ")}
                </span>
              </button>
            ))}
          </div>

          <h2 className={styles.panelTitle} style={{ marginTop: 24 }}>
            對應分類
          </h2>
          <div className={styles.categoryList}>
            {visibleCategories.map((category) => (
              <button
                key={category.id}
                type="button"
                className={`${styles.selector} ${
                  selectedCategory?.id === category.id ? styles.selectorActive : ""
                }`}
                onClick={() => setSelectedCategoryId(category.id)}
              >
                <span className={styles.selectorTitle}>{category.label}</span>
                <span className={styles.selectorMeta}>
                  {category.productLine} · {readinessLabel(category.studioReadiness)}
                </span>
              </button>
            ))}
          </div>
        </aside>

        {selectedUseCase && selectedCategory ? (
          <main className={styles.content}>
            <section className={styles.summaryGrid} aria-label="分類摘要">
              <Metric label="Studio 用例" value={selectedUseCase.label} />
              <Metric label="活動家族" value={selectedCategory.productLine} />
              <Metric
                label="可產品化程度"
                value={readinessLabel(selectedCategory.studioReadiness)}
              />
            </section>

            <section className={styles.panel}>
              <h2 className={styles.sectionTitle}>{selectedCategory.label}</h2>
              <p className={styles.contractText}>{selectedCategory.purpose}</p>
            </section>

            <section className={styles.contractGrid}>
              <InfoBox title="必填欄位" value={selectedUseCase.requiredInputs.join("、")} />
              <InfoBox title="建議輸出" value={selectedUseCase.recommendedOutputs.join("、")} />
            </section>

            <section className={styles.panel}>
              <h2 className={styles.sectionTitle}>常用尺寸</h2>
              <div className={styles.tagList}>
                {selectedCategory.commonOutputSizes.slice(0, 10).map((item) => (
                  <span key={item.size} className={styles.tag}>
                    {item.size} · {item.count}
                  </span>
                ))}
              </div>
            </section>

            <section className={styles.panel}>
              <h2 className={styles.sectionTitle}>版型與底圖規則</h2>
              <ul className={styles.detailList}>
                {selectedCategory.backgrounds.guidance.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
              <div className={styles.tagList} style={{ marginTop: 12 }}>
                {selectedCategory.backgrounds.colors.slice(0, 8).map((item) => (
                  <span key={item.color} className={styles.tag}>
                    {item.color}
                  </span>
                ))}
                <span className={styles.tag}>
                  圖片填色 {selectedCategory.backgrounds.imageFillCount}
                </span>
                <span className={styles.tag}>
                  漸層 {selectedCategory.backgrounds.gradientFillCount}
                </span>
              </div>
            </section>

            <section className={styles.panel}>
              <h2 className={styles.sectionTitle}>字型與文字排版</h2>
              <ul className={styles.detailList}>
                {selectedCategory.typography.guidance.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
              <div className={styles.tagList} style={{ marginTop: 12 }}>
                {selectedCategory.typography.fonts.slice(0, 8).map((item) => (
                  <span key={item.font} className={styles.tag}>
                    {item.font}
                  </span>
                ))}
              </div>
            </section>

            <section className={styles.panel}>
              <h2 className={styles.sectionTitle}>代表 Frame</h2>
              <table className={styles.frameTable}>
                <thead>
                  <tr>
                    <th>Frame</th>
                    <th>尺寸</th>
                    <th>Figma</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedCategory.sampleFrames.map((frame) => (
                    <tr key={frame.id}>
                      <td>{frame.name || frame.id}</td>
                      <td>{frame.size || "unknown"}</td>
                      <td>
                        <a href={frame.url} target="_blank" rel="noreferrer">
                          開啟
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          </main>
        ) : null}
      </div>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className={styles.metric}>
      <span className={styles.metricLabel}>{label}</span>
      <span className={styles.metricValue}>{value}</span>
    </div>
  );
}

function InfoBox({ title, value }: { title: string; value: string }) {
  return (
    <div className={styles.contractBox}>
      <h2 className={styles.contractTitle}>{title}</h2>
      <p className={styles.contractText}>{value}</p>
    </div>
  );
}

function readinessLabel(readiness: Category["studioReadiness"]): string {
  if (readiness === "high") return "可直接產品化";
  if (readiness === "medium") return "需補模板";
  return "參考資料";
}
