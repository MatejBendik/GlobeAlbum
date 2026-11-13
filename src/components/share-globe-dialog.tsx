"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Check,
  Copy,
  LockKeyhole,
  Monitor,
  Share2,
  Smartphone,
} from "lucide-react";
import type { GlobeDto } from "@/lib/types";
import {
  embedHtml,
  embedPath,
  EMBED_SANDBOX,
  type EmbedShape,
  type EmbedTheme,
} from "@/lib/embed";
import { publicationAction } from "@/app/actions";
import { Button } from "./ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "./ui/dialog";

type CopyTarget = "link" | "embed";

export function ShareGlobeDialog({
  globe,
  onClose,
}: {
  globe: GlobeDto;
  onClose: () => void;
}) {
  const router = useRouter();
  const [theme, setTheme] = useState<EmbedTheme>("light");
  const [shape, setShape] = useState<EmbedShape>("rectangle");
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");
  const [origin, setOrigin] = useState("");
  const [copied, setCopied] = useState<CopyTarget | null>(null);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const linkInput = useRef<HTMLInputElement>(null);
  const codeInput = useRef<HTMLTextAreaElement>(null);
  const copiedTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  useEffect(() => {
    setOrigin(window.location.origin);
    return () => clearTimeout(copiedTimer.current);
  }, []);
  const address = origin ? `${origin}/u/${globe.username}` : "";
  const code = origin
    ? embedHtml({
        origin,
        username: globe.username,
        displayName: globe.displayName,
        theme,
        shape,
      })
    : "";

  function publish() {
    setError("");
    setCopied(null);
    clearTimeout(copiedTimer.current);
    startTransition(async () => {
      try {
        const result = await publicationAction(!globe.published);
        if (result.error) setError(result.error);
        else router.refresh();
      } catch {
        setError("Could not update visibility. Please try again.");
      }
    });
  }
  async function copy(target: CopyTarget) {
    setError("");
    setCopied(null);
    clearTimeout(copiedTimer.current);
    try {
      await navigator.clipboard.writeText(target === "embed" ? code : address);
      setCopied(target);
      copiedTimer.current = setTimeout(() => setCopied(null), 2000);
    } catch {
      setError(
        target === "embed"
          ? "Select and copy the HTML code below instead."
          : "Select and copy your globe link above instead.",
      );
      const input = target === "embed" ? codeInput.current : linkInput.current;
      input?.focus();
      input?.select();
    }
  }
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="share-dialog share-dialog-embed">
        <span className="dialog-icon">
          <Share2 />
        </span>
        <DialogTitle className="dialog-title">Your world, shared.</DialogTitle>
        <DialogDescription className="dialog-description">
          {globe.published
            ? "Share a link or add your globe to a website."
            : "Publish your globe to share a link or embed it."}
        </DialogDescription>
        <section className="share-link-section" aria-label="Globe sharing">
          <label htmlFor="share-globe-address">Share link</label>
          <div className="share-link-row">
            <div className="share-address">
              <input
                ref={linkInput}
                id="share-globe-address"
                type="url"
                value={address}
                readOnly
                onFocus={(event) => event.currentTarget.select()}
              />
              <Button
                variant="ghost"
                size="icon"
                disabled={!globe.published || !origin || pending}
                aria-label="Copy globe link"
                onClick={() => copy("link")}
              >
                {copied === "link" ? <Check /> : <Copy />}
              </Button>
            </div>
            {globe.published && (
              <Button
                variant="secondary"
                size="sm"
                disabled={pending}
                onClick={publish}
              >
                {pending ? "Saving…" : "Make globe private"}
              </Button>
            )}
          </div>
          <div className="privacy-note">
            <LockKeyhole size={16} />
            <p>
              Your email and visit dates stay private. Photos may remain
              accessible through existing links for up to 60 seconds after
              hiding.
            </p>
          </div>
        </section>
        {!globe.published ? (
          <div className="embed-publication-gate">
            <LockKeyhole size={28} strokeWidth={1.2} />
            <p role="alert">Make your globe public first</p>
            <p>
              Publishing lets anyone explore your globe, including on other
              websites.
            </p>
            <Button disabled={pending} onClick={publish}>
              {pending ? "Publishing…" : "Publish my globe"}
            </Button>
            <Button variant="secondary" disabled>
              <Copy /> Copy HTML
            </Button>
          </div>
        ) : (
          <div className="embed-builder">
            <div className="embed-settings">
              <fieldset>
                <legend>Shape</legend>
                <div className="embed-options">
                  {(["rectangle", "square"] as const).map((value) => (
                    <button
                      key={value}
                      type="button"
                      aria-pressed={shape === value}
                      onClick={() => {
                        setShape(value);
                        setCopied(null);
                      }}
                    >
                      {value === "rectangle" ? "Rectangle" : "Square"}
                    </button>
                  ))}
                </div>
              </fieldset>
              <fieldset>
                <legend>Theme</legend>
                <div className="embed-options">
                  {(["light", "dark"] as const).map((value) => (
                    <button
                      key={value}
                      type="button"
                      aria-pressed={theme === value}
                      onClick={() => {
                        setTheme(value);
                        setCopied(null);
                      }}
                    >
                      {value === "light" ? "Light" : "Dark"}
                    </button>
                  ))}
                </div>
              </fieldset>
              <p className="embed-settings-note">
                Your saved globe style and latest places appear here. The frame
                fits the width of your website.
              </p>
              <Button disabled={!code} onClick={() => copy("embed")}>
                {copied === "embed" ? <Check /> : <Copy />}
                {copied === "embed" ? "Copied!" : "Copy HTML"}
              </Button>
              <label className="embed-code-label" htmlFor="embed-code">
                HTML code
              </label>
              <textarea
                ref={codeInput}
                id="embed-code"
                aria-label="Embed HTML"
                className="embed-code"
                value={code}
                readOnly
                rows={7}
                spellCheck={false}
                onFocus={(event) => event.currentTarget.select()}
              />
            </div>
            <div className="embed-preview" data-preview-theme={theme}>
              <div className="embed-preview-toolbar">
                <span>Live preview</span>
                <div role="group" aria-label="Preview device">
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Desktop preview"
                    aria-pressed={device === "desktop"}
                    onClick={() => setDevice("desktop")}
                  >
                    <Monitor size={16} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Mobile preview"
                    aria-pressed={device === "mobile"}
                    onClick={() => setDevice("mobile")}
                  >
                    <Smartphone size={16} />
                  </Button>
                </div>
              </div>
              <div className="embed-preview-site" data-device={device}>
                <iframe
                  title="Your globe embed preview"
                  src={embedPath(globe.username, theme)}
                  sandbox={EMBED_SANDBOX}
                  referrerPolicy="strict-origin-when-cross-origin"
                  style={{
                    aspectRatio: shape === "square" ? "1 / 1" : "16 / 10",
                  }}
                />
              </div>
            </div>
          </div>
        )}
        {copied && (
          <p className="sr-only" role="status">
            Copied to clipboard.
          </p>
        )}
        {error && (
          <p role="alert" className="form-error">
            {error}
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}
