# Implementation checkpoint

Updated: 2026-11-06. Read the specification and ticket evidence for requirements;
this checkpoint records execution state for resuming interrupted work.

## Verified locally

- Application and Worker TypeScript checks pass; production Next.js build passes.
- 28 Vitest tests pass against the isolated local PostgreSQL test database.
- 12 Playwright scenarios pass across desktop and Pixel Chromium emulation.
- The three-file upload scenario covers an injected failure, cancellation,
  successful transfer and retry, resulting in exactly two ready photographs.
- Cancellation cleanup now shares one promise between the button and aborted
  request, preventing duplicate deletion and a misleading warning.
- Actual production-build demo/globe/gallery inspected at `http://127.0.0.1:3000/demo`.
- Prettier is the repository formatter. Code and documentation are committed and
  pushed to `origin/main`; consult Git for the current commit.

## Services and release gates

- Private R2 bucket and `globealbum-images` Worker exist in the user's Cloudflare
  account. Required secret is configured locally and in the Worker, never in Git.
- Actual PNG processing, immutable upload, bounded image links and physical
  cleanup passed on 2026-11-05. A 2026-11-06 repeat again completed PNG but failed
  at HEIC with application status 503. Earlier provider diagnostics recorded 9516.
- **Confirmed:** keep Cloudflare; functioning HEIC remains mandatory before beta.
- Google OAuth, Neon and GeoNames credentials are not configured. Development
  currently uses an isolated local PostgreSQL cluster, not a provisioned Neon.
- Browser storage/processing is a local test double; it does not prove image
  conversion, real Google sign-in or physical mobile-device compatibility.
- No Vercel application deployment or paid upgrade has been performed. Current
  authorization covers implementation and the existing Cloudflare resources.

## Resume here

Use Node 24. Review [verification](../../validation.md) and [setup](../../setup.md)
before service configuration. Preserve the current Cloudflare architecture and
remaining release gates. Do not mark the beta complete because local tests pass.

Stop an ordinary Next.js server before `npm run test:e2e` or `npm run build`.
Playwright starts its own Next.js server (3100) and local storage double (8787),
then stops both. Its guarded setup resets only the isolated local `*_test` DB.
Never run Vitest database tests and Playwright simultaneously against that DB.
The optional cloud smoke uses disposable records in the local development DB;
its source cleanup deliberately waits until upload capabilities expire.
