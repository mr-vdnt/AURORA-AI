"""
AURORA AI - Agent Tools

These functions are the "skills" that the Orchestrator Agent can use
to interact with the underlying microservices.
"""
import requests

def get_recommendations(user_id: int) -> dict:
    """Hits the Ranking Service (Port 8001) for personalized recommendations."""
    print(f"Agent Tool: Fetching recommendations for User {user_id}")
    try:
        req = {"user_id": user_id, "top_k": 5}
        resp = requests.post("http://127.0.0.1:8001/rank", json=req, timeout=5)
        if resp.status_code == 200:
            return {"status": "success", "data": resp.json()}
        return {"status": "error", "message": f"Ranking API returned {resp.status_code}"}
    except Exception as e:
        return {"status": "error", "message": str(e)}

def get_explanation(user_id: int, item_id: int) -> dict:
    """Hits the Graph RAG Service (Port 8003) to explain a recommendation."""
    print(f"Agent Tool: Fetching explanation for User {user_id}, Item {item_id}")
    try:
        req = {"user_id": user_id, "item_id": item_id}
        resp = requests.post("http://127.0.0.1:8003/explain", json=req, timeout=30)
        if resp.status_code == 200:
            return {"status": "success", "data": resp.json()}
        return {"status": "error", "message": f"RAG API returned {resp.status_code}"}
    except Exception as e:
        return {"status": "error", "message": str(e)}

def get_trending() -> dict:
    """Hits the Feature Store / Event Processor (Port 8002) for global trending items."""
    print("Agent Tool: Fetching global trending items")
    try:
        resp = requests.get("http://127.0.0.1:8002/features/global", timeout=2)
        if resp.status_code == 200:
            return {"status": "success", "data": resp.json()}
        return {"status": "error", "message": f"Feature Store returned {resp.status_code}"}
    except Exception as e:
        return {"status": "error", "message": str(e)}
