self.addEventListener('fetch', function(event) {
  // Dieser Service Worker tut momentan nichts, 
  // ist aber nötig, damit die App installierbar wird.
  event.respondWith(fetch(event.request));
});
