# Wheel of Balance — compatibility audit baseline

Source repository: Yugatn/psy-tools
Source commit: `8997969a7829359c0b3c095e52029feca2a354bc` (main, 2026-10-09)
Status: CODE_STRUCTURE_INSPECTED; FUNCTIONAL_BEHAVIOR_NOT_TESTED

## Concept reconstruction gate

Result: RECONSTRUCTION_PASSED_WITH_UNKNOWN, based on `AGENTS.md`, `docs/AS_CONTEXT_BOOTSTRAP_v0.1.md`, and `docs/AS_CONCEPT_RECONSTRUCTION_TEST_v0.1.md`.

- C01: «Другой — реален»: другой субъект не исчерпывается нашей моделью.
- C02: Reality = Model + Residual: остаточная неопределённость сохраняется.
- C03: UNKNOWN != ABSENT.
- C04: Психодиагностический результат — контекстная модель, не личность целиком.
- C05: Закон развития распространяется на граждан и законы.
- C06: Он не уполномочивает ИИ навязывать человеку направление развития.
- C07: Доказательства отличаются от интерпретаций.
- C08: Согласие нескольких агентов не является независимой проверкой.
- C09: Реализация и самотестирование не равны независимой верификации.
- C10: Решения об изменении авторского канона остаются за человеком.

Non-authorized inferences: диагноз по баллам; фиктивные оценки; принудительная корректировка целей; трактовка отсутствующих данных как нуля.
Unresolved: browser/mobile verification, legacy storage schema, per-page feature parity.

## Existing routes (directory listing checked)

| Route | Exists | Functional parity | Browser verified |
|---|---|---|---|
| wheel/index.html | yes | NOT_TESTED | no |
| wheel/detail/index.html | yes | NOT_TESTED | no |
| wheel/health/index.html | directory exists; file not individually checked | NOT_TESTED | no |
| wheel/work/index.html | directory exists; file not individually checked | NOT_TESTED | no |
| wheel/finance/index.html | directory exists; file not individually checked | NOT_TESTED | no |
| wheel/relationships/index.html | directory exists; file not individually checked | NOT_TESTED | no |
| wheel/social/index.html | directory exists; file not individually checked | NOT_TESTED | no |
| wheel/development/index.html | directory exists; file not individually checked | NOT_TESTED | no |
| wheel/rest/index.html | directory exists; file not individually checked | NOT_TESTED | no |
| wheel/creativity/index.html | directory exists; file not individually checked | NOT_TESTED | no |
| wheel/self_awareness/index.html | directory exists; file not individually checked | NOT_TESTED | no |

## Feature audit matrix — pending code-level verification

Legend: ? = not inspected or not verified; NOT an assertion that the feature is missing.

| Feature | Main | Detail | Required check |
|---|---|---|---|
| 0–10 score with explicit unrated | ? | ? | no default 0 or 5 |
| Canvas, rays, labels, DPR resize | ? | ? | desktop and mobile |
| Result stats and attention zone | ? | ? | ignore unrated |
| History and dynamics | ? | ? | wheel-scoped snapshots |
| Goals and improvements | ? | ? | wheel-scoped |
| Journal and reflections | ? | ? | wheel-scoped |
| Calendar | ? | ? | existing behavior preserved |
| Export/import JSON | ? | ? | schema and identity validation |
| Share and Telegram WebApp | ? | ? | compatibility |
| Reset | ? | ? | current wheel only |
| Parent/child deep links | ? | ? | back, refresh, direct URL |
| Keyboard and screen reader | ? | ? | semantic equivalents to canvas |

## Next implementation order

1. Inventory every existing `wheel/**/index.html` and its scripts, record actual feature availability.
2. Identify legacy storage keys and migration rules before modifying persistence.
3. Add tests for unrated vs 0, partial average, namespace isolation, import identity, reset isolation.
4. Apply minimal compatibility-layer fixes in `wheel/wheel-engine.js` and existing pages.
5. Run automated tests and manually verify desktop, iOS Safari, Android Chrome, Telegram WebApp.
6. Update this matrix with evidence, exact commits, and remaining failures.

