// test-claim-v2.mjs — Claim V2 frontend (21/11/2026, thiết kế ĐÃ DUYỆT 13:49):
// Matching chấm điểm ứng viên + bằng chứng + trạng thái disputed/revoked +
// huy hiệu mức xác minh L0–L3 + tab duyệt claim (graceful khi RPC/bảng chưa có).
// Chạy: node tests/test-claim-v2.mjs (từ gốc repo). Dữ liệu: data.js origin/main thật.
// Kỳ vọng lấy từ dữ liệu thật lúc viết test (C1: SĐT 0969151680 -> th-03 Kiều Nguyễn).
// Hồi quy V1: phoneKey/maskPhone/findMatches/claimStatusHTML giữ nguyên hành vi.
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let pass = 0, fail = 0;
function check(name, ok, extra) {
  if (ok) { pass++; console.log('PASS ' + name); }
  else { fail++; console.log('FAIL ' + name + (extra !== undefined ? ' — ' + extra : '')); }
}

const require = createRequire(import.meta.url);
const Claim = require(path.join(root, 'js/claim.js'));
const sb = { window: {}, console };
vm.createContext(sb);
vm.runInContext(fs.readFileSync(path.join(root, 'js/data.js'), 'utf8'), sb);
const data = sb.window.V20_DATA;
// Đưa data.js vào global window để findCandidates/scoreCandidate dùng (như trình duyệt).
global.window = sb.window;

/* ---------- Hồi quy V1 ---------- */
check('V1 phoneKey: +84 969 151 680 -> 969151680', Claim.phoneKey('+84 969 151 680') === '969151680');
check('V1 phoneKey: 0969151680 -> 969151680', Claim.phoneKey('0969151680') === '969151680');
check('V1 phoneKey: 969151680 -> 969151680', Claim.phoneKey('969151680') === '969151680');
check('V1 phoneKey: số ngắn -> rỗng', Claim.phoneKey('12345') === '');
check('V1 maskPhone: 0969151680 -> ••••••680', Claim.maskPhone('0969151680') === '••••••680');
check('V1 normName: gộp khoảng trắng + thường hoá', Claim.normName('  Kiều   Nguyễn ') === 'kiều nguyễn');
check('V1 normEmail: trim + thường hoá', Claim.normEmail('  Test@Example.COM ') === 'test@example.com');
check('V1 findMatches: SĐT 0969151680 -> th-03 phoneMatches', (function () {
  const m = Claim.findMatches('0969151680', '', '');
  return m.phoneMatches.some(function (p) { return p.id === 'th-03'; });
})());
check('V1 findMatches: tên Kiều Nguyễn không SĐT -> chỉ nameMatches, 0 phoneMatches', (function () {
  const m = Claim.findMatches('', '', 'Kiều Nguyễn');
  return m.phoneMatches.length === 0 && m.nameMatches.some(function (p) { return p.id === 'th-03'; });
})());
check('V1 claimStatusHTML: V2 export hàm này để dùng chung (pending/approved/rejected giữ nguyên)', (function () {
  if (typeof Claim.claimStatusHTML !== 'function') return false;
  const p = Claim.claimStatusHTML({ status: 'pending' }, { name: 'Kiều Nguyễn' });
  const a = Claim.claimStatusHTML({ status: 'approved' }, { name: 'Kiều Nguyễn' });
  const r = Claim.claimStatusHTML({ status: 'rejected' }, { name: 'Kiều Nguyễn' });
  return p.indexOf('đang chờ admin duyệt') !== -1 && a.indexOf('đã được gán') !== -1 && r.indexOf('bị từ chối') !== -1;
})());

