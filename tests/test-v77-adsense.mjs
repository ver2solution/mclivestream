/* v77 AdSense tests — Node only, no browser. v77 = 4 TRANG BAT BUOC CHO
   GOOGLE ADSENSE (yeu cau nguoi dung 07/11/2026):
   (1) 4 trang moi o thu muc goc, clone shell cua quy-tac-diem-thuong.html:
       gioi-thieu.html, chinh-sach-bao-mat.html, dieu-khoan-su-dung.html,
       lien-he.html — title/description/canonical/OG (og-brand.jpg 1200x630)/
       twitter:card summary_large_image/JSON-LD WebPage day du, H1 dung ten
       trang, noi dung chia muc H2, cuoi trang link ve trang chu + 3 trang con lai.
   (2) Footer MOI file HTML (46 file cu + 4 file moi = 50) co dong link
       .foot-legal toi 4 trang (goc: href tran; bai-viet/: href ../).
   (3) v20.css them luat .foot-legal; sitemap.xml 42 -> 61 URL (khong trung);
       sw.js CACHE 'v76-shell-1' -> 'v77-shell-1' (bat buoc vi v20.css doi).
   (4) Noi dung chi dung thong tin da cong khai (Zalo 032 998 3699, Facebook
       Ver2solutionAgency) — KHONG bia dia chi, ma so thue, ngay thanh lap,
       KHONG dang email (chua cong khai tren web). */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let pass = 0, fail = 0;
function t(name, cond, extra = '') { if (cond) { pass++; console.log('PASS v77-adsense:', name); } else { fail++; console.log('FAIL v77-adsense:', name, extra); } }
const BASE = 'https://ver2solution.github.io/mclivestream/';
const BRAND_IMG = BASE + 'images/og-brand.jpg';
const sha = f => crypto.createHash('sha256').update(fs.readFileSync(path.join(root, f))).digest('hex');

const PAGES = {
  'gioi-thieu.html': { title: 'Về chúng tôi — Ver2Solution', h1: 'Về chúng tôi' },
  'chinh-sach-bao-mat.html': { title: 'Chính sách bảo mật — Ver2Solution', h1: 'Chính sách bảo mật' },
  'dieu-khoan-su-dung.html': { title: 'Điều khoản sử dụng — Ver2Solution', h1: 'Điều khoản sử dụng' },
  'lien-he.html': { title: 'Liên hệ — Ver2Solution', h1: 'Liên hệ' },
};
const OTHER = {
  'gioi-thieu.html': ['chinh-sach-bao-mat.html', 'dieu-khoan-su-dung.html', 'lien-he.html'],
  'chinh-sach-bao-mat.html': ['gioi-thieu.html', 'dieu-khoan-su-dung.html', 'lien-he.html'],
  'dieu-khoan-su-dung.html': ['gioi-thieu.html', 'chinh-sach-bao-mat.html', 'lien-he.html'],
  'lien-he.html': ['gioi-thieu.html', 'chinh-sach-bao-mat.html', 'dieu-khoan-su-dung.html'],
};

