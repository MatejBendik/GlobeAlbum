# 08: Find cities and correct country assignments

Type: task
Status: ready-for-agent
Execution: live GeoNames search and persistence verified; physical-device checks outstanding

## What to build

Find cities and correct country assignments, as a complete end-to-end user behavior.

## Blocked by

02

## Acceptance criteria

- [x] Server-backed GeoNames search persists selected results and attribution.
- [x] Country corrections affect counts without overwriting source country data.
- [x] Manual entry remains available when search is unavailable; repeated provider IDs reuse an owned place.

## Validation evidence

Updated 2026-11-06. The user's GeoNames account is configured locally. An opt-in
desktop browser run used the actual GeoNames service through the application,
selected Krompachy with the keyboard and persisted its provider ID, country and
coordinates in isolated PostgreSQL, then uploaded a fixture to the new visit.
Auth and photo processing used the existing guarded local contract fakes.
Normal browser runs keep search deterministic with fixture responses. The map
picker remains available during search failures. PostgreSQL tests separately
verify provider-ID reuse and country overrides.

See [verification and release gates](../../../validation.md). Unchecked criteria remain pending, even when their code exists.

## Comments

Approved in discovery; implementation explicitly authorized.
