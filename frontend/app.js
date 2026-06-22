/* ==========================================================================
   AURORA AI — Premium Netflix & Apple TV Frontend Logic
   ========================================================================== */

// ── DOM ELEMENTS ────────────────────────────────────────────────────────
const nav = document.getElementById('aurora-nav');
const navLinks = document.getElementById('nav-links').querySelectorAll('a');
const profileTrigger = document.getElementById('profile-trigger');
const profileDropdown = document.getElementById('profile-dropdown');
const userIdInput = document.getElementById('user-id-input');

// Search
const searchTrigger = document.getElementById('search-trigger');
const searchOverlay = document.getElementById('search-overlay');
const searchClose = document.getElementById('search-close');
const searchInput = document.getElementById('search-input');
const searchResults = document.getElementById('search-results');

// AI Panel
const aiTrigger = document.getElementById('ai-trigger');
const aiPanel = document.getElementById('ai-panel');
const aiPanelClose = document.getElementById('ai-panel-close');
const chatInput = document.getElementById('chat-input');
const sendBtn = document.getElementById('send-btn');
const chatHistory = document.getElementById('chat-history');
const autocompleteDropdown = document.getElementById('autocomplete-dropdown');

// Main Content
const auroraMain = document.getElementById('aurora-main');
const heroSection = document.getElementById('hero-section');
const contentRows = document.getElementById('content-rows');

// Modal
const modalOverlay = document.getElementById('movie-detail-modal');
const modalBody = document.getElementById('modal-body');
const closeModalBtn = document.getElementById('close-modal-btn');

// State
let globalMovies = [];

// ── INIT ───────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    // Initial Route
    navigateTo('home');
});

// ── SCROLL NAV ─────────────────────────────────────────────────────────
window.addEventListener('scroll', () => {
    if (window.scrollY > 30) nav.classList.add('scrolled');
    else nav.classList.remove('scrolled');
});

// ── PROFILE DROPDOWN ───────────────────────────────────────────────────
profileTrigger.addEventListener('click', (e) => {
    // Prevent closing immediately when clicking inside
    if (e.target.closest('.profile-dropdown') && e.target.tagName !== 'A') return;
    profileTrigger.classList.toggle('open');
});
document.addEventListener('click', (e) => {
    if (!profileTrigger.contains(e.target)) profileTrigger.classList.remove('open');
});

// ── SEARCH OVERLAY ─────────────────────────────────────────────────────
searchTrigger.addEventListener('click', () => {
    searchOverlay.style.display = 'flex';
    searchInput.focus();
});
searchClose.addEventListener('click', closeSearch);
searchOverlay.addEventListener('click', (e) => {
    if (e.target === searchOverlay) closeSearch();
});

