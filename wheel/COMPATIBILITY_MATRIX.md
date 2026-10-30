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
