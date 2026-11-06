# Application architecture

Implemented design, updated 2026-11-06. Product scope remains defined by the
[approved specification](work/mvp/spec.md).

## Boundaries

Vercel runs Next.js in Node.js. Server Components read through server-only
functions in `src/lib/domain.ts`; all ownership checks are repeated inside
mutations. Ordinary metadata writes use Server Actions. Authentication, upload
control, lazy galleries, search, and maintenance use Route Handlers.
Reads run at request time with no persistent publication-sensitive data cache.
Server Actions revalidate the editor; open visitors see changes on later requests.

Client Components own the WebGL globe, dialogs, gallery navigation, and upload
progress. The selected place lives in the URL; forms use React Hook Form and
Zod; local interaction uses React state. No Query or Zustand cache is involved.
The dynamically imported renderer loads separately and retains the complete
HTML place list as a fallback. Postcard placement uses projected distances and
a small display budget; this is visual deconfliction, not geographic clustering.

## Presentation and navigation

The workspace is a full-viewport globe with overlaid title/counts, primary owner
actions and a nonmodal right-hand places panel. The panel is normally closed;
WebGL fallback opens the complete HTML list. Escape restores focus to its trigger.
Landing postcards reuse the same gallery immediately on selection.

Place creation returns only the saved place/visit identifiers to the client.
A two-step dialog passes the new visit ID directly to the existing upload flow,
preserving no-photo visits when the user skips. File selection appends to the
React Hook Form array, so Zod validates the complete pending selection. Successful
batches remain in the queue while later batches add independent Photo records.

Postcards use a fixed 130px width with CSS `scale`/`rotate` on a visual child;
Three.js CSS2DRenderer owns the positioning `transform`. Hover/focus enlarges the
frame without moving its stable button hit target. Projected overlap thresholds
include the enlarged footprint. Primary-button hover uses the same gradient as
its resting state to avoid a gradient-to-solid transition flash.

`next-themes` provides a light default and persisted explicit light/dark choice
under `globealbum-theme`. Semantic CSS colors cover surfaces/text/controls and
Three.js receives actual theme-specific material, point and atmosphere colors.
Photos are never globally color-filtered. Reduced-motion preferences disable
rotation/entrance motion; panel and menu transitions stay short.

Server pages resolve minimal navigation-viewer data from the verified managed
session. The account menu uses Radix keyboard/focus handling and performs sign-out
through the existing Server Action. Settings use the authenticated `/settings`
page, which reads only the current owner's profile fields. The former
`/studio?settings=profile` address redirects there. Profile edits reuse the
ownership-checked Server Action and refresh the server-rendered identity;
the immutable globe address and private sign-in email are read-only.
Resource authorization stays inside the server operations. The public decorative
land-dot JSON is explicitly public in the SDK middleware allowlist.

Primary references verified 2026-11-06:
https://github.com/pacocoursey/next-themes,
https://www.radix-ui.com/primitives/docs/components/dropdown-menu,
and installed Next.js layout/authentication guides.

## Data model

`User → Globe → Place → Visit → Photo`

Managed Neon Auth owns identities and sessions in `neon_auth`. The application
maintains a private `public.User` ownership record from verified SDK sessions.
Historical application-hosted auth tables remain unused; no destructive auth-table
migration was applied. Prisma also manages upload intents,
shared byte accounting, monthly transformation reservations, durable cleanup
jobs, throttling windows, and retired usernames. Country overrides remain
separate from source data. The visit date is nullable. Historical end-date columns are retained; new requests only accept one date.
Globe uniqueness and provider-place uniqueness also have database constraints.

Mutations take a transaction-scoped advisory lock. Serializing writes is a
deliberate small-beta simplification that protects place/visit/photo caps and
shared capacity. Revisit this coarse lock when measured throughput warrants it.
External storage calls run outside database transactions.

## Managed authentication

The same-origin `/api/auth/[...path]` proxy uses `@neon/auth/next/server`;
Client Components use `@neon/auth/next`, without a second auth server or adapter.
`src/proxy.ts` handles SDK OAuth/session middleware and optimistic page protection.
All API handlers and Server Actions independently authenticate and authorize.
Email/password and Google use the same managed identity and application ownership.
Credentials never enter application tables or public profile DTOs.

A 60-second SDK cookie cache avoids checking the provider on every page request.
Account deletion writes a `DeletedIdentity` fence under the same transaction lock
as ownership synchronization. It prevents stale managed sessions from recreating
an application account. Logical deletion and publication revocation commit before
provider calls. The branch currently returns 404 for self-deletion: pending
provider cleanup is retained and the operator uses `npm run auth:cleanup -- --confirm`.
This is an explicit beta operations gate, not a completed automated cleanup flow.