/* ---------- V2: chấm điểm ứng viên ---------- */
const th03 = (data.models || []).find(function (m) { return m.id === 'th-03'; });
check('C1 tiền đề: th-03 tồn tại, tên Kiều Nguyễn', !!th03 && th03.name === 'Kiều Nguyễn');
check('V2 scoreCandidate: SĐT khớp = 50 + lý do Trùng SĐT', (function () {
  const s = Claim.scoreCandidate(th03, { phone: '0969151680', email: '', name: '' });
  return s.score === 50 && s.reasons.indexOf('Trùng SĐT') !== -1;
})());
check('V2 scoreCandidate: SĐT + tên = 70', (function () {
  const s = Claim.scoreCandidate(th03, { phone: '0969151680', email: '', name: 'Kiều Nguyễn' });
  return s.score === 70;
})());
check('V2 scoreCandidate: SĐT + tên + tỉnh + lĩnh vực = 90', (function () {
  const s = Claim.scoreCandidate(th03, { phone: '0969151680', email: '', name: 'Kiều Nguyễn', province: 'TP. Hồ Chí Minh', category: 'Chung / Đa ngành' });
  return s.score === 90 && s.reasons.indexOf('Cùng tỉnh') !== -1 && s.reasons.indexOf('Cùng lĩnh vực') !== -1;
})());
check('V2 scoreCandidate: trần 100 (SĐT+tên+tỉnh+lĩnh vực+URL nguồn)', (function () {
  const s = Claim.scoreCandidate(th03, { phone: '0969151680', email: '', name: 'Kiều Nguyễn', province: 'TP. Hồ Chí Minh', category: 'Chung / Đa ngành', sourceUrl: 'https://facebook.com/groups/1490259981922483/permalink/2119153999033075/' });
  return s.score === 100;
})());
check('V2 scoreCandidate: email khớp = 40', (function () {
  const fake = { id: 'x-01', name: 'Test', contacts: [{ provider: 'email', value: 'Test@Example.com' }] };
  const s = Claim.scoreCandidate(fake, { phone: '', email: 'test@example.com', name: '' });
  return s.score === 40 && s.reasons.indexOf('Trùng email') !== -1;
})());
check('V2 scoreCandidate: chỉ tỉnh + lĩnh vực (không tên/SĐT/email) = 0 ứng viên (không đủ căn cước)', (function () {
  const s = Claim.scoreCandidate(th03, { phone: '', email: '', name: '', province: 'TP. Hồ Chí Minh', category: 'Chung / Đa ngành' });
  return s.score === 0 && s.reasons.length === 0;
})());
check('V2 scoreCandidate: không khớp gì = 0', (function () {
  const s = Claim.scoreCandidate(th03, { phone: '0900000000', email: 'khac@x.com', name: 'Người Lạ' });
  return s.score === 0;
})());

/* ---------- V2: C1 — findCandidates ---------- */
check('C1: SĐT 0969151680 -> th-03 trong top-5, canClaim=true, lý do Trùng SĐT', (function () {
  const r = Claim.findCandidates({ phone: '0969151680', email: '', name: '' });
  const hit = r.candidates.find(function (c) { return c.id === 'th-03'; });
  return !!hit && hit.canClaim === true && hit.reasons.indexOf('Trùng SĐT') !== -1 && r.candidates.length <= 5;
})());
check('C1: tên Kiều Nguyễn không SĐT -> th-03 chỉ ở nameOnly, canClaim=false, không nút nhận', (function () {
  const r = Claim.findCandidates({ phone: '', email: '', name: 'Kiều Nguyễn' });
  const inCand = r.candidates.find(function (c) { return c.id === 'th-03'; });
  const inNameOnly = r.nameOnly.some(function (c) { return c.id === 'th-03'; });
  return inNameOnly === true && (!inCand || inCand.canClaim === false);
})());
check('V2 findCandidates: tối đa 5 ứng viên, sắp xếp điểm giảm dần', (function () {
  const r = Claim.findCandidates({ phone: '', email: '', name: 'Nguyễn' });
  // 'Nguyễn' không phải tên khớp chính xác -> không ứng viên nào từ tên; kiểm tính chất sắp xếp trên 1 truy vấn rộng:
  const r2 = Claim.findCandidates({ phone: '0969151680', email: '', name: 'Kiều Nguyễn', province: 'TP. Hồ Chí Minh' });
  let sorted = true;
  for (let i = 1; i < r2.candidates.length; i++) {
    if (r2.candidates[i].score > r2.candidates[i - 1].score) sorted = false;
  }
  return r.candidates.length <= 5 && sorted;
})());
check('V2 findCandidates: không có data.js -> dataLoaded=false, không crash', (function () {
  const saved = global.window.V20_DATA;
  delete global.window.V20_DATA;
  let out;
  try { out = Claim.findCandidates({ phone: '0969151680', email: '', name: '' }); } catch (e) { out = null; }
  global.window.V20_DATA = saved;
  return out && out.dataLoaded === false && out.candidates.length === 0;
})());

/* ---------- V2: T1 — hai người trùng tên, không tự gộp ---------- */
check('T1: trùng tên không trùng liên hệ -> không ai được cấp quyền (canClaim=false cả hai)', (function () {
  const rA = Claim.findCandidates({ phone: '0901111111', email: '', name: 'Kiều Nguyễn' });
  const rB = Claim.findCandidates({ phone: '0902222222', email: '', name: 'Kiều Nguyễn' });
  const a = rA.candidates.find(function (c) { return c.id === 'th-03'; });
  const b = rB.candidates.find(function (c) { return c.id === 'th-03'; });
  const aClaim = !a || a.canClaim === false;
  const bClaim = !b || b.canClaim === false;
  return aClaim && bClaim;
})());

/* ---------- V2: T2 — hai tài khoản cùng SĐT, không tự cấp ---------- */
check('T2: matching chỉ xếp hạng, không có hàm nào tự cấp quyền', (function () {
  return typeof Claim.grantOwnership !== 'function' && typeof Claim.autoAssign !== 'function';
})());

