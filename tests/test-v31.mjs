/* v31 tests — Node only, no browser. v29 article suite (17 full articles) + v31 empty-state / feedback / h1 / nav-doc fixes:
   (user request 2026-11-05 ~16:02, reinforced ~16:04: every article must
   have an illustration + full SEO, no article without image or SEO):
   (1) all 17 new articles in data.js have page + img + takeaway; exactly
       3 have imgSelf:true (self-made infographics), the other 14 do not.
   (2) every new page file exists and contains: <title> with the data.js
       title, meta description, canonical = page URL, og:type article,
       og:title/description/image/url, article:published_time + author,
       twitter:card summary_large_image + title/description/image,
       JSON-LD NewsArticle, h1 = data.js title, hero img, the takeaway
       callout, the source link (href = original url, link text = source
       name) + the "viết lại ... không sao chép nguyên văn" line, and the
       standard signature block.
   (3) og:image is reachable: external http(s) URLs were verified HTTP 200
       at write time (see report); local infographic PNGs exist under
       images/bai-viet/ and are valid PNG 1200x630 (magic bytes + IHDR).
   (4) data.js img == og:image in the page file; data.js takeaway ==
       takeaway text in the page file (whitespace-normalized).
   (5) sitemap.xml has 27 urls: the 7 old ones + all 17 new pages + the 3 v34 pages, no
       duplicates.
   (6) articleLink/articleHref return the internal page (no target=_blank)
       for all 49 paged articles (17 new + 2 v23 + 3 v34 + 2 v40 demos).
   (7) initNews render (DOM stub): the news list shows the internal link
       for all 17; imgSelf articles render the "Infographic: Ver2Solution
       tự làm..." caption (never "Ảnh gốc: <source>"), the other 14 render
       "Ảnh gốc: <source> — không phải ảnh của Ver2Solution."; every paged
       article renders its "Theo Ver2Solution:" line.
   The v20–v28 suites still run.
   v31 additions:
   (12) shop detail page: every shop in data.js has a unique id
       sh-01..sh-30 (data otherwise identical to v30 except v34 adds sh-25..sh-30); chi-tiet-shop.html
       exists with static h1, full SEO, Dành cho Shop nav active, Supabase
       scripts before js/data.js; shopCardHTML links the shop name and adds
       a "Xem chi tiết →" link AFTER the Facebook source link (v37: actions moved to the end of the card so margin-top:auto pins them to the bottom);
       initShopDetail renders the full shop detail (logo, name, province —
       district, product, salary, req, channels, date, contacts, Facebook
       source link, update/remove note) + max 6 other shops; sitemap
       unchanged (detail pages use ?id=, not listed).
   (8) danh-sach-shop.html: no user-visible text contains the table names
       "shop_profiles"/"shop_job_posts" (JS property access like
       j.shop_profiles.shop_name is code, not displayed text, and is
       excluded); the approved-shops section has a heading + static
       empty-state; the approved-jobs empty-state, the friendly loaded
       status text, the friendly no-API text and the new initial status
       text are present; the old "Đã kết nối bảng shop thật" status is gone.
   (9) ho-so.html has a static <h1>Hồ sơ mẫu livestream</h1>.
   (10) index.html and ho-so.html load the Supabase client + config +
       mclivestream-supabase.js before js/data.js (so the feedback form
       handler can save for real via McLivestreamAPI.submitFeedback).
   (11) v20.css defines .empty-state. */
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let pass = 0, fail = 0;
function t(name, cond, extra = '') { if (cond) { pass++; console.log('PASS v31:', name); } else { fail++; console.log('FAIL v31:', name, extra); } }
const ogOf = (img) => img.replace(/\.[a-z0-9]+$/i, '-og.jpg'); // v76: og:image la ban 1200x630 JPEG cua data.js img
function norm(s) { return String(s || '').replace(/\s+/g, ' ').trim(); }

const sb = { window: {}, module: { exports: {} }, console, URLSearchParams };
vm.createContext(sb);
vm.runInContext(fs.readFileSync(path.join(root, 'js/data.js'), 'utf8'), sb);
vm.runInContext(fs.readFileSync(path.join(root, 'js/app.js'), 'utf8'), sb);
const V = sb.window.V20;
const D = sb.window.V20_DATA;

