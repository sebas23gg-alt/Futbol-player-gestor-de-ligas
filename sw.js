const CACHE = 'foreros-fc-v2';
const ARCHIVOS = [
  './foreros_futbol.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

// Instalación: cachear archivos principales
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(cache =>
      cache.addAll(ARCHIVOS.filter(f => !f.endsWith('.png'))) // los iconos pueden faltar
    ).catch(() => {})
  );
  self.skipWaiting();
});

// Activación: limpiar cachés antiguas
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch: cache-first para el HTML, network-first para el resto
self.addEventListener('fetch', e => {
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(response => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE).then(cache => cache.put(e.request, clone));
        }
        return response;
      }).catch(() => cached);
    })
  );
});
