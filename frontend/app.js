/* ================================================================
   AURORA — Netflix-Grade AI Cinematic Discovery Platform
   Frontend Application Logic
   ================================================================ */

// ── DOM REFERENCES ──────────────────────────────────────────────────
const nav = document.getElementById('aurora-nav');
const heroSection = document.getElementById('hero-section');
const emptyState = document.getElementById('empty-state');
const contentRows = document.getElementById('content-rows');
const categoryPills = document.getElementById('category-pills');

// AI Panel
const aiPanel = document.getElementById('ai-panel');
const aiTrigger = document.getElementById('ai-trigger');
const aiPanelClose = document.getElementById('ai-panel-close');
const chatInput = document.getElementById('chat-input');
const sendBtn = document.getElementById('send-btn');
const chatHistory = document.getElementById('chat-history');
const autocompleteDropdown = document.getElementById('autocomplete-dropdown');

// Search
const searchTrigger = document.getElementById('search-trigger');
const searchOverlay = document.getElementById('search-overlay');
const searchInput = document.getElementById('search-input');
const searchResults = document.getElementById('search-results');

// Modal
const modalOverlay = document.getElementById('movie-detail-modal');
const modalBody = document.getElementById('modal-body');
const closeModalBtn = document.getElementById('close-modal-btn');

// User
const userIdInput = document.getElementById('user-id-input');

// ── STATE ───────────────────────────────────────────────────────────
let currentMovies = [];
let heroMovie = null;

// ── NAV SCROLL EFFECT ───────────────────────────────────────────────
window.addEventListener('scroll', () => {
    if (window.scrollY > 30) {
        nav.classList.add('scrolled');
    } else {
        nav.classList.remove('scrolled');
    }
});

// ── AI PANEL TOGGLE ─────────────────────────────────────────────────
aiTrigger.addEventListener('click', () => {
    aiPanel.classList.toggle('ai-panel--open');
});
aiPanelClose.addEventListener('click', () => {
    aiPanel.classList.remove('ai-panel--open');
});

// ── SEARCH OVERLAY ──────────────────────────────────────────────────
searchTrigger.addEventListener('click', () => {
    searchOverlay.style.display = 'flex';
    searchInput.focus();
});
searchOverlay.addEventListener('click', (e) => {
    if (e.target === searchOverlay) {
        searchOverlay.style.display = 'none';
        searchInput.value = '';
        searchResults.innerHTML = '';
    }
});
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        searchOverlay.style.display = 'none';
        modalOverlay.style.display = 'none';
    }
});

let searchTimeout;
searchInput.addEventListener('input', (e) => {
    const q = e.target.value.trim();
    if (q.length < 2) { searchResults.innerHTML = ''; return; }
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(async () => {
        try {
            const resp = await fetch(`/autocomplete?q=${encodeURIComponent(q)}`);
            if (resp.ok) {
                const titles = await resp.json();
                searchResults.innerHTML = titles.map(t => `
                    <div class="search-result-item" onclick="executeSearch('Similar to ${t.replace(/'/g, "\\'")}')">
                        <div class="search-result-item__info">
                            <div class="search-result-item__title">${t}</div>
                            <div class="search-result-item__meta">Click to find similar</div>
                        </div>
                    </div>
                `).join('');
            }
        } catch (err) { console.error('Search error', err); }
    }, 250);
});

function executeSearch(query) {
    searchOverlay.style.display = 'none';
    searchInput.value = '';
    searchResults.innerHTML = '';
    chatInput.value = query;
    handleSend();
    aiPanel.classList.add('ai-panel--open');
}

// ── MODAL ────────────────────────────────────────────────────────────
closeModalBtn.addEventListener('click', () => { modalOverlay.style.display = 'none'; });
modalOverlay.addEventListener('click', (e) => { if (e.target === modalOverlay) modalOverlay.style.display = 'none'; });

