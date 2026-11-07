# 03: Explore saved places on the globe

Type: task
Status: ready-for-agent
Execution: implemented; physical-device performance outstanding

## What to build

Explore saved places on the globe, as a complete end-to-end user behavior.

## Blocked by

02

## Acceptance criteria

- [x] Saved places render on a theme-aware dotted globe with camera interaction.
- [x] A complete keyboard-accessible list remains usable without WebGL.
- [ ] Reduced motion and mobile interaction are covered.

## Validation evidence

Updated 2026-11-05. Desktop/mobile Chromium renders the actual dotted WebGL globe and bounded postcards. A disabled-WebGL test retains searchable places and galleries. Reduced-motion handling is implemented; physical Safari/GPU/performance verification remains a release gate.

See [verification and release gates](../../../validation.md). Unchecked criteria remain pending, even when their code exists.

## Comments

Approved in discovery; implementation explicitly authorized.

2026-11-06 postcard refinement: 130px frames replace the original 65px frames,
with increased projected spacing and hover/focus enlargement. A stable button
contains the animated visual frame. Photos render above dot hit targets, while
keyboard-focused dots can still be reached above the photo layer. The complete
place list remains the dense-collection fallback.

2026-11-06 user refinement: use the entire workspace for the centered globe;
move the complete list into a floating right panel, closed initially and opened
automatically without WebGL. Add persisted light/dark mode with an actual white
light-mode material. Desktop/mobile interaction, Escape/focus handling, public
land-dot loading and portrait framing are verified. Physical devices remain gated.

Since the refinement on 2026-11-07, postcards with two or more ready photos show
layered paper behind a single cover thumbnail. The starting and reset camera
positions prioritize the selected place, then the first cover-bearing place,
then the first saved place. Single-place globes start still and reset pauses
rotation. The [browser verification](../../../validation.md) covers a public
Tokyo globe, drag/reset, layered postcards and gallery access.

The later 2026-11-07 update restores automatic rotation after the opening view
centers even a single place. The owner style panel previews Dotted, Atlas and
Orbit and saves the selected preset for visitors. Browser coverage verifies the
opening rotation, reset, persistence after reload and the public style across
the visitor's light and dark modes. See [verification](../../../validation.md).

Minimal and Classic show Natural Earth country names on the globe. Minimal
uses grayscale outlines, and Classic adds colored land and country tooltips.
The browser style scenario covers both presets and verifies that the saved
choice reaches the public globe.

On 2026-11-07, Playwright reproduced the open picker after a mobile tap and
verified the fix with touch on mobile and keyboard and pointer on desktop.
Selection closes the picker and restores focus to its trigger, including when
reselecting the active style. The test still covers persistence after reload
and public rendering. The fix uses the native
[`details.open` property](https://html.spec.whatwg.org/multipage/interactive-elements.html#the-details-element)
(verified 2026-11-07).
