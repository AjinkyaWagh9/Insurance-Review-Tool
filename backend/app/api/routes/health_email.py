import os
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.base import MIMEBase
from email import encoders
from fastapi import APIRouter
from fastapi.responses import JSONResponse
from pydantic import BaseModel, EmailStr
from typing import List, Dict, Any
from weasyprint import HTML
from app.templates.health_report_email import build_health_report_html

router = APIRouter(prefix="/api/health", tags=["health-email"])

SMTP_HOST = "smtp.zeptomail.in"
SMTP_PORT = 587
SMTP_USER = os.getenv("ZEPTO_SMTP_USER", "emailappsmtp.1ce934d7c87681af")
SMTP_PASS = os.getenv("ZEPTO_SMTP_PASS", "2MLMNiYd7RcW")
FROM_EMAIL = os.getenv("ZEPTO_FROM_EMAIL", "noreply@bajajcapital.com")


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
    try:
        html_content = build_health_report_html(payload.dict())

        msg = MIMEMultipart()
        msg["From"] = FROM_EMAIL
        msg["To"] = payload.to_email
        msg["Subject"] = f"Your Health Insurance Audit — {payload.customer_name or 'Policy Summary'}"

        body = f"""Dear {payload.customer_name or 'Customer'},

Thank you for submitting your insurance policy for review.

Your Health Insurance Audit Report is now ready and attached below.

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
            filename = f"Health_Audit_{payload.customer_name or 'Report'}.pdf".replace(" ", "_")
            part.add_header("Content-Disposition", f'attachment; filename="{filename}"')
            msg.attach(part)
        except Exception as pdf_err:
            print(f"Health PDF generation failed (sending without attachment): {pdf_err}")

        server = smtplib.SMTP(SMTP_HOST, SMTP_PORT)
        server.starttls()
        server.login(SMTP_USER, SMTP_PASS)
        server.send_message(msg)
        server.quit()

        return {"success": True}

    except Exception as e:
        print(f"Health email send error: {e}")
        return JSONResponse(status_code=500, content={"success": False, "error": str(e)})
