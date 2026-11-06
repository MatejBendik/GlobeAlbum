# 03: Explore saved places on the globe

Type: task
Status: ready-for-agent
Execution: implemented; physical-device performance outstanding

## What to build

Explore saved places on the globe, as a complete end-to-end user behavior.

## Blocked by

02

## Acceptance criteria

- [x] Saved places render on a dark dotted globe with camera interaction.
- [x] A complete keyboard-accessible list remains usable without WebGL.
- [ ] Reduced motion and mobile interaction are covered.

## Validation evidence

Updated 2026-11-05. Desktop/mobile Chromium renders the actual dotted WebGL globe and bounded postcards. A disabled-WebGL test retains searchable places and galleries. Reduced-motion handling is implemented; physical Safari/GPU/performance verification remains a release gate.

See [verification and release gates](../../../validation.md). Unchecked criteria remain pending, even when their code exists.

## Comments

Approved in discovery; implementation explicitly authorized.