// ---- (A) 4 trang moi: ton tai + shell chuan ----
for (const [slug, spec] of Object.entries(PAGES)) {
  const p = path.join(root, slug);
  t(`${slug}: file ton tai`, fs.existsSync(p));
  const html = fs.readFileSync(p, 'utf8');
  t(`${slug}: doctype + lang vi`, html.startsWith('<!DOCTYPE html><html lang="vi">'));
  t(`${slug}: title dung`, html.includes(`<title>${spec.title}</title>`));
  t(`${slug}: H1 dung`, html.includes(`<h1>${spec.h1}</h1>`));
  t(`${slug}: canonical dung`, html.includes(`<link rel="canonical" href="${BASE}${slug}">`));
  t(`${slug}: og:title + og:description + og:url khop`, html.includes(`<meta property="og:title" content="${spec.title}">`) && html.includes(`<meta property="og:url" content="${BASE}${slug}">`) && html.includes('<meta property="og:description"'));
  t(`${slug}: og:image brand 1200x630 + type + alt + locale`, html.includes(`<meta property="og:image" content="${BRAND_IMG}">`) && html.includes('<meta property="og:image:width" content="1200">') && html.includes('<meta property="og:image:height" content="630">') && html.includes('<meta property="og:image:type" content="image/jpeg">') && html.includes('<meta property="og:image:alt"') && html.includes('<meta property="og:locale" content="vi_VN">'));
  t(`${slug}: twitter summary_large_image + twitter:image brand`, html.includes('<meta name="twitter:card" content="summary_large_image">') && html.includes(`<meta name="twitter:image" content="${BRAND_IMG}">`));
  t(`${slug}: JSON-LD WebPage dung ten + url`, html.includes('"@type":"WebPage"') && html.includes(`"name":"${spec.title}"`) && html.includes(`"url":"${BASE}${slug}"`));
  t(`${slug}: header/nav/footer giong shell quy-tac`, html.includes('<header class="site-head">') && html.includes('href="danh-sach-mau.html"') && html.includes('href="danh-sach-shop.html"') && html.includes('href="tin-tuc.html"') && html.includes('<footer class="site-foot">'));
  t(`${slug}: nap js/app.js + js/analytics.js`, html.includes('<script src="js/app.js"></script>') && html.includes('<script src="js/analytics.js"></script>'));
  t(`${slug}: co it nhat 2 muc H2`, (html.match(/<h2>/g) || []).length >= 2, 'got ' + (html.match(/<h2>/g) || []).length);
  t(`${slug}: cuoi trang link ve trang chu + 3 trang con lai`, html.includes('<a href="index.html">') && OTHER[slug].every(o => html.includes(`<a href="${o}">`)));
  t(`${slug}: KHONG con chu template quy-tac`, !html.includes('Quy tắc cộng điểm thưởng của Ver2Solution: bình luận'));
}

// ---- (B) Chinh sach bao mat: doan Google AdSense bat buoc ----
const privacy = fs.readFileSync(path.join(root, 'chinh-sach-bao-mat.html'), 'utf8');
t('bao-mat: co doan Google AdSense nguyen van', privacy.includes('Bên thứ ba, bao gồm Google, sử dụng cookie để phân phối quảng cáo dựa trên các lần truy cập trước đây của người dùng vào trang web này hoặc các trang web khác.'));
t('bao-mat: link tat quang cao ca nhan hoa (adssettings + aboutads)', privacy.includes('https://adssettings.google.com') && privacy.includes('www.aboutads.info/choices'));
t('bao-mat: ghi ro hien CHUA hien thi quang cao', privacy.includes('CHƯA hiển thị quảng cáo'));
t('bao-mat: neu analytics an danh (khong thu IP/email/SDT/dau van tay, khong doc o nhap)', privacy.includes('KHÔNG') && privacy.includes('địa chỉ IP') && privacy.includes('dấu vân tay') && privacy.includes('KHÔNG') && privacy.includes('nội dung bạn gõ trong các ô nhập'));
t('bao-mat: neu Supabase + Google + GitHub Pages la ben thu ba', privacy.includes('Supabase') && privacy.includes('GitHub Pages'));
t('bao-mat: quyen xem/sua/xoa + go ho so qua Zalo 032 998 3699', privacy.includes('032 998 3699') && privacy.includes('Yêu cầu gỡ hồ sơ'));

// ---- (C) Gioi thieu: su that tu trang chu, khong bia ----
const about = fs.readFileSync(path.join(root, 'gioi-thieu.html'), 'utf8');
t('gioi-thieu: hon 8 nam + 1.000 khach + Thaco/TPBank/Coc Coc/Dem Kim Cuong', about.includes('hơn 8 năm') && about.includes('1.000 khách hàng') && about.includes('Thaco Trường Hải') && about.includes('TPBank') && about.includes('Cốc Cốc') && about.includes('Đêm Kim Cương'));
t('gioi-thieu: du 4 mang (mau livestream / lo xa kho / xuong may / tin tuc)', about.includes('MC livestream') && about.includes('Lô xả kho') && about.includes('Xưởng may gia công') && about.includes('Tin tức thị trường'));

