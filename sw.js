/* v39 service worker — PWA shell cache only. Version bump = new cache.
   FIX (05/11): js/data.js is now NETWORK-FIRST. data.js is content data
   (articles/models/shops) that changes on almost every deploy; the old
   cache-first rule served a stale data.js from before v29, so article
   links fell back to the original source URLs instead of the internal
   bai-viet pages. The CACHE name must be bumped on EVERY web deploy
   that changes data.js/app.js/v20.css. */
const CACHE = 'v39-shell-1';
const SHELL = ['v20.css', 'js/data.js', 'js/app.js', 'icon-192.png', 'icon-512.png'];
self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;
  if (e.request.mode === 'navigate' || url.pathname.endsWith('.html')) {
    e.respondWith(fetch(e.request).catch(() => caches.match(e.request)));
    return;
  }
  if (url.pathname.endsWith('js/data.js')) {
    // Content data: always fresh from network; cache only as offline fallback.
    e.respondWith(fetch(e.request).then((res) => {
      const copy = res.clone(); caches.open(CACHE).then((c) => c.put(e.request, copy)); return res;
    }).catch(() => caches.match(e.request)));
    return;
  }
  e.respondWith(caches.match(e.request).then((hit) => hit || fetch(e.request).then((res) => {
    const copy = res.clone(); caches.open(CACHE).then((c) => c.put(e.request, copy)); return res;
  }).catch(() => hit)));
});
