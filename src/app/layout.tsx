import type { Metadata } from "next";
import "./globals.css";

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
    <html lang="en">
      <body>
        <a className="skip-link" href="#main-content">
          Skip to content
        </a>
        <div id="main-content">{children}</div>
      </body>
    </html>
  );
}
