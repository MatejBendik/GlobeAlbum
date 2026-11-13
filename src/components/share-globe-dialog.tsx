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

export function ShareGlobeDialog({
  globe,
  onClose,
}: {
  globe: GlobeDto;
  onClose: () => void;
}) {
  const router = useRouter();
  const [tab, setTab] = useState<"link" | "embed">("link");
  const [theme, setTheme] = useState<EmbedTheme>("light");
  const [shape, setShape] = useState<EmbedShape>("rectangle");
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");
  const [origin, setOrigin] = useState("");
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const codeInput = useRef<HTMLTextAreaElement>(null);
  const copiedTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  useEffect(() => {
    setOrigin(window.location.origin);
    return () => clearTimeout(copiedTimer.current);
  }, []);
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
  async function copy() {
    setError("");
    try {
      await navigator.clipboard.writeText(
        tab === "embed" ? code : `${origin}/u/${globe.username}`,
      );
      setCopied(true);
      clearTimeout(copiedTimer.current);
      copiedTimer.current = setTimeout(() => setCopied(false), 2000);
    } catch {
      setError(
        tab === "embed"
          ? "Select and copy the HTML code below instead."
          : "Copy the profile address below instead.",
      );
      if (tab === "embed") {
        codeInput.current?.focus();
        codeInput.current?.select();
      }
    }
  }
  function selectTab(value: "link" | "embed") {
    setTab(value);
    setCopied(false);
    setError("");
  }
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent
        className={`share-dialog ${tab === "embed" ? "share-dialog-embed" : ""}`}
      >
        <span className="dialog-icon">
          <Share2 />
        </span>
        <DialogTitle className="dialog-title">Your world, shared.</DialogTitle>
        <DialogDescription className="dialog-description">
          {tab === "embed"
            ? "Give your travels a home on your website."
            : globe.published
              ? "Anyone with your address can explore your globe. Saved changes are visible on their next visit."
              : "Your globe is private. Publish it when you are ready to let someone in."}
        </DialogDescription>
        <div className="share-tabs" role="tablist" aria-label="Sharing options">
          {(["link", "embed"] as const).map((value) => (
            <button
              key={value}
              type="button"
              role="tab"
              id={`share-tab-${value}`}
              aria-selected={tab === value}
              aria-controls={`share-panel-${value}`}
              tabIndex={tab === value ? 0 : -1}
              onClick={() => selectTab(value)}
              onKeyDown={(event) => {
                if (
                  ["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)
                ) {
                  event.preventDefault();
                  const next =
                    event.key === "Home"
                      ? "link"
                      : event.key === "End"
                        ? "embed"
                        : tab === "link"
                          ? "embed"
                          : "link";
                  selectTab(next);
                  document.getElementById(`share-tab-${next}`)?.focus();
                }
              }}
            >
              {value === "link" ? "Share link" : "Embed"}
            </button>
          ))}
        </div>
        <div
          role="tabpanel"
          id={`share-panel-${tab}`}
          aria-labelledby={`share-tab-${tab}`}
        >
          {tab === "link" ? (
            <>
              <div className="share-address">
                <span>
                  {origin}/u/{globe.username}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  disabled={!globe.published || !origin}
                  aria-label="Copy globe link"
                  onClick={copy}
                >
                  {copied ? <Check /> : <Copy />}
                </Button>
              </div>
              <div className="privacy-note">
                <LockKeyhole size={16} />
                <p>
                  Your email and visit dates stay private. Photos may remain
                  accessible through existing links for up to 60 seconds after
                  hiding.
                </p>
              </div>
              <Button disabled={pending} onClick={publish}>
                {pending
                  ? "Saving…"
                  : globe.published
                    ? "Make globe private"
                    : "Publish my globe"}
              </Button>
            </>
          ) : !globe.published ? (
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
                          setCopied(false);
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
                          setCopied(false);
                        }}
                      >
                        {value === "light" ? "Light" : "Dark"}
                      </button>
                    ))}
                  </div>
                </fieldset>
                <p className="embed-settings-note">
                  Your saved globe style and latest places appear here. The
                  frame fits the width of your website.
                </p>
                <Button disabled={!code} onClick={copy}>
                  {copied ? <Check /> : <Copy />}
                  {copied ? "Copied!" : "Copy HTML"}
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
        </div>
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
