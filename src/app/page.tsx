import Link from "next/link";
import { ArrowRight, ArrowUpRight, MapPin, Camera, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { navigationViewer } from "@/lib/navigation-viewer";
import { PageHeader } from "@/components/page-header";
import { HeroGlobe } from "@/components/hero-globe";

const createGlobeLabel = "Create your free globe";
const exploreExampleLabel = "Explore an example";

export default async function HomePage() {
  const viewer = await navigationViewer();
  return (
    <main className="home-page">
      <section className="home-hero">
        <PageHeader viewer={viewer}>
          {!viewer && (
            <>
              <Button asChild variant="ghost" className="home-nav-link">
                <Link href="/demo">
                  {exploreExampleLabel} <ArrowUpRight />
                </Link>
              </Button>
              <Button asChild variant="secondary" className="home-nav-create">
                <Link href="/sign-in">
                  {createGlobeLabel} <ArrowRight />
                </Link>
              </Button>
            </>
          )}
        </PageHeader>
        <div className="hero-content">
          <div className="hero-copy">
            <span className="hero-eyebrow">
              <span /> FOR THE PLACES THAT STAY WITH YOU
            </span>
            <h1>
              Your trips and photos,
              <br />
              on your own globe.
            </h1>
            <p>A world of little moments.</p>
          </div>
          <HeroGlobe />
          <div className="hero-actions">
            <Button asChild size="lg" className="hero-primary">
              <Link href={viewer ? "/studio" : "/sign-in"}>
                {viewer ? "Open your globe" : createGlobeLabel} <ArrowUpRight />
              </Link>
            </Button>
            <Link href="/demo" className="hero-secondary">
              {exploreExampleLabel} <ArrowRight size={16} />
            </Link>
          </div>
        </div>
        <section className="story-steps" aria-label="How GlobeAlbum works">
          <article>
            <MapPin strokeWidth={1.2} />
            <div>
              <h2>Mark a place.</h2>
              <p>
                A favorite city, a small town, somewhere you keep coming back
                to.
              </p>
            </div>
          </article>
          <article>
            <Camera strokeWidth={1.2} />
            <div>
              <h2>Keep the moments.</h2>
              <p>
                Add a few photos and the little details you want to remember.
              </p>
            </div>
          </article>
          <article>
            <Send strokeWidth={1.2} />
            <div>
              <h2>Share your globe.</h2>
              <p>Share your globe with a link, whenever you are ready.</p>
            </div>
          </article>
        </section>
      </section>
    </main>
  );
}
