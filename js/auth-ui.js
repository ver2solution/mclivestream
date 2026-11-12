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
   lấy lại mật khẩu. v166 (S3): đăng ký thành công có session thì TỰ
   CHUYỂN về "trang của bạn" theo cfg.signupSessionUrl
   (trang-cua-toi.html, hoặc ?next= nếu có; fallback signupSuccessUrl)
   — trước đây chỉ `return` nên trang đứng yên dù ghi "Đang chuyển…";
   v166 (BƯỚC 1): cảnh báo SĐT trùng hồ sơ đã có lúc đăng ký (chỉ cảnh
   báo, không chặn); v166 (C1/N1):
   lắng nghe 'storage' khóa auth + kiểm tra lại khi tab hiện lại để
   header/panel luôn theo đúng session trong localStorage. Tùy chọn cfg mới (đều tùy chọn, trang cũ không
   truyền vẫn chạy như trước): initialView, initialMessage,
   signupSuccessUrl, signupSessionUrl.
   Trạng thái đăng nhập là 1 nguồn đúng duy nhất: sessionCache +
   onAuthStateChange; trang Trang của tôi dùng chung qua getSession() /
   ensureSessionListener() thay vì đọc session riêng.
   Nạp sau mclivestream-supabase.js, trước js/app.js. Không làm gì khi
   tải trang nếu chưa gọi initAuthUI — an toàn khi nạp ở mọi trang chỉ
   để dùng guardSubmit (form Góp ý trong js/app.js).
   v91 (BUG-01/11/12 + BUG-07): validation SĐT Việt Nam 10 chữ số;
   lỗi từng trường tự xóa khi sửa đúng (live-clear); bubble email tiếng
   Việt qua setCustomValidity; getSession không khóa cache null (tránh
   header kẹt nút "Đăng Nhập" dù phiên vẫn đăng nhập). */
