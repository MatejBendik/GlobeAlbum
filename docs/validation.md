# Verification and release gates

Updated: 2026-11-06. Implementation is authorized; production release is not.
Checks below distinguish actual cloud behavior from test fixtures and emulation.

## Observed evidence

Current local verification on 2026-11-06: 53 Vitest tests and 45 Playwright
scenarios (desktop/mobile Chromium) passed. One desktop-only pointer-hover
scenario is intentionally skipped under mobile emulation. This includes read-only generated
addresses, cold-load readiness, automatic city coordinates, manual map selection,
one optional visit date, local JPEG previews and selecting the same file after
removing a failed upload. Application and Worker type checks passed.

The additional desktop/mobile batch-upload scenarios exercise real application
handlers and PostgreSQL against a local R2 transport double and the real Node.js processor. A batch
with one network failure, one cancellation and one successful transfer finishes
with exactly two ready photos after retry. These tests exposed and now prevent
duplicate cancellation cleanup and its incorrect unfinished-upload warning.
The test double binds only to localhost, requires explicit test mode, and does
not replace the separate real R2 verification; Sharp and HEIC decoding run in the application.

| Boundary                  | Evidence                                                                                                                   | Limit                                                                                       |
| ------------------------- | -------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| PostgreSQL domain         | Real isolated local PostgreSQL integration suite                                                                           | Concurrency suite uses isolated local DB; separate real Neon smoke passes                   |
| Ownership and publication | Cross-account mutations denied; private/public DTOs; hide denies new reads                                                 | Open visitor tabs are intentionally not live-updated                                        |
| Capacity                  | Concurrent reservations enforce 50 pending/ready photo slots; global/monthly rollback                                      | Provider-wide billing is still outside these app counters                                   |
| Browser journey           | Desktop and Pixel Chromium emulation: onboarding, private globe, manual place, repeat visit, publish, anonymous view, hide | Uses managed SDK with guarded local Auth contract fake; real Google itself is not exercised |
| Form size validation      | Selecting a 20,000,001-byte file shows the Zod/RHF error without `/api/uploads` requests                                   | Browser checks supplement server enforcement                                                |
| WebGL fallback            | Disabled WebGL retains search, list and place gallery                                                                      | Physical GPU/browser testing outstanding                                                    |
| R2 PNG/HEIC               | Actual private upload, replay rejection, decode/re-encode, idempotent finish and signed display read                       | Small synthetic cloud fixtures; owner JPEG recovery separately verified                     |
| Byte constraints          | Actual wrong-size and short streamed requests rejected with no stored source                                               | Cloudflare edge may reject before the Worker's FixedLengthStream                            |
| Privacy                   | Processed WebP has no EXIF/XMP chunks; no-store headers; expired links denied; hide prevents new grants                    | Orientation/EXIF regression passes; physical iPhone GPS fixtures remain                     |
| HEIC                      | Actual R2 upload and local HEIC decode/re-encode pass; old Images errors superseded                                        | Physical mobile and hosted Linux runtime checks remain                                      |

Local reports/screenshots live in ignored `.local/verification/`. Browser traces
can contain session cookies and remain ignored under `test-results/`.
Run counts and commands should be checked against the latest terminal results;
do not treat an old report as proof after a code change.

Actual maintenance runs processed all 23 durable cleanup jobs after disposable
users were deleted. The final queue was empty and accounted storage returned to
zero. Unexpired reservations remained accounted until their capability/lease
safety windows elapsed; scheduling deletion alone never releases bytes.

## Globe framing and layered postcards (2026-11-07)

The public Tokyo regression reproduced an off-center, rear-facing marker with
the former fixed camera. In desktop and Pixel Chromium emulation, a public globe
with only Tokyo now centers its postcard on arrival and after a drag followed by
Reset globe view. The three-photo fixture shows two decorative sheets around one
cover thumbnail and opens the gallery with all three photos. Ten focused browser
scenarios passed, including postcard zoom/hover, direct landing photo clicks,
theme changes, and the no-WebGL place list.

