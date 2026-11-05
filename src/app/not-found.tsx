import Link from "next/link";
import { Brand } from "@/components/brand";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="auth-page">
      <header>
        <Brand />
      </header>
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
