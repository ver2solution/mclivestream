// test-v211-merge-switch.mjs — test tĩnh gói v211: gộp nút mục vào switch chính 1 hàng (giống Kiot).
// Chạy: node tests/test-v211-merge-switch.mjs  (từ thư mục v211-kiot-style/)
// Quy ước: PASS in ra "v211: N/N PASS" + exit 0; FAIL in ra chi tiết + exit 1.
import { readFileSync, existsSync } from 'node:fs';
import { execSync } from 'node:child_process';

const DIR = new URL('.', import.meta.url).pathname; // .../v211-kiot-style/tests/
const ROOT = DIR + '../'; // .../v211-kiot-style/ (gói v211)
const BASE = DIR + '../../v210-move-cats/'; // nguồn v210 = live
let pass = 0, fail = 0;
const T = (name, cond, extra = '') => {
  if (cond) { pass++; console.log('PASS  ' + name); }
  else { fail++; console.log('FAIL  ' + name + (extra ? ' — ' + extra : '')); }
};

const mau = readFileSync(ROOT + 'danh-sach-mau.html', 'utf8');
const shop = readFileSync(ROOT + 'danh-sach-shop.html', 'utf8');
const app = readFileSync(ROOT + 'js/app.js', 'utf8');
const sw = readFileSync(ROOT + 'sw.js', 'utf8');

