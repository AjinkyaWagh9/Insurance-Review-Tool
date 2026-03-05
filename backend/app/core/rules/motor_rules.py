from pydantic import BaseModel, Field
from typing import List, Optional

# --- Configuration ---
MOTOR_SCORING_CONFIG = {
    "global": {
        "start_score": 100,
        "min_score": 10,
        "max_score": 100
    },
    "policy_type": {
        "third_party_penalty": -40,
        "keywords": ["liability only", "third party"]
    },
    "voluntary_deductible": {
        "penalty": -20
    },
    "zero_depreciation": {
        "missing_age_0_3": -20,
        "missing_age_4_7": -10,
        "missing_older_than_7": -5
    },
    "engine_protect": {
        "missing_flood_city": -20,
        "missing_normal": -10,
        "flood_cities": [
            "mumbai", "chennai", "bengaluru", "bangalore", 
            "gurugram", "gurgaon", "delhi", "new delhi", 
            "hyderabad", "kolkata", "bombay", "pune"
        ]
    },
    "rti": {
        "missing_age_0_3": -10
    },
    "tyre_protect": {
        "missing_penalty": -5,
        "applicable_types": ["suv", "sedan", "luxury", "two wheeler"]
    },
    "ai_risks": {
        "penalty_per_risk": -3
    },
    "idv_status": {
        "under_insured_penalty": -15   # Critical safety gap
    }
}

# --- Data Models ---
class MotorPolicyInput(BaseModel):
    policy_type: str = Field(..., description="Type of policy, e.g., 'Comprehensive', 'Liability Only'")
    vehicle_age_years: int = Field(..., ge=0, description="Age of the vehicle in years")
    city: str = Field(..., description="City where the vehicle is registered/used")
    vehicle_type: str = Field(..., description="Type of vehicle, e.g., 'suv', 'sedan', 'hatchback'")
    
    # Coverage Flags
    has_voluntary_deductible: bool = Field(False, description="Whether the policy has a voluntary deductible")
    has_zero_depreciation: bool = Field(False, description="Whether Zero Depreciation cover is present")
    has_engine_protect: bool = Field(False, description="Whether Engine Protection cover is present")
    has_rti: bool = Field(False, description="Whether Return to Invoice (RTI) cover is present")
    has_tyre_protect: bool = Field(False, description="Whether Tyre Protection cover is present")
    
    # AI Analysis
    ai_risks_detected: List[str] = Field(default_factory=list, description="List of risks detected by AI analysis")

class ScoringResult(BaseModel):
    total_score: int
    breakdown: List[str]

# --- Evaluation Logic ---
def evaluate_motor_policy(policy: MotorPolicyInput) -> ScoringResult:
    config = MOTOR_SCORING_CONFIG
    score = config["global"]["start_score"]
    reasons = []

    # 1. Policy Type Check
    p_type_lower = policy.policy_type.lower()
    if any(k in p_type_lower for k in config["policy_type"]["keywords"]):
        penalty = config["policy_type"]["third_party_penalty"]
        score += penalty
        reasons.append(f"Policy Type ({policy.policy_type}): {penalty} pts")

    # 2. Voluntary Deductible
    if policy.has_voluntary_deductible:
        penalty = config["voluntary_deductible"]["penalty"]
        score += penalty
        reasons.append(f"Voluntary Deductible present: {penalty} pts")

    # 3. Zero Depreciation
    if not policy.has_zero_depreciation:
        age = policy.vehicle_age_years
        penalty = 0
        if 0 <= age <= 3:
            penalty = config["zero_depreciation"]["missing_age_0_3"]
        elif 4 <= age <= 7:
            penalty = config["zero_depreciation"]["missing_age_4_7"]
        else:
            penalty = config["zero_depreciation"]["missing_older_than_7"]
        
        score += penalty
        reasons.append(f"Zero Depreciation missing (Age {age}): {penalty} pts")

    # 4. Engine Protect
    if not policy.has_engine_protect:
        city_lower = policy.city.lower()
        is_flood_city = city_lower in config["engine_protect"]["flood_cities"]
        
        if is_flood_city:
            penalty = config["engine_protect"]["missing_flood_city"]
            reasons.append(f"Engine Protect missing in flood-prone city ({policy.city}): {penalty} pts")
        else:
            penalty = config["engine_protect"]["missing_normal"]
            reasons.append(f"Engine Protect missing: {penalty} pts")
        score += penalty

    # 5. Return to Invoice (RTI)
    if not policy.has_rti:
        if 0 <= policy.vehicle_age_years <= 3:
            penalty = config["rti"]["missing_age_0_3"]
            score += penalty
            reasons.append(f"RTI missing (Age {policy.vehicle_age_years}): {penalty} pts")

    # 6. Tyre Protect
    if not policy.has_tyre_protect:
        v_type_lower = policy.vehicle_type.lower()
        if v_type_lower in config["tyre_protect"]["applicable_types"]:
            penalty = config["tyre_protect"]["missing_penalty"]
            score += penalty
            reasons.append(f"Tyre Protect missing for {policy.vehicle_type}: {penalty} pts")

    # 7. AI Risks
    risk_count = len(policy.ai_risks_detected)
    if risk_count > 0:
        penalty = risk_count * config["ai_risks"]["penalty_per_risk"]
        score += penalty
        reasons.append(f"AI Risks detected ({risk_count}): {penalty} pts")

    # Clamping
    final_score = max(config["global"]["min_score"], min(config["global"]["max_score"], score))
    
    return ScoringResult(total_score=final_score, breakdown=reasons)
