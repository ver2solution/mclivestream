/* v30 tests — Node only, no browser. v29 article suite (17 full articles) + v30 empty-state / feedback / h1 / nav-doc fixes:
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
   (3) og:image is local (v69: all 30 article images are hosted under
       images/bai-viet/ — infographics self-made, photos downloaded from
       the source newspaper); local files exist and are valid images.
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
   v30 additions:
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
function t(name, cond, extra = '') { if (cond) { pass++; console.log('PASS v30:', name); } else { fail++; console.log('FAIL v30:', name, extra); } }
const ogOf = (img) => img.replace(/\.[a-z0-9]+$/i, '-og.jpg'); // v76: og:image la ban 1200x630 JPEG cua data.js img
function norm(s) { return String(s || '').replace(/\s+/g, ' ').trim(); }

const sb = { window: {}, module: { exports: {} }, console };
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

// ---- (8)–(11) v30: approved empty states, static h1, Supabase scripts, .empty-state ----
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

console.log(`\nv30: ${pass} PASS, ${fail} FAIL`);
process.exit(fail ? 1 : 0);
