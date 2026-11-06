# Development and service setup

Updated: 2026-11-06. No application deployment to Vercel has been performed.

## Neon project and environment

The user's existing project `bitter-river-07504050` in
`org-weathered-sunset-98035505` is linked to `production`
(`br-holy-frost-b9ekoysr`). `neon.ts` declares Postgres and managed Auth.
No second project or paid upgrade was created. Full installation changes and
verification outputs: [Neon setup log](neon-setup.md).

Use Node 24. Preserve `.env.local`; `neon deploy` merges service variables into it.
For a new checkout, copy `.env.example` only if no environment file exists, then
link the existing project and run `neon deploy`. Complete CLI login in the browser
when requested. `.neon`, credentials, backups and test artifacts are ignored.

| Variable                                  | Purpose                                                                 |
| ----------------------------------------- | ----------------------------------------------------------------------- |
| `DATABASE_URL`                            | Neon pooled runtime connection                                          |
| `DATABASE_URL_UNPOOLED`                   | Direct Prisma migration/operations connection                           |
| `NEON_BRANCH`                             | Branch selected by Neon CLI                                             |
| `NEON_AUTH_BASE_URL`                      | Server-only managed Auth endpoint                                       |
| `NEON_AUTH_JWKS_URL`                      | Pulled service metadata; not needed for cookie-based app authentication |
| `NEON_AUTH_COOKIE_SECRET`                 | Locally generated random signing secret, at least 32 characters         |
| `APP_ORIGIN`                              | Exact application origin, locally `http://127.0.0.1:3000`               |
| `DIRECT_URL`                              | Optional explicit local/CI migration override; normally leave unset     |
| `IMAGE_WORKER_URL`, `IMAGE_WORKER_SECRET` | Private image Worker endpoint and shared capability secret              |
| `CRON_SECRET`                             | Bearer secret for scheduled maintenance                                 |
| `GEONAMES_USERNAME`                       | GeoNames account with free web services enabled                         |

Runtime uses Prisma 7 and `pg`, maximum five connections per app instance, with
Vercel pool lifecycle integration. Review aggregate concurrency against Neon limits.
Prisma CLI prioritizes `DIRECT_URL`, then `DATABASE_URL_UNPOOLED`, then
`DATABASE_URL`. A stale local `DIRECT_URL` can migrate the wrong database; remove
it when switching to Neon, while keeping explicit isolated-test overrides.
Review and apply `npm run db:deploy` as a separate operation. Builds only generate
the client. The initial and identity-fence migrations were applied to the empty
`public` schema; the existing managed `neon_auth` schema was preserved.

## Managed sign-in

The app uses `@neon/auth` for Google and email/password sign-up/sign-in.
Passwords and sessions are managed by Neon, not by the app's Prisma adapter.
No direct Google credentials are needed in Next.js environment variables.
Register exact application origins with Neon Auth; the local origin above was
added using `neon neon-auth domain add http://127.0.0.1:3000`.
Keep the Worker's `APP_ORIGIN` aligned. With an HTTP loopback origin, both
`localhost` and `127.0.0.1` at the same port are accepted by the app and Worker;
hosted origins remain exact. Changing to a production origin still requires
updating both configurations.

Current branch configuration: email/password enabled, registration open, email
verification not required, no signup email. Shared SMTP and Google credentials
are development facilities. Before production configure own Google OAuth app,
custom SMTP, a deliberate verification/recovery flow and the actual deployment
origin. Configure providers in Neon; use the callback URL supplied by Neon,
not the old application-hosted Better Auth callback. Real Google consent was
not exercised during this setup. Do not enable verification without adding and
testing the corresponding UI. Password reset is a remaining release task.

## Real-service verification

After `npm run build` succeeds, run `npm start`. In another terminal use:

```sh
npm run verify:neon -- --confirm
```

This opt-in smoke requires the local loopback app and real Neon env variables.
It creates one disposable managed email identity and globe, verifies sessions,
persistence, publication and revocation, and deletes its own identity through
CLI. It never resets the remote database. Test artifacts remain ignored; it
removes temporary credentials after successful provider cleanup. This is separate
from `npm test` and Playwright's isolated local service fakes.

To verify real GeoNames autocomplete without touching the Neon production data,
start the isolated local test database and opt in explicitly:

