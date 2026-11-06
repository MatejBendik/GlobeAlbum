# GlobeAlbum

A private travel collection presented as a shareable dotted globe.
English application interface; project conversation in Slovak.

## Current status

The MVP application and local tests are implemented. A private R2 bucket and
Cloudflare Images Worker are deployed. **Public beta is not ready:** real HEIC
processing currently fails with Cloudflare internal error `9516`; Google OAuth,
Neon, physical devices, and Vercel release checks are still outstanding.
See [verification evidence](docs/validation.md) and [setup](docs/setup.md).

## Local development

Use Node 24 (`nvm use` when available), then:

```sh
npm ci
npm run db:local
npm run db:deploy
npm run dev
```

`db:local` uses an existing PostgreSQL installation. On this Mac it defaults to
Homebrew PostgreSQL 15; set `POSTGRES_BIN` elsewhere. It creates an isolated
cluster on `127.0.0.1:54329`, separate development/test databases, and ignored
local credentials. It never replaces an existing `.env.local`.

Open [the example collection](http://127.0.0.1:3000/demo) without credentials.
The editor uses real Google authentication; there is no development auth bypass.
Configure the environment using [the setup guide](docs/setup.md).

## Verification

```sh
npm run format:check
npm run typecheck
npm run worker:check
npm test
npm run test:e2e
npm run build
```

Integration/browser tests require the isolated local `*_test` database and may
erase its contents. Stop the ordinary Next.js dev server before browser tests
or a production build; Next owns its build directory. Install the test browser
once with `npx playwright install chromium`. Browser sessions in tests are seeded
in the test database, not obtained through Google.
Browser upload tests use a local storage/processing test double on port 8787;
real Cloudflare decoding remains a separate opt-in smoke test and release gate.

The opt-in cloud smoke writes disposable fixtures to the configured R2 bucket:

```sh
node --conditions=react-server --import tsx scripts/cloud-smoke.ts --confirm
```

The full command must pass before beta. `--skip-heic` checks the remaining flow
while explicitly recording HEIC as unverified. It is not a release pass.
Reports/screenshots and secrets remain under ignored local paths.

## Project documentation

- [Approved specification](docs/work/mvp/spec.md)
- [Documentation index](docs/README.md)
- [Architecture and privacy](docs/architecture.md)
- [Local delivery tracker](docs/work/mvp/issues/)
- [Third-party notices](docs/third-party-notices.md)
