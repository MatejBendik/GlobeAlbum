# 01: Create a private globe after managed sign-in

Type: task
Status: ready-for-agent
Execution: email flow, Google linking, returning sign-in and fresh Google registration verified

## What to build

Create a private globe after managed sign-in, as a complete end-to-end user behavior.

## Blocked by

None

## Acceptance criteria

- [x] Open Google registration persists a session; unauthorized users cannot read the editor.
- [x] Email/password signup, current-user read, sign-out and returning sign-in work through actual managed Neon Auth.
- [x] Onboarding creates exactly one private globe with a unique immutable slug and editable display name.
- [x] Missing credentials produce actionable setup guidance, never a fake authenticated identity.

## Validation evidence

Updated 2026-11-06. User explicitly added email/password and selected managed
Neon Auth. A real disposable identity registered through the browser form;
`/api/auth/get-session` returned that user, reload restored the session,
wrong credentials showed an appropriate error and returning sign-in restored
the private globe persisted in Neon. Google-specific results were added in the later comments below.
Local browser tests use an isolated Auth contract fake, separately from this
real-service smoke. See `npm run verify:neon -- --confirm` (requires running app).

See [verification and release gates](../../../validation.md). Unchecked criteria remain pending, even when their code exists.

## Comments

Approved in discovery; implementation explicitly authorized.

2026-11-06 form refinement: the display name generates a normalized, read-only
address preview, with collision suffixes including retired slugs. The database
still enforces uniqueness atomically. Cold-load browser coverage ensures typing
starts only once the preview logic is ready; failed checks can be retried.

2026-11-06 settings refinement: profile editing now lives at `/settings`, linked
from the account menu. Desktop/mobile browser tests verify saved display names
against PostgreSQL and after reload, immutable read-only URLs, private email,
legacy-route redirection, and signed-out/not-onboarded access guards.

2026-11-06 owned Google OAuth: the user's web client is configured in the existing
Neon branch; credentials remain ignored locally. Actual Google consent used the
owned client and returned `account_not_linked` for the existing email identity.
Explicit linking is now offered in authenticated Profile settings. Automated
desktop/mobile cases verify callback/error behavior and unauthorized linking
denial. Subsequent real ID-token linking, sign-out, protected-route denial,
returning Google sign-in and reload passed in Dia. Read-only SQL confirms the
same user/globe/slug, 1 place and 3 photos; providers are credential and Google.
The redirect linking route reproduced the upstream `state_mismatch` defect; the
app uses the supported ID-token method without disabling safety checks. At that
checkpoint a new Google identity's first registration was still unverified; the
subsequent result below completes that check. See [Google setup](../../../google-oauth.md).

2026-11-06 deletion/re-registration fix: after the owner deleted their previous
account, the old managed identity remained fenced and caused a silent login loop.
Automatic cleanup removed that confirmed-deleted identity through the supported
branch API. A real Google-only registration created a different identity, reached
onboarding and survived reload; SQL confirmed zero globes for the new ID. No old
content was restored. This supersedes the earlier fresh-registration caveat.
