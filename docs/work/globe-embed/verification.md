# Embed verification

Date: 2026-11-12. Local implementation evidence only; no deployment performed.

## Observed evidence

- The domain publication/relationship test first failed because readEmbeddedGallery
  did not exist, then passed after implementing the public read seam.
- The browser configuration test first failed on the missing Embed tab, then
  passed after implementing the Share modal.
- All 12 embed browser cases passed on Chromium desktop and Pixel 7 emulation
  before the final complete regression run. They exercise configuration,
  private/public gating, fixed theme, both shapes, real portfolio preview,
  clipboard success/manual selection, gallery privacy even with an owner cookie,
  second-site HTML, empty/missing globes, no WebGL, expired photo renewal,
  keyboard navigation, camera preservation and publication revocation/restoration.
- The second-site test uses http://localhost:8790 with a real iframe from
  http://127.0.0.1:3100. The visitor context has no cookies and localStorage and
  sessionStorage explicitly throw SecurityError. Gallery media comes through the
  existing local storage transport fixture with real signed capabilities.
- Header checks inspect viewer no-store, no X-Frame-Options conflict and
  frame-ancestors *, with DENY/none preserved for site/editor/auth/profile routes.
- Typecheck passed. All 56 unit/integration/validation tests passed.
- Visual inspection covered desktop and mobile Share screenshots. A layering
  defect that intercepted the attribution link was fixed; mobile preview was
  moved above code and short-frame gallery details were compacted. Final visual
  QA also found a clipped initial mobile postcard; shallow frames now scale it
  down, and the second-site test checks that its bounds remain inside the iframe.

## Final verification

- Final `npm test`: **56 passed** in six files.
- `npm run build`: optimized Next.js production build and its TypeScript step
  passed; both new public routes appear in the build output. No deployment.
- Final `npm run typecheck`: passed. Repository Prettier check passed.
- The complete browser run executed 76 cases: **70 passed, 5 failed, 1 skipped**.
  The existing mobile hover case is intentionally skipped. Two old test controls
  needed correction: wait for the workspace before measuring its width and scope
  profile-save feedback to its Profile region rather than both status elements.
  A mobile account-navigation timeout did not recur in the focused rerun; no
  application navigation change was made for it.
- The focused desktop/mobile rerun executed 18 cases: **17 passed**; the remaining
  mobile embed case exposed an incomplete synthetic touch event. Its identifier
  and changedTouches now match the existing touch fixture convention. The final
  mobile second-site case then **passed**, including swipe and zero page errors.
- All 75 applicable browser scenarios have passing evidence across these runs;
  there was no second complete all-green suite run. The single navigation timeout
  under full-suite load remains recorded rather than silently discarded.
- Offscreen behavior is measured at the browser WebGL boundary: native draw calls
  stop while the iframe is outside the viewport and resume on return. Both desktop
  and mobile second-site tests passed this check. Hidden-document pausing shares
  the renderer active flag and was reviewed; it is not a physical-device benchmark.
- Normal unknown/profile-unavailable routes retain exactly one header/footer,
  while unavailable embedded globes have neither. Focused fallback cases pass on
  desktop and mobile. Share screenshots and real second-site frame screenshots
  were inspected locally.
- After the postcard fitting adjustment, the mobile second-site case passed again
  with explicit postcard containment assertions (23 seconds). Its complete
  multi-page journey uses a 75-second budget for cold compilation; a preceding
  45-second attempt reached the final republication reload before timing out.
  This is a test execution budget, not a product latency guarantee.

Local final rerun logs: .local/verification/embed-final-e2e.log and
.local/verification/embed-mobile-final.log (ignored runtime artifacts).

## Limits and remaining release checks

- Browser runs use local PostgreSQL plus managed-auth and R2 transport fixtures;
  they are not a deployed Neon/Auth/R2 integration test for this feature.
- Pixel 7 emulation is not physical Android/iPhone testing. Safari/iOS, Firefox,
  Edge and real third-party cookie policy controls remain device/browser checks.
- The no-cookie/storage-blocked viewer checks prove independence from session and
  Web Storage, rather than claiming every browser's third-party policy was tested.
- Clipboard success uses a controlled navigator.clipboard boundary; fallback
  selection is exercised in the browser, without claiming an OS clipboard test.
- No embedded analytics is added. Production CDN headers and use within real
  portfolio/CMS hosts must be checked after a separately authorized deployment.
- Already loaded/downloaded content cannot be recalled. Signed photo links keep
  their existing maximum 60-second lifetime; no push revocation is promised.

Local screenshots are ignored runtime artifacts under .local/verification/:
embed-builder-desktop.png, embed-builder-mobile.png, embed-host-desktop.png and
embed-host-mobile.png.

## Clean embed refinement — 2026-11-13

Authorized by the user's screenshot feedback; first of two requested commits.
The focused clean-viewer case failed against the original visible Places trigger.
After implementation, all 14 desktop/mobile embed cases passed. Visual QA confirmed
larger framing, unclipped initial postcards and bottom-right attribution without
visible navigation. Normal motion rotates; reduced motion, public galleries,
keyboard-only place navigation and the visible no-WebGL list remain supported.
The modal's preview uses the real iframe without sample portfolio content.

Local fixtures are still used for Auth, PostgreSQL and media transport. No new
physical-device or cloud end-to-end evidence is implied by these local checks.

The first refinement also passed all four desktop/mobile normal-globe zoom and
camera-preservation regression cases. Its optimized production build, explicit
TypeScript check and Prettier checks passed. This verifies that the closer
camera and hidden controls are specific to embedded globes. Local logs are
.local/verification/embed-clean-green.log, embed-clean-regression.log and
embed-clean-build.log.

## Unified sharing refinement — 2026-11-13

Authorized by the same screenshot feedback; second requested commit. The unified
modal test first failed because a tablist was still present. The implementation
then passed 16 desktop/mobile embed cases. Added clipboard-target coverage passed
on both viewports together with both existing private/publish/hide journeys (four
focused cases). All 18 current embed scenarios therefore have passing evidence
across the main run and the added focused cases. No full unrelated suite rerun was
performed for this UI refinement.

The link appears above Shape/Theme in a wide modal. Both copy actions remain
available together, with distinct success state and correct manual selection on
clipboard failure. Private/public gating, shared preview, galleries, default
motion, fallback behavior and iframe release remain covered. Desktop/mobile
screenshots were inspected under .local/verification/share-unified-*.png.
Local logs: share-unified-green.log and share-unified-copy-regression.log.

These are local Chromium tests using existing database/auth/media fixtures.
Physical devices and deployed cloud flows have not been re-verified by this work.

Final second-refinement checks passed: 56 unit/integration cases in six files,
optimized production build, explicit TypeScript check and full Prettier check.
The clean-viewer first commit additionally has four normal-globe camera/zoom
regression passes; the unified modal has both original publish/hide journey
passes. Build/format logs are share-unified-build.log and
share-unified-format.log under the ignored local verification directory.
