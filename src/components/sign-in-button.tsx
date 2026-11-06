"use client";
import { useState } from "react";
import { Loader2, ArrowUpRight } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { Button } from "./ui/button";
export function SignInButton({
  enabled = true,
  disabled = false,
  label,
}: {
  enabled?: boolean;
  disabled?: boolean;
  label?: string;
}) {
  const [pending, setPending] = useState(false),
    [error, setError] = useState("");
  const failureMessage = "Sign-in is unavailable. Please try again.";
  async function signIn() {
    setPending(true);
    setError("");
    try {
      const result = await authClient.signIn.social({
        provider: "google",
        callbackURL: "/studio",
        newUserCallbackURL: "/onboarding",
        errorCallbackURL: "/sign-in",
      });
      if (result.error) {
        setError(failureMessage);
        setPending(false);
      }
    } catch {
      setError(failureMessage);
      setPending(false);
    }
  }
  return (
    <div>
      <Button
        size="lg"
        onClick={signIn}
        disabled={!enabled || disabled || pending}
      >
        {pending ? (
          <Loader2 className="animate-spin" />
        ) : (
          <svg aria-hidden="true" viewBox="0 0 24 24" className="size-4">
            <path
              fill="currentColor"
              d="M21.6 12.23c0-.71-.06-1.39-.18-2.05H12v3.88h5.38a4.6 4.6 0 0 1-1.99 3.02v2.51h3.23c1.9-1.75 2.98-4.33 2.98-7.36ZM12 22c2.7 0 4.96-.9 6.62-2.41l-3.23-2.51c-.9.6-2.05.96-3.39.96-2.6 0-4.8-1.76-5.59-4.12H3.07v2.59A10 10 0 0 0 12 22ZM6.41 13.92a6 6 0 0 1 0-3.84V7.49H3.07a10 10 0 0 0 0 9.02l3.34-2.59ZM12 5.96c1.47 0 2.79.51 3.83 1.51L18.7 4.6A9.62 9.62 0 0 0 12 2a10 10 0 0 0-8.93 5.49l3.34 2.59C7.2 7.72 9.4 5.96 12 5.96Z"
            />
          </svg>
        )}
        {label ?? "Continue with Google"}
        <ArrowUpRight />
      </Button>
      {!enabled && (
        <p className="muted mt-3 text-xs">
          Sign-in is temporarily unavailable. You can explore the example globe.
        </p>
      )}
      {error && (
        <p role="alert" className="form-error mt-3">
          {error}
        </p>
      )}
    </div>
  );
}
