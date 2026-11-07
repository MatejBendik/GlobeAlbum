import { PageHeader } from "@/components/page-header";
import { navigationViewer } from "@/lib/navigation-viewer";

export default async function LegalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Keep public notices readable even when the account service is unavailable.
  const viewer = await navigationViewer().catch(() => null);
  return (
    <>
      <PageHeader viewer={viewer} />
      <main className="legal-page">{children}</main>
    </>
  );
}
