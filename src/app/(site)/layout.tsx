import { ThemeProvider } from "@/components/theme-provider";
import { SiteFooter } from "@/components/site-footer";
import { SiteAnalytics } from "@/components/site-analytics";

export default function SiteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <ThemeProvider>
        <div id="main-content">{children}</div>
        <SiteFooter />
      </ThemeProvider>
      <SiteAnalytics />
    </>
  );
}
