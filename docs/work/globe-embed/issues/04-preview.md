# 04: Portfolio preview, accessibility and rendering lifecycle

Type: task
Status: ready-for-agent
Execution: implemented; locally verified

## Dependencies

[03](03-share-modal.md).

## User-visible outcome

Portfolio preview, accessibility and rendering lifecycle.

## Acceptance criteria

- [x] Desktop/mobile preview embeds the real viewer on an example website.
- [x] Theme and shape match copied HTML and do not change the application theme.
- [x] Offscreen/hidden renderers pause; modal close releases preview; WebGL fallback stays usable.

## Validation evidence

Verified 2026-11-12. All 56 unit/integration cases, production build and
TypeScript pass. Browser coverage includes all 75 applicable scenarios across
the complete run and focused repairs/reruns; one existing mobile hover case
is intentionally skipped. Offscreen WebGL drawing/resumption, second-site
embedding, clipboard fallback, swipe, camera and DTO privacy have local evidence.
The complete initial run's failures and the unreproduced mobile navigation
timeout remain documented. No deployed cloud or physical-device claim is made.
See [verification evidence](../verification.md).
