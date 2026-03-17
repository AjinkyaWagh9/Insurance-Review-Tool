/**
 * Canonical list of suggested riders for Term Insurance analysis.
 * Used by TermPolicyUploadStep and TermRecommendationStep.
 * Must stay in sync with backend term_extractor.py RIDER_NORMALIZER keys.
 */
export const SUGGESTED_RIDERS = [
  "Waiver of Premium",
  "Accidental Death Benefit",
  "Critical Illness Rider",
  "Income Benefit Rider",
] as const;

export type SuggestedRider = (typeof SUGGESTED_RIDERS)[number];

/**
 * Determines which suggested riders are missing from the extracted policy riders.
 * Uses multi-keyword matching to avoid false positives from single-word checks.
 *
 * Matching strategy: A suggested rider is considered PRESENT if the extracted
 * rider string contains ALL significant words of the suggested rider name.
 * "Significant words" excludes stop words: of, and, the, a, an.
 */
const STOP_WORDS = new Set(["of", "and", "the", "a", "an"]);

function getSignificantWords(riderName: string): string[] {
  return riderName
    .toLowerCase()
    .split(" ")
    .filter(w => !STOP_WORDS.has(w) && w.length > 1);
}

export function computeMissingRiders(extractedRiders: string[]): SuggestedRider[] {
  const normalizedExtracted = extractedRiders.map(r => r.toLowerCase());

  return SUGGESTED_RIDERS.filter(suggested => {
    const keywords = getSignificantWords(suggested);
    // A suggested rider is PRESENT if any extracted rider contains all its keywords
    const isPresent = normalizedExtracted.some(extracted =>
      keywords.every(keyword => extracted.includes(keyword))
    );
    return !isPresent;
  });
}
