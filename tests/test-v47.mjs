/* v47 tests — Node only, no browser. Covers the 5 articles of 06/11/2026
   (cron bai bao 08:21, quy tac moi tu 06/11: 1 bai tu khoa SEO + 4 bai tin
   tuc, tong 5 bai/ngay):
   (1) Bai tu khoa SEO "tuyen mau livestream" (STT 1, uu tien cao, loai bai
       "trang danh sach viec" -> viet bai day du theo dac ta he-thong-viet-
       bai-seo-100-tu-khoa.md): title 55-60 ky tu chua tu khoa chinh o dau,
       meta 150-160 ky tu, H1 chua tu khoa chinh, bai 1.200-2.500 tu, H2/H3
       chua tu khoa phu (luong mau livestream, mau livestream khong can
       kinh nghiem, tuyen mau live Ha Noi/TP HCM, tuyen mau livestream
       part time), link noi bo ve danh-sach-mau.html + danh-sach-shop.html
       + bai lien quan, kind:"keyword", pinned:true, imgSelf:true,
       infographic tu lam tu so lieu tin tuyen that tren san (khong phai
       anh bao, khong co nguon bao vi bai evergreen).
   (2) 4 bai tin tuc (Shopee Q3 vietnam.vn 03/11; 11st MC AI Aju Press
       30/10; EU phi Temu/Shein Continental Brief 30/10 cap nhat 05/11;
       Hai Phong TikTok Shop vietnam.vn 05/11): moi bai co page + img +
       takeaway + ngay dang that da xac minh tu trang goc; 2 bai co anh
       goc (og:image ngoai da kiem chung HTTP 200 luc viet), 2 bai dung
       infographic tu lam (11st, EU) vi anh goc chi la anh thuong hieu
       chung cua toa soan.
   (3) Moi trang moi du tieu chuan SEO nhu v29: title/meta/canonical/OG
       day du/twitter:card/JSON-LD, h1 == title data.js, hero img + fig-
       caption dung nguon, callout takeaway khop data.js, link nguon cuoi
       bai (bai tin tuc) + chu ky chuan, TOC khop id h2.
   (4) sitemap 42 URL (37 cu + 5 moi), khong trung; articleLink noi bo
       cho ca 49 bai co page; initNews render 50 news-items, caption
       infographic cua bai tu khoa ghi dung "so lieu tin tuyen that tren
       san" (khong ghi sai "so lieu bai goc"), hang ghim = [bai tu khoa,
       bop reach, 7 muc bat buoc, luong MC].
   (5) Khong trung URL goc / page / tieu de voi bai da co; sw.js CACHE =
       'v47-shell-1'. Anh goc ngoai chi kiem chung HTTP 200 luc viet (xem
       bao cao v47), test chi kiem tra dinh dang https + khong phai anh
       cua Ver2Solution. */
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let pass = 0, fail = 0;
function t(name, cond, extra = '') { if (cond) { pass++; console.log('PASS v47:', name); } else { fail++; console.log('FAIL v47:', name, extra); } }
const ogOf = (img) => img.replace(/\.[a-z0-9]+$/i, '-og.jpg'); // v76: og:image la ban 1200x630 JPEG cua data.js img
function norm(s) { return String(s || '').replace(/\s+/g, ' ').trim(); }

const sb = { window: {}, module: { exports: {} }, console };
vm.createContext(sb);
vm.runInContext(fs.readFileSync(path.join(root, 'js/data.js'), 'utf8'), sb);
vm.runInContext(fs.readFileSync(path.join(root, 'js/app.js'), 'utf8'), sb);
const V = sb.window.V20;
const D = sb.window.V20_DATA;

const NEW_SLUGS = ['tuyen-mau-livestream', 'shop-giu-chan-khach-live-video-tang-52-phan-tram', 'san-11st-mc-ai-live-sale-11-11', 'eu-thu-phi-buu-kien-temu-shein', 'hai-phong-hoc-ban-tren-tiktok-shop'];
const INFOGRAPHIC = new Set(['tuyen-mau-livestream', 'san-11st-mc-ai-live-sale-11-11', 'eu-thu-phi-buu-kien-temu-shein']);
const BASE = 'https://ver2solution.github.io/mclivestream/';

t('50 articles total', D.articles.length === 50, 'got ' + D.articles.length);
const news = D.articles.filter(a => a.page && a.page.startsWith('bai-viet/'));
t('49 paged articles', news.length === 49, 'got ' + news.length);
t('no duplicate page values', new Set(D.articles.map(a => a.page).filter(Boolean)).size === D.articles.map(a => a.page).filter(Boolean).length);
t('no duplicate titles', new Set(D.articles.map(a => a.title)).size === D.articles.length);
const urls = D.articles.map(a => a.url).filter(Boolean);
const SERIES_URL = 'https://www.brandsvietnam.com/congdong/topic/tiktok-shop-affiliate-mua-cuoi-nam-2026-koc-can-chuan-bi-gi-khi-luat-choi-da-doi';
const dupUrls = urls.filter((u, i) => urls.indexOf(u) !== i);
t('no duplicate original urls — tru 1 ngoai le da ghi nhan: URL goc BrandsVietnam (series 5 luat TikTok Shop) dung chung cho 3 bai goc khac nhau (gioi han video gan gio, dong bang hoa hong IP, lo trinh 100 ngay), moi bai viet 1 goc rieng',
  new Set(dupUrls).size === 1 && dupUrls[0] === SERIES_URL && urls.filter(u => u === SERIES_URL).length === 3, 'dup: ' + dupUrls.join(', '));

