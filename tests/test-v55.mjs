/* v55 tests — Node only, no browser. v55 = them muc "Lo hang xa kho" len
   trang danh-sach-shop.html (yeu cau nguoi dung 06/11/2026, chien luoc
   chot 14:01: giup doanh nghiep xa hang ton kho thu ve von tai san xuat):
   (1) Muc moi id="lo-hang-xa-kho", dat o KHU VUC TOP trang shop — ngay
       tren danh sach shop (sau phan tieu de/gioi thieu trang, truoc
       #publicShopsList). 13 muc: 8 lo hang xa kho + 3 don vi thu mua /
       ky gui ton kho + 2 chuong trinh xa kho theo dot (ban le tung mon,
       khong phai lo si). Nguon duy nhat: bao cao nghien cuu
       research_notes/xa-hang-ton-kho-thoi-trang-my-pham-20261106-0650/
       report.md (§4B/§4C/§4E). CHI dung lo CO link nguon + ngay dang cu
       the trong bao cao; KHONG bia them lo, KHONG gan lo cho thuong hieu
       lon (20 thuong hieu v54), KHONG ghi gia/so luong khong co trong
       bao cao.
   (2) Moi the lo: ten/mat hang, gia (hoac "khong cong khai"), so luong /
       toi thieu tach lo neu co, nguon (ten + link bai goc, target=_blank),
       ngay dang, va NHAN "Chua xac thuc — khong phai lo chinh hang cua
       thuong hieu" (moi the, vi tat ca deu tu kenh phi chinh thuc).
   (3) v20.css: them style .lot-section/.lot-grid/.lot-card/.lot-price/
       .lot-label (khop phong cach hien tai: the trang bo tron, vien
       --line, bong --sh); luoi 3 cot desktop, 2 cot <=1000px, 1 cot
       <=600px (khop .shop-grid).
   (4) sw.js CACHE = 'v76-shell-1' (doi theo quy tac moi lan deploy doi
       data.js/app.js/v20.css); SHELL giu nguyen (khong them file moi).
   (5) KHONG doi: js/data.js, js/app.js, js/auth-ui.js, js/themes.js
       (greeting v53), mclivestream-supabase.js, sitemap.xml, cac trang
       khac (hash khoa theo ban v54-prep). Danh sach shop van du 30.
   LUU Y (tien le v25/v26): khi bump CACHE, cac test cu khang dinh
   CACHE v54-shell-1 da duoc cap nhat dong loat sang v76-shell-1
   (test-v35/v37/v38/v39/v40/v41/v42/v43/v44/v45/v46/v47/v52/v53/v54)
   — chi doi chuoi phien ban cache, khong doi logic khac cua cac test do. */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let pass = 0, fail = 0;
function t(name, cond, extra = '') { if (cond) { pass++; console.log('PASS v55:', name); } else { fail++; console.log('FAIL v55:', name, extra); } }
const sha = (p) => crypto.createHash('sha256').update(fs.readFileSync(path.join(root, p))).digest('hex');

