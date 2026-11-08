"use client";

import { ChevronDown, Palette } from "lucide-react";
import { useRef } from "react";
import {
  GLOBE_STYLE_OPTIONS,
  GLOBE_STYLES,
  type GlobeStyle,
} from "@/lib/globe-style";

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
  const details = useRef<HTMLDetailsElement>(null);
  const summary = useRef<HTMLElement>(null);

  function selectStyle(style: GlobeStyle) {
    if (details.current) details.current.open = false;
    summary.current?.focus({ preventScroll: true });
    onChange(style);
  }

  return (
    <>
      <details ref={details} className="globe-style-picker">
        <summary ref={summary} className="button-secondary">
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
                onClick={() => selectStyle(style)}
              >
                <span
                  className="globe-style-swatch"
                  data-style={style}
                  aria-hidden="true"
                />
                <span>
                  <strong>{GLOBE_STYLE_OPTIONS[style].name}</strong>
                  <small>{GLOBE_STYLE_OPTIONS[style].description}</small>
                </span>
              </button>
            ))}
          </fieldset>
          <p>Shared with your globe.</p>
        </div>
      </details>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      {pending && (
        <p className="field-hint" role="status">
          Saving style…
        </p>
      )}
    </>
  );
}
