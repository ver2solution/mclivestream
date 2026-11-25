// test-v434-pinned-order-sort.mjs — v434 (#68): sắp xếp lương giờ đảo thứ tự nhỏ.
// Gốc: applyPinnedOrderToLists chạy sau render (initPointsUI) và kéo bài ghim
// lên đầu trang 1 bất chấp thứ tự sắp xếp — mẫu ghim th-76..th-80 không có
// salaryNum (sort lương xếp cuối) nhưng ghim kéo lên đầu, user thấy thứ tự
// lương bị đảo vài mục. Fix: khi ô Sắp xếp có giá trị (fUniSort/fShSort) thì
// thứ tự sắp xếp thắng, bỏ qua việc đưa ghim lên đầu; trang không có ô sắp
// xếp (tin tức/lô/xưởng) thì ghim vẫn lên đầu như cũ. js/app.js nằm trong
// SHELL precache nên bump CACHE.
import fs from 'node:fs';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const APP = fs.readFileSync(path.join(ROOT, 'js/app.js'), 'utf8');
const SW = fs.readFileSync(path.join(ROOT, 'sw.js'), 'utf8');

function sliceFn(src, name) {
  const i = src.indexOf('function ' + name + '(');
  if (i < 0) throw new Error('khong thay ' + name);
  let depth = 0, j = src.indexOf('{', i);
  for (; j < src.length; j++) {
    if (src[j] === '{') depth++;
    else if (src[j] === '}') { depth--; if (depth === 0) { j++; break; } }
  }
  return src.slice(i, j);
}

let pass = 0, fail = 0;
function ok(name, cond, extra) {
  if (cond) { pass++; console.log('PASS ' + name); }
  else { fail++; console.log('FAIL ' + name + (extra ? ' — ' + extra : '')); }
}

// Chạy applyPinnedOrderToLists trong sandbox: document stub + fetchActivePins /
// applyPinnedOrder stub ghi lại số lần gọi.
async function runCase(sortValues) {
  const calls = { fetch: [], pin: 0 };
  const els = {};
  for (const id of ['fUniSort', 'fShSort']) {
    els[id] = (id in sortValues) ? { value: sortValues[id] } : null;
  }
  const GRID = ['listGrid', 'publicShopsList', 'newsMain', 'lotGrid1', 'lotGrid2', 'lotGrid3', 'factoryGrid'];
  const sb = {
    console,
    document: { getElementById: (id) => (id in els ? els[id] : (GRID.includes(id) ? {} : null)) },
    fetchActivePins: (cat) => { calls.fetch.push(cat); return Promise.resolve([]); },
    applyPinnedOrder: () => { calls.pin++; },
  };
  sb.window = sb;
  vm.createContext(sb);
  vm.runInContext(sliceFn(APP, 'applyPinnedOrderToLists') + '\nthis.__V = {applyPinnedOrderToLists};', sb);
  sb.__V.applyPinnedOrderToLists();
  await new Promise((r) => setTimeout(r, 20));
  return calls;
}

// 1. Sort lương đang bật ở trang Mẫu -> KHÔNG gọi fetch/đưa ghim lên đầu.
{
  const c = await runCase({ fUniSort: 'hourly-asc' });
  ok('1. sort hourly-asc (trang Mau) -> bo qua ghim', c.fetch.length === 0 && c.pin === 0, JSON.stringify(c));
}
// 2. Sort tháng đang bật ở trang Shop -> KHÔNG gọi fetch/đưa ghim lên đầu.
{
  const c = await runCase({ fShSort: 'monthly-desc' });
  ok('2. sort monthly-desc (trang Shop) -> bo qua ghim', c.fetch.length === 0 && c.pin === 0, JSON.stringify(c));
}
// 3. Không chọn sort (mặc định) -> ghim vẫn chạy đủ các lưới.
{
  const c = await runCase({ fUniSort: '', fShSort: '' });
  ok('3. mac dinh (khong sort) -> ghim van chay', c.fetch.length >= 7, 'fetch=' + c.fetch.length);
}
// 4. Trang không có ô sắp xếp (tin tức/lô/xưởng) -> ghim vẫn chạy.
{
  const c = await runCase({});
  ok('4. trang khong co o sort -> ghim van chay', c.fetch.length >= 7, 'fetch=' + c.fetch.length);
}
// 5. CACHE bump vì js/app.js nằm trong SHELL precache.
{
  const m = SW.match(/const CACHE = '([^']+)'/);
  ok('5. CACHE = v434-pinned-order-sort-1', !!m && m[1] === 'v434-pinned-order-sort-1', m ? m[1] : 'khong thay CACHE');
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
