/* v57 tests — Node only, no browser. v57 = 2 thay doi theo yeu cau nguoi
   dung 06/11/2026 14:23-14:24:
   (a) Muc "Lo hang xa kho" chi giu 2 hang mac dinh + nut "Xem them" mo rong
       du 13 lo (khong xoa lo nao). Mac dinh: section co class "collapsed",
       an nhom phu (.lot-extra) + the thu 7 tro di o luoi dau (desktop 3 cot
       -> 6 the = 2 hang; tablet 2 cot -> 4 the; mobile 1 cot -> 2 the).
       Nut #lotMoreBtn doi chu Xem them/Thu gon + aria-expanded.
   (b) Logo shop/doanh nghiep 1/4 chieu rong o thong tin the shop (goc trai
       tren): .shop-card .shop-logo/.shop-initial flex 0 0 25%, width 25%,
       aspect-ratio 1 (chi the shop; trang chi tiet .company-head giu 96px;
       js/app.js KHONG doi — logo chi doi bang CSS).
   (c) sw.js CACHE = 'v76-shell-1'; header doi sang v57; SHELL giu nguyen.
   (d) KHONG doi: js/data.js, js/app.js, js/auth-ui.js, js/themes.js
       (greeting v53), mclivestream-supabase.js, sitemap.xml
       (hash khoa theo ban v56-prep). Dong Powered by v56 nguyen ven.
   LUU Y: khi bump CACHE, cac test cu khang dinh CACHE v56-shell-1 da duoc
   cap nhat dong loat sang v76-shell-1 + ghi chu dau file sw.js doi sang
   v57 — chi doi chuoi phien ban, khong doi logic khac cua cac test do. */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let pass = 0, fail = 0;
function t(name, cond, extra = '') { if (cond) { pass++; console.log('PASS v57:', name); } else { fail++; console.log('FAIL v57:', name, extra); } }
const sha = (p) => crypto.createHash('sha256').update(fs.readFileSync(path.join(root, p))).digest('hex');

const shopHtml = fs.readFileSync(path.join(root, 'danh-sach-shop.html'), 'utf8');
const css = fs.readFileSync(path.join(root, 'v20.css'), 'utf8');
const swJs = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');
const lotStart = shopHtml.indexOf('id="lo-hang-xa-kho"');
const lotEnd = shopHtml.indexOf('</section>', lotStart);
const lotSection = lotStart > -1 && lotEnd > -1 ? shopHtml.slice(lotStart, lotEnd) : '';

// ---- (a) Muc lo hang: mac dinh thu gon 2 hang + nut Xem them ----
// Cấu trúc: `section.lot-section.collapsed` — `<div class="lot-extra">` (nhóm 2 + 3) — nút #lotMoreBtn — script toggle.
t('muc lo hang: section mac dinh co class "collapsed"', shopHtml.includes('<section class="lot-section collapsed" id="lo-hang-xa-kho"'));
t('muc lo hang: co <div class="lot-extra"> boc nhom 2 + 3', lotSection.includes('<div class="lot-extra">'));
t('muc lo hang: nhom 2 nam trong .lot-extra', lotSection.indexOf('<div class="lot-extra">') > -1 && lotSection.indexOf('<div class="lot-extra">') < lotSection.indexOf('Đơn vị thu mua / ký gửi tồn kho'));
t('muc lo hang: nhom 3 nam trong .lot-extra (v60: ten moi Cho/San/TTTM/To chuc xa kho)', lotSection.indexOf('<div class="lot-extra">') < lotSection.indexOf('Chợ/ Sàn/ TTTM/ Tổ chức xả kho'));
t('muc lo hang: co nut #lotMoreBtn "Xem thêm ↓"', shopHtml.includes('<button class="lot-more" id="lotMoreBtn" type="button" aria-expanded="false">Xem thêm ↓</button>'));
t('muc lo hang: nut nam trong section, truoc dong mien tru', lotSection.includes('id="lotMoreBtn"') && lotSection.indexOf('id="lotMoreBtn"') < lotSection.indexOf('Miễn trừ trách nhiệm'));
t('muc lo hang: co script toggle (classList.toggle collapsed + aria-expanded)', shopHtml.includes('getElementById("lotMoreBtn")') && shopHtml.includes('classList.toggle("collapsed")') && shopHtml.includes('setAttribute("aria-expanded"'));
t('muc lo hang: script doi chu Xem them/Thu gon', shopHtml.includes("Thu gọn ↑") && shopHtml.includes("Xem thêm ↓"));
// v76: the lo khong con trong HTML tinh — kiem tra tren data.js (render kiem tra o test-v76)
const sb57lots = { window: {}, module: { exports: {} }, console, document: { getElementById: () => null, addEventListener: () => {}, querySelectorAll: () => [] } };
vm.createContext(sb57lots);
vm.runInContext(fs.readFileSync(path.join(root, 'js/data.js'), 'utf8'), sb57lots);
const LOTS57 = sb57lots.window.V20_DATA.lots;
t('muc lo hang: van du 14 lo trong data.js (khong xoa lo nao)', LOTS57.length === 14, `got=${LOTS57.length}`);
t('muc lo hang: van du 3 nhom (3 h3)', (lotSection.match(/<h3>/g) || []).length === 3, `got=${(lotSection.match(/<h3>/g) || []).length}`);
t('muc lo hang: nhom 1 van 8 lo, nhom 2 van 3 lo, nhom 3 van 2 lo',
  LOTS57.filter(l => l.group === 1).length === 9
  && LOTS57.filter(l => l.group === 2).length === 3
  && LOTS57.filter(l => l.group === 3).length === 2);
