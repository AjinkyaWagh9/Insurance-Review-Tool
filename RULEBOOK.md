# RULE 9 — Storage Version Must Be Bumped on Every Schema or Constants Change

## Problem Statement

`STORAGE_VERSION` is hardcoded as a local string literal inside `TermProtectionCheckContext.tsx`:

```typescript
// CURRENT — WRONG
const STORAGE_VERSION = "1.3";
```

This creates three compounding failure modes:

**Failure 1 — Silent stale data loading.**
When scoring constants or state shape change, the version string is never bumped because it lives buried inside a context file, not alongside the constants it protects. Old browser sessions store `annualIncome`, `idealCoverEstimated`, and all scoring outputs under version `"1.3"`. After the Rule 1–8 fixes, the new code loads that old `"1.3"` data without complaint, feeds stale `annualIncome` into Step 3's re-score, and produces wrong ideal cover values. This is the exact bug that produced the ₹1.9Cr display for a ₹25L income input.

**Failure 2 — No change history.**
There is no record of what changed at each version. When a future developer sees `"1.3"` they have no way to know what schema it represents, what changed from `"1.2"`, or whether the current code is actually compatible with stored `"1.3"` data.

**Failure 3 — No enforcement mechanism.**
Nothing in the codebase forces a version bump when `TermProtectionState` or `termScoringConstants.ts` changes. It is a purely manual discipline with no compile-time or lint-time reminder.

---

## Root Cause Trace

```
User enters ₹25L income in Step 1
    ↓
TermBasicInfoStep calls fetchTermScore({ income: 25,00,000 })
    → idealCoverEstimated = ₹2,50,00,000 ✓ (written to context)
    ↓
User advances to Step 2, Step 3
    ↓
TermStrengtheningStep.handleFinalScore reads:
    const { annualIncome } = useTermProtection()
    → annualIncome = ₹19,00,000 ✗ (loaded from stale localStorage "1.3" data)
    ↓
fetchTermScore({ income: 19,00,000 })
    → idealCoverEstimated = ₹1,90,00,000 ✗ (overwrites the correct Step 1 value)
    ↓
Step 5 renders idealCover = ₹1,90,00,000 ✗
```

The stale `annualIncome` passed the version check because `STORAGE_VERSION` was never bumped from `"1.3"` during the Rule 1–8 implementation, even though the scoring logic that determines whether stored values are valid changed significantly.

---

## Implementation

### Step 1 — Bump the Version Immediately

This is the emergency fix. Execute this first, before any other change in this rule.

**File: `src/context/TermProtectionCheckContext.tsx`**

```typescript
// FIND AND REPLACE this exact line:
const STORAGE_VERSION = "1.3";

// WITH:
const STORAGE_VERSION = "1.4";
```

This single change causes every browser that has stored `"1.3"` data to hit the mismatch branch, discard the stale state, and fall back to `defaultState`. Users will see the wizard reset to Step 1 — which is the correct behavior since their stored calculations were wrong.

---

### Step 2 — Move STORAGE_VERSION to termScoringConstants.ts

The version string must live alongside the constants it protects, not buried in the context file. When a developer opens `termScoringConstants.ts` to change `INCOME_MULTIPLIER`, they must be visually confronted with the version string at the same time.

**File: `src/constants/termScoringConstants.ts`**

Replace the entire file content with:

```typescript
/**
 * termScoringConstants.ts
 *
 * AUTHORITATIVE SOURCE for:
 *   1. Scoring constants — must stay in sync with backend term_rules.py
 *   2. Storage version — must be bumped on any schema or constants change
 *
 * ─────────────────────────────────────────────────────────────────────
 * ⚠️  MANDATORY RULE FOR ALL DEVELOPERS:
 *
 *     If you change ANYTHING in this file, or change TermProtectionState
 *     in TermProtectionCheckContext.tsx, you MUST bump STORAGE_VERSION.
 *
 *     If you do not, users with cached data will load stale values
 *     silently and see wrong coverage calculations with no error shown.
 * ─────────────────────────────────────────────────────────────────────
 *
 * STORAGE VERSION CHANGE HISTORY:
 * ┌─────────┬────────────────────────────────────────────────────────┐
 * │ Version │ What Changed                                           │
 * ├─────────┼────────────────────────────────────────────────────────┤
 * │  1.0    │ Initial release                                        │
 * │  1.1    │ Added exposureScore to state                           │
 * │  1.2    │ Added coverageStatus, insurerReliabilityScore          │
 * │  1.3    │ Added idealCoverBreakdown                              │
 * │  1.4    │ Rule 1–8 fixes: corrected INCOME_MULTIPLIER to 10x,    │
 * │         │ DEPENDENT_BUFFER to ₹50L, renamed child_buffer →       │
 * │         │ dependent_buffer, setBasicInfo now called from Step 1  │
 * └─────────┴────────────────────────────────────────────────────────┘
 */

// ─── STORAGE VERSION ────────────────────────────────────────────────────────
// Bump this string whenever TermProtectionState shape changes OR when scoring
// constants change in a way that makes old stored calculations invalid.
// Format: "MAJOR.MINOR"
//   MINOR bump → new optional fields added (old data still usable, just missing new fields)
//   MAJOR bump → breaking changes to existing fields or calculation logic
export const STORAGE_VERSION = "1.4";

// ─── SCORING CONSTANTS ──────────────────────────────────────────────────────
// These MUST match backend: app/core/rules/term_rules.py → TERM_SCORING_CONFIG
// If the backend values change, update here AND bump STORAGE_VERSION above.

export const TERM_SCORING_CONSTANTS = {
  /**
   * Income multiplier for DIME calculation.
   * Backend: TERM_SCORING_CONFIG["dime"]["multiplier"] = 10
   */
  INCOME_MULTIPLIER: 10,

  /**
   * Buffer amount added per dependent child.
   * Backend: TERM_SCORING_CONFIG["dime"]["dependent_buffer"] = 5_000_000
   */
  DEPENDENT_BUFFER: 5_000_000,

  /**
   * Number of years of annual expenses added as buffer.
   * Backend: expense_buffer = (monthly_expenses × 12) × 2
   */
  EXPENSE_YEARS_BUFFER: 2,
} as const;
```

