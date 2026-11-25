// test-v287-utm-dashboard.mjs — #25: bang UTM trong console admin (v442, giai doan 1a)
// Truoc fix: UTM da duoc ghi live vao cot `page` (94 dong/2 ngay, 24/11) nhung
// console khong co cho nao doc UTM — khong biet kenh/chien dich nao keo dang ky.
// Sau fix: the UTM trong tab Tong quan (quan-tri.html) + loadUtmStats() trong
// js/admin.js: goi get_analytics_summary(p_days=7), tach UTM tu `page`, hien
// luot xem theo UTM + dang ky thanh cong theo UTM + ti le chuyen doi theo ngay
// + muc rieng "khong gan duoc UTM".
// HIEU DINH (25/11): RPC KHONG tra session_id nen ti le la THEO NGAY, khong phai
// pheu theo phien — xem comment v442 trong admin.js.
// Chay: node tests/test-v287-utm-dashboard.mjs (tu goc repo hoac goc stage).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let pass = 0, fail = 0;
function check(name, ok, extra) {
  if (ok) { pass++; console.log('PASS ' + name); }
  else { fail++; console.log('FAIL ' + name + (extra !== undefined ? ' — ' + extra : '')); }
}
const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);

const html = fs.readFileSync(path.join(root, 'quan-tri.html'), 'utf8');
const adminJs = fs.readFileSync(path.join(root, 'js/admin.js'), 'utf8');

// --- Tinh: HTML ---
check('quan-tri.html co #qtUtmMsg', html.includes('id="qtUtmMsg"'));
check('quan-tri.html co #qtUtmWrap', html.includes('id="qtUtmWrap"'));
check('quan-tri.html co #qtUtmTrafficBody', html.includes('id="qtUtmTrafficBody"'));
check('quan-tri.html co #qtUtmSignupBody', html.includes('id="qtUtmSignupBody"'));
check('quan-tri.html co #qtUtmNoUtm', html.includes('id="qtUtmNoUtm"'));
check('the UTM nam trong tab Tong quan (sau admTab-overview, truoc admTab-comments)',
  html.indexOf('id="qtUtmMsg"') > html.indexOf('id="admTab-overview"')
  && html.indexOf('id="qtUtmMsg"') < html.indexOf('id="admTab-comments"'));
check('the UTM ghi ro ti le theo ngay, khong phai pheu phien',
  html.includes('Tỉ lệ chuyển đổi tính THEO NGÀY') && html.includes('không trả session_id'));

// --- Tinh: admin.js ---
check('admin.js co parseUtm', /function parseUtm\(page\)/.test(adminJs));
check('admin.js co groupUtmRows', /function groupUtmRows\(rows\)/.test(adminJs));
check('admin.js co loadUtmStats', /async function loadUtmStats\(\)/.test(adminJs));
check('loadOverview goi loadUtmStats', adminJs.includes('await loadUtmStats();'));
check('loadUtmStats goi get_analytics_summary p_days=7',
  adminJs.includes("rpc('get_analytics_summary', { p_days: 7 })"));
check('loadUtmStats dung 3 element dang ky (signUp/shopSignUp/mauSignUp)',
  adminJs.includes("var UTM_SIGNUP_ELEMENTS = ['signUp', 'shopSignUp', 'mauSignUp'];"));
