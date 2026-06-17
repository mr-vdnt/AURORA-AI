import os
import torch
import torch.nn as nn
import pandas as pd
import numpy as np
from torch.utils.data import Dataset, DataLoader
import mlflow

import sys
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../..')))
from models.rerankers.deepfm import DeepFM


class RankingDataset(Dataset):
    """Dataset for DeepFM ranking: uses raw ratings as regression targets."""
    def __init__(self, ratings_file):
        self.data = pd.read_csv(ratings_file)
        # Normalize ratings to [0, 1] for BCE-like training
        self.data['label'] = self.data['rating'] / 5.0

    def __len__(self):
        return len(self.data)

    def __getitem__(self, idx):
        row = self.data.iloc[idx]
        return int(row['user_id']), int(row['item_id']), np.float32(row['label'])


def compute_ndcg_at_k(model, data, k=10):
    """Compute NDCG@K on a subset of users."""
    model.eval()
    users = data['user_id'].unique()
    # Sample up to 200 users for speed
    sample_users = np.random.choice(users, size=min(200, len(users)), replace=False)

    ndcg_scores = []
    with torch.no_grad():
        for uid in sample_users:
            user_data = data[data['user_id'] == uid].copy()
            if len(user_data) < 2:
                continue

            u_tensor = torch.tensor(user_data['user_id'].values, dtype=torch.long)
            i_tensor = torch.tensor(user_data['item_id'].values, dtype=torch.long)
            preds = model(u_tensor, i_tensor).numpy()

            # True relevance from actual ratings
            true_rel = user_data['rating'].values

            # Sort by predicted scores (descending)
            pred_order = np.argsort(-preds)[:k]
            dcg = sum(true_rel[pred_order[i]] / np.log2(i + 2) for i in range(len(pred_order)))

            # Ideal DCG
            ideal_order = np.argsort(-true_rel)[:k]
            idcg = sum(true_rel[ideal_order[i]] / np.log2(i + 2) for i in range(len(ideal_order)))

            if idcg > 0:
                ndcg_scores.append(dcg / idcg)

    return float(np.mean(ndcg_scores)) if ndcg_scores else 0.0


def train():
    os.makedirs("mlruns", exist_ok=True)
    mlflow.set_tracking_uri("sqlite:///mlruns/mlflow.db")
    mlflow.set_experiment("AURORA_DeepFM_Ranker")

    with mlflow.start_run():
        print("Loading dataset...")
        dataset = RankingDataset("data/raw/ratings.csv")
        dataloader = DataLoader(dataset, batch_size=2048, shuffle=True)

        num_users = int(dataset.data['user_id'].max())
        num_items = int(dataset.data['item_id'].max())

        model = DeepFM(num_users=num_users, num_items=num_items, embedding_dim=32, hidden_dims=[64, 32])
        criterion = nn.BCEWithLogitsLoss()
        optimizer = torch.optim.Adam(model.parameters(), lr=0.003)

        epochs = 5
        mlflow.log_params({
            "model": "DeepFM",
            "epochs": epochs,
            "batch_size": 2048,
            "lr": 0.003,
            "embedding_dim": 32,
            "hidden_dims": "64,32",
        })

        print("Starting DeepFM training...")
        for epoch in range(epochs):
            model.train()
            total_loss = 0
            for users, items, labels in dataloader:
                optimizer.zero_grad()
                outputs = model(users, items)
                loss = criterion(outputs, labels)
                loss.backward()
                optimizer.step()
                total_loss += loss.item()

            avg_loss = total_loss / len(dataloader)

            # Compute NDCG@10
            ndcg = compute_ndcg_at_k(model, dataset.data, k=10)

            print(f"Epoch {epoch+1}/{epochs} | Loss: {avg_loss:.4f} | NDCG@10: {ndcg:.4f}")
            mlflow.log_metric("train_loss", avg_loss, step=epoch)
            mlflow.log_metric("ndcg_at_10", ndcg, step=epoch)

        # Save model
        os.makedirs("models/rerankers", exist_ok=True)
        torch.save(model.state_dict(), "models/rerankers/deepfm_weights.pth")
        print("DeepFM training complete! Model saved.")


if __name__ == "__main__":
    train()
