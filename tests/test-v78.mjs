/* v78 tests — Node only, no browser. v78 = SUA LOI AUDIT v73 + F-05/F-06
   (bao cao audit-auth-ux-mobile-tablet-2026-11-06.md + f01-kiem-chung-live-2026-11-07.md):
   (1) C1 — link chia se bai viet bi cat tren mobile (34 trang bai, body rong
       444px @360/390 vi <b> chua URL khong nga dong): them luat tap trung
       `.share-box b{overflow-wrap:anywhere;word-break:break-all}` vao v20.css
       (34 file bai-viet deu nap v20.css) thay vi sua inline <style> tung file.
   (2) C2 — nut "Bo loc ho so mau" bam khong mo tren mobile. NGUYEN NHAN GOC:
       dispatcher goi ca initList() (trang Mau) lan initShops() (moi trang),
       initShops() goi initFilterToggle() TRUOC khi return som — trang Mau bi
       gan 2 listener: bam 1 lan toggle 2 lan (mo roi dong ngay) nen card mai
       display:none. Trang Shop chi gan 1 lan nen van mo duoc. Sua: guard
       idempotency `btn._filterToggleBound` trong initFilterToggle().
   (3) C3 — trang Quy tac diem thieu nut Menu tren mobile: them nut #menuBtn
       giong het index.html (handler menuBtn co san trong app.js dispatcher).
   (4) C4 — 2 anh 404: (a) hero bop-reach sai duong dan `../images/` (file o
       thu muc goc) -> `images/bai-viet/bop-reach.webp`; (b) thumbnail bai
       livestream My: file .jpg khong con duoc tham chieu o dau trong v77
       (data.js + og dung .webp / -og.jpg, ca 2 file deu ton tai) — da het
       404 tu v76, chi xac nhan lai, khong doi code.
   (5) B3 — badge so tin ghim che chu "Ver2Solution" tren infographic
       (trang chu): doi .pin-num tu goc tren-trai sang goc duoi-trai
       (base bottom:8px; mobile bottom:16px).
   (6) B4 — FAB che noi dung cuoi trang @mobile: them body{padding-bottom:76px}
       trong @media(max-width:600px) (FAB 48px + bottom 16px + du 12px).
   (7) D2 — quy-tac: "bang tam thoi" -> "bang chinh thuc".
   (8) F-05 — nut Dang xuat tren dang-nhap.html: (a) bo chuyen huong tu dong
       ve index sau 800ms khi mo trang luc da dang nhap — chi chuyen khi vua
       dang nhap xong trong luot nay (co signedInNow); (b) cap nhat UI dang
       xuat ngay lap tuc truoc khi doi signOut (auth-ui.js), roi dong bo lai.
   (9) F-06 — truong "Doanh thu cao nhat" chua luu duoc: NGUYEN NHAN la bang
       profiles tren live chua co cot top_revenue (migration M1 chua chay);
       code trang-cua-toi.html da co san co che thu lai khong co top_revenue.
       v78 KHONG tu chay migration — chi ghi nhan + de file
       supabase-migration-top-revenue.sql san (xem bao cao build v78).
   (10) B1/B2 (logo Mylan tang hinh, logo Cham Loa tuong phan thap) KHONG sua
       trong v78 — dang cho nguoi dung quyet cach xu ly (cat lai / them nen).
   (11) sw.js CACHE 'v77-shell-1' -> 'v78-shell-1' (bat buoc vi v20.css doi). */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let pass = 0, fail = 0;
function t(name, cond, extra = '') { if (cond) { pass++; console.log('PASS v78:', name); } else { fail++; console.log('FAIL v78:', name, extra); } }
const sha = f => crypto.createHash('sha256').update(fs.readFileSync(path.join(root, f))).digest('hex');

// ---- (A) C1: luat be URL chia se trong v20.css ----
const css = fs.readFileSync(path.join(root, 'v20.css'), 'utf8');
t('C1: v20.css co luat .share-box b be URL', css.includes('.share-box b{overflow-wrap:anywhere;word-break:break-all}'));
t('C1: moi file bai-viet deu nap v20.css (luat tap trung co tac dung)', (() => {
  const files = fs.readdirSync(path.join(root, 'bai-viet')).filter(f => f.endsWith('.html'));
  return files.length >= 34 && files.every(f => fs.readFileSync(path.join(root, 'bai-viet', f), 'utf8').includes('href="../v20.css"'));
})());
t('C1: khong con <b> URL nao vuot khoi share-box (luat ap cho moi trang bai)', !css.includes('.share-box b{white-space:nowrap'));

