"""
Health Insurance Scoring Configuration — RULEBOOK v2.0
All scoring tiers and values are defined here and consumed by health_engine.py.
"""

HEALTH_SCORING_CONFIG = {
    "global": {
        "start_score": 0,
        "min_score": 0,
        "max_score": 95,
    },

    # 1. INSURER CLAIM RATIO (ICR)
    "icr": {
        "industry_avg": 77.0,
        "tiers": [
            {"max": 60, "score": -10},
            {"max": 70, "score": -5},
            {"max": 77, "score": 0},
            {"max": 85, "score": 5},
            {"max": 100, "score": 10},
            {"max": 999, "score": 5},  # > 100%
        ],
    },

    # 2. SUM INSURED
    "sum_insured": {
        "tiers": [
            {"min": 5000000, "score": 30},   # ≥ ₹50 Lakh
            {"min": 1000000, "score": 25},   # ≥ ₹10 Lakh
            {"min": 500000, "score": 20},    # ≥ ₹5 Lakh
        ],
        "default": 10,  # < ₹5 Lakh
    },

    # 3. ROOM RENT
    "room_rent": {
        "no_limit": 15,
        "single_private": 10,
        "capped": 5,
        "default": 10,
    },

    # 4. CO-PAY
    "copay": {
        "base_no_copay": 10,
        "base_has_copay": -5,
    },

    # 5. RESTORATION
    "restoration": {
        "present": 8,
        "missing": 2,
    },

    # 6. PED WAITING PERIOD
    "ped_waiting": {
        "months_24": 15,
        "months_36": 10,
        "months_48": 7,
        "months_gt_48": -5,
    },

    # 7. GEO COVERAGE
    "geo_cover": {
        "pan_india_no_copay": 5,
        "partial_zonal_copay": 3,
        "restricted": -5,
    },

    # 8. SUB-LIMITS
    "sub_limits": {
        "none": 15,
        "minor": 10,
        "several": 5,
        "many_critical": -10,
    },
}
