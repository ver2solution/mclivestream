/* v45 tests — Node only, no browser. v45 = 4 phan (nguoi dung chot
   rang sang 06/11/2026, xem MEMORY.md):
   (1) O LOC GIA TRI: trang Mau them fRevMin (doanh thu tu, trieu) +
       fWageMin (luong gio tu, d/gio); trang Shop them fPayType (loai luong)
       + fPayMin (muc luong toi thieu, disabled toi khi chon loai) + doi
       nhan fShopShift thanh "Giờ làm tuyển mẫu". Ham parseMoneyInput
       hieu "150k"/"150.000"/"1,5". Dong bo URL revmin=/wagemin=/paytype=/
       paymin= + prefill + nut Dat lai reset ca o moi.
   (2) THE AUTH MAU CHUAN: 1 the, CHI 1 view hien tai 1 thoi diem (mac
       dinh Dang nhap; link "Chua co tai khoan? Dang ky" + "Quen mat khau?"
       duoi form; view Dang ky co link quay lai; view Quen mat khau chi co
       o Email + link "<- Quay lai dang nhap"). Khi DA dang nhap thi AN HET
       3 view, chi hien hop "Da dang nhap" + nut "Vao Trang cua toi" (mau)
       + nut "Dang xuat". GIU NGUYEN id form (mauSignUp/mauSignIn/mauForgot;
       shopSignUp/shopSignIn/shopForgot) + handler Supabase. Nut hien/an
       mat khau cho o mat khau. Chuyen view bang showAuthView + data-track.
   (3) NUT "DANG TIN TUYEN MAU" -> "DANG NHAP" + FORM DANG TIN CHAN SAU
       DANG NHAP (nguoi dung nhac lai ~01:32): header trang Shop + nut
       hero doi thanh "Đăng Nhập" (href -> #dang-nhap-shop); muc #dang-tin
       khi CHUA dang nhap chi hien cong "Ban can dang nhap..." + nut
       "Đăng Nhập", AN form jobForm + notice; khi DA dang nhap moi hien
       form + notice. GIU NGUYEN: link "Xuong muc Dang tin tuyen mau" trong
       hop da dang nhap, cau gioi thieu the auth, tieu de h2 cua muc
       #dang-tin. Cau empty-state (shop, dong 166 + 180) sua cho khop
       ("dang nhap roi dang tin..."); cau tuong tu o trang Mau KHONG ton
       tai (kiem tra grep: chi co o trang Shop) nen khong sua gi o trang
       Mau. Nut header "Đăng tin tuyển mẫu" o cac trang khac VAN GIU
       (dan toi trang Shop, van dung) — ngoai pham vi phan 3.
   (4) POPUP CHON LOAI TAI KHOAN khi an "Đăng ký": overlay dung lai mau
       .gopy-overlay/.gopy-box, 2 nut lon (Cua hang/Doanh nghiep + Tim
       viec); chon dung loai thi dong popup + hien view Dang ky; chon loai
       kia thi sang trang kia kem ?auth=register. The auth doc URL khi tai
       trang: ?auth=register mo view Dang ky, ?auth=forgot mo view Quen
       mat khau. Popup co nut Dong + bam ra ngoai de dong.
   Quy tac chung (nhu v44): KHONG sua chuoi DA CHOT (disclaimer v40, dong
   PR v41, 2 cau FAQ v42, owner-note v42), KHONG sua du lieu goc (20 mau,
   30 shop, 50 bai) va D1–D9, KHONG sua so lieu/ngay/ten rieng/URL/slug.
   sw.js CACHE = 'v45-shell-1'. */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let pass = 0, fail = 0;
