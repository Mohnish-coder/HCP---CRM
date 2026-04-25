from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.models.schemas import ChatMessage, ChatResponse
from app.agents.crm_agent import run_agent

router = APIRouter()


@router.post("/", response_model=ChatResponse)
def chat_with_agent(payload: ChatMessage, db: Session = Depends(get_db)):
    result = run_agent(
        message=payload.message,
        history=payload.conversation_history,
        db=db,
    )
    return ChatResponse(**result)
