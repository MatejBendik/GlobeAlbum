# GlobeAlbum MVP specification

Status: approved; implementation authorized by the user. Subsequent instructions authorize the required Cloudflare resources. Purchases, paid upgrades and Vercel deployment remain separate.
Approved and researched: 2026-11-05.

## Problem Statement

Travelers need an engaging way to present selected travel memories geographically. GlobeAlbum combines visited places, selected photographs and a personal travel profile. It is a curated album, not original-photo backup.

## Solution

One personal globe per account, private until explicitly published. Open Google registration leads to onboarding (immutable profile slug and editable display name), then the editor. A light English interface surrounds a dark dotted globe. Visitors explore photo postcards, dots, a complete place list and one combined gallery per place.

## User Stories

1. As a traveler, I want to register with Google without an invitation.
2. As a new user, I want to choose my fixed profile URL and editable display name, then receive a private globe.
3. As an owner, I want to search cities or manually enter a missing city with a country and coordinates.
4. As an owner, I want repeat visits under one place, with optional dates or date ranges.
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

Next.js App Router and TypeScript on Vercel Node runtime; Tailwind CSS and selected shadcn-compatible primitives; Zod; React Hook Form for editor forms; Neon PostgreSQL and Prisma 7; Better Auth Google-only; private R2; Cloudflare Images through a small Worker; react-globe.gl; GeoNames search. No Zustand or TanStack Query initially. Keep one design-token system; AlignUI is visual inspiration, not a second component system.

Server Components perform initial reads through server-only access functions. Client Components own interaction, gestures and upload progress. Server Actions handle metadata mutations; Route Handlers handle auth, upload control and lazy galleries. Every operation independently checks identity, ownership or publication. Publication-sensitive reads have no persistent cache. Saved changes appear on the next request; no live synchronization.

Use pooled database runtime access and a separate direct migration connection. Generation/build does not apply production migrations.

### Domain and privacy

User -> Globe -> Place -> Visit -> Photo. One globe per user. Place is an owned city/town with coordinates, optional provider ID, source country and separate correction. Visit dates are optional date-only values. Photo belongs to a visit and has an optional caption. Upload intents reserve capacity and track quarantine, processing, expiry and completion. Durable cleanup survives account deletion.

Counts use unique places with visits and distinct effective country codes, including separately listed territories. Display a compact line such as "50 places in 23 countries" with an explanation of territories. Public DTOs contain no email, visit dates, credentials or original metadata.

Public access uses an immutable profile slug. Publish/hide applies to the entire globe. Hiding does not rotate its address. Exclude profiles from indexing. There is no invitation gate or admin invitation UI.

### Globe and galleries

One logical marker per place. Bounded cover postcards plus dots limit visual overlap. Load compact marker DTOs first and gallery metadata on demand. Never preload originals. Retain the complete accessible place list, reduced-motion behavior, keyboard controls and WebGL fallback. Target iOS/Safari 17+ and current Chrome, Edge and Firefox. Test physical devices before claiming mobile validation.

### Photos

Maximum input: 20,000,000 bytes. Accept static JPEG, PNG, WebP, HEIC; reject SVG, RAW, videos and animation. Authenticate -> verify Visit ownership -> atomically reserve account/shared capacity -> signed upload to private quarantine -> verify actual bytes/type/decoding -> create oriented metadata-free WebP thumbnail (up to 320px) and display variant (up to 2560px), without upscaling -> persist actual sizes and mark ready -> remove source. Original retention and EXIF location extraction are out of scope.

Originals and outputs remain private. Issue image GET links for at most 60 seconds only after access checks. Use no-store responses and object headers to avoid extending the agreed access window through browser/CDN freshness. Processing failures never serve the source. Use idempotency and processing leases. Late completions cannot revive deleted content. Cleanup must retry abandoned uploads and failed object deletion. Verify signed upload byte constraints against the actual provider before beta.

### Quotas

Per account: 1 globe, 100 places, 300 visits, 50 photos. Count pending reservations to prevent racing uploads. Shared caps: 8 GB accounted storage including pending reservations; 4,000 transformation attempts/reservations per UTC calendar month. Reserve two transformations per accepted photo. Preserve consumed processing usage after failure; recover only storage actually removed. Stop new uploads at capacity; no automatic paid upgrades.

### Assumptions and cost gates

At 30 fully used accounts: 1,500 photos, 0.75 GB retained at assumed 0.5 MB combined variants/photo, 3,000 initial transformations. At 1,000 accounts: 50,000 photos, 25 GB, 100,000 initial transformations; this exceeds the free beta. Current R2/Images rates suggest approximately $0.23/month storage and $47.50 initial processing for that growth scenario, excluding other services/taxes/retries. These are calculations, not measurements or guaranteed bills.

R2's included usage is not a hard spending stop. Monitor requests, temporary storage, transformations and Neon compute. Domain ~$12/year is the user's unverified estimate. Vercel Hobby is restricted to non-commercial personal use; resolve eligibility before deployment. If ineligible, hold deployment for a separate decision.

## Testing Decisions

The primary seam is the complete user journey: sign-in -> onboarding -> private globe -> places/visits -> upload -> gallery -> publish -> anonymous view -> hide -> deletion. Add focused integration tests for authorization, database concurrency, quotas, byte validation, processing and cleanup failures. Tests assert observable behavior rather than internal call structure. There is no pre-existing test suite.

Cover optional dates, repeat visits, no-photo places, effective country counts, manual entry, malformed/oversized/animated images, real HEIC, EXIF removal, cross-owner IDs, stale public links, cancelled/retried uploads and late callbacks. Verify keyboard, touch, reduced motion, dense markers and no-WebGL fallback. Early real-cloud HEIC processing is a release gate, not something mocked tests can establish.

Beta success: at least 5 of the first 10 testers independently add 3 places and 5 photos and share with another person. Collect direct feedback; no analytics service.

## Out of Scope

Payments, paid plans, multiple globes, trips as entities, embedding, original backup, EXIF GPS suggestions, photo editing, manual photo ordering, per-photo visibility, live updates, trash, changing profile URL, invitation management, translations and theme switching.

## Further Notes

Approved tickets are individual Markdown files in the sibling issues directory. Status means implementation readiness, not verified cloud readiness. Cloudflare provisioning was subsequently authorized and the user activated R2 personally. Deployment to Vercel remains separate. The user confirmed retaining Cloudflare after real HEIC tests returned internal error 9516; working HEIC remains a mandatory beta gate. See [validation](../../validation.md) and [the bounded Worker capability refinement](../../adr/0004-bound-worker-capabilities.md).

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
