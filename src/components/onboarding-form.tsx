"use client";
import { useActionState, useEffect, useState } from "react";
import { ArrowRight, Loader2, LockKeyhole } from "lucide-react";
import { onboardingAction, previewProfileAction } from "@/app/actions";
import { Button } from "./ui/button";
export function OnboardingForm({ baseUrl }: { baseUrl: string }) {
  const [state, action, pending] = useActionState(onboardingAction, {});
  const [ready, setReady] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => setReady(true), []);
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [checking, setChecking] = useState(false);
  const [addressError, setAddressError] = useState("");
  useEffect(() => {
    let active = true;
    setUsername("");
    setAddressError("");
    if (!name.trim()) {
      setChecking(false);
      return;
    }
    setChecking(true);
    const timer = setTimeout(async () => {
      try {
        const result = await previewProfileAction(name);
        if (!active) return;
        setUsername(result.username || "");
        setAddressError(result.error || "");
      } catch {
        if (active)
          setAddressError("Could not check your address. Please try again.");
      } finally {
        if (active) setChecking(false);
      }
    }, 250);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [name, state.error, attempt]);
  return (
    <form action={action} className="form-stack">
      <div className="field">
        <label htmlFor="displayName">What should we call you?</label>
        <input
          id="displayName"
          name="displayName"
          placeholder="Your display name"
          maxLength={60}
          required
          autoComplete="nickname"
          disabled={!ready || pending}
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
      </div>
      <div className="field">
        <label htmlFor="username">Your globe address</label>
        <input
          id="username"
          name="username"
          value={username}
          readOnly
          placeholder="your-name"
          aria-describedby="address-preview"
        />
        <p
          id="address-preview"
          className="field-hint profile-address"
          aria-live="polite"
        >
          {checking
            ? "Checking your address…"
            : username
              ? `${baseUrl}/u/${username}`
              : "Your globe link will appear here."}
        </p>
        <p className="field-hint">
          Generated from your name. Your address stays fixed after creation.
        </p>
        {addressError && (
          <div>
            <p role="alert" className="form-error">
              {addressError}
            </p>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setAttempt((value) => value + 1)}
            >
              Retry address check
            </Button>
          </div>
        )}
      </div>
      <div className="privacy-note">
        <LockKeyhole size={16} />
        <p>Your globe starts private. You decide when to share it.</p>
      </div>
      {state.error && (
        <p role="alert" className="form-error">
          {state.error}
        </p>
      )}
      <Button
        size="lg"
        disabled={pending || checking || !username}
        type="submit"
      >
        {pending ? <Loader2 className="animate-spin" /> : "Create my globe"}
        <ArrowRight />
      </Button>
    </form>
  );
}
