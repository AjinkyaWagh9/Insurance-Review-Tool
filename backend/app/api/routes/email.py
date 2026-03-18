import os
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.base import MIMEBase
from email import encoders
from fastapi import APIRouter
from fastapi.responses import JSONResponse
from pydantic import BaseModel, EmailStr
from typing import List, Optional
from weasyprint import HTML
from app.templates.term_report_email import build_term_report_html

router = APIRouter(prefix="/api/term", tags=["email"])

SMTP_HOST = "smtp.zeptomail.in"
SMTP_PORT = 587
SMTP_USER = os.getenv("ZEPTO_SMTP_USER", "emailappsmtp.1ce934d7c87681af")
SMTP_PASS = os.getenv("ZEPTO_SMTP_PASS", "2MLMNiYd7RcW")
FROM_EMAIL = os.getenv("ZEPTO_FROM_EMAIL", "noreply@bajajcapital.com")


class SendReportRequest(BaseModel):
    to_email: EmailStr
    customer_name: str = ""
    score: int = 0
    ideal_cover: float = 0
    your_cover: float = 0
    shortfall: float = 0
    coverage_status: str = ""
    mode: str = "estimated"
    insurer_name: Optional[str] = None
    insurer_reliability_score: Optional[float] = None
    policy_term_end_age: Optional[int] = None
    riders_present: List[str] = []
    missing_riders: List[str] = []
    score_reasons: List[str] = []


@router.post("/send-report")
async def send_report(payload: SendReportRequest):
    try:
        html_content = build_term_report_html(payload.dict())

        msg = MIMEMultipart()
        msg["From"] = FROM_EMAIL
        msg["To"] = payload.to_email
        msg["Subject"] = f"Your Term Insurance Audit Report — {payload.customer_name or 'Protection Summary'}"

        body = f"""Dear {payload.customer_name or 'Customer'},

Thank you for submitting your insurance policy for review.

Your Term Insurance Audit Report is now ready and attached below.

This report highlights:
• Your current coverage summary
• Any hidden gaps in your policy
• Suggestions to improve your protection

If you would like a quick explanation or have any questions, please feel free to connect with your advisor.

Warm regards,
BajajCapital Insurance Broking Ltd"""

        msg.attach(MIMEText(body, "plain"))

        try:
            pdf_bytes = HTML(string=html_content).write_pdf()
            part = MIMEBase("application", "octet-stream")
            part.set_payload(pdf_bytes)
            encoders.encode_base64(part)
            filename = f"Term_Audit_{payload.customer_name or 'Report'}.pdf".replace(" ", "_")
            part.add_header("Content-Disposition", f'attachment; filename="{filename}"')
            msg.attach(part)
        except Exception as pdf_err:
            print(f"Term PDF generation failed (sending without attachment): {pdf_err}")

        server = smtplib.SMTP(SMTP_HOST, SMTP_PORT)
        server.starttls()
        server.login(SMTP_USER, SMTP_PASS)
        server.send_message(msg)
        server.quit()

        return {"success": True}

    except Exception as e:
        print(f"Term email send error: {e}")
        return JSONResponse(status_code=500, content={"success": False, "error": str(e)})
