/**
 * Service Worker for BoardGameList
 * Provides offline caching for BGG data and site resources
 */

const CACHE_NAME = 'boardgamelist-v1';
const BGG_CACHE_NAME = 'bgg-data-v1';
const OFFLINE_URL = '/boardgamelist/offline.html';

// Resources to cache on install
const STATIC_CACHE_URLS = [
    '/boardgamelist/',
    '/boardgamelist/index.html',
    '/boardgamelist/stylesheets/extra.css',
    '/boardgamelist/stylesheets/game-filter.css',
    '/boardgamelist/javascripts/extra.js',
    '/boardgamelist/javascripts/bgg-integration.js',
    '/boardgamelist/javascripts/game-filter.js'
];

// Install event - cache static resources
self.addEventListener('install', event => {
    console.log('Service Worker installing...');
    
    event.waitUntil(
        Promise.all([
            caches.open(CACHE_NAME).then(cache => {
                return cache.addAll(STATIC_CACHE_URLS);
            }),
            caches.open(BGG_CACHE_NAME) // Create BGG cache
        ]).then(() => {
            console.log('Service Worker installed and caches created');
            self.skipWaiting();
        })
    );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
    console.log('Service Worker activating...');
    
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName !== CACHE_NAME && cacheName !== BGG_CACHE_NAME) {
                        console.log('Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => {
            console.log('Service Worker activated');
            return self.clients.claim();
        })
    );
});

// Fetch event - handle requests with caching strategy
self.addEventListener('fetch', event => {
    const request = event.request;
    const url = new URL(request.url);

    // Handle BGG API requests
    if (url.hostname === 'boardgamegeek.com' && url.pathname.includes('/xmlapi2/')) {
        event.respondWith(handleBGGRequest(request));
        return;
    }

    // Handle site resources
    if (url.pathname.startsWith('/boardgamelist/')) {
        event.respondWith(handleSiteRequest(request));
        return;
    }
});

/**
 * Handle BGG API requests with cache-first strategy
 */
async function handleBGGRequest(request) {
    const cache = await caches.open(BGG_CACHE_NAME);
    
    try {
        // Try cache first
        const cachedResponse = await cache.match(request);
        if (cachedResponse) {
            const cacheTime = cachedResponse.headers.get('sw-cache-time');
            const age = Date.now() - parseInt(cacheTime || '0');
            
            // Use cached data if less than 24 hours old
            if (age < 24 * 60 * 60 * 1000) {
                console.log('Serving BGG data from cache:', request.url);
                return cachedResponse;
            }
        }

        // Fetch fresh data
        console.log('Fetching fresh BGG data:', request.url);
        const response = await fetch(request);
        
        if (response.ok) {
            // Clone response and add timestamp header
            const responseToCache = response.clone();
            const headers = new Headers(responseToCache.headers);
            headers.set('sw-cache-time', Date.now().toString());
            
            const cachedResponse = new Response(responseToCache.body, {
                status: responseToCache.status,
                statusText: responseToCache.statusText,
                headers: headers
            });
            
            // Cache the response
            await cache.put(request, cachedResponse);
        }
        
        return response;
    } catch (error) {
        console.log('BGG request failed, trying cache:', error);
        
        // Return cached data if available, even if expired
        const cachedResponse = await cache.match(request);
        if (cachedResponse) {
            return cachedResponse;
        }
        
        // Return error response
        return new Response(JSON.stringify({ error: 'BGG data unavailable' }), {
            status: 503,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

/**
 * Handle site requests with network-first strategy
 */
async function handleSiteRequest(request) {
    const cache = await caches.open(CACHE_NAME);
    
    try {
        // Try network first for HTML pages
        if (request.destination === 'document') {
            const response = await fetch(request);
            
            if (response.ok) {
                // Cache successful responses
                await cache.put(request, response.clone());
            }
            
            return response;
        }
        
        // For other resources, try cache first
        const cachedResponse = await cache.match(request);
        if (cachedResponse) {
            return cachedResponse;
        }
        
        // Fallback to network
        const response = await fetch(request);
        if (response.ok) {
            await cache.put(request, response.clone());
        }
        
        return response;
    } catch (error) {
        console.log('Network request failed, trying cache:', error);
        
        // Try cache for any request type
        const cachedResponse = await cache.match(request);
        if (cachedResponse) {
            return cachedResponse;
        }
        
        // Return offline page for document requests
        if (request.destination === 'document') {
            const offlineResponse = await cache.match(OFFLINE_URL);
            if (offlineResponse) {
                return offlineResponse;
            }
        }
        
        // Return generic error response
        return new Response('Resource unavailable offline', {
            status: 503,
            headers: { 'Content-Type': 'text/plain' }
        });
    }
}

// Background sync for BGG data updates
self.addEventListener('sync', event => {
    if (event.tag === 'bgg-update') {
        event.waitUntil(updateBGGData());
    }
});

/**
 * Update BGG data in background
 */
async function updateBGGData() {
    console.log('Background sync: Updating BGG data');
    
    try {
        // Get list of game IDs that need updating
        const gameIds = await getGameIdsForUpdate();
        
        // Fetch fresh data for each game
        for (const gameId of gameIds) {
            const url = `https://boardgamegeek.com/xmlapi2/thing?id=${gameId}&stats=1`;
            try {
                await handleBGGRequest(new Request(url));
                await new Promise(resolve => setTimeout(resolve, 1000)); // Rate limiting
            } catch (error) {
                console.error(`Failed to update BGG data for game ${gameId}:`, error);
            }
        }
        
        console.log('Background BGG update completed');
    } catch (error) {
        console.error('Background sync failed:', error);
    }
}

/**
 * Get list of game IDs that need updating
 */
async function getGameIdsForUpdate() {
    // This would typically come from IndexedDB or localStorage
    // For now, return a hardcoded list of known game IDs
    return [
        '11',      // Bohnanza
        '133473',  // Fort  
        '254432',  // Fixer
        '372896',  // HackClad
        '304188',  // Istanbul Choose & Write
        '236457'   // National Economy Mesena
    ];
}

// Message handling for manual cache updates
self.addEventListener('message', event => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
    
    if (event.data && event.data.type === 'UPDATE_BGG_CACHE') {
        event.waitUntil(updateBGGData());
    }
});

// Error handling
self.addEventListener('error', event => {
    console.error('Service Worker error:', event.error);
});

self.addEventListener('unhandledrejection', event => {
    console.error('Service Worker unhandled rejection:', event.reason);
});

console.log('Service Worker script loaded');