function t(name, cond, extra = '') { if (cond) { pass++; console.log('PASS v45:', name); } else { fail++; console.log('FAIL v45:', name, extra); } }
const D = (() => { const sb = { window: {} }; vm.createContext(sb); vm.runInContext(fs.readFileSync(path.join(root, 'js/data.js'), 'utf8'), sb); return sb.window.V20_DATA; })();
const V = (() => { const sb = { window: {}, module: { exports: {} }, console }; vm.createContext(sb); vm.runInContext(fs.readFileSync(path.join(root, 'js/data.js'), 'utf8'), sb); vm.runInContext(fs.readFileSync(path.join(root, 'js/app.js'), 'utf8'), sb); return sb.window.V20; })();
const appJs = fs.readFileSync(path.join(root, 'js/app.js'), 'utf8');
const shopHtml = fs.readFileSync(path.join(root, 'danh-sach-shop.html'), 'utf8');
const mauHtml = fs.readFileSync(path.join(root, 'danh-sach-mau.html'), 'utf8');
const authUiJs = fs.readFileSync(path.join(root, 'js/auth-ui.js'), 'utf8'); // v46: the auth chuyen vao module chung
const indexHtml = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const css = fs.readFileSync(path.join(root, 'v20.css'), 'utf8');
const swJs = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');
const count = (s, sub) => (s.split(sub).length - 1);

// ---- (1a) parseMoneyInput ----
t('parseMoneyInput: "150k"/"150K"/"150.000"/"150 000" -> 150000, "15" -> 15, "1,5" -> 1.5',
  V.parseMoneyInput('150k') === 150000 && V.parseMoneyInput('150K') === 150000
  && V.parseMoneyInput('150.000') === 150000 && V.parseMoneyInput('150 000') === 150000
  && V.parseMoneyInput('15') === 15 && V.parseMoneyInput('1,5') === 1.5);
t('parseMoneyInput: rong / "abc" / "0" / "-5" / "k" -> null',
  V.parseMoneyInput('') === null && V.parseMoneyInput('abc') === null
  && V.parseMoneyInput('0') === null && V.parseMoneyInput('-5') === null
  && V.parseMoneyInput('k') === null && V.parseMoneyInput(null) === null);
t('parseMoneyInput duoc export qua window.V20',
  typeof V.parseMoneyInput === 'function');

// ---- (1b) filterModels: revMin / wageMin ----
t('filterModels revMin=1 (trieu): 0 mau (0/20 co doanh thu that, dung thiet ke)',
  V.filterModels(D.models, { revMin: 1 }).length === 0);
t('filterModels revMin=null: du 20 mau',
  V.filterModels(D.models, { revMin: null }).length === 20);
t('filterModels wageMin: 120000 -> 3 mau, 200000 -> 1 mau (250000), 300000 -> 0',
  V.filterModels(D.models, { wageMin: 120000 }).length === 3
  && V.filterModels(D.models, { wageMin: 200000 }).length === 1
  && V.filterModels(D.models, { wageMin: 300000 }).length === 0);
t('filterModels ket hop: Ha Noi + wageMin 120000 -> dung th-08',
  V.filterModels(D.models, { prov: 'Hà Nội', wageMin: 120000 }).map(m => m.id).join(',') === 'th-08');

// ---- (1c) filterShops: payType / payMin ----
t('filterShops payType: hourly -> 13 shop, monthly -> 7 shop, "" -> 30',
  V.filterShops(D.shops, { payType: 'hourly' }).length === 13
  && V.filterShops(D.shops, { payType: 'monthly' }).length === 7
  && V.filterShops(D.shops, { payType: '' }).length === 30);
t('filterShops: sh-05 co ca 2 loai luong (hien o ca hourly + monthly)',
  V.filterShops(D.shops, { payType: 'hourly' }).some(s => s.id === 'sh-05')
  && V.filterShops(D.shops, { payType: 'monthly' }).some(s => s.id === 'sh-05'));
t('filterShops payMin: hourly+150000 -> 2, hourly+100000 -> 6, monthly+15 -> 7, monthly+18 -> 3',
  V.filterShops(D.shops, { payType: 'hourly', payMin: 150000 }).length === 2
  && V.filterShops(D.shops, { payType: 'hourly', payMin: 100000 }).length === 6
  && V.filterShops(D.shops, { payType: 'monthly', payMin: 15 }).length === 7
  && V.filterShops(D.shops, { payType: 'monthly', payMin: 18 }).length === 3);
