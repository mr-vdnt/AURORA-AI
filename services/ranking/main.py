import os
import sys
import torch
import numpy as np
import pandas as pd
import faiss
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../..')))
from models.collaborative.two_tower import TwoTowerModel
from models.rerankers.deepfm import DeepFM

app = FastAPI(title="AURORA AI - Multi-Stage Ranking Service")


# ── Request / Response Schemas ──────────────────────────────────────
class RankRequest(BaseModel):
    user_id: int
    top_k_retrieval: int = 50   # How many candidates to pull from FAISS
    top_k_final: int = 10       # How many to return after re-ranking


class RankedItem(BaseModel):
    item_id: int
    title: str
    retrieval_score: float
    ranking_score: float


# ── Global state ────────────────────────────────────────────────────
two_tower: TwoTowerModel | None = None
deepfm: DeepFM | None = None
faiss_index: faiss.Index | None = None
movies_df: pd.DataFrame | None = None
num_users: int = 0
num_items: int = 0


@app.on_event("startup")
async def startup_event():
    global two_tower, deepfm, faiss_index, movies_df, num_users, num_items
    print("Loading models and data …")

    # Load metadata to figure out counts
    ratings = pd.read_csv("data/raw/ratings.csv")
    num_users = int(ratings['user_id'].max())
    num_items = int(ratings['item_id'].max())

    # ── Two-Tower (retrieval) ───────────────────────────────────────
    tt_weights = "models/collaborative/twotower_weights.pth"
    tt_index   = "data/index/twotower_items.index"
    if os.path.exists(tt_weights) and os.path.exists(tt_index):
        two_tower = TwoTowerModel(num_users=num_users, num_items=num_items, embedding_dim=64)
        two_tower.load_state_dict(torch.load(tt_weights, map_location="cpu", weights_only=True))
        two_tower.eval()
        faiss_index = faiss.read_index(tt_index)
        print("  [OK] Two-Tower model loaded")
    else:
        print("  [MISSING] Two-Tower weights or index not found - retrieval disabled")

    # ── DeepFM (re-ranking) ─────────────────────────────────────────
    dfm_weights = "models/rerankers/deepfm_weights.pth"
    if os.path.exists(dfm_weights):
        deepfm = DeepFM(num_users=num_users, num_items=num_items, embedding_dim=32, hidden_dims=[64, 32])
        deepfm.load_state_dict(torch.load(dfm_weights, map_location="cpu", weights_only=True))
        deepfm.eval()
        print("  [OK] DeepFM ranker loaded")
    else:
        print("  [MISSING] DeepFM weights not found - ranking disabled")

    # ── Movie metadata ──────────────────────────────────────────────
    if os.path.exists("data/raw/movies.csv"):
        movies_df = pd.read_csv("data/raw/movies.csv")
        print("  [OK] Movie metadata loaded")


@app.get("/")
def health():
    return {
        "status": "AURORA AI Ranking Service Running",
        "retrieval_ready": two_tower is not None,
        "ranking_ready": deepfm is not None,
    }


@app.post("/rank", response_model=list[RankedItem])
def rank(request: RankRequest):
    """
    Full multi-stage pipeline:
      Stage 1 → Two-Tower retrieval via FAISS (fast, 100k→50)
      Stage 2 → DeepFM re-ranking (precise, 50→10)
    """
    if two_tower is None or faiss_index is None:
        raise HTTPException(status_code=503, detail="Two-Tower retrieval model not loaded.")
    if deepfm is None:
        raise HTTPException(status_code=503, detail="DeepFM ranking model not loaded.")
    if request.user_id < 1 or request.user_id > num_users:
        raise HTTPException(status_code=400, detail=f"user_id must be between 1 and {num_users}")

    # ── Stage 1: Retrieval ──────────────────────────────────────────
    with torch.no_grad():
        user_tensor = torch.tensor([request.user_id])
        user_emb = two_tower.get_user_embedding(user_tensor).numpy().astype('float32')

    distances, indices = faiss_index.search(user_emb, request.top_k_retrieval)
    # FAISS indices are 0-based; item_ids are 1-based
    candidate_ids = (indices[0] + 1).tolist()
    retrieval_scores = distances[0].tolist()

    # ── Stage 2: Re-ranking with DeepFM ─────────────────────────────
    with torch.no_grad():
        u_tensor = torch.tensor([request.user_id] * len(candidate_ids), dtype=torch.long)
        i_tensor = torch.tensor(candidate_ids, dtype=torch.long)
        rank_scores = deepfm(u_tensor, i_tensor).numpy().tolist()

    # Build results and sort by ranking score (higher = better)
    results = []
    for cid, r_score, rk_score in zip(candidate_ids, retrieval_scores, rank_scores):
        title = ""
        if movies_df is not None:
            row = movies_df[movies_df['item_id'] == cid]
            if not row.empty:
                title = row.iloc[0]['title']
        results.append(RankedItem(
            item_id=cid,
            title=title,
            retrieval_score=float(r_score),
            ranking_score=float(rk_score),
        ))

    results.sort(key=lambda r: r.ranking_score, reverse=True)
    return results[:request.top_k_final]
