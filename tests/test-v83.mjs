/* v83 tests — Node only, no browser. Cong cu "Tinh lai sau phi san 11.11"
   (hang 2 nghien cuu tang truong 07/11/2026; dac ta goc ghi v80 nhung so v80
   da dung — v81 fix mobile, v82 bai bo sung — nen ban nay la v83).
   Trang moi tinh-lai-1111.html (clone shell quy-tac-diem-thuong.html):
   6 truong nhap (gia ban / san / hoa hong / Voucher Xtra / logistics /
   gia von), JS tinh toan INLINE trong trang (khong them file js moi),
   cong thuc dung bang phi da kiem chung: phi giao dich 6%, hoa hong do
   nguoi dung nhap (mac dinh 12%, khoang 0-30%, KHONG bia ti le theo nganh),
   Voucher Xtra 4% toi da 50.000d (chi TikTok Shop), Lazada +3.000d phi ha
   tang, gia hoa von = gia von / (1 - 6% - hoa hong % - voucher %) + phi
   ha tang + logistics, lam tron len 1.000d. Link noi bo: bai
   tiktok-shop-1111-tinh-loi.html + trang chu (muc Tin tuc). sitemap 62 URL
   (61 cu + 1 trang moi); sw.js CACHE = 'v84-shell-1'. js/data.js KHONG doi
   (cong cu khong them bai moi). */
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let pass = 0, fail = 0;
function t(name, cond, extra = '') { if (cond) { pass++; console.log('PASS v83:', name); } else { fail++; console.log('FAIL v83:', name, extra); } }
const sha = f => crypto.createHash('sha256').update(fs.readFileSync(path.join(root, f))).digest('hex');
function norm(s) { return String(s || '').replace(/\s+/g, ' ').trim(); }
const BASE = 'https://ver2solution.github.io/mclivestream/';

// ---- data.js khong doi ----
const sb0 = { window: {}, module: { exports: {} }, console };
vm.createContext(sb0);
vm.runInContext(fs.readFileSync(path.join(root, 'js/data.js'), 'utf8'), sb0);
t('data.js khong doi: van 50 bai (cong cu khong them bai moi)', sb0.window.V20_DATA.articles.length === 50);

// ---- trang moi: ton tai + shell + SEO ----
const PAGE = 'tinh-lai-1111.html';
const p = path.join(root, PAGE);
t('page file exists: ' + PAGE, fs.existsSync(p));
const s = fs.readFileSync(p, 'utf8');
const TITLE = 'Tính lãi sau phí sàn 11.11: bán 100.000đ còn lãi bao nhiêu?';
t('h1 == title', norm((s.match(/<h1>(.*?)<\/h1>/s) || ['', ''])[1]) === TITLE);
t('title tag == title, 55-60 ky tu', s.includes('<title>' + TITLE + '</title>') && TITLE.length >= 55 && TITLE.length <= 60, TITLE.length + ' chars');
const meta = (s.match(/<meta name="description" content="([^"]*)">/) || [])[1] || '';
t('meta 150-160 chars', meta.length >= 150 && meta.length <= 160, meta.length + ' chars');
t('canonical == page URL', s.includes('<link rel="canonical" href="' + BASE + PAGE + '">'));
for (const tag of ['og:type" content="website"', 'og:site_name', 'og:title', 'og:description', 'og:image', 'og:url', 'og:locale" content="vi_VN"', 'og:image:width" content="1200"', 'og:image:height" content="630"', 'twitter:card" content="summary_large_image"', 'twitter:title', 'twitter:description', 'twitter:image', 'application/ld+json']) {
  t(tag + ' present', s.includes(tag));
}
t('og:url == page URL', s.includes('<meta property="og:url" content="' + BASE + PAGE + '">'));
const og = (s.match(/<meta property="og:image" content="([^"]+)">/) || [])[1] || '';
t('og:image == images/tinh-lai-1111-og.jpg', og === BASE + 'images/tinh-lai-1111-og.jpg', 'og=' + og);
t('twitter:image == og:image', s.includes('<meta name="twitter:image" content="' + og + '">'));
t('JSON-LD WebApplication (khong phai NewsArticle)', s.includes('"@type":"WebApplication"') && s.includes('"applicationCategory":"BusinessApplication"') && s.includes('"price":"0"'));
t('hero img local PNG + caption infographic tu lam',
  s.includes('src="images/tinh-lai-1111.png"') && s.includes('Infographic: Ver2Solution tự làm'));