const LABEL = 'Chưa xác thực — không phải lô chính hãng của thương hiệu';
// 14 muc: [tieu de (doan nhan dien), ngay hien thi, doan URL nguon]
const LOTS = [
  ['Kho sỉ quần áo mới lẫn lộn — Lê Ngọc Thúy', '02/11/2026', 'ngocthuy.le.5095110'],
  ['Váy, chân váy, set — còn ~300 món — NaNa', '24/10/2026', 'pfbid02CQUBEsF1DzgsDCB7LJQURbSThijN3gEDsTiJM6rak9U7S4E1s1KoB1WVPiMuiWp6l'],
  ['Đóng cửa, xả lỗ toàn bộ kho — Thúy Nga', '19/10/2026', 'thuynga.0372472787'],
  ['Thanh lý toàn bộ kho mỹ phẩm (nghỉ bán sau hơn 2 năm) — Nguyễn Thy', '31/10/2026', 'Bolabongiuday.1204'],
  ['Mỹ phẩm thanh lý đồng giá 10.000đ', '22/10/2026', 'facebook.com/reel/1428443399349088'],
  ['Xả kho mỹ phẩm (son BBIA, Gucci mini, serum Transino…) — Trang Trần', '06/11/2026', 'trangtran8738'],
  ['Xả kho thời trang, chốt bằng mã sản phẩm — Thủy Top', '04/11/2026', 'thuytopthoitranggiare.official'],
  ['Kho quần áo mới còn tag (jeans, áo thun, jacket…) — Nguyễn Thị Huệ', '12/10/2026', 'pfbid01SKEM2DTK3TRrw3bbam114ZdgXBymt2wBcGCnFv4kmMEqGqSJCDAVxDJawzcrLVrl'],
  ['Tổng Kho Buôn Sỉ Tmark (TP.HCM) — thu mua hàng xả kho', '16/06/2025', 'tongkhobuonsi.com/dia-chi-mua-hang-xa-kho'],
  ['Thu Mua Tồn Kho 247 — thu mua mọi lô tồn kho', '15/09/2026', 'thumuatonkho247.com/dich-vu/'],
  ['Nhận thanh lý/ký gửi hàng tồn kho — Yumi Nguyễn Store', '10/10/2026', 'facebook.com/reel/1597587478048782'],
  ['Super Sale 30/10–5/11/2026 — MaxxSport', '28/10/2026', 'maxxsport.com.vn'],
  ['Thanh lý cuối mùa, hơn 1.000 mã — Made By Phuong', '25/10/2026', 'madebyphuong'],
  ['Xả kho giày si 99K–199K — Si Shoes 1996', '24/10/2026', 'youtube.com/watch?v=4byznxwITAU'],
];
// 20 thuong hieu lon v54 — KHONG duoc gan lo nao cho ho.
const BIG_BRANDS = ['Cocoon', 'Cỏ Mềm Homelab', 'Sao Thái Dương', 'Thorakao', 'M.O.I Cosmetics', 'Lemonade', 'Emmié', 'OFÉLIA', 'Lagumi', 'Vedette', 'Coolmate', 'Canifa', 'IVY Moda', 'Yody', 'Juno', 'Vascara', 'SSStutter', 'Routine', 'Degrey', 'Couple TX'];

const shopHtml = fs.readFileSync(path.join(root, 'danh-sach-shop.html'), 'utf8');
const css = fs.readFileSync(path.join(root, 'v20.css'), 'utf8');
const swJs = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');
const lotStart = shopHtml.indexOf('id="lo-hang-xa-kho"');
const lotEnd = shopHtml.indexOf('</section>', lotStart);
const lotSection = lotStart > -1 && lotEnd > -1 ? shopHtml.slice(lotStart, lotEnd) : '';

// ---- (a) Muc lo hang: ton tai + dung vi tri top (truoc danh sach shop) ----
t('danh-sach-shop.html: co muc id="lo-hang-xa-kho"', lotStart > -1);
t('muc lo hang: tieu de h2 "Lô hàng xả kho"', shopHtml.includes('<h2 id="lot-title">Lô hàng xả kho</h2>'));
t('muc lo hang: nam SAU tieu de trang (h1 "Tìm shop tuyển mẫu livestream", v57)', lotStart > shopHtml.indexOf('<h1>Tìm shop tuyển mẫu livestream</h1>'));
t('muc lo hang: nam TRUOC danh sach shop (#publicShopsList)', lotStart > -1 && lotStart < shopHtml.indexOf('id="publicShopsList"'));
t('muc lo hang: co dong gioi thieu muc dich (xa hang thu von tai san xuat)', lotSection.includes('thu về vốn tái sản xuất'));
t('muc lo hang: co dong mien tru nguyen van giong web (tong hop tu bai dang cong khai)', lotSection.includes('Miễn trừ trách nhiệm: Thông tin được tổng hợp từ bài đăng công khai của cộng đồng, giữ nguyên nội dung gốc.'));

