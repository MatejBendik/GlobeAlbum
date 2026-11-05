# Domain documentation

## Layout and reading rules

This project has a single domain context:

- Root `GLOSSARY.md` contains agreed domain terms.
- `docs/adr/NNNN-<decision>.md` contains significant decision records.

Before exploring or changing a domain concept, read the glossary if present and ADRs relevant to that area. Missing files are expected during early discovery; proceed without creating empty placeholders.

Use agreed terms consistently in documentation, ticket titles, and later code. Surface contradictions with the glossary or existing ADRs before changing the model.

## Writing rules

- Apply `domain-modeling` during discovery. Record a term when its meaning is resolved; use the skill's glossary format.
- Keep definitions free of implementation details, tentative requirements, and interview notes. Pending terms belong in `docs/discovery.md`.
- Create an ADR sparingly: the decision must be costly to reverse, surprising without context, and based on a real trade-off. Use the skill's ADR format.
- Record routine product agreements in `docs/discovery.md` and the relevant product document. Do not create an ADR for every answer.
- Mark proposals as proposals. Record user confirmation and its date before treating a product choice as accepted.
