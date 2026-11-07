// test-v73.mjs — v73: sua vo mobile 360px (06/11/2026), kiem chung bang anh
// chup that 360px (Playwright + local server) tren dien thoai that cua nguoi
// dung (anh 19:22/19:34 ngay 06/11). May nguoi dung 360px CSS, khong phai
// 390px nhu test v72 — nen v72 qua o 390px nhung vo o 360px.
// (A) G1: luoi 2 cot minmax(0,1fr) — 1fr = minmax(auto,1fr), min-content the
//     shop 240px lam luoi tran 430px trong khung 336px o 360px, cot phai bi
//     cat khoi man hinh (anh 1: the shop mat khung ben phai).
// (B) G2: shop-foot tran (210px trong o 132px) + link dai khong be dong.
// (C) G3: pill .tag dai nhat ~190px tran o 132px — cat gon bang dau ...
// (D) G4: ghi chu noi bo trust-note lot ra giao dien (anh 2).
// (E) CACHE v76-shell-1 + file khong doi giong het v72 (chi v20.css + sw.js doi).
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let pass = 0, fail = 0;
function t(name, ok, extra = '') { if (ok) { pass++; console.log('PASS v73:', name); } else { fail++; console.log('FAIL v73:', name, extra); } }
const sha = (p) => crypto.createHash('sha256').update(fs.readFileSync(path.join(root, p))).digest('hex');
const css = fs.readFileSync(path.join(root, 'v20.css'), 'utf8');
const sw = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');
const v73css = css.slice(css.indexOf('/* v73:'));

// ---- (A) G1: luoi minmax ----
t('G1: luoi 2 cot dung minmax(0,1fr) o <=600px (.grid + .shop-grid)',
  v73css.includes('.grid{grid-template-columns:repeat(2,minmax(0,1fr))}')
  && v73css.includes('.shop-grid{grid-template-columns:repeat(2,minmax(0,1fr))}'));
t('G1b: the mau/the shop + card-body co min-width:0 (cho phep co lai duoi min-content)',
  v73css.includes('.card,.shop-card{min-width:0}')
  && v73css.includes('.card-body{min-width:0}'));
t('G1c: shop-head + h3 co min-width:0, h3 duoc be chu (overflow-wrap)',
  v73css.includes('.shop-head{min-width:0}')
  && v73css.includes('.shop-head h3{min-width:0;overflow-wrap:break-word}'));
t('G1d: decision + card-actions co min-width:0',
  v73css.includes('.card-actions{min-width:0}')
  && v73css.includes('.decision,.decision-row,.decision-item,.decision-exp{min-width:0}'));

// ---- (B) G2: shop-foot ----
t('G2: shop-foot + con truc tiep co min-width:0 (chan tran 210px trong o 132px)',
  v73css.includes('.shop-foot{min-width:0}')
  && v73css.includes('.shop-foot>*{min-width:0}'));
t('G2b: link dai trong contact-list/shop-src duoc be xuong dong (overflow-wrap:anywhere)',
  v73css.includes('.contact-list a,.shop-src a{overflow-wrap:anywhere}'));

// ---- (C) G3: tag pill ----
t('G3: pill .tag cat gon bang dau ... o <=600px (max-width:100% + ellipsis)',
  v73css.includes('.tag{max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}'));
t('G3b: hang .tags co min-width:0',
  v73css.includes('.tags{min-width:0}'));

// ---- (D) G4: trust-note ----
t('G4: ghi chu noi bo trust-note bi an han (specificity 0,2,1 thang 0,1,1 cua .trust-num span)',
  v73css.includes('.trust-num span.trust-note{display:none}'));

// ---- (D2) G5: header 1 hang o 360px ----
t('G5: header vua 1 hang o <=380px (gap 6px, logo 14px, nut padding 8px)',
  v73css.includes('.head-in{gap:6px}')
  && v73css.includes('.logo{font-size:14px}')
  && v73css.includes('.menu-btn{padding:8px 8px}')
  && v73css.includes('.head-in .btn-sm{padding:8px 8px}'));

// ---- (E) CACHE + file khong doi giong het v72 ----
t("sw.js CACHE = 'v84-shell-1'", sw.includes("const CACHE = 'v84-shell-1'"));
t("sw.js khong con cache cu (v72)", !sw.includes('v72-shell-1'));
t('v20.css la ban v73 (sha256)', sha('v20.css') === 'c38c89a126a136fb3f99ea7d547884339c4e5b9899e48c90234f61f02a140538');
t('js/app.js giong het v72 (khong doi) (sha256)', sha('js/app.js') === 'e3f5c43293d2b71f2fd0b804a31ce4a4a88f47a83bfdab607eab5ee75467b072');
t('js/data.js giong het v72 (khong doi) (sha256)', sha('js/data.js') === '642a8e3fdb09f0d23d363741692f3da7106586aff84dd47d1bc81613b514fc57');

console.log(`v73: ${pass} PASS, ${fail} FAIL`);
process.exit(fail ? 1 : 0);
