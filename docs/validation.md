# Verification and release gates

Updated: 2026-11-06. Implementation is authorized; production release is not.
Checks below distinguish actual cloud behavior from test fixtures and emulation.

## Observed evidence

Current local verification on 2026-11-06: 42 Vitest tests and 39 Playwright
scenarios (desktop/mobile Chromium) passed. One desktop-only pointer-hover
scenario is intentionally skipped under mobile emulation. This includes read-only generated
addresses, cold-load readiness, automatic city coordinates, manual map selection,
one optional visit date, local JPEG previews and selecting the same file after
removing a failed upload. Application and Worker type checks passed.

The additional desktop/mobile batch-upload scenarios exercise real application
handlers and PostgreSQL against a local storage/processing test double. A batch
with one network failure, one cancellation and one successful transfer finishes
with exactly two ready photos after retry. These tests exposed and now prevent
duplicate cancellation cleanup and its incorrect unfinished-upload warning.
The test double binds only to localhost, requires explicit test mode, and does
not decode images or replace the separate real Cloudflare verification.

| Boundary                  | Evidence                                                                                                                   | Limit                                                                                       |
| ------------------------- | -------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| PostgreSQL domain         | Real isolated local PostgreSQL integration suite                                                                           | Concurrency suite uses isolated local DB; separate real Neon smoke passes                   |
| Ownership and publication | Cross-account mutations denied; private/public DTOs; hide denies new reads                                                 | Open visitor tabs are intentionally not live-updated                                        |
| Capacity                  | Concurrent reservations enforce 50 pending/ready photo slots; global/monthly rollback                                      | Provider-wide billing is still outside these app counters                                   |
| Browser journey           | Desktop and Pixel Chromium emulation: onboarding, private globe, manual place, repeat visit, publish, anonymous view, hide | Uses managed SDK with guarded local Auth contract fake; real Google itself is not exercised |
| Form size validation      | Selecting a 20,000,001-byte file shows the Zod/RHF error without `/api/uploads` requests                                   | Browser checks supplement server enforcement                                                |
| WebGL fallback            | Disabled WebGL retains search, list and place gallery                                                                      | Physical GPU/browser testing outstanding                                                    |
| R2/Images PNG             | Actual private upload, replay rejection, decode/re-encode, idempotent finish and signed display read                       | Small synthetic fixture, not a large mobile photograph                                      |
| Byte constraints          | Actual wrong-size and short streamed requests rejected with no stored source                                               | Cloudflare edge may reject before the Worker's FixedLengthStream                            |
| Privacy                   | Processed WebP has no EXIF/XMP chunks; no-store headers; expired links denied; hide prevents new grants                    | Explicit orientation/GPS fixtures still required                                            |
| HEIC                      | Two real files tested against `/info` and `/transform`; both return internal error `9516`                                  | **Release blocker**; support/cause unresolved                                               |

Local reports/screenshots live in ignored `.local/verification/`. Browser traces
can contain session cookies and remain ignored under `test-results/`.
Run counts and commands should be checked against the latest terminal results;
do not treat an old report as proof after a code change.

Actual maintenance runs processed all 23 durable cleanup jobs after disposable
users were deleted. The final queue was empty and accounted storage returned to
zero. Unexpired reservations remained accounted until their capability/lease
safety windows elapsed; scheduling deletion alone never releases bytes.

## Google OAuth configuration and account linking (2026-11-06)

The owned Google web client is registered and the existing Neon Google provider
reports `standard`, replacing shared development credentials. The real browser
request used that client ID, reached Google consent for basic identity data,
and returned `account_not_linked` because the email already has an email/password
identity. This is an observed managed identity conflict, not a completed login.

Profile settings now expose explicit authenticated Google linking using the
installed Neon SDK. Error routes explain existing-account conflicts without
reflecting arbitrary provider query values. The full browser suite passed
39 scenarios, with the intentional mobile hover skip; new cases cover callback
targets, link authentication, failure/retry messaging and unchanged globe data.
All 42 Vitest tests and the production build also passed.

