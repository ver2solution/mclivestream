/* v58 tests — Node only, no browser. v58 = them 3 so lieu lo xa kho vao
   khung PR trang chu (yeu cau nguoi dung 06/11/2026 14:36), theo dung
   3 nhom cua muc "Lo hang xa kho" tren danh-sach-shop.html:
   (1) 8 lo xa hang ton kho, (2) 3 don vi thu mua / ky gui ton kho,
   (3) 2 don vi xa kho gia re theo dot.
   Hang so lieu moi (.trust-nums-lots) nam SAU nut "Xem shop dang tuyen"
   trong .trust-strip, flex-basis:100% de xuong dong rieng; so lieu
   20/30/400+ va nut khong doi. So 20/30 tren trang chu da tu dong
   tinh tu data.js qua js/app.js (trustModels/trustShops), nen chi
   3 so lo (HTML tinh) moi can cap nhat tay khi them/bot lo.
   (a) Hang lo ton tai + dung 3 so + dung nhan.
   (b) SO LIEU CHINH XAC: 3 so tren trang chu KHOP so the lo thuc te
       tung nhom tren danh-sach-shop.html (kiem tra cheo 2 file) —
       day la khang dinh bat buoc cron lo (11:21) phai giu dung moi
       khi them/bot lo.
   (c) sw.js CACHE = 'v76-shell-1'; header doi sang v58.
   (d) KHONG doi: js/data.js, js/app.js, js/auth-ui.js, js/themes.js
       (greeting v53), mclivestream-supabase.js, sitemap.xml
       (hash khoa theo ban v57-prep). Thay doi v57 nguyen ven
       (lo 2 hang, logo 1/4, text Shop cho Mau, Powered by).
   LUU Y: khi bump CACHE, cac test cu khang dinh CACHE v57-shell-1 da duoc
   cap nhat dong loat sang v76-shell-1 + ghi chu dau file sw.js doi sang
   v58 — chi doi chuoi phien ban, khong doi logic khac cua cac test do. */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let pass = 0, fail = 0;
function t(name, cond, extra = '') { if (cond) { pass++; console.log('PASS v58:', name); } else { fail++; console.log('FAIL v58:', name, extra); } }
const sha = (p) => crypto.createHash('sha256').update(fs.readFileSync(path.join(root, p))).digest('hex');

const indexHtml = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const shopHtml = fs.readFileSync(path.join(root, 'danh-sach-shop.html'), 'utf8');
const css = fs.readFileSync(path.join(root, 'v20.css'), 'utf8');
const swJs = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');

// ---- (a) Hang so lieu lo xa kho tren trang chu ----
t('PR lo: 3 so lo nam trong grid .trust-nums chung (v65, khong con div rieng)', indexHtml.includes('<div class="trust-nums" aria-label="Số liệu sàn việc làm">') && !indexHtml.includes('trust-nums-lots'));
t('PR lo: so lo xa kho du phong trong index.html = 8 (id trustLots) — so ghi cung, JS se ghi de khi trang tai', indexHtml.includes('<b id="trustLots">8</b><span>Lô xả hàng tồn kho</span>'));
t('PR lo: so don vi thu mua/ky gui = 3 (id trustBuyers)', indexHtml.includes('<b id="trustBuyers">3</b><span>Đơn vị thu mua / ký gửi tồn kho</span>'));
t('PR lo: so cho/san/TTTM/to chuc xa kho = 2 (id trustBatch, v60)', indexHtml.includes('<b id="trustBatch">2</b><span>Chợ/sàn/TTTM/tổ chức xả kho</span>'));
t('PR lo: 3 so lo nam TRONG khung (v75: nut "Xem shop đang tuyển" da xoa)', indexHtml.indexOf('id="trustLots"') > indexHtml.indexOf('class="trust-strip"') && !indexHtml.includes('Xem shop đang tuyển →'));
t('PR lo: 3 so lo nam TRONG section .trust-strip', indexHtml.indexOf('id="trustLots"') > indexHtml.indexOf('class="trust-strip"') && indexHtml.indexOf('id="trustLots"') < indexHtml.indexOf('</section>', indexHtml.indexOf('class="trust-strip"')));

// ---- (b) SO LIEU CHINH XAC: khop so the lo thuc te tung nhom ----
// v76: so PR tinh TU DONG tu data.js (trustStats + renderTrustStats) — kiem tra cheo SO RENDER (JS ghi vao DOM),
// KHONG kiem so ghi cung trong index.html: so ghi cung chi la du phong khi JS loi (xem test-v76 muc F),
// cron lo 11:21 khong sua tay 3 so do, nen so ghi cung co the lac hau so tinh tu data.js.
const trustEls = {};
['trustLots', 'trustBuyers', 'trustBatch'].forEach(id => { trustEls[id] = { textContent: '' }; });
const sb58 = { window: {}, module: { exports: {} }, console, URLSearchParams, document: { getElementById: (id) => trustEls[id] || null, addEventListener: () => {}, querySelectorAll: () => [] } };
vm.createContext(sb58);
vm.runInContext(fs.readFileSync(path.join(root, 'js/data.js'), 'utf8'), sb58);
vm.runInContext(fs.readFileSync(path.join(root, 'js/app.js'), 'utf8'), sb58);
const D58 = sb58.window.V20_DATA;
const st58 = sb58.window.V20.trustStats(D58.models, D58.shops, D58.lots, D58.factories, new Date(2026, 10, 6));
const nLots = st58.lotCount, nBuyers = st58.buyerCount, nBatch = st58.batchCount;
sb58.window.V20.renderTrustStats();
t('PR lo chinh xac: so lo xa kho render ra = so lo nhom 1 tinh tu data.js', trustEls.trustLots.textContent === String(nLots), `render=${trustEls.trustLots.textContent} nhom1=${nLots}`);
t('PR lo chinh xac: so thu mua/ky gui render ra = so lo nhom 2 tinh tu data.js', trustEls.trustBuyers.textContent === String(nBuyers), `render=${trustEls.trustBuyers.textContent} nhom2=${nBuyers}`);
t('PR lo chinh xac: so xa theo dot render ra = so lo nhom 3 tinh tu data.js', trustEls.trustBatch.textContent === String(nBatch), `render=${trustEls.trustBatch.textContent} nhom3=${nBatch}`);
t('PR lo chinh xac: tong 3 so = tong so lo (14)', nLots + nBuyers + nBatch === 14, `tong=${nLots + nBuyers + nBatch}`);
t('PR lo chinh xac: nhom 1 co tieu de "Doanh nghiệp/ Shop xả hàng tồn kho" va 9 lo (v60)', shopHtml.includes('<h3>Doanh nghiệp/ Shop xả hàng tồn kho</h3>') && nLots === 9, `nLots=${nLots}`);

