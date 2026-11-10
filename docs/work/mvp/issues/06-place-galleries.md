# 06: Browse photo postcards and place galleries

Type: task
Status: ready-for-agent
Execution: implemented; some recovery/device checks outstanding

## What to build

Browse photo postcards and place galleries, as a complete end-to-end user behavior.

## Blocked by

03, 04

## Acceptance criteria

- [x] Place pins show the saved coordinates, with a cover postcard above each pin where space permits.
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

The 2026-11-07 marker refinement gives each visible place a stable pin. Its
postcard scales with the camera distance, and collision spacing uses the same
scale, so nearby covers can appear together when there is room.

On 2026-11-10, clicking a postcard at close zoom reproduced a camera reset and
replaced the postcard image node after closing. Globe markers now open the
gallery without refocusing the camera or replacing the existing postcard nodes.
The gallery updates its deep link with the browser history. Selecting a place
from the list can still focus the camera. [Next.js Native History API](https://nextjs.org/docs/app/getting-started/linking-and-navigating#native-history-api)
was checked on 2026-11-10.

Desktop and mobile Chromium verified that the zoom, projected pin position and
existing postcard image survive opening and closing a gallery. The targeted
suite also checked landing postcards, the place list, reset and public globe
rendering.
