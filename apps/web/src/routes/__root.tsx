import { Outlet, Link, createRootRouteWithContext } from "@tanstack/react-router";
import type { QueryClient } from "@tanstack/react-query";

import styles from "./root.module.css";

interface RouterContext {
  queryClient: QueryClient;
}

export const Route = createRootRouteWithContext<RouterContext>()({
  component: RootLayout,
});

function RootLayout() {
  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <Link to="/" className={styles.brand}>
          <span className={styles.brandMark} aria-hidden="true">
            {/* Two-circle Matters.News mark, sourced from design-system
                templates/shared/matters-mark-black-filled.svg. The filled
                variant (vs. the official hollow-ring color asset) keeps both
                circles solid so they stay legible at the 28px header size. */}
            <svg viewBox="0 0 385.45 265" width="28" height="19.2" fill="currentColor">
              <path d="M265.83,251.75c66.07,0,119.62-53.39,119.62-119.25S331.9,13.25,265.83,13.25s-119.62,53.39-119.62,119.25,53.55,119.25,119.62,119.25Z" />
              <path d="M132.92,265c73.41,0,132.92-59.32,132.92-132.5S206.33,0,132.92,0,0,59.32,0,132.5s59.5,132.5,132.92,132.5Z" />
            </svg>
          </span>
          <span className={styles.brandText}>Matters Studio</span>
        </Link>
        <nav className={styles.nav}>
          <a
            href="https://github.com/thematters/matters-studio"
            target="_blank"
            rel="noreferrer"
            className={styles.navLink}
          >
            GitHub
          </a>
        </nav>
      </header>

      <main className={styles.main}>
        <Outlet />
      </main>

      <footer className={styles.footer}>
        <small>Matters Studio · Phase 9.1 MVP · Internal tooling for the Matters team</small>
      </footer>
    </div>
  );
}
