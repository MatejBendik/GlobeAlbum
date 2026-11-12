# 02: Public embed galleries

Type: task
Status: ready-for-agent
Execution: implemented; locally verified

## Dependencies

[01](01-viewer.md).

## User-visible outcome

Public embed galleries.

## Acceptance criteria

- [x] Gallery reads require the requested published globe and matching place.
- [x] Owner sessions never expand the embed DTO.
- [x] Gallery fits the frame and preserves camera, keyboard and swipe behavior.

## Validation evidence

Verified 2026-11-12 by the domain integration seam and desktop/mobile
Chromium embed journeys. Tests use local database/auth/storage fixtures;
this is not a deployed cloud integration claim. See
[verification evidence](../verification.md) and [specification](../spec.md).
