import io
from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import List, Optional, Dict
from app.templates.motor_report_email import build_motor_report_html

router = APIRouter(prefix="/api/motor", tags=["motor-pdf"])


class MotorPdfRequest(BaseModel):
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


@router.post("/generate-pdf")
async def generate_motor_pdf(payload: MotorPdfRequest):
    import os
    import platform
    try:
        html_content = build_motor_report_html(payload.dict())
        
        # --- Localized macOS path fix for WeasyPrint ---
        _old_path = os.environ.get("DYLD_LIBRARY_PATH")
        if platform.system() == "Darwin":
            _homebrew_lib = "/opt/homebrew/lib"
            if os.path.exists(_homebrew_lib):
                os.environ["DYLD_LIBRARY_PATH"] = _homebrew_lib + (f":{_old_path}" if _old_path else "")
        
        from weasyprint import HTML
        pdf_bytes = HTML(string=html_content).write_pdf()
        
        # Restore environment immediately
        if platform.system() == "Darwin":
            if _old_path is None: os.environ.pop("DYLD_LIBRARY_PATH", None)
            else: os.environ["DYLD_LIBRARY_PATH"] = _old_path

        filename = f"Motor_Audit_{payload.customer_name or 'Report'}_{payload.vehicle_make or ''}_{payload.vehicle_model or ''}.pdf".strip("_").replace(" ", "_")

        return StreamingResponse(
            io.BytesIO(pdf_bytes),
            media_type="application/pdf",
            headers={
                "Content-Disposition": f'attachment; filename="{filename}"',
                "Content-Length": str(len(pdf_bytes)),
            }
        )
    except Exception as e:
        print(f"Motor PDF generation error: {e}")
        return {"success": False, "error": str(e)}