---

### Step 3 — Import STORAGE_VERSION into the Context File

Remove the local declaration and import from the constants file instead.

**File: `src/context/TermProtectionCheckContext.tsx`**

**3a. Add the import at the top of the file:**

```typescript
// ADD this import alongside existing imports:
import { STORAGE_VERSION } from "@/constants/termScoringConstants";
```

**3b. Delete the local version declaration:**

```typescript
// DELETE this line entirely — it is now imported:
const STORAGE_VERSION = "1.3"; // ← REMOVE
```

**3c. Add a guard comment above defaultState:**

```typescript
/**
 * ⚠️  If you modify this state shape, you MUST bump STORAGE_VERSION
 *     in src/constants/termScoringConstants.ts or users will silently
 *     load stale data that produces wrong coverage calculations.
 *
 *     Fields that affect scoring (annualIncome, loanAmount, dependents,
 *     monthlyExpenses, retirementAge) are especially critical — stale
 *     values for these fields produce wrong idealCover outputs in Step 3.
 */
const defaultState: TermProtectionState = {
  age: 0,
  customerName: "",
  annualIncome: 0,
  dependents: 0,
  existingSumAssured: 0,
  idealCoverEstimated: 0,
  shortfallEstimated: 0,
  policyUploaded: false,
  policyVerified: false,
  policyAnalyzing: false,
  extractedPolicy: null,
  idealCoverVerified: 0,
  shortfallVerified: 0,
  exposureScore: 0,
  engagementScore: 0,
  policyScore: 0,
  scoreReasons: [],
  idealCoverBreakdown: null,
  mode: "estimate",
  loanAmount: 0,
  monthlyExpenses: 0,
  retirementAge: 60,
  familySecureYears: 0,
  coverageStatus: "",
  insurerReliabilityScore: 0,
};
```

**3d. Verify the version check logic is correct and add a log:**

```typescript
// FIND this block in the useState initializer:
const [state, setState] = useState<TermProtectionState>(() => {
  const saved = typeof window !== "undefined"
    ? localStorage.getItem(STORAGE_KEY)
    : null;

  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      if (parsed._version === STORAGE_VERSION) {
        return parsed;
      }
      // REPLACE the existing console.log with this more informative version:
      console.info(
        `[TermProtection] Storage version mismatch: stored="${parsed._version}", ` +
        `current="${STORAGE_VERSION}". Clearing stale data and resetting to defaults.`
      );
      localStorage.removeItem(STORAGE_KEY);
    } catch (e) {
      console.error("[TermProtection] Failed to parse saved state. Resetting.", e);
      localStorage.removeItem(STORAGE_KEY);
    }
  }
  return defaultState;
});
```

---

### Step 4 — Add a DEV-Mode Storage Inspector Utility

This utility lets developers see exactly what version is stored and what the stored values are, without manually opening DevTools. Add it to `termApi.ts` alongside `validateScoringConstants`.

**File: `src/services/termApi.ts`**

