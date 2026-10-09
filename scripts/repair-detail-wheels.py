#!/usr/bin/env python3
"""Repair detail-* syntax: orphan drawWheel brace + corrupted share/calendar block."""
import base64, gzip
from pathlib import Path

ORPHAN_OLD = """}

    updateDetailLinks();
}

function hasMeaningfulContent"""

ORPHAN_NEW = """    updateDetailLinks();
}

function hasMeaningfulContent"""

def main() -> None:
    b64_path = Path("payloads/detail-share-calendar-block.gz.b64")
    block = gzip.decompress(base64.b64decode(b64_path.read_text().strip())).decode("utf-8")
    assert "function buildShareMessage" in block
    assert "function renderCalendar" in block
    n_brace = n_share = 0
    for f in Path("wheel").rglob("index.html"):
        text = f.read_text(encoding="utf-8")
        changed = False
        if ORPHAN_OLD in text:
            text = text.replace(ORPHAN_OLD, ORPHAN_NEW)
            n_brace += 1
            changed = True
        # Corrupted share message merges into calendar mid-function
        if "function buildShareMessage()" in text and "< 0) startWeekday" in text:
            s = text.find("function buildShareMessage()")
            e = text.find('$("calPrev").addEventListener', s)
            if s >= 0 and e >= 0:
                text = text[:s] + block + text[e:]
                n_share += 1
                changed = True
            else:
                print("share anchors miss", f)
        if changed:
            f.write_text(text, encoding="utf-8")
            print("fixed", f)
    print("brace_fixes", n_brace, "share_fixes", n_share)
    if n_brace == 0 and n_share == 0:
        raise SystemExit("no files repaired")

if __name__ == "__main__":
    main()
