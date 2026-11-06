# Verification and release gates

Updated: 2026-11-06. Implementation is authorized; production release is not.
Checks below distinguish actual cloud behavior from test fixtures and emulation.

## Observed evidence

Current local verification on 2026-11-06: 42 Vitest tests and all 20 Playwright
scenarios (desktop/mobile Chromium) passed. This includes read-only generated
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