// ---- (B) C2: guard idempotency trong initFilterToggle ----
const appJs = fs.readFileSync(path.join(root, 'js/app.js'), 'utf8');
t('C2: initFilterToggle co guard _filterToggleBound', appJs.includes('if(btn._filterToggleBound) return;') && appJs.includes('btn._filterToggleBound = true;'));
t('C2: guard dat TRUOC addEventListener trong initFilterToggle', (() => {
  const i = appJs.indexOf('function initFilterToggle()');
  const g = appJs.indexOf('if(btn._filterToggleBound) return;', i);
  const a = appJs.indexOf("btn.addEventListener('click'", i);
  return i > -1 && g > -1 && a > -1 && g < a;
})());
t('C2: dispatcher van goi ca initList + initShops (khong doi cau truc)', appJs.includes('initHome(); initList();') && appJs.includes('initShops();'));

// ---- (C) C3 + D2: trang Quy tac diem ----
const quyTac = fs.readFileSync(path.join(root, 'quy-tac-diem-thuong.html'), 'utf8');
t('C3: quy-tac co nut #menuBtn giong index', quyTac.includes('<button class="menu-btn" id="menuBtn" data-track="nut-menu" aria-expanded="false" type="button">Menu</button>'));
t('C3: quy-tac van co nav #mainNav du 5 muc', quyTac.includes('<nav class="main-nav" id="mainNav">') && quyTac.includes('href="danh-sach-mau.html"') && quyTac.includes('href="tin-tuc.html"'));
t('D2: quy-tac ghi "bảng chính thức"', quyTac.includes('Bảng điểm dưới đây là bảng chính thức'));
t('D2: quy-tac khong con "bảng tạm thời"', !quyTac.includes('bảng tạm thời'));

// ---- (D) C4: 2 anh 404 ----
const bop = fs.readFileSync(path.join(root, 'bai-viet-bop-reach.html'), 'utf8');
t('C4-(1): hero bop-reach src dung (khong ../images/)', bop.includes('src="images/bai-viet/bop-reach.webp"') && !bop.includes('src="../images/bai-viet/bop-reach.webp"'));
t('C4-(1): file anh bop-reach.webp ton tai', fs.existsSync(path.join(root, 'images/bai-viet/bop-reach.webp')));
const dataJs = fs.readFileSync(path.join(root, 'js/data.js'), 'utf8');
t('C4-(2): khong con tham chieu .jpg bai livestream My o dau', !fs.readdirSync(path.join(root, 'bai-viet')).some(f => fs.readFileSync(path.join(root, 'bai-viet', f), 'utf8').includes('livestream-ban-hang-my-tang-gan-50-phan-tram.jpg')) && !dataJs.includes('livestream-ban-hang-my-tang-gan-50-phan-tram.jpg'));
t('C4-(2): thumbnail My dung .webp + -og.jpg, ca 2 file ton tai', dataJs.includes('livestream-ban-hang-my-tang-gan-50-phan-tram.webp') && fs.existsSync(path.join(root, 'images/bai-viet/livestream-ban-hang-my-tang-gan-50-phan-tram.webp')) && fs.existsSync(path.join(root, 'images/bai-viet/livestream-ban-hang-my-tang-gan-50-phan-tram-og.jpg')));

// ---- (E) B3: badge ghim xuong goc duoi-trai ----
t('B3: .pin-num base bottom:8px (khong top:8px)', css.includes('.pin-num{position:absolute;top:auto;bottom:8px;left:8px;'));
t('B3: .pin-num mobile bottom:16px (khong top:16px)', css.includes('.pin-num{top:auto;bottom:16px;left:16px}'));
t('B3: khong con luat pin-num top:8px/top:16px', !css.includes('.pin-num{position:absolute;top:8px;') && !css.includes('.pin-num{top:16px;'));

// ---- (F) B4: padding-bottom chong FAB ----
t('B4: body padding-bottom 76px trong khoi mobile (FAB 48px + bottom 16px)', css.includes('body{padding-bottom:76px}'));

