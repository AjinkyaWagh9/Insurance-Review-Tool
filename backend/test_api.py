import requests
import json

BASE_URL = "http://127.0.0.1:8000/api/v1"

def test_api():
    # 1. Test Motor Rules GET
    print("Testing GET /motor/rules...")
    resp = requests.get(f"{BASE_URL}/motor/rules")
    assert resp.status_code == 200
    print("Motor Rules OK")

    # 2. Test Motor Score POST
    print("Testing POST /motor/score...")
    motor_payload = {
        "policy_type": "Comprehensive",
        "vehicle_age_years": 2,
        "city": "Mumbai",
        "vehicle_type": "SUV",
        "has_voluntary_deductible": False,
        "has_zero_depreciation": True,
        "has_engine_protect": True,
        "has_rti": True,
        "has_tyre_protect": True,
        "ai_risks_detected": []
    }
    resp = requests.post(f"{BASE_URL}/motor/score", json=motor_payload)
    if resp.status_code != 200:
        print(resp.text)
    assert resp.status_code == 200
    data = resp.json()
    assert data["score"] == 100
    print("Motor Score OK")

    # 3. Test Term Rules GET
    print("Testing GET /term/rules...")
    resp = requests.get(f"{BASE_URL}/term/rules")
    assert resp.status_code == 200
    print("Term Rules OK")

    # 4. Test Term Score POST
    print("Testing POST /term/score...")
    term_payload = {
        "age": 30,
        "income": 1000000,
        "loans": 0,
        "savings": 500000,
        "child_count": 1,
        "parents_dependent": False,
        "spouse_working": True,
        "extracted_sum_assured": 35000000,
        "detected_riders": ["waiver of premium"],
        "insurer_name": "HDFC Life"
    }
    resp = requests.post(f"{BASE_URL}/term/score", json=term_payload)
    if resp.status_code != 200:
        print(resp.text)
    assert resp.status_code == 200
    data = resp.json()
    assert data["score"] == 100
    print("Term Score OK")
    
    print("All API tests passed!")

if __name__ == "__main__":
    test_api()
