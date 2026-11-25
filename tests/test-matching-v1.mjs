// test-matching-v1.mjs — FWA Matching & Personalization V1 (25/11/2026, Issue #58, lane Claude).
// Chạy: node tests/test-matching-v1.mjs (từ gốc repo). Không mạng, không DB, không ghi file.
// Bao phủ: parser lương/ca/lĩnh vực/nền tảng/địa bàn, chấm điểm giải thích được,
// dữ liệu trống, guest limit, whitelist đầu ra (không lộ liên hệ), chống dùng thuộc tính
// nhạy cảm, không có hàm ghi/cấp quyền, chạy trên toàn bộ data.js thật.
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const M = require(path.join(root, 'js/matching.js'));

let pass = 0, fail = 0;
function check(name, ok, extra) {
  if (ok) { pass++; console.log('PASS ' + name); }
  else { fail++; console.log('FAIL ' + name + (extra !== undefined ? ' — ' + JSON.stringify(extra) : '')); }
}
const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);

/* ---------- Parser lương (mẫu lấy nguyên văn từ data.js) ---------- */
const S = M.parseSalary;
check('salary 80-100k/h', eq(S('80-100k/h'), { unit: 'hour', min: 80000, max: 100000 }), S('80-100k/h'));
check('salary 50.000 – 120.000 VNĐ/giờ', eq(S('50.000 – 120.000 VNĐ/giờ'), { unit: 'hour', min: 50000, max: 120000 }), S('50.000 – 120.000 VNĐ/giờ'));
check('salary 150-170/h (bỏ hậu tố k)', eq(S('150-170/h (có ăn lãi doanh thu)'), { unit: 'hour', min: 150000, max: 170000 }), S('150-170/h (có ăn lãi doanh thu)'));
check('salary 8–18 triệu/tháng + hoa hồng', eq(S('8–18 triệu/tháng + hoa hồng'), { unit: 'month', min: 8000000, max: 18000000 }), S('8–18 triệu/tháng + hoa hồng'));
check('salary 7,5 triệu/tháng', eq(S('7,5 triệu/tháng + 2% hoa hồng (thu nhập 12–20 triệu/tháng)'), { unit: 'month', min: 7500000, max: 7500000 }));
check('salary 70.000đ - 100.000đ / giờ (8tr..)', eq(S('70.000đ - 100.000đ / giờ (8.000.000đ - 15.000.000đ/tháng)'), { unit: 'hour', min: 70000, max: 100000 }), S('70.000đ - 100.000đ / giờ (8.000.000đ - 15.000.000đ/tháng)'));
check('salary 20.000.000 – 50.000.000 VNĐ không đơn vị -> tháng', eq(S('20.000.000 – 50.000.000 VNĐ (Lương cơ bản 13 triệu + % Hoa hồng)'), { unit: 'month', min: 20000000, max: 50000000 }));
check('salary Từ 250.000 đồng/giờ', eq(S('Từ 250.000 đồng/giờ'), { unit: 'hour', min: 250000, max: 250000 }));
check('salary số 120000 (salaryNum)', eq(S(120000), { unit: 'hour', min: 120000, max: 120000 }));
check('salary Thỏa thuận -> null', S('Thỏa thuận') === null);
check('salary Chưa cập nhật -> null', S('Chưa cập nhật') === null);
check('salary theo ca -> null', S('200.000–500.000đ/ca') === null);
check('salary rỗng/undefined -> null', S('') === null && S(undefined) === null && S(null) === null);