```typescript
/**
 * DEV ONLY — Prints the current localStorage state for TermProtection.
 * Call from browser console: import('@/services/termApi').then(m => m.inspectStoredState())
 * Or call from main.tsx in DEV mode.
 *
 * Outputs:
 *   - Stored version vs current version
 *   - Whether versions match
 *   - Key scoring fields: annualIncome, idealCoverEstimated, policyScore
 *   - Full stored state
 */
export function inspectStoredState(): void {
  if (import.meta.env.MODE !== "development") return;

  const STORAGE_KEY = "termProtectionData";
  const raw = localStorage.getItem(STORAGE_KEY);

  if (!raw) {
    console.info("[StorageInspector] No stored state found. Fresh session.");
    return;
  }

  try {
    const parsed = JSON.parse(raw);
    const storedVersion = parsed._version ?? "MISSING";
    const currentVersion = STORAGE_VERSION;
    const isMatch = storedVersion === currentVersion;

    console.group("[StorageInspector] TermProtection State");
    console.info(`Version stored  : "${storedVersion}"`);
    console.info(`Version current : "${currentVersion}"`);
    console.info(`Version match   : ${isMatch ? "✅ YES" : "❌ NO — stale data will be cleared on next load"}`);
    console.info("--- Key Scoring Fields ---");
    console.info(`annualIncome          : ₹${(parsed.annualIncome ?? 0).toLocaleString("en-IN")}`);
    console.info(`idealCoverEstimated   : ₹${(parsed.idealCoverEstimated ?? 0).toLocaleString("en-IN")}`);
    console.info(`idealCoverVerified    : ₹${(parsed.idealCoverVerified ?? 0).toLocaleString("en-IN")}`);
    console.info(`policyScore           : ${parsed.policyScore ?? 0}`);
    console.info(`mode                  : ${parsed.mode ?? "unknown"}`);
    console.info("--- Full Stored State ---");
    console.table(parsed);
    console.groupEnd();
  } catch (e) {
    console.error("[StorageInspector] Failed to parse stored state:", e);
  }
}
```

**File: `src/main.tsx`**

Add below the existing `validateScoringConstants()` call:

```typescript
if (import.meta.env.DEV) {
  validateScoringConstants();
  inspectStoredState(); // ← ADD THIS LINE
}
```

Import it at the top of `main.tsx`:

```typescript
import { validateScoringConstants, inspectStoredState } from "@/services/termApi";
```

Now every time the dev server starts, the console will print the stored version and flag mismatches before the user even opens the wizard.

---

### Step 5 — Add a Manual Clear Utility for Testing

Add this to `termApi.ts` for use during development and QA:

```typescript
/**
 * DEV ONLY — Clears stored TermProtection state and reloads the page.
 * Use when testing version migrations or resetting a stale session.
 *
 * Call from browser console:
 *   import('@/services/termApi').then(m => m.clearStoredState())
 */
export function clearStoredState(): void {
  if (import.meta.env.MODE !== "development") {
    console.warn("[clearStoredState] This function is for development use only.");
    return;
  }
  localStorage.removeItem("termProtectionData");
  console.info("[clearStoredState] Stored state cleared. Reloading...");
  window.location.reload();
}
```

---

## Files Modified by Rule 9

| File | Change |
|------|--------|
| `src/constants/termScoringConstants.ts` | Add `STORAGE_VERSION` export with full change history |
| `src/context/TermProtectionCheckContext.tsx` | Remove local `STORAGE_VERSION`, import from constants, add guard comment, improve mismatch log |
| `src/services/termApi.ts` | Add `inspectStoredState()` and `clearStoredState()` dev utilities |
| `src/main.tsx` | Call `inspectStoredState()` in DEV mode |

---

## Verification Steps

Execute these in order after implementation.

**Step 1 — Confirm the version bump clears stale data in the original browser:**
1. Open the browser that was showing ₹1.9Cr.
2. Hard reload (`Cmd+Shift+R` / `Ctrl+Shift+R`).
3. Open DevTools → Console. You should see:
   ```
   [TermProtection] Storage version mismatch: stored="1.3", current="1.4".
   Clearing stale data and resetting to defaults.
   ```
4. The wizard should reset to Step 1 with empty fields.
5. Enter ₹25L income, 0 dependents. Ideal cover must show exactly ₹2,50,00,000.

**Step 2 — Confirm `inspectStoredState` output:**
1. Complete Step 1 of the wizard with ₹25L income.
2. Open DevTools → Console.
3. You should see the inspector output showing:
   ```
   Version stored  : "1.4"
   Version current : "1.4"
   Version match   : ✅ YES
   annualIncome    : ₹25,00,000
   ```

**Step 3 — Confirm new browser still works correctly:**
1. Open a new incognito window.
2. Complete the full wizard with ₹25L income, 2 dependents.
3. Ideal cover in Step 5 must show ₹3,50,00,000 (₹2.5Cr + 2×₹50L).

**Step 4 — Confirm version mismatch behavior for future changes:**
1. Temporarily change `STORAGE_VERSION` to `"1.5"` in `termScoringConstants.ts`.
2. Reload the browser that just stored `"1.4"` data.
3. Console must show the mismatch log and the wizard must reset.
4. Revert `STORAGE_VERSION` back to `"1.4"`.

---

## Developer Process Rule (Add to PR Checklist)

Add this check to your PR template or code review checklist:

```markdown
## Storage Version Check
- [ ] Does this PR modify `TermProtectionState` in `TermProtectionCheckContext.tsx`?
- [ ] Does this PR modify any value in `termScoringConstants.ts`?
- [ ] Does this PR change scoring logic in `term_engine.py` that would make
      stored `idealCoverEstimated` or `policyScore` values incorrect?

If YES to any of the above → `STORAGE_VERSION` in `termScoringConstants.ts`
MUST be bumped in this PR. PRs that skip this check will not be merged.
```