t('filterShops: payMin khong co tac dung khi chua chon loai luong (payType="" + payMin=100 -> 30)',
  V.filterShops(D.shops, { payType: '', payMin: 100 }).length === 30);
t('filterShops ket hop: Ha Noi + monthly>=15 -> sh-05, sh-30',
  V.filterShops(D.shops, { prov: 'Hà Nội', payType: 'monthly', payMin: 15 }).map(s => s.id).join(',') === 'sh-05,sh-30');

// ---- (1d) HTML o loc + URL sync + reset (kiem tra source) ----
t('trang Mau co 2 o nhap so fRevMin + fWageMin, nam sau fShift, truoc fQ',
  mauHtml.includes('<label>Doanh thu từ (triệu)</label><input id="fRevMin" type="text" inputmode="decimal"')
  && mauHtml.includes('<label>Lương giờ từ (đ/giờ)</label><input id="fWageMin" type="text" inputmode="decimal"')
  && mauHtml.indexOf('id="fRevMin"') > mauHtml.indexOf('id="fShift"')
  && mauHtml.indexOf('id="fWageMin"') > mauHtml.indexOf('id="fRevMin"')
  && mauHtml.indexOf('id="fWageMin"') < mauHtml.indexOf('id="fQ"'));
t('trang Shop co o fPayType (hourly/monthly) + fPayMin disabled + placeholder "Chọn loại lương trước"',
  shopHtml.includes('<label>Loại lương</label><select id="fPayType"')
  && shopHtml.includes('<option value="hourly">Lương theo giờ</option>')
  && shopHtml.includes('<option value="monthly">Lương theo tháng</option>')
  && shopHtml.includes('<label id="fPayMinLabel">Mức lương tối thiểu</label><input id="fPayMin" type="text" inputmode="decimal"')
  && shopHtml.includes('placeholder="Chọn loại lương trước" disabled>'));
t('trang Shop: nhan fShopShift la "Giờ làm" (v57: viet cho doi tuong Mau, het "Giờ làm tuyển mẫu")',
  shopHtml.includes('<label>Giờ làm</label><select id="fShopShift"')
  && !shopHtml.includes('<label>Giờ làm tuyển mẫu</label>'));
t('app.js: readForm Mau/Shop doc o moi qua elVal (an toan khi o vang mat); prefill moi co guard null',
  appJs.includes("revMin:parseMoneyInput(elVal('fRevMin'))")
  && appJs.includes("wageMin:parseMoneyInput(elVal('fWageMin'))")
  && appJs.includes("payType:elVal('fPayType')")
  && appJs.includes("payMin:parseMoneyInput(elVal('fPayMin'))")
  && appJs.includes("if(p.revmin){ var rv=document.getElementById('fRevMin'); if(rv) rv.value=p.revmin; }")
  && appJs.includes("if(p.wagemin){ var wm=document.getElementById('fWageMin'); if(wm) wm.value=p.wagemin; }")
  && appJs.includes("if(p.paytype){ var pt=document.getElementById('fPayType'); if(pt) pt.value=p.paytype; }")
  && appJs.includes("if(p.paymin){ var pm=document.getElementById('fPayMin'); if(pm) pm.value=p.paymin; }")
  && appJs.includes('function elVal(id)'));
t('app.js: nut Dat lai reset ca o moi (fRevMin/fWageMin/fPayType/fPayMin) + syncPayMin',
  appJs.includes("'fRevMin','fWageMin','fQ'") && appJs.includes("'fPayType','fPayMin']")
  && appJs.includes('function syncPayMin()')
  && appJs.includes("lab.textContent='Lương giờ tối thiểu (đ/giờ)'")
  && appJs.includes("lab.textContent='Lương tháng tối thiểu (triệu/tháng)'"));

