"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { LIMITS } from "@/lib/limits";
import { PHOTO_ACCEPT } from "@/lib/validation";
import { Button } from "./ui/button";

export function AvatarForm({ hasCustomAvatar }: { hasCustomAvatar: boolean }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [pending, startTransition] = useTransition();
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);

  function savePhoto(selected: File | null) {
    setError("");
    setStatus("");
    startTransition(async () => {
      try {
        const response = await fetch("/api/account/avatar", {
          method: selected ? "POST" : "DELETE",
          body: selected ?? undefined,
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
          selected ? "Profile photo updated." : "Profile photo removed.",
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
        if (file && !pending) savePhoto(file);
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
            onClick={() => savePhoto(null)}
          >
            Remove photo
          </Button>
        )}
        <p role="status" className="settings-saved">
          {status}
        </p>
      </div>
    </form>
  );
}
