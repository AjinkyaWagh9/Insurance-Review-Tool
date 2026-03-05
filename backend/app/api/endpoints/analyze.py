"""
Policy Analysis Endpoint — RULEBOOK v2.0
Full pipeline: PDF → Extract → ICR Lookup → Score → LLM Recommendations → Response
"""

from fastapi import APIRouter, File, UploadFile, HTTPException, Form
import json

from openai import AsyncOpenAI
import os
from datetime import datetime

from app.services.ocr_service import extract_text_from_pdf
from app.services.extractors.health_extractor import HealthPolicyExtractor
from app.services.scoring.health_engine import calculate_health_score
from app.data.icr_database import get_icr
from app.prompts.health import HEALTH_RECOMMENDATION_PROMPT
from app.prompts.motor import MOTOR_EXTRACTION_PROMPT
from app.services.motor_idv import calculate_idv
from app.services.scoring.motor_engine import MotorScoringEngine

router = APIRouter()

def get_openai_client():
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="OPENAI_API_KEY is not set. Please add it to your backend/.env file.")
    return AsyncOpenAI(api_key=api_key)


# --- Ideal Health Cover Logic (Conservative but Dynamic) ---
TIER_1_CITIES = {
    "delhi", "delhi ncr", "new delhi",
    "mumbai", "bombay",
    "bangalore", "bengaluru",
    "chennai",
    "hyderabad",
    "ahmedabad",
}

def _get_base_cover(city: str) -> int:
    """Determine base cover based on healthcare costs in the city tier."""
    if city and city.lower().strip() in TIER_1_CITIES:
        return 20_00_000  # ₹20 Lakh
    return 10_00_000      # ₹10 Lakh

def _get_age_multiplier(age: int) -> float:
    """Medical risk and premium inflation typically increase with age."""
    if age > 40:
        return 1.25
    elif 31 <= age <= 40:
        return 1.15
    return 1.0

def _get_family_multiplier(member_count: int, has_parents: bool = False) -> float:
    """
    Dynamic scaling for Family Floater plans.
    Accounts for shared statistical risk rather than linear multiplication.
    Having parents adds a separate risk tier due to higher medical utilization.
    """
    if has_parents:
        return 1.20  # Parents — higher utilization, chronic risk
    if member_count <= 1:
        return 1.0   # Individual
    elif member_count == 2:
        return 1.15  # Couple
    elif member_count <= 4:
        return 1.25  # Standard Family (e.g., 2 Adults, 1-2 Kids)
    else:
        return 1.35  # Large Family (5+ members)

def _get_inflation_multiplier(base_year: int = 2026, annual_rate: float = 1.10) -> float:
    """
    Applies a compounding medical inflation factor.
    Prevents static buffers from becoming obsolete as years pass.
    """
    current_year = datetime.now().year
    years_passed = max(0, current_year - base_year)
    return round((annual_rate ** years_passed), 2)

def _calculate_ideal_cover(city: str, age: int, member_count: int, has_parents: bool = False) -> int:
    """
    Calculates a realistic, defensible ideal health cover sum.
    Prevents 'premium shock' by avoiding aggressive multiplier stacking.
    """
    base = _get_base_cover(city)
    age_factor = _get_age_multiplier(age)
    family_factor = _get_family_multiplier(member_count, has_parents)
    inflation_factor = _get_inflation_multiplier()

    raw_ideal_cover = base * age_factor * family_factor * inflation_factor
    
    # Round to the nearest Lakh (₹1,0,000) for clean presentation
    final_cover_rounded = int(round(raw_ideal_cover / 100_000) * 100_000)
    
    return final_cover_rounded


