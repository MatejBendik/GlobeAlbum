# Technical research plan

Status: planned; no provider or stack decision has been accepted.

## Evidence rules

- Use current official documentation and official pricing, licensing, and usage policies.
- Record each source URL and verification date. Separate verified facts from recommendations and open questions.
- For every candidate, explain its concrete product role, MVP necessity, overlap with other tools, benefits, added complexity, compatibility, and simpler alternatives.
- Research facts independently; ask the user for product preferences and trade-offs.
- Read the installed `research` skill when starting an investigation. Use the relevant specialist skills when their scope applies.
- No dependency installation, service provisioning, implementation, or purchases during research.

## Candidate stack — all provisional

Next.js App Router, TypeScript, Tailwind CSS, shadcn/ui with a compatible registry, React Hook Form, Zod, Zustand, TanStack Query, Neon PostgreSQL, Prisma or Drizzle, Better Auth, and Cloudflare R2.

## Required investigations

### Next.js, data and state

- Server versus Client Components; isolate the interactive globe boundary.
- Server data loading versus TanStack Query, justified by concrete interactions.
- Server Actions versus Route Handlers, including upload and external callbacks.
- Cache ownership, invalidation, stale data and duplicate caching.
- Separate form state, URL state, server data, and local UI state.
- Identify a concrete need for Zustand before recommending it.

### Database and authentication

- Neon suitability for the eventual hosting/runtime and connection strategy.
- Prisma versus Drizzle and a simpler SQL-based option; migration ergonomics and deployment implications.
- Better Auth adapter compatibility with the selected database library.
- Connection pooling, migrations, and separation of build-time and runtime access.
- Email/password, OAuth, and magic link trade-offs; account recovery and verification.
- External email service needs and its costs.
- Authentication versus ownership and resource-level authorization for profiles, globes, places, visits, and photos as applicable.

### Photos and R2

- Browser uploads through short-lived presigned URLs; server-side authorization and constrained upload intent.
- Object storage versus PostgreSQL metadata; pending, processed, published, failed, and deleted lifecycle states as proposals.
- Private originals, published variants, delivery URLs, caching, and publication revocation.
- Thumbnail and display variants, formats, image optimization, processing location, and processing cost.
- Precisely distinguish R2 capabilities from additional processing or delivery services.
- Validate actual file type, decoded image dimensions, file size, and untrusted metadata.
- Upload limits, quotas, rate limits, abuse prevention and cost controls.
- Abandoned uploads, retries, orphan cleanup, and consistent deletion of records and objects.
- EXIF GPS as optional location input; explicit handling of metadata in public derivatives.
- Mobile photo ingestion including HEIC, supported conversion paths, and fallback behavior.

### Globe and geographic data

- Inspect the user-provided references: [Aceternity GitHub Globe](https://ui.aceternity.com/components/github-globe) and [Magic UI Globe](https://magicui.design/docs/components/globe).
- Compare their underlying globe libraries and suitable alternatives, using primary sources.
- Verify photo/custom markers, click handling, clustering, camera control, licensing, and integration effort.
- Evaluate mobile performance, bundle size, WebGL requirements, accessibility, and a useful fallback.
- Marker/detail loading strategy for many places; avoid loading original images for globe overview.
- Country identifiers and boundaries, coordinates, place search, API limits, attribution, licensing, and fees.
- Derive visited countries from places where appropriate; expose ambiguous cases and manual correction choices.

### UI and visual system

- Verify compatibility of current Tailwind, shadcn/ui, and the selected registry.
- Investigate AlignUI as a possible visual reference or component source; verify individual component dependencies, license, API and integration model before recommending it.
- Preserve a coherent original visual system inspired by the user's references.

### Hosting and costs

- Compare suitable Next.js hosting against the chosen runtime and photo-processing needs.
- Inventory every service needed for a working MVP, including email or processing if required.
- Distinguish free-tier limits, temporary credits, commercial-use restrictions, and sustainable operating cost.
- Build beta and growth scenarios with explicit user counts, active users, photos per user, original and derivative sizes, views, transferred bytes, processing frequency, and retention.
- Include storage, requests, delivery, processing, database, hosting, email, place search, domain if desired, and billing currency/tax assumptions.
- Cite current official prices and date the estimates. State usage limits and uncertainty; do not promise zero costs.

## Research sequencing

Resolve the first audience, globe ownership, and privacy intent before narrowing architecture. Research independent technical facts while later product questions remain open. Use small focused reports rather than selecting the entire preferred stack as a bundle.
