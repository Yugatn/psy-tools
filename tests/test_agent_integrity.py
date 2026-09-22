from pathlib import Path
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[1]

def test_required_context_files_exist():
    for rel in (
        "AGENTS.md",
        "docs/AS_CONTEXT_BOOTSTRAP_v0.1.md",
        "docs/AS_CONCEPT_RECONSTRUCTION_TEST_v0.1.md",
        ".github/workflows/agent-integrity-check.yml",
        "scripts/verify_agent_integrity.py",
    ):
        assert (ROOT / rel).is_file(), rel

def test_integrity_verifier_passes():
    result = subprocess.run(
        [sys.executable, str(ROOT / "scripts/verify_agent_integrity.py")],
        capture_output=True,
        text=True,
        check=False,
    )
    assert result.returncode == 0, result.stdout + result.stderr
    assert "AGENT_INTEGRITY_CHECK: PASS" in result.stdout
