// test-v85.mjs — v85: banner mobile 2 dong + tach dang-ky.html rieng +
// header 1 hang 390px + sua huy hiệu pin de dong nguon tin + header theo
// phien dang nhap + code web di kem M1 (doanh thu chi khi da xac minh) +
// phan hoi form dang ky/dang nhap ro rang + the xuong het tran vien +
// ra soat chu (khong viet tat) + sitemap 64 URL + CACHE v86-shell-1.
// (A) Banner mobile: dung 2 dong nguyen van, chi hien <=768px, nut X tat
//     + sessionStorage, chen qua js/app.js (khong sua tung file HTML).
// (B) dang-ky.html moi: 2 loai tai khoan + du 5 truong, #authMsg tren nut
//     submit, link ve dang-nhap.html; dang-nhap.html chi con dang nhap.
// (C) Header 390px 1 hang: quy tac thu nho mo rong tu <=380px len <=400px.
// (D) Pin badge: .pin-cat chu dem trai 44px (desktop), 0 o mobile.
// (E) M1: strip highest_revenue_verified o client; trang-cua-toi gui
//     highest_revenue_amount + note, khong gui top_revenue, khong retry;
//     hien thi/loc/sap xep/trust strip chi tinh so DA XAC MINH.
// (F) Auth feedback: loi tung truong + thong bao 2 mau + email da dang ky
//     kem link lay lai mat khau (dien san email) + dang ky co session thi
//     dang nhap thang.
// (G) The lo/xuong: .lot-card min-width:0 + overflow-wrap.
// (H) Chu: khong con "SĐT" trong chu hien thi; khong con "bảng điểm tạm thời".
// (I) sw.js CACHE = v86-shell-1 + hash khoa file da doi.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let pass = 0, fail = 0;
function t(name, ok, extra = '') { if (ok) { pass++; console.log('PASS v85:', name); } else { fail++; console.log('FAIL v85:', name, extra); } }
const sha = (p) => crypto.createHash('sha256').update(fs.readFileSync(path.join(root, p))).digest('hex');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const exists = (p) => fs.existsSync(path.join(root, p));

const appJs = read('js/app.js');
const authUi = read('js/auth-ui.js');
const css = read('v20.css');
const sw = read('sw.js');
const loginHtml = read('dang-nhap.html');
const regHtml = read('dang-ky.html');
const myHtml = read('trang-cua-toi.html');
const resetHtml = read('dat-lai-mat-khau.html');
const apiJs = read('mclivestream-supabase.js');
const sitemap = read('sitemap.xml');

// ---- vm: data.js + app.js (giong test-v84) ----
const sb = { window: {}, module: { exports: {} }, console, document: { querySelectorAll: () => [], getElementById: () => null, addEventListener: () => {} }, location: { search: '' } };
vm.createContext(sb);
vm.runInContext(read('js/data.js'), sb);
vm.runInContext(appJs, sb);
const V = sb.window.V20;
const D = sb.window.V20_DATA;

// ---- (A) Banner mobile 2 dong ----
t('banner mobile: dung 2 dong nguyen van trong js/app.js',
  appJs.includes("'Mở web PC để xem chi tiết thông tin hay hữu ích'") &&
  appJs.includes("'Bản thử nghiệm mọi tính năng hoàn toàn miễn phí'"));
t('banner mobile: co nut X + sessionStorage, chen dau body, khong sua tung file HTML',
  appJs.includes('initMobileNotice') && appJs.includes("sessionStorage.getItem(MOBILE_NOTICE_KEY)") &&
  appJs.includes("sessionStorage.setItem(MOBILE_NOTICE_KEY, 'off')") &&
  appJs.includes('insertBefore(bar, document.body.firstChild)') &&
  appJs.includes("bar.setAttribute('role', 'note')"));
