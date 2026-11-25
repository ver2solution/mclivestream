// test-v279-header-chip-balance.mjs — P3-4 vong 3 (24/11/2026): chip header
// cat ten dai che mat so xu ("Shop Thời Trang Minh Anh · 11 xu" thanh
// "… · …") vi ten + so xu la 1 text node, ellipsis cat tu phai. Fix: tach
// ten + so xu thanh 2 span (.v2s-hdr-name co lai, .v2s-hdr-bal khong co
// lai); nut ve inline-flex can trai (khong tai hien loi v111 can giua cat
// ca 2 dau). Ap dung ca header chinh (js/app.js renderHeaderLabel) va
// trang chat (js/chat-page.js syncHeader).
// Chay: node tests/test-v279-header-chip-balance.mjs (tu goc repo).
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

const css = fs.readFileSync(path.join(root, 'v20.css'), 'utf8');
const appSrc = fs.readFileSync(path.join(root, 'js/app.js'), 'utf8');
const chatSrc = fs.readFileSync(path.join(root, 'js/chat-page.js'), 'utf8');

// ---- 1. CSS ----
check('nut header ve inline-flex can trai, gap:0',
  /\.site-head \.user-menu-wrap>\.btn\{display:inline-flex;align-items:center;justify-content:flex-start;gap:0;/.test(css));
check('.v2s-hdr-name co lai (ellipsis)',
  css.indexOf('.v2s-hdr-name{min-width:0;flex:1 1 auto;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}') !== -1);
check('.v2s-hdr-bal khong co lai',
  css.indexOf('.v2s-hdr-bal{flex:0 0 auto;white-space:nowrap}') !== -1);
check('khong con inline-block tren nut header (loi v111 cu)',
  css.indexOf('.site-head .user-menu-wrap>.btn{display:inline-block') === -1);

// ---- 2. Header chinh (js/app.js) ----
function makeEl(tag) {
  const el = {
    tagName: (tag || 'div').toUpperCase(), children: [], style: {},
    textContent: '', innerHTML: '', hidden: false, _attrs: {},
    classList: { add() {}, remove() {}, contains() { return false; } },
    setAttribute(k, v) { el._attrs[k] = String(v); },
    getAttribute(k) { return el._attrs[k]; },
    removeAttribute(k) { delete el._attrs[k]; },
    addEventListener() {}, appendChild(c) { el.children.push(c); return c; },
    insertBefore(c) { el.children.push(c); return c; },
    closest() { return null; }, querySelector() { return null; },
    parentNode: { insertBefore(c) { return c; } }
  };
  return el;
}
function makeStorage() {
  const m = new Map();
  return {
    getItem(k) { const v = m.get(k); return v === undefined ? null : v; },
    setItem(k, v) { m.set(k, String(v)); },
    removeItem(k) { m.delete(k); }
  };
}
const flush = () => new Promise(r => setImmediate(() => setImmediate(r)));

{
  const start = appSrc.indexOf('function headerMetaName(user){');
  const end = appSrc.indexOf('/* v96: dai kich hoat', start);
  check('trich duoc headerMetaName + initHeaderAuth tu js/app.js', start !== -1 && end !== -1);
  const slice = appSrc.slice(start, end);
  const storage = makeStorage();
  const btn = makeEl('a');
  btn.textContent = 'Đăng Nhập';
  btn.setAttribute('href', 'dang-nhap.html');
  const shopUser = { id: 'uid-minh', email: 'tranvanminh2411@mailto.plus', user_metadata: { full_name: 'Shop Thời Trang Minh Anh' } };
  const fakeAuth = {
    getSession() { return Promise.resolve({ user: shopUser }); },
    getSessionRobust() { return Promise.resolve({ user: shopUser }); },
    onSessionChange() {}
  };
  const sb = {
    console, localStorage: storage,
    HEADER_CACHE_KEY: 'v2s_header_cache_v1',
    // esc() o muc module cua app.js (ngoai lat trich) — dua vao sandbox.
    esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); },
    setTimeout(fn) { return 0; }, clearTimeout() {},
    loadPointsScripts() { return Promise.resolve(true); },
    document: {
      querySelector(sel) { return String(sel).indexOf('dang-nhap') !== -1 ? btn : null; },
      createElement(tag) { return makeEl(tag); },
      addEventListener() {},
      body: { classList: { add() {}, remove() {} } }
    }
  };
  sb.window = { V2SAuthUI: fakeAuth, Ver2Reward: { getMyPointsBalanceResult() { return Promise.resolve({ ok: true, balance: 11 }); } }, location: { pathname: '/index.html' } };
  vm.createContext(sb);
  vm.runInContext(slice + '\nthis.__initHeaderAuth = initHeaderAuth;', sb);
  sb.__initHeaderAuth();
  await flush(); await flush();
  check('header chinh: ten dai + 11 xu tach 2 span',
    btn.innerHTML === '<span class="v2s-hdr-name">Shop Thời Trang Minh Anh</span><span class="v2s-hdr-bal"> · 11 xu</span>', btn.innerHTML);
  check('header chinh: so xu nam NGOAI span ten (khong bi cat cung ten)',
    btn.innerHTML.indexOf('11 xu</span>') !== -1 && btn.innerHTML.indexOf('Shop Thời Trang Minh Anh</span>') !== -1);
}

// ---- 3. Trang chat (js/chat-page.js) ----
{
  const start = chatSrc.indexOf('  var state = {');
  const syncStart = chatSrc.indexOf('  function syncHeader(user) {', start);
  const syncEnd = chatSrc.indexOf('\n  }\n', syncStart) + 5;
  check('trich duoc state + syncHeader tu js/chat-page.js', start !== -1 && syncEnd > syncStart);
  const slice = chatSrc.slice(start, syncEnd);
  const btn = makeEl('a');
  const sb = {
    console,
    document: {
      querySelector(sel) { return String(sel).indexOf('site-head') !== -1 ? btn : null; },
      getElementById() { return null; },
      addEventListener() {}
    }
  };
  sb.window = {
    Ver2Reward: { getMyPointsBalanceResult() { return Promise.resolve({ ok: true, balance: 11 }); } },
    McLivestreamAPI: { fetchMyProfile() { return Promise.resolve({ full_name: 'Shop Thời Trang Minh Anh' }); } }
  };
  vm.createContext(sb);
  vm.runInContext(slice + '\nthis.__t = { syncHeader, state };', sb);
  sb.__t.state.myId = 'uid-minh';
  // Ten metadata trong — di duong lookup profile (P3-5) roi moi render span.
  sb.__t.syncHeader({ id: 'uid-minh', email: 'tranvanminh2411@mailto.plus', user_metadata: {} });
  await flush(); await flush();
  check('trang chat: ten shop dai + 11 xu tach 2 span',
    btn.innerHTML === '<span class="v2s-hdr-name">Shop Thời Trang Minh Anh</span><span class="v2s-hdr-bal"> · 11 xu</span>', btn.innerHTML);
}

console.log('\n' + pass + ' PASS, ' + fail + ' FAIL');
process.exit(fail ? 1 : 0);
