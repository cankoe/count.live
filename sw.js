const STATIC_CACHE = 'static-v3';
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

// Stale-while-revalidate: serve the cached copy instantly (for a fast paint)
// while refreshing it from the network in the background, so the next load
// gets fresh content. Falls back to the network when nothing is cached, and to
// the cache when the network fails (offline). Only 200s are cached.
function staleWhileRevalidate(event, cacheName, cacheKey) {
  const key = cacheKey || event.request;
  return caches.open(cacheName).then(async (cache) => {
    const cached = await cache.match(key);
    const fromNetwork = fetch(event.request)
      .then((response) => {
        if (response && response.status === 200) {
          cache.put(key, response.clone());
        }
        return response;
      })
      .catch(() => null);
    if (cached) {
      // Serve cache now; keep the SW alive until the background refresh lands.
      event.waitUntil(fromNetwork);
      return cached;
    }
    return (await fromNetwork) || cache.match(key);
  });
}

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Skip /og-image endpoint (server-only for social crawlers)
  if (url.pathname.startsWith('/og-image')) return;

  // Navigations: serve the cached app shell instantly and refresh in the
  // background. The SPA renders from the query string on every load and init()
  // resets the body classes client-side, so a single shared shell is fine.
  // This is the big win — repeat/background-tab desktop visits no longer block
  // on the network before first paint.
  if (event.request.mode === 'navigate') {
    event.respondWith(staleWhileRevalidate(event, STATIC_CACHE, '/'));
    return;
  }

  // Same-origin code assets (HTML, CSS, JS): stale-while-revalidate too, so the
  // render-blocking CSS/JS also come from cache instantly; the refreshed copy
  // is picked up on the next load (bump STATIC_CACHE to force-update sooner).
  if (url.origin === self.location.origin && /\.(css|js|html)$/.test(url.pathname)) {
    event.respondWith(staleWhileRevalidate(event, STATIC_CACHE));
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