function closeSearch() {
    searchOverlay.style.display = 'none';
    searchInput.value = '';
    searchResults.innerHTML = '';
}

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
                    <div class="search-result" onclick="executeSearch('Similar to ${t.replace(/'/g, "\\'")}')">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color:var(--text-muted)"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                        <div style="flex:1;">
                            <div style="font-weight:600;">${t}</div>
                            <div style="font-size:0.8rem;color:var(--text-muted)">Search similar titles</div>
                        </div>
                    </div>
                `).join('');
            }
        } catch (err) { console.error('Search error', err); }
    }, 250);
});

function executeSearch(query) {
    closeSearch();
    chatInput.value = query;
    aiPanel.classList.add('open');
    handleSend();
}

// ── AI PANEL ───────────────────────────────────────────────────────────
aiTrigger.addEventListener('click', () => aiPanel.classList.add('open'));
aiPanelClose.addEventListener('click', () => aiPanel.classList.remove('open'));

function addMessage(text, isUser) {
    const div = document.createElement('div');
    div.className = `ai-message ${isUser ? 'ai-message--user' : 'ai-message--system'}`;
    div.innerHTML = text;
    chatHistory.appendChild(div);
    chatHistory.scrollTop = chatHistory.scrollHeight;
}

async function handleSend() {
    const query = chatInput.value.trim();
    if (!query) return;
    const userId = parseInt(userIdInput.value) || 32;

    addMessage(query, true);
    chatInput.value = '';
    autocompleteDropdown.style.display = 'none';
    
    // Skeleton loading in content
    contentRows.innerHTML = `
        <div class="content-section" style="padding-top:100px;">
            <div style="width:200px;height:24px;background:var(--glass-border);border-radius:4px;margin-bottom:20px;animation:pulse 1.5s infinite;"></div>
            <div class="content-row">
                ${Array(6).fill('<div class="movie-card-wrapper"><div style="width:100%;aspect-ratio:2/3;background:var(--glass-border);border-radius:var(--radius-sm);animation:pulse 1.5s infinite;"></div></div>').join('')}
            </div>
        </div>
    `;

    try {
        const response = await fetch('/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_id: userId, query: query })
        });
        const data = await response.json();

        if (data.intent === 'explanation') {
            addMessage(data.response, false);
            contentRows.innerHTML = '';
        } else {
            let movies = Array.isArray(data.response) ? data.response : data.response.value;
            if (movies && movies.length > 0) {
                let title = 'Aurora Recommendations';
                if (data.intent === 'trending') title = 'Trending Now';
                else if (data.intent === 'similar_movies') title = 'Because You Searched';
                else if (data.intent === 'genre_search') title = 'Genre Results';
                
                renderResults(movies, title);
                addMessage(`I found ${movies.length} matches for you.`, false);
            } else {
                contentRows.innerHTML = '';
                addMessage("I couldn't find anything matching that.", false);
            }
        }
    } catch (err) {
        contentRows.innerHTML = '';
        addMessage('Trouble connecting to the recommendation core.', false);
    }
}

sendBtn.addEventListener('click', handleSend);
chatInput.addEventListener('keypress', e => { if (e.key === 'Enter') handleSend(); });

let acTimeout;
chatInput.addEventListener('input', (e) => {
    const q = e.target.value.trim();
    if (q.length < 2) { autocompleteDropdown.style.display = 'none'; return; }
    clearTimeout(acTimeout);
    acTimeout = setTimeout(async () => {
        const resp = await fetch(`/autocomplete?q=${encodeURIComponent(q)}`);
        if (resp.ok) {
            const results = await resp.json();
            if (results.length > 0) {
                autocompleteDropdown.innerHTML = results.map(r => `
                    <div class="autocomplete-item" onclick="chatInput.value='Similar to ${r.replace(/'/g, "\\'")}'; autocompleteDropdown.style.display='none'; handleSend();">${r}</div>
                `).join('');
                autocompleteDropdown.style.display = 'block';
            } else autocompleteDropdown.style.display = 'none';
        }
    }, 300);
});

// ── SPA ROUTER ─────────────────────────────────────────────────────────
function navigateTo(page) {
    navLinks.forEach(l => {
        if (l.dataset.page === page) l.classList.add('active');
        else l.classList.remove('active');
    });

    window.scrollTo({ top: 0, behavior: 'smooth' });

    if (page === 'home') {
        loadHomePage();
    } else if (page === 'trending') {
        chatInput.value = "What is trending?";
        handleSend();
    } else {
        heroSection.style.display = 'none';
        contentRows.innerHTML = `
            <div class="content-section" style="padding-top:120px;text-align:center;">
                <h2 style="font-size:2.5rem;margin-bottom:16px;">${page.replace('-', ' ').toUpperCase()}</h2>
                <p style="color:var(--text-muted);">Explore the full catalog coming soon in Phase 4.</p>
            </div>
        `;
    }
}

// ── LOAD HOME PAGE ─────────────────────────────────────────────────────
async function loadHomePage() {
    const userId = parseInt(userIdInput.value) || 32;
    
    // Fetch Recommendations to populate Home
    try {
        const response = await fetch('/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_id: userId, query: "Recommend me movies" })
        });
        const data = await response.json();
        const movies = Array.isArray(data.response) ? data.response : data.response.value;
        if (movies && movies.length > 0) {
            renderResults(movies, 'Top Picks For You', true);
        }
    } catch (err) {
        console.error("Failed to load home page", err);
    }
}

// ── RENDER ENGINE ──────────────────────────────────────────────────────
function renderResults(movies, mainRowTitle, isHome = false) {
    globalMovies = movies;
    contentRows.innerHTML = '';
    
    const sorted = [...movies].sort((a, b) => {
        const sa = (a.rich_metadata || {}).match_percentage || 80;
        const sb = (b.rich_metadata || {}).match_percentage || 80;
        return sb - sa;
    });

    // #1 Recommendation is Hero
    renderHero(sorted[0]);

    // Rows
    const remaining = sorted.slice(1);
    const tierS = remaining.filter(m => ((m.rich_metadata || {}).match_percentage || 80) >= 95);
    const tierA = remaining.filter(m => { const s = (m.rich_metadata || {}).match_percentage || 80; return s >= 90 && s < 95; });
    const tierB = remaining.filter(m => { const s = (m.rich_metadata || {}).match_percentage || 80; return s < 90; });

    if (isHome) {
        if (remaining.length > 0) appendRow(mainRowTitle, remaining);
        if (tierS.length > 0) appendRow('Perfect Matches', tierS);
        if (tierA.length > 0) appendRow('Because You Watched Similar', tierA);
        if (tierB.length > 0) appendRow('Hidden Gems', tierB);
    } else {
        appendRow(mainRowTitle, remaining);
    }
}

function renderHero(movie) {
    if (!movie) { heroSection.style.display = 'none'; return; }
    
    const meta = movie.rich_metadata || {};
    const title = movie.title || 'Unknown';
    const backdropUrl = movie.backdrop_url || movie.poster_url || `https://placehold.co/1920x1080/111/333?text=${encodeURIComponent(title.split(' (')[0])}`;
    const score = meta.match_percentage || Math.floor(Math.random() * 5 + 95);
    const synopsis = meta.story_summary || movie.overview || 'A cinematic masterpiece highly recommended by Aurora.';
    const genres = (meta.tags || ['Drama']).slice(0,3).map(g => `<span class="genre-pill">${g}</span>`).join('');
    
    heroSection.style.display = 'flex';
    heroSection.innerHTML = `
        <div class="hero__backdrop" style="background-image: url('${backdropUrl}');"></div>
        <div class="hero__overlay"></div>
        <div class="hero__content">
            <div class="hero__badge">★ ${score}% Aurora Match</div>
            <h1 class="hero__title">${title}</h1>
            <div class="hero__meta">
                ${meta.year ? `<div class="hero__meta-item">${meta.year}</div>` : ''}
                ${meta.runtime ? `<div class="hero__meta-item">${meta.runtime}</div>` : ''}
                <div class="hero__meta-item" style="color:var(--match-green)">Highly Recommended</div>
            </div>
            <div class="hero__genres">${genres}</div>
            <p class="hero__description">${synopsis}</p>
            <div class="hero__actions">
                <button class="btn-play" onclick="openModalById(${movie.item_id})">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg> Play
                </button>
                <button class="btn-secondary" onclick="openModalById(${movie.item_id})">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg> More Info
                </button>
            </div>
        </div>
    `;
}

