// test-v281-wallet-earn-history.mjs — P3-6 vong 3 (24/11/2026): trang Vi
// diem (vi.html) chi co lich su CHUYEN xu, KHONG co lich su CONG xu (dang
// ky +10, thich +1, binh luan +1) — nguoi dung khong thay xu minh kiem
// duoc o dau. Goc: initTransferForm (js/app.js) chi doc getMyTransferHistory;
// so cai points_ledger (getMyPointsHistory) chi duoc doc o vi-tien-ao.html
// (v91 BUG-05). Fix: them muc "Lich su cong xu" (#pointsHistory) vao
// vi.html + doc getMyPointsHistory(20) trong refreshTransfer, render cung
// mau vi-tien-ao.html.
// Chay: node tests/test-v281-wallet-earn-history.mjs (tu goc repo).
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let pass = 0, fail = 0;
function check(name, ok, extra) {
  if (ok) { pass++; console.log('PASS ' + name); }
  else { fail++; console.log('FAIL ' + name + (extra !== undefined ? ' — ' + extra : '')); }
}

const vi = fs.readFileSync(path.join(root, 'vi.html'), 'utf8');
const appSrc = fs.readFileSync(path.join(root, 'js/app.js'), 'utf8');

check('vi.html co muc Lich su cong xu (#pointsHistory)',
  vi.indexOf('<h3>Lịch sử cộng xu</h3>') !== -1 && vi.indexOf('id="pointsHistory"') !== -1);
check('muc cong xu dung TRUOC muc chuyen xu',
  vi.indexOf('id="pointsHistory"') !== -1 && vi.indexOf('id="pointsHistory"') < vi.indexOf('id="transferHistory"'));
check('initTransferForm doc getMyPointsHistory',
  appSrc.indexOf('R.getMyPointsHistory(20)') !== -1);
check('initTransferForm render vao #pointsHistory',
  appSrc.indexOf("document.getElementById('pointsHistory')") !== -1);
check('khach chua dang nhap thay dong moi xem lich su cong xu',
  appSrc.indexOf('Cần đăng nhập để xem lịch sử cộng xu.') !== -1);

// ---- Hanh vi: chay initTransferForm trong vm ----
const start = appSrc.indexOf('function initTransferForm(){');
const end = appSrc.indexOf('function newsDropdownRoot', start);
check('trich duoc initTransferForm tu js/app.js', start !== -1 && end !== -1);
const slice = appSrc.slice(start, end);

function makeEl(tag) {
  const el = {
    tagName: (tag || 'div').toUpperCase(), textContent: '', innerHTML: '',
    disabled: false, value: '', _attrs: {}, _listeners: {},
    setAttribute(k, v) { el._attrs[k] = String(v); },
    getAttribute(k) { return el._attrs[k]; },
    addEventListener(ev, fn) { el._listeners[ev] = fn; },
    reset() {}
  };
  return el;
}
const els = {};
['transferForm', 'transferStreak', 'transferMsg', 'transferHistory', 'pointsHistory', 'transferSubmit', 'transferEmail', 'transferAmount', 'transferNote', 'transferBalance'].forEach(id => { els[id] = makeEl('div'); });
const LEDGER = [
  { delta: 10, balance_after: 10, type: 'register', reason: 'Đăng ký tài khoản', created_at: '2026-11-24T05:00:00Z' },
  { delta: 1, balance_after: 11, type: 'like', reason: 'Thích bài viết', created_at: '2026-11-24T05:10:00Z' },
  { delta: 1, balance_after: 12, type: 'comment', reason: 'Bình luận', created_at: '2026-11-24T05:20:00Z' }
];
const LABELS = { register: 'Đăng ký', like: 'Thích bài viết', comment: 'Bình luận' };
const sb = {
  console,
  esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); },
  loadPointsScripts() { return Promise.resolve(true); },
  pointsSessionUser() { return Promise.resolve({ id: 'uid-lan', email: 'lan@example.com' }); },
  document: { getElementById(id) { return els[id] || null; } }
};
sb.window = {
  Ver2Reward: {
    getMyPointsBalanceResult() { return Promise.resolve({ ok: true, balance: 12 }); },
    getMyTransferStreak() { return Promise.resolve({ ok: true, eligible: false, current_streak: 5, days_remaining: 25 }); },
    getMyTransferHistory() { return Promise.resolve({ ok: true, items: [] }); },
    getMyPointsHistory() { return Promise.resolve({ ok: true, items: LEDGER }); },
    pointsHistoryLabel(t) { return LABELS[t] || 'Xu thưởng'; },
    formatVnDateTime(s) { return s; }
  }
};
vm.createContext(sb);
vm.runInContext(slice + '\nthis.__initTransferForm = initTransferForm;', sb);
const flush = () => new Promise(r => setImmediate(() => setImmediate(r)));

await (async () => {
  sb.__initTransferForm();
  await flush(); await flush(); await flush();
  const html = els.pointsHistory.innerHTML;
  check('lich su cong xu hien +10 xu dang ky', html.indexOf('+10 xu') !== -1, html.slice(0, 120));
  check('lich su cong xu hien +1 xu thich va binh luan', (html.match(/\+1 xu/g) || []).length === 2, html.slice(0, 200));
  check('lich su cong xu hien so du sau giao dich (Con lai: 12 xu)', html.indexOf('Còn lại: 12 xu') !== -1);
  check('lich su cong xu hien ly do (Dang ky tai khoan)', html.indexOf('Đăng ký tài khoản') !== -1);
  check('lich su chuyen xu van hien dung (chua co lan chuyen nao)', els.transferHistory.innerHTML.indexOf('Chưa có lần chuyển xu nào.') !== -1, els.transferHistory.innerHTML.slice(0, 80));
})();

console.log('\n' + pass + ' PASS, ' + fail + ' FAIL');
process.exit(fail ? 1 : 0);
