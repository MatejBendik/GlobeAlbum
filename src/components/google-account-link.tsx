"use client";

import { useEffect, useRef, useState } from "react";
import Script from "next/script";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { Button } from "./ui/button";

type GoogleIdentity = {
  initialize(options: {
    client_id: string;
    nonce: string;
    auto_select: false;
    callback(response: { credential: string }): void;
  }): void;
  renderButton(
    parent: HTMLElement,
    options: { theme: "outline"; size: "large"; text: "continue_with" },
  ): void;
};

export function GoogleAccountLink({
  clientId,
  disabled,
}: {
  clientId: string;
  disabled: boolean;
}) {
  const router = useRouter();
  const container = useRef<HTMLDivElement>(null);
  const inFlight = useRef(false);
  const [opened, setOpened] = useState(false);
  const [ready, setReady] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!ready || !container.current) return;
    const google = (
      window as Window & { google?: { accounts: { id: GoogleIdentity } } }
    ).google;
    if (!google) return;
    let active = true;
    const nonce = crypto.randomUUID();
    google.accounts.id.initialize({
      client_id: clientId,
      nonce,
      auto_select: false,
      callback: async ({ credential }) => {
        if (!active || inFlight.current) return;
        inFlight.current = true;
        setPending(true);
        setError("");
        try {
          // Neon verifies Google's signed identity and nonce, the current session,
          // and the matching email. No OAuth state crosses the proxy's domains.
          const result = await authClient.linkSocial({
            provider: "google",
            idToken: { token: credential, nonce },
          });
          if (result.error) throw new Error("Google linking failed");
          if (active) router.refresh();
        } catch {
          if (active)
            setError(
              "Google could not be connected. Use the same email as your account and try again.",
            );
        } finally {
          inFlight.current = false;
          if (active) setPending(false);
        }
      },
    });
    google.accounts.id.renderButton(container.current, {
      theme: "outline",
      size: "large",
      text: "continue_with",
    });
    return () => {
      active = false;
    };
  }, [clientId, ready, router]);

  if (!clientId)
    return <p className="field-hint">Google connection is unavailable.</p>;

  return (
    <div>
      {!opened ? (
        <Button disabled={disabled} onClick={() => setOpened(true)}>
          Connect Google
        </Button>
      ) : (
        <>
          <Script
            src="https://accounts.google.com/gsi/client"
            onReady={() => setReady(true)}
            onError={() =>
              setError("Google could not load. Reload to try again.")
            }
          />
          <div ref={container} inert={disabled || pending} />
          {((!ready && !error) || pending) && (
            <p role="status" className="field-hint">
              {pending ? "Connecting Google…" : "Loading Google…"}
            </p>
          )}
        </>
      )}
      {error && (
        <p role="alert" className="form-error mt-3">
          {error}
        </p>
      )}
    </div>
  );
}
