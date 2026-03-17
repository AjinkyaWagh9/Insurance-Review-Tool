import { ReviewScore, ReviewType } from "@/types/insurance";
import { getScoreMeta } from "@/utils/scoreMeta";

export function generateMockScore(type: ReviewType): ReviewScore {
  const scores: Record<ReviewType, ReviewScore> = {
    health: {
      overall: 62,
      gapSummary:
        "Your current health plan covers basic hospitalization but lacks critical illness coverage and has a low sum insured relative to your age group.",
      risks: [
        "No critical illness rider detected",
        "Sum insured may be insufficient for metro city healthcare costs",
        "No coverage for pre/post hospitalization beyond 30/60 days",
        "Missing daycare procedure coverage for 140+ procedures",
      ],
      improvements: [
        "Add a Super Top-Up plan of ₹15-25 Lakhs to enhance coverage",
        "Include a Critical Illness rider covering 30+ conditions",
        "Consider a plan with unlimited room rent to avoid co-payment triggers",
        "Add maternity and newborn coverage if planning a family",
      ],
    },
    motor: {
      overall: 45,
      gapSummary:
        "Your motor insurance has only third-party liability. Comprehensive coverage is missing, leaving your vehicle exposed to own-damage risks.",
      risks: [
        "No own-damage coverage — repairs from accidents will be out of pocket",
        "Zero depreciation cover not included — high claim deductions likely",
        "No roadside assistance or engine protection",
        "Personal accident cover for passengers is absent",
      ],
      improvements: [
        "Upgrade to a Comprehensive policy with own-damage cover",
        "Add Zero Depreciation add-on to avoid high deductions on claims",
        "Include Engine Protection and Roadside Assistance add-ons",
        "Add Passenger Personal Accident cover for complete protection",
      ],
    },
    term: {
      overall: 38,
      gapSummary:
        "Your life cover is significantly below the recommended 15-20x annual income. Current coverage leaves dependents financially vulnerable.",
      risks: [
        "Life cover is only 5x income — recommended is 15-20x",
        "Outstanding loans are not factored into coverage amount",
        "No accidental death benefit rider",
        "Policy does not include waiver of premium on disability",
      ],
      improvements: [
        "Increase sum assured to at least ₹1.5 Cr based on your income and liabilities",
        "Add Accidental Death and Dismemberment rider",
        "Include Waiver of Premium rider for disability scenarios",
        "Consider a policy with Return of Premium option if budget allows",
      ],
    },
  };

  return scores[type];
}

export function getScoreColor(score: number): string {
  return `text-${getScoreMeta(score).color}`;
}

export function getScoreBgColor(score: number): string {
  return `bg-${getScoreMeta(score).color}`;
}

export function getScoreLabel(score: number): string {
  return getScoreMeta(score).label;
}

export function getScoreStrokeColor(score: number): string {
  return `stroke-${getScoreMeta(score).color}`;
}
