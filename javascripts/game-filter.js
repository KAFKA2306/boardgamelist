/**
 * Advanced Game Filtering System for BoardGameList
 * Multi-dimensional filtering with real-time updates
 */

class GameFilter {
    constructor() {
        this.games = [];
        this.filters = {
            playerCount: null,
            complexity: { min: 1.0, max: 5.0 },
            playtime: null,
            bggRating: { min: 1.0, max: 10.0 },
            categories: [],
            ownership: null,
            bga: null,
            search: ''
        };
        this.filteredGames = [];
        this.init();
    }

    async init() {
        await this.loadGameData();
        this.createFilterUI();
        this.bindEvents();
        this.updateDisplay();
    }

    async loadGameData() {
        // Extract game data from current page or fetch from API
        try {
            const gameElements = document.querySelectorAll('[data-game-metadata]');
            this.games = Array.from(gameElements).map(el => {
                return JSON.parse(el.getAttribute('data-game-metadata'));
            });
            
            // Fallback: parse from page content if no metadata elements
            if (this.games.length === 0) {
                await this.parseGamesFromContent();
            }
        } catch (error) {
            console.warn('Could not load game data:', error);
            await this.parseGamesFromContent();
        }
    }

    async parseGamesFromContent() {
        // Parse game data from existing navigation or content
        const navLinks = document.querySelectorAll('nav a[href*="games/"]');
        this.games = Array.from(navLinks).map(link => {
            const href = link.getAttribute('href');
            const title = link.textContent.trim();
            
            return {
                title: title,
                url: href,
                // Default values - will be enhanced by BGG integration
                players: 'N/A',
                complexity: 2.5,
                playtime: 'N/A',
                bgg_rating: 0,
                tags: [],
                ownership: false,
                bga_available: false
            };
        });
    }

    createFilterUI() {
        const filterContainer = document.createElement('div');
        filterContainer.className = 'game-filter-container';
        filterContainer.innerHTML = `
            <div class="filter-header">
                <h3>🎲 ゲームフィルター</h3>
                <button class="filter-toggle" aria-label="フィルターを切り替え">
                    <span class="filter-icon">⚙️</span>
                </button>
            </div>
            
            <div class="filter-panel" id="filterPanel">
                <!-- Search -->
                <div class="filter-group">
                    <label for="searchInput">🔍 検索</label>
                    <input type="text" id="searchInput" placeholder="ゲーム名で検索...">
                </div>

                <!-- Player Count -->
                <div class="filter-group">
                    <label for="playerCount">👥 プレイヤー数</label>
                    <select id="playerCount">
                        <option value="">すべて</option>
                        <option value="1">1人 (ソロ)</option>
                        <option value="2">2人</option>
                        <option value="3">3人</option>
                        <option value="4">4人</option>
                        <option value="5">5人</option>
                        <option value="6+">6人以上</option>
                    </select>
                </div>

                <!-- Complexity Range -->
                <div class="filter-group">
                    <label for="complexityRange">🧠 複雑度 (<span id="complexityValue">1.0 - 5.0</span>)</label>
                    <div class="range-slider">
                        <input type="range" id="complexityMin" min="1.0" max="5.0" step="0.1" value="1.0">
                        <input type="range" id="complexityMax" min="1.0" max="5.0" step="0.1" value="5.0">
                    </div>
                </div>

                <!-- BGG Rating Range -->
                <div class="filter-group">
                    <label for="ratingRange">⭐ BGG評価 (<span id="ratingValue">1.0 - 10.0</span>)</label>
                    <div class="range-slider">
                        <input type="range" id="ratingMin" min="1.0" max="10.0" step="0.1" value="1.0">
                        <input type="range" id="ratingMax" min="1.0" max="10.0" step="0.1" value="10.0">
                    </div>
                </div>

                <!-- Playtime -->
                <div class="filter-group">
                    <label for="playtime">⏱️ プレイ時間</label>
                    <select id="playtime">
                        <option value="">すべて</option>
                        <option value="short">短時間 (30分未満)</option>
                        <option value="medium">中時間 (30-90分)</option>
                        <option value="long">長時間 (90分以上)</option>
                    </select>
                </div>

                <!-- Categories -->
                <div class="filter-group">
                    <label>🎯 カテゴリー</label>
                    <div class="checkbox-group" id="categoryFilters">
                        <label><input type="checkbox" value="card-game"> カードゲーム</label>
                        <label><input type="checkbox" value="deck-building"> デッキ構築</label>
                        <label><input type="checkbox" value="strategy"> 戦略</label>
                        <label><input type="checkbox" value="cooperative"> 協力</label>
                        <label><input type="checkbox" value="area-control"> エリア制圧</label>
                    </div>
                </div>

                <!-- Ownership Status -->
                <div class="filter-group">
                    <label for="ownership">📦 所有状況</label>
                    <select id="ownership">
                        <option value="">すべて</option>
                        <option value="owned">所有済み</option>
                        <option value="not-owned">未所有</option>
                    </select>
                </div>

                <!-- BGA Availability -->
                <div class="filter-group">
                    <label for="bga">🌐 BGA対応</label>
                    <select id="bga">
                        <option value="">すべて</option>
                        <option value="available">対応済み</option>
                        <option value="not-available">未対応</option>
                    </select>
                </div>

                <!-- Actions -->
                <div class="filter-actions">
                    <button id="clearFilters" class="btn-secondary">🔄 リセット</button>
                    <button id="saveFilters" class="btn-primary">💾 保存</button>
                </div>
            </div>

            <!-- Results -->
            <div class="filter-results">
                <div class="results-summary">
                    <span id="resultCount">0</span> ゲーム見つかりました
                </div>
                <div id="gameResults" class="game-grid"></div>
            </div>
        `;

        // Insert filter at appropriate location
        const targetElement = document.querySelector('.md-main .md-content') || 
                            document.querySelector('main') || 
                            document.body;
        targetElement.insertBefore(filterContainer, targetElement.firstChild);
    }

