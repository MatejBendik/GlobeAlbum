"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Globe2, LockKeyhole, LogOut } from "lucide-react";
import {
  deleteAccountAction,
  renameAction,
  signOutAction,
} from "@/app/actions";
import { Button } from "./ui/button";
import { GoogleAccountLink } from "./google-account-link";

export function ProfileSettings({
  displayName,
  username,
  email,
  published,
  profileUrl,
  googleConnected,
  googleClientId,
}: {
  displayName: string;
  username: string;
  email: string;
  published: boolean;
  profileUrl: string;
  googleConnected: boolean | null;
  googleClientId: string;
}) {
  const router = useRouter();
  const [name, setName] = useState(displayName);
  const [confirmation, setConfirmation] = useState("");
  const [saveError, setSaveError] = useState("");
  const [deleteError, setDeleteError] = useState("");
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();
  const [operation, setOperation] = useState<"save" | "delete">("save");

  return (
    <>
      <div className="settings-identity">
        <div className="settings-avatar" aria-hidden="true">
          {displayName.trim().charAt(0).toUpperCase()}
        </div>
        <div>
          <p className="settings-identity-name">{displayName}</p>
          <p className="settings-identity-address">/u/{username}</p>
        </div>
        <span className="settings-visibility">
          {published ? <Globe2 /> : <LockKeyhole />}
          {published ? "Published globe" : "Private globe"}
        </span>
      </div>

      <section className="settings-section" aria-labelledby="profile-heading">
        <div className="settings-section-intro">
          <h2 id="profile-heading">Profile</h2>
          <p>How you appear on your globe.</p>
        </div>
        <form
          className="form-stack settings-form"
          onSubmit={(event) => {
            event.preventDefault();
            setSaved(false);
            setSaveError("");
            setOperation("save");
            startTransition(async () => {
              const result = await renameAction(name);
              if (result.error) setSaveError(result.error);
              else {
                setName(name.trim());
                setSaved(true);
                router.refresh();
              }
            });
          }}
        >
          <div className="field">
            <label htmlFor="settings-name">Display name</label>
            <input
              id="settings-name"
              name="displayName"
              autoComplete="nickname"
              value={name}
              maxLength={60}
              required
              disabled={pending}
              aria-describedby="settings-name-hint"
              onChange={(event) => {
                setName(event.target.value);
                setSaved(false);
                setSaveError("");
              }}
            />
            <p id="settings-name-hint" className="field-hint">
              Visible to visitors when your globe is published.
            </p>
          </div>
          <div className="field">
            <label htmlFor="settings-url">Your globe address</label>
            <input
              id="settings-url"
              value={profileUrl}
              readOnly
              aria-describedby="settings-url-hint"
              className="settings-readonly"
            />
            <p id="settings-url-hint" className="field-hint">
              Your address stays the same during beta, even if you change your
              name.
            </p>
          </div>
          <div className="field">
            <label htmlFor="settings-email">Sign-in email</label>
            <input
              id="settings-email"
              type="email"
              value={email}
              readOnly
              aria-describedby="settings-email-hint"
              className="settings-readonly"
            />
            <p id="settings-email-hint" className="field-hint">
              Used for sign-in. Never shown on your public globe.
            </p>
          </div>
          {saveError && (
            <p role="alert" className="form-error">
              {saveError}
            </p>
          )}
          <div className="settings-save">
            <Button type="submit" disabled={pending || !name.trim()}>
              {pending && operation === "save" ? "Saving…" : "Save profile"}
            </Button>
            <p role="status" className="settings-saved">
              {saved && (
                <>
                  <Check aria-hidden="true" /> Profile updated.
                </>
              )}
            </p>
          </div>
        </form>
      </section>

      <section className="settings-section" aria-labelledby="account-heading">
        <div className="settings-section-intro">
          <h2 id="account-heading">Account</h2>
          <p>Manage access to your account.</p>
        </div>
        <div className="settings-form form-stack">
          <div className="settings-signout settings-google">
            <div>
              <h3>Google sign-in</h3>
              <p>
                {googleConnected
                  ? "Google is connected to this account."
                  : "Connect Google to sign in to this same globe."}
              </p>
            </div>
            {googleConnected === null ? (
              <Button variant="secondary" onClick={() => router.refresh()}>
                Reload sign-in methods
              </Button>
            ) : googleConnected ? (
              <span className="settings-saved">
                <Check />
                Connected
              </span>
            ) : (
              <GoogleAccountLink clientId={googleClientId} disabled={pending} />
            )}
          </div>
          {googleConnected === null && (
            <p role="alert" className="form-error">
              Could not check connected sign-in methods. Reload to try again.
            </p>
          )}
          <div className="settings-signout">
            <div>
              <h3>Sign out</h3>
              <p>Sign out of GlobeAlbum on this browser.</p>
            </div>
            <form action={signOutAction}>
              <Button variant="secondary" type="submit" disabled={pending}>
                <LogOut /> Sign out
              </Button>
            </form>
          </div>
          <form
            className="settings-delete form-stack"
            onSubmit={(event) => {
              event.preventDefault();
              if (confirmation !== username || pending) return;
              setDeleteError("");
              setOperation("delete");
              startTransition(async () => {
                const result = await deleteAccountAction(confirmation);
                if (result.error) setDeleteError(result.error);
              });
            }}
          >
            <div>
              <h3>Delete account</h3>
              <p>
                Permanently delete your globe, places, visits and photos. This
                cannot be undone.
              </p>
            </div>
            <div className="field">
              <label htmlFor="delete-confirmation">
                Type <strong>{username}</strong> to confirm
              </label>
              <input
                id="delete-confirmation"
                value={confirmation}
                disabled={pending}
                onChange={(event) => setConfirmation(event.target.value)}
                autoComplete="off"
                spellCheck={false}
              />
            </div>
            {deleteError && (
              <p role="alert" className="form-error">
                {deleteError}
              </p>
            )}
            <Button
              variant="destructive"
              type="submit"
              disabled={pending || confirmation !== username}
            >
              {pending && operation === "delete"
                ? "Deleting account…"
                : "Delete account permanently"}
            </Button>
          </form>
        </div>
      </section>
    </>
  );
}
