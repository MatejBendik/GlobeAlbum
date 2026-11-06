import Link from "next/link";
import { ArrowRight, ArrowUpRight, MapPin, Camera, Send } from "lucide-react";
import { Brand } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { HeroGlobe } from "@/components/hero-globe";

export default function HomePage() {
  return (
    <main className="home-page">
      <section className="home-hero">
        <header className="home-header">
          <Brand dark />
          <nav aria-label="Main navigation">
            <Link className="home-nav-link" href="/demo">
              Explore an example <ArrowUpRight size={14} />
            </Link>
            <Button asChild variant="secondary">
              <Link href="/sign-in">
                Make it yours <ArrowRight />
              </Link>
            </Button>
          </nav>
        </header>
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
              <Button asChild size="lg" className="hero-primary">
                <Link href="/sign-in">
                  Create your globe <ArrowUpRight />
                </Link>
              </Button>
              <Link href="/demo" className="hero-secondary">
                Take a look around <ArrowRight size={16} />
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
      <footer className="home-footer">
        <Brand />
        <span>Made for a life well travelled.</span>
        <Link href="/sign-in">
          Start your collection <ArrowUpRight size={15} />
        </Link>
      </footer>
    </main>
  );
}
