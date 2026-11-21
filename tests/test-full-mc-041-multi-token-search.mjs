// test-full-mc-041-multi-token-search.mjs — FULL-MC-041 (21/11/2026, thiết kế đã duyệt 13:40):
// (A) Tìm kiếm đa từ khóa: tách token, AND giữa token, OR giữa trường, điểm trường
//     tốt nhất/token + 20 khi toàn cụm xuất hiện liên tục trong tiêu đề/slug.
// (B) 4 redirect tĩnh cho URL đoán: tai-khoan, dang-tin, dang-tin-tuyen-mau, lo-xa-kho.
// Chạy: node tests/test-full-mc-041-multi-token-search.mjs (từ gốc repo).
// Kỳ vọng số đếm lấy từ data.js origin/main lúc viết test (238 mẫu / 304 shop / 564 bài,
// chỉ mục 2.352 mục); nếu data.js đổi số, cập nhật kỳ vọng theo số thật (§8 thiết kế).
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const src = fs.readFileSync(path.join(root, 'js/search.js'), 'utf8');
let pass = 0, fail = 0;
function check(name, ok, extra) {
  if (ok) { pass++; console.log('PASS ' + name); }
  else { fail++; console.log('FAIL ' + name + (extra !== undefined ? ' — ' + extra : '')); }
}

const require = createRequire(import.meta.url);
const API = require(path.join(root, 'js/search.js'));
const sb = { window: {}, console };
vm.createContext(sb);
vm.runInContext(fs.readFileSync(path.join(root, 'js/data.js'), 'utf8'), sb);
const data = sb.window.V20_DATA;
const idx = API.buildIndex(data);
check('chi muc live: 2.352 muc', idx.length === 2352, 'got ' + idx.length);

/* ---------- A0: tokenize (đơn vị) ---------- */
check('tokenize export ra API', typeof API.tokenize === 'function');
if (typeof API.tokenize === 'function') {
  check('tokenize("mẫu livestream thời trang") = 4 token', JSON.stringify(API.tokenize(API.normalize('mẫu livestream thời trang'))) === '["mau","livestream","thoi","trang"]');
  check('tokenize bo token 1 ky tu + trung lap', JSON.stringify(API.tokenize('a mau mau  b')) === '["mau"]');
  check('tokenize("") = []', JSON.stringify(API.tokenize('')) === '[]');
}

/* ---------- A1: truy vấn 3 từ — tái hiện FULL-MC-041 ---------- */
const r1 = API.search(idx, 'mẫu livestream thời trang', {});
check('A1: counts.mau >= 50', r1.counts.mau >= 50, 'got ' + r1.counts.mau);
check('A1: counts.bai >= 1', r1.counts.bai >= 1, 'got ' + r1.counts.bai);
check('A1: total >= 90', r1.total >= 90, 'got ' + r1.total);
check('A1: top-3 co it nhat 1 ho so mau Thoi trang',
  r1.results.slice(0, 3).some(function (e) { return e.type === 'mau' && /thoi trang/.test(API.normalize(e.cat || '')); }),
  'top3: ' + r1.results.slice(0, 3).map(function (e) { return e.type + ':' + e.title; }).join(' | '));

/* ---------- A2: hồi quy ----------
   LƯU Ý (đo 21/11 trên data.js thật): luật token §3 cho phép token khớp ở các
   trường KHÁC NHAU nên truy vấn NHIỀU TỪ trả nhiều hơn code cũ — đúng ý đồ
   (§3: "truy vấn nhiều từ trả NHIỀU hơn trước"), và 0 kết quả cũ nào bị mất
   (đã đối chiếu từng mục cũ theo khóa type|title|id: lost = 0 cho cả 4 truy vấn).
   Vì vậy kỳ vọng A2 cho truy vấn nhiều từ là SỐ MỚI (265/326/5), không phải số
   cũ 247/292/1 trong thiết kế — số cũ là tổng của luật "nguyên cụm", không còn
   đúng dưới luật token đã duyệt (§8 thiết kế: kỳ vọng lấy theo số thật).
   Cổng hồi quy THẬT là truy vấn 1 token: luật token = luật cũ khi chỉ có 1 token,
   nên kết quả (tổng + thứ tự type|title|score) phải GIỐNG HỆT code cũ — kiểm
   bằng bộ chấm điểm cũ tham chiếu dưới đây, không hardcode tổng. */
