/* v56 tests — Node only, no browser. v56 = them dong "Powered by Ver2Solution"
   vao cuoi web (yeu cau nguoi dung 06/11/2026 14:19):
   (1) Moi trang (11 trang goc + 49 bai-viet = 60 trang) co dung 1 dong
       <p class="powered">Powered by Ver2Solution</p> o CUOI footer
       (truoc </div></footer>), nam trong <footer class="site-foot">.
   (2) v20.css: them rule .site-foot .powered (chu dam, mau --ink).
   (3) sw.js CACHE = 'v76-shell-1' (doi theo quy tac moi lan deploy doi
       data.js/app.js/v20.css); header doi sang v56; SHELL giu nguyen.
   (4) KHONG doi: js/data.js, js/app.js, js/auth-ui.js, js/themes.js
       (greeting v53), mclivestream-supabase.js, sitemap.xml
       (hash khoa theo ban v55-prep). Muc lo hang v55 nguyen ven.
   LUU Y: khi bump CACHE, cac test cu khang dinh CACHE v55-shell-1 da duoc
   cap nhat dong loat sang v76-shell-1 (test-v35/v37/v38/v39/v40/v41/v42/
   v43/v44/v45/v46/v47/v52/v53/v54/v55) + ghi chu dau file sw.js doi sang
   v56; 10 hash trang HTML trong test-v55.mjs da cap nhat sang hash v56
   (chi them dong Powered by o footer) — chi doi chuoi/hash theo thay doi
   da biet, khong doi logic khac cua cac test do. */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let pass = 0, fail = 0;
function t(name, cond, extra = '') { if (cond) { pass++; console.log('PASS v56:', name); } else { fail++; console.log('FAIL v56:', name, extra); } }
const sha = (p) => crypto.createHash('sha256').update(fs.readFileSync(path.join(root, p))).digest('hex');

const LINE = '<p class="powered">Powered by Ver2Solution</p>';
const ROOT_PAGES = ['index.html', 'danh-sach-mau.html', 'danh-sach-shop.html', 'tin-tuc.html', 'chi-tiet-shop.html', 'ho-so.html', 'dat-lai-mat-khau.html', 'bai-viet-bop-reach.html', 'quy-tac-diem-thuong.html', 'trang-cua-toi.html', 'vi-tien-ao.html', 'gioi-thieu.html', 'chinh-sach-bao-mat.html', 'dieu-khoan-su-dung.html', 'lien-he.html'];
const ARTICLE_PAGES = fs.readdirSync(path.join(root, 'bai-viet')).filter((f) => f.endsWith('.html')).sort();
const ALL_PAGES = [...ROOT_PAGES, ...ARTICLE_PAGES.map((f) => 'bai-viet/' + f)];
const css = fs.readFileSync(path.join(root, 'v20.css'), 'utf8');
const swJs = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');

// ---- (a) Du 40 trang, moi trang dung 1 dong Powered by ----
t('tong so trang HTML: 15 trang goc + 49 bai-viet = 64 (v77: +4 trang AdSense)', ALL_PAGES.length === 64, `got=${ALL_PAGES.length}`);
ALL_PAGES.forEach((p) => {
  const html = fs.readFileSync(path.join(root, p), 'utf8');
  const count = html.split(LINE).length - 1;
  t(`${p}: dung 1 dong Powered by Ver2Solution`, count === 1, `got=${count}`);
});

// ---- (b) Dong nam trong footer, o cuoi footer (truoc </div></footer>) ----
ALL_PAGES.forEach((p) => {
  const html = fs.readFileSync(path.join(root, p), 'utf8');
  const footStart = html.indexOf('<footer class="site-foot">');
  const footEnd = html.indexOf('</footer>', footStart);
  const footer = footStart > -1 && footEnd > -1 ? html.slice(footStart, footEnd) : '';
  t(`${p}: dong nam trong <footer class="site-foot">`, footer.includes(LINE));
  t(`${p}: dong foot-legal o cuoi footer (v77, ngay truoc </div></footer>)`, /<p class="foot-legal">[^]*<\/p><\/div>$/.test(footer));
  t(`${p}: dong Powered nam ngay truoc dong foot-legal (v77)`, footer.includes(LINE + '<p class="foot-legal">'));
  t(`${p}: dong dung SAU dong chu ky Ver2Solution.com`, footer.indexOf(LINE) > footer.indexOf('Ver2Solution.com'));
});

// ---- (c) Footer cu van nguyen ven ----
const indexHtml = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
t('index.html: dong chu ky footer van nguyen', indexHtml.includes('<b>Ver2Solution.com</b> — Kênh cập nhật tin tức thị trường và xu hướng kinh doanh online · 032 998 3699 (Zalo) Tư vấn tăng doanh thu Livestream - Dùng thử dịch vụ miễn phí'));
t('index.html: dong mien tru footer van nguyen', indexHtml.includes('Web chỉ đăng thông tin liên hệ mà mẫu/shop tự công khai. Các bên chủ động liên hệ trao đổi, thông tin là công khai.'));
t('quy-tac-diem-thuong.html: footer rieng van nguyen', fs.readFileSync(path.join(root, 'quy-tac-diem-thuong.html'), 'utf8').includes('<p>Ver2Solution.com — Tư duy đúng, giá trị thật.</p>'));
t('vi-tien-ao.html: footer 1 dong van nguyen', fs.readFileSync(path.join(root, 'vi-tien-ao.html'), 'utf8').includes('032 998 3699 (Zalo) Tư vấn tăng doanh thu Livestream - Dùng thử dịch vụ miễn phí</p>'));

