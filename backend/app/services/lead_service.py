from sqlmodel import Session
from app.models.lead import Lead, LeadCreate
from app.db.session import engine

def create_lead(lead_data: LeadCreate) -> Lead:
    with Session(engine) as session:
        db_lead = Lead.from_orm(lead_data)
        session.add(db_lead)
        session.commit()
        session.refresh(db_lead)
        return db_lead

def get_leads():
    with Session(engine) as session:
        # Simple placeholder for now
        from sqlmodel import select
        statement = select(Lead)
        results = session.exec(statement)
        return results.all()
