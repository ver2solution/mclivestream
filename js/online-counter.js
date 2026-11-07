/* v87 — Bộ đếm online: số ẢO (minh hoạ) + số người THẬT đang online.
   ---------------------------------------------------------------------------
   QUAN TRỌNG — SỐ HIỂN THỊ LÀ SỐ MINH HOẠ, KHÔNG PHẢI THỐNG KÊ THẬT:
   - Số hiển thị trên mỗi trang = số gộp từ server (mức ảo gốc + số người
     thật đang online) + phần tăng tick local của chính trình duyệt này.
     Trang chủ hiển thị TỔNG 5 trang con (mẫu + shop + kiot + hỏi đáp +
     tin tức).
   - Mức ảo gốc (chốt 20:09 + 20:16 ngày 07/11/2026): mẫu 300, shop 500,
     kiot 100, hỏi đáp 40, tin tức 500 → tổng trang chủ 1.440.
   - Số người thật được đếm ẩn danh tuyệt đối: mỗi tab đang mở web gửi
     heartbeat mỗi 30 giây (chỉ khi tab đang hiển thị) với mã phiên ngẫu
     nhiên đã có của tracker (sessionStorage 'v2s_analytics_session' —
     xem js/analytics.js). KHÔNG gửi email/SĐT/IP/dấu vân tay. Server chỉ
     trả về SỐ GỘP (ảo + thật) qua hàm get_online_display(); phía khách
     KHÔNG BAO GIỜ thấy số thật riêng (không có trong UI, network
     response hay console log).
   - LƯU Ý TRUNG THỰC (ghi để khỏi hiểu nhầm): mức ảo gốc là hằng số
     công khai (hiện trong HTML làm số ban đầu + trong spec), nên ai biết
     mức gốc cũng tính được số thật = số gộp − mức gốc. "Không lộ số thật"
     ở đây nghĩa là API/UI không trả/hiện số thật tách riêng; không phải
     là bảo mật mật mã. Số thật tách riêng chỉ hiện trong trang quản trị
     (quan-tri.html, chỉ chủ web đăng nhập mới xem được).
   - Tick local (quy ước người dùng chốt 22:09 ngày 07/11/2026): mỗi bộ
     đếm tăng 3 lần rồi giảm 1 lần; số giảm = số tăng = 1. Chu kỳ 4 tick:
     +1, +1, +1, −1 (tăng ròng +2/4 tick). Mỗi tick vẫn sau mỗi khoảng
     xen kẽ 3s rồi 5s ([3000, 5000] lặp lại). Timer 5 bộ đếm lệch nhau
     (stagger) để tổng trang chủ đổi mượt, không nhảy +5 cùng lúc:
     stagger 0 / 1,6s / 3,2s / 4,8s / 6,4s → trong mỗi chu kỳ 8s có đúng
     10 tick, mỗi tick cách nhau 0,8s, không có 2 tick nào trùng thời điểm
     (xem tickTimesMs + test).
   - Lưu trữ (localStorage 'v20_online_counters_v2'): CHỈ lưu phần tăng
     tick {tick: {mau, shop, kiot, hoidap, tintuc}, count: {...}, lastSeen}
     (count = số tick đã chạy của từng bộ đếm, để giữ đúng pha 3 tăng
     1 giảm khi vào lại). Thoát web vào lại: tiếp tục đúng số tick cũ,
     KHÔNG reset, KHÔNG cộng bù thời gian vắng. Thoát ≥4 tiếng
     (now − lastSeen >= 4h): reset tick và count về 0.
     Cập nhật lastSeen mỗi tick + khi visibilitychange/beforeunload.
     Đa tab: đồng bộ hiển thị qua sự kiện storage (best-effort — 2 tab
     cùng tick thì lần ghi cuối thắng, số có thể lệch nhẹ, chấp nhận được
     vì đây là số hiển thị minh hoạ).
   - Fallback: không gọi được server (chưa chạy migration M8 / mất mạng)
     thì chỉ hiện số ảo (mức gốc + tick local). Mọi lỗi đều nuốt lặng —
     bộ đếm không bao giờ làm vỡ trang.
   ---------------------------------------------------------------------------
   Cách dùng: mỗi trang gắn 1 badge
     <p class="online-badge" data-online="mau|shop|kiot|hoidap|tintuc|total">
       <span class="online-dot" aria-hidden="true"></span>
       <span class="online-num">300</span>&nbsp;người đang online</p>
   và nạp file này SAU js/analytics.js (để mã phiên đã có sẵn). Trang chủ
   dùng data-online="total". Số trong .online-num lúc đầu phải khớp mức
   gốc (trang chủ 1.440) để trang hiện đúng số ngay cả khi JS chưa chạy.
   Popup online (bổ sung 20:51–20:52 ngày 07/11/2026): mỗi trang có badge
   còn có 1 popup nổi (.online-popup, fixed góc phải dưới) với biểu tượng
   sạp hàng vẽ bằng SVG inline (không emoji) — hiện LUÔN số người đang
   online, dùng đúng số gộp như badge (không tính lại logic đếm). Đã đăng
   nhập thì hiện thêm dòng "Đã tiêu: Y điểm • Còn lại: Z điểm" (lấy qua
   Ver2Reward.getMyPointsSummary(); chưa đăng nhập / lỗi thì ẩn dòng điểm).
   Nút đóng (×) ẩn popup trong phiên hiện tại (sessionStorage
   v20_online_popup_closed). Popup KHÔNG chứa mục góp ý; nút góp ý 💬 trên
   các trang bài viết là tính năng riêng, không đụng tới. */
