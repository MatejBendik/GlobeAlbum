# 09: Edit and remove album content

Type: task
Status: ready-for-agent
Execution: implemented; additional edit/cleanup cases outstanding

## What to build

Edit and remove album content, as a complete end-to-end user behavior.

## Blocked by

06

## Acceptance criteria

- [x] Visit dates, photo captions and place metadata can be edited only by their owner.
- [ ] The owner can select a ready cover photo and confirm destructive changes.
- [ ] Logical deletion immediately hides content and durable cleanup removes every object.
- [x] Owners can upload, replace and remove an avatar in Profile settings.

## Validation evidence

Updated 2026-11-05. Visit/date and caption mutations enforce ownership. Browser tests edit a caption. Cover selection and confirmation dialogs are implemented. Durable cleanup is tested for failure/retry and has successfully removed real Cloudflare test objects; every edit/deletion UX and physical-device case is not yet individually verified.

See [verification and release gates](../../../validation.md). Unchecked criteria remain pending, even when their code exists.

The 2026-11-07 avatar checks cover the private Google fallback, an uploaded
avatar on the published globe, revocation when hidden or removed, and a failed
replacement retaining the previous photo while queuing cleanup. The upload is
separate from the visit photo count and uses the shared storage and processing
budgets.

## Comments

Approved in discovery; implementation explicitly authorized.
