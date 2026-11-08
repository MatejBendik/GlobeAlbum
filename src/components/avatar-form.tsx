"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LIMITS } from "@/lib/limits";
import { PHOTO_ACCEPT } from "@/lib/validation";
import { Button } from "./ui/button";

export function AvatarForm({
  hasCustomAvatar,
  hasGooglePhoto,
}: {
  hasCustomAvatar: boolean;
  hasGooglePhoto: boolean;
}) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [pending, startTransition] = useTransition();
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);

  function updatePhoto(method: "POST" | "PUT" | "DELETE", selected?: File) {
    setError("");
    setStatus("");
    startTransition(async () => {
      try {
        const response = await fetch("/api/account/avatar", {
          method,
          body: selected,
        });
        if (!response.ok) {
          const result = await response.json().catch(() => null);
          throw new Error(
            result?.error ?? "Could not update your profile photo.",
          );
        }
        setFile(null);
        if (input.current) input.current.value = "";
        setStatus(
          method === "DELETE"
            ? "Profile photo removed."
            : "Profile photo updated.",
        );
        router.refresh();
      } catch (error) {
        setError(
          error instanceof Error
            ? error.message
            : "Could not update your profile photo.",
        );
      }
    });
  }

  return (
    <form
      className="form-stack settings-form"
      onSubmit={(event) => {
        event.preventDefault();
        if (file && !pending) updatePhoto("POST", file);
      }}
    >
      <div className="field">
        <label htmlFor="avatar-file">Choose a profile photo</label>
        <input
          ref={input}
          id="avatar-file"
          className="settings-avatar-input"
          type="file"
          accept={PHOTO_ACCEPT}
          aria-describedby="avatar-hint"
          disabled={!ready || pending}
          onChange={(event) => {
            const selected = event.target.files?.[0] ?? null;
            const tooLarge = selected && selected.size > LIMITS.avatarFileBytes;
            setError(tooLarge ? "Choose a photo up to 4 MB." : "");
            setStatus("");
            setFile(tooLarge ? null : selected);
          }}
        />
        <p id="avatar-hint" className="field-hint">
          JPEG, PNG, WebP or HEIC up to 4 MB. The photo is cropped to a square.
        </p>
      </div>
      {error && (
        <p role="alert" className="form-error">
          {error}
        </p>
      )}
      <div className="settings-save">
        <Button type="submit" disabled={!file || pending}>
          {pending ? "Updating…" : "Save photo"}
        </Button>
        {hasCustomAvatar && (
          <Button
            type="button"
            variant="ghost"
            disabled={!ready || pending}
            onClick={() => updatePhoto("DELETE")}
          >
            Remove photo
          </Button>
        )}
      </div>
      {hasGooglePhoto && (
        <div className="field">
          <p id="google-photo-hint" className="field-hint">
            GlobeAlbum saves a copy of your Google photo for visitors to see
            while your globe is published. You can remove it here at any time.{" "}
            <Link className="underline" href="/privacy#public-profile">
              Privacy Policy
            </Link>
          </p>
          <div>
            <Button
              type="button"
              variant="secondary"
              disabled={!ready || pending}
              aria-describedby="google-photo-hint"
              onClick={() => updatePhoto("PUT")}
            >
              Use Google photo on my globe
            </Button>
          </div>
        </div>
      )}
      <p role="status" className="settings-saved">
        {status}
      </p>
    </form>
  );
}
