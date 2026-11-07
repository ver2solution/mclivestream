/* v82 tests — Node only, no browser. Covers the 5 supplementary articles of
   07/11/2026 (bo sung cho Zalo 16:00 + 21:00, vi 10 bai sang v80 da live luc
   09:17; Zalo moi luot chi gui bai moi nhat CHUA gui):
   (1) Phi hoa hong TikTok Shop 9-17,8% + Shopee giam phi (Doanh nhan & Phap
       luat 07/11/2026; bang phi chi tiet tu Thuong hieu va Phap luat,
       bieu phi hieu luc 09/05/2026) — infographic tu lam.
   (2) Gia Nai Luong livestream 13 tieng thu 570 trieu NDT (VnExpress
       23/10/2026 chinh, Sina 31/10/2026 bo sung) — infographic tu lam.
   (3) Shopee Live + Video Tet 2026: gan 16 ty luot xem (Doanh nhan & Phap
       luat 07/11/2026) — infographic tu lam.
   (4) Cho 4.0: tieu thuong hoc livestream TikTok (Bao Vinh Long 04/11/2026)
       — anh goc cua bai goc (da tai ve).
   (5) Hang Viet ke chuyen: dac san ban chay tren TikTok
       (kinhtechungkhoan.vn 07/11/2026) — anh goc cua bai goc (PNG -> JPG).
   Moi bai co page + img + takeaway + ngay dang that da xac minh tu trang goc;
   3 bai dung infographic tu lam, 2 bai dung anh goc.
   Moi trang moi du tieu chuan SEO nhu v29/v47/v80: title/meta/canonical/
   OG day du/twitter:card/JSON-LD, h1 == title data.js, hero img +
   figcaption dung nguon, callout takeaway khop data.js, link nguon
   cuoi bai + chu ky chuan, TOC khop id h2, meta 150-160 ky tu, bai
   800-1500 tu. sitemap 61 URL (56 cu + 5 moi), khong trung; articleLink
   noi bo cho ca 49 bai co page; initNews render 50 news-items; hang ghim (v84) =
   [bop reach (user ghim), 3 bai moi them gan nhat v82]. Khong trung URL goc / page / tieu de voi bai da co; sw.js
   CACHE = 'v86-shell-1'. */
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let pass = 0, fail = 0;
function t(name, cond, extra = '') { if (cond) { pass++; console.log('PASS v82:', name); } else { fail++; console.log('FAIL v82:', name, extra); } }
const sha = f => crypto.createHash('sha256').update(fs.readFileSync(path.join(root, f))).digest('hex');
const ogOf = (img) => img.replace(/\.[a-z0-9]+$/i, '-og.jpg'); // v76: og:image la ban 1200x630 JPEG cua data.js img
function norm(s) { return String(s || '').replace(/\s+/g, ' ').trim(); }

const sb = { window: {}, module: { exports: {} }, console };
vm.createContext(sb);
vm.runInContext(fs.readFileSync(path.join(root, 'js/data.js'), 'utf8'), sb);
vm.runInContext(fs.readFileSync(path.join(root, 'js/app.js'), 'utf8'), sb);
const V = sb.window.V20;
const D = sb.window.V20_DATA;

const NEW_SLUGS = ['shopee-giam-phi-tiktok-shop-tang-hoa-hong-bang-phi-theo-nganh', 'gia-nai-luong-livestream-570-trieu-ndt-13-tieng', 'shopee-live-video-tet-2026-16-ty-luot-xem', 'cho-40-tieu-thuong-hoc-livestream-tiktok', 'hang-viet-ke-chuyen-dac-san-ban-chay-tiktok'];
const INFOGRAPHIC = new Set(['shopee-giam-phi-tiktok-shop-tang-hoa-hong-bang-phi-theo-nganh', 'gia-nai-luong-livestream-570-trieu-ndt-13-tieng', 'shopee-live-video-tet-2026-16-ty-luot-xem']);
const BASE = 'https://ver2solution.github.io/mclivestream/';

t('50 articles total', D.articles.length === 50, 'got ' + D.articles.length);
const news = D.articles.filter(a => a.page && a.page.startsWith('bai-viet/'));
t('49 paged articles', news.length === 49, 'got ' + news.length);
t('no duplicate page values', new Set(D.articles.map(a => a.page).filter(Boolean)).size === D.articles.map(a => a.page).filter(Boolean).length);
t('no duplicate titles', new Set(D.articles.map(a => a.title)).size === D.articles.length);
const urls = D.articles.map(a => a.url).filter(Boolean);
const SERIES_URL = 'https://www.brandsvietnam.com/congdong/topic/tiktok-shop-affiliate-mua-cuoi-nam-2026-koc-can-chuan-bi-gi-khi-luat-choi-da-doi';
const dupUrls = urls.filter((u, i) => urls.indexOf(u) !== i);
t('no duplicate original urls — tru 1 ngoai le da ghi nhan tu v80: URL goc BrandsVietnam (series 5 luat TikTok Shop) dung chung cho 3 bai goc khac nhau, moi bai viet 1 goc rieng',
  new Set(dupUrls).size === 1 && dupUrls[0] === SERIES_URL && urls.filter(u => u === SERIES_URL).length === 3, 'dup: ' + dupUrls.join(', '));
