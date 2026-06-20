import os
import sys
import torch
import pandas as pd

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../..')))
from models.rerankers.deepfm import DeepFM

def main():
    print("Loading data to get dimensions...")
    ratings = pd.read_csv("data/raw/ratings.csv")
    num_users = int(ratings['user_id'].max())
    num_items = int(ratings['item_id'].max())
    
    print(f"Users: {num_users}, Items: {num_items}")
    
    # Initialize the NEW DeepFM architecture (with visual_dim=64)
    model = DeepFM(num_users=num_users, num_items=num_items, embedding_dim=32, hidden_dims=[64, 32], visual_dim=64)
    
    os.makedirs("models/rerankers", exist_ok=True)
    weights_path = "models/rerankers/deepfm_weights.pth"
    
    torch.save(model.state_dict(), weights_path)
    print(f"Successfully re-initialized and saved DeepFM Multimodal to {weights_path}")

if __name__ == "__main__":
    main()
