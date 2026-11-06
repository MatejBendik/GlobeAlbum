# Complete managed identity deletion through the branch API

On 2026-11-06, a user-confirmed deletion left its Neon identity active, so Google
returned the permanently fenced ID and prevented re-registration. Complete
provider deletion through Neon's supported branch management API using a
server-only project-scoped Editor key, with a branch-URL guard and read-only
verification of identity absence. This replaces the manual-only cleanup in
ADR 0005, preserves the stale-session fence, and allows the same email to register
as a new identity without restoring its former globe.

The trade-off is a server credential with wider project-management capability
than deletion alone; never use a personal/organization-wide key or expose it to
the browser. Retry failed work through bounded maintenance and an authenticated
same-origin restart operation; retain the operator CLI as a fallback.