/* ---------- Parser khác ---------- */
check('shifts fulltime -> 3 ca', eq(M.parseShifts(['fulltime']).shifts, ['sang', 'chieu', 'toi']));
check('shifts Ca linh hoạt -> flexible', M.parseShifts(['Ca linh hoạt']).flexible === true);
check('shifts Chưa cập nhật -> rỗng', M.parseShifts(['Chưa cập nhật'], 'Chưa cập nhật').shifts.length === 0);
check('category thời trang nam', eq(M.parseCategories('Thời trang nam (sơ mi, T-shirt, Polo)'), ['thoi-trang']));
check('category mỹ phẩm', M.parseCategories('live, ưu tiên mỹ phẩm').includes('my-pham'));
check('province TP. Hồ Chí Minh == Hồ Chí Minh', M.normProvince('TP. Hồ Chí Minh') === M.normProvince('Hồ Chí Minh'));
check('province Toàn quốc / Live online -> *', M.normProvince('Toàn quốc / Live online') === '*');
check('platform: channels TopCV/Threads không phải nền tảng', M.profileFromJob({ id: 'x', channels: 'TopCV' }).platforms.length === 0);
check('platform: channels "www.facebook.com" (nguồn) không tính', M.profileFromJob({ id: 'x', channels: 'www.facebook.com' }).platforms.length === 0);
check('platform: channels TikTok, Shopee', eq(M.profileFromJob({ id: 'x', channels: 'TikTok, Shopee' }).platforms, ['tiktok', 'shopee']));

/* ---------- Chấm điểm giải thích được ---------- */
const seeker = M.preferencesFromInput({ categories: ['thoi-trang'], province: 'TP. Hồ Chí Minh', shifts: ['toi'], platforms: ['TikTok'], salaryMin: 100000, salaryUnit: 'hour' });
const jobFull = { id: 'j1', product: 'Thời trang nữ', province: 'TP. Hồ Chí Minh', shifts: ['chieu', 'toi'], channels: 'TikTok', salary: '80-120k/h', date: '2026-11-20' };
const r1 = M.scorePair(seeker, M.profileFromJob(jobFull));
check('full match = 100', r1.score === 100, r1);
check('reasons đủ 5 yếu tố, có label + detail', r1.reasons.length === 5 && r1.reasons.every(x => x.label && x.detail && x.weight > 0));
check('tổng trọng số = 100', Object.values(M.WEIGHTS).reduce((a, b) => a + b, 0) === 100);
const jobOther = { id: 'j2', product: 'Mỹ phẩm', province: 'Hà Nội', shifts: ['sang'], channels: 'Shopee', salary: '50k/h' };
const r2 = M.scorePair(seeker, M.profileFromJob(jobOther));
check('full mismatch = 0, mọi yếu tố mismatch', r2.score === 0 && r2.reasons.every(x => x.status === 'mismatch'), r2);
const r3 = M.scorePair(seeker, M.profileFromJob({ id: 'j3', product: 'Thời trang', province: 'Toàn quốc', salary: '90k/h' }));
check('online toàn quốc khớp địa bàn; lương 90k vs 100k = partial', r3.reasons.find(x => x.factor === 'province').status === 'match' && r3.reasons.find(x => x.factor === 'salary').status === 'partial', r3);
check('thiếu ca/nền tảng -> unknown, 0 điểm, không phạt', r3.reasons.filter(x => x.status === 'unknown').map(x => x.factor).join() === 'shift,platform' && r3.score === 30 + 25 + 8);
const gen = M.preferencesFromInput({ categories: ['Chung / Đa ngành'] });
check('ứng viên đa ngành = partial lĩnh vực', M.scorePair(gen, M.profileFromJob(jobOther)).reasons[0].status === 'partial');
check('khác đơn vị lương (giờ vs tháng) -> unknown', M.scorePair(seeker, M.profileFromJob({ id: 'j', salary: '9–12 triệu/tháng' })).reasons.find(x => x.factor === 'salary').status === 'unknown');

/* ---------- Dữ liệu trống / rác ---------- */
let threw = false;
try {
  check('prefs rỗng -> recommendJobs trả [] (minScore 1)', M.recommendJobs(M.preferencesFromInput({}), [jobFull]).items.length === 0);
  check('jobs null -> []', M.recommendJobs(seeker, null).items.length === 0);
  check('item rác bị bỏ qua', M.recommendJobs(seeker, [null, 1, 'x', {}, jobFull]).items.length === 1);
  check('preferencesFromInput(undefined) không lỗi', eq(M.preferencesFromInput(undefined).categories, []));
  check('scorePair(undefined, undefined) = 0', M.scorePair(undefined, undefined).score === 0);
  check('salaryMin không phải số -> bỏ qua', M.preferencesFromInput({ salaryMin: 'abc' }).salary === null);
} catch (e) { threw = true; console.log(e); }
check('không ném lỗi với dữ liệu trống', !threw);

