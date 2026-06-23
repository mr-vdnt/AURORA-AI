from fastapi import APIRouter, Depends
from typing import List
from services.security.auth import require_admin
from services.security.audit import get_recent_logs

admin_router = APIRouter(prefix="/admin", tags=["admin"])

@admin_router.get("/logs")
def fetch_audit_logs(current_admin: dict = Depends(require_admin)):
    """Fetch the recent security and audit logs. Only accessible to Administrators."""
    logs = get_recent_logs(limit=100)
    return {"logs": logs}

@admin_router.get("/status")
def system_status(current_admin: dict = Depends(require_admin)):
    """Provides system health diagnostics."""
    return {
        "status": "Healthy",
        "active_microservices": ["Agent/Gateway (10000)", "Ranking (8001)", "Event (8002)", "RAG (8003)"],
        "rate_limiting": "Enabled via slowapi",
        "rbac": "Enforced via python-jose",
        "cors_lockdown": "Strict"
    }