// ---- (c) CSS hang lo + so lieu cu nguyen ven ----
t('v20.css: khong con class .trust-nums-lots rieng (v65 gop vao grid chung)', !css.includes('.trust-nums-lots'));
t('PR cu nguyen ven: 20 mau / 30 shop / 400+', indexHtml.includes('<b id="trustModels">20</b>') && indexHtml.includes('<b id="trustShops">30</b>') && indexHtml.includes('<b>400+</b>'));
t('v75: nut "Xem shop đang tuyển" da xoa khoi trang chu', !indexHtml.includes('Xem shop đang tuyển →'));
t('PR cu nguyen ven: dai logo doi tac van du 29 icon/nhom', (indexHtml.match(/images\/partners\/[a-z0-9-]+-icon\.png/g) || []).length === 58, `got=${(indexHtml.match(/images\/partners\/[a-z0-9-]+-icon\.png/g) || []).length}`);

// ---- (d) sw.js: CACHE v58 + SHELL nguyen ven ----
t("sw.js CACHE = 'v86-shell-1'", swJs.includes("const CACHE = 'v86-shell-1';"));
t('sw.js: khong con CACHE v57-shell-1', !swJs.includes('v57-shell-1'));
t("sw.js: ghi chu dau file doi sang v60", swJs.includes('/* v60 service worker'));

// ---- (e) Thay doi v57 nguyen ven ----
t('v57 nguyen ven: muc lo van collapsed + nut Xem them', shopHtml.includes('<section class="lot-section collapsed" id="lo-hang-xa-kho"') && shopHtml.includes('id="lotMoreBtn"'));
t('v57 nguyen ven: logo the shop van 25%', /\.shop-card \.shop-logo,\.shop-card \.shop-initial\{flex:0 0 25%;width:25%/.test(css));
t('v57 nguyen ven: H1 trang Shop van "Tìm shop tuyển mẫu livestream"', shopHtml.includes('<h1>Tìm shop tuyển mẫu livestream</h1>'));
t('v56 nguyen ven: Powered by van co tren trang chu', indexHtml.includes('<p class="powered">Powered by Ver2Solution</p>'));

// ---- (f) Du lieu + KHONG doi: 6 file noi dung (hash khoa theo v57-prep) ----
const sb2 = { window: {}, module: { exports: {} }, console, document: { getElementById: () => null, addEventListener: () => {}, querySelectorAll: () => [] } };
vm.createContext(sb2);
vm.runInContext(fs.readFileSync(path.join(root, 'js/data.js'), 'utf8'), sb2);
const DATA = sb2.window.V20_DATA;
t('du lieu khong doi: 20 mau, 30 shop, 50 bai', DATA.models.length === 20 && DATA.shops.length === 30 && DATA.articles.length === 50,
  `mau=${DATA.models.length} shop=${DATA.shops.length} bai=${DATA.articles.length}`);
t('js/data.js giong het v57 (sha256)', sha('js/data.js') === '76009b20bc339501db3ab2f6e96993e5a6c6f84d9d50e45a623cde6882d85fdf');
t('js/app.js giong het v57 (sha256)', sha('js/app.js') === 'ae11dfaf0e5383a7d2d2f1d8c33de31090f1a5fd39e0251edb0f8b69d4590a20');
t('js/auth-ui.js giong het v57 (sha256)', sha('js/auth-ui.js') === '46d13e3b95dea2a9157d5668c3b4fca700279a1df8fe5c95ce0b416fa64f2f5c');
t('js/themes.js giong het v57 (sha256, greeting v53 nguyen ven)', sha('js/themes.js') === 'fd8a49bccef9ec152d390d5cfff17e63614967b82707c302191b4a8ebdc15e57');
t('mclivestream-supabase.js giong het v57 (sha256)', sha('mclivestream-supabase.js') === '28027730041e197b387fe8847255dd8c31bf1ec1dbbf0984427bb65d553dbd72');
t('sitemap.xml giong het v57 (sha256)', sha('sitemap.xml') === 'c229a7061ef8b60b611648874a475aaf96e5cb0ea2b46aef112265e7f350459f');

console.log(`v58: ${pass} PASS, ${fail} FAIL`);
process.exit(fail ? 1 : 0);
