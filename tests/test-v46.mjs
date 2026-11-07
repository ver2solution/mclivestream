/* Test v46: 18 loi kiem toan bao mat/auth (F-01..F-17) + kien truc auth-ui.js.
   Chay: node tests/test-v46.mjs
   Phan A: assertion tinh tren code web v46-prep.
   Phan B: harness Node nap mclivestream-supabase.js voi client gia (stub)
   de kiem chung friendlyError, submitReview (chong trung + auth_user_id),
   submitJobPost (idempotency + thu lai 42703), incrementView (session hash),
   upload (ten uuid + loai + 5 MB), resetPassword/updateUser/signUp.
   LUU Y (F-01): sau va, INSERT kem approved tra 201 + dong bi ep ve
   pending (trigger chay truoc policy) — tieu chi dung la "khong co dong
   approved nao do client tao ra", KHONG phai ma 42501. Phan nay chi co
   the kiem chung live sau khi chay SQL; o day chi kiem tra file migration
   F-01 co du 3 policy + 3 trigger + 2 ham va code web van giu stripProtected.
   Du lieu: js/data.js da doi o v69 (19 img local + bop-reach imgSelf +
   11st pinned/pinOrder) — khoa bang hash v69, khong con so sanh v47-prep. */
import fs from 'node:fs';
import crypto from 'node:crypto';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
let pass = 0, fail = 0;
function t(name, ok) {
  if (ok) { pass++; console.log('PASS v46: ' + name); }
  else { fail++; console.log('FAIL v46: ' + name); }
}
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const sha256 = (p) => crypto.createHash('sha256').update(fs.readFileSync(path.join(root, p))).digest('hex');
const exists = (p) => fs.existsSync(path.join(root, p));

const apiSup = read('mclivestream-supabase.js');
const authUi = read('js/auth-ui.js');
const appJs = read('js/app.js');
const swJs = read('sw.js');
const mauHtml = read('danh-sach-mau.html');
const shopHtml = read('danh-sach-shop.html');
const toiHtml = read('trang-cua-toi.html');
const resetHtml = read('dat-lai-mat-khau.html');
const v47Data = (() => { try { return read('../mclivestream-final-v47-prep/js/data.js'); } catch (e) { return null; } })();

// --- F-01: migration + web giu stripProtected (kiem chung live sau khi chay SQL) ---
const f01 = read('../goals/mc-livestream-job-board/hidden_files/v46-migrations/supabase-migration-v46-f01-rls-pending.sql');
t('F-01: file migration co du 3 CREATE POLICY + 3 CREATE TRIGGER + 2 ham (ep pending)',
  (f01.match(/CREATE POLICY/gi) || []).length === 3
  && (f01.match(/CREATE TRIGGER/gi) || []).length === 3
  && f01.includes('force_pending_profiles_insert')
  && f01.includes('force_pending_shop_insert')
  && f01.includes("NEW.moderation_status := 'pending'"));
t('F-01: code web van giu stripProtected (khong gui approved tu client)',
  apiSup.includes('function stripProtected') && apiSup.includes('moderation_status'));

// --- F-02: 3 view cong khai ---
function fnBody(src, start, end) {
  const a = src.indexOf(start); const b = src.indexOf(end, a);
  return a === -1 || b === -1 ? '' : src.slice(a, b);
}
t('F-02: fetchPublicProfiles/fetchTopProfiles doc public_profiles qua publicProfileQuery (khong doc bang goc)',
  fnBody(apiSup, 'function publicProfileQuery()', 'async function fetchPublicProfiles').includes("from('public_profiles')")
  && fnBody(apiSup, 'async function fetchPublicProfiles', 'async function fetchTopProfiles').includes('publicProfileQuery()')
  && fnBody(apiSup, 'async function fetchTopProfiles', 'async function fetchMyProfile').includes('publicProfileQuery()'));