After the usage interruption, neither local origin has an active session in the
controlled Dia profile. Real linking and subsequent Google sign-in are pending
the user's email/password sign-in in the prepared tab. Preserve this distinction
until that real flow succeeds. See [Google OAuth setup](google-oauth.md).

## Landing appearance follow-up (2026-11-06)

The hero now paints one continuous theme-aware background beneath its navbar,
copy and globe; the globe layer is transparent. The primary landing CTA keeps
identical fill/shadow on hover, including its signed-in “Open your globe” label.
Production build passed. Focused browser checks and screenshots covered light
and dark at desktop/mobile widths, comparing hover styles over 12 frames per
variant. This CSS-only follow-up did not rerun the domain/full browser suites.

## Place/photo UX and shared hover follow-up (2026-11-06)

The full browser run finished with `35 passed (4.4m)`, one intentional mobile
pointer-hover skip and no failures. The regression loop first reproduced both
the lost first file selection and changing primary-button fill during hover.
Fixes append the RHF file array and retain the same gradient in resting/hover
states. Eighteen-frame samples verify unchanged fills in light/dark on owner,
profile, single/batch upload, Google sign-in and email sign-in/signup controls.

Separate file selections upload two photos, followed by a later one-photo batch;
the test verifies three ready PostgreSQL Photo records. The city-entry journey
uses keyboard autocomplete, saves the place, immediately uploads to its new visit
inside the same dialog and verifies the persisted association. Skipping the photo
step preserves a no-photo visit in the main account journey.

Globe tests check readable 130px postcard hit targets at both zoom extremes and
visual enlargement on hover. A stable button wraps the enlarged frame; this
prevents a moving hit area from losing image clicks. Photo layering prevents dot
targets from blocking postcard interaction at maximum zoom-out. Landing-image
clicks, dense-marker selection and the complete place-list fallback still pass.
Light/dark upload-dialog and desktop/mobile globe screenshots were inspected.

An additional opt-in desktop run with
`GLOBEALBUM_LIVE_GEONAMES_USERNAME` called the actual GeoNames service through
the app, selected Krompachy by keyboard and persisted its provider ID, country
and coordinates in isolated local PostgreSQL. That live-service case passed;
Auth and photo conversion remained guarded localhost doubles. The normal suite
uses deterministic search fixtures. No new real Cloudflare processing, real
Google consent or physical-device result is claimed by this UX change.
The 42 Vitest tests also passed after the marker-spacing update. The production
build, including TypeScript, completed successfully without database migrations.

## Standalone profile settings (2026-11-06)

All 30 desktop/mobile Playwright scenarios passed (`30 passed (2.3m)`) after
replacing the modal with `/settings`. The new journey edits a display name,
checks the actual PostgreSQL row, reloads it, verifies the unchanged read-only
profile URL and private email, and navigates back to the globe. It also covers
the legacy URL redirect, authentication/onboarding guards, and persisted dark
mode. Existing sign-out and account-deletion journeys pass through the new page.
Full-page light/dark screenshots were inspected at desktop and Pixel sizes,
with no horizontal overflow. Auth and storage use the existing guarded local
contract fakes; this UI change does not claim a new real-provider verification.
The database schema and provider integration are unchanged; the previously
recorded 42 Vitest results were not rerun for this page move.
`npm run build` also passed, including TypeScript and the dynamic `/settings`
route. Changed files passed the repository's Prettier check.

## Globe workspace, appearance and navigation (2026-11-06)

The full desktop/mobile suite passed all 26 scenarios after adding direct
landing-photo galleries, the floating places panel, persisted light/dark mode,
and session-aware navigation. Six focused globe/layout scenarios passed again
after adjusting the perspective camera for portrait viewports. The 42 existing
Vitest tests also passed. Light/dark screenshots were visually inspected on
both desktop and Pixel emulation; physical-device/GPU checks remain separate.

