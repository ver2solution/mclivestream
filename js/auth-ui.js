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
   v85: phản hồi form rõ ràng — thông báo có 2 trạng thái màu (xanh =
   thành công, đỏ = lỗi) đặt ngay trên nút submit; lỗi từng trường hiện
   đỏ dưới đúng trường sai + tô đỏ viền ô đó; đăng ký thành công có
   session thì đăng nhập thẳng (xác minh email đã tắt 15:26 07/11), không
   có session thì sang trang đăng nhập (cfg.signupSuccessUrl) hoặc về
   view đăng nhập + thông báo xanh; email đã đăng ký thì báo rõ kèm link
   lấy lại mật khẩu. Tùy chọn cfg mới (đều tùy chọn, trang cũ không
   truyền vẫn chạy như trước): initialView, initialMessage,
   signupSuccessUrl.
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
    // v85: thông báo có 2 trạng thái màu — kind 'ok' = xanh (thành công),
    // 'err' = đỏ (lỗi), không truyền = trung tính. msgHtml dùng riêng cho
    // thông báo chứa link (vd email đã đăng ký kèm link lấy lại mật khẩu).
    function msg(t, kind) {
      if (!msgEl) return;
      msgEl.textContent = t || '';
      msgEl.className = 'auth-msg' + (kind === 'ok' ? ' ok' : kind === 'err' ? ' err' : '');
    }
    function msgHtml(html, kind) {
      if (!msgEl) return;
      msgEl.innerHTML = html || '';
      msgEl.className = 'auth-msg' + (kind === 'ok' ? ' ok' : kind === 'err' ? ' err' : '');
    }
    // v85: lỗi từng trường — hiện dòng đỏ dưới đúng trường sai + tô đỏ
    // viền ô đó. Trang chưa có phần tử <p class="field-err"
    // id="err-<inputId>"> thì trả false để caller rơi về msg() chung.
    function setFieldError(inputId, text) {
      var errEl = $('err-' + inputId);
      if (!errEl) return false;
      errEl.textContent = text || '';
      var inp = $(inputId);
      if (inp) {
        if (text) inp.classList.add('invalid');
        else inp.classList.remove('invalid');
      }
      return true;
    }
    function clearAllFieldErrors(form) {
      if (!form || !form.querySelectorAll) return;
      form.querySelectorAll('.field-err').forEach(function (el) { el.textContent = ''; });
      form.querySelectorAll('.invalid').forEach(function (el) { el.classList.remove('invalid'); });
    }
    function isValidEmail(v) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v || '')); }
    function isAlreadyRegistered(err) {
      var raw = String((err && (err.message || err.code)) || err || '').toLowerCase();
      return raw.indexOf('user already registered') !== -1;
    }

    var AUTH_VIEWS = ['login', 'register', 'forgot'];
    function viewEl(v) { return $(cfg.views[v]); }
    // v85: chuyển view thì xóa thông báo cũ + lỗi từng trường, để thông
    // báo của view trước không lọt sang view sau.
    var card = cfg.cardId ? $(cfg.cardId) : document;
    function showAuthView(v) {
      if (AUTH_VIEWS.indexOf(v) === -1) v = 'login';
      AUTH_VIEWS.forEach(function (x) { var el = viewEl(x); if (el) el.hidden = (x !== v); });
      msg('');
      if (card && card.querySelectorAll) {
        card.querySelectorAll('.field-err').forEach(function (el) { el.textContent = ''; });
        card.querySelectorAll('.invalid').forEach(function (el) { el.classList.remove('invalid'); });
      }
    }
    // v85: trang đăng ký riêng (dang-ky.html) truyền initialView 'register'
    // để view đăng ký hiện ngay từ đầu; trang khác giữ logic ?auth= cũ.
    var initialAuthView = (cfg.initialView && AUTH_VIEWS.indexOf(cfg.initialView) !== -1)
      ? cfg.initialView
      : (function () {
        try {
          var a = new URLSearchParams(location.search).get('auth');
          return (a === 'register' || a === 'forgot') ? a : 'login';
        } catch (e) { return 'login'; }
      })();
    // v85: thông báo mở đầu (vd dang-nhap.html?registered=1 sau khi đăng ký
    // xong) — chỉ hiện 1 lần khi chưa đăng nhập.
    var initialMessageShown = false;
    function showInitialMessage() {
      if (initialMessageShown || !cfg.initialMessage) return;
      initialMessageShown = true;
      msg(cfg.initialMessage.text || '', cfg.initialMessage.kind || '');
    }

    // Link chuyển view trong thẻ auth.
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
    // v2 (GĐ2, 07/11/2026): khi có user thì ghi hoạt động ngày (chuỗi 30
    // ngày online để chuyển điểm) — fire-and-forget, tối đa 1 lần/ngày/
    // phiên tải trang, lỗi thì nuốt lặng, không vỡ trang.
    var activityRecordedKey = '';
    function recordActivityOnce(user) {
      try {
        if (!user || !user.id) return;
        var R = (typeof window !== 'undefined') ? window.Ver2Reward : null;
        if (!R || typeof R.recordDailyActivity !== 'function' || typeof R.dayKeySaigon !== 'function') return;
        var key = user.id + ':' + R.dayKeySaigon(new Date());
        if (activityRecordedKey === key) return;
        activityRecordedKey = key;
        R.recordDailyActivity().catch(function () {});
      } catch (e) { /* bỏ qua */ }
    }
    function refreshAuthUI(user) {
      var box = $(cfg.boxId);
      if (user) {
        recordActivityOnce(user);
        if (box) {
          box.style.display = '';
          var em = $(cfg.boxEmailId);
          if (em) em.textContent = user.email;
        }
        AUTH_VIEWS.forEach(function (x) { var el = viewEl(x); if (el) el.hidden = true; });
      } else {
        if (box) box.style.display = 'none';
        showAuthView(initialAuthView);
        showInitialMessage();
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
        msg('Không kiểm tra được trạng thái đăng nhập, hãy tải lại trang.', 'err');
      }
    }
    onSessionChange(function (user) { refreshAuthUI(user); });

    // Handler đăng ký (F-08: mật khẩu tối thiểu 8 ký tự, kiểm tra ở
    // client trước khi gửi; F-07: guardSubmit; F-09: friendlyError).
    // v85: kiểm tra từng trường ở client trước khi gửi — lỗi hiện đỏ dưới
    // đúng trường sai (+ tô đỏ viền ô); đăng ký thành công có session thì
    // đăng nhập thẳng (xác minh email đã tắt 15:26 07/11); không có
    // session thì sang trang đăng nhập (cfg.signupSuccessUrl, trang đăng
    // ký riêng) hoặc về view đăng nhập + thông báo xanh (trang danh sách);
    // email đã đăng ký thì báo rõ kèm link lấy lại mật khẩu.
    var su = $(cfg.forms.signup);
    if (su) su.addEventListener('submit', function (e) {
      e.preventDefault();
      guardSubmit(su, async function () {
        msg('');
        clearAllFieldErrors(su);
        var email = $(cfg.inputs.signupEmail).value.trim();
        var phone = $(cfg.inputs.signupPhone).value.trim();
        var p1 = $(cfg.inputs.signupPass).value;
        var p2 = $(cfg.inputs.signupPass2).value;
        var bad = false;
        if (!email || !isValidEmail(email)) {
          if (!setFieldError(cfg.inputs.signupEmail, !email ? 'Hãy nhập email.' : 'Email chưa đúng định dạng.')) msg('Hãy nhập email đúng định dạng.', 'err');
          bad = true;
        }
        if (!phone) {
          if (!setFieldError(cfg.inputs.signupPhone, 'Hãy nhập số điện thoại chính dùng Zalo.')) msg('Hãy nhập số điện thoại chính dùng Zalo.', 'err');
          bad = true;
        }
        if (p1.length < MIN_PASSWORD_LEN) {
          if (!setFieldError(cfg.inputs.signupPass, 'Mật khẩu cần ít nhất 8 ký tự.')) msg('Mật khẩu cần ít nhất 8 ký tự.', 'err');
          bad = true;
        }
        if (p1 !== p2) {
          if (!setFieldError(cfg.inputs.signupPass2, 'Mật khẩu nhập lại chưa khớp.')) msg('Mật khẩu nhập lại chưa khớp.', 'err');
          bad = true;
        }
        if (bad) return;
        if (!api()) { msg('Chưa kết nối được Supabase, hãy thử lại sau.', 'err'); return; }
        try {
          var res = await api().signUp({
            email: email,
            password: p1,
            phoneZalo: phone,
            marketingOptIn: !!$(cfg.inputs.signupMarketing).checked,
            accountType: cfg.accountType
          });
          if (res && res.session) {
            msg('Đăng ký thành công! Đang chuyển tới trang của bạn…', 'ok');
            // v2 (GĐ2, 07/11/2026): cộng điểm đăng ký qua RPC
            // award_registration_points() — fire-and-forget, KHÔNG chặn
            // showUser()/chuyển trang khi RPC lỗi hay M7 chưa chạy. Chỉ
            // hiện dòng điểm khi RPC thực sự trả về điểm > 0.
            try {
              var R = (typeof window !== 'undefined') ? window.Ver2Reward : null;
              if (R && typeof R.awardRegistration === 'function') {
                R.awardRegistration().then(function (r) {
                  if (r && r.ok && Number(r.points || 0) > 0) {
                    msg('Đăng ký thành công! Bạn nhận được ' + Number(r.points) + ' điểm thưởng!', 'ok');
                  }
                }).catch(function () { /* bỏ qua — đăng ký đã thành công */ });
              }
            } catch (e) { /* bỏ qua — đăng ký đã thành công */ }
            await showUser();
            return;
          }
          if (cfg.signupSuccessUrl) { location.href = cfg.signupSuccessUrl; return; }
          showAuthView('login');
          msg('Đã gửi đăng ký — kiểm tra email để xác nhận rồi đăng nhập.', 'ok');
        } catch (err) {
          if (isAlreadyRegistered(err)) {
            msgHtml('Email này đã được đăng ký. Bạn có muốn lấy lại mật khẩu không? <a href="dat-lai-mat-khau.html?email=' + encodeURIComponent(email) + '">Lấy lại mật khẩu →</a>', 'err');
            return;
          }
          msg('Đăng ký chưa thành công: ' + friendly(err), 'err');
        }
      });
    });

    // Handler đăng nhập (F-07 + F-09). v85: kiểm tra từng trường ở client
    // + báo đỏ rõ lý do khi đăng nhập sai, như form đăng ký.
    var si = $(cfg.forms.signin);
    if (si) si.addEventListener('submit', function (e) {
      e.preventDefault();
      guardSubmit(si, async function () {
        msg('');
        clearAllFieldErrors(si);
        var email = $(cfg.inputs.signinEmail).value.trim();
        var pass = $(cfg.inputs.signinPass).value;
        var bad = false;
        if (!email || !isValidEmail(email)) {
          if (!setFieldError(cfg.inputs.signinEmail, !email ? 'Hãy nhập email.' : 'Email chưa đúng định dạng.')) msg('Hãy nhập email đúng định dạng.', 'err');
          bad = true;
        }
        if (!pass) {
          if (!setFieldError(cfg.inputs.signinPass, 'Hãy nhập mật khẩu.')) msg('Hãy nhập mật khẩu.', 'err');
          bad = true;
        }
        if (bad) return;
        if (!api()) { msg('Chưa kết nối được Supabase, hãy thử lại sau.', 'err'); return; }
        try {
          await api().signIn({
            email: email,
            password: pass
          });
          msg('Đăng nhập thành công.', 'ok');
          await showUser();
        } catch (err) { msg('Đăng nhập chưa thành công: ' + friendly(err), 'err'); }
      });
    });

    // Handler quên mật khẩu (F-07 + F-09). resetPassword dùng
    // redirectTo mặc định mới (trang dat-lai-mat-khau.html) — xem F-03.
    // v85: kiểm tra email ở client + thông báo xanh/đỏ như 2 form trên.
    var fp = $(cfg.forms.forgot);
    if (fp) fp.addEventListener('submit', function (e) {
      e.preventDefault();
      guardSubmit(fp, async function () {
        msg('');
        clearAllFieldErrors(fp);
        var email = $(cfg.inputs.forgotEmail).value.trim();
        if (!email || !isValidEmail(email)) {
          if (!setFieldError(cfg.inputs.forgotEmail, !email ? 'Hãy nhập email đã đăng ký.' : 'Email chưa đúng định dạng.')) msg('Hãy nhập email đúng định dạng.', 'err');
          return;
        }
        if (!api()) { msg('Chưa kết nối được Supabase, hãy thử lại sau.', 'err'); return; }
        try {
          await api().resetPassword(email);
          msg('Đã gửi link đặt lại mật khẩu về email đã đăng ký.', 'ok');
        } catch (err) { msg('Gửi link chưa thành công: ' + friendly(err), 'err'); }
      });
    });

    // Đăng xuất (v78 F-05: cap nhat UI NGAY truoc khi doi signOut xong —
    // truoc day doi await api().signOut() (goi mang toi Supabase) roi moi
    // doi UI nen nut co ve "khong tac dung" vai giay. Sau signOut thi
    // dong bo lai bang showUser(): neu that bai thi hop "Da dang nhap"
    // hien lai + bao loi, khong de UI lech voi session that.)
    var so = $(cfg.signOutId);
    if (so) so.addEventListener('click', async function () {
      if (so.disabled) return;
      so.disabled = true;
      var box = $(cfg.boxId);
      if (box) box.style.display = 'none';
      msg('Đang đăng xuất…');
      showAuthView('login');
      try { if (api()) await api().signOut(); } catch (e) {}
      sessionCache = null;
      sessionCacheReady = false;
      so.disabled = false;
      await showUser();
      var box2 = $(cfg.boxId);
      if (box2 && box2.style.display !== 'none') { msg('Đăng xuất chưa thành công, hãy thử lại.', 'err'); }
      else { msg('Đã đăng xuất.', 'ok'); }
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
