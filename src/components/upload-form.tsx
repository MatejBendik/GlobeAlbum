"use client";
import { useMemo, useRef, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  UploadCloud,
  X,
  Check,
  RotateCcw,
  Loader2,
  ImagePlus,
} from "lucide-react";
import { photoUploadSchemaFor, PHOTO_ACCEPT } from "@/lib/validation";
import { deletePhotoAction } from "@/app/actions";
import { Button } from "./ui/button";

type Item = {
  id: string;
  file: File;
  status:
    "queued" | "uploading" | "processing" | "done" | "error" | "cancelled";
  progress: number;
  error?: string;
};
type Remote = {
  uploadId: string;
  photoId: string;
  uploadUrl: string;
  uploaded: boolean;
};
async function api<T>(
  url: string,
  body: unknown,
  signal: AbortSignal,
): Promise<T> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal,
  });
  const value = await response.json();
  if (!response.ok) throw new Error(value.error ?? "Upload failed.");
  return value;
}
export function UploadForm({
  visitId,
  remaining,
  onUploaded,
  onBusyChange,
}: {
  visitId: string;
  remaining: number;
  onUploaded: () => void;
  onBusyChange?: (busy: boolean) => void;
}) {
  const schema = useMemo(() => photoUploadSchemaFor(remaining), [remaining]);
  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { files: [] },
    mode: "onChange",
  });
  const [items, setItems] = useState<Item[]>([]),
    [busy, setBusy] = useState(false);
  const controllers = useRef(new Map<string, AbortController>()),
    requests = useRef(new Map<string, XMLHttpRequest>()),
    remotes = useRef(new Map<string, Remote>()),
    removals = useRef(new Map<string, Promise<void>>()),
    cancelled = useRef(new Set<string>());
  function update(id: string, patch: Partial<Item>) {
    setItems((current) =>
      current.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    );
  }
  async function removeRemote(id: string) {
    const pending = removals.current.get(id);
    if (pending) return pending;
    const remote = remotes.current.get(id);
    if (!remote) return;
    // Cancellation and the aborted request share one cleanup operation.
    const removal = deletePhotoAction(remote.photoId).then((result) => {
      if (result.error) throw new Error(result.error);
      remotes.current.delete(id);
    });
    removals.current.set(id, removal);
    try {
      await removal;
    } finally {
      removals.current.delete(id);
    }
  }
  async function process(item: Item) {
    if (cancelled.current.has(item.id)) return;
    const controller = new AbortController();
    controllers.current.set(item.id, controller);
    try {
      update(item.id, { status: "uploading", error: undefined, progress: 0 });
      let remote = remotes.current.get(item.id);
      if (!remote?.uploaded) {
        if (remote) await removeRemote(item.id);
        const result = await api<Omit<Remote, "uploaded">>(
          "/api/uploads",
          { visitId, size: item.file.size },
          controller.signal,
        );
        remote = { ...result, uploaded: false };
        remotes.current.set(item.id, remote);
        if (cancelled.current.has(item.id)) {
          await removeRemote(item.id);
          return;
        }
        await new Promise<void>((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          requests.current.set(item.id, xhr);
          xhr.open("PUT", remote!.uploadUrl);
          xhr.setRequestHeader("Content-Type", "application/octet-stream");
          xhr.upload.onprogress = (event) => {
            if (event.lengthComputable)
              update(item.id, {
                progress: Math.round((event.loaded / event.total) * 100),
              });
          };
          xhr.onload = () =>
            xhr.status >= 200 && xhr.status < 300
              ? resolve()
              : reject(
                  new Error(
                    "The upload was rejected or expired. Please retry.",
                  ),
                );
          xhr.onerror = () =>
            reject(new Error("Connection interrupted. Please retry."));
          xhr.onabort = () =>
            reject(new DOMException("Cancelled", "AbortError"));
          xhr.send(item.file);
        });
        remote.uploaded = true;
      }
      update(item.id, { status: "processing", progress: 100 });
      await api(`/api/uploads/${remote.uploadId}`, {}, controller.signal);
      if (cancelled.current.has(item.id)) {
        await removeRemote(item.id);
        return;
      }
      update(item.id, { status: "done" });
      onUploaded();
    } catch (error) {
      if (cancelled.current.has(item.id)) {
        update(item.id, { status: "cancelled" });
        try {
          await removeRemote(item.id);
        } catch {
          update(item.id, {
            error:
              "Cancelled. Remove the unfinished upload from this place if it is still listed.",
          });
        }
      } else
        update(item.id, {
          status: "error",
          error:
            error instanceof Error
              ? error.message
              : "Could not upload. Please retry.",
        });
    } finally {
      controllers.current.delete(item.id);
      requests.current.delete(item.id);
    }
  }
  async function submit({ files }: z.infer<typeof schema>) {
    setBusy(true);
    onBusyChange?.(true);
    const added = files.map((file) => ({
      id: crypto.randomUUID(),
      file,
      status: "queued" as const,
      progress: 0,
    }));
    setItems((current) => [...current, ...added]);
    form.reset({ files: [] });
    try {
      for (const item of added) await process(item);
    } finally {
      setBusy(false);
      onBusyChange?.(false);
    }
  }
  async function cancel(item: Item) {
    cancelled.current.add(item.id);
    requests.current.get(item.id)?.abort();
    controllers.current.get(item.id)?.abort();
    update(item.id, { status: "cancelled" });
    try {
      await removeRemote(item.id);
    } catch {
      update(item.id, {
        error:
          "Cancelled. Remove the unfinished upload from this place if it is still listed.",
      });
    }
    onUploaded();
  }
  const fileError =
    form.formState.errors.files?.message ??
    form.formState.errors.files?.find?.((error) => !!error?.message)?.message;
  return (
    <div className="upload-section">
      <form onSubmit={form.handleSubmit(submit)} className="form-stack">
        <Controller
          control={form.control}
          name="files"
          render={({ field }) => (
            <label className="upload-dropzone">
              <ImagePlus size={26} strokeWidth={1.4} />
              <strong>Choose photographs</strong>
              <span>JPEG, PNG, WebP or HEIC · up to 20 MB each</span>
              <input
                aria-label="Choose photographs"
                type="file"
                accept={PHOTO_ACCEPT}
                multiple
                ref={field.ref}
                onBlur={field.onBlur}
                disabled={busy || remaining <= 0}
                onChange={(event) => {
                  field.onChange(Array.from(event.target.files ?? []));
                  event.currentTarget.value = "";
                }}
              />
            </label>
          )}
        />
        <p className="field-hint">
          {remaining} photo slots available. Original files are removed after
          processing.
        </p>
        {fileError && (
          <p role="alert" className="form-error">
            {fileError}
          </p>
        )}
        {form.watch("files").length > 0 && (
          <p className="text-sm">
            {form.watch("files").length} photographs selected
          </p>
        )}
        <Button
          type="submit"
          disabled={busy || remaining <= 0 || !form.watch("files").length}
        >
          {busy ? <Loader2 className="animate-spin" /> : <UploadCloud />}
          {busy ? "Uploading photographs…" : "Upload photographs"}
        </Button>
      </form>
      {items.length > 0 && (
        <ul className="upload-queue" aria-live="polite">
          {items.map((item) => (
            <li key={item.id}>
              <div className="upload-item-main">
                <span className="truncate">{item.file.name}</span>
                {item.status === "done" ? (
                  <Check className="text-green-700" size={16} />
                ) : item.status === "error" ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    disabled={busy}
                    aria-label={`Retry ${item.file.name}`}
                    onClick={async () => {
                      setBusy(true);
                      onBusyChange?.(true);
                      try {
                        await process(item);
                      } finally {
                        setBusy(false);
                        onBusyChange?.(false);
                      }
                    }}
                  >
                    <RotateCcw />
                  </Button>
                ) : (
                  item.status !== "cancelled" && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label={`Cancel ${item.file.name}`}
                      onClick={() => cancel(item)}
                    >
                      <X />
                    </Button>
                  )
                )}
                {item.status === "error" && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label={`Remove ${item.file.name}`}
                    onClick={() => cancel(item)}
                  >
                    <X />
                  </Button>
                )}
              </div>
              <div className="upload-progress">
                <span style={{ width: `${item.progress}%` }} />
              </div>
              <p
                className={
                  item.status === "error" ? "form-error" : "field-hint"
                }
              >
                {item.error ??
                  {
                    queued: "Waiting…",
                    uploading: `Uploading ${item.progress}%`,
                    processing: "Preparing your photograph…",
                    done: "Added to your globe",
                    cancelled: "Cancelled",
                    error: "Could not upload this photograph.",
                  }[item.status]}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
