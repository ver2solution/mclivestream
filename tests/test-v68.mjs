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
const suForm = page.slice(page.indexOf('id="authSignUp"'), page.indexOf('</form>', page.indexOf('id="authSignUp"')));
t('form dang ky: du 5 truong (email, SDT Zalo, mat khau, nhap lai, dong y marketing)',
  suForm.includes('id="authSuEmail"') && suForm.includes('id="authSuPhone"')
  && suForm.includes('id="authSuPass"') && suForm.includes('id="authSuPass2"')
  && suForm.includes('id="authSuMarketing"'));
t('form dang ky: mat khau co nut Hien/An (ca 2 o)',
  suForm.includes('data-pw-for="authSuPass"') && suForm.includes('data-pw-for="authSuPass2"'));
t('form dang ky: KHONG co truong doanh thu (Q4 chot 16:27: khong bat buoc, khong them vao form)',
  !/doanh thu|revenue/i.test(suForm));
t('form dang ky: KHONG gop form ho so (khong co ten shop, logo, yeu cau tuyen)',
  !/ten shop|logo fanpage|yeu cau tuyen/i.test(suForm));

// ---- (4) Chon loai tai khoan TRUOC khi hien form (chi 2 loai) ----
t('chon loai: 2 nut .auth-type-btn (model/shop), dung ten loai da chot 14:59',
  page.includes('data-auth-type-pick="model"') && page.includes('data-auth-type-pick="shop"')
  && page.includes('Cá nhân tìm việc') && page.includes('Doanh nghiệp / Tổ chức'));
t('chon loai: form dang ky an san (hidden), chi hien sau khi chon loai',
  page.includes('<form id="authSignUp" data-track="form-dang-ky" hidden>')
  && page.includes('id="authTypeChooser"'));
t('chon loai: co dong "Doi loai tai khoan" + hien ten loai da chon',
  page.includes('id="authTypeChange"') && page.includes('id="authTypeName"'));
t('chon loai: script dat accountType theo lua chon (model/shop) truoc khi dang ky',
  page.includes("authCfg.accountType = kind") || page.includes('authCfg.accountType=kind'));

// ---- (5) Dang nhap xong quay lai trang truoc (?next=) ----
t('?next=: co ham safeNext chan URL ngoai/.. va redirect sau dang nhap',
  page.includes('function safeNext') && page.includes("location.href = nextUrl")
  && page.includes("'..'") && page.includes("'://'"));
t('?next=: ho tro ?auth=register mo thang dang ky + ?type= chon san loai',
  page.includes("params.get('auth') === 'register'") && page.includes("params.get('type')"));
t('?auth=forgot: chuyen sang dat-lai-mat-khau.html (khong co view forgot trong trang)',
  page.includes("params.get('auth') === 'forgot'") && page.includes("location.replace('dat-lai-mat-khau.html')"));

// ---- (6) Owner-note + ghi chu truong bat buoc + xac nhan email ----
t('owner-note dung van ban da chot (Dang ky > Dang nhap de sua ho so / Zalo go bo)',
  page.includes('để sửa hồ sơ này, hoặc liên hệ')
  && page.includes('https://zalo.me/0329983699'));
t('ghi chu truong bat buoc: dien tiep ho so theo bo loc (tinh, linh vuc, gio lam, luong) + lien he dung xac nhan so huu + cong diem',
  page.includes('class="auth-note"') && page.includes('tỉnh, lĩnh vực, giờ làm, lương')
  && page.includes('xác nhận quyền sở hữu hồ sơ') && page.includes('cộng điểm thưởng'));
t('ghi chu xac nhan email: kiem tra email truoc khi dang nhap (2 email/gio)',
  page.includes('kiểm tra email để xác nhận tài khoản trước khi đăng nhập')
  && page.includes('mỗi giờ chỉ gửi được 2 email xác nhận'));

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
t('bang phai (3): tich diem co nhan "Sắp ra mắt" + ghi ro chua dung duoc',
  page.includes('<span class="coming">Sắp ra mắt</span>')
  && page.includes('Hệ thống điểm thưởng đang được chuẩn bị — các mức dưới đây là bảng điểm tạm thời đã công bố, chưa dùng được.'));
