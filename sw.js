const CACHE_NAME = 'ye-calc-v1';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './splash.jpg',
  './background.jpg'
];

// Install: cache all essential assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        return Promise.allSettled(
          ASSETS.map(url => cache.add(url).catch(err => {
            console.warn('Failed to cache:', url, err.message);
          }))
        );
      })
      .then(() => self.skipWaiting())
  );
});

// Activate: clean old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch: cache-first with network fallback
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  if (!event.request.url.startsWith('http')) return;

  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;

      return fetch(event.request).then(response => {
        // Only cache successful, same-origin or opaque responses
        if (!response || response.status !== 200) return response;
        const respClone = response.clone();
        caches.open(CACHE_NAME).then(cache => {
          cache.put(event.request, respClone).catch(() => {});
        });
        return response;
      }).catch(() => {
        // If offline and request is for HTML, return cached index
        if (event.request.headers.get('accept')?.includes('text/html')) {
          return caches.match('./index.html');
        }
        return new Response('Offline', { status: 503, statusText: 'Offline' });
      });
    })
  );
});