@router.post("/analyze")
async def analyze_policy(
    policy_pdf: UploadFile = File(...),
    policy_type: str = Form(...),
    user_age: int = Form(0),
    user_city: str = Form(''),
    family_type: str = Form('individual'),
    members: int = Form(1),
    room_preference: str = Form('shared'),
    child_planning: bool = Form(False),
    family_history: bool = Form(False),
    parents: bool = Form(False),
    market_value: float = Form(0),
):
    """
    Analyze an uploaded insurance policy PDF.
    Full pipeline per RULEBOOK v1.0.
    """
    # Step 1: Extract PDF text
    content = await policy_pdf.read()
    text = extract_text_from_pdf(content)
    
    print(f"DEBUG: Extracted text length: {len(text)}")

    if not text.strip() or text == "[EMPTY_OCR_RESULT]":
        raise HTTPException(
            status_code=400, 
            detail='PDF analysis failed: No text could be extracted. This usually happens with scanned images or low-quality photos. Please upload a clear digital PDF.'
        )

    # Step 2: Extract structured fields via GPT-4o
    if policy_type.lower() == 'health':
        extractor = HealthPolicyExtractor()
        extracted = await extractor.extract(text)
        print(f"DEBUG: Health Extracted Data: {json.dumps(extracted, indent=2)}")
        
        # Step 3: ICR lookup (Health only)
        icr_value, icr_rating = get_icr(extracted.get('insurer_name', ''))
        extracted['icr_value'] = icr_value
        extracted['icr_rating'] = icr_rating

        # Step 4: Calculate score using health_rules.py
        user_prefs = {
            'age': user_age,
            'city': user_city,
            'family_type': family_type,
            'members': members,
            'room_preference': room_preference,
            'child_planning': child_planning,
            'family_history': family_history,
        }
        policy_score, score_label = calculate_health_score(extracted, user_prefs)
        extracted['policy_score'] = policy_score
        extracted['score_label'] = score_label

        # Step 5: Calculate ideal cover
        ideal_cover = _calculate_ideal_cover(user_city, user_age, members, has_parents=parents)
        print(f"DEBUG: Ideal Cover: {ideal_cover} (parents={parents})")

        # Step 6: Generate comparison rows + recommendations via LLM
        try:
            client = get_openai_client()
            rec_response = await client.chat.completions.create(
                model='gpt-4o',
                messages=[{
                    'role': 'user',
                    'content': HEALTH_RECOMMENDATION_PROMPT.format(
                        policy_json=json.dumps(extracted, indent=2),
                        prefs_json=json.dumps(user_prefs, indent=2),
                        ideal_cover=ideal_cover,
                        policy_global_coverage=extracted.get('global_health_coverage', False),
                    ),
                }],
                response_format={'type': 'json_object'},
                temperature=0.3,
            )
            rec_data = json.loads(rec_response.choices[0].message.content)
            print(f"DEBUG: Recommendation Data: {json.dumps(rec_data, indent=2)}")
        except Exception as e:
            print(f"Error generating recommendations: {e}")
            rec_data = {
                'comparison_rows': [],
                'recommendations': [],
            }

        # Step 7: Merge and return
        result = {
            **extracted,
            'policy_score': policy_score,
            'score_label': score_label,
            'comparison_rows': rec_data.get('comparison_rows', []),
            'recommendations': rec_data.get('recommendations', []),
            'ideal_cover': ideal_cover,
            'is_family_floater': extracted.get('is_family_floater', False),
            'members_covered': extracted.get('members_covered', None),
            'global_health_coverage': extracted.get('global_health_coverage', False),
        }
        
        print(f"DEBUG: Final Health Result Keys: {list(result.keys())}")
        print(f"DEBUG: Returning health analysis result with score {result.get('policy_score')}")
        return result

    elif policy_type.lower() == 'motor':
        # --- Motor Policy Logic (RULEBOOK Section 7) ---
        try:
            client = get_openai_client()
            response = await client.chat.completions.create(
                model='gpt-4o',
                messages=[{
                    'role': 'user',
                    'content': MOTOR_EXTRACTION_PROMPT.format(policy_text=text[:8000])
                }],
                response_format={'type': 'json_object'},
                temperature=0,
            )
            extracted = json.loads(response.choices[0].message.content)
            print(f"DEBUG: GPT Extracted Motor Data: {json.dumps(extracted, indent=2)}")
        except Exception as e:
            print(f"Error in motor extraction: {e}")
            raise HTTPException(status_code=500, detail=f"Failed to extract motor policy data: {e}")

        try:
            # Step 3: Calculate IDV and depreciation (Section 5)
            reg_year_raw = extracted.get('vehicle_reg_year')
            try:
                reg_year = int(reg_year_raw) if reg_year_raw else 2020
            except (ValueError, TypeError):
                reg_year = 2020
            
            print(f"DEBUG: Calculated Age for reg_year {reg_year}")
            idv_data = calculate_idv(market_value, reg_year)
            vehicle_age_years = idv_data['vehicle_age_years']
            print(f"DEBUG: IDV Data: {json.dumps(idv_data, indent=2)}")

            policy_idv = int(extracted.get('policy_idv') or 0)
            ideal_idv = idv_data['ideal_idv']
            idv_gap = ideal_idv - policy_idv
            print(f"DEBUG: IDV Gap (Signed): {idv_gap} (Ideal: {ideal_idv}, Policy: {policy_idv})")

            # Step 4: Score using motor_engine.py (Section 6)
            motor_engine = MotorScoringEngine()
            add_ons = extracted.get('add_ons', {})
            
            deductible = 0
            try:
                deductible = int(extracted.get('deductible') or 0)
            except (ValueError, TypeError):
                deductible = 0

            scoring_data = {
                'vehicle_snapshot': extracted.get('policy_type', ''),
                'recommendation_inputs': {
                    'voluntary_deductible': deductible > 0,
                },
                'has_zero_dep':       add_ons.get('zero_dep', False),
                'has_engine_protect': add_ons.get('engine_protect', False),
                'has_rti':            add_ons.get('rti', False),
                'has_tyre_protect':   add_ons.get('tyre_protect', False),
                'vehicle_age_years':  vehicle_age_years,
                'vehicle_type':       extracted.get('vehicle_type', ''),
                'cons':               extracted.get('financial_risks', []),
                'idv_gap':            idv_gap,
                'ideal_idv':          ideal_idv,
            }
            
            print(f"DEBUG: Scoring Data: {json.dumps(scoring_data, indent=2)}")
            score_result = motor_engine.calculate(scoring_data, city=user_city)
            policy_score = score_result['score']
            score_reasons = score_result['score_reasons']
            print(f"DEBUG: Score Result: {json.dumps(score_result, indent=2)}")

            # Step 5: Label
            if policy_score >= 75:
                score_label = 'Strong'
            elif policy_score >= 50:
                score_label = 'Needs Attention'
            else:
                score_label = 'Critical Gaps'

            final_result = {
                'vehicle_reg_year':      reg_year,
                'vehicle_variant':       extracted.get('vehicle_variant', ''),
                'policy_idv':            policy_idv,
                'expected_market_value': int(idv_data['expected_market_value']),
                'ideal_idv':             ideal_idv,
                'idv_gap':               idv_gap,
                'policy_score':          policy_score,
                'score_label':           score_label,
                'score_reasons':         score_reasons,
                'add_ons': {
                    'zero_dep':       add_ons.get('zero_dep', False),
                    'engine_protect': add_ons.get('engine_protect', False),
                    'rti':            add_ons.get('rti', False),
                    'ncb_protect':    add_ons.get('ncb_protect', False),
                    'tyre_protect':   add_ons.get('tyre_protect', False),
                    'consumables':     add_ons.get('consumables', False),
                    'roadside_assist': add_ons.get('roadside_assist', False),
                },
                'deductible':    deductible,
                'insurer_name':  extracted.get('insurer_name', ''),
                'vehicle_make':  extracted.get('vehicle_make', ''),
                'vehicle_model': extracted.get('vehicle_model', ''),
                'vehicle_type':  extracted.get('vehicle_type', ''),
                'policy_type':   extracted.get('policy_type', 'Comprehensive'),
                'ncb_percentage':int(extracted.get('ncb_percentage') or 0),
                'vehicle_age_years': vehicle_age_years,
            }
            print(f"DEBUG: Final Motor Result Keys: {list(final_result.keys())}")
            return final_result

        except Exception as e:
            print(f"Error in motor processing logic: {e}")
            import traceback
            traceback.print_exc()
            raise HTTPException(status_code=500, detail=f"Internal error during motor processing: {e}")

    else:
        raise HTTPException(status_code=400, detail=f'Unsupported policy type: {policy_type}')
