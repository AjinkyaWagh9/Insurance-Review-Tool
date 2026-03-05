from app.services.scoring.motor_engine import MotorScoringEngine

def test_motor_engine():
    engine = MotorScoringEngine()
    
    # Test Case 1: Comprehensive Policy, New Car, Safe City
    data_1 = {
        "vehicle_snapshot": "Comprehensive Policy",
        "recommendation_inputs": {"voluntary_deductible": False},
        "has_zero_dep": True,
        "has_engine_protect": True,
        "has_rti": True,
        "has_tyre_protect": True,
        "vehicle_age_years": 1,
        "vehicle_type": "SUV",
        "cons": []
    }
    result_1 = engine.calculate(data_1, city="Jaipur")
    print(f"Test Case 1 Score: {result_1['score']}")
    assert result_1['score'] == 100
    
    # Test Case 2: Third Party, Old Car, Flood City
    data_2 = {
        "vehicle_snapshot": "Third Party Liability Only",
        "recommendation_inputs": {"voluntary_deductible": True}, # -20
        "has_zero_dep": False, # Age 8 -> -5
        "has_engine_protect": False, # Flood City -> -20
        "has_rti": False, # Age &gt; 3 -> No penalty
        "has_tyre_protect": False, # SUV -> -5
        "vehicle_age_years": 8,
        "vehicle_type": "SUV",
        "cons": ["High Claim Ratio"] # -3
    }
    # Penalties:
    # Third Party: -40
    # Voluntary Deductible: -20
    # Zero Dep (>7 years): -5
    # Engine Protect (Mumbai=Flood): -20
    # Tyre Protect (SUV): -5
    # AI Risks (1): -3
    # Total Penalty: -93
    # Score: 100 - 93 = 7 -> Clamped to 10
    
    result_2 = engine.calculate(data_2, city="Mumbai")
    print(f"Test Case 2 Score: {result_2['score']}")
    print(f"Test Case 2 Breakdown: {result_2['score_reasons']}")
    
    assert result_2['score'] == 10
    
    print("All engine tests passed!")

if __name__ == "__main__":
    test_motor_engine()