t('bang phai (3): dung so bang diem tam thoi da cong bo (binh luan 10/5/5, like 1, share 20/10, tran 50/30)',
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
  if (f === 'dang-nhap.html') continue;
  const h = read(f);
  const m = h.match(/<a class="btn btn-primary btn-sm"[^>]*href="([^"]*)">Đăng Nhập<\/a>/);
  if (!m || !m[1].includes('dang-nhap.html?next=')) badHeader.push(f + (m ? ' -> ' + m[1] : ' (khong thay nut)'));
}
t('nut header 39 trang (tru dang-nhap.html) deu toi dang-nhap.html?next=<trang hien tai>',
  badHeader.length === 0, badHeader.slice(0, 3).join('; '));
const shopHtml = read('danh-sach-shop.html');
t('trang Shop: 3 nut noi bo #dang-nhap-shop GIU NGUYEN (khong doi theo header)',
  (shopHtml.match(/href="#dang-nhap-shop"/g) || []).length === 3);
const loginBtnSelf = page.match(/<a class="btn btn-primary btn-sm"[^>]*href="([^"]*)">Đăng Nhập<\/a>/);
t('trang dang-nhap.html: nut header tu tro chinh no (khong ?next= de tranh vong lap)',
  loginBtnSelf && loginBtnSelf[1] === 'dang-nhap.html');

// ---- (10) Sitemap 37 URL + sw.js v68 ----
const sm = read('sitemap.xml');
t('sitemap co dang-nhap.html, tong 61 URL',
  sm.includes('dang-nhap.html') && (sm.match(/<url>/g) || []).length === 62);
const sw = read('sw.js');
t("sw.js CACHE = 'v84-shell-1'", sw.includes("const CACHE = 'v84-shell-1'"));

// ---- (11) dat-lai-mat-khau.html: form gui lai link + ve dang-nhap.html ----
const resetHtml = read('dat-lai-mat-khau.html');
t('dat-lai-mat-khau.html: co form gui lai link (requestResetForm) khi chua co session',
  resetHtml.includes('id="requestResetForm"') && resetHtml.includes('id="requestResetEmail"'));
t('dat-lai-mat-khau.html: doi mat khau xong ve dang-nhap.html (khong ve muc mau nua)',
  resetHtml.includes("location.href='dang-nhap.html'"));

// ---- (12) Hash khoa file doi o v68 ----
t("index.html giong het v68 (nut header -> dang-nhap.html?next=) (sha256)", sha256('index.html') === '27ec4c15cc98c68650084b12de7f2b839a8f76d42f1933e01fc0981abbe47aa2');
t("danh-sach-shop.html giong het v68 (nut header -> dang-nhap.html?next=) (sha256)", sha256('danh-sach-shop.html') === 'c5abd47006c2c86393dca16fa16e549b8f37a1e65b099fefbfaa1723e23b6818');
t("v20.css giong het v68 (them .auth-layout/.coming/.auth-type-btn.sel) (sha256)", sha256('v20.css') === 'c38c89a126a136fb3f99ea7d547884339c4e5b9899e48c90234f61f02a140538');
t("dat-lai-mat-khau.html giong het v68 (form gui lai link + ve dang-nhap.html) (sha256)", sha256('dat-lai-mat-khau.html') === 'd7a9da0e4c26ec5d49182f97b232687fe74887732bdf396c58d44a8ad414c626');
t("dang-nhap.html giong het v78 (F-05a signedInNow) (sha256)", sha256('dang-nhap.html') === 'e9a1f910be96d489370fa7669e57b6ad2c51955c4c23bf11189131022ce4ec70');
console.log(`v68: ${pass} PASS, ${fail} FAIL`);
process.exit(fail ? 1 : 0);