t('F-02: fetchApprovedShops doc public_shop_profiles + public_shop_job_posts',
  fnBody(apiSup, 'async function fetchApprovedShops', 'async function fetchMyShopProfile').includes("from('public_shop_profiles')")
  && fnBody(apiSup, 'async function fetchApprovedJobPosts', 'async function fetchMyJobPosts').includes("from('public_shop_job_posts')"));
t('F-02: migration co du 3 view cong khai + 3 GRANT (khong co view alias thu 4)',
  (() => { const f02 = read('../goals/mc-livestream-job-board/hidden_files/v46-migrations/supabase-migration-v46-f02-public-views.sql');
    return (f02.match(/^CREATE OR REPLACE VIEW public\./gim) || []).length === 3
      && f02.includes('public_profiles') && f02.includes('public_shop_profiles') && f02.includes('public_shop_job_posts')
      && !f02.includes('CREATE OR REPLACE VIEW public.profiles_public'); })());
t('F-02: renderer 2 trang dung j.shop_name (khong embed .shop_profiles/.shop_job_posts)',
  mauHtml.includes('j.shop_name') && shopHtml.includes('j.shop_name')
  && !mauHtml.includes('.shop_profiles(') && !mauHtml.includes('.shop_job_posts(')
  && !shopHtml.includes('.shop_profiles(') && !shopHtml.includes('.shop_job_posts('));

// --- F-03: dat lai mat khau ---
t('F-03: trang dat-lai-mat-khau.html co form 2 o mat khau + noindex + ve trang dang nhap rieng sau 2 giay (v68)',
  exists('dat-lai-mat-khau.html')
  && resetHtml.includes('id="resetForm"') && resetHtml.includes('id="resetPass"') && resetHtml.includes('id="resetPass2"')
  && resetHtml.includes('noindex') && resetHtml.includes("location.href='dang-nhap.html'")
  && resetHtml.includes('2000'));
t('F-03: resetPassword mac dinh redirectTo ve dat-lai-mat-khau.html; updatePassword co trong API',
  apiSup.includes("RESET_PASSWORD_URL = 'https://ver2solution.github.io/mclivestream/dat-lai-mat-khau.html'")
  && apiSup.includes('redirectTo: redirectTo || RESET_PASSWORD_URL')
  && apiSup.includes('async function updatePassword') && apiSup.includes('async function resetPassword'));
t('FIX v49: signUp truyen emailRedirectTo: SITE_URL (hang SITE_URL = trang chu /mclivestream/) de link xac nhan email khong ve goc',
  apiSup.includes("var SITE_URL = 'https://ver2solution.github.io/mclivestream/'")
  && fnBody(apiSup, 'async function signUp', 'async function signIn').includes('emailRedirectTo: SITE_URL'));
t('F-03: sitemap co trang dat-lai-mat-khau.html (62 URL, v68: +1 dang-nhap; v71: +5 bai moi; v77: +4 trang AdSense; v83: +1 tinh-lai-1111)',
  read('sitemap.xml').includes('dat-lai-mat-khau.html')
  && (read('sitemap.xml').match(/<loc>/g) || []).length === 62);

// --- F-04: file SQL policy goc ---
t('F-04: file SQL co 2 policy nguyen van (feedback_insert_public + reviews_public_insert)',
  (() => { const f04 = read('../goals/mc-livestream-job-board/hidden_files/v46-migrations/supabase-migration-v46-f04-feedback-reviews.sql');
    return f04.includes('"feedback_insert_public"') && f04.includes('for insert to anon, authenticated with check (true)')
      && f04.includes('"reviews_public_insert"') && f04.includes("with check (moderation_status = 'pending')"); })());

// --- F-05: marketing consent ---
t('F-05: auth-ui.js luu marketing_synced + dong bo updateUser + fallback Ver2Wallet',
  authUi.includes('syncMarketingConsent') && authUi.includes('marketing_synced')
  && authUi.includes('Ver2Wallet.saveMarketingConsent') && authUi.includes('marketing_opt_in')
  && authUi.includes('updateUser({ data: { marketing_synced: true } })'));

