import type { NavigationViewer } from "@/lib/navigation-viewer";
import { AccountMenu } from "./account-menu";
import { Brand } from "./brand";
import { ThemeToggle } from "./theme-provider";

export function PageHeader({
  viewer,
  children,
}: {
  viewer?: NavigationViewer | null;
  children?: React.ReactNode;
}) {
  return (
    <header className="site-header">
      <Brand />
      <nav className="site-nav" aria-label="Main navigation">
        {children}
        <div className="account-controls">
          <ThemeToggle />
          {viewer && <AccountMenu viewer={viewer} />}
        </div>
      </nav>
    </header>
  );
}
