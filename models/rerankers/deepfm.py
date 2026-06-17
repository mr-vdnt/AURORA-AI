import torch
import torch.nn as nn

class DeepFM(nn.Module):
    def __init__(self, num_users, num_items, embedding_dim=32, hidden_dims=[64, 32]):
        super().__init__()
        
        self.user_emb = nn.Embedding(num_users + 1, embedding_dim)
        self.item_emb = nn.Embedding(num_items + 1, embedding_dim)
        
        # FM First order
        self.user_bias = nn.Embedding(num_users + 1, 1)
        self.item_bias = nn.Embedding(num_items + 1, 1)
        self.global_bias = nn.Parameter(torch.zeros(1))
        
        # Deep Component
        input_dim = embedding_dim * 2
        layers = []
        for hidden_dim in hidden_dims:
            layers.append(nn.Linear(input_dim, hidden_dim))
            layers.append(nn.ReLU())
            input_dim = hidden_dim
            
        layers.append(nn.Linear(input_dim, 1))
        self.deep = nn.Sequential(*layers)
        
    def forward(self, user_ids, item_ids):
        # FM First order
        fm_1st = self.user_bias(user_ids) + self.item_bias(item_ids) + self.global_bias
        
        # FM Second order (Interaction)
        u_e = self.user_emb(user_ids)
        i_e = self.item_emb(item_ids)
        fm_2nd = (u_e * i_e).sum(dim=1, keepdim=True)
        
        # Deep Component
        deep_in = torch.cat([u_e, i_e], dim=1)
        deep_out = self.deep(deep_in)
        
        # Combine
        out = fm_1st + fm_2nd + deep_out
        return out.squeeze(-1)
