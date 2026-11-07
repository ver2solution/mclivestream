/* v41 tests — Node only, no browser. v41 = lam lai dai trust strip trang chu
   (user-directed rang sang 06/11/2026, kem anh chup dai trust strip):
   (1) Dong PR moi (dung van ban da chot, doi 06/11/2026 theo yeu cau nguoi
       dung — thay dong cu "hơn 3 năm ... 400+ khách"): "Ver2Solution — hơn
       8 năm xây dựng hệ sinh thái dịch vụ cho shop bán hàng online và
       livestream. Hơn 1.000 khách hàng toàn quốc, từ shop nhỏ đến tập đoàn
       lớn, đã tin dùng dịch vụ của chúng tôi — gồm các dự án triển khai
       cùng Thaco Trường Hải, TPBank, Cốc Cốc, Đêm Kim Cương và hàng trăm
       doanh nghiệp khác." Kem dai logo doi tac dang O TRON chua 1 icon
       (v50, lam lai theo yeu cau nguoi dung 06/11/2026 11:44-11:45 —
       logo day du v49 hien thi qua to): nhan "Đồng hành cùng các thương
       hiệu lớn", 9 o tron 48px chua icon 128×128 trong images/partners/
       (Google "G", Meta ∞, TikTok not nhac, THACO, TPBank tam giac,
       Coc Coc tron xanh, Dem Kim Cuong kim cuong, Flamingo chim,
       Bao Kinh te & Do thi wordmark), 2 nhom giong he cuon lien tuc,
       logo MAU GOC (v51, theo yeu cau nguoi dung 06/11/2026 12:00 — bo
       grayscale, khong lam mo); dai logo nam gon trong khung trang
       (.trust-strip overflow:hidden + .trust-logos min-width:0).
   (2) So lieu ben duoi TINH DONG tu data.js bang ham moi renderTrustStats()
       + trustStats() trong js/app.js (khong ghi so cung vao HTML; so tinh
       trong index.html chi la du phong neu JS loi):
       - Mau: 20 ho so · 2 tinh + live online; topRevenue ca 20 deu "Chua cap
         nhat" -> fallback luong de xuat THAP NHAT = 120.000d/gio (3 mau co
         salaryNum: 120.000 x2, 250.000 x1; 17/20 "Thoa thuan"), kem ghi chu
         doanh thu cao nhat chua co du lieu — se thay bang doanh thu cao nhat
         khi co. Khi 1 mau co topRevenue that thi code tu chuyen sang hien
         thi doanh thu (logic fallback nam trong code, test bang du lieu gia).
       - Shop: 30 shop · 2 tinh; luong thang cao nhat 36 trieu/thang (59K
         Entertainment "16–36 trieu/thang"); chi xet luong thang, bo qua
         luong gio / thoa thuan / chua cap nhat; phan tram hoa hong sau cum
         "trieu/thang" khong tinh (vd "15–17 trieu/thang + hoa hong 16–20%"
         -> 17, khong phai 20).
       - Khach: 400+ giu nguyen la hang so cong dong do nguoi dung xac nhan,
         khong tinh tu data.js.
   (3) CSS moi .trust-sub (12px, mut) + .trust-note (11px, nghieng); mobile
       <=600px cac o so lieu xep doc.
   (4) sw.js CACHE = 'v50-shell-1' (precache them 9 logo doi tac). Du lieu khong doi: 20 mau, 30 shop,
       25 bai. KHONG doi menu/nav, 4 o tin, disclaimer v40, cac trang khac. */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let pass = 0, fail = 0;
function t(name, cond, extra = '') { if (cond) { pass++; console.log('PASS v41:', name); } else { fail++; console.log('FAIL v41:', name, extra); } }