t('all 5 new articles have pinned field set (false, khong ghim)', NEW_SLUGS.every(s => {
  const a = D.articles.find(x => x.page === 'bai-viet/' + s + '.html');
  return a && typeof a.pinned === 'boolean' && a.pinned === false;
}));

// ---- per-page checks for all 5 ----
const fresh = NEW_SLUGS.map(s => D.articles.find(a => a.page === 'bai-viet/' + s + '.html'));
t('all 5 new slugs found in data.js', fresh.every(Boolean));
for (const a of fresh) {
  const slug = a.page.replace('bai-viet/', '').replace('.html', '');
  const p = path.join(root, a.page);
  t('page file exists: ' + slug, fs.existsSync(p));
  if (!fs.existsSync(p)) continue;
  const s = fs.readFileSync(p, 'utf8');
  t('h1 == data.js title: ' + slug, norm((s.match(/<h1 itemprop="headline">(.*?)<\/h1>/s) || ['', ''])[1]) === a.title);
  t('title tag has data.js title: ' + slug, s.includes('<title>' + a.title + ' — Ver2Solution</title>'));
  const meta = (s.match(/<meta name="description" content="([^"]*)">/) || [])[1] || '';
  t('meta 150-160 chars: ' + slug, meta.length >= 150 && meta.length <= 160, meta.length + ' chars');
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
    t('hero caption says self-made infographic, not source photo: ' + slug,
      s.includes('Infographic: Ver2Solution tự làm') && !s.includes('Ảnh gốc: ' + a.source));
  } else {
    t('no imgSelf flag: ' + slug, !a.imgSelf);
    t('og:image is local (v69: photo downloaded from source): ' + slug, og.startsWith(BASE + 'images/bai-viet/'), 'og=' + og);
    t('hero caption credits original source: ' + slug, s.includes('Ảnh gốc: ' + a.source + ' —'));
    const heroFile = path.join(root, 'images/bai-viet/' + slug + '.jpg');
    t('hero JPG exists: ' + slug, fs.existsSync(heroFile) && fs.statSync(heroFile).size > 10000);
    t('hero img uses local JPG: ' + slug, s.includes('src="../images/bai-viet/' + slug + '.jpg"'));
  }
  const tw = (s.match(/<b>Theo Ver2Solution:<\/b>\s*([\s\S]*?)<\/div>/) || [])[1] || '';
  t('takeaway callout present: ' + slug, tw.length > 50);
  t('data.js takeaway == page takeaway: ' + slug, norm(tw.replace(/<[^>]+>/g, '')) === norm(a.takeaway));
  if (a.url) {
    t('source link href == original url: ' + slug, s.includes('href="' + a.url + '"'));
    t('source name is the link text: ' + slug, s.includes('<b>' + V.esc(a.source) + '</b>'));
    t('"không sao chép nguyên văn" line: ' + slug, s.includes('không sao chép nguyên văn.'));
  }
  t('standard signature block: ' + slug, s.includes('Ver2Solution.com</b> — Kênh cập nhật tin tức thị trường và xu hướng kinh doanh online') && s.includes('032 998 3699 (Zalo)'));
  t('share links use page URL: ' + slug, s.includes(encodeURIComponent(BASE + a.page).replace(/%2F/g, '%2F')));
  t('published_time == data.js date: ' + slug, s.includes('article:published_time" content="' + a.date + '"'));
  const tocHrefs = [...s.matchAll(/<a href="#(bai-muc-[^"]+)">/g)].map(m => m[1]);
  t('TOC links match h2 ids: ' + slug, tocHrefs.length >= 4 && tocHrefs.every(id => s.includes('id="' + id + '"')), tocHrefs.length + ' toc entries');
  t('no leftover template URLs (canonical/OG/share/?next): ' + slug,
    !s.includes('content="https://ver2solution.github.io/mclivestream/bai-viet/le-11-11-trung-quoc-ban-goi-ai-qua-livestream.html')
    && !s.includes('?next=bai-viet/le-11-11-trung-quoc-ban-goi-ai-qua-livestream.html')
    && !s.includes('le-11-11-trung-quoc-ban-goi-ai-qua-livestream-og.jpg')
    && !s.includes('le-11-11-trung-quoc-ban-goi-ai-qua-livestream.png'));
  const bodyHtml = (s.match(/<div class="article-body">([\s\S]*?)<\/div>\s*<p style="margin-top:20px">/) || [])[1] || '';
  const words = norm(bodyHtml.replace(/<[^>]+>/g, ' ')).split(' ').filter(Boolean).length;
  t('body 800-1500 words: ' + slug, words >= 800 && words <= 1500, words + ' words');
}
// extra per-article facts
const fee = D.articles.find(a => a.page === 'bai-viet/shopee-giam-phi-tiktok-shop-tang-hoa-hong-bang-phi-theo-nganh.html');
t('fee article links to v80 fee article + cart-limit + 1111 profit calc',
  fs.readFileSync(path.join(root, fee.page), 'utf8').includes('ba-san-dong-loat-tang-phi-san.html')
  && fs.readFileSync(path.join(root, fee.page), 'utf8').includes('tiktok-shop-siet-video-gan-gio-hang.html')
  && fs.readFileSync(path.join(root, fee.page), 'utf8').includes('tiktok-shop-1111-tinh-loi.html'));
