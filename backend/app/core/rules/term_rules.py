TERM_SCORING_CONFIG = {
    "global": {
        "start_score": 100,
        "min_score": 0,
        "max_score": 100
    },
    # 1. DIME CALCULATION CONSTANTS (Ideal Cover)
    "dime": {
        "multiplier": 10,
        "dependent_buffer": 5000000,   # 50 Lakhs per dependent
    },
    # 2. COVERAGE GAP PENALTIES (Tiered by Ratio = Current / Ideal)
    "coverage_gap": {
        "tiers": [
            {"max_ratio": 0.15, "penalty": -60, "status": "Catastrophic Coverage (<15%)"},
            {"max_ratio": 0.30, "penalty": -50, "status": "Critical Underinsurance (15-30%)"},
            {"max_ratio": 0.45, "penalty": -40, "status": "Severe Coverage Gap (30-45%)"},
            {"max_ratio": 0.60, "penalty": -30, "status": "Major Coverage Gap (45-60%)"},
            {"max_ratio": 0.75, "penalty": -20, "status": "Moderate Gap (60-75%)"},
            {"max_ratio": 0.90, "penalty": -10, "status": "Minor Shortfall (75-90%)"}
        ],
        "adequate_threshold": 0.90
    },
    # 3. RIDER PENALTIES
    "riders": {
        "missing_waiver_of_premium": -10
    },
    # 4. INSURER RELIABILITY DATA (Static Database)
    "insurer_data": {
        "max life": {"csr_count": 0.995, "csr_amount": 0.96, "transparency": 0.95, "solvency": 0.92},
        "hdfc life": {"csr_count": 0.993, "csr_amount": 0.95, "transparency": 0.90, "solvency": 0.95},
        "icici prudential": {"csr_count": 0.986, "csr_amount": 0.94, "transparency": 0.85, "solvency": 0.93},
        "tata aia": {"csr_count": 0.991, "csr_amount": 0.93, "transparency": 0.90, "solvency": 0.94},
        "bajaj allianz": {"csr_count": 0.985, "csr_amount": 0.90, "transparency": 0.85, "solvency": 0.90},
        "sbi life": {"csr_count": 0.975, "csr_amount": 0.89, "transparency": 0.80, "solvency": 0.95},
        "lic": {"csr_count": 0.985, "csr_amount": 0.85, "transparency": 0.70, "solvency": 0.99},
        "kotak life": {"csr_count": 0.982, "csr_amount": 0.88, "transparency": 0.80, "solvency": 0.90},
        "aditya birla": {"csr_count": 0.981, "csr_amount": 0.90, "transparency": 0.85, "solvency": 0.88},
        "others": {"csr_count": 0.950, "csr_amount": 0.85, "transparency": 0.75, "solvency": 0.85}
    }
}
