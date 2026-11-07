/* v76 tests — Node only, no browser. v76 = chuyen so lieu lo/xuong/thu mua/
   cho sang DEM TU DONG tu data.js nhu mau/shop (yeu cau nguoi dung
   06/11/2026 23:23: khoi phai dung cron cap nhat tay so PR trang chu):
   (1) data.js them 2 mang moi `lots` (14) + `factories` (40), chuyen NGUYEN
       VEN noi dung 14 the lo + 40 the xuong tu danh-sach-shop.html, khong
       bia them, khong doi noi dung.
   (2) danh-sach-shop.html: 4 luoi the tinh thanh container rong co id
       (lotGrid1/lotGrid2/lotGrid3/factoryGrid); app.js render the tu data.js
       (lotCardHTML/factoryCardHTML) + cap nhat dong dem (.lot-sub) + o loc
       tinh xuong (fFacProv) theo so lieu thuc te; HTML render ra GIONG HET
       the tinh cu (cung class, data-*, thu tu) nen bo loc + nut Xem them
       2 hang van chay y nhu cu.
   (3) trustStats/renderTrustStats tinh them 6 so lo/xuong tu data.js
       (lotCount/buyerCount/batchCount/factoryCount/factoryProvinceCount);
       so ghi cung trong index.html chi la du phong khi JS loi.
   (4) Quy tac 60 ngay CHI ap dung nhom 1 (lo si): lo co (ngay hien tai -
       ngay dang) > 60 ngay thi khong render, khong tinh vao so PR. Nhom 2
       (thu mua/ky gui), nhom 3 (cho/san/TTTM/chuong trinh) va xuong may
       khong gioi han thoi gian. Ngay trong data.js la ngay dang goc trong
       bai goc. Lo nhom 1 cu nhat hien tai: 12/10/2026 (Nguyen Thi Hue) —
       het han sau 11/12/2026.
   (5) sw.js CACHE = 'v76-shell-1'. KHONG deploy trong ban nay.
   LUU Y: test nay doc du lieu goc tu data.js (khong doc the tinh trong
   HTML nua) — cac test cu v55/v56/v57/v58/v60/v61/v64/v65/v67/v74 da
   duoc viet lai theo huong data-driven tuong ung. */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let pass = 0, fail = 0;
function t(name, cond, extra = '') { if (cond) { pass++; console.log('PASS v76:', name); } else { fail++; console.log('FAIL v76:', name, extra); } }
const sha = (p) => crypto.createHash('sha256').update(fs.readFileSync(path.join(root, p))).digest('hex');

// ---- load data.js + app.js trong vm (fake DOM toi thieu) ----
const sb = { window: {}, module: { exports: {} }, console, URLSearchParams, document: { getElementById: () => null, addEventListener: () => {}, querySelectorAll: () => [] } };
vm.createContext(sb);
vm.runInContext(fs.readFileSync(path.join(root, 'js/data.js'), 'utf8'), sb);
vm.runInContext(fs.readFileSync(path.join(root, 'js/app.js'), 'utf8'), sb);
const D = sb.window.V20_DATA;
const V = sb.window.V20;
const REF = new Date(2026, 10, 6); // 06/11/2026 — ngay chot so PR

