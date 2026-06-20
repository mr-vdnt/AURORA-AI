const chatInput = document.getElementById('chat-input');
const sendBtn = document.getElementById('send-btn');
const chatHistory = document.getElementById('chat-history');
const movieGrid = document.getElementById('movie-grid');
const userIdInput = document.getElementById('user-id-input');

// Emojis for poster placeholders
const emojis = ["🎬", "🍿", "🎥", "🎞️", "🎭", "👽", "🚀", "🦸", "🕵️", "🧟"];

function addMessage(text, type) {
    const msgDiv = document.createElement('div');
    msgDiv.classList.add('message', type);
    msgDiv.innerHTML = text; // allow basic HTML
    chatHistory.appendChild(msgDiv);
    chatHistory.scrollTop = chatHistory.scrollHeight;
}

function renderMovies(movies) {
    movieGrid.innerHTML = '';
    if (!movies || movies.length === 0) {
        movieGrid.innerHTML = '<p>No movies found.</p>';
        return;
    }

    movies.forEach(movie => {
        const randomEmoji = emojis[Math.floor(Math.random() * emojis.length)];
        const card = document.createElement('div');
        card.classList.add('movie-card');
        
        // When clicked, simulate a user interaction (Online Learning feedback!)
        card.onclick = () => {
            fetch('http://127.0.0.1:8001/feedback', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    user_id: parseInt(userIdInput.value),
                    item_id: movie.item_id || 0,
                    label: 1.0
                })
            }).then(() => {
                addMessage(`<i>System: Registered interaction for "${movie.title}". Model updated!</i>`, 'system-msg');
            }).catch(console.error);
        };

        let subtitle = movie.score ? `Score: ${movie.score.toFixed(2)}` : 
                      (movie.ranking_score ? `Rank: ${movie.ranking_score.toFixed(2)}` : 'Trending');

        card.innerHTML = `
            <div class="movie-placeholder">${randomEmoji}</div>
            <h3>${movie.title || 'Unknown Title'}</h3>
            <p>${subtitle}</p>
        `;
        movieGrid.appendChild(card);
    });
}

async function handleSend() {
    const query = chatInput.value.trim();
    if (!query) return;

    const userId = parseInt(userIdInput.value) || 32;

    addMessage(query, 'user-msg');
    chatInput.value = '';
    
    // Show loading state
    movieGrid.innerHTML = '<div class="loading-spinner"></div>';

    try {
        const response = await fetch('/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ user_id: userId, query: query })
        });

        const data = await response.json();
        
        // Agent router returns intent + actual payload
        if (data.intent === 'explanation') {
            addMessage(`<b>Explanation:</b><br>${data.response}`, 'system-msg');
            movieGrid.innerHTML = ''; // Clear spinner
        } else {
            addMessage(`<i>Intent detected: ${data.intent}</i>`, 'system-msg');
            if (Array.isArray(data.response)) {
                renderMovies(data.response);
            } else if (data.response && Array.isArray(data.response.value)) {
                 renderMovies(data.response.value);
            } else {
                movieGrid.innerHTML = '';
                addMessage(JSON.stringify(data.response), 'system-msg');
            }
        }

    } catch (error) {
        addMessage(`Error: Could not connect to Agent Orchestrator.`, 'system-msg');
        movieGrid.innerHTML = '';
        console.error(error);
    }
}

sendBtn.addEventListener('click', handleSend);
chatInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleSend();
});

// Load trending on startup
window.onload = () => {
    chatInput.value = "What is trending?";
    handleSend();
};
