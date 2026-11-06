"use client";
import Link from "next/link";
import { useCallback, useState } from "react";
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
  Settings2,
  Share2,
  ImageIcon,
  LogOut,
} from "lucide-react";
import type { GlobeDto } from "@/lib/types";
import { countryName } from "@/lib/countries";
import {
  publicationAction,
  renameAction,
  deleteAccountAction,
  signOutAction,
} from "@/app/actions";
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
}: {
  globe: GlobeDto;
  owner?: boolean;
  demo?: boolean;
}) {
  const router = useRouter(),
    params = useSearchParams();
  const [query, setQuery] = useState(""),
    [adding, setAdding] = useState(false),
    [settings, setSettings] = useState(false),
    [sharing, setSharing] = useState(false),
    [copied, setCopied] = useState(false),
    [error, setError] = useState(""),
    [pending, setPending] = useState(false);
  const selected = params.get("place") ?? undefined;
  const active = globe.places.find((place) => place.id === selected);
  const choose = useCallback(
    (id: string) => {
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
                variant="ghost"
                size="icon"
                aria-label="Profile settings"
                onClick={() => setSettings(true)}
              >
                <Settings2 />
              </Button>
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
                <Link href={demo ? "/" : "/sign-in"}>
                  {demo ? <ArrowLeft /> : <Plus />}
                  {demo ? "Back home" : "Create your globe"}
                </Link>
              </Button>
            </>
          )}
        </div>
      </header>
      <div className="workspace-body">
        <aside className="place-sidebar">
          <div className="collection-profile">
            <span className="eyebrow">
              {owner
                ? "YOUR COLLECTION"
                : demo
                  ? "EXAMPLE COLLECTION"
                  : "TRAVEL COLLECTION"}
            </span>
            <div className="profile-heading">
              <span className="profile-monogram">
                {globe.displayName.slice(0, 1).toUpperCase()}
              </span>
              <h1>{globe.displayName}</h1>
            </div>
            <p className="collection-stats">
              <strong>{globe.places.length}</strong>{" "}
              {globe.places.length === 1 ? "place" : "places"} in{" "}
              <strong>{globe.countryCount}</strong>{" "}
              {globe.countryCount === 1 ? "country" : "countries"}
            </p>
            <p className="stats-explanation">
              Including separately listed territories.
            </p>
          </div>
          <div className="place-list-header">
            <h2>Places</h2>
            <span>{globe.places.length.toString().padStart(2, "0")}</span>
          </div>
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
                    {place.photoCount} photo{place.photoCount !== 1 ? "s" : ""}
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
          <div className="sidebar-footer">
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
        <section className="globe-workspace" aria-label="Globe view">
          <GlobeStage
            places={globe.places}
            selectedId={selected}
            onSelect={choose}
          />
          {globe.places.length === 0 && owner && (
            <div className="empty-globe-note">
              <span>THE FIRST PIN IS YOURS</span>
              <p>Where did your journey begin?</p>
            </div>
          )}
        </section>
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
      <Dialog open={settings} onOpenChange={setSettings}>
        <DialogContent>
          <DialogTitle className="dialog-title">Profile settings</DialogTitle>
          <DialogDescription className="dialog-description">
            Your display name can change. Your globe address stays yours.
          </DialogDescription>
          <SettingsForm globe={globe} onDone={changed} />
        </DialogContent>
      </Dialog>
    </main>
  );
}
function SettingsForm({
  globe,
  onDone,
}: {
  globe: GlobeDto;
  onDone: () => void;
}) {
  const [name, setName] = useState(globe.displayName),
    [confirmation, setConfirmation] = useState(""),
    [error, setError] = useState(""),
    [pending, setPending] = useState(false);
  return (
    <div className="form-stack">
      <form
        className="form-stack"
        onSubmit={async (event) => {
          event.preventDefault();
          setPending(true);
          const result = await renameAction(name);
          setPending(false);
          if (result.error) setError(result.error);
          else {
            setError("");
            onDone();
          }
        }}
      >
        <div className="field">
          <label htmlFor="settings-name">Display name</label>
          <input
            id="settings-name"
            value={name}
            maxLength={60}
            required
            onChange={(event) => setName(event.target.value)}
          />
        </div>
        <p className="field-hint">Your address: /u/{globe.username}</p>
        <Button disabled={pending}>Save profile</Button>
      </form>
      <form action={signOutAction}>
        <Button variant="secondary" type="submit">
          <LogOut />
          Sign out
        </Button>
      </form>
      <div className="danger-zone">
        <h3>Delete account</h3>
        <p>
          This permanently removes your globe, visits and photos. There is no
          undo.
        </p>
        <label htmlFor="delete-confirmation">
          Type <strong>{globe.username}</strong> to confirm
        </label>
        <input
          id="delete-confirmation"
          value={confirmation}
          onChange={(event) => setConfirmation(event.target.value)}
          autoComplete="off"
        />
        <Button
          variant="destructive"
          disabled={pending || confirmation !== globe.username}
          onClick={async () => {
            setPending(true);
            const result = await deleteAccountAction(confirmation);
            setPending(false);
            if (result.error) setError(result.error);
          }}
        >
          Delete account permanently
        </Button>
      </div>
      {error && (
        <p role="alert" className="form-error">
          {error}
        </p>
      )}
    </div>
  );
}
