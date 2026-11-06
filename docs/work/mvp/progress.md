# Implementation checkpoint

Updated: 2026-11-06. Read the specification and ticket evidence for requirements;
this checkpoint records execution state for resuming interrupted work.

## Verified locally

- Application and Worker TypeScript checks pass; production Next.js build passes.
- 42 Vitest tests pass against the isolated local PostgreSQL test database.
- 39 Playwright scenarios pass across desktop and Pixel Chromium emulation;
  the desktop-only pointer-hover case is intentionally skipped on mobile.
- Owned Google OAuth credentials are configured in Google Cloud and Neon. The
  real consent callback hit an existing-email conflict; explicit linking UI and
  failure handling are implemented/tested. Real linking and returning Google
  sign-in await an authenticated session in the controlled Dia tab.
- Shared primary-button hover no longer changes its fill, including login/signup.
- City autocomplete is keyboard accessible and the user's GeoNames account is
  configured locally. An opt-in browser run verified actual provider search and
  selected-city persistence in isolated PostgreSQL.
- Saving a place leads directly to optional photos in the same dialog. Separate
  file selections and later batches append photos, with singular/plural copy.
- Larger 130px postcards retain readable zoom dimensions; visual-only hover
  enlargement and layer ordering preserve image clicks over dense dot markers.
- Profile settings are a standalone authenticated `/settings` page, with persisted
  display-name editing, a fixed globe URL, private email and account controls.
  The former modal URL redirects; desktop/mobile and light/dark are verified.
- Full-width centered globe, closable right-hand places list, direct landing-photo
  galleries and signed-in account navigation are implemented and browser verified.
- Light is the default, including the actual white globe; dark mode persists per
  browser. Portrait camera framing fits the globe within a narrow viewport.
- Globe URLs are generated from display names with a read-only preview; visits
  have one optional date, and missing cities are positioned on a map.
- JPEG previews, removal/reselection and the localhost upload regression are covered.
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
- Real JPEG upload from localhost, conversion and private WebP reads passed after
  deploying Worker `0615b2bb-df2b-4bbe-b988-ea785c5f9780`; test objects removed.
- **Confirmed:** keep Cloudflare; functioning HEIC remains mandatory before beta.
- Neon production is linked and migrated; real managed email signup/session and
  persisted globe/place flows pass. User explicitly added email/password alongside
  Google. See [Neon changes](../../neon-setup.md) and ADR 0005.
- Managed self-deletion returns 404; a durable identity fence revokes app access
  and operator `auth:cleanup` removes the provider identity. Automation remains gated.
- Real Google consent, production auth email/recovery and GeoNames remain unverified.
- Browser storage/processing is a local test double; it does not prove image
  conversion, real Google sign-in or physical mobile-device compatibility.
- No Vercel application deployment or paid upgrade has been performed. Current
  authorization covers implementation, Cloudflare resources and the existing Neon project.

## Resume here

Use Node 24. Review [verification](../../validation.md) and [setup](../../setup.md)
before service configuration. Preserve the current Cloudflare architecture and
remaining release gates. Do not mark the beta complete because local tests pass.

Stop an ordinary Next.js server before `npm run test:e2e` or `npm run build`.
Playwright starts its own Next.js server (3100), storage double (8787) and
managed Auth contract fake (8788), then stops them. Its guarded setup resets only the isolated local `*_test` DB.
Never run Vitest database tests and Playwright simultaneously against that DB.
The optional cloud smoke uses disposable records in the local development DB;
its source cleanup deliberately waits until upload capabilities expire.
