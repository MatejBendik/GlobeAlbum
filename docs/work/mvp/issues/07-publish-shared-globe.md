# 07: Publish and hide a shared globe

Type: task
Status: ready-for-agent
Execution: implemented; locally and partially cloud verified

## What to build

Publish and hide a shared globe, as a complete end-to-end user behavior.

## Blocked by

06

## Acceptance criteria

- [x] Only published profiles resolve anonymously at the immutable username URL.
- [x] Public DTOs omit emails, visit dates and storage details.
- [x] Hiding stops new image authorizations; issued links last at most 60 seconds.
- [ ] Copy/share feedback and noindex metadata work.

## Validation evidence

Updated 2026-11-05. Browser tests publish, open anonymously, exclude private dates/pending uploads, hide and deny later gallery requests. Real Worker tests verify expiration and the permitted pre-issued-link window. Copy feedback and global noindex metadata are implemented; clipboard behavior still needs explicit verification. Streamed Next.js not-found HTML can retain HTTP 200 while rendering no content; API denial is 404.

See [verification and release gates](../../../validation.md). Unchecked criteria remain pending, even when their code exists.

## Comments

Approved in discovery; implementation explicitly authorized.

On 2026-11-08, owners gained an explicit Settings action to use their Google
account photo as the globe avatar. The server uses the approved session
picture URL ([Google OpenID Connect](https://developers.google.com/identity/openid-connect/openid-connect#obtainuserinfo))
and rejects redirects ([Fetch Standard](https://fetch.spec.whatwg.org/#concept-request-redirect-mode)).
Sources verified 2026-11-08. The processed copy is stored under the existing
private avatar prefix and served by the publication-aware avatar route.
Desktop and mobile Playwright tests with local Google and storage fixtures
verified that an anonymous visitor sees the same avatar as Studio after the
owner opts in, and that removal revokes the public URL. The original Google
photo URL remains private.

On 2026-11-10 the user approved social previews for the site and published
globes. The default PNG uses the landing globe and its demo postcards. Published
profiles provide Open Graph and large X card metadata for their own 1200 × 630
PNG. The image includes the saved globe style, public place markers and up to
three ready photo thumbnails. Content revisions change the image URL. An older
image URL redirects to the current revision while the globe is public. All
profile image URLs return 404 after it is hidden.

The local desktop and mobile browser runs checked crawler-visible metadata,
PNG dimensions, style revisions, inclusion of a processed upload, photo
removal and revocation of every tested image URL after hiding. The storage
transport used the isolated local R2 fixture.

Sources verified 2026-11-10:
[Open Graph metadata](https://ogp.me/),
[Next.js ImageResponse](https://nextjs.org/docs/app/api-reference/functions/image-response),
[D3 geographic projection](https://d3js.org/d3-geo/projection), and
[LinkedIn preview cache behavior](https://www.linkedin.com/help/linkedin/answer/a6233775).
