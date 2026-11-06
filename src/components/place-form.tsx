"use client";
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowRight, Loader2, MapPin, Search } from "lucide-react";
import { placeSchema, visitSchema } from "@/lib/validation";
import { COUNTRIES, countryName } from "@/lib/countries";
import { addPlaceAction, addVisitAction, editVisitAction } from "@/app/actions";
import { Button } from "./ui/button";
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
export function PlaceForm({ onDone }: { onDone: () => void }) {
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
    [pending, setPending] = useState(false),
    [error, setError] = useState("");
  useEffect(() => {
    if (manual || query.length < 2) {
      setResults([]);
      return;
    }
    const controller = new AbortController();
    const timer = setTimeout(() => {
      fetch(`/api/places/search?q=${encodeURIComponent(query)}`, {
        signal: controller.signal,
      })
        .then(async (response) => {
          const value = await response.json();
          if (!response.ok) throw new Error(value.error);
          setSearchError("");
          setResults(value.places);
        })
        .catch((error) => {
          if (error.name !== "AbortError") setSearchError(error.message);
        });
    }, 350);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, manual]);
  async function submit(value: z.output<typeof placeSchema>) {
    setPending(true);
    setError("");
    const result = await addPlaceAction(value);
    setPending(false);
    if (result.error) setError(result.error);
    else onDone();
  }
  function choose(place: SearchPlace) {
    form.reset({ ...form.getValues(), ...place });
    setQuery("");
    setResults([]);
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
            placeholder="Where have you been?"
            {...form.register("name", {
              onChange: (event) => {
                setQuery(event.target.value);
                form.setValue("providerId", undefined);
                form.setValue("latitude", Number.NaN);
                form.setValue("longitude", Number.NaN);
                setManual(false);
                setMapOpen(false);
              },
            })}
          />
        </div>
        {results.length > 0 && (
          <ul className="search-results">
            {results.map((place) => (
              <li key={place.providerId}>
                <button type="button" onClick={() => choose(place)}>
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
      {!manual && (
        <>
          <p className="field-hint">
            {searchError || "Search for a city, or enter a place yourself."}
          </p>
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
          <DateFields start={form.register("startDate")} />
          {form.formState.errors.startDate && (
            <p className="form-error">
              {form.formState.errors.startDate.message}
            </p>
          )}
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
function DateFields({ start }: { start: React.ComponentProps<"input"> }) {
  return (
    <div className="field">
      <label htmlFor="visit-start">
        Visit date <span className="optional">optional</span>
      </label>
      <input id="visit-start" type="date" {...start} />
      <p className="field-hint">
        Your visit date stays private, even when your globe is published.
      </p>
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
      <DateFields start={form.register("startDate")} />
      {form.formState.errors.startDate && (
        <p className="form-error">{form.formState.errors.startDate.message}</p>
      )}
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
