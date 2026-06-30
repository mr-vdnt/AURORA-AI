import sys
import os
import unittest
from fastapi.testclient import TestClient

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from services.agent.main import app

class TestHealthEndpoints(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)

    def test_ping_endpoint(self):
        response = self.client.get("/ping")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {"status": "pong"})

    def test_health_endpoint(self):
        response = self.client.get("/health")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data.get("status"), "healthy")
        self.assertIn("microservices", data)
        
        # Microservices checks should be reported (either healthy, unhealthy, or unreachable)
        microservices = data.get("microservices", {})
        self.assertIn("ranking", microservices)
        self.assertIn("event_processor", microservices)
        self.assertIn("rag", microservices)

if __name__ == "__main__":
    unittest.main()
