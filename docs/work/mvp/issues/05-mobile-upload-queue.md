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

Updated 2026-11-06. Desktop/mobile browser tests upload a three-file batch, inject a connection failure, cancel a held transfer, retry the failed file and verify exactly two ready photos. They exercise real application handlers and PostgreSQL with a local storage/processing test double; they do not establish Cloudflare conversion or physical-device compatibility. A regression test caught duplicate cleanup during cancellation; both callers now share one operation. The >20 MB RHF/Zod rejection test creates no upload intent. Physical-device checks remain open.

See [verification and release gates](../../../validation.md). Unchecked criteria remain pending, even when their code exists.

## Comments

Approved in discovery; implementation explicitly authorized.
