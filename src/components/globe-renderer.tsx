"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import Globe, { type GlobeMethods } from "react-globe.gl";
import { MeshPhongMaterial } from "three";
import type { PlaceDto } from "@/lib/types";
import { choosePostcards } from "@/lib/marker-layout";

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
    const current = globe.current;
    if (!current) return;
    current.pointOfView({ lat: 30, lng: 16, altitude: 2.15 }, 0);
    const renderer = current.renderer();
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.domElement.addEventListener("webglcontextlost", onFailure);
    setReady(true);
    return () =>
      renderer.domElement.removeEventListener("webglcontextlost", onFailure);
  }, [onFailure]);
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
        window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 650,
      );
  }, [ready, selectedId, places]);
  const markers = useMemo(() => {
    const elements = new Map<string, HTMLButtonElement>();
    let frame = 0;
    function layout() {
      if (!globe.current) return;
      const visible = places.filter(
        (place) =>
          place.coverUrl && elements.get(place.id)?.dataset.facing === "true",
      );
      const candidates = visible.map((place) => ({
        id: place.id,
        selected: place.id === selectedId,
        ...globe.current!.getScreenCoords(
          place.latitude,
          place.longitude,
          0.045,
        ),
      }));
      const shown = choosePostcards(candidates, width < 600 ? 5 : 9);
      for (const place of places) {
        const button = elements.get(place.id);
        if (!button) continue;
        const postcard = shown.has(place.id);
        button.classList.toggle("photo-marker", postcard);
        button.classList.toggle("dot-marker", !postcard);
        const image = button.querySelector("img");
        if (postcard && image && !image.getAttribute("src") && place.coverUrl)
          image.src = place.coverUrl;
      }
    }
    function element(object: object) {
      const place = object as PlaceDto;
      const button = document.createElement("button");
      button.type = "button";
      button.className = `globe-marker dot-marker ${selectedId === place.id ? "marker-selected" : ""}`;
      button.setAttribute("aria-label", `Open ${place.name} gallery`);
      if (place.coverUrl) {
        const img = document.createElement("img");
        img.alt = "";
        img.loading = "lazy";
        img.draggable = false;
        button.append(img);
        const label = document.createElement("span");
        label.className = "marker-label";
        label.textContent = place.name;
        button.append(label);
      }
      {
        const dot = document.createElement("span");
        dot.className = "marker-core";
        button.append(dot);
      }
      button.onclick = (event) => {
        event.stopPropagation();
        onSelect(place.id);
      };
      elements.set(place.id, button);
      return button;
    }
    return {
      element,
      layout,
      visibility(el: HTMLElement, visible: boolean) {
        el.dataset.facing = String(visible);
        el.style.opacity = visible ? "1" : "0";
        el.style.pointerEvents = visible ? "auto" : "none";
        el.tabIndex = visible ? 0 : -1;
        if (!frame)
          frame = requestAnimationFrame(() => {
            frame = 0;
            layout();
          });
      },
      dispose() {
        if (frame) cancelAnimationFrame(frame);
      },
    };
  }, [places, width, selectedId, onSelect]);
  useEffect(() => () => markers.dispose(), [markers]);
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
        htmlElement={markers.element}
        htmlElementVisibilityModifier={markers.visibility}
        onZoom={markers.layout}
      />
    </div>
  );
}