    bindEvents() {
        // Toggle filter panel
        document.querySelector('.filter-toggle').addEventListener('click', () => {
            const panel = document.getElementById('filterPanel');
            panel.classList.toggle('expanded');
        });

        // Search input
        document.getElementById('searchInput').addEventListener('input', (e) => {
            this.filters.search = e.target.value.toLowerCase();
            this.applyFilters();
        });

        // Player count
        document.getElementById('playerCount').addEventListener('change', (e) => {
            this.filters.playerCount = e.target.value;
            this.applyFilters();
        });

        // Complexity range
        const complexityMin = document.getElementById('complexityMin');
        const complexityMax = document.getElementById('complexityMax');
        
        [complexityMin, complexityMax].forEach(slider => {
            slider.addEventListener('input', () => {
                const min = parseFloat(complexityMin.value);
                const max = parseFloat(complexityMax.value);
                
                if (min <= max) {
                    this.filters.complexity = { min, max };
                    document.getElementById('complexityValue').textContent = `${min} - ${max}`;
                    this.applyFilters();
                }
            });
        });

        // BGG Rating range
        const ratingMin = document.getElementById('ratingMin');
        const ratingMax = document.getElementById('ratingMax');
        
        [ratingMin, ratingMax].forEach(slider => {
            slider.addEventListener('input', () => {
                const min = parseFloat(ratingMin.value);
                const max = parseFloat(ratingMax.value);
                
                if (min <= max) {
                    this.filters.bggRating = { min, max };
                    document.getElementById('ratingValue').textContent = `${min} - ${max}`;
                    this.applyFilters();
                }
            });
        });

        // Playtime
        document.getElementById('playtime').addEventListener('change', (e) => {
            this.filters.playtime = e.target.value;
            this.applyFilters();
        });

        // Categories
        document.querySelectorAll('#categoryFilters input[type="checkbox"]').forEach(checkbox => {
            checkbox.addEventListener('change', () => {
                this.filters.categories = Array.from(
                    document.querySelectorAll('#categoryFilters input:checked')
                ).map(cb => cb.value);
                this.applyFilters();
            });
        });

        // Ownership
        document.getElementById('ownership').addEventListener('change', (e) => {
            this.filters.ownership = e.target.value;
            this.applyFilters();
        });

        // BGA
        document.getElementById('bga').addEventListener('change', (e) => {
            this.filters.bga = e.target.value;
            this.applyFilters();
        });

        // Clear filters
        document.getElementById('clearFilters').addEventListener('click', () => {
            this.clearAllFilters();
        });

        // Save filters (to localStorage)
        document.getElementById('saveFilters').addEventListener('click', () => {
            this.saveFiltersToStorage();
        });

        // Load saved filters on init
        this.loadFiltersFromStorage();
    }

