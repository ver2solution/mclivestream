// test-v436-intro-stale-numbers.mjs — v436 (#67): thông tin gây hiểu lầm.
// (1) "không lưu MK nhưng bắt nhập MK": trang-cua-toi.html ghi "không lưu
// mật khẩu của bạn" trong khi form đăng ký BẮT BUỘC nhập mật khẩu — sửa theo
// đúng câu chữ trong chinh-sach-bao-mat.html (Supabase Auth lưu trữ + mã
// hoá; web không lưu dạng văn bản thuần, không nhìn thấy mật khẩu).
// (2) Số liệu Giới thiệu cũ: gioi-thieu.html KHÔNG nạp js/data.js nên
// renderLiveStats (v279/v299) luôn return sớm — chú thích + alt kẹt ở số
// 16/11 (238/290/143/320/280). Fix: nạp js/data.js trước js/app.js + cập
// nhật số dự phòng theo live hiện tại (246/313/305/437/381, 24/11/2026).
// Cả 2 file đều là .html (network-first) nên KHÔNG bump CACHE.
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const INTRO = fs.readFileSync(path.join(ROOT, 'gioi-thieu.html'), 'utf8');
const MINE = fs.readFileSync(path.join(ROOT, 'trang-cua-toi.html'), 'utf8');
const SW = fs.readFileSync(path.join(ROOT, 'sw.js'), 'utf8');

let pass = 0, fail = 0;
function ok(name, cond, extra) {
  if (cond) { pass++; console.log('PASS ' + name); }
  else { fail++; console.log('FAIL ' + name + (extra ? ' — ' + extra : '')); }
}

// 1. gioi-thieu.html nạp js/data.js TRƯỚC js/app.js.
{
  const iData = INTRO.indexOf('<script src="js/data.js"></script>');
  const iApp = INTRO.indexOf('<script src="js/app.js"></script>');
  ok('1. gioi-thieu nap js/data.js truoc js/app.js', iData !== -1 && iApp !== -1 && iData < iApp, 'data=' + iData + ' app=' + iApp);
}
// 2. Số dự phòng trong chú thích = số live hiện tại.
for (const [key, n] of [['models', '246'], ['shops', '313'], ['lots', '305'], ['factories', '437'], ['kiots', '381']]) {
  ok('2. chu thich ' + key + ' = ' + n, INTRO.includes('<span data-stat="' + key + '">' + n + '</span>'));
}
// 3. Alt infographic = số live hiện tại + ngày 24/11/2026, không còn số 16/11.
ok('3. alt infographic so live + ngay 24/11/2026',
  INTRO.includes('246 mẫu livestream, 313 shop, 305 lô xả kho đang hoạt động, 437 xưởng may, 381 kiot — số liệu sàn tính tới 24/11/2026')
  && !INTRO.includes('16/11/2026') && !INTRO.includes('238 mẫu'));
ok('3b. khong con so cu 238/290/143/320/280 trong chu thich + alt',
  !/238<\/span>|290<\/span>|143<\/span>|320<\/span>|280<\/span>/.test(INTRO));
// 4. Câu mật khẩu ở Trang của tôi khớp chính sách bảo mật.
ok('4. cau mat khau khop chinh sach bao mat',
  MINE.includes('Mật khẩu do Supabase Auth lưu trữ và mã hoá — web không lưu mật khẩu ở dạng văn bản thuần và không nhìn thấy mật khẩu của bạn.'));
ok('4b. khong con cau gay hieu lam "không lưu mật khẩu của bạn"',
  !MINE.includes('không lưu mật khẩu của bạn.'));
// 5. Không bump CACHE (2 file .html network-first).
ok('5. sw.js khong doi CACHE v436', !SW.includes('v436'));

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
