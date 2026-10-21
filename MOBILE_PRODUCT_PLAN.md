# PSY-TOOLS: Wheel + Coaching mobile product plan

Status: PROPOSAL / first implementation increment. Existing wheel behavior and user data must be preserved.

## Product direction
One mobile app combines:
1. Wheel of Balance visualization and recursive detail wheels.
2. Guided coaching/reflection flows driven by explicit conditional branches (no AI required for the first release).
3. A journal linked to a wheel, ray, answer and date.
4. Progress history that compares the user's own entries without reducing the person to one score.
5. Optional AI synthesis later, only with explicit user consent and clear separation between observed answers and generated interpretation.

## Existing implementation observed
- The repository already contains web wheels and a Flutter app skeleton under `mobile_app/`.
- The Flutter app already has wheel, journal, mood, builder and backup feature areas.
- The architecture describes local-first operation, recursive wheel graphs, versioned data and user-controlled backups.
- The web version at `wheel/index.html` is an existing functional reference; audit before replacing anything.
- Current state does not yet establish that all mobile features are integrated, visually verified, or ready for store publication.

## First release (MVP)
### User journey
1. Open app and choose an existing wheel / life area.
2. Rate each ray from 0 to 10; unrated remains distinct from 0.
3. View the radial chart and choose one ray for deeper reflection.
4. Follow a question route determined by explicit answer choices.
5. Save answers as a journal entry linked to the wheel/ray.
6. Select one small action, an optional due date and a check-in.
7. Revisit history and compare periods.

### Branching questionnaire contract
- A flow is a graph of question nodes, not hard-coded conversational AI.
- Each node has an ID, prompt, answer type, options and optional next-node IDs.
- A route is deterministic and testable.
- A missing route ends the flow cleanly; invalid references are caught in tests.
- Avoid leading, coercive or diagnosis-like wording.
- User can skip, go back, edit answers and exit without losing previously saved data.
- Results describe the user's answers in context, not the user's identity.

### Mobile UX
- Thumb-friendly cards and controls; safe areas and keyboard-aware layouts.
- One main question per screen, progress indicator, back/continue, skip and save.
- Radial wheel should remain readable on smaller screens; labels may use a linked list view.
- Offline-first; no account or AI connection required for core flow.

### Data and privacy
- Store answers locally by default.
- Explicitly explain any optional synchronization or AI processing before sending data.
- Export and import must validate schema and preserve a safety snapshot.
- Do not send journal text to external services by default.
- Self-reflection is not presented as clinical diagnosis.

## Implementation stages
1. **Foundation:** reusable branching-flow model and unit tests. Preserve the existing wheel.
2. **Integration:** launch reflection from a wheel/ray and save answers to the existing journal store.
3. **MVP UX:** mobile layouts, progress, back/skip, answer review and save confirmation.
4. **Regression:** tests for branch routing, persistence, unrated values, recursion, backup migration and mobile overflow.
5. **Release preparation:** app icon, onboarding, privacy notice, accessibility, signed builds and platform-specific store requirements.
6. **Commercial validation:** free core wheel; test paid value around guided programs, export/backup, custom flows and progress reports. Do not build payment infrastructure before user demand is tested.

## Definition of done for MVP
- Existing wheels and saved data remain intact.
- Every question route has tests.
- A full reflection can be saved, reopened and edited offline.
- The app distinguishes unrated from a real score of zero.
- No diagnosis or personality label is inferred from a single score.
- Mobile layouts are tested on narrow and large screens.
- CI is green and the build has been run on at least one real iOS or Android device before calling it verified.

## Unknown / not yet verified
- Exact state of all mobile screens and persistence integration.
- iOS and Android build readiness in the current environment.
- Target platform priority and monetization preference.
- Actual market demand and conversion rates.
