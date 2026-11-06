# Development and service setup

Updated: 2026-11-05. No application deployment to Vercel has been performed.

## Environment

Copy `.env.example` to `.env.local` only when it does not already exist.
Keep all credentials out of Git and chat. Environment values are server-only;
none of these secrets uses a `NEXT_PUBLIC_` prefix.

| Variable                                   | Purpose                                                                           |
| ------------------------------------------ | --------------------------------------------------------------------------------- |
| `DATABASE_URL`                             | PostgreSQL runtime URL; Neon pooled URL in hosted environments                    |
| `DIRECT_URL`                               | Separate migration connection, used by Prisma CLI                                 |
| `BETTER_AUTH_SECRET`                       | Random authentication signing secret, at least 32 characters                      |
| `BETTER_AUTH_URL`                          | Exact application origin, including development hostname                          |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | Google web OAuth client                                                           |
| `IMAGE_WORKER_URL`                         | Deployed image Worker URL                                                         |
| `IMAGE_WORKER_SECRET`                      | Shared server/Worker capability and control secret, at least 32 random characters |
| `CRON_SECRET`                              | Random bearer secret for maintenance                                              |
| `GEONAMES_USERNAME`                        | GeoNames account with free web services enabled                                   |

Use `http://127.0.0.1:3000` consistently for local development. The application's
origin and the Worker's `APP_ORIGIN` must match exactly; `localhost` is a
different origin. Update both together when changing hosts or deploying.

## Google sign-in

Create/configure a Google OAuth web client in the user's Google Cloud project.
Set the consent screen, authorized app origin, and redirect URI:
`{BETTER_AUTH_URL}/api/auth/callback/google`.
External Google consent-screen testing restrictions are separate from the
application's open registration policy. Complete the required Google publishing
configuration before calling registration open to everyone.
No application email provider is needed for this Google-only flow.

The sign-in page intentionally disables sign-in when credentials are absent.
Do not add fake accounts or paste secrets into committed examples.

## Database

Use an existing/local PostgreSQL for development. Production targets Neon Free.
Use the Neon pooled hostname at runtime; configure the direct migration URL
separately. Review and apply `npm run db:deploy` as an explicit release step.
Ordinary builds only generate the Prisma client, never apply migrations.
Local Prisma driver pool maximum is five connections per application instance;
validate aggregate concurrency against the selected Neon plan before release.

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
Google callbacks, Neon connections, Worker origin, cron, and usage monitoring,
then run the release checks. Deployment requires a separate user instruction.

Primary references, verified 2026-11-05:

- https://better-auth.com/docs/authentication/google
- https://better-auth.com/docs/integrations/next
- https://neon.com/docs/guides/prisma
- https://developers.cloudflare.com/workers/wrangler/commands/#deploy
- https://developers.cloudflare.com/r2/buckets/object-lifecycles/
- https://vercel.com/docs/cron-jobs
- https://vercel.com/docs/limits/fair-use-guidelines#commercial-usage
