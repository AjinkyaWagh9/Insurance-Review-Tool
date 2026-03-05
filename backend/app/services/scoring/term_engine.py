from typing import List, Dict, Any
from app.core.rules.term_rules import TERM_SCORING_CONFIG
from app.schemas.term import TermInput


class TermScoringEngine:
    def __init__(self):
        self.config = TERM_SCORING_CONFIG

    def calculate(self, input_data: TermInput) -> dict:


        # 1. Income multiplier (Fixed at 10x)
        multiplier = self.config["dime"]["multiplier"]

        # 2. Core DIME components
        income_protection = input_data.income * multiplier
        dependent_buffer = input_data.child_count * self.config["dime"]["dependent_buffer"]

        # 3. Expense buffer — 2 years of annual household expenses
        #    Rationale: family needs runway beyond just income replacement
        #    Matches MVP syncNarrativeWithData expense logic
        annual_expenses = input_data.monthly_expenses * 12
        expense_buffer = annual_expenses * 2

        # 4. Gross need → subtract savings
        gross_need = income_protection + input_data.loans + dependent_buffer + expense_buffer
        ideal_cover = max(0, gross_need - input_data.savings)

        # ── STEP B: SCORING ───────────────────────────────────────────────────

        score = self.config["global"]["start_score"]
        score_reasons = []

        # Coverage ratio
        ratio = 0.0
        if ideal_cover > 0:
            ratio = input_data.extracted_sum_assured / ideal_cover
        elif input_data.extracted_sum_assured > 0:
            ratio = 1.0  # no need but has cover → adequate

        # Coverage gap penalty (tiers from term_rules.py — unchanged)
        if ideal_cover > 0:
            adequate_threshold = self.config["coverage_gap"]["adequate_threshold"]
            if ratio < adequate_threshold:
                for tier in self.config["coverage_gap"]["tiers"]:
                    if ratio < tier["max_ratio"]:
                        score += tier["penalty"]
                        score_reasons.append(f"{tier['status']}: {tier['penalty']} pts")
                        break

        # Waiver of Premium penalty
        riders_lower = [r.lower() for r in input_data.detected_riders]
        if not any(r in riders_lower for r in ["waiver", "wop", "waiver of premium"]):
            penalty = self.config["riders"]["missing_waiver_of_premium"]
            score += penalty
            score_reasons.append(f"Missing Waiver of Premium: {penalty} pts")

        # Family security penalty — if family can survive < 2 years without income, flag it
        # This matches the MVP's emotional question scoring (exposureAdd: 10 for < 2 years)
        if input_data.family_secure_years < 2:
            score -= 10
            score_reasons.append("Critical income dependency: family secure < 2 years: -10 pts")
        elif input_data.family_secure_years < 5:
            score -= 5
            score_reasons.append("Low income buffer: family secure < 5 years: -5 pts")

        # Retirement age penalty — if retiring late (65+), longer exposure window
        if input_data.retirement_age >= 65:
            score -= 5
            score_reasons.append("Extended working years (retire 65+): -5 pts")

        # Clamp score
        score = max(self.config["global"]["min_score"],
                    min(self.config["global"]["max_score"], score))

        # ── STEP C: INSURER RELIABILITY ───────────────────────────────────────

        reliability_data, reliability_score = self.get_insurer_reliability(input_data.insurer_name)

        # ── STEP D: NARRATIVE CONTEXT (for GPT recommendations) ──────────────

        coverage_status = self._get_coverage_status(ratio)
        shortfall = max(0, ideal_cover - input_data.extracted_sum_assured)

        return {
            "score": score,
            "score_reasons": score_reasons,
            "ideal_cover": ideal_cover,
            "ideal_cover_breakdown": {
                "income_protection": income_protection,
                "loans": input_data.loans,
                "dependent_buffer": dependent_buffer,
                "expense_buffer": expense_buffer,
                "savings_deducted": input_data.savings,
                "multiplier_used": multiplier,
            },
            "coverage_ratio": round(ratio, 4),
            "coverage_status": coverage_status,
            "shortfall": shortfall,
            "insurer_reliability_score": reliability_score,
            "insurer_reliability_data": reliability_data,
            # Pass full user context for GPT recommendations
            "user_context": {
                "age": input_data.age,
                "income": input_data.income,
                "loans": input_data.loans,
                "monthly_expenses": input_data.monthly_expenses,
                "child_count": input_data.child_count,
                "retirement_age": input_data.retirement_age,
                "family_secure_years": input_data.family_secure_years,
            }
        }

    def _get_coverage_status(self, ratio: float) -> str:
        """Returns human-readable coverage status matching MVP analyzeCoverage()"""
        if ratio >= 0.90:
            return "Adequate"
        elif ratio >= 0.75:
            return "Minor Gap"
        elif ratio >= 0.60:
            return "Moderate Gap"
        elif ratio >= 0.45:
            return "Major Coverage Gap"
        elif ratio >= 0.30:
            return "Severe Coverage Gap"
        elif ratio >= 0.15:
            return "Critical Underinsurance"
        else:
            return "Catastrophic Coverage"

    def get_insurer_reliability(self, insurer_name: str):
        name_normalized = insurer_name.lower().strip()
        data = self.config["insurer_data"].get(name_normalized)

        if not data:
            # Try partial match against known insurer keys
            for key in self.config["insurer_data"]:
                if key in name_normalized or name_normalized in key:
                    data = self.config["insurer_data"][key]
                    break

        if not data:
            data = self.config["insurer_data"]["others"]

        raw_score = (
            (data["csr_count"] * 30) +
            (data["csr_amount"] * 40) +
            (data["transparency"] * 20) +
            (data["solvency"] * 10)
        )
        final_score = raw_score / 10.0
        return data, round(final_score, 1)