    applyFilters() {
        this.filteredGames = this.games.filter(game => {
            // Search filter
            if (this.filters.search && 
                !game.title.toLowerCase().includes(this.filters.search) &&
                !(game.japanese_title || '').toLowerCase().includes(this.filters.search)) {
                return false;
            }

            // Player count filter
            if (this.filters.playerCount) {
                if (this.filters.playerCount === '6+') {
                    // Check if game supports 6+ players
                    const maxPlayers = this.extractMaxPlayers(game.players);
                    if (maxPlayers < 6) return false;
                } else {
                    // Check if specific player count is supported
                    if (!this.supportsPlayerCount(game.players, parseInt(this.filters.playerCount))) {
                        return false;
                    }
                }
            }

            // Complexity filter
            const complexity = parseFloat(game.complexity) || 2.5;
            if (complexity < this.filters.complexity.min || complexity > this.filters.complexity.max) {
                return false;
            }

            // BGG Rating filter
            const rating = parseFloat(game.bgg_rating) || 0;
            if (rating < this.filters.bggRating.min || rating > this.filters.bggRating.max) {
                return false;
            }

            // Playtime filter
            if (this.filters.playtime) {
                if (!this.matchesPlaytime(game.playtime, this.filters.playtime)) {
                    return false;
                }
            }

            // Category filter
            if (this.filters.categories.length > 0) {
                const gameTags = game.tags || [];
                if (!this.filters.categories.some(cat => gameTags.includes(cat))) {
                    return false;
                }
            }

            // Ownership filter
            if (this.filters.ownership) {
                const isOwned = game.ownership === true;
                if ((this.filters.ownership === 'owned' && !isOwned) ||
                    (this.filters.ownership === 'not-owned' && isOwned)) {
                    return false;
                }
            }

            // BGA filter
            if (this.filters.bga) {
                const bgaAvailable = game.bga_available === true;
                if ((this.filters.bga === 'available' && !bgaAvailable) ||
                    (this.filters.bga === 'not-available' && bgaAvailable)) {
                    return false;
                }
            }

            return true;
        });

        this.updateDisplay();
        this.updateURL();
    }

    extractMaxPlayers(playersString) {
        const match = playersString.match(/(\d+)-(\d+)/);
        if (match) {
            return parseInt(match[2]);
        }
        const singleMatch = playersString.match(/(\d+)/);
        return singleMatch ? parseInt(singleMatch[1]) : 4;
    }

    supportsPlayerCount(playersString, targetCount) {
        const match = playersString.match(/(\d+)-(\d+)/);
        if (match) {
            const min = parseInt(match[1]);
            const max = parseInt(match[2]);
            return targetCount >= min && targetCount <= max;
        }
        const singleMatch = playersString.match(/(\d+)/);
        return singleMatch ? parseInt(singleMatch[1]) === targetCount : false;
    }

    matchesPlaytime(playtimeString, filter) {
        const minutes = this.extractPlaytimeMinutes(playtimeString);
        
        switch (filter) {
            case 'short': return minutes < 30;
            case 'medium': return minutes >= 30 && minutes <= 90;
            case 'long': return minutes > 90;
            default: return true;
        }
    }

    extractPlaytimeMinutes(playtimeString) {
        const match = playtimeString.match(/(\d+)/);
        return match ? parseInt(match[1]) : 60; // Default to 60 minutes
    }

    updateDisplay() {
        const resultCount = document.getElementById('resultCount');
        const gameResults = document.getElementById('gameResults');
        
        resultCount.textContent = this.filteredGames.length;
        
        if (this.filteredGames.length === 0) {
            gameResults.innerHTML = '<div class="no-results">該当するゲームが見つかりませんでした 😔</div>';
            return;
        }

        const gameCards = this.filteredGames.map(game => `
            <div class="game-card" data-bgg-id="${game.bgg_id || ''}">
                <div class="game-header">
                    <h4><a href="${game.url || '#'}">${game.title}</a></h4>
                    ${game.japanese_title ? `<p class="japanese-title">${game.japanese_title}</p>` : ''}
                </div>
                <div class="game-meta">
                    <span class="players">👥 ${game.players}</span>
                    <span class="complexity">🧠 ${game.complexity}</span>
                    <span class="playtime">⏱️ ${game.playtime}</span>
                    ${game.bgg_rating ? `<span class="rating">⭐ ${game.bgg_rating}</span>` : ''}
                </div>
                <div class="game-tags">
                    ${(game.tags || []).map(tag => `<span class="tag">${tag}</span>`).join('')}
                </div>
                <div class="game-status">
                    ${game.ownership ? '<span class="owned">📦 所有済み</span>' : ''}
                    ${game.bga_available ? '<span class="bga">🌐 BGA対応</span>' : ''}
                </div>
            </div>
        `).join('');

        gameResults.innerHTML = gameCards;
    }

