// test-v68.mjs — v68: trang dang nhap/dang ky RIENG dang-nhap.html
// (nguoi dung yeu cau 16:24 ngay 06/11: nut "Dang Nhap" o header chi
// nhay toi muc #dang-nhap cuoi trang danh sach, khong phai trang rieng).
// Tham khao Shopee/TikTok: trang dang nhap rieng 1 cot form o giua,
// dang nhap + dang ky tren cung 1 trang, chon loai tai khoan truoc khi
// dang ky, dang nhap xong quay lai trang truoc (?next=).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sha256 = (f) => createHash('sha256').update(fs.readFileSync(path.join(root, f))).digest('hex');
const read = (f) => fs.readFileSync(path.join(root, f), 'utf8');
const exists = (f) => fs.existsSync(path.join(root, f));
let pass = 0, fail = 0;
function t(name, ok, extra = '') { if (ok) { pass++; console.log('PASS v68:', name); } else { fail++; console.log('FAIL v68:', name, extra); } }

const page = read('dang-nhap.html');
// v85: form dang ky + bo chon loai da tach sang trang rieng dang-ky.html
// (dang-nhap.html chi con dang nhap); cac muc (3)/(4)/(6) duoi day kiem
// tra tren dang-ky.html.
const regPage = read('dang-ky.html');

// ---- (1) Trang ton tai, dung head SEO + noindex (trang auth) ----
t('dang-nhap.html ton tai', exists('dang-nhap.html'));
t('head: title/mo ta/canonical/og dung trang dang nhap',
  page.includes('<title>Đăng nhập — Sàn việc làm MC Livestream Ver2Solution</title>')
  && page.includes('rel="canonical" href="https://ver2solution.github.io/mclivestream/dang-nhap.html"')
  && page.includes('noindex, nofollow'));

// ---- (2) Form dang nhap: email + mat khau + nut Hien/An ----
t('form dang nhap: authSignIn + authSiEmail + authSiPass + pw-toggle',
  page.includes('id="authSignIn"') && page.includes('id="authSiEmail"')
  && page.includes('id="authSiPass"') && page.includes('data-pw-for="authSiPass"'));
t('form dang nhap: link "Quen mat khau?" toi dat-lai-mat-khau.html (khong phai view forgot trong trang)',
  page.includes('<a href="dat-lai-mat-khau.html" data-track="mo-quen-mat-khau">Quên mật khẩu?</a>')
  && !page.includes('id="authViewForgot"'));

// ---- (3) Form dang ky: DUNG 5 truong da chot v45 (doi chieu maSu*/shSu*) ----
// Mau: maSuEmail/maSuPhone/maSuPass/maSuPass2/maSuMarketing;
// Shop: shSuEmail/shSuPhone/shSuPass/shSuPass2/shSuMarketing.
// Trang moi dung 1 form chung (5 truong giong het ca 2 loai, chi khac
// accountType dat theo lua chon) — khong thieu, khong thua.
// v85: form nay o trang rieng dang-ky.html (da tach khoi dang-nhap.html).
const suForm = regPage.slice(regPage.indexOf('id="authSignUp"'), regPage.indexOf('</form>', regPage.indexOf('id="authSignUp"')));
t('form dang ky (v85: tren dang-ky.html): du 5 truong (email, SDT Zalo, mat khau, nhap lai, dong y marketing)',
  suForm.includes('id="authSuEmail"') && suForm.includes('id="authSuPhone"')
  && suForm.includes('id="authSuPass"') && suForm.includes('id="authSuPass2"')
  && suForm.includes('id="authSuMarketing"'));
t('form dang ky (v85: tren dang-ky.html): mat khau co nut Hien/An (ca 2 o)',
  suForm.includes('data-pw-for="authSuPass"') && suForm.includes('data-pw-for="authSuPass2"'));
t('form dang ky (v85: tren dang-ky.html): KHONG co truong doanh thu (Q4 chot 16:27: khong bat buoc, khong them vao form)',
  !/doanh thu|revenue/i.test(suForm));