t('banner mobile: CSS an mac dinh, chi hien <=768px',
  /\.mobile-notice\{display:none\}/.test(css) &&
  /@media\(max-width:768px\)\{\s*\.mobile-notice\{display:flex/.test(css));
t('banner mobile: khong doi layout desktop (khong fixed, khong che nut)',
  !/\.mobile-notice\{[^}]*position:fixed/.test(css) &&
  css.includes('.mobile-notice-close'));
// Chay that initMobileNotice voi DOM gia.
(function () {
  const inserted = [];
  function makeEl(tag) {
    return {
      tagName: tag, children: [], className: '', id: '', textContent: '',
      setAttribute() {}, addEventListener() {},
      appendChild(c) { this.children.push(c); return c; },
      classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } }
    };
  }
  const body = { firstChild: null, insertBefore(el) { inserted.push(el); } };
  const fakeDoc = {
    getElementById: () => null,
    createElement: (tag) => makeEl(tag),
    body,
    querySelectorAll: () => [], querySelector: () => null, addEventListener: () => {}
  };
  const sb2 = { window: {}, module: { exports: {} }, console, document: fakeDoc, location: { search: '' }, sessionStorage: { getItem: () => null, setItem: () => {} } };
  vm.createContext(sb2);
  vm.runInContext(read('js/data.js'), sb2);
  vm.runInContext(appJs, sb2);
  sb2.window.V20.initMobileNotice();
  const bar = inserted[0];
  const lines = bar ? bar.children[0].children.map((s) => s.textContent) : [];
  t('banner mobile chay that: chen 1 thanh dau body, dung 2 dong',
    inserted.length === 1 && bar.className === 'mobile-notice' && bar.id === 'mobileNotice' &&
    lines.length === 2 &&
    lines[0] === 'Mở web PC để xem chi tiết thông tin hay hữu ích' &&
    lines[1] === 'Bản thử nghiệm mọi tính năng hoàn toàn miễn phí');
  t('banner mobile chay that: co nut X dong thong bao',
    bar && bar.children[1].className === 'mobile-notice-close' &&
    bar.children[1].textContent === '✕');
})();

// ---- (B) Tach dang-ky.html rieng ----
t('dang-ky.html ton tai + co bo chon 2 loai tai khoan + du 5 truong dang ky',
  exists('dang-ky.html') &&
  regHtml.includes('id="authTypeChooser"') &&
  regHtml.includes('data-auth-type-pick="model"') &&
  regHtml.includes('data-auth-type-pick="shop"') &&
  ['authSuEmail', 'authSuPhone', 'authSuPass', 'authSuPass2', 'authSuMarketing'].every((id) => regHtml.includes('id="' + id + '"')));
t('dang-ky.html: initialView register + dang ky xong sang dang-nhap.html?registered=1',
  regHtml.includes("initialView: 'register'") &&
  regHtml.includes("signupSuccessUrl: 'dang-nhap.html?' + successQs.join('&')") &&
  regHtml.includes("'registered=1'"));
t('dang-ky.html: #authMsg tren nut submit + loi tung truong + link ve dang nhap',
  regHtml.indexOf('id="authMsg"') !== -1 &&
  regHtml.indexOf('id="authMsg"') < regHtml.indexOf('data-track="nut-dang-ky"') &&
  ['err-authSuEmail', 'err-authSuPhone', 'err-authSuPass', 'err-authSuPass2'].every((id) => regHtml.includes('id="' + id + '"')) &&
  regHtml.includes('id="goLoginLink"') && regHtml.includes('href="dang-nhap.html"'));
t('dang-ky.html: khong con view dang nhap, co the authUserBox + nap js/auth-ui.js',
  !regHtml.includes('id="authViewLogin"') &&
  regHtml.includes('id="authUserBox"') &&
  regHtml.includes('<script src="js/auth-ui.js"></script>'));
t('dang-nhap.html CHI con dang nhap: khong view dang ky, khong bo chon loai, khong owner-note',
  loginHtml.includes('id="authViewLogin"') &&
  !loginHtml.includes('id="authViewRegister"') &&
  !loginHtml.includes('id="authTypeChooser"') &&
  !loginHtml.includes('class="owner-note"') &&
  !loginHtml.includes('authSuEmail'));
t('dang-nhap.html: #authMsg tren nut submit + loi tung truong + link sang dang-ky.html',
  loginHtml.indexOf('id="authMsg"') !== -1 &&
  loginHtml.indexOf('id="authMsg"') < loginHtml.indexOf('data-track="nut-dang-nhap"') &&
  loginHtml.includes('id="err-authSiEmail"') && loginHtml.includes('id="err-authSiPass"') &&
  loginHtml.includes('id="goRegisterLink"') && loginHtml.includes('href="dang-ky.html"'));