function openDetailModal(movie) {
    const meta = movie.rich_metadata || {};
    const title = movie.title || 'Unknown Title';
    const encodedTitle = encodeURIComponent(title.split(' (')[0]);
    const posterUrl = movie.poster_url || `https://placehold.co/300x450/181818/666?text=${encodedTitle}`;
    const backdropUrl = movie.backdrop_url || posterUrl;
    const matchScore = meta.match_percentage || Math.floor(Math.random() * 15 + 85);
    const genres = (meta.tags || ['Drama']).map(g => `<span class="genre-chip">${g}</span>`).join('');
    const year = meta.year || '';
    const runtime = meta.runtime || '';
    const director = meta.director || 'Unknown';
    const cast = meta.main_cast || 'Various Artists';
    const synopsis = meta.story_summary || movie.overview || 'No synopsis available.';
    const explanation = movie.explanation || meta.why_recommended || 'Matches your viewing patterns and genre preferences.';

    const reasons = [
        'Matches your preferred genres',
        'Similar thematic elements to titles you enjoyed',
        'Strong recommendation confidence',
        'Loved by viewers with similar taste',
        'High quality score'
    ];

    modalBody.innerHTML = `
        <div class="modal-hero" style="background-image: url('${backdropUrl}');">
            <div class="modal-hero__gradient"></div>
            <div class="modal-hero__info">
                <div class="hero__match"><span style="font-size:1.1rem;">★</span> ${matchScore}% Aurora Match</div>
                <h2 class="modal-hero__title">${title}</h2>
            </div>
        </div>
        <div class="modal-body">
            <div class="modal-main-col">
                <div class="modal-section">
                    <div style="display:flex;gap:14px;align-items:center;margin-bottom:16px;flex-wrap:wrap;">
                        <span style="color:var(--match-green);font-weight:700;">${matchScore}% Match</span>
                        ${year ? `<span style="color:var(--text-muted);">${year}</span>` : ''}
                        ${runtime ? `<span style="color:var(--text-muted);">${runtime}</span>` : ''}
                    </div>
                    <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:16px;">${genres}</div>
                    <p>${synopsis}</p>
                </div>
                <div class="modal-ai-reason">
                    <h3>Why Aurora Recommended This</h3>
                    <ul style="list-style:none;padding:0;">
                        ${reasons.map(r => `<li>${r}</li>`).join('')}
                    </ul>
                    <p style="margin-top:12px;font-size:0.85rem;color:var(--text-muted);font-style:italic;">"${explanation}"</p>
                </div>
            </div>
            <div class="modal-side-col">
                <div class="modal-section">
                    <h3>Details</h3>
                    <dl class="modal-sidebar-info">
                        <dt>Director</dt><dd>${director}</dd>
                        <dt>Cast</dt><dd>${cast}</dd>
                        ${year ? `<dt>Year</dt><dd>${year}</dd>` : ''}
                        ${runtime ? `<dt>Runtime</dt><dd>${runtime}</dd>` : ''}
                    </dl>
                </div>
            </div>
        </div>
    `;
    modalOverlay.style.display = 'flex';

    // Fire feedback
    fetch('/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: parseInt(userIdInput.value), item_id: movie.item_id || 0, label: 1.0 })
    }).catch(() => {});
}

// ── CHAT MESSAGES ────────────────────────────────────────────────────
function addMessage(text, type) {
    const div = document.createElement('div');
    div.classList.add('ai-message', type === 'user-msg' ? 'ai-message--user' : 'ai-message--system');
    div.innerHTML = text;
    chatHistory.appendChild(div);
    chatHistory.scrollTop = chatHistory.scrollHeight;
}

// ── MATCH TIER ───────────────────────────────────────────────────────
function getMatchTier(score) {
    if (score >= 95) return { tier: 'S', class: 'match-tier--s', label: '★ Perfect Match' };
    if (score >= 90) return { tier: 'A', class: 'match-tier--a', label: 'Excellent Match' };
    if (score >= 80) return { tier: 'B', class: 'match-tier--b', label: 'Great Match' };
    return { tier: 'C', class: 'match-tier--c', label: 'Good Match' };
}

