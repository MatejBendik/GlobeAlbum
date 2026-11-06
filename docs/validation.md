# Verification and release gates

Updated: 2026-11-06. Implementation is authorized; production release is not.
Checks below distinguish actual cloud behavior from test fixtures and emulation.

## Observed evidence

Local verification on 2026-11-06: 28 Vitest tests and all 12 Playwright scenarios
(desktop/mobile Chromium) passed. Application and Worker type checks passed.
The gallery gesture test now supplies complete touch events and asserts that
the browser reports no uncaught errors.

The additional desktop/mobile batch-upload scenarios exercise real application
handlers and PostgreSQL against a local storage/processing test double. A batch
with one network failure, one cancellation and one successful transfer finishes
with exactly two ready photos after retry. These tests exposed and now prevent
duplicate cancellation cleanup and its incorrect unfinished-upload warning.
The test double binds only to localhost, requires explicit test mode, and does
not decode images or replace the separate real Cloudflare verification.

| Boundary                  | Evidence                                                                                                                   | Limit                                                                                                   |
| ------------------------- | -------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| PostgreSQL domain         | Real isolated local PostgreSQL integration suite                                                                           | Not a Neon production connection                                                                        |
| Ownership and publication | Cross-account mutations denied; private/public DTOs; hide denies new reads                                                 | Open visitor tabs are intentionally not live-updated                                                    |
| Capacity                  | Concurrent reservations enforce 50 pending/ready photo slots; global/monthly rollback                                      | Provider-wide billing is still outside these app counters                                               |
| Browser journey           | Desktop and Pixel Chromium emulation: onboarding, private globe, manual place, repeat visit, publish, anonymous view, hide | Sessions are seeded using Better Auth's normal database/cookie contract; Google itself is not exercised |
| Form size validation      | Selecting a 20,000,001-byte file shows the Zod/RHF error without `/api/uploads` requests                                   | Browser checks supplement server enforcement                                                            |
| WebGL fallback            | Disabled WebGL retains search, list and place gallery                                                                      | Physical GPU/browser testing outstanding                                                                |
| R2/Images PNG             | Actual private upload, replay rejection, decode/re-encode, idempotent finish and signed display read                       | Small synthetic fixture, not a large mobile photograph                                                  |
| Byte constraints          | Actual wrong-size and short streamed requests rejected with no stored source                                               | Cloudflare edge may reject before the Worker's FixedLengthStream                                        |
| Privacy                   | Processed WebP has no EXIF/XMP chunks; no-store headers; expired links denied; hide prevents new grants                    | Explicit orientation/GPS fixtures still required                                                        |
| HEIC                      | Two real files tested against `/info` and `/transform`; both return internal error `9516`                                  | **Release blocker**; support/cause unresolved                                                           |

Local reports/screenshots live in ignored `.local/verification/`. Browser traces
can contain session cookies and remain ignored under `test-results/`.
Run counts and commands should be checked against the latest terminal results;
do not treat an old report as proof after a code change.

Actual maintenance runs processed all 23 durable cleanup jobs after disposable
users were deleted. The final queue was empty and accounted storage returned to
zero. Unexpired reservations remained accounted until their capability/lease
safety windows elapsed; scheduling deletion alone never releases bytes.

## HEIC failure record

Cloudflare documents HEIC input support, and identifies `9516` as an internal
error, distinct from unsupported-format `9520`. On 2026-11-05:

- Generated 2×2 still HEIC (`tests/fixtures/static.heic`) failed in `IMAGES.info`.
- Official libheif `examples/example.heic` (718,114 bytes, SHA256
  `7f8b363e4936c0666a25f64f3a92fda10bd8e5453be4592530b65a55dd98f3f2`)
  failed the same way.
- A temporary, bearer-protected diagnostic performed direct `.input().output()`
  with a fresh stream, without `.info()`; both HEIC files again returned `9516`.
- PNG processing succeeded against the same Worker and bindings.
- The temporary diagnostic route was removed. Originals were never served.

The input-container parser originally also rejected a valid compatible `hevc`
brand. A failing regression test established that separate local defect; it is
fixed by scanning BMFF boxes and rejecting timed tracks structurally. That fix
does **not** resolve the provider failure.

**User-confirmed decision:** retain Cloudflare; working HEIC remains mandatory
before beta. No alternative processor, paid plan, client conversion, or original
fallback has been introduced. Reproduce with the full cloud-smoke command before
declaring this resolved. Do not silently skip dimension checks to bypass it.

Rechecked on 2026-11-06 with the full cloud-smoke command: PNG again completed;
the HEIC step still failed with application status 503. The exact provider code
above was captured during the earlier diagnostic; this recheck does not claim a
new provider-code observation. Disposable metadata was deleted and object cleanup
was queued using the normal capability-expiry safety window.

Sources verified 2026-11-05:

- https://developers.cloudflare.com/changelog/post/heic-support/
- https://developers.cloudflare.com/images/get-started/limits/
- https://developers.cloudflare.com/images/reference/troubleshooting/
- https://nokiatech.github.io/heif/technical.html
- https://github.com/strukturag/libheif/blob/12a259a5882dd99d45ec5fc77e296a3b620d1e2e/libheif/file.cc#L479

## Before beta

- [ ] Resolve the HEIC provider failure; rerun full cloud smoke successfully.
- [ ] Verify real Google registration, returning session, sign-out and account deletion.
- [ ] Verify Neon pooled runtime connection, direct migrations and concurrency.
- [ ] Enable/test the user's GeoNames account and attribution with live search.
- [ ] Exercise iPhone HEIC/JPEG, orientation, GPS/EXIF removal, a near-20 MB file,
      invalid/corrupt files, WebP/APNG animation rejection, interrupted transfers,
      cancellation and retry on representative physical devices.
- [ ] Check Safari/iOS 17+, current Chrome/Edge/Firefox, keyboard, swipe, reduced
      motion, GPU context loss, dense 100-place collections and slow connections.
- [ ] Measure the dynamically loaded globe bundle, mobile memory, frame rate
      and initial loading. No unmeasured performance claim is approved.
- [ ] Run cleanup against real stored objects, confirm accounting reconciliation
      and monitor oldest pending jobs; verify cron in the deployed environment.
- [ ] Resolve Vercel Hobby eligibility and obtain a separate deployment instruction.
- [ ] Configure production origin/callbacks/secrets and review usage monitoring.
- [ ] Record the agreed usability outcome: 5 of 10 testers independently add
      three places and five photos, then share with another person.
