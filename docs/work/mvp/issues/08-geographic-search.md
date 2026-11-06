# 08: Find cities and correct country assignments

Type: task
Status: ready-for-agent
Execution: implemented; live GeoNames verification outstanding

## What to build

Find cities and correct country assignments, as a complete end-to-end user behavior.

## Blocked by

02

## Acceptance criteria

- [ ] Server-backed GeoNames search persists selected results and attribution.
- [x] Country corrections affect counts without overwriting source country data.
- [x] Manual entry remains available when search is unavailable; repeated provider IDs reuse an owned place.

## Validation evidence

Updated 2026-11-05. Server-backed, bounded/throttled GeoNames search and attribution are implemented. Missing search configuration keeps manual entry usable. PostgreSQL tests verify provider-ID reuse and separate country overrides. The user's live GeoNames account has not been configured or tested.

See [verification and release gates](../../../validation.md). Unchecked criteria remain pending, even when their code exists.

## Comments

Approved in discovery; implementation explicitly authorized.
