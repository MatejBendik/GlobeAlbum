import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { SiteFooter } from "@/components/site-footer";
import { SiteAnalytics } from "@/components/site-analytics";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: {
    default: "GlobeAlbum — A world of little moments",
    template: "%s · GlobeAlbum",
  },
  description:
    "Your travels, photos and favorite places. One personal globe, ready to share.",
  robots: { index: false, follow: false },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <a className="skip-link" href="#main-content">
          Skip to content
        </a>
        <ThemeProvider>
          <div id="main-content">{children}</div>
          <SiteFooter />
        </ThemeProvider>
        <SiteAnalytics />
      </body>
    </html>
  );
}
