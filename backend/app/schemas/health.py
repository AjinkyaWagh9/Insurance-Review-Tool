from pydantic import BaseModel
from typing import List, Dict, Optional

class HealthPolicyInput(BaseModel):
    policy_snapshot: List[Dict[str, str]] # Label/Value pairs
    hard_sum_assured: float
    hard_features: Dict[str, bool] # noRoomRentLimit, restoration, noCopay
    waiting_structured: Dict[str, int] # ped_months
    detailed_evaluation: List[Dict[str, str]] # dimension, rating, explanation
    hidden_risks: List[str]
    icr_value: Optional[float] = None
