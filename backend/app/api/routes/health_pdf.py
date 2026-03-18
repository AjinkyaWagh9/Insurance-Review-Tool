import io
from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from weasyprint import HTML
from app.templates.health_report_email import build_health_report_html

router = APIRouter(prefix="/api/health", tags=["health-pdf"])


class HealthPdfRequest(BaseModel):
    customer_name: str = ""
    phone: str = ""
    insurer_name: str = ""
    plan_name: str = ""
    policy_number: str = ""
    sum_insured: float = 0
    premium: float = 0
    policy_tenure: str = ""
    is_family_floater: bool = False
    members_covered: int = 1
    room_rent_limit: str = ""
    copay_percentage: float = 0
    deductible: float = 0
    sub_limits: List[str] = []
    waiting_periods: Dict[str, Any] = {}
    restoration_present: bool = False
    restoration_type: str = ""
    ncb_percentage: float = 0
    ncb_max_percentage: float = 0
    zone_of_cover: str = ""
    has_zonal_copay: bool = False
    global_health_coverage: bool = False
    score: int = 0
    ideal_cover: float = 0
    comparison_rows: List[Dict[str, Any]] = []
    recommendations: List[Dict[str, Any]] = []


# DEPRECATED — replaced by /api/s3/generate-and-upload-health in s3.py
# Kept for rollback safety until UAT sign-off
@router.post("/generate-pdf")
async def generate_health_pdf(payload: HealthPdfRequest):
    """
    Generates a health insurance audit PDF and streams it to the client.
    No file is saved to disk. Same HTML template as the email is reused.
    """
    html_content = build_health_report_html(payload.dict())
    pdf_bytes = HTML(string=html_content).write_pdf()

    filename = f"Health_Audit_{payload.customer_name or 'Report'}.pdf".replace(" ", "_")

    return StreamingResponse(
        io.BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )
