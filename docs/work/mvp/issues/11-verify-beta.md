# 11: Verify and prepare the public beta

Type: task
Status: ready-for-agent
Execution: release gated

## What to build

Verify and prepare the public beta, as a complete end-to-end user behavior.

## Blocked by

05, 08, 10

## Acceptance criteria

- [x] Build/type checks and meaningful domain/integration/browser tests pass.
- [ ] Real Google, Neon, R2 and HEIC checks and physical-device evidence are recorded before release.
- [x] Deployment is explicitly authorized, with Hobby, private storage lifecycle/CORS and Production-scoped variables verified.
- [ ] Scheduled cron execution and usage monitoring are checked before the public beta.
- [x] Privacy and terms pages are available before sign-in, including account deletion and content reporting information.
- [x] Local and production HTTP checks verify public crawl metadata and an indexable landing page while retaining user-profile exclusions.
- [ ] Complete the operator review in the [legal release notes](../../../legal-readiness.md) before inviting public beta testers.

## Validation evidence

Updated 2026-11-07. GitHub `main` deploys to Vercel Hobby. The hosted test
covered returning Google login, managed email registration and deletion,
GeoNames, private upload of PNG/JPEG/WebP/HEIC through R2 and Vercel/Linux,
publication and hiding. Vercel registered the daily maintenance cron. A manual
authorized invocation cleared the test cleanup jobs and their R2 objects.
Physical devices, representative resource measurements, production auth
email/recovery, the first scheduled invocation and beta feedback remain open.

The desktop and mobile navigation checks cover the public notices, the
footer referral URL, shared header dimensions and a signed-in Google avatar
using the local Auth contract fixture. The anonymous public globe response
does not contain the owner's Google avatar URL.

See [verification and release gates](../../../validation.md). Unchecked criteria remain pending, even when their code exists.

## Comments

Approved in discovery; implementation explicitly authorized.

On 2026-11-10 the user enabled Vercel Web Analytics and requested the App Router
integration. The privacy notice describes page view analytics. The production
build, type check and 55 integration tests passed. A local Chromium smoke test
verified SDK initialization, initial and client navigation page views, and
removal of query strings, fragments and profile usernames from event URLs.
The smoke test stubbed the hosted script. Hosted receipt of page views remains
a separate verification step.

Vercel documentation verified on 2026-11-10:
[setup](https://vercel.com/docs/analytics/quickstart),
[redaction](https://vercel.com/docs/analytics/redacting-sensitive-data), and
[data collection](https://vercel.com/docs/analytics/privacy-policy).

On 2026-11-14 the user requested Google indexing and reported crawl metadata
redirecting to sign-in. Local HTTP/browser checks reproduced both `307` redirects
and the landing page's inherited `noindex`. The fix adds exact public metadata
routes, a landing-only sitemap, an indexable landing page and its canonical URL.
Eight SEO browser checks, both existing public-preview/revocation scenarios,
56 Vitest tests and the production build passed. After commit `bd4d224` deployed,
anonymous production HTTPS checks confirmed both metadata routes return `200`,
the landing page is indexable with its canonical URL, sign-in retains `noindex`,
and the editor still requires authentication. Google Search Console submission
and actual indexing remain unverified; see [search indexing](../../../seo.md).
