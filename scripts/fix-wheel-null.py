#!/usr/bin/env python3
"""Null-safe loadValues + cabinet wheelNested discovery."""
from pathlib import Path
import re

SAFE = """(v => {
              if (v === null || v === undefined || v === "") return null;
              const n = Number(v);
              return Number.isFinite(n) ? Math.max(0, Math.min(10, n)) : null;
          })"""


def fix_html(text: str) -> str:
    text = text.replace(
        "values = p.map(v => Math.max(0, Math.min(10, Number(v) || 0)));",
        "values = p.map" + SAFE + ";",
    )
    text = text.replace(
        "values = p.map(v => Math.max(0, Math.min(10, Number(v)||0)));",
        "values = p.map" + SAFE + ";",
    )
    text = text.replace(
        "values = data.values.map(v => Math.max(0, Math.min(10, Number(v) || 0)));",
        "values = data.values.map" + SAFE + ";",
    )
    text = text.replace(
        "if (Array.isArray(e.values)) values = e.values.map(v => Math.max(0, Math.min(10, Number(v)||0)));",
        "if (Array.isArray(e.values)) values = e.values.map" + SAFE + ";",
    )
    text = re.sub(
        r"values\[i\] = WheelEngine\.clamp\(Number\(v\) \|\| 0, 0, 10\);",
        'if (v === null || v === undefined || v === "") { values[i] = null; } else { const __n = Number(v); values[i] = Number.isFinite(__n) ? Math.max(0, Math.min(10, __n)) : null; }',
        text,
    )
    text = re.sub(
        r"values\[i\] = Math\.max\(0, Math\.min\(10, Number\(v\) \|\| 0\)\);",
        'if (v === null || v === undefined || v === "") { values[i] = null; } else { const __n = Number(v); values[i] = Number.isFinite(__n) ? Math.max(0, Math.min(10, __n)) : null; }',
        text,
    )
    return text


def fix_cabinet(text: str) -> str:
    text = text.replace(
        'if (k && k.indexOf("wheelBalance") === 0) keys.push(k);',
        'if (k && (k.indexOf("wheelBalance") === 0 || k.indexOf("wheelNested") === 0)) keys.push(k);',
    )
    text = text.replace(
        'if (k.indexOf("wheelBalance") !== 0) continue;',
        'if (k.indexOf("wheelBalance") !== 0 && k.indexOf("wheelNested") !== 0) continue;',
    )
    text = text.replace(
        "Удалить ВСЕ данные колёс (wheelBalance*) на этом устройстве?",
        "Удалить ВСЕ данные колёс (wheelBalance* / wheelNested*) на этом устройстве?",
    )
    text = text.replace(
        "начинающиеся с <code>wheelBalance</code>",
        "начинающиеся с <code>wheelBalance</code> или <code>wheelNested</code>",
    )
    if "wheelNestedV2_" not in text:
        text = text.replace(
            'href = "./detail/";\n      }\n      add(title, href, k, vals);',
            '''href = "./detail/";
      } else if (k.indexOf("wheelNestedV2_") === 0) {
        const rest = k.replace(/^wheelNestedV2_/, "").replace(/_Values$/, "").replace(/Values$/, "");
        const map = {health:["./health/","Здоровье"],work:["./work/","Работа"],finance:["./finance/","Финансы"],relationships:["./relationships/","Отношения"],social:["./social/","Социальная жизнь"],development:["./development/","Развитие"],rest:["./rest/","Отдых"],creativity:["./creativity/","Творчество"],self_awareness:["./self_awareness/","Самоосознание"],fear:["./fear/","Страхи"],sexuality:["./sexuality/","Сексуальность"],destructiveness:["./destructiveness/","Деструктивность"]};
        const m = map[rest];
        if (m) { href = m[0]; title = m[1]; } else { title = rest; href = "./hub.html"; }
      }
      add(title, href, k, vals);''',
        )
    return text


def main() -> None:
    n = 0
    for f in Path("wheel").rglob("index.html"):
        t = f.read_text(encoding="utf-8")
        nt = fix_html(t)
        if nt != t:
            f.write_text(nt, encoding="utf-8")
            n += 1
    print("html_patched", n)

    cab = Path("wheel/cabinet.html")
    if cab.exists():
        t = cab.read_text(encoding="utf-8")
        nt = fix_cabinet(t)
        cab.write_text(nt, encoding="utf-8")
        print("cabinet_nested", "wheelNested" in nt)

    bad = 0
    for f in Path("wheel").rglob("index.html"):
        t = f.read_text(encoding="utf-8")
        bad += t.count("Number(v) || 0") + t.count("Number(v)||0")
    print("remaining_Number_or_0", bad)


if __name__ == "__main__":
    main()
