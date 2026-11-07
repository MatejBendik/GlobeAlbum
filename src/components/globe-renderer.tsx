"use client";
import { useEffect, useEffectEvent, useMemo, useRef, useState } from "react";
import Globe, { type GlobeMethods } from "react-globe.gl";
import { useTheme } from "next-themes";
import { MeshPhongMaterial } from "three";
import type { GlobeStyle } from "@/lib/globe-style";
import type { PlaceDto } from "@/lib/types";
import { choosePostcards, postcardScale } from "@/lib/marker-layout";

const colors = {
  dotted: {
    light: { ocean: "#f4f3ee", atmosphere: "#d9d6cb", dots: "#858b88" },
    dark: { ocean: "#14171b", atmosphere: "#8597b4", dots: "#6c737e" },
  },
  atlas: {
    light: { ocean: "#f2f2f2", atmosphere: "#dedede", dots: "#777777" },
    dark: { ocean: "#1c1c1c", atmosphere: "#999999", dots: "#929292" },
  },
  orbit: {
    light: { ocean: "#d4e9e9", atmosphere: "#8db8bb", dots: "#668c7a" },
    dark: { ocean: "#182c32", atmosphere: "#609694", dots: "#80aaa1" },
  },
};
const emptyLayer: object[] = [];
const surfaceAltitude = 0;
const keepSurfaceElementsMounted = () => {};

type Country = {
  geometry: { type: "Polygon" | "MultiPolygon"; coordinates: unknown[] };
  name: string;
  code: string;
  latitude: number;
  longitude: number;
  rank: number;
};
type SurfaceMarker = PlaceDto | Country;
const isCountry = (marker: SurfaceMarker): marker is Country =>
  "geometry" in marker;