const r2 = API.search(idx, 'thời trang', {});
check('A2: search("thời trang") total = 265 (so moi, +18 khop cheo truong, 0 mat)', r2.total === 265, 'got ' + r2.total);
const r3 = API.search(idx, 'mẫu livestream', {});
check('A2: search("mẫu livestream") total = 326 (so moi, +34 khop cheo truong, 0 mat)', r3.total === 326, 'got ' + r3.total);
check('A2: search("mẫu livestream") counts.mau = 238', r3.counts.mau === 238, 'got ' + r3.counts.mau);
const r4 = API.search(idx, 'Phạm Thoại', {});
check('A2: search("Phạm Thoại") total = 5, counts.mau = 0 (so moi, +4 khop cheo truong, 0 mat)', r4.total === 5 && r4.counts.mau === 0, 'got total ' + r4.total + ' mau ' + r4.counts.mau);
/* Chấm điểm cũ (nguyên cụm, trước FULL-MC-041) làm tham chiếu hồi quy 1 token. */
function oldTitleScore(nText, q) {
  if (!nText || !q) return 0;
  if (nText === q) return 100;
  if (nText.indexOf(q) === 0) return 80;
  if (nText.indexOf(q) !== -1) return 60;
  return 0;
}
function oldScore(e, q, nowMs) {
  var s = 0;
  s = Math.max(s, oldTitleScore(e.nTitle, q));
  s = Math.max(s, oldTitleScore(e.nSlug, q));
  if (s === 0 && e.nField && e.nField.indexOf(q) !== -1) s = Math.max(s, 40);
  if (s === 0 && ((e.nProv && e.nProv.indexOf(q) !== -1) || (e.nCat && e.nCat.indexOf(q) !== -1))) s = Math.max(s, 30);
  if (s === 0 && e.nDesc && e.nDesc.indexOf(q) !== -1) s = Math.max(s, 20);
  if (s > 0 && e.dateMs && nowMs && (nowMs - e.dateMs) <= 15 * 86400000 && (nowMs - e.dateMs) >= 0) s = Math.min(100, s + 5);
  return s;
}
function oldSearch(index, qRaw) {
  var q = API.normalize(qRaw), nowMs = Date.now(), out = [];
  index.forEach(function (e) {
    var s = oldScore(e, q, nowMs);
    if (s > 0) { var c = Object.assign({}, e); c.score = s; out.push(c); }
  });
  out.sort(function (a, b) {
    if (b.score !== a.score) return b.score - a.score;
    if (b.dateMs !== a.dateMs) return b.dateMs - a.dateMs;
    return (a.title || '').localeCompare(b.title || '');
  });
  return out;
}
['livestream', 'thoi', 'trang', 'mau', 'pham', 'thoai', 'xuong', 'kiot', 'ao', 'quan'].forEach(function (q) {
  var nw = API.search(idx, q, {}).results.map(function (e) { return e.type + '|' + e.title + '|' + e.score; }).join('\n');
  var od = oldSearch(idx, q).map(function (e) { return e.type + '|' + e.title + '|' + e.score; }).join('\n');
  check('A2: truy van 1 token "' + q + '" giong het code cu (tong + thu tu + diem)', nw === od);
});

/* ---------- A3: hiệu năng ---------- */
['mẫu livestream thời trang', 'mẫu livestream', 'thời trang', 'Phạm Thoại'].forEach(function (q) {
  const r = API.search(idx, q, {});
  check('A3: elapsedMs < 50ms cho "' + q + '"', r.elapsedMs < 50, 'got ' + r.elapsedMs.toFixed(1) + ' ms');
});

/* ---------- A4: gợi ý theo token ---------- */
const s1 = API.suggest(idx, 'mẫu livestream thời trang', []);
check('A4: suggest("mẫu livestream thời trang") >= 1 goi y ten', s1.names.length >= 1, 'got ' + s1.names.length);

