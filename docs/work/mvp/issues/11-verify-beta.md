# 11: Verify and prepare the public beta

Type: task
Status: ready-for-agent
Execution: release gated

## What to build

Verify and prepare the public beta, as a complete end-to-end user behavior.

## Blocked by

05, 08, 10

## Acceptance criteria

- [x] Build/type checks and meaningful domain/integration/browser tests pass.
- [ ] Real Google, Neon, R2 and HEIC checks and physical-device evidence are recorded before release.
- [x] Deployment is explicitly authorized, with Hobby, private storage lifecycle/CORS and Production-scoped variables verified.
- [ ] Scheduled cron execution and usage monitoring are checked before the public beta.

## Validation evidence

Updated 2026-11-07. GitHub `main` deploys to Vercel Hobby. The hosted test
covered returning Google login, managed email registration and deletion,
GeoNames, private upload of PNG/JPEG/WebP/HEIC through R2 and Vercel/Linux,
publication and hiding. Vercel registered the daily maintenance cron. A manual
authorized invocation cleared the test cleanup jobs and their R2 objects.
Physical devices, representative resource measurements, production auth
email/recovery, the first scheduled invocation and beta feedback remain open.

See [verification and release gates](../../../validation.md). Unchecked criteria remain pending, even when their code exists.

## Comments

Approved in discovery; implementation explicitly authorized.
