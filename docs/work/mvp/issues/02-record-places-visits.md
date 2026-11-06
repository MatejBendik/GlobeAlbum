# 02: Record places and repeat visits

Type: task
Status: ready-for-agent
Execution: implemented; locally verified

## What to build

Record places and repeat visits, as a complete end-to-end user behavior.

## Blocked by

01

## Acceptance criteria

- [x] City search or a manual map pin/country and one optional valid visit date persist for the current owner.
- [x] Repeat visits share a place; visits without photos count once per place and country.
- [x] Ownership and the 100-place/300-visit limits hold on concurrent requests.

## Validation evidence

Updated 2026-11-05. Real PostgreSQL tests verify repeat visits, no-photo counts, country corrections and cross-owner denial. Concurrent mutations are tested at the 100-place and 300-visit boundaries. The user refined the form on 2026-11-06: browser tests select a map point instead of entering coordinates; new visits accept one optional date. Legacy end-date storage is preserved.

See [verification and release gates](../../../validation.md). Unchecked criteria remain pending, even when their code exists.

## Comments

Approved in discovery; implementation explicitly authorized.

2026-11-06 UX refinement: saving a place returns its newly created visit ID and
advances the same dialog directly to optional photo upload. Skipping preserves
the place and no-photo visit. The new-visit upload path is browser tested rather
than rediscovering a marker after saving.

2026-11-06 calendar refinement: the optional date uses a Radix Popover and React
DayPicker styled with the app palette. React Hook Form Controller retains Zod
validation and the existing YYYY-MM-DD contract. Browser verification covers
month/year choice, keyboard selection, editing, clearing, focus restoration and
Escape without dismissing the parent form. A UTC+14 case checks the saved date
independently in PostgreSQL. The calendar code loads only when opened.
