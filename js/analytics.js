/* v27 — Tracker hành động người dùng, ẨN DANH TUYỆT ĐỐI (yêu cầu người dùng 2026-11-05 13:39).
   Mục đích: xem khách dừng lại lâu nhất ở trang nào và bị lỗi ở điểm nào,
   để cron ver2solution-web-analytics đọc bảng web_analytics_events và báo cáo.
   ---------------------------------------------------------------------------
   NGUYÊN TẮC ẨN DANH (không bao giờ vi phạm):
   - KHÔNG gửi email, số điện thoại, mật khẩu, nội dung ô nhập, địa chỉ IP,
     dấu vân tay thiết bị hay bất kỳ giá trị nào người dùng gõ vào form.
   - File này KHÔNG đọc `.value` của bất kỳ ô nhập nào (test-v27 khẳng định).
   - Mã phiên chỉ là chuỗi ngẫu nhiên lưu trong sessionStorage, không dùng để
     nhận diện cá nhân; mỗi tab trình duyệt có một mã khác nhau.
   - Chỉ ghi: trang nào, sự kiện nào (xem trang / ở lại bao lâu / bấm phần tử
     nào / lỗi JS nào / form nào thành công hay lỗi), mã phiên ngẫu nhiên.
   - Thông báo lỗi được lọc trước khi gửi: email và số điện thoại Việt Nam
     trong chuỗi lỗi (nếu có) bị thay bằng [ẩn], chuỗi cắt tối đa 500 ký tự.
   - Trang giới thiệu (referrer) chỉ giữ origin + đường dẫn, bỏ query/hash.
   - Từ v79: trường page ghi thêm các tham số utm_* (đo nguồn theo quy ước
     UTM 07/11/2026 — xem hidden_files/utm-quy-uoc-2026-11-07.md); mọi query
     param khác vẫn bị bỏ — không bao giờ ghi từ khóa tìm kiếm hay nội dung
     người dùng nhập. Giá trị utm cũng qua sanitize() (bỏ email/SĐT nếu có).
   ---------------------------------------------------------------------------
   CÁCH GỬI: gom sự kiện theo lô (tối đa 10 sự kiện hoặc 10 giây), POST về
   bảng web_analytics_events qua client Supabase sẵn có của web (khóa anon
   công khai). Nếu gửi lỗi hoặc mất mạng: xếp hàng vào localStorage
   (tối đa 200 sự kiện, cũ nhất bị bỏ) và thử lại ở lần tải trang sau.
   Tracker KHÔNG làm chậm trang và KHÔNG chặn nội dung: mọi lỗi của tracker
   đều được bắt và bỏ qua lặng lẽ; nếu Supabase chưa có bảng
   (migration chưa chạy) thì sự kiện chỉ nằm trong hàng đợi local.
   ---------------------------------------------------------------------------
   QUY ƯỚC CỘT (xem supabase-migration-web-analytics.sql):
   - form_result: error_message NULL = thành công; có giá trị = lỗi (đã lọc).
   - dwell: dwell_seconds là số giây ở lại trang, gửi khi ẩn/rời trang.
   - click: element là giá trị data-track tĩnh của phần tử, không phải nội
     dung người dùng nhập (ô tìm kiếm/bộ lọc chỉ ghi "đã dùng", không ghi
     từ khóa đã gõ). */
