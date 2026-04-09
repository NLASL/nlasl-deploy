// ============================================================
// SERVICE WORKER - PWA i Mode Offline
// Quadern de Camp NLASL
// ============================================================

// VERSIÓ - Incrementar aquest número per forçar actualització
const VERSION = 'v96';
const CACHE_NAME = 'quadern-camp-nlasl-' + VERSION;

// Fitxers a cachear
const ASSETS_TO_CACHE = [
    '/',
    '/index.html',
    '/supabase-client.v5.js',
    '/auth.v3.js',
    '/app.v8.js',
    '/styles.css',
    '/manifest.json',
    '/logo-nlasl.png'
];

// Instal·lació
self.addEventListener('install', function(event) {
    console.log('Service Worker: Instal·lant...');
    
    event.waitUntil(
        caches.open(CACHE_NAME).then(function(cache) {
            console.log('Service Worker: Cacheant fitxers');
            return cache.addAll(ASSETS_TO_CACHE);
        }).then(function() {
            // Forçar activació immediata
            return self.skipWaiting();
        })
    );
});

// Activació
self.addEventListener('activate', function(event) {
    console.log('Service Worker: Activant...');
    
    event.waitUntil(
        caches.keys().then(function(cacheNames) {
            return Promise.all(
                cacheNames.map(function(cacheName) {
                    // Esborrar caches antigues
                    if (cacheName !== CACHE_NAME) {
                        console.log('Service Worker: Esborrant cache antiga:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(function() {
            // Forçar control immediat de tots els clients
            return self.clients.claim();
        })
    );
});

// Fetch - Estratègia Network First (sempre intenta xarxa primer)
self.addEventListener('fetch', function(event) {
    const url = new URL(event.request.url);
    
    // No cachear crides a Supabase
    if (url.hostname.includes('supabase.co')) {
        return;
    }
    
    event.respondWith(
        fetch(event.request)
            .then(function(response) {
                // Si la resposta és vàlida, actualitzar cache
                if (response && response.status === 200) {
                    const responseClone = response.clone();
                    caches.open(CACHE_NAME).then(function(cache) {
                        cache.put(event.request, responseClone);
                    });
                }
                return response;
            })
            .catch(function() {
                // Si falla la xarxa, intentar cache
                return caches.match(event.request).then(function(response) {
                    if (response) {
                        return response;
                    }
                    // Si no hi ha cache, retornar error
                    return new Response('Sense connexió i no hi ha cache disponible', {
                        status: 503,
                        statusText: 'Service Unavailable'
                    });
                });
            })
    );
});

// Missatge per forçar actualització des de l'app
self.addEventListener('message', function(event) {
    if (event.data === 'skipWaiting') {
        self.skipWaiting();
    }
});

console.log('✅ Service Worker carregat - Versió:', VERSION);
