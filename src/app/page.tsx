import Link from "next/link";
import { ArrowRight, ArrowUpRight, MapPin, Camera, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { navigationViewer } from "@/lib/navigation-viewer";
import { PageHeader } from "@/components/page-header";
import { HeroGlobe } from "@/components/hero-globe";

const createGlobeLabel = "Create your globe";
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
                <Link href="/sign-in" aria-describedby="create-globe-price">
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
              GlobeAlbum<span>.</span>
            </h1>
            <h2>
              A world of
              <br />
              little moments.
            </h2>
            <p>
              The places you have been. The photos you love.
              <br className="desktop-break" /> Together on a globe that is
              entirely yours.
            </p>
            <div className="hero-actions">
              <div className="hero-create-action">
                <Button asChild size="lg" className="hero-primary">
                  <Link
                    href={viewer ? "/studio" : "/sign-in"}
                    aria-describedby={viewer ? undefined : "create-globe-price"}
                  >
                    {viewer ? "Open your globe" : createGlobeLabel}{" "}
                    <ArrowUpRight />
                  </Link>
                </Button>
                {!viewer && (
                  <span id="create-globe-price" className="hero-create-price">
                    Free to use
                  </span>
                )}
              </div>
              <Link href="/demo" className="hero-secondary">
                {exploreExampleLabel} <ArrowRight size={16} />
              </Link>
            </div>
            <div className="hero-footnote">
              <span className="tiny-globe">◎</span> A personal travel journal. A
              different perspective.
            </div>
          </div>
          <HeroGlobe />
        </div>
        <div className="hero-bottom">
          <span>SMALL MOMENTS. BIG WORLD.</span>
          <span>
            DRAG THE GLOBE TO EXPLORE <ArrowRight size={13} />
          </span>
        </div>
      </section>
      <section className="home-story">
        <div>
          <span className="eyebrow">YOUR OWN LITTLE ATLAS</span>
          <h2>
            Some places
            <br />
            become part of you.
          </h2>
        </div>
        <div className="story-steps">
          <article>
            <MapPin strokeWidth={1.2} />
            <div>
              <h3>Mark a place.</h3>
              <p>
                A favorite city, a small town, somewhere you keep coming back
                to.
              </p>
            </div>
          </article>
          <article>
            <Camera strokeWidth={1.2} />
            <div>
              <h3>Keep the moments.</h3>
              <p>
                Add a few photos and the little details you want to remember.
              </p>
            </div>
          </article>
          <article>
            <Send strokeWidth={1.2} />
            <div>
              <h3>Let someone in.</h3>
              <p>Share your globe with a link, whenever you are ready.</p>
            </div>
          </article>
        </div>
      </section>
    </main>
  );
}
