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
            <h1>One personal globe for your travels, ready to share.</h1>
            <p>
              Keep your travel photos together and share your globe with a link.
            </p>
          </div>
          <HeroGlobe />
          <div className="hero-actions">
            {/* TODO: Add approved free-plan inclusions and limits before restoring a free offer. */}
            <Button asChild size="lg" className="hero-primary">
              <Link href={viewer ? "/studio" : "/sign-in"}>
                {viewer ? "Open your globe" : createGlobeLabel} <ArrowUpRight />
              </Link>
            </Button>
            {!viewer && <small>Sign in to create your globe.</small>}
          </div>
        </div>
      </section>
      <section className="home-story" aria-labelledby="home-story-heading">
        <div className="home-story-content">
          <div>
            <span className="eyebrow">YOUR OWN LITTLE ATLAS</span>
            <h2 id="home-story-heading">
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
        </div>
      </section>
    </main>
  );
}