const NEW_SLUGS = ['gen-z-gen-y-tang-chi-tieu-cuoi-nam', 'nguoi-tieu-dung-bot-san-sale', 'ban-da-kenh-mo-dau-ra-hang-viet', 'livestream-cung-kol-mo-dau-ra', 'bi-thu-phuong-livestream-ban-tom-cua-hau', 'het-thoi-ban-hang-online-vo-danh', 'canh-bao-lua-dao-livestream-ngoc-trai', 'tiktok-shop-thu-hep-khoang-cach-shopee', 'hang-viet-len-livestream-my-trung-quoc', 'phi-san-tang-thang-05-2026', 'livestream-ban-hang-my-tang-gan-50-phan-tram', 'ai-lam-thay-phan-tim-hang', 'hang-da-qua-su-dung-len-ngoi-toan-cau', 'tiktok-shop-tien-toi-100-ty-usd', 'le-11-11-trung-quoc-ban-goi-ai-qua-livestream', 'nguoi-tieu-dung-2026-vua-thoai-mai-vua-that', 'mua-le-2026-my-dien-thoai-chiem-gan-3-4'];
const INFOGRAPHIC = new Set(['ai-lam-thay-phan-tim-hang', 'le-11-11-trung-quoc-ban-goi-ai-qua-livestream', 'nguoi-tieu-dung-2026-vua-thoai-mai-vua-that']);
const BASE = 'https://ver2solution.github.io/mclivestream/';

t('50 articles total', D.articles.length === 50, 'got ' + D.articles.length);
const news = D.articles.filter(a => a.page && a.page.startsWith('bai-viet/'));
t('49 paged articles (17 new + 2 v23 + 3 v34 + 2 v40 demos)', news.length === 49, 'got ' + news.length);
const fresh = NEW_SLUGS.map(s => D.articles.find(a => a.page === 'bai-viet/' + s + '.html'));
t('all 17 new slugs found in data.js', fresh.every(Boolean));
t('no duplicate page values', new Set(D.articles.map(a => a.page).filter(Boolean)).size === D.articles.map(a => a.page).filter(Boolean).length);

const pages = {};
for (const a of fresh) {
  const slug = a.page.replace('bai-viet/', '').replace('.html', '');
  const p = path.join(root, a.page);
  t('page file exists: ' + slug, fs.existsSync(p));
  if (!fs.existsSync(p)) continue;
  const s = fs.readFileSync(p, 'utf8');
  pages[slug] = s;
  t('h1 == data.js title: ' + slug, norm((s.match(/<h1 itemprop="headline">(.*?)<\/h1>/s) || ['', ''])[1]) === a.title);
  t('title tag has data.js title: ' + slug, s.includes('<title>' + a.title + ' — Ver2Solution</title>'));
  t('meta description present: ' + slug, /<meta name="description" content="[^"]{20,}">/.test(s));
  t('canonical == page URL: ' + slug, s.includes('<link rel="canonical" href="' + BASE + a.page + '">'));
  for (const tag of ['og:type" content="article"', 'og:site_name', 'og:title', 'og:description', 'og:image', 'og:url', 'article:published_time', 'article:author', 'twitter:card" content="summary_large_image"', 'twitter:title', 'twitter:description', 'twitter:image', 'application/ld+json']) {
    t(tag + ' present: ' + slug, s.includes(tag));
  }
  t('og:url == page URL: ' + slug, s.includes('<meta property="og:url" content="' + BASE + a.page + '">'));
  const og = (s.match(/<meta property="og:image" content="([^"]+)">/) || [])[1] || '';
  t('og:image == ban 1200x630 cua data.js img (v76): ' + slug, og === ogOf(a.img), 'og=' + og + ' img=' + a.img);
  t('twitter:image == og:image: ' + slug, s.includes('<meta name="twitter:image" content="' + og + '">'));
  if (INFOGRAPHIC.has(slug)) {
    t('imgSelf true + local JPEG 1200x630 og:image (v76): ' + slug, a.imgSelf === true && og === BASE + 'images/bai-viet/' + slug + '-og.jpg');
    const png = path.join(root, 'images/bai-viet/' + slug + '.png');
    const buf = fs.existsSync(png) ? fs.readFileSync(png) : Buffer.alloc(0);
    const isPng = buf.length > 24 && buf.slice(0, 8).equals(Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]));
    const w = isPng ? buf.readUInt32BE(16) : 0, h = isPng ? buf.readUInt32BE(20) : 0;
    t('infographic PNG exists 1200x630: ' + slug, isPng && w === 1200 && h === 630, w + 'x' + h);
    t('hero img uses local PNG: ' + slug, s.includes('src="../images/bai-viet/' + slug + '.png"'));
  } else {
    t('no imgSelf flag: ' + slug, !a.imgSelf);
    t('og:image is local (v69: photo downloaded from source): ' + slug, og.startsWith(BASE + 'images/bai-viet/'), 'og=' + og);
  }
  const tw = (s.match(/<b>Theo Ver2Solution:<\/b>\s*([\s\S]*?)<\/div>/) || [])[1] || '';
  t('takeaway callout present: ' + slug, tw.length > 50);
  t('data.js takeaway == page takeaway: ' + slug, norm(tw.replace(/<[^>]+>/g, '')) === norm(a.takeaway));
  t('source link href == original url: ' + slug, s.includes('href="' + a.url + '"'));
  t('source name is the link text: ' + slug, s.includes('<b>' + V.esc(a.source) + '</b>'));
  t('"không sao chép nguyên văn" line: ' + slug, s.includes('không sao chép nguyên văn.'));
  t('standard signature block: ' + slug, s.includes('Ver2Solution.com</b> — Kênh cập nhật tin tức thị trường và xu hướng kinh doanh online') && s.includes('032 998 3699 (Zalo)'));
  t('share links use page URL: ' + slug, s.includes(encodeURIComponent(BASE + a.page).replace(/%2F/g, '%2F')));
  t('published_time == data.js date: ' + slug, s.includes('article:published_time" content="' + a.date + '"'));
}

