/* v76 OG/SEO tests — Node only, no browser. v76 pham vi 2 = SUA LINK
   PREVIEW + CHUAN SEO (yeu cau nguoi dung 06/11/2026: link web khi chia se
   phai hien anh + noi dung, khong de moi dong link tro troi):
   (1) Anh og:image cua 50 bai (34 bai-viet/*.html + bai-viet-bop-reach.html)
       duoc chuan hoa ve 1200x630 JPEG, luu file MOI ten *-og.jpg (anh goc
       giu nguyen de anh hero trong bai khong doi); og:image + twitter:image
       + JSON-LD image trong HTML deu tro ve file *-og.jpg.
   (2) Moi trang (61 file HTML): og:image:width=1200 / height=630 /
       type=image/jpeg / alt (mo ta anh ngan) / og:locale=vi_VN; og:title /
       og:description / og:url / canonical / twitter:card day du va khop
       nhau; <title> duy nhat dung noi dung; JSON-LD dung loai trang
       (NewsArticle cho bai, Organization cho trang chu/danh sach,
       WebPage cho trang phu).
   (3) Trang chinh (11 trang): og:image doi tu logo.png VUONG sang anh
       preview thuong hieu images/og-brand.jpg (1200x630, logo so 2 + ten
       Ver2Solution.com tren nen xanh). Trang dang-nhap + trang phu khac
       dung chung anh nay.
   (4) Sua loi: trang-cua-toi.html og:url truoc day tro nham sang
       danh-sach-mau.html (da sua ve dung); quy-tac-diem-thuong.html +
       vi-tien-ao.html truoc day thieu og:url + twitter + JSON-LD (da them).
   (5) sitemap.xml: GIU NGUYEN 42 URL (8 trang chinh + 34 bai). 4 trang
       con thieu (chi-tiet-shop, ho-so, trang-cua-toi, vi-tien-ao) KHONG
       dua vao sitemap theo chinh sach da chot o test-v20/v31/v32: trang
       detail dung ?id= (chi-tiet-shop, ho-so) va trang app/tai khoan
       (trang-cua-toi, vi-tien-ao) khong vao sitemap; robots.txt cho
       phep crawler + tro sitemap. */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let pass = 0, fail = 0;
function t(name, cond, extra = '') { if (cond) { pass++; console.log('PASS v76-og-seo:', name); } else { fail++; console.log('FAIL v76-og-seo:', name, extra); } }
const BASE = 'https://ver2solution.github.io/mclivestream/';
const BRAND_IMG = BASE + 'images/og-brand.jpg';

// ---- doc kich thuoc anh JPEG (tu header, khong can thu vien ngoai) ----
function jpegSize(buf) {
  if (buf.length < 4 || buf[0] !== 0xFF || buf[1] !== 0xD8) return null;
  let i = 2;
  while (i + 9 < buf.length) {
    if (buf[i] !== 0xFF) break;
    const marker = buf[i + 1];
    if (marker === 0xC0 || marker === 0xC2) return { w: buf.readUInt16BE(i + 7), h: buf.readUInt16BE(i + 5) };
    if (marker === 0xD8 || marker === 0xD9 || (marker >= 0xD0 && marker <= 0xD7)) { i += 2; continue; }
    const len = buf.readUInt16BE(i + 2);
    if (len < 2) break;
    i += 2 + len;
  }
  return null;
}
const ogOf = (img) => img.replace(/\.[a-z0-9]+$/i, '-og.jpg');

// ---- load data.js de doi chieu anh bai ----
const sb = { window: {}, module: { exports: {} }, console, URLSearchParams, document: { getElementById: () => null, addEventListener: () => {}, querySelectorAll: () => [] } };
vm.createContext(sb);
vm.runInContext(fs.readFileSync(path.join(root, 'js/data.js'), 'utf8'), sb);
const D = sb.window.V20_DATA;

const MAIN = ['index.html', 'tin-tuc.html', 'danh-sach-mau.html', 'danh-sach-shop.html', 'chi-tiet-shop.html', 'dang-nhap.html', 'dat-lai-mat-khau.html', 'ho-so.html', 'trang-cua-toi.html', 'quy-tac-diem-thuong.html', 'vi-tien-ao.html'];
const ARTICLES = D.articles.map(a => a.page || a.url); // 50 trang bai (bop-reach dung key `url`, cac bai khac dung `page`)
const ALL = [...MAIN, ...ARTICLES];
t('tong 61 trang HTML (11 trang chinh + 50 trang bai)', ALL.length === 61 && fs.existsSync(path.join(root, 'bai-viet-bop-reach.html')), 'got ' + ALL.length);

