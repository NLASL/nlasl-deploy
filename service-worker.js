// ============================================================
// SERVICE WORKER - Mode Offline
// Quadern de Camp NLASL
// ============================================================

const CACHE_NAME = 'nlasl-quadern-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/styles.css',
  '/app.js',
  '/auth.js',
  '/supabase-client.js',
  '/manifest.json',
  '/logo-nlasl.png'
];

// Instal·lació del Service Worker
self.addEventListener('install', (event) => {
  console.log('Service Worker: Instal·lant...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Service Worker: Cacheant fitxers');
        return cache.addAll(urlsToCache);
      })
      .then(() => self.skipWaiting())
  );
});

// Activació del Service Worker
self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activant...');
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Service Worker: Eliminant cache antiga:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Intercepció de peticions
self.addEventListener('fetch', (event) => {
  // Només cachear peticions GET
  if (event.request.method !== 'GET') return;
  
  // No cachear peticions a Supabase (sempre online)
  if (event.request.url.includes('supabase.co')) {
    return;
  }
  
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Si està al cache, retornar-ho
        if (response) {
          return response;
        }
        
        // Si no, fer petició a la xarxa
        return fetch(event.request)
          .then((response) => {
            // Comprovar si és una resposta vàlida
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }
            
            // Clonar la resposta
            const responseToCache = response.clone();
            
            // Afegir al cache
            caches.open(CACHE_NAME)
              .then((cache) => {
                cache.put(event.request, responseToCache);
              });
            
            return response;
          })
          .catch(() => {
            // Si falla la xarxa, mostrar pàgina offline (opcional)
            console.log('Service Worker: Sense connexió');
          });
      })
  );
});

console.log('✅ Service Worker carregat');