// ---- (5) sitemap ----
const sm = fs.readFileSync(path.join(root, 'sitemap.xml'), 'utf8');
const locs = [...sm.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1]);
t('sitemap has 64 urls (v40: +2 demo pages; v48: +1 dat-lai-mat-khau; v68: +1 dang-nhap; v71: +5 bai moi; v76: giu 42; v77: +4 trang AdSense; v85: +1 dang-ky; v86: +1 thanh-ly-kiot — chi-tiet-shop/ho-so/trang-cua-toi/vi-tien-ao khong vao sitemap theo chinh sach v20/v31)', locs.length === 64, 'got ' + locs.length);
t('sitemap has no duplicates', new Set(locs).size === locs.length);
for (const slug of NEW_SLUGS) t('sitemap has ' + slug, locs.includes(BASE + 'bai-viet/' + slug + '.html'));
for (const old of ['index.html', 'danh-sach-mau.html', 'danh-sach-shop.html', 'tin-tuc.html', 'bai-viet-bop-reach.html', 'bai-viet/xa-kho-thoi-trang-cuoi-nam.html', 'bai-viet/tiktok-shop-1111-tinh-loi.html']) t('sitemap keeps ' + old, locs.includes(BASE + old));

// ---- (6) articleLink / articleHref ----
for (const a of news) {
  t('articleLink internal: ' + (a.page || ''), V.articleLink(a) === '<a href="' + a.page + '">' + a.title + '</a>');
  t('articleHref == page: ' + (a.page || ''), V.articleHref(a) === a.page);
}
const bop = D.articles.find(a => a.url === 'bai-viet-bop-reach.html');
t('bop-reach still links via url (no page field)', !bop.page && V.articleLink(bop).includes('bai-viet-bop-reach.html'));
const demos = D.articles.filter(a => a.url === null && a.kind !== 'keyword');
t('2 demo articles now have full pages (v40: page/img/takeaway/date 2026-11-05, url still null)', demos.length === 2 && demos.every(a => a.page && a.img && a.takeaway && a.date === '2026-11-05' && a.url === null));