```sh
GLOBEALBUM_LIVE_GEONAMES_USERNAME=your_username npm run test:e2e -- --project=desktop -g "finds city coordinates"
```

This routes the browser's search through the application to the actual GeoNames
service and persists the selected city in local `*_test` PostgreSQL. Auth and
photo processing remain localhost test doubles. Normal browser runs leave this
variable unset and use deterministic search fixtures. The provided account was
verified successfully on 2026-11-06; no paid GeoNames plan was activated.

## Managed identity deletion

Application deletion immediately hides/removes ownership data and leaves a
`DeletedIdentity` row. This fence is checked when synchronizing every authenticated
identity, including stale cookies. Its `authDeletedAt = NULL` records pending
provider deletion. The current managed `/delete-user` endpoint returns 404.
The app attempts deletion, signs out, and retains work on provider failure.

Until a supported automated path is wired, an authenticated operator reviews
pending rows and runs:

```sh
npm run auth:cleanup -- --confirm
```

This script checks CLI branch/database alignment, removes only identities from
pending deletion rows through Neon CLI, verifies absence in `neon_auth`, and marks
completion. It keeps the opaque fence and retired usernames. No Neon control-plane
API key is stored in the application or Vercel. This operator requirement must be
resolved/accepted before beta; daily R2 maintenance does not drain this queue.

## Existing Cloudflare resources

Created with the user's authorization after they manually activated R2:

- Private Standard R2 bucket: `globealbum-photos`, WEUR location hint.
- Worker: `globealbum-images`.
- URL: `https://globealbum-images.matejbendik-mb.workers.dev`.
- Bindings: `PHOTOS` (R2), `IMAGES` (Images), `APP_ORIGIN` (allowed browser origin).
- Secret: `IMAGE_WORKER_SECRET`, shared with the Next.js server.
- Bucket lifecycle: delete `quarantine/` objects and abort multipart uploads after one day.
- No public bucket domain, no Images Paid or Workers Paid upgrade.

The Next.js application does not need S3 access keys. It grants short-lived
upload/read capabilities and uses the protected Worker control interface.
Browser CORS belongs on `/upload` in the Worker; browser requests do not go
directly to the R2 S3 endpoint.

For reviewed Worker changes:

```sh
npm run worker:check
npx wrangler deploy --config worker/wrangler.jsonc
```

Provision its required secret with Wrangler's interactive secret command or an
ignored, restricted secret file. Never pass a literal secret in command history.
Local Worker development uses ignored `worker/.dev.vars`; see its example file.

Cloudflare agent skills and the Cloudflare MCP connection were installed and
authorized. A fresh Codex session may be needed to expose newly added tools.
Wrangler is already authenticated; do not extract or repurpose its OAuth tokens.

## Maintenance and deletion

`vercel.json` schedules `/api/maintenance` daily at 03:00 UTC. Configure
`CRON_SECRET` before enabling a deployment. The route requires its bearer secret.
It expires abandoned uploads and retries durable deletion work. Each run has a
bounded batch; monitor the oldest due job, attempts, and accounted byte totals.
Run additional authenticated batches if a deletion backlog grows. A stalled
cleanup job deliberately retains its storage reservation.

Source deletion waits until the five-minute upload capability plus a safety
margin has elapsed, preventing replay from recreating an already-cleaned key.
Until scheduled maintenance runs, the private source can remain in quarantine;
the one-day bucket lifecycle provides a second cleanup path.

## Vercel release gate

Vercel is the approved Next.js host. Do not silently switch hosts or buy Pro.
Resolve Hobby's non-commercial eligibility, configure production-only secrets,
Neon trusted origins, production OAuth/SMTP, connections, Worker origin, cron, and usage monitoring,
then run the release checks. Deployment requires a separate user instruction.

Primary references, verified 2026-11-05:

- https://better-auth.com/docs/authentication/google
- https://better-auth.com/docs/integrations/next
- https://neon.com/docs/guides/prisma
- https://developers.cloudflare.com/workers/wrangler/commands/#deploy
- https://developers.cloudflare.com/r2/buckets/object-lifecycles/
- https://vercel.com/docs/cron-jobs
- https://vercel.com/docs/limits/fair-use-guidelines#commercial-usage