// ---- (2) the auth mau chuan — trang Mau ----
t('trang Mau: chi view login hien mac dinh (register/forgot co hidden)',
  mauHtml.includes('<div class="auth-view" id="mauViewLogin">')
  && mauHtml.includes('<div class="auth-view" id="mauViewRegister" hidden>')
  && mauHtml.includes('<div class="auth-view" id="mauViewForgot" hidden>'));
t('trang Mau: het 3 tieu de xep chong cu ("1. Đăng ký", "2. Đăng nhập", "3. Quên mật khẩu")',
  !mauHtml.includes('<h3>1. Đăng ký tài khoản mẫu</h3>')
  && !mauHtml.includes('<h3>2. Đăng nhập</h3>')
  && !mauHtml.includes('<h3>3. Quên mật khẩu</h3>'));
t('trang Mau: duoi form login co 2 link "Chưa có tài khoản? Đăng ký" (mo popup) + "Quên mật khẩu?"',
  mauHtml.includes('data-auth-view="register" data-auth-popup="1"')
  && mauHtml.includes('Chưa có tài khoản? Đăng ký')
  && mauHtml.includes('data-auth-view="forgot"')
  && mauHtml.includes('Quên mật khẩu?'));
t('trang Mau: view Dang ky co link quay lai, view Quen mat khau co link "← Quay lại đăng nhập"',
  mauHtml.includes('Đã có tài khoản? Đăng nhập')
  && mauHtml.includes('← Quay lại đăng nhập'));
t('trang Mau: id form khong doi, moi id xuat hien dung 1 lan (mauSignUp/mauSignIn/mauForgot)',
  count(mauHtml, 'id="mauSignUp"') === 1 && count(mauHtml, 'id="mauSignIn"') === 1
  && count(mauHtml, 'id="mauForgot"') === 1);
t('trang Mau: nut hien/an mat khau cho ca 3 o mat khau (maSiPass/maSuPass/maSuPass2)',
  mauHtml.includes('data-pw-for="maSiPass"') && mauHtml.includes('data-pw-for="maSuPass"')
  && mauHtml.includes('data-pw-for="maSuPass2"'));
t('trang Mau: user box la <div> an mac dinh, chua nut "Vào Trang của tôi →" + "Đăng xuất" + ghi chu "Sau khi đăng nhập..."',
  mauHtml.includes('<div id="mauAuthUserBox" style="display:none">')
  && !mauHtml.includes('<p id="mauAuthUserBox"')
  && mauHtml.indexOf('Vào Trang của tôi →') > mauHtml.indexOf('id="mauAuthUserBox"')
  && mauHtml.indexOf('Sau khi đăng nhập, mẫu bấm vào') > mauHtml.indexOf('id="mauAuthUserBox"')
  && mauHtml.indexOf('Sau khi đăng nhập, mẫu bấm vào') < mauHtml.indexOf('id="mauAuthTypeOverlay"')
  && !mauHtml.includes('<p><a class="btn btn-primary" href="trang-cua-toi.html">Vào Trang của tôi →</a></p>'));
t('trang Mau: v46 the auth dung js/auth-ui.js (showAuthView + ?auth= + popup), trang chi goi initAuthUI',
  authUiJs.includes('function showAuthView(v)') && authUiJs.includes('initialAuthView')
  && authUiJs.includes("get('auth')") && authUiJs.includes('function openAuthType()')
  && mauHtml.includes('V2SAuthUI.initAuthUI({') && mauHtml.includes("accountType: 'model'")
  && !mauHtml.includes('function showAuthView(v)') && !mauHtml.includes('function openAuthType()'));

// ---- (2) the auth mau chuan — trang Shop ----
t('trang Shop: chi view login hien mac dinh (register/forgot co hidden)',
  shopHtml.includes('<div class="auth-view" id="shViewLogin">')
  && shopHtml.includes('<div class="auth-view" id="shViewRegister" hidden>')
  && shopHtml.includes('<div class="auth-view" id="shViewForgot" hidden>'));