// ---- (b) 13 lo, chia 3 nhom dung so luong (v76: the render tu data.js, khong con the tinh trong HTML) ----
// v76: danh-sach-shop.html chi con container rong (lotGrid1/2/3) — so luong kiem tra tren data.js, the render kiem tra o test-v76.
const sb55 = { window: {}, module: { exports: {} }, console, URLSearchParams, document: { getElementById: () => null, addEventListener: () => {}, querySelectorAll: () => [] } };
vm.createContext(sb55);
vm.runInContext(fs.readFileSync(path.join(root, 'js/data.js'), 'utf8'), sb55);
vm.runInContext(fs.readFileSync(path.join(root, 'js/app.js'), 'utf8'), sb55);
const LOTS_DATA = sb55.window.V20_DATA.lots;
const V55 = sb55.window.V20;
t('muc lo hang: dung 14 lo trong data.js', LOTS_DATA.length === 14, `got=${LOTS_DATA.length}`);
t('nhom 1 "Doanh nghiệp/ Shop xả hàng tồn kho": dung 9 lo', LOTS_DATA.filter(l => l.group === 1).length === 9);
t('nhom 2 "Đơn vị thu mua / ký gửi tồn kho": dung 3 lo', LOTS_DATA.filter(l => l.group === 2).length === 3);
t('nhom 3 "Chợ/ Sàn/ TTTM/ Tổ chức xả kho": dung 2 lo', LOTS_DATA.filter(l => l.group === 3).length === 2);
t('muc lo hang: HTML chi con container rong lotGrid1/2/3 (khong con the tinh)', shopHtml.includes('<div class="lot-grid" id="lotGrid1"></div>') && shopHtml.includes('<div class="lot-grid" id="lotGrid2"></div>') && shopHtml.includes('<div class="lot-grid" id="lotGrid3"></div>') && !lotSection.includes('<article class="lot-card"'));

// ---- (c) Moi lo: du tieu de + ngay + link nguon (target=_blank) + nhan (v76: kiem tra tren the render tu data.js) ----
LOTS.forEach(([title, date, urlFrag]) => {
  const l = LOTS_DATA.find(x => x.title.includes(title));
  t(`lo co tieu de + ngay + link nguon: ${title.slice(0, 40)}…`, !!l && l.date === date && l.url.includes(urlFrag));
});
const cards = LOTS_DATA.map(l => V55.lotCardHTML(l));
cards.forEach((c, i) => {
  t(`the ${i + 1}: co link https mo tab moi (target="_blank" + rel="noopener")`, /href="https:\/\/[^"]+" target="_blank" rel="noopener"/.test(c));
  t(`the ${i + 1}: co ngay dang/cap nhat (DD/MM/YYYY)`, /(Ngày đăng|Cập nhật): \d{2}\/\d{2}\/\d{4}/.test(c));
  t(`the ${i + 1}: co nhan "${LABEL}"`, c.includes(LABEL));
  t(`the ${i + 1}: co gia (class lot-price)`, c.includes('class="lot-price"'));
});
t('moi lo deu co nhan chua xac thuc (14/14)', LOTS_DATA.filter(l => l.label === LABEL).length === 14);

// ---- (d) KHONG gan lo cho thuong hieu lon (20 thuong hieu v54) ----
BIG_BRANDS.forEach((b) => t(`muc lo hang: KHONG nhac thuong hieu lon "${b}"`, !lotSection.includes(b)));
t('muc lo hang: KHONG ghi "H.M" (tranh gan lo cho thuong hieu)', !lotSection.includes('H.M'));

// ---- (e) Danh sach shop nguyen ven (30 shop, loc, phan trang) ----
t('trang shop: dong dem 30 shop da xoa o v62, H1 van nguyen', !shopHtml.includes('30 shop đang tuyển mẫu') && shopHtml.includes('<h1>Tìm shop tuyển mẫu livestream</h1>'));
t('trang shop: van co #publicShopsList + #shopPager', shopHtml.includes('id="publicShopsList"') && shopHtml.includes('id="shopPager"'));
t('trang shop: van co bo loc shop (fShopProv, fShopCat, fShopSort)', shopHtml.includes('id="fShopProv"') && shopHtml.includes('id="fShopCat"') && shopHtml.includes('id="fShopSort"'));
t('trang shop: menu van du 5 muc', ['Trang chủ', 'Dành cho Mẫu', 'Dành cho Shop', 'Tin tức', 'Hỏi đáp'].every((m) => shopHtml.includes(`>${m}<`)));
const sb2 = { window: {}, module: { exports: {} }, console, document: { getElementById: () => null, addEventListener: () => {}, querySelectorAll: () => [] } };
vm.createContext(sb2);
vm.runInContext(fs.readFileSync(path.join(root, 'js/data.js'), 'utf8'), sb2);
const DATA = sb2.window.V20_DATA;
t('du lieu khong doi: 20 mau, 30 shop, 50 bai', DATA.models.length === 20 && DATA.shops.length === 30 && DATA.articles.length === 50,
  `mau=${DATA.models.length} shop=${DATA.shops.length} bai=${DATA.articles.length}`);

