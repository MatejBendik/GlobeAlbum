import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { SiteFooter } from "@/components/site-footer";
import { SiteAnalytics } from "@/components/site-analytics";
import { shareMetadata } from "@/lib/share-metadata";

export const dynamic = "force-dynamic";
const title = "GlobeAlbum — A world of little moments";
const description =
  "Your travels, photos and favorite places. One personal globe, ready to share.";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.APP_ORIGIN ?? "https://globealbum.com"),
  title: {
    default: title,
    template: "%s · GlobeAlbum",
  },
  description,
  ...shareMetadata({
    title,
    description,
    path: "/",
    imageUrl: "/share-image.png",
    imageAlt: "GlobeAlbum's example travel globe and photo postcards",
  }),
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
