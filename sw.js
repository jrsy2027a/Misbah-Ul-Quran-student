/* Misbah-ul-Quran — service worker
   Bump CACHE version whenever you update the app so users get the new build. */
const CACHE = 'misbah-v9';

const SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icon-192.png',
  './icon-512.png',
  './icon-maskable-512.png',
  './apple-touch-icon.png'
];

// Install: pre-cache the app shell
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting())
  );
});

// Activate: clear old caches
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Fetch: cache-first for shell, runtime-cache for fonts, offline fallback
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;

  // Quran API + audio CDN: always go to network (never cache/intercept)
  const u = new URL(req.url);
  if (u.host.includes('alquran.cloud') || u.host.includes('islamic.network')) return;

  e.respondWith(
    caches.match(req).then((hit) => {
      if (hit) return hit;
      return fetch(req).then((res) => {
        const url = new URL(req.url);
        const sameOrigin = url.origin === self.location.origin;
        const isFont = url.host.includes('fonts.googleapis.com') || url.host.includes('fonts.gstatic.com');
        if ((sameOrigin || isFont) && res && res.status === 200) {
          const clone = res.clone();
          caches.open(CACHE).then((c) => c.put(req, clone));
        }
        return res;
      }).catch(() => {
        // offline fallback: return the app shell for navigations
        if (req.mode === 'navigate') return caches.match('./index.html');
      });
    })
  );
});
