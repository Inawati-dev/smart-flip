/* SMART-FLIP 5.0 — Service Worker
   Cache-first strategy untuk assets statis
*/
const CACHE = 'smartflip-v1';
const PRECACHE = [
  '/smart-flipbook/',
  '/smart-flipbook/index.html',
  '/smart-flipbook/style.css',
  '/smart-flipbook/modules-data.js',
  '/smart-flipbook/data-layer.js',
  '/smart-flipbook/script.js',
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(PRECACHE))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  // Jangan cache Supabase API atau CDN scripts
  if (e.request.url.includes('supabase') || e.request.url.includes('cdn')) return;

  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(res => {
        if (!res || res.status !== 200) return res;
        const clone = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, clone));
        return res;
      }).catch(() => cached);
    })
  );
});
