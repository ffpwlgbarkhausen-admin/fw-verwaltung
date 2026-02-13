const CACHE_NAME = 'fw-pro-v1';
const ASSETS = [
  './',
  './index.html',
  './script.js',
  'https://cdn.tailwindcss.com'
];

// Installieren & Dateien in den Cache legen
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
});

// Cache-First Strategie: Erst im Cache suchen, dann im Netz
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});
