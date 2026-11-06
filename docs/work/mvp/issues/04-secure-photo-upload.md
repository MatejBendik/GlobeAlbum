# 04: Add a photo securely, including HEIC

Type: task
Status: ready-for-agent
Execution: implemented and cloud smoke verified; physical-device/hosted-runtime gates remain

## What to build

Add a photo securely, including HEIC, as a complete end-to-end user behavior.

## Blocked by

02

## Acceptance criteria

- [x] An owned visit accepts supported files through quarantine and returns only processed private variants.
- [x] Actual size/type/decoding, orientation, metadata stripping and immutable completion are validated.
- [x] Account/global quotas, idempotency and orphan cleanup survive failures.
- [x] Real R2 byte enforcement and real HEIC processing are release-gate checks.

## Validation evidence

Updated 2026-11-06. Full actual R2 PNG/HEIC smoke passes upload, replay rejection,
private WebP reads without EXIF/XMP, idempotent completion, size enforcement and
publication revocation. The user chose R2-only storage; decoding now runs in Node
with Sharp/libheif WASM, without an Images binding or plan (ADR 0007). Both owner
JPEGs were recovered through the normal completion operation. The 53 Vitest tests
cover orientation, corrupt/oversized decoded images, concurrent reservations,
late completion and durable cleanup. Physical iPhone files and actual hosted Linux
packaging/memory remain release checks.

See [verification and release gates](../../../validation.md). Unchecked criteria remain pending, even when their code exists.

## Comments

Approved in discovery; implementation explicitly authorized.
