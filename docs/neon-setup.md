# Neon setup and change log

Verified: 2026-11-06. User-authorized amendment: connect the existing production
branch to Postgres and managed Better Auth, add email/password signup, and verify
real services. No Vercel deployment or paid-plan change was made.

## Service changes

- Installed global Neon CLI 8.23.3 using `npm i -g neon@latest` under Node 24.
- Reauthenticated the CLI in the browser after stored credentials returned
  `invalid_grant`. Login completed successfully; no credentials were printed.
- Ran the requested `neon init -y` with the supplied organization/project and
  `production`, services `postgres,auth`. Reused GlobeAlbum
  `bitter-river-07504050` / `br-holy-frost-b9ekoysr`; no new project or branch.
- Created `neon.ts` declaring managed Auth (Postgres is implicit). Preserved the
  existing branch's settings; generated policy expires future new branches in
  seven days. No Functions, Data API, Neon storage or AI service was enabled.
- `neon config plan` and `neon deploy` both reported no remote policy changes:
  Postgres and Auth were already present. Deploy successfully pulled five service
  variables into `.env.local`, preserving unrelated app/Cloudflare values.
- Added trusted Auth origin `http://127.0.0.1:3000`; the first direct signup probe
  correctly failed with `INVALID_ORIGIN` before this configuration.
- Read email/password settings: enabled, registration open, verification not
  required, no signup/sign-in email. Those settings were not changed.
- Inspected database tables before migration: managed `neon_auth` existed and
  `public` had no application tables. Applied the existing initial migration and
  new `DeletedIdentity` migration; no existing auth tables were dropped/modified.

## Agent installation and preserved configuration

Fetched the exact requested skill URL to ignored local setup notes, then followed
its `neon-postgres` and `neon-auth` references. All seven installed skills report
up to date: `neon`, `neon-ai-gateway`, `neon-auth`, `neon-functions`,
`neon-object-storage`, `neon-postgres`, `neon-realtime`.

The requested noninteractive init auto-detected multiple agent installations:

- Installed/refreshed Neon plugins for Codex, Claude Code, Claude Desktop and
  VS Code. Codex plugin is `neon-postgres@plugins-cli`, version 3.0.1, with
  bundled skills and HTTP MCP at `https://mcp.neon.tech/mcp` using OAuth.
- Codex plugin files are under
  `~/.codex/plugins/cache/plugins-cli/neon-postgres/3.0.1/`; global skill files
  are under `~/.agents/skills/`. CLI also installed its skill set into detected
  Antigravity, Gemini and GitHub Copilot targets.
- CLI merged MCP configuration into `~/.gemini/config/mcp_config.json`,
  `~/.gemini/settings.json` and `~/.copilot/mcp-config.json`. It created one
  account-wide API key named `neon-cli-mcp-20261106T095006Z-8f23` for these
  detected clients; its access spans the account's organizations. Its value is
  never copied into app files, Git or documentation.
- Existing Codex MCP entries (Cloudflare, computer use and Node REPL) were
  preserved. No duplicate standalone Neon MCP entry was added because the
  plugin already supplies it. A fresh Codex session may be required to expose
  new plugin tools; MCP OAuth/tool execution was not verified in this session.
- The unrelated Grok Build plugin refresh failed; the CLI explicitly preserved
  its existing installation. Consequently init returned exit code 1 despite
  successfully linking this app and installing Codex tooling. Service deploy
  subsequently succeeded. No repeated destructive plugin reinstall was attempted.

## Project and local configuration changes

- Added ignored `.neon` link context and `.gitignore` entry.
- Preserved pre-setup env/package files under ignored, restricted
  `.local/neon-setup-backup/`; setup fixtures/reports live in `.local/neon-setup/`.
- `.env.local` now contains pooled/unpooled URLs, branch and Auth/JWKS URLs pulled
  by CLI, a locally generated `NEON_AUTH_COOKIE_SECRET`, and `APP_ORIGIN`.
  Removed the stale local `DIRECT_URL` override so migrations target Neon.
  Existing unrelated values remain; obsolete self-hosted Auth values are unused.
- Added CLI-generated `@neon/config` and `@neon/env`, SDK `@neon/auth@0.8.2`, and
  `@vercel/functions@3.11.0`. Removed direct `better-auth` and its Prisma-adapter
  dependencies; the SDK resolves one compatible transitive Better Auth 1.7.18.
- Prisma runtime remains `pg`/Prisma 7, with a shared five-connection pool and
  Vercel idle-connection lifecycle support. Prisma CLI separately selects the
  direct URL, retaining explicit `DIRECT_URL` for isolated local/CI overrides.
- Replaced the app-hosted Auth server/client with the managed Next SDK, renamed
  the catch-all parameter to `[...path]`, and added SDK `src/proxy.ts` middleware.
  Resource authorization still runs inside handlers/actions. SDK session cache
  is explicitly bounded to 60 seconds; publication reads remain request-time.
- Added email signup/sign-in forms with RHF/Zod, loading/error states and native
  autocomplete. Kept Google sign-in. Adapted sign-out and account deletion.
