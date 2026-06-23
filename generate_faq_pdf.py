from fpdf import FPDF

class PDF(FPDF):
    def header(self):
        self.set_font('helvetica', 'B', 15)
        self.cell(0, 10, 'Aurora AI - Interview FAQs', border=False, align='C')
        self.ln(15)

    def chapter_title(self, num, title):
        self.set_font('helvetica', 'B', 12)
        self.set_fill_color(230, 230, 250)
        self.multi_cell(0, 8, f'Q{num}: {title}', fill=True)
        self.ln(2)

    def chapter_body(self, body):
        self.set_font('helvetica', '', 11)
        self.multi_cell(0, 6, body)
        self.ln(8)

faqs = [
    {
        "q": "Can you explain the overall architecture of Aurora AI?",
        "a": "Aurora AI is built using a Microservices Architecture. It consists of four isolated FastAPI services running concurrently: the Orchestrator Agent (Port 10000) acts as the API gateway and natural language interface; the Ranking Engine (Port 8001) handles FAISS vector similarity; the Event Processor (Port 8002) manages real-time user telemetry and in-memory feature storage; and the RAG/Knowledge Graph Service (Port 8003) generates contextual explanations. They communicate via internal HTTP requests."
    },
    {
        "q": "Why did you choose FastAPI over Django or Flask?",
        "a": "FastAPI was chosen for its high performance (powered by Starlette and Pydantic) and native async support. Since our architecture relies on multiple microservices communicating with each other, non-blocking asynchronous I/O is critical. Additionally, FastAPI's automatic data validation via Pydantic ensures robust data contracts between the microservices."
    },
    {
        "q": "How did you manage the strict 512MB RAM constraint on Render?",
        "a": "Memory optimization was one of the biggest challenges. Initially, the RAG service used heavy ML libraries like PyTorch and Transformers, which caused Out-Of-Memory (OOM) crashes. I resolved this by ripping out the heavy neural networks and building a lightweight 'IntelligentMetadataExtractor'. This engine uses deterministic heuristics and keyword parsing against our movies dataset, combined with NetworkX graph traversals, to generate high-quality AI insights with a fraction of the memory footprint."
    },
    {
        "q": "How does the recommendation system work under the hood?",
        "a": "The recommendation engine uses a hybrid approach. First, we use FAISS (Facebook AI Similarity Search) running on CPU to quickly retrieve nearest neighbors based on pre-computed embeddings. Second, we utilize a Knowledge Graph built with NetworkX to find the shortest path between user preferences and movie entities. Finally, the Event Processor updates user preference weights in real-time based on their click events, dynamically adjusting the ranking scores."
    },
    {
        "q": "Why did you use Vanilla JavaScript instead of React or Vue?",
        "a": "To ensure maximum performance and minimal client-side overhead. Aurora AI features a massive 3D Spatial UI with heavy Glassmorphism effects. By using Vanilla JS and a custom SPA (Single Page Application) router, we bypassed the virtual DOM overhead of React. This allowed for extremely smooth 60FPS animations, direct DOM manipulation for the tilt cards, and instant rendering of the 19-section Premium Cinematic Details Modal."
    },
    {
        "q": "How does the application track user preferences in real-time?",
        "a": "Whenever a user interacts with a movie (e.g., clicking to open the details modal), the frontend asynchronously fires a POST request to '/events/ingest'. The Orchestrator Agent proxies this to the Event Processor microservice. The Event Processor updates the user's profile in an in-memory Feature Store. When the user asks for new recommendations, the RAG and Ranking engines query this Feature Store to bias the results towards the user's newly discovered interests."
    },
    {
        "q": "Can you explain the Glassmorphism implementation?",
        "a": "Glassmorphism is achieved using CSS 'backdrop-filter: blur()' paired with semi-transparent rgba() background colors. For the cinematic modal, we used 'backdrop-filter: blur(40px) brightness(0.8)' combined with an inset border ('rgba(255, 255, 255, 0.1)') to create the frosted glass rim effect. We also utilized overlapping gradients to smoothly blend the movie's backdrop image into the dark UI."
    },
    {
        "q": "What happens if one of the microservices fails?",
        "a": "The system is designed with graceful degradation. The Orchestrator Agent acts as the central router and wraps cross-service calls in try/catch blocks with strict timeouts. If the RAG service fails, the agent falls back to serving standard metadata. If the Ranking service fails, the system defaults to serving popular/trending movies from the static dataset, ensuring the user always receives a response rather than a 500 error."
    }
]

pdf = PDF()
pdf.add_page()

for i, faq in enumerate(faqs, 1):
    pdf.chapter_title(i, faq['q'])
    pdf.chapter_body(faq['a'])

output_path = "Interview FAQs.pdf"
pdf.output(output_path)
print(f"Successfully generated {output_path}")
