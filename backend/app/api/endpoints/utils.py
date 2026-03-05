from fastapi import APIRouter, File, UploadFile, HTTPException
from app.services.ocr_service import extract_text_from_pdf

router = APIRouter()

@router.post("/test-ocr")
async def test_ocr(file: UploadFile = File(...)):
    """
    Test endpoint to extract text from an uploaded PDF file.
    """
    if file.content_type != "application/pdf":
        raise HTTPException(status_code=400, detail="File must be a PDF")
    
    content = await file.read()
    text = extract_text_from_pdf(content)
    
    return {
        "text_length": len(text),
        "preview": text[:500] if text else "No text extracted."
    }
