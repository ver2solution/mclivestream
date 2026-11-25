// test-v278-chat-header-name.mjs — P3-5 vong 3 (24/11/2026): trang
// /cong-dong/chat hien ten dang email ("nguyenthilan2411 · 12 xu") thay vi
// ten hien thi ("Nguyễn Thị Lan · 12 xu") nhu cac trang khac. Goc:
// syncHeader (js/chat-page.js) chi doc user_metadata.full_name/name roi
// roi ve phan truoc @, khong lookup profiles.full_name /
// shop_profiles.shop_name nhu header chinh (js/app.js apply). Fix: khong
// co ten metadata thi lookup McLivestreamAPI.fetchMyProfile (roi
// fetchMyShopProfile), ve thi doi ten, giu nguyen so xu.
// Chay: node tests/test-v278-chat-header-name.mjs (tu goc repo).
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

const src = fs.readFileSync(path.join(root, 'js/chat-page.js'), 'utf8');

// Trich khoi tu `var state` den het syncHeader (chi khai bao ham, khong
// chay code khoi tao o cuoi file).
const start = src.indexOf('  var state = {');
const syncStart = src.indexOf('  function syncHeader(user) {', start);
const syncEnd = src.indexOf('\n  }\n', syncStart) + 5;
check('trich duoc state + syncHeader tu js/chat-page.js', start !== -1 && syncStart !== -1 && syncEnd > syncStart);
const slice = src.slice(start, syncEnd);

function makeBtn() {
  return {
    textContent: 'Đăng Nhập', _attrs: {},
    setAttribute(k, v) { this._attrs[k] = String(v); },
    getAttribute(k) { return this._attrs[k]; },
    removeAttribute(k) { delete this._attrs[k]; }
  };
}
const flush = () => new Promise(r => setImmediate(() => setImmediate(r)));

async function runCase(label, user, api, reward) {
  const btn = makeBtn();
  const sb = {
    console,
    document: {
      querySelector(sel) { return String(sel).indexOf('site-head') !== -1 ? btn : null; },
      getElementById() { return null; },
      addEventListener() {}
    }
  };
  sb.window = { Ver2Reward: reward || null, McLivestreamAPI: api || null };
  vm.createContext(sb);
  vm.runInContext(slice + '\nthis.__t = { syncHeader, state };', sb);
  sb.__t.state.myId = user ? user.id : null;
  sb.__t.syncHeader(user);
  const immediate = btn.textContent;
  await flush(); await flush();
  return { btn, immediate, final: btn.textContent };
}

// 1. TK Lan: khong co ten metadata, co ho so profiles -> hien ten that + xu.
{
  let profileCalls = 0, shopCalls = 0;
  const api = {
    fetchMyProfile() { profileCalls++; return Promise.resolve({ full_name: 'Nguyễn Thị Lan' }); },
    fetchMyShopProfile() { shopCalls++; return Promise.resolve(null); }
  };
  const reward = { getMyPointsBalanceResult() { return Promise.resolve({ ok: true, balance: 12 }); } };
  const user = { id: 'uid-lan', email: 'nguyenthilan2411@mailto.plus', user_metadata: {} };
  const r = await runCase('lan', user, api, reward);
  check('TK Lan: hien tam ten email truoc khi lookup ve', r.immediate === 'nguyenthilan2411', r.immediate);
  check('TK Lan: sau lookup hien ten that + 12 xu', r.final === 'Nguyễn Thị Lan · 12 xu', r.final);
  check('TK Lan: chi lookup profile, khong hoi shop (da co ten)', profileCalls === 1 && shopCalls === 0, profileCalls + '/' + shopCalls);
}

// 2. TK shop: khong co ho so ca nhan, co ho so shop -> hien ten shop.
{
  const api = {
    fetchMyProfile() { return Promise.resolve(null); },
    fetchMyShopProfile() { return Promise.resolve({ shop_name: 'Shop Thời Trang Minh Anh' }); }
  };
  const reward = { getMyPointsBalanceResult() { return Promise.resolve({ ok: true, balance: 11 }); } };
  const user = { id: 'uid-minh', email: 'tranvanminh2411@mailto.plus', user_metadata: {} };
  const r = await runCase('minh', user, api, reward);
  check('TK shop: sau lookup hien ten shop + 11 xu', r.final === 'Shop Thời Trang Minh Anh · 11 xu', r.final);
}

// 3. TK co ten metadata san: hien ngay, khong lookup.
{
  let profileCalls = 0;
  const api = { fetchMyProfile() { profileCalls++; return Promise.resolve({ full_name: 'Khác' }); } };
  const reward = { getMyPointsBalanceResult() { return Promise.resolve({ ok: true, balance: 5 }); } };
  const user = { id: 'uid-x', email: 'x@example.com', user_metadata: { full_name: 'Tên Metadata' } };
  const r = await runCase('meta', user, api, reward);
  check('TK co ten metadata: hien ten metadata + 5 xu', r.final === 'Tên Metadata · 5 xu', r.final);
  check('TK co ten metadata: khong lookup profile', profileCalls === 0);
}

// 4. Khach: nut Dang Nhap nhu cu.
{
  const r = await runCase('guest', null, null, null);
  check('Khach: nut Dang Nhap', r.final === 'Đăng Nhập', r.final);
}

console.log('\n' + pass + ' PASS, ' + fail + ' FAIL');
process.exit(fail ? 1 : 0);