// ---- (D) Dieu khoan: dung quy tac site ----
const terms = fs.readFileSync(path.join(root, 'dieu-khoan-su-dung.html'), 'utf8');
t('dieu-khoan: dung 2 loai tai khoan', terms.includes('Cá nhân tìm việc') && terms.includes('Doanh nghiệp / Tổ chức'));
t('dieu-khoan: nhan CHUA XAC NHAN + link bai goc + nut go', terms.includes('CHƯA XÁC NHẬN ĐỒNG Ý ĐĂNG WEB') && terms.includes('Yêu cầu gỡ hồ sơ'));
t('dieu-khoan: lo xa kho 60 ngay + xuong may khong gioi han', terms.includes('60 ngày') && terms.includes('không giới hạn thời gian'));
t('dieu-khoan: khong thu phi + khong trung gian/khong giu tien + COD', terms.includes('không thu bất kỳ phí dịch vụ nào') && terms.includes('không trung gian và không giữ tiền') && terms.includes('COD'));
t('dieu-khoan: link toi quy-tac-diem-thuong.html', terms.includes('href="quy-tac-diem-thuong.html"'));
t('dieu-khoan: luat ap dung la phap luat Viet Nam', terms.includes('pháp luật Việt Nam'));

// ---- (E) Lien he: chi kenh da cong khai ----
const contact = fs.readFileSync(path.join(root, 'lien-he.html'), 'utf8');
t('lien-he: Zalo 032 998 3699 + link zalo.me + la kenh tra loi nhanh nhat', contact.includes('032 998 3699') && contact.includes('https://zalo.me/0329983699') && contact.includes('trả lời nhanh nhất'));
t('lien-he: Facebook Ver2solutionAgency', contact.includes('https://www.facebook.com/Ver2solutionAgency'));

// ---- (F) KHONG bia thong tin lien he tren 4 trang moi ----
for (const slug of Object.keys(PAGES)) {
  const html = fs.readFileSync(path.join(root, slug), 'utf8');
  t(`${slug}: khong co dia chi/ma so thue/DKKD bia`, !/mã số thuế|Mã số thuế|ĐKKD|đăng ký kinh doanh|GCNĐKKD/i.test(html));
  t(`${slug}: khong dang email (chua cong khai tren web)`, !html.includes('ver2solution@gmail.com'));
}

// ---- (G) Footer: moi file HTML co du 4 link, dung duong dan tuong doi ----
function allHtml() {
  const out = [];
  (function walk(dir) {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) walk(p);
      else if (e.name.endsWith('.html')) out.push(p);
    }
  })(root);
  return out;
}
const files = allHtml();
t('tong so file HTML = 66 (65 cu + 1 tinh-lai-1111 v83)', files.length === 66, 'got ' + files.length);
let footerOk = true, footerDetail = '';
for (const f of files) {
  const html = fs.readFileSync(f, 'utf8');
  const rel = path.relative(root, f);
  const prefix = rel.startsWith('bai-viet' + path.sep) ? '../' : '';
  const count = (html.match(/class="foot-legal"/g) || []).length;
  const linksOk = ['gioi-thieu.html', 'chinh-sach-bao-mat.html', 'dieu-khoan-su-dung.html', 'lien-he.html']
    .every(s => html.includes(`<a href="${prefix}${s}">`));
  if (count !== 1 || !linksOk) { footerOk = false; footerDetail += rel + ' '; }
}
t('footer: moi file co DUNG 1 dong foot-legal + du 4 link dung prefix', footerOk, footerDetail || 'ok');
t('footer: khong file nao bi chen 2 lan', files.every(f => (fs.readFileSync(f, 'utf8').match(/class="foot-legal"/g) || []).length <= 1));

// ---- (H) CSS + sitemap + sw.js ----
const css = fs.readFileSync(path.join(root, 'v20.css'), 'utf8');
t('v20.css: co luat .foot-legal (+ link gach chan)', css.includes('.site-foot .foot-legal{') && css.includes('.site-foot .foot-legal a{'));
const sm = fs.readFileSync(path.join(root, 'sitemap.xml'), 'utf8');
const locs = [...sm.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1]);
t('sitemap: 62 URL', locs.length === 62, 'got ' + locs.length);
t('sitemap: co 4 URL trang AdSense moi', ['gioi-thieu.html', 'chinh-sach-bao-mat.html', 'dieu-khoan-su-dung.html', 'lien-he.html'].every(p => locs.includes(BASE + p)));
t('sitemap: khong trung URL', new Set(locs).size === locs.length);
const swJs = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');
t("sw.js CACHE = 'v84-shell-1'", swJs.includes("const CACHE = 'v84-shell-1';"));
t('sw.js: khong con cache cu (v76)', !swJs.includes('v76-shell-1'));
t('sw.js: van la ban v60 (ghi chu dau file)', swJs.includes('/* v60 service worker'));

console.log(`\nv77-adsense: ${pass} PASS, ${fail} FAIL`);
process.exit(fail ? 1 : 0);