// 13 lo goc (v55) + lot-14 (v83): [tieu de, ngay, doan URL nguon, nhom]
const LOTS = [
  ['Kho sỉ quần áo mới lẫn lộn — Lê Ngọc Thúy', '02/11/2026', 'ngocthuy.le.5095110', 1],
  ['Váy, chân váy, set — còn ~300 món — NaNa', '24/10/2026', 'pfbid02CQUBEsF1DzgsDCB7LJQURbSThijN3gEDsTiJM6rak9U7S4E1s1KoB1WVPiMuiWp6l', 1],
  ['Đóng cửa, xả lỗ toàn bộ kho — Thúy Nga', '19/10/2026', 'thuynga.0372472787', 1],
  ['Thanh lý toàn bộ kho mỹ phẩm (nghỉ bán sau hơn 2 năm) — Nguyễn Thy', '31/10/2026', 'Bolabongiuday.1204', 1],
  ['Mỹ phẩm thanh lý đồng giá 10.000đ', '22/10/2026', 'facebook.com/reel/1428443399349088', 1],
  ['Xả kho mỹ phẩm (son BBIA, Gucci mini, serum Transino…) — Trang Trần', '06/11/2026', 'trangtran8738', 1],
  ['Xả kho thời trang, chốt bằng mã sản phẩm — Thủy Top', '04/11/2026', 'thuytopthoitranggiare.official', 1],
  ['Kho quần áo mới còn tag (jeans, áo thun, jacket…) — Nguyễn Thị Huệ', '12/10/2026', 'pfbid01SKEM2DTK3TRrw3bbam114ZdgXBymt2wBcGCnFv4kmMEqGqSJCDAVxDJawzcrLVrl', 1],
  ['Tổng Kho Buôn Sỉ Tmark (TP.HCM) — thu mua hàng xả kho', '16/06/2025', 'tongkhobuonsi.com/dia-chi-mua-hang-xa-kho', 2],
  ['Thu Mua Tồn Kho 247 — thu mua mọi lô tồn kho', '15/09/2026', 'thumuatonkho247.com/dich-vu/', 2],
  ['Nhận thanh lý/ký gửi hàng tồn kho — Yumi Nguyễn Store', '10/10/2026', 'facebook.com/reel/1597587478048782', 2],
  ['Super Sale 30/10–5/11/2026 — MaxxSport', '28/10/2026', 'maxxsport.com.vn', 3],
  ['Thanh lý cuối mùa, hơn 1.000 mã — Made By Phuong', '25/10/2026', 'madebyphuong', 3],
  ['Xả kho giày si 99K–199K — Si Shoes 1996', '24/10/2026', 'youtube.com/watch?v=4byznxwITAU', 1],
];
const FACTORY_NAMES = ['Vinasilk', 'VICT', 'Trạch Xá', 'Dony', 'Yes', 'VAXY', 'TheNewCotton', 'Apis', 'Duy Nguyễn', 'Hoàng Phi', 'Chipi', 'Ninh Hiệp', 'VNXK', 'Mỹ Chi', 'MaiClothing', 'Sao Việt', 'Duy Minh', 'TBC', 'Sơn Nam', 'Vũ Phạm'];
const LABEL_LOT = 'Chưa xác thực — không phải lô chính hãng của thương hiệu';
const LABEL_FAC = 'Chưa xác thực — thông tin tổng hợp từ bài đăng công khai';

// ---- (A) data.js: lots + factories ----
t('data.js: co mang lots (14) + factories (40)', Array.isArray(D.lots) && D.lots.length === 14 && Array.isArray(D.factories) && D.factories.length === 40,
  `lots=${(D.lots || []).length} factories=${(D.factories || []).length}`);
t('data.js: du lieu cu nguyen ven (20 mau / 30 shop / 50 bai)', D.models.length === 20 && D.shops.length === 30 && D.articles.length === 50);
t('data.js lots: du 14 tieu de + ngay + link nguon goc (v55, tieu de la doan nhan dien)',
  LOTS.every(([title, date, urlFrag, g]) => D.lots.some(l => l.title.includes(title) && l.date === date && l.url.includes(urlFrag) && l.group === g)));
t('data.js lots: chia nhom 9/3/2',
  D.lots.filter(l => l.group === 1).length === 9 && D.lots.filter(l => l.group === 2).length === 3 && D.lots.filter(l => l.group === 3).length === 2);
t('data.js lots: moi lo du truong (id/group/title/price/priceNum/qty/cat/meta/date/dateLabel/label/url/linkText)',
  D.lots.every(l => ['id', 'group', 'title', 'price', 'priceNum', 'qty', 'cat', 'meta', 'date', 'dateLabel', 'label', 'url', 'linkText'].every(k => k in l)));
t('data.js lots: ngay dung dinh dang DD/MM/YYYY, nhan dung, linkText dung (2 mau goc: "Xem bài đăng gốc →" / "Xem trang gốc →")',
  D.lots.every(l => /^\d{2}\/\d{2}\/\d{4}$/.test(l.date) && l.label === LABEL_LOT && (l.linkText === 'Xem bài đăng gốc →' || l.linkText === 'Xem trang gốc →')));
t('data.js lots: khong trung tieu de', new Set(D.lots.map(l => l.title)).size === 14);
t('data.js factories: du 20 ten xuong goc (Vinasilk..Vu Pham)',
  FACTORY_NAMES.every(n => D.factories.some(f => f.name.includes(n))));
t('data.js factories: moi xuong du truong (id/name/items/meta/moq/cat/prov/date/dateLabel/label/url/linkText)',
  D.factories.every(f => ['id', 'name', 'items', 'meta', 'moq', 'cat', 'prov', 'date', 'dateLabel', 'label', 'url', 'linkText'].every(k => k in f)));
