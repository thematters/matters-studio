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
            <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
              <circle cx="12" cy="12" r="11" />
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
