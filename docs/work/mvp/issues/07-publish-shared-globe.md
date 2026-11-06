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
