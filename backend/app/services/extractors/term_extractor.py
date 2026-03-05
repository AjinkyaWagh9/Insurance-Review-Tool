from openai import AsyncOpenAI
from app.prompts.term_prompts import TERM_EXTRACTION_PROMPT
import json
import os


def get_client():
    api_key = os.getenv("OPENAI_API_KEY")
    return AsyncOpenAI(api_key=api_key) if api_key else None


class TermPolicyExtractor:
    def _regex_scan_riders(self, text: str) -> list:
        """
        Pre-scan PDF text for known rider strings using exact pattern matching.
        Case-insensitive. This runs BEFORE GPT and supplements its output.
        Modeled on the hybrid approach from the original MVP tool.
        """
        found = []
        t = text.lower()

        # Waiver of Premium — multiple known variants
        if any(phrase in t for phrase in [
            "waiver of premium plus rider",
            "waiver of premium rider",
            "waiver of premium on critical illness",
            "premium waiver rider",
            "wop rider",
        ]):
            found.append("Waiver of Premium")

        # Accidental Death — multiple known variants
        if any(phrase in t for phrase in [
            "accidental death and dismemberment rider",
            "accident benefit rider",
            "accidental death benefit rider",
            "accidental death rider",
            "adb rider",
        ]):
            found.append("Accidental Death Benefit")

        # Critical Illness — multiple known variants
        if any(phrase in t for phrase in [
            "critical illness and disability rider",
            "platinum critical illness rider",
            "critical illness rider",
            "critical illness benefit rider",
            "ci rider",
        ]):
            found.append("Critical Illness Rider")

        # Income Benefit / Monthly Income Rider
        if any(phrase in t for phrase in [
            "income benefit rider",
            "monthly income rider",
            "income replacement rider",
        ]):
            found.append("Income Benefit Rider")

        # Child Support / Payor Benefit
        if any(phrase in t for phrase in [
            "child support benefit",
            "payor benefit rider",
            "child term rider",
        ]):
            found.append("Child Support Benefit")

        return found

    async def extract(self, text: str) -> dict:
        client = get_client()
        if not client:
            return {"error": "OPENAI_API_KEY not set"}

        try:
            # STEP A: Regex pre-scan (runs on full text, before GPT)
            regex_riders = self._regex_scan_riders(text)
            print(f"DEBUG: Regex pre-scan found riders: {regex_riders}")

            # STEP B: GPT extraction
            prompt = TERM_EXTRACTION_PROMPT.format(policy_text=text[:15000])

            response = await client.chat.completions.create(
                model="gpt-4o",
                messages=[
                    {
                        "role": "system",
                        "content": "You are an expert Indian term life insurance analyst. Return only valid JSON."
                    },
                    {
                        "role": "user",
                        "content": prompt
                    }
                ],
                response_format={"type": "json_object"},
                temperature=0
            )

            raw = response.choices[0].message.content
            extracted = json.loads(raw)
            print(f"DEBUG: GPT Raw Extraction Result for Term Policy:\n{json.dumps(extracted, indent=2)}")

            # STEP C: Merge regex + GPT riders (deduplicated)
            gpt_riders = extracted.get("riders_present", [])
            if not isinstance(gpt_riders, list):
                gpt_riders = []

            # Merge: combine both
            merged_riders = regex_riders + gpt_riders

            # Semantic normalization & deduplication
            RIDER_NORMALIZER = {
                "waiver of premium plus rider": "Waiver of Premium Plus Rider",
                "waiver of premium rider": "Waiver of Premium",
                "waiver of premium": "Waiver of Premium",
                "critical illness and disability rider": "Critical Illness and Disability Rider",
                "critical illness rider": "Critical Illness Rider",
                "accidental death and dismemberment rider": "Accidental Death and Dismemberment Rider",
                "accidental death benefit rider": "Accidental Death Benefit Rider",
                "accidental death benefit": "Accidental Death Benefit",
            }

            normalized = []
            seen_normalized = set()
            for rider in merged_riders:
                canonical = RIDER_NORMALIZER.get(rider.lower().strip(), rider)
                # Use first 3 words as dedup key to catch near-duplicates
                dedup_key = " ".join(canonical.lower().split()[:3])
                if dedup_key not in seen_normalized:
                    seen_normalized.add(dedup_key)
                    normalized.append(canonical)

            extracted["riders_present"] = normalized
            print(f"DEBUG: Final merged and normalized riders: {normalized}")

            # STEP D: Sanitize other fields
            if extracted.get("policy_term_end_age") == 0:
                extracted["policy_term_end_age"] = None

            if extracted.get("policy_start_age") == 0:
                extracted["policy_start_age"] = None

            if not extracted.get("extracted_sum_assured"):
                extracted["extracted_sum_assured"] = 0

            bad_insurer_values = {"unknown", "null", "n/a", "", "none"}
            if not extracted.get("insurer_name") or str(extracted["insurer_name"]).lower() in bad_insurer_values:
                extracted["insurer_name"] = "Unknown"

            return extracted

        except json.JSONDecodeError as e:
            print(f"JSON parse error in term extraction: {e}")
            return {"error": "Failed to parse extraction response"}
        except Exception as e:
            print(f"Term extraction error: {e}")
            return {"error": str(e)}
