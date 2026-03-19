from fastapi import APIRouter, HTTPException, UploadFile, File
from app.services.s3_service import s3_service
from pydantic import BaseModel
from typing import Any, Dict, List, Optional
import uuid
from datetime import datetime

from app.api.routes.pdf import PdfReportRequest
from app.api.routes.health_pdf import HealthPdfRequest
from app.api.routes.motor_pdf import MotorPdfRequest
from app.templates.term_report_email import build_term_report_html
from app.templates.health_report_email import build_health_report_html
from app.templates.motor_report_email import build_motor_report_html
from weasyprint import HTML
import io
import time
from app.models.lead import LeadCreate
from app.services.lead_service import create_lead


router = APIRouter(prefix="/api/s3", tags=["s3"])

class S3UploadResponse(BaseModel):
    success: bool
    url: Optional[str] = None
    message: Optional[str] = None

@router.post("/upload-pdf", response_model=S3UploadResponse)
async def upload_pdf_to_s3(file: UploadFile = File(...)):
    """
    Uploads an existing PDF file to S3 and returns the URL.
    """
    if not file.filename.endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Only PDF files are allowed")
    
    try:
        pdf_content = await file.read()
        filename = file.filename
        
        url, error = s3_service.upload_pdf(pdf_content, filename)
        
        if url:
            return S3UploadResponse(success=True, url=url)
        else:
            return S3UploadResponse(success=False, message=error or "Failed to upload to S3")
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/generate-and-upload", response_model=S3UploadResponse)
async def generate_and_upload_pdf(payload: PdfReportRequest):
    """
    Generates a PDF from payload and uploads it to S3.
    """
    try:
        # 1. Generate HTML
        html_content = build_term_report_html(payload.dict())

        # 2. Render to PDF bytes
        pdf_bytes = HTML(string=html_content).write_pdf()

        # 3. Create filename following requested format: report/phoneNumber_Type_timestamp.pdf
        phone = payload.phone.strip() or "unknown"
        timestamp_ms = int(time.time() * 1000)
        filename = f"report/{phone}_Term Report_{timestamp_ms}.pdf"

        # 4. Upload to S3
        url, error = s3_service.upload_pdf(pdf_bytes, filename)

        if url:
            # 5. Save to database
            try:
                create_lead(LeadCreate(
                    name=payload.customer_name or "Unknown",
                    phone=phone,
                    tool_type="term",
                    status="report_generated",
                    report_url=url
                ))
            except Exception as db_err:
                print(f"Failed to save lead to DB: {db_err}")
                # We don't fail the request if DB save fails, just log it
            
            return S3UploadResponse(success=True, url=url)
        else:
            return S3UploadResponse(success=False, message=error or "Failed to upload generate PDF to S3")

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/generate-and-upload-health", response_model=S3UploadResponse)
async def generate_and_upload_health_pdf(payload: HealthPdfRequest):
    """
    Generates a Health PDF from payload and uploads it to S3.
    """
    try:
        html_content = build_health_report_html(payload.dict())
        pdf_bytes = HTML(string=html_content).write_pdf()
        phone = payload.phone.strip() or "unknown"
        timestamp_ms = int(time.time() * 1000)
        filename = f"report/{phone}_Financial Health Report_{timestamp_ms}.pdf"
        url, error = s3_service.upload_pdf(pdf_bytes, filename)
        if url:
            # Save to database
            try:
                create_lead(LeadCreate(
                    name=payload.customer_name or "Unknown",
                    phone=phone,
                    tool_type="health",
                    status="report_generated",
                    report_url=url
                ))
            except Exception as db_err:
                print(f"Failed to save lead to DB: {db_err}")

            return S3UploadResponse(success=True, url=url)
        return S3UploadResponse(success=False, message=error or "Upload failed")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/generate-and-upload-motor", response_model=S3UploadResponse)
async def generate_and_upload_motor_pdf(payload: MotorPdfRequest):
    """
    Generates a Motor PDF from payload and uploads it to S3.
    """
    try:
        html_content = build_motor_report_html(payload.dict())
        pdf_bytes = HTML(string=html_content).write_pdf()
        
        # Consistent phone + timestamp filename
        phone = payload.phone.strip() or "unknown"
        timestamp_ms = int(time.time() * 1000)
        filename = f"report/{phone}_Motor Report_{timestamp_ms}.pdf"
        
        url, error = s3_service.upload_pdf(pdf_bytes, filename)
        if url:
            # Save to database
            try:
                create_lead(LeadCreate(
                    name=payload.customer_name or "Unknown",
                    phone=phone,
                    tool_type="motor",
                    status="report_generated",
                    report_url=url
                ))
            except Exception as db_err:
                print(f"Failed to save lead to DB: {db_err}")

            return S3UploadResponse(success=True, url=url)
        return S3UploadResponse(success=False, message=error or "Upload failed")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
