/* Test v197 — Link "Xem hồ sơ / Xem shop" ở tim-kiem.html tới đúng thẻ đích
   (MỚI-MC-10 gộp PC-S1/N21, Rion nhờ qua khung chat 14:07 ngày 13/11/2026).
   Gốc lỗi: search.js link dạng danh-sach-mau.html#th-03 nhưng thẻ chỉ có
   data-v2s-id (không có id thật) nên neo trình duyệt không tìm được, và
   trang mẫu/shop phân trang (12/24) mà không có xử lý hash nào — thẻ đích
   không nằm trang 1 thì không bao giờ hiện.
   Sửa: js/app.js — thêm id thật vào thẻ mẫu/shop/lô/xưởng (giống newobj đã
   có); helper pageOfId() tính trang chứa id; initList/initShops lần render
   đầu nhảy đúng trang theo hash rồi cuộn tới thẻ; cuối chuỗi khởi tạo gọi
   scrollToHashedCard() cho trang lô/xưởng/kiot; thanh-ly-kiot.html mở đúng
   mục mới (mv-/le-) hoặc mở rộng danh sách kiot rồi cuộn tới thẻ hash.
   sw.js CACHE v197-shell-1.
   Node only, no browser. Chạy: node tests/test-v197-hash-jump-2026-11-13.mjs */
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let pass = 0, fail = 0;
function t(name, cond, extra = '') {
  if (cond) { pass++; console.log('PASS v197:', name); }
  else { fail++; console.log('FAIL v197:', name, extra); }
}
const readPrep = (f) => fs.readFileSync(path.join(root, f), 'utf8');

/* ---- DOM shim tối thiểu (mẫu test-v130 / test-v184 / test-cat2) ---- */
function mockEl() {
  return { innerHTML: '', textContent: '', style: {}, hidden: false, value: '',
    classList: { _s: new Set(), add(c) { this._s.add(c); }, remove(c) { this._s.delete(c); }, toggle(c) { this._s.has(c) ? this._s.delete(c) : this._s.add(c); }, contains(c) { return this._s.has(c); } },
    setAttribute() {}, getAttribute() { return null; }, appendChild() {}, addEventListener() {}, closest: () => null,
    scrollIntoView() { this._scrolled = (this._scrolled || 0) + 1; } };
}
const els = {};
function el(id) { if (!els[id]) els[id] = mockEl(); return els[id]; }
const loc = { hash: '', pathname: '/danh-sach-mau.html', search: '' };
const sb = {
  window: {}, module: { exports: {} }, console, URLSearchParams,
  location: loc,
  document: { getElementById: (id) => els[id] || null, addEventListener: () => {},
    querySelectorAll: () => [], querySelector: () => null },
};
vm.createContext(sb);
vm.runInContext(readPrep('js/data.js'), sb);
vm.runInContext(readPrep('js/app.js'), sb);
const D = sb.window.V20_DATA;
const V = sb.window.V20;
const appJs = readPrep('js/app.js');
const swJs = readPrep('sw.js');
const kiotHtml = readPrep('thanh-ly-kiot.html');

/* ---- 1. pageOfId: trang chứa id (1-based) ---- */
const p = V.pageOfId;
t('pageOfId export qua window.V20', typeof p === 'function');
function mkList(n, prefix) { const a = []; for (let i = 0; i < n; i++) a.push({ id: prefix + '-' + String(i + 1).padStart(3, '0') }); return a; }
const models219 = mkList(219, 'th');
const shops250 = mkList(250, 'sh');
t('pageOfId: id đầu danh sách → trang 1', p(models219, 'th-001', 12) === 1);
t('pageOfId: index 11 (12/trang) → trang 1', p(models219, 'th-012', 12) === 1);
t('pageOfId: index 12 (12/trang) → trang 2', p(models219, 'th-013', 12) === 2);
t('pageOfId: th-219 (index 218, 12/trang) → trang 19', p(models219, 'th-219', 12) === 19);
t('pageOfId: index 23 (24/trang) → trang 1', p(shops250, 'sh-024', 24) === 1);
t('pageOfId: index 24 (24/trang) → trang 2', p(shops250, 'sh-025', 24) === 2);
t('pageOfId: sh-153 (index 152, 24/trang) → trang 7', p(shops250, 'sh-153', 24) === 7);
t('pageOfId: sh-250 (index 249, 24/trang) → trang 11', p(shops250, 'sh-250', 24) === 11);
t('pageOfId: id không có → null', p(models219, 'th-999', 12) === null);
t('pageOfId: danh sách rỗng → null', p([], 'th-001', 12) === null);
t('pageOfId: id rỗng → null', p(models219, '', 12) === null);
t('pageOfId: perPage 0 → null', p(models219, 'th-001', 0) === null);
t('pageOfId: list không phải mảng → null', p(null, 'th-001', 12) === null);