const pngPath = path.join(root, 'images/tinh-lai-1111.png');
const pngBuf = fs.existsSync(pngPath) ? fs.readFileSync(pngPath) : Buffer.alloc(0);
const isPng = pngBuf.length > 24 && pngBuf.slice(0, 8).equals(Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]));
t('infographic PNG exists 1200x630', isPng && pngBuf.readUInt32BE(16) === 1200 && pngBuf.readUInt32BE(20) === 630, pngBuf.length + ' bytes');
const jpgPath = path.join(root, 'images/tinh-lai-1111-og.jpg');
const jpgBuf = fs.existsSync(jpgPath) ? fs.readFileSync(jpgPath) : Buffer.alloc(0);
t('og JPG exists, JPEG magic, >10KB', jpgBuf.length > 10000 && jpgBuf[0] === 0xFF && jpgBuf[1] === 0xD8 && jpgBuf[2] === 0xFF, jpgBuf.length + ' bytes');

// ---- shell: header/footer/FAB/scripts (giong quy-tac) ----
t('header co menuBtn + nav 5 muc', s.includes('id="menuBtn"') && s.includes('danh-sach-mau.html') && s.includes('danh-sach-shop.html') && s.includes('tin-tuc.html'));
t('footer co dung 1 foot-legal + du 4 link', (s.match(/class="foot-legal"/g) || []).length === 1
  && ['gioi-thieu.html', 'chinh-sach-bao-mat.html', 'dieu-khoan-su-dung.html', 'lien-he.html'].every(x => s.includes('<a href="' + x + '">')));
t('FAB Gop y co mat', s.includes('id="gopyFab"') && s.includes('id="gopyOverlay"') && s.includes('id="gopyForm"'));
t('load js/app.js truoc js/analytics.js', s.indexOf('js/app.js') !== -1 && s.indexOf('js/analytics.js') > s.indexOf('js/app.js'));
t('nut Dang Nhap co ?next=tinh-lai-1111.html', s.includes('dang-nhap.html?next=tinh-lai-1111.html'));

// ---- form: du 6 truong + mac dinh dung ----
for (const id of ['calcPrice', 'calcPlatform', 'calcCommission', 'calcLogistics', 'calcCost']) {
  t('input co mat: ' + id, s.includes('id="' + id + '"'));
}
t('Voucher Xtra: 2 radio co/khong, mac dinh khong', s.includes('name="calcVoucher" value="yes"') && s.includes('name="calcVoucher" value="no" checked'));
t('gia ban mac dinh 100000', s.includes('id="calcPrice"') && /id="calcPrice"[^>]*value="100000"/.test(s));
t('hoa hong mac dinh 12 (giua khoang 9-17,8%)', /id="calcCommission"[^>]*value="12"/.test(s) && s.includes('9–17,8% tùy ngành'));
t('san mac dinh TikTok Shop', s.includes('<option value="tiktok" selected>TikTok Shop</option>'));
t('ket qua: du id rTxn/rInfra/rCommission/rVoucher/rLogistics/rTotal/rNet/rProfit/rPct/rBreakeven',
  ['rTxn', 'rInfra', 'rCommission', 'rVoucher', 'rLogistics', 'rTotal', 'rNet', 'rProfit', 'rPct', 'rBreakeven'].every(id => s.includes('id="' + id + '"')));
t('cau ket luan + canh bao lo co mat', s.includes('id="calcConclusion"') && s.includes('id="calcWarning"') && s.includes('Giá này đang lỗ — tăng giá bán hoặc giảm phí.'));
t('ket luan mac dinh khop so mac dinh (gia 100k, TikTok, 12%, khong Voucher -> ve 82.000d)',
  s.includes('Bán 100.000đ, sau phí còn về ~82.000đ.'));
