"use client";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  ArrowUpRight,
  Check,
  Copy,
  Globe2,
  LockKeyhole,
  MapPin,
  Plus,
  Search,
  Share2,
  ImageIcon,
  List,
  X,
} from "lucide-react";
import type { NavigationViewer } from "@/lib/navigation-viewer";
import { AccountMenu } from "./account-menu";
import { ThemeToggle } from "./theme-provider";
import type { GlobeDto } from "@/lib/types";
import { countryName } from "@/lib/countries";
import { publicationAction } from "@/app/actions";
import { LIMITS } from "@/lib/limits";
import { Brand } from "./brand";
import { Button } from "./ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "./ui/dialog";
import { GlobeStage } from "./globe-stage";
import { PlaceGallery } from "./place-gallery";
import { PlaceForm } from "./place-form";

export function Workspace({
  globe,
  owner = false,
  demo = false,
  viewer = null,
}: {
  globe: GlobeDto;
  owner?: boolean;
  demo?: boolean;
  viewer?: NavigationViewer | null;
}) {
  const router = useRouter(),
    params = useSearchParams();
  const [query, setQuery] = useState(""),
    [adding, setAdding] = useState(false),
    [placesOpen, setPlacesOpen] = useState(false),
    [sharing, setSharing] = useState(false),
    [copied, setCopied] = useState(false),
    [error, setError] = useState(""),
    [pending, setPending] = useState(false);
  const listButton = useRef<HTMLButtonElement>(null);
  const openPlaces = useCallback(() => setPlacesOpen(true), []);
  function closePlaces() {
    setPlacesOpen(false);
    listButton.current?.focus();
  }
  const selected = params.get("place") ?? undefined;
  const active = globe.places.find((place) => place.id === selected);
  const choose = useCallback(
    (id: string) => {
      setPlacesOpen(false);
      const next = new URL(window.location.href);
      next.searchParams.set("place", id);
      router.push(`${next.pathname}${next.search}`, { scroll: false });
    },
    [router],
  );
  const changed = useCallback(() => router.refresh(), [router]);
  function close() {
    const next = new URL(window.location.href);
    next.searchParams.delete("place");
    router.replace(`${next.pathname}${next.search}`, { scroll: false });
  }
  useEffect(() => {
    if (!placesOpen || active || adding || sharing) return;
    const keydown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setPlacesOpen(false);
        listButton.current?.focus();
      }
    };
    document.addEventListener("keydown", keydown);
    return () => document.removeEventListener("keydown", keydown);
  }, [placesOpen, active, adding, sharing]);
  const filtered = globe.places.filter((place) =>
    `${place.name} ${countryName(place.country)}`
      .toLowerCase()
      .includes(query.toLowerCase()),
  );
  async function publish() {
    setPending(true);
    const result = await publicationAction(!globe.published);
    setPending(false);
    if (result.error) setError(result.error);
    else {
      setError("");
      router.refresh();
    }
  }
  async function copy() {
    try {
      await navigator.clipboard.writeText(
        `${window.location.origin}${demo ? "/demo" : `/u/${globe.username}`}`,
      );
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Copy the profile address from your browser instead.");
    }
  }
  return (
    <main className="workspace">
      <header className="workspace-header">
        <Brand />
        <div className="workspace-nav">
          {owner ? (
            <>
              <span
                className={`visibility-label ${globe.published ? "is-published" : ""}`}
              >
                {globe.published ? (
                  <Globe2 size={13} />
                ) : (
                  <LockKeyhole size={13} />
                )}
                <span>{globe.published ? "Published" : "Only you"}</span>
              </span>
              <Button
                aria-label="Share globe"
                variant="secondary"
                onClick={() => setSharing(true)}
              >
                <Share2 />
                <span>Share globe</span>
              </Button>
              <Button aria-label="Add place" onClick={() => setAdding(true)}>
                <Plus />
                <span>Add place</span>
              </Button>
            </>
          ) : (
            <>
              <span className="header-caption">
                {demo
                  ? "An example collection"
                  : "A personal travel collection"}
              </span>
              <Button asChild variant="secondary">
                <Link href={demo ? "/" : viewer ? "/studio" : "/sign-in"}>
                  {demo ? <ArrowLeft /> : viewer ? <Globe2 /> : <Plus />}
                  {demo
                    ? "Back home"
                    : viewer
                      ? "My globe"
                      : "Create your globe"}
                </Link>
              </Button>
            </>
          )}
          <ThemeToggle />
          {viewer && <AccountMenu viewer={viewer} />}
        </div>
      </header>
      <div className="workspace-body">
        <section className="globe-workspace" aria-label="Globe view">
          <GlobeStage
            places={globe.places}
            selectedId={selected}
            onSelect={choose}
            onUnavailable={openPlaces}
          />
          <div className="collection-summary">
            <span className="eyebrow">
              {owner
                ? "YOUR GLOBE"
                : demo
                  ? "EXAMPLE COLLECTION"
                  : "TRAVEL COLLECTION"}
            </span>
            <h1>{globe.displayName}</h1>
            <p className="collection-stats">
              <strong>{globe.places.length}</strong>{" "}
              {globe.places.length === 1 ? "place" : "places"} in{" "}
              <strong>{globe.countryCount}</strong>{" "}
              {globe.countryCount === 1 ? "country" : "countries"}
            </p>
          </div>
          <div className="workspace-floating-actions">
            <Button
              ref={listButton}
              variant="secondary"
              aria-expanded={placesOpen}
              aria-controls="places-panel"
              onClick={() => setPlacesOpen((value) => !value)}
            >
              <List />
              {owner ? "My places" : "Places"}
              <span className="places-count">{globe.places.length}</span>
            </Button>
          </div>
          {globe.places.length === 0 && owner && (
            <div className="empty-globe-note">
              <span>THE FIRST PIN IS YOURS</span>
              <p>Where did your journey begin?</p>
              <Button onClick={() => setAdding(true)}>
                <Plus />
                Add your first place
              </Button>
            </div>
          )}
        </section>
        {placesOpen && (
          <aside
            className="places-panel"
            id="places-panel"
            aria-label="Place list"
          >
            <div className="places-panel-top">
              <h2>{owner ? "My places" : "Places"}</h2>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Close places"
                onClick={closePlaces}
              >
                <X />
              </Button>
            </div>
            <p className="stats-explanation">
              Including separately listed territories.
            </p>
            <div className="place-search">
              <Search size={15} />
              <input
                aria-label="Search places"
                placeholder="Search your places"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
              <kbd>⌘ K</kbd>
            </div>
            <nav className="place-list" aria-label="Visited places">
              {filtered.map((place, index) => (
                <button
                  key={place.id}
                  className={`place-row ${selected === place.id ? "is-selected" : ""}`}
                  onClick={() => choose(place.id)}
                >
                  <span className="place-thumbnail">
                    {place.coverUrl ? (
                      <img src={place.coverUrl} alt="" loading="lazy" />
                    ) : (
                      <MapPin size={20} strokeWidth={1.2} />
                    )}
                  </span>
                  <span className="place-row-copy">
                    <strong>{place.name}</strong>
                    <small>
                      {countryName(place.country)} <span>·</span>{" "}
                      {place.photoCount} photo
                      {place.photoCount !== 1 ? "s" : ""}
                    </small>
                  </span>
                  <span className="place-row-number">
                    {(index + 1).toString().padStart(2, "0")}
                  </span>
                  <ArrowUpRight size={15} />
                </button>
              ))}
            </nav>
            {!filtered.length && (
              <div className="empty-places">
                <MapPin size={28} strokeWidth={1} />
                <h3>
                  {query ? "No places found" : "Your story starts somewhere."}
                </h3>
                <p>
                  {query
                    ? "Try another city or country."
                    : owner
                      ? "Add a city you have visited. Photos can come later."
                      : "This collection is waiting for its first place."}
                </p>
                {owner && !query && (
                  <Button variant="secondary" onClick={() => setAdding(true)}>
                    <Plus />
                    Add your first place
                  </Button>
                )}
              </div>
            )}
            <div className="places-panel-footer">
              <ImageIcon size={15} />
              <span>
                {globe.photoCount} {globe.photoCount === 1 ? "photo" : "photos"}
                {owner ? ` / ${LIMITS.photos}` : ""}
              </span>
              {owner && (
                <span className="photo-quota-bar">
                  <span
                    style={{
                      width: `${Math.min(100, ((globe.photoSlotsUsed ?? globe.photoCount) / LIMITS.photos) * 100)}%`,
                    }}
                  />
                </span>
              )}
            </div>
          </aside>
        )}
      </div>
      {active && (
        <PlaceGallery
          key={active.id}
          place={active}
          owner={owner}
          demo={demo}
          remaining={Math.max(
            0,
            LIMITS.photos - (globe.photoSlotsUsed ?? globe.photoCount),
          )}
          onClose={close}
          onChanged={changed}
        />
      )}
      <Dialog open={adding} onOpenChange={setAdding}>
        <DialogContent>
          <DialogTitle className="dialog-title">
            Somewhere you have been.
          </DialogTitle>
          <DialogDescription className="dialog-description">
            Add a place to your globe. A little dot with a story behind it.
          </DialogDescription>
          <PlaceForm
            onDone={() => {
              setAdding(false);
              changed();
            }}
          />
        </DialogContent>
      </Dialog>
      <Dialog open={sharing} onOpenChange={setSharing}>
        <DialogContent>
          <span className="dialog-icon">
            <Share2 />
          </span>
          <DialogTitle className="dialog-title">
            Your world, shared.
          </DialogTitle>
          <DialogDescription className="dialog-description">
            {globe.published
              ? "Anyone with your address can explore your globe. Saved changes are visible on their next visit."
              : "Your globe is private. Publish it when you are ready to let someone in."}
          </DialogDescription>
          <div className="share-address">
            <span>/u/{globe.username}</span>
            <Button
              variant="ghost"
              size="icon"
              disabled={!globe.published}
              aria-label="Copy globe link"
              onClick={copy}
            >
              {copied ? <Check /> : <Copy />}
            </Button>
          </div>
          <div className="privacy-note">
            <LockKeyhole size={16} />
            <p>
              Your email and visit dates stay private. Photos may remain
              accessible through existing links for up to 60 seconds after
              hiding.
            </p>
          </div>
          {error && (
            <p role="alert" className="form-error">
              {error}
            </p>
          )}
          <Button disabled={pending} onClick={publish}>
            {pending
              ? "Saving…"
              : globe.published
                ? "Make globe private"
                : "Publish my globe"}
          </Button>
        </DialogContent>
      </Dialog>
    </main>
  );
}
