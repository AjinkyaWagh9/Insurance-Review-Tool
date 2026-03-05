from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from fastapi.responses import JSONResponse
from app.schemas.term import TermInput
from app.core.rules.term_rules import TERM_SCORING_CONFIG
from app.services.scoring.term_engine import TermScoringEngine
from app.services.extractors.term_extractor import TermPolicyExtractor
import pdfplumber
import io

router = APIRouter()
engine = TermScoringEngine()
extractor = TermPolicyExtractor()

@router.post("/score")
async def score_term(input_data: TermInput):
    """
    Score a term insurance policy based on the provided input.
    """
    result = engine.calculate(input_data)
    return result


@router.post("/upload-policy")
async def upload_policy(
    file: UploadFile = File(...),
    # Step 1
    age: int = Form(...),
    income: float = Form(...),
    child_count: int = Form(0),
    extracted_sum_assured: float = Form(0),
    customer_name: str = Form(""),
    # Step 3
    loans: float = Form(0),
    # Step 4
    monthly_expenses: float = Form(0),
    # Step 5
    retirement_age: int = Form(60),
    family_secure_years: int = Form(5),
    # Defaults
    savings: float = Form(0),
    parents_dependent: bool = Form(False),
    spouse_working: bool = Form(False),
):
    try:
        pdf_bytes = await file.read()
        text = ""
        with pdfplumber.open(io.BytesIO(pdf_bytes)) as pdf:
            for page in pdf.pages:
                text += page.extract_text() or ""

        # Debugging: Print first 500 characters
        print("\n" + "="*50)
        print(f"DEBUG: Extracted text length: {len(text)} characters")
        if text:
            print("DEBUG: First 500 characters preview:")
            print(text[:500])
        else:
            print("DEBUG: NO TEXT EXTRACTED. Possible image-based PDF or extraction failure.")
        print("="*50 + "\n")

        extracted = await extractor.extract(text)

        if not extracted or extracted.get("error"):
            return JSONResponse({
                "success": False,
                "extracted": None,
                "score_result": None,
                "error": extracted.get("error", "Extraction failed") if extracted else "Extraction failed"
            })

        # Re-score with verified extraction data + full user context
        term_input = TermInput(
            customer_name=customer_name,
            age=age,
            income=income,
            loans=loans,
            monthly_expenses=monthly_expenses,
            retirement_age=retirement_age,
            family_secure_years=family_secure_years,
            savings=savings,
            child_count=child_count,
            parents_dependent=parents_dependent,
            spouse_working=spouse_working,
            extracted_sum_assured=extracted.get("extracted_sum_assured", extracted_sum_assured),
            detected_riders=extracted.get("riders_present", []),
            insurer_name=extracted.get("insurer_name", "unknown"),
        )
        score_result = engine.calculate(term_input)

        return {
            "success": True,
            "extracted": extracted,
            "score_result": score_result
        }

    except Exception as e:
        return JSONResponse(status_code=500, content={
            "success": False,
            "extracted": None,
            "score_result": None,
            "error": str(e)
        })

@router.get("/rules")
def get_term_rules():
    """
    Get the current configuration rules for Term Insurance.
    """
    return TERM_SCORING_CONFIG
