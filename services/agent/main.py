"""
AURORA AI - Orchestrator Agent API

Provides the unified natural language interface for the entire platform.
"""
import os
import sys
from typing import Any
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../..')))
from services.agent.core import agent

app = FastAPI(title="AURORA AI - Orchestrator Agent")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ChatRequest(BaseModel):
    user_id: int
    query: str

class ChatResponse(BaseModel):
    intent: str
    response: Any

@app.post("/chat", response_model=ChatResponse)
def chat_endpoint(req: ChatRequest):
    result = agent.process_query(req.user_id, req.query)
    return ChatResponse(
        intent=result["intent"],
        response=result["response"]
    )

# Mount frontend directory at root
frontend_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '../../frontend'))
app.mount("/", StaticFiles(directory=frontend_path, html=True), name="frontend")