// Fake DOM chi du cho renderTrustStats (app.js chi goi init* tren DOMContentLoaded).
const els = {};
function mkEl() { return { textContent: '', innerHTML: '', value: '', classList: { toggle: () => {}, add: () => {} }, setAttribute: () => {}, addEventListener: () => {} }; }
['trustModels', 'trustModelProvinces', 'trustModelPay', 'trustModelPayNote', 'trustShops', 'trustShopProvinces', 'trustShopPay'].forEach((id) => { els[id] = mkEl(); });
const sb = { window: {}, module: { exports: {} }, console, URLSearchParams,
  document: { getElementById: (id) => els[id] || null, addEventListener: () => {}, querySelectorAll: () => [] } };
vm.createContext(sb);
vm.runInContext(fs.readFileSync(path.join(root, 'js/data.js'), 'utf8'), sb);
vm.runInContext(fs.readFileSync(path.join(root, 'js/app.js'), 'utf8'), sb);
const D = sb.window.V20_DATA, V = sb.window.V20;
const indexHtml = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const appJs = fs.readFileSync(path.join(root, 'js/app.js'), 'utf8');
const css = fs.readFileSync(path.join(root, 'v20.css'), 'utf8');
const PR = 'Ver2Solution — hơn 8 năm xây dựng hệ sinh thái dịch vụ cho shop bán hàng online và livestream. Hơn 1.000 khách hàng toàn quốc, từ shop nhỏ đến tập đoàn lớn, đã tin dùng dịch vụ của chúng tôi — gồm các dự án triển khai cùng Thaco Trường Hải, TPBank, Cốc Cốc, Đêm Kim Cương và hàng trăm doanh nghiệp khác.';

// ---- (1) Dong PR ----
t('index.html: dong PR dung van ban da chot', indexHtml.includes('<p class="trust-lead">' + PR + '</p>'));
t('index.html: khong con dong PR cu "Shop thật, tin tuyển thật"', !indexHtml.includes('Shop thật, tin tuyển thật'));
t('trust strip: o Mau dung truoc o Shop (theo thu tu thiet ke v41)', indexHtml.indexOf('id="trustModels"') < indexHtml.indexOf('id="trustShops"'));