t('form dang ky (v85: tren dang-ky.html): KHONG gop form ho so (khong co ten shop, logo, yeu cau tuyen)',
  !/ten shop|logo fanpage|yeu cau tuyen/i.test(suForm));

// ---- (4) Chon loai tai khoan TRUOC khi hien form (chi 2 loai) ----
// v85: bo chon loai o trang rieng dang-ky.html.
t('chon loai (v85: tren dang-ky.html): 2 nut .auth-type-btn (model/shop), dung ten loai da chot 14:59',
  regPage.includes('data-auth-type-pick="model"') && regPage.includes('data-auth-type-pick="shop"')
  && regPage.includes('Cá nhân tìm việc') && regPage.includes('Doanh nghiệp / Tổ chức'));
t('chon loai (v85: tren dang-ky.html): form dang ky an san (hidden), chi hien sau khi chon loai',
  regPage.includes('<form id="authSignUp" data-track="form-dang-ky" hidden>')
  && regPage.includes('id="authTypeChooser"'));
t('chon loai (v85: tren dang-ky.html): co dong "Doi loai tai khoan" + hien ten loai da chon',
  regPage.includes('id="authTypeChange"') && regPage.includes('id="authTypeName"'));
t('chon loai (v85: tren dang-ky.html): script dat accountType theo lua chon (model/shop) truoc khi dang ky',
  regPage.includes("authCfg.accountType = kind") || regPage.includes('authCfg.accountType=kind'));

// ---- (5) Dang nhap xong quay lai trang truoc (?next=) ----
t('?next=: co ham safeNext chan URL ngoai/.. va redirect sau dang nhap',
  page.includes('function safeNext') && page.includes("location.href = nextUrl")
  && page.includes("'..'") && page.includes("'://'"));
t('?next=: ho tro ?auth=register mo thang dang ky + ?type= chon san loai',
  page.includes("params.get('auth') === 'register'") && page.includes("params.get('type')"));
t('?auth=forgot: chuyen sang dat-lai-mat-khau.html (khong co view forgot trong trang)',
  page.includes("params.get('auth') === 'forgot'") && page.includes("location.replace('dat-lai-mat-khau.html')"));

// ---- (6) Owner-note + ghi chu truong bat buoc + xac nhan email ----
t('owner-note dung van ban da chot (v85: chi con trong the ho so/chi tiet qua ownerNoteHTML, khong con tren trang dang nhap)',
  read('js/app.js').includes('để sửa hồ sơ này, hoặc liên hệ')
  && read('js/app.js').includes('https://zalo.me/0329983699'));
t('ghi chu truong bat buoc (v85: tren dang-ky.html): dien tiep ho so theo bo loc (tinh, linh vuc, gio lam, luong) + lien he dung xac nhan so huu + cong diem',
  regPage.includes('class="auth-note"') && regPage.includes('tỉnh, lĩnh vực, giờ làm, lương')
  && regPage.includes('xác nhận quyền sở hữu hồ sơ') && regPage.includes('cộng điểm thưởng'));
t('ghi chu xac nhan email (v85: xac minh email da TAT 15:26 07/11 — dang ky xong dang nhap ngay, khong can xac nhan)',
  regPage.includes('hiện không cần xác nhận qua email')
  && !regPage.includes('mỗi giờ chỉ gửi được 2 email xác nhận'));

// ---- (7) Bang phai: 2 cot, PR + mien tru + tich diem (Sap ra mat) ----
t('bo cuc: .auth-layout 2 cot (form trai, bang phai); CSS co san trong v20.css',
  page.includes('class="auth-layout"') && page.includes('class="form-card auth-side"'));
const css = read('v20.css');
t('CSS: .auth-layout 2 cot + xuong 1 cot duoi 900px + .coming + .auth-type-btn.sel',
  css.includes('.auth-layout{display:grid;grid-template-columns:minmax(0,1.05fr) minmax(0,1fr)')
  && css.includes('@media(max-width:900px){.auth-layout{grid-template-columns:1fr}}')
  && css.includes('.coming{') && css.includes('.auth-type-btn.sel{'));
