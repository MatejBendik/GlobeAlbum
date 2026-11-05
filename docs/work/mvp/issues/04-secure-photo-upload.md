# 04: Add a photo securely, including HEIC

Type: task
Status: ready-for-agent

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

Pending implementation and verification. External credentials and service checks must be reported separately.

## Comments

Approved in discovery; implementation explicitly authorized.
