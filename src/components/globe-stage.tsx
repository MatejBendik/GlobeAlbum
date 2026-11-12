"use client";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState } from "react";
import { Globe2, LocateFixed, Pause, Play, List } from "lucide-react";
import type { GlobeStyle } from "@/lib/globe-style";
import type { PlaceDto } from "@/lib/types";
import { Button } from "./ui/button";
const Renderer = dynamic(() => import("./globe-renderer"), {
  ssr: false,
  loading: () => (
    <div className="globe-loading">
      <div className="globe-loading-sphere" />
      <span>Bringing your world together</span>
    </div>
  ),
});
export function GlobeStage({
  places,
  globeStyle = "dotted",
  selectedId,
  focusRequest,
  pauseRotation = false,
  onSelect,
  hero = false,
  onUnavailable,
  embedded = false,
  renderPaused = false,
}: {
  places: PlaceDto[];
  globeStyle?: GlobeStyle;
  selectedId?: string;
  focusRequest?: { placeId: string };
  pauseRotation?: boolean;
  onSelect: (id: string) => void;
  hero?: boolean;
  onUnavailable?: () => void;
  embedded?: boolean;
  renderPaused?: boolean;
}) {
  const container = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [supported, setSupported] = useState<boolean | null>(null);
  const [reducedMotion, setReducedMotion] = useState(true);
  const [rotationOverride, setRotationOverride] = useState<boolean>();
  const rotating = rotationOverride ?? !reducedMotion;
  const [reset, setReset] = useState(0);
  const [inView, setInView] = useState(true);
  const [documentVisible, setDocumentVisible] = useState(true);
  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) =>
      setInView(entry.isIntersecting),
    );
    if (container.current) observer.observe(container.current);
    const visibility = () =>
      setDocumentVisible(document.visibilityState !== "hidden");
    visibility();
    document.addEventListener("visibilitychange", visibility);
    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", visibility);
    };
  }, []);
  const handleFailure = useCallback(() => {
    setSupported(false);
    onUnavailable?.();
  }, [onUnavailable]);
  useEffect(() => {
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("webgl2");
    setSupported(!!context);
    if (!context) onUnavailable?.();
    context?.getExtension("WEBGL_lose_context")?.loseContext();
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const change = () => {
      setReducedMotion(media.matches);
      setRotationOverride(undefined);
    };
    change();
    media.addEventListener("change", change);
    return () => media.removeEventListener("change", change);
  }, [onUnavailable]);
  useEffect(() => {
    if (!container.current) return;
    const observer = new ResizeObserver(([entry]) =>
      setSize({
        width: Math.round(entry.contentRect.width),
        height: Math.round(entry.contentRect.height),
      }),
    );
    observer.observe(container.current);
    return () => observer.disconnect();
  }, []);
  return (
    <div
      ref={container}
      className={`globe-stage ${hero ? "hero-stage" : ""}`}
      aria-label="Interactive travel globe"
    >
      <div className="globe-glow" />
      {supported && size.width > 0 ? (
        <Renderer
          {...size}
          reset={reset}
          places={places}
          globeStyle={globeStyle}
          selectedId={selectedId}
          focusRequest={focusRequest}
          onSelect={onSelect}
          rotating={rotating && !pauseRotation}
          active={inView && documentVisible && !renderPaused}
          onFailure={handleFailure}
        />
      ) : supported === false ? (
        <div className="globe-unavailable">
          <Globe2 size={64} strokeWidth={0.6} />
          <h3>Your places are still here.</h3>
          <p>Use the place list to explore every gallery.</p>
          <List size={20} />
        </div>
      ) : (
        <div className="globe-loading">
          <div className="globe-loading-sphere" />
        </div>
      )}
      {!hero && (
        <>
          {!embedded && (
            <div className="stage-topline">
              <span>
                <span className="live-dot" />
                THE WORLD, THROUGH YOUR EYES
              </span>
              <span>3D VIEW</span>
            </div>
          )}
          <div className="globe-controls">
            <Button
              variant="ghost"
              size="icon"
              className="stage-button"
              aria-label={rotating ? "Pause rotation" : "Start rotation"}
              onClick={() => setRotationOverride(!rotating)}
            >
              {rotating ? <Pause /> : <Play />}
            </Button>
            <span />
            <Button
              variant="ghost"
              size="icon"
              className="stage-button"
              aria-label="Reset globe view"
              onClick={() => {
                setRotationOverride(false);
                setReset((value) => value + 1);
              }}
            >
              <LocateFixed />
            </Button>
          </div>
          {!embedded && (
            <div className="stage-caption">
              Drag to explore <span>·</span> Scroll to zoom <span>·</span>{" "}
              Select a place
            </div>
          )}
          {!embedded && (
            <span className="stage-coordinate">48° 51′ N &nbsp; 2° 21′ E</span>
          )}
        </>
      )}
    </div>
  );
}