(function () {
  'use strict';

  var STORAGE_KEY = 'v20_online_counters_v2';
  var SESSION_KEY = 'v2s_analytics_session'; // tái dùng mã phiên của js/analytics.js
  var RESET_AFTER_MS = 4 * 60 * 60 * 1000; // 4 giờ
  var BASE = { mau: 300, shop: 500, kiot: 100, hoidap: 40, tintuc: 500 };
  var KEYS = ['mau', 'shop', 'kiot', 'hoidap', 'tintuc'];
  var INTERVALS_MS = [3000, 5000]; // xen kẽ 3s rồi 5s
  // Stagger: lệch nhau 1,6s trong chu kỳ 8s (3+5) → 10 tick/chu kỳ, mỗi
  // tick cách nhau 0,8s, không trùng nhau (xem tickTimesMs).
  var STAGGER_MS = { mau: 0, shop: 1600, kiot: 3200, hoidap: 4800, tintuc: 6400 };
  var HEARTBEAT_MS = 30000; // heartbeat presence mỗi 30s, chỉ khi tab hiển thị
  var MERGED_REFRESH_MS = 60000; // lấy lại số gộp từ server mỗi 60s
  var TOTAL_BASE = 1440; // 300 + 500 + 100 + 40 + 500
  var POPUP_CLOSED_KEY = 'v20_online_popup_closed'; // đóng popup → ẩn trong phiên hiện tại (sessionStorage)

  function formatVi(n) {
    var v = Math.max(0, Math.floor(Number(n) || 0));
    try { return v.toLocaleString('vi-VN'); }
    catch (e) { return String(v).replace(/\B(?=(\d{3})+(?!\d))/g, '.'); }
  }

  function sumTick(tick) {
    var t = 0;
    KEYS.forEach(function (k) { t += Math.max(0, Math.floor(Number(tick[k]) || 0)); });
    return t;
  }

  function shouldReset(lastSeen, now) {
    if (!lastSeen || !isFinite(lastSeen)) return true;
    return (now - lastSeen) >= RESET_AFTER_MS;
  }

  // Pure: từ object đã parse trong localStorage (hoặc null) →
  // {tick, count, lastSeen}. Không cộng bù thời gian vắng: vào lại chỉ
  // tiếp tục tick cũ. count thiếu (dữ liệu cũ chưa có) → 0.
  function loadState(stored, now) {
    if (!stored || typeof stored !== 'object' || shouldReset(stored.lastSeen, now)) {
      return { tick: { mau: 0, shop: 0, kiot: 0, hoidap: 0, tintuc: 0 }, count: { mau: 0, shop: 0, kiot: 0, hoidap: 0, tintuc: 0 }, lastSeen: now };
    }
    var tick = {};
    var count = {};
    KEYS.forEach(function (k) {
      var v = Math.floor(Number(stored.tick && stored.tick[k]));
      tick[k] = (isFinite(v) && v >= 0) ? v : 0;
      var c = Math.floor(Number(stored.count && stored.count[k]));
      count[k] = (isFinite(c) && c >= 0) ? c : 0;
    });
    return { tick: tick, count: count, lastSeen: stored.lastSeen };
  }

  function nextIntervalMs(step) { return INTERVALS_MS[((step % 2) + 2) % 2]; }

  // Pure: các mốc tick (ms từ lúc tải trang) của 1 bộ đếm — dùng để test
  // stagger (không có 2 tick nào trùng thời điểm trong 1 chu kỳ 8s).
  function tickTimesMs(key, n) {
    var times = [];
    var t = STAGGER_MS[key] || 0;
    var step = 0;
    for (var i = 0; i < n; i++) { t += nextIntervalMs(step); step++; times.push(t); }
    return times;
  }

  // Quy ước 3 tăng 1 giảm (người dùng chốt 22:09 ngày 07/11/2026):
  // count = số tick đã chạy của bộ đếm; tick thứ 4, 8, 12... (count % 4
  // === 3) thì GIẢM 1, các tick còn lại TĂNG 1. Số giảm = số tăng = 1.
  function tickDelta(count) {
    var c = Math.floor(Number(count) || 0);
    return ((((c % 4) + 4) % 4) === 3) ? -1 : 1;
  }

  function applyTick(tick, key, count) {
    var out = {};
    KEYS.forEach(function (k) { out[k] = tick[k]; });
    var cur = Math.floor(Number(tick[key]) || 0);
    out[key] = Math.max(0, cur + tickDelta(count));
    return out;
  }

  // Số hiển thị 1 trang con = số gộp server (hoặc mức gốc khi mất server)
  // + tick local của chính trình duyệt này.
  function displayForPage(merged, tick, key) {
    var base = (merged !== null && merged !== undefined && isFinite(merged))
      ? merged : BASE[key];
    return Math.max(0, Math.floor(Number(base) || 0)) + Math.max(0, Math.floor(Number(tick[key]) || 0));
  }

  // Số hiển thị trang chủ = số gộp tổng từ server (hoặc 1.440 khi mất
  // server) + tổng tick local 5 trang con.
  function displayTotal(mergedTotal, tick) {
    var base = (mergedTotal !== null && mergedTotal !== undefined && isFinite(mergedTotal))
      ? mergedTotal : TOTAL_BASE;
    return Math.max(0, Math.floor(Number(base) || 0)) + sumTick(tick);
  }

  // Số hiển thị của 1 trang (badge và popup dùng chung 1 giá trị — popup
  // KHÔNG tính lại logic đếm, chỉ hiện lại số của trang hiện tại).
  function valueForKey(key, merged, tick) {
    if (key === 'total') return displayTotal(merged, tick);
    return displayForPage(merged, tick, key);
  }

  // Popup có hiện không: đã đóng trong phiên hiện tại (sessionStorage = '1')
  // thì ẩn tới khi mở tab/phiên mới.
  function shouldShowPopup(closedFlag) { return closedFlag !== '1'; }

  // ---- Phần chạy trên trình duyệt (guard window/document) ----
  var state = null; // {tick, count, lastSeen}
  var mergedValue = null; // số gộp server của trang hiện tại (null = chưa lấy được)
  var mergedKey = null; // 'mau'|'shop'|'kiot'|'hoidap'|'tintuc'|'total'
  var pageKey = null; // trang hiện tại, suy từ badge ('total' → heartbeat page 'home')
  var heartbeatTimer = null;
  var mergedTimer = null;

  function safe(fn, fallback) { try { return fn(); } catch (e) { return fallback; } }

  function readStored() {
    return safe(function () {
      var raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      return JSON.parse(raw);
    }, null);
  }

  function save() {
    if (!state) return;
    safe(function () {
      var out = { tick: state.tick, count: state.count, lastSeen: Date.now() };
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(out));
    }, null);
  }

  // Mã phiên ẩn danh: tái dùng đúng key của js/analytics.js (1 tab = 1 mã).
  // Nếu analytics.js chưa chạy (hoặc chưa nạp ở trang này) thì tạo mới đúng
  // cùng định dạng 'sess_<thời gian base36>_<ngẫu nhiên>' để 2 module dùng
  // chung 1 mã. Không chứa thông tin nhận diện cá nhân.
  function getAnonKey() {
    return safe(function () {
      var s = null;
      try { s = window.sessionStorage.getItem(SESSION_KEY); } catch (e) { s = null; }
      if (!s) {
        s = 'sess_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 12);
        try { window.sessionStorage.setItem(SESSION_KEY, s); } catch (e) { /* bỏ qua */ }
      }
      return s;
    }, null) || ('sess_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 12));
  }

  function apiClient() {
    if (typeof window === 'undefined') return null;
    var a = window.McLivestreamAPI;
    return (a && a.client) ? a.client : null;
  }

  // Lấy số gộp từ server qua RPC get_online_display(p_page). Chỉ trả về 1
  // số nguyên (ảo + thật); phía khách không bao giờ biết số thật riêng.
  function fetchMerged() {
    var client = apiClient();
    if (!client || typeof client.rpc !== 'function' || !mergedKey) return;
    client.rpc('get_online_display', { p_page: mergedKey }).then(function (res) {
      if (res && !res.error && isFinite(Number(res.data))) {
        mergedValue = Math.floor(Number(res.data));
        render();
      }
      // Lỗi (vd M8 chưa chạy): giữ mergedValue cũ/null → fallback số ảo.
    }, function () { /* nuốt lặng — fallback số ảo */ });
  }

  // Heartbeat presence: upsert (anon_key, page, last_seen). Chỉ gửi khi tab
  // đang hiển thị. Không gửi gì khác ngoài 3 trường này.
  function sendHeartbeat() {
    if (typeof document === 'undefined' || document.visibilityState !== 'visible') return;
    var client = apiClient();
    if (!client || typeof client.from !== 'function') return;
    var anonKey = getAnonKey();
    var page = (pageKey === 'total') ? 'home' : pageKey;
    if (!anonKey || !page) return;
    safe(function () {
      client.from('online_presence').upsert(
        { anon_key: anonKey, page: page, last_seen: new Date().toISOString() },
        { onConflict: 'anon_key,page' }
      ).then(function () { /* xong — không log gì */ }, function () { /* nuốt lặng */ });
    }, null);
  }

  function render() {
    if (!state || typeof document === 'undefined') return;
    var els = document.querySelectorAll('[data-online]');
    for (var i = 0; i < els.length; i++) {
      var key = els[i].getAttribute('data-online');
      if (key !== 'total' && KEYS.indexOf(key) === -1) continue;
      var num = els[i].querySelector('.online-num');
      if (num) num.textContent = formatVi(valueForKey(key, mergedValue, state.tick));
    }
    // Popup hiện đúng số của trang hiện tại (cùng giá trị với badge).
    if (mergedKey) {
      var popNums = document.querySelectorAll('.online-popup-num');
      for (var j = 0; j < popNums.length; j++) {
        popNums[j].textContent = formatVi(valueForKey(mergedKey, mergedValue, state.tick));
      }
    }
  }

  function tick(key) {
    if (!state) return;
    if (!state.count) state.count = { mau: 0, shop: 0, kiot: 0, hoidap: 0, tintuc: 0 };
    var c = Math.floor(Number(state.count[key]) || 0);
    state.tick = applyTick(state.tick, key, c);
    state.count[key] = c + 1;
    state.lastSeen = Date.now();
    save();
    render();
  }

  function schedule(key, delay, nextStep) {
    setTimeout(function () {
      tick(key);
      schedule(key, nextIntervalMs(nextStep), nextStep + 1);
    }, delay);
  }

  function detectPageKey() {
    if (typeof document === 'undefined') return null;
    var el = document.querySelector('[data-online]');
    return el ? el.getAttribute('data-online') : null;
  }

  // Dòng điểm trong popup: chỉ hiện khi đã đăng nhập và RPC trả về.
  // Chưa đăng nhập / RPC lỗi / M7 chưa chạy → ẩn dòng điểm, KHÔNG hiện 0
  // gây hiểu nhầm. Mọi lỗi nuốt lặng — popup không bao giờ làm vỡ trang.
  function fetchPoints() {
    var line = null;
    try { line = document.getElementById('onlinePopupPoints'); } catch (e) { line = null; }
    if (!line) return;
    try {
      var r = window.Ver2Reward;
      if (!r || typeof r.getMyPointsSummary !== 'function') { line.hidden = true; return; }
      r.getMyPointsSummary().then(function (s) {
        if (!s || s.ok !== true) { line.hidden = true; return; }
        var spentEl = line.querySelector('.online-popup-spent');
        var leftEl = line.querySelector('.online-popup-left');
        if (spentEl) spentEl.textContent = formatVi(s.spent);
        if (leftEl) leftEl.textContent = formatVi(s.balance);
        line.hidden = false;
      }, function () { line.hidden = true; });
    } catch (e) { try { line.hidden = true; } catch (err) { /* bỏ qua */ } }
  }

  function popupClosedFlag() {
    try { return window.sessionStorage.getItem(POPUP_CLOSED_KEY); } catch (e) { return null; }
  }

  // Popup: có sẵn trong HTML với thuộc tính hidden; JS chỉ hiện khi chưa
  // đóng trong phiên hiện tại. Nút đóng ghi sessionStorage rồi ẩn popup.
  function initPopup() {
    var p = null;
    try { p = document.getElementById('onlinePopup'); } catch (e) { p = null; }
    if (!p) return;
    if (!shouldShowPopup(popupClosedFlag())) { p.hidden = true; return; }
    p.hidden = false;
    var btn = null;
    try { btn = document.getElementById('onlinePopupClose'); } catch (e) { btn = null; }
    if (btn) btn.addEventListener('click', function () {
      try { window.sessionStorage.setItem(POPUP_CLOSED_KEY, '1'); } catch (e) { /* bỏ qua */ }
      p.hidden = true;
    });
    fetchPoints();
  }

  function init() {
    if (typeof document === 'undefined' || typeof window === 'undefined') return;
    pageKey = detectPageKey();
    if (!pageKey) return; // trang không có badge thì module không làm gì
    mergedKey = pageKey; // 'total' cũng là tham số hợp lệ của get_online_display
    state = loadState(readStored(), Date.now());
    save(); // ghi lastSeen ngay lúc mở trang
    render();
    initPopup();
    KEYS.forEach(function (k) { schedule(k, (STAGGER_MS[k] || 0) + INTERVALS_MS[0], 1); });
    fetchMerged();
    mergedTimer = setInterval(function () { fetchMerged(); fetchPoints(); }, MERGED_REFRESH_MS);
    sendHeartbeat();
    heartbeatTimer = setInterval(sendHeartbeat, HEARTBEAT_MS);
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) { if (state) state.lastSeen = Date.now(); save(); }
      else { fetchMerged(); sendHeartbeat(); fetchPoints(); }
    });
    window.addEventListener('beforeunload', function () {
      if (state) state.lastSeen = Date.now();
      save();
    });
    window.addEventListener('storage', function (e) {
      if (!e || e.key !== STORAGE_KEY || !e.newValue) return;
      try {
        var incoming = JSON.parse(e.newValue);
        if (incoming && typeof incoming === 'object') {
          state = loadState(incoming, Date.now());
          render();
        }
      } catch (err) { /* bỏ qua giá trị hỏng từ tab khác */ }
    });
  }

  var API = {
    STORAGE_KEY: STORAGE_KEY, SESSION_KEY: SESSION_KEY,
    POPUP_CLOSED_KEY: POPUP_CLOSED_KEY,
    RESET_AFTER_MS: RESET_AFTER_MS, BASE: BASE, KEYS: KEYS,
    INTERVALS_MS: INTERVALS_MS, STAGGER_MS: STAGGER_MS,
    HEARTBEAT_MS: HEARTBEAT_MS, MERGED_REFRESH_MS: MERGED_REFRESH_MS,
    TOTAL_BASE: TOTAL_BASE,
    formatVi: formatVi, sumTick: sumTick, shouldReset: shouldReset,
    loadState: loadState, nextIntervalMs: nextIntervalMs,
    tickTimesMs: tickTimesMs, applyTick: applyTick, tickDelta: tickDelta,
    displayForPage: displayForPage, displayTotal: displayTotal,
    valueForKey: valueForKey, shouldShowPopup: shouldShowPopup,
    init: init
  };
  if (typeof window !== 'undefined') window.Ver2OnlineCounter = API;
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
  }
})();