t('ghi chu uoc tinh tham khao co mat', s.includes('Kết quả là ước tính tham khảo theo mức phí đã công bố; phí thực tế theo thông báo của sàn cho từng shop/ngành.'));
t('bang phi tham khao: du 6 muc + nguon + ngay hieu luc',
  s.includes('6%') && s.includes('9–17,8%') && s.includes('tối đa 50.000đ/sản phẩm')
  && s.includes('3.000đ/đơn') && s.includes('40–50% doanh thu') && s.includes('19/10/2026') && s.includes('07/11/2026'));
t('callout Theo Ver2Solution: 3 goi y hanh dong', s.includes('<b>Theo Ver2Solution:</b>')
  && s.includes('tính lại giá') && s.includes('khung vàng 19h–23h') && s.includes('150 trở lên'));
t('link noi bo: bai tinh-loi 11.11 + bai tang phi + danh-sach-shop',
  s.includes('href="bai-viet/tiktok-shop-1111-tinh-loi.html"') && s.includes('href="bai-viet/ba-san-dong-loat-tang-phi-san.html"') && s.includes('href="danh-sach-shop.html"'));
t('chu ky chuan cuoi trang', s.includes('Ver2Solution.com — Kênh cập nhật tin tức thị trường và xu hướng kinh doanh online') && s.includes('032 998 3699'));

// ---- JS tinh toan: chay that trong vm ----
const inlineScripts = [...s.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]);
const calcSrc = inlineScripts.find(x => x.includes('V2SCalc'));
t('co 1 script inline chua V2SCalc', !!calcSrc);
t('script dung hang so phi da kiem chung (0.06 / 0.04 cap 50000 / Lazada 3000)',
  calcSrc.includes('price * 0.06') && calcSrc.includes('Math.min(price * 0.04, 50000)') && calcSrc.includes("platform === 'lazada' ? 3000 : 0"));
