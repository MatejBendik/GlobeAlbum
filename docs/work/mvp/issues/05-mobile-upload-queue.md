# 05: Upload multiple photos from mobile

Type: task
Status: ready-for-agent
Execution: implemented; physical-device verification outstanding

## What to build

Upload multiple photos from mobile, as a complete end-to-end user behavior.

## Blocked by

04

## Acceptance criteria

- [x] Multiple selected files show individual progress, cancellation, errors and retry.
- [x] Cancellation/retry cannot create duplicate ready photos or bypass reservations.
- [ ] A physical-device upload is recorded separately from browser emulation.

## Validation evidence

Updated 2026-11-06. Desktop/mobile browser tests upload a three-file batch, inject a connection failure, cancel a held transfer, retry the failed file and verify exactly two ready photos. They exercise real application handlers and PostgreSQL with a local R2 transport double and the real Node.js codec; they do not establish physical-device compatibility. A regression test caught duplicate cleanup during cancellation; both callers now share one operation. The >20 MB RHF/Zod rejection test creates no upload intent. Physical-device checks remain open.

See [verification and release gates](../../../validation.md). Unchecked criteria remain pending, even when their code exists.

## Comments

Approved in discovery; implementation explicitly authorized.

2026-11-06 refinement: use photo/photos throughout UI, show local selection/queue
previews, and remove failed rows cleanly before reselecting the same file.
Desktop/mobile regressions pass. Actual JPEG upload and conversion from the
localhost origin also passed against the deployed Cloudflare Worker; its fixtures
were physically removed. The subsequent R2-only repair also passed real HEIC upload/processing; physical-device and hosted-runtime verification remain separate gates.

2026-11-06 selection refinement: separate file-picker selections append to the
existing RHF array; Zod checks the combined pending selection. The regression
uploads two separately selected photos, then a later one-photo batch, and checks
that all three ready Photo records remain. Upload labels use singular/plural
according to selection/batch size. Existing cancellation/retry coverage remains.

2026-11-06 processing repair: all 41 browser scenarios pass with the actual Sharp/HEIC
processor. A separate real-R2 smoke passes PNG/HEIC, and both previously failing
owner JPEGs completed normally to READY in Neon. No Cloudflare Images plan is used.
