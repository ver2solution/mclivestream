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
   link tuyet doi tu goc GitHub Pages cu -> https://
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
const CACHE = 'v403-sidebar-1'; /* v403 (24/11/2026): Sidebar tom tat cong viec ben phai tab Trao doi — quan-tri.html + js/admin.js + v20.css (v20.css nam trong SHELL). */ /* v402 (23/11/2026): Contact Gate V5-01a — E-189. */ /* v402 (23/11/2026): Contact Gate V5-01a — E-189: js/app.js gatedContactsHTML/fetchItemContacts goi RPC get_item_contacts, strip truong contacts khoi js/data.js. */ /* v391 (22/11/2026): Form 'Viet bai' P1 — cap 50000 + admArtMsg2 + setArtMsg (rebase tu v389, doi so vi v390 da live). */ /* v390 (22/11/2026): Sua loi dang ky/dang nhap + UX theo audit 13:40 — P1-1 (2 nut "Dang nhap" sang dung trang), P2-1 (guard auth-ui.js), P2-2 (hero CTA ?type=model), P2-4 ("2 phut" -> "5 phut"), P2-6 (bo dang-ky/dang-nhap khoi sitemap), P2-8 (an hero CTA khi da dang nhap). */ /* v383 (21/11/2026): TK-01 — tim kiem rong hien dong huong dan 'Nhap tu khoa de tim kiem...' thay vi de trong dong dem (js/search.js renderMeta; fix v369 chua len live vi v381 la fix khac, rebase + doi so len v383). /* v382-drafts (20/11/2026): Deploy v382-drafts — 1 bai viet tu ban thao (Mixue 117.500 ty, Phan tich). v381 (20/11/2026): Khoa tam nut 'Cap quyen admin' — chi Owner (UID tk chu) thay nut (js/admin.js OWNER_UID/isOwner + guard onGrantAdmin; RPC van cho V5-02 siet server). v380-drafts (20/11/2026): Deploy v380-drafts — 1 bai viet tu ban thao (La Chapelle 4550 ty Double 11, Xu huong). v378 (20/11/2026): B-20261120-06 — sua van ban huong dan ghi luat cu, trai v355 (binh luan cong xu ngay khi gui; xoa 'binh luan da duyet' con sot). v377 (20/11/2026): B-20261120-04 — form hồ sơ shop hết trống ~10s (danh-sach-mau.html defer data.js/app.js/ticker.js). DOI SO tu v376 vi v376-shell-1 da bi v376-drafts dung (20/11/2026, 15:08). v376-drafts (20/11/2026): Deploy v376-drafts — 1 bai viet tu ban thao (Black Friday 2026, Livestream).  /* v375 (20/11/2026): B-20261120-03 — 'Lưu tên/tiểu sử' kiểm res.data, hết báo thành công giả (nguoi-dung.html saveUsername + bio save). v374 (20/11/2026): B-20261120-09 — gửi bình luận xong tải lại danh sách ngay (js/comments.js refreshList sau submit OK). v373 (20/11/2026): B-20261120-05 — avatar trong /cong-dong/chat thành link tới hồ sơ (js/chat-page.js avatarHtml + v20.css .chat-avatar-link). v372 (20/11/2026): B-20261120-08 — URL trong tin nhan chat thanh link bam duoc (js/chat-page.js + js/community-chat.js linkifyText, target=_blank rel=noopener). DOI SO tu v371 vi v371-shell-1 da bi v371-drafts dung (20/11/2026, 11:39). v371-drafts (20/11/2026): Deploy v371-drafts — 1 bai viet tu ban thao (Douyin siet nguoi ao Cao Dich, Livestream). v370 (20/11/2026): B-20261120-02 — "Xem tai nguon" (#comment-<id>) tu mo khu binh luan + cuon toi + to sang binh luan (js/comments.js scrollToCommentHash + auto-open o initCardComments, v20.css .v2s-comment-target). DOI SO tu v369 vi v369-shell-1 da bi v369-drafts dung (20/11/2026). v369-drafts (20/11/2026): Deploy v369-drafts — 1 bai viet tu ban thao (Quyen Leo Daily 75 ty, Phan tich). v368 (20/11/2026): Sua nhan nut mau "Xem bai goc tren Facebook" -> "Xem bai goc" (trung tinh, khong ghi nen tang) — link nguon cua mot so mau la TikTok (th-60 Ha My tiktok.com/@miemie_90, Bong vi @vivipham03022000), nhan cu khong khop dich den; nhan shop "Xem bai tuyen goc tren Facebook" GIU NGUYEN (nguon shop la bai tuyen Facebook). v367 (20/11/2026): CỔNG "XEM BÀI GỐC" — link nguồn mờ + "Đăng Nhập" khi chưa đăng nhập (js/app.js originGateHTML/applyOriginGate + v20.css .origin-gate; SĐT/link MXH đã ẩn sẵn bởi gatedContactsHTML). v364 (19/11/2026): CHAT-01 (P2) — trang chat dung RPC theo phong (list_chat_rooms + get_chat_messages + post_chat_message tra loi/idempotency + xoa tin minh + bao cao + chan; link ten/avatar -> ho so; link Top -> /bang-xep-hang) + CSS trich dan/nut hanh dong/thanh tra loi. v363 (19/11/2026): BXH-01/02/03 — trang Bang xep hang day du /bang-xep-hang (RPC get_full_leaderboard, trang + link index.html + CSS .lb-* + sitemap) + dong bo Top trang chu sang xep TONG-truoc (Q1). v361 (19/11/2026): Sua 2 loi phat hien o kiem live v360 — (1) safeNext o dang-nhap.html loai bo moi ?next= bat dau '/' nen dang nhap tu trang chat roi ve index.html thay vi ve chat; (2) header trang chat ket nut "Dang Nhap" khi da dang nhap vi V20HeaderRefresh (js/app.js) khong co tren trang chat — dong bo chip tai khoan thu cong trong js/chat-page.js (ten + xu qua reward.js). v360 (19/11/2026): Trang chat cong dong day du /cong-dong/chat (V4 PR-04, lenh Owner 16:27) — cong-dong/chat.html + js/chat-page.js + CSS trang chat + 404.html duong dan tuyet doi. v359 (19/11/2026): Hang Bot cho khach gon lai, nen xanh la, chu trang (lenh anh Tho 16:21; v20.css .bot-topics-lock xanh + an lop chip mo, :has() bo vo trang khi hien hang khach). v358 (19/11/2026): Muc Tin moi trang chu 2 cot x 6 bai -> 4 hang x 4 o = 16 tin moi nhat (lenh anh Tho 16:10; js/app.js slice 0,6->0,16 + v20.css #lo-trinh .news-list 4 cot). v356 (19/11/2026): Hang chon chu de Bot tom tat tin tren top muc chat cong dong (lenh anh Tho 14:10) — khach thay hang mo + nut Dang nhap, da dang nhap thay 7 chip chu de + Luu / Tat tom tat (js/bot-topics.js, dung chung v2s_bot_prefs + API window.V2SChatBots cua v325); index.html + v20.css. v355 (19/11/2026): Bo cho duyet binh luan (lenh anh Tho 13:45) — binh luan hien ngay + cong diem ngay luc gui (migration submit_comment 'approved' + credit); tu khoa nhay cam/lua dao/chui bay hien *** o hien thi (js/comments.js SENSITIVE_WORDS + js/community-chat.js maskChatText), admin chi con nut Xoa (js/admin.js + quan-tri.html). v354 (19/11/2026): Bot chat Cong dong 5 giay -> 15 giay/tin (js/chat-bots.js BOT_INTERVAL_MS, lenh anh Tho 13:45). v353 (19/11/2026): M-02 — trang ho so member-only nguoi-dung.html + lich su tuong tac (RPC get_my_interactions, neo #chat-msg- o js/community-chat.js + #comment- o js/comments.js) + M-01/M-01b migration. v345 (18/11/2026): 4 hang x 6 cot — danh sach mau 12->24/trang (js/app.js) + danh sach Kiot 12->24 (thanh-ly-kiot.html) + sua FAQ '12 ho so' thanh '24 ho so' (index.html). v344 (18/11/2026): L4 — guard 'khong co gi thay doi' o trang-cua-toi.html so sanh TOAN BO payload (chuan hoa null/''/undefined, trim chuoi, mang theo noi dung) thay vi chi 3 truong; phat trien nhu v342 code, doi so CACHE vi v342-shell-1 da bi v342-drafts dung. v343 (18/11/2026): P1-2/P1-3 — tach muc phu khoi trang danh sach (1 trang, 1 muc hien thi; hang tin xuong duoi danh sach; disclaimer gom 1 lan/trang; noi 6 control Lo/Xuong + dem option) + MC-108. v342-drafts (18/11/2026): Deploy v342-drafts — 1 bai viet tu ban thao (mat na mat LANBENA 715 trieu, Hang hoa). v342-code (L4, sua guard "khong co gi thay doi") nam tren nhanh rieng, chua deploy. v341 (18/11/2026): sua goc v340 — recordBotTop dung .then() thay .catch() (PostgrestBuilder chi co .then, .catch khong ton tai nen RPC khong chay, so Top dung yen); nhan Bot trong Top hien '🤖 Bot' thay 'Thanh vien'. v340 (18/11/2026): Top tuong tac TOP-01 — bot len Top tam (bot_top_counts + RPC record_bot_message + get_home_chat_top cong tong tin chat tu 5h + binh luan luy ke, reset 5h, uu tien User > Test > Bot); tieu de Top 'hom nay' + ghi chu moi + muc luat choi o Trang cua toi. v339 (18/11/2026): bo loc avatar o 8 muc moi (newObjCount/renderNewObjSections/newObjCardHTML) — 10 ho so moi v338 khong co anh (cm-25, em-23/24, lg-23/25/26, rt-23, le-12/13, ag-13) nay duoc dem + render voi logo.png tam, so hien thi khop data.js (23/25/24/26/22/14/13/15, lech nhau, khong tron). v338 (18/11/2026): them 43 ho so moi (9 shop, 7 xuong, 3 kiot, 5 logistics, 3 chuyen nha, 2 thiet bi, 4 agency, 2 lop live, 4 lop makeup, 3 su kien, 1 cho thue) — so lieu lech nhau, khong tron (shop 299, xuong 407, kiot 363, lop live 23, makeup 25, su kien 24, logistics 26, cho thue 22, chuyen nha 14, thiet bi 13, agency 15). v337 (18/11/2026): tin chat neo lên ĐẦU, trôi xuống (bỏ margin-top:auto v334); Top 10 người, người thật trước Bot sau. v336 (18/11/2026): khung chat cao dung bang cot NGOAI CUNG BEN PHAI (.cf-hl) — chi cot do lam moc, khong keo Top vao (sua v335 lay max). v335 (18/11/2026): khung chat cao bang cot phai CAO NHAT. v327 (18/11/2026, anh Thọ báo 00:51: khung nhap phai o day khung chat + noi dung chat phai dai ra ket khung): GOC LOI v325 — .chat-input margin-top:auto hut HET khoang trong truoc flex-grow nen .chat-list (flex:1) khong lon duoc, chi cao theo noi dung (~300px) roi de lai khoang trong lon giua tin nhan va o nhap; con CSS cu (truoc v325, margin-top:16px) thi o nhap nam ngay duoi danh sach ngan, de trong phia duoi. FIX: bo margin-top:auto o .chat-input + bo max-height:420px o .chat-list (them min-height:200px) — list flex:1 lon het chieu cao cot, o nhap nam sat day duoi list. Goi doi v20.css. v326 da live 00:37 (commit 044cbca). */
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