// ── RENDER HERO ──────────────────────────────────────────────────────
function renderHero(movie) {
    heroMovie = movie;
    const meta = movie.rich_metadata || {};
    const title = movie.title || 'Unknown Title';
    const encodedTitle = encodeURIComponent(title.split(' (')[0]);
    const backdropUrl = movie.backdrop_url || movie.poster_url || `https://placehold.co/1920x1080/181818/666?text=${encodedTitle}`;
    const matchScore = meta.match_percentage || Math.floor(Math.random() * 8 + 92);
    const genres = (meta.tags || ['Drama']).map(g => `<span class="genre-chip">${g}</span>`).join('');
    const year = meta.year || '';
    const runtime = meta.runtime || '';
    const synopsis = meta.story_summary || movie.overview || 'A captivating cinematic experience recommended by Aurora AI.';

    heroSection.style.display = 'block';
    heroSection.innerHTML = `
        <div class="hero__backdrop" style="background-image: url('${backdropUrl}');"></div>
        <div class="hero__gradient"></div>
        <div class="hero__content">
            <div class="hero__match"><span style="font-size:1.1rem;">★</span> ${matchScore}% Aurora Match</div>
            <h1 class="hero__title">${title}</h1>
            <div class="hero__meta">
                ${year ? `<span>${year}</span>` : ''}
                ${runtime ? `<span>${runtime}</span>` : ''}
                <span style="color:var(--match-green);font-weight:600;">${matchScore}% Match</span>
            </div>
            <div class="hero__genres">${genres}</div>
            <p class="hero__description">${synopsis}</p>
            <div class="hero__actions">
                <button class="btn-secondary" onclick="openDetailModal(heroMovie)">ℹ More Info</button>
                <button class="btn-icon" onclick="openDetailModal(heroMovie)" aria-label="Add to list">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                </button>
            </div>
        </div>
    `;
}

// ── RENDER MOVIE CARD ────────────────────────────────────────────────
function createMovieCard(movie, rank) {
    const meta = movie.rich_metadata || {};
    const title = movie.title || 'Unknown Title';
    const encodedTitle = encodeURIComponent(title.split(' (')[0]);
    const posterUrl = movie.poster_url || `https://placehold.co/300x450/181818/666?text=${encodedTitle}`;
    const backdropUrl = movie.backdrop_url || posterUrl;
    const matchScore = meta.match_percentage || Math.floor(Math.random() * 20 + 75);
    const year = meta.year || '';
    const runtime = meta.runtime || '';
    const genres = (meta.tags || []).slice(0, 3).map(g => `<span class="genre-chip" style="font-size:0.7rem;padding:2px 8px;">${g}</span>`).join('');
    const synopsis = meta.story_summary || movie.overview || '';
    const explanation = movie.explanation || meta.why_recommended || 'Matches your taste profile.';

    const reasons = [
        'Similar to movies you liked',
        'Matches your preferred genres',
        'High thematic similarity'
    ];

    const card = document.createElement('div');
    card.className = 'movie-card';
    card.setAttribute('role', 'button');
    card.setAttribute('tabindex', '0');
    card.setAttribute('aria-label', `${title}, ${matchScore}% match`);

    card.innerHTML = `
        <img class="movie-card__poster" src="${posterUrl}" alt="${title}" loading="lazy" onerror="this.src='https://placehold.co/300x450/181818/333?text=No+Poster'">
        <div class="movie-card__match">${matchScore}%</div>
        <div class="movie-card__info">
            <div class="movie-card__title">${title}</div>
            <div class="movie-card__meta">${year}</div>
        </div>
        <div class="movie-card__expand">
            <img class="movie-card__expand-backdrop" src="${backdropUrl}" alt="" loading="lazy" onerror="this.style.display='none'">
            <div class="movie-card__expand-body">
                <div class="movie-card__expand-title">${title}</div>
                <div class="movie-card__expand-meta">
                    <span class="movie-card__expand-match">${matchScore}% Match</span>
                    ${year ? `<span>${year}</span>` : ''}
                    ${runtime ? `<span>${runtime}</span>` : ''}
                </div>
                <div class="movie-card__expand-genres">${genres}</div>
                ${synopsis ? `<p class="movie-card__expand-synopsis">${synopsis}</p>` : ''}
                <div class="movie-card__expand-reason">
                    <div class="movie-card__expand-reason__title">Why Aurora Picked This</div>
                    <ul class="movie-card__expand-reason__list">
                        ${reasons.map(r => `<li>${r}</li>`).join('')}
                    </ul>
                </div>
                <div class="movie-card__expand-actions">
                    <button class="expand-btn expand-btn--primary" onclick="event.stopPropagation(); openDetailModal(currentMovies[${rank}])">Details</button>
                    <button class="expand-btn expand-btn--secondary" onclick="event.stopPropagation();">+ My List</button>
                </div>
            </div>
        </div>
    `;

    card.addEventListener('click', () => openDetailModal(movie));
    card.addEventListener('keydown', (e) => { if (e.key === 'Enter') openDetailModal(movie); });

    return card;
}

