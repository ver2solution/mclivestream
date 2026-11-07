/* v79 tests — Node only, no browser. v79 = TRACKER GHI UTM DE DO NGUON
   (nghien cuu tang truong 07/11/2026, hang 1 — quy uoc UTM
   hidden_files/utm-quy-uoc-2026-11-07.md):
   (1) js/analytics.js: them utmQuery() — chi giu 5 tham so utm_source,
       utm_medium, utm_campaign, utm_content, utm_term (theo dung thu tu
       do), bo moi query param khac; pagePath() tra pathname + utmQuery().
       Gia tri utm cung qua sanitize() (loai email/SDT neu co) — giu nguyen
       tac an danh tuyet doi cua tracker.
   (2) sw.js CACHE 'v78-shell-1' -> 'v80-shell-1' (bat buoc vi
       js/analytics.js doi). Chi 2 file code doi so voi v78. */
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let pass = 0, fail = 0;
function t(name, cond, extra = '') { if (cond) { pass++; console.log('PASS v79:', name); } else { fail++; console.log('FAIL v79:', name, extra); } }
const sha = f => crypto.createHash('sha256').update(fs.readFileSync(path.join(root, f))).digest('hex');
const tick = () => new Promise(r => setTimeout(r, 0));

// ---- (A) sw.js CACHE + sha pin ----
const swJs = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');
t("sw.js CACHE = 'v84-shell-1'", swJs.includes("const CACHE = 'v84-shell-1';"));
t('sw.js: khong con cache cu (v78)', !swJs.includes('v78-shell-1'));
t('sw.js giong het v79 (CACHE v84-shell-1) (sha256)', sha('sw.js') === '609a81a1bdb77f85197f023f945af4a80acffaf408b450aa203c8d4c30926522');

// ---- (B) static: analytics.js co utmQuery + pagePath dung no ----
const an = fs.readFileSync(path.join(root, 'js/analytics.js'), 'utf8');
t('analytics.js co ham utmQuery() + UTM_KEYS du 5 khoa theo dung thu tu',
  an.includes('function utmQuery()')
  && an.includes("var UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'];"));
t('analytics.js: pagePath() tra pathname + utmQuery()',
  an.includes('return window.location.pathname + utmQuery();'));
t('analytics.js: utmQuery + pagePath duoc export tren V2SAnalytics (de test)',
  an.includes('utmQuery: utmQuery,') && an.includes('pagePath: pagePath,'));
t('analytics.js: khong dung URLSearchParams (moi truong han che khong co san)',
  !an.includes('URLSearchParams'));
t('analytics.js: gia tri utm qua sanitize() truoc khi ghi',
  an.includes("return sanitize('?' + kept.join('&'));"));
t('analytics.js giong het v79 (sha256)', sha('js/analytics.js') === 'ea26919a8b4cf1808c830c0ea0c4a7a44c1b8b6ca7b7f581d5da2251999c2634');

// ---- (C) runtime: hanh vi utmQuery/pagePath trong sandbox vm ----
// (mo phong test-v27: sandbox KHONG co URLSearchParams, location co the
// khong co search — code phai chay duoc ca 2 truong hop.)
function makeStore() {
  const m = new Map();
  return {
    getItem: k => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => { m.set(k, String(v)); },
    removeItem: k => { m.delete(k); },
    _map: m
  };
}

function loadAnalytics({ page = '/index.html', search = '', referrer = '' } = {}) {
  const fetchCalls = [];
  const listeners = { document: {}, window: {} };
  const sb = {
    console,
    URL, Promise, JSON, Date, Math, Object, Array, String, Number, Error, Map, Set, parseInt,
    setTimeout: () => 0,
    setInterval: () => 0,
    clearTimeout: () => {},
    clearInterval: () => {},
    fetch: async (...args) => { fetchCalls.push(args); return { ok: true }; },
    window: {},
    module: { exports: {} }
  };
  sb.window = sb;
  sb.window.sessionStorage = makeStore();
  sb.window.localStorage = makeStore();
  sb.window.location = { pathname: page, search, href: 'https://ver2solution.github.io/mclivestream' + page + search };
  sb.window.navigator = {};
  sb.window.supabase = { createClient: () => ({}) };
  sb.window.MCLIVESTREAM_SUPABASE_CONFIG = { url: 'https://example.supabase.co', anonKey: 'test-anon-key' };
  sb.document = {
    readyState: 'loading',
    referrer,
    hidden: false,
    currentScript: { src: 'https://ver2solution.github.io/mclivestream/js/analytics.js' },
    head: { appendChild: () => {} },
    documentElement: {},
    createElement: () => ({ set src(v) { this._src = v; }, get src() { return this._src; } }),
    addEventListener: (type, fn) => { listeners.document[type] = fn; },
    removeEventListener: () => {}
  };
  sb.window.addEventListener = (type, fn) => { listeners.window[type] = fn; };
  sb.window.removeEventListener = () => {};
  vm.createContext(sb);
  vm.runInContext(fs.readFileSync(path.join(root, 'js/analytics.js'), 'utf8'), sb);
  return { sb, fetchCalls, listeners };
}

const EMAIL_RE = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/;
const PHONE_RE = /(?<!\d)0[389]\d{8}(?!\d)/;

