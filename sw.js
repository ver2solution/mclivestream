/* v60 service worker — PWA shell cache only. Version bump = new cache.
   FIX (05/11): js/data.js is now NETWORK-FIRST. data.js is content data
   (articles/models/shops) that changes on almost every deploy; the old
   cache-first rule served a stale data.js from before v29, so article
   links fell back to the original source URLs instead of the internal
   bai-viet pages. The CACHE name must be bumped on EVERY web deploy
   that changes data.js/app.js/v20.css. v55: danh-sach-shop.html + v20.css
   doi (them muc "Lo hang xa kho" o khu vuc top trang shop: 13 muc tu
   bao cao nghien cuu 06/11/2026, khong doi data.js/app.js).
   v117: P1-1 tao 3 trang danh-sach-lo/xuong/kiot.html + them vao sitemap
   (sua 3 URL 404); P1-2 them game/three.core.js (Three.js r186) + CSS
   .online-popup cho game/nong-trai.html; GĐ4 tab Viet bai (js/admin.js)
   + sua pheu dang ky (js/app.js/js/auth-ui.js) da co trong prep.
   v118: chuyen domain sang vieclamlivestream.online (them CNAME + doi
   link tuyet doi ver2solution.github.io/mclivestream -> https://
   vieclamlivestream.online + site.config.json origin/basePath).
   v120: rut gon 2 popup noi thanh o vuong 96px (.online-popup v20.css +
   .game-entry inline 99 file HTML) — doi v20.css + HTML, khong doi data.js.
   v121: ghi chu admin cho tai khoan (notes) — doi js/admin.js (badge
   test + o Ghi chu o chi tiet tai khoan) + mclivestream-supabase.js
   (PROTECTED_FIELDS them notes); khong doi data.js.
   v122: he thong viet bai chuan CMS — editor rich text + kho media rieng
   (js/article-editor.js, js/article-media.js, js/seo-keywords.js) +
   publisher nhan body HTML (tools/publish-article-drafts.mjs); doi
   js/admin.js + quan-tri.html; them SQL bucket article-media (chua chay). */
const CACHE = 'v190-shell-1'; /* v190: P1 funnel shop — redirect sau dang ky theo loai TK (shop → danh-sach-mau.html#ho-so-shop, mau → trang-cua-toi.html) */
const SHELL = ['v20.css', 'js/data.js', 'js/app.js', 'js/themes.js', 'icon-192.png', 'icon-512.png',
  'images/partners/google-icon.png', 'images/partners/meta-icon.png', 'images/partners/tiktok-icon.png',
  'images/partners/thaco-icon.png', 'images/partners/tpbank-icon.png', 'images/partners/coccoc-icon.png',
  'images/partners/dem-kim-cuong-icon.png', 'images/partners/flamingo-icon.png',
  'images/partners/bao-kinh-te-do-thi-icon.png',
  'images/partners/cocoon-icon.png', 'images/partners/co-mem-homelab-icon.png',
  'images/partners/sao-thai-duong-icon.png', 'images/partners/thorakao-icon.png',
  'images/partners/moi-icon.png', 'images/partners/lemonade-icon.png',
  'images/partners/emmie-icon.png', 'images/partners/ofelia-icon.png',
  'images/partners/lagumi-icon.png', 'images/partners/vedette-icon.png',
  'images/partners/coolmate-icon.png', 'images/partners/canifa-icon.png',
  'images/partners/ivy-moda-icon.png', 'images/partners/yody-icon.png',
  'images/partners/juno-icon.png', 'images/partners/vascara-icon.png',
  'images/partners/ssstutter-icon.png', 'images/partners/routine-icon.png',
  'images/partners/degrey-icon.png', 'images/partners/couple-tx-icon.png'];
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
    // v111: CHI dua vao cache khi response.ok — khong cache ban loi 404/500
    // (v110: js/faq-ask.js 404 bi ket trong cache v110-shell-1, tai lai cung
    // khong het). Giu nguyen network-first cho data.js.
    e.respondWith(fetch(e.request).then((res) => {
      if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(e.request, copy)); }
      return res;
    }).catch(() => caches.match(e.request)));
    return;
  }
  // v111: cache-first cho tai nguyen NHUNG chi cache khi response.ok.
  // Loi 404/500 khong duoc dua vao cache (xem ghi chu o tren).
  e.respondWith(caches.match(e.request).then((hit) => hit || fetch(e.request).then((res) => {
    if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(e.request, copy)); }
    return res;
  }).catch(() => hit)));
});