// --- F-06: chong thoi view ---
t('F-06: incrementView gui p_session_hash tu V2SAnalytics, bo qua khi khong co ma phien',
  apiSup.includes('p_session_hash') && apiSup.includes('V2SAnalytics.getSessionId()')
  && apiSup.includes('if (!hash) return;'));
t('F-06: file SQL web co bang profile_view_events + ham increment_profile_view (1 luot/ngay/ma phien)',
  read('../goals/mc-livestream-job-board/hidden_files/v46-migrations/supabase-migration-v46-web-sql.sql').includes('profile_view_events')
  && read('../goals/mc-livestream-job-board/hidden_files/v46-migrations/supabase-migration-v46-web-sql.sql').includes('increment_profile_view'));

// --- F-07: chong gui trung ---
t('F-07: guardSubmit co trong auth-ui.js + dung o auth handlers, form shop, trang-cua-toi, gop y',
  authUi.includes('function guardSubmit') && authUi.includes('guardSubmit(su,')
  && authUi.includes('guardSubmit(si,') && authUi.includes('guardSubmit(fp,')
  && shopHtml.includes('V2SAuthUI.guardSubmit') && toiHtml.includes('guardSubmit')
  && appJs.includes('guardSubmit'));
t('F-07: submitJobPost gui client_idempotency_key + SQL co cot + unique index',
  apiSup.includes('client_idempotency_key')
  && read('../goals/mc-livestream-job-board/hidden_files/v46-migrations/supabase-migration-v46-web-sql.sql').includes('idx_job_posts_idem'));

// --- F-08: mat khau toi thieu 8 ky tu ---
t('F-08: auth-ui.js + trang dat-lai-mat-khau kiem tra mat khau >= 8 ky tu',
  authUi.includes('Mật khẩu cần ít nhất 8 ký tự') && resetHtml.includes('Mật khẩu cần ít nhất 8 ký tự'));

// --- F-09: loi tieng Viet ---
t('F-09: friendlyError dich dung: sai mat khau / email chua xac nhan / gioi han email / 23505 / mang',
  apiSup.includes('function friendlyError')
  && apiSup.includes('Email hoặc mật khẩu chưa đúng.') && apiSup.includes('Email chưa được xác nhận')
  && apiSup.includes('Đã gửi quá nhiều email trong 1 giờ') && apiSup.includes('Nội dung này đã được gửi rồi.')
  && apiSup.includes('Không kết nối được mạng'));
t('F-09: 3 trang + app.js hien loi qua friendlyError/ferr, khong in err.message tho ra UI',
  !/\+ ?(err|e|upErr)\.message/.test(shopHtml) && !/\+ ?(err|e|upErr)\.message/.test(mauHtml)
  && !/\+ ?(err|e|upErr)\.message/.test(toiHtml) && !/\+ ?(err|e|upErr)\.message/.test(appJs)
  && shopHtml.includes('friendlyError') && toiHtml.includes('friendlyError') && appJs.includes('friendlyError'));

// --- F-10: upload an toan ---
t('F-10: safeUploadName (uuid + duoi an toan) + gioi han 5 MB + kiem tra loai file anh/video',
  apiSup.includes('function safeUploadName') && apiSup.includes('5 * 1024 * 1024')
  && apiSup.includes("'image/jpeg'") && apiSup.includes("'video/mp4'")
  && apiSup.includes('File quá lớn, tối đa 5 MB mỗi file.'));
t('F-10: file SQL storage co policy media_owner_insert (bucket profile-media)',
  read('../goals/mc-livestream-job-board/hidden_files/v46-migrations/supabase-migration-v46-f10-storage.sql').includes('media_owner_insert')
  && read('../goals/mc-livestream-job-board/hidden_files/v46-migrations/supabase-migration-v46-f10-storage.sql').includes("bucket_id = 'profile-media'"));

