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
