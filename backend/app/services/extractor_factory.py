from app.services.extractors.motor_extractor import MotorPolicyExtractor
from app.services.extractors.health_extractor import HealthPolicyExtractor
from app.services.extractors.term_extractor import TermPolicyExtractor

def get_extractor(policy_type: str):
    policy_type = policy_type.lower()
    if policy_type == "motor":
        return MotorPolicyExtractor()
    elif policy_type == "health":
        return HealthPolicyExtractor()
    elif policy_type == "term":
        return TermPolicyExtractor()
    else:
        raise ValueError(f"Unknown policy type: {policy_type}")