function mkEl() { return { value: '', textContent: '', innerHTML: '', style: {}, disabled: false, checked: false, addEventListener() {} }; }
const els = {};
const calcSb = { console };
calcSb.window = calcSb;
calcSb.document = {
  getElementById: id => (els[id] = els[id] || mkEl()),
  querySelector: () => null,
  querySelectorAll: () => [],
};
vm.createContext(calcSb);
vm.runInContext(calcSrc, calcSb);
const calc = calcSb.V2SCalc;
t('V2SCalc chay duoc trong vm', typeof calc === 'function');
if (typeof calc === 'function') {
  // (a) TikTok, gia 100.000, hoa hong 12%, co Voucher Xtra, logistics 0, gia von 50.000
  // (tinh tay: phi GD 6.000 + hoa hong 12.000 + Voucher 4.000 = 22.000; ve 78.000;
  //  lai 28.000; 28%; hoa von 50.000/0,78 = 64.102,56 -> 65.000)
  let r = calc(100000, 'tiktok', 12, true, 0, 50000);
  t('(a) phi giao dich 6000', r.txn === 6000, 'got ' + r.txn);
  t('(a) hoa hong 12000', r.commission === 12000, 'got ' + r.commission);
  t('(a) Voucher Xtra 4000', r.voucher === 4000, 'got ' + r.voucher);
  t('(a) tong phi 22000', r.total === 22000, 'got ' + r.total);
  t('(a) tien ve 78000', r.net === 78000, 'got ' + r.net);
  t('(a) lai rong 28000', r.profit === 28000, 'got ' + r.profit);
  t('(a) % lai 28', r.pct === 28, 'got ' + r.pct);
  t('(a) gia hoa von 65000', r.breakeven === 65000, 'got ' + r.breakeven);
  // (b) Shopee, gia 200.000, hoa hong 9%, khong Voucher, logistics 15.000, gia von 120.000
  // (tinh tay: 12.000 + 18.000 + 15.000 = 45.000; ve 155.000; lai 35.000; 17,5%;
  //  hoa von 120.000/0,85 + 15.000 = 156.176,47 -> 157.000)
  r = calc(200000, 'shopee', 9, false, 15000, 120000);
  t('(b) phi giao dich 12000', r.txn === 12000, 'got ' + r.txn);
  t('(b) hoa hong 18000', r.commission === 18000, 'got ' + r.commission);
  t('(b) Voucher 0', r.voucher === 0, 'got ' + r.voucher);
  t('(b) tong phi 45000', r.total === 45000, 'got ' + r.total);
  t('(b) tien ve 155000', r.net === 155000, 'got ' + r.net);
  t('(b) lai rong 35000', r.profit === 35000, 'got ' + r.profit);
  t('(b) % lai 17.5', r.pct === 17.5, 'got ' + r.pct);
  t('(b) gia hoa von 157000', r.breakeven === 157000, 'got ' + r.breakeven);
  // (c) Lazada, gia 150.000, hoa hong 15%, khong Voucher, logistics 3.000, khong gia von
  // (tinh tay: phi GD 9.000 + ha tang 3.000 + hoa hong 22.500 + logistics 3.000
  //  = 37.500; ve 112.500; khong lai rong / khong hoa von)
  r = calc(150000, 'lazada', 15, false, 3000, null);
  t('(c) phi giao dich 9000', r.txn === 9000, 'got ' + r.txn);
  t('(c) phi ha tang 3000', r.infra === 3000, 'got ' + r.infra);
  t('(c) hoa hong 22500', r.commission === 22500, 'got ' + r.commission);
  t('(c) tong phi 37500', r.total === 37500, 'got ' + r.total);
  t('(c) tien ve 112500', r.net === 112500, 'got ' + r.net);
  t('(c) khong lai rong khi chua nhap gia von', r.profit === null && r.pct === null && r.breakeven === null);
  // bien: Voucher cap 50.000; Voucher khong ap dung Shopee; hoa hong clamp 0-30
  r = calc(2000000, 'tiktok', 12, true, 0, null);
  t('Voucher Xtra cap 50000 (gia 2 trieu x 4% = 80000 -> 50000)', r.voucher === 50000, 'got ' + r.voucher);
  r = calc(100000, 'shopee', 12, true, 0, null);
  t('Voucher khong ap dung Shopee', r.voucher === 0, 'got ' + r.voucher);
  r = calc(100000, 'tiktok', 50, false, 0, null);
  t('hoa hong clamp toi da 30%', r.commission === 30000, 'got ' + r.commission);
  r = calc(100000, 'tiktok', 12, true, 0, 90000);
  t('lo khi gia von cao hon tien ve (profit am)', r.profit === -12000 && r.net === 78000, 'got profit ' + r.profit);
}

// ---- link noi bo tu bai 11.11 + trang chu ----
const lap = fs.readFileSync(path.join(root, 'bai-viet/tiktok-shop-1111-tinh-loi.html'), 'utf8');
t('bai tinh-loi 11.11 link toi cong cu', lap.includes('href="../tinh-lai-1111.html"'));
const idx = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
t('trang chu muc Tin tuc co nut cong cu tinh lai', idx.includes('href="tinh-lai-1111.html"') && idx.includes('Tính lãi sau phí sàn 11.11'));
t('trang chu van giu nut "Xem tất cả tin →"', idx.includes('Xem tất cả tin →'));

// ---- sitemap / sw.js ----
const sm = fs.readFileSync(path.join(root, 'sitemap.xml'), 'utf8');
const locs = [...sm.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1]);
t('sitemap has 62 urls (61 cu + 1 trang moi v83)', locs.length === 62, 'got ' + locs.length);
t('sitemap has tinh-lai-1111.html', locs.includes(BASE + PAGE));
t('sitemap has no duplicates', new Set(locs).size === locs.length);
const sw = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');
t("sw.js CACHE = 'v84-shell-1'", sw.includes("const CACHE = 'v84-shell-1';"));
t('sw.js (sha256)', sha('sw.js') === '609a81a1bdb77f85197f023f945af4a80acffaf408b450aa203c8d4c30926522');
console.log(`\nTOTAL v83: ${pass} PASS, ${fail} FAIL`);
if (fail) process.exitCode = 1;
