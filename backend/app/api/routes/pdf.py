import io
from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import List, Optional
from weasyprint import HTML
from app.templates.term_report_email import build_term_report_html

router = APIRouter(prefix="/api/term", tags=["pdf"])


class PdfReportRequest(BaseModel):
    # Identical shape to SendReportRequest — same data, different output
    customer_name: str = ""
    phone: str = ""
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


# DEPRECATED — replaced by /api/s3/generate-and-upload in s3.py
# Kept for rollback safety until UAT sign-off
@router.post("/generate-pdf")
async def generate_pdf(payload: PdfReportRequest):
    """
    Generates a PDF audit report and streams it directly to the client.
    No file is saved to disk. The same HTML template used for email is reused.
    """
    html_content = build_term_report_html(payload.dict())

    # Render HTML → PDF bytes in memory
    pdf_bytes = HTML(string=html_content).write_pdf()

    filename = f"Term_Audit_{payload.customer_name or 'Report'}.pdf".replace(" ", "_")

    return StreamingResponse(
        io.BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
            "Content-Length": str(len(pdf_bytes)),
        }
    )
