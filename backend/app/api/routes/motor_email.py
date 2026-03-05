import os
import base64
import platform
from fastapi import APIRouter
from fastapi.responses import JSONResponse
from pydantic import BaseModel, EmailStr
from typing import List, Optional, Dict
from app.templates.motor_report_email import build_motor_report_html

router = APIRouter(prefix="/api/motor", tags=["motor-email"])


class MotorSendReportRequest(BaseModel):
    to_email: EmailStr
    # Identity
    customer_name: str = ""
    # Score
    score: int = 0
    score_reasons: List[str] = []
    # Policy
    insurer_name: Optional[str] = None
    policy_type: str = "Comprehensive"
    # Vehicle
    vehicle_make: str = ""
    vehicle_model: str = ""
    vehicle_variant: str = ""
    vehicle_reg_year: Optional[int] = None
    vehicle_age_years: Optional[int] = None
    vehicle_type: str = ""
    # IDV
    policy_idv: Optional[float] = None
    ideal_idv: Optional[float] = None
    # NCB / deductible
    ncb_percentage: int = 0
    deductible: int = 0
    # Add-ons
    add_ons: Dict[str, bool] = {}


@router.post("/send-report")
async def send_motor_report(payload: MotorSendReportRequest):
    import resend
    resend.api_key = os.getenv("RESEND_API_KEY", "")
    FROM_EMAIL = os.getenv("RESEND_FROM_EMAIL", "onboarding@resend.dev")

    if not resend.api_key:
        return JSONResponse(
            status_code=500,
            content={"success": False, "error": "Email service not configured."}
        )
    try:
        data = payload.dict()
        html_content = build_motor_report_html(data)
        
        pdf_attachment = None
        
        # --- PDF Generation with macOS path fix ---
        try:
            _old_path = os.environ.get("DYLD_LIBRARY_PATH")
            if platform.system() == "Darwin":
                _homebrew_lib = "/opt/homebrew/lib"
                if os.path.exists(_homebrew_lib):
                    os.environ["DYLD_LIBRARY_PATH"] = _homebrew_lib + (f":{_old_path}" if _old_path else "")
            
            from weasyprint import HTML
            pdf_bytes = HTML(string=html_content).write_pdf()
            
            # Restore path immediately after PDF generation to avoid SSL conflicts in resend
            if platform.system() == "Darwin":
                if _old_path is None:
                    os.environ.pop("DYLD_LIBRARY_PATH", None)
                else:
                    os.environ["DYLD_LIBRARY_PATH"] = _old_path

            pdf_b64 = base64.b64encode(pdf_bytes).decode("utf-8")
            filename = f"Motor_Audit_{payload.customer_name or 'Report'}.pdf".replace(" ", "_")
            pdf_attachment = [{"filename": filename, "content": pdf_b64}]
        except Exception as pdf_err:
            print(f"Motor PDF generation failed (sending email without attachment): {pdf_err}")
            # Ensure path is restored even on error
            if platform.system() == "Darwin":
                if '_old_path' in locals():
                    if _old_path is None: os.environ.pop("DYLD_LIBRARY_PATH", None)
                    else: os.environ["DYLD_LIBRARY_PATH"] = _old_path

        email_payload = {
            "from": FROM_EMAIL,
            "to": payload.to_email,
            "subject": f"Your Motor Insurance Audit — {payload.vehicle_make} {payload.vehicle_model}",
            "html": html_content,
        }
        
        if pdf_attachment:
            email_payload["attachments"] = pdf_attachment

        resend.Emails.send(email_payload)
        return {"success": True}

    except Exception as e:
        print(f"Motor email error: {e}")
        return JSONResponse(
            status_code=500,
            content={"success": False, "error": str(e)}
        )
