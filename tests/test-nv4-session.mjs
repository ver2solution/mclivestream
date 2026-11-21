/* tests/test-nv4-session.mjs — NV4 goi A (21/11/2026, nhanh feat/nv4-nv5-gia-a).
   Kiem: session_id ben 30 ngay trong localStorage (D3) + ?next= o 3 nut Dang ky (D5).
   Chay: node tests/test-nv4-session.mjs  (exit 0 = PASS). */
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const require = createRequire(import.meta.url);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let pass = 0, total = 0;
function check(name, ok) { total++; if (ok) pass++; console.log((ok ? 'PASS' : 'FAIL') + ' — ' + name); }

function makeStorage() {
  const m = new Map();
  return {
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => { m.set(String(k), String(v)); },
    removeItem: (k) => { m.delete(k); },
    _map: m,
  };
}

/* ---- Session: nap analytics.js that voi window gia lap ---- */
function loadAnalytics(localStorage, sessionStorage) {
  global.window = {
    localStorage, sessionStorage,
    location: { pathname: '/bai-viet/x.html', search: '', hash: '' },
  };
  delete global.document; /* Node 24: global.navigator chi doc, khong gan lai — analytics.js khong can no luc nap. */
  const modPath = path.join(ROOT, 'js', 'analytics.js');
  delete require.cache[require.resolve(modPath)];
  return require(modPath);
}

const ls = makeStorage();
const ss = makeStorage();
let api = loadAnalytics(ls, ss);
const id1 = api.getSessionId();
check('session moi co dang sess_', typeof id1 === 'string' && id1.startsWith('sess_'));
const stored = ls.getItem('v2s_analytics_session');
let parsed = null;
try { parsed = JSON.parse(stored); } catch (e) { parsed = null; }
check('session luu JSON {id, ts} trong localStorage', !!parsed && parsed.id === id1 && typeof parsed.ts === 'number');
check('goi lai tra ve cung id', api.getSessionId() === id1);

/* Mo lai trang (module moi, cung localStorage) -> giu nguyen id (D3, 1 ngay sau). */
api = loadAnalytics(ls, ss);
check('tai lai trang van giu session_id', api.getSessionId() === id1);

/* 31 ngay sau -> id moi (D3). */
const old = JSON.parse(ls.getItem('v2s_analytics_session'));
ls.setItem('v2s_analytics_session', JSON.stringify({ id: old.id, ts: Date.now() - 31 * 24 * 60 * 60 * 1000 }));
api = loadAnalytics(ls, ss);
const id2 = api.getSessionId();
check('sau 31 ngay tao session_id moi', typeof id2 === 'string' && id2.startsWith('sess_') && id2 !== id1);

/* Phien cu trong sessionStorage duoc nhan 1 lan. */
const ls2 = makeStorage();
const ss2 = makeStorage();
ss2.setItem('v2s_analytics_session', 'sess_legacy_abc123');
api = loadAnalytics(ls2, ss2);
check('nhan phien cu tu sessionStorage', api.getSessionId() === 'sess_legacy_abc123');
check('phien cu duoc ghi sang localStorage', (() => { try { return JSON.parse(ls2.getItem('v2s_analytics_session')).id === 'sess_legacy_abc123'; } catch (e) { return false; } })());

/* ---- ?next= o 3 nut Dang ky (D5): kiem chuoi trong app.js ---- */
const appSrc = fs.readFileSync(path.join(ROOT, 'js', 'app.js'), 'utf8');
check('PIN_LONGER_HTML dung NEXT_QS (2 link dang ky + 1 link dang nhap)',
  (appSrc.match(/dang-ky\.html' \+ NEXT_QS/g) || []).length >= 2 &&
  appSrc.includes(`dang-nhap.html' + NEXT_QS`));
check('ownerNoteHTML dung NEXT_AMP', appSrc.includes(`dang-ky.html?type='+type+NEXT_AMP`));
check('popup Dang ky ngay dung NEXT_QS', appSrc.includes(`dang-ky.html' + NEXT_QS + '"`));
check('popup co dong loi ich nhan lai ho so', appSrc.includes('Nhận lại hồ sơ của bạn để sửa, ẩn, ứng tuyển nhanh — miễn phí.'));
check('NEXT_VALUE tinh tu pathname + search + hash',
  appSrc.includes('window.location.pathname + window.location.search + window.location.hash'));

console.log(`\nNV4-SESSION: ${pass}/${total} PASS`);
process.exit(pass === total ? 0 : 1);