/* ---------- Phân quyền viewer ---------- */
const many = Array.from({ length: 20 }, (_, i) => ({ ...jobFull, id: 'jj' + String(i).padStart(2, '0') }));
const g = M.recommendJobs(seeker, many, { limit: 20 });
check('không truyền viewer -> guest, gated', g.viewerRole === 'guest' && g.gated === true);
check('guest tối đa GUEST_LIMIT', g.items.length === M.GUEST_LIMIT, g.items.length);
check('vai trò lạ ("admin") -> guest', M.recommendJobs(seeker, many, { viewer: { role: 'admin' } }).viewerRole === 'guest');
const mem = M.recommendJobs(seeker, many, { limit: 20, viewer: { role: 'member' } });
check('member nhận đủ limit', mem.items.length === 20 && mem.gated === false);
check('limit trần MAX 50', M.recommendJobs(seeker, Array.from({ length: 80 }, (_, i) => ({ ...jobFull, id: 'k' + i })), { limit: 1000, viewer: { role: 'member' } }).items.length === 50);
check('xếp hạng ổn định (tie-break theo date desc rồi id)', eq(mem.items.map(x => x.card.id), many.map(x => x.id)));

/* ---------- Không lộ liên hệ / trường nhạy cảm, mọi vai trò ---------- */
const leakyJob = { ...jobFull, id: 'leak-j', phone: '0901234567', email: 'shop@example.com', zalo: '0901234567', src: 'https://facebook.com/x', contact: 'x' };
const leakyCand = { id: 'leak-c', name: 'A', title: 'live bán hàng thời trang', cat: 'Thời trang', province: 'TP. Hồ Chí Minh', shifts: ['toi'], phone: '0907654321', email: 'a@example.com', src: 'https://fb.com/a', gender: 'Nữ', height: '165cm', photoUrl: 'images/a.jpg', rating: '5', views: 99 };
const bad = /0901234567|0907654321|example\.com|facebook\.com|fb\.com|"gender"|"height"|"photoUrl"|"rating"|"views"|"src"|"phone"|"email"|"zalo"|"contact"/;
for (const role of M.ROLES) {
  const a = JSON.stringify(M.recommendJobs(seeker, [leakyJob], { viewer: { role } }));
  const b = JSON.stringify(M.recommendCandidates(jobFull, [leakyCand], { viewer: { role } }));
  const c = JSON.stringify(M.recommendPeers(seeker, [leakyCand], { viewer: { role } }));
  check('không lộ contact/nhạy cảm — role ' + role, !bad.test(a) && !bad.test(b) && !bad.test(c), (a + b + c).match(bad));
}
check('PUBLIC_FIELDS không chứa trường nhạy cảm', Object.values(M.PUBLIC_FIELDS).flat().every(f => !M.SENSITIVE_FIELDS.includes(f)));

/* ---------- Chống dùng thuộc tính nhạy cảm ---------- */
const base = { id: 'c1', title: 'live bán hàng thời trang', cat: 'Thời trang', province: 'Hà Nội', shifts: ['toi'], salary: 'Từ 100k/giờ' };
const sA = M.scorePair(M.profileFromCandidate({ ...base, gender: 'Nữ', height: '170cm', photoHas: true, rating: '5 sao', views: 1000, age: 22 }), M.profileFromJob(jobFull));
const sB = M.scorePair(M.profileFromCandidate({ ...base, gender: 'Nam', height: '150cm', photoHas: false, rating: 'Chưa có', views: 0, age: 45 }), M.profileFromJob(jobFull));
check('giới tính/chiều cao/tuổi/ảnh/rating/views không đổi điểm', eq(sA, sB), [sA.score, sB.score]);
const jA = M.scorePair(seeker, M.profileFromJob({ ...jobFull, req: 'Tuyển nữ, cao từ 1m60, dưới 25 tuổi, ngoại hình ưa nhìn' }));
const jB = M.scorePair(seeker, M.profileFromJob({ ...jobFull, req: 'Tuyển nam, không yêu cầu ngoại hình' }));
check('yêu cầu giới tính/ngoại hình/tuổi trong tin bị bỏ qua', eq(jA, jB));
check('reasons không nhắc thuộc tính nhạy cảm', !/giới tính|gioi tinh|chiều cao|tuổi|ngoại hình|nam|nữ/i.test(JSON.stringify(jA.reasons).replace(/Nam\b/g, '')));