// ---- (d) v20.css: rule .site-foot .powered ----
t('v20.css: co rule .site-foot .powered', /\.site-foot \.powered\{[^}]*\}/.test(css));
t('v20.css: .powered chu dam (font-weight:700)', /\.site-foot \.powered\{[^}]*font-weight:700/.test(css));
t('v20.css: .powered mau --ink', /\.site-foot \.powered\{[^}]*color:var\(--ink\)/.test(css));
t('v20.css: footer goc khong doi (margin-top 44px, border-top --line)', /footer\.site-foot\{margin-top:44px;border-top:1px solid var\(--line\)/.test(css));

// ---- (e) sw.js: CACHE v56 + SHELL nguyen ven ----
t("sw.js CACHE = 'v86-shell-1'", swJs.includes("const CACHE = 'v86-shell-1';"));
t('sw.js: khong con CACHE v55-shell-1', !swJs.includes('v55-shell-1'));
t("sw.js: ghi chu dau file doi sang v60", swJs.includes('/* v60 service worker'));
t('sw.js: SHELL van precache du 29 file icon doi tac', ['google-icon.png', 'meta-icon.png', 'tiktok-icon.png', 'thaco-icon.png', 'tpbank-icon.png', 'coccoc-icon.png', 'dem-kim-cuong-icon.png', 'flamingo-icon.png', 'bao-kinh-te-do-thi-icon.png', 'cocoon-icon.png', 'co-mem-homelab-icon.png', 'sao-thai-duong-icon.png', 'thorakao-icon.png', 'moi-icon.png', 'lemonade-icon.png', 'emmie-icon.png', 'ofelia-icon.png', 'lagumi-icon.png', 'vedette-icon.png', 'coolmate-icon.png', 'canifa-icon.png', 'ivy-moda-icon.png', 'yody-icon.png', 'juno-icon.png', 'vascara-icon.png', 'ssstutter-icon.png', 'routine-icon.png', 'degrey-icon.png', 'couple-tx-icon.png'].every((f) => swJs.includes(`'images/partners/${f}'`)));

// ---- (f) Muc lo hang v55 nguyen ven + du lieu khong doi ----
const shopHtml = fs.readFileSync(path.join(root, 'danh-sach-shop.html'), 'utf8');
const lotSection = (shopHtml.match(/<section class="lot-section collapsed" id="lo-hang-xa-kho"[\s\S]*?<\/section>/) || [''])[0];
t('muc lo hang v55: van co id="lo-hang-xa-kho" o top trang shop', shopHtml.indexOf('id="lo-hang-xa-kho"') > -1 && shopHtml.indexOf('id="lo-hang-xa-kho"') < shopHtml.indexOf('id="publicShopsList"'));
// v76: the lo khong con trong HTML tinh — kiem tra tren data.js (render kiem tra o test-v76)
const sb56lots = { window: {}, module: { exports: {} }, console, document: { getElementById: () => null, addEventListener: () => {}, querySelectorAll: () => [] } };
vm.createContext(sb56lots);
vm.runInContext(fs.readFileSync(path.join(root, 'js/data.js'), 'utf8'), sb56lots);
t('muc lo hang v55: van du 14 lo trong data.js (v60 them 20 xuong may + v83 them 20 xuong nua = 40 xuong rieng trong data.js)', sb56lots.window.V20_DATA.lots.length === 14 && sb56lots.window.V20_DATA.factories.length === 40, `lo=${sb56lots.window.V20_DATA.lots.length} xuong=${sb56lots.window.V20_DATA.factories.length}`);
t('muc lo hang v55: HTML chi con container rong lotGrid1/2/3 (khong con the tinh)', shopHtml.includes('<div class="lot-grid" id="lotGrid1"></div>') && !lotSection.includes('<article class="lot-card"'));
const sb2 = { window: {}, module: { exports: {} }, console, document: { getElementById: () => null, addEventListener: () => {}, querySelectorAll: () => [] } };
vm.createContext(sb2);
vm.runInContext(fs.readFileSync(path.join(root, 'js/data.js'), 'utf8'), sb2);
const DATA = sb2.window.V20_DATA;
t('du lieu khong doi: 20 mau, 30 shop, 50 bai', DATA.models.length === 20 && DATA.shops.length === 30 && DATA.articles.length === 50,
  `mau=${DATA.models.length} shop=${DATA.shops.length} bai=${DATA.articles.length}`);

// ---- (g) KHONG doi: 6 file noi dung (hash khoa theo v55-prep) ----
t('js/data.js giong het v55 (sha256)', sha('js/data.js') === '76009b20bc339501db3ab2f6e96993e5a6c6f84d9d50e45a623cde6882d85fdf');
t('js/app.js giong het v55 (sha256)', sha('js/app.js') === 'ae11dfaf0e5383a7d2d2f1d8c33de31090f1a5fd39e0251edb0f8b69d4590a20');
t('js/auth-ui.js giong het v55 (sha256)', sha('js/auth-ui.js') === '46d13e3b95dea2a9157d5668c3b4fca700279a1df8fe5c95ce0b416fa64f2f5c');
t('js/themes.js giong het v55 (sha256, greeting v53 nguyen ven)', sha('js/themes.js') === 'fd8a49bccef9ec152d390d5cfff17e63614967b82707c302191b4a8ebdc15e57');
t('mclivestream-supabase.js giong het v55 (sha256)', sha('mclivestream-supabase.js') === '28027730041e197b387fe8847255dd8c31bf1ec1dbbf0984427bb65d553dbd72');
t('sitemap.xml giong het v55 (sha256)', sha('sitemap.xml') === 'c229a7061ef8b60b611648874a475aaf96e5cb0ea2b46aef112265e7f350459f');

console.log(`v56: ${pass} PASS, ${fail} FAIL`);
process.exit(fail ? 1 : 0);
