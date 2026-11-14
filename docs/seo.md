# Search indexing

## Confirmed request and implementation

On 2026-11-14 the user requested Google indexing for GlobeAlbum and a fix for
the crawler metadata URLs redirecting to sign-in. The approved MVP keeps user
profiles excluded from indexing.

The implementation opts only the landing page into indexing, with a canonical
URL based on the existing `APP_ORIGIN` / root `metadataBase`. Other pages retain
the root layout's `noindex, nofollow`, including published globes and embeds.
This limited scope is an implementation assumption; indexing any additional
pages requires a separate product decision.

Next.js metadata routes serve `/robots.txt` and `/sitemap.xml`. The proxy skips
authentication for those two exact paths, independently of Auth availability.
Robots allows page crawling and excludes `/api/`; the sitemap contains only the
landing page, never user addresses. Neither file needs a database query. No
invented modification timestamps, priorities or update frequencies are emitted.

Allowing page crawling lets Google see the existing `noindex` on public pages.
Robots rules do not provide access control; private content still requires
authentication and resource-level authorization.

## Verification

Before the fix, anonymous HTTPS GETs to the production domain returned:

- `/robots.txt`: `307`, `Location: /sign-in`.
- `/sitemap.xml`: `307`, `Location: /sign-in`.
- `/`: `200`, with `<meta name="robots" content="noindex, nofollow"/>`.

The local regression command reproduced both defects before implementation:

```sh
npx playwright test tests/e2e/seo.spec.ts --project=desktop --grep 'serves crawl|allows indexing'
```

It failed with `Expected: 200 / Received: 307` for crawl metadata and
`Expected: index, follow / Received: noindex, nofollow` for the landing page.
The causes were missing metadata routes, authentication intercepting those paths,
and the landing page inheriting the root layout's default exclusion.

Post-fix local verification on 2026-11-14, using Node 24.21.0:

- All 8 SEO Playwright checks passed across desktop and Pixel Chromium emulation.
  Anonymous crawl metadata returns `200` with the expected content types and
  sitemap URL; the sitemap contains exactly the landing page. The rendered home
  document contains `index, follow` and the expected canonical origin. Auth,
  demo and legal pages retain `noindex`; private routes still redirect to sign-in.
- The existing public-preview and hide/revocation scenario passed on both
  browser projects, including `noindex` on published user globes.
- All 56 Vitest tests and the production build passed. The build emits static
  `/robots.txt` and `/sitemap.xml` routes.

Hosted verification on 2026-11-14 after application commit `bd4d224` reached
production through the existing Git integration:

- `https://globealbum.com/robots.txt`: `200`, `text/plain; charset=utf-8`,
  no redirect, with `Allow: /`, `Disallow: /api/` and the production sitemap URL.
- `https://globealbum.com/sitemap.xml`: `200`, `application/xml`, no redirect,
  valid sitemap markup listing only `https://globealbum.com/`.
- `/`: `200`, `index, follow`, canonical `https://globealbum.com`, and no
  `noindex` HTTP header. Next.js normalizes the root canonical without a trailing
  slash; it represents the same URL as the sitemap's root entry.
- `/sign-in`: `200`, retaining `noindex, nofollow`.
- `/studio`: `307` to `/sign-in` for an anonymous request.

These checks read the live anonymous HTTPS responses. Search Console ownership,
sitemap submission and actual Google indexing remain unverified.

## Recommended operator follow-up

After production verification, verify ownership in Google Search Console,
submit `https://globealbum.com/sitemap.xml`, and use URL Inspection to request
indexing of `https://globealbum.com/`. Submission and actual Google indexing
are separate from making the website technically indexable. Neither is verified
by application tests or a successful deployment.

## Primary sources

Verified 2026-11-14 against current official documentation and the installed
Next.js 16.4.5 guides under `node_modules/next/dist/docs/`:

- [Next.js robots metadata route](https://nextjs.org/docs/app/api-reference/file-conventions/metadata/robots).
- [Next.js sitemap metadata route](https://nextjs.org/docs/app/api-reference/file-conventions/metadata/sitemap).
- [Next.js metadata inheritance](https://nextjs.org/docs/app/api-reference/functions/generate-metadata#merging).
- [Google: robots.txt controls crawling, not access or indexing](https://developers.google.com/search/docs/crawling-indexing/robots/intro).
- [Google: noindex requires crawler access](https://developers.google.com/search/docs/crawling-indexing/block-indexing).
- [Google: sitemaps help discovery and do not guarantee indexing](https://developers.google.com/search/docs/crawling-indexing/sitemaps/overview).
- [Google: sitemap submission and canonical URL guidance](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap).
