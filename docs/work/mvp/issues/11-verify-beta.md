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

Updated 2026-11-06. Production build, Worker checks, 53 Vitest tests and 45 browser
scenarios pass (one intentional mobile-hover skip). Real Neon, Google registration
and linking, GeoNames, R2 PNG/HEIC and owner JPEG recovery are recorded in
validation. Physical devices, hosted Linux codec packaging/resource measurements,
production auth email/recovery, deployment cron and Vercel eligibility remain
open. Automated managed identity cleanup is verified. Cloudflare uses R2 only;
no Images plan, paid upgrade or Vercel deployment was performed.

See [verification and release gates](../../../validation.md). Unchecked criteria remain pending, even when their code exists.

## Comments

Approved in discovery; implementation explicitly authorized.
