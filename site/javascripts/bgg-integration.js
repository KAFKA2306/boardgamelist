/**
 * BoardGameGeek Integration for BoardGameList
 * Fetches game ratings and metadata from BGG API
 */

class BGGIntegration {
    constructor() {
        this.baseURL = 'https://boardgamegeek.com/xmlapi2';
        this.cache = new Map();
        this.cacheDuration = 24 * 60 * 60 * 1000; // 24 hours
        this.batchSize = 10; // Process games in batches
        this.requestQueue = [];
        this.processing = false;
        this.rateLimitDelay = 1000; // 1 second between requests
        this.initServiceWorker();
    }

    /**
     * Fetch game data from BGG API with caching
     */
    async fetchGameData(gameId) {
        // Check cache first
        const cacheKey = `bgg_${gameId}`;
        const cached = this.cache.get(cacheKey);
        
        if (cached && (Date.now() - cached.timestamp) < this.cacheDuration) {
            return cached.data;
        }

        try {
            const response = await fetch(`${this.baseURL}/thing?id=${gameId}&stats=1`);
            const xmlText = await response.text();
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(xmlText, 'text/xml');
            
            const gameData = this.parseGameXML(xmlDoc);
            
            // Cache the result
            this.cache.set(cacheKey, {
                data: gameData,
                timestamp: Date.now()
            });
            
            return gameData;
        } catch (error) {
            console.error(`Error fetching BGG data for game ${gameId}:`, error);
            return null;
        }
    }

    /**
     * Parse BGG XML response into structured data
     */
    parseGameXML(xmlDoc) {
        const item = xmlDoc.querySelector('item');
        if (!item) return null;

        const getName = (primary = true) => {
            const names = item.querySelectorAll('name');
            const primaryName = Array.from(names).find(n => n.getAttribute('type') === 'primary');
            return primaryName ? primaryName.getAttribute('value') : names[0]?.getAttribute('value');
        };

        const getStats = () => {
            const ratings = item.querySelector('statistics ratings');
            if (!ratings) return {};

            return {
                rating: parseFloat(ratings.querySelector('average')?.getAttribute('value') || 0),
                weight: parseFloat(ratings.querySelector('averageweight')?.getAttribute('value') || 0),
                numRatings: parseInt(ratings.querySelector('usersrated')?.getAttribute('value') || 0),
                rank: parseInt(ratings.querySelector('rank[name="boardgame"]')?.getAttribute('value') || 0)
            };
        };

        return {
            id: item.getAttribute('id'),
            name: getName(),
            year: item.querySelector('yearpublished')?.getAttribute('value'),
            minPlayers: item.querySelector('minplayers')?.getAttribute('value'),
            maxPlayers: item.querySelector('maxplayers')?.getAttribute('value'),
            playingTime: item.querySelector('playingtime')?.getAttribute('value'),
            minPlayingTime: item.querySelector('minplaytime')?.getAttribute('value'),
            maxPlayingTime: item.querySelector('maxplaytime')?.getAttribute('value'),
            age: item.querySelector('minage')?.getAttribute('value'),
            description: item.querySelector('description')?.textContent,
            ...getStats()
        };
    }

    /**
     * Initialize service worker for offline caching
     */
    async initServiceWorker() {
        if ('serviceWorker' in navigator) {
            try {
                const registration = await navigator.serviceWorker.register('/boardgamelist/sw.js');
                console.log('Service Worker registered:', registration);
            } catch (error) {
                console.log('Service Worker registration failed:', error);
            }
        }
    }

    /**
     * Add request to batch queue
     */
    queueRequest(gameId, element) {
        this.requestQueue.push({ gameId, element });
        if (!this.processing) {
            this.processBatch();
        }
    }

