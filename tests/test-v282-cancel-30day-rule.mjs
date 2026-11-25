// test-v282-cancel-30day-rule.mjs — HUY quy tac 30 ngay (anh Tho quyet
// 24/11/2026): neu xoa het du lieu qua 30 ngay se thieu du lieu (dem
// 23/11: 350/381 kiot + 41 lo da qua 30 ngay van dang dung); chi chu so
// huu tu xoa du lieu cua minh. Co che duy nhat cua quy tac tren live la
// lotActive() an lo nhom 1 qua 30 ngay (v223) — fix: lotActive luon true,
// moi lo deu hien, khong bao gio tu an vi cu.
// Chay: node tests/test-v282-cancel-30day-rule.mjs (tu goc repo).
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

const appSrc = fs.readFileSync(path.join(root, 'js/app.js'), 'utf8');
const start = appSrc.indexOf('function lotActive(l, ref){');
const end = appSrc.indexOf('/* v279: bo dem tu dong', start);
check('trich duoc lotActive + lotsByGroup + lotFactoryStats', start !== -1 && end !== -1);
const sb = { console };
vm.createContext(sb);
vm.runInContext(appSrc.slice(start, end) + '\nthis.__V = { lotActive, lotsByGroup, lotFactoryStats };', sb);
const V = sb.__V;

// Lo nhom 1 cu: ngay 25/09/2026 (60 ngay truoc 24/11) + ngay 12/10/2026
// (43 ngay) — ca 2 deu BI AN theo quy tac cu, nay phai HIEN.
const old1 = { id: 'lot-old-1', group: 1, date: '25/09/2026' };
const old2 = { id: 'lot-old-2', group: 1, date: '12/10/2026' };
const fresh = { id: 'lot-new', group: 1, date: '20/11/2026' };
const g2 = { id: 'lot-g2', group: 2, date: '16/06/2025' };
const ref = new Date(2026, 10, 24); // 24/11/2026
check('lo nhom 1 ngay 25/09/2026 (60 ngay) VAN HIEN', V.lotActive(old1, ref) === true);
check('lo nhom 1 ngay 12/10/2026 (43 ngay) VAN HIEN', V.lotActive(old2, ref) === true);
check('lo nhom 1 moi van hien', V.lotActive(fresh, ref) === true);
check('lo nhom 2 cu hon 1 nam van hien', V.lotActive(g2, ref) === true);
check('lo null khong hien (guard)', V.lotActive(null, ref) === false);
check('lotActive khong phu thuoc ngay tham chieu (tuong lai xa van hien)',
  V.lotActive(old1, new Date(2027, 0, 15)) === true);

const lots = [old1, old2, fresh, g2, { id: 'lot-g3', group: 3, date: '01/01/2025' }];
const by = V.lotsByGroup(lots, ref);
check('lotsByGroup: nhom 1 gom DU 3 lo cu + moi (khong an lo nao)', by.g1.length === 3, 'g1=' + by.g1.length);
check('lotsByGroup: nhom 2 + 3 giu nguyen', by.g2.length === 1 && by.g3.length === 1);
const st = V.lotFactoryStats(lots, [{ prov: 'Hà Nội' }, { prov: 'TP. Hồ Chí Minh' }], ref);
check('lotFactoryStats: lotCount = TONG 5 lo (khong tru lo cu)', st.lotCount === 5, 'lotCount=' + st.lotCount);
check('lotFactoryStats: buyer/batch/factory giu nguyen', st.buyerCount === 1 && st.batchCount === 1 && st.factoryCount === 2);

// Dem tren data.js live: 14 lo nhom 1 dang bi an theo quy tac cu — sau
// fix tat ca deu duoc tinh (tong lo hien = tong lo trong data.js).
global.window = {};
const dataSrc = fs.readFileSync(path.join(root, 'js/data.js'), 'utf8');
vm.createContext(global);
vm.runInContext(dataSrc, global);
const D = global.window.V20_DATA;
const stLive = V.lotFactoryStats(D.lots, D.factories, ref);
check('data.js live: lotCount = tong so lo trong data.js (' + D.lots.length + ')',
  stLive.lotCount === D.lots.length, 'lotCount=' + stLive.lotCount);

console.log('\n' + pass + ' PASS, ' + fail + ' FAIL');
process.exit(fail ? 1 : 0);
