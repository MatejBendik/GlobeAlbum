"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  ImagePlus,
  MapPin,
  Plus,
  Trash2,
  Star,
  CalendarDays,
  Loader2,
} from "lucide-react";
import type {
  ActionResult,
  GalleryDto,
  PhotoDto,
  PlaceDto,
  VisitDto,
} from "@/lib/types";
import { countryName, COUNTRIES } from "@/lib/countries";
import { demoGallery } from "@/lib/demo";
import {
  captionAction,
  countryAction,
  coverAction,
  deletePhotoAction,
  deleteVisitAction,
} from "@/app/actions";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "./ui/dialog";
import { Button } from "./ui/button";
import { UploadForm } from "./upload-form";
import { VisitForm } from "./place-form";
import { ConfirmDialog } from "./confirm-dialog";

export function PlaceGallery({
  place,
  owner,
  demo,
  remaining,
  onClose,
  onChanged,
  galleryUrl,
}: {
  place: PlaceDto;
  owner: boolean;
  demo: boolean;
  remaining: number;
  onClose: () => void;
  onChanged: () => void;
  galleryUrl?: string;
}) {
  const [gallery, setGallery] = useState<GalleryDto | null>(null),
    [index, setIndex] = useState(0),
    [error, setError] = useState(""),
    [imageError, setImageError] = useState(false),
    [revision, setRevision] = useState(0);
  const [uploadOpen, setUploadOpen] = useState(false),
    [uploadBusy, setUploadBusy] = useState(false),
    [visitOpen, setVisitOpen] = useState(false),
    [editingVisit, setEditingVisit] = useState<VisitDto | undefined>(),
    [uploadVisit, setUploadVisit] = useState("");
  const touch = useRef<number | null>(null),
    renewed = useRef(new Set<string>());
  const refresh = useCallback(() => {
    setRevision((value) => value + 1);
    onChanged();
  }, [onChanged]);
  useEffect(() => {
    const controller = new AbortController();
    setError("");
    if (demo) {
      setGallery(demoGallery(place.id));
      return;
    }
    fetch(galleryUrl ?? `/api/places/${place.id}/gallery`, {
      signal: controller.signal,
      cache: "no-store",
    })
      .then(async (response) => {
        const value = await response.json();
        if (!response.ok)
          throw new Error(value.error ?? "Could not load this place.");
        setGallery(value);
      })
      .catch((error) => {
        if (error.name !== "AbortError") setError(error.message);
      });
    return () => controller.abort();
  }, [place.id, demo, revision, galleryUrl]);
  const photos = gallery?.photos ?? [],
    photo = photos[Math.min(index, Math.max(photos.length - 1, 0))];
  const next = useCallback(
    (direction: number) => {
      setImageError(false);
      setIndex(
        (current) =>
          (current + direction + Math.max(photos.length, 1)) %
          Math.max(photos.length, 1),
      );
    },
    [photos.length],
  );
  function changed() {
    setImageError(false);
    refresh();
  }
  return (
    <>
      <Dialog
        open
        onOpenChange={(open) => {
          if (!open && !uploadBusy) onClose();
        }}
      >
        <DialogContent
          className="gallery-dialog"
          onKeyDown={(event) => {
            if (
              event.target instanceof HTMLInputElement ||
              event.target instanceof HTMLTextAreaElement ||
              event.target instanceof HTMLSelectElement
            )
              return;
            if (event.key === "ArrowRight") {
              event.preventDefault();
              next(1);
            }
            if (event.key === "ArrowLeft") {
              event.preventDefault();
              next(-1);
            }
          }}
        >
          <div
            className="gallery-image"
            onTouchStart={(event) => {
              touch.current = event.touches[0]?.clientX ?? null;
            }}
            onTouchEnd={(event) => {
              const end = event.changedTouches[0];
              if (touch.current !== null && end) {
                const delta = end.clientX - touch.current;
                if (Math.abs(delta) > 50) next(delta < 0 ? 1 : -1);
              }
              touch.current = null;
            }}
            onTouchCancel={() => {
              touch.current = null;
            }}
          >
            {photo && !imageError ? (
              <img
                key={photo.displayUrl}
                src={photo.displayUrl}
                alt={
                  photo.caption ||
                  `${place.name}, ${countryName(place.country)}`
                }
                className="gallery-main-image"
                onError={() => {
                  if (!demo && !renewed.current.has(photo.id)) {
                    renewed.current.add(photo.id);
                    setRevision((value) => value + 1);
                  } else setImageError(true);
                }}
              />
            ) : (
              <div className="gallery-empty">
                {!gallery && !error ? (
                  <Loader2 className="animate-spin" size={24} />
                ) : (
                  <>
                    <ImagePlus size={36} strokeWidth={1} />
                    <h3>
                      {imageError
                        ? "This photo could not load."
                        : "A place worth remembering."}
                    </h3>
                    <p>
                      {imageError
                        ? "The link may have expired."
                        : "No photos here yet."}
                    </p>
                    {imageError && (
                      <Button
                        variant="secondary"
                        onClick={() => {
                          setImageError(false);
                          setRevision((value) => value + 1);
                        }}
                      >
                        Try again
                      </Button>
                    )}
                  </>
                )}
              </div>
            )}
            {photos.length > 1 && (
              <>
                <button
                  className="gallery-arrow gallery-prev"
                  aria-label="Previous photo"
                  onClick={() => next(-1)}
                >
                  <ChevronLeft />
                </button>
                <button
                  className="gallery-arrow gallery-next"
                  aria-label="Next photo"
                  onClick={() => next(1)}
                >
                  <ChevronRight />
                </button>
              </>
            )}
            {photo && (
              <div className="gallery-counter">
                {Math.min(index, photos.length - 1) + 1} / {photos.length}
              </div>
            )}
          </div>
          <aside className="gallery-details">
            <span className="eyebrow">
              <MapPin size={13} />
              {countryName(place.country)}
            </span>
            <DialogTitle className="gallery-title">{place.name}</DialogTitle>
            <DialogDescription className="muted text-sm">
              {place.visitCount} visit{place.visitCount !== 1 ? "s" : ""} ·{" "}
              {photos.length} photo{photos.length !== 1 ? "s" : ""}
            </DialogDescription>
            {demo && <span className="example-label">Example collection</span>}
            {error && (
              <p role="alert" className="form-error">
                {error}
              </p>
            )}
            {photo &&
              (owner ? (
                <CaptionEditor
                  key={`${photo.id}:${photo.caption}`}
                  photo={photo}
                  onChanged={changed}
                />
              ) : (
                <p className="photo-caption">{photo.caption}</p>
              ))}
            {photo && owner && (
              <div className="photo-actions">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={async () => {
                    const result = await coverAction(place.id, photo.id);
                    if (result.error) setError(result.error);
                    else changed();
                  }}
                >
                  <Star
                    fill={
                      place.coverPhotoId === photo.id ? "currentColor" : "none"
                    }
                  />
                  Cover
                </Button>
                <ConfirmDialog
                  title="Delete this photo?"
                  description="This permanently removes the photo from this visit and your shared globe."
                  trigger={
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Delete photo"
                    >
                      <Trash2 />
                    </Button>
                  }
                  onConfirm={() => deletePhotoAction(photo.id)}
                  onDone={changed}
                />
              </div>
            )}
            {photos.length > 1 && (
              <div className="gallery-thumbnails">
                {photos.map((item, i) => (
                  <button
                    key={item.id}
                    aria-label={`View photo ${i + 1}`}
                    aria-pressed={i === index}
                    onClick={() => {
                      setIndex(i);
                      setImageError(false);
                    }}
                  >
                    <img src={item.thumbnailUrl} alt="" loading="lazy" />
                  </button>
                ))}
              </div>
            )}
            {owner && gallery?.visits && (
              <div className="visit-manager">
                {!!gallery.pendingPhotos?.length && (
                  <div className="pending-uploads">
                    <h3>Unfinished uploads</h3>
                    <p className="field-hint">
                      Remove interrupted uploads to free their photo slots.
                    </p>
                    {gallery.pendingPhotos.map((pending, i) => (
                      <div className="visit-row" key={pending.id}>
                        <span className="field-hint">
                          Photo {i + 1} ·{" "}
                          {pending.status === "PROCESSING"
                            ? "processing"
                            : "waiting"}
                        </span>
                        <ConfirmDialog
                          title="Remove this upload?"
                          description="This cancels the unfinished photo. Choose the file again if you want to upload it later."
                          trigger={
                            <Button
                              variant="ghost"
                              size="icon"
                              aria-label={`Remove unfinished upload ${i + 1}`}
                            >
                              <Trash2 />
                            </Button>
                          }
                          onConfirm={() => deletePhotoAction(pending.id)}
                          onDone={changed}
                        />
                      </div>
                    ))}
                  </div>
                )}
                <div className="section-heading">
                  <h3>Visits</h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setEditingVisit(undefined);
                      setVisitOpen(true);
                    }}
                  >
                    <Plus />
                    Add
                  </Button>
                </div>
                {gallery.visits.map((visit, i) => (
                  <div className="visit-row" key={visit.id}>
                    <button
                      onClick={() => {
                        setEditingVisit(visit);
                        setVisitOpen(true);
                      }}
                    >
                      <CalendarDays size={15} />
                      <span>
                        {visit.startDate || `Visit ${i + 1}`}
                        <small>
                          {`${visit.photoCount} ${visit.photoCount === 1 ? "photo" : "photos"}`}
                        </small>
                      </span>
                    </button>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Add photos to visit ${i + 1}`}
                      onClick={() => {
                        setUploadVisit(visit.id);
                        setUploadOpen(true);
                      }}
                    >
                      <ImagePlus />
                    </Button>
                    <ConfirmDialog
                      title="Delete this visit?"
                      description="All photos in this visit will also be permanently removed. If it is the last visit, the place will disappear from your globe."
                      trigger={
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={`Delete visit ${i + 1}`}
                        >
                          <Trash2 />
                        </Button>
                      }
                      onConfirm={() => deleteVisitAction(visit.id)}
                      onDone={changed}
                    />
                  </div>
                ))}
                <div className="field mt-5">
                  <label htmlFor="correct-country">Country or territory</label>
                  <select
                    id="correct-country"
                    value={place.country}
                    onChange={async (event) => {
                      const result = await countryAction(
                        place.id,
                        event.target.value,
                      );
                      if (result.error) setError(result.error);
                      else changed();
                    }}
                  >
                    {COUNTRIES.map((country) => (
                      <option key={country.code} value={country.code}>
                        {country.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}
            <div className="gallery-footer">
              {owner ? (
                <Button
                  onClick={() => {
                    setUploadVisit(gallery?.visits?.[0]?.id ?? "");
                    setUploadOpen(true);
                  }}
                  disabled={!gallery?.visits?.length || remaining <= 0}
                >
                  <ImagePlus />
                  Add photos
                </Button>
              ) : (
                <span>Every place has a story.</span>
              )}
            </div>
          </aside>
        </DialogContent>
      </Dialog>
      <Dialog open={visitOpen} onOpenChange={setVisitOpen}>
        <DialogContent>
          <DialogTitle className="dialog-title">
            {editingVisit ? "Edit visit" : "Another visit"}
          </DialogTitle>
          <DialogDescription className="dialog-description">
            {place.name} · Your dates remain private.
          </DialogDescription>
          <VisitForm
            key={editingVisit?.id ?? "new"}
            placeId={place.id}
            visit={editingVisit}
            onDone={() => {
              setVisitOpen(false);
              changed();
            }}
          />
        </DialogContent>
      </Dialog>
      <Dialog
        open={uploadOpen}
        onOpenChange={(open) => {
          if (!uploadBusy) setUploadOpen(open);
        }}
      >
        <DialogContent
          className={uploadBusy ? "upload-is-busy" : ""}
          onEscapeKeyDown={(event) => {
            if (uploadBusy) event.preventDefault();
          }}
        >
          <DialogTitle className="dialog-title">
            Add to {place.name}
          </DialogTitle>
          <DialogDescription className="dialog-description">
            Choose the moments you want to keep.
          </DialogDescription>
          {gallery?.visits && gallery.visits.length > 1 && (
            <div className="field mb-5">
              <label htmlFor="upload-visit">Visit</label>
              <select
                id="upload-visit"
                value={uploadVisit}
                disabled={uploadBusy}
                onChange={(event) => setUploadVisit(event.target.value)}
              >
                {gallery.visits.map((visit, i) => (
                  <option key={visit.id} value={visit.id}>
                    {visit.startDate || `Visit ${i + 1}`}
                  </option>
                ))}
              </select>
            </div>
          )}
          {uploadVisit && (
            <UploadForm
              key={uploadVisit}
              visitId={uploadVisit}
              remaining={remaining}
              onUploaded={changed}
              onBusyChange={setUploadBusy}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
function CaptionEditor({
  photo,
  onChanged,
}: {
  photo: PhotoDto;
  onChanged: () => void;
}) {
  const [caption, setCaption] = useState(photo.caption),
    [pending, setPending] = useState(false),
    [error, setError] = useState("");
  return (
    <form
      className="caption-editor"
      onSubmit={async (event) => {
        event.preventDefault();
        setPending(true);
        const result: ActionResult = await captionAction(photo.id, caption);
        setPending(false);
        if (result.error) setError(result.error);
        else onChanged();
      }}
    >
      <label htmlFor="photo-caption">
        A little context <span className="optional">optional</span>
      </label>
      <textarea
        id="photo-caption"
        maxLength={500}
        rows={3}
        placeholder="What made this moment yours?"
        value={caption}
        onChange={(event) => setCaption(event.target.value)}
      />
      {caption !== photo.caption && (
        <Button variant="secondary" size="sm" disabled={pending}>
          Save caption
        </Button>
      )}
      {error && <p className="form-error">{error}</p>}
    </form>
  );
}