/* ---------- Hồi quy đơn vị: AND giữa token, OR giữa trường ---------- */
const smallIdx = API.buildIndex({
  models: [
    { id: 't-1', name: 'Lan Thời', title: 'Mẫu livestream', cat: 'Trang điểm', province: 'Hà Nội' },
    { id: 't-2', name: 'Minh Anh', title: 'Mẫu ảnh', cat: 'Thời trang', province: 'Hà Nội' },
    { id: 't-3', name: 'Thu Hà', title: 'Mẫu livestream', cat: 'Đồ gia dụng', province: 'Hà Nội' },
  ],
  shops: [], lots: [], factories: [], kiots: [], articles: [],
  classesLive: [], classesMakeup: [], eventsMarketing: [], logistics: [], rentals: [], agencyAds: [], movingServices: [], liveEquipment: [],
});
const ru = API.search(smallIdx, 'thời trang', {});
check('AND/OR: token o 2 truong khac nhau van khop (t-1: title "Thời" + cat "Trang điểm")',
  ru.results.some(function (e) { return e.id === 't-1'; }), 'ids: ' + ru.results.map(function (e) { return e.id; }).join(','));
check('AND: thieu 1 token thi khong khop (t-3 chi co "thoi", khong co "trang")',
  !ru.results.some(function (e) { return e.id === 't-3'; }));
check('AND: 1 token khop nhieu truong van chi tinh 1 lan (t-2 co diem > 0, khong vuot 100)',
  ru.results.some(function (e) { return e.id === 't-2' && e.score > 0 && e.score <= 100; }));

/* ---------- Câu chữ 0 kết quả + không tự cuộn ---------- */
const showEmpty = src.slice(src.indexOf('function showEmptyState'), src.indexOf('function runSearch'));
check('0 ket qua: co dong goi y "Thu bo bot 1 tu"', showEmpty.includes('Thử bỏ bớt 1 từ'));
check('0 ket qua: dong goi y chi hien khi truy van > 1 tu', /words\.length > 1/.test(showEmpty));
check('0 ket qua: 3 nut tu khoa hot (slice 0,3)', showEmpty.includes('slice(0, 3)'));
check('v213: search.js khong dung scrollIntoView', !src.includes('scrollIntoView'));

/* ---------- B1: 4 file redirect tĩnh ---------- */
const REDIRECTS = {
  'tai-khoan.html': 'trang-cua-toi.html',
  'dang-tin.html': 'danh-sach-mau.html#dang-tin',
  'dang-tin-tuyen-mau.html': 'danh-sach-mau.html#dang-tin',
  'lo-xa-kho.html': 'danh-sach-lo.html',
};
Object.keys(REDIRECTS).forEach(function (f) {
  const dest = REDIRECTS[f];
  const p = path.join(root, f);
  check('B1: ton tai ' + f, fs.existsSync(p));
  if (fs.existsSync(p)) {
    const html = fs.readFileSync(p, 'utf8');
    check('B1: ' + f + ' canonical -> ' + dest, html.includes('rel="canonical" href="https://vieclamlivestream.online/' + dest + '"'));
    check('B1: ' + f + ' meta refresh -> /' + dest, html.includes('http-equiv="refresh" content="0; url=/' + dest + '"'));
    check('B1: ' + f + ' location.replace -> /' + dest, html.includes("location.replace('/" + dest + "')"));
    check('B1: ' + f + ' co link cho trinh duyet tat JS', html.includes('<a href="/' + dest + '"'));
  }
});
const sitemap = fs.readFileSync(path.join(root, 'sitemap.xml'), 'utf8');
check('B1: sitemap khong them 4 file redirect',
  !/vieclamlivestream\.online\/(tai-khoan|dang-tin|dang-tin-tuyen-mau|lo-xa-kho)(\.html)?<\/loc>/.test(sitemap));

/* ---------- B2: không hồi quy (đích redirect tồn tại, 404.html không đổi) ---------- */
['trang-cua-toi.html', 'danh-sach-mau.html', 'danh-sach-lo.html'].forEach(function (f) {
  check('B2: trang dich ton tai: ' + f, fs.existsSync(path.join(root, f)));
});
const mauHtml = fs.readFileSync(path.join(root, 'danh-sach-mau.html'), 'utf8');
check('B2: danh-sach-mau.html co muc #dang-tin that', mauHtml.includes('id="dang-tin"'));

console.log(`\n${pass} PASS, ${fail} FAIL`);
process.exit(fail ? 1 : 0);
