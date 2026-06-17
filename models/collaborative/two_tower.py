import torch
import torch.nn as nn

class TwoTowerModel(nn.Module):
    def __init__(self, num_users: int, num_items: int, embedding_dim: int = 64):
        super().__init__()
        
        # User Tower
        self.user_embedding = nn.Embedding(num_embeddings=num_users + 1, embedding_dim=embedding_dim)
        self.user_fc = nn.Sequential(
            nn.Linear(embedding_dim, 128),
            nn.ReLU(),
            nn.Linear(128, embedding_dim)
        )
        
        # Item Tower
        self.item_embedding = nn.Embedding(num_embeddings=num_items + 1, embedding_dim=embedding_dim)
        self.item_fc = nn.Sequential(
            nn.Linear(embedding_dim, 128),
            nn.ReLU(),
            nn.Linear(128, embedding_dim)
        )
        
    def forward(self, user_ids, item_ids):
        # User pass
        u_emb = self.user_embedding(user_ids)
        u_out = self.user_fc(u_emb)
        
        # Item pass
        i_emb = self.item_embedding(item_ids)
        i_out = self.item_fc(i_emb)
        
        # Dot product prediction (unbounded logits for BCE)
        scores = (u_out * i_out).sum(dim=1)
        return scores

    def get_user_embedding(self, user_ids):
        u_emb = self.user_embedding(user_ids)
        u_out = self.user_fc(u_emb)
        return nn.functional.normalize(u_out, p=2, dim=1)
        
    def get_item_embedding(self, item_ids):
        i_emb = self.item_embedding(item_ids)
        i_out = self.item_fc(i_emb)
        return nn.functional.normalize(i_out, p=2, dim=1)
