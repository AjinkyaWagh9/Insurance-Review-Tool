import resend
import os
import base64
from fastapi import APIRouter
from fastapi.responses import JSONResponse
from pydantic import BaseModel, EmailStr
from typing import List, Optional
from weasyprint import HTML
from app.templates.term_report_email import build_term_report_html

router = APIRouter(prefix="/api/term", tags=["email"])

resend.api_key = os.getenv("RESEND_API_KEY", "")
FROM_EMAIL = os.getenv("RESEND_FROM_EMAIL", "onboarding@resend.dev")


class SendReportRequest(BaseModel):
    # Recipient
    to_email: EmailStr
    # Audit data
    customer_name: str = ""
    score: int = 0
    ideal_cover: float = 0
    your_cover: float = 0
    shortfall: float = 0
    coverage_status: str = ""
    mode: str = "estimated"
    # Verified policy data (optional)
    insurer_name: Optional[str] = None
    insurer_reliability_score: Optional[float] = None
    policy_term_end_age: Optional[int] = None
    riders_present: List[str] = []
    missing_riders: List[str] = []
    score_reasons: List[str] = []


@router.post("/send-report")
async def send_report(payload: SendReportRequest):
    if not resend.api_key:
        return JSONResponse(
            status_code=500,
            content={"success": False, "error": "Email service not configured. Set RESEND_API_KEY."}
        )

    try:
        data = payload.dict()
        html_content = build_term_report_html(data)

        # Generate PDF bytes (same template, reused)
        # We wrap this in try-except to send email even if PDF fails (as per rulebook 14)
        pdf_attachment = None
        try:
            pdf_bytes = HTML(string=html_content).write_pdf()
            pdf_b64 = base64.b64encode(pdf_bytes).decode("utf-8")
            filename = f"Term_Audit_{payload.customer_name or 'Report'}.pdf".replace(" ", "_")
            pdf_attachment = {
                "filename": filename,
                "content": pdf_b64,
            }
        except Exception as pdf_err:
            print(f"PDF generation failed for email: {pdf_err}")

        email_params = {
            "from": FROM_EMAIL,
            "to": payload.to_email,
            "subject": f"Your Term Insurance Audit Report — {payload.customer_name or 'Protection Summary'}",
            "html": html_content,
        }

        if pdf_attachment:
            email_params["attachments"] = [pdf_attachment]

        resend.Emails.send(email_params)

        return {"success": True}

    except Exception as e:
        print(f"Email send error: {e}")
        return JSONResponse(
            status_code=500,
            content={"success": False, "error": str(e)}
        )
