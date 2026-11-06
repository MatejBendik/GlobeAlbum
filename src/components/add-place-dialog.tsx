"use client";

import { useEffect, useRef, useState } from "react";
import { Check } from "lucide-react";
import { PlaceForm, type AddedPlace } from "./place-form";
import { UploadForm } from "./upload-form";
import { Button } from "./ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "./ui/dialog";

export function AddPlaceDialog({
  open,
  onOpenChange,
  remaining,
  onChanged,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  remaining: number;
  onChanged: () => void;
}) {
  const [place, setPlace] = useState<AddedPlace | null>(null);
  const [busy, setBusy] = useState(false);
  const [uploaded, setUploaded] = useState(false);
  const title = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    if (place) title.current?.focus();
  }, [place]);
  function close() {
    if (busy) return;
    onOpenChange(false);
    setPlace(null);
    setUploaded(false);
  }
  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        if (!value) close();
      }}
    >
      <DialogContent>
        <p className="dialog-step">
          {place ? "Step 2 of 2 · Photos" : "Step 1 of 2 · Place"}
        </p>
        <DialogTitle className="dialog-title" ref={title} tabIndex={-1}>
          {place ? `Add photos to ${place.name}` : "Somewhere you have been."}
        </DialogTitle>
        <DialogDescription className="dialog-description">
          {place
            ? "Your place is saved. Add a few photos now, or come back later."
            : "Add a place to your globe. A little dot with a story behind it."}
        </DialogDescription>
        {place ? (
          <>
            <UploadForm
              visitId={place.visitId}
              remaining={remaining}
              onBusyChange={setBusy}
              onUploaded={() => {
                setUploaded(true);
                onChanged();
              }}
            />
            <div className="add-place-finish">
              <Button
                type="button"
                variant="secondary"
                disabled={busy}
                onClick={close}
              >
                {uploaded ? (
                  <>
                    <Check />
                    Done
                  </>
                ) : (
                  "Skip for now"
                )}
              </Button>
            </div>
          </>
        ) : (
          <PlaceForm
            onBusyChange={setBusy}
            onDone={(created) => {
              setPlace(created);
              onChanged();
            }}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