t('bang phai (1): doan PR trang chu nguyen van',
  page.includes('Ver2Solution — hơn 8 năm xây dựng hệ sinh thái dịch vụ cho shop bán hàng online và livestream. Hơn 1.000 khách hàng toàn quốc, từ shop nhỏ đến tập đoàn lớn, đã tin dùng dịch vụ của chúng tôi — gồm các dự án triển khai cùng Thaco Trường Hải, TPBank, Cốc Cốc, Đêm Kim Cương và hàng trăm doanh nghiệp khác.'));
t('bang phai (1): 4 gach loi ich tai khoan',
  page.includes('Tìm mẫu livestream đang tuyển theo tỉnh, lĩnh vực, lương và giờ làm.')
  && page.includes('Đăng tin tuyển mẫu, đăng lô xả kho, đăng xưởng may nhận gia công.')
  && page.includes('Tạo và sửa hồ sơ của chính mình'));
t('bang phai (2): mien tru nguyen van + 1 cau ve tai khoan quan ly ho so cua minh',
  page.includes('Miễn trừ trách nhiệm: Thông tin được tổng hợp từ bài đăng công khai của cộng đồng, giữ nguyên nội dung gốc. Thông tin liên hệ hiển thị để các bên tự trao đổi công việc trực tiếp với nhau. Ver2Solution không thu bất kỳ phí dịch vụ nào — đây chỉ là trang cộng đồng kết nối.')
  && page.includes('Tài khoản dùng để đăng nhập và quản lý hồ sơ/tin của chính mình'));
t('bang phai (3): tich diem co nhan "Sắp ra mắt" + ghi ro chua dung duoc (v85 D2: bang diem CHINH THUC)',
  page.includes('<span class="coming">Sắp ra mắt</span>')
  && page.includes('Hệ thống điểm thưởng đang được chuẩn bị — các mức dưới đây là bảng điểm chính thức đã công bố, chưa dùng được.'));
t('bang phai (3): dung so bang diem chinh thuc da cong bo (binh luan 10/5/5, like 1, share 20/10, tran 50/30)',
  page.includes('hồ sơ shop <b>10 điểm</b>') && page.includes('hồ sơ mẫu <b>5 điểm</b>')
  && page.includes('bài báo <b>5 điểm</b>') && page.includes('Thích (Like) hồ sơ <b>1 điểm</b>')
  && page.includes('shop <b>20 điểm</b>, mẫu <b>10 điểm</b>')
  && page.includes('tài khoản shop <b>50 điểm</b>, tài khoản mẫu <b>30 điểm</b>'));
t('bang phai (3): doi diem dung gia de xuat chua bat (up-top 20/100 xu, ghim 200 xu, noi bat 80 xu) + link quy tac',
  page.includes('up-top 24h 20 xu / 7 ngày 100 xu, ghim trang chủ 7 ngày 200 xu, nổi bật tin 7 ngày 80 xu')
  && page.includes('href="quy-tac-diem-thuong.html"'));

// ---- (8) Google OAuth CHUA bat: khong co nut Google, khong goi signInWithOAuth ----
t('Google OAuth CHUA bat: trang khong co nut Google, khong goi signInWithOAuth (can cau hinh tren Supabase Dashboard)',
  !/signInWithOAuth/i.test(page) && !/google/i.test(page));

// ---- (9) Nut header toan site -> dang-nhap.html?next= ----
const allPages = fs.readdirSync(root).filter((f) => f.endsWith('.html'))
  .concat(fs.readdirSync(path.join(root, 'bai-viet')).filter((f) => f.endsWith('.html')).map((f) => 'bai-viet/' + f));
