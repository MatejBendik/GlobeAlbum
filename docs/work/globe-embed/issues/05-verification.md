# 05: End-to-end embed verification

Type: task
Status: ready-for-agent
Execution: implemented; locally verified

## Dependencies

[04](04-preview.md).

## User-visible outcome

End-to-end embed verification.

## Acceptance criteria

- [x] Copied HTML works on a second origin without a session or usable storage.
- [x] Both shapes/themes, gallery navigation and publication revocation are covered.
- [x] Formatting, typecheck, integration/browser regression tests and build pass; limitations are recorded.

## Validation evidence

Verified 2026-11-12. All 56 unit/integration cases, production build and
TypeScript pass. Browser coverage includes all 75 applicable scenarios across
the complete run and focused repairs/reruns; one existing mobile hover case
is intentionally skipped. Offscreen WebGL drawing/resumption, second-site
embedding, clipboard fallback, swipe, camera and DTO privacy have local evidence.
The complete initial run's failures and the unreproduced mobile navigation
timeout remain documented. No deployed cloud or physical-device claim is made.
See [verification evidence](../verification.md).