t('data.js factories: 7 tinh (TP.HCM 16 / Ha Noi 11 / Da Nang 3 / Binh Duong 5 / Nam Dinh 3 / Hung Yen 1 / Dong Nai 1)',
  ['TP.HCM', 'Hà Nội', 'Đà Nẵng', 'Bình Dương', 'Nam Định', 'Hưng Yên', 'Đồng Nai'].every(p => D.factories.filter(f => f.prov === p).length === { 'TP.HCM': 16, 'Hà Nội': 11, 'Đà Nẵng': 3, 'Bình Dương': 5, 'Nam Định': 3, 'Hưng Yên': 1, 'Đồng Nai': 1 }[p]));
t('data.js factories: nhan dung, linkText dung (2 mau goc: "Xem bài đăng gốc →" / "Xem trang gốc →")',
  D.factories.every(f => f.label === LABEL_FAC && (f.linkText === 'Xem bài đăng gốc →' || f.linkText === 'Xem trang gốc →')));
t('data.js factories: MOQ dung nguon (VICT 30, Apis 100, Chipi 300, My Chi tu 10)',
  D.factories.some(f => f.name.includes('VICT') && f.moq === 30)
  && D.factories.some(f => f.name.includes('Apis') && f.moq === 100)
  && D.factories.some(f => f.name.includes('Chipi') && f.moq === 300)
  && D.factories.some(f => f.name.includes('Mỹ Chi') && f.moq === 10));

// ---- (B) trustStats + quy tac 60 ngay ----
const st = V.trustStats(D.models, D.shops, D.lots, D.factories, REF);
t('trustStats 06/11/2026: 9 lo / 3 thu mua / 2 cho / 40 xuong / 7 tinh',
  st.lotCount === 9 && st.buyerCount === 3 && st.batchCount === 2 && st.factoryCount === 40 && st.factoryProvinceCount === 7, JSON.stringify(st));
t('trustStats: so mau/shop cu nguyen (20/30)', st.modelCount === 20 && st.shopCount === 30);
t('trustStats: goi 2 doi so (nhu test-v41) van chay, so lo/xuong = 0 khi khong truyen lots/factories',
  (() => { const s2 = V.trustStats(D.models, D.shops); return s2.modelCount === 20 && s2.lotCount === 0 && s2.factoryCount === 0; })());
t('lotActive: lo nhom 1 ngay 12/10/2026 con hieu luc dung 11/12/2026 (tron 60 ngay), het han 12/12/2026',
  V.lotActive(D.lots.find(l => l.date === '12/10/2026'), new Date(2026, 11, 11)) === true
  && V.lotActive(D.lots.find(l => l.date === '12/10/2026'), new Date(2026, 11, 12)) === false);
t('lotActive: lo nhom 2 ngay 16/06/2025 (Tmark, hon 1 nam) KHONG bi quy tac 60 ngay',
  V.lotActive(D.lots.find(l => l.group === 2), new Date(2027, 0, 15)) === true);
t('trustStats 15/01/2027: lo nhom 1 het han het (0), thu mua/cho/xuong giu nguyen (3/2/40/7)',
  (() => { const s3 = V.trustStats(D.models, D.shops, D.lots, D.factories, new Date(2027, 0, 15)); return s3.lotCount === 0 && s3.buyerCount === 3 && s3.batchCount === 2 && s3.factoryCount === 40 && s3.factoryProvinceCount === 7; })());
t('trustStats 12/12/2026: chi lo 12/10 het han (8 lo con lai)',
  V.trustStats(D.models, D.shops, D.lots, D.factories, new Date(2026, 11, 12)).lotCount === 8);

// ---- (C) Render the tu data.js khop noi dung goc ----
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
t('lotCardHTML: moi the lo render dung tieu de + gia + meta + ngay + nhan + link nguon',
  D.lots.every(l => { const h = V.lotCardHTML(l); return h.includes(esc(l.title)) && h.includes(esc(l.price)) && h.includes(esc(l.meta)) && h.includes(esc(l.dateLabel) + ': ' + esc(l.date)) && h.includes(esc(l.label)) && h.includes('href="' + esc(l.url) + '"') && h.includes('target="_blank"'); }));
t('lotCardHTML: the co dung class + data-price/data-qty/data-cat (bo loc dung duoc)',
  D.lots.every(l => { const h = V.lotCardHTML(l); return h.startsWith('<article class="lot-card" data-price="') && h.includes('data-qty="') && h.includes('data-cat="' + esc(l.cat) + '"'); }));
