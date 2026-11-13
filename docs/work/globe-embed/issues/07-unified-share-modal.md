# 07: One shared link and embed modal

Type: task
Status: ready-for-agent
Execution: implemented; locally verified

## Dependencies

[06](06-clean-viewer.md).

## User-visible outcome

User-confirmed 2026-11-13: always open the large Share modal, put the share link
above Shape/Theme, and show embed settings and preview immediately without tabs.
This is the second of two requested commits.

Visual thesis: one calm workspace makes the globe preview the dominant surface.
Content: share link, publication state/action, shape/theme, preview and HTML.
Interaction: immediate configuration and independent copy actions in one dialog.

## Acceptance criteria

- [x] Share link and embed configuration appear together in one wide dialog.
- [x] The link is read-only, above Shape/Theme, with its own copy button.
- [x] Link and HTML copy feedback and manual-selection fallbacks are independent.
- [x] Private globes offer publication and cannot copy/export until published.
- [x] Hiding and closing release the iframe; reopening restores one preview.
- [x] Desktop/mobile layout, theme/shape and normal share/publish flows work.

## Validation evidence

2026-11-13: the new unified-dialog browser check first failed on the old tablist.
After the change, all 16 then-current desktop/mobile embed cases passed. Two
additional clipboard-target cases and both existing private/publish/hide user
journeys passed in a focused four-case run. Screenshots were inspected for both
viewport classes. All 56 unit/integration cases, TypeScript, formatting and the
optimized production build passed. See [verification](../verification.md).
