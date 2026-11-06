# Stack rationale and evidence

Reviewed: 2026-11-05. Decisions are approved choices; trade-offs are engineering
judgments. Versions are pinned in `package-lock.json`. Successful compilation
establishes compatibility for this repository, not arbitrary registry components.

| Technology         | Concrete role / needed in MVP                  | Benefit, overlap and cost                                                               | Simpler alternative / decision                                                 |
| ------------------ | ---------------------------------------------- | --------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| Next.js App Router | Rendering, actions and APIs; yes               | One Vercel app boundary; server/client and caching discipline required                  | Separate SPA/API adds another deployment; keep Next                            |
| TypeScript         | Typed application/provider contracts; yes      | Does not validate external bytes                                                        | JS is initially simpler; retain TS plus runtime checks                         |
| Tailwind 4         | Styling and tokens; yes                        | Compatible with current shadcn patterns; avoid competing tokens                         | Authored CSS is also used for layout                                           |
| shadcn-style/Radix | Dialogs, confirmations, buttons; selected only | Local wrappers, upstream accessible behavior; dependencies still need review            | Native controls where sufficient                                               |
| React Hook Form    | Place/visit/upload form state; yes             | Less interaction wiring; overlaps native simple forms intentionally                     | Native forms for simple operations                                             |
| Zod                | External inputs and file selection; yes        | Browser validation supplements server checks                                            | Hand-written checks would be harder to keep consistent                         |
| Zustand            | No identified role                             | Duplicates local state at this scope                                                    | Omit; React state and URL selection                                            |
| TanStack Query     | No initial need                                | Adds a second data/cache invalidation layer                                             | Server reads plus lazy gallery fetch                                           |
| Neon PostgreSQL    | Hosted persistence; yes for release            | Transactions/constraints; compute and connection limits                                 | Existing Neon production branch linked 2026-11-06; isolated local DB for tests |
| Prisma 7 + pg      | Schema, migrations, relational reads; yes      | Typed relations; generation/migrations add machinery                                    | Drizzle is a viable thinner SQL-oriented alternative; Prisma is accepted       |
| Better Auth        | Managed Google/email identity/sessions; yes    | Neon SDK and provider configuration; ownership remains application work                 | Custom OAuth/session code increases sensitive implementation                   |
| R2                 | Private quarantine/variants; yes               | Durable objects; no conversion or domain authorization by itself                        | Managed Images storage would change privacy/cost design                        |
| Sharp + HEIC WASM  | Local decode/orient/re-encode; yes             | Removes the Images service dependency; adds server CPU/memory and native/WASM packaging | User chose R2-only storage on 2026-11-06; validate the hosted runtime          |
| react-globe.gl     | Markers, camera and dots; yes                  | Direct functional fit; significant Three.js/WebGL payload                               | Cobe is lighter but needs more bespoke interaction                             |
| GeoNames           | City coordinates/countries; yes                | Attribution, credits and availability to manage                                         | Manual entry remains available                                                 |

Server Components perform initial reads. Client Components contain interaction.
Server Actions mutate metadata; Route Handlers handle auth, uploads, lazy reads
and maintenance. All relevant operations enforce identity and ownership.
Request-time reads avoid double caching publication state in framework and Query
caches. Keep form values, URL selection, persisted records and local UI separate.

Prisma uses a small `pg` driver pool. Runtime pooled and migration direct URLs
are separate. Builds generate the client without applying migrations.
The user confirmed managed Neon Auth plus email/password on 2026-11-06,
superseding the Google-only app-hosted decision. Neon delivers auth email;
production requires custom SMTP and Google credentials. Current evidence and
remaining deletion/recovery gates are in [Neon setup](../neon-setup.md).
Authentication never substitutes for authorization to a Place, Visit or Photo.

Tailwind 4 support is documented by shadcn. Local Radix/CVA wrappers share one
token system. No arbitrary registry is adopted wholesale. AlignUI is a visual
reference, not assumed to be a shadcn drop-in or a second helper/token system.

Primary references, checked 2026-11-05:

- https://nextjs.org/docs/app/getting-started/server-and-client-components
- https://nextjs.org/docs/app/getting-started/updating-data
- https://react-hook-form.com/get-started
- https://zod.dev/api
- https://ui.shadcn.com/docs/tailwind-v4
- https://www.alignui.com/docs/v1.2/ui/fancy-button
- https://neon.com/docs/guides/prisma
- https://orm.drizzle.team/docs/get-started/postgresql-new
- https://better-auth.com/docs/adapters/prisma
- https://better-auth.com/docs/authentication/google
- https://developers.cloudflare.com/images/optimization/binding/

Open checks: hosted Neon pooling/concurrency, physical-device performance, and
native/WASM codec packaging/resource use in the hosted Linux runtime. Real Google
callbacks and R2 PNG/HEIC processing now pass. See [release gates](../validation.md).

## Appearance amendment (2026-11-06)

The user explicitly added theme switching. `next-themes` 0.4.6 manages the
browser preference and pre-paint theme attribute; semantic authored CSS handles
both modes without filtering photographs. Radix Dropdown Menu 2.2.1 adds account
menu keyboard/focus behavior using the existing component style system. These
are UI dependencies, not additional services or server-data caches. A local
handwritten theme store/menu could use fewer packages but adds hydration and
focus-management work. The existing Next/React stack compiles with both.

References checked 2026-11-06:
https://github.com/pacocoursey/next-themes and
https://www.radix-ui.com/primitives/docs/components/dropdown-menu.

## R2-only processing amendment (2026-11-06)

User-confirmed: Cloudflare supplies private R2 storage only; no Images plan.
Sharp handles orientation, resizing and metadata-free output. Portable libheif
WASM decodes HEIC because Sharp's prebuilt binary does not include HEVC decoding.
Both run server-side; they add hosting CPU/memory and packaging work. Actual R2
PNG/HEIC smoke and owner JPEG recovery pass; physical and hosted Linux checks are
separate. References checked 2026-11-06: https://sharp.pixelplumbing.com/install/,
https://sharp.pixelplumbing.com/api-output/,
https://github.com/catdad-experiments/heic-decode.
