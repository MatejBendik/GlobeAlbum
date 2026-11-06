# 01: Create a private globe after managed sign-in

Type: task
Status: ready-for-agent
Execution: email flow verified; real Google OAuth verification outstanding

## What to build

Create a private globe after managed sign-in, as a complete end-to-end user behavior.

## Blocked by

None

## Acceptance criteria

- [ ] Open Google registration persists a session; unauthorized users cannot read the editor.
- [x] Email/password signup, current-user read, sign-out and returning sign-in work through actual managed Neon Auth.
- [x] Onboarding creates exactly one private globe with a unique immutable slug and editable display name.
- [x] Missing credentials produce actionable setup guidance, never a fake authenticated identity.

## Validation evidence

Updated 2026-11-06. User explicitly added email/password and selected managed
Neon Auth. A real disposable identity registered through the browser form;
`/api/auth/get-session` returned that user, reload restored the session,
wrong credentials showed an appropriate error and returning sign-in restored
the private globe persisted in Neon. Google consent/callback remains unverified.
Local browser tests use an isolated Auth contract fake, separately from this
real-service smoke. See `npm run verify:neon -- --confirm` (requires running app).

See [verification and release gates](../../../validation.md). Unchecked criteria remain pending, even when their code exists.

## Comments

Approved in discovery; implementation explicitly authorized.
