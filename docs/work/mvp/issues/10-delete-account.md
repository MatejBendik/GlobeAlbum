# 10: Delete an account and revoke its content

Type: task
Status: ready-for-agent
Execution: application revocation verified; managed identity automation gated

## What to build

Delete an account and revoke its content, as a complete end-to-end user behavior.

## Blocked by

07, 09

## Acceptance criteria

- [x] Confirmed account deletion signs out and blocks owned/public data immediately, including stale managed cookies.
- [ ] Managed identity cleanup runs automatically through a supported provider operation; currently operator CLI work.
- [x] Durable object cleanup survives deletion of the user and repeated execution.
- [x] Late upload completion cannot revive an account or photo.

## Validation evidence

Updated 2026-11-06. Local browser/domain tests and the real Neon smoke remove
application ownership, retain cleanup/fence records and prevent identity
resynchronization. Managed `/delete-user` returns 404 on this branch. Operator
`auth:cleanup` successfully removed disposable managed identities through Neon
CLI and verified absence. Its manual scheduling remains a beta gate. Historical
local self-hosted session-removal evidence is superseded by managed Auth.

See [verification and release gates](../../../validation.md). Unchecked criteria remain pending, even when their code exists.

## Comments

Approved in discovery; implementation explicitly authorized.

2026-11-06: account deletion moved from the profile modal to the standalone
settings page, retaining typed-username confirmation. The existing deletion
journey passes on desktop and mobile, including application-user removal and
the durable identity fence. Provider-cleanup limitations above are unchanged.
