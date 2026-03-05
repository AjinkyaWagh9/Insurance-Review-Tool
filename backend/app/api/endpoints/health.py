from fastapi import APIRouter, HTTPException
from app.core.rules.health_rules import HEALTH_SCORING_CONFIG
from app.services.scoring.health_engine import calculate_health_score

router = APIRouter()

@router.post("/score")
def score_health_policy(input_data: dict):
    """
    Score a health insurance policy based on the provided input.
    Uses the new calculate_health_score function.
    """
    try:
        score, label = calculate_health_score(input_data, {})
        return {"score": score, "label": label}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/rules")
def get_health_rules():
    """
    Get the current configuration rules for Health Insurance.
    """
    return HEALTH_SCORING_CONFIG
