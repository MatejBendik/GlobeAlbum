"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowUpRight, List, MapPin, X } from "lucide-react";
import type { GlobeDto } from "@/lib/types";
import { countryName } from "@/lib/countries";
import { GlobeStage } from "./globe-stage";
import { PlaceGallery } from "./place-gallery";
import { Button } from "./ui/button";

const unchanged = () => {};

export function EmbedViewer({ globe }: { globe: GlobeDto }) {
  const [selectedId, setSelectedId] = useState<string>();
  const [placesOpen, setPlacesOpen] = useState(false);
  const listButton = useRef<HTMLButtonElement>(null);
  const openPlaces = useCallback(() => setPlacesOpen(true), []);
  const choose = useCallback((id: string) => {
    setSelectedId(id);
    setPlacesOpen(false);
  }, []);
  const active = globe.places.find((place) => place.id === selectedId);

  useEffect(() => {
    if (!placesOpen) return;
    const close = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setPlacesOpen(false);
        listButton.current?.focus();
      }
    };
    document.addEventListener("keydown", close);
    return () => document.removeEventListener("keydown", close);
  }, [placesOpen]);

  return (
    <main
      className="embed-viewer"
      aria-label={`${globe.displayName} travel globe`}
    >
      <GlobeStage
        places={globe.places}
        globeStyle={globe.style}
        selectedId={selectedId}
        pauseRotation={Boolean(active)}
        onSelect={choose}
        onUnavailable={openPlaces}
        embedded
      />
      <Button
        ref={listButton}
        variant="secondary"
        size="sm"
        className="embed-places-button"
        aria-expanded={placesOpen}
        aria-controls="embed-places"
        onClick={() => setPlacesOpen((open) => !open)}
      >
        <List size={16} /> Places
      </Button>
      <a
        className="embed-attribution"
        href={`/u/${encodeURIComponent(globe.username)}`}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="GlobeAlbum — open full globe in a new tab"
      >
        GlobeAlbum <ArrowUpRight size={13} />
      </a>
      {placesOpen && (
        <aside
          className="embed-places"
          id="embed-places"
          aria-label="Place list"
        >
          <div className="embed-places-heading">
            <h2>Places</h2>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Close places"
              onClick={() => {
                setPlacesOpen(false);
                listButton.current?.focus();
              }}
            >
              <X size={16} />
            </Button>
          </div>
          <nav aria-label="Visited places">
            {globe.places.map((place) => (
              <button
                key={place.id}
                className="embed-place"
                onClick={() => choose(place.id)}
              >
                <MapPin size={16} />
                <span>
                  <strong>{place.name}</strong>
                  <small>
                    {countryName(place.country)} · {place.photoCount}{" "}
                    {place.photoCount === 1 ? "photo" : "photos"}
                  </small>
                </span>
              </button>
            ))}
          </nav>
          {!globe.places.length && <p>No places here yet.</p>}
        </aside>
      )}
      {active && (
        <PlaceGallery
          key={active.id}
          place={active}
          owner={false}
          demo={false}
          remaining={0}
          galleryUrl={`/api/embed/${encodeURIComponent(globe.username)}/places/${encodeURIComponent(active.id)}/gallery`}
          onClose={() => setSelectedId(undefined)}
          onChanged={unchanged}
        />
      )}
    </main>
  );
}
