import resend
import os
import base64
from fastapi import APIRouter
from fastapi.responses import JSONResponse
from pydantic import BaseModel, EmailStr
from typing import List, Optional, Dict, Any
from weasyprint import HTML
from app.templates.health_report_email import build_health_report_html

router = APIRouter(prefix="/api/health", tags=["health-email"])

resend.api_key = os.getenv("RESEND_API_KEY", "")
FROM_EMAIL = os.getenv("RESEND_FROM_EMAIL", "onboarding@resend.dev")


class HealthEmailRequest(BaseModel):
    to_email: EmailStr
    customer_name: str = ""
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


@router.post("/send-report")
async def send_health_report(payload: HealthEmailRequest):
    if not resend.api_key:
        return JSONResponse(
            status_code=500,
            content={"success": False, "error": "RESEND_API_KEY not configured"}
        )

    try:
        data = payload.dict()
        html_content = build_health_report_html(data)

        # Attempt PDF generation — fallback to email-only if it fails
        pdf_attachment = None
        try:
            pdf_bytes = HTML(string=html_content).write_pdf()
            pdf_b64 = base64.b64encode(pdf_bytes).decode("utf-8")
            filename = f"Health_Audit_{payload.customer_name or 'Report'}.pdf".replace(" ", "_")
            pdf_attachment = [{"filename": filename, "content": pdf_b64}]
        except Exception as pdf_err:
            print(f"PDF generation failed (sending email without attachment): {pdf_err}")

        email_payload = {
            "from": FROM_EMAIL,
            "to": payload.to_email,
            "subject": f"Your Health Insurance Audit — {payload.customer_name or 'Policy Summary'}",
            "html": html_content,
        }
        if pdf_attachment:
            email_payload["attachments"] = pdf_attachment

        resend.Emails.send(email_payload)
        return {"success": True}

    except Exception as e:
        print(f"Email send error: {e}")
        return JSONResponse(
            status_code=500,
            content={"success": False, "error": str(e)}
        )
