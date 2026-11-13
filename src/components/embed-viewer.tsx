"use client";

import { useCallback, useState } from "react";
import { ArrowUpRight, MapPin } from "lucide-react";
import type { GlobeDto } from "@/lib/types";
import { countryName } from "@/lib/countries";
import { GlobeStage } from "./globe-stage";
import { PlaceGallery } from "./place-gallery";

const unchanged = () => {};

export function EmbedViewer({ globe }: { globe: GlobeDto }) {
  const [selectedId, setSelectedId] = useState<string>();
  const [unavailable, setUnavailable] = useState(false);
  const showFallback = useCallback(() => setUnavailable(true), []);
  const choose = useCallback((id: string) => setSelectedId(id), []);
  const active = globe.places.find((place) => place.id === selectedId);

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
        onUnavailable={showFallback}
        embedded
      />
      <a
        className="embed-attribution"
        href={`/u/${encodeURIComponent(globe.username)}`}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="GlobeAlbum — open full globe in a new tab"
      >
        GlobeAlbum <ArrowUpRight size={13} />
      </a>
      <nav
        className={`embed-places ${unavailable ? "" : "embed-places-accessible"}`}
        aria-label="Visited places"
      >
        <h2>Places</h2>
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
        {!globe.places.length && <p>No places here yet.</p>}
      </nav>
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