- Added private application ownership synchronization and an opaque deletion
  fence. Pending managed removal survives app data deletion. The operator-only
  `auth:cleanup` command checks branch/database alignment and deletes queued
  identities through the existing CLI login, without an app control-plane key.
- Updated same-origin checks and local/cloud verification helpers to use
  `APP_ORIGIN`. Updated env examples and project instructions, spec, discovery,
  architecture, ADR, setup, stack/cost notes, delivery evidence and checkpoint.
- Adapted isolated browser fixtures to a guarded Auth contract fake, keeping
  real SDK cookie/proxy handling. Added two email-validation/error scenarios and
  a domain assertion that a deleted identity cannot recreate its ownership row.
  The test fakes never run in application production code.
- Added opt-in `verify:neon` browser smoke against a running local production
  app and real Neon services. It creates a disposable real identity, exercises
  persisted content, and removes its own provider identity through the CLI.
- Retained the historical unused app-hosted auth tables to avoid destructive
  migration work. Managed credentials are stored only by Neon in `neon_auth`.
- Formatted changed code with repository Prettier. Build-generated Next types
  may switch between development and production paths; final build regenerates
  them. Removed stale generated dev route types after the catch-all rename.

## Observed verification

Safe command output:

```text
neon deploy
No changes — branch production already matches the policy.
Utilized services: Postgres, Neon Auth
Pulled 5 Neon variables into .env.local

npm run db:deploy
Applying migration `20261105192526_initial`
Applying migration `20261106110000_managed_identity_fence`
All migrations have been successfully applied.

npm run build
Compiled successfully
Finished TypeScript
Generating static pages (5/5)

npm test
Test Files  3 passed (3)
Tests  28 passed (28)

npm run test:e2e
12 passed (1.7m)

npx playwright test -g 'validates email signup'
2 passed (13.1s)

npm run verify:neon -- --confirm
PASS real Neon email signup and same-origin current-user read
PASS managed session survives reload
PASS onboarding creates a private globe in actual Neon Postgres
PASS browser mutation persists place in actual Neon Postgres
PASS sign-out denies protected studio
PASS wrong password displays invalid-credentials error
PASS email sign-in restores persisted globe after reload
PASS real Neon publication is visible to anonymous visitor
PASS hiding denies new anonymous profile and gallery reads
PASS account deletion removes application data and queues provider cleanup
PASS stale managed cookies cannot recreate a deleted application account
PASS disposable identity physically removed through Neon CLI
```

The 12-scenario run preceded adding the two auth scenarios; the latter were run
separately on desktop and mobile. Both use isolated local PostgreSQL and guarded
service fakes, not production Auth or real image conversion.

The real Neon smoke uses actual browser forms and real service env variables:
registration, same-origin current-user read, reload, private onboarding, place
write independently checked with SQL, sign-out, wrong password, returning
sign-in, anonymous publication and private-gallery denial all passed. Disposable
identities were removed through CLI; opaque fences and retired usernames remain.
Final SQL checks: `pendingIdentityCleanup: 0`, `remainingDisposableIdentities: 0`.
The configured source identity does not receive mail because signup email and
verification are off; this is a real managed record, not mailbox-delivery testing.

## Failures and remaining limits

- Initial expired CLI login: resolved by browser login.
- Initial origin rejection: resolved by adding the actual local app origin.
- First build referenced removed catch-all route in stale generated dev types:
  resolved by regenerating generated types; subsequent production builds pass.
- Wrong-password SDK responses throw a normalized HTTP error; fixed handling
  for thrown/returned errors. Real 401 and the regression fake now show the
  correct invalid-credentials message.
- Secure-cookie restoration in test fixtures required an HTTPS source URL for
  Chromium's cookie insertion API, even with a trustworthy HTTP loopback app.
- The stale-cookie smoke initially checked the URL before App Router finished a
  streamed redirect. Waiting for the final URL fixed the test; the complete
  real-service run now exits successfully.
- Managed `delete-user` currently returns an empty 404. Logical app revocation
  and durable operator CLI cleanup work; automated provider identity deletion
  remains a beta gate. R2 cron does not execute the operator CLI command.
- Google consent/callback, production SMTP, verification/password recovery,
  physical devices and deployed Vercel behavior remain unverified.
- Existing Cloudflare HEIC provider error 9516 remains a separate beta blocker.
- `pg` emits a warning about future `sslmode=require` semantics. Its current
  version verifies certificates; review SSL behavior when upgrading the driver.

Primary sources checked 2026-11-06:

- https://neon.com/.well-known/agent-skills/neon/SKILL.md
- https://neon.com/docs/ai/skills/neon-auth/SKILL.md
- https://neon.com/docs/auth/quick-start/nextjs-api-only
- https://neon.com/docs/auth/guides/user-management
- https://neon.com/docs/auth/production-checklist
- https://neon.com/docs/guides/prisma
- Installed `@neon/auth@0.8.2` declarations/source and CLI help/status, inspected
  to confirm the methods/configuration actually shipped in this environment.