Camera and HTML layer behavior checked on 2026-11-07.
[react-globe.gl camera and HTML layer API](https://github.com/vasturiano/react-globe.gl).

## Authentication appearance and visit calendar (2026-11-06)

The theme regression first reproduced a dark root attribute with a white
hard-coded authentication background. The page now uses the same semantic surface
and page variables as the rest of the app, including onboarding and unavailable
profile states that share the auth layout. Browser checks navigate from landing
to sign-in and sign-up, inspect the painted dark background and inputs, reload,
and return to light mode. No authentication/provider behavior changed.

The visit control now follows shadcn's Popover/Calendar composition using the
existing Radix system and React DayPicker 9.14.0. It loads the calendar code on
open, offers month/year navigation, Today and Clear date, and uses the app's
light/dark palette. RHF Controller keeps the existing optional Zod date contract.
Tests verify adding a dated visit, leaving dates blank, editing and clearing,
arrow-key selection, focus restoration, and Escape closing only the calendar.
The new edit case runs in UTC+14 and checks the exact persisted date independently
in PostgreSQL to catch UTC conversion shifts. Screenshots cover both themes and
viewport widths. Browser services use the existing guarded local contract fakes.

The final complete browser run passed **45 scenarios**, with one intentional
mobile hover skip (`auth-date-e2e.log`). Visual inspection then caught the mobile
calendar footer clipped by its scrolling container; the footer now stays outside
the scrollable day grid. Both auth/calendar cases passed again on desktop/mobile
(**4 passed**, `auth-date-final-focused.log`), including complete footer-button
visibility assertions. Production build, application type checking and Prettier also pass. The earlier 53 domain/codec tests were not rerun for this UI-only
change. No cloud resource, database schema or authentication provider changed.

References checked 2026-11-06:
https://ui.shadcn.com/docs/components/base/date-picker,
https://ui.shadcn.com/docs/components/radix/calendar,
https://daypicker.dev/v9/docs/navigation,
https://daypicker.dev/v9/docs/styling.

## R2-only photo upload repair (2026-11-06)

The owner's two JPEG uploads reached R2 with their expected byte counts but
failed during the Images binding transformation. Direct probes without Neon
reproduced provider error `9523` for those sources, a 13.9 MB synthetic JPEG and
tiny JPEG/PNG inputs. Changing the stream, resize options or output format did
not resolve it. The provider's internal cause is unknown; no Neon credential
change or database bypass was needed.

The user explicitly requested R2 storage without an Images plan. Next.js Node.js
now decodes with Sharp plus HEIC/libheif WASM, applies orientation, creates bounded
WebP variants and strips metadata. The existing Worker only gates private R2
upload, server source reads, variant writes and short-lived image reads. Its
Images binding and temporary diagnostic routes are removed. Deployed version:
`0c44f4ab-de97-4efb-86bb-e5dfe12b1caa`. No paid plan was activated.

Actual evidence after the change:

- Both existing owner uploads completed through the normal authorized domain
  operation and are `READY` in Neon. Both were then opened in the authenticated
  production-build gallery; the second display image decoded at 2560×1920.
  Screenshot: `.local/verification/r2-owner-gallery-ready.png`. No forced status
  update or original-file serving was used.
- Anonymous `/source` and `/variant` requests return 401; removed `/process`
  and `/diagnose` endpoints return 404 against the deployed Worker.
- Full cloud smoke passed PNG and HEIC uploads against actual R2, immutable
  replay rejection, idempotent completion, private WebP reads, EXIF/XMP absence,
  incorrect-size rejection, publication/hiding and expired grants. After the
  capability/lease window elapsed, normal maintenance drained the isolated test
  cleanup queue to zero; R2 HEAD checks confirmed all queued keys absent.
- Native codec probes passed an official 1280×854 HEIC sample and a 13,895,200-byte
  4032×3024 JPEG. Automated orientation/metadata, pixel-limit and corrupt-input
  regressions pass; smaller images are not enlarged.
- `npm run test`: **53 passed**. `npm run test:e2e`: **41 passed, 1 skipped**
  (mobile pointer-hover). Browser tests use a guarded R2 transport fake, real local
  PostgreSQL and the actual Node.js codec; managed Auth remains a contract fake.
- Production `npm run build` and Worker TypeScript checks pass. Actual Vercel/Linux
  packaging, resource usage and representative physical iPhone files remain release
  checks; this is not a production deployment or a completed beta certification.

Ignored reports: `r2-local-processing-tests.log`, `r2-processing-e2e.log`,
`r2-processing-build.log`, `r2-native-cloud-smoke.log`, and `r2-owner-retry.log`
under `.local/verification/`.

Primary processing references checked 2026-11-06:
https://sharp.pixelplumbing.com/install/,
https://sharp.pixelplumbing.com/api-operation/,
https://sharp.pixelplumbing.com/api-output/,
https://github.com/catdad-experiments/heic-decode,
https://github.com/catdad-experiments/libheif-js.

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

Real linking and returning sign-in subsequently passed in Dia against the existing
Neon branch. The redirect-linking flow reproduced `ERR_INVALID_URL`, then the
known managed proxy `state_mismatch` defect with absolute URLs. Google's official
identity button and the supported `linkSocial({ idToken })` method succeeded
without weakening state checks or writing auth records directly. Sign-out denied
`/studio`; Google sign-in returned to that studio and survived reload. Settings
showed Connected after the new session. Independent SQL confirmed the same
application identity, globe, slug, name and publication, with 1 place and 3 photos
unchanged, and providers `credential` plus `google`.

Focused desktop/mobile regression covers the SDK/proxy ID-token and nonce payload,
authorization denial, failure/retry and the refreshed Connected state using local
contract fakes. Fresh Google registration and old provider removal were verified
in the subsequent deletion fix below; public branding/domain setup remains a
release check. See [Google OAuth setup](google-oauth.md).

Final follow-up commands: `npx playwright test --grep 'profile on its own settings|before opening settings|account navigation|Google'`
reported `10 passed (29.4s)`; `npm run build` completed compilation, TypeScript
and route generation successfully; `npm run format:check` passed. The earlier
42 Vitest tests were not rerun for this client-only linking change.

## Deleted-account Google registration fix (2026-11-06)

The owner deleted their account, then Google repeatedly returned to sign-in.
Read-only SQL showed no application User, an unfinished deletion fence, and the
old Neon identity with credential/Google methods still present. The live Google
attempt reproduced that silent return. Local regression first failed because
sign-in showed no explanation of the deleted identity.

The supported branch management API now finishes confirmed deletions using a
server-only project-scoped key. Verify the branch's Auth URL before destructive
requests, and verify identity absence before setting `authDeletedAt`. Keep old
IDs fenced forever. Maintenance retries bounded work independently of photo
storage; an authenticated same-origin restart operation can finish only the
current session's already-confirmed deletion. It cannot select arbitrary IDs
or delete active accounts. Failure produces an explicit retry message.

Real Google-only registration passed after this cleanup: the old managed identity
is absent, its fence is marked complete, the new ID differs, its only method is
Google, and it has zero globes. Onboarding opened and survived reload. The owner
was left there to choose a display name; no old globe was restored. Screenshot:
ignored `.local/verification/google-fresh-signup-onboarding.png`.

Google may reuse an existing account/grant without another chooser. A diagnostic
of the managed init response confirmed that `additionalParams.prompt` is not
forwarded to Google; no ineffective force-chooser code remains. This required no
Google Console reconfiguration. See [Google setup](google-oauth.md).

The 47 Vitest tests passed, including failure/retry, wrong-branch refusal,
idempotent completion, new same-email identity creation, old-ID denial and
maintenance without photo storage. Browser cases separately cover pending-cleanup
feedback and cross-origin refusal. The complete browser suite passed 41 scenarios with one intentional mobile
hover skip. The production build and repository-wide Prettier check passed.

The production-build `npm run verify:neon -- --confirm` also passed against actual
Neon using its own disposable email identity. Relevant output:

```text
PASS confirmed account deletion removes the real managed identity automatically
PASS stale managed cookies cannot recreate a deleted application account
PASS same-email re-registration creates a new identity and starts onboarding without restoring content
PASS disposable identity physically removed through Neon CLI
```

The owner's separate real Google registration used the controlled Dia browser,
not this disposable email test. A real authenticated maintenance invocation also returned HTTP 200 and removed
eight queued object-cleanup jobs. No production migration, Vercel deployment or
paid upgrade was required. Hosted maintenance scheduling still needs verification
when deployment is authorized.

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

Managed `/delete-user` returns an empty 404. This initially required operator CLI
cleanup and left `DeletedIdentity.authDeletedAt` null until that manual step.
The deletion fix above supersedes that limitation with the supported management
API: actual automatic removal, stale-cookie denial and same-email registration
now pass. Production email verification/recovery/SMTP and hosted maintenance
scheduling remain outstanding.

## Historical Images HEIC failure record

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

**Historical decision, superseded by ADR 0007 above:** retain Cloudflare; working HEIC remains mandatory
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

- [x] Replace the failing Images dependency with the user-approved R2-only flow; full PNG/HEIC cloud smoke passes.
- [ ] Verify native/WASM packaging and bounded CPU/memory in the actual hosted Linux runtime.
- [x] Verify real Google linking, returning session, reload and sign-out.
- [x] Verify fresh Google registration after confirmed deletion and removal of the old Google-linked identity.
- [x] Verify real Neon pooled runtime reads/writes and direct migrations.
- [ ] Measure Neon connection/concurrency behavior under representative hosted load.
- [x] Automate managed identity cleanup through a supported API; retain durable retries and stale-session fences.
- [ ] Verify production SMTP, email verification and password recovery.
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