t('trang Shop: het 3 tieu de xep chong cu',
  !shopHtml.includes('<h3>1. Đăng ký tài khoản shop</h3>')
  && !shopHtml.includes('<h3>2. Đăng nhập</h3>')
  && !shopHtml.includes('<h3>3. Quên mật khẩu</h3>'));
t('trang Shop: duoi form login co 2 link Dang ky (mo popup) + Quen mat khau; view Dang ky/forgot co link quay lai',
  shopHtml.includes('data-auth-view="register" data-auth-popup="1"')
  && shopHtml.includes('Chưa có tài khoản? Đăng ký')
  && shopHtml.includes('data-auth-view="forgot"')
  && shopHtml.includes('Đã có tài khoản? Đăng nhập')
  && shopHtml.includes('← Quay lại đăng nhập'));
t('trang Shop: id form khong doi, moi id xuat hien dung 1 lan (shopSignUp/shopSignIn/shopForgot)',
  count(shopHtml, 'id="shopSignUp"') === 1 && count(shopHtml, 'id="shopSignIn"') === 1
  && count(shopHtml, 'id="shopForgot"') === 1);
t('trang Shop: nut hien/an mat khau cho ca 3 o mat khau (shSiPass/shSuPass/shSuPass2)',
  shopHtml.includes('data-pw-for="shSiPass"') && shopHtml.includes('data-pw-for="shSuPass"')
  && shopHtml.includes('data-pw-for="shSuPass2"'));
t('trang Shop: user box la <div> an mac dinh, giu link "Xuống mục Đăng tin tuyển mẫu ↓" + nut Dang xuat',
  shopHtml.includes('<div id="shopAuthUserBox" style="display:none">')
  && !shopHtml.includes('<p id="shopAuthUserBox"')
  && shopHtml.includes('Xuống mục Đăng tin tuyển mẫu ↓')
  && shopHtml.indexOf('Xuống mục Đăng tin tuyển mẫu ↓') > shopHtml.indexOf('id="shopAuthUserBox"'));
t('trang Shop: v46 showAuthView + ?auth= o js/auth-ui.js; updateJobGate van o trang (init script) + goi initAuthUI',
  authUiJs.includes('function showAuthView(v)') && authUiJs.includes('initialAuthView')
  && shopHtml.includes('function updateJobGate(u)')
  && shopHtml.includes('V2SAuthUI.initAuthUI({') && shopHtml.includes("accountType: 'shop'")
  && !shopHtml.includes('function showAuthView(v)'));

// ---- (3) nut "Đăng tin tuyển mẫu" -> "Đăng Nhập" + chan #dang-tin ----
t('phan 3: header trang Shop la "Đăng Nhập" href dang-nhap.html?next=danh-sach-shop.html (v68: trang dang nhap rieng)',
  shopHtml.includes('<a class="btn btn-primary btn-sm" href="dang-nhap.html?next=danh-sach-shop.html">Đăng Nhập</a>'));
t('phan 3: nut hero trang Shop la "Đăng Nhập ↓" href #dang-nhap-shop',
  shopHtml.includes('<a class="btn btn-ghost" href="#dang-nhap-shop">Đăng Nhập ↓</a>'));
t('phan 3: chuoi "Đăng tin tuyển mẫu" (viet hoa) chi con dung 3 cho giu nguyen (intro auth + link user box + h2 muc)',
  count(shopHtml, 'Đăng tin tuyển mẫu') === 3,
  'dem duoc ' + count(shopHtml, 'Đăng tin tuyển mẫu'));
t('phan 3: 3 cho giu nguyen dung van ban (intro auth, link user box, h2 #dang-tin)',
  shopHtml.includes('rồi dùng mục Đăng tin tuyển mẫu bên dưới')
  && shopHtml.includes('<a href="#dang-tin">Xuống mục Đăng tin tuyển mẫu ↓</a>')
  && shopHtml.includes('<h2 id="form-title">Đăng tin tuyển mẫu</h2>'));