// ---- (1b) Dai logo doi tac dang o tron chua 1 icon, tu dong xoay (v50) ----
t('index.html: co nhan dai logo "Đồng hành cùng các thương hiệu lớn"', indexHtml.includes('Đồng hành cùng các thương hiệu lớn'));
const PARTNER_LOGOS = [
  ['images/partners/google-icon.png', 'Google'],
  ['images/partners/meta-icon.png', 'Meta'],
  ['images/partners/tiktok-icon.png', 'TikTok'],
  ['images/partners/thaco-icon.png', 'THACO'],
  ['images/partners/tpbank-icon.png', 'TPBank'],
  ['images/partners/coccoc-icon.png', 'Cốc Cốc'],
  ['images/partners/dem-kim-cuong-icon.png', 'Đêm Kim Cương'],
  ['images/partners/flamingo-icon.png', 'Flamingo'],
  ['images/partners/bao-kinh-te-do-thi-icon.png', 'Báo Kinh tế &amp; Đô thị'],
];
const OLD_FULL_LOGOS = ['google.png', 'meta.png', 'tiktok.png', 'thaco.png', 'tpbank.png', 'coccoc.png', 'dem-kim-cuong.png', 'flamingo.jpg', 'bao-kinh-te-do-thi.png'];
function pngSize(p) { const b = fs.readFileSync(p); return b.readUInt32BE(16) + 'x' + b.readUInt32BE(20); }
PARTNER_LOGOS.forEach(([src, alt]) => {
  t('index.html: dai logo co the anh icon ' + alt + ' (' + src + ')', indexHtml.includes('<img src="' + src + '" alt="' + alt + '"'));
  t('index.html: the img icon ' + alt + ' co width=128 height=128 (co nho that, de phong CSS cu)', indexHtml.includes('<img src="' + src + '" alt="' + alt + '" width="128" height="128"'));
  t('images/partners: file icon ' + src + ' ton tai + dung 128x128 + < 50KB', fs.existsSync(path.join(root, src)) && pngSize(path.join(root, src)) === '128x128' && fs.statSync(path.join(root, src)).size < 50 * 1024);
});
t('index.html: dai logo co 29 o tron moi nhom (58 the tong) (v54 cap nhat: them 20 logo moi, tu 9 -> 29 moi nhom)', (indexHtml.match(/class="logo-card"/g) || []).length === 58);
t('index.html: khong con tham chieu logo day du v49', OLD_FULL_LOGOS.every((f) => !indexHtml.includes('images/partners/' + f)));
t('index.html: khong con logo chu wordmark cu (logo-item / logo-google)', !indexHtml.includes('logo-item') && !indexHtml.includes('logo-google'));
t('index.html: dai logo co 2 nhom giong he (1 nhom aria-hidden de cuon lien tuc)', (indexHtml.match(/class="logo-group"/g) || []).length === 2 && indexHtml.includes('class="logo-group" aria-hidden="true"'));
t('v20.css: co keyframes logo-scroll + animation tren .logo-track', css.includes('@keyframes logo-scroll') && css.includes('animation:logo-scroll'));
t('v20.css: logo MAU GOC (khong grayscale, khong opacity mo)', !css.includes('filter:grayscale(1)') && !/\.logo-card img\{[^}]*opacity:\.5/.test(css) && !css.includes('.logo-card:hover img{filter:none'));
t('v51 CSS: dai logo nam gon trong khung trang (.trust-strip overflow:hidden + .trust-logos min-width:0)', /\.trust-strip\{[^}]*overflow:hidden/.test(css) && /\.trust-logos\{[^}]*min-width:0/.test(css));
t('v20.css: hover dai logo tam dung cuon', css.includes('.logo-marquee:hover .logo-track{animation-play-state:paused}'));
t('v20.css: o logo TRON 48px (border-radius:50%, width+height 48px)', /\.logo-card\{[^}]*border-radius:50%/.test(css) && /\.logo-card\{[^}]*width:48px/.test(css) && /\.logo-card\{[^}]*height:48px/.test(css));
t('v20.css: o logo nen trang (background #fff)', /\.logo-card\{[^}]*background:#fff/.test(css));
t('v20.css: anh icon 70% trong o (width+height 70%, object-fit contain)', /\.logo-card img\{[^}]*width:70%/.test(css) && /\.logo-card img\{[^}]*height:70%/.test(css) && /\.logo-card img\{[^}]*object-fit:contain/.test(css));
t('v20.css: mobile <=600px o tron 44px', /@media\(max-width:600px\)\{[\s\S]*?\.logo-card\{[^}]*width:44px/.test(css));
t('v20.css: khong con the chu nhat cu (border-radius:14px / width:170px)', !/\.logo-card\{[^}]*border-radius:14px/.test(css) && !/\.logo-card\{[^}]*width:170px/.test(css));
t('v20.css: khong con class wordmark cu (.logo-item / .logo-google)', !css.includes('.logo-item') && !css.includes('.logo-google'));
t('sw.js: CACHE v51 precache du 9 file icon doi tac', fs.readFileSync(path.join(root, 'sw.js'), 'utf8').includes("const CACHE = 'v84-shell-1';") && PARTNER_LOGOS.every(([src]) => fs.readFileSync(path.join(root, 'sw.js'), 'utf8').includes("'" + src + "'")));
t('index.html: khong con dong PR cu "hơn 3 năm"', !indexHtml.includes('hơn 3 năm'));

// ---- (2) HTML: du id moi + so tinh du phong ----
['trustModels', 'trustModelProvinces', 'trustModelPay', 'trustModelPayNote', 'trustShops', 'trustShopProvinces', 'trustShopPay'].forEach((id) => {
  t('index.html: co id ' + id, indexHtml.includes('id="' + id + '"'));
});
t('index.html: so tinh du phong 20/30 van co (dai khong trong neu JS loi)',
  indexHtml.includes('id="trustModels">20<') && indexHtml.includes('id="trustShops">30<') && indexHtml.includes('<b>400+</b>'));
t('index.html: du phong o Mau ghi dung tinh + live online + luong de xuat + ghi chu doanh thu',
  indexHtml.includes('Hồ sơ mẫu thật · 2 tỉnh + live online')
  && indexHtml.includes('Lương đề xuất từ 120.000đ/giờ')
  && indexHtml.includes('(doanh thu cao nhất chưa có dữ liệu — sẽ thay bằng doanh thu cao nhất khi có)'));
t('index.html: du phong o Shop ghi dung tinh + luong cao nhat',
  indexHtml.includes('Shop đang tuyển mẫu · 2 tỉnh') && indexHtml.includes('Lương cao nhất 36 triệu/tháng'));
t('index.html: o Khach 400+ khong co id (tinh, khong cho JS tinh lai)', !/id="trust[A-Za-z]*"[^>]*>400\+/.test(indexHtml) && indexHtml.includes('<b>400+</b><span>Khách bán livestream cần tuyển mẫu</span>'));
t('v75: nut "Xem shop đang tuyển →" DA XOA khoi trang chu', !indexHtml.includes('Xem shop đang tuyển →') && !indexHtml.includes('data-track="xem-shop-dang-tuyen"'));

// ---- (3) trustStats tren du lieu that ----
const st = V.trustStats(D.models, D.shops);
t('trustStats: 20 mau', st.modelCount === 20, JSON.stringify(st));
t('trustStats: mau o 2 tinh (TP.HCM, Ha Noi)', st.modelProvinceCount === 2, JSON.stringify(st));
t('trustStats: co mau live online', st.modelOnline === true);
t('trustStats: luong de xuat thap nhat 120.000d/gio', st.minWage === 120000, JSON.stringify(st));
t('trustStats: topRevenue tat ca "Chua cap nhat" nen maxRevenue = null (fallback luong, KHONG hien doanh thu)',
  D.models.every((m) => m.topRevenue === 'Chưa cập nhật') && st.maxRevenue === null, JSON.stringify(st));
t('trustStats: 30 shop', st.shopCount === 30, JSON.stringify(st));
t('trustStats: shop o 2 tinh (Ha Noi, TP.HCM)', st.shopProvinceCount === 2, JSON.stringify(st));
t('trustStats: luong thang cao nhat 36 trieu/thang (59K 16–36)', st.maxMonthly === 36, JSON.stringify(st));

// ---- (4) parseMonthlyMax: chi xet so truoc "trieu/thang" ----
const monthlyCases = [
  ['16–36 triệu/tháng + KPI + thưởng ngày', 36],
  ['Từ 15 triệu/tháng + hoa hồng', 15],
  ['17 triệu/tháng + hoa hồng và thưởng', 17],
  ['8–18 triệu/tháng + hoa hồng', 18],
  ['8–18 triệu/tháng + thưởng KPI', 18],
  ['15–17 triệu/tháng + hoa hồng 16–20%', 17],
  ['Thỏa thuận', null],
  ['Thỏa thuận theo năng lực', null],
  ['Từ 250.000 đồng/giờ', null],
  ['Cast: 100k/h', null],
  ['Chưa cập nhật', null],
  [null, null],
];
monthlyCases.forEach(([s, want]) => {
  t('parseMonthlyMax(' + JSON.stringify(s) + ') = ' + want, V.parseMonthlyMax(s) === want, 'got ' + V.parseMonthlyMax(s));
});

// ---- (5) parseRevenue ----
const revCases = [
  ['Chưa cập nhật', null],
  [null, null],
  ['50 triệu', 50000000],
  ['120.000.000', 120000000],
  ['2,5 tỷ', 2500000000],
  ['300.000', 300000],
];
revCases.forEach(([s, want]) => {
  t('parseRevenue(' + JSON.stringify(s) + ') = ' + want, V.parseRevenue(s) === want, 'got ' + V.parseRevenue(s));
});
t('fmtVnd(120000) = 120.000', V.fmtVnd(120000) === '120.000');
t('fmtVnd(50000000) = 50.000.000', V.fmtVnd(50000000) === '50.000.000');

// ---- (6) Logic fallback: khi co topRevenue that thi chuyen sang doanh thu ----
const fakeModels = [
  { province: 'Hà Nội', salaryNum: null, topRevenue: 'Chưa cập nhật' },
  { province: 'TP. Hồ Chí Minh', salaryNum: 120000, topRevenue: '50 triệu' },
  { province: 'Toàn quốc / Live online', salaryNum: 250000, topRevenue: 'Chưa cập nhật' },
];
const stFake = V.trustStats(fakeModels, []);
t('trustStats (du lieu gia): co 1 mau topRevenue 50 trieu -> maxRevenue = 50000000', stFake.maxRevenue === 50000000, JSON.stringify(stFake));
t('trustStats (du lieu gia): minWage van 120000 (khong anh huong boi doanh thu)', stFake.minWage === 120000);
t('trustStats (du lieu gia): 2 tinh + live online', stFake.modelProvinceCount === 2 && stFake.modelOnline === true);

// ---- (7) renderTrustStats dien dung vao DOM (du lieu that) ----
V.renderTrustStats();
t('renderTrustStats: trustModels = 20', els.trustModels.textContent === '20', els.trustModels.textContent);
t('renderTrustStats: trustModelProvinces = ho so mau that · 2 tinh + live online', els.trustModelProvinces.textContent === 'Hồ sơ mẫu thật · 2 tỉnh + live online', els.trustModelProvinces.textContent);
t('renderTrustStats: trustModelPay = luong de xuat tu 120.000d/gio (KHONG ghi thanh doanh thu)', els.trustModelPay.textContent === 'Lương đề xuất từ 120.000đ/giờ', els.trustModelPay.textContent);
t('renderTrustStats: trustModelPayNote ghi ro doanh thu chua co du lieu', els.trustModelPayNote.textContent === '(doanh thu cao nhất chưa có dữ liệu — sẽ thay bằng doanh thu cao nhất khi có)', els.trustModelPayNote.textContent);
t('renderTrustStats: trustShops = 30', els.trustShops.textContent === '30', els.trustShops.textContent);
t('renderTrustStats: trustShopProvinces = shop dang tuyen mau · 2 tinh', els.trustShopProvinces.textContent === 'Shop đang tuyển mẫu · 2 tỉnh', els.trustShopProvinces.textContent);
t('renderTrustStats: trustShopPay = luong cao nhat 36 trieu/thang', els.trustShopPay.textContent === 'Lương cao nhất 36 triệu/tháng', els.trustShopPay.textContent);

// ---- (8) renderTrustStats voi du lieu gia co doanh thu: tu chuyen sang doanh thu ----
const origModels = D.models;
D.models = fakeModels;
V.renderTrustStats();
t('renderTrustStats (du lieu gia): trustModelPay chuyen sang doanh thu cao nhat 50.000.000d', els.trustModelPay.textContent === 'Doanh thu cao nhất 50.000.000đ', els.trustModelPay.textContent);
t('renderTrustStats (du lieu gia): ghi chu doanh thu duoc xoa khi da co doanh thu', els.trustModelPayNote.textContent === '', els.trustModelPayNote.textContent);
D.models = origModels;
V.renderTrustStats();
t('renderTrustStats (khoi phuc du lieu that): trustModelPay lai la luong de xuat', els.trustModelPay.textContent === 'Lương đề xuất từ 120.000đ/giờ', els.trustModelPay.textContent);

// ---- (9) 400+ khong duoc tinh tu data.js ----
const jsNoComments = appJs.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
t('app.js: khong co ham nao tinh so khach (khong co trustClients; "400+" chi xuat hien trong comment giai thich hang so, khong co trong code)',
  !/trustClients/.test(jsNoComments) && !/400\+/.test(jsNoComments));
t('app.js: renderTrustStats duoc goi trong initHome', appJs.includes('renderTrustStats();') && appJs.includes('function renderTrustStats'));
t('app.js: export trustStats/renderTrustStats/parseMonthlyMax/parseRevenue qua window.V20',
  appJs.includes('trustStats:trustStats') && appJs.includes('renderTrustStats:renderTrustStats') && appJs.includes('parseMonthlyMax:parseMonthlyMax') && appJs.includes('parseRevenue:parseRevenue'));

// ---- (10) CSS ----
t('CSS: co class .trust-sub (12px, mut)', css.includes('.trust-sub') && /\.trust-sub\{[^}]*font-size:12px/.test(css));
t('CSS: co class .trust-note (11px, nghieng)', css.includes('.trust-note') && /\.trust-note\{[^}]*font-size:11px/.test(css) && /\.trust-note\{[^}]*font-style:italic/.test(css));
t('CSS: span trong o so lieu hien dang block (khong tran hang)', /\.trust-num span\{[^}]*display:block/.test(css));
t('CSS: mobile <=900px o so lieu 2 cot (grid), khong xep doc 1 cot', /@media\(max-width:900px\)\{\.trust-nums\{grid-template-columns:repeat\(2,1fr\)/.test(css)); // v65: grid 4 cot desktop, 2 cot <=900px

// ---- (10b) v49: dai niem tin — logo len tren + khong tran khung (yeu cau nguoi dung 06/11/2026: chu tran khung day nut xuong, dua muc logo len) ----
t('v49/v65: thu tu DOM trong trust strip: PR -> logo -> o so lieu (v75: nut da xoa, thu tu trong khung khong doi)', (() => { const s = indexHtml.indexOf('class=\"trust-strip\"'); const iText = indexHtml.indexOf('class=\"trust-text\"', s); const iLogos = indexHtml.indexOf('class=\"trust-logos\"', s); const iNums = indexHtml.indexOf('class=\"trust-nums\"', s); const iEnd = indexHtml.indexOf('</section>', s); return iText > -1 && iLogos > iText && iNums > iLogos && iEnd > iNums; })());
t('v49 CSS: .trust-text chiem tron 1 hang (flex-basis:100%)', /\.trust-text\{[^}]*flex-basis:100%/.test(css));
t('v65 CSS: .trust-nums la grid 4 cot x 2 hang + flex-basis:100% + min-width:0', /\.trust-nums\{display:grid;grid-template-columns:repeat\(4,1fr\)/.test(css) && /\.trust-nums\{[^}]*flex-basis:100%/.test(css) && /\.trust-nums\{[^}]*min-width:0/.test(css));
t('v49 CSS: .trust-num min-width:0 (nhan dai duoc xuong dong trong o)', /\.trust-num\{[^}]*min-width:0/.test(css));
t('v75 CSS: khong con class .trust-cta (nut da xoa)', !css.includes('.trust-cta'));
t('v49 CSS: .trust-note bi an (display:none) — ghi chu noi bo khong hien ra giao dien', /\.trust-note\{[^}]*display:none/.test(css));
t('v65 CSS: mobile <=600px trust-strip xep doc (flex-direction:column)', /@media\(max-width:600px\)\{\.trust-strip\{flex-direction:column/.test(css));

// ---- (11) sw.js + du lieu khong doi ----
t("sw.js CACHE = 'v84-shell-1'", fs.readFileSync(path.join(root, 'sw.js'), 'utf8').includes("const CACHE = 'v84-shell-1';"));
t('du lieu khong doi: 20 mau, 30 shop, 50 bai', D.models.length === 20 && D.shops.length === 30 && D.articles.length === 50,
  `mau=${D.models.length} shop=${D.shops.length} bai=${D.articles.length}`);
t('khong con "Shop thật, tin tuyển thật" o bat cu file nao (chi index.html doi)', !fs.readFileSync(path.join(root, 'js/app.js'), 'utf8').includes('Shop thật, tin tuyển thật'));

console.log(`v41: ${pass} PASS, ${fail} FAIL`);
process.exit(fail ? 1 : 0);
