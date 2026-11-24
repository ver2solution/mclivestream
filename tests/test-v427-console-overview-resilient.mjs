// test-v427-console-overview-resilient.mjs — 3 khoi Tong quan console ket
// "Dang tai..." >2h (Glint-SUP 21:02, khung chat 24/11/2026). Goc:
// loadOverview() goi get_online_breakdown KHONG try/catch — RPC nay loi
// (hoac tra rong) thi ca ham nem ra ngoai, 2 khoi sau (luot xem that, lich
// su chuyen xu) + so dem GĐ2 khong bao gio chay, bang giu "Dang tai..." mai.
// Fix: tach khoi online ra try/catch rieng — loi thi hien loi + huong dan
// bam lai tab Tong quan, cac khoi khac van chay.
// Chay: node tests/test-v427-console-overview-resilient.mjs (tu goc repo).
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

const src = fs.readFileSync(path.join(root, 'js/admin.js'), 'utf8');
const start = src.indexOf('  async function loadOverview() {');
const end = src.indexOf('  /* ---------- TAB: Bình luận', start);
check('trich duoc loadOverview', start !== -1 && end !== -1);

let behavior = {};
const els = {};
function $(id) {
  if (!els[id]) els[id] = { innerHTML: '', textContent: '', hidden: false };
  return els[id];
}
async function rpc(name) {
  const b = behavior[name];
  if (b === 'throw') throw new Error('RPC ' + name + ' loi (gia lap)');
  if (b !== undefined) return b;
  return [];
}
const sb = {
  console,
  $,
  rpc,
  ORDER: ['index', 'total'],
  LABELS: { index: 'Trang chủ', total: 'Tổng' },
  fmt: (n) => String(n == null ? 0 : n),
  esc: (s) => String(s == null ? '' : s),
  vnTime: (s) => String(s),
  refreshOverviewCounts: async () => {},
};
vm.createContext(sb);
vm.runInContext(src.slice(start, end) + '\nthis.__V = { loadOverview };', sb);
const loadOverview = sb.__V.loadOverview;

function reset() {
  for (const k of Object.keys(els)) delete els[k];
  // Trang thai ban dau cua console: cac khoi dang "Dang tai...".
  $('qtBody').innerHTML = '<tr><td>Đang tải…</td></tr>';
  $('qtOnlineSummary').textContent = 'Đang tải…';
  $('qtViews').textContent = 'Đang tải…';
  $('qtTransfers').textContent = 'Đang tải…';
  $('qtAdminCounts').innerHTML = '';
}
const okRows = [
  { page: 'index', real_count: 3, base_count: 100, display_count: 103 },
  { page: 'total', real_count: 3, base_count: 100, display_count: 103 },
];
const okViews = [{ event_type: 'pageview', event_count: 123 }];
const okTransfers = [{ sender_email: 'a@x', recipient_email: 'b@x', amount: 10, note: 'n', created_at: '2026-11-24T10:00:00Z' }];
const okCounts = [{ metric: 'profiles_pending', value: 5 }, { metric: 'total_users', value: 100 }];

// Truong hop 1: get_online_breakdown LOI — ham khong nem, cac khoi khac van chay.
behavior = { get_online_breakdown: 'throw', get_analytics_summary: okViews, get_all_transfer_history_admin: okTransfers, get_admin_counts: okCounts };
reset();
let threw = false;
try { await loadOverview(); } catch (e) { threw = true; }
check('online RPC loi -> loadOverview KHONG nem ra ngoai', threw === false);
check('online RPC loi -> bang online hien loi + huong dan thu lai',
  $('qtBody').innerHTML.includes('Không tải được số người online') && $('qtBody').innerHTML.includes('bấm lại tab Tổng quan'),
  'got ' + $('qtBody').innerHTML.slice(0, 80));
check('online RPC loi -> tom tat online hien loi',
  $('qtOnlineSummary').textContent === 'Không tải được số người online.');
check('online RPC loi -> khoi luot xem VAN chay (123 luot)',
  $('qtViews').textContent.includes('123'), 'got ' + $('qtViews').textContent);
check('online RPC loi -> khoi chuyen xu VAN chay',
  $('qtTransfersBody').innerHTML.includes('a@x'), 'got ' + $('qtTransfersBody').innerHTML.slice(0, 80));
check('online RPC loi -> so dem GĐ2 VAN chay',
  $('qtAdminCounts').innerHTML.includes('Hồ sơ mẫu chờ duyệt'), 'got ' + $('qtAdminCounts').innerHTML.slice(0, 80));

// Truong hop 2: get_online_breakdown tra RONG — cung duong loi, khong nem.
behavior = { get_online_breakdown: [], get_analytics_summary: okViews, get_all_transfer_history_admin: okTransfers, get_admin_counts: okCounts };
reset();
threw = false;
try { await loadOverview(); } catch (e) { threw = true; }
check('online RPC tra rong -> loadOverview KHONG nem', threw === false);
check('online RPC tra rong -> bang online hien loi',
  $('qtBody').innerHTML.includes('Không tải được số người online'));
check('online RPC tra rong -> khoi luot xem VAN chay',
  $('qtViews').textContent.includes('123'));

// Truong hop 3: tat ca OK — hien thi day du nhu cu (hoi quy).
behavior = { get_online_breakdown: okRows, get_analytics_summary: okViews, get_all_transfer_history_admin: okTransfers, get_admin_counts: okCounts };
reset();
threw = false;
try { await loadOverview(); } catch (e) { threw = true; }
check('tat ca OK -> loadOverview KHONG nem', threw === false);
check('tat ca OK -> bang online hien du lieu (Trang chủ + Tổng)',
  $('qtBody').innerHTML.includes('Trang chủ') && $('qtBody').innerHTML.includes('Tổng'));
check('tat ca OK -> tom tat hien so that online',
  $('qtOnlineSummary').textContent.includes('Số người thật đang online: 3'),
  'got ' + $('qtOnlineSummary').textContent);
check('tat ca OK -> khoi luot xem + chuyen xu + so dem deu hien',
  $('qtViews').textContent.includes('123') && $('qtTransfersBody').innerHTML.includes('a@x')
  && $('qtAdminCounts').innerHTML.includes('Hồ sơ mẫu chờ duyệt'));

console.log('\n' + pass + ' PASS, ' + fail + ' FAIL');
process.exit(fail ? 1 : 0);
