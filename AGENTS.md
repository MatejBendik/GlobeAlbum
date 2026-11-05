# GlobeAlbum

## Working rules

- Current phase: implementation, explicitly authorized after approval of the MVP specification and 11-ticket plan. Local dependencies, code, documentation, and verification are authorized. The user subsequently authorized creating the required free Cloudflare resources using CLI or browser. Do not enable paid plans, purchase anything, or deploy to Vercel without a separate instruction.
- Communicate with the user in Slovak. Write code identifiers and technical documentation in English.
- Preserve existing work. Inspect relevant files before changing them.
- Commit coherent, verified increments and push to `origin/main`; the user explicitly authorized local Git and GitHub CLI. Keep local secrets and runtime data ignored.
- Use the repository's Prettier configuration (matching the user's VS Code formatter). Format changed files before checks and commits; write readable multi-line code.
- Keep user-confirmed decisions separate from recommendations, assumptions, verified facts, and open questions.
- Research technical facts using current primary documentation; record source URLs and the verification date. Product decisions belong to the user.
- Read `docs/work/mvp/spec.md` before changing application behavior. Preserve the approved scope; record material deviations and unresolved verification honestly.
- Update ticket acceptance evidence as work progresses. A configured integration is not an end-to-end verified cloud integration.

## Agent skills

### Issue tracker

Use local Markdown under `docs/work/<feature>/`; read `docs/agents/issue-tracker.md` before creating or updating specs or tickets.

### Triage labels

Default labels are confirmed. Read `docs/agents/triage-labels.md` before assigning a triage status.

### Domain docs

Use a single domain context: root `GLOSSARY.md` and `docs/adr/`, created when terms or significant decisions are resolved. Read `docs/agents/domain.md` before domain work.

## Documentation

Read `docs/README.md` to locate product, research, architecture, and delivery documents. For stack, geographic data, photo processing, UI compatibility, or cost research, first read `docs/research/README.md`.
