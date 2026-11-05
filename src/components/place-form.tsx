"use client";
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
    defaultValues: { name: "", country: "", startDate: "", endDate: "" },
  });
  const [query, setQuery] = useState(""),
    [results, setResults] = useState<SearchPlace[]>([]),
    [manual, setManual] = useState(false),
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
    for (const field of [
      "name",
      "country",
      "latitude",
      "longitude",
      "providerId",
    ] as const)
      form.setValue(field, place[field] as never, { shouldValidate: true });
    setQuery("");
    setResults([]);
    setManual(true);
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
            onClick={() => setManual(true)}
          >
            Enter a place manually
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
          <div className="field-row">
            <div className="field">
              <label htmlFor="place-latitude">Latitude</label>
              <input
                id="place-latitude"
                type="number"
                min={-90}
                max={90}
                step="any"
                placeholder="48.8566"
                {...form.register("latitude", { valueAsNumber: true })}
              />
              {form.formState.errors.latitude && (
                <p className="form-error">Enter a latitude from −90 to 90.</p>
              )}
            </div>
            <div className="field">
              <label htmlFor="place-longitude">Longitude</label>
              <input
                id="place-longitude"
                type="number"
                min={-180}
                max={180}
                step="any"
                placeholder="2.3522"
                {...form.register("longitude", { valueAsNumber: true })}
              />
              {form.formState.errors.longitude && (
                <p className="form-error">
                  Enter a longitude from −180 to 180.
                </p>
              )}
            </div>
          </div>
          <DateFields
            start={form.register("startDate")}
            end={form.register("endDate")}
          />
          {form.formState.errors.endDate && (
            <p className="form-error">
              {form.formState.errors.endDate.message}
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
function DateFields({
  start,
  end,
}: {
  start: React.ComponentProps<"input">;
  end: React.ComponentProps<"input">;
}) {
  return (
    <div>
      <div className="field-row">
        <div className="field">
          <label htmlFor="visit-start">
            Visit date <span className="optional">optional</span>
          </label>
          <input id="visit-start" type="date" {...start} />
        </div>
        <div className="field">
          <label htmlFor="visit-end">
            End date <span className="optional">optional</span>
          </label>
          <input id="visit-end" type="date" {...end} />
        </div>
      </div>
      <p className="field-hint">
        Dates are private, even when your globe is published.
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
      endDate: visit?.endDate ?? "",
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
      <DateFields
        start={form.register("startDate")}
        end={form.register("endDate")}
      />
      {form.formState.errors.endDate && (
        <p className="form-error">{form.formState.errors.endDate.message}</p>
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
