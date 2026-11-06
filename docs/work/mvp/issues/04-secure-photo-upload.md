# 04: Add a photo securely, including HEIC

Type: task
Status: ready-for-agent
Execution: implemented; blocked on real HEIC

## What to build

Add a photo securely, including HEIC, as a complete end-to-end user behavior.

## Blocked by

02

## Acceptance criteria

- [ ] An owned visit accepts supported files through quarantine and returns only processed private variants.
- [ ] Actual size/type/decoding, orientation, metadata stripping and immutable completion are validated.
- [ ] Account/global quotas, idempotency and orphan cleanup survive failures.
- [ ] Real R2 byte enforcement and real HEIC processing are release-gate checks.

## Validation evidence

Updated 2026-11-05. Real Cloudflare PNG upload, replay rejection, decoding, static WebP output, metadata absence, short read capabilities and completion idempotency pass. Invalid actual sizes leave no object. PostgreSQL tests cover concurrent reservations, late completion and cleanup retries. HEIC fails in the provider with internal 9516; orientation and real phone fixtures remain open. The user confirmed retaining Cloudflare and keeping HEIC mandatory before beta.

See [verification and release gates](../../../validation.md). Unchecked criteria remain pending, even when their code exists.

## Comments

Approved in discovery; implementation explicitly authorized.
