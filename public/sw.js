const VERSION = 'v1';
const STATIC_CACHE = `xracing-static-${VERSION}`;
const RUNTIME_CACHE = `xracing-runtime-${VERSION}`;

const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/live.html',
  '/analytics.html',
  '/kpis.html',
  '/tables.html',
  '/user-timeline.html',
  '/screen-analysis.html',
  '/web-analytics.html',
  '/css/styles.css',
  '/js/shared.js',
  '/js/home.js',
  '/js/live.js',
  '/js/analytics.js',
  '/js/kpis.js',
  '/js/tables.js',
  '/js/user-timeline.js',
  '/js/screen-analysis.js',
  '/js/web-analytics.js',
  '/favicon.svg',
  '/favicon.ico',
  '/apple-touch-icon.png',
  '/logo_red.svg',
  '/manifest.webmanifest'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll(PRECACHE_URLS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => k !== STATIC_CACHE && k !== RUNTIME_CACHE).map((k) => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirst(request));
    return;
  }

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((res) => {
          const copy = res.clone();
          caches.open(RUNTIME_CACHE).then((c) => c.put(request, copy));
          return res;
        })
        .catch(() => caches.match(request).then((r) => r || caches.match('/index.html')))
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((res) => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(RUNTIME_CACHE).then((c) => c.put(request, copy));
        }
        return res;
      });
    })
  );
});

function networkFirst(request) {
  return fetch(request)
    .then((res) => {
      if (res.ok) {
        const copy = res.clone();
        caches.open(RUNTIME_CACHE).then((c) => c.put(request, copy));
      }
      return res;
    })
    .catch(() => caches.match(request));
}
