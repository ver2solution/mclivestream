/* v46 — Module auth chung cho trang Dành cho Mẫu + Dành cho Shop.
   Gộp code auth trùng lặp ~100% giữa 2 trang (kiểm toán §3.1: 7 khối —
   msg, api, 3 handler đăng ký/đăng nhập/quên mật khẩu, showUser, đăng
   xuất + gọi showUser lúc tải trang; chỉ khác tiền tố id ma* ↔ sh* và
   loại tài khoản 'model' ↔ 'shop'). 2 trang chỉ còn vài dòng gọi
   initAuthUI({...}) + nạp script này.
   Module này cũng là nơi duy nhất chứa: chống gửi trùng guardSubmit
   (F-07), dịch lỗi friendlyError (F-09 — hàm đặt trong
   mclivestream-supabase.js, module này gọi qua McLivestreamAPI),
   kiểm tra mật khẩu tối thiểu 8 ký tự (F-08), đồng bộ trạng thái bằng
   onAuthStateChange (F-12), đồng bộ đồng ý marketing sau đăng nhập lần
   đầu (F-05), chuyển view đăng nhập/đăng ký/quên mật khẩu + popup chọn
   loại tài khoản (kế thừa từ v45 phần 4), xử lý tham số ?auth=register /
   ?auth=forgot (kế thừa từ v45 phần 4).
   Trạng thái đăng nhập là 1 nguồn đúng duy nhất: sessionCache +
   onAuthStateChange; trang Trang của tôi dùng chung qua getSession() /
   ensureSessionListener() thay vì đọc session riêng.
   Nạp sau mclivestream-supabase.js, trước js/app.js. Không làm gì khi
   tải trang nếu chưa gọi initAuthUI — an toàn khi nạp ở mọi trang chỉ
   để dùng guardSubmit (form Góp ý trong js/app.js). */