t('factoryCardHTML: moi the xuong render dung ten + mat hang + meta + ngay + nhan + link nguon',
  D.factories.every(f => { const h = V.factoryCardHTML(f); return h.includes(esc(f.name)) && h.includes(esc(f.items)) && h.includes(esc(f.meta)) && h.includes(esc(f.dateLabel) + ': ' + esc(f.date)) && h.includes(esc(f.label)) && h.includes('href="' + esc(f.url) + '"'); }));
t('factoryCardHTML: the co dung class + data-moq/data-cat/data-prov (bo loc dung duoc)',
  D.factories.every(f => { const h = V.factoryCardHTML(f); return h.startsWith('<article class="lot-card" data-moq="') && h.includes('data-cat="' + esc(f.cat) + '"') && h.includes('data-prov="' + esc(f.prov) + '"'); }));
t('render: tong 54 the (14 lo + 40 xuong), chia nhom 9/3/2',
  (() => { const g = V.lotsByGroup(D.lots, REF); return g.g1.length === 9 && g.g2.length === 3 && g.g3.length === 2; })());

// ---- (D) danh-sach-shop.html: container rong + dong dem fallback + bo loc ----
const shopHtml = fs.readFileSync(path.join(root, 'danh-sach-shop.html'), 'utf8');
t('Shop: khong con the lo/xuong TINH trong HTML (da chuyen het sang data.js)', !shopHtml.includes('<article class="lot-card"'));
t('Shop: co 4 container rong co id (lotGrid1/lotGrid2/lotGrid3/factoryGrid)',
  ['lotGrid1', 'lotGrid2', 'lotGrid3', 'factoryGrid'].every(id => shopHtml.includes('<div class="lot-grid" id="' + id + '"></div>')));
t('Shop: 4 dong dem fallback van co id + so cu (lotSub1/2/3, factorySub)',
  shopHtml.includes('<p class="lot-sub" id="lotSub1">Doanh nghiệp và shop xả hàng tồn kho theo lô sỉ — đang có 8 lô.</p>')
  && shopHtml.includes('id="lotSub2"') && shopHtml.includes('Đang có 3 đơn vị.')
  && shopHtml.includes('id="lotSub3"') && shopHtml.includes('Đang có 2 chương trình.')
  && shopHtml.includes('<p class="lot-sub" id="factorySub">') && shopHtml.includes('đang có 20 xưởng/nhà máy.'));
t('Shop: section lo + xuong van collapsed + nut Xem them + dong mien tru',
  shopHtml.includes('<section class="lot-section collapsed" id="lo-hang-xa-kho"')
  && shopHtml.includes('<section class="lot-section collapsed" id="xuong-may-gia-cong"')
  && shopHtml.includes('id="lotMoreBtn"') && shopHtml.includes('id="factoryMoreBtn"')
  && shopHtml.includes('Miễn trừ trách nhiệm: Thông tin được tổng hợp từ bài đăng công khai của cộng đồng, giữ nguyên nội dung gốc.'));
t('Shop: o loc tinh xuong (fFacProv) van co option tinh ghi cung lam fallback',
  shopHtml.includes('id="fFacProv"') && shopHtml.includes('<option value="TP.HCM">TP. Hồ Chí Minh (8)</option>'));

// ---- (E) renderLotSections voi fake DOM: dien dung vao grid + dong dem + option tinh ----
const grids = {};
['lotGrid1', 'lotGrid2', 'lotGrid3', 'factoryGrid'].forEach(id => { grids[id] = { innerHTML: '' }; });
const subs = {};
['lotSub1', 'lotSub2', 'lotSub3', 'factorySub'].forEach(id => { subs[id] = { textContent: '' }; });
const sel = { innerHTML: '' };
sb.document = { getElementById: (id) => grids[id] || subs[id] || (id === 'fFacProv' ? sel : null), addEventListener: () => {}, querySelectorAll: () => [] };
V.renderLotSections(REF);
t('renderLotSections: grid du 9/3/2/40 the',
  (grids.lotGrid1.innerHTML.match(/lot-card/g) || []).length === 9
  && (grids.lotGrid2.innerHTML.match(/lot-card/g) || []).length === 3
  && (grids.lotGrid3.innerHTML.match(/lot-card/g) || []).length === 2
  && (grids.factoryGrid.innerHTML.match(/lot-card/g) || []).length === 40);
t('renderLotSections: dong dem cap nhat theo so lieu thuc te',
  subs.lotSub1.textContent.includes('đang có 9 lô.') && subs.lotSub2.textContent.includes('Đang có 3 đơn vị.')
  && subs.lotSub3.textContent.includes('Đang có 2 chương trình.') && subs.factorySub.textContent.includes('đang có 40 xưởng/nhà máy.'));
