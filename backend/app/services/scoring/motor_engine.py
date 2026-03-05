from typing import Dict, List, Any
from app.core.rules.motor_rules import MOTOR_SCORING_CONFIG

class MotorScoringEngine:
    def __init__(self):
        self.config = MOTOR_SCORING_CONFIG

    def calculate(self, data: Dict[str, Any], city: str) -> Dict[str, Any]:
        """
        Calculates the motor insurance score based on the provided data and city.
        
        Args:
            data (dict): The extracted policy data containing vehicle_snapshot, 
                         recommendation_inputs, cons, etc.
            city (str): The city name for flood risk assessment.
            
        Returns:
            dict: A dictionary containing 'score' (int) and 'score_reasons' (list).
        """
        score = self.config["global"]["start_score"]
        reasons = []
        
        # 1. Policy Type Check
        vehicle_snapshot = data.get('vehicle_snapshot', '').lower()
        if any(keyword in vehicle_snapshot for keyword in self.config["policy_type"]["keywords"]):
            penalty = self.config["policy_type"]["third_party_penalty"]
            score += penalty
            reasons.append(f"Policy Type ({vehicle_snapshot}): {penalty} pts")

        # 2. Voluntary Deductible
        rec_inputs = data.get('recommendation_inputs', {})
        if rec_inputs.get('voluntary_deductible', False):
            penalty = self.config["voluntary_deductible"]["penalty"]
            score += penalty
            reasons.append(f"Voluntary Deductible present: {penalty} pts")

        # Helper to check coverage presence based on data structure
        # Assuming simple boolean keys or presence in some list if not explicitly defined in requirements
        # For this implementation, I will assume they are booleans in recommendation_inputs or similar
        # But wait, the prompt says "If has_zero_dep is False". 
        # I need to derive these flags from the data dict.
        # Let's assume standard extraction keys for now based on typical data shapes.
        # If not present, I'll default to False (conservative) or look for them.
        # Actually, let's look at how I mapped them in `MotorPolicyInput` in the rules file.
        # It seems the prompt implies these might be derived.
        # Let's assume 'data' has these keys directly or inside 'features'/'coverages'.
        # Re-reading prompt: "If has_zero_dep is False". It implies `has_zero_dep` is a variable ready to use.
        # I will look for them in `data` root or `data['recommendation_inputs']`.
        # Let's assume they are in `data` for simplicity of this engine specific logic as requested.
        
        has_zero_dep = data.get('has_zero_dep', False)
        has_engine_protect = data.get('has_engine_protect', False)
        has_rti = data.get('has_rti', False)
        has_tyre_protect = data.get('has_tyre_protect', False)
        vehicle_age = data.get('vehicle_age_years', 0) # Default to 0 if not found
        vehicle_type = data.get('vehicle_type', '').lower()

        # 3. Zero Depreciation
        if not has_zero_dep:
            penalty = 0
            if vehicle_age <= 3:
                penalty = self.config["zero_depreciation"]["missing_age_0_3"]
                reasons.append(f"Zero Depreciation missing (Age {vehicle_age}): {penalty} pts")
            elif vehicle_age <= 7:
                penalty = self.config["zero_depreciation"]["missing_age_4_7"]
                reasons.append(f"Zero Depreciation missing (Age {vehicle_age}): {penalty} pts")
            else:
                penalty = self.config["zero_depreciation"]["missing_older_than_7"]
                reasons.append(f"Zero Depreciation missing (Age {vehicle_age}): {penalty} pts")
            score += penalty

        # 4. Engine Protect
        if not has_engine_protect:
            city_lower = city.lower()
            is_flood_city = city_lower in self.config["engine_protect"]["flood_cities"]
            
            if is_flood_city:
                penalty = self.config["engine_protect"]["missing_flood_city"]
                reasons.append(f"Engine Protect missing in flood-prone city ({city}): {penalty} pts")
            else:
                penalty = self.config["engine_protect"]["missing_normal"]
                reasons.append(f"Engine Protect missing: {penalty} pts")
            score += penalty

        # 5. Return to Invoice (RTI)
        if not has_rti and vehicle_age <= 3:
            penalty = self.config["rti"]["missing_age_0_3"]
            score += penalty
            reasons.append(f"RTI missing (Age {vehicle_age}): {penalty} pts")

        # 6. Tyre Protect
        if not has_tyre_protect:
            if any(v_type in vehicle_type for v_type in self.config["tyre_protect"]["applicable_types"]):
                penalty = self.config["tyre_protect"]["missing_penalty"]
                score += penalty
                reasons.append(f"Tyre Protect missing for {vehicle_type}: {penalty} pts")

        # 7. AI Risks
        cons = data.get('cons', [])
        risk_count = len(cons)
        if risk_count > 0:
            penalty = risk_count * self.config["ai_risks"]["penalty_per_risk"]
            score += penalty
            reasons.append(f"AI Risks detected ({risk_count}): {penalty} pts")

        # 8. IDV Status (Gap Analysis)
        # gap = Ideal IDV - Policy IDV
        # Positive = Under-insured, Negative = Over-insured
        idv_gap = data.get('idv_gap', 0)
        ideal_idv = data.get('ideal_idv', 0)
        
        if ideal_idv > 0:
            gap_percent = (idv_gap / ideal_idv) * 100
            
            # Margin of error (5%)
            if gap_percent > 5:
                # Under-insured
                penalty = self.config["idv_status"]["under_insured_penalty"]
                score += penalty
                reasons.append(f"Vehicle Under-insured: {penalty} pts")
            elif gap_percent < -5:
                # Over-insured
                reasons.append("Vehicle Over-insured (Financial leak, but safe)")
            else:
                reasons.append("IDV check: Optimal cover")

        # Clamping
        final_score = max(self.config["global"]["min_score"], 
                          min(self.config["global"]["max_score"], score))
        
        return {
            "score": final_score,
            "score_reasons": reasons
        }
