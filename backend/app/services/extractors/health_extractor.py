"""
Health Policy Extractor — RULEBOOK v3.0
Multi-layer extraction: Insurer Detection → Section Anchors → Regex Pre-scan → LLM → Reconciliation
Covers: ManipalCigna · ICICI Lombard · Aditya Birla
"""

from openai import AsyncOpenAI
import json
import os

from app.prompts.health import HEALTH_EXTRACTION_PROMPT
from app.services.extractors.health_extraction_utils import (
    detect_insurer,
    build_smart_context,
    extract_section_window,
    extract_premium,
    validate_and_annualize_premium,
    extract_waiting_periods,
    extract_aditya_birla_insured_continuation,
    count_insured_members,
    extract_room_rent,
    extract_policy_details,
    extract_sum_insured,
    extract_global_coverage,
)


def get_client():
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        raise ValueError("OPENAI_API_KEY is not set. Please add it to your backend/.env file.")
    return AsyncOpenAI(api_key=api_key)


class HealthPolicyExtractor:
    async def extract(self, text: str) -> dict:
        """
        Full RULEBOOK multi-layer extraction pipeline.

        [1] detect_insurer
        [2] build_smart_context (section anchor windows)
        [3] Regex pre-extraction (premium, waiting periods, members, room rent, sum insured)
        [4] LLM extraction on smart_context
        [5] Reconciliation (prefer regex when sanity_ok; LLM as fallback)
        [6] validate_and_annualize_premium
        """

        # ── [1] Insurer detection ───────────────────────────────────────────
        insurer = detect_insurer(text)

        # ── [2] Section windows ─────────────────────────────────────────────
        premium_window   = extract_section_window(text, "premium")
        insured_window   = extract_section_window(text, "insured")
        waiting_window   = extract_section_window(text, "waiting")
        policy_window    = extract_section_window(text, "policy_info")
        benefits_window  = extract_section_window(text, "benefits")
        financial_window = extract_section_window(text, "financial_limits")
        smart_context    = build_smart_context(text)

        # ── [3] Regex pre-extraction ────────────────────────────────────────

        # Premium — search premium window first, then full text as fallback
        regex_premium = extract_premium(premium_window) or extract_premium(text)

        # Sum insured
        regex_sum_insured = (
            extract_sum_insured(insured_window)
            or extract_sum_insured(policy_window)
            or extract_sum_insured(text)
        )

        # Policy details
        regex_policy_details = extract_policy_details(policy_window or text[:4000])

        # Member count
        regex_members = count_insured_members(insured_window) if insured_window else None

        # Waiting periods
        regex_waiting_raw: dict = {}
        if insurer == "aditya_birla":
            ab = extract_aditya_birla_insured_continuation(insured_window)
            regex_waiting_raw = {
                "initial_days":    ab.get("initial_waiting_days"),
                "ped_months":      ab.get("ped_waiting_months"),
                "specific_months": ab.get("specific_waiting_months"),
            }
            if not regex_sum_insured and ab.get("sum_insured"):
                regex_sum_insured = ab["sum_insured"]
        else:
            combined_waiting = (waiting_window or "") + "\n" + (insured_window or "")
            regex_waiting_raw = extract_waiting_periods(combined_waiting)

        # ICICI JumpStart override
        icici_jumpstart = insurer == "icici_lombard" and "jumpstart" in text.lower()
        if icici_jumpstart:
            regex_waiting_raw["ped_months"] = 1  # 30 days ~= 1 month

        # Room rent
        regex_room_rent = extract_room_rent(benefits_window, financial_window)

        # Global Coverage (Rule 15) - Scan full text
        regex_global_cover = extract_global_coverage(text)

        # ── [4] LLM extraction ──────────────────────────────────────────────
        try:
            client = get_client()
            prompt = HEALTH_EXTRACTION_PROMPT.format(policy_text=smart_context)
            response = await client.chat.completions.create(
                model="gpt-4o",
                messages=[{"role": "user", "content": prompt}],
                response_format={"type": "json_object"},
                temperature=0,
            )
            llm_result: dict = json.loads(response.choices[0].message.content)
        except Exception as e:
            print(f"Health LLM extraction error: {e}")
            llm_result = {}

        # ── [5] Reconciliation ──────────────────────────────────────────────
        extracted = dict(llm_result)
        extraction_flags: list[str] = []

        # --- Premium reconciliation ---
        llm_premium_raw = extracted.get("premium")
        llm_premium = None
        if llm_premium_raw is not None:
            try:
                llm_premium = float(llm_premium_raw)
            except (ValueError, TypeError):
                llm_premium = None

        if llm_premium and 3000 <= llm_premium <= 500000:
            if regex_premium and abs(llm_premium - regex_premium) / max(llm_premium, 1) > 0.10:
                extraction_flags.append("premium_regex_llm_mismatch")
            extracted["premium"] = int(llm_premium)
        elif regex_premium and 3000 <= regex_premium <= 500000:
            if llm_premium:
                print(f"LLM premium {llm_premium} out of range, using regex: {regex_premium}")
                extraction_flags.append("premium_llm_out_of_range")
            else:
                print(f"LLM missed premium, regex found: {regex_premium}")
                extraction_flags.append("premium_from_regex")
            extracted["premium"] = int(regex_premium)
        else:
            extracted["premium"] = None

        # --- Sum insured reconciliation ---
        llm_si = extracted.get("sum_insured")
        print(f"[DEBUG][reconcile] regex_sum_insured={regex_sum_insured!r}  llm_sum_insured={llm_si!r}")
        if not llm_si and regex_sum_insured:
            extracted["sum_insured"] = regex_sum_insured
            extraction_flags.append("sum_insured_from_regex")
            print(f"[DEBUG][reconcile] sum_insured: LLM returned nothing → using regex {regex_sum_insured}")
        elif llm_si and regex_sum_insured and int(llm_si) != int(regex_sum_insured):
            print(f"[DEBUG][reconcile] sum_insured MISMATCH: LLM={llm_si}  regex={regex_sum_insured} → trusting LLM")
        extracted["sum_insured"] = int(extracted.get("sum_insured") or 0)
        print(f"[DEBUG][reconcile] final sum_insured={extracted['sum_insured']}")

        # --- Members reconciliation ---
        if not extracted.get("members_covered") and regex_members:
            extracted["members_covered"] = regex_members

        # --- Room rent reconciliation ---
        if not extracted.get("room_rent_limit") and regex_room_rent:
            extracted["room_rent_limit"] = regex_room_rent
            extraction_flags.append("room_rent_from_regex")

        # --- Policy details (fill LLM gaps from regex) ---
        if not extracted.get("policy_number") and regex_policy_details.get("policy_number"):
            extracted["policy_number"] = regex_policy_details["policy_number"]
        if not extracted.get("policy_tenure") and regex_policy_details.get("policy_tenure"):
            extracted["policy_tenure"] = f"{regex_policy_details['policy_tenure']} Year"

        # --- Waiting periods reconciliation ---
        wp_llm = extracted.get("waiting_periods")
        if not isinstance(wp_llm, dict):
            wp_llm = {}

        initial_days    = (regex_waiting_raw.get("initial_days")    or int(wp_llm.get("initial_days")    or 30))
        ped_months      = (regex_waiting_raw.get("ped_months")       or int(wp_llm.get("ped_months")       or 48))
        specific_months = (regex_waiting_raw.get("specific_months")  or int(wp_llm.get("specific_months")  or 24))

        # Build human-readable strings
        ped_human      = f"{ped_months // 12} years" if ped_months % 12 == 0 else f"{ped_months} months"
        specific_human = f"{specific_months // 12} years" if specific_months % 12 == 0 else f"{specific_months} months"

        extracted["waiting_periods"] = {
            "initial_days":    initial_days,
            "ped_months":      ped_months,
            "specific_months": specific_months,
            "existing":        wp_llm.get("existing")  or ped_human,
            "specific":        wp_llm.get("specific")  or specific_human,
        }

        if any(regex_waiting_raw.values()):
            extraction_flags.append("waiting_periods_regex_used")

        # --- Instant Cover reconciliation ---
        instant_cover = bool(extracted.get("instant_cover", False)) or icici_jumpstart
        instant_cover_conditions = extracted.get("instant_cover_conditions") or []
        if not isinstance(instant_cover_conditions, list):
            instant_cover_conditions = []

        # Determine EFFECTIVE PED waiting period
        if instant_cover:
            ped_effective_months = 1   # ~30 days
        elif ped_months == 0:
            ped_effective_months = 0   # portability continuity wiped it out
        else:
            ped_effective_months = ped_months  # standard contractual term

        extracted["instant_cover"] = instant_cover
        extracted["instant_cover_conditions"] = instant_cover_conditions
        extracted["ped_effective_months"] = ped_effective_months

        if instant_cover:
            extraction_flags.append("instant_cover_detected")

        # ── [6] Premium annualization ───────────────────────────────────────
        if extracted.get("premium"):
            tenure_years = extracted.get("tenure_years")
            if not tenure_years:
                # Try to infer from policy_tenure string
                try:
                    pt = str(extracted.get("policy_tenure") or "")
                    tenure_years = int(pt.split()[0])
                except (IndexError, ValueError):
                    tenure_years = 1

            payment_mode = str(extracted.get("payment_mode") or "Annual")
            premium_info = validate_and_annualize_premium(
                float(extracted["premium"]),
                tenure_years,
                payment_mode,
            )
            extracted["total_premium_paid"]  = premium_info["total_premium_paid"]
            extracted["annualized_premium"]  = premium_info["annualized_premium"]
            extracted["is_single_payment"]   = premium_info["is_single_payment"]
            extracted["payment_mode"]        = premium_info["payment_mode"]

            if not premium_info["sanity_ok"]:
                extraction_flags.append("premium_sanity_failed")

        # ── Type normalization ──────────────────────────────────────────────
        extracted["copay_percentage"]  = float(extracted.get("copay_percentage")  or 0)
        extracted["deductible"]        = float(extracted.get("deductible")        or 0)
        extracted["ncb_percentage"]    = float(extracted.get("ncb_percentage")    or 0)
        extracted["ncb_max_percentage"] = float(extracted.get("ncb_max_percentage") or 0)

        if not isinstance(extracted.get("sub_limits"), list):
            extracted["sub_limits"] = []

        extracted["restoration_present"] = bool(extracted.get("restoration_present"))
        extracted["has_zonal_copay"]     = bool(extracted.get("has_zonal_copay"))
        
        # Global Health Coverage reconciliation (Regex trust)
        extracted["global_health_coverage"] = regex_global_cover or bool(extracted.get("global_health_coverage"))
        if regex_global_cover:
            extraction_flags.append("global_cover_from_regex")

        # Attach metadata
        extracted["insurer_detected"]    = insurer
        extracted["extraction_flags"]    = extraction_flags

        return extracted
