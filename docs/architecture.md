# Application architecture

Implemented design, 2026-11-05. Product scope remains defined by the
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

## Data model

`User → Globe → Place → Visit → Photo`

Prisma includes Better Auth's session/account tables, plus upload intents,
shared byte accounting, monthly transformation reservations, durable cleanup
jobs, throttling windows, and retired usernames. Country overrides remain
separate from source data. Dates are nullable PostgreSQL date columns.
Globe uniqueness and provider-place uniqueness also have database constraints.

Mutations take a transaction-scoped advisory lock. Serializing writes is a
deliberate small-beta simplification that protects place/visit/photo caps and
shared capacity. Revisit this coarse lock when measured throughput warrants it.
External storage calls run outside database transactions.

## Photo flow

1. Validate selection in the browser with RHF/Zod: supported filename/MIME,
   nonempty file, maximum 20,000,000 bytes, and remaining photo slots.
2. Authenticate the owner, resolve their Visit, and atomically reserve the photo
   slot, source bytes plus 4 MB variant allowance, and two monthly transformations.
3. Return a signed five-minute Worker upload capability for a unique quarantine key.
4. The Worker checks origin/signature/expiry and streams exactly the reserved
   length through `FixedLengthStream`; conditional R2 writes reject reuse.
5. Completion claims a five-minute processing lease. The Worker reads at most
   20 MB, inspects the actual container, rejects animation/timed tracks, checks
   decoded dimensions (50 megapixels), and re-encodes two static WebP variants.
6. Persist actual variant sizes and mark ready only while the lease still owns
   an existing Photo. Repeat completion returns the existing result.
7. Transfer source deletion to a durable job. Source bytes remain accounted
   until physical removal; failed uploads retain their reservation until cleanup.

Variants are at most 320/2,560 px, without upscaling, with a 4 MB combined cap.
Processing failures expose no original. HEIC currently fails in the real
Cloudflare backend and remains a release blocker; see [validation](validation.md).
See [ADR 0004](adr/0004-bound-worker-capabilities.md) for the bounded upload gateway.

## Privacy and authorization

Every profile starts private. Only the owner can mutate it. An anonymous read
requires current publication; the public projection excludes email, visit dates,
upload identifiers, and storage keys. Coordinates and corrected country names
are intentionally public for published places. Google account data is never
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

Invocation logging and trace sampling are disabled for capability URLs.
Structured processing errors record phase/code only, not user files or secrets.
Rate limits and quotas are application controls, not a provider spending guarantee.

## Service limits

The app pauses uploads at 50 photos/account, 8 GB accounted storage, or 4,000
monthly transformation reservations. It allows 100 places and 300 visits/account.
Processing reservations are conservative and are not refunded on failure.
Provider billing and counters still require monitoring; retries can cross months.
There are no automatic upgrades or payment flows.
