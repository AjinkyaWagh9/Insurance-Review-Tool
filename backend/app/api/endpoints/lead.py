from fastapi import APIRouter, HTTPException
from app.db.session import get_session
from app.models.lead import Lead, LeadCreate
from app.services.lead_service import create_lead, get_leads

router = APIRouter()

@router.get("/")
def list_leads():
    """
    Retrieve all captured leads.
    """
    try:
        return get_leads()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/")
def capture_lead(lead_data: LeadCreate):
    """
    Capture a new customer lead from the frontend.
    """
    try:
        lead = create_lead(lead_data)
        return {"status": "success", "lead_id": lead.id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
