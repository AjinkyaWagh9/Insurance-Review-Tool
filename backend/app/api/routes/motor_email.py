import os
import platform
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.base import MIMEBase
from email import encoders
from fastapi import APIRouter
from fastapi.responses import JSONResponse
from pydantic import BaseModel, EmailStr
from typing import List, Optional, Dict
from app.templates.motor_report_email import build_motor_report_html

router = APIRouter(prefix="/api/motor", tags=["motor-email"])

SMTP_HOST = "smtp.zeptomail.in"
SMTP_PORT = 587
SMTP_USER = os.getenv("ZEPTO_SMTP_USER", "emailappsmtp.1ce934d7c87681af")
SMTP_PASS = os.getenv("ZEPTO_SMTP_PASS", "2MLMNiYd7RcW")
FROM_EMAIL = os.getenv("ZEPTO_FROM_EMAIL", "noreply@bajajcapital.com")


class MotorSendReportRequest(BaseModel):
    to_email: EmailStr
    customer_name: str = ""
    score: int = 0
    score_reasons: List[str] = []
    insurer_name: Optional[str] = None
    policy_type: str = "Comprehensive"
    vehicle_make: str = ""
    vehicle_model: str = ""
    vehicle_variant: str = ""
    vehicle_reg_year: Optional[int] = None
    vehicle_age_years: Optional[int] = None
    vehicle_type: str = ""
    policy_idv: Optional[float] = None
    ideal_idv: Optional[float] = None
    ncb_percentage: int = 0
    deductible: int = 0
    add_ons: Dict[str, bool] = {}


@router.post("/send-report")
async def send_motor_report(payload: MotorSendReportRequest):
    try:
        html_content = build_motor_report_html(payload.dict())

        msg = MIMEMultipart()
        msg["From"] = FROM_EMAIL
        msg["To"] = payload.to_email
        msg["Subject"] = f"Your Motor Insurance Audit — {payload.vehicle_make} {payload.vehicle_model}"

        body = f"""Dear {payload.customer_name or 'Customer'},

Thank you for submitting your insurance policy for review.

Your Motor Insurance Audit Report is now ready and attached below.

This report highlights:
• Your current coverage summary
• Any hidden gaps in your policy
• Suggestions to improve your protection

If you would like a quick explanation or have any questions, please feel free to connect with your advisor.

Warm regards,
BajajCapital Insurance Broking Ltd"""

        msg.attach(MIMEText(body, "plain"))

        try:
            _old_path = os.environ.get("DYLD_LIBRARY_PATH")
            if platform.system() == "Darwin":
                _homebrew_lib = "/opt/homebrew/lib"
                if os.path.exists(_homebrew_lib):
                    os.environ["DYLD_LIBRARY_PATH"] = _homebrew_lib + (f":{_old_path}" if _old_path else "")

            from weasyprint import HTML
            pdf_bytes = HTML(string=html_content).write_pdf()

            if platform.system() == "Darwin":
                if _old_path is None:
                    os.environ.pop("DYLD_LIBRARY_PATH", None)
                else:
                    os.environ["DYLD_LIBRARY_PATH"] = _old_path

            part = MIMEBase("application", "octet-stream")
            part.set_payload(pdf_bytes)
            encoders.encode_base64(part)
            filename = f"Motor_Audit_{payload.customer_name or 'Report'}.pdf".replace(" ", "_")
            part.add_header("Content-Disposition", f'attachment; filename="{filename}"')
            msg.attach(part)
        except Exception as pdf_err:
            print(f"Motor PDF generation failed (sending without attachment): {pdf_err}")
            if platform.system() == "Darwin" and '_old_path' in locals():
                if _old_path is None:
                    os.environ.pop("DYLD_LIBRARY_PATH", None)
                else:
                    os.environ["DYLD_LIBRARY_PATH"] = _old_path

        server = smtplib.SMTP(SMTP_HOST, SMTP_PORT)
        server.starttls()
        server.login(SMTP_USER, SMTP_PASS)
        server.send_message(msg)
        server.quit()

        return {"success": True}

    except Exception as e:
        print(f"Motor email send error: {e}")
        return JSONResponse(status_code=500, content={"success": False, "error": str(e)})
