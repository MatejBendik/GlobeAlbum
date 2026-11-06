"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, MapPin } from "lucide-react";
import { demoGlobe } from "@/lib/demo";
import { countryName } from "@/lib/countries";
import { PlaceGallery } from "./place-gallery";
import { GlobeStage } from "./globe-stage";

export function HeroGlobe() {
  const [selected, setSelected] = useState("paris");
  const [preview, setPreview] = useState(false);
  const select = useCallback((id: string) => {
    setSelected(id);
    setPreview(true);
  }, []);
  const place = demoGlobe.places.find((item) => item.id === selected)!;

  return (
    <div className="hero-globe-composition">
      <GlobeStage
        hero
        places={demoGlobe.places}
        selectedId={selected}
        onSelect={select}
      />
      <Link href={`/demo?place=${selected}`} className="hero-place-note">
        <MapPin size={14} />
        <span>
          {place.name}, {countryName(place.country)}
          <small>A glimpse of the example collection</small>
        </span>
        <ArrowUpRight size={16} />
      </Link>
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
      <span className="hero-orbit-label">YOUR MEMORIES, IN ORBIT</span>
    </div>
  );
}
