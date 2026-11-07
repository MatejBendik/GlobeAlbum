"use client";
import { useEffect, useEffectEvent, useMemo, useRef, useState } from "react";
import Globe, { type GlobeMethods } from "react-globe.gl";
import { useTheme } from "next-themes";
import { MeshPhongMaterial } from "three";
import type { GlobeStyle } from "@/lib/globe-style";
import type { PlaceDto } from "@/lib/types";
import { choosePostcards } from "@/lib/marker-layout";

const colors = {
  dotted: {
    light: { ocean: "#f4f3ee", atmosphere: "#d9d6cb", dots: "#858b88" },
    dark: { ocean: "#14171b", atmosphere: "#8597b4", dots: "#6c737e" },
  },
  atlas: {
    light: { ocean: "#d4e9e9", atmosphere: "#8db8bb", dots: "#668c7a" },
    dark: { ocean: "#182c32", atmosphere: "#609694", dots: "#80aaa1" },
  },
  orbit: {
    light: { ocean: "#c6e4f4", atmosphere: "#739cce", dots: "#427a9e" },
    dark: { ocean: "#10253c", atmosphere: "#6a9edc", dots: "#6db3da" },
  },
};
const emptyLayer: object[] = [];

export default function GlobeRenderer({
  places,
  globeStyle,
  selectedId,
  onSelect,
  rotating,
  reset,
  width,
  height,
  onFailure,
}: {
  places: PlaceDto[];
  globeStyle: GlobeStyle;
  selectedId?: string;
  onSelect: (id: string) => void;
  rotating: boolean;
  reset: number;
  width: number;
  height: number;
  onFailure: () => void;
}) {
  const { resolvedTheme } = useTheme();
  const dark = resolvedTheme === "dark";
  const palette = colors[globeStyle][dark ? "dark" : "light"];
  const atlas = globeStyle === "atlas";
  const orbit = globeStyle === "orbit";
  const [countries, setCountries] = useState<object[]>([]);
  const arcs = useMemo(
    () =>
      orbit
        ? places.slice(1, 7).map((place, index) => ({
            startLat: places[index].latitude,
            startLng: places[index].longitude,
            endLat: place.latitude,
            endLng: place.longitude,
          }))
        : emptyLayer,
    [orbit, places],
  );
  useEffect(() => {
    if (!atlas || countries.length) return;
    const controller = new AbortController();
    fetch("/atlas-countries.geojson", { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error("Atlas geometry unavailable");
        return response.json();
      })
      .then(setCountries)
      .catch(() => {});
    return () => controller.abort();
  }, [atlas, countries.length]);
  // Perspective projection fits height; compensate for narrow portrait viewports.
  const cameraScale = Math.max(1, height / width);
  const featured = places.find((place) => place.coverUrl) ?? places[0];
  const selected = places.find((place) => place.id === selectedId);
  const focusPlace = useEffectEvent((animate: boolean) => {
    const current = globe.current;
    if (!current) return;
    const place = selected ?? featured;
    const controls = current.controls();
    // Flush momentum from the previous drag before changing the view.
    const damping = controls.enableDamping;
    controls.enableDamping = false;
    controls.update();
    controls.enableDamping = damping;
    current.pointOfView(
      {
        lat: place?.latitude ?? 30,
        lng: place?.longitude ?? 16,
        altitude: (selected ? 2.7 : 3.15) * cameraScale - 1,
      },
      animate && !window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? 650
        : 0,
    );
  });
  const globe = useRef<GlobeMethods | undefined>(undefined),
    [dots, setDots] = useState<{ lat: number; lng: number }[]>([]),
    [ready, setReady] = useState(false);
  const material = useMemo(
    () =>
      new MeshPhongMaterial({
        color: palette.ocean,
        shininess: 4,
      }),
    [palette.ocean],
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
    controls.maxDistance = Math.max(700, 440 * cameraScale);
  }, [ready, rotating, cameraScale]);
  useEffect(() => {
    if (ready) focusPlace(reset > 0);
  }, [ready, reset, cameraScale, featured?.latitude, featured?.longitude]);
  useEffect(() => {
    if (ready && selected) focusPlace(true);
  }, [ready, selected?.latitude, selected?.longitude]);
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
        // Keep the geographic hit target steady while its postcard enlarges.
        const card = document.createElement("span");
        card.className = "marker-card";
        card.dataset.layers = String(Math.min(3, place.photoCount));
        if (place.photoCount > 1)
          button.setAttribute("aria-description", `${place.photoCount} photos`);
        const paper = document.createElement("span");
        paper.className = "marker-paper";
        const img = document.createElement("img");
        img.alt = "";
        img.loading = "lazy";
        img.draggable = false;
        const label = document.createElement("span");
        label.className = "marker-label";
        label.textContent = place.name;
        paper.append(img, label);
        card.append(paper);
        button.append(card);
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
    <div
      data-globe-theme={dark ? "dark" : "light"}
      data-globe-style={globeStyle}
      onContextMenu={(event) => event.preventDefault()}
    >
      <Globe
        ref={globe}
        width={width}
        height={height}
        backgroundColor="rgba(0,0,0,0)"
        globeMaterial={material}
        showAtmosphere
        atmosphereColor={palette.atmosphere}
        atmosphereAltitude={orbit ? 0.13 : 0.075}
        showGraticules={orbit}
        polygonsData={atlas ? countries : emptyLayer}
        polygonAltitude={0.01}
        polygonCapColor={() => (dark ? "#4c6655" : "#a5c3a0")}
        polygonStrokeColor={() => (dark ? "#789c83" : "#718f76")}
        polygonSideColor={() => "transparent"}
        polygonsTransitionDuration={0}
        arcsData={arcs}
        arcColor={() =>
          dark ? ["#62b8ee", "#b2dedb"] : ["#3476b0", "#387f91"]
        }
        arcAltitudeAutoScale={0.27}
        arcStroke={0.28}
        arcsTransitionDuration={0}
        pointsData={atlas && countries.length ? emptyLayer : dots}
        pointLat="lat"
        pointLng="lng"
        pointColor={() => palette.dots}
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
