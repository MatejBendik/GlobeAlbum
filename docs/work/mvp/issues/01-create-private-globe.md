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

2026-11-10 landing copy refinement: signed-out visitors see consistent
`Create your globe` and `Explore an example` action labels in the header and
hero. The hero places `Free to use` beside the creation action. Desktop and
mobile browser checks verified the links and signed-in navigation. A 320 px
viewport check confirmed that the creation link and theme toggle both fit.

2026-11-11 beta feedback refinement: the H1 now explains trips and photos on
an owner's globe, with `A world of little moments.` as supporting copy. Both
signed-out creation links say `Create your free globe`; signed-in visitors retain
`Open your globe`. The mobile globe sits between the introduction and actions.
The existing Mark / Keep / Share steps immediately follow the hero in a centered
80rem container. This supersedes the previous separate `Free to use` caption.

Validation: 55 unit tests, TypeScript and the production build passed. Eight
focused desktop/mobile browser cases passed for preview styles, postcard galleries,
account navigation and theme continuity. Responsive browser inspection covered
320, 390, 768, 1440 and 2560px widths, light/dark appearances at 390 and 1440px,
no horizontal overflow or page errors, and fully visible header creation/theme
controls at 320px. The 2560px check measured a centered 1280px hero; the mobile
checks placed the canvas above the fold and before the primary action. These
are local Chromium checks; browser cases use isolated Auth/storage fakes and
responsive screenshots also cover the local production build. They are not
physical-device validation or new cloud-integration evidence. Screenshots stay ignored under
`.local/verification/`.