// ---- (G) F-05: dang xuat ----
const loginHtml = fs.readFileSync(path.join(root, 'dang-nhap.html'), 'utf8');
t('F-05a: dang-nhap co co signedInNow', loginHtml.includes('var signedInNow = false;'));
t('F-05a: onSessionChange chi chuyen trang khi signedInNow', loginHtml.includes('if (user && signedInNow && !redirected)'));
t('F-05a: submit form dang nhap dat co signedInNow', loginHtml.includes("siForm.addEventListener('submit', function () { signedInNow = true; })"));
const authUi = fs.readFileSync(path.join(root, 'js/auth-ui.js'), 'utf8');
t('F-05b: auth-ui dang xuat cap nhat UI truoc khi doi signOut', (() => {
  const i = authUi.indexOf('// Đăng xuất (v78 F-05');
  const ui = authUi.indexOf("msg('Đang đăng xuất…')", i);
  // tim dong code signOut THAT (bo qua lan xuat hien trong comment giai thich)
  const so = authUi.indexOf("try { if (api()) await api().signOut(); }", i);
  return i > -1 && ui > -1 && so > -1 && ui < so;
})());
t('F-05b: auth-ui dong bo lai bang showUser() sau signOut', (() => {
  const i = authUi.indexOf('// Đăng xuất (v78 F-05');
  return i > -1 && authUi.indexOf('await showUser();', i) > -1;
})());

// ---- (H) F-06: ghi nhan (khong tu chay migration) ----
const myPage = fs.readFileSync(path.join(root, 'trang-cua-toi.html'), 'utf8');
t('F-06 (v85: M1 da chay 13:57 07/11 — 3 cot highest_revenue_*): code trang-cua-toi KHONG con co che thu lai top_revenue (doan retry lang le bo du lieu da xoa), dung 2 truong moi', !myPage.includes('delete retry.top_revenue;') && !myPage.includes('riêng Doanh thu cao nhất chưa lưu được vì hệ thống chưa sẵn sàng') && myPage.includes('highest_revenue_amount') && myPage.includes('highest_revenue_note'));
t('F-06: file migration top_revenue san co trong prep (CHO chay, chua chay)', fs.existsSync(path.join(root, 'supabase-migration-top-revenue.sql')) && fs.readFileSync(path.join(root, 'supabase-migration-top-revenue.sql'), 'utf8').includes('ADD COLUMN IF NOT EXISTS top_revenue'));

// ---- (I) B1/B2: KHONG sua (cho nguoi dung quyet) ----
t('B1/B2: file logo Mylan + Cham Loa giong het v77 (khong doi trong v78)', sha('images-shop/shop-mylan.png') === '2ba1486a4689753788d4822422b061874fe49363ce08befd7c4f2beeeaf5ff1d' && sha('images-shop/shop-chamloa.png') === 'fef4a1f71f063a847f327499cf626d952827ea13f4df11451adf224bea24a9a4');
t('B1/B2: v20.css khong them nen moi cho .shop-logo--contain (van #eef7f2 cu)', css.includes('.shop-logo--contain{object-fit:contain;background:#eef7f2;'));

// ---- (J) sw.js CACHE + sha pin file doi ----
const swJs = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');
t("sw.js CACHE = 'v86-shell-1'", swJs.includes("const CACHE = 'v86-shell-1';"));
t('sw.js: khong con cache cu (v77)', !swJs.includes('v77-shell-1'));
t('sw.js: van la ban v60 (ghi chu dau file)', swJs.includes('/* v60 service worker'));
t('v20.css giong het v78 (C1 + B3 + B4) (sha256)', sha('v20.css') === '277d60ad92802afa8b68597fda4a2dd5f85c2c1edacd6fc44999b79dc3e47d87');
t('js/app.js giong het v78 (C2 guard) (sha256)', sha('js/app.js') === 'ae11dfaf0e5383a7d2d2f1d8c33de31090f1a5fd39e0251edb0f8b69d4590a20');
t('js/auth-ui.js giong het v78 (F-05b) (sha256)', sha('js/auth-ui.js') === '46d13e3b95dea2a9157d5668c3b4fca700279a1df8fe5c95ce0b416fa64f2f5c');
t('dang-nhap.html giong het v78 (F-05a) (sha256)', sha('dang-nhap.html') === '95f825c69c4040b252349bf13c23419644fc21baff849716ddcdc78fc33aece2');
t('quy-tac-diem-thuong.html giong het v78 (C3 + D2) (sha256)', sha('quy-tac-diem-thuong.html') === 'b264c326c5e1e35c4735aacc4975c00a639f8d1c05eca4e96f494450208c5ce5');
t('bai-viet-bop-reach.html giong het v78 (C4-1) (sha256)', sha('bai-viet-bop-reach.html') === '65c246d3de68760bf4181d310604678ca357be81e253c0c941cebdca8e9f8456');
t('sw.js giong het v78 (CACHE v86-shell-1) (sha256)', sha('sw.js') === 'f8ee524a81f0c741d07806d784d6aa113e1341495ff73653b7e05124d2cc4253');

console.log(`\nv78: ${pass} PASS, ${fail} FAIL`);
process.exit(fail ? 1 : 0);