t('phan 3: #dang-tin co cong "Bạn cần đăng nhập để đăng tin tuyển mẫu." + nut "Đăng Nhập"',
  shopHtml.includes('<div id="jobGate"><p>Bạn cần đăng nhập để đăng tin tuyển mẫu.</p><p><a class="btn btn-primary" href="#dang-nhap-shop">Đăng Nhập</a></p></div>'));
t('phan 3: form jobForm + notice nam trong #jobFormWrap co hidden (an khi chua dang nhap)',
  shopHtml.includes('<div id="jobFormWrap" hidden>')
  && shopHtml.indexOf('id="jobForm"') > shopHtml.indexOf('id="jobFormWrap"')
  // Chu y: "Lưu thật vào hệ thống:" cung xuat hien o muc #ho-so-shop (truoc
  // #dang-tin) nen phai tim tu vi tri jobFormWrap tro di, khong dung indexOf
  // tu dau file.
  && shopHtml.indexOf('Lưu thật vào hệ thống:', shopHtml.indexOf('id="jobFormWrap"')) > shopHtml.indexOf('id="jobFormWrap"'));
t('phan 3: cau empty-state sua cho khop (dang nhap roi moi dang tin), het cau cu',
  shopHtml.includes('Shop đăng ký hồ sơ ở form bên dưới; đăng nhập để đăng tin tuyển mẫu.')
  && shopHtml.includes('Shop đăng nhập rồi đăng tin tuyển mẫu ở <a href="#dang-tin">mục bên dưới</a>')
  && !shopHtml.includes('Shop đăng ký hồ sơ và đăng tin ở form bên dưới')
  && !shopHtml.includes('Shop đăng tin tuyển mẫu ở <a href="#dang-tin">form bên dưới</a>'));

// ---- (4) popup chon loai tai khoan ----
t('phan 4: popup Mau co 2 nut lon dung van ban + nut Dong',
  mauHtml.includes('id="mauAuthTypeOverlay"')
  && mauHtml.includes('<b>Đăng ký tài khoản Cửa hàng / Doanh nghiệp</b><span>Dành cho shop cần tìm mẫu livestream</span>')
  && mauHtml.includes('<b>Đăng ký tài khoản tìm việc</b><span>Dành cho mẫu livestream tìm việc</span>')
  && mauHtml.includes('id="mauAuthTypeClose"'));
t('phan 4: popup Shop co 2 nut lon dung van ban + nut Dong',
  shopHtml.includes('id="shAuthTypeOverlay"')
  && shopHtml.includes('<b>Đăng ký tài khoản Cửa hàng / Doanh nghiệp</b><span>Dành cho shop cần tìm mẫu livestream</span>')
  && shopHtml.includes('<b>Đăng ký tài khoản tìm việc</b><span>Dành cho mẫu livestream tìm việc</span>')
  && shopHtml.includes('id="shAuthTypeClose"'));
t('phan 4: popup dung lai class .gopy-overlay/.gopy-box (khong them class overlay moi)',
  mauHtml.includes('<div class="gopy-overlay" id="mauAuthTypeOverlay"><div class="gopy-box" role="dialog" aria-label="Chọn loại tài khoản">')
  && shopHtml.includes('<div class="gopy-overlay" id="shAuthTypeOverlay"><div class="gopy-box" role="dialog" aria-label="Chọn loại tài khoản">'));
t('phan 4: v46 chon loai kia thi sang trang kia kem ?auth=register (crossRegisterUrl trong init call)',
  mauHtml.includes("crossRegisterUrl: 'danh-sach-shop.html?auth=register#dang-nhap-shop'")
  && shopHtml.includes("crossRegisterUrl: 'danh-sach-mau.html?auth=register#dang-nhap-mau'"));
t('phan 4: v46 xu ly ?auth=register/?auth=forgot 1 lan trong js/auth-ui.js; ca 2 trang deu nap module',
  authUiJs.includes("return (a === 'register' || a === 'forgot') ? a : 'login';")
  && mauHtml.includes('<script src="js/auth-ui.js"></script>')
  && shopHtml.includes('<script src="js/auth-ui.js"></script>'));