(function () {
  'use strict';

  var MIN_PASSWORD_LEN = 8;

  function $(id) { return document.getElementById(id); }
  function api() { return (typeof window !== 'undefined' && window.McLivestreamAPI) || null; }
  function friendly(err, context) {
    var a = api();
    if (a && typeof a.friendlyError === 'function') return a.friendlyError(err, context);
    return 'Đã có lỗi xảy ra, hãy thử lại sau.';
  }

  // ---- F-07: chống gửi trùng ----
  // Khóa nút submit (disabled + chữ "Đang xử lý…") + cờ inFlight; mở
  // lại khi xong/lỗi. Lỗi trong fn được ghi console và KHÔNG ném lại —
  // mọi handler đều tự bắt lỗi và hiện thông báo thân thiện.
  function guardSubmit(form, fn) {
    if (!form) { try { fn(); } catch (e) { if (typeof console !== 'undefined' && console.error) console.error(e); } return; }
    if (form.__v2sInFlight) return;
    var btn = null;
    try { btn = form.querySelector('button[type="submit"]'); } catch (e) { btn = null; }
    var oldText = btn ? btn.textContent : '';
    form.__v2sInFlight = true;
    if (btn) { btn.disabled = true; btn.textContent = 'Đang xử lý…'; }
    var done = function () {
      form.__v2sInFlight = false;
      if (btn) { btn.disabled = false; btn.textContent = oldText; }
    };
    try {
      var out = fn();
      if (out && typeof out.then === 'function') {
        out.then(done, function (err) { done(); if (typeof console !== 'undefined' && console.error) console.error(err); });
        return out;
      }
      done();
      return out;
    } catch (err) {
      done();
      if (typeof console !== 'undefined' && console.error) console.error(err);
      throw err;
    }
  }

  // ---- Trạng thái đăng nhập: 1 nguồn đúng duy nhất (F-12) ----
  var sessionCache = null;
  var sessionCacheReady = false;
  var sessionListeners = [];
  var authStateSubscribed = false;
  var currentCfg = null;

  function notifySession(user) {
    sessionListeners.forEach(function (fn) { try { fn(user); } catch (e) {} });
  }
  function onSessionChange(fn) { if (typeof fn === 'function') sessionListeners.push(fn); }

  function ensureSessionListener() {
    if (authStateSubscribed) return;
    var a = api();
    if (!a || !a.client || !a.client.auth || typeof a.client.auth.onAuthStateChange !== 'function') return;
    authStateSubscribed = true;
    try {
      a.client.auth.onAuthStateChange(function (event, session) {
        sessionCache = session || null;
        sessionCacheReady = true;
        var user = session && session.user ? session.user : null;
        notifySession(user);
        if (user) syncMarketingConsent(user);
      });
    } catch (e) { /* bỏ qua */ }
  }

  async function getSession() {
    if (sessionCacheReady) return sessionCache;
    var a = api();
    if (!a) return null;
    var s = await a.getSession();
    sessionCache = s;
    sessionCacheReady = true;
    ensureSessionListener();
    return s;
  }

  // ---- F-05: đồng bộ đồng ý marketing sau đăng nhập lần đầu ----
  // Chạy khi onAuthStateChange / showUser thấy session mới và
  // user_metadata.marketing_opt_in đã đặt mà marketing_synced chưa đặt.
  // Đồng bộ cả khi opt-in là false (ghi rõ lựa chọn không nhận tin).
  // Lỗi thì KHÔNG nuốt im: ghi console.error + để nguyên cờ để lần
  // đăng nhập sau thử lại.
  var syncingMarketing = {};
  async function syncMarketingConsent(user) {
    try {
      if (!user || !user.user_metadata) return;
      var md = user.user_metadata;
      if (md.marketing_opt_in === undefined || md.marketing_opt_in === null) return;
      if (md.marketing_synced) return;
      if (syncingMarketing[user.id]) return;
      if (!window.Ver2Wallet || typeof window.Ver2Wallet.saveMarketingConsent !== 'function') return;
      var a = api();
      if (!a) return;
      var accountType = md.account_type || (currentCfg && currentCfg.accountType) || 'model';
      syncingMarketing[user.id] = true;
      try {
        await window.Ver2Wallet.saveMarketingConsent(!!md.marketing_opt_in, accountType);
        await a.client.auth.updateUser({ data: { marketing_synced: true } });
      } catch (err) {
        if (typeof console !== 'undefined' && console.error) console.error('[auth-ui] chưa đồng bộ được đồng ý marketing:', err);
      } finally {
        delete syncingMarketing[user.id];
      }
    } catch (e) { /* không bao giờ làm vỡ trang */ }
  }

  // ---- Thẻ auth: 1 form hiện tại 1 thời điểm (mẫu chuẩn v45) ----
  function initAuthUI(cfg) {
    currentCfg = cfg;
    ensureSessionListener();
    var msgEl = $(cfg.msgId);
    function msg(t) { if (msgEl) msgEl.textContent = t; }

    var AUTH_VIEWS = ['login', 'register', 'forgot'];
    function viewEl(v) { return $(cfg.views[v]); }
    function showAuthView(v) {
      if (AUTH_VIEWS.indexOf(v) === -1) v = 'login';
      AUTH_VIEWS.forEach(function (x) { var el = viewEl(x); if (el) el.hidden = (x !== v); });
    }
    var initialAuthView = (function () {
      try {
        var a = new URLSearchParams(location.search).get('auth');
        return (a === 'register' || a === 'forgot') ? a : 'login';
      } catch (e) { return 'login'; }
    })();

    // Link chuyển view trong thẻ auth.
    var card = cfg.cardId ? $(cfg.cardId) : document;
    if (card && card.querySelectorAll) {
      card.querySelectorAll('[data-auth-view]').forEach(function (a) {
        a.addEventListener('click', function (e) {
          e.preventDefault();
          var v = a.getAttribute('data-auth-view');
          if (v === 'register' && a.getAttribute('data-auth-popup')) { openAuthType(); return; }
          showAuthView(v);
        });
      });
      // Nút hiện/ẩn mật khẩu.
      card.querySelectorAll('.pw-toggle').forEach(function (b) {
        b.addEventListener('click', function () {
          var inp = $(b.getAttribute('data-pw-for'));
          if (!inp) return;
          var show = inp.type === 'password';
          inp.type = show ? 'text' : 'password';
          b.textContent = show ? 'Ẩn' : 'Hiện';
          b.setAttribute('aria-label', show ? 'Ẩn mật khẩu' : 'Hiện mật khẩu');
        });
      });
    }

    // Popup chọn loại tài khoản khi ấn "Đăng ký" (v45 phần 4).
    var typeOv = cfg.overlayId ? $(cfg.overlayId) : null;
    function openAuthType() { if (typeOv) typeOv.classList.add('open'); }
    function closeAuthType() { if (typeOv) typeOv.classList.remove('open'); }
    if (typeOv) {
      typeOv.addEventListener('click', function (e) { if (e.target === typeOv) closeAuthType(); });
      typeOv.querySelectorAll('[data-auth-type]').forEach(function (b) {
        b.addEventListener('click', function () {
          var kind = b.getAttribute('data-auth-type');
          closeAuthType();
          if (kind === cfg.accountType) { showAuthView('register'); }
          else if (cfg.crossRegisterUrl) { location.href = cfg.crossRegisterUrl; }
        });
      });
    }
    var typeClose = cfg.overlayCloseId ? $(cfg.overlayCloseId) : null;
    if (typeClose) typeClose.addEventListener('click', closeAuthType);

    // Hiển thị trạng thái đăng nhập (hộp "Đã đăng nhập" / các view).
    function refreshAuthUI(user) {
      var box = $(cfg.boxId);
      if (user) {
        if (box) {
          box.style.display = '';
          var em = $(cfg.boxEmailId);
          if (em) em.textContent = user.email;
        }
        AUTH_VIEWS.forEach(function (x) { var el = viewEl(x); if (el) el.hidden = true; });
      } else {
        if (box) box.style.display = 'none';
        showAuthView(initialAuthView);
      }
      if (typeof cfg.onSessionChange === 'function') {
        try { cfg.onSessionChange(user); } catch (e) {}
      }
    }

    // F-15: getSession() lỗi thì báo rõ + ghi log, thay cho catch(_){} trống.
    async function showUser() {
      var a = api();
      if (!a) { refreshAuthUI(null); return; }
      try {
        var s = await getSession();
        var user = s && s.user ? s.user : null;
        refreshAuthUI(user);
        if (user) syncMarketingConsent(user);
      } catch (err) {
        if (typeof console !== 'undefined' && console.error) console.error('[auth-ui] getSession lỗi:', err);
        msg('Không kiểm tra được trạng thái đăng nhập, hãy tải lại trang.');
      }
    }
    onSessionChange(function (user) { refreshAuthUI(user); });

    // Handler đăng ký (F-08: mật khẩu tối thiểu 8 ký tự, kiểm tra ở
    // client trước khi gửi; F-07: guardSubmit; F-09: friendlyError).
    var su = $(cfg.forms.signup);
    if (su) su.addEventListener('submit', function (e) {
      e.preventDefault();
      guardSubmit(su, async function () {
        var p1 = $(cfg.inputs.signupPass).value;
        var p2 = $(cfg.inputs.signupPass2).value;
        if (p1 !== p2) { msg('Mật khẩu nhập lại chưa khớp.'); return; }
        if (p1.length < MIN_PASSWORD_LEN) { msg('Mật khẩu cần ít nhất 8 ký tự.'); return; }
        if (!api()) { msg('Chưa kết nối được Supabase, hãy thử lại sau.'); return; }
        try {
          await api().signUp({
            email: $(cfg.inputs.signupEmail).value.trim(),
            password: p1,
            phoneZalo: $(cfg.inputs.signupPhone).value.trim(),
            marketingOptIn: !!$(cfg.inputs.signupMarketing).checked,
            accountType: cfg.accountType
          });
          msg('Đã gửi đăng ký. Nếu project bật xác nhận email, hãy kiểm tra email để xác nhận trước khi đăng nhập.');
        } catch (err) { msg('Đăng ký chưa thành công: ' + friendly(err)); }
      });
    });

    // Handler đăng nhập (F-07 + F-09).
    var si = $(cfg.forms.signin);
    if (si) si.addEventListener('submit', function (e) {
      e.preventDefault();
      guardSubmit(si, async function () {
        if (!api()) { msg('Chưa kết nối được Supabase, hãy thử lại sau.'); return; }
        try {
          await api().signIn({
            email: $(cfg.inputs.signinEmail).value.trim(),
            password: $(cfg.inputs.signinPass).value
          });
          msg('Đăng nhập thành công.');
          await showUser();
        } catch (err) { msg('Đăng nhập chưa thành công: ' + friendly(err)); }
      });
    });

    // Handler quên mật khẩu (F-07 + F-09). resetPassword dùng
    // redirectTo mặc định mới (trang dat-lai-mat-khau.html) — xem F-03.
    var fp = $(cfg.forms.forgot);
    if (fp) fp.addEventListener('submit', function (e) {
      e.preventDefault();
      guardSubmit(fp, async function () {
        if (!api()) { msg('Chưa kết nối được Supabase, hãy thử lại sau.'); return; }
        try {
          await api().resetPassword($(cfg.inputs.forgotEmail).value.trim());
          msg('Đã gửi link đặt lại mật khẩu về email đã đăng ký.');
        } catch (err) { msg('Gửi link chưa thành công: ' + friendly(err)); }
      });
    });

    // Đăng xuất.
    var so = $(cfg.signOutId);
    if (so) so.addEventListener('click', async function () {
      try { if (api()) await api().signOut(); } catch (e) {}
      sessionCache = null;
      sessionCacheReady = false;
      var box = $(cfg.boxId);
      if (box) box.style.display = 'none';
      msg('Đã đăng xuất.');
      showAuthView('login');
      if (typeof cfg.onSessionChange === 'function') {
        try { cfg.onSessionChange(null); } catch (e) {}
      }
    });

    showUser();
  }

  if (typeof window !== 'undefined') {
    window.V2SAuthUI = {
      initAuthUI: initAuthUI,
      guardSubmit: guardSubmit,
      getSession: getSession,
      ensureSessionListener: ensureSessionListener,
      onSessionChange: onSessionChange,
      friendlyError: friendly
    };
  }
  if (typeof module !== 'undefined' && module.exports) module.exports = window.V2SAuthUI;
})();
