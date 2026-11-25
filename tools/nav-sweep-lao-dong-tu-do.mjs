// tools/nav-sweep-lao-dong-tu-do.mjs — v444: doi nav 6 muc tren toan bo file HTML.
// Menu moi (anh duyet 19:43-20:03 25/11/2026): Trang chu | Danh cho Mau |
// Danh cho Shop | Thanh ly Kiot | Lao Dong Tu Do | Tin Tuc (+ nut Dang Nhap
// rieng ngoai nav, khong doi). Bo "Hoi dap" + "Dang ky" khoi nav.
// Chay: node tools/nav-sweep-lao-dong-tu-do.mjs --dry-run  (chi in bao cao)
//      node tools/nav-sweep-lao-dong-tu-do.mjs --write      (ghi file that)
// Mac dinh la dry-run (an toan). Workflow deploy-v444-nav-sweep.yml goi --write.
// Giu nguyen: tien to duong dan (../, /, rong), muc dang active (neu con
// trong nav moi), dinh dang class="" / class="active".
import fs from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
const WRITE = args.includes('--write');
const root = process.cwd();

const ITEMS = [
  ['index.html', 'Trang chủ'],
  ['danh-sach-shop.html', 'Dành cho Mẫu'],
  ['danh-sach-mau.html', 'Dành cho Shop'],
  ['thanh-ly-kiot.html', 'Thanh lý Kiot'],
  ['lao-dong-tu-do.html', 'Lao Động Tự Do'],
  ['tin-tuc.html', 'Tin tức'],
];
// basename href -> nhan muc active tuong ung (hoi-dap/dang-ky da bo -> khong active)
const ACTIVE_BY_BASENAME = {
  'index.html': 'Trang chủ',
  '': 'Trang chủ',
  'danh-sach-shop.html': 'Dành cho Mẫu',
  'danh-sach-mau.html': 'Dành cho Shop',
  'thanh-ly-kiot.html': 'Thanh lý Kiot',
  'lao-dong-tu-do.html': 'Lao Động Tự Do',
  'tin-tuc.html': 'Tin tức',
};

function walk(dir, out) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name === '.git' || e.name === 'node_modules' || e.name === 'hidden_files' || e.name === '.github') continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (e.name.endsWith('.html')) out.push(p);
  }
  return out;
}

function navLinks(navInner) {
  const re = /<a href="([^"]*)"(?: class="([^"]*)")?>([^<]*)<\/a>/g;
  const out = [];
  let m;
  while ((m = re.exec(navInner))) out.push({ href: m[1], cls: m[2] || '', label: m[3] });
  return out;
}

function processFile(file) {
  const src = fs.readFileSync(file, 'utf8');
  const m = src.match(/<nav class="main-nav" id="mainNav">([\s\S]*?)<\/nav>/);
  if (!m) return { file, status: 'no-nav' };
  const links = navLinks(m[1]);
  if (links.length === 0) return { file, status: 'no-links' };
  const home = links.find((l) => l.label === 'Trang chủ');
  if (!home) return { file, status: 'no-home-link' };
  let prefix = '';
  let homeHref = 'index.html';
  if (home.href === '/') { prefix = '/'; homeHref = '/'; }
  else if (home.href.startsWith('../')) { prefix = '../'; homeHref = '../index.html'; }
  else if (home.href === 'index.html') { prefix = ''; homeHref = 'index.html'; }
  else return { file, status: 'unknown-home-href:' + home.href };
  const active = links.find((l) => l.cls === 'active');
  let activeLabel = null;
  if (active) {
    const base = active.href.replace(/^\.\.\//, '').replace(/^\//, '');
    activeLabel = ACTIVE_BY_BASENAME[base] || null;
  }
  const inner = ITEMS.map(([base, label]) => {
    const href = base === 'index.html' ? homeHref : prefix + base;
    const cls = label === activeLabel ? 'active' : '';
    return '<a href="' + href + '" class="' + cls + '">' + label + '</a>';
  }).join('');
  const newNav = '<nav class="main-nav" id="mainNav">' + inner + '</nav>';
  if (m[0] === newNav) return { file, status: 'unchanged' };
  if (WRITE) fs.writeFileSync(file, src.replace(m[0], newNav), 'utf8');
  return { file, status: 'changed' };
}

const files = walk(root, []);
const results = files.map(processFile);
const byStatus = {};
for (const r of results) byStatus[r.status] = (byStatus[r.status] || 0) + 1;
console.log('total html files: ' + files.length);
console.log('by status: ' + JSON.stringify(byStatus));
const problems = results.filter((r) => r.status !== 'changed' && r.status !== 'unchanged' && r.status !== 'no-nav');
// 'no-nav' = trang dac biet khong co nav chuan (vd google verification,
// form dang-tin, tai-khoan, 5 bai-viet cu) — bo qua, khong phai loi.
if (problems.length) {
  console.log('PROBLEMS:');
  for (const p of problems.slice(0, 20)) console.log('  ' + p.status + ' ' + p.file);
}
if (!WRITE) console.log('DRY-RUN: no files written. Re-run with --write to apply.');
let ok = true;
if (WRITE) {
  for (const f of files) {
    const s = fs.readFileSync(f, 'utf8');
    if (!s.includes('Lao Động Tự Do</a>')) { console.log('VERIFY FAIL (missing Lao Dong Tu Do): ' + f); ok = false; }
    if (/hoi-dap\.html" class="">Hỏi đáp<\/a>/.test(s)) { console.log('VERIFY FAIL (old nav hoi-dap remains): ' + f); ok = false; }
  }
  console.log('verify: ' + (ok ? 'OK' : 'FAILED'));
}
process.exit(problems.length || !ok ? 1 : 0);
