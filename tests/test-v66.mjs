// test-v66.mjs — v66: tieu de muc Tin tuc tren trang chu thanh dong text xanh
// (link) dan toi trang tin tuc (nguoi dung yeu cau 16:08 ngay 06/11).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sha256 = (f) => createHash('sha256').update(fs.readFileSync(path.join(root, f))).digest('hex');
let pass = 0, fail = 0;
function t(name, ok, extra = '') { if (ok) { pass++; console.log('PASS v66:', name); } else { fail++; console.log('FAIL v66:', name, extra); } }
const indexHtml = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const css = fs.readFileSync(path.join(root, 'v20.css'), 'utf8');
const sw = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');

t('Tin tuc: tieu de muc la link xanh toi tin-tuc.html, dung text nguoi dung chot',
  indexHtml.includes('<h2><a href="tin-tuc.html" data-track="tieu-de-tin-tuc">Tin mới thị trường Livestream/TMĐT Việt Nam và Thế giới</a></h2>'));
t('Tin tuc: khong con tieu de cu "Tin thị trường mới nhất"',
  !indexHtml.includes('Tin thị trường mới nhất'));
t('Tin tuc: nut "Xem tất cả tin →" van con (v75: chuyen xuong duoi hang tin, trong .section-foot)',
  indexHtml.includes('<a class="btn btn-ghost btn-sm" href="tin-tuc.html">Xem tất cả tin →</a>'));
t('Tin tuc: tieu de link nam trong section #lo-trinh, truoc danh sach homeNews',
  (() => { const s = indexHtml.indexOf('id="lo-trinh"'); const iA = indexHtml.indexOf('tieu-de-tin-tuc', s); const iNews = indexHtml.indexOf('id="homeNews"', s); return iA > s && iNews > iA; })());
t('CSS: link trong h2 section-head dung mau brand (xanh), hover gach chan',
  css.includes('.section-head h2 a{color:var(--brand)}') && css.includes('.section-head h2 a:hover{text-decoration:underline}'));
t("index.html giong het v66 (tieu de tin tuc thanh link) (sha256)", sha256('index.html') === 'dc7ee7d6a43a904d4c63c8c85ed041e9e2c70853787062506340b061527e7e39');
t("v20.css giong het v66 (them CSS link h2 section-head) (sha256)", sha256('v20.css') === '277d60ad92802afa8b68597fda4a2dd5f85c2c1edacd6fc44999b79dc3e47d87');
t("sw.js CACHE = 'v86-shell-1'", sw.includes("const CACHE = 'v86-shell-1'"));

console.log(`v66: ${pass} PASS, ${fail} FAIL`);
process.exit(fail ? 1 : 0);
