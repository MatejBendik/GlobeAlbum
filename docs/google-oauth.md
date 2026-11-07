# Google OAuth setup

Configured: 2026-11-06. The user approved Google API Services User Data Policy,
creation of the OAuth client, storage in local environment configuration and
Neon Auth, and a real sign-in test using basic identity scopes.

## Configuration

- Google Cloud project: `globealbum`.
- Client: `GlobeAlbum Web (Neon Auth)`, type Web application.
- Consent identity: GlobeAlbum; the user's selected support/contact email.
- Audience: External, currently Testing; no public app deployment performed.
- Authorized JavaScript origins: `http://localhost:3000` and
  `http://127.0.0.1:3000`.
- Authorized redirect URI: the existing production branch's
  `NEON_AUTH_BASE_URL` followed by `/callback/google`. This is the Neon-managed
  callback, not `/api/auth/callback/google` on Next.js.
- Declared scopes: `openid`, `https://www.googleapis.com/auth/userinfo.email`
  and `https://www.googleapis.com/auth/userinfo.profile`.
- Existing Neon project/branch: `bitter-river-07504050` / `production`.
  Google provider now reports `standard` with the owned client instead of `shared`.

The credentials were captured from Google's one-time creation dialog without
printing the secret. They are stored in ignored `.env.local` as
`GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`, and securely applied to the existing
Neon Google provider using CLI `oauth-provider update` with a secret file.
Local credential artifacts have owner-only file permissions and remain under
ignored `.local/google-oauth/`. No existing environment entries were replaced
except those two explicitly requested Google keys.

Managed Neon Auth reads the provider credentials stored in Neon. Next.js passes
only the public `GOOGLE_CLIENT_ID` to the authenticated settings page for Google's
official identity button. `GOOGLE_CLIENT_SECRET` remains an operations copy and
is never serialized to the browser. Updating only `.env.local` will not rotate
the live provider. Never use a `NEXT_PUBLIC_` prefix for the secret or commit
credential files.

## Authentication behavior

The app continues using the installed `@neon/auth` wrapper. New Google users
return to onboarding; existing users return to the studio. Failures return to
sign-in with a fixed, friendly explanation; arbitrary provider query text is
never rendered.

A real Google attempt used the newly created client and reached Google's
basic-profile consent. The managed callback returned `account_not_linked`
because the test email already belongs to an email/password account. This is
not a redirect-URI or credential error. Preserve that identity and its globe:
sign in using the existing method, then explicitly Connect Google from Profile
settings. Google's official Identity Services button returns a signed ID token
bound to a random nonce; `authClient.linkSocial({ provider: "google", idToken })`
sends it through the existing managed SDK/proxy. Neon validates Google's token,
the nonce, current session and matching email. The token is not persisted or
logged by the app. The Google script loads only after choosing Connect Google;
no One Tap or automatic account selection is enabled. Do not force linking in
SQL or weaken managed account-linking protections. Connection status is read through the
authenticated managed `listAccounts()` API and reduced to a boolean in the UI.