// ---- (7) initNews render with DOM stub ----
// app.js is wrapped in an IIFE, so initNews is not reachable on the vm
// global; instead capture the DOMContentLoaded handler the script registers
// (it calls initHome/initList/initNews/initDetail/initShops) and invoke it.
// getElementById returns null for everything except the news elements, so
// the other init* functions return early via their guards.
function el() { return { innerHTML: '', textContent: '', value: '', appendChild() {}, addEventListener() {} }; }
const els = { newsMain: el(), newsCat: el(), newsSort: el(), newsCount: el(), mostList: el() };
const handlers = {};
sb.document = { getElementById: id => els[id] || null, createElement: () => el(), addEventListener(type, fn) { handlers[type] = fn; } };
vm.runInContext(fs.readFileSync(path.join(root, 'js/app.js'), 'utf8'), sb);
t('DOMContentLoaded handler registered', typeof handlers['DOMContentLoaded'] === 'function');
handlers['DOMContentLoaded']();
const html = els.newsMain.innerHTML;
for (const a of fresh) {
  t('news list internal link: ' + a.page, html.includes('<a href="' + a.page + '">' + a.title + '</a>'));
  t('news list takeaway line: ' + a.page, html.includes('Theo Ver2Solution:</b> ' + V.esc(a.takeaway)));
  if (a.imgSelf) {
    t('news list infographic caption: ' + a.page, html.includes('Infographic: Ver2Solution tự làm từ số liệu bài gốc.'));
    t('news list never "Ảnh gốc: ' + a.source + '": ' + a.page, !html.includes('Ảnh gốc: ' + a.source));
  } else {
    t('news list photo credit: ' + a.page, html.includes('Ảnh gốc: ' + a.source + ' — không phải ảnh của Ver2Solution.'));
  }
}
t('news list has 50 news-items', (html.match(/class="news-item"/g) || []).length === 50, 'got ' + (html.match(/class="news-item"/g) || []).length);

// ---- (8)–(11) v31: approved empty states, static h1, Supabase scripts, .empty-state ----
const shopHtml = fs.readFileSync(path.join(root, 'danh-sach-shop.html'), 'utf8');
const hoSoHtml = fs.readFileSync(path.join(root, 'ho-so.html'), 'utf8');
const indexHtml = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const css = fs.readFileSync(path.join(root, 'v20.css'), 'utf8');

// (8a) no user-visible table names in danh-sach-shop.html. JS property access
// (j.shop_profiles.shop_name) is code, not displayed text — strip it first.
const shopNoCode = shopHtml.replace(/\.shop_profiles\b/g, '').replace(/\.shop_job_posts\b/g, '');
t('no user-visible "shop_profiles" in danh-sach-shop.html', !shopNoCode.includes('shop_profiles'));
t('no user-visible "shop_job_posts" in danh-sach-shop.html', !shopNoCode.includes('shop_job_posts'));
t('old technical status text gone', !shopHtml.includes('Đã kết nối bảng shop thật'));
t('approved-shops heading present', shopHtml.includes('<h2 id="shops-approved-title">Shop đã đăng ký hồ sơ trên sàn (đã duyệt)</h2>'));
t('static shops empty-state present', shopHtml.includes('Hiện chưa có shop nào đăng ký hồ sơ trên sàn được duyệt.'));
t('shops empty-state in JS else branch too', (shopHtml.match(/Hiện chưa có shop nào đăng ký hồ sơ trên sàn được duyệt\./g) || []).length === 2);
t('jobs empty-state present', shopHtml.includes('Shop đăng nhập rồi đăng tin tuyển mẫu ở <a href="#dang-tin">mục bên dưới</a>'));
t('friendly loaded status text present', shopHtml.includes('Shop đăng ký hồ sơ ở form bên dưới; đăng nhập để đăng tin tuyển mẫu. Hồ sơ và tin đã duyệt sẽ hiện ở mục này.'));
t('friendly no-API status text present', shopHtml.includes('Bạn vẫn xem được 30 tin tuyển công khai bên dưới; cần hỗ trợ thì nhắn Zalo 032 998 3699.'));
t('new initial status text present', shopHtml.includes('Đang tải danh sách shop đã duyệt…'));
t('jobs empty status kept', shopHtml.includes('Hiện chưa có tin tuyển mẫu nào đã duyệt.'));
t('.empty-state CSS defined', css.includes('.empty-state{'));

// (9) static h1 in ho-so.html
t('ho-so.html has static h1', hoSoHtml.includes('<h1>Hồ sơ mẫu livestream</h1>'));

// (10) Supabase scripts before js/data.js on index.html and ho-so.html
for (const [name, html] of [['index.html', indexHtml], ['ho-so.html', hoSoHtml]]) {
  t(name + ' loads supabase-js CDN', html.includes('<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>'));
  t(name + ' loads supabase-config.js', html.includes('<script src="supabase-config.js"></script>'));
  t(name + ' loads mclivestream-supabase.js', html.includes('<script src="mclivestream-supabase.js"></script>'));
  t(name + ' Supabase scripts come before js/data.js', html.indexOf('mclivestream-supabase.js') !== -1 && html.indexOf('mclivestream-supabase.js') < html.indexOf('js/data.js'));
}

