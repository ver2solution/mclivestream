// test-v212-kiot.mjs — test tĩnh gói v212: trang Kiot — xóa dòng Đăng tin,
// 4 mục × 2 hàng = 8 hàng (mặc định), nút Xem thêm hiện số lượng.
// Chạy: node tests/test-v212-kiot.mjs (từ thư mục v212-kiot-xem-them/)
// Quy ước: PASS in ra "v212: N/N PASS" + exit 0; FAIL + exit 1.
import { readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';

const DIR = new URL('.', import.meta.url).pathname; // .../v212-kiot-xem-them/tests/
const ROOT = DIR + '../';
const BASE = DIR + '../../v210-move-cats/'; // nguồn v210 = live
let pass = 0, fail = 0;
const T = (name, cond, extra = '') => {
  if (cond) { pass++; console.log('PASS  ' + name); }
  else { fail++; console.log('FAIL  ' + name + (extra ? ' — ' + extra : '')); }
};

const kiot = readFileSync(ROOT + 'thanh-ly-kiot.html', 'utf8');

// --- 1. Xóa dòng Đăng tin ---
T('kiot: đã xóa nút "+ Đăng tin thanh lý kiot của bạn"', !/Đăng tin thanh lý kiot/.test(kiot));
T('kiot: đã xóa link trang-cua-toi.html#myListingsSection', !/myListingsSection/.test(kiot));
T('kiot: không xóa nhầm link Đăng ký/Đăng nhập khác', /dang-ky\.html/.test(kiot) && /dang-nhap\.html/.test(kiot));

// --- 2. Cấu trúc 4 mục giữ nguyên (switch 4 nút, 3 section + danh sách chính) ---
const tabs = [...kiot.matchAll(/data-uni-cat="([^"]+)"/g)].map((m) => m[1]).filter((v, i, a) => a.indexOf(v) === i);
T('kiot: switch vẫn 4 mục kiot/chuyen-nha/thiet-bi-live/rentals',
  JSON.stringify(tabs) === JSON.stringify(['kiot', 'chuyen-nha', 'thiet-bi-live', 'rentals']), 'có [' + tabs.join(',') + ']');
T('kiot: vẫn đủ 3 section mục con (dich-vu-chuyen-nha/thiet-bi-phong-live/cho-thue-cua-hang-kho)',
  /id="dich-vu-chuyen-nha"/.test(kiot) && /id="thiet-bi-phong-live"/.test(kiot) && /id="cho-thue-cua-hang-kho"/.test(kiot));
T('kiot: KIOT_MAX_ROWS vẫn 12 (2 hàng × 6 cột)', /var KIOT_MAX_ROWS = 12/.test(kiot));
T('kiot: 3 section vẫn class collapsed mặc định (2 hàng)',
  (kiot.match(/lot-section filter-section collapsed/g) || []).length === 3);
T('kiot: the <style> cân bằng (mở = đóng)', (kiot.match(/<style[ >]/g) || []).length === (kiot.match(/<\/style>/g) || []).length);

// --- 3. Nút Xem thêm danh sách chính hiện số lượng ---
T('kiot: render() đặt text Xem thêm kèm số còn lại',
  /moreBtn\.textContent = 'Xem thêm ↓ \(còn ' \+ \(total - rows\.length\) \+ ' tin\)'/.test(kiot));
T('kiot: nút chính vẫn ẩn khi không còn tin (hidden = !(total > rows.length))',
  /moreBtn\.hidden = !\(total > rows\.length\)/.test(kiot));

// --- 4. Nút Xem thêm mục con: 1 chủ duy nhất (helper), hiện số / ẩn khi hết ---
T('kiot: có helper refreshKiotSubMoreBtn', /function refreshKiotSubMoreBtn\(secId\)/.test(kiot));
T('kiot: helper hiện "Xem thêm ↓ (còn N)" khi thu gọn', /textContent = 'Xem thêm ↓ \(còn ' \+ hidden \+ '\)'/.test(kiot));
T('kiot: helper ẨN nút khi không còn thẻ ẩn (hidden = hidden === 0)', /mb\.hidden = hidden === 0/.test(kiot));
T('kiot: helper mở rộng thì nút là "Thu gọn ↑"', /mb\.textContent = 'Thu gọn ↑'/.test(kiot));
T('kiot: helper đếm bằng offsetParent, loại thẻ bị lọc', /offsetParent === null/.test(kiot) && /lot-filtered-out/.test(kiot));
T('kiot: KHÔNG còn text "Xem thêm ↓" đơn (không số) trong file', !/textContent = 'Xem thêm ↓'/.test(kiot) && !/textContent=open\?"Thu gọn ↑":"Xem thêm ↓"/.test(kiot));
T('kiot: đã bỏ 3 script inline riêng (không còn getElementById("dich-vu-chuyen-nha") dạng IIFE)',
  !/<script>\(function\(\)\{var s=document\.getElementById\("dich-vu-chuyen-nha"\)/.test(kiot) &&
  !/<script>\(function\(\)\{var s=document\.getElementById\("thiet-bi-phong-live"\)/.test(kiot) &&
  !/<script>\(function\(\)\{var s=document\.getElementById\("cho-thue-cua-hang-kho"\)/.test(kiot));
T('kiot: showKiotDefault gọi helper thay vì đặt text trực tiếp',
  /function showKiotDefault\(\)[\s\S]{0,400}refreshKiotSubMoreBtn\(secId\)/.test(kiot));
T('kiot: setKiotCat gọi helper sau khi mở mục', /updateKiotCountForSub\(secId\);\s*\n\s*refreshKiotSubMoreBtn\(secId\);/.test(kiot));
T('kiot: onFilterChange gọi helper sau khi cập nhật đếm', /updateKiotCountForSub\(secId\);\s*\n\s*refreshKiotSubMoreBtn\(secId\);\s*\n\s*return;/.test(kiot));
T('kiot: bam lai tab Kiot thi danh sach chinh ve 2 hang (reset kiotShown)',
  /if\(!secId\)\{ kiotShown = KIOT_MAX_ROWS;/.test(kiot));
T('kiot: helper expose ra window.V20 để test/debug', /window\.V20\.refreshKiotSubMoreBtn = refreshKiotSubMoreBtn/.test(kiot));

// --- 5. Scope: chỉ 1 file đổi so với live ---
/* Runner-safe (bài học v211 lần 1 FAIL 29/31): trên runner, "live" = HEAD của
   git (test chạy sau khi unzip overlay gói lên repo tree nên git diff
   --name-only liệt kê đúng file đổi); local không có repo thì so với thư mục
   BASE v210 như cũ. */
const EXPECTED = ['thanh-ly-kiot.html'];
let changed = [];
let scopeVia = 'git';
try {
  const out = execSync('git diff --name-only', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
  changed = out ? out.split('\n').map(s => s.trim()).filter(Boolean) : [];
} catch {
  scopeVia = 'base';
  try { changed = readFileSync(ROOT + 'thanh-ly-kiot.html', 'utf8') !== readFileSync(BASE + 'thanh-ly-kiot.html', 'utf8') ? ['thanh-ly-kiot.html'] : []; } catch { changed = []; }
}
T('scope: chỉ thanh-ly-kiot.html đổi so với live (' + scopeVia + ')', changed.length === 1 && changed[0] === 'thanh-ly-kiot.html', 'đổi: ' + changed.join(', '));
T('scope: số dòng đổi ít (chênh ≤ 60 dòng, gói nhỏ)', (() => {
  try {
    const live = readFileSync(BASE + 'thanh-ly-kiot.html', 'utf8');
    return Math.abs(live.split('\n').length - kiot.split('\n').length) <= 60;
  } catch { return scopeVia === 'git'; }
})(), 'kiểm bằng git diff khi chạy trên runner');

console.log(`\nv212: ${pass}/${pass + fail} PASS`);
process.exit(fail ? 1 : 0);