Prisma uses a small shared `pg.Pool` with the Neon pooled runtime URL; Vercel's
`attachDatabasePool` coordinates idle connections in Fluid Compute. The direct
migration connection is selected independently, never as an ordinary build step.

## Form boundaries

The globe address is derived from a normalized display name, checked against
active and retired slugs, and previewed read-only. Uniqueness is still enforced
under the creation transaction; a concurrent collision requires a refreshed preview.
City search resolves coordinates; the manual fallback uses a lazy Leaflet map
with a selected point, not numeric coordinate entry. OSM tiles are requested
only when the map is open, with visible attribution and browser caching.

The same pure origin allowlist is shared by Next upload routes and the Worker.
Only a configured HTTP loopback origin admits `localhost`/`127.0.0.1` aliases at
the same port. Production app origins stay exact; forwarded hosts are not trusted.
CORS responses echo only an approved request origin and vary by Origin.

## Photo flow

1. Validate selection in the browser with RHF/Zod: supported filename/MIME,
   nonempty file, maximum 20,000,000 bytes, and remaining photo slots.
2. Authenticate the owner, resolve their Visit, and atomically reserve the photo
   slot, source bytes plus 4 MB variant allowance, and two monthly transformations.
3. Return a signed five-minute Worker upload capability for a unique quarantine key.
4. The Worker checks origin/signature/expiry and streams exactly the reserved
   length through `FixedLengthStream`; conditional R2 writes reject reuse.
5. Completion claims a five-minute processing lease. The Node.js server reads at
   most 20 MB through the authenticated R2 gateway, inspects the actual container,
   rejects animation/timed tracks and checks decoded dimensions (50 megapixels).
   Sharp produces oriented, metadata-free WebP variants; HEIC uses a local
   libheif WASM decoder before Sharp. Authenticated variant PUTs persist the
   outputs in R2. The Worker performs storage and access checks only.
6. Persist actual variant sizes and mark ready only while the lease still owns
   an existing Photo. Repeat completion returns the existing result.
7. Transfer source deletion to a durable job. Source bytes remain accounted
   until physical removal; failed uploads retain their reservation until cleanup.

Variants are at most 320/2,560 px, without upscaling, with a 4 MB combined cap.
Processing failures expose no original. The Worker no longer binds Cloudflare
Images; its old `/process` and temporary diagnostic routes are removed. Source
bytes are only available through a server-authenticated endpoint, never a public
read capability. See [validation](validation.md) and ADR 0007 for real JPEG/HEIC
results and the remaining physical-device/hosting checks.
See [ADR 0004](adr/0004-bound-worker-capabilities.md) for the bounded upload gateway.

## Privacy and authorization

Every profile starts private. Only the owner can mutate it. An anonymous read
requires current publication; the public projection excludes email, visit dates,
upload identifiers, and storage keys. Coordinates and corrected country names
are intentionally public for published places. Provider account data is never
automatically copied into the public display name.

All R2 objects are private. After authorization, processed variants receive
purpose-separated signed links lasting at most 60 seconds, with no-store headers.
Hiding prevents new authorizations. An already issued link can remain valid
within its remaining window; downloaded copies cannot be recalled.
Readable profile URLs can be guessed. All application pages currently use noindex.

Logical deletion removes access immediately and queues physical cleanup in the
same transaction. Cleanup jobs do not depend on the continued existence of the
account. In-flight work cannot mark a deleted Photo ready. Cleanup is delayed
past outstanding processing/upload leases to avoid resurrected storage objects.
Retired usernames are not reassigned during beta.

Managed identity removal is a separate, retriable operation through Neon's branch
management API. A project-scoped server credential is guarded by the expected
Auth URL and a committed deletion fence; only read-only queries inspect
`neon_auth`. Completion requires verified identity absence. Account deletion,
bounded maintenance and authenticated same-origin restart can drain that work.
Old IDs remain permanently fenced; a later same-email registration receives a
new identity with no old globe. See ADR 0006 and setup for the credential scope.

Invocation logging and trace sampling are disabled for capability URLs.
Do not log source bytes, signed grant URLs, authentication headers or credentials.
Temporary provider diagnostic routes/logs have been removed.
Rate limits and quotas are application controls, not a provider spending guarantee.

## Service limits

The app pauses uploads at 50 photos/account, 8 GB accounted storage, or 4,000
monthly transformation reservations. It allows 100 places and 300 visits/account.
Processing reservations are conservative and are not refunded on failure.
Provider billing and counters still require monitoring; retries can cross months.
There are no automatic upgrades or payment flows.