// ---- (f) KHONG doi: 6 file noi dung + 10 trang (hash khoa theo v54-prep) ----
t('js/data.js giong het v54 (sha256)', sha('js/data.js') === '642a8e3fdb09f0d23d363741692f3da7106586aff84dd47d1bc81613b514fc57');
t('js/app.js giong het v54 (sha256)', sha('js/app.js') === 'e3f5c43293d2b71f2fd0b804a31ce4a4a88f47a83bfdab607eab5ee75467b072');
t('js/auth-ui.js giong het v54 (sha256)', sha('js/auth-ui.js') === '5fec3b5f2f9ea100fe516565beef2ec6aeb63fe12ac0bac8403668da1da8fdfa');
t('js/themes.js giong het v54 (sha256, greeting v53 nguyen ven)', sha('js/themes.js') === 'fd8a49bccef9ec152d390d5cfff17e63614967b82707c302191b4a8ebdc15e57');
t('mclivestream-supabase.js giong het v54 (sha256)', sha('mclivestream-supabase.js') === '34e9c41f46aed58e4561c527995ceaec467c13d5bd22531edf0a1ffa19abb1bc');
t('sitemap.xml giong het v54 (sha256)', sha('sitemap.xml') === 'a5253c4d14a1de2e1095db28a6b9b75998ffaa3af5e3726d1b4f819485fd39f5');
t('index.html giong het v60 (FAQ lo 60 ngay + ten nhom lo moi + nhan PR nhom 3 + 2 loai tai khoan) (sha256, dai logo 29 logo/nhom nguyen ven)', sha('index.html') === '27ec4c15cc98c68650084b12de7f2b839a8f76d42f1933e01fc0981abbe47aa2');
t('danh-sach-mau.html giong het v56 (chi them dong Powered by o footer) (sha256)', sha('danh-sach-mau.html') === 'fb683b9e12417dd60e1ff38791fbd03724b9005cae012b91b52c123ff10af35e');
t('tin-tuc.html giong het v56 (chi them dong Powered by o footer) (sha256)', sha('tin-tuc.html') === 'bab4ccb320ff4cc89e30e02e457aa0813de36ef8a65355d29426259d97768575');
t('chi-tiet-shop.html giong het v56 (chi them dong Powered by o footer) (sha256)', sha('chi-tiet-shop.html') === '69580141cd455e13a021c8b7e6ef1c9cf43d56048f2370ce86e144025ae4bc5b');
t('ho-so.html giong het v56 (chi them dong Powered by o footer) (sha256)', sha('ho-so.html') === 'bafd57f6a0cb2917e1c7906ac8dd4f945afb5bd76cd557431c12f1822b18b601');
t('dat-lai-mat-khau.html giong het v56 (chi them dong Powered by o footer) (sha256)', sha('dat-lai-mat-khau.html') === 'd7a9da0e4c26ec5d49182f97b232687fe74887732bdf396c58d44a8ad414c626');
t('bai-viet-bop-reach.html giong het v56 (chi them dong Powered by o footer) (sha256)', sha('bai-viet-bop-reach.html') === '61f8a48e3883955091fbe25bd54ead8174b3011c92840465d11b364d3c186f93');
t('quy-tac-diem-thuong.html giong het v56 (chi them dong Powered by o footer) (sha256)', sha('quy-tac-diem-thuong.html') === 'b2cd8176ec2392c8567416bceb5b06f9572720c8c1ead403b13e12d5d8b993c0');
t('trang-cua-toi.html giong het v56 (chi them dong Powered by o footer) (sha256)', sha('trang-cua-toi.html') === '0b0903a7593558a327255d24bd23433af0e01a46b272d2befe7021028c241d04');
t('vi-tien-ao.html giong het v56 (chi them dong Powered by o footer) (sha256)', sha('vi-tien-ao.html') === 'b1e2c18a0d9cbc350c1607b06fdf991749682fa6a6f40e2a7264c8208ed11555');