// --- F-11: siet policy vi ---
t('F-11: file SQL siet wallet chi cho topup_request o pending',
  read('../goals/mc-livestream-job-board/hidden_files/v46-migrations/supabase-migration-v46-f11-wallet-policy.sql').includes("type = 'topup_request'"));

// --- F-12: 1 nguon trang thai duy nhat ---
t('F-12: auth-ui.js co onAuthStateChange + ensureSessionListener + getSession dung chung',
  authUi.includes('onAuthStateChange') && authUi.includes('ensureSessionListener')
  && authUi.includes('function getSession') && toiHtml.includes('V2SAuthUI.getSession()'));

// --- F-14: cong dang tin / ho so ---
t('F-14: shop co shopProfileGate + cau huong dan; trang-cua-toi co cau huong dan dang nhap',
  shopHtml.includes('shopProfileGate') && shopHtml.includes('Bạn cần đăng nhập để tạo / sửa hồ sơ shop.')
  && toiHtml.includes('Bạn cần đăng nhập để xem / sửa hồ sơ của mình.'));

// --- F-15: loi tai session ---
t('F-15: showUser bao loi tai session thay cho catch trong',
  authUi.includes('Không kiểm tra được trạng thái đăng nhập, hãy tải lại trang.'));

// --- F-16: siet analytics ---
t('F-16: file SQL web co policy analytics da siet (chi 5 loai event + gioi han do dai)',
  read('../goals/mc-livestream-job-board/hidden_files/v46-migrations/supabase-migration-v46-web-sql.sql').includes('web_analytics_events_anon_insert')
  && read('../goals/mc-livestream-job-board/hidden_files/v46-migrations/supabase-migration-v46-web-sql.sql').includes("event_type IN ('pageview', 'dwell', 'click', 'js_error', 'form_result')"));

// --- F-17: chong danh gia trung ---
t('F-17: submitReview gui auth_user_id + chong trung 60 giay (localStorage) + SQL co unique index',
  apiSup.includes('v2s_review_') && apiSup.includes('auth_user_id')
  && read('../goals/mc-livestream-job-board/hidden_files/v46-migrations/supabase-migration-v46-web-sql.sql').includes('idx_reviews_one_per_profile_account'));

// --- Kien truc: auth-ui.js dung chung ---
t('Kien truc: js/auth-ui.js ton tai (13 KB) + ca 2 trang goi initAuthUI + khong con showAuthView inline',
  exists('js/auth-ui.js') && fs.statSync(path.join(root, 'js/auth-ui.js')).size > 10000
  && mauHtml.includes("V2SAuthUI.initAuthUI({") && shopHtml.includes("V2SAuthUI.initAuthUI({")
  && !mauHtml.includes('function showAuthView(v)') && !shopHtml.includes('function showAuthView(v)'));
t('Kien truc: moi trang HTML (goc + bai-viet) deu nap js/auth-ui.js',
  (() => {
    const roots = fs.readdirSync(root).filter(f => f.endsWith('.html'));
    const posts = fs.readdirSync(path.join(root, 'bai-viet')).filter(f => f.endsWith('.html'));
    const missing = [];
    for (const f of roots) if (!read(f).includes('js/auth-ui.js')) missing.push(f);
    for (const f of posts) if (!read('bai-viet/' + f).includes('js/auth-ui.js')) missing.push('bai-viet/' + f);
    console.log('   (trang goc: ' + roots.length + ', bai-viet: ' + posts.length + ', thieu: ' + (missing.join(', ') || 'khong') + ')');
    return missing.length === 0;
  })());
t('Kien truc: sw.js CACHE = v84-shell-1',
  swJs.includes("const CACHE = 'v84-shell-1';") && swJs.includes('/* v60 service worker'));
t('v69: js/data.js da doi co chu dich (19 img local + bop-reach imgSelf + 11st pinned/pinOrder) — khong con giong v47-prep (sha256)',
  sha256('js/data.js') === '642a8e3fdb09f0d23d363741692f3da7106586aff84dd47d1bc81613b514fc57');

