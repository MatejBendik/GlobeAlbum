# GlobeAlbum documentation

Status: discovery and design. No application implementation is authorized.

## Current documents

- [Discovery](discovery.md): confirmed constraints, working product idea, design questions, and interview rounds.
- [Research plan](research/README.md): required technical investigations and evidence rules.
- [Issue tracker](agents/issue-tracker.md): local specification and ticket conventions.
- [Domain documentation](agents/domain.md): glossary and decision record conventions.
- [Triage labels](agents/triage-labels.md): proposed status vocabulary awaiting confirmation.

## Planned documents

Create these when there is substantive content; an entry here does not mean a decision has been made.

| Location                          | Purpose                                                                                         |
| --------------------------------- | ----------------------------------------------------------------------------------------------- |
| `../GLOSSARY.md`                  | Agreed domain vocabulary, without implementation details                                        |
| `adr/NNNN-<decision>.md`          | Significant decisions with context and alternatives                                             |
| `product.md`                      | Target user, problem, value, MVP boundaries, deferred features, user scenarios                  |
| `architecture.md`                 | Recommended stack, component boundaries, data model, photo lifecycle, privacy and authorization |
| `validation.md`                   | Acceptance criteria, proportionate validation plan, unresolved risks                            |
| `research/stack.md`               | Technology comparison with current official sources                                             |
| `research/globe-and-geography.md` | Globe libraries, place search, country data, licensing and limits                               |
| `research/costs.md`               | Hosting choices, service inventory, beta and growth cost assumptions                            |
| `work/mvp/spec.md`                | Final specification produced through `to-spec` after user confirmation                          |
| `work/mvp/issues/NN-<slug>.md`    | Individual implementation tickets produced through `to-tickets`                                 |

Discovery notes are provisional. Final specification and implementation tickets have separate user gates; see `AGENTS.md`.