Redirect-based `linkSocial()` was tested first. A relative callback produced
`ERR_INVALID_URL`; absolute callbacks exposed `state_mismatch` instead. The
managed service sends this linking flow directly to Google, so its state cookie
is scoped to the app proxy domain rather than the remote callback domain. This
matches the still-open [upstream issue](https://github.com/neondatabase/neon-js/issues/181).
Use the documented ID-token linking method rather than disabling state checks,
moving cookies between domains or replacing managed Auth. Ordinary Google
sign-in retains Neon's working redirect/verification flow.

## Release notes

The 2026-11-07 deployment uses `https://globealbum.vercel.app`, which is
registered as a trusted origin on the existing Neon branch. A returning Google
user signed in through the hosted app, reached the existing studio and retained
the session on reload.

In [Google Auth Platform → Clients](https://console.cloud.google.com/auth/clients?project=globealbum),
open **GlobeAlbum Web (Neon Auth)** and add `https://globealbum.vercel.app`
under **Authorized JavaScript origins** for **Connect Google** in Profile
settings. Keep the existing Neon callback in **Authorized redirect URIs**:

```text
https://ep-lucky-frog-b9lv2ak8.neonauth.c-7.eu-central-1.aws.neon.tech/neondb/auth/callback/google
```

Google may display the Neon callback host on the consent screen. Branding,
privacy disclosures and audience review remain public beta gates.
The [Google Identity Services setup guide](https://developers.google.com/identity/gsi/web/guides/get-google-api-clientid)
and [Neon OAuth guide](https://neon.com/docs/auth/guides/setup-oauth) were checked on 2026-11-07.

## Verification evidence

- The real browser request used the owned Google client ID and Google's consent
  displayed only email, name and profile photo. Its callback returned the
  managed `account_not_linked` result for the existing email/password identity.
- The full local browser suite passed 39 scenarios with one intentional mobile
  pointer-hover skip. New desktop/mobile cases verify callback destinations,
  fixed error messages, unauthenticated link denial and preservation of the
  existing globe after a provider failure. Auth/provider failures in these
  automated cases use the guarded local contract fake.
- All 42 Vitest integration tests and the production build passed after adding
  explicit account linking. Builds do not migrate the production database.
- **Real-service check passed:** the user signed into the original email/password
  account; Google's identity popup linked it successfully. Settings showed
  Connected. Signing out denied access to `/studio`; Continue with Google then
  returned to the existing studio, and the session survived reload. Settings
  still showed Connected after that new Google session.
- Independent read-only SQL confirmed the same application user ID, globe ID,
  profile slug, display name and publication state. The original 1 place and
  3 photos were retained; auth providers are now `credential` and `google`.
- The follow-up browser regression covers ID-token/nonce submission through the
  SDK/proxy, unauthenticated denial, failure/retry and a refreshed Connected state
  using isolated contract fakes. These tests do not replace the real result above.
  At the linking checkpoint, the focused auth/settings run passed 10 desktop/mobile cases; the final
  production build and repository-wide Prettier check passed at that checkpoint. The earlier full
  39-case browser suite and 42 Vitest results are recorded separately above.
- Later, the owner deleted that account and reproduced a silent return to login.
  Application data was gone, but the old managed identity remained and was
  correctly rejected by its permanent deletion fence. Automatic management-API
  cleanup now removes the old identity without clearing that fence.
- Real Google-only re-registration then passed: a new managed ID was created
  with only the Google provider, onboarding opened and survived reload, and no
  globe existed for that new ID. The original user/identity remained deleted.
  The owner was left on onboarding to choose their own display name.

## Account chooser behavior

Google can reuse its signed-in account and an existing grant without displaying
another consent/account-choice page. A read-only diagnostic of the current
managed sign-in initialization showed that `additionalParams.prompt` is not
forwarded to Google's authorization URL, so the app does not retain an ineffective
"force chooser" option or rewrite Neon's OAuth flow. The missing chooser did not
cause this bug: deletion left a provider identity that the app correctly blocked.
No Google Console change is required to register after the identity is removed.
See [automatic deletion setup](setup.md#managed-identity-deletion) and ADR 0006.

## Primary references

Verified 2026-11-06:

- https://neon.com/docs/auth/guides/setup-oauth
- https://support.google.com/cloud/answer/15549945
- https://developers.google.com/terms/api-services-user-data-policy
- https://better-auth.com/docs/concepts/users-accounts
- https://developers.google.com/identity/gsi/web/reference/js-reference
- https://developers.google.com/identity/gsi/web/guides/display-button
- https://github.com/neondatabase/neon-js/issues/181
- https://developers.google.com/identity/openid-connect/openid-connect
- https://neon.com/docs/auth/guides/manage-auth-api
- Installed `@neon/auth` 0.8.2 SDK and Next.js 16.4.5 local documentation.