const heads = {};
for (const f of ALL) heads[f] = fs.readFileSync(path.join(root, f), 'utf8').split('</head>')[0];
const get = (h, pat) => { const m = h.match(pat); return m ? m[1] : null; };
const has = (h, pat) => pat.test(h);

// ---- (A) moi trang: title duy nhat, description, canonical == og:url, OG day du ----
const titles = {};
for (const f of ALL) {
  const h = heads[f];
  const title = get(h, /<title>(.*?)<\/title>/);
  t('title co noi dung: ' + f, !!title && title.length > 10, title || '');
  if (title) {
    t('title duy nhat: ' + f, !(title in titles), 'trung voi ' + (titles[title] || ''));
    titles[title] = f;
  }
  t('meta description co noi dung: ' + f, /<meta name="description" content="[^"]{20,}">/.test(h));
  const canon = get(h, /<link rel="canonical" href="([^"]+)">/);
  const ogurl = get(h, /og:url" content="([^"]+)"/);
  t('canonical tuyet doi + khop og:url: ' + f, !!canon && canon.startsWith(BASE) && canon === ogurl, 'canon=' + canon + ' ogurl=' + ogurl);
  t('og:title + og:description: ' + f, has(h, /og:title" content="[^"]{5,}"/) && has(h, /og:description" content="[^"]{20,}"/));
  const ogimg = get(h, /og:image" content="([^"]+)"/);
  t('og:image tuyet doi + local: ' + f, !!ogimg && ogimg.startsWith(BASE + 'images/'), ogimg || '');
  t('og:image:width=1200 + height=630 + type=image/jpeg: ' + f,
    get(h, /og:image:width" content="([^"]+)"/) === '1200' && get(h, /og:image:height" content="([^"]+)"/) === '630' && get(h, /og:image:type" content="([^"]+)"/) === 'image/jpeg');
  t('og:image:alt co noi dung + og:locale vi_VN: ' + f,
    (get(h, /og:image:alt" content="([^"]+)"/) || '').length > 10 && has(h, /og:locale" content="vi_VN"/));
  t('twitter:card summary_large_image + twitter:image == og:image: ' + f,
    has(h, /twitter:card" content="summary_large_image"/) && get(h, /twitter:image" content="([^"]+)"/) === ogimg);
  t('co 1 khoi JSON-LD: ' + f, (h.match(/application\/ld\+json/g) || []).length === 1);
  t('og:image KHONG con la logo.png vuong: ' + f, !!ogimg && !ogimg.endsWith('logo.png'));
  // file anh og ton tai local, la JPEG that 1200x630
  if (ogimg) {
    const rel = ogimg.replace(BASE, '');
    const p = path.join(root, rel);
    const ok = fs.existsSync(p);
    const buf = ok ? fs.readFileSync(p) : Buffer.alloc(0);
    const sz = ok ? jpegSize(buf) : null;
    t('file og:image ton tai + JPEG 1200x630: ' + f, ok && !!sz && sz.w === 1200 && sz.h === 630, ok ? (sz ? sz.w + 'x' + sz.h : 'khong doc duoc') : 'thieu file ' + rel);
  }
}

// ---- (B) bai viet: og:image la ban -og.jpg cua data.js img; JSON-LD image khop; alt = hero alt ----
for (const a of D.articles) {
  const page = a.page || a.url;
  const h = heads[page];
  const ogimg = get(h, /og:image" content="([^"]+)"/);
  t('og:image == ban 1200x630 cua data.js img: ' + page, ogimg === ogOf(a.img), 'og=' + ogimg + ' img=' + a.img);
  // bop-reach la trang ngoai le: JSON-LD Organization (khong phai NewsArticle, khong co image) — chi kiem tra og:image
  if (page !== 'bai-viet-bop-reach.html') {
    const jm = get(h, /"image":"([^"]+)"/);
    t('JSON-LD image == og:image: ' + page, jm === ogimg, 'jsonld=' + jm);
    t('og:type article: ' + page, has(h, /og:type" content="article"/));
    t('JSON-LD NewsArticle: ' + page, h.includes('"@type":"NewsArticle"') && h.includes('"headline":"' + a.title + '"'));
  } else {
    t('bop-reach: JSON-LD Organization nhu trang chinh (ngoai le da biet)', h.includes('"@type":"Organization"'));
  }
  // og:image:alt phai la alt cua hero-img (nguyen van hoac cat ngan 125 ky tu)
  const full = fs.readFileSync(path.join(root, page), 'utf8');
  const heroAlt = (full.match(/<img class="hero-img"[^>]*alt="([^"]*)"/) || [])[1] || '';
  const ogAlt = get(h, /og:image:alt" content="([^"]+)"/) || '';
  const altOk = ogAlt === heroAlt || (heroAlt.length > 125 && heroAlt.startsWith(ogAlt.replace(/…$/, '')));
  t('og:image:alt == alt hero-img (hoac ban cat ngan): ' + page, ogAlt.length > 10 && altOk, 'ogAlt=' + ogAlt.slice(0, 50));
  // anh goc van con (hero-img trong bai khong doi) + file -og.jpg ton tai
  const origRel = a.img.replace(BASE, '');
  t('anh goc van ton tai (hero-img khong doi): ' + page, fs.existsSync(path.join(root, origRel)));
}

// ---- (C) trang chinh: og:image = anh preview thuong hieu chung ----
for (const f of MAIN) {
  const h = heads[f];
  t('og:image == anh preview thuong hieu og-brand.jpg: ' + f, get(h, /og:image" content="([^"]+)"/) === BRAND_IMG);
  t('og:type website: ' + f, has(h, /og:type" content="website"/));
  t('og:site_name co gia tri (Ver2Solution / Ver2Solution.com): ' + f, has(h, /og:site_name" content="Ver2Solution(\.com)?"/));
}
t('file images/og-brand.jpg ton tai + JPEG 1200x630',
  (() => { const buf = fs.readFileSync(path.join(root, 'images/og-brand.jpg')); const sz = jpegSize(buf); return !!sz && sz.w === 1200 && sz.h === 630; })());
t('trang-cua-toi.html: og:url dung (khong con tro nham danh-sach-mau)',
  get(heads['trang-cua-toi.html'], /og:url" content="([^"]+)"/) === BASE + 'trang-cua-toi.html');
for (const f of ['quy-tac-diem-thuong.html', 'vi-tien-ao.html']) {
  const h = heads[f];
  t(f + ': co og:url + twitter day du (truoc day thieu)',
    !!get(h, /og:url" content="([^"]+)"/) && has(h, /twitter:card" content="summary_large_image"/)
    && !!get(h, /twitter:title" content="([^"]+)"/) && !!get(h, /twitter:description" content="([^"]+)"/));
  t(f + ': co JSON-LD WebPage', h.includes('"@type":"WebPage"'));
}
t('index.html: JSON-LD Organization (khong doi loai)', heads['index.html'].includes('"@type":"Organization"'));

// ---- (D) sitemap + robots ----
const sm = fs.readFileSync(path.join(root, 'sitemap.xml'), 'utf8');
const locs = [...sm.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1]);
t('sitemap co 64 URL (8 trang chinh + 34 bai + 4 trang AdSense v77; v76 giu nguyen — khong them trang detail/app)', locs.length === 64, 'got ' + locs.length);
t('sitemap khong trung URL', new Set(locs).size === locs.length);
t('sitemap KHONG co 4 trang bi loai theo chinh sach v20/v31 (chi-tiet-shop + ho-so: trang detail dung ?id=; trang-cua-toi + vi-tien-ao: trang app/tai khoan, noindex)',
  ['chi-tiet-shop.html', 'ho-so.html', 'trang-cua-toi.html', 'vi-tien-ao.html'].every(p => !locs.includes(BASE + p)));
t('sitemap co du 49 URL bai viet trong bai-viet/', D.articles.filter(a => (a.page || a.url).startsWith('bai-viet/')).every(a => locs.includes(BASE + (a.page || a.url))));
t('sitemap co du 8 URL trang chinh (index/danh-sach-mau/danh-sach-shop/tin-tuc/dang-nhap/dat-lai-mat-khau/quy-tac-diem-thuong/bai-viet-bop-reach)',
  ['index.html', 'danh-sach-mau.html', 'danh-sach-shop.html', 'tin-tuc.html', 'dang-nhap.html', 'dat-lai-mat-khau.html', 'quy-tac-diem-thuong.html', 'bai-viet-bop-reach.html'].every(p => locs.includes(BASE + p)));
const robots = fs.readFileSync(path.join(root, 'robots.txt'), 'utf8');
t('robots.txt cho phep crawler + tro sitemap',
  robots.includes('User-agent: *') && robots.includes('Allow: /') && robots.includes('Sitemap: ' + BASE + 'sitemap.xml'));

console.log(`\nv76-og-seo: ${pass} PASS, ${fail} FAIL`);
process.exit(fail ? 1 : 0);
