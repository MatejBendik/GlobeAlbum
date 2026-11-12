import Link from "next/link";
import SiteLayout from "./(site)/layout";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { navigationViewer } from "@/lib/navigation-viewer";

export async function NotFoundContent() {
  const viewer = await navigationViewer().catch(() => null);
  return (
    <main className="auth-page">
      <PageHeader viewer={viewer} />
      <section className="auth-content">
        <span className="eyebrow">A QUIET CORNER OF THE WORLD</span>
        <h1>
          This globe
          <br />
          is not available.
        </h1>
        <p>It may be private, or the address may have changed.</p>
        <Button asChild>
          <Link href="/">Back to GlobeAlbum</Link>
        </Button>
      </section>
    </main>
  );
}

export default function NotFound() {
  return (
    <SiteLayout>
      <NotFoundContent />
    </SiteLayout>
  );
}
