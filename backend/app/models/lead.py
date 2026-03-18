from typing import Optional
from sqlmodel import SQLModel, Field
from datetime import datetime

class LeadBase(SQLModel):
    name: str
    phone: str
    email: Optional[str] = None
    tool_type: str  # 'health', 'motor', 'term'
    status: str = "new"
    report_url: Optional[str] = None

class Lead(LeadBase, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)

class LeadCreate(LeadBase):
    pass
