// test-v70.mjs — v70: sua loi Mobile/Tablet (06/11/2026).
// Kiem tra TINH (khong chup duoc man hinh that: tai Chromium that bai 2 kenh
// chromium + chromium-headless-shell, deu "Download failure, code=1";
// Chromium he thong tu choi chay, Hatch WebGL domain policy).
// (A) Bang responsive: quy-tac-diem-thuong.html co bang 4 cot khong CSS rieng
//     -> them CSS bang toan cuc + cuon ngang o <=600px.
// (B) Header mobile 390px: logo + Menu + Dang Nhap khong vua 1 hang
//     -> thu gon header o <=600px (an small, giam gap/font/padding).
// (C) .steps 3 cot o tablet 768px qua hep -> 2 cot o <=1000px;
//     nav mo o tablet: link cao >=44px de bam bang ngon tay.
// (D) Nut Gop y co dinh che footer -> padding-bottom footer o <=600px.
// (E) iOS tu zoom khi bam o nhap font <16px -> giu o nhap 16px o <=320px.
// (F) sw.js CACHE = v76-shell-1 + hash khoa v20.css.
// (G) Khong doi hanh vi desktop: grid 4 cot, pinned-row 4 cot, trust-nums
//     4 cot, filter-card 4 cot, header desktop, menu JS toggle.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let pass = 0, fail = 0;
function t(name, ok, extra = '') { if (ok) { pass++; console.log('PASS v70:', name); } else { fail++; console.log('FAIL v70:', name, extra); } }
const sha = (p) => crypto.createHash('sha256').update(fs.readFileSync(path.join(root, p))).digest('hex');

const css = fs.readFileSync(path.join(root, 'v20.css'), 'utf8');
const appJs = fs.readFileSync(path.join(root, 'js/app.js'), 'utf8');
const sw = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');
const rules = fs.readFileSync(path.join(root, 'quy-tac-diem-thuong.html'), 'utf8');
const lap = fs.readFileSync(path.join(root, 'bai-viet/tiktok-shop-1111-tinh-loi.html'), 'utf8');

// ---- (A) Bang responsive ----
t('Bang: CSS bang toan cuc co trong v20.css',
  css.includes('table{width:100%;border-collapse:collapse;margin:14px 0}')
  && css.includes('th,td{border:1px solid var(--line);padding:8px 10px;text-align:left;vertical-align:top}')
  && css.includes('th{background:#f4f8f6}'));
t('Bang: cuon ngang o <=600px',
  css.includes('@media(max-width:600px){table{display:block;overflow-x:auto;-webkit-overflow-scrolling:touch}th,td{padding:6px 8px;font-size:13px}}'));
t('Bang quy-tac: van du bang 4 cot (Hoat dong/Diem/Gioi han/Dieu kien), khong doi noi dung',
  rules.includes('<table>')
  && rules.includes('<th>Hoạt động</th>') && rules.includes('<th>Điểm</th>')
  && rules.includes('<th>Giới hạn mỗi ngày</th>') && rules.includes('<th>Điều kiện</th>')
  && rules.includes('Bình luận trên hồ sơ shop'));
t('Bang bai-viet: .num-table rieng van giu nguyen (width:100%)',
  lap.includes('.num-table{width:100%;border-collapse:collapse;margin:14px 0}'));

// ---- (B) Header mobile <=600px ----
t('Header mobile: thu gon o <=600px (wrap 16px, gap 10px, logo 17px, an small)',
  css.includes('.wrap{padding:0 16px}')
  && css.includes('.head-in{gap:10px;min-height:60px}')
  && css.includes('.logo{font-size:17px}')
  && css.includes('.logo small{display:none}'));
t('Header mobile: logo-badge 34px + menu-btn min-height 44px + nut Dang Nhap nho lai',
  css.includes('.logo-badge{width:34px;height:34px;font-size:19px;border-radius:11px}')
  && css.includes('.menu-btn{padding:8px 11px;min-height:44px}')
  && css.includes('.head-in .btn-sm{padding:8px 12px;font-size:13px}'));
t('Header mobile: <=360px VAN giu wrap padding 10px (khong bi quy tac <=600px de len)',
  css.includes('@media(max-width:360px){.wrap{padding:0 10px}}'));
