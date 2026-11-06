# Approved discovery outcome

Phase: implementation authorized. All product decisions and the 11-ticket breakdown were confirmed in chat. The authoritative specification is [the MVP specification](work/mvp/spec.md).

Final changes superseding initial assumptions: open Google registration (no invitations), 50 photos/account, 100 places, 300 visits, immutable username URLs, Vercel hosting, manual missing-place entry, no original retention, HEIC support and no live visitor updates. Default triage labels are confirmed.

Subsequent user instructions authorize implementation, dependencies, regular commits/pushes and the required Cloudflare resources. The user manually activated R2 billing. Vercel deployment and paid upgrades remain separate decisions. The user requested frontend file-size validation through React Hook Form and Zod, now implemented.

On 2026-11-05 real Cloudflare HEIC operations failed with internal error 9516 while PNG succeeded. The user explicitly confirmed retaining Cloudflare and keeping working HEIC as a beta release gate. See [verification evidence](validation.md). No processor replacement is approved.

On 2026-11-06 the user explicitly requested the existing Neon project
`bitter-river-07504050`, branch `production`, Postgres plus managed Auth, and
email/password registration in addition to Google. This supersedes Google-only
application-hosted authentication. No paid upgrade or Vercel deployment is
included. See [ADR 0005](adr/0005-managed-neon-auth.md) and the
[Neon setup change log](neon-setup.md) for actual CLI changes and limitations.

The original discovery record below is retained for history, not as current requirements.

---

# GlobeAlbum discovery

Last updated: 2026-11-05.
Phase: discovery and design.
Product decisions: pending the first interview round.

## Confirmed instructions

- Working project name: GlobeAlbum.
- Communicate in Slovak; write code identifiers and technical documentation in English.
- Prefer local Markdown for MVP specifications and tasks.
- Keep `AGENTS.md` concise and link to documentation.
- Use installed Matt Pocock skills, beginning with `setup-matt-pocock-skills` and `grill-with-docs`.
- Research the preferred stack critically using current official documentation.
- Documentation is authorized. Application implementation, dependency installation, cloud provisioning, and purchases are outside the current phase.
- User confirmation of shared understanding is required before `to-spec`. Use `to-tickets` afterward, then wait for an explicit implementation instruction.

## Starting state

Inspected on 2026-11-05: the project directory was empty, with no Git repository, project instructions, application files, or installed project dependencies. No existing project work was overwritten. Git has not been initialized.

## Working product idea — not approved requirements

A personal travel album presented as an interactive 3D globe. Geographic photo markers could resemble small postcards or Polaroids. Selecting a place could open its gallery with arrows, keyboard navigation, and mobile gestures. Optional metadata could include place name, country, date, and a short description. A profile could display visited place and country counts and have a public sharing link.

Tentative journey: register → create profile and globe → add place and photos → preview → publish and share → visitor browses without registration. Every step remains open to simplification.

Interaction references: Marc Lou's portfolio globe and a dark dotted globe. Create original design and content. Visual direction proposed by the user: restrained black, white and neutral colors; subtle gradients, inner highlights, thin borders and layered shadows; photos and globe as the visual focus; strong mobile interaction. Clerk's landing page and AlignUI Fancy Button are references, not selected dependencies.

## Evidence labels

- **Confirmed instruction / decision**: explicitly supplied or accepted by the user.
- **Proposal**: an assistant recommendation awaiting the user's decision.
- **Working assumption**: temporary premise, with its effect stated.
- **Verified fact**: supported by a primary source, with URL and verification date.
- **Open question**: unresolved product choice or unverified technical claim.

No technology or provider has been selected. No current compatibility or price claims have been verified yet.

## Design tree and open decisions

| Branch              | Questions                                                                                        | Dependency                                   |
| ------------------- | ------------------------------------------------------------------------------------------------ | -------------------------------------------- |
| Audience and value  | First user, recurring problem, reason to choose this over a map or album, route to first testers | First round                                  |
| Globe ownership     | One globe or multiple; profile/globe relationship                                                | First round; revisit against target audience |
| Privacy intent      | Private album, public showcase, or both; intended sharing behavior                               | First round                                  |
| Content model       | Place vs visit vs trip; repeat visits; photo membership; country counting and manual corrections | Audience and globe ownership                 |
| Publishing          | Drafts, visibility levels, visitor metadata, revocation, private originals, location precision   | Privacy intent and content model             |
| MVP boundaries      | Essential journeys, editing/deletion, account lifecycle, embedding, deferred features            | Audience, content model and publishing       |
| Limits and business | Users, photo count/size/storage, quotas, monetization timing, budget                             | Intended use and service/cost research       |
| Technical choices   | Data boundaries, stack, authentication, upload/processing, globe, geography, hosting             | Product needs and primary-source research    |
| Validation          | User outcomes, acceptance criteria, mobile/accessibility/performance checks                      | Agreed scope and technical risks             |

## Round 1 — awaiting answers

### W1 — Workflow labels

Keep the default triage labels? Recommendation: yes — `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`. This selects a local ticket vocabulary only.

### P1 — First user and motivation

Start with an individual traveler who wants to share a curated visual story of visited places with friends or on a personal profile? Recommendation: yes. This is a clearer initial use than a full photo archive or a planning tool. Ask the user to name a concrete first user, their present workaround, and why they would switch.

### P2 — Number of globes

Start with one globe per account? Recommendation: yes. It reduces management and sharing complexity; separate trip or themed globes remain a possible later extension. This does not decide how visits or trips are modeled.

### P3 — Privacy intent

Make an intentionally selected, shareable travel collection the initial product purpose? Recommendation: yes, with unpublished content private by default and publication as an explicit action. This defers the broader needs of a private photo archive. Publishing scope, link discoverability, visitor metadata, and revocation still need their own decisions.

All recommendations in this round are pending. The next frontier must be recomputed from the user's answers.

## Main risks to investigate

- The globe may attract attention without solving a strong enough user problem.
- Too many photos or markers may obscure the globe and reduce mobile usability.
- Photo ingestion requires validation, processing, variants, cleanup, abuse controls, and deliberate EXIF handling.
- Publication and private storage need a consistent authorization and revocation model.
- State and caching libraries may add unnecessary synchronization complexity to a small MVP.
- Country counts and place search require explicit geographic semantics, licensing, and correction rules.
- Storage is only part of operating cost; processing, delivery, authentication email, hosting, and abuse can matter.

## Completion gate

Before requesting confirmation of shared understanding, prepare a product brief, explicit MVP/deferred scope, primary user scenarios, justified stack, architecture and data model, photo lifecycle, privacy/authorization rules, acceptance criteria and validation plan, cost assumptions, risks, and a list of outstanding user decisions. Do not treat a recommendation or an unanswered question as approved.
