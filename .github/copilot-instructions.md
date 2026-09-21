# Copilot Instructions

This repository follows COPILOT_CONTEXT_PROTOCOL v1.0 and ACDP v1.0.

## Before changing anything

1. Read `AGENTS.md`.
2. Read the relevant files in `docs/concept/`.
3. Inspect the existing implementation and tests.
4. Identify assumptions and record important evidence.
5. Detect conflicts before proposing a solution.

## Working mode

For non-trivial work, investigate first and produce a proposal before changing production code. Use an isolated branch. Store proposal evidence in `.ai-work/proposals/PROP-*` when appropriate.

Do not silently redefine canonical concepts. If implementation and canon conflict, stop the affected change and report the conflict.

## Classification

Mark findings as `CANON`, `DERIVED`, `PROPOSAL`, `REJECTED`, `UNCERTAIN`, or `QUESTION`.

## Review discipline

Actively search for incorrect assumptions, missed existing components, edge cases, unmet requirements, conceptual drift, terminology drift, unnecessary changes, insufficient tests, and unsupported claims.

Technical elegance alone is not sufficient for acceptance.

## Public conceptual documentation

Preserve the project's accessibility convention: use ordinary verbal relations and punctuation rather than arrow symbols in public conceptual prose.

## Completion

Do not report a change as validated unless the relevant tests and evidence have actually been checked.