t('dang-nhap.html: ?auth=register chuyen sang dang-ky.html; ?registered=1 bao xanh',
  loginHtml.includes("if (params.get('auth') === 'register')") &&
  loginHtml.includes("location.replace('dang-ky.html'") &&
  loginHtml.includes("initialMessage = { text: 'Đăng ký thành công") &&
  loginHtml.includes("kind: 'ok'"));

// ---- (C) Header 390px 1 hang ----
t('header 390px: quy tac thu nho mo rong tu <=380px len <=400px',
  /@media\(max-width:400px\)\{\/\* v85/.test(css) &&
  !/@media\(max-width:380px\)\{/.test(css));
t('header theo phien (yeu cau 15:52 07/11, test tren dien thoai that): nut Dang Nhap bien mat, thay bang TEN nguoi dung — bat buoc moi trang',
  appJs.includes('initHeaderAuth') &&
  appJs.includes('headerDisplayName') &&
  appJs.includes("btn.setAttribute('href', 'trang-cua-toi.html')") &&
  appJs.includes('fetchMyProfile') && appJs.includes('p.full_name') &&
  appJs.includes('window.V2SAuthUI') && appJs.includes('A.getSession'));
t('headerDisplayName: ten metadata > phan truoc @ cua email; khong co ca hai thi null (de hoi them profiles.full_name)',
  V.headerDisplayName({ user_metadata: { full_name: 'Nguyễn Văn A' } }) === 'Nguyễn Văn A' &&
  V.headerDisplayName({ user_metadata: { name: 'Trần Thị B' } }) === 'Trần Thị B' &&
  V.headerDisplayName({ email: 'thond4@gmail.com', user_metadata: { phone_zalo: '0329983699' } }) === 'thond4' &&
  V.headerDisplayName({ email: 'thond4@gmail.com', user_metadata: { full_name: 'Nguyễn Văn A' } }) === 'Nguyễn Văn A' &&
  V.headerDisplayName({ user_metadata: {} }) === null &&
  V.headerDisplayName(null) === null &&
  V.headerMetaName({ email: 'thond4@gmail.com', user_metadata: {} }) === null);

// ---- (D) Pin badge khong de dong nguon tin ----
t('pin badge: .pin-cat chu dem trai 44px o desktop, 0 o mobile',
  /\.pin-cat\{margin:0 10px 10px;padding-left:44px;/.test(css) &&
  /\.pin-cat\{grid-area:cat;margin:0;padding-left:0\}/.test(css));

// ---- (E) M1: doanh thu chi khi da xac minh ----
t('M1 client: PROTECTED_FIELDS strip highest_revenue_verified',
  apiJs.includes("'highest_revenue_verified'") &&
  /var PROTECTED_FIELDS = \[[^\]]*'highest_revenue_verified'/.test(apiJs));
t('trang-cua-toi.html: gui highest_revenue_amount + note, khong gui top_revenue, khong retry',
  myHtml.includes('id="myTopRevenueAmount"') &&
  myHtml.includes('id="myTopRevenueNote"') &&
  myHtml.includes('highest_revenue_amount') &&
  myHtml.includes('highest_revenue_note') &&
  !myHtml.includes('top_revenue:') && !myHtml.includes("set('myTopRevenue'") &&
  !myHtml.includes('id="myTopRevenue"') && !myHtml.includes('delete retry.top_revenue') &&
  !myHtml.includes('/top_revenue/i.test'));
t('revenueText: so da xac minh hien dinh dang VND + ghi chu; chua xac minh thi Chua cap nhat',
  V.revenueText({ highest_revenue_amount: 120000000, highest_revenue_verified: true, highest_revenue_note: 'tháng 10/2026' }) === '120.000.000đ (tháng 10/2026)' &&
  V.revenueText({ highest_revenue_amount: 50000000, highest_revenue_verified: true }) === '50.000.000đ' &&
  V.revenueText({ highest_revenue_amount: 120000000, highest_revenue_verified: false }) === 'Chưa cập nhật' &&
  V.revenueText({ topRevenue: '50 triệu' }) === 'Chưa cập nhật' &&
  V.revenueText({}) === 'Chưa cập nhật');
t('verifiedRevenue: chi so da xac minh > 0 moi tinh; so tu khai/chuoi cu khong tinh',
  V.verifiedRevenue({ highest_revenue_amount: 120000000, highest_revenue_verified: true }) === 120000000 &&
  V.verifiedRevenue({ highest_revenue_amount: 120000000, highest_revenue_verified: false }) === null &&
  V.verifiedRevenue({ topRevenue: '2,5 tỷ' }) === null &&
  V.verifiedRevenue({ highest_revenue_amount: 0, highest_revenue_verified: true }) === null);
t('loc fRevMin chi tinh so da xac minh (so tu khai 50tr loai khi loc >= 10tr)',
  V.filterModels([
    { id: 'a', topRevenue: '50 triệu' },
    { id: 'b', highest_revenue_amount: 50000000, highest_revenue_verified: true },
    { id: 'c', highest_revenue_amount: 5000000, highest_revenue_verified: true }
  ], { revMin: 10 }).map((m) => m.id).join(',') === 'b');
t('sap xep doanh thu chi dung so da xac minh (so tu khai xep cuoi nhu null)',
  V.sortModelsBy([
    { id: 'x1', topRevenue: '2,5 tỷ' },
    { id: 'x2', highest_revenue_amount: 50000000, highest_revenue_verified: true },
    { id: 'x3', highest_revenue_amount: 120000000, highest_revenue_verified: true }
  ], 'revenue-desc').map((m) => m.id).join(',') === 'x3,x2,x1');
t('trustStats: topRevenue chuoi cu khong tinh maxRevenue nua (du lieu that van null)',
  V.trustStats(D.models, D.shops || [], D.lots || [], D.factories || []).maxRevenue === null &&
  V.trustStats([{ province: 'Hà Nội', salaryNum: null, highest_revenue_amount: 50000000, highest_revenue_verified: true }], [], [], []).maxRevenue === 50000000 &&
  V.trustStats([{ province: 'Hà Nội', salaryNum: null, topRevenue: '50 triệu' }], [], [], []).maxRevenue === null);
t('the ho so + trang chi tiet: hien doanh thu chi khi da xac minh (decisionHTML)',
  V.decisionHTML({ salary: 'Thỏa thuận', schedule: 'Tối', exp: '1 năm', highest_revenue_amount: 80000000, highest_revenue_verified: true }).includes('80.000.000đ') &&
  V.decisionHTML({ salary: 'Thỏa thuận', schedule: 'Tối', exp: '1 năm', topRevenue: '50 triệu' }).includes('Chưa cập nhật'));
t('ownerNoteHTML: link Dang ky tro dung dang-ky.html?type= (the mau/shop)',
  V.ownerNoteHTML('model').includes('href="dang-ky.html?type=model"') &&
  V.ownerNoteHTML('shop').includes('href="dang-ky.html?type=shop"') &&
  V.ownerNoteHTML('model').includes('danh-sach-mau.html#dang-nhap-mau'));

// ---- (F) Auth feedback ro rang ----
t('auth-ui.js: loi tung truong (setFieldError) + thong bao 2 mau (msg ok/err)',
  authUi.includes('function setFieldError') &&
  authUi.includes("msgEl.className = 'auth-msg'") &&
  authUi.includes("kind === 'ok' ? ' ok' : kind === 'err' ? ' err' : ''") &&
  authUi.includes('clearAllFieldErrors'));
t('auth-ui.js: dang ky co session thi dang nhap thang; khong session thi sang trang dang nhap',
  authUi.includes('if (res && res.session)') &&
  authUi.includes("msg('Đăng ký thành công! Đang chuyển tới trang của bạn…', 'ok')") &&
  authUi.includes('if (cfg.signupSuccessUrl) { location.href = cfg.signupSuccessUrl; return; }'));
t('auth-ui.js: email da dang ky bao ro + hoi lay lai mat khau kem link dien san email',
  authUi.includes('isAlreadyRegistered') &&
  authUi.includes("msgHtml('Email này đã được đăng ký. Bạn có muốn lấy lại mật khẩu không?") &&
  authUi.includes("dat-lai-mat-khau.html?email=' + encodeURIComponent(email)"));
t('auth-ui.js: kiem tra email dinh dang + mat khau >= 8 + nhap lai khop o client truoc khi gui',
  authUi.includes('isValidEmail') &&
  authUi.includes("setFieldError(cfg.inputs.signupEmail") &&
  authUi.includes("setFieldError(cfg.inputs.signupPass2, 'Mật khẩu nhập lại chưa khớp.')"));
t('dat-lai-mat-khau.html: dien san email tu ?email= + thong bao co mau',
  resetHtml.includes("new URLSearchParams(location.search).get('email')") &&
  resetHtml.includes("document.getElementById('requestResetEmail')") &&
  resetHtml.includes('class="auth-msg"'));

// ---- (G) The lo/xuong het tran vien ----
t('lot-card: min-width:0 + overflow-wrap (the xuong + 3 nhom lo)',
  /\.lot-card\{[^}]*min-width:0;overflow-wrap:break-word/.test(css) &&
  css.includes('.lot-card .lot-meta,.lot-card .lot-price{overflow-wrap:break-word}') &&
  css.includes('.lot-card a{overflow-wrap:anywhere}'));

// ---- (H) Ra soat chu: khong viet tat ----
t('chu hien thi: khong con "SĐT" (da doi thanh So dien thoai) o HTML/JS hien thi',
  !/SĐT/.test(read('js/data.js')) &&
  !/SĐT/.test(regHtml) && !/SĐT/.test(loginHtml) &&
  !/SĐT/.test(read('danh-sach-mau.html')) && !/SĐT/.test(read('danh-sach-shop.html')));
t('chu hien thi: khong con "bảng điểm tạm thời" (D2: bang diem chinh thuc)',
  !/bảng điểm tạm thời/.test(loginHtml) && !/bảng điểm tạm thời/.test(regHtml) &&
  !/bảng điểm tạm thời/.test(read('quy-tac-diem-thuong.html')));

// ---- (I) Sitemap + CACHE + shas ----
t('sitemap: 64 URL, co dang-ky.html',
  sitemap.includes('dang-ky.html') && (sitemap.match(/<url>/g) || []).length === 64);
t("sw.js CACHE = 'v86-shell-1'", sw.includes("const CACHE = 'v86-shell-1';"));
t('sha khoa file da doi (v85)', (() => {
  const want = {
    'js/app.js': 'ae11dfaf0e5383a7d2d2f1d8c33de31090f1a5fd39e0251edb0f8b69d4590a20',
    'js/auth-ui.js': '46d13e3b95dea2a9157d5668c3b4fca700279a1df8fe5c95ce0b416fa64f2f5c',
    'mclivestream-supabase.js': '28027730041e197b387fe8847255dd8c31bf1ec1dbbf0984427bb65d553dbd72',
    'v20.css': '277d60ad92802afa8b68597fda4a2dd5f85c2c1edacd6fc44999b79dc3e47d87',
    'sw.js': 'f8ee524a81f0c741d07806d784d6aa113e1341495ff73653b7e05124d2cc4253',
    'js/data.js': '76009b20bc339501db3ab2f6e96993e5a6c6f84d9d50e45a623cde6882d85fdf'
  };
  return Object.keys(want).every((k) => sha(k) === want[k]);
})());
console.log('SHAS v85:', JSON.stringify({
  app: sha('js/app.js'), authUi: sha('js/auth-ui.js'), api: sha('mclivestream-supabase.js'),
  css: sha('v20.css'), sw: sha('sw.js'), data: sha('js/data.js'),
  login: sha('dang-nhap.html'), reg: sha('dang-ky.html'), my: sha('trang-cua-toi.html'),
  reset: sha('dat-lai-mat-khau.html'), mau: sha('danh-sach-mau.html'), shop: sha('danh-sach-shop.html'),
  sitemap: sha('sitemap.xml')
}, null, 0));
console.log(`v85: ${pass} PASS, ${fail} FAIL`);
process.exit(fail ? 1 : 0);
