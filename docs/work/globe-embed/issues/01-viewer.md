# 01: Public embed viewer, layout and framing

Type: task
Status: ready-for-agent
Execution: implemented; locally verified

## Dependencies

None.

## User-visible outcome

Public embed viewer, layout and framing.

## Acceptance criteria

- [x] Published globe renders without site chrome or authentication.
- [x] Private/missing globe renders a compact unavailable state.
- [x] Only embed documents allow framing; existing pages remain protected.

## Validation evidence

Verified 2026-11-12 by the domain integration seam and desktop/mobile
Chromium embed journeys. Tests use local database/auth/storage fixtures;
this is not a deployed cloud integration claim. See
[verification evidence](../verification.md) and [specification](../spec.md).
