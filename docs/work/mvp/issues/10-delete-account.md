# 10: Delete an account and revoke its content

Type: task
Status: ready-for-agent
Execution: application revocation, automatic managed deletion and re-registration verified

## What to build

Delete an account and revoke its content, as a complete end-to-end user behavior.

## Blocked by

07, 09

## Acceptance criteria

- [x] Confirmed account deletion signs out and blocks owned/public data immediately, including stale managed cookies.
- [x] Managed identity cleanup runs automatically through the supported branch API; failures remain retriable.
- [x] Durable object cleanup survives deletion of the user and repeated execution.
- [x] Late upload completion cannot revive an account or photo.

## Validation evidence

The 2026-11-07 Vercel browser smoke confirmed Settings deletion, managed
identity removal, stale-session denial and same-email re-registration with a
fresh identity and no restored globe.

Updated 2026-11-06. Local browser/domain tests and the real Neon smoke remove
application ownership, retain cleanup/fence records and prevent identity
resynchronization. Managed `/delete-user` returns 404 on this branch. Operator
`auth:cleanup` successfully removed disposable managed identities through Neon
CLI and verified absence. That manual-only limitation was superseded by the
automation and real-service results in the correction below. Historical local
self-hosted session-removal evidence is superseded by managed Auth.

See [verification and release gates](../../../validation.md). Unchecked criteria remain pending, even when their code exists.

## Comments

Approved in discovery; implementation explicitly authorized.

2026-11-06: account deletion moved from the profile modal to the standalone
settings page, retaining typed-username confirmation. The existing deletion
journey passes on desktop and mobile, including application-user removal and
the durable identity fence. Provider-cleanup limitations above are unchanged.

2026-11-06 deletion/re-registration correction: the manual-only workflow left the
owner's managed identity active and caused Google to return a fenced ID. The app
now completes provider deletion through a project-scoped server key, verifies
branch alignment and actual identity absence, and retries pending work through
maintenance and authenticated same-origin recovery. The original fence remains.
The owner's real Google re-registration created a new Google-only identity and
opened onboarding with zero globes. The extended real Neon smoke separately
verified automatic Settings deletion, stale-cookie denial and same-email new-ID
registration. Local tests cover wrong-branch refusal, failure/retry, idempotence
and maintenance without photo storage. Hosted scheduling remains a deployment
gate, independent of these observed immediate/explicit-retry results.
