import { createFileRoute, Link } from "@tanstack/react-router";

import styles from "./index.module.css";

export const Route = createFileRoute("/")({
  component: Dashboard,
});

interface Tile {
  title: string;
  description: string;
  to?: "/og-image" | "/brand-catalog" | "/create-visual";
  badge?: string;
  code: string;
  enabled: boolean;
}

const TILES: Tile[] = [
  {
    title: "快速製圖",
    description: "選需求與分類，生成底圖並套用 Matters 版型下載 PNG。",
    to: "/create-visual",
    code: "01",
    enabled: true,
  },
  {
    title: "OG 圖",
    description: "為文章/活動產生 1200×630 開放圖。即時預覽，下載 PNG。",
    to: "/og-image",
    code: "02",
    enabled: true,
  },
  {
    title: "品牌製圖分類",
    description: "按 Matters.Town、Matters Lab、自由寫、七日書選需求與尺寸。",
    to: "/brand-catalog",
    code: "03",
    enabled: true,
  },
  {
    title: "簡報",
    description: "Markdown → 馬特市風格 deck。匯出 PDF。",
    badge: "Phase 9.2",
    code: "04",
    enabled: false,
  },
  {
    title: "活動頁",
    description: "為活動快速生成可分享的 landing page。",
    badge: "Phase 9.3",
    code: "05",
    enabled: false,
  },
];

function Dashboard() {
  return (
    <section>
      <header className={styles.intro}>
        <h1 className={styles.heading}>歡迎使用 Matters Studio</h1>
        <p className={styles.lede}>選一個工作流，開始產生素材。</p>
      </header>

      <div className={styles.grid}>
        {TILES.map((tile) =>
          tile.enabled && tile.to ? (
            <Link key={tile.title} to={tile.to} className={styles.tile}>
              <TileContent tile={tile} />
            </Link>
          ) : (
            <div
              key={tile.title}
              className={`${styles.tile} ${styles.tileDisabled}`}
              aria-disabled="true"
            >
              <TileContent tile={tile} />
            </div>
          )
        )}
      </div>
    </section>
  );
}

function TileContent({ tile }: { tile: Tile }) {
  return (
    <>
      <div className={styles.tileIndex} aria-hidden="true">
        {tile.code}
      </div>
      <div className={styles.tileBody}>
        <div className={styles.tileTitleRow}>
          <h2 className={styles.tileTitle}>{tile.title}</h2>
          {tile.badge ? <span className={styles.badge}>{tile.badge}</span> : null}
        </div>
        <p className={styles.tileDesc}>{tile.description}</p>
      </div>
      <span className={styles.tileArrow} aria-hidden="true">
        {tile.enabled ? "→" : "·"}
      </span>
    </>
  );
}