(function () {
  'use strict';

  var MIN_PASSWORD_LEN = 8;

  // v91 (BUG-01): SĐT Việt Nam — 10 chữ số, bắt đầu bằng 0, đầu số
  // 03/05/07/08/09. normalizePhone bỏ khoảng trắng/dấu chấm/gạch nối để
  // "032 998 3699" vẫn hợp lệ và lưu dạng 10 chữ số liền.
  function normalizePhone(v) { return String(v || '').replace(/[\s.\-()]/g, ''); }
  function isValidVnPhone(v) { return /^0[35789]\d{8}$/.test(normalizePhone(v)); }

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

  // v165 (claim — sua loi Rion (a) 12/11): vo hieu cache phien cu sau
  // signUp/signIn, TRUOC khi showUser() doc session. Cache cu co the
  // con giu phien TRUOC khi dang ky/dang nhap (vd dang nhap san bang
  // tk khac o tab nay): neu showUser() doc cache cu thi hop "Da dang
  // nhap" hien email cu trong khi header da hien tai khoan moi — trang
  // hien lan 2 dong dang nhap khac email nhau. Vo hieu (khong set truc
  // tiep tu res.session) de showUser() van doc lai session moi qua
  // api().getSession() — giu nguyen hop dong v111: awardRegistration
  // xong TRUOC khi showUser doc session (test-v111-auth-points khoa
  // thu tu nay).
  function invalidateSessionCache() {
    sessionCache = null;
    sessionCacheReady = false;
  }

  // v166 (C1/N1 — khôi phục phiên, 12/11/2026): trang phải theo ĐÚNG
  // session trong localStorage, kể cả khi session đổi ở TAB KHÁC.
  // Gốc: 1 browser profile chỉ có 1 session Supabase chung (khóa
  // localStorage sb-<ref>-auth-token, GoTrue mặc định — đã đối chiếu
  // @supabase/gotrue-js@2: __loadSession đọc storage mỗi lần, tick
  // auto-refresh 30s cũng đọc storage, BroadcastChannel chỉ báo cho
  // subscriber đã đăng ký). sessionCache của auth-ui.js chỉ cập nhật
  // khi có sự kiện onAuthStateChange; sự kiện có thể tới TRƯỚC khi
  // trang đăng ký listener (trang tải sau khi tab kia đăng nhập) nên
  // trang giữ cache cũ và hiện tài khoản KHÁC tài khoản trong storage
  // — đúng mẫu Zalo/Rion gặp 03:45–04:04 ngày 12/11 (hiện thond.bds
  // trong khi vừa đăng nhập ybkcetx/paboo, lúc hiện nút Đăng Nhập).
  // Sửa: lắng nghe 'storage' cho đúng khóa auth (sự kiện này chỉ bắn
  // ở tab KHÔNG ghi — tức đúng tab cần cập nhật) + kiểm tra lại khi
  // tab hiện lại/focus; mỗi lần đều vô hiệu cache, đọc lại session
  // từ storage và báo cho mọi listener (header/panel theo kịp mà
  // không cần tải lại trang). Hai tài khoản KHÁC NHAU cùng lúc trong
  // 1 profile vẫn chỉ có 1 session (last writer wins — giới hạn của
  // GoTrue, không sửa bằng code được): muốn dùng 2 tài khoản song
  // song thì tách profile trình duyệt riêng (Rion + Zalo đã đồng ý).
  function isAuthStorageKey(key) {
    return typeof key === 'string' && key.indexOf('sb-') === 0 && key.slice(-11) === '-auth-token';
  }
  var storageWatchStarted = false;
  var lastSessionRevalidate = 0;
  function revalidateSessionFromStorage(force) {
    var now = Date.now();
    if (!force && now - lastSessionRevalidate < 10000) return; // chống spam khi focus liên tục
    lastSessionRevalidate = now;
    invalidateSessionCache();
    try {
      var p = getSession();
      if (p && typeof p.then === 'function') {
        p.then(function (s) { notifySession(s && s.user ? s.user : null); }).catch(function () {});
      }
    } catch (e) { /* bỏ qua — lần đọc sau sẽ thử lại */ }
  }
  function watchAuthStorage() {
    if (storageWatchStarted) return;
    if (typeof window === 'undefined' || !window.addEventListener) return;
    storageWatchStarted = true;
    try {
      window.addEventListener('storage', function (e) {
        if (!e || !isAuthStorageKey(e.key)) return;
        revalidateSessionFromStorage(true); // sự kiện storage là nguồn tin cậy — không throttle
      });
      if (typeof document !== 'undefined' && document.addEventListener) {
        document.addEventListener('visibilitychange', function () {
          if (!document.hidden) revalidateSessionFromStorage(false);
        });
      }
      window.addEventListener('focus', function () { revalidateSessionFromStorage(false); });
    } catch (e) { /* bỏ qua — trang vẫn dùng cache + sự kiện GoTrue như cũ */ }
  }

  // v166 (BƯỚC 1 — cảnh báo SĐT đã đăng ký, 12/11/2026): 1 SĐT đã
  // đăng ký im lặng 3 tài khoản (0969151680: paboo/riontest1205b/
  // qgunavo) vì form đăng ký không kiểm tra trùng. Khi user nhập SĐT,
  // nếu SĐT đó trùng liên hệ (zalo/phone) của hồ sơ đã có trong
  // data.js thì hiện cảnh báo + link Đăng nhập/Quên mật khẩu — CHỈ
  // CẢNH BÁO, KHÔNG CHẶN (SĐT có thể dùng chung; chặn cứng cần kiểm
  // tra server-side, chưa có hạ tầng). data.js (~590KB) chỉ tải lười
  // khi user nhập SĐT (không tải lúc mở trang — theo gợi ý của Rion
  // ở js/claim.js). Thuật toán chuẩn hóa SĐT giống js/claim.js
  // phoneKey (9 số cuối) — giữ đồng bộ 2 nơi khi đổi.
  function phoneKeyLocal(v) {
    var C = (typeof window !== 'undefined') ? window.V2SClaim : null;
    if (C && typeof C.phoneKey === 'function') return C.phoneKey(v);
    var d = String(v || '').replace(/\D/g, '');
    if (d.length >= 11 && d.indexOf('84') === 0) d = d.slice(2);
    if (d.length === 10 && d.charAt(0) === '0') d = d.slice(1);
    if (d.length < 9) return '';
    return d.slice(-9);
  }
  function findPhoneProfileMatches(phone) {
    var key = phoneKeyLocal(phone);
    if (!key) return [];
    var D = (typeof window !== 'undefined') ? window.V20_DATA : null;
    if (!D) return [];
    var out = [];
    function scan(list, kind) {
      (list || []).forEach(function (it) {
        var cs = (it && it.contacts) || [];
        for (var i = 0; i < cs.length; i++) {
          var c = cs[i] || {};
          var p = String(c.provider || '').toLowerCase();
          if ((p === 'zalo' || p === 'phone' || p === 'sdt' || p === 'tel') && phoneKeyLocal(c.value) === key) {
            out.push({ kind: kind, id: it.id, name: it.name || it.title || it.id });
            return;
          }
        }
      });
    }
    scan(D.models, 'model');
    scan(D.shops, 'shop');
    return out.slice(0, 2);
  }
  var profileDataLoading = null;
  function ensureProfileData() {
    if (typeof window !== 'undefined' && window.V20_DATA) return Promise.resolve(true);
    if (profileDataLoading) return profileDataLoading;
    if (typeof document === 'undefined' || !document.createElement) return Promise.resolve(false);
    profileDataLoading = new Promise(function (resolve) {
      var base = '';
      try { base = String(location.pathname || '').indexOf('/bai-viet/') !== -1 ? '../' : ''; } catch (e) { base = ''; }
      var s = document.createElement('script');
      s.src = base + 'js/data.js';
      s.onload = function () { resolve(!!(typeof window !== 'undefined' && window.V20_DATA)); };
      s.onerror = function () { profileDataLoading = null; resolve(false); };
      try { (document.head || document.body).appendChild(s); } catch (e) { profileDataLoading = null; resolve(false); return; }
      setTimeout(function () {
        var ok = !!(typeof window !== 'undefined' && window.V20_DATA);
        if (!ok) profileDataLoading = null; // hết hạn mà chưa tải xong: lần sau thử lại
        resolve(ok);
      }, 5000);
    });
    return profileDataLoading;
  }

  async function getSession() {
    // v91 (BUG-07): session null KHÔNG được khóa cache — lần đọc đầu có thể
    // chạy trước khi Supabase khôi phục xong session từ bộ nhớ cục bộ; khóa
    // null lại thì mọi lần gọi sau đều trả null (header giữ nút "Đăng Nhập"
    // dù phiên vẫn đang đăng nhập, trong khi mục ghim đọc trực tiếp qua
    // McLivestreamAPI lại thấy số dư). Chỉ tin cache khi có session thật;
    // null thì đọc lại mỗi lần. Đăng ký onAuthStateChange TRƯỚC khi đợi để
    // sự kiện INITIAL_SESSION/SIGNED_IN cập nhật cache kịp thời.
    if (sessionCacheReady && sessionCache) return sessionCache;
    var a = api();
    if (!a) return null;
    ensureSessionListener();
    var s = await a.getSession();
    sessionCache = s;
    sessionCacheReady = true;
    return s;
  }

  // v97: doc session ben vung cho trang can dang nhap
  // (trang-cua-toi.html). getSession() thuong chi doc 1 lan; neu GoTrue
  // client chua khoi phuc xong session tu bo nho cuc bo (lock dang ban /
  // khoi tao cham) thi co the tra null hoac nem loi du phien van con
  // trong localStorage — dung luc do trang se hien "Can dang nhap" va
  // luu ho so se bao "Can dang nhap moi luu duoc ho so" du nguoi dung
  // vua dang nhap xong o form inline (loi 15:58 ngay 08/11/2026).
  // Ham nay thu lai sau khoang nghi ngan, chi ket luan null sau ~3
  // giay. Trang khong can dang nhap van dung getSession() cu de khong
  // cham header.
  function getSessionRobust(timeoutMs) {
    var deadline = Date.now() + (timeoutMs || 3000);
    function attempt() {
      var p;
      try { p = getSession(); } catch (e) { p = Promise.reject(e); }
      return Promise.resolve(p).then(function (s) {
        if (s) return s;
        if (Date.now() >= deadline) return null;
        return new Promise(function (resolve) { setTimeout(function () { resolve(attempt()); }, 150); });
      }, function () {
        if (Date.now() >= deadline) return null;
        return new Promise(function (resolve) { setTimeout(function () { resolve(attempt()); }, 150); });
      });
    }
    return attempt();
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
    // v91 (BUG-11): lỗi từng trường phải biến mất NGAY khi người dùng sửa
    // đúng — không đợi tới lần submit sau. Chỉ xóa lỗi khi giá trị hiện tại
    // đã hợp lệ; giá trị vẫn sai thì giữ nguyên lỗi đang hiện (không nhảy
    // lỗi mới khi đang gõ).
    function wireLiveClear(inputId, isValid, errText) {
      var inp = $(inputId);
      if (!inp || typeof inp.addEventListener !== 'function') return;
      inp.addEventListener('input', function () {
        if (isValid(inp.value)) setFieldError(inputId, '');
        else {
          var errEl = $('err-' + inputId);
          if (errEl && errEl.textContent) setFieldError(inputId, errText);
        }
      });
    }
    // v91 (BUG-12): bubble mặc định của trình duyệt cho input type=email
    // hiện tiếng Anh ("Please include an '@'..."). Đặt customValidity tiếng
    // Việt để dù form nào quên novalidate thì bubble vẫn tiếng Việt; form
    // đã có novalidate thì JS tự báo lỗi tiếng Việt như cũ.
    function wireEmailValidity(inputId) {
      var inp = $(inputId);
      if (!inp || typeof inp.addEventListener !== 'function' || typeof inp.setCustomValidity !== 'function') return;
      inp.addEventListener('input', function () {
        var v = inp.value.trim();
        inp.setCustomValidity(!v || isValidEmail(v) ? '' : 'Email chưa đúng định dạng.');
      });
      inp.addEventListener('invalid', function () {
        var v = inp.value.trim();
        inp.setCustomValidity(!v ? 'Hãy nhập email.' : 'Email chưa đúng định dạng.');
      });
    }
    // v91: nối live-clear + customValidity cho các ô có trong cfg.
    (function () {
      var inp = cfg.inputs || {};
      var emailErr = 'Email chưa đúng định dạng.';
      var phoneErr = 'Số điện thoại chưa đúng định dạng (10 chữ số, bắt đầu bằng 03, 05, 07, 08 hoặc 09).';
      if (inp.signupEmail) { wireLiveClear(inp.signupEmail, function (v) { return !!v && isValidEmail(v); }, emailErr); wireEmailValidity(inp.signupEmail); }
      if (inp.signupPhone) wireLiveClear(inp.signupPhone, isValidVnPhone, phoneErr);
      if (inp.signupPass) wireLiveClear(inp.signupPass, function (v) { return String(v || '').length >= MIN_PASSWORD_LEN; }, 'Mật khẩu cần ít nhất 8 ký tự.');
      if (inp.signupPass2) wireLiveClear(inp.signupPass2, function (v) { var p1 = $(inp.signupPass); return !!v && !!p1 && v === p1.value; }, 'Mật khẩu nhập lại chưa khớp.'); /* v161 (Rion S3-1): truoc day o trong ('' === '') duoc coi la hop le nen xoa mat thong bao loi */
      if (inp.signinEmail) { wireLiveClear(inp.signinEmail, function (v) { return !!v && isValidEmail(v); }, emailErr); wireEmailValidity(inp.signinEmail); }
      if (inp.signinPass) wireLiveClear(inp.signinPass, function (v) { return !!String(v || ''); }, 'Hãy nhập mật khẩu.');
      if (inp.forgotEmail) { wireLiveClear(inp.forgotEmail, function (v) { return !!v && isValidEmail(v); }, emailErr); wireEmailValidity(inp.forgotEmail); }
    })();
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
    // ngày online để chuyển xu) — fire-and-forget, tối đa 1 lần/ngày/
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
    // v166 (BƯỚC 1): ô cảnh báo SĐT trùng — tạo 1 lần dưới ô SĐT, ẩn
    // mặc định; chỉ cảnh báo, không chặn đăng ký.
    var phoneWarnEl = null;
    var authBase = '';
    try { authBase = String(location.pathname || '').indexOf('/bai-viet/') !== -1 ? '../' : ''; } catch (e) { authBase = ''; }
    function escHtml(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
    function showPhoneDupWarn(matches) {
      if (!phoneWarnEl) return;
      if (!matches || !matches.length) { phoneWarnEl.hidden = true; phoneWarnEl.innerHTML = ''; return; }
      var names = matches.map(function (m) { return escHtml(m.name); }).join(', ');
      phoneWarnEl.innerHTML = 'SĐT này đã có tài khoản — nếu đây là SĐT của bạn, hãy <a href="' + authBase + 'dang-nhap.html">đăng nhập</a> hay <a href="' + authBase + 'dat-lai-mat-khau.html">lấy lại mật khẩu</a> thay vì đăng ký mới.'
        + (names ? ' (Hồ sơ khớp: ' + names + ')' : '');
      phoneWarnEl.hidden = false;
    }
    function checkPhoneDup() {
      var inp = $(cfg.inputs.signupPhone);
      if (!inp || !isValidVnPhone(inp.value)) { showPhoneDupWarn(null); return Promise.resolve([]); }
      return ensureProfileData().then(function () {
        var m = findPhoneProfileMatches(inp.value);
        showPhoneDupWarn(m);
        return m;
      }).catch(function () { return []; });
    }
    if (su) {
      var phoneInp = $(cfg.inputs.signupPhone);
      if (phoneInp && typeof phoneInp.addEventListener === 'function') {
        try {
          phoneWarnEl = document.createElement('p');
          phoneWarnEl.id = 'authSuPhoneDupWarn';
          phoneWarnEl.className = 'auth-phone-warn';
          phoneWarnEl.hidden = true;
          if (phoneInp.parentNode) phoneInp.parentNode.insertBefore(phoneWarnEl, phoneInp.nextSibling);
        } catch (e) { phoneWarnEl = null; }
        var phoneDupTimer = null;
        phoneInp.addEventListener('input', function () {
          if (phoneDupTimer) clearTimeout(phoneDupTimer);
          phoneDupTimer = setTimeout(function () { checkPhoneDup(); }, 500);
        });
        phoneInp.addEventListener('change', function () { checkPhoneDup(); });
      }
    }
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
        // v91 (BUG-01): SĐT phải đúng định dạng Việt Nam 10 chữ số
        // (đầu số 03/05/07/08/09) mới tạo tài khoản — trước đây chỉ kiểm
        // tra không rỗng nên "03299" cũng đăng ký được.
        if (!isValidVnPhone(phone)) {
          if (!setFieldError(cfg.inputs.signupPhone, !phone ? 'Hãy nhập số điện thoại chính dùng Zalo.' : 'Số điện thoại chưa đúng định dạng (10 chữ số, bắt đầu bằng 03, 05, 07, 08 hoặc 09).')) msg('Hãy nhập số điện thoại đúng định dạng.', 'err');
          bad = true;
        }
        if (p1.length < MIN_PASSWORD_LEN) {
          if (!setFieldError(cfg.inputs.signupPass, 'Mật khẩu cần ít nhất 8 ký tự.')) msg('Mật khẩu cần ít nhất 8 ký tự.', 'err');
          bad = true;
        }
        /* v161 (Rion S3-1): truoc day chi kiem p1 !== p2 — khi ca 2 o trong
           thi '' === '' nen o "Nhap lai mat khau" khong bao loi rieng (loi
           chi hien o o mat khau dau tien). */
        if (!p2) {
          if (!setFieldError(cfg.inputs.signupPass2, 'Hãy nhập lại mật khẩu.')) msg('Hãy nhập lại mật khẩu.', 'err');
          bad = true;
        } else if (p1 !== p2) {
          if (!setFieldError(cfg.inputs.signupPass2, 'Mật khẩu nhập lại chưa khớp.')) msg('Mật khẩu nhập lại chưa khớp.', 'err');
          bad = true;
        }
        if (bad) return;
        if (!api()) { msg('Chưa kết nối được Supabase, hãy thử lại sau.', 'err'); return; }
        // v166 (BƯỚC 1): kiểm tra trùng SĐT trước khi tạo tài khoản
        // (chờ tối đa 2s để tải data.js lần đầu; lỗi/chậm thì vẫn đăng
        // ký tiếp — chỉ cảnh báo, không chặn).
        try {
          var dupWait = ensureProfileData();
          var dupTimeout = new Promise(function (resolve) { setTimeout(function () { resolve(false); }, 2000); });
          await Promise.race([dupWait, dupTimeout]);
          var dupMatches = findPhoneProfileMatches(phone);
          if (dupMatches.length) showPhoneDupWarn(dupMatches);
        } catch (e) { /* bỏ qua — đăng ký vẫn tiếp tục */ }
        // v111 (N1): 3 o ho so thu thap ngay khi dang ky — signUp() o
        // mclivestream-supabase.js da map 3 truong nay vao user_metadata
        // tu v99, nhung handler nay chua truyen. Doc theo id co dinh cua
        // dang-ky.html; trang khong co 3 o nay (form inline danh sach)
        // thi gui ''.
        function signupField(id) {
          try { var el = $(id); return el ? String(el.value || '').trim() : ''; } catch (e) { return ''; }
        }
        var workLocation = signupField('authSuWorkLocation');
        var desiredField = signupField('authSuDesiredField');
        var priorityField = signupField('authSuPriorityField');
        try {
          var res = await api().signUp({
            email: email,
            password: p1,
            phoneZalo: normalizePhone(phone),
            marketingOptIn: !!($(cfg.inputs.signupMarketing) && $(cfg.inputs.signupMarketing).checked),
            accountType: cfg.accountType,
            workLocation: workLocation,
            desiredField: desiredField,
            priorityField: priorityField
          });
          if (res && res.session) {
            invalidateSessionCache(); // v165: vo hieu cache phien cu truoc khi showUser() doc
            msg('Đăng ký thành công! Đang chuyển tới trang của bạn…', 'ok');
            // v111 (N1, tiep): luu lien he + 3 o ho so vao localStorage
            // 'v2s_signup_prefs' (gop voi ban dang-ky.html da luu) de
            // trang-cua-toi dien san ca SDT + email lien he khi tao ho so.
            try {
              var prefs = {};
              try { prefs = JSON.parse(localStorage.getItem('v2s_signup_prefs') || '{}') || {}; } catch (e2) { prefs = {}; }
              prefs.workLocation = workLocation || prefs.workLocation || '';
              prefs.desiredField = desiredField || prefs.desiredField || '';
              prefs.priorityField = priorityField || prefs.priorityField || '';
              prefs.phoneZalo = normalizePhone(phone);
              prefs.contactEmail = email;
              localStorage.setItem('v2s_signup_prefs', JSON.stringify(prefs));
            } catch (e) { /* bo qua — chi la prefill, dang ky van xong */ }
            // v111 (header "0 xu"): DOI awardRegistration() tra ve TRUOC
            // khi showUser(), thay vi fire-and-forget nhu cu. showUser()
            // kich loadHeaderBalance() doc so du — neu chay truoc khi RPC
            // cong xu xong thi header hien "0 xu" cho toi khi tai lai
            // trang. Cho RPC toi da 8s; RPC loi/cham thi dang ky van
            // thanh cong binh thuong (khong chan showUser).
            // v166 (S3, 12/11/2026): sau dang ky thanh cong (co session)
            // TU CHUYEN ve "trang cua ban" theo cfg.signupSessionUrl
            // (ben duoi, sau showUser + lam moi header). Truoc day chi
            // nen trang hien "Dang chuyen toi trang cua ban…" mai ma
            // khong chuyen (Rion S3) — thiet ke v96 (o lai xem panel
            // kich hoat) chi ap dung khi user tu mo lai trang dang ky
            // luc da dang nhap, khong ap dung cho luot dang ky vua xong.
            // Dong xu trong panel hien qua showPointsLine() duoi day —
            // do la "toast" bao nhan xu theo thiet ke hien tai, khong
            // phai msg() trong form (form bi an khi showUser chay).
            var awardPoints = 0;
            try {
              var R = (typeof window !== 'undefined') ? window.Ver2Reward : null;
              if (R && typeof R.awardRegistration === 'function') {
                var awardP = R.awardRegistration();
                var awardTimeout = new Promise(function (resolve) { setTimeout(function () { resolve(null); }, 8000); });
                var r = await Promise.race([awardP, awardTimeout]);
                if (r && r.ok && Number(r.points || 0) > 0) {
                  awardPoints = Number(r.points);
                  msg('Đăng ký thành công! Bạn nhận được ' + awardPoints + ' xu thưởng!', 'ok');
                  /* v96: dong diem nay cung hien trong panel kich hoat
                     (neu trang co panel) — so diem do server tra. */
                  try { var AV = (typeof window !== 'undefined') ? window.V2SActivation : null; if (AV && typeof AV.showPointsLine === 'function') AV.showPointsLine(awardPoints); } catch (e) {}
                  /* v117 (pheu dang ky): msg() tren chi ghi vao form —
                     form bi an ngay sau showUser() nen nguoi dung khong
                     bao gio thay dong nay. Hien toast co dinh (cung kieu
                     starToast) + dat truc tiep so du header = so xu vua
                     cong (tai khoan moi bat dau 0) + luu toast cho vao
                     sessionStorage de trang dich (sau chuyen 800ms) hien
                     lai — app.js doc lai luc tai trang. */
                  var toastText = 'Đăng ký thành công! Bạn nhận được ' + awardPoints + ' xu thưởng!';
                  try { if (typeof window !== 'undefined' && typeof window.V2SToast === 'function') window.V2SToast(toastText); } catch (e) {}
                  try { if (typeof window !== 'undefined' && typeof window.V20HeaderSetBalance === 'function') window.V20HeaderSetBalance(awardPoints); } catch (e) {}
                  try { if (typeof window !== 'undefined' && window.sessionStorage) window.sessionStorage.setItem('v2s_pending_toast', JSON.stringify({ text: toastText, ts: Date.now() })); } catch (e) {}
                }
              }
            } catch (e) { /* bỏ qua — đăng ký đã thành công */ }
            /* v117: RPC cong xu loi/cham (awardPoints = 0) — dang ky van
               xong, chi khong xac nhan duoc so xu. Hien toast chung chung
               (khong ghi so ao) de nguoi dung van thay phan hoi; so du
               header doc lai tu server qua V20HeaderRefresh ben duoi. */
            if (awardPoints <= 0) {
              try { if (typeof window !== 'undefined' && typeof window.V2SToast === 'function') window.V2SToast('Đăng ký thành công!'); } catch (e) {}
              try { if (typeof window !== 'undefined' && window.sessionStorage) window.sessionStorage.setItem('v2s_pending_toast', JSON.stringify({ text: 'Đăng ký thành công!', ts: Date.now() })); } catch (e) {}
            }
            await showUser();
            // v111 (header "0 xu", tiep): lam moi so du header + popup
            // diem NGAY sau khi RPC cong xu xong, khong doi tai lai
            // trang. Luu y: su kien SIGNED_IN co the kich
            // loadHeaderBalance() som hon (truoc khi RPC xong) nen
            // header van co the thoang "0 xu" — lan refresh nay sua
            // thanh so dung ngay sau do. Sua triet de can them o
            // js/app.js (khong thuoc pham vi v111 nhom nay).
            try { if (typeof window !== 'undefined' && typeof window.V20HeaderRefresh === 'function') window.V20HeaderRefresh(); } catch (e) {}
            try { if (typeof window !== 'undefined' && typeof window.V20RefreshPopupPoints === 'function') window.V20RefreshPopupPoints(); } catch (e) {}
            // v166 (S3): tu chuyen sau dang ky thanh cong — dong redirect
            // nay truoc day khong bao gio toi vi `return` ngay sau
            // showUser() (nhanh co session). Dich la "trang cua ban":
            // signupSessionUrl (trang-cua-toi.html, hoac ?next= neu co),
            // fallback signupSuccessUrl cho trang khong dat rieng.
            // Nhanh KHONG co session (xac minh email bat lai) giu nguyen
            // ben duoi: sang dang-nhap.html theo signupSuccessUrl + bao
            // "kiem tra email".
            var dest = cfg.signupSessionUrl || cfg.signupSuccessUrl;
            if (dest) { location.href = dest; return; }
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
          var siRes = await api().signIn({
            email: email,
            password: pass
          });
          if (siRes && siRes.session) invalidateSessionCache(); // v165: vo hieu cache phien cu truoc khi showUser() doc
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

  // v166 (C1/N1): bật lắng nghe storage ngay khi module nạp (mọi trang
  // nạp auth-ui.js đều được theo dõi, kể cả trang không gọi initAuthUI
  // như trang bài viết — header ở đó cũng cần theo kịp session).
  watchAuthStorage();

  if (typeof window !== 'undefined') {
    window.V2SAuthUI = {
      initAuthUI: initAuthUI,
      guardSubmit: guardSubmit,
      getSession: getSession,
      getSessionRobust: getSessionRobust,
      ensureSessionListener: ensureSessionListener,
      onSessionChange: onSessionChange,
      friendlyError: friendly,
      isValidVnPhone: isValidVnPhone,
      normalizePhone: normalizePhone,
      isAuthStorageKey: isAuthStorageKey,
      phoneKey: phoneKeyLocal,
      findPhoneProfileMatches: findPhoneProfileMatches
    };
  }
  if (typeof module !== 'undefined' && module.exports) module.exports = window.V2SAuthUI;
})();
