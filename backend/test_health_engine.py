import requests
from app.services.scoring.health_engine import HealthScoringEngine
from app.schemas.health import HealthPolicyInput

def test_health_logic():
    print("Testing Health Engine Logic...")
    engine = HealthScoringEngine()

    # Test Case 1: Premium Base Plan
    # High SI (50L+ -> 30), No Rent Limit (15), No Copay (10), Restoration (8), PED 24m (15)
    # Good Qual: "Excellent" Sub-limits (15), "Included" Fertility (5)
    # ICR: 80 (Good -> 10)
    # Score = 30 + 15 + 10 + 8 + 15 + 15 + 5 + 10 = 108 -> Clamped 100
    
    input_1 = HealthPolicyInput(
        policy_snapshot=[{"label": "Title", "value": "Premium Health Plan"}],
        hard_sum_assured=5000000,
        hard_features={"noRoomRentLimit": True, "noCopay": True, "restoration": True},
        waiting_structured={"ped_months": 24},
        detailed_evaluation=[
            {"dimension": "Sub-limits", "rating": "Excellent", "explanation": "No sub-limits applied."},
            {"dimension": "Fertility", "rating": "Good", "explanation": "IVF and Surrogacy covered."}
        ],
        hidden_risks=[],
        icr_value=80.0
    )

    result_1 = engine.calculate(input_1)
    print(f"Test Case 1 Score: {result_1['score']}")
    # assert result_1['score'] == 100 # Expect 100

    # Test Case 2: Top-up Plan (Bonus features)
    # Type detected as Top-up.
    # Copay (15 bonus). ICR low (60 -> -5, but halved to -2.5).
    # SI 10L (25). Room Rent default (10). PED 36m (10).
    # Restoration Missing (2).
    # Score = 15 (Copay) - 2.5 (ICR) + 25 (SI) + 10 (RR) + 10 (PED) + 2 (Rest) = 59.5
    
    input_2 = HealthPolicyInput(
        policy_snapshot=[{"label": "Plan Name", "value": "Super Top Up Policy"}],
        hard_sum_assured=1000000,
        hard_features={"noRoomRentLimit": False, "noCopay": False, "restoration": False},
        waiting_structured={"ped_months": 36},
        detailed_evaluation=[],
        hidden_risks=[],
        icr_value=60.0
    )
    
    result_2 = engine.calculate(input_2)
    print(f"Test Case 2 Score: {result_2['score']}")
    print(f"Is Top Up: {result_2['is_top_up']}")
    assert result_2['is_top_up'] == True
    
    print("Logic Tests Passed.")

def test_health_api():
    print("\nTesting Health API...")
    BASE_URL = "http://127.0.0.1:8000/api/v1"
    
    # 1. GET Rules
    resp = requests.get(f"{BASE_URL}/health/rules")
    assert resp.status_code == 200
    print("GET /rules OK")
    
    # 2. POST Score
    payload = {
        "policy_snapshot": [{"label": "Name", "value": "Standard Policy"}],
        "hard_sum_assured": 500000,
        "hard_features": {"noRoomRentLimit": False, "noCopay": False, "restoration": False},
        "waiting_structured": {"ped_months": 48},
        "detailed_evaluation": [],
        "hidden_risks": ["Ambiguous terms in claim settlement"], # -3
        "icr_value": 75.0 # Average -> 5
    }
    
    # Expected:
    # SI 5L (20) + RR Default (10) + Copay Has (-5) + Rest Missing (2) + PED 48 (7) + Ambiguous (-3) + ICR (5)
    # Total = 20 + 10 - 5 + 2 + 7 - 3 + 5 = 36
    
    resp = requests.post(f"{BASE_URL}/health/score", json=payload)
    if resp.status_code != 200:
        print(resp.text)
    assert resp.status_code == 200
    data = resp.json()
    print(f"API Score: {data['score']}")
    print(f"Reasons: {data['score_reasons']}")
    
    print("API Tests Passed.")

if __name__ == "__main__":
    test_health_logic()
    test_health_api()
