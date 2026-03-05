from pydantic import BaseModel
from typing import List, Optional


class TermInput(BaseModel):
    # Step 1 fields
    customer_name: Optional[str] = ""
    age: int
    income: float
    child_count: int
    extracted_sum_assured: float

    # Step 3 fields
    loans: float = 0.0

    # Step 4 fields
    monthly_expenses: float = 0.0          # monthly household expenses in rupees

    # Step 5 fields
    retirement_age: int = 60               # age user plans to retire
    family_secure_years: int = 5           # years family would survive without income

    # From PDF upload (populated later, safe defaults)
    detected_riders: List[str] = []
    insurer_name: str = "unknown"

    # Retained for scoring engine compatibility
    savings: float = 0.0
