# 06: Browse photo postcards and place galleries

Type: task
Status: ready-for-agent
Execution: implemented; some recovery/device checks outstanding

## What to build

Browse photo postcards and place galleries, as a complete end-to-end user behavior.

## Blocked by

03, 04

## Acceptance criteria

- [x] Place covers appear as bounded postcards while remaining places use dots.
- [x] One lazy-loaded place gallery combines visits with captions and arrows/keyboard/swipes.
- [ ] Expired media links refresh through authorization without loading originals.

## Validation evidence

Updated 2026-11-05. Projected postcard collision logic has focused tests. Browser tests combine two visits in one gallery and exercise arrows, keyboard and dispatched swipe events, plus caption editing. Lazy image-link renewal is implemented but expiry-recovery UX still needs an explicit browser check. No originals are rendered.

See [verification and release gates](../../../validation.md). Unchecked criteria remain pending, even when their code exists.

## Comments

Approved in discovery; implementation explicitly authorized.

2026-11-06 refinement: clicking a landing postcard immediately opens its example
place gallery on the current page, with no second click on the place-note link.
This is verified from the photo area on desktop and mobile with reduced motion.