t('renderLotSections: o loc tinh xuong dung lai theo so xuong thuc te tung tinh',
  sel.innerHTML.includes('<option value="TP.HCM">TP. Hồ Chí Minh (16)</option>')
  && sel.innerHTML.includes('<option value="Hà Nội">Hà Nội (11)</option>')
  && sel.innerHTML.includes('<option value="Đà Nẵng">Đà Nẵng (3)</option>')
  && sel.innerHTML.includes('<option value="Bình Dương">Bình Dương (5)</option>')
  && sel.innerHTML.includes('<option value="Nam Định">Nam Định (3)</option>')
  && sel.innerHTML.includes('<option value="Hưng Yên">Hưng Yên (1)</option>')
  && sel.innerHTML.includes('<option value="Đồng Nai">Đồng Nai (1)</option>'));
t('renderLotSections: the render vao grid khop noi dung goc (tieu de + link nguon)',
  LOTS.every(([title, , urlFrag]) => grids.lotGrid1.innerHTML.includes(esc(title)) || grids.lotGrid2.innerHTML.includes(esc(title)) || grids.lotGrid3.innerHTML.includes(esc(title)))
  && FACTORY_NAMES.every(n => grids.factoryGrid.innerHTML.includes(esc(n))));

// ---- (F) index.html: so ghi cung chi la du phong; app.js export day du ----
const indexHtml = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
t('index.html: so ghi cung van co (du phong khi JS loi): 8/3/2/20/6',
  indexHtml.includes('<b id="trustLots">8</b>') && indexHtml.includes('<b id="trustBuyers">3</b>')
  && indexHtml.includes('<b id="trustBatch">2</b>') && indexHtml.includes('<b id="trustFactories">20</b>')
  && indexHtml.includes('<b id="trustFactoryProvinces">6</b>'));
t('index.html: cau PR "400+ khach livestream" khong doi',
  indexHtml.includes('<b>400+</b>'));
t('app.js: export day du ham moi qua window.V20',
  ['parseVnDate', 'lotActive', 'lotsByGroup', 'lotFactoryStats', 'lotCardHTML', 'factoryCardHTML', 'renderLotSections'].every(k => typeof V[k] === 'function'));
t('app.js: initShops goi renderLotSections TRUOC initLotFilter/initFactoryFilter',
  (() => { const src = fs.readFileSync(path.join(root, 'js/app.js'), 'utf8'); const start = src.indexOf('function initShops(){'); const r = src.indexOf('renderLotSections();', start); const l = src.indexOf('initLotFilter()', start); const f = src.indexOf('initFactoryFilter()', start); return start > -1 && r > -1 && l > -1 && f > -1 && r < l && r < f; })());
t('app.js: comment ghi ro quy tac 60 ngay chi ap dung nhom 1',
  fs.readFileSync(path.join(root, 'js/app.js'), 'utf8').includes('chi ap dung nhom 1'));

// ---- (G) CACHE + hash khoa file da doi (v76) ----
const swJs = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');
t("sw.js CACHE = 'v84-shell-1'", swJs.includes("const CACHE = 'v84-shell-1';"));
t("sw.js khong con cache cu (v75)", !swJs.includes('v75-shell-1'));
t("sw.js: ghi chu dau file van la v60 (theo quy tac cu)", swJs.includes('/* v60 service worker'));
t('js/data.js giong het v76 (them lots + factories) (sha256)', sha('js/data.js') === '642a8e3fdb09f0d23d363741692f3da7106586aff84dd47d1bc81613b514fc57');
t('js/app.js giong het v76 (render lo/xuong + trustStats mo rong) (sha256)', sha('js/app.js') === 'e3f5c43293d2b71f2fd0b804a31ce4a4a88f47a83bfdab607eab5ee75467b072');
t('danh-sach-shop.html giong het v76 (4 grid rong + id dong dem) (sha256)', sha('danh-sach-shop.html') === 'c5abd47006c2c86393dca16fa16e549b8f37a1e65b099fefbfaa1723e23b6818');
t('sw.js giong het v76 (CACHE v84-shell-1) (sha256)', sha('sw.js') === '609a81a1bdb77f85197f023f945af4a80acffaf408b450aa203c8d4c30926522');

console.log(`\nv76: ${pass} PASS, ${fail} FAIL`);
process.exit(fail ? 1 : 0);
