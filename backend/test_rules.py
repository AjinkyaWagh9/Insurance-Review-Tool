from app.core.rules.motor_rules import MotorPolicyInput, evaluate_motor_policy, MOTOR_SCORING_CONFIG

def test_motor_rules():
    # Test Case 1: Perfect Policy
    perfect_policy = MotorPolicyInput(
        policy_type="Comprehensive",
        vehicle_age_years=2,
        city="Mumbai",
        vehicle_type="SUV",
        has_voluntary_deductible=False,
        has_zero_depreciation=True,
        has_engine_protect=True,
        has_rti=True,
        has_tyre_protect=True
    )
    result = evaluate_motor_policy(perfect_policy)
    print(f"Perfect Policy Score: {result.total_score}")
    assert result.total_score == 100

    # Test Case 2: Third Party Only
    tp_policy = MotorPolicyInput(
        policy_type="Liability Only",
        vehicle_age_years=5,
        city="Pune",
        vehicle_type="Sedan",
        has_voluntary_deductible=False,
        has_zero_depreciation=False, # Missing -> Penalty
        has_engine_protect=False, # Missing in Flood City -> Penalty
        has_rti=False,
        has_tyre_protect=False
    )
    result = evaluate_motor_policy(tp_policy)
    print(f"TP Policy Score: {result.total_score}")
    print(f"Breakdown: {result.breakdown}")
    
    # Expected Penalties:
    # - Liability Only: -40
    # - Zero Dep (Age 5): -10
    # - Engine Protect (Pune=Flood): -20
    # - Tyre Protect (Sedan): -5
    # Total Penalty: -75 -> Score 25
    assert result.total_score == 25

    print("All tests passed!")

if __name__ == "__main__":
    test_motor_rules()
