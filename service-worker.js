// service-worker.js
const CACHE_NAME = 'quadern-camp-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/styles.css',
  '/supabase-client.js',
  '/auth.js',
  '/app.js',
  '/logo-nlasl.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(urlsToCache))
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => response || fetch(event.request))
  );
});
