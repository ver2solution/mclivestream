// test-v71.mjs — v71: 5 bai tin tuc moi (06/11/2026) de du KPI 10 bai/ngay
// (1 bai tu khoa SEO da xong o v47; v71 chi them 5 bai TIN TUC).
// (A) data.js 30 -> 50 bai; 5 bai moi du truong, pinned:false (da co 3 bai
//     ghim: 11st pinOrder 1, tuyen-mau, bop-reach — khong ghim them), khong
//     trung slug/page/title, khong co imgSelf (anh tai tu bao goc).
// (B) Moi trang bai-viet moi: SEO day du (title/description/OG/twitter/
//     canonical/JSON-LD), hero-img local, 6 muc h2 + TOC 6 muc, callout
//     "Theo Ver2Solution", link nguon bao goc, chu ky Ver2Solution, khong
//     con slug template san-11st.
// (C) 5 anh dai dien: file ton tai, JPEG that, >10KB, rong >= 500.
// (D) sitemap 37 -> 42 URL, co du 5 URL moi, khong trung.
// (E) v84: chi con 1 bai ghim (bop-reach); hang ghim = bop + 3 bai moi them gan nhat (tu day theo thu tu them vao).
// (F) sw.js CACHE = v76-shell-1 + hash khoa file da doi.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let pass = 0, fail = 0;
function t(name, ok, extra = '') { if (ok) { pass++; console.log('PASS v71:', name); } else { fail++; console.log('FAIL v71:', name, extra); } }
const sha = (p) => crypto.createHash('sha256').update(fs.readFileSync(path.join(root, p))).digest('hex');
const BASE = 'https://ver2solution.github.io/mclivestream/';

const sb = { window: {}, module: { exports: {} }, console, document: { querySelectorAll: () => [], getElementById: () => null, addEventListener: () => {} }, location: { search: '' } };
vm.createContext(sb);
vm.runInContext(fs.readFileSync(path.join(root, 'js/data.js'), 'utf8'), sb);
vm.runInContext(fs.readFileSync(path.join(root, 'js/app.js'), 'utf8'), sb);
const V = sb.window.V20;
const D = sb.window.V20_DATA;
const dataJs = fs.readFileSync(path.join(root, 'js/data.js'), 'utf8');
const sw = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');

const NEW = [
  { slug: 'wechat-channels-livestream-ban-hang-2026', title: 'WeChat Channels: kênh livestream bán hàng tăng 74% ở Trung Quốc, shop nhỏ học gì?', cat: 'Tin thị trường thế giới', source: 'Marketing China', date: '2026-09-30', date_vn: '30/09/2026', url: 'https://marketingtochina.com/wechat-channels-ecommerce-2026/' },
  { slug: 'my-bai-bo-mien-thue-de-minimis-temu-shein', title: 'Mỹ bãi bỏ miễn thuế de minimis: hàng Temu, Shein đội giá, shop nhập hàng Trung Quốc tính lại', cat: 'Tin thị trường thế giới', source: 'GP Fulfillment', date: '2026-08-21', date_vn: '21/08/2026', url: 'https://www.gp-fulfillment.com/blog/de-minimis-ends-aug-14-cross-border-sellers-cut-costs.html' },
  { slug: 'youtube-shopping-tang-13-lan', title: 'YouTube Shopping tăng 13 lần trong 2 năm: shop nhỏ bán bằng video và live thế nào?', cat: 'Tin thị trường thế giới', source: 'ValueYourNetwork', date: '2026-10-19', date_vn: '19/10/2026', url: 'https://www.valueyournetwork.com/en/youtube-shopping-2026-figures/' },
  { slug: 'thue-livestream-2026-bo-thue-khoan', title: 'Bán hàng livestream 2026: bỏ thuế khoán, sàn khấu trừ thuế, doanh thu trên 1 tỷ phải xuất hóa đơn điện tử', cat: 'Tin mới Livestream', source: 'Thanh Niên', date: '2026-08-19', date_vn: '19/08/2026', url: 'https://thanhnien.vn/rui-ro-phap-ly-khi-kinh-doanh-tren-mang-185260818202210556.htm' },
  { slug: 'nong-san-livestream-ocop', title: 'Livestream bán nông sản OCOP: Tây Ninh đặt mục tiêu 100 tỷ/năm, KOL bán gấp 3 lần nông dân tự live', cat: 'Tin mới Livestream', source: 'Nông Thôn Việt', date: '2026-10-22', date_vn: '22/10/2026', url: 'https://nongthonviet.vn/tay-ninh-dat-muc-tieu-ban-nong-san-qua-mang-thu-100-ti-dong-moi-nam-46443.html' },
];

