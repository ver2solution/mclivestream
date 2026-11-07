/* v35 tests — Node only, no browser. v35 = menu gon + cache bump (user-directed
   2026-11-05 ~21:47: bo "Cách hoạt động" + "Lộ trình" khoi menu, menu 1 hang):
   (1) nav chi con 5 muc (Trang chủ, Dành cho Mẫu, Dành cho Shop, Tin tức,
       Hỏi đáp) trong ca 32 file HTML (v40: 34 file, them 2 bai-viet demo); khong con link "Cách hoạt động" /
       "Lộ trình" trong nav o bat cu file nao (chu "Lộ trình" trong NOI DUNG
       bai viet thi duoc phep, vi du tieu de muc bai).
   (2) CSS .main-nav co flex-wrap:nowrap de giu 1 hang tren desktop.
   (3) sw.js cache la v41-shell-1 (v41; doi theo quy tac: moi lan deploy doi
       v20.css thi phai doi ten cache).
   (4) data.js header ghi dung 30 articles; du lieu khong doi (20 mau,
       30 shop, 50 bai).
   The v20–v34 suites still run. */
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let pass = 0, fail = 0;
function t(name, cond, extra = '') { if (cond) { pass++; console.log('PASS v35:', name); } else { fail++; console.log('FAIL v35:', name, extra); } }

const sb = { window: {}, module: { exports: {} }, console, URLSearchParams };
vm.createContext(sb);
vm.runInContext(fs.readFileSync(path.join(root, 'js/data.js'), 'utf8'), sb);
const D = sb.window.V20_DATA;

// ---- (1) nav 5 muc trong ca 30 file HTML ----
const htmlFiles = [];
(function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) { if (e.name !== 'tests') walk(p); }
    else if (e.name.endsWith('.html')) htmlFiles.push(p);
  }
})(root);
t('68 file HTML co nav (v40: +2 bai-viet demo; v48: +1 dat-lai-mat-khau; v68: +1 dang-nhap; v71: +5 bai moi; v77: +4 trang AdSense; v80: +10 bai moi; v82: +5 bai moi; v83: +1 tinh-lai-1111; v85: +1 dang-ky; v86: +1 thanh-ly-kiot)', htmlFiles.length === 68, 'got ' + htmlFiles.length);
let navOk = true, navBad = [];
for (const f of htmlFiles) {
  const s = fs.readFileSync(f, 'utf8');
  const i = s.indexOf('<nav class="main-nav"');
  const j = s.indexOf('</nav>', i);
  if (i < 0 || j < 0) { navOk = false; navBad.push(path.relative(root, f) + ': khong co nav'); continue; }
  const nav = s.slice(i, j);
  const n = (nav.match(/<a href=/g) || []).length;
  const good = n === 6
    && nav.includes('Trang chủ') && nav.includes('Dành cho Mẫu') && nav.includes('Dành cho Shop')
    && nav.includes('Thanh lý Kiot')
    && nav.includes('Tin tức') && nav.includes('Hỏi đáp')
    && !nav.includes('Cách hoạt động') && !nav.includes('Lộ trình');
  if (!good) { navOk = false; navBad.push(path.relative(root, f)); }
}
t('nav 6 muc, khong co Cách hoạt động / Lộ trình, trong ca 68 file', navOk, navBad.join('; '));

// ---- (2) CSS nav 1 hang ----
const css = fs.readFileSync(path.join(root, 'v20.css'), 'utf8');
t('CSS .main-nav flex-wrap:nowrap', /\.main-nav\{[^}]*flex-wrap:nowrap/.test(css));
t('CSS .main-nav van co display:flex + margin-left:auto', /\.main-nav\{margin-left:auto;display:flex/.test(css));

// ---- (3) sw.js cache v35 ----
const sw = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');
t("sw.js CACHE = 'v86-shell-1' (v44 bumped the cache because nhat quan ngon ngu C1-C12 + sua noi dung F1-F5 doi nhieu bai-viet + js/app.js + js/data.js + 5 trang goc)", sw.includes("const CACHE = 'v86-shell-1';"));
t('sw.js khong con v34-shell-1', !sw.includes('v34-shell-1'));

// ---- (4) data.js header + du lieu khong doi ----
const dataSrc = fs.readFileSync(path.join(root, 'js/data.js'), 'utf8');
t('data.js header ghi 30 articles', dataSrc.includes('+ 30 articles'));
t('du lieu khong doi: 20 mau / 30 shop / 50 bai', D.models.length === 20 && D.shops.length === 30 && D.articles.length === 50);

console.log(`\n${pass} PASS, ${fail} FAIL`);
process.exit(fail ? 1 : 0);
