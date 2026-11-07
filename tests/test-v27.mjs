/* v27 tests — Node only, no browser. Covers the anonymous tracker only:
   (1) payloads carry the required fields and NEVER contain an email, a VN
       phone number, a password or form content (sanitizer + no .value reads).
   (2) queue persists to localStorage when sending fails and is retried on
       the next page load; dwell events carry dwell_seconds >= 0.
   (3) form outcomes are recorded via the McLivestreamAPI wrap (success =
       error_message NULL, error = sanitized message) without reading fields.
   (4) js_error events are recorded from window.onerror.
   (5) every HTML page loads js/analytics.js after js/app.js; every required
       data-track value exists; the migration file creates the table + RLS +
       anon INSERT/SELECT and says the user must run it by hand.
   The v20–v26 suites still run (they assert the old behaviour is intact). */
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let pass = 0, fail = 0;
function t(name, cond, extra = '') { if (cond) { pass++; console.log('PASS v27:', name); } else { fail++; console.log('FAIL v27:', name, extra); } }
const tick = () => new Promise(r => setTimeout(r, 0));

function makeStore() {
  const m = new Map();
  return {
    getItem: k => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => { m.set(k, String(v)); },
    removeItem: k => { m.delete(k); },
    _map: m
  };
}

function loadAnalytics({ fetchImpl, sessionStore, localStore, page = '/index.html', referrer = '', api = null } = {}) {
  const fetchCalls = [];
  const listeners = { document: {}, window: {} };
  const sb = {
    console,
    URL, Promise, JSON, Date, Math, Object, Array, String, Number, Error, Map, Set, parseInt,
    setTimeout: () => 0,
    setInterval: () => 0,
    clearTimeout: () => {},
    clearInterval: () => {},
    fetch: async (...args) => { fetchCalls.push(args); return fetchImpl(...args); },
    window: {},
    module: { exports: {} }
  };
  sb.window = sb;
  sb.window.sessionStorage = sessionStore || makeStore();
  sb.window.localStorage = localStore || makeStore();
  sb.window.location = { pathname: page, href: 'https://ver2solution.github.io/mclivestream' + page };
  sb.window.navigator = {};
  sb.window.supabase = { createClient: () => ({}) };
  sb.window.MCLIVESTREAM_SUPABASE_CONFIG = { url: 'https://example.supabase.co', anonKey: 'test-anon-key' };
  if (api) sb.window.McLivestreamAPI = api;
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
const okFetch = async () => ({ ok: true });
const badFetch = async () => { throw new Error('network down'); };

// ---- (1) pageview: required fields, no PII (assert on the SENT payload:
// a successful flush drains the in-memory queue, which is correct) ----
{
  const { sb, fetchCalls } = loadAnalytics({ fetchImpl: okFetch });
  sb.window.V2SAnalytics.init();
  await tick(); await tick();
  const bodies = fetchCalls.map(c => { try { return JSON.parse(c[1].body); } catch (e) { return []; } }).flat();
  const pv = bodies.find(e => e.event_type === 'pageview');
  t('pageview event has all required fields (session_id, page, event_type, element, dwell_seconds, error_message, referrer)',
    pv && typeof pv.session_id === 'string' && pv.session_id.length > 5
    && pv.page === '/index.html' && pv.event_type === 'pageview'
    && 'element' in pv && 'dwell_seconds' in pv && 'error_message' in pv && 'referrer' in pv);
  t('session id is a random per-tab id (sess_ prefix), not an email or phone',
    pv && /^sess_[a-z0-9_]+$/.test(pv.session_id) && !EMAIL_RE.test(pv.session_id));
  t('pageview is POSTed to the web_analytics_events REST endpoint with the anon key header',
    fetchCalls.length >= 1 && String(fetchCalls[0][0]).includes('/rest/v1/web_analytics_events')
    && fetchCalls[0][1].headers.apikey === 'test-anon-key');
}

// ---- (2) sanitizer ----
{
  const { sb } = loadAnalytics({ fetchImpl: okFetch });
  const A = sb.window.V2SAnalytics;
  const dirty = 'Lỗi gửi tới a@b.com và 0982725840, gọi 0329983699 giúp';
  const clean = A.sanitize(dirty);
  t('sanitize() strips emails and VN phone numbers from error text',
    !EMAIL_RE.test(clean) && !PHONE_RE.test(clean)
    && clean.includes('[ẩn-email]') && clean.includes('[ẩn-số]'));
  t('sanitize() caps at 500 chars and returns null for null',
    A.sanitize('x'.repeat(900)).length === 500 && A.sanitize(null) === null);
  t('cleanReferrer() keeps origin+path, drops query and hash',
    A.cleanReferrer('https://www.facebook.com/groups/123/posts/456?x=1#y') === 'https://www.facebook.com/groups/123/posts/456'
    && A.cleanReferrer('') === null && A.cleanReferrer(null) === null);
}

// ---- (3) queue: persist on failure, retry on next load ----
{
  const localStore = makeStore();
  const env1 = loadAnalytics({ fetchImpl: badFetch, localStore, page: '/danh-sach-mau.html' });
  env1.sb.window.V2SAnalytics.init();
  await tick(); await tick();
  const saved = JSON.parse(localStore.getItem('v2s_analytics_queue') || '[]');
  t('send failure persists the queue to localStorage (pageview kept, not lost)',
    saved.length >= 1 && saved.some(e => e.event_type === 'pageview' && e.page === '/danh-sach-mau.html'));
  t('queued payload contains no email or phone number',
    !EMAIL_RE.test(JSON.stringify(saved)) && !PHONE_RE.test(JSON.stringify(saved)));

  const seen = [];
  const env2 = loadAnalytics({
    fetchImpl: async (...a) => { seen.push(a); return { ok: true }; },
    localStore, sessionStore: makeStore(), page: '/danh-sach-mau.html'
  });
  env2.sb.window.V2SAnalytics.init();
  await tick(); await tick();
  const sent = seen.length ? JSON.parse(seen[seen.length - 1][1].body) : [];
  t('next page load retries the stored queue (old pageview is sent again)',
    sent.some(e => e.event_type === 'pageview' && e.page === '/danh-sach-mau.html'));
  t('localStorage queue is cleared after a successful send',
    localStore.getItem('v2s_analytics_queue') === null);
}

// ---- (4) dwell ----
{
  const { sb } = loadAnalytics({ fetchImpl: okFetch });
  const A = sb.window.V2SAnalytics;
  A.init();
  A.sendDwell();
  A.sendDwell(); // second call must not duplicate
  const dwells = A._queue().filter(e => e.event_type === 'dwell');
  t('dwell event has dwell_seconds as a non-negative integer, sent exactly once',
    dwells.length === 1 && Number.isInteger(dwells[0].dwell_seconds) && dwells[0].dwell_seconds >= 0);
}

// ---- (5) form outcomes via the API wrap (no field values read) ----
{
  const api = {
    signUp: async () => { throw new Error('Email not confirmed'); },
    signIn: async () => ({ user: { id: 'u1' } })
  };
  const { sb } = loadAnalytics({ fetchImpl: okFetch, page: '/danh-sach-mau.html', api });
  sb.window.V2SAnalytics.init();
  await tick();
  await sb.window.McLivestreamAPI.signIn();
  try { await sb.window.McLivestreamAPI.signUp(); } catch (e) { /* expected */ }
  await tick();
  const forms = sb.window.V2SAnalytics._queue().filter(e => e.event_type === 'form_result');
  t('form_result: sign-in success is recorded with error_message NULL',
    forms.some(e => e.element === 'mauSignIn' && e.error_message === null));
  t('form_result: sign-up error is recorded with the (sanitized) message, form id only',
    forms.some(e => e.element === 'mauSignUp' && e.error_message === 'Email not confirmed'));
}

// ---- (6) js_error from window.onerror ----
{
  const { sb, listeners } = loadAnalytics({ fetchImpl: okFetch });
  sb.window.V2SAnalytics.init();
  listeners.window.error({ message: 'TypeError: x is not a function (gửi tới a@b.com)', filename: 'https://ver2solution.github.io/mclivestream/js/app.js', lineno: 12, colno: 3 });
  const errs = sb.window.V2SAnalytics._queue().filter(e => e.event_type === 'js_error');
  t('js_error event is recorded with the script file name, message sanitized',
    errs.length === 1 && errs[0].element === 'app.js'
    && errs[0].error_message.includes('TypeError') && !EMAIL_RE.test(errs[0].error_message));
}

// ---- (7) click delegation on data-track ----
{
  const { sb, listeners } = loadAnalytics({ fetchImpl: okFetch });
  sb.window.V2SAnalytics.init();
  const fakeEl = { getAttribute: () => 'xem-ho-so' };
  listeners.document.click({ target: { closest: sel => (sel === '[data-track]' ? fakeEl : null) } });
  const clicks = sb.window.V2SAnalytics._queue().filter(e => e.event_type === 'click');
  t('click on a [data-track] element records only the static track value',
    clicks.length === 1 && clicks[0].element === 'xem-ho-so');
}

// ---- (8) static: script on every page, after app.js ----
{
  const pages = [...fs.readdirSync(root).filter(f => f.endsWith('.html')),
    ...fs.readdirSync(path.join(root, 'bai-viet')).filter(f => f.endsWith('.html')).map(f => 'bai-viet/' + f)];
  const ok = pages.every(p => {
    const h = fs.readFileSync(path.join(root, p), 'utf8');
    const app = h.indexOf('js/app.js');
    const an = h.indexOf('js/analytics.js');
    return app !== -1 && an > app;
  });
  t('js/analytics.js is loaded on every HTML page, after js/app.js', ok,
    'pages: ' + pages.length);
}

// ---- (9) static: all required data-track values exist ----
{
  const all = fs.readdirSync(root).filter(f => f.endsWith('.html')).map(f => fs.readFileSync(path.join(root, f), 'utf8')).join('\n')
    + fs.readdirSync(path.join(root, 'bai-viet')).filter(f => f.endsWith('.html')).map(f => fs.readFileSync(path.join(root, 'bai-viet', f), 'utf8')).join('\n')
    + fs.readFileSync(path.join(root, 'js/app.js'), 'utf8');
  const required = ['nut-dang-ky-mau', 'nut-dang-nhap-mau', 'nut-dang-ky-shop', 'nut-dang-nhap-shop',
    'nut-dang-tin-tuyen', 'nut-luu-ho-so-shop', 'xem-ho-so', 'xem-bai-tuyen-goc',
    'nut-gop-y', 'tim-kiem-mau', 'loc-tinh', 'loc-linh-vuc', 'ap-dung-loc', 'yeu-cau-go-ho-so',
    'nhan-zalo-mau', 'xem-bai-goc-mau', 'gui-gop-y', 'nut-menu'];
  const missing = required.filter(v => !all.includes('data-track="' + v + '"'));
  t('every required data-track value exists (auth, shop, cards, search, feedback, menu)', missing.length === 0,
    'missing: ' + missing.join(','));
}

// ---- (10) static: analytics.js never reads input values or secrets ----
// (strip comments first: the header documents the bans in words, e.g. it
// names `.value` and service_role only to forbid them.)
{
  const src = fs.readFileSync(path.join(root, 'js/analytics.js'), 'utf8');
  const codeOnly = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
  t('analytics.js never reads input values (.value) or password values, and contains no fingerprint/userAgent collection (resetPassword is only an API method name, never a value read)',
    !/\.value\b/.test(codeOnly) && !/\.password\b/i.test(codeOnly) && !/['"]password['"]/i.test(codeOnly)
    && !/fingerprint/i.test(codeOnly)
    && !/userAgent/i.test(codeOnly) && !/querySelector\('input/.test(codeOnly));
  t('analytics.js only sends to the web_analytics_events table via the anon key (no other endpoint)',
    codeOnly.includes("TABLE = 'web_analytics_events'") && codeOnly.includes('/rest/v1/' + "' + TABLE")
    && !/service_role/i.test(codeOnly));
}

// ---- (11) migration file ----
{
  const sql = fs.readFileSync(path.join(root, 'supabase-migration-web-analytics.sql'), 'utf8');
  const cols = ['id', 'session_id', 'page', 'event_type', 'element', 'dwell_seconds', 'error_message', 'created_at', 'referrer'];
  t('migration creates web_analytics_events with all columns + event_type check + RLS + anon INSERT only, no anon SELECT (QA 05/11: read via RPC)',
    sql.includes('CREATE TABLE IF NOT EXISTS public.web_analytics_events')
    && cols.every(c => sql.includes(c))
    && sql.includes("CHECK (event_type IN ('pageview', 'dwell', 'click', 'js_error', 'form_result'))")
    && sql.includes('ENABLE ROW LEVEL SECURITY')
    && sql.includes('FOR INSERT TO anon')
    && !sql.includes('CREATE POLICY "web_analytics_events_anon_read"')
    && sql.includes('CREATE OR REPLACE FUNCTION public.get_analytics_summary')
    && sql.includes('CREATE OR REPLACE FUNCTION public.get_analytics_exits')
    && sql.includes('SECURITY DEFINER')
    && sql.includes('GRANT EXECUTE ON FUNCTION public.get_analytics_summary(integer) TO anon, authenticated')
    && sql.includes('GRANT EXECUTE ON FUNCTION public.get_analytics_exits(integer) TO anon, authenticated'));
  t('migration says the user must run it by hand on the Supabase Dashboard',
    sql.includes('Đăng nhập Supabase Dashboard') && sql.includes('dán toàn bộ file này'));
}

// ---- (12) app.js still loads and renders after the data-track tagging ----
{
  const sb = { window: {}, module: { exports: {} }, console };
  vm.createContext(sb);
  vm.runInContext(fs.readFileSync(path.join(root, 'js/data.js'), 'utf8'), sb);
  vm.runInContext(fs.readFileSync(path.join(root, 'js/app.js'), 'utf8'), sb);
  const V = sb.window.V20;
  const D = sb.window.V20_DATA;
  const card = V.cardHTML(D.models[0]);
  t('app.js still renders cards after tagging (xem-ho-so + nhan-zalo-mau present, counts unchanged)',
    card.includes('data-track="xem-ho-so"') && card.includes('data-track="nhan-zalo-mau"')
    && D.models.length === 20 && D.shops.length === 30);
}

// ---- (13) README documents the tracker ----
{
  const md = fs.readFileSync(path.join(root, 'README.md'), 'utf8');
  t('README has a v27 section: anonymous tracker, web_analytics_events, migration must run by hand',
    md.includes('# mclivestream v27') && md.includes('web_analytics_events')
    && md.includes('js/analytics.js') && md.includes('chạy tay'));
}

console.log(`\n${pass} PASS, ${fail} FAIL`);
process.exit(fail ? 1 : 0);
