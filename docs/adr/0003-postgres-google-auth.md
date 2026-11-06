# Use PostgreSQL with application-owned Google authentication

Auth decision superseded on 2026-11-06 by [ADR 0005](0005-managed-neon-auth.md). PostgreSQL and Prisma remain selected.

Original decision:

Use Neon PostgreSQL, Prisma 7 and Better Auth with Google-only sign-in. This keeps the relational ownership model explicit and removes transactional email from the initial operating requirements. Supabase remains an alternative considered during research, not a second data or auth system.