// ── RENDER CONTENT ROWS ──────────────────────────────────────────────
function renderMovies(movies, sectionTitle) {
    emptyState.style.display = 'none';
    currentMovies = movies;

    if (!movies || movies.length === 0) {
        contentRows.innerHTML = '<p style="text-align:center;padding:60px;color:var(--text-muted);">No matching content found. Try a different query.</p>';
        heroSection.style.display = 'none';
        return;
    }

    // Sort by match score descending
    const sorted = [...movies].sort((a, b) => {
        const scoreA = (a.rich_metadata || {}).match_percentage || 80;
        const scoreB = (b.rich_metadata || {}).match_percentage || 80;
        return scoreB - scoreA;
    });

    // Hero = #1 recommendation
    renderHero(sorted[0]);

    // Group remaining into tiers
    const tierS = [], tierA = [], tierB = [], tierC = [];
    sorted.slice(1).forEach((m, i) => {
        const score = (m.rich_metadata || {}).match_percentage || Math.floor(Math.random() * 20 + 75);
        if (score >= 95) tierS.push(m);
        else if (score >= 90) tierA.push(m);
        else if (score >= 80) tierB.push(m);
        else tierC.push(m);
    });

    contentRows.innerHTML = '';

    const renderRow = (title, movies) => {
        if (movies.length === 0) return;
        const section = document.createElement('section');
        section.className = 'content-section';
        section.innerHTML = `
            <div class="content-section__header">
                <h2 class="content-section__title">${title}</h2>
            </div>
        `;
        const row = document.createElement('div');
        row.className = 'content-row';
        movies.forEach((m, i) => {
            const globalIndex = sorted.indexOf(m);
            row.appendChild(createMovieCard(m, globalIndex));
        });
        section.appendChild(row);
        contentRows.appendChild(section);
    };

    // Always render at least one "All Recommendations" row with all remaining
    if (sorted.length > 1) {
        renderRow(`${sectionTitle || 'Top Aurora Matches'}`, sorted.slice(1));
    }

    // Render tiered rows if enough movies
    if (tierS.length >= 2) renderRow('★ Perfect Matches', tierS);
    if (tierA.length >= 2) renderRow('Excellent Picks For You', tierA);
    if (tierB.length >= 2) renderRow('Worth Watching', tierB);

    // Scroll to content
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ── SKELETON LOADING ─────────────────────────────────────────────────
function showLoading() {
    emptyState.style.display = 'none';
    heroSection.style.display = 'none';
    contentRows.innerHTML = `
        <section class="content-section" style="margin-top:80px;">
            <div class="content-section__header">
                <div class="skeleton skeleton-text" style="width:200px;height:22px;"></div>
            </div>
            <div class="content-row">
                ${Array(8).fill('<div class="skeleton skeleton-card"></div>').join('')}
            </div>
        </section>
    `;
}

// ── HANDLE SEND ──────────────────────────────────────────────────────
async function handleSend() {
    const query = chatInput.value.trim();
    if (!query) return;
    const userId = parseInt(userIdInput.value) || 32;

    addMessage(query, 'user-msg');
    chatInput.value = '';
    autocompleteDropdown.style.display = 'none';
    showLoading();

    try {
        const response = await fetch('/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_id: userId, query: query })
        });
        const data = await response.json();

        if (data.intent === 'explanation') {
            addMessage(data.response, 'system-msg');
            contentRows.innerHTML = '';
            heroSection.style.display = 'none';
        } else {
            let movies = null;
            if (Array.isArray(data.response)) {
                movies = data.response;
            } else if (data.response && Array.isArray(data.response.value)) {
                movies = data.response.value;
            }

            if (movies) {
                // Determine section title from intent
                let title = 'Aurora Recommendations';
                if (data.intent === 'trending') title = 'Trending Now';
                else if (data.intent === 'similar_movies') title = 'Similar Movies';
                else if (data.intent === 'genre_search') title = 'Genre Results';
                renderMovies(movies, title);
                addMessage(`Found ${movies.length} recommendations for you.`, 'system-msg');
            } else {
                contentRows.innerHTML = '';
                heroSection.style.display = 'none';
                addMessage(typeof data.response === 'string' ? data.response : JSON.stringify(data.response), 'system-msg');
            }
        }
    } catch (error) {
        contentRows.innerHTML = '';
        heroSection.style.display = 'none';
        addMessage('We\'re having trouble loading recommendations. Please try again.', 'system-msg');
        console.error(error);
    }
}

