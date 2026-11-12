import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { readGlobe } from "@/lib/domain";
import { EmbedViewer } from "@/components/embed-viewer";
import { ThemeProvider } from "@/components/theme-provider";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Embedded globe",
  openGraph: null,
  twitter: null,
  robots: { index: false, follow: false },
};

export default async function EmbedPage({
  params,
  searchParams,
}: {
  params: Promise<{ username: string }>;
  searchParams: Promise<{ theme?: string }>;
}) {
  const { username } = await params;
  const theme = (await searchParams).theme === "dark" ? "dark" : "light";
  const globe = await readGlobe({ username });
  if (!globe) notFound();
  return (
    <ThemeProvider forcedTheme={theme}>
      <EmbedViewer globe={globe} />
    </ThemeProvider>
  );
}
