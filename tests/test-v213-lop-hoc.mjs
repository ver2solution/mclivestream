// test-v213-lop-hoc.mjs — test tĩnh gói v213: 2 mục lớp học hiện 2 hàng +
// nút Xem thêm hiện số lượng + Áp dụng lọc mục mới tự cuộn tới kết quả.
// Chạy: node tests/test-v213-lop-hoc.mjs (từ thư mục v213-lop-hoc-2-hang/)
// Quy ước: PASS in ra "v213: N/N PASS" + exit 0; FAIL + exit 1.
// Lưu ý: kiểm tra đoạn code bằng includes() (chuỗi nguyên văn) để tránh
// lỗi escape regex; chỉ dùng regex đơn giản khi cần đếm số lần xuất hiện.
import { readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';

const DIR = new URL('.', import.meta.url).pathname; // .../v213-lop-hoc-2-hang/tests/
const ROOT = DIR + '../';
const LIVE = DIR + '../staging/'; // bản live pristine (sparse clone, không sửa)
let pass = 0, fail = 0;
const T = (name, cond, extra = '') => {
  if (cond) { pass++; console.log('PASS  ' + name); }
  else { fail++; console.log('FAIL  ' + name + (extra ? ' — ' + extra : '')); }
};
const count = (s, sub) => (s.split(sub).length - 1);

const shop = readFileSync(ROOT + 'danh-sach-shop.html', 'utf8');
const app = readFileSync(ROOT + 'js/app.js', 'utf8');
const kiot = readFileSync(ROOT + 'thanh-ly-kiot.html', 'utf8');
const sw = readFileSync(ROOT + 'sw.js', 'utf8');

// --- 1. 2 mục lớp học hiện 2 hàng (bỏ rows-1) ---
T('shop: section lop-livestream-mc KHÔNG còn class rows-1',
  shop.includes('<section class="lot-section filter-section collapsed" id="lop-livestream-mc"'));
T('shop: section lop-makeup KHÔNG còn class rows-1',
  shop.includes('<section class="lot-section filter-section collapsed" id="lop-makeup"'));
T('shop: không còn rows-1 trong thẻ section (chỉ còn trong comment v213)',
  count(shop, 'rows-1') === 1 && shop.includes('bo class rows-1 cua v181'));
T('shop: 2 section vẫn class collapsed mặc định (2 hàng)',
  count(shop, 'lot-section filter-section collapsed" id="lop-') === 2);
T('shop: vẫn đủ 2 lưới + 2 dòng đếm + 2 dòng trống',
  shop.includes('id="classLiveGrid"') && shop.includes('id="classMakeupGrid"') &&
  shop.includes('id="classLiveCount"') && shop.includes('id="classMakeupCount"') &&
  shop.includes('id="classLiveEmpty"') && shop.includes('id="classMakeupEmpty"'));

// --- 2. Nút Xem thêm: 1 chủ duy nhất (helper), hiện số / ẩn khi hết ---
T('shop: nút classLiveMoreBtn + classMakeupMoreBtn vẫn còn',
  shop.includes('id="classLiveMoreBtn"') && shop.includes('id="classMakeupMoreBtn"'));
T('shop: đã bỏ 2 script inline riêng (không còn IIFE getElementById lop-livestream-mc/lop-makeup)',
  !shop.includes('getElementById("lop-livestream-mc")') &&
  !shop.includes('getElementById("lop-makeup")'));
T('app: có helper refreshClassMoreBtn',
  app.includes('function refreshClassMoreBtn(secId){'));
T('app: CLASS_MORE map đủ 2 mục (lop-livestream-mc/lop-makeup)',
  app.includes("'lop-livestream-mc': {moreBtnId: 'classLiveMoreBtn', gridId: 'classLiveGrid'}") &&
  app.includes("'lop-makeup': {moreBtnId: 'classMakeupMoreBtn', gridId: 'classMakeupGrid'}"));
T('app: helper hiện "Xem thêm ↓ (còn N lớp học)" khi thu gọn',
  app.includes("mb.textContent = 'Xem thêm ↓ (còn ' + hidden + ' lớp học)';"));
T('app: helper ẨN nút khi không còn thẻ ẩn (hidden = hidden === 0)',
  app.includes('mb.hidden = hidden === 0;'));
T('app: helper mở rộng thì nút là "Thu gọn ↑"',
  app.includes("mb.textContent = 'Thu gọn ↑';"));
T('app: helper đếm bằng offsetParent, loại thẻ bị lọc',
  app.includes('c.offsetParent === null') && app.includes("!c.classList.contains('lot-filtered-out')"));
T('app: helper expose qua window.V20 literal',
  app.includes('refreshClassMoreBtn:refreshClassMoreBtn'));
T('app: 1 đăng ký click duy nhất (guard _v213Bound) + refresh lần đầu',
  app.includes('!b._v213Bound') && app.includes('b._v213Bound = true;') &&
  app.includes("s.classList.toggle('collapsed');"));
T('app: setExpanded gọi helper thay vì đặt text đơn (2 mục lớp học)',
  app.includes("if(CLASS_MORE[opts.sectionId]){ refreshClassMoreBtn(opts.sectionId); return; }"));
T('app: collapseSection/expandSection gọi helper cho 2 mục lớp học',
  count(app, "if(CLASS_MORE[id]){ refreshClassMoreBtn(id); return; }") === 2);
T('app: setShopCat gọi helper cho mục đã chọn + mục kia (không đặt text trực tiếp)',
  app.includes('refreshClassMoreBtn(ncfg.sectionId);') &&
  !app.includes('var mb = document.getElementById(ncfg.moreBtnId);'));

// --- 3. Áp dụng lọc mục mới TỰ CUỘN tới kết quả (v213, ghi đè v207) ---
T('app: apply() nhận cờ doScroll',
  app.includes('function apply(doScroll){'));
T('app: cuộn khi doScroll=true HOẶC section không phải mục mới',
  app.includes('if((doScroll === true || !opts.noScroll) && target.scrollIntoView)'));
T('app: đúng 2 chỗ gọi h.apply(true) (Mẫu + Shop)',
  count(app, 'h.apply(true)') === 2);
T('app: không còn gọi h.apply() thật (chỉ còn trong comment)',
  count(app, 'h.apply();') === 0);
T('app: không còn comment v207 cấm cuộn ở 2 nút Áp dụng',
  !app.includes('Áp dụng lọc mục mới KHÔNG cuộn tới section'));
T('kiot: onFilterChange gọi h.apply(true) (Áp dụng/đổi lọc -> cuộn)',
  kiot.includes('if(h && h.apply) h.apply(true);'));
T('kiot: setKiotCat vẫn gọi h.apply() không cờ (bấm tab KHÔNG cuộn)',
  kiot.includes('if(h && h.apply) h.apply();'));
T('kiot: v212 không đổi (helper refreshKiotSubMoreBtn còn nguyên)',
  kiot.includes('function refreshKiotSubMoreBtn(secId){'));

// --- 4. sw.js bump CACHE ---
T('sw: CACHE = v213-shell-1',
  sw.includes("const CACHE = 'v213-shell-1';"));

// --- 5. Scope: chỉ 4 file đổi so với live ---
/* Runner-safe (bài học v211 lần 1 FAIL 29/31): trên runner, "live" = HEAD của
   git (test chạy sau khi unzip overlay gói lên repo tree nên git diff
   --name-only liệt kê đúng file đổi); local thì so với bản pristine trong
   staging/ (sparse clone live, không sửa). */
const EXPECTED = ['danh-sach-shop.html', 'js/app.js', 'sw.js', 'thanh-ly-kiot.html'].sort();
let changed = [];
let scopeVia = 'git';
try {
  const out = execSync('git diff --name-only', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
  changed = out ? out.split('\n').map(s => s.trim()).filter(Boolean).sort() : [];
  if (!changed.length) throw new Error('empty git diff');
} catch {
  scopeVia = 'staging';
  changed = [];
  for (const f of EXPECTED) {
    try {
      if (readFileSync(ROOT + f, 'utf8') !== readFileSync(LIVE + f, 'utf8')) changed.push(f);
    } catch { /* thiếu file live -> bỏ qua */ }
  }
  changed.sort();
}
T('scope: đúng 4 file đổi so với live (' + scopeVia + ')',
  JSON.stringify(changed) === JSON.stringify(EXPECTED), 'đổi: ' + changed.join(', '));
T('scope: gói nhỏ (tổng số dòng đổi ≤ 130)',
  (() => {
    let n = 0;
    for (const f of EXPECTED) {
      try {
        const a = readFileSync(LIVE + f, 'utf8').split('\n').length;
        const b = readFileSync(ROOT + f, 'utf8').split('\n').length;
        n += Math.abs(a - b);
      } catch { /* runner không có staging/ -> bỏ qua kiểm này */ return scopeVia === 'git'; }
    }
    return n <= 130;
  })());

console.log(fail === 0 ? `\nv213: ${pass}/${pass} PASS` : `\nv213: ${pass} PASS, ${fail} FAIL`);
process.exit(fail === 0 ? 0 : 1);
