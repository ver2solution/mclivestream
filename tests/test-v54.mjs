/* v54 tests — Node only, no browser. v54 = them 20 logo thuong hieu Viet
   (10 my pham + 10 thoi trang) vao DAI LOGO DOI TAC XOAY VONG o trang chu
   (yeu cau nguoi dung 06/11/2026 — chot vi tri 13:32: dat vao dai logo
   doi tac, KHONG lam muc moi):
   (1) 20 file icon moi images/partners/*-icon.png, deu 128×128 (theo
       dung mau v50), dat sau 9 logo cu trong CA 2 nhom marquee: moi nhom
       9 -> 29 logo, tong 58 the img; khong doi thu tu 9 logo cu, khong
       doi doan PR.
   (2) v20.css: chi doi thoi gian animation marquee theo ti le so logo
       (giu toc do doc tuong duong 38s/9 logo -> 122s/29 logo; mobile
       28s -> 90s); khong doi o tron 48px, khong doi mau (mau goc).
   (3) sw.js CACHE = 'v76-shell-1' + SHELL them 20 path icon moi.
   (4) KHONG doi: js/data.js, js/app.js, js/auth-ui.js, js/themes.js
       (greeting v53), mclivestream-supabase.js, sitemap.xml, 9 icon cu,
       doan PR, cua so theme. Hash cac file nay duoc lay tu ban v53-prep
       va khoa cung o day de bat moi thay doi vo tinh.
   Nguon tung logo ghi trong images/partners/SOURCES.md (muc v54); 14/20
   URL da doi chieu md5, 6 URL con lai chi con domain + ten file (ghi ro
   trong SOURCES.md, khong che giau). */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let pass = 0, fail = 0;
function t(name, cond, extra = '') { if (cond) { pass++; console.log('PASS v54:', name); } else { fail++; console.log('FAIL v54:', name, extra); } }
const sha = (p) => crypto.createHash('sha256').update(fs.readFileSync(path.join(root, p))).digest('hex');
const pngSize = (p) => { const b = fs.readFileSync(path.join(root, p)); return b.length >= 24 && b.readUInt32BE(16) === 128 && b.readUInt32BE(20) === 128; };

const NEW_ICONS = [
  ['cocoon-icon.png', 'Cocoon'], ['co-mem-homelab-icon.png', 'Cỏ Mềm Homelab'],
  ['sao-thai-duong-icon.png', 'Sao Thái Dương'], ['thorakao-icon.png', 'Thorakao'],
  ['moi-icon.png', 'M.O.I Cosmetics'], ['lemonade-icon.png', 'Lemonade'],
  ['emmie-icon.png', 'Emmié by Happy Skin'], ['ofelia-icon.png', 'OFÉLIA'],
  ['lagumi-icon.png', 'Lagumi'], ['vedette-icon.png', 'Vedette'],
  ['coolmate-icon.png', 'Coolmate'], ['canifa-icon.png', 'Canifa'],
  ['ivy-moda-icon.png', 'IVY Moda'], ['yody-icon.png', 'Yody'],
  ['juno-icon.png', 'Juno'], ['vascara-icon.png', 'Vascara'],
  ['ssstutter-icon.png', 'SSStutter'], ['routine-icon.png', 'Routine'],
  ['degrey-icon.png', 'Degrey'], ['couple-tx-icon.png', 'Couple TX'],
];
// Thu tu 9 logo cu trong index.html (khong doi tu v50/v51).
const OLD_ICONS = [
  ['google-icon.png', '8721a8e21f9df77d76386111b988ac37ef608d29aa014aea30b4a42d55233c19'],
  ['meta-icon.png', '585a60dc5ca6615ae5b30fa8c13272e0e29c91a40a2c33e7b64bae2c6a0d86ba'],
  ['tiktok-icon.png', '41f203736e7171801efea7eda86491fcc115d8e5de2150ea5eae195b673e6a03'],
  ['thaco-icon.png', '42054dd611f49cf5754fab1b039f8b0efb7bc63a904e58f1752088f8910db0f3'],
  ['tpbank-icon.png', '0b0333d17bc64641c0f0f89993d612e8565fb3e570a8e9445e8db9e335a3e8b8'],
  ['coccoc-icon.png', 'e121a2ce41c4dc4af92c96d7247db91000d83838050ad5794b9bc7e2d946e1d2'],
  ['dem-kim-cuong-icon.png', 'a7570ae51de8e41a4f7da61e88afebf2e7d28d4077f77e8bf488c5a248666bff'],
  ['flamingo-icon.png', '786c1e292f5d283cffe7492a1c6dabb622928c91fb341b0b805a7770d3da79d6'],
  ['bao-kinh-te-do-thi-icon.png', 'eaeed9a856e78bc115a60c5b57afcc16dd5837f00923a29f5946bff77151f1c1'],
];
const indexHtml = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const css = fs.readFileSync(path.join(root, 'v20.css'), 'utf8');
const swJs = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');
const sourcesMd = fs.readFileSync(path.join(root, 'images/partners/SOURCES.md'), 'utf8');

