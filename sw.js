const STATIC_CACHE = 'static-v2';
const IMAGES_CACHE = 'images-v1';

const APP_SHELL = [
  '/',
  '/styles.css',
  '/script.js',
  '/favicon.svg',
  '/logo.png',
  '/images/newyear.jpg',
  '/images/valentines.jpg',
  '/images/raceday.jpg',
  '/images/tech.jpg',
  '/images/office.jpg',
  '/images/balloons.jpg'
];

const MAX_USER_IMAGES = 20;

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== STATIC_CACHE && key !== IMAGES_CACHE)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Skip /og-image endpoint (server-only for social crawlers)
  if (url.pathname.startsWith('/og-image')) return;

  // Navigation requests: network-first, fall back to cached index.html
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const clone = response.clone();
          caches.open(STATIC_CACHE).then((cache) => cache.put('/', clone));
          return response;
        })
        .catch(() => caches.match('/'))
    );
    return;
  }

  // Same-origin code assets (HTML, CSS, JS): network-first so updates load immediately
  if (url.origin === self.location.origin && /\.(css|js|html)$/.test(url.pathname)) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const clone = response.clone();
          caches.open(STATIC_CACHE).then((cache) => cache.put(event.request, clone));
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // Same-origin images: cache-first (rarely change)
  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.match(event.request).then((cached) => cached || fetch(event.request))
    );
    return;
  }

  // External images (user background images via bgimg): network-first with cache fallback
  if (event.request.destination === 'image') {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const clone = response.clone();
          caches.open(IMAGES_CACHE).then((cache) => {
            cache.put(event.request, clone);
            // FIFO eviction: cap at MAX_USER_IMAGES entries
            cache.keys().then((keys) => {
              if (keys.length > MAX_USER_IMAGES) {
                cache.delete(keys[0]);
              }
            });
          });
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }
});