async function pageviewPage({ page, search }) {
  const { sb, fetchCalls } = loadAnalytics({ page, search });
  sb.window.V2SAnalytics.init();
  await tick(); await tick();
  const bodies = fetchCalls.map(c => { try { return JSON.parse(c[1].body); } catch (e) { return []; } }).flat();
  const pv = bodies.find(e => e.event_type === 'pageview');
  return pv ? pv.page : null;
}

{
  const A = loadAnalytics().sb.window.V2SAnalytics;
  t('utmQuery(): khong co search -> chuoi rong',
    A.utmQuery() === '');
  t('utmQuery(): chi giu utm, bo page/q/tu khoa tim kiem',
    loadAnalytics({ search: '?page=1&utm_source=zalo&q=ao+thun&utm_medium=group&utm_campaign=zalo-groups' }).sb.window.V2SAnalytics.utmQuery()
    === '?utm_source=zalo&utm_medium=group&utm_campaign=zalo-groups');
  t('utmQuery(): sap lai theo thu tu co dinh source/medium/campaign/content/term',
    loadAnalytics({ search: '?utm_campaign=zalo-groups&utm_source=zalo&utm_term=x&utm_medium=group' }).sb.window.V2SAnalytics.utmQuery()
    === '?utm_source=zalo&utm_medium=group&utm_campaign=zalo-groups&utm_term=x');
  t('utmQuery(): utm trung lap lay gia tri dau tien',
    loadAnalytics({ search: '?utm_source=zalo&utm_source=facebook' }).sb.window.V2SAnalytics.utmQuery()
    === '?utm_source=zalo');
  t('utmQuery(): khong co utm nao -> chuoi rong (du co query khac)',
    loadAnalytics({ search: '?page=2&loc=hanoi' }).sb.window.V2SAnalytics.utmQuery() === '');
  t('pagePath(): khong co search -> chi pathname (tuong thich v27)',
    loadAnalytics({ page: '/index.html', search: '' }).sb.window.V2SAnalytics.pagePath() === '/index.html');
  t('pagePath(): co utm -> pathname + utm',
    loadAnalytics({ page: '/danh-sach-shop.html', search: '?page=1&utm_source=zalo&utm_medium=group&utm_campaign=zalo-groups' }).sb.window.V2SAnalytics.pagePath()
    === '/danh-sach-shop.html?utm_source=zalo&utm_medium=group&utm_campaign=zalo-groups');
}

{
  const p = await pageviewPage({ page: '/danh-sach-shop.html', search: '?page=1&utm_source=zalo&utm_medium=group&utm_campaign=zalo-groups' });
  t('pageview that: page ghi du utm (link Zalo mau)',
    p === '/danh-sach-shop.html?utm_source=zalo&utm_medium=group&utm_campaign=zalo-groups');
  const p2 = await pageviewPage({ page: '/index.html', search: '' });
  t('pageview khong utm: page chi la pathname',
    p2 === '/index.html');
  const p3 = await pageviewPage({ page: '/danh-sach-shop.html', search: '?utm_source=zalo&utm_campaign=a@b.com' });
  t('pageview: gia tri utm chua email bi sanitize (khong lo email vao DB)',
    p3 !== null && !EMAIL_RE.test(p3) && p3.includes('[ẩn-email]'));
  const p4 = await pageviewPage({ page: '/index.html', search: '?utm_source=zalo&utm_medium=group&sdt=0982725840' });
  t('pageview: param khong phai utm (ke ca so dien thoai) bi bo hoan toan',
    p4 === '/index.html?utm_source=zalo&utm_medium=group' && !PHONE_RE.test(p4));
}

// ---- (D) chi 2 file code doi so voi v78 (v80: pham vi v79 duoc GIM bang
//      cach so sanh 2 thu muc lich su v79-prep vs v78-prep, vi root hien
//      tai da la v80 va chua them 10 bai moi) ----
{
  const v79root = path.resolve(root, '..', 'mclivestream-final-v79-prep');
  const v78root = path.resolve(root, '..', 'mclivestream-final-v78-prep');
  const walk = (dir, base = '') => {
    const out = [];
    for (const f of fs.readdirSync(dir, { withFileTypes: true })) {
      const rel = base ? base + '/' + f.name : f.name;
      if (f.isDirectory()) out.push(...walk(path.join(dir, f.name), rel));
      else out.push(rel);
    }
    return out;
  };
  const v78files = new Set(walk(v78root));
  const v79files = walk(v79root);
  const changed = v79files.filter(f => {
    if (!v78files.has(f)) return true;
    const a = crypto.createHash('sha256').update(fs.readFileSync(path.join(v78root, f))).digest('hex');
    const b = crypto.createHash('sha256').update(fs.readFileSync(path.join(v79root, f))).digest('hex');
    return a !== b;
  }).filter(f => !f.startsWith('tests/'));
  t('v79 chi doi 2 file code so voi v78 (js/analytics.js + sw.js) — so sanh v79-prep vs v78-prep',
    changed.length === 2 && changed.includes('js/analytics.js') && changed.includes('sw.js'),
    'changed: ' + changed.join(', '));
}

console.log(`\n${pass} PASS, ${fail} FAIL`);
process.exit(fail ? 1 : 0);