t('Header desktop: khong doi (head-in gap 18px min-height 72px, logo 20px)',
  css.includes('.head-in{display:flex;align-items:center;gap:18px;min-height:72px}')
  && css.includes('font-weight:900;font-size:20px;color:var(--ink);white-space:nowrap'));

// ---- (C) Steps tablet + nav mo ----
t('Steps tablet: 2 cot o <=1000px',
  css.includes('@media(max-width:1000px){.steps{grid-template-columns:repeat(2,1fr)}.main-nav.open a{padding:12px 14px}}'));
t('Nav mo tablet: link padding 12px (cao ~47px, >=44px de bam)',
  css.includes('.main-nav.open a{padding:12px 14px}'));
t('Steps desktop: van 3 cot; <=600px van 1 cot',
  css.includes('.steps{display:grid;grid-template-columns:repeat(3,1fr);gap:16px}')
  && css.includes('.grid,.grid-3,.mini-grid,.news-list,.steps{grid-template-columns:1fr}'));
t('Menu JS: toggle .open + aria-expanded van co trong js/app.js',
  appJs.includes("document.getElementById('menuBtn')")
  && appJs.includes("classList.toggle('open')")
  && appJs.includes("setAttribute('aria-expanded'"));

// ---- (D) Nut Gop y che footer ----
t('Gop y: footer co padding-bottom 84px o <=600px de khong bi nut co dinh che',
  css.includes('footer.site-foot{padding-bottom:84px}'));
t('Gop y: nut fab van co dinh goc duoi phai o <=600px (bottom 20px)',
  css.includes('.gopy-fab{top:auto;bottom:20px;right:14px;transform:none}'));

// ---- (E) iOS zoom o <=320px ----
t('iOS zoom: o nhap giu font 16px o <=320px (body muc nay la 15px)',
  css.includes('.search-card input,.search-card select,.filter-card input,.filter-card select,.form-card input,.form-card select,.form-card textarea{font-size:16px}'));

// ---- (F) CACHE + hash ----
t("sw.js CACHE = 'v84-shell-1'", sw.includes("const CACHE = 'v84-shell-1'"));
t("sw.js khong con v67-shell-1", !sw.includes('v67-shell-1'));
t('v20.css hash khoa dung ban v70 (them khoi v70)',
  sha('v20.css') === 'c38c89a126a136fb3f99ea7d547884339c4e5b9899e48c90234f61f02a140538');

// ---- (G) Khong doi hanh vi desktop ----
t('Desktop: grid 4 cot, pinned-row 4 cot, trust-nums 4 cot, filter-card 4 cot',
  css.includes('.grid{display:grid;grid-template-columns:repeat(4,1fr);gap:18px}')
  && css.includes('.pinned-row{display:grid;grid-template-columns:repeat(4,1fr);gap:16px}')
  && css.includes('.trust-nums{display:grid;grid-template-columns:repeat(4,1fr);gap:14px 20px')
  && css.includes('display:grid;grid-template-columns:repeat(4,1fr);gap:6px}'));
t('Desktop: trust-nums 2 cot o <=900px + trust-strip column o <=600px van giu',
  css.includes('@media(max-width:900px){.trust-nums{grid-template-columns:repeat(2,1fr);gap:12px 16px}}')
  && css.includes('.trust-strip{flex-direction:column;align-items:flex-start;gap:14px}'));
t('Desktop: luoi shop/lot 3 cot, 2 cot o <=1000px, 1 cot o <=600px van giu',
  css.includes('.shop-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:16px}')
  && css.includes('.lot-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:14px}')
  && css.includes('@media(max-width:1000px){.shop-grid{grid-template-columns:repeat(2,1fr)}}')
  && css.includes('@media(max-width:600px){.shop-grid{grid-template-columns:1fr}}'));
t('An toan: html,body overflow-x:hidden van giu (luoi cuoi chong tran ngang)',
  css.includes('html,body{overflow-x:hidden}'));
t('An toan: img max-width:100% toan cuc van giu',
  css.includes('img{max-width:100%}'));

console.log(`\ntest-v70: ${pass} PASS, ${fail} FAIL`);
process.exit(fail ? 1 : 0);
