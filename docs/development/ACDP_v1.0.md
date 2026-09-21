# ACDP v1.0

## Purpose

AI Cooperative Development Protocol coordinates iterative work between a coding agent and an independent reviewer while keeping the human in control of canon, ethics, major architecture, and integration.

## Cycle

1. Observe
2. Understand
3. Collect evidence
4. Propose
5. Verify
6. Adversarial review
7. Feedback
8. Revise and re-test
9. Final verification
10. Integration gate
11. Learn

## Evidence states

- OBSERVED: directly observed in code, test output, repository state, or other concrete evidence.
- DERIVED: logically inferred from observed material.
- CLAIMED: asserted but not yet verified.

## Integration gate

Integration requires PASS for understanding, canon, architecture, functionality, regression, evidence, and process. Any mandatory UNVERIFIED item prevents a confirmed integration. Any FAIL requires revision. Human approval is required for protected conceptual or irreversible decisions.

## Failure taxonomy

- F01 misunderstanding
- F02 missed existing implementation
- F03 incorrect assumption
- F04 conceptual drift
- F05 terminology drift
- F06 architecture violation
- F07 functional bug
- F08 regression
- F09 insufficient test
- F10 unsupported claim
- F11 unnecessary change
- F12 protocol violation
- F13 security issue
- F14 documentation inconsistency

Recurring failure classes may become proposed process constraints, but are not automatically canonized.

## Learning cycle

OBSERVATION, PATTERN, PROPOSAL, REVIEW, ACCEPTED RULE.

An accepted process rule does not automatically change philosophical canon.
