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

These environment keys are local operations copies. Managed Neon Auth reads
the provider credentials stored in Neon; Next.js does not consume them. Updating
only `.env.local` will not rotate the live provider. Never use a
`NEXT_PUBLIC_` prefix for the secret or commit credential files.

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
settings using `authClient.linkSocial()`. Do not force linking in SQL or weaken
managed account-linking protections. Connection status is read through the
authenticated managed `listAccounts()` API and reduced to a boolean in the UI.

## Release notes

Google may display the callback host (`neon.tech`) on its consent screen even
when the owned client is used. Before a public release, add the actual app domain
and published privacy disclosures, review branding/verification and audience
status, and register the real hosting origin with Google and Neon. Vercel
deployment, a domain purchase and paid upgrades remain separate instructions.

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
- **Pending real-service check:** the controlled Dia profile currently has no
  active app session after the usage interruption. The user must sign in to the
  original email/password account in the prepared local tab. Then verify explicit
  Google linking, sign-out, returning Google sign-in, session restoration and
  unchanged application user/globe identifiers. Do not treat the configuration
  or local provider-failure tests as proof that this final linking flow passed.

## Primary references

Verified 2026-11-06:

- https://neon.com/docs/auth/guides/setup-oauth
- https://support.google.com/cloud/answer/15549945
- https://developers.google.com/terms/api-services-user-data-policy
- https://better-auth.com/docs/concepts/users-accounts
- Installed `@neon/auth` 0.8.2 SDK and Next.js 16.4.5 local documentation.