// --- Phan B: harness chay that API ---
(async () => {
  const src = apiSup;
  const lsStore = {};
  const calls = { rpc: [], storageUpload: [], inserts: [], auth: [] };
  let currentSession = { user: { id: 'user-1', email: 'a@b.c' } };
  let queryBehavior = {};
  let insertBehavior = {};
  function resolveQuery(q) {
    if (q._op === 'insert' || q._op === 'upsert') {
      // Chup nhanh payload luc goi (code co the doi cung object sau do,
      // vi du submitJobPost delete client_idempotency_key khi thu lai).
      calls.inserts.push({ table: q._table, op: q._op, payload: Object.assign({}, q._payload) });
      const queue = insertBehavior[q._table];
      if (queue && queue.length) return queue.shift();
      return { data: [Object.assign({ id: 'new-1' }, q._payload || {})], error: null };
    }
    const fn = queryBehavior[q._table];
    if (fn) return fn(q);
    return { data: [], error: null };
  }
  function resolveSingle(q) {
    const r = resolveQuery(q);
    if (Array.isArray(r.data)) return { data: r.data[0] || null, error: r.error };
    return r;
  }
  function makeQuery(table) {
    const q = { _table: table, _cols: null, _op: null, _payload: null,
      select(c) { q._cols = c; return q; }, eq() { return q; }, order() { return q; }, limit() { return q; },
      insert(p) { q._op = 'insert'; q._payload = p; return q; },
      upsert(p) { q._op = 'upsert'; q._payload = p; return q; },
      single() { return Promise.resolve(resolveSingle(q)); },
      maybeSingle() { return Promise.resolve(resolveSingle(q)); },
      then(res, rej) { return Promise.resolve(resolveQuery(q)).then(res, rej); },
    };
    return q;
  }
  const fakeClient = {
    auth: {
      getSession: async () => ({ data: { session: currentSession }, error: null }),
      signUp: async (args) => { calls.auth.push({ op: 'signUp', args }); return { data: { user: { id: 'user-1' } }, error: null }; },
      signInWithPassword: async (args) => { calls.auth.push({ op: 'signIn', args }); return { data: { session: currentSession }, error: null }; },
      signOut: async () => { calls.auth.push({ op: 'signOut' }); return { error: null }; },
      resetPasswordForEmail: async (email, opts) => { calls.auth.push({ op: 'reset', email, opts }); return { data: {}, error: null }; },
      updateUser: async (args) => { calls.auth.push({ op: 'updateUser', args }); return { data: { user: {} }, error: null }; },
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
    },
    from: (table) => makeQuery(table),
    rpc: (name, params) => { calls.rpc.push({ name, params }); return Promise.resolve({ data: null, error: null }); },
    storage: { from: (bucket) => ({
      upload: async (p, file) => { calls.storageUpload.push({ bucket, path: p, file }); return { data: { path: p }, error: null }; },
      getPublicUrl: (p) => ({ data: { publicUrl: 'https://cdn.test/' + p } }),
    }) },
  };
  const sb = {
    console,
    crypto: { randomUUID: () => 'uuid-test-1234' },
    window: {
      MCLIVESTREAM_SUPABASE_CONFIG: { url: 'https://test.supabase.co', anonKey: 'anon-key-xyz' },
      supabase: { createClient: () => fakeClient },
      V2SAnalytics: { getSessionId: () => 'sess_test123' },
      localStorage: {
        getItem: (k) => (k in lsStore ? lsStore[k] : null),
        setItem: (k, v) => { lsStore[k] = String(v); },
        removeItem: (k) => { delete lsStore[k]; },
      },
    },
  };
  vm.createContext(sb);
  vm.runInContext(src, sb, { filename: 'mclivestream-supabase.js' });
  const API = sb.window.McLivestreamAPI;
  t('Harness: McLivestreamAPI nap duoc (co friendlyError, submitReview, submitJobPost, incrementView, upload)',
    API && typeof API.friendlyError === 'function' && typeof API.submitReview === 'function'
    && typeof API.submitJobPost === 'function' && typeof API.incrementView === 'function'
    && typeof API.uploadAlbumImages === 'function');

  // friendlyError
  t('Harness F-09: friendlyError dich dung 8 truong hop',
    API.friendlyError(new Error('Invalid login credentials')) === 'Email hoặc mật khẩu chưa đúng.'
    && API.friendlyError(new Error('Email not confirmed')) === 'Email chưa được xác nhận. Hãy kiểm tra hộp thư và bấm link xác nhận.'
    && API.friendlyError(new Error('email rate limit exceeded')) === 'Đã gửi quá nhiều email trong 1 giờ. Hãy thử lại sau 1 giờ.'
    && API.friendlyError({ code: '23505' }, 'review') === 'Bạn đã đánh giá hồ sơ này rồi.'
    && API.friendlyError({ code: '23505' }, 'jobpost') === 'Tin này đã được gửi, hãy xem mục tin của tôi.'
    && API.friendlyError({ code: '23505' }) === 'Nội dung này đã được gửi rồi.'
    && API.friendlyError(new Error('Failed to fetch')) === 'Không kết nối được mạng, hãy kiểm tra lại kết nối rồi thử lại.'
    && API.friendlyError(new Error('xyz unknown')) === 'Đã có lỗi xảy ra, hãy thử lại sau.');

  // resetPassword / updatePassword / signUp
  await API.resetPassword('a@b.c');
  t('Harness F-03: resetPassword mac dinh redirectTo dat-lai-mat-khau.html',
    calls.auth[calls.auth.length - 1].opts.redirectTo === 'https://ver2solution.github.io/mclivestream/dat-lai-mat-khau.html');
  await API.resetPassword('a@b.c', 'https://example.com/x');
  t('Harness F-03: resetPassword van nhan redirectTo tuy chinh',
    calls.auth[calls.auth.length - 1].opts.redirectTo === 'https://example.com/x');
  await API.updatePassword('newpass123');
  t('Harness F-03: updatePassword goi auth.updateUser({password})',
    calls.auth[calls.auth.length - 1].op === 'updateUser'
    && calls.auth[calls.auth.length - 1].args.password === 'newpass123');
  await API.signUp({ email: 'b@c.d', password: 'password123', accountType: 'shop', marketingOptIn: true });
  t('Harness F-05: signUp luu account_type + marketing_opt_in vao user_metadata',
    calls.auth[calls.auth.length - 1].args.options.data.account_type === 'shop'
    && calls.auth[calls.auth.length - 1].args.options.data.marketing_opt_in === true);
  await API.signUp({ email: 'c@d.e', password: 'password123' });
  t('Harness F-05: signUp khong co accountType thi account_type = chuoi rong (khong doan loai)',
    calls.auth[calls.auth.length - 1].args.options.data.account_type === '');
  await API.signUp({ email: 'd@e.f', password: 'password123' });
  t('Harness FIX v49: signUp truyen emailRedirectTo ve trang chu /mclivestream/',
    calls.auth[calls.auth.length - 1].args.options.emailRedirectTo === 'https://ver2solution.github.io/mclivestream/');

  // submitReview
  const before = calls.inserts.length;
  await API.submitReview('p1', { rating: 5, comment: 'Nội dung đánh giá dài đủ 20 ký tự nhé ạ', reviewerName: 'Khách' });
  const r1 = calls.inserts[before];
  t('Harness F-17: submitReview gui auth_user_id + moderation_status pending + reviewer_name',
    r1.table === 'profile_reviews' && r1.payload.auth_user_id === 'user-1'
    && r1.payload.moderation_status === 'pending' && r1.payload.rating === 5
    && r1.payload.profile_id === 'p1' && r1.payload.reviewer_name === 'Khách');
  let throttleErr = null;
  try { await API.submitReview('p1', { rating: 5, comment: 'Nội dung đánh giá dài đủ 20 ký tự nhé ạ', reviewerName: 'Khách' }); }
  catch (e) { throttleErr = e; }
  t('Harness F-17: danh gia lai trong 60 giay bi chan (throttle localStorage)',
    throttleErr && throttleErr.message.indexOf('vừa đánh giá') !== -1);
  insertBehavior['profile_reviews'] = [{ error: { code: '23505', message: 'duplicate key' } }];
  let dupErr = null;
  try { await API.submitReview('p3', { rating: 4, comment: 'Nội dung đánh giá dài đủ 20 ký tự nhé ạ', reviewerName: 'Khách' }); }
  catch (e) { dupErr = e; }
  t('Harness F-17: loi 23505 tu server duoc nem ra (de UI dich "Bạn đã đánh giá rồi")',
    dupErr && dupErr.code === '23505');
  currentSession = null;
  await API.submitReview('p4', { rating: 5, comment: 'Nội dung đánh giá dài đủ 20 ký tự nhé ạ', reviewerName: 'Khách' });
  const rGuest = calls.inserts[calls.inserts.length - 1];
  t('Harness F-17: khach vang lai gui danh gia khong kem auth_user_id',
    rGuest.table === 'profile_reviews' && !('auth_user_id' in rGuest.payload));
  currentSession = { user: { id: 'user-1', email: 'a@b.c' } };

  // submitJobPost
  queryBehavior['shop_profiles'] = () => ({ data: { id: 'shop-1', shop_name: 'Shop Test' }, error: null });
  const jobPost = { title: 'Tuyển mẫu live', description: 'Mô tả công việc', province: 'Hà Nội', field: 'Mỹ phẩm', schedule: 'Tối', salary: '100k-150k/h', channels: ['TikTok'], contact_zalo: '0329983699' };
  const jb = calls.inserts.length;
  await API.submitJobPost(jobPost);
  const j1 = calls.inserts[jb];
  t('Harness F-07: submitJobPost gui client_idempotency_key + auth_user_id + shop_id (khong gui moderation_status — trigger F-01 ep pending)',
    j1.table === 'shop_job_posts' && typeof j1.payload.client_idempotency_key === 'string'
    && j1.payload.client_idempotency_key.length > 0 && j1.payload.auth_user_id === 'user-1'
    && j1.payload.shop_id === 'shop-1' && !('moderation_status' in j1.payload));
  insertBehavior['shop_job_posts'] = [
    { error: { code: '42703', message: 'column "client_idempotency_key" does not exist' } },
    { data: [{ id: 'job-9' }], error: null },
  ];
  const jb2 = calls.inserts.length;
  const job2 = await API.submitJobPost(jobPost);
  t('Harness F-07: cot chua co (42703) thi thu lai khong kem khoa idempotency va van thanh cong',
    calls.inserts.length === jb2 + 2
    && calls.inserts[jb2].payload.client_idempotency_key
    && !('client_idempotency_key' in calls.inserts[jb2 + 1].payload)
    && job2 && job2.id === 'job-9');
  insertBehavior['shop_job_posts'] = [{ error: { code: '23505', message: 'duplicate key' } }];
  let jobDup = null;
  try { await API.submitJobPost(jobPost); } catch (e) { jobDup = e; }
  t('Harness F-07: loi 23505 khi dang tin duoc nem ra (de UI dich "Tin này đã được gửi")',
    jobDup && jobDup.code === '23505');
  delete insertBehavior['shop_job_posts'];

  // incrementView
  const rpcBefore = calls.rpc.length;
  await API.incrementView('11111111-1111-1111-1111-111111111111');
  t('Harness F-06: incrementView gui p_session_hash tu V2SAnalytics',
    calls.rpc.length === rpcBefore + 1 && calls.rpc[calls.rpc.length - 1].name === 'increment_profile_view'
    && calls.rpc[calls.rpc.length - 1].params.p_session_hash === 'sess_test123'
    && calls.rpc[calls.rpc.length - 1].params.p_profile_id === '11111111-1111-1111-1111-111111111111');
  const rpcBefore2 = calls.rpc.length;
  sb.window.V2SAnalytics = null;
  await API.incrementView('11111111-1111-1111-1111-111111111111');
  t('Harness F-06: khong co V2SAnalytics thi khong gui rpc (khong dem view)',
    calls.rpc.length === rpcBefore2);
  sb.window.V2SAnalytics = { getSessionId: () => 'sess_test123' };

  // uploads
  const up1 = await API.uploadAlbumImages([{ name: 'anh.jpg', type: 'image/jpeg', size: 1000 }]);
  t('Harness F-10: upload album luu duoi ten uuid (khong dung ten goc), tra URL chuoi',
    up1[0] === 'https://cdn.test/user-1/album/uuid-test-1234.jpg'
    && calls.storageUpload[calls.storageUpload.length - 1].path === 'user-1/album/uuid-test-1234.jpg');
  let evilExt = null;
  try { await API.uploadAlbumImages([{ name: '../../evil.html', type: 'image/jpeg', size: 1000 }]); } catch (e) { evilExt = e; }
  t('Harness F-10: file duoi .html bi tu choi ngay ca khi MIME khai la anh (check ca duoi file)',
    evilExt && evilExt.message.indexOf('chưa được hỗ trợ') !== -1);
  await API.uploadAlbumImages([{ name: '../../evil.jpg', type: 'image/jpeg', size: 1000 }]);
  t('Harness F-10: ten file chua ../ duoc doi ve uuid (khong leo thu muc)',
    calls.storageUpload[calls.storageUpload.length - 1].path === 'user-1/album/uuid-test-1234.jpg');
  let badType = null;
  try { await API.uploadAlbumImages([{ name: 'x.html', type: 'text/html', size: 100 }]); } catch (e) { badType = e; }
  t('Harness F-10: file khong phai anh bi tu choi (loai chua ho tro)',
    badType && badType.message.indexOf('chưa được hỗ trợ') !== -1);
  let bigFile = null;
  try { await API.uploadAlbumImages([{ name: 'big.jpg', type: 'image/jpeg', size: 6 * 1024 * 1024 }]); } catch (e) { bigFile = e; }
  t('Harness F-10: file tren 5 MB bi tu choi',
    bigFile && bigFile.message.indexOf('5 MB') !== -1);
  const logoUrl = await API.uploadShopLogo({ name: 'logo.png', type: 'image/png', size: 500 });
  t('Harness F-10: upload logo shop luu duoi shop/<uid>/logo/<uuid>.png',
    logoUrl === 'https://cdn.test/shop/user-1/logo/uuid-test-1234.png'
    && calls.storageUpload[calls.storageUpload.length - 1].path === 'shop/user-1/logo/uuid-test-1234.png');
  const demoUrl = await API.uploadDemoVideo({ name: 'demo.mp4', type: 'video/mp4', size: 4 * 1024 * 1024 });
  t('Harness F-10: upload video demo mp4 4 MB duoc chap nhan duoi ten uuid',
    demoUrl === 'https://cdn.test/user-1/demo/uuid-test-1234.mp4'
    && calls.storageUpload[calls.storageUpload.length - 1].path === 'user-1/demo/uuid-test-1234.mp4');
  let badVideo = null;
  try { await API.uploadDemoVideo({ name: 'demo.avi', type: 'video/avi', size: 1000 }); } catch (e) { badVideo = e; }
  t('Harness F-10: video avi bi tu choi (chi mp4/webm/quicktime)',
    badVideo && badVideo.message.indexOf('chưa được hỗ trợ') !== -1);

  console.log('\nTOTAL v46: ' + pass + ' PASS, ' + fail + ' FAIL');
  process.exit(fail ? 1 : 0);
})();