function appendRow(title, movies) {
    if (!movies || movies.length === 0) return;
    
    const section = document.createElement('section');
    section.className = 'content-section';
    
    let cardsHtml = movies.map(movie => {
        const meta = movie.rich_metadata || {};
        const mTitle = movie.title || 'Unknown';
        const posterUrl = movie.poster_url || `https://placehold.co/300x450/111/333?text=${encodeURIComponent(mTitle.split(' (')[0])}`;
        const backdropUrl = movie.backdrop_url || posterUrl;
        const score = meta.match_percentage || 80;
        const genres = (meta.tags || []).slice(0,3).map(g => `<span>${g}</span>`).join('');
        const synopsis = meta.story_summary || movie.overview || '';
        const reason = movie.explanation || meta.why_recommended || 'Similar to content you liked.';
        
        return `
            <div class="movie-card-wrapper">
                <div class="movie-card" onclick="openModalById(${movie.item_id})" tabindex="0">
                    <img src="${posterUrl}" alt="${mTitle}" loading="lazy">
                    <div class="movie-card__match-badge">${score}%</div>
                </div>
                <div class="hover-expand">
                    <img src="${backdropUrl}" class="hover-expand__backdrop" alt="">
                    <div class="hover-expand__body">
                        <div class="hover-expand__title">${mTitle}</div>
                        <div class="hover-expand__meta">
                            <span class="hover-expand__match">${score}% Match</span>
                            ${meta.year ? `<span>${meta.year}</span>` : ''}
                        </div>
                        <div class="hover-expand__genres">${genres}</div>
                        <div class="hover-expand__ai-reason">
                            <div class="hover-expand__ai-title">Why Aurora Picked This</div>
                            <ul>
                                <li>Matches your preferred genres</li>
                                <li>High thematic similarity</li>
                            </ul>
                        </div>
                        <div class="hover-expand__actions">
                            <button class="hover-expand__btn play" onclick="openModalById(${movie.item_id})">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
                            </button>
                            <button class="hover-expand__btn">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }).join('');

    section.innerHTML = `
        <div class="content-section__header">
            <h2 class="content-section__title">${title}</h2>
        </div>
        <div class="content-row">
            ${cardsHtml}
        </div>
    `;
    contentRows.appendChild(section);
}

// ── MODAL ──────────────────────────────────────────────────────────────
function openModalById(id) {
    const movie = globalMovies.find(m => m.item_id === id);
    if (!movie) return;
    
    const meta = movie.rich_metadata || {};
    const title = movie.title || 'Unknown';
    const backdropUrl = movie.backdrop_url || movie.poster_url || '';
    const score = meta.match_percentage || 80;
    
    modalBody.innerHTML = `
        <div class="modal-hero" style="background-image: url('${backdropUrl}');">
            <div style="position:absolute; bottom:40px; left:40px; z-index:2;">
                <div style="display:inline-block; padding:4px 10px; background:var(--aurora-gradient); border-radius:12px; font-weight:700; color:white; font-size:0.85rem; margin-bottom:12px;">★ ${score}% Match</div>
                <h2 style="font-size:3rem; font-weight:800; color:white;">${title}</h2>
            </div>
        </div>
        <div class="modal-body-content">
            <div>
                <div style="display:flex; gap:16px; margin-bottom:20px; font-size:1.1rem;">
                    <span style="color:var(--match-green); font-weight:700;">Highly Recommended</span>
                    <span style="color:var(--text-muted);">${meta.year || ''}</span>
                    <span style="color:var(--text-muted);">${meta.runtime || ''}</span>
                </div>
                <p style="font-size:1.1rem; line-height:1.6; color:var(--text-main); margin-bottom:30px;">
                    ${meta.story_summary || movie.overview || 'No overview available.'}
                </p>
                <div style="background:rgba(139,92,246,0.1); border:1px solid rgba(139,92,246,0.2); padding:20px; border-radius:var(--radius-md);">
                    <h3 style="color:var(--aurora-purple); font-size:0.9rem; text-transform:uppercase; letter-spacing:1px; margin-bottom:12px;">Why Aurora Recommends This</h3>
                    <p style="color:var(--text-main); font-size:0.95rem; line-height:1.5;">${movie.explanation || meta.why_recommended || 'Based on your viewing history and high thematic correlation with your favorite genres.'}</p>
                </div>
            </div>
            <div>
                <div style="color:var(--text-muted); margin-bottom:16px;">
                    <span style="color:white; display:block; margin-bottom:4px;">Cast</span>
                    ${meta.main_cast || 'Various Artists'}
                </div>
                <div style="color:var(--text-muted); margin-bottom:16px;">
                    <span style="color:white; display:block; margin-bottom:4px;">Director</span>
                    ${meta.director || 'Unknown'}
                </div>
                <div style="color:var(--text-muted);">
                    <span style="color:white; display:block; margin-bottom:4px;">Genres</span>
                    ${(meta.tags || []).join(', ')}
                </div>
            </div>
        </div>
    `;
    modalOverlay.style.display = 'flex';
    
    // Feedback
    fetch('/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: parseInt(userIdInput.value) || 32, item_id: id, label: 1.0 })
    }).catch(()=>{});
}

closeModalBtn.addEventListener('click', () => modalOverlay.style.display = 'none');
modalOverlay.addEventListener('click', (e) => { if (e.target === modalOverlay) modalOverlay.style.display = 'none'; });
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        modalOverlay.style.display = 'none';
        closeSearch();
    }
});
