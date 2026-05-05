const CACHE_NAME = 'fp-cache-v2';
const PRECACHE = [
  '/Futbol-player-gestor-de-ligas/icon-192.png',
  '/Futbol-player-gestor-de-ligas/icon-512.png'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME)
      .then(c => c.addAll(PRECACHE))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  // Nunca cachear el HTML principal — siempre ir a red
  if (url.pathname.endsWith('.html') || url.pathname.endsWith('/')) {
    e.respondWith(fetch(e.request).catch(() => caches.match(e.request)));
    return;
  }
  // Para el resto (iconos), cache-first
  e.respondWith(
    caches.match(e.request).then(r => r || fetch(e.request))
  );
});
