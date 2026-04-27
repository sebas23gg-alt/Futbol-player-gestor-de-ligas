// Versión de la caché. Súbela cada vez que cambies este archivo
// para que los navegadores limpien la versión vieja.
const CACHE = 'foreros-fc-v3';

// Recursos que cacheamos al instalar (solo los locales, no Firebase)
const ARCHIVOS_ESTATICOS = [
  './foreros_futbol.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

// ─── Instalación ───
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(cache =>
      // addAll falla si UNA petición falla, así que lo hacemos individualmente
      Promise.allSettled(
        ARCHIVOS_ESTATICOS.map(url =>
          cache.add(url).catch(() => null) // ignorar fallos individuales
        )
      )
    )
  );
  self.skipWaiting();
});

// ─── Activación: limpiar cachés antiguas ───
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// ─── Fetch ───
self.addEventListener('fetch', e => {
  const req = e.request;

  // 1) Solo gestionamos peticiones GET. POST/PUT/DELETE pasan directo a la red.
  //    (Esto evita los errores "Cache.put: Request method 'POST' is unsupported")
  if (req.method !== 'GET') return;

  // 2) Solo cacheamos peticiones del propio origen (GitHub Pages).
  //    Las peticiones a Firebase, Google, gstatic, etc., pasan directo a la red sin tocar la caché.
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // 3) Estrategia para el HTML principal: network-first.
  //    Pedimos siempre primero a la red; si falla (offline), usamos lo cacheado.
  //    Así, cuando subes una versión nueva al repo, los usuarios la ven al instante.
  const esHTML =
    req.mode === 'navigate' ||
    req.destination === 'document' ||
    url.pathname.endsWith('.html');

  if (esHTML) {
    e.respondWith(
      fetch(req)
        .then(resp => {
          // Guardar copia para uso offline
          if (resp && resp.ok) {
            const clone = resp.clone();
            caches.open(CACHE).then(cache => cache.put(req, clone)).catch(() => {});
          }
          return resp;
        })
        .catch(() => caches.match(req).then(c => c || Response.error()))
    );
    return;
  }

  // 4) Para el resto (iconos, manifest, etc.): cache-first.
  //    Servimos lo cacheado si lo hay; si no, vamos a la red y lo cacheamos.
  e.respondWith(
    caches.match(req).then(cached => {
      if (cached) return cached;
      return fetch(req).then(resp => {
        if (resp && resp.ok) {
          const clone = resp.clone();
          caches.open(CACHE).then(cache => cache.put(req, clone)).catch(() => {});
        }
        return resp;
      });
    })
  );
});
