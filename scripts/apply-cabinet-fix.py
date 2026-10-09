#!/usr/bin/env python3
"""Fix cabinet: Journal key filter, null-safe history/journal, correct journal candidates."""
from pathlib import Path


def main() -> None:
    path = Path("wheel/cabinet.html")
    cab = path.read_text(encoding="utf-8")
    n = 0

    old_skip = """      if (k.indexOf(":history") >= 0 || k.indexOf(":journal") >= 0 || k.indexOf(":improvements") >= 0 ||
          k.indexOf(":reflections") >= 0 || k.indexOf(":share") >= 0 || k.indexOf(":spoiler") >= 0) continue;"""
    new_skip = """      if (k.indexOf(":history") >= 0 || k.indexOf(":journal") >= 0 || k.indexOf(":improvements") >= 0 ||
          k.indexOf(":reflections") >= 0 || k.indexOf(":share") >= 0 || k.indexOf(":spoiler") >= 0) continue;
      if (/Journal$|Improvements$|Reflections$|Share$|SpoilerPlan$/i.test(k)) continue;"""
    if "Journal$|Improvements$" not in cab and old_skip in cab:
        cab = cab.replace(old_skip, new_skip)
        n += 1
        print("applied: skip Journal keys")

    old_jc = """      let journal = [];
      const jCandidates = [
        valuesKey.replace(/Values$/, "Journal"),
        valuesKey + ":journal",
        valuesKey.replace(/:values$/, ":journal")
      ];
      if (valuesKey === "wheelBalanceV3Values") jCandidates.unshift("wheelBalanceV3Journal");
      for (let i = 0; i < jCandidates.length; i++) {
        const j = parseJSON(localStorage.getItem(jCandidates[i]) || "[]", []);
        if (Array.isArray(j) && j.length) { journal = j; break; }
      }"""
    new_jc = """      let journal = [];
      const jCandidates = [];
      const jFromValues = valuesKey.replace(/Values$/, "Journal");
      if (jFromValues !== valuesKey) jCandidates.push(jFromValues);
      const jFromUnderscore = valuesKey.replace(/_Values$/, "_Journal");
      if (jFromUnderscore !== valuesKey && jCandidates.indexOf(jFromUnderscore) < 0) jCandidates.push(jFromUnderscore);
      if (/:values$/i.test(valuesKey)) jCandidates.push(valuesKey.replace(/:values$/i, ":journal"));
      jCandidates.push(valuesKey + ":journal");
      if (valuesKey === "wheelBalanceV3Values") jCandidates.unshift("wheelBalanceV3Journal");
      for (let i = 0; i < jCandidates.length; i++) {
        const j = parseJSON(localStorage.getItem(jCandidates[i]) || "[]", []);
        if (Array.isArray(j) && j.some(function (x) { return x && typeof x === "object" && !Array.isArray(x); })) {
          journal = j.filter(function (x) { return x && typeof x === "object" && !Array.isArray(x); });
          break;
        }
      }"""
    if old_jc in cab:
        cab = cab.replace(old_jc, new_jc)
        n += 1
        print("applied: journal candidates")
    elif "jFromValues" in cab:
        print("skip: journal candidates already")
    else:
        print("WARN: journal candidates pattern miss")

    if "const histItems = [];" in cab:
        cab = cab.replace("const histItems = [];", "let histItems = [];")
        n += 1
        print("applied: histItems let")

    old_sort = """    histItems.sort(function (a, b) {
      return String(b.snap.date || "").localeCompare(String(a.snap.date || ""));
    });"""
    new_sort = """    histItems = histItems.filter(function (item) { return item.snap && typeof item.snap === "object"; });
    histItems.sort(function (a, b) {
      return String(b.snap.date || "").localeCompare(String(a.snap.date || ""));
    });"""
    if "item.snap && typeof item.snap" not in cab and old_sort in cab:
        cab = cab.replace(old_sort, new_sort)
        n += 1
        print("applied: hist filter")

    old_hist = """      histEl.innerHTML = histItems.slice(0, 40).map(function (item) {
        const vals = item.snap.values || item.snap.scores || [];"""
    new_hist = """      histEl.innerHTML = histItems.slice(0, 40).map(function (item) {
        if (!item.snap) return "";
        const vals = item.snap.values || item.snap.scores || [];"""
    if "if (!item.snap) return" not in cab and old_hist in cab:
        cab = cab.replace(old_hist, new_hist)
        n += 1
        print("applied: hist null guard")

    old_j = """      journalEl.innerHTML = journals.slice(0, 30).map(function (j) {
        const d = j.entry.date || j.entry.created || "";
        const text = j.entry.text || j.entry.note || JSON.stringify(j.entry);"""
    new_j = """      journalEl.innerHTML = journals.slice(0, 30).map(function (j) {
        if (!j.entry || typeof j.entry !== "object") return "";
        const d = j.entry.date || j.entry.created || "";
        const text = j.entry.text || j.entry.note || JSON.stringify(j.entry);"""
    if "typeof j.entry !== \"object\"" not in cab and old_j in cab:
        cab = cab.replace(old_j, new_j)
        n += 1
        print("applied: journal null guard")

    old_collect = """      for (let j = 0; j < e.journal.length; j++) {
        journals.push({ title: e.title, entry: e.journal[j] });
      }"""
    new_collect = """      for (let j = 0; j < e.journal.length; j++) {
        if (e.journal[j] && typeof e.journal[j] === "object") {
          journals.push({ title: e.title, entry: e.journal[j] });
        }
      }"""
    if "typeof e.journal[j]" not in cab and old_collect in cab:
        cab = cab.replace(old_collect, new_collect)
        n += 1
        print("applied: journal collect filter")

    path.write_text(cab, encoding="utf-8")
    print("total_patches", n)
    if n == 0:
        raise SystemExit("no patches applied")


if __name__ == "__main__":
    main()