/* ---------- Không có hàm ghi / claim / cấp quyền ---------- */
const fnNames = Object.keys(M).filter(k => typeof M[k] === 'function');
check('không export hàm ghi/duyệt/claim/grant', !fnNames.some(n => /save|write|set|grant|approve|claim|assign|delete|update|post|insert/i.test(n)), fnNames);
const src = fs.readFileSync(path.join(root, 'js/matching.js'), 'utf8');
check('module không gọi mạng/DB/storage', !/fetch\(|XMLHttpRequest|supabase|localStorage|sessionStorage|indexedDB|\.rpc\(/.test(src.replace(/\/\*[\s\S]*?\*\//g, '')));
const before = JSON.stringify(leakyCand);
M.recommendCandidates(jobFull, [leakyCand], { viewer: { role: 'owner' } });
check('không mutate dữ liệu đầu vào', JSON.stringify(leakyCand) === before);

/* ---------- Chạy trên data.js thật ---------- */
const sb = { window: {}, console };
vm.createContext(sb);
vm.runInContext(fs.readFileSync(path.join(root, 'js/data.js'), 'utf8'), sb);
const D = sb.window.V20_DATA;
check('data.js có models + shops', D && D.models.length > 100 && D.shops.length > 100, [D && D.models.length, D && D.shops.length]);
let crash = null, nonEmpty = 0, maxMs = 0;
try {
  for (const c of D.models) {
    const t0 = Date.now();
    const r = M.recommendJobs(M.profileFromCandidate(c), D.shops, { viewer: { role: 'member' } });
    maxMs = Math.max(maxMs, Date.now() - t0);
    if (r.items.length) nonEmpty++;
    for (const it of r.items) if (it.score < 0 || it.score > 100) throw new Error('score ngoài 0..100 ' + c.id);
  }
  for (const s of D.shops) M.recommendCandidates(s, D.models, { viewer: { role: 'human_admin' } });
} catch (e) { crash = e.message; }
check('toàn bộ models×shops không lỗi, điểm trong 0..100', crash === null, crash);
check('≥50% hồ sơ thật có ít nhất 1 gợi ý việc', nonEmpty / D.models.length >= 0.5, nonEmpty + '/' + D.models.length);
check('1 lượt gợi ý (~313 tin) < 200ms', maxMs < 200, maxMs);
const parsedSal = D.shops.filter(s => !/thỏa thuận|chưa|competitive|không lương|lương cứng \+/i.test(s.salary || '') && s.salary).map(s => [s.salary, M.parseSalary(s.salary)]);
const unparsed = parsedSal.filter(x => !x[1]).map(x => x[0]);
check('parse được ≥80% chuỗi lương có số trong shops thật', (parsedSal.length - unparsed.length) / Math.max(1, parsedSal.length) >= 0.8, unparsed.slice(0, 10));
const realLeak = JSON.stringify(M.recommendCandidates(D.shops[0], D.models, { limit: 50, viewer: { role: 'owner' } }));
check('dữ liệu thật: không xuất src/photoUrl/gender/height', !/"src"|"photoUrl"|"gender"|"height"|https?:\/\//.test(realLeak));

console.log(`\n${pass} PASS / ${fail} FAIL`);
process.exit(fail ? 1 : 0);
