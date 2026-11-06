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
- [ ] Vercel plan eligibility, storage lifecycle/CORS, cron, secrets and usage monitoring are checked before deployment.
- [ ] No deployment or paid upgrade occurs without a separate instruction.

## Validation evidence

Updated 2026-11-06. The production build, type checks, 28 Vitest tests and 12 album/browser scenarios plus two email-form scenarios pass. Browser verification covers desktop and mobile emulation; see docs/validation.md for current command evidence and remaining gates. Real Neon email/session and persisted-globe checks now pass. HEIC, real Google, GeoNames, physical devices, production auth email/recovery, automated identity cleanup, deployment cron and Vercel eligibility remain open. Cloudflare resources are authorized and deployed; Vercel application deployment and paid upgrades are not performed.

See [verification and release gates](../../../validation.md). Unchecked criteria remain pending, even when their code exists.

## Comments

Approved in discovery; implementation explicitly authorized.
