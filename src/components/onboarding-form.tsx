"use client";
import { useActionState } from "react";
import { ArrowRight, Loader2, LockKeyhole } from "lucide-react";
import { onboardingAction } from "@/app/actions";
import { Button } from "./ui/button";
export function OnboardingForm() {
  const [state, action, pending] = useActionState(onboardingAction, {});
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
        />
      </div>
      <div className="field">
        <label htmlFor="username">Your globe address</label>
        <div className="input-prefix">
          <span>globealbum / u /</span>
          <input
            id="username"
            name="username"
            placeholder="your-name"
            required
            minLength={3}
            maxLength={30}
            pattern="[a-z0-9]+(-[a-z0-9]+)*"
            autoCapitalize="none"
            autoComplete="off"
          />
        </div>
        <p className="field-hint">
          Choose once. Your address stays the same during beta.
        </p>
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
      <Button size="lg" disabled={pending} type="submit">
        {pending ? <Loader2 className="animate-spin" /> : "Create my globe"}
        <ArrowRight />
      </Button>
    </form>
  );
}