// ---- (a) 20 icon moi: ton tai + dung 128×128 + < 50 KB (chuan v50) ----
NEW_ICONS.forEach(([f]) => {
  const p = 'images/partners/' + f;
  t(`icon moi ton tai + 128x128: ${f}`, fs.existsSync(path.join(root, p)) && pngSize(p));
  t(`icon moi < 50 KB: ${f}`, fs.existsSync(path.join(root, p)) && fs.statSync(path.join(root, p)).size < 50 * 1024, fs.existsSync(path.join(root, p)) ? String(fs.statSync(path.join(root, p)).size) : 'missing');
});

// ---- (b) index.html: 2 nhom marquee, moi nhom 29 logo (9 cu + 20 moi) ----
const groups = indexHtml.split('<div class="logo-group').slice(1).map((g) => g.split('</div>')[0]);
t('index.html: co dung 2 nhom .logo-group', groups.length === 2, `got=${groups.length}`);
groups.forEach((g, i) => {
  const cards = (g.match(/class="logo-card"/g) || []).length;
  t(`nhom ${i + 1}: 29 the logo-card`, cards === 29, `got=${cards}`);
  NEW_ICONS.forEach(([f, alt]) => {
    t(`nhom ${i + 1}: co logo moi ${f} (alt="${alt}")`, g.includes(`src="images/partners/${f}"`) && g.includes(`alt="${alt}"`));
  });
  OLD_ICONS.forEach(([f]) => t(`nhom ${i + 1}: van co logo cu ${f}`, g.includes(`src="images/partners/${f}"`)));
});
t('index.html: tong 58 the logo-card', (indexHtml.match(/class="logo-card"/g) || []).length === 58);
t('index.html: moi the img moi deu width=128 height=128 + loading=lazy', NEW_ICONS.every(([f]) => indexHtml.includes(`src="images/partners/${f}"`) && new RegExp(`src="images/partners/${f.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"[^>]*width="128" height="128" loading="lazy"`).test(indexHtml)));

// ---- (c) 9 logo cu: dung thu tu, dung truoc 20 logo moi, file giong het v53 ----
groups.forEach((g, i) => {
  const pos = OLD_ICONS.map(([f]) => g.indexOf(`images/partners/${f}`));
  const firstNew = Math.min(...NEW_ICONS.map(([f]) => g.indexOf(`images/partners/${f}`)));
  t(`nhom ${i + 1}: 9 logo cu dung thu tu goc (Google, Meta, TikTok, THACO, TPBank, Coc Coc, Dem Kim Cuong, Flamingo, Bao KTDT)`,
    pos.every((p, j) => p > -1 && (j === 0 || p > pos[j - 1])));
  t(`nhom ${i + 1}: 9 logo cu dung TRUOC 20 logo moi`, pos.every((p) => p > -1 && p < firstNew));
});
OLD_ICONS.forEach(([f, want]) => t(`icon cu nguyen ven (sha256 giong v53): ${f}`, sha('images/partners/' + f) === want, `got=${sha('images/partners/' + f)}`));

// ---- (d) Doan PR khong doi ----
const PR = 'Ver2Solution — hơn 8 năm xây dựng hệ sinh thái dịch vụ cho shop bán hàng online và livestream. Hơn 1.000 khách hàng toàn quốc, từ shop nhỏ đến tập đoàn lớn, đã tin dùng dịch vụ của chúng tôi — gồm các dự án triển khai cùng Thaco Trường Hải, TPBank, Cốc Cốc, Đêm Kim Cương và hàng trăm doanh nghiệp khác.';
t('doan PR trong trust-text khong doi (nguyen van v53)', indexHtml.includes(PR));
t('nhan "Đồng hành cùng các thương hiệu lớn" khong doi', indexHtml.includes('Đồng hành cùng các thương hiệu lớn'));

// ---- (e) v20.css: chi doi thoi gian animation theo ti le so logo ----
t('v20.css: .logo-track animation 122s (38s x 29/9 = 122,4 -> 122s)', /\.logo-track\{[^}]*animation:logo-scroll 122s linear infinite/.test(css));
t('v20.css: mobile animation 90s (28s x 29/9 = 90,2 -> 90s)', /\.logo-track\{[^}]*animation-duration:90s/.test(css));
t('v20.css: van co keyframes logo-scroll (translateX -50%)', css.includes('@keyframes logo-scroll') && css.includes('transform:translateX(-50%)'));
t('v20.css: o logo van tron 48px (border-radius:50%, width+height 48px)', /\.logo-card\{[^}]*border-radius:50%/.test(css) && /\.logo-card\{[^}]*width:48px/.test(css) && /\.logo-card\{[^}]*height:48px/.test(css));
t('v20.css: logo van MAU GOC (khong grayscale, khong opacity mo)', !css.includes('filter:grayscale(1)') && !/\.logo-card img\{[^}]*opacity:\.5/.test(css));
t('v20.css: anh icon van 70% trong o (width+height 70%, object-fit contain)', /\.logo-card img\{[^}]*width:70%/.test(css) && /\.logo-card img\{[^}]*height:70%/.test(css) && /\.logo-card img\{[^}]*object-fit:contain/.test(css));
t('v20.css: dai logo van nam gon trong khung trang (.trust-strip overflow:hidden + .trust-logos min-width:0)', /\.trust-strip\{[^}]*overflow:hidden/.test(css) && /\.trust-logos\{[^}]*min-width:0/.test(css));
t('v20.css: khong con thoi gian animation cu (38s / 28s) cho logo-track', !/\.logo-track\{[^}]*animation:logo-scroll 38s/.test(css) && !/animation-duration:28s/.test(css));