t('fee article date 07/11/2026, source Doanh nhan & Phap luat',
  fee.date === '2026-11-07' && fee.source === 'Doanh nhân & Pháp luật');
const jia = D.articles.find(a => a.page === 'bai-viet/gia-nai-luong-livestream-570-trieu-ndt-13-tieng.html');
t('jia article date 23/10/2026 (VnExpress), links to cho-4.0 + hang-viet in same batch',
  jia.date === '2026-10-23' && jia.source === 'VnExpress'
  && fs.readFileSync(path.join(root, jia.page), 'utf8').includes('cho-40-tieu-thuong-hoc-livestream-tiktok.html')
  && fs.readFileSync(path.join(root, jia.page), 'utf8').includes('hang-viet-ke-chuyen-dac-san-ban-chay-tiktok.html'));
const tet = D.articles.find(a => a.page === 'bai-viet/shopee-live-video-tet-2026-16-ty-luot-xem.html');
t('tet article links to cart-limit series article',
  fs.readFileSync(path.join(root, tet.page), 'utf8').includes('tiktok-shop-siet-video-gan-gio-hang.html'));
const cho = D.articles.find(a => a.page === 'bai-viet/cho-40-tieu-thuong-hoc-livestream-tiktok.html');
t('cho 4.0 article date 04/11/2026 (Bao Vinh Long), links to hang-viet in same batch',
  cho.date === '2026-11-04' && cho.source === 'Báo Vĩnh Long'
  && fs.readFileSync(path.join(root, cho.page), 'utf8').includes('hang-viet-ke-chuyen-dac-san-ban-chay-tiktok.html'));
const hang = D.articles.find(a => a.page === 'bai-viet/hang-viet-ke-chuyen-dac-san-ban-chay-tiktok.html');
t('hang-viet article date 07/11/2026, links to cho-4.0 in same batch',
  hang.date === '2026-11-07' && hang.source === 'kinhtechungkhoan.vn'
  && fs.readFileSync(path.join(root, hang.page), 'utf8').includes('cho-40-tieu-thuong-hoc-livestream-tiktok.html'));

// ---- sitemap / links / render / pinned ----
const sm = fs.readFileSync(path.join(root, 'sitemap.xml'), 'utf8');
const locs = [...sm.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1]);
t('sitemap has 64 urls (56 cu + 5 bai moi v82)', locs.length === 64, 'got ' + locs.length);
t('sitemap has no duplicates', new Set(locs).size === locs.length);
for (const slug of NEW_SLUGS) t('sitemap has ' + slug, locs.includes(BASE + 'bai-viet/' + slug + '.html'));
for (const a of news) {
  t('articleLink internal: ' + (a.page || ''), V.articleLink(a) === '<a href="' + a.page + '">' + a.title + '</a>');
  t('articleHref == page: ' + (a.page || ''), V.articleHref(a) === a.page);
}
const sw = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');
t("sw.js CACHE = 'v86-shell-1'", sw.includes("const CACHE = 'v86-shell-1';"));
t('sw.js giong het v82 (CACHE v86-shell-1) (sha256)', sha('sw.js') === 'f8ee524a81f0c741d07806d784d6aa113e1341495ff73653b7e05124d2cc4253');

// pinned row (khong doi so voi v80: v82 khong them bai ghim)
const pinned = V.getPinnedRow(D.articles);
t('pinned row is [bop reach (user ghim), 3 bai moi them gan nhat v82] (v84: chi 1 bai ghim, lap bang thu tu them vao)',
  pinned.length === 4
  && pinned[0].title.includes('bóp reach') && pinned[0].pinned === true
  && pinned[1].title.includes('Đặc sản địa phương') && pinned[1].pinned === false
  && pinned[2].title.includes('Chợ 4.0') && pinned[2].pinned === false
  && pinned[3].title.includes('16 tỷ lượt xem') && pinned[3].pinned === false);

// ---- initNews render with DOM stub ----
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
  } else {
    t('news list photo credit: ' + a.page, html.includes('Ảnh gốc: ' + a.source + ' — không phải ảnh của Ver2Solution.'));
  }
}
t('news list has 50 news-items', (html.match(/class="news-item"/g) || []).length === 50, 'got ' + (html.match(/class="news-item"/g) || []).length);
console.log(`\nTOTAL v82: ${pass} PASS, ${fail} FAIL`);
if (fail) process.exitCode = 1;