// ---- (1) keyword article ----
const kw = D.articles.find(a => a.page === 'bai-viet/tuyen-mau-livestream.html');
t('keyword article found, kind keyword, imgSelf, url null (evergreen) — pinned:false (v84: chi user ghim bop-reach)',
  !!kw && kw.kind === 'keyword' && kw.pinned === false && kw.imgSelf === true && kw.url === null
  && kw.date === '2026-11-06' && kw.source === 'Ver2Solution');
t('keyword title 55-60 chars, keyword first', kw.title.length >= 55 && kw.title.length <= 60 && kw.title.startsWith('Tuyển mẫu livestream'), kw.title.length + ' chars');
const kwPage = fs.readFileSync(path.join(root, kw.page), 'utf8');
const kwMeta = (kwPage.match(/<meta name="description" content="([^"]*)">/) || [])[1] || '';
t('keyword meta 150-160 chars with keyword', kwMeta.length >= 150 && kwMeta.length <= 160 && kwMeta.includes('Tuyển mẫu livestream'), kwMeta.length + ' chars');
t('keyword H1 contains exact keyword', /<h1 itemprop="headline">[^<]*Tuyển mẫu livestream[^<]*<\/h1>/.test(kwPage));
const kwBodyHtml = (kwPage.match(/<div class="article-body">([\s\S]*?)<\/div>\s*<p style="margin-top:20px">/) || [])[1] || '';
const kwWords = norm(kwBodyHtml.replace(/<[^>]+>/g, ' ')).split(' ').filter(Boolean).length;
t('keyword body 1200-2500 words', kwWords >= 1200 && kwWords <= 2500, kwWords + ' words');
for (const sub of ['Lương mẫu livestream', 'không cần kinh nghiệm', 'Hà Nội', 'TP. Hồ Chí Minh', 'part time']) {
  t('keyword H2/H3 has sub-keyword: ' + sub, kwBodyHtml.includes(sub));
}
t('keyword page links to danh-sach-mau + danh-sach-shop + related articles',
  kwPage.includes('href="../danh-sach-mau.html"') && kwPage.includes('href="../danh-sach-shop.html"')
  && kwPage.includes('href="luong-mc-livestream-theo-buoi.html"')
  && kwPage.includes('href="ho-so-mc-livestream-7-muc-bat-buoc.html"'));
t('keyword page states salary figures come from real job posts on the site',
  kwPage.includes('tin tuyển mẫu thật đang đăng trên sàn Ver2Solution'));
t('keyword page has no fake external source link (no "Bài gốc" line)',
  !kwPage.includes('Bài gốc đăng') && kwPage.includes('Đăng 06/11/2026'));

// ---- (2)+(3) per-page checks for all 5 ----
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
    t('hero caption says self-made infographic, not source photo: ' + slug,
      s.includes('infographic tự làm') && !s.includes('Ảnh gốc: ' + a.source));
  } else {
    t('no imgSelf flag: ' + slug, !a.imgSelf);
    t('og:image is local (v69: photo downloaded from source): ' + slug, og.startsWith(BASE + 'images/bai-viet/'), 'og=' + og);
    t('hero caption credits original source: ' + slug, s.includes('Ảnh gốc: ' + a.source + ' —'));
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
  // TOC links match h2 ids
  const tocHrefs = [...s.matchAll(/<a href="#(bai-muc-[^"]+)">/g)].map(m => m[1]);
  t('TOC links match h2 ids: ' + slug, tocHrefs.length >= 5 && tocHrefs.every(id => s.includes('id="' + id + '"')), tocHrefs.length + ' toc entries');
  t('no leftover template slug: ' + slug, !s.includes('le-11-11-trung-quoc-ban-goi-ai-qua-livestream'));
}

// ---- (4) sitemap / links / render ----
const sm = fs.readFileSync(path.join(root, 'sitemap.xml'), 'utf8');
const locs = [...sm.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1]);
t('sitemap has 64 urls (v68: +1 dang-nhap; v71: +5 bai moi; v77: +4 trang AdSense; v85: +1 dang-ky; v86: +1 thanh-ly-kiot)', locs.length === 64, 'got ' + locs.length);
t('sitemap has no duplicates', new Set(locs).size === locs.length);
for (const slug of NEW_SLUGS) t('sitemap has ' + slug, locs.includes(BASE + 'bai-viet/' + slug + '.html'));
for (const a of news) {
  t('articleLink internal: ' + (a.page || ''), V.articleLink(a) === '<a href="' + a.page + '">' + a.title + '</a>');
  t('articleHref == page: ' + (a.page || ''), V.articleHref(a) === a.page);
}
const sw = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');
t("sw.js CACHE = 'v86-shell-1'", sw.includes("const CACHE = 'v86-shell-1';"));

// pinned row
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
  if (a.kind === 'keyword') {
    t('news list keyword caption cites job-post figures, not "bai goc"',
      html.includes('Infographic: Ver2Solution tự làm từ số liệu tin tuyển thật trên sàn.'));
  } else if (a.imgSelf) {
    t('news list infographic caption: ' + a.page, html.includes('Infographic: Ver2Solution tự làm từ số liệu bài gốc.'));
  } else {
    t('news list photo credit: ' + a.page, html.includes('Ảnh gốc: ' + a.source + ' — không phải ảnh của Ver2Solution.'));
  }
}
t('news list has 50 news-items', (html.match(/class="news-item"/g) || []).length === 50, 'got ' + (html.match(/class="news-item"/g) || []).length);
console.log(`\nTOTAL v47: ${pass} PASS, ${fail} FAIL`);
if (fail) process.exitCode = 1;
