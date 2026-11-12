"use client";
import Link from "next/link";
import {
  useCallback,
  useEffect,
  useOptimistic,
  useRef,
  useState,
  useTransition,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  ArrowUpRight,
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
import { PageHeader } from "./page-header";
import { ProfileAvatar } from "./profile-avatar";
import type { GlobeDto } from "@/lib/types";
import { countryName } from "@/lib/countries";
import { globeStyleAction } from "@/app/actions";
import type { GlobeStyle } from "@/lib/globe-style";
import { LIMITS } from "@/lib/limits";
import { Button } from "./ui/button";
import { ShareGlobeDialog } from "./share-globe-dialog";
import { GlobeStage } from "./globe-stage";
import { GlobeStylePicker } from "./globe-style-picker";
import { PlaceGallery } from "./place-gallery";
import { AddPlaceDialog } from "./add-place-dialog";

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
    [sharing, setSharing] = useState(false);
  const [globeStyle, previewStyle] = useOptimistic(globe.style);
  const [stylePending, startStyleSave] = useTransition();
  const [styleError, setStyleError] = useState("");
  function changeStyle(value: GlobeStyle) {
    if (stylePending || value === globeStyle) return;
    setStyleError("");
    startStyleSave(async () => {
      previewStyle(value);
      try {
        const result = await globeStyleAction(value);
        if (result.error) setStyleError(result.error);
      } catch {
        setStyleError("Could not save the globe style. Please try again.");
      }
    });
  }
  const listButton = useRef<HTMLButtonElement>(null);
  const [focusRequest, setFocusRequest] = useState<{ placeId: string }>();
  const openPlaces = useCallback(() => setPlacesOpen(true), []);
  function closePlaces() {
    setPlacesOpen(false);
    listButton.current?.focus();
  }
  const selected = params.get("place") ?? undefined;
  const active = globe.places.find((place) => place.id === selected);
  const avatarUrl =
    globe.avatarUrl ?? (owner ? viewer?.avatarUrl : null) ?? null;
  const visitorAction = demo
    ? "Back home"
    : viewer
      ? "My globe"
      : "Create your globe";
  const choose = useCallback((id: string) => {
    setPlacesOpen(false);
    const next = new URL(window.location.href);
    next.searchParams.set("place", id);
    window.history.pushState(null, "", next);
  }, []);
  const changed = useCallback(() => router.refresh(), [router]);
  function close() {
    const next = new URL(window.location.href);
    next.searchParams.delete("place");
    window.history.replaceState(null, "", next);
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
  return (
    <main className="workspace">
      <PageHeader viewer={viewer}>
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
              className="compact-nav-action"
              onClick={() => setSharing(true)}
            >
              <Share2 />
              <span>Share globe</span>
            </Button>
            <Button
              aria-label="Add place"
              className="compact-nav-action"
              onClick={() => setAdding(true)}
            >
              <Plus />
              <span>Add place</span>
            </Button>
          </>
        ) : (
          <>
            <span className="header-caption">
              {demo ? "An example collection" : "A personal travel collection"}
            </span>
            <Button asChild variant="secondary" className="compact-nav-action">
              <Link
                href={demo ? "/" : viewer ? "/studio" : "/sign-in"}
                aria-label={visitorAction}
              >
                {demo ? <ArrowLeft /> : viewer ? <Globe2 /> : <Plus />}
                <span>{visitorAction}</span>
              </Link>
            </Button>
          </>
        )}
      </PageHeader>
      <div className="workspace-body">
        <section className="globe-workspace" aria-label="Globe view">
          <GlobeStage
            places={globe.places}
            globeStyle={globeStyle}
            selectedId={selected}
            focusRequest={focusRequest}
            pauseRotation={Boolean(active)}
            renderPaused={sharing}
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
            <div className="collection-heading">
              {avatarUrl && (
                <ProfileAvatar url={avatarUrl} className="globe-avatar">
                  {globe.displayName.trim().charAt(0).toUpperCase()}
                </ProfileAvatar>
              )}
              <h1>{globe.displayName}</h1>
            </div>
            <p className="collection-stats">
              <strong>{globe.places.length}</strong>{" "}
              {globe.places.length === 1 ? "place" : "places"} in{" "}
              <strong>{globe.countryCount}</strong>{" "}
              {globe.countryCount === 1 ? "country" : "countries"}
            </p>
            {owner && (
              <GlobeStylePicker
                value={globeStyle}
                pending={stylePending}
                error={styleError}
                onChange={changeStyle}
              />
            )}
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
                  onClick={() => {
                    setFocusRequest({ placeId: place.id });
                    choose(place.id);
                  }}
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
      <AddPlaceDialog
        open={adding}
        onOpenChange={setAdding}
        remaining={Math.max(
          0,
          LIMITS.photos - (globe.photoSlotsUsed ?? globe.photoCount),
        )}
        onChanged={changed}
      />
      {sharing && (
        <ShareGlobeDialog globe={globe} onClose={() => setSharing(false)} />
      )}
    </main>
  );
}
