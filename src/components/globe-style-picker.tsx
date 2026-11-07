"use client";

import { ChevronDown, Palette } from "lucide-react";
import { GLOBE_STYLES, type GlobeStyle } from "@/lib/globe-style";

const options = {
  dotted: { name: "Dotted", description: "Minimal land dots" },
  atlas: { name: "Atlas", description: "Soft country outlines" },
  orbit: { name: "Orbit", description: "Blue grid and light trails" },
};

export function GlobeStylePicker({
  value,
  pending,
  error,
  onChange,
}: {
  value: GlobeStyle;
  pending: boolean;
  error: string;
  onChange: (value: GlobeStyle) => void;
}) {
  return (
    <details className="globe-style-picker">
      <summary className="button-secondary">
        <Palette size={15} />
        Globe style
        <ChevronDown size={13} />
      </summary>
      <div className="globe-style-panel">
        <fieldset disabled={pending}>
          <legend className="sr-only">Choose a globe style</legend>
          {GLOBE_STYLES.map((style) => (
            <button
              key={style}
              type="button"
              className="globe-style-option"
              aria-pressed={value === style}
              onClick={() => onChange(style)}
            >
              <span
                className="globe-style-swatch"
                data-style={style}
                aria-hidden="true"
              />
              <span>
                <strong>{options[style].name}</strong>
                <small>{options[style].description}</small>
              </span>
            </button>
          ))}
        </fieldset>
        {error ? (
          <p className="form-error" role="alert">
            {error}
          </p>
        ) : (
          <p role="status">
            {pending ? "Saving style…" : "Shared with your globe."}
          </p>
        )}
      </div>
    </details>
  );
}
