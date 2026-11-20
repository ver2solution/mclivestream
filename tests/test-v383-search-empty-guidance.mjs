// test-v383-search-empty-guidance.mjs — v383 (TK-01, 20/11/2026):
// Gõ truy vấn THẬT SỰ TRỐNG (bấm Enter khi ô tìm kiếm trống) phải hiện dòng
// hướng dẫn "Nhập từ khóa để tìm kiếm..." ở #searchMeta, thay vì để trống
// (QA 19-20/11: không có dòng đếm, không có thông báo nào).
// Hồi quy kèm: TK-02 (gõ toàn ký tự đặc biệt "%^&*") vẫn tooShort + q chuẩn
// hóa rỗng; tìm có từ khóa vẫn chạy bình thường.
// Chạy: node tests/test-v383-search-empty-guidance.mjs (từ gốc repo).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const src = fs.readFileSync(path.join(root, 'js/search.js'), 'utf8');
let pass = 0, fail = 0;
function check(name, ok) {
  if (ok) { pass++; console.log('PASS ' + name); }
  else { fail++; console.log('FAIL ' + name); }
}

// 1. Nhánh v383 có trong mã nguồn (renderMeta, nhánh tooShort)
check('v383: co dong huong dan "Nhap tu khoa de tim kiem..."', src.includes('Nhập từ khóa để tìm kiếm mẫu, shop, lô, xưởng, kiot hoặc bài báo.'));
const renderMeta = src.slice(src.indexOf('function renderMeta'), src.indexOf('function renderResults'));
check('v383: dong huong dan nam trong renderMeta', renderMeta.includes('Nhập từ khóa để tìm kiếm'));
check('v383: guard if (!state.q) truoc khi xoa trang meta', /if\s*\(!state\.q\)\s*\{[^}]*Nhập từ khóa để tìm kiếm/.test(renderMeta));
check('v383: nhanh TK-02 (state.q && !res.q) van con nguyen', renderMeta.includes("if (state.q && !res.q)") && renderMeta.includes('0 kết quả'));
// 2. Hành vi hàm thuần: search() với truy vấn trống / toàn ký tự đặc biệt
const require = createRequire(import.meta.url);
const API = require(path.join(root, 'js/search.js'));
const idx = API.buildIndex({
  models: [{ id: 'th-1', name: 'Lan Phương', title: 'Mẫu livestream', cat: 'Thời trang', province: 'Hà Nội' }],
  shops: [], lots: [], factories: [], kiots: [], articles: [],
  classesLive: [], classesMakeup: [], eventsMarketing: [], logistics: [], rentals: [], agencyAds: [], movingServices: [], liveEquipment: [],
});
const rEmpty = API.search(idx, '', {});
check('search("") tra tooShort=true (v383 chi doi renderMeta, khong doi search core)', rEmpty && rEmpty.tooShort === true);
const rSpecial = API.search(idx, '%^&*', {});
check('TK-02: search("%^&*") tooShort + q chuan hoa rong', rSpecial && rSpecial.tooShort === true && rSpecial.q === '');
const rNormal = API.search(idx, 'Lan Phương', {});
check('tim co tu khoa van tra ket qua (khong bi anh huong boi v383)', rNormal && !rNormal.tooShort && rNormal.results && rNormal.results.length >= 1);

console.log(`\n${pass} PASS, ${fail} FAIL`);
process.exit(fail ? 1 : 0);
