# Use managed Neon Auth with Google and email/password

Accepted by explicit user instruction on 2026-11-06; supersedes the auth portion
of [ADR 0003](0003-postgres-google-auth.md). Keep Prisma 7 and PostgreSQL, but use
Neon's managed Better Auth through `@neon/auth` in the user's existing production
branch. Add email/password registration alongside Google, avoiding a second auth
server and password storage in the application. This moves provider configuration
and auth email delivery to Neon and introduces its managed API boundaries.

Application ownership remains independent of the provider schema. An opaque
deleted-identity fence prevents stale provider sessions from restoring removed
accounts. The observed managed self-deletion endpoint returns 404; durable
operator cleanup through Neon CLI is implemented, while automated provider
cleanup remains a beta gate. Production SMTP, recovery and real Google consent
still require verification. See [setup evidence](../neon-setup.md).