check('gia tri UTM render qua esc()', adminJs.includes('esc(parts[1])') && adminJs.includes('esc(parts[3]'));
const utmRegion = adminJs.slice(adminJs.indexOf('UTM dashboard 1a (v442'), adminJs.indexOf('async function loadOverview()'));
check('code moi KHONG goi window.confirm/prompt (luat v217)',
  utmRegion.length > 1000 && !/window\.(confirm|prompt)\s*\(/.test(utmRegion));
check('admin.js co ghi chu hieu dinh session_id',
  adminJs.includes('RPC KHONG tra session_id'));

// --- Logic thuan: trich parseUtm + groupUtmRows tu admin.js, eval trong Node ---
const mElems = adminJs.match(/var UTM_SIGNUP_ELEMENTS = \[[^\]]*\];/);
const mParse = adminJs.match(/function parseUtm\(page\) \{[\s\S]*?\n  \}/);
const mGroup = adminJs.match(/function groupUtmRows\(rows\) \{[\s\S]*?\n  \}/);
check('trich duoc UTM_SIGNUP_ELEMENTS', !!mElems);
check('trich duoc parseUtm tu admin.js', !!mParse);
check('trich duoc groupUtmRows tu admin.js', !!mGroup);
let fns = null;
if (mElems && mParse && mGroup) {
  fns = vm.runInNewContext(mElems[0] + '\n' + mParse[0] + '\n' + mGroup[0] + '\n({ parseUtm, groupUtmRows });', {});
}
if (fns) {
  const { parseUtm, groupUtmRows } = fns;
  check('parseUtm: du 5 tham so',
    eq(parseUtm('/dang-ky.html?utm_source=facebook&utm_medium=reel&utm_campaign=video-daily&utm_content=reel-01&utm_term=x'),
      { source: 'facebook', medium: 'reel', campaign: 'video-daily', content: 'reel-01', term: 'x' }),
    JSON.stringify(parseUtm('/dang-ky.html?utm_source=facebook&utm_medium=reel&utm_campaign=video-daily')));
  check('parseUtm: giai ma %20 va + thanh khoang trang',
    parseUtm('/x.html?utm_source=facebook&utm_campaign=video%20daily').campaign === 'video daily'
    && parseUtm('/x.html?utm_source=facebook&utm_campaign=video+daily').campaign === 'video daily');
  check('parseUtm: khong co query -> null', parseUtm('/bai-viet/x.html') === null);
  check('parseUtm: co utm_medium nhung khong co utm_source -> null',
    parseUtm('/x.html?utm_medium=reel&utm_campaign=c1') === null);
  check('parseUtm: utm_source rong -> null', parseUtm('/x.html?utm_source=&utm_medium=reel') === null);
  check('parseUtm: UTM dung sau tham so khac van doc duoc',
    parseUtm('/x.html?foo=1&utm_source=tiktok&utm_medium=video&utm_campaign=c1').source === 'tiktok');

  const rows = [
    { day: '2026-11-25', page: '/bai-viet/x.html?utm_source=facebook&utm_medium=reel&utm_campaign=video-daily', event_type: 'pageview', element: null, error_message: null, event_count: 60 },
    { day: '2026-11-25', page: '/bai-viet/y.html?utm_source=youtube&utm_medium=description&utm_campaign=video-daily&utm_content=reel-01', event_type: 'pageview', element: null, error_message: null, event_count: 34 },
    { day: '2026-11-25', page: '/bai-viet/z.html', event_type: 'pageview', element: null, error_message: null, event_count: 500 },
    { day: '2026-11-25', page: '/dang-ky.html?utm_source=facebook&utm_medium=reel&utm_campaign=video-daily', event_type: 'form_result', element: 'signUp', error_message: null, event_count: 3 },
    { day: '2026-11-25', page: '/dang-ky.html?utm_source=facebook&utm_medium=reel&utm_campaign=video-daily', event_type: 'form_result', element: 'signUp', error_message: 'SĐT đã tồn tại', event_count: 2 },
    { day: '2026-11-25', page: '/dang-ky.html', event_type: 'form_result', element: 'signUp', error_message: null, event_count: 5 },
    { day: '2026-11-25', page: '/dang-ky.html?utm_source=youtube&utm_medium=description&utm_campaign=video-daily&utm_content=reel-01', event_type: 'form_result', element: 'mauSignUp', error_message: null, event_count: 1 },
    { day: '2026-11-24', page: '/dang-ky.html?utm_source=facebook&utm_medium=reel&utm_campaign=video-daily', event_type: 'form_result', element: 'shopSignUp', error_message: null, event_count: 2 },
    { day: '2026-11-25', page: '/dang-ky.html?utm_source=facebook&utm_medium=reel&utm_campaign=video-daily', event_type: 'form_result', element: 'otherBtn', error_message: null, event_count: 9 },
    { day: '2026-11-25', page: '/dang-ky.html?utm_source=facebook&utm_medium=reel&utm_campaign=video-daily', event_type: 'click', element: 'signUp', error_message: null, event_count: 40 },
    { day: '2026-11-25', page: '/dang-ky.html?utm_source=facebook&utm_medium=reel&utm_campaign=video-daily', event_type: 'dwell', element: null, error_message: null, event_count: 7, total_dwell_seconds: 100 },
  ];
  const g = groupUtmRows(rows);
  check('traffic facebook 25/11 = 60 (pageview co UTM)', g.traffic['2026-11-25|facebook|reel|video-daily|'] === 60, JSON.stringify(g.traffic));
  check('traffic youtube 25/11 = 34 (co utm_content)', g.traffic['2026-11-25|youtube|description|video-daily|reel-01'] === 34, JSON.stringify(g.traffic));
  check('pageview khong UTM khong vao traffic', Object.keys(g.traffic).length === 2, JSON.stringify(Object.keys(g.traffic)));
  check('signups facebook 25/11 = 3 (chi form_result thanh cong)', g.signups['2026-11-25|facebook|reel|video-daily|'] === 3, JSON.stringify(g.signups));
  check('signups youtube 25/11 = 1 (element mauSignUp tinh)', g.signups['2026-11-25|youtube|description|video-daily|reel-01'] === 1, JSON.stringify(g.signups));
  check('signups facebook 24/11 = 2 (tach theo ngay, element shopSignUp tinh)', g.signups['2026-11-24|facebook|reel|video-daily|'] === 2, JSON.stringify(g.signups));
  check('form_result loi (co error_message) KHONG tinh dang ky', g.signups['2026-11-25|facebook|reel|video-daily|'] === 3);
  check('form_result sai element KHONG tinh', Object.keys(g.signups).length === 3, JSON.stringify(Object.keys(g.signups)));
  check('click/dwell KHONG tinh vao traffic hay signups', g.traffic['2026-11-25|facebook|reel|video-daily|'] === 60);
  check('dang ky khong UTM = 5 (muc rieng, khong gop vao 0)', g.noUtmSignups === 5, String(g.noUtmSignups));
  check('dang ky khong UTM tach theo ngay', g.noUtmByDay['2026-11-25'] === 5, JSON.stringify(g.noUtmByDay));
  check('ti le chuyen doi facebook 25/11 = 3/60 = 5.0%',
    ((g.signups['2026-11-25|facebook|reel|video-daily|'] / g.traffic['2026-11-25|facebook|reel|video-daily|']) * 100).toFixed(1) + '%' === '5.0%');
  check('capped=false khi < 1000 dong', groupUtmRows(rows).capped === false);
  const many = Array.from({ length: 1000 }, (_, i) => ({ day: '2026-11-25', page: '/x.html?utm_source=s' + i, event_type: 'pageview', element: null, error_message: null, event_count: 1 }));
  check('capped=true khi dung 1000 dong', groupUtmRows(many).capped === true);
  check('groupUtmRows chiu duoc rows null', groupUtmRows(null).noUtmSignups === 0);
}

console.log('\n' + pass + ' PASS, ' + fail + ' FAIL');
process.exit(fail ? 1 : 0);