let badHeader = [];
for (const f of allPages) {
  if (f === 'dang-nhap.html' || f === 'dang-ky.html') continue;
  const h = read(f);
  const m = h.match(/<a class="btn btn-primary btn-sm"[^>]*href="([^"]*)">Đăng Nhập<\/a>/);
  if (!m || !m[1].includes('dang-nhap.html?next=')) badHeader.push(f + (m ? ' -> ' + m[1] : ' (khong thay nut)'));
}
t('nut header 39 trang (tru dang-nhap.html + dang-ky.html, v85) deu toi dang-nhap.html?next=<trang hien tai>',
  badHeader.length === 0, badHeader.slice(0, 3).join('; '));
const shopHtml = read('danh-sach-shop.html');
t('trang Shop: 3 nut noi bo #dang-nhap-shop GIU NGUYEN (khong doi theo header)',
  (shopHtml.match(/href="#dang-nhap-shop"/g) || []).length === 3);
const loginBtnSelf = page.match(/<a class="btn btn-primary btn-sm"[^>]*href="([^"]*)">Đăng Nhập<\/a>/);
t('trang dang-nhap.html: nut header tu tro chinh no (khong ?next= de tranh vong lap)',
  loginBtnSelf && loginBtnSelf[1] === 'dang-nhap.html');
const regBtnSelf = regPage.match(/<a class="btn btn-primary btn-sm"[^>]*href="([^"]*)">Đăng Nhập<\/a>/);
t('trang dang-ky.html (v85): nut header tro ve dang-nhap.html (khong ?next= de tranh vong lap)',
  regBtnSelf && regBtnSelf[1] === 'dang-nhap.html');

// ---- (10) Sitemap 37 URL + sw.js v68 ----
const sm = read('sitemap.xml');
t('sitemap co dang-nhap.html, tong 64 URL (v85: +1 dang-ky; v86: +1 thanh-ly-kiot)',
  sm.includes('dang-nhap.html') && (sm.match(/<url>/g) || []).length === 64);
const sw = read('sw.js');
t("sw.js CACHE = 'v86-shell-1'", sw.includes("const CACHE = 'v86-shell-1'"));

// ---- (11) dat-lai-mat-khau.html: form gui lai link + ve dang-nhap.html ----
const resetHtml = read('dat-lai-mat-khau.html');
t('dat-lai-mat-khau.html: co form gui lai link (requestResetForm) khi chua co session',
  resetHtml.includes('id="requestResetForm"') && resetHtml.includes('id="requestResetEmail"'));
t('dat-lai-mat-khau.html: doi mat khau xong ve dang-nhap.html (khong ve muc mau nua)',
  resetHtml.includes("location.href='dang-nhap.html'"));

// ---- (12) Hash khoa file doi o v68 ----
t("index.html giong het v68 (nut header -> dang-nhap.html?next=) (sha256)", sha256('index.html') === 'dc7ee7d6a43a904d4c63c8c85ed041e9e2c70853787062506340b061527e7e39');
t("danh-sach-shop.html giong het v68 (nut header -> dang-nhap.html?next=) (sha256)", sha256('danh-sach-shop.html') === '42ae885d402e8e24c1e89b1063ae1f07483614fac7306a6f27eaea1a17bd0f56');
t("v20.css giong het v68 (them .auth-layout/.coming/.auth-type-btn.sel) (sha256)", sha256('v20.css') === '277d60ad92802afa8b68597fda4a2dd5f85c2c1edacd6fc44999b79dc3e47d87');
t("dat-lai-mat-khau.html giong het v68 (form gui lai link + ve dang-nhap.html) (sha256)", sha256('dat-lai-mat-khau.html') === '98741663bbc8329a4c5e9303ea134860f86816178d146b9942be7c437252430d');
t("dang-nhap.html giong het v78 (F-05a signedInNow) (sha256)", sha256('dang-nhap.html') === '95f825c69c4040b252349bf13c23419644fc21baff849716ddcdc78fc33aece2');
console.log(`v68: ${pass} PASS, ${fail} FAIL`);
process.exit(fail ? 1 : 0);