type LabelBounds = { left: number; right: number; top: number; bottom: number };
function overlaps(a: LabelBounds, b: LabelBounds) {
  return (
    a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top
  );
}

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
  const showCountries = globeStyle !== "dotted";
  const classic = globeStyle === "orbit";
  const [countries, setCountries] = useState<Country[]>([]);
  const visited = useMemo(
    () => new Set(places.map((place) => place.country)),
    [places],
  );
  const labels = useMemo(
    () =>
      showCountries
        ? countries
            .slice()
            .sort(
              (a, b) =>
                Number(visited.has(b.code)) - Number(visited.has(a.code)) ||
                a.rank - b.rank,
            )
        : [],
    [countries, showCountries, visited],
  );
  const surfaceMarkers = useMemo(
    () => [...places, ...labels],
    [places, labels],
  );
  useEffect(() => {
    if (!showCountries || countries.length) return;
    const controller = new AbortController();
    fetch("/atlas-countries.geojson", { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error("Atlas geometry unavailable");
        return response.json();
      })
      .then(setCountries)
      .catch(() => {});
    return () => controller.abort();
  }, [showCountries, countries.length]);
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
  const stage = useRef<HTMLDivElement>(null);
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
    const labelElements = new Map<Country, HTMLSpanElement>();
    const labelWidths = new WeakMap<HTMLSpanElement, number>();
    let frame = 0;
    let lastScale = 0;
    function layout() {
      const current = globe.current;
      if (!current) return;
      const camera = current.camera();
      camera.updateMatrixWorld();
      const radius = current.getGlobeRadius();
      const limb = radius * radius;
      const labelLimb = limb + camera.position.length() * radius * 0.08;
      const facesCamera = (marker: SurfaceMarker, threshold: number) => {
        const { x, y, z } = current.getCoords(
          marker.latitude,
          marker.longitude,
          surfaceAltitude,
        );
        // A surface point is visible when the camera lies above its tangent plane.
        return (
          x * camera.position.x +
            y * camera.position.y +
            z * camera.position.z >
          threshold
        );
      };
      const distance = (1 + current.pointOfView().altitude) / cameraScale;
      const scale = postcardScale(distance);
      if (scale !== lastScale) {
        stage.current?.style.setProperty("--postcard-scale", String(scale));
        lastScale = scale;
      }
      const visible = places.filter((place) => {
        const button = elements.get(place.id);
        if (!button) return false;
        const visible = facesCamera(place, limb);
        const facing = String(visible);
        if (button.dataset.facing !== facing) {
          button.dataset.facing = facing;
          button.style.opacity = visible ? "1" : "0";
          button.style.pointerEvents = visible ? "auto" : "none";
          button.tabIndex = visible ? 0 : -1;
        }
        return visible;
      });
      const candidates = visible
        .map((place) => ({
          id: place.id,
          coverUrl: place.coverUrl,
          selected: place.id === selectedId,
          ...current.getScreenCoords(
            place.latitude,
            place.longitude,
            surfaceAltitude,
          ),
        }))
        .filter(({ x, y }) => x >= 0 && x <= width && y >= 0 && y <= height);
      const shown = choosePostcards(
        candidates.filter((place) => place.coverUrl),
        width < 600 ? 5 : 9,
        scale,
      );
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
      if (!labels.length) return;
      const occupied: LabelBounds[] = candidates.map(({ x, y }) => ({
        left: x - 7,
        right: x + 7,
        top: y - 7,
        bottom: y + 7,
      }));
      const rank =
        distance < 1.65 ? 7 : distance < 1.9 ? 4 : distance < 2.5 ? 3 : 2;
      for (const country of labels) {
        const label = labelElements.get(country);
        if (!label) continue;
        let shown = false;
        const isVisited = visited.has(country.code);
        if (
          (country.rank <= rank || isVisited) &&
          facesCamera(country, labelLimb)
        ) {
          const { x, y } = current.getScreenCoords(
            country.latitude,
            country.longitude,
          );
          let labelWidth = labelWidths.get(label);
          if (!labelWidth) {
            labelWidth = label.offsetWidth;
            if (labelWidth) labelWidths.set(label, labelWidth);
          }
          const halfWidth = labelWidth / 2 + 4;
          // Keep visited country names legible next to their place pins.
          for (const offset of isVisited ? [0, 18, -18] : [0]) {
            const bounds = {
              left: x - halfWidth,
              right: x + halfWidth,
              top: y + offset - 10,
              bottom: y + offset + 10,
            };
            if (
              bounds.left < 0 ||
              bounds.right > width ||
              bounds.top < 0 ||
              bounds.bottom > height ||
              occupied.some((other) => overlaps(bounds, other))
            )
              continue;
            label.style.setProperty("--label-offset", `${offset}px`);
            occupied.push(bounds);
            shown = true;
            break;
          }
        }
        label.toggleAttribute("data-label-visible", shown);
      }
    }
    function scheduleLayout() {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        layout();
      });
    }
    function element(object: object) {
      const marker = object as SurfaceMarker;
      if (isCountry(marker)) {
        const label = document.createElement("span");
        label.className = "globe-country-label";
        label.textContent = marker.name;
        label.setAttribute("aria-hidden", "true");
        labelElements.set(marker, label);
        scheduleLayout();
        return label;
      }
      const place = marker;
      const button = document.createElement("button");
      button.type = "button";
      button.tabIndex = -1;
      button.style.opacity = "0";
      button.style.pointerEvents = "none";
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
      const dot = document.createElement("span");
      dot.className = "marker-core";
      button.append(dot);
      button.onclick = (event) => {
        event.stopPropagation();
        onSelect(place.id);
      };
      elements.set(place.id, button);
      scheduleLayout();
      return button;
    }
    return {
      element,
      scheduleLayout,
      dispose() {
        if (frame) cancelAnimationFrame(frame);
        frame = 0;
      },
    };
  }, [
    cameraScale,
    height,
    labels,
    onSelect,
    places,
    selectedId,
    visited,
    width,
  ]);
  useEffect(() => {
    markers.scheduleLayout();
    return () => markers.dispose();
  }, [markers, ready]);
  return (
    <div
      ref={stage}
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
        atmosphereAltitude={0.075}
        polygonsData={showCountries ? countries : emptyLayer}
        polygonAltitude={0.01}
        polygonLabel={classic ? "name" : () => ""}
        polygonCapColor={() => (classic ? (dark ? "#4c6655" : "#a5c3a0") : "")}
        polygonStrokeColor={() =>
          classic
            ? dark
              ? "#789c83"
              : "#718f76"
            : dark
              ? "#8c8c8c"
              : "#767676"
        }
        polygonSideColor={() => ""}
        polygonsTransitionDuration={0}
        pointsData={showCountries && countries.length ? emptyLayer : dots}
        pointLat="lat"
        pointLng="lng"
        pointColor={() => palette.dots}
        pointRadius={0.19}
        pointAltitude={0.003}
        pointResolution={4}
        pointsMerge
        htmlElementsData={surfaceMarkers}
        htmlLat="latitude"
        htmlLng="longitude"
        htmlAltitude={surfaceAltitude}
        htmlTransitionDuration={0}
        htmlElement={markers.element}
        htmlElementVisibilityModifier={keepSurfaceElementsMounted}
        onZoom={markers.scheduleLayout}
      />
    </div>
  );
}
