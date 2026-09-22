#!/usr/bin/env python3
from pathlib import Path
import sys

root = Path(__file__).resolve().parents[1]
required = [
    "AGENTS.md",
    "docs/AS_CONTEXT_BOOTSTRAP_v0.1.md",
    "docs/AS_CONCEPT_RECONSTRUCTION_TEST_v0.1.md",
]
invariants = [
    "Другой — реален",
    "Reality = Model + Residual",
    "UNKNOWN != ABSENT",
    "NOT_TESTED != FALSE",
    "ACCESS_FAILURE != OBJECT_ABSENCE",
    "AGENT_ASSERTION != PRIMARY_EVIDENCE",
    "GITHUB_CANON != GITVERSE_WORKSPACE",
    "IMPLEMENTED != VERIFIED",
    "SELF_TEST != INDEPENDENT_VERIFICATION",
]
errors = []

for rel in required:
    if not (root / rel).is_file():
        errors.append(f"MISSING_REQUIRED_FILE: {rel}")

agents = (root / "AGENTS.md").read_text(encoding="utf-8")
for item in invariants:
    if item not in agents:
        errors.append(f"MISSING_INVARIANT: {item}")

if "A reconstruction failure blocks implementation" not in agents:
    errors.append("MISSING_RECONSTRUCTION_GATE")

if errors:
    print("\n".join(errors))
    sys.exit(1)

print("AGENT_INTEGRITY_CHECK: PASS")
print(f"Checked {len(required)} mandatory files and {len(invariants)} invariants.")