/* ---------- V2: bằng chứng ---------- */
check('V2 validateEvidence: 3 loại user hợp lệ', (function () {
  return Claim.validateEvidence('source_account_link', 'https://facebook.com/abc').ok === true
    && Claim.validateEvidence('source_code_post', 'V2S-123456').ok === true
    && Claim.validateEvidence('manual_review', 'Tôi là chủ shop, liên hệ admin đối chiếu').ok === true;
})());
check('V2 validateEvidence: business_doc bị từ chối với user (chỉ admin)', (function () {
  const r = Claim.validateEvidence('business_doc', 'Giấy phép kinh doanh');
  return r.ok === false;
})());
check('V2 validateEvidence: loại lạ bị từ chối', Claim.validateEvidence('cccd', '123').ok === false);
check('V2 validateEvidence: detail rỗng bị từ chối', Claim.validateEvidence('source_account_link', '   ').ok === false);
check('V2 validateEvidence: source_account_link phải là URL', Claim.validateEvidence('source_account_link', 'không phải url').ok === false);
check('V2 validateEvidence: detail quá dài bị từ chối', Claim.validateEvidence('manual_review', 'x'.repeat(501)).ok === false);

/* ---------- V2: submitEvidence / RPC graceful khi bảng chưa có (async) ---------- */
const asyncChecks = [];
asyncChecks.push((async function () {
  const r = await Claim.submitEvidence(null, 'claim-1', 'source_account_link', 'https://facebook.com/abc');
  check('V2 submitEvidence async: không có API -> supported=false', r && r.supported === false);
  const bad = await Claim.submitEvidence(null, 'claim-1', 'business_doc', 'x');
  check('V2 submitEvidence async: evidence không hợp lệ -> ok=false', bad && bad.ok === false);
  const pend = await Claim.loadPendingClaims(null);
  check('V2 loadPendingClaims: không có RPC -> supported=false, không crash', pend && pend.supported === false);
  const rev = await Claim.reviewClaim(null, 'claim-1', 'approve');
  check('V2 reviewClaim: không có RPC -> supported=false', rev && rev.supported === false);
  const lnk = await Claim.linkProfile(null, 'claim-1');
  check('V2 linkProfile: không có RPC -> supported=false', lnk && lnk.supported === false);
  const dsp = await Claim.openDispute(null, 'th-03', 'model', 'Tôi là chủ thật');
  check('V2 openDispute: không có RPC -> supported=false', dsp && dsp.supported === false);
  const rvk = await Claim.revokeClaim(null, 'claim-1', 'Giả mạo');
  check('V2 revokeClaim: không có RPC -> supported=false', rvk && rvk.supported === false);
})());

/* ---------- V2: T4 — hai yêu cầu cùng hồ sơ ---------- */
check('T4: yêu cầu thứ hai khi đã có pending -> disputed (không tự từ chối, không mất)', (function () {
  return Claim.resolveSecondClaim('pending') === 'disputed' && Claim.resolveSecondClaim('approved') === 'disputed';
})());
check('T4: yêu cầu thứ hai khi yêu cầu đầu đã rejected -> được pending lại', Claim.resolveSecondClaim('rejected') === 'pending');

/* ---------- V2: T5 — luồng xóa ---------- */
check('T5: chỉ chủ đã duyệt mới được yêu cầu xóa', (function () {
  return Claim.canRequestDelete({ status: 'approved' }) === true
    && Claim.canRequestDelete({ status: 'pending' }) === false
    && Claim.canRequestDelete(null) === false;
})());
check('T5: audit actions xóa đúng tên', (function () {
  return Claim.DELETE_ACTIONS && Claim.DELETE_ACTIONS.indexOf('delete_requested') !== -1
    && Claim.DELETE_ACTIONS.indexOf('delete_done') !== -1;
})());