(function () {
  'use strict';

  var TABLE = 'web_analytics_events';
  var QUEUE_KEY = 'v2s_analytics_queue';
  var SESSION_KEY = 'v2s_analytics_session';
  var MAX_QUEUE = 200;
  var FLUSH_EVERY_MS = 10000;
  var FLUSH_AT_COUNT = 10;
  var CDN_SUPABASE = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
  var EMAIL_RE = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;
  var PHONE_RE = /(?<!\d)0[389]\d{8}(?!\d)/g;

  var started = false;
  var queue = [];
  var flushTimer = null;
  var dwellSent = false;
  var pageStart = Date.now();
  var clientPromise = null;
  var sessionId = null;

  function safe(fn, fallback) {
    try { return fn(); } catch (e) { return fallback; }
  }

  /* Mã phiên ngẫu nhiên, lưu trong sessionStorage (mỗi tab một mã). */
  function getSessionId() {
    if (sessionId) return sessionId;
    sessionId = safe(function () {
      var s = null;
      try { s = window.sessionStorage.getItem(SESSION_KEY); } catch (e) { s = null; }
      if (!s) {
        s = 'sess_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 12);
        try { window.sessionStorage.setItem(SESSION_KEY, s); } catch (e) { /* bỏ qua */ }
      }
      return s;
    }, null);
    if (!sessionId) sessionId = 'sess_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 12);
    return sessionId;
  }

  /* Lọc chuỗi trước khi gửi: bỏ email + số điện thoại, cắt 500 ký tự. */
  function sanitize(s) {
    if (s == null) return null;
    var out = String(s).replace(EMAIL_RE, '[ẩn-email]').replace(PHONE_RE, '[ẩn-số]');
    if (out.length > 500) out = out.slice(0, 500);
    return out;
  }

  /* Chỉ giữ origin + đường dẫn của trang giới thiệu, bỏ query/hash. */
  function cleanReferrer(ref) {
    if (!ref) return null;
    return safe(function () {
      var u = new URL(ref);
      return u.origin + (u.pathname === '/' ? '' : u.pathname);
    }, null);
  }

  /* Tu v79 — chi giu cac tham so UTM de do nguon (quy uoc UTM 07/11/2026).
     Cac query param khac (page, tim kiem, loc...) KHONG duoc ghi — bao ve
     an danh tuyet doi: khong bao gio ghi tu khoa nguoi dung go. Phan tich
     bang tay bang String (khong dung API phan tich query co san cua trinh
     duyet) de chay duoc ca trong moi truong han che. Gia tri utm cung qua
     sanitize() de loai email/SĐT neu co. */
  var UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'];
  function utmQuery() {
    return safe(function () {
      var search = window.location.search;
      if (!search || search.charAt(0) !== '?') return '';
      var parts = search.slice(1).split('&');
      var kept = [];
      for (var i = 0; i < UTM_KEYS.length; i++) {
        var key = UTM_KEYS[i];
        for (var j = 0; j < parts.length; j++) {
          var eq = parts[j].indexOf('=');
          var k = eq === -1 ? parts[j] : parts[j].slice(0, eq);
          if (k === key) { kept.push(parts[j]); break; }
        }
      }
      if (!kept.length) return '';
      return sanitize('?' + kept.join('&'));
    }, '');
  }

  function pagePath() {
    return safe(function () { return window.location.pathname + utmQuery(); }, '/');
  }

  function buildEvent(type, element, dwellSeconds, errorMessage, referrer) {
    return {
      session_id: getSessionId(),
      page: pagePath(),
      event_type: type,
      element: element || null,
      dwell_seconds: dwellSeconds == null ? null : dwellSeconds,
      error_message: errorMessage == null ? null : sanitize(errorMessage),
      referrer: referrer == null ? null : cleanReferrer(referrer)
    };
  }

  function record(type, element, dwellSeconds, errorMessage, referrer) {
    try {
      queue.push(buildEvent(type, element, dwellSeconds, errorMessage, referrer));
      if (queue.length >= FLUSH_AT_COUNT) flush(false);
    } catch (e) { /* tracker không bao giờ làm vỡ trang */ }
  }

  function loadQueue() {
    return safe(function () {
      var raw = null;
      try { raw = window.localStorage.getItem(QUEUE_KEY); } catch (e) { raw = null; }
      if (!raw) return [];
      var arr = JSON.parse(raw);
      return Array.isArray(arr) ? arr : [];
    }, []);
  }

  function saveQueue() {
    safe(function () {
      try {
        if (!queue.length) window.localStorage.removeItem(QUEUE_KEY);
        else window.localStorage.setItem(QUEUE_KEY, JSON.stringify(queue.slice(-MAX_QUEUE)));
      } catch (e) { /* bộ nhớ đầy/không dùng được: bỏ qua */ }
    });
  }

  function loadScript(src) {
    return new Promise(function (resolve, reject) {
      var s = document.createElement('script');
      s.src = src; s.async = true;
      s.onload = function () { resolve(); };
      s.onerror = function () { reject(new Error('load script failed: ' + src)); };
      (document.head || document.documentElement).appendChild(s);
    });
  }

  /* Lấy client Supabase sẵn có của web; tự nạp CDN + config nếu trang chưa có
     (trang chủ và trang chi tiết không nạp supabase-js). Chỉ dùng khóa anon
     công khai trong supabase-config.js, không bao giờ dùng service_role. */
  function ensureClient() {
    if (clientPromise) return clientPromise;
    clientPromise = (async function () {
      try {
        if (typeof window === 'undefined' || typeof document === 'undefined') return null;
        var base = null;
        try {
          var cs = document.currentScript;
          base = cs && cs.src ? cs.src : null;
        } catch (e) { base = null; }
        if (!window.supabase) {
          await loadScript(CDN_SUPABASE);
        }
        if (!window.MCLIVESTREAM_SUPABASE_CONFIG) {
          var cfgUrl = base ? new URL('supabase-config.js', base).href : 'supabase-config.js';
          await loadScript(cfgUrl);
        }
        var cfg = window.MCLIVESTREAM_SUPABASE_CONFIG || {};
        if (!window.supabase || !cfg.url || !cfg.anonKey) return null;
        if (String(cfg.url).indexOf('YOUR-PROJECT-REF') !== -1) return null;
        return window.supabase.createClient(cfg.url, cfg.anonKey);
      } catch (e) {
        return null;
      }
    })();
    return clientPromise;
  }

  async function flush(useKeepalive) {
    if (!queue.length) return;
    var batch = queue.slice();
    var client = null;
    try { client = await ensureClient(); } catch (e) { client = null; }
    if (!client) { saveQueue(); return; }
    var cfg = (typeof window !== 'undefined' && window.MCLIVESTREAM_SUPABASE_CONFIG) || {};
    var url = cfg.url + '/rest/v1/' + TABLE;
    var body = JSON.stringify(batch);
    try {
      var res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': cfg.anonKey,
          'Authorization': 'Bearer ' + cfg.anonKey,
          'Prefer': 'return=minimal'
        },
        body: body,
        keepalive: !!useKeepalive
      });
      if (res && res.ok) {
        queue = queue.slice(batch.length);
        saveQueue();
      } else {
        saveQueue();
      }
    } catch (e) {
      saveQueue();
    }
  }

  function scheduleFlush() {
    if (flushTimer) return;
    flushTimer = setInterval(function () { flush(false); }, FLUSH_EVERY_MS);
  }

  function sendDwell() {
    if (dwellSent) return;
    dwellSent = true;
    var seconds = Math.max(0, Math.round((Date.now() - pageStart) / 1000));
    record('dwell', null, seconds, null, null);
    flush(true);
  }

  /* Kết quả form: bọc các hàm của McLivestreamAPI. Chỉ ghi form nào + thành
     công hay lỗi (thông báo lỗi đã lọc); KHÔNG đọc nội dung các trường. */
  var FORM_BY_METHOD = {
    signUp: { 'danh-sach-mau.html': 'shopSignUp', 'danh-sach-shop.html': 'mauSignUp' }, // A3 10/11 un-swap v96
    signIn: { 'danh-sach-mau.html': 'shopSignIn', 'danh-sach-shop.html': 'mauSignIn' }, // A3 10/11 un-swap v96
    resetPassword: { 'danh-sach-mau.html': 'shopForgot', 'danh-sach-shop.html': 'mauForgot' }, // A3 10/11 un-swap v96
    saveMyShopProfile: { 'danh-sach-mau.html': 'shopProfileForm' }, // A3 10/11 un-swap v96
    submitJobPost: { 'danh-sach-mau.html': 'jobForm' }, // A3 10/11 un-swap v96
    saveMyProfile: { 'trang-cua-toi.html': 'myProfileForm' },
    submitFeedback: { '*': 'gopyForm' },
    submitReview: { 'ho-so.html': 'reviewForm' },
    uploadAlbumImages: { 'trang-cua-toi.html': 'myProfileForm' },
    uploadDemoVideo: { 'trang-cua-toi.html': 'myProfileForm' },
    uploadShopLogo: { 'danh-sach-mau.html': 'shopProfileForm' } // A3 10/11 un-swap v96
  };

  function formIdFor(method) {
    var map = FORM_BY_METHOD[method] || {};
    var file = safe(function () { return window.location.pathname.split('/').pop(); }, '');
    return map[file] || map['*'] || method;
  }

  function wrapApi() {
    try {
      var API = typeof window !== 'undefined' ? window.McLivestreamAPI : null;
      if (!API || API.__v2sWrapped) return;
      Object.keys(FORM_BY_METHOD).forEach(function (method) {
        var orig = API[method];
        if (typeof orig !== 'function') return;
        API[method] = function () {
          var formId = formIdFor(method);
          var args = arguments;
          var self = this;
          try {
            var out = orig.apply(self, args);
            if (out && typeof out.then === 'function') {
              return out.then(
                function (v) { record('form_result', formId, null, null, null); return v; },
                function (err) { record('form_result', formId, null, err && err.message ? err.message : String(err), null); throw err; }
              );
            }
            record('form_result', formId, null, null, null);
            return out;
          } catch (err) {
            record('form_result', formId, null, err && err.message ? err.message : String(err), null);
            throw err;
          }
        };
      });
      API.__v2sWrapped = true;
    } catch (e) { /* bỏ qua lặng lẽ */ }
  }

  function onClick(e) {
    try {
      var t = e && e.target;
      if (!t || !t.closest) return;
      var el = t.closest('[data-track]');
      if (el) record('click', el.getAttribute('data-track'), null, null, null);
    } catch (err) { /* bỏ qua */ }
  }

  function onChange(e) {
    try {
      var t = e && e.target;
      if (!t || !t.closest) return;
      var el = t.closest('[data-track]');
      if (el) record('click', el.getAttribute('data-track'), null, null, null);
    } catch (err) { /* bỏ qua */ }
  }

  function onSubmit(e) {
    try {
      var t = e && e.target;
      if (!t || !t.closest) return;
      var el = t.closest('[data-track]');
      if (el) record('click', el.getAttribute('data-track'), null, null, null);
    } catch (err) { /* bỏ qua */ }
  }

  // v119 (E-62, M_ID, 09/11): bo qua loi KHONG phai cua web.
  // - "Cannot read properties of undefined (reading 'M_ID')" o
  //   dang-nhap.html: khong co file nao cua web (html/js, ke ca
  //   js/data.js) chua 'M_ID' (grep toan bo repo: 0 ket qua) nen loi nay
  //   khong the do code web gay ra.
  // - Analytics 09/11: ca 67 lan deu o dang-nhap.html, element = null
  //   (window.onerror nhan filename rong) — dac trung loi cua script
  //   EXTENSION trinh duyet (password manager/autofill) chen vao trang
  //   dang nhap, chi kich hoat o trang co o mat khau; 0 lan ngay 08/11.
  // - Form dang nhap KHONG vo vi loi nay: ngay 09/11 van co 8 dang nhap
  //   thanh cong + 6 sai mat khau (form gui va nhan phan hoi auth that);
  //   ti le bam/gui 70/14 giong 08/11 (15/3) vi bam tinh ca bam vao o nhap.
  // Quy tac bo qua (chi 2 truong hop, de khong giau loi that):
  // (a) nguon la extension (chrome-extension://, moz-extension://, ...);
  // (b) thong bao doc thuoc tinh 'M_ID' ma nguon KHONG phai script cua
  //     web (rong hoac extension). Loi M_ID tu script web (neu sau nay
  //     web co doc M_ID) van ghi — test (6d) khang dinh.
  var EXT_SRC_RE = /^(chrome-extension|moz-extension|safari-extension|ms-browser-extension|extension):\/\//i;
  var MID_MSG_RE = /reading 'M_ID'/;

  function onJsError(msg, source, lineno, colno) {
    try {
      var src = source ? String(source) : '';
      var msgStr = msg == null ? '' : String(msg);
      if (EXT_SRC_RE.test(src)) return;
      if (MID_MSG_RE.test(msgStr) && !src) return;
      var file = null;
      if (src) {
        var parts = src.split('/');
        file = parts[parts.length - 1].split('?')[0] || null;
      }
      record('js_error', file, null, msg, null);
    } catch (err) { /* bỏ qua */ }
  }

  function onUnhandledRejection(e) {
    try {
      var r = e && e.reason;
      var msg;
      if (r && r.message) msg = r.message;
      else if (r && typeof r === 'object') {
        // v119: ly do reject dang object (vd {code, ...}) truoc day ghi
        // thanh "[object Object]" (103 lan ngay 09/11) — khong doc duoc.
        // Ghi JSON de analytics ngay sau doc duoc loi that gi.
        try { msg = JSON.stringify(r); } catch (err2) { msg = String(r); }
      } else msg = String(r);
      // Cung bo qua nhieu M_ID nhu onJsError: khong code web nao doc M_ID.
      if (MID_MSG_RE.test(msg)) return;
      record('js_error', null, null, msg, null);
    } catch (err) { /* bỏ qua */ }
  }

  function init() {
    if (started) return;
    started = true;
    try {
      queue = loadQueue().concat(queue);
      if (queue.length > MAX_QUEUE) queue = queue.slice(-MAX_QUEUE);
      getSessionId();
      wrapApi();
      setTimeout(wrapApi, 1500);
      if (typeof document !== 'undefined' && document.addEventListener) {
        document.addEventListener('click', onClick, true);
        document.addEventListener('change', onChange, true);
        document.addEventListener('submit', onSubmit, true);
        document.addEventListener('visibilitychange', function () {
          if (document.hidden) sendDwell();
        });
      }
      if (typeof window !== 'undefined') {
        window.addEventListener('pagehide', sendDwell);
        window.addEventListener('error', function (ev) {
          onJsError(ev.message, ev.filename, ev.lineno, ev.colno);
        });
        window.addEventListener('unhandledrejection', onUnhandledRejection);
      }
      var ref = safe(function () { return document.referrer || null; }, null);
      record('pageview', null, null, null, ref);
      scheduleFlush();
      flush(false);
    } catch (e) { /* tracker không bao giờ làm vỡ trang */ }
  }

  var API = {
    init: init,
    record: record,
    flush: flush,
    sanitize: sanitize,
    cleanReferrer: cleanReferrer,
    utmQuery: utmQuery,
    pagePath: pagePath,
    buildEvent: buildEvent,
    wrapApi: wrapApi,
    sendDwell: sendDwell,
    getSessionId: getSessionId,
    _queue: function () { return queue; },
    _setQueue: function (q) { queue = q || []; }
  };

  if (typeof window !== 'undefined') window.V2SAnalytics = API;
  if (typeof module !== 'undefined' && module.exports) module.exports = API;

  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
  }
})();
