"""
AURORA AI - Agent Core Logic

Uses NLP to classify user intent and route to the correct tool.
"""
from transformers import pipeline
import re
from services.agent.tools import get_recommendations, get_explanation, get_trending

class OrchestratorAgent:
    def __init__(self):
        print("Loading Agent Intent Classifier...")
        # Using a small distilbert model for fast CPU zero-shot classification
        self.classifier = pipeline(
            "zero-shot-classification", 
            model="typeform/distilbert-base-uncased-mnli"
        )
        self.intents = ["recommendation", "explanation", "trending"]
        print("Agent ready.")
        
    def _extract_item_id(self, query: str) -> int:
        """Naive extraction of an item ID from a query (e.g., 'explain movie 123')"""
        match = re.search(r'\b\d+\b', query)
        if match:
            return int(match.group(0))
        return 1 # Fallback to Toy Story
        
    def process_query(self, user_id: int, query: str) -> dict:
        """
        1. Classify Intent
        2. Route to Tool
        3. Return unified response
        """
        # Step 1: Classify
        result = self.classifier(query, candidate_labels=self.intents)
        top_intent = result["labels"][0]
        confidence = result["scores"][0]
        
        print(f"Agent classified intent: '{top_intent}' with {confidence:.2f} confidence.")
        
        # Step 2: Route
        response_data = None
        
        if top_intent == "recommendation":
            tool_resp = get_recommendations(user_id)
            if tool_resp["status"] == "success":
                recs = tool_resp["data"]["recommendations"]
                response_data = f"Here are your top recommendations: {', '.join([str(r['item_id']) for r in recs])}"
            else:
                response_data = tool_resp["message"]
                
        elif top_intent == "explanation":
            # Try to find which movie they are asking about
            item_id = self._extract_item_id(query)
            tool_resp = get_explanation(user_id, item_id)
            if tool_resp["status"] == "success":
                response_data = tool_resp["data"]["explanation"]
            else:
                response_data = tool_resp["message"]
                
        elif top_intent == "trending":
            tool_resp = get_trending()
            if tool_resp["status"] == "success":
                trends = tool_resp["data"]["popular_items"]
                response_data = f"Currently trending globally: {', '.join([str(t[0]) for t in trends])}"
            else:
                response_data = tool_resp["message"]
                
        # Step 3: Formulate Final Response
        return {
            "query": query,
            "intent": top_intent,
            "response": response_data
        }

# Singleton
agent = OrchestratorAgent()