// ---- (f) sw.js: CACHE v54 + SHELL du 29 icon ----
t("sw.js CACHE = 'v86-shell-1'", swJs.includes("const CACHE = 'v86-shell-1';"));
t('sw.js: khong con CACHE v53-shell-1', !swJs.includes('v53-shell-1'));
t("sw.js: ghi chu dau file doi sang v60", swJs.includes('/* v60 service worker'));
t('sw.js: SHELL precache du 29 file icon doi tac (9 cu + 20 moi)', [...OLD_ICONS.map(([f]) => f), ...NEW_ICONS.map(([f]) => f)].every((f) => swJs.includes(`'images/partners/${f}'`)));
t('sw.js: SHELL van precache js/themes.js + js/data.js + js/app.js', swJs.includes("'js/themes.js'") && swJs.includes("'js/data.js'") && swJs.includes("'js/app.js'"));

// ---- (g) KHONG doi: data.js + 5 file (hash khoa theo v53-prep) + du lieu ----
t('js/data.js giong het v53 (sha256)', sha('js/data.js') === '76009b20bc339501db3ab2f6e96993e5a6c6f84d9d50e45a623cde6882d85fdf');
t('js/app.js giong het v53 (sha256)', sha('js/app.js') === 'ae11dfaf0e5383a7d2d2f1d8c33de31090f1a5fd39e0251edb0f8b69d4590a20');
t('js/auth-ui.js giong het v53 (sha256)', sha('js/auth-ui.js') === '46d13e3b95dea2a9157d5668c3b4fca700279a1df8fe5c95ce0b416fa64f2f5c');
t('js/themes.js giong het v53 (sha256, greeting v53 nguyen ven)', sha('js/themes.js') === 'fd8a49bccef9ec152d390d5cfff17e63614967b82707c302191b4a8ebdc15e57');
t('mclivestream-supabase.js giong het v53 (sha256)', sha('mclivestream-supabase.js') === '28027730041e197b387fe8847255dd8c31bf1ec1dbbf0984427bb65d553dbd72');
t('sitemap.xml giong het v53 (sha256)', sha('sitemap.xml') === 'c229a7061ef8b60b611648874a475aaf96e5cb0ea2b46aef112265e7f350459f');
const sb2 = { window: {}, module: { exports: {} }, console, document: { getElementById: () => null, addEventListener: () => {}, querySelectorAll: () => [] } };
vm.createContext(sb2);
vm.runInContext(fs.readFileSync(path.join(root, 'js/data.js'), 'utf8'), sb2);
const DATA = sb2.window.V20_DATA;
t('du lieu khong doi: 20 mau, 30 shop, 50 bai', DATA.models.length === 20 && DATA.shops.length === 30 && DATA.articles.length === 50,
  `mau=${DATA.models.length} shop=${DATA.shops.length} bai=${DATA.articles.length}`);

// ---- (h) Hoi quy v53: theme + greeting van hoat dong (spot check) ----
const sb = { window: {}, module: { exports: {} }, console, document: { documentElement: { classList: { add: () => {}, remove: () => {}, contains: () => false } }, body: { appendChild: () => {} }, getElementById: () => null, querySelector: () => null, createElement: () => ({ setAttribute: () => {}, appendChild: () => {}, children: [] }) }, localStorage: { getItem: () => null, setItem: () => {} } };
vm.createContext(sb);
vm.runInContext(fs.readFileSync(path.join(root, 'js/themes.js'), 'utf8'), sb);
const T = sb.module.exports;
t('js/themes.js: van du 3 theme co greeting', T.THEMES.length === 3 && T.THEMES.every((x) => typeof x.greeting === 'string' && x.greeting.length > 0));
t('js/themes.js: getGreeting(15/12) van la loi chuc Noel, getGreeting(06/11) van null',
  T.getGreeting(new Date(2026, 11, 15)).includes('Giáng sinh an lành') && T.getGreeting(new Date(2026, 10, 6)) === null);

// ---- (i) SOURCES.md ghi du 20 logo moi ----
NEW_ICONS.forEach(([f]) => t(`SOURCES.md: ghi nguon ${f}`, sourcesMd.includes(f)));
t('SOURCES.md: co muc v54 rieng', sourcesMd.includes('# Thêm 20 logo thương hiệu Việt vào dải đối tác (v54'));

console.log(`v54: ${pass} PASS, ${fail} FAIL`);
process.exit(fail ? 1 : 0);
