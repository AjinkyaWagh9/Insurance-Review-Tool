from datetime import datetime

DEPRECIATION_RATES = [
    (0.5,  0.05),  # ≤ 6 months
    (1,    0.15),  # 6m – 1yr
    (2,    0.20),  # 1–2 yrs
    (3,    0.30),  # 2–3 yrs
    (4,    0.40),  # 3–4 yrs
    (5,    0.50),  # 4–5 yrs
]
DEFAULT_DEPRECIATION = 0.55  # > 5 years

def get_vehicle_age_years(reg_year: int) -> float:
    current_year = datetime.now().year
    return max(0, current_year - reg_year)

def get_depreciation_rate(age_years: float) -> float:
    for max_age, rate in DEPRECIATION_RATES:
        if age_years <= max_age:
            return rate
    return DEFAULT_DEPRECIATION

def calculate_idv(market_value: float, reg_year: int) -> dict:
    age = get_vehicle_age_years(reg_year)
    rate = get_depreciation_rate(age)
    ideal_idv = round(market_value * (1 - rate))
    return {
        "vehicle_age_years": int(age),
        "depreciation_rate": rate,
        "expected_market_value": int(market_value),
        "ideal_idv": ideal_idv,
    }
