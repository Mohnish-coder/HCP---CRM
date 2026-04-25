from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from app.db.database import get_db, Interaction
from app.models.schemas import InteractionCreate, InteractionUpdate, InteractionResponse
from datetime import datetime

router = APIRouter()


@router.post("/", response_model=InteractionResponse)
def create_interaction(payload: InteractionCreate, db: Session = Depends(get_db)):
    item = Interaction(**payload.model_dump())
    if not item.interaction_date:
        item.interaction_date = datetime.utcnow()
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


@router.get("/", response_model=List[InteractionResponse])
def list_interactions(
    hcp_name: Optional[str] = None,
    skip: int = 0,
    limit: int = 20,
    db: Session = Depends(get_db),
):
    q = db.query(Interaction)
    if hcp_name:
        q = q.filter(Interaction.hcp_name.ilike(f"%{hcp_name}%"))
    return q.order_by(Interaction.created_at.desc()).offset(skip).limit(limit).all()


@router.get("/{interaction_id}", response_model=InteractionResponse)
def get_interaction(interaction_id: int, db: Session = Depends(get_db)):
    item = db.query(Interaction).filter(Interaction.id == interaction_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Interaction not found")
    return item


@router.put("/{interaction_id}", response_model=InteractionResponse)
def update_interaction(
    interaction_id: int, payload: InteractionUpdate, db: Session = Depends(get_db)
):
    item = db.query(Interaction).filter(Interaction.id == interaction_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Interaction not found")
    for field, val in payload.model_dump(exclude_none=True).items():
        setattr(item, field, val)
    item.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(item)
    return item


@router.delete("/{interaction_id}")
def delete_interaction(interaction_id: int, db: Session = Depends(get_db)):
    item = db.query(Interaction).filter(Interaction.id == interaction_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Interaction not found")
    db.delete(item)
    db.commit()
    return {"status": "deleted", "id": interaction_id}