// ---- (12) v31: shop detail page chi-tiet-shop.html + shop ids + card links ----
// (12a) every shop has a unique stable id sh-01..sh-30
const shopIds = D.shops.map(s => s.id);
t('30 shops total', D.shops.length === 30, 'got ' + D.shops.length);
t('every shop has a unique id', new Set(shopIds).size === 30 && shopIds.every(Boolean));
t('shop ids are sh-01..sh-30 in order', shopIds.every((id, i) => id === 'sh-' + String(i + 1).padStart(2, '0')));
t('shop ids do not collide with model ids', shopIds.every(id => !D.models.some(m => m.id === id)));

// (12e) shop data unchanged vs v30 except the added ids (compare against the
// v30-prep source on disk, field by field, excluding the new id key; v42 adds
// the shifts key derived from req — also excluded here, tested in test-v42).
const v30root = path.resolve(root, '..', 'mclivestream-final-v30-prep');
const sb30 = { window: {}, module: { exports: {} }, console };
vm.createContext(sb30);
vm.runInContext(fs.readFileSync(path.join(v30root, 'js/data.js'), 'utf8'), sb30);
const D30 = sb30.window.V20_DATA;
t('v30 source exists for comparison', Array.isArray(D30.shops) && D30.shops.length === 24);
// v34 adds 6 idol/game shops (sh-25..sh-30); first 24 must match v30 except the added id key + v42 shifts key.
let dataSame = D.shops.length === 30 && D30.shops.length === 24;
if (dataSame) {
  for (let i = 0; i < 24; i++) {
    const a = D.shops[i], b = D30.shops[i];
    const keysA = Object.keys(a), keysB = Object.keys(b);
    if (keysA.length !== keysB.length + 2 || !('id' in a) || !('shifts' in a) || !keysB.every(k => k in a)) { dataSame = false; break; }
    for (const k of keysB) { if (JSON.stringify(a[k]) !== JSON.stringify(b[k])) { dataSame = false; break; } }
    if (!dataSame) break;
  }
}
t('shop data: first 24 identical to v30 except added id + v42 shifts; v34 adds 6 idol/game shops', dataSame);
t('first shop still Chạm Loa, last still Mylan (order kept)', D.shops[0].name === 'Chạm Loa' && D.shops[23].name === 'Công ty TNHH Giấy Mylan');

// (12b) chi-tiet-shop.html exists, static h1, scripts, SEO, nav
const shopDetailHtml = fs.readFileSync(path.join(root, 'chi-tiet-shop.html'), 'utf8');
t('chi-tiet-shop.html exists', fs.existsSync(path.join(root, 'chi-tiet-shop.html')));
t('shop detail has static h1', shopDetailHtml.includes('<h1>Chi tiết shop tuyển mẫu</h1>'));
t('shop detail has #shopDetailRoot', shopDetailHtml.includes('id="shopDetailRoot"'));
t('shop detail has #otherShops', shopDetailHtml.includes('id="otherShops"'));
t('shop detail back link to danh-sach-shop.html', shopDetailHtml.includes('<a href="danh-sach-shop.html">← Về danh sách shop</a>'));
t('shop detail title tag', shopDetailHtml.includes('<title>Chi tiết shop tuyển mẫu — Sàn việc làm MC Livestream Ver2Solution</title>'));
t('shop detail canonical', shopDetailHtml.includes('<link rel="canonical" href="' + BASE + 'chi-tiet-shop.html">'));
t('shop detail og:url', shopDetailHtml.includes('<meta property="og:url" content="' + BASE + 'chi-tiet-shop.html">'));
t('shop detail nav Dành cho Shop active', shopDetailHtml.includes('<a href="danh-sach-shop.html" class="active">Dành cho Shop</a>'));
t('shop detail nav Dành cho Mẫu not active', !shopDetailHtml.includes('<a href="danh-sach-mau.html" class="active">'));
for (const tag of ['<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>', '<script src="supabase-config.js"></script>', '<script src="mclivestream-supabase.js"></script>', '<script src="js/app.js"></script>', '<script src="js/analytics.js"></script>']) {
  t('shop detail loads ' + tag.slice(13, 60), shopDetailHtml.includes(tag));
}
t('shop detail Supabase scripts before js/data.js', shopDetailHtml.indexOf('mclivestream-supabase.js') !== -1 && shopDetailHtml.indexOf('mclivestream-supabase.js') < shopDetailHtml.indexOf('js/data.js'));
t('shop detail has feedback fab + form', shopDetailHtml.includes('id="gopyFab"') && shopDetailHtml.includes('id="gopyForm"'));
t('sitemap unchanged (no chi-tiet-shop.html)', !locs.includes(BASE + 'chi-tiet-shop.html'));