// ---- (A1) Tong 50 bai; 5 bai moi du truong ----
t('data.js: tong 50 bai (35 cu + 10 moi)', D.articles.length === 50, 'got ' + D.articles.length);
t('data.js: 49 bai co page (chi bop-reach khong co page)', D.articles.filter(a => a.page).length === 49, 'got ' + D.articles.filter(a => a.page).length);
for (const n of NEW) {
  const a = D.articles.find(x => x.page === 'bai-viet/' + n.slug + '.html');
  t('data.js co bai moi: ' + n.slug,
    !!a && a.title === n.title && a.cat === n.cat && a.source === n.source
    && a.date === n.date && a.url === n.url
    && a.img === BASE + 'images/bai-viet/' + n.slug + '.jpg'
    && a.pinned === false && !a.imgSelf
    && typeof a.takeaway === 'string' && a.takeaway.length > 100,
    a ? JSON.stringify(a).slice(0, 200) : 'thieu entry');
}
t('Khong trung slug/page/title trong 50 bai',
  new Set(D.articles.map(a => a.page || a.url)).size === 50
  && new Set(D.articles.map(a => a.title)).size === 50);
t('50 bai: tat ca img deu la URL local (0 URL anh ngoai)',
  D.articles.every(a => typeof a.img === 'string' && a.img.startsWith(BASE + 'images/bai-viet/')));
