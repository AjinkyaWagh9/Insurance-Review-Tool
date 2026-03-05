from fastapi import APIRouter, HTTPException
from app.core.rules.motor_rules import MotorPolicyInput, MOTOR_SCORING_CONFIG
from app.services.scoring.motor_engine import MotorScoringEngine

router = APIRouter()

@router.post("/score")
def score_motor_policy(policy: MotorPolicyInput):
    """
    Score a motor insurance policy based on the provided input.
    """
    engine = MotorScoringEngine()
    
    # Adapter: Map Pydantic model to the dict structure expected by MotorScoringEngine
    data = {
        "vehicle_snapshot": policy.policy_type,
        "recommendation_inputs": {"voluntary_deductible": policy.has_voluntary_deductible},
        "has_zero_dep": policy.has_zero_depreciation,
        "has_engine_protect": policy.has_engine_protect,
        "has_rti": policy.has_rti,
        "has_tyre_protect": policy.has_tyre_protect,
        "vehicle_age_years": policy.vehicle_age_years,
        "vehicle_type": policy.vehicle_type,
        "cons": policy.ai_risks_detected
    }
    
    try:
        result = engine.calculate(data, city=policy.city)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/rules")
def get_motor_rules():
    """
    Get the current configuration rules for Motor Insurance.
    """
    return MOTOR_SCORING_CONFIG
