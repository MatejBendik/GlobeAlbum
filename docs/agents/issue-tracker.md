# Issue tracker: Local Markdown

Confirmed by the user's initial instruction: MVP specifications and tasks live in local Markdown. This repository uses `docs/work/` instead of the skill template's `.scratch/` to keep project documentation together.

## Conventions

- One feature per directory: `docs/work/<feature-slug>/`.
- Final specification: `docs/work/<feature-slug>/spec.md`.
- Implementation tickets: one file per ticket at `docs/work/<feature-slug>/issues/<NN>-<slug>.md`, numbered from `01`.
- Each ticket has a title, `Type:`, `Status:`, dependencies, intended user-visible outcome, acceptance criteria, and necessary validation.
- Ticket comments append under `## Comments`.
- Use relative links between related documents and tickets.
- Read `triage-labels.md` before assigning a triage role. A ticket status never overrides the project's implementation gate.

## Skill operations

- "Publish to the issue tracker": create or update the appropriate local file. Do not create remote issues.
- "Fetch the relevant ticket": read the referenced file or locate its number in the feature's `issues/` directory.
- `to-spec`: wait for explicit confirmation of shared understanding before writing the final specification.
- `to-tickets`: follow the final specification with small vertical slices that progressively deliver a working application, rather than isolated technical layers.
- Creating tickets does not authorize implementation. Wait for the user's explicit instruction after the specification and tickets are prepared.

If wayfinding is needed later, use `docs/work/<effort>/map.md` with individual child tickets, `Blocked by:` links, and `claimed` / `resolved` execution states. These execution states are distinct from triage roles.