// --- 1. Trang Dành cho Shop (danh-sach-mau.html): 1 switch, 6 nút đúng thứ tự ---
const mauSwitches = [...mau.matchAll(/<div class="uni-cat-switch"[^>]*>/g)];
T('mau: the <style> can bang (mo = dong)', (mau.match(/<style[ >]/g) || []).length === (mau.match(/<\/style>/g) || []).length && (mau.match(/<style[ >]/g) || []).length >= 1);
T('mau: chi 1 container .uni-cat-switch', mauSwitches.length === 1, 'có ' + mauSwitches.length);
const mauBtns = [...mau.matchAll(/<button[^>]*class="uni-cat-btn[^"]*"[^>]*data-uni-cat="([^"]+)"/g)].map(m => m[1]);
T('mau: 6 nút đúng thứ tự model/lot/factory/logistics/event-mkt/agency-ads',
  JSON.stringify(mauBtns) === JSON.stringify(['model','lot','factory','logistics','event-mkt','agency-ads']),
  'có [' + mauBtns.join(',') + ']');
T('mau: không còn id #shopServicesSwitch trong markup', !/id="shopServicesSwitch"/.test(mau));
T('mau: không còn nhãn "Dịch vụ cho shop:"', !/Dịch vụ cho shop:/.test(mau));
T('mau: không còn class newobj-switch-label', !/newobj-switch-label/.test(mau));
T('mau: nút mục mới có span uni-cat-count (3 nút)', (mau.match(/<span class="uni-cat-count"><\/span>/g) || []).length === 3);
T('mau: nút chính KHÔNG có uni-cat-count', !/data-uni-cat="model"[^>]*>.*uni-cat-count/s.test(mau.split('data-uni-cat="logistics"')[0]));
// --- 2. Bộ lọc trang Shop giữ nguyên: 12 ô, nút Áp dụng/Đặt lại dưới khung, căn phải ---
T('mau: đủ 12 ô .uni-field (không cắt ô nào)', (mau.match(/class="uni-field/g) || []).length === 12);
T('mau: có nút Áp dụng + Đặt lại (uniApplyBtn/uniResetBtn)', /id="uniApplyBtn"/.test(mau) && /id="uniResetBtn"/.test(mau));
T('mau: .filter-actions căn phải (justify-content:flex-end)', /\.filter-actions\{display:flex;justify-content:flex-end/.test(mau));
T('mau: filter-actions nằm NGOÀI grid .filter-card (sau </div> đóng card)',
  mau.indexOf("<div class=\"filter-actions\"") > mau.indexOf("id=\"uf-shop-pricesort\""));

// --- 3. Trang Dành cho Mẫu (danh-sach-shop.html): 1 switch, 3 nút đúng thứ tự ---
const shopSwitches = [...shop.matchAll(/<div class="uni-cat-switch"[^>]*>/g)];
T('shop: the <style> can bang (mo = dong)', (shop.match(/<style[ >]/g) || []).length === (shop.match(/<\/style>/g) || []).length && (shop.match(/<style[ >]/g) || []).length >= 1);
T('shop: chỉ 1 container .uni-cat-switch (id shopFilterSwitch)', shopSwitches.length === 1 && /id="shopFilterSwitch"/.test(shopSwitches[0][0]), 'có ' + shopSwitches.length);
const shopBtns = [...shop.matchAll(/<button[^>]*class="uni-cat-btn[^"]*"[^>]*data-uni-cat="([^"]+)"/g)].map(m => m[1]);
T('shop: 3 nút đúng thứ tự shop/class-live/class-makeup',
  JSON.stringify(shopBtns) === JSON.stringify(['shop','class-live','class-makeup']),
  'có [' + shopBtns.join(',') + ']');
T('shop: không còn id #modelClassesSwitch trong markup', !/id="modelClassesSwitch"/.test(shop));
T('shop: không còn nhãn "Lớp học cho mẫu:"', !/Lớp học cho mẫu:/.test(shop));
T('shop: không còn class newobj-switch-label', !/newobj-switch-label/.test(shop));
T('shop: nút lớp học có span uni-cat-count (2 nút)', (shop.match(/<span class="uni-cat-count"><\/span>/g) || []).length === 2);
// --- 4. Bộ lọc trang Mẫu giữ nguyên: 7 ô, nút dưới khung căn phải ---
T('shop: đủ 7 ô .uni-field (không cắt ô nào)', (shop.match(/class="uni-field/g) || []).length === 7);
T('shop: có nút Áp dụng + Đặt lại (shopApplyBtn/shopResetBtn)', /id="shopApplyBtn"/.test(shop) && /id="shopResetBtn"/.test(shop));
T('shop: .filter-actions căn phải', /\.filter-actions\{display:flex;justify-content:flex-end/.test(shop));

// --- 5. app.js: binding gộp 1 container; logic khóa/mở + ?newobj= không đổi ---
T('app: setShopCat chỉ bind #shopFilterSwitch (không còn #modelClassesSwitch trong code)',
  /querySelectorAll\('#shopFilterSwitch \.uni-cat-btn'\)/.test(app) && !/querySelectorAll\('[^']*#modelClassesSwitch/.test(app));
T('app: initUniCatSwitch vẫn bind toàn bộ .uni-cat-btn (trang Shop không cần đổi)',
  /function initUniCatSwitch[\s\S]{0,400}querySelectorAll\('\.uni-cat-btn'\)/.test(app));
T('app: UNI_LOCKABLE giữ nguyên (model đủ 5 ô)', /model: \['fUniCat','fUniSort','fUniShift','fUniPayType','fUniPayMin'\]/.test(app));
T('app: ?newobj= vẫn đọc ngay khi parse (window.__v199_newobj)', /window\.__v199_newobj/.test(app) || /__v199_newobj/.test(mau + shop));
try { execSync('node --check ' + ROOT + 'js/app.js', { stdio: 'pipe' }); T('app: node --check js/app.js OK', true); }
catch (e) { T('app: node --check js/app.js OK', false, String(e.message).slice(0, 200)); }

// --- 6. sw.js: bump CACHE ---
T('sw: CACHE = v211-shell-1', /const CACHE = 'v211-shell-1'/.test(sw));
T('sw: không còn v210-shell-1', !/v210-shell-1/.test(sw));

// --- 7. Scope: chỉ 4 file đổi so với live (v210), không file nào khác ---
/* v211b (sửa sau deploy v211 #1 FAIL 29/31 — lỗi của test, không phải gói):
   "live" trên runner = HEAD của git (test chạy SAU khi unzip overlay gói lên
   repo tree nên git diff --name-only liệt kê đúng file đổi); local không có
   repo thì so với thư mục BASE v210 như cũ. Lỗi gốc: BASE ../../v210-move-cats/
   chỉ có trong workspace local — trên runner đọc BASE throw hết nên changed=[]
   (log "đổi:" trống) và index.html có sẵn ở gốc repo làm nhánh catch trả false. */
const EXPECTED = ['danh-sach-mau.html', 'danh-sach-shop.html', 'js/app.js', 'sw.js'];
let changed = [];
let scopeVia = 'git';
try {
  const out = execSync('git diff --name-only', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
  changed = out ? out.split('\n').map(s => s.trim()).filter(Boolean) : [];
} catch {
  scopeVia = 'base';
  changed = EXPECTED.filter(f => {
    try { return readFileSync(ROOT + f, 'utf8') !== readFileSync(BASE + f, 'utf8'); } catch { return false; }
  });
}
T('scope: đúng 4 file đổi so với live (' + scopeVia + ')', changed.length === 4 && EXPECTED.every(f => changed.includes(f)), 'đổi: ' + changed.join(', '));
T('scope: index.html KHÔNG đổi (không nằm trong gói v211)', !changed.includes('index.html'));

console.log(`\nv211: ${pass}/${pass + fail} PASS`);
process.exit(fail ? 1 : 0);
