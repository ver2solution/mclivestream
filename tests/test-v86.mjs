// test-v86.mjs — v86: menu + trang con "Thanh lý Kiot" (user-directed
// 2026-11-07 17:03): them muc menu "Thanh lý Kiot" vao nav cua TAT CA file
// HTML (67 cu + 1 moi = 68 file), trang moi thanh-ly-kiot.html (cho thanh ly
// cua hang, kiot: sang mat bang, do dac/thiet bi, hang ton, toan bo cua hang),
// mang kiots rong trong js/data.js (cung dinh dang truong nhu lots de
// lotCardHTML dung truc tiep), sitemap 64 URL, CACHE v86-shell-1.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let pass = 0, fail = 0;
function t(name, ok, extra = '') { if (ok) { pass++; console.log('PASS v86:', name); } else { fail++; console.log('FAIL v86:', name, extra); } }
const sha = (p) => crypto.createHash('sha256').update(fs.readFileSync(path.join(root, p))).digest('hex');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const exists = (p) => fs.existsSync(path.join(root, p));

const page = read('thanh-ly-kiot.html');
const sitemap = read('sitemap.xml');
const sw = read('sw.js');

// ---- (A) Trang moi ton tai + SEO day du ----
t('trang thanh-ly-kiot.html ton tai', exists('thanh-ly-kiot.html'));
t('trang moi: H1 + title + description + canonical',
  page.includes('<h1>Chợ thanh lý cửa hàng, Kiot</h1>') &&
  page.includes('<title>Thanh lý Kiot: chợ thanh lý cửa hàng, sang mặt bằng, đồ đạc và hàng tồn</title>') &&
  page.includes('name="description"') &&
  page.includes('rel="canonical" href="https://ver2solution.github.io/mclivestream/thanh-ly-kiot.html"'));
t('trang moi: OG day du (title/description/image/url) + Twitter + JSON-LD',
  page.includes('property="og:title"') && page.includes('property="og:description"') &&
  page.includes('property="og:image" content="https://ver2solution.github.io/mclivestream/images/og-brand.jpg"') &&
  page.includes('property="og:url" content="https://ver2solution.github.io/mclivestream/thanh-ly-kiot.html"') &&
  page.includes('name="twitter:card"') && page.includes('"@type":"WebPage"'));
t('trang moi: co muc sang mat bang + do dac/thiet bi + hang ton + toan bo cua hang',
  page.includes('Sang mặt bằng') && page.includes('Đồ đạc, thiết bị') &&
  page.includes('Hàng tồn kho') && page.includes('Toàn bộ cửa hàng'));
t('trang moi: quy trinh 3 buoc + CTA dang ky + Zalo + mien tru chuan',
  page.includes('Quy trình 3 bước') && page.includes('href="dang-ky.html"') &&
  page.includes('zalo.me/0329983699') && page.includes('Miễn trừ trách nhiệm:') &&
  page.includes('Ver2Solution không thu bất kỳ phí dịch vụ nào'));
t('trang moi: nav Thanh lý Kiot active + nut Dang Nhap dung next',
  page.includes('<a href="thanh-ly-kiot.html" class="active">Thanh lý Kiot</a>') &&
  page.includes('href="dang-nhap.html?next=thanh-ly-kiot.html"'));
t('trang moi: script render kiots qua lotCardHTML + trang thai trong',
  page.includes('window.V20_DATA.kiots') && page.includes('window.V20.lotCardHTML') &&
  page.includes('Chưa có kiot nào đang thanh lý') && page.includes('id="kiotList"'));

// ---- (B) Nav 6 muc trong ca 68 file HTML ----
const htmlFiles = [];
(function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) { if (e.name !== 'tests') walk(p); }
    else if (e.name.endsWith('.html')) htmlFiles.push(p);
  }
})(root);
t('68 file HTML (67 cu + 1 thanh-ly-kiot v86)', htmlFiles.length === 68, 'got ' + htmlFiles.length);
let navOk = true, navBad = [];
for (const f of htmlFiles) {
  const s = fs.readFileSync(f, 'utf8');
  const i = s.indexOf('<nav class="main-nav"');
  const j = s.indexOf('</nav>', i);
  if (i < 0 || j < 0) { navOk = false; navBad.push(path.relative(root, f) + ': khong co nav'); continue; }
  const nav = s.slice(i, j);
  const n = (nav.match(/<a href=/g) || []).length;
  const good = n === 6 && nav.includes('Thanh lý Kiot') && nav.includes('thanh-ly-kiot.html') &&
    nav.includes('Trang chủ') && nav.includes('Dành cho Mẫu') && nav.includes('Dành cho Shop') &&
    nav.includes('Tin tức') && nav.includes('Hỏi đáp');
  if (!good) { navOk = false; navBad.push(path.relative(root, f)); }
}
t('nav 6 muc, co Thanh lý Kiot, trong ca 68 file', navOk, navBad.join('; '));
t('nav bai-viet dung ../thanh-ly-kiot.html (link tuong doi)',
  read('bai-viet/ba-san-dong-loat-tang-phi-san.html').includes('<a href="../thanh-ly-kiot.html" class="">Thanh lý Kiot</a>'));

// ---- (C) Sitemap + CACHE ----
t('sitemap: 64 URL, co thanh-ly-kiot.html',
  sitemap.includes('thanh-ly-kiot.html') && (sitemap.match(/<url>/g) || []).length === 64);
t("sw.js CACHE = 'v86-shell-1'", sw.includes("const CACHE = 'v86-shell-1';"));

// ---- (D) Du lieu: kiots rong, du lieu cu khong doi ----
const sb = { window: {}, module: { exports: {} }, console, document: { querySelectorAll: () => [], getElementById: () => null, addEventListener: () => {} }, location: { search: '' } };
vm.createContext(sb);
vm.runInContext(read('js/data.js'), sb);
vm.runInContext(read('js/app.js'), sb);
const V = sb.window.V20;
const D = sb.window.V20_DATA;
t('data.js: kiots la mang rong', Array.isArray(D.kiots) && D.kiots.length === 0);
t('du lieu cu khong doi: 20 mau / 30 shop / 50 bai / 14 lo / 40 xuong',
  D.models.length === 20 && D.shops.length === 30 && D.articles.length === 50 &&
  D.lots.length === 14 && D.factories.length === 40);
t('lotCardHTML render duoc 1 kiot mau (cung dinh dang truong nhu lot)',
  (() => {
    const k = { id: 'kiot-test', title: 'Thanh lý kiot 20m2 — Quận 1', price: '120.000.000đ', priceNum: 120000000, qty: null, cat: 'mat-bang', meta: 'Diện tích: 20m2 · TP. Hồ Chí Minh · Bao gồm: kệ, quầy, điều hòa', date: '07/11/2026', dateLabel: 'Ngày đăng', label: 'CHƯA XÁC NHẬN ĐỒNG Ý ĐĂNG WEB', url: 'https://example.com/kiot', linkText: 'Xem bài đăng gốc →' };
    const h = V.lotCardHTML(k);
    return h.includes('class="lot-card"') && h.includes('Thanh lý kiot 20m2') && h.includes('120.000.000đ') && h.includes('20m2');
  })());

console.log(`v86: ${pass} PASS, ${fail} FAIL`);
process.exit(fail ? 1 : 0);
