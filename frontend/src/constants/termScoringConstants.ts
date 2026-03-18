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
 * │  1.5    │ Added reportUrl, reportFilename to state for S3 PDF     │
 * │         │ storage flow (Part C rulebook)                          │
 * └─────────┴────────────────────────────────────────────────────────┘
 */

// ─── STORAGE VERSION ────────────────────────────────────────────────────────
// Bump this string whenever TermProtectionState shape changes OR when scoring
// constants change in a way that makes old stored calculations invalid.
// Format: "MAJOR.MINOR"
//   MINOR bump → new optional fields added (old data still usable, just missing new fields)
//   MAJOR bump → breaking changes to existing fields or calculation logic
export const STORAGE_VERSION = "1.5";

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
