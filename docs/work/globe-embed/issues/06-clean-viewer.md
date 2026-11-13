# 06: Clean, closer embedded globe

Type: task
Status: ready-for-agent
Execution: implemented; locally verified

## Dependencies

[04](04-preview.md).

## User-visible outcome

User-confirmed 2026-11-13: a closer globe fills the embed, without visible Places,
pause or reset controls. Attribution remains at the bottom right. The real preview
contains no mock website content. This is the first of two requested commits.

Visual thesis: a calm, immersive globe is the single visual surface.
Content: photo markers, globe and one attribution link.
Interaction: automatic rotation, drag/zoom and direct photo galleries.

## Acceptance criteria

- [x] The embed alone uses closer initial camera framing.
- [x] No visible Places, pause or reset controls; normal workspace controls remain.
- [x] GlobeAlbum stays bottom right on desktop and mobile.
- [x] Rotation, photo navigation, keyboard access and WebGL fallback remain usable.
- [x] The preview frame has no sample website text or navigation.

## Validation evidence

2026-11-13: the new browser check failed on the old Places control before the
change, then all 14 embed cases passed on desktop/mobile Chromium. They cover
rotation without visible controls, public gallery privacy, media renewal, second
site embedding, gallery/camera behavior and WebGL fallback. Desktop and mobile
screenshots were inspected. All four normal-globe zoom/camera regression cases,
the production build, explicit TypeScript check and formatting passed. See
[verification](../verification.md) for the evidence and local logs.