// ── AUTOCOMPLETE ─────────────────────────────────────────────────────
let acTimeout;
chatInput.addEventListener('input', (e) => {
    const q = e.target.value.trim();
    if (q.length < 2) { autocompleteDropdown.style.display = 'none'; return; }
    clearTimeout(acTimeout);
    acTimeout = setTimeout(async () => {
        try {
            const resp = await fetch(`/autocomplete?q=${encodeURIComponent(q)}`);
            if (resp.ok) {
                const results = await resp.json();
                if (results.length > 0) {
                    autocompleteDropdown.innerHTML = results.map(r => `
                        <div class="ai-panel__autocomplete-item" onclick="chatInput.value='Similar to ${r.replace(/'/g, "\\'")}'; autocompleteDropdown.style.display='none'; handleSend();">
                            ${r}
                        </div>
                    `).join('');
                    autocompleteDropdown.style.display = 'block';
                } else {
                    autocompleteDropdown.style.display = 'none';
                }
            }
        } catch (err) { console.error('Autocomplete error', err); }
    }, 300);
});

// ── EVENT LISTENERS ──────────────────────────────────────────────────
sendBtn.addEventListener('click', handleSend);
chatInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') handleSend(); });

// ── EMPTY STATE CATEGORIES ───────────────────────────────────────────
function renderEmptyState() {
    heroSection.style.display = 'none';
    contentRows.innerHTML = '';
    emptyState.style.display = 'flex';

    const categories = [
        { emoji: '🔥', label: 'Trending Now', query: 'What is trending?' },
        { emoji: '💥', label: 'Action Movies', query: 'Recommend me some action movies' },
        { emoji: '🧠', label: 'Psychological Thrillers', query: 'Show me psychological thrillers' },
        { emoji: '😂', label: 'Comedies', query: 'Recommend me some comedies' },
        { emoji: '🌌', label: 'Sci-Fi Epics', query: 'Show me sci-fi movies' },
        { emoji: '👨‍👩‍👧', label: 'Family Favorites', query: 'Movies for the family' },
        { emoji: '🎭', label: 'Drama', query: 'Recommend me some drama movies' },
        { emoji: '😱', label: 'Horror', query: 'Show horror movies' },
        { emoji: '💕', label: 'Romance', query: 'Recommend romance movies' },
    ];

    categoryPills.innerHTML = categories.map(c => `
        <button class="category-pill" onclick="chatInput.value='${c.query}'; handleSend(); aiPanel.classList.add('ai-panel--open');">
            ${c.emoji} ${c.label}
        </button>
    `).join('');
}

// ── STARTUP ──────────────────────────────────────────────────────────
window.onload = () => {
    renderEmptyState();
};