Coverage includes image-area postcard clicks (without the place-note link),
opening/closing the complete right-hand list with Escape/focus restoration,
WebGL fallback, a light default/white globe, switching the actual renderer to
dark, preference restoration after reload, and account-menu settings/sign-out.
Reduced motion makes animated postcard interaction deterministic during tests.

Anonymous requests to `/land-dots.json` now return public decorative JSON instead
of an Auth redirect. The theme test verifies its content type and land data;
server-side resource authorization is unchanged. No cloud resources, database
schema or publishing permissions changed in this UI refinement.

## Form and origin regression evidence (2026-11-06)

The user opened `http://localhost:3000/studio` while app/Worker configuration used
`http://127.0.0.1:3000`. A failing HTTP boundary test reproduced the exact origin
error. Actual Worker preflight also returned 403 for localhost and 204 for the
configured IP. Both now share a same-port HTTP loopback allowlist; hosted origins
stay exact, and unrelated/forwarded origins are rejected.

A failing browser regression also showed the failed upload's origin error
remaining visible after X. The error row now disappears after cleanup, and the
same `.jpeg` file can be selected and uploaded again in the open dialog. Previews
are local Blob URLs (released on unmount/removal), loaded lazily; unsupported
browser preview formats display an explicit fallback instead of a broken image.

Real Worker deployment: `0615b2bb-df2b-4bbe-b988-ea785c5f9780`, existing
`globealbum-images` target and bindings. No service or paid-plan changes.
After deployment, an actual synthetic JPEG was uploaded with localhost Origin,
decoded by Cloudflare Images, and returned both private WebP variants. All three
test objects were physically deleted after the short upload capability expired.
This establishes JPEG ingestion, not large mobile-file or HEIC compatibility.

Safe real-service output:

```text
PASS real Worker CORS: localhost and loopback allowed, unrelated origin denied
PASS actual JPEG upload from localhost origin
PASS Cloudflare JPEG decoding and both private WebP previews
PASS physical cleanup of all JPEG test objects after upload expiry
```

The manual location picker uses Leaflet and visible OpenStreetMap attribution.
Automated browser tests stub every OSM tile request; their screenshots establish
layout/interaction, not live tile content. City search is tested with provider
results at the app boundary; the user's live GeoNames account remains a release
gate. See [tile policy](https://operations.osmfoundation.org/policies/tiles/) and
[Wrangler commands](https://developers.cloudflare.com/workers/wrangler/commands/workers/),
checked 2026-11-06.

## Real Neon evidence (2026-11-06)

Build and service setup output is recorded in [the Neon change log](neon-setup.md).
The production-build app started with `npm start` against the real branch.
`npm run verify:neon -- --confirm` exercises browser signup, current-user read,
reload, private onboarding, persisted city checked independently with SQL,
sign-out, invalid-password feedback, returning sign-in and publication/hiding.
These use actual managed Auth and pooled Neon Postgres, not the local doubles.
The direct Prisma migrations also succeeded. Test identities are physically
removed through Neon CLI; retained opaque fences prevent stale-session reuse.

Managed `/delete-user` returns an empty 404. App access/data revocation is
immediate; `DeletedIdentity.authDeletedAt` remains null until operator CLI
cleanup succeeds. The operator command was verified against disposable managed
identities. Automated provider cleanup is an outstanding beta gate, alongside
Google consent and production email verification/recovery/SMTP.

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
- [x] Verify real Neon pooled runtime reads/writes and direct migrations.
- [ ] Measure Neon connection/concurrency behavior under representative hosted load.
- [ ] Resolve/accept the managed identity cleanup operating requirement and verify production SMTP, email verification and password recovery.
- [x] Enable/test the user's GeoNames account and attribution with live search.
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
