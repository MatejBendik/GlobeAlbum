"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, MapPin } from "lucide-react";
import { demoGlobe } from "@/lib/demo";
import { countryName } from "@/lib/countries";
import {
  GLOBE_STYLE_OPTIONS,
  GLOBE_STYLES,
  type GlobeStyle,
} from "@/lib/globe-style";
import { PlaceGallery } from "./place-gallery";
import { GlobeStage } from "./globe-stage";
import { Button } from "./ui/button";

export function HeroGlobe() {
  const [selected, setSelected] = useState("paris");
  const [preview, setPreview] = useState(false);
  const [globeStyle, setGlobeStyle] = useState<GlobeStyle>("dotted");
  const [unavailable, setUnavailable] = useState(false);
  const markUnavailable = useCallback(() => setUnavailable(true), []);
  const select = useCallback((id: string) => {
    setSelected(id);
    setPreview(true);
  }, []);
  const place = demoGlobe.places.find((item) => item.id === selected)!;

  return (
    <div className="hero-globe-composition">
      <span className="hero-orbit-label">YOUR MEMORIES, IN ORBIT</span>
      <GlobeStage
        hero
        places={demoGlobe.places}
        globeStyle={globeStyle}
        selectedId={selected}
        pauseRotation={preview}
        onSelect={select}
        onUnavailable={markUnavailable}
      />
      <div className="hero-preview-controls">
        <Link href={`/demo?place=${selected}`} className="hero-place-note">
          <MapPin size={16} />
          <span>
            {place.name}, {countryName(place.country)}
            <small>A glimpse of the example collection</small>
          </span>
          <ArrowUpRight size={16} />
        </Link>
        {!unavailable && (
          <div
            className="hero-style-options"
            role="group"
            aria-label="Preview globe style"
          >
            {GLOBE_STYLES.map((style) => (
              <Button
                key={style}
                type="button"
                size="sm"
                variant="secondary"
                className="hero-style-button"
                aria-pressed={globeStyle === style}
                onClick={() => setGlobeStyle(style)}
              >
                <span
                  className="globe-style-swatch"
                  data-style={style}
                  aria-hidden="true"
                />
                {GLOBE_STYLE_OPTIONS[style].name}
              </Button>
            ))}
          </div>
        )}
      </div>
      {preview && (
        <PlaceGallery
          key={selected}
          place={place}
          owner={false}
          demo
          remaining={0}
          onClose={() => setPreview(false)}
          onChanged={() => {}}
        />
      )}
    </div>
  );
}