    clearAllFilters() {
        this.filters = {
            playerCount: null,
            complexity: { min: 1.0, max: 5.0 },
            playtime: null,
            bggRating: { min: 1.0, max: 10.0 },
            categories: [],
            ownership: null,
            bga: null,
            search: ''
        };

        // Reset UI elements
        document.getElementById('searchInput').value = '';
        document.getElementById('playerCount').value = '';
        document.getElementById('playtime').value = '';
        document.getElementById('ownership').value = '';
        document.getElementById('bga').value = '';
        
        document.getElementById('complexityMin').value = '1.0';
        document.getElementById('complexityMax').value = '5.0';
        document.getElementById('complexityValue').textContent = '1.0 - 5.0';
        
        document.getElementById('ratingMin').value = '1.0';
        document.getElementById('ratingMax').value = '10.0';
        document.getElementById('ratingValue').textContent = '1.0 - 10.0';

        document.querySelectorAll('#categoryFilters input[type="checkbox"]').forEach(cb => {
            cb.checked = false;
        });

        this.applyFilters();
    }

    saveFiltersToStorage() {
        localStorage.setItem('boardgamelist-filters', JSON.stringify(this.filters));
        this.showNotification('フィルター設定を保存しました 💾');
    }

    loadFiltersFromStorage() {
        const saved = localStorage.getItem('boardgamelist-filters');
        if (saved) {
            try {
                const filters = JSON.parse(saved);
                this.filters = { ...this.filters, ...filters };
                this.applyFiltersToUI();
                this.applyFilters();
            } catch (error) {
                console.warn('Could not load saved filters:', error);
            }
        }
    }

    applyFiltersToUI() {
        // Update UI elements to match loaded filters
        document.getElementById('searchInput').value = this.filters.search || '';
        document.getElementById('playerCount').value = this.filters.playerCount || '';
        document.getElementById('playtime').value = this.filters.playtime || '';
        document.getElementById('ownership').value = this.filters.ownership || '';
        document.getElementById('bga').value = this.filters.bga || '';

        // Update range sliders
        document.getElementById('complexityMin').value = this.filters.complexity.min;
        document.getElementById('complexityMax').value = this.filters.complexity.max;
        document.getElementById('complexityValue').textContent = 
            `${this.filters.complexity.min} - ${this.filters.complexity.max}`;

        document.getElementById('ratingMin').value = this.filters.bggRating.min;
        document.getElementById('ratingMax').value = this.filters.bggRating.max;
        document.getElementById('ratingValue').textContent = 
            `${this.filters.bggRating.min} - ${this.filters.bggRating.max}`;

        // Update checkboxes
        this.filters.categories.forEach(category => {
            const checkbox = document.querySelector(`#categoryFilters input[value="${category}"]`);
            if (checkbox) checkbox.checked = true;
        });
    }

    updateURL() {
        // Update URL parameters to reflect current filters (for sharing/bookmarking)
        const params = new URLSearchParams();
        
        Object.entries(this.filters).forEach(([key, value]) => {
            if (value && value !== '' && 
                !(Array.isArray(value) && value.length === 0) &&
                !(typeof value === 'object' && value.min === 1.0 && value.max === 5.0)) {
                
                if (typeof value === 'object' && !Array.isArray(value)) {
                    params.set(key, `${value.min}-${value.max}`);
                } else if (Array.isArray(value)) {
                    params.set(key, value.join(','));
                } else {
                    params.set(key, value);
                }
            }
        });

        const newURL = params.toString() ? `${window.location.pathname}?${params.toString()}` : window.location.pathname;
        window.history.replaceState({}, '', newURL);
    }

    showNotification(message) {
        const notification = document.createElement('div');
        notification.className = 'filter-notification';
        notification.textContent = message;
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.classList.add('show');
        }, 100);
        
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    if (window.location.pathname.includes('/games/') || 
        window.location.pathname.includes('/categories/')) {
        new GameFilter();
    }
});

// Export for use in other modules
window.GameFilter = GameFilter;