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
