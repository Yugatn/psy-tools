# AGENTS.md

## AI Cooperative Development Protocol

This repository uses COPILOT_CONTEXT_PROTOCOL v1.0 together with ACDP v1.0 (AI Cooperative Development Protocol).

### Role of AI agents

AI agents are implementation and research assistants. They are not autonomous authorities over the project's conceptual canon, ethics, or irreversible architecture.

### Canon hierarchy

- CANON: explicitly accepted project principle or definition.
- DERIVED: logically derived from accepted material; not canon until accepted.
- PROPOSAL: new candidate idea or implementation.
- REJECTED: previously considered and rejected.
- UNCERTAIN: not established by available evidence.
- QUESTION: intentionally unresolved.

Never silently promote DERIVED, PROPOSAL, UNCERTAIN, or QUESTION material to CANON.

### Required context

Before conceptual or architectural work, read the relevant files under `docs/concept/`. In particular, consult `00_CANON.md`, `01_AXIOMS.md`, `02_TERMINOLOGY.md`, `07_NON_NEGOTIABLES.md`, and `08_CHANGE_PROTOCOL.md` when they exist.

If required context is absent or contradictory, record the gap instead of inventing a resolution.

### Proposal isolation

Proposal work must be isolated from `main`. Use a dedicated branch and, when useful, `.ai-work/proposals/PROP-*` for evidence and candidate artifacts. Do not modify production code merely to investigate an idea.

### Engineering rules

1. Inspect existing code before proposing replacement code.
2. Prefer minimal, local changes over unrelated refactoring.
3. Do not perform destructive cleanup without explicit review.
4. Do not silently change public behavior, terminology, or architecture.
5. Separate detection, interpretation, and intervention where those distinctions are part of the project's design.
6. Every important factual claim should have evidence.
7. `UNKNOWN` or `UNVERIFIED` is neither proof of correctness nor proof of failure.

### ACDP lifecycle

INVESTIGATE, PROPOSE, REVIEW, REVISE, VALIDATE, APPROVE, INTEGRATE, LEARN.

A proposal may return to REVIEW or INVESTIGATE at any point. A failed gate blocks integration.

### Validation gates

A change is integration-ready only when understanding, canon compatibility, architecture, functionality, regression safety, evidence, and process compliance have been explicitly checked.

Human approval is required for conceptual changes, ethical changes, irreversible architectural changes, and integration of protected project material.

### Final report

Every completed proposal should report STATUS, CHANGES, TESTS, CONCEPTUAL IMPACT, ARCHITECTURAL IMPACT, RISKS, QUESTIONS, and NEXT STEP.