// ---- (g) sw.js: CACHE v55 + SHELL van du 29 icon doi tac ----
t("sw.js CACHE = 'v84-shell-1'", swJs.includes("const CACHE = 'v84-shell-1';"));
t('sw.js: khong con CACHE v55-shell-1', !swJs.includes('v55-shell-1'));
t("sw.js: ghi chu dau file doi sang v60", swJs.includes('/* v60 service worker'));
t('sw.js: SHELL van precache du 29 file icon doi tac', ['google-icon.png', 'meta-icon.png', 'tiktok-icon.png', 'thaco-icon.png', 'tpbank-icon.png', 'coccoc-icon.png', 'dem-kim-cuong-icon.png', 'flamingo-icon.png', 'bao-kinh-te-do-thi-icon.png', 'cocoon-icon.png', 'co-mem-homelab-icon.png', 'sao-thai-duong-icon.png', 'thorakao-icon.png', 'moi-icon.png', 'lemonade-icon.png', 'emmie-icon.png', 'ofelia-icon.png', 'lagumi-icon.png', 'vedette-icon.png', 'coolmate-icon.png', 'canifa-icon.png', 'ivy-moda-icon.png', 'yody-icon.png', 'juno-icon.png', 'vascara-icon.png', 'ssstutter-icon.png', 'routine-icon.png', 'degrey-icon.png', 'couple-tx-icon.png'].every((f) => swJs.includes(`'images/partners/${f}'`)));

// ---- (h) v20.css: style muc lo hang + luoi responsive ----
t('v20.css: co .lot-section (the trang, vien --line, bong --sh)', /\.lot-section\{[^}]*background:#fff/.test(css) && /\.lot-section\{[^}]*border:1px solid var\(--line\)/.test(css));
t('v20.css: co .lot-grid 3 cot desktop', /\.lot-grid\{[^}]*grid-template-columns:repeat\(3,1fr\)/.test(css));
t('v20.css: .lot-grid 2 cot <=1000px', /@media\(max-width:1000px\)\{\.lot-grid\{grid-template-columns:repeat\(2,1fr\)/.test(css));
t('v20.css: .lot-grid 1 cot <=600px', /@media\(max-width:600px\)\{\.lot-grid\{grid-template-columns:1fr\}/.test(css));
t('v20.css: co .lot-price (dam, mau --brand)', /\.lot-price\{[^}]*font-weight:900/.test(css) && /\.lot-price\{[^}]*color:var\(--brand\)/.test(css));
t('v20.css: co .lot-label (nhan canh bao vang nhat)', /\.lot-label\{[^}]*background:#fff4e5/.test(css));
t('v20.css: dai logo doi tac khong doi (marquee 122s, o tron 48px)', /\.logo-track\{[^}]*animation:logo-scroll 122s linear infinite/.test(css) && /\.logo-card\{[^}]*width:48px/.test(css));

// ---- (i) Hoi quy v53: theme + greeting van hoat dong (spot check) ----
const sb = { window: {}, module: { exports: {} }, console, document: { documentElement: { classList: { add: () => {}, remove: () => {}, contains: () => false } }, body: { appendChild: () => {} }, getElementById: () => null, querySelector: () => null, createElement: () => ({ setAttribute: () => {}, appendChild: () => {}, children: [] }) }, localStorage: { getItem: () => null, setItem: () => {} } };
vm.createContext(sb);
vm.runInContext(fs.readFileSync(path.join(root, 'js/themes.js'), 'utf8'), sb);
const T = sb.module.exports;
t('js/themes.js: van du 3 theme co greeting', T.THEMES.length === 3 && T.THEMES.every((x) => typeof x.greeting === 'string' && x.greeting.length > 0));
t('js/themes.js: getGreeting(15/12) van la loi chuc Noel, getGreeting(06/11) van null',
  T.getGreeting(new Date(2026, 11, 15)).includes('Giáng sinh an lành') && T.getGreeting(new Date(2026, 10, 6)) === null);

console.log(`v55: ${pass} PASS, ${fail} FAIL`);
process.exit(fail ? 1 : 0);
