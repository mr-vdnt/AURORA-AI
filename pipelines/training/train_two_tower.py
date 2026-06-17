import os
import torch
import torch.nn as nn
import pandas as pd
from torch.utils.data import Dataset, DataLoader
import mlflow
import faiss
import numpy as np

import sys
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../..')))
from models.collaborative.two_tower import TwoTowerModel

class MovieLensDataset(Dataset):
    def __init__(self, ratings_file):
        self.data = pd.read_csv(ratings_file)
        # Treat rating >= 4 as positive (1), else negative (0)
        self.data['label'] = (self.data['rating'] >= 4).astype(np.float32)
        
    def __len__(self):
        return len(self.data)
        
    def __getitem__(self, idx):
        row = self.data.iloc[idx]
        return int(row['user_id']), int(row['item_id']), row['label']

def train():
    os.makedirs("mlruns", exist_ok=True)
    mlflow.set_tracking_uri("sqlite:///mlruns/mlflow.db")
    mlflow.set_experiment("AURORA_Two_Tower")
    
    with mlflow.start_run():
        print("Loading dataset...")
        dataset = MovieLensDataset("data/raw/ratings.csv")
        dataloader = DataLoader(dataset, batch_size=2048, shuffle=True)
        
        num_users = int(dataset.data['user_id'].max())
        num_items = int(dataset.data['item_id'].max())
        
        model = TwoTowerModel(num_users=num_users, num_items=num_items, embedding_dim=64)
        criterion = nn.BCEWithLogitsLoss()
        optimizer = torch.optim.Adam(model.parameters(), lr=0.005)
        
        epochs = 3
        mlflow.log_params({"epochs": epochs, "batch_size": 2048, "lr": 0.005, "embedding_dim": 64})
        
        print("Starting training...")
        model.train()
        for epoch in range(epochs):
            total_loss = 0
            for users, items, labels in dataloader:
                optimizer.zero_grad()
                outputs = model(users, items)
                loss = criterion(outputs, labels)
                loss.backward()
                optimizer.step()
                total_loss += loss.item()
            
            avg_loss = total_loss / len(dataloader)
            print(f"Epoch {epoch+1}/{epochs} | Loss: {avg_loss:.4f}")
            mlflow.log_metric("train_loss", avg_loss, step=epoch)
            
        # Export Item Embeddings to FAISS
        print("Exporting item embeddings to FAISS...")
        model.eval()
        with torch.no_grad():
            all_items = torch.arange(1, num_items + 1)
            item_embeddings = model.get_item_embedding(all_items).numpy()
            
        dimension = item_embeddings.shape[1]
        index = faiss.IndexFlatL2(dimension)
        index.add(item_embeddings)
        
        os.makedirs("data/index", exist_ok=True)
        faiss.write_index(index, "data/index/twotower_items.index")
        
        # Save model
        torch.save(model.state_dict(), "models/collaborative/twotower_weights.pth")
        print("Training complete and embeddings exported!")

if __name__ == "__main__":
    train()