t('data.js: khong con URL anh ngoai trong truong img',
  !/\"img\": \"https?:\/\/(?!ver2solution\.github\.io)/.test(dataJs));
t('data.js: 45 bai co link nguon bao goc http (40 cu + 5 moi)',
  D.articles.filter(a => a.url && a.url.startsWith('http')).length === 45);

// ---- (A2) v84: chi con 1 bai ghim (bop-reach); hang ghim tu day bang 3 bai moi them gan nhat ----
t('Chi co 1 bai ghim (v84: chi user ghim bop-reach)', D.articles.filter(a => a.pinned).length === 1);
const row = V.getPinnedRow(D.articles);
t('Hang ghim van 4 o, o 1 la bai bop-reach (user ghim tay)', row.length === 4 && row[0].url === 'bai-viet-bop-reach.html');
t('3 o sau la 3 bai moi them gan nhat (v82) theo thu tu them vao (v84)',
  row[1].page === 'bai-viet/hang-viet-ke-chuyen-dac-san-ban-chay-tiktok.html'
  && row[2].page === 'bai-viet/cho-40-tieu-thuong-hoc-livestream-tiktok.html'
  && row[3].page === 'bai-viet/shopee-live-video-tet-2026-16-ty-luot-xem.html');
t('5 bai moi v71 KHONG nam trong hang ghim (da bi bai moi hon day xuong)', NEW.every(n => !row.some(a => a.page === 'bai-viet/' + n.slug + '.html')));

// ---- (B) Moi trang bai viet moi: SEO + noi dung + nguon + chu ky ----
function imgInfo(buf) {
  if (buf.length > 8 && buf.slice(0, 8).equals(Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A])))
    return { fmt: 'png', w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) };
  if (buf.length > 3 && buf[0] === 0xFF && buf[1] === 0xD8 && buf[2] === 0xFF) {
    let i = 2;
    while (i + 9 < buf.length) {
      if (buf[i] !== 0xFF) break;
      const marker = buf[i + 1];
      if (marker === 0xC0 || marker === 0xC2) return { fmt: 'jpg', w: buf.readUInt16BE(i + 7), h: buf.readUInt16BE(i + 5) };
      if (marker === 0xD8 || marker === 0xD9 || (marker >= 0xD0 && marker <= 0xD7)) { i += 2; continue; }
      const len = buf.readUInt16BE(i + 2);
      if (len < 2) break;
      i += 2 + len;
    }
    return { fmt: 'jpg', w: 0, h: 0 };
  }
  return null;
}
for (const n of NEW) {
  const html = fs.readFileSync(path.join(root, 'bai-viet/' + n.slug + '.html'), 'utf8');
  const pageUrl = BASE + 'bai-viet/' + n.slug + '.html';
  const imgUrl = BASE + 'images/bai-viet/' + n.slug + '-og.jpg'; // v76: og:image la ban 1200x630 JPEG
  t('title tag dung: ' + n.slug, html.includes('<title>' + n.title + ' — Ver2Solution</title>'));
  t('meta description co noi dung: ' + n.slug,
    /<meta name="description" content="[^"]{50,}">/.test(html));
  t('OG day du (type article + title + desc + url + image): ' + n.slug,
    html.includes('<meta property="og:type" content="article">')
    && html.includes('<meta property="og:title" content="' + n.title + ' — Ver2Solution">')
    && html.includes('<meta property="og:url" content="' + pageUrl + '">')
    && html.includes('<meta property="og:image" content="' + imgUrl + '">')
    && /<meta property="og:description" content="[^"]{50,}">/.test(html));
  t('twitter:card summary_large_image + twitter:image: ' + n.slug,
    html.includes('<meta name="twitter:card" content="summary_large_image">')
    && html.includes('<meta name="twitter:image" content="' + imgUrl + '">'));
  t('canonical dung: ' + n.slug, html.includes('<link rel="canonical" href="' + pageUrl + '">'));
  t('JSON-LD NewsArticle (headline + datePublished + image): ' + n.slug,
    html.includes('"headline":"' + n.title + '"')
    && html.includes('"datePublished":"' + n.date + '"')
    && html.includes('"image":"' + imgUrl + '"'));
  t('hero-img local + chu thich "Anh goc": ' + n.slug,
    html.includes('src="../images/bai-viet/' + n.slug + '.jpg"')
    && html.includes('Ảnh gốc: ' + n.source + ' — ảnh minh họa trong bài gốc, không phải ảnh của Ver2Solution.'));
  t('6 muc h2 bai-muc + TOC 6 muc: ' + n.slug,
    (html.match(/<h2 id="bai-muc-/g) || []).length === 6
    && (html.match(/<li><a href="#bai-muc-/g) || []).length === 6);
  t('Callout "Theo Ver2Solution" o cuoi bai: ' + n.slug,
    html.includes('<div class="callout"><b>Theo Ver2Solution:</b>'));
  t('Link nguon bao goc dung URL: ' + n.slug,
    html.includes('<a href="' + n.url + '" target="_blank" rel="noopener"><b>' + n.source + '</b></a>')
    && html.includes('Bài gốc đăng ' + n.date_vn));
  t('Chu ky Ver2Solution (web + hashtag + Zalo): ' + n.slug,
    html.includes('<b>Ver2Solution.com</b>')
    && html.includes('#ver2solution #TMĐT #livestream #kinhdoanhonline')
    && html.includes('<b>032 998 3699 (Zalo)</b>'));
  t('Khong con slug template san-11st: ' + n.slug, !html.includes('san-11st-mc-ai-live-sale-11-11'));
  t('Noi dung bai du dai (ban text > 1000 tu): ' + n.slug,
    html.replace(/<[^>]+>/g, ' ').split(/\s+/).filter(Boolean).length > 1000);
  // (C) Anh dai dien
  const p = path.join(root, 'images/bai-viet/' + n.slug + '.jpg');
  const ok = fs.existsSync(p);
  const buf = ok ? fs.readFileSync(p) : Buffer.alloc(0);
  const info = ok ? imgInfo(buf) : null;
  t('Anh ton tai + JPEG that + lon hon 10KB: ' + n.slug,
    ok && !!info && info.fmt === 'jpg' && buf.length > 10000, ok ? (info ? info.fmt + ' ' + buf.length + 'B' : 'sai dinh dang') : 'thieu file');
  t('Anh khong phai 1x1, rong >= 500: ' + n.slug,
    !!info && info.w >= 500 && info.h >= 300, info ? info.w + 'x' + info.h : 'khong doc duoc kich thuoc');
}

// ---- (D) Sitemap 42 URL ----
const sm = fs.readFileSync(path.join(root, 'sitemap.xml'), 'utf8');
const locs = [...sm.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1]);
t('sitemap co 64 URL (37 cu + 5 moi + 4 trang AdSense v77; v76 giu 42 theo chinh sach loai trang detail/app)', locs.length === 64, 'got ' + locs.length);
t('sitemap co du 5 URL bai moi', NEW.every(n => locs.includes(BASE + 'bai-viet/' + n.slug + '.html')));
t('sitemap khong trung', new Set(locs).size === locs.length);

// ---- (F) CACHE + hash khoa file da doi (v71) ----
t("sw.js CACHE = 'v86-shell-1'", sw.includes("const CACHE = 'v86-shell-1'"));
t("sw.js khong con v69-shell-1", !sw.includes('v69-shell-1'));
t('js/data.js giong het v71 (30 cu + 5 bai moi) (sha256)', sha('js/data.js') === '76009b20bc339501db3ab2f6e96993e5a6c6f84d9d50e45a623cde6882d85fdf');
t('sw.js giong het v71 (CACHE v86-shell-1) (sha256)', sha('sw.js') === 'f8ee524a81f0c741d07806d784d6aa113e1341495ff73653b7e05124d2cc4253');
t('sitemap.xml giong het v71 (61 URL v77) (sha256)', sha('sitemap.xml') === 'c229a7061ef8b60b611648874a475aaf96e5cb0ea2b46aef112265e7f350459f');
const HTML_HASH = {
  'wechat-channels-livestream-ban-hang-2026': '46aacec522a8973f28fd38d2b9a87b9fa3733197785503e45ef90f0acae7c7ae',
  'my-bai-bo-mien-thue-de-minimis-temu-shein': 'd566f5e649b68ef92ab23c2e560679dcfd80a83191e726b948eb19910b5f9cd4',
  'youtube-shopping-tang-13-lan': '4a1857817e829d7efa7d27a2c19532b9983d09c5522528d1c04a5cc84aeb7ed5',
  'thue-livestream-2026-bo-thue-khoan': '7acc6a74bd01710d65c4c488e423eaf32b80ac3bcf84c7d338ac9f82ad4aceee',
  'nong-san-livestream-ocop': '9337e30281a9a25e85e9de5a5633f95fe39f05a804ba84eebf303634ae1a13f7',
};
for (const [slug, h] of Object.entries(HTML_HASH))
  t('bai-viet/' + slug + '.html giong het v71 (sha256)', sha('bai-viet/' + slug + '.html') === h);

console.log(`v71: ${pass} PASS, ${fail} FAIL`);
process.exit(fail ? 1 : 0);
