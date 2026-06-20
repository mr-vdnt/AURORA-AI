"""
AURORA AI - Multimodal Feature Extractor

Simulates the output of a Vision Foundation Model (like CLIP) processing
movie posters by generating 64-dimensional dense visual embeddings.
"""
import os
import pandas as pd
import numpy as np

def generate_visual_embeddings():
    np.random.seed(42)
    movies_path = "data/raw/movies.csv"
    if not os.path.exists(movies_path):
        print(f"Error: {movies_path} not found.")
        return

    movies_df = pd.read_csv(movies_path)
    
    print("Simulating Vision Model (CLIP) inference on movie posters...")
    
    embeddings = []
    for item_id in movies_df['item_id']:
        # Simulate a 64-dimensional visual feature vector (normalized)
        vec = np.random.randn(64)
        vec = vec / np.linalg.norm(vec)
        embeddings.append({
            "item_id": item_id,
            "visual_embedding": vec.tolist()
        })
        
    df = pd.DataFrame(embeddings)
    os.makedirs("data/multimodal", exist_ok=True)
    df.to_json("data/multimodal/visual_embeddings.json", orient="records", lines=True)
    
    print(f"Successfully generated visual embeddings for {len(df)} movies.")
    print("Saved to data/multimodal/visual_embeddings.json")

if __name__ == "__main__":
    generate_visual_embeddings()