t('muc lo hang: van truoc danh sach shop (#publicShopsList)', lotStart > -1 && lotStart < shopHtml.indexOf('id="publicShopsList"'));

// ---- (b) CSS: quy tac thu gon 2 hang theo viewport + nut ----
t('v20.css: .collapsed an .lot-extra', /\.lot-section\.collapsed \.lot-extra\{display:none\}/.test(css));
t('v20.css: desktop an the thu 7 tro di (n+7) -> 6 the = 2 hang', /\.lot-section\.collapsed \.lot-grid \.lot-card:nth-child\(n\+7\)\{display:none\}/.test(css));
t('v20.css: tablet <=1000px an the thu 5 tro di (n+5) -> 4 the = 2 hang', /@media\(max-width:1000px\)\{\.lot-section\.collapsed \.lot-grid \.lot-card:nth-child\(n\+5\)\{display:none\}\}/.test(css));
t('v20.css: mobile <=600px an the thu 3 tro di (n+3) -> 2 the = 2 hang', /@media\(max-width:600px\)\{\.lot-section\.collapsed \.lot-grid \.lot-card:nth-child\(n\+3\)\{display:none\}\}/.test(css));
t('v20.css: co style nut .lot-more (bo tron, nen xanh nhat)', /\.lot-more\{[^}]*border-radius:999px/.test(css) && /\.lot-more\{[^}]*background:#eef7f2/.test(css));
t('v20.css: luoi lo hang goc khong doi (3 cot desktop)', /\.lot-grid\{[^}]*grid-template-columns:repeat\(3,1fr\)/.test(css));

// ---- (c) Logo shop 1/4 o thong tin the shop ----
// `.shop-card .shop-logo/.shop-initial`: flex `0 0 25%`, width 25%, aspect-ratio 1.
t('v20.css: logo the shop rong 25% (1/4) cua .shop-head', /\.shop-card \.shop-logo,\.shop-card \.shop-initial\{flex:0 0 25%;width:25%/.test(css));
t('v20.css: logo the shop giu ti le vuong (aspect-ratio:1)', /\.shop-card \.shop-logo,\.shop-card \.shop-initial\{[^}]*aspect-ratio:1/.test(css));
t('v20.css: logo the shop khong con 72px co dinh', !/\.shop-card \.shop-logo,\.shop-card \.shop-initial\{flex:0 0 72px/.test(css));
t('v20.css: trang chi tiet giu logo 96px (khong doi)', /\.company-head \.shop-logo,\.company-head \.shop-initial\{flex:0 0 96px;width:96px;height:96px/.test(css));
t('v20.css: logo goc giu 52px (khong doi)', /\.shop-logo\{flex:0 0 52px;width:52px;height:52px/.test(css));
t('v20.css: .shop-head van la dai gradient + min-height 100px', /\.shop-head\{[^}]*background:linear-gradient\(160deg,#d9eae4,#eef3f1\)/.test(css) && /\.shop-head\{[^}]*min-height:100px/.test(css));
t('js/app.js: shopCardHTML van dung shopLogoHTML (logo render bang HTML cu)', fs.readFileSync(path.join(root, 'js/app.js'), 'utf8').includes("'<div class=\"shop-head\">'+shopLogoHTML(s)"));
t('js/app.js: shopLogoHTML van co fallback chu cai khi loi anh', /onerror="this\.outerHTML=\\'<span class=shop-initial>/.test(fs.readFileSync(path.join(root, 'js/app.js'), 'utf8')));

// ---- (d) Dong Powered by v56 nguyen ven ----
const LINE = '<p class="powered">Powered by Ver2Solution</p>';
t('Powered by: index.html van co dong', fs.readFileSync(path.join(root, 'index.html'), 'utf8').includes(LINE));
t('Powered by: danh-sach-shop.html van co dong trong footer', shopHtml.includes(LINE));
t('Powered by: 1 bai-viet van co dong', fs.readFileSync(path.join(root, 'bai-viet/tuyen-mau-livestream.html'), 'utf8').includes(LINE));
t('v20.css: rule .site-foot .powered van nguyen', /\.site-foot \.powered\{[^}]*font-weight:700/.test(css));

// ---- (e) sw.js: CACHE v57 + SHELL nguyen ven ----
t("sw.js CACHE = 'v84-shell-1'", swJs.includes("const CACHE = 'v84-shell-1';"));
t('sw.js: khong con CACHE v56-shell-1', !swJs.includes('v56-shell-1'));
t("sw.js: ghi chu dau file doi sang v60", swJs.includes('/* v60 service worker'));
t('sw.js: SHELL van precache du 29 file icon doi tac', ['google-icon.png', 'meta-icon.png', 'tiktok-icon.png', 'thaco-icon.png', 'tpbank-icon.png', 'coccoc-icon.png', 'dem-kim-cuong-icon.png', 'flamingo-icon.png', 'bao-kinh-te-do-thi-icon.png', 'cocoon-icon.png', 'co-mem-homelab-icon.png', 'sao-thai-duong-icon.png', 'thorakao-icon.png', 'moi-icon.png', 'lemonade-icon.png', 'emmie-icon.png', 'ofelia-icon.png', 'lagumi-icon.png', 'vedette-icon.png', 'coolmate-icon.png', 'canifa-icon.png', 'ivy-moda-icon.png', 'yody-icon.png', 'juno-icon.png', 'vascara-icon.png', 'ssstutter-icon.png', 'routine-icon.png', 'degrey-icon.png', 'couple-tx-icon.png'].every((f) => swJs.includes(`'images/partners/${f}'`)));

// ---- (f) Du lieu + KHONG doi: 6 file noi dung (hash khoa theo v56-prep) ----
const sb2 = { window: {}, module: { exports: {} }, console, document: { getElementById: () => null, addEventListener: () => {}, querySelectorAll: () => [] } };
vm.createContext(sb2);
vm.runInContext(fs.readFileSync(path.join(root, 'js/data.js'), 'utf8'), sb2);
const DATA = sb2.window.V20_DATA;
t('du lieu khong doi: 20 mau, 30 shop, 50 bai', DATA.models.length === 20 && DATA.shops.length === 30 && DATA.articles.length === 50,
  `mau=${DATA.models.length} shop=${DATA.shops.length} bai=${DATA.articles.length}`);
t('js/data.js giong het v56 (sha256)', sha('js/data.js') === '642a8e3fdb09f0d23d363741692f3da7106586aff84dd47d1bc81613b514fc57');
t('js/app.js giong het v56 (sha256)', sha('js/app.js') === 'e3f5c43293d2b71f2fd0b804a31ce4a4a88f47a83bfdab607eab5ee75467b072');
t('js/auth-ui.js giong het v56 (sha256)', sha('js/auth-ui.js') === '5fec3b5f2f9ea100fe516565beef2ec6aeb63fe12ac0bac8403668da1da8fdfa');
t('js/themes.js giong het v56 (sha256, greeting v53 nguyen ven)', sha('js/themes.js') === 'fd8a49bccef9ec152d390d5cfff17e63614967b82707c302191b4a8ebdc15e57');
t('mclivestream-supabase.js giong het v56 (sha256)', sha('mclivestream-supabase.js') === '34e9c41f46aed58e4561c527995ceaec467c13d5bd22531edf0a1ffa19abb1bc');
t('sitemap.xml giong het v56 (sha256)', sha('sitemap.xml') === 'a5253c4d14a1de2e1095db28a6b9b75998ffaa3af5e3726d1b4f819485fd39f5');

// ---- (g) Text trang Shop viet cho doi tuong Mau (yeu cau 06/11 14:29) ----
// Trang danh-sach-shop.html liet ke shop tuyen mau — nguoi doc la MAU tim
// viec, nen H1/title/meta/3 buoc huong dan phai viet cho Mau ("Tim shop
// tuyen mau livestream"), khong viet cho Shop ("tim mau") nhu truoc.
// Bo loc da phu hop voi Mau tu truoc (tinh, linh vuc, gio lam, loai luong,
// muc luong toi thieu, sap xep luong, tim kiem) — chi doi nhan "Gio lam
// tuyen mau" (viet cho Shop) thanh "Gio lam". Nav "Danh cho Shop" giu
// nguyen (ten muc noi dung, khong doi o v57).
t('text Mau: H1 moi "Tìm shop tuyển mẫu livestream"', shopHtml.includes('<h1>Tìm shop tuyển mẫu livestream</h1>'));
t('text Mau: het H1 cu "Dành cho Shop — tìm mẫu livestream"', !shopHtml.includes('<h1>Dành cho Shop — tìm mẫu livestream</h1>'));
t('text Mau: title moi', shopHtml.includes('<title>Tìm shop tuyển mẫu livestream | Sàn việc làm MC Livestream Ver2Solution</title>'));
t('text Mau: og:title + twitter:title moi', shopHtml.includes('content="Tìm shop tuyển mẫu livestream — Sàn việc làm MC Livestream Ver2Solution"') && shopHtml.includes('content="Tìm shop tuyển mẫu livestream — Ver2Solution"'));
t('text Mau: meta description viet cho Mau', shopHtml.includes('content="Trang dành cho mẫu: tìm shop tuyển mẫu livestream theo tỉnh và lĩnh vực, xem lương, giờ làm và liên hệ shop.') && !shopHtml.includes('Trang dành cho shop: tìm mẫu livestream'));
t('text Mau: mo dau 3 buoc viet cho Mau', shopHtml.includes('Mẫu tìm shop theo 2 mục bắt buộc: Tỉnh / Thành phố và Lĩnh vực') && !shopHtml.includes('Shop tìm mẫu theo 2 mục bắt buộc'));
t('text Mau: buoc 1 "Tìm shop"', shopHtml.includes('<h3>Tìm shop</h3>') && shopHtml.includes('để tìm đúng shop nhanh hơn.') && !shopHtml.includes('<h3>Tìm mẫu</h3>'));
t('text Mau: buoc 2 "Xem tin tuyển và liên hệ"', shopHtml.includes('<h3>Xem tin tuyển và liên hệ</h3>') && shopHtml.includes('Mở trang chi tiết của shop để xem toàn bộ thông tin: tỉnh, mặt hàng, lương, giờ làm, yêu cầu chính và liên hệ.'));
t('text Mau: buoc 3 "Chốt lịch" doi thoai voi shop', shopHtml.includes('Tự trao đổi với shop về sản phẩm, kịch bản, giờ live và thù lao, rồi chốt lịch trực tiếp.'));
t('text Mau: het cac cau viet cho Shop ("tim dung mau", "chi tiet cua mau", "trao doi voi mau")', !shopHtml.includes('để tìm đúng mẫu nhanh hơn.') && !shopHtml.includes('Mở trang chi tiết của mẫu') && !shopHtml.includes('Tự trao đổi với mẫu'));
t('text Mau: nhan loc "Giờ làm" (het "Giờ làm tuyển mẫu")', shopHtml.includes('<label>Giờ làm</label><select id="fShopShift"') && !shopHtml.includes('<label>Giờ làm tuyển mẫu</label>'));
t('text Mau: cac bo loc cho Mau van du (tinh, linh vuc, gio lam, loai luong, muc luong toi thieu, sap xep) — v61 bo o tim ten shop', ['fShopProv', 'fShopCat', 'fShopShift', 'fPayType', 'fPayMin', 'fShopSort'].every((id) => shopHtml.includes(`id="${id}"`)));
t('text Mau: chuc nang dang ky shop van con (form + nut dang ky shop)', shopHtml.includes('id="ho-so-shop"') && shopHtml.includes('Đăng ký tài khoản Cửa hàng / Doanh nghiệp'));

console.log(`v57: ${pass} PASS, ${fail} FAIL`);
process.exit(fail ? 1 : 0);
