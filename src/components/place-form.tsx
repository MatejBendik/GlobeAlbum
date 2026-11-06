"use client";
import dynamic from "next/dynamic";
import { useEffect, useId, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowRight, Loader2, MapPin, Search } from "lucide-react";
import { placeSchema, visitSchema } from "@/lib/validation";
import { COUNTRIES, countryName } from "@/lib/countries";
import { addPlaceAction, addVisitAction, editVisitAction } from "@/app/actions";
import { Button } from "./ui/button";
import { DatePicker, type DatePickerProps } from "./ui/date-picker";
import type { VisitDto } from "@/lib/types";
const LocationPicker = dynamic(() => import("./location-picker"), {
  ssr: false,
  loading: () => <p className="field-hint">Loading map…</p>,
});
type SearchPlace = {
  name: string;
  providerId: string;
  country: string;
  region: string;
  latitude: number;
  longitude: number;
};
export type AddedPlace = { placeId: string; visitId: string; name: string };
export function PlaceForm({
  onDone,
  onBusyChange,
}: {
  onDone: (place: AddedPlace) => void;
  onBusyChange?: (busy: boolean) => void;
}) {
  const listId = useId();
  const form = useForm<
    z.input<typeof placeSchema>,
    unknown,
    z.output<typeof placeSchema>
  >({
    resolver: zodResolver(placeSchema),
    defaultValues: {
      name: "",
      country: "",
      latitude: Number.NaN,
      longitude: Number.NaN,
      startDate: "",
      endDate: "",
    },
  });
  const [query, setQuery] = useState(""),
    [results, setResults] = useState<SearchPlace[]>([]),
    [manual, setManual] = useState(false),
    [mapOpen, setMapOpen] = useState(false),
    [searchError, setSearchError] = useState(""),
    [searching, setSearching] = useState(false),
    [expanded, setExpanded] = useState(false),
    [activeIndex, setActiveIndex] = useState(-1),
    [pending, setPending] = useState(false),
    [error, setError] = useState("");
  useEffect(() => {
    if (manual || query.length < 2) {
      setResults([]);
      setSearching(false);
      return;
    }
    const controller = new AbortController();
    setSearching(true);
    const timer = setTimeout(() => {
      fetch(`/api/places/search?q=${encodeURIComponent(query)}`, {
        signal: controller.signal,
      })
        .then(async (response) => {
          const value = await response.json();
          if (!response.ok) throw new Error(value.error);
          if (controller.signal.aborted) return;
          setSearchError("");
          setResults(value.places);
          setActiveIndex(-1);
        })
        .catch((error) => {
          if (error.name !== "AbortError") setSearchError(error.message);
        })
        .finally(() => {
          if (!controller.signal.aborted) setSearching(false);
        });
    }, 350);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, manual]);
  useEffect(() => {
    if (expanded && activeIndex >= 0)
      document
        .getElementById(`${listId}-${activeIndex}`)
        ?.scrollIntoView({ block: "nearest" });
  }, [activeIndex, expanded, listId]);
  async function submit(value: z.output<typeof placeSchema>) {
    setPending(true);
    onBusyChange?.(true);
    setError("");
    const result = await addPlaceAction(value);
    setPending(false);
    onBusyChange?.(false);
    if (result.error) setError(result.error);
    else if (result.placeId && result.visitId)
      onDone({
        placeId: result.placeId,
        visitId: result.visitId,
        name: value.name,
      });
  }
  function choose(place: SearchPlace) {
    form.reset({ ...form.getValues(), ...place });
    setQuery("");
    setResults([]);
    setExpanded(false);
    setSearchError("");
    setManual(true);
    setMapOpen(false);
  }
  return (
    <form onSubmit={form.handleSubmit(submit)} className="form-stack">
      <div className="field">
        <label htmlFor="place-name">City or town</label>
        <div className="input-icon">
          <Search size={16} />
          <input
            id="place-name"
            autoComplete="off"
            role="combobox"
            aria-autocomplete="list"
            aria-expanded={expanded && results.length > 0}
            aria-controls={expanded && results.length > 0 ? listId : undefined}
            aria-activedescendant={
              expanded && activeIndex >= 0
                ? `${listId}-${activeIndex}`
                : undefined
            }
            aria-describedby="place-search-status"
            disabled={pending}
            onFocus={() => setExpanded(true)}
            onKeyDown={(event) => {
              if (event.key === "Escape" && expanded && results.length) {
                event.preventDefault();
                event.stopPropagation();
                setExpanded(false);
              } else if (
                (event.key === "ArrowDown" || event.key === "ArrowUp") &&
                results.length
              ) {
                event.preventDefault();
                setExpanded(true);
                setActiveIndex((index) =>
                  event.key === "ArrowDown"
                    ? (index + 1) % results.length
                    : (index <= 0 ? results.length : index) - 1,
                );
              } else if (
                event.key === "Enter" &&
                expanded &&
                activeIndex >= 0 &&
                results[activeIndex]
              ) {
                event.preventDefault();
                choose(results[activeIndex]);
              }
            }}
            placeholder="Where have you been?"
            {...form.register("name", {
              onBlur: () => setExpanded(false),
              onChange: (event) => {
                setQuery(event.target.value);
                setResults([]);
                setSearchError("");
                setActiveIndex(-1);
                setExpanded(true);
                form.setValue("providerId", undefined);
                form.setValue("latitude", Number.NaN);
                form.setValue("longitude", Number.NaN);
                setManual(false);
                setMapOpen(false);
              },
            })}
          />
        </div>
        {expanded && results.length > 0 && (
          <ul
            className="search-results"
            id={listId}
            role="listbox"
            aria-label="City suggestions"
          >
            {results.map((place, index) => (
              <li key={place.providerId} role="presentation">
                <button
                  type="button"
                  role="option"
                  id={`${listId}-${index}`}
                  aria-selected={activeIndex === index}
                  tabIndex={-1}
                  onPointerDown={(event) => event.preventDefault()}
                  onPointerMove={() => setActiveIndex(index)}
                  onClick={() => choose(place)}
                >
                  <MapPin size={16} />
                  <span>
                    {place.name}
                    <small>
                      {place.region ? `${place.region}, ` : ""}
                      {countryName(place.country)}
                    </small>
                  </span>
                  <ArrowRight size={14} />
                </button>
              </li>
            ))}
          </ul>
        )}
        {form.formState.errors.name && (
          <p className="form-error">{form.formState.errors.name.message}</p>
        )}
      </div>
      <p id="place-search-status" className="field-hint" role="status">
        {searching
          ? "Finding cities…"
          : searchError ||
            (!manual && query.length >= 2 && !results.length
              ? "No cities found. Choose the location on the map instead."
              : !manual
                ? "Start typing to see city suggestions."
                : "")}
      </p>
      {!manual && (
        <>
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              setManual(true);
              setMapOpen(true);
            }}
          >
            Choose location on a map
          </Button>
        </>
      )}
      {manual && (
        <>
          <div className="field">
            <label htmlFor="place-country">Country or territory</label>
            <select id="place-country" {...form.register("country")}>
              <option value="">Choose a country</option>
              {COUNTRIES.map((country) => (
                <option value={country.code} key={country.code}>
                  {country.name}
                </option>
              ))}
            </select>
            {form.formState.errors.country && (
              <p className="form-error">
                {form.formState.errors.country.message}
              </p>
            )}
          </div>
          {mapOpen ? (
            <LocationPicker
              value={
                Number.isFinite(form.watch("latitude")) &&
                Number.isFinite(form.watch("longitude"))
                  ? {
                      latitude: form.watch("latitude"),
                      longitude: form.watch("longitude"),
                    }
                  : undefined
              }
              onChange={(point) => {
                form.setValue("latitude", point.latitude, {
                  shouldValidate: true,
                });
                form.setValue("longitude", point.longitude, {
                  shouldValidate: true,
                });
                form.setValue("providerId", undefined);
              }}
            />
          ) : (
            <>
              <p className="field-hint">
                Location found. You can adjust it on the map.
              </p>
              <Button
                type="button"
                variant="secondary"
                onClick={() => setMapOpen(true)}
              >
                Adjust location on map
              </Button>
            </>
          )}
          {(form.formState.errors.latitude ||
            form.formState.errors.longitude) && (
            <p className="form-error">Choose the city location on the map.</p>
          )}
          <Controller
            name="startDate"
            control={form.control}
            render={({ field, fieldState }) => (
              <DateFields
                {...field}
                value={field.value ?? ""}
                error={fieldState.error?.message}
                disabled={pending}
              />
            )}
          />
          {error && (
            <p role="alert" className="form-error">
              {error}
            </p>
          )}
          <Button type="submit" disabled={pending}>
            {pending ? <Loader2 className="animate-spin" /> : <MapPin />}Add
            place
          </Button>
        </>
      )}
      <p className="attribution">
        Place search by{" "}
        <a href="https://www.geonames.org/" target="_blank" rel="noreferrer">
          GeoNames
        </a>{" "}
        · CC BY 4.0
      </p>
    </form>
  );
}
function DateFields({ error, ...props }: DatePickerProps & { error?: string }) {
  const id = useId();
  return (
    <div className="field">
      <label htmlFor={id} id={`${id}-label`}>
        Visit date <span className="optional">optional</span>
      </label>
      <DatePicker
        {...props}
        id={id}
        aria-labelledby={`${id}-label ${id}-value`}
        aria-describedby={`${id}-hint${error ? ` ${id}-error` : ""}`}
        aria-invalid={!!error}
      />
      <p className="field-hint" id={`${id}-hint`}>
        Your visit date stays private, even when your globe is published.
      </p>
      {error && (
        <p className="form-error" id={`${id}-error`}>
          {error}
        </p>
      )}
    </div>
  );
}
export function VisitForm({
  placeId,
  visit,
  onDone,
}: {
  placeId: string;
  visit?: VisitDto;
  onDone: () => void;
}) {
  const form = useForm<
    z.input<typeof visitSchema>,
    unknown,
    z.output<typeof visitSchema>
  >({
    resolver: zodResolver(visitSchema),
    defaultValues: {
      placeId,
      startDate: visit?.startDate ?? "",
      endDate: "",
    },
  });
  const [error, setError] = useState(""),
    [pending, setPending] = useState(false);
  return (
    <form
      className="form-stack"
      onSubmit={form.handleSubmit(async (value) => {
        setPending(true);
        const result = visit
          ? await editVisitAction(visit.id, value)
          : await addVisitAction(value);
        setPending(false);
        if (result.error) setError(result.error);
        else onDone();
      })}
    >
      <Controller
        name="startDate"
        control={form.control}
        render={({ field, fieldState }) => (
          <DateFields
            {...field}
            value={field.value ?? ""}
            error={fieldState.error?.message}
            disabled={pending}
          />
        )}
      />
      {error && (
        <p role="alert" className="form-error">
          {error}
        </p>
      )}
      <Button disabled={pending}>
        {pending ? <Loader2 className="animate-spin" /> : null}
        {visit ? "Save visit" : "Add visit"}
      </Button>
    </form>
  );
}