/* ---------- V2: mức xác minh L0–L3 ---------- */
check('V2 verificationLevel: không claim -> L0', Claim.verificationLevel({ claims: [] }) === 'L0');
check('V2 verificationLevel: có claim approved -> L1 (qua đối chiếu admin)', (function () {
  return Claim.verificationLevel({ claims: [{ profile_id: 'th-03', status: 'approved' }] }) === 'L1';
})());
check('V2 verificationLevel: approved + đã gán -> L2', (function () {
  return Claim.verificationLevel({ claims: [{ profile_id: 'th-03', status: 'approved' }], linkedProfileIds: ['th-03'] }) === 'L2';
})());
check('V2 verificationLevel: shop approved + business_doc đã xác minh -> L3', (function () {
  return Claim.verificationLevel({ claims: [{ profile_id: 'sh-01', profile_kind: 'shop', status: 'approved' }], linkedProfileIds: ['sh-01'], evidence: [{ kind: 'business_doc', verified: true }] }) === 'L3';
})());
check('V2 verificationLevel: business_doc chưa xác minh -> không lên L3', (function () {
  return Claim.verificationLevel({ claims: [{ profile_id: 'sh-01', profile_kind: 'shop', status: 'approved' }], linkedProfileIds: ['sh-01'], evidence: [{ kind: 'business_doc', verified: false }] }) === 'L2';
})());
check('V2 verificationBadgeHTML: L0 không huy hiệu, L1/L2/L3 có huy hiệu + ghi rõ cách xác minh', (function () {
  const b0 = Claim.verificationBadgeHTML('L0');
  const b1 = Claim.verificationBadgeHTML('L1');
  const b2 = Claim.verificationBadgeHTML('L2');
  return b0 === '' && b1.indexOf('L1') !== -1 && b1.indexOf('đối chiếu admin') !== -1 && b2.indexOf('L2') !== -1;
})());

/* ---------- V2: trạng thái claim mở rộng ---------- */
check('V2 claimStatusHTML: disputed + revoked có nội dung, không rỗng', (function () {
  const d = Claim.claimStatusHTML({ status: 'disputed' }, { name: 'Kiều Nguyễn' });
  const r = Claim.claimStatusHTML({ status: 'revoked' }, { name: 'Kiều Nguyễn' });
  return d.indexOf('tranh chấp') !== -1 && r.indexOf('thu hồi') !== -1;
})());
check('V2 TABLE_NOT_READY_MSG: vẫn giữ thông báo khi bảng chưa có', typeof Claim.TABLE_NOT_READY_MSG === 'string' && Claim.TABLE_NOT_READY_MSG.indexOf('Zalo') !== -1);

/* ---------- V2: tab duyệt claim trong console admin (kiểm tĩnh) ---------- */
const adminSrc = fs.readFileSync(path.join(root, 'js/admin.js'), 'utf8');
const qtHtml = fs.readFileSync(path.join(root, 'quan-tri.html'), 'utf8');
const css = fs.readFileSync(path.join(root, 'v20.css'), 'utf8');
check('V2 admin: TABS có mục Duyệt nhận sở hữu', adminSrc.indexOf("claim: { label: 'Duyệt nhận sở hữu'") !== -1);
check('V2 admin: có hàm loadClaimReview', adminSrc.indexOf('function loadClaimReview') !== -1);
check('V2 admin: có 3 hành động approve-claim / reject-claim / dispute-claim', adminSrc.indexOf('approve-claim') !== -1 && adminSrc.indexOf('reject-claim') !== -1 && adminSrc.indexOf('dispute-claim') !== -1);
check('V2 admin: Duyệt dùng xác nhận 2 bước data-armed, không gọi window.confirm(', (function () {
  const i = adminSrc.indexOf("act === 'approve-claim'");
  if (i === -1) return false;
  const branch = adminSrc.slice(i, i + 2600); // toàn bộ nhánh approve/reject/dispute-claim
  return branch.indexOf('data-armed') !== -1 && branch.indexOf('window.confirm(') === -1 && branch.indexOf('window.prompt(') === -1;
})());
check('V2 admin: tab báo chờ migration khi RPC chưa có (không hiện dữ liệu giả)', adminSrc.indexOf('migration Claim V2') !== -1 && adminSrc.indexOf('get_pending_claims') !== -1);
check('V2 admin: quan-tri.html có panel admTab-claim + admClaimList', qtHtml.indexOf('id="admTab-claim"') !== -1 && qtHtml.indexOf('id="admClaimList"') !== -1);
check('V2 CSS: có .claim-reasons + .verify-badge + .claim-evidence-kind', css.indexOf('.claim-reasons') !== -1 && css.indexOf('.verify-badge') !== -1 && css.indexOf('.claim-evidence-kind') !== -1);
check('V2: không dùng window.confirm/window.prompt trong js/claim.js', (function () {
  const src = fs.readFileSync(path.join(root, 'js/claim.js'), 'utf8');
  return src.indexOf('window.confirm') === -1 && src.indexOf('window.prompt') === -1;
})());
check('V2: không dùng scrollIntoView trong js/claim.js (luật v213)', (function () {
  const src = fs.readFileSync(path.join(root, 'js/claim.js'), 'utf8');
  return src.indexOf('scrollIntoView') === -1;
})());
check('V2: không có hàm tự cấp quyền trong js/claim.js', (function () {
  const src = fs.readFileSync(path.join(root, 'js/claim.js'), 'utf8');
  return src.indexOf('grantOwnership') === -1 && src.indexOf('autoAssign') === -1;
})());

await Promise.all(asyncChecks);
console.log('\n' + pass + ' PASS, ' + fail + ' FAIL');
if (fail) process.exit(1);
