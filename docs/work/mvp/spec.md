# GlobeAlbum MVP specification

Status: approved; implementation authorized by the user. Subsequent instructions authorize the required Cloudflare resources. Purchases, paid upgrades and Vercel deployment remain separate.
Approved and researched: 2026-11-05. Auth scope amended by explicit user instruction on 2026-11-06; see [ADR 0005](../../adr/0005-managed-neon-auth.md).
The user authorized Vercel deployment on 2026-11-07. See the
[deployment setup](../../setup.md#vercel-production-deployment).

## Problem Statement

Travelers need an engaging way to present selected travel memories geographically. GlobeAlbum combines visited places, selected photographs and a personal travel profile. It is a curated album, not original-photo backup.

## Solution

One personal globe per account, private until explicitly published. Open Google or email/password registration through managed Neon Auth leads to onboarding (immutable profile slug and editable display name), then the editor. The English interface defaults to a light theme and white dotted globe; users can switch the entire app to dark mode. Visitors explore photo postcards, dots, a complete place list and one combined gallery per place.

## User Stories

1. As a traveler, I want to register with Google or email/password without an invitation.
2. As a new user, I want to enter my display name, preview its automatically generated fixed profile URL, then receive a private globe.
3. As an owner, I want to search cities or locate a missing city on a map and choose its country.
4. As an owner, I want repeat visits under one place, with one optional date per visit.
5. As an owner, I want visits without photos to count toward my history.
6. As an owner, I want to upload JPEG, PNG, WebP and HEIC photographs from mobile.
7. As an owner, I want upload progress, cancellation and safe retries.
8. As an owner, I want optional per-photo captions and a place cover photograph.
9. As an owner, I want to edit visits, names, country assignments and captions.
10. As an owner, I want confirmed, irreversible deletion of photos, visits and my account.
11. As a visitor, I want one place gallery combining photographs from repeat visits.
12. As a visitor, I want arrows, keyboard navigation and mobile swipe gestures.
13. As a visitor, I want a complete place list even without WebGL.
14. As an owner, I want unique place and country counts, including visits without photos.
15. As an owner, I want to publish or hide my entire globe at /u/{username}.
16. As a visitor, I want to view a published profile without registering.
17. As an owner, I want email, visit dates and original EXIF excluded from public responses.
18. As an owner, I want clear quota errors with no automatic paid upgrades.
19. As an owner, I want new requests denied after hiding content, with at most 60 seconds of access through already-issued photo links.
20. As an operator, I want idempotent processing, durable cleanup and bounded shared usage.
21. As an operator, I want honest evidence distinguishing local tests from verified cloud integrations.

## Implementation Decisions

### Stack and boundaries

Next.js App Router and TypeScript on Vercel Node runtime; Tailwind CSS and selected shadcn-compatible primitives; Zod; React Hook Form for editor forms; Neon PostgreSQL and Prisma 7; managed Neon Better Auth via `@neon/auth` (Google plus email/password); private R2 through a storage-only Worker; local Node.js processing with Sharp and a HEIC WASM decoder; react-globe.gl; GeoNames search. No Zustand or TanStack Query initially. Keep one design-token system; AlignUI is visual inspiration, not a second component system.

Server Components perform initial reads through server-only access functions. Client Components own interaction, gestures and upload progress. Server Actions handle metadata mutations; Route Handlers handle auth, upload control and lazy galleries. Every operation independently checks identity, ownership or publication. Publication-sensitive reads have no persistent cache. Saved changes appear on the next request; no live synchronization.

Use pooled database runtime access (`DATABASE_URL`) and a separate direct migration connection (`DATABASE_URL_UNPOOLED`; `DIRECT_URL` is an explicit local/CI override). Neon owns `neon_auth`; application ownership records remain in `public`. Managed session cookies cache for up to 60 seconds; a database identity-deletion fence denies deleted accounts immediately. Provider identity cleanup uses the supported Neon branch management API with a server-only project-scoped key. A deletion fence permits immediate cleanup, bounded maintenance retries and authenticated recovery before re-registration; retain the fence permanently and never restore old content. Validate the managed branch URL before destructive requests and independently verify identity absence. Generation/build does not apply production migrations.

### Domain and privacy

Google OAuth uses the user's owned web client in Google Cloud project
`globealbum`, configured in the existing Neon branch. Only basic identity scopes
are requested. Existing email/password accounts connect Google explicitly from
authenticated Profile settings when the provider rejects implicit linking.
Use Google's official identity button to obtain an ID token with a fresh nonce,
then the managed SDK's `linkSocial({ idToken })` method. Neon verifies the token,
session and matching email; do not bypass OAuth state validation or insert
provider records directly. The redirect-based linking path has a reproduced
managed proxy `state_mismatch` defect. Ordinary sign-in retains the managed
redirect flow. In both cases,
retain the same user, globe and profile URL. Callback errors use fixed user-facing
messages. Local Google secrets remain ignored and server-only; the public client ID is passed to the authenticated identity button.

User -> Globe -> Place -> Visit -> Photo. One globe per user. Place is an owned city/town with coordinates, optional provider ID, source country and separate correction. Each visit has one optional date-only value. New date ranges are not accepted; legacy database columns remain preserved. Photo belongs to a visit and has an optional caption. Upload intents reserve capacity and track quarantine, processing, expiry and completion. Durable cleanup survives account deletion.

Counts use unique places with visits and distinct effective country codes, including separately listed territories. Display a compact line such as "50 places in 23 countries" with an explanation of territories. Public DTOs contain no email, visit dates, credentials or original metadata.

Onboarding derives an immutable slug from the display name and shows a read-only address preview. Accent normalization and collision suffixes keep it valid and unique; changes to the display name after onboarding do not change the URL.

Public access uses an immutable profile slug. Publish/hide applies to the entire globe. Hiding does not rotate its address. Exclude profiles from indexing. There is no invitation gate or admin invitation UI.

On 2026-11-10 the user requested link previews for the site and shared globes.
The site card uses the landing example. A published profile card uses its saved
style, places and up to three processed photo thumbnails. GlobeAlbum serves the
current image revision while the profile is public. Services that have already
fetched a preview can retain their own copy.

### Place entry and photo selection

The user confirmed these refinements on 2026-11-06: no coordinate inputs, one
optional visit date, and photo/photos throughout the interface. GeoNames results
supply coordinates automatically. Missing places use a lazily loaded Leaflet map
with an explicitly selected point and country; keyboard users can pan/zoom and
choose the map center. No city is assigned invented default coordinates.
Photo selection and queue entries show local previews where the browser supports
the format. Failed rows can be removed and the same file selected again without
closing the dialog. Revoke local preview URLs when no longer displayed.

User-confirmed refinement (2026-11-06): city search offers an accessible
autocomplete with arrow-key selection and Enter. Saving a place advances the
same dialog to optional photo selection for the newly created visit; skipping
keeps the saved place. Additional file-picker selections append to the pending
selection, and later upload batches append photos to the visit. Use singular
or plural upload copy according to the batch size. Shared primary buttons keep
the same fill on hover, including authentication and settings forms.

User-confirmed refinement (2026-11-06): use a theme-aware calendar popover
instead of the browser-native date popup, following shadcn's Calendar/Popover
composition and the existing Radix component system. Support month/year selection,
keyboard navigation, Today and Clear date in place, new-visit and edit-visit forms.
The value remains an optional private calendar date, with no time or date range.
Authentication pages must paint the selected theme throughout, including their
background, and retain it when navigating from the landing page or reloading.

### Globe and galleries

One logical marker per place. A visible pin marks its saved coordinates even
when a cover postcard appears above it. Postcards shrink as the viewer zooms out,
grow within a bounded range as they zoom in, and enlarge on hover or keyboard
focus. Projected collision spacing follows the current card size; dense places
keep their pins and remain in the place list. Load compact marker DTOs first
and gallery metadata on demand. Never preload originals. Retain the complete
accessible place list, reduced-motion behavior, keyboard controls and WebGL
fallback. Target iOS/Safari 17+ and current Chrome, Edge and Firefox. Test
physical devices before claiming mobile validation.

Following the user request on 2026-11-07, a place with multiple ready photos
shows layered paper behind its cover postcard. The marker opens its complete
place gallery. The starting and reset views center the selected place, the first
place with a cover, or the first saved place, in that order. Automatic rotation
starts from that view even for a single place. Reset pauses rotation, and the
initial rotation respects the viewer's reduced-motion preference.

Opening or closing a gallery from a globe marker preserves the camera angle
and zoom. Automatic rotation pauses while the gallery is open and resumes
after closing if it was running before.

The owner can select Dotted, Minimal or Classic in the left-hand Globe style panel.
Selecting an option closes the panel, returns focus to its trigger, and
immediately previews the style while saving it to the globe. A published link
uses the saved style with the visitor's own light or dark palette. Existing
globes default to Dotted. Minimal shows grayscale outlines and country names.
Classic shows green land, blue water and country names, with a tooltip on hover.
The saved style identifiers remain compatible with existing globes.

### Globe workspace and navigation refinement

User-confirmed on 2026-11-06: the globe occupies the full workspace instead of
sharing columns with a permanent left sidebar. The complete place list opens as
a floating right panel, closes with its button or Escape, and opens automatically
when WebGL is unavailable. Owner add/share actions remain directly available.

Landing postcards open their place gallery directly. Signed-in navigation shows
an account dropdown with My globe, Profile settings, public profile when published,
and Sign out. Anonymous navigation retains the example/registration actions.
Viewer identity is resolved server-side and includes no email or credentials.

The landing preview offers Dotted, Minimal and Classic beneath its place
caption. Switching styles updates the preview immediately for any visitor.
On mobile, three equal-width buttons fill the preview controls in a single row.
The selection is temporary and local to the preview. Landing captions,
supporting copy and footer links use larger type.

User-requested beta feedback refinements (2026-11-11): the landing headline
leads with the outcome: `One personal globe for your travels, ready to share.`
The desktop preview is large again; the compact mobile preview remains directly
after the introduction. Keep the hero and supporting content centered within
80rem (1280px at the default root font size). Later feedback supersedes the
three-column step strip: restore the original separate story section with its
steps in a vertical list. Keep the landing footer compact and at the bottom of
short pages, without empty space below it.

The primary creation action says `Create your globe`, with a sign-in hint for
signed-out visitors. The named existing example (`The long way home`) is the
concrete preview and secondary exploration action, explicitly available without
sign-up. Do not invent free-plan allowances or customer endorsements. Leave
implementation TODOs for approved offer details and permissioned customer proof;
until then, omit the unqualified `free` promise from the creation action.

User-confirmed refinement (2026-11-06): Profile settings open on the standalone,
authenticated `/settings` page instead of a workspace dialog. Owners can edit
their display name, read their immutable globe URL and private sign-in email,
sign out, or confirm permanent account deletion. The page shares the app's
light/dark appearance and responsive navigation. The sign-in email is displayed
only to its owner; it is not included in navigation or public profile projections.

Light is the default for the page, controls, dialogs and actual Three.js globe
material. Dark mode uses the same semantic palette and navigation. The explicit
choice persists in this browser across reloads; it does not change publication,
photo visibility or other users' appearance. Theme switching supersedes its
original deferred status. Photographs retain their original colors.

User-confirmed on 2026-11-07: use one header with the same dimensions and
spacing across the site. Keep the theme control immediately to the left
of the account menu. Use the Google profile avatar from the signed-in
session when available, with a generic fallback. Show the privacy policy,
terms, reporting link and tagged author portfolio link in the shared footer.
The portfolio link opens in a new tab and retains its referral tags.
The Google account avatar URL remains private to its owner. See
[legal release notes](../../legal-readiness.md) for the confirmed operator
and remaining review.

The 2026-11-07 profile photo refinement shows the Google photo as the owner's
fallback in settings and studio. The owner can upload or remove a separate
profile photo in settings. An uploaded avatar takes precedence in the account
menu and appears next to the owner name on a published globe. Private globes
restrict avatar access to the owner.

On 2026-11-08, the user requested the same photo on the public profile as in
Studio. Settings offers an explicit choice to save a copy of the Google
account photo as the globe avatar. The processed copy follows the same
publication, removal and cleanup rules as a file upload.

The implementation accepts one static JPEG, PNG, WebP or HEIC file up to 4 MB
and stores a square WebP of up to 320 pixels under the private R2
`avatars/` prefix. It charges the shared storage and processing budgets.
Replacing or removing an avatar and deleting an account queue durable cleanup.
The application checks current publication before issuing a short-lived R2
read capability.

### Photos

User-confirmed refinement (2026-11-06): use Cloudflare only for R2 storage;
no Cloudflare Images plan or transformation dependency. Next.js Node.js creates
the variants using Sharp; HEIC is decoded locally through libheif WASM. The Worker
has only the private R2 binding. Server-authenticated source reads and variant
writes are unavailable to anonymous visitors. Storage remains private and no
original is served as an error fallback. See ADR 0007.

Maximum input: 20,000,000 bytes. Accept static JPEG, PNG, WebP, HEIC; reject SVG, RAW, videos and animation. Authenticate -> verify Visit ownership -> atomically reserve account/shared capacity -> signed upload to private quarantine -> verify actual bytes/type/decoding -> create oriented metadata-free WebP thumbnail (up to 320px) and display variant (up to 2560px), without upscaling -> persist actual sizes and mark ready -> remove source. Original retention and EXIF location extraction are out of scope.

Originals and outputs remain private. Issue image GET links for at most 60 seconds only after access checks. Use no-store responses and object headers to avoid extending the agreed access window through browser/CDN freshness. Processing failures never serve the source. Use idempotency and processing leases. Late completions cannot revive deleted content. Cleanup must retry abandoned uploads and failed object deletion. Verify signed upload byte constraints against the actual provider before beta.

### Quotas

Per account: 1 globe, 100 places, 300 visits, 50 photos. Count pending reservations to prevent racing uploads. Shared caps: 8 GB accounted storage including pending reservations; 4,000 transformation attempts/reservations per UTC calendar month. Reserve two transformations per accepted photo. Preserve consumed processing usage after failure; recover only storage actually removed. Stop new uploads at capacity; no automatic paid upgrades.

### Assumptions and cost gates

At 30 fully used accounts: 1,500 photos, 0.75 GB retained at assumed 0.5 MB combined variants/photo, 3,000 initial transformations. At 1,000 accounts: 50,000 photos, 25 GB, 100,000 initial transformations; this exceeds the free beta. The historical Images estimate ($47.50 initial processing) no longer applies after the R2-only amendment. Retained R2 storage remains approximately $0.23/month above its allowance; processing now consumes Next.js hosting compute and must be measured. Other services, taxes and retries are excluded. These are calculations, not measurements or guaranteed bills.

R2's included usage is not a hard spending stop. Monitor requests, temporary storage, transformations and Neon compute. Domain ~$12/year is the user's unverified estimate. Vercel Hobby is restricted to non-commercial personal use; resolve eligibility before deployment. If ineligible, hold deployment for a separate decision.

## Testing Decisions

The primary seam is the complete user journey: sign-in -> onboarding -> private globe -> places/visits -> upload -> gallery -> publish -> anonymous view -> hide -> deletion. Add focused integration tests for authorization, database concurrency, quotas, byte validation, processing and cleanup failures. Tests assert observable behavior rather than internal call structure. There is no pre-existing test suite.

Cover optional dates, repeat visits, no-photo places, effective country counts, manual entry, malformed/oversized/animated images, real HEIC, EXIF removal, cross-owner IDs, stale public links, cancelled/retried uploads and late callbacks. Verify keyboard, touch, reduced motion, dense markers and no-WebGL fallback. Verify real HEIC decoding and its complete R2 upload/delivery flow; physical-device and hosted-runtime evidence remain separate release checks.

Beta success: at least 5 of the first 10 testers independently add 3 places and 5 photos and share with another person. Collect direct feedback.

On 2026-11-10 the user enabled Vercel Web Analytics and requested the application
integration. It measures visits and page views. The client removes query strings,
fragments and profile usernames from the page URLs in analytics events.

## Out of Scope

Payments, paid plans, multiple globes, trips as entities, embedding, original backup, EXIF GPS suggestions, photo editing, manual photo ordering, per-photo visibility, live updates, trash, changing profile URL, invitation management, translations.

## Further Notes

Approved tickets are individual Markdown files in the sibling issues directory. Status means implementation readiness, not verified cloud readiness. Cloudflare provisioning was subsequently authorized and the user activated R2 personally. Deployment to Vercel remains separate. After repeated Images failures (HEIC 9516, then JPEG/PNG 9523), the user explicitly chose R2 storage without an Images plan. Local processing supersedes the former Images dependency; physical mobile-device and hosted-runtime verification remain mandatory before beta. See [validation](../../validation.md) and [the bounded Worker capability refinement](../../adr/0004-bound-worker-capabilities.md).

Primary sources verified 2026-11-05:

- https://nextjs.org/docs/app/getting-started/server-and-client-components
- https://better-auth.com/docs/adapters/prisma
- https://better-auth.com/docs/integrations/next
- https://neon.com/docs/guides/prisma
- https://neon.com/pricing
- https://developers.cloudflare.com/r2/api/s3/presigned-urls/
- https://developers.cloudflare.com/r2/pricing/
- https://developers.cloudflare.com/images/optimization/binding/
- https://developers.cloudflare.com/images/get-started/limits/
- https://developers.cloudflare.com/images/pricing/
- https://github.com/vasturiano/react-globe.gl
- https://www.geonames.org/export/
- https://vercel.com/docs/limits/fair-use-guidelines#commercial-usage