// ---- CSS auth ----
t('CSS: .auth-view[hidden], .auth-links, .pw-wrap/.pw-toggle, .auth-type-btn co trong v20.css',
  css.includes('.auth-view[hidden]{display:none}')
  && css.includes('.auth-links{')
  && css.includes('.pw-wrap{position:relative;display:block}')
  && css.includes('.pw-toggle{')
  && css.includes('.auth-type-btn{'));

// ---- chuoi DA CHOT khong doi ----
const DISCLAIMER = 'Miễn trừ trách nhiệm: Thông tin được tổng hợp từ bài đăng công khai của cộng đồng, giữ nguyên nội dung gốc. Thông tin liên hệ hiển thị để các bên tự trao đổi công việc trực tiếp với nhau. Ver2Solution không thu bất kỳ phí dịch vụ nào — đây chỉ là trang cộng đồng kết nối.';
t('chuoi chot khong doi: disclaimer v40 nguyen van trong app.js',
  appJs.includes(DISCLAIMER));
t('chuoi chot khong doi: dong PR v41 nguyen van trong index.html',
  indexHtml.includes('Ver2Solution — hơn 8 năm xây dựng hệ sinh thái dịch vụ cho shop bán hàng online và livestream. Hơn 1.000 khách hàng toàn quốc, từ shop nhỏ đến tập đoàn lớn, đã tin dùng dịch vụ của chúng tôi — gồm các dự án triển khai cùng Thaco Trường Hải, TPBank, Cốc Cốc, Đêm Kim Cương và hàng trăm doanh nghiệp khác.'));
t('chuoi chot khong doi: 2 cau hoi FAQ moi v42 nguyen van trong index.html',
  indexHtml.includes('Ver2Solution có chịu trách nhiệm về thông tin trên hồ sơ không?')
  && indexHtml.includes('Muốn sửa hồ sơ thì phải làm thế nào?'));
t('chuoi chot khong doi: owner-note v42 nguyen van trong app.js',
  appJs.includes('để sửa hồ sơ này, hoặc liên hệ') && appJs.includes('để được gỡ bỏ.'));

// ---- (D1–D9) du lieu goc khong doi ----
t('D1–D9 khong doi: th-02 "Duyênn", th-06 "ekip", th-10 "Điểm ghi trong bài"',
  D.models.find(m => m.id === 'th-02').name === 'G T MY Duyênn'
  && D.models.find(m => m.id === 'th-06').exp.includes('phối hợp ekip')
  && D.models.find(m => m.id === 'th-10').exp.includes('Điểm ghi trong bài'));
t('D1–D9 khong doi: sh-03 "80-100k/h", sh-05 "2K–2K6", sh-08 "150-170/h", sh-14 "m58–m68", sh-19 "0.5%", sh-26 "training"',
  D.shops.find(s => s.id === 'sh-03').salary === '80-100k/h'
  && D.shops.find(s => s.id === 'sh-05').req.includes('2K–2K6')
  && D.shops.find(s => s.id === 'sh-08').salary.includes('150-170/h')
  && D.shops.find(s => s.id === 'sh-14').req.includes('m58–m68')
  && D.shops.find(s => s.id === 'sh-19').salary.includes('0.5%')
  && D.shops.find(s => s.id === 'sh-26').req.includes('training'));

// ---- sw.js + du lieu ----
t("sw.js CACHE = 'v86-shell-1' + ghi chu dau file v49 (v49 bump cache)",
  swJs.includes("const CACHE = 'v86-shell-1';") && swJs.includes('/* v60 service worker'));
t('du lieu khong doi: 20 mau, 30 shop, 50 bai',
  D.models.length === 20 && D.shops.length === 30 && D.articles.length === 50,
  'mau=' + D.models.length + ' shop=' + D.shops.length + ' bai=' + D.articles.length);

console.log(`\nTOTAL v45: ${pass} PASS, ${fail} FAIL`);
process.exit(fail ? 1 : 0);