// (12c) initShopDetail exists + shopCardHTML links to the detail page
t('initShopDetail exported on V20', typeof V.initShopDetail === 'function');
const card0 = V.shopCardHTML(D.shops[0]);
t('card links name to detail page', card0.includes('<a href="chi-tiet-shop.html?id=sh-01">Chạm Loa</a>'));
t('card has "Xem chi tiết →" link (v37: shortened label, <a class="btn btn-primary btn-sm" ...>)', card0.includes('<a class="btn btn-primary btn-sm" href="chi-tiet-shop.html?id=sh-01">Xem chi tiết →</a>'));
t('card detail link comes AFTER Facebook source link (v37: actions last)', card0.indexOf('Xem chi tiết →') !== -1 && card0.indexOf('Xem chi tiết →') > card0.indexOf('Bài tuyển gốc →'));
let allCardsLink = true;
for (const s of D.shops) { if (!V.shopCardHTML(s).includes('chi-tiet-shop.html?id=' + s.id)) { allCardsLink = false; break; } }
t('all 30 cards link to their detail page', allCardsLink);

// (12d) Facebook source link still present in card and detail, but not the only link
t('card still links Facebook source', card0.includes('Bài tuyển gốc →') && card0.includes('data-track="xem-bai-tuyen-goc"'));
t('card has 2+ distinct links', (card0.match(/<a /g) || []).length >= 2);

// (12c2) initShopDetail render via the same DOM-stub trick as (7): add the
// shop-detail elements to the stub, set location.search, re-invoke the
// registered DOMContentLoaded handler.
els.shopDetailRoot = el(); els.otherShops = el(); els.shopDetailTitle = el();
sb.location = { search: '?id=sh-05' };
handlers['DOMContentLoaded']();
const shopHtml2 = els.shopDetailRoot.innerHTML;
t('detail renders h1 = shop name only (v32: no province prefix) (?id=sh-05)', shopHtml2.includes('<h1>Phạm Hoàng Lâm</h1>'));
t('detail shows product', shopHtml2.includes('Thời trang nữ'));
t('detail shows salary', shopHtml2.includes('70.000đ - 100.000đ / giờ'));
t('detail shows district', shopHtml2.includes('Nam Từ Liêm'));
t('detail shows requirement', shopHtml2.includes('ưu tiên đã có kinh nghiệm livestream thời trang nữ'));
t('detail shows date', shopHtml2.includes('2026-11-04'));
t('detail shows contact block', shopHtml2.includes('Facebook người đăng tin'));
t('detail links Facebook source (tracked)', shopHtml2.includes('data-track="xem-bai-tuyen-goc"') && shopHtml2.includes(D.shops[4].src));
t('detail has update/remove note', shopHtml2.includes('Shop có thể yêu cầu cập nhật hoặc gỡ tin qua nút Góp ý'));
t('detail renders 6 other shops', (els.otherShops.innerHTML.match(/shop-card/g) || []).length === 6, 'got ' + (els.otherShops.innerHTML.match(/shop-card/g) || []).length);
t('other shops exclude the current shop', !els.otherShops.innerHTML.includes('chi-tiet-shop.html?id=sh-05'));
t('other shops link their detail pages', els.otherShops.innerHTML.includes('chi-tiet-shop.html?id=sh-01'));

// default id (no ?id=) falls back to the first shop; unknown id shows not-found
els.shopDetailRoot.innerHTML = ''; els.otherShops.innerHTML = '';
sb.location = { search: '' };
handlers['DOMContentLoaded']();
t('no ?id= defaults to first shop', els.shopDetailRoot.innerHTML.includes('<h1>Chạm Loa</h1>'));
els.shopDetailRoot.innerHTML = ''; els.otherShops.innerHTML = '';
sb.location = { search: '?id=sh-99' };
handlers['DOMContentLoaded']();
t('unknown id shows not-found', els.shopDetailRoot.innerHTML === '<p>Không tìm thấy shop.</p>');
t('not-found leaves other shops empty', els.otherShops.innerHTML === '');

console.log(`\nv31: ${pass} PASS, ${fail} FAIL`);
process.exit(fail ? 1 : 0);
