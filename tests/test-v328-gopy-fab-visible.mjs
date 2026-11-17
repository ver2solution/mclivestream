// test-v328-gopy-fab-visible.mjs — v328: nut Gop y (FAB #gopyFab) phai HIEN tren
// TOAN site (GOPY-1311 chi moi go `hidden` o 3 trang: index, danh-sach-mau,
// danh-sach-shop; 365 trang con lai van `hidden` nen nut vo hinh, click Gop y
// 0 lan/24h 3 ky lien tiep). Fix: bo `hidden` khoi nut #gopyFab o moi file HTML.
// Chay: node tests/test-v328-gopy-fab-visible.mjs (tu goc repo).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let pass = 0, fail = 0;
function check(name, ok, extra = '') {
  if (ok) { pass++; console.log('PASS ' + name); }
  else { fail++; console.log('FAIL ' + name + (extra ? ' — ' + extra : '')); }
}

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name === 'node_modules' || e.name === '.git') continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (e.name.endsWith('.html')) out.push(p);
  }
  return out;
}
const files = walk(root);
const withFab = [];
const withHidden = [];
for (const f of files) {
  const html = fs.readFileSync(f, 'utf8');
  if (html.includes('id="gopyFab"')) withFab.push(f);
  if (html.includes('id="gopyFab" hidden')) withHidden.push(f);
}
check('khong file HTML nao con id="gopyFab" hidden', withHidden.length === 0,
  withHidden.length ? withHidden.slice(0, 5).map(p => path.relative(root, p)).join(', ') + (withHidden.length > 5 ? ` (+${withHidden.length - 5})` : '') : '');
check('so file co #gopyFab = 371', withFab.length === 371, 'thuc te ' + withFab.length);
check('moi file co #gopyFab deu khong hidden', withFab.length - withHidden.length === withFab.length);

// 2. Trang tung FAIL o QA 18/11 phai co nut hien
for (const p of ['tim-kiem.html', 'ho-so.html', 'vi.html', 'trang-cua-toi.html',
  'tin-tuc.html', 'dang-nhap.html', 'dang-ky.html']) {
  const html = fs.readFileSync(path.join(root, p), 'utf8');
  const m = html.match(/<button[^>]*id="gopyFab"[^>]*>/);
  check(p + ': nut #gopyFab hien (khong hidden)', !!m && !/ hidden/.test(m[0]));
}
// 3. Bai viet mau + trang da sua tu GOPY-1311 van hien (khong hoi quy)
for (const p of ['index.html', 'danh-sach-mau.html', 'danh-sach-shop.html',
  'bai-viet/meo-livestream-chot-don-tet.html']) {
  const html = fs.readFileSync(path.join(root, p), 'utf8');
  const m = html.match(/<button[^>]*id="gopyFab"[^>]*>/);
  check(p + ': nut #gopyFab van hien', !!m && !/ hidden/.test(m[0]));
}
// 4. Overlay Gop y + handler mo form van con (app.js GOPY-1311)
const appJs = fs.readFileSync(path.join(root, 'js/app.js'), 'utf8');
check('app.js: handler click #gopyFab mo overlay con nguyen',
  appJs.includes("getElementById('gopyFab')") && appJs.includes("gopyOverlay').classList.add('open')"));
const timKiem = fs.readFileSync(path.join(root, 'tim-kiem.html'), 'utf8');
check('tim-kiem.html: overlay #gopyOverlay con nguyen', timKiem.includes('id="gopyOverlay"'));
// 5. SW CACHE bump de HTML moi duoc cap nhat (v327 -> v328)
const sw = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');
check('sw.js: CACHE v328-shell-1', sw.includes("v328-shell-1"));
check('sw.js: khong con v327-shell-1', !sw.includes('v327-shell-1'));

console.log(`\n${pass} PASS, ${fail} FAIL (tong ${files.length} file HTML, ${withFab.length} file co #gopyFab)`);
process.exit(fail ? 1 : 0);