    /**
     * Process requests in batches with rate limiting
     */
    async processBatch() {
        if (this.processing || this.requestQueue.length === 0) return;
        
        this.processing = true;
        
        while (this.requestQueue.length > 0) {
            const batch = this.requestQueue.splice(0, this.batchSize);
            const promises = batch.map(async ({ gameId, element }) => {
                try {
                    const gameData = await this.fetchGameData(gameId);
                    if (gameData) {
                        this.updateGameElement(element, gameData);
                    }
                } catch (error) {
                    console.error(`Error updating game ${gameId}:`, error);
                    // Fallback to cached data or show error state
                    this.handleError(element, gameId, error);
                }
            });

            await Promise.all(promises);
            
            // Rate limiting delay between batches
            if (this.requestQueue.length > 0) {
                await new Promise(resolve => setTimeout(resolve, this.rateLimitDelay));
            }
        }
        
        this.processing = false;
    }

    /**
     * Handle API errors gracefully
     */
    handleError(element, gameId, error) {
        // Try to get cached data from localStorage as fallback
        const fallbackData = this.getFallbackData(gameId);
        if (fallbackData) {
            this.updateGameElement(element, fallbackData);
            return;
        }

        // Show error state
        element.classList.add('bgg-error');
        const errorElement = element.querySelector('.bgg-error-message');
        if (errorElement) {
            errorElement.textContent = 'BGG data unavailable';
        }
    }

    /**
     * Get fallback data from localStorage or YAML frontmatter
     */
    getFallbackData(gameId) {
        try {
            const fallback = localStorage.getItem(`bgg_fallback_${gameId}`);
            return fallback ? JSON.parse(fallback) : null;
        } catch (error) {
            return null;
        }
    }

    /**
     * Update game rating displays on page with batch processing
     */
    async updateGameRatings() {
        const gameElements = document.querySelectorAll('[data-bgg-id]');
        
        // Add all elements to batch queue
        gameElements.forEach(element => {
            const gameId = element.getAttribute('data-bgg-id');
            if (gameId) {
                this.queueRequest(gameId, element);
            }
        });
    }

    /**
     * Update DOM element with BGG data
     */
    updateGameElement(element, gameData) {
        // Update rating
        const ratingElement = element.querySelector('.bgg-rating');
        if (ratingElement && gameData.rating) {
            ratingElement.textContent = gameData.rating.toFixed(1);
            ratingElement.classList.add('loaded');
        }

        // Update rank
        const rankElement = element.querySelector('.bgg-rank');
        if (rankElement && gameData.rank && gameData.rank > 0) {
            rankElement.textContent = `#${gameData.rank}`;
            rankElement.classList.add('loaded');
        }

        // Update player count if not already set
        const playersElement = element.querySelector('.bgg-players');
        if (playersElement && gameData.minPlayers && gameData.maxPlayers) {
            const playerRange = gameData.minPlayers === gameData.maxPlayers 
                ? gameData.minPlayers 
                : `${gameData.minPlayers}-${gameData.maxPlayers}`;
            playersElement.textContent = playerRange;
            playersElement.classList.add('loaded');
        }

        // Update weight/complexity
        const weightElement = element.querySelector('.bgg-weight');
        if (weightElement && gameData.weight) {
            weightElement.textContent = gameData.weight.toFixed(1);
            weightElement.classList.add('loaded');
        }

        // Add loaded class to main element
        element.classList.add('bgg-loaded');
    }

    /**
     * Create BGG link element
     */
    createBGGLink(gameId, text = 'View on BGG') {
        const link = document.createElement('a');
        link.href = `https://boardgamegeek.com/boardgame/${gameId}`;
        link.textContent = text;
        link.classList.add('bgg-link');
        link.setAttribute('target', '_blank');
        link.setAttribute('rel', 'noopener noreferrer');
        return link;
    }

    /**
     * Initialize BGG integration when DOM is ready
     */
    init() {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                this.updateGameRatings();
            });
        } else {
            this.updateGameRatings();
        }
    }
}

// Initialize BGG Integration
const bggIntegration = new BGGIntegration();
bggIntegration.init();

// Export for use in other scripts
window.BGGIntegration = BGGIntegration;