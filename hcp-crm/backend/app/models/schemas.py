from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


class InteractionCreate(BaseModel):
    hcp_name: str
    hcp_specialty: Optional[str] = None
    hcp_institution: Optional[str] = None
    interaction_type: Optional[str] = "visit"
    interaction_date: Optional[datetime] = None
    products_discussed: Optional[List[str]] = []
    summary: Optional[str] = None
    next_steps: Optional[str] = None
    sentiment: Optional[str] = "neutral"
    raw_notes: Optional[str] = None


class InteractionUpdate(BaseModel):
    hcp_name: Optional[str] = None
    hcp_specialty: Optional[str] = None
    hcp_institution: Optional[str] = None
    interaction_type: Optional[str] = None
    interaction_date: Optional[datetime] = None
    products_discussed: Optional[List[str]] = None
    summary: Optional[str] = None
    next_steps: Optional[str] = None
    sentiment: Optional[str] = None
    raw_notes: Optional[str] = None


class InteractionResponse(BaseModel):
    id: int
    hcp_name: str
    hcp_specialty: Optional[str]
    hcp_institution: Optional[str]
    interaction_type: Optional[str]
    interaction_date: Optional[datetime]
    products_discussed: Optional[List[str]]
    summary: Optional[str]
    next_steps: Optional[str]
    sentiment: Optional[str]
    raw_notes: Optional[str]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ChatMessage(BaseModel):
    message: str
    conversation_history: Optional[List[dict]] = []


class ChatResponse(BaseModel):
    response: str
    interaction_data: Optional[dict] = None
    action_taken: Optional[str] = None
