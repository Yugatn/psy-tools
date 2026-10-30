# Wheel of Balance — privacy model and multi-user isolation

Last updated: 2026-10-31
Status: SOURCE_INSPECTED; CHROMIUM_SMOKE_TESTED (partial); MULTI_USER_AUTH_NOT_IMPLEMENTED
PR: https://github.com/Yugatn/psy-tools/pull/4

## Executive answer

With the current static GitHub Pages architecture, **separate browser storage profiles do not share `localStorage`**. One user filling a wheel on a different device or in an independent browser profile does not, by this mechanism alone, populate another user's browser.

**Users of the same origin within the same browser profile do share `localStorage`.** Different tabs are not different users. Opening a page with another Telegram account is NOT proof of browser storage isolation.

There is no authenticated user identity or encryption of saved wheel records. Therefore do not advertise this project as a secure multi-user personal account.

## Data paths observed

- Main wheel: `wheelBalanceV3Values` and related journal/history/reflections keys.
- Sphere wheels: `wheelNestedV2_*_Values` and corresponding other keys.
- Nested detail: `wheelBalanceDetail:<encoded parent + trail>:values` and related keys.
- Cabinet reads `wheelBalance*` and `wheelNested*` on the current origin.
- Cabinet's export produces a **plaintext JSON** with local data. Secure the exported file separately.
- Wheel pages include a remote Telegram WebApp SDK script from `telegram.org`. A third-party script loaded into a page generally executes in that page's origin and can interact with its DOM and localStorage. This is a trust boundary and should be reviewed separately.
- Share actions build messages that contain ratings; submitting a share is an explicit user action, not a private on-device backup.

## Threat model

| Scenario | Current result | Implication |
|---|---|---|
| Person A uses browser profile A; person B uses profile B | storage isolated by browser | cross-profile scores should not appear |
| Person A uses tab A; person B opens another tab in **same profile** | storage shared | scores may be visible immediately |
| Two people alternate on a shared phone/browser | storage shared until cleared | user-specific isolation absent |
| Same domain, different paths (`/psy-tools/` and another site path) | same origin storage | scripts may read same localStorage |
| Another device, not using a shared browser data directory | distinct storage | no automatic cross-device sync of wheel results |
| Attacker obtains plaintext exported file or local browser profile | can read local data | no encryption at rest |
| Same device with different Telegram accounts | depends on WebView/browser storage partition | do not assume isolation from Telegram account |

## Implemented in PR #4

1. All 14 wheel pages now display a visible warning before the questionnaire, explaining shared-browser data visibility.
2. Cabinet repeats the warning, clarifies there is no account login, and links to local data export/clear.
3. The clear command removes all keys with wheel prefixes, including legacy/unrecognized key names; this affects only the current browser's `localStorage`. It cannot clear copies made by other tools, backups, exports, or previously synchronized data.
4. Cabinet import validates wheel key formats and requests confirmation before replacing values.
5. Chromium browser smoke tests cover separate browser contexts, same-context shared tabs, and the clearing flow. Green CI is required before marking those cases tested.

## Follow-up architecture (PROPOSAL; author approval required)

**Option A — local encrypted profiles (offline-first):**
- Each person creates an encrypted local vault secured with a strong passphrase.
- Web Crypto AES-GCM with independently salted password-based key derivation; keys only in memory while unlocked.
- Never leave decrypted long-term records in ordinary `localStorage`. Lock on close/inactivity.
- Explicit export/backup and carefully verified atomic migration of existing plaintext keys, with no silent deletion.
- Do not market this as account authentication, cloud sync, or malicious-code protection: same-origin scripts and compromised browser environments remain relevant.

**Option B — authenticated cloud account (multi-device):**
- Server-backed identity with properly validated credentials/session; **no plaintext access across accounts**.
- Server-side authorization checked for **every** record read/write; per-user row-level access enforcement where supported.
- HTTPS; explicit retention/deletion policy; minimized metadata; audit and access tests.
- Optional client-side encryption for particularly sensitive entries, carefully designed recovery policy.
- Data migration only by explicit owner opt-in and validated backup/rollback.

Both options require reviewing the Telegram SDK and same-origin application boundaries. Until such an architecture is implemented and validated, keep the on-device self-reflection positioning and shared-device warning.

## Validation matrix

| Check | Evidence required |
|---|---|
| Browser contexts A and B have independent localStorage | Playwright contexts and page assertions |
| Two tabs in same context see the same scores | Playwright same-context tabs |
| Clearing wheel keys removes the scores for next person | Playwright clear and reload |
| No unrelated application keys deleted | Automated regression test with sentinel keys |
| No automatic personal-data network upload | Separate network inspection with known sentinel, not inferred from storage design |
| Telegram accounts / iOS Safari / Android Chrome | Real environment testing, currently NOT_TESTED |
| Cloud per-user isolation | NOT_IMPLEMENTED; requires server auth + authorization checks |

**Do not infer secure user isolation from absence of a server-side database or from passing only a browser smoke test.**
