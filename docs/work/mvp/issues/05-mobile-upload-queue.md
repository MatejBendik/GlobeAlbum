# 05: Upload multiple photos from mobile

Type: task
Status: ready-for-agent
Execution: implemented; transfer and physical-device verification outstanding

## What to build

Upload multiple photos from mobile, as a complete end-to-end user behavior.

## Blocked by

04

## Acceptance criteria

- [ ] Multiple selected files show individual progress, cancellation, errors and retry.
- [ ] Cancellation/retry cannot create duplicate ready photos or bypass reservations.
- [ ] A physical-device upload is recorded separately from browser emulation.

## Validation evidence

Updated 2026-11-05. The RHF/Zod form validates every selected file and remaining slots before requests; desktop/mobile tests prove rejection above 20 MB without creating an intent. Queue progress, cancellation, per-file retries and interrupted-upload removal are implemented. Full interrupted multi-file/physical-device flows remain open.

See [verification and release gates](../../../validation.md). Unchecked criteria remain pending, even when their code exists.

## Comments

Approved in discovery; implementation explicitly authorized.