/* ---- 2. Dữ liệu thật có id báo lỗi ---- */
t('D.models có th-03', (D.models || []).some((m) => m.id === 'th-03'));
t('D.shops có sh-153', (D.shops || []).some((s) => s.id === 'sh-153'));

/* ---- 3. Thẻ render có id thật ---- */
const th03 = (D.models || []).find((m) => m.id === 'th-03');
t('cardHTML(th-03) có id="th-03"', th03 && V.cardHTML(th03).includes('id="th-03"'));
const sh153 = (D.shops || []).find((s) => s.id === 'sh-153');
t('shopCardHTML(sh-153) có id="sh-153"', sh153 && V.shopCardHTML(sh153).includes('id="sh-153"'));
t('lotCardHTML có id thật', appJs.includes("id=\"'+esc(l.id)+'\""));
t('factoryCardHTML có id thật', appJs.includes("id=\"'+esc(f.id)+'\""));
t('newobj card đã có id (không hồi quy)', appJs.includes("id=\"' + esc(item.id) + '\""));

/* ---- 4. Wiring hash-jump trong render ---- */
t('initList render có khối v197 (pageOfId 12/trang)', appJs.includes('var hp = pageOfId(list, hid, 12);'));
t('initShops render có khối v197 (pageOfId perPage)', appJs.includes('var hp = pageOfId(list, hid, perPage);'));
t('render cuộn tới thẻ sau khi nhảy trang', appJs.includes('scrollToHashedCard();'));
t('khối v91 không cuộn đè khi đã nhảy hash (mẫu)', appJs.includes('!render._hashJumped'));
t('chuỗi khởi tạo gọi scrollToHashedCard cuối', appJs.includes('safeInit(scrollToHashedCard);'));
t('pageOfId + scrollToHashedCard export qua window.V20', appJs.includes('pageOfId:pageOfId, scrollToHashedCard:scrollToHashedCard'));

/* ---- 5. scrollToHashedCard qua DOM shim ---- */
const card = el('th-03');
loc.hash = '#th-03';
t('scrollToHashedCard: hash #th-03 → cuộn tới thẻ', V.scrollToHashedCard() === true && card._scrolled === 1);
loc.hash = '#th-999';
t('scrollToHashedCard: hash không có thẻ → false', V.scrollToHashedCard() === false);
loc.hash = '';
t('scrollToHashedCard: không có hash → false', V.scrollToHashedCard() === false);

/* ---- 6. Trang Kiot: mở mục + mở rộng danh sách theo hash thẻ ---- */
t('thanh-ly-kiot.html có khối v197 hash thẻ', kiotHtml.includes('v197 (MỚI-MC-10)'));
t('kiot: thẻ mục mới mở đúng mục trước khi cuộn', kiotHtml.includes("sec.id === 'dich-vu-chuyen-nha'"));
t('kiot: mở rộng danh sách tới khi thẻ kiot xuất hiện', kiotHtml.includes('kiotShown += KIOT_MAX_ROWS; render();'));
t('kiot: giữ nguyên mở mục theo hash section cũ', kiotHtml.includes("'#dich-vu-chuyen-nha': 'chuyen-nha'"));

/* ---- 7. CACHE ---- */
t('CACHE v197-shell-1', swJs.includes("const CACHE = 'v197-shell-1'") && !swJs.includes("v196-shell-1"));

console.log(`\nv197: ${pass} PASS, ${fail} FAIL`);
process.exit(fail ? 1 : 0);
