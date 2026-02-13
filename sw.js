const CACHE_NAME = 'fw-pro-v1';
const ASSETS = [
  './',
  './index.html',
  './script.js',
  'https://cdn.tailwindcss.com'
];

// 1. Installation mit Einzelfall-Prüfung
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('SW: Cache wird befüllt...');
      // Wir fügen die Dateien einzeln hinzu, damit ein Fehler bei einer Datei 
      // (z.B. Tailwind) nicht den ganzen Prozess stoppt.
      return Promise.allSettled(
        ASSETS.map(url => cache.add(url).catch(err => console.log(`SW: Cache-Fehler bei ${url}`, err)))
      );
    })
  );
  self.skipWaiting();
});

// 2. Aktivierung (Alte Caches aufräumen)
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
      );
    })
  );
});

// 3. Intelligente Cache-Strategie
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      // Wenn im Cache: Sofort zurückgeben
      if (cachedResponse) return cachedResponse;

      // Wenn nicht im Cache: Aus dem Netz laden
      return fetch(event.request).then((networkResponse) => {
        // Optionale Logik: Hier könnte man neue Anfragen dynamisch in den Cache legen
        return networkResponse;
      }).catch(() => {
        // Notfall: Wenn offline und nicht im Cache
        console.log('SW: Gerät ist offline und Ressource nicht im Cache');
      });
    })
  );
});
