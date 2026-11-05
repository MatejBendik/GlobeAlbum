"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import Globe, { type GlobeMethods } from "react-globe.gl";
import { MeshPhongMaterial } from "three";
import type { PlaceDto } from "@/lib/types";

export default function GlobeRenderer({
  places,
  selectedId,
  onSelect,
  rotating,
  width,
  height,
  onFailure,
}: {
  places: PlaceDto[];
  selectedId?: string;
  onSelect: (id: string) => void;
  rotating: boolean;
  width: number;
  height: number;
  onFailure: () => void;
}) {
  const globe = useRef<GlobeMethods | undefined>(undefined),
    [dots, setDots] = useState<{ lat: number; lng: number }[]>([]),
    [ready, setReady] = useState(false);
  const material = useMemo(
    () => new MeshPhongMaterial({ color: "#14171b", shininess: 2 }),
    [],
  );
  useEffect(() => {
    const controller = new AbortController();
    fetch("/land-dots.json", { signal: controller.signal })
      .then((r) => r.json())
      .then(setDots)
      .catch(() => {});
    return () => controller.abort();
  }, []);
  useEffect(() => () => material.dispose(), [material]);
  useEffect(() => {
    if (!ready || !globe.current) return;
    const controls = globe.current.controls();
    controls.autoRotate = rotating;
    controls.autoRotateSpeed = 0.38;
    controls.enablePan = false;
    controls.minDistance = 150;
    controls.maxDistance = 700;
  }, [ready, rotating]);
  useEffect(() => {
    if (!ready || !selectedId) return;
    const place = places.find((p) => p.id === selectedId);
    if (place)
      globe.current?.pointOfView(
        { lat: place.latitude, lng: place.longitude, altitude: 1.7 },
        650,
      );
  }, [ready, selectedId, places]);
  const element = useMemo(() => {
    const shown = new Set(
      places
        .filter((p) => p.coverUrl)
        .slice(0, width < 600 ? 5 : 9)
        .map((p) => p.id),
    );
    return (object: object) => {
      const place = object as PlaceDto;
      const button = document.createElement("button");
      button.type = "button";
      button.className = `globe-marker ${shown.has(place.id) ? "photo-marker" : "dot-marker"} ${selectedId === place.id ? "marker-selected" : ""}`;
      button.setAttribute("aria-label", `Open ${place.name} gallery`);
      if (shown.has(place.id) && place.coverUrl) {
        const img = document.createElement("img");
        img.src = place.coverUrl;
        img.alt = "";
        img.loading = "lazy";
        img.draggable = false;
        button.append(img);
        const label = document.createElement("span");
        label.textContent = place.name;
        button.append(label);
      } else {
        const dot = document.createElement("span");
        dot.className = "marker-core";
        button.append(dot);
      }
      button.onclick = (event) => {
        event.stopPropagation();
        onSelect(place.id);
      };
      return button;
    };
  }, [places, width, selectedId, onSelect]);
  return (
    <div onContextMenu={(event) => event.preventDefault()}>
      <Globe
        ref={globe}
        width={width}
        height={height}
        backgroundColor="rgba(0,0,0,0)"
        globeMaterial={material}
        showAtmosphere
        atmosphereColor="#8597b4"
        atmosphereAltitude={0.075}
        showGraticules={false}
        pointsData={dots}
        pointLat="lat"
        pointLng="lng"
        pointColor={() => "#6c737e"}
        pointRadius={0.19}
        pointAltitude={0.003}
        pointResolution={4}
        pointsMerge
        htmlElementsData={places}
        htmlLat="latitude"
        htmlLng="longitude"
        htmlAltitude={0.045}
        htmlElement={element}
        htmlElementVisibilityModifier={(el, visible) => {
          el.style.opacity = visible ? "1" : "0";
          el.style.pointerEvents = visible ? "auto" : "none";
          el.tabIndex = visible ? 0 : -1;
        }}
        onGlobeReady={() => {
          setReady(true);
          globe.current?.pointOfView({ lat: 30, lng: 16, altitude: 2.15 }, 0);
          const renderer = globe.current?.renderer();
          renderer?.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
          renderer?.domElement.addEventListener("webglcontextlost", onFailure, {
            once: true,
          });
        }}
      />
    </div>
  );
}
