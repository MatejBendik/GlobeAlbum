# 01: Create a private globe after Google sign-in

Type: task
Status: ready-for-agent
Execution: implemented; real OAuth verification outstanding

## What to build

Create a private globe after Google sign-in, as a complete end-to-end user behavior.

## Blocked by

None

## Acceptance criteria

- [ ] Open Google registration persists a session; unauthorized users cannot read the editor.
- [x] Onboarding creates exactly one private globe with a unique immutable slug and editable display name.
- [x] Missing credentials produce actionable setup guidance, never a fake authenticated identity.

## Validation evidence

Updated 2026-11-05. Better Auth Google configuration, protected editor and private onboarding are implemented. Browser tests seed normal database sessions and verify immutable one-globe onboarding; they do not exercise Google. Missing credentials disable sign-in with setup guidance. Real Google consent/callback/returning-session checks remain open.

See [verification and release gates](../../../validation.md). Unchecked criteria remain pending, even when their code exists.

## Comments

Approved in discovery; implementation explicitly authorized.