No existing wheel is to be deleted or renamed. No new wheel is authorized by this audit. This document is an initial evidence-limited audit, not a claim of completed functional parity.

---

## Implementation update — 2026-10-31 (candidate PR, not deployed)

**Reconstruction source:** `5ed063478d8b926b448586250f1d3016b9f40d76` on main.
**Concept integrity:** RECONSTRUCTION_PASSED_WITH_UNKNOWN; same 10 invariants in bootstrap remain applicable. No philosophical/diagnostic claims changed.
**Scope:** 14 existing `wheel/**/index.html` routes, shared `wheel-engine.js`, shared `wheel-draw.js`, QA page, standalone tests and CI workflow.

### Confirmed by code inspection and isolated execution

- Shared scoring now validates values 0–10 and distinguishes `null` from actual `0`.
- `WheelEngine.statistics` returns `null` for mean/min/max when no real score exists. Displayed statistics, attention zone, bar chart and share text use the rated-only model.
- Unrated questions show an explicit empty state; Next/Done does not silently convert the slider's initial 0 into a score.
- Progress indicator reflects count of scored questions rather than position in questionnaire.
- Shared Canvas keeps visible rays for unscored categories without drawing a fictitious profile polygon; detail uses shared Canvas, not its separate legacy renderer.
- Canvas hit-testing now uses CSS pixels so DPR/Retina canvas backing-store scaling does not distort the click coordinates.
- A daily history snapshot is skipped for an entirely empty wheel, and updated after further scoring on the same day; comparison excludes unrated pairs.
- Exported JSON now carries stable `wheelId` equal to the existing storage key. A mismatched wheel identity is rejected; legacy files without an identity require explicit confirmation, and overwrite requires another confirmation.
- Reset wording describes actual behavior; reset clears scores and improvements on the current wheel but preserves journal, reflections and history.
- Existing `localStorage` score keys were **not** renamed; no destructive migration was run.
- Syntax of the inline script in all 14 existing wheel pages and the shared engine/draw scripts was successfully parsed with a JavaScript function parser.
- Isolated tests of the engine and the renderer completed without errors using a mocked browser/Canvas environment (17 checks in this session); Node-based regression test and a PR workflow were added, but workflow outcomes are not asserted here.

### Incomplete or unverified

| Verification item | Status | Notes |
|---|---|---|
| Source review of all 14 pages | CODE_INSPECTED | Script parse passed; no user-facing real browser execution |
| Engine and renderer isolated test | STATIC_TESTED | Mocked DOM/Canvas, not an end-to-end test |
| Node regression workflow | CI_PASSED | GitHub Actions Wheel regression checks successful on PR #4, head c67d6f4 |
| Live GitHub Pages | NOT_TESTED | Branch must be reviewed and integrated |
| Desktop browser and keyboard navigation | NOT_TESTED | Require browser testing |
| iOS Safari / Android Chrome | NOT_TESTED | Require real or automated device browser |
| Telegram WebApp | NOT_TESTED | Requires Telegram environment |
| Import/export round-trip with real legacy files | NOT_TESTED | Synthetic/structural checks only |
| Cabinet import/export + nested interactions | NOT_TESTED | Candidate for separate follow-up hardening |
| Clinical/psychometric validation | NOT_TESTED | This tool remains self-reflection, not diagnosis |

**Remaining risk:** although existing storage keys are retained, imported legacy files lacking `wheelId` cannot be automatically tied to a wheel; the user must verify the provenance before accepting import. Canvas visual fidelity and pointer behavior still need browser-level confirmation. No new wheel categories or questionnaire content were introduced.

### CI update (2026-10-31)
- Wheel regression checks: **SUCCESS** on PR #4 at commit `c67d6f4`.
- Agent Integrity Check: **SUCCESS** at `c67d6f4` after excluding the reconstruction test specification containing expressly forbidden-example text from the assertion grep; requirements retained.
- The independent push-triggered `fix-cabinet-nested.yml` workflow was unsuccessful; no successful verification can be inferred from it. Browser/device testing is still pending.
