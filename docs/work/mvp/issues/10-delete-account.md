# 10: Delete an account and revoke its content

Type: task
Status: ready-for-agent
Execution: implemented; browser/domain verification complete

## What to build

Delete an account and revoke its content, as a complete end-to-end user behavior.

## Blocked by

07, 09

## Acceptance criteria

- [x] Confirmed account deletion removes sessions and blocks owned/public data immediately.
- [x] Durable object cleanup survives deletion of the user and repeated execution.
- [x] Late upload completion cannot revive an account or photo.

## Validation evidence

Updated 2026-11-05. Desktop/mobile browser tests delete an account, remove its sessions and deny later studio access. PostgreSQL tests retain independent cleanup jobs and reject late completion after deletion; an in-flight completion/deletion race is also covered. Actual Cloudflare cleanup batches succeeded after disposable users were removed.

See [verification and release gates](../../../validation.md). Unchecked criteria remain pending, even when their code exists.

## Comments

Approved in discovery; implementation explicitly authorized.
