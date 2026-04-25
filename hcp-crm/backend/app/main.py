from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api import interactions, chat
from app.db.database import engine, Base

Base.metadata.create_all(bind=engine)

app = FastAPI(title="HCP CRM API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(interactions.router, prefix="/api/interactions", tags=["interactions"])
app.include_router(chat.router, prefix="/api/chat", tags=["chat"])

@app.get("/")
def root():
    return {"message": "HCP CRM API is running"}
