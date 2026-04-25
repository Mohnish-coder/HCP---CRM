from sqlalchemy import create_engine, Column, Integer, String, Text, DateTime, JSON
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from datetime import datetime
import os

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:password@localhost:5432/hcp_crm")

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


class Interaction(Base):
    __tablename__ = "interactions"

    id = Column(Integer, primary_key=True, index=True)
    hcp_name = Column(String(255), nullable=False)
    hcp_specialty = Column(String(255))
    hcp_institution = Column(String(255))
    interaction_type = Column(String(100))  # visit, call, email, conference
    interaction_date = Column(DateTime, default=datetime.utcnow)
    products_discussed = Column(JSON, default=list)
    summary = Column(Text)
    next_steps = Column(Text)
    sentiment = Column(String(50))  # positive, neutral, negative
    raw_notes = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
