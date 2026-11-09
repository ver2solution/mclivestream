/* v87 — Bộ đếm online: số ẢO (minh hoạ) + số người THẬT đang online.
   ---------------------------------------------------------------------------
   QUAN TRỌNG — SỐ HIỂN THỊ LÀ SỐ MINH HOẠ, KHÔNG PHẢI THỐNG KÊ THẬT:
   - Số hiển thị trên mỗi trang = số gộp từ server (mức ảo gốc + số người
     thật đang online) + phần tăng tick local của chính trình duyệt này.
     Trang chủ hiển thị TỔNG 5 trang con (mẫu + shop + kiot + hỏi đáp +
     tin tức).
   - Mức ảo gốc (chốt 20:09 + 20:16 ngày 07/11/2026): mẫu 127, shop 213, kiot 43, hỏi đáp 17, tin tức 211 → tổng trang chủ 611.
     (v113 ngày 09/11/2026: giảm tổng 1.440 → 611, chia lẻ các trang con cho giống thật.)
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
   - Tick local (v93 — người dùng chốt 12:19 ngày 08/11/2026, thay quy ước
     3 tăng 1 giảm ±1 cũ vì số giật lên xuống): mỗi tick LÊN hẳn +3 hoặc
     +5 (xen kẽ theo pha), chỉ 1 tick trong chu kỳ 6 là XUỐNG −5 để số
     không kẹt ở trần band. Chu kỳ 6 tick: +3, +5, +3, +5, +3, −5
     (tăng ròng +14/6 tick). Mỗi tick sau mỗi khoảng xen kẽ 16s rồi 20s
     ([16000, 20000] lặp lại, trung bình 18s/tick/bộ đếm). Timer 5 bộ đếm
     lệch nhau (stagger) để tổng trang chủ đổi đều, không nhảy dồn:
     stagger 0 / 3,6s / 7,2s / 10,8s / 14,4s → trong mỗi chu kỳ 36s có
     đúng 10 tick, mỗi tick cách nhau ~3,6s, không có 2 tick nào trùng
     thời điểm (xem tickTimesMs + test). Tốc độ leo tổng ~+39/phút,
     ngang v91 (+41/phút) — chỉ đổi bước nhảy + nhịp, không đổi tốc độ.
   - Lưu trữ (localStorage 'v20_online_counters_v2'): CHỈ lưu phần tăng
     tick {tick: {mau, shop, kiot, hoidap, tintuc}, count: {...}, lastSeen}
     (count = số tick đã chạy của từng bộ đếm, để giữ đúng pha 3 tăng
     1 giảm khi vào lại). Thoát web vào lại: tiếp tục đúng số tick cũ,
     KHÔNG reset, KHÔNG cộng bù thời gian vắng. Thoát ≥4 tiếng
     (now − lastSeen >= 4h): reset tick và count về 0.
     Cập nhật lastSeen mỗi tick + khi visibilitychange/beforeunload.
   - v91 (BUG-02): tick mỗi bộ đếm bị CHẶN trong band [0, 50] (MAX_TICK)
     nên tổng trang chủ không bao giờ vượt 611 + 5×50 = 861 — dữ liệu
     cũ đã trôi (tick hàng nghìn) được kẹp về 50 ngay khi loadState đọc
     lại. Đa tab: CHỈ 1 tab "leader" được tick (khóa leader chung trong
     localStorage 'v20_online_counters_leader', TTL 10s); các tab còn lại
     chỉ đọc + hiển thị lại (qua sự kiện storage + timer của chính nó),
     nên mở 3 tab cũng chỉ tăng đúng nhịp 1 tab. Heartbeat presence thì
     KHÔNG gộp — mỗi tab là 1 người xem thật nên vẫn gửi riêng.
   - v91 (BUG-06): popup đăng ký lại dòng xu qua onSessionChange của
     auth-ui.js (đăng xuất → ẩn dòng xu ngay, không đợi chu kỳ 60s).
   - Fallback: không gọi được server (chưa chạy migration M8 / mất mạng)
     thì chỉ hiện số ảo (mức gốc + tick local). Mọi lỗi đều nuốt lặng —
     bộ đếm không bao giờ làm vỡ trang.
   ---------------------------------------------------------------------------
   Cách dùng: mỗi trang gắn 1 badge
     <p class="online-badge" data-online="mau|shop|kiot|hoidap|tintuc|total">
       <span class="online-dot" aria-hidden="true"></span>
       <span class="online-num">127</span>&nbsp;người đang online</p>
   và nạp file này SAU js/analytics.js (để mã phiên đã có sẵn). Trang chủ
   dùng data-online="total". Số trong .online-num lúc đầu phải khớp mức
   gốc (trang chủ 611) để trang hiện đúng số ngay cả khi JS chưa chạy.
   Popup online (bổ sung 20:51–20:52 ngày 07/11/2026): mỗi trang có badge
   còn có 1 popup nổi (.online-popup, fixed góc phải dưới) với biểu tượng
   sạp hàng vẽ bằng SVG inline (không emoji) — hiện LUÔN số người đang
   online, dùng đúng số gộp như badge (không tính lại logic đếm). Đã đăng
   nhập thì hiện thêm dòng "Đã tiêu: Y xu • Còn lại: Z xu" (lấy qua
   Ver2Reward.getMyPointsSummary(); chưa đăng nhập / lỗi thì ẩn dòng xu).
   Nút đóng (×) ẩn popup trong phiên hiện tại (sessionStorage
   v20_online_popup_closed). Popup KHÔNG chứa mục góp ý; nút góp ý 💬 trên
   các trang bài viết là tính năng riêng, không đụng tới. */
(function () {
  'use strict';

  var STORAGE_KEY = 'v20_online_counters_v2';
  var SESSION_KEY = 'v2s_analytics_session'; // tái dùng mã phiên của js/analytics.js
  var RESET_AFTER_MS = 4 * 60 * 60 * 1000; // 4 giờ
  var BASE = { mau: 127, shop: 213, kiot: 43, hoidap: 17, tintuc: 211 };
  var KEYS = ['mau', 'shop', 'kiot', 'hoidap', 'tintuc'];
  var INTERVALS_MS = [16000, 20000]; // v93: xen kẽ 16s rồi 20s (trung bình 18s/tick)
  // v93: Stagger lệch nhau 3,6s trong chu kỳ 36s (16+20) → 10 tick/chu kỳ,
  // mỗi tick cách nhau ~3,6s, không trùng nhau (xem tickTimesMs). Nhịp chậm
  // + bước nhảy lớn (+3/+5) thay cho nhịp 0,8s ±1 cũ — số lên từng bước rõ,
  // không giật lên xuống.
  var STAGGER_MS = { mau: 0, shop: 3600, kiot: 7200, hoidap: 10800, tintuc: 14400 };
  var HEARTBEAT_MS = 30000; // heartbeat presence mỗi 30s, chỉ khi tab hiển thị
  var MERGED_REFRESH_MS = 60000; // lấy lại số gộp từ server mỗi 60s
  var TOTAL_BASE = 611; // 127 + 213 + 43 + 17 + 211
  var POPUP_CLOSED_KEY = 'v20_online_popup_closed'; // đóng popup → ẩn trong phiên hiện tại (sessionStorage)
  // v91 (BUG-02): band chặn tick mỗi bộ đếm — tổng trang chủ tối đa
  // 611 + 5×50 = 861, không trôi vô hạn. = 50 để test cũ (loadState giữ
  // tick {10,20,30,40,50}) vẫn đúng.
  var MAX_TICK = 50;
  // v91 (BUG-02): khóa leader chống cộng dồn nhiều tab — tab nào giữ khóa
  // (mới hơn LEADER_TTL) thì tick, tab khác chỉ hiển thị lại.
  var LEADER_KEY = 'v20_online_counters_leader';
  var LEADER_TTL = 10000; // 10s: leader tick mỗi ~0,8s nên khóa luôn tươi
  var TAB_ID = 'tab_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);

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
  // v91 (BUG-02): kẹp tick về band [0, MAX_TICK] — dữ liệu cũ đã trôi xa
  // (tick hàng nghìn sau nhiều buổi mở tab) về lại band ngay khi đọc.
  function loadState(stored, now) {
    if (!stored || typeof stored !== 'object' || shouldReset(stored.lastSeen, now)) {
      return { tick: { mau: 0, shop: 0, kiot: 0, hoidap: 0, tintuc: 0 }, count: { mau: 0, shop: 0, kiot: 0, hoidap: 0, tintuc: 0 }, lastSeen: now };
    }
    var tick = {};
    var count = {};
    KEYS.forEach(function (k) {
      var v = Math.floor(Number(stored.tick && stored.tick[k]));
      tick[k] = (isFinite(v) && v >= 0) ? Math.min(v, MAX_TICK) : 0;
      var c = Math.floor(Number(stored.count && stored.count[k]));
      count[k] = (isFinite(c) && c >= 0) ? c : 0;
    });
    return { tick: tick, count: count, lastSeen: stored.lastSeen };
  }

  // v91 (BUG-02): bầu leader chống cộng dồn nhiều tab — pure, test được.
  // stored: {tab, at} đọc từ localStorage (hoặc null); now: ms hiện tại;
  // tabId: mã tab của tab đang hỏi. Trả {leader, save}: leader=true thì
  // tab này được tick và phải ghi save xuống localStorage; leader=false
  // thì chỉ hiển thị lại, không ghi state. Khóa hết hạn (≥ LEADER_TTL)
  // hoặc chưa có thì tab hỏi giành quyền; khóa còn tươi của tab khác thì
  // nhường; khóa của chính tab này thì làm mới thời gian.
  function leaderState(stored, now, tabId) {
    var n = Number(now);
    if (!stored || typeof stored !== 'object' || !stored.tab || !isFinite(Number(stored.at))
      || (n - Number(stored.at)) >= LEADER_TTL) {
      return { leader: true, save: { tab: tabId, at: n } };
    }
    if (stored.tab === tabId) return { leader: true, save: { tab: tabId, at: n } };
    return { leader: false, save: null };
  }

  function nextIntervalMs(step) { return INTERVALS_MS[((step % 2) + 2) % 2]; }

  // Pure: các mốc tick (ms từ lúc tải trang) của 1 bộ đếm — dùng để test
  // stagger (không có 2 tick nào trùng thời điểm trong 1 chu kỳ 36s).
  function tickTimesMs(key, n) {
    var times = [];
    var t = STAGGER_MS[key] || 0;
    var step = 0;
    for (var i = 0; i < n; i++) { t += nextIntervalMs(step); step++; times.push(t); }
    return times;
  }

  // v99 (§8 dac ta sao len top): RANDOM WALK co kiem soat, seed theo
  // cua so 8 gio (window8h, cung co che rotateWindow). Moi tick:
  // delta -12..+15 (co tang co giam ro), hiem (~8%) tut manh -20..-30
  // nhu nguoi that roi trang; keo ve muc tam cua so (15..35, khac nhau
  // moi khung 8h) de so khong troi xuong hay dinh tran. Cung
  // (win, key, count) cho cung delta — on dinh trong cua so, doi mau
  // khi sang khung 8h moi. count = so tick da chay cua bo dem do.
  function counterWindow8h(now){
    var t = (now instanceof Date) ? now.getTime() : Number(now);
    if(!isFinite(t)) t = Date.now();
    return Math.floor((t + 7*3600*1000) / (8*3600*1000));
  }
  function hash01(seed, n){
    var h = ((seed >>> 0) ^ Math.imul((Math.floor(Number(n)) || 0) + 1, 0x9E3779B1)) >>> 0;
    h = Math.imul(h ^ (h >>> 16), 0x45D9F3B) >>> 0;
    h = Math.imul(h ^ (h >>> 16), 0x45D9F3B) >>> 0;
    h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  }
  function seedForWindow(win, keyIdx){
    var h = (Math.floor(Number(win) || 0) ^ 0x9E3779B9) >>> 0;
    h = Math.imul(h ^ Math.imul(Math.floor(Number(keyIdx) || 0) + 1, 0x85EBCA6B), 0xC2B2AE35) >>> 0;
    h ^= h >>> 13;
    h = Math.imul(h, 0x27D4EB2D) >>> 0;
    h ^= h >>> 15;
    return h >>> 0;
  }
  // Muc tam cua tick trong 1 khung 8h (15..35) — moi khung, moi bo dem
  // co muc tam khac nhau nen so hien thi khong lap y het ngay nay qua
  // ngay khac.
  function windowCenter(win, keyIdx){
    return 15 + Math.floor(hash01(seedForWindow(win, keyIdx), 0x43454E54) * 21);
  }
  function tickDelta(count, win, keyIdx, cur){
    var w = (win == null) ? counterWindow8h(Date.now()) : win;
    var k = Math.floor(Number(keyIdx) || 0);
    var c = Math.floor(Number(count) || 0);
    var curV = (cur == null) ? MAX_TICK / 2 : Math.floor(Number(cur) || 0);
    var u = hash01(seedForWindow(w, k), c);
    if(u < 0.05) return -(20 + Math.floor((u / 0.05) * 11)); // -20..-30, hiem (~5%)
    var v = (u - 0.05) / 0.95;
    var base = -10 + Math.floor(v * 27); // -10..+16, trung binh +3
    var pull = (windowCenter(w, k) - curV) / 25; // -1..+1, keo ve muc tam
    var d = base + Math.round(pull * 6);
    if(d > 18) d = 18;
    if(d < -15) d = -15;
    return d;
  }

  function applyTick(tick, key, count, win){
    var out = {};
    KEYS.forEach(function (k) { out[k] = tick[k]; });
    var cur = Math.floor(Number(tick[key]) || 0);
    // v91 (BUG-02): kẹp bão hòa ở band [0, MAX_TICK] — random walk chi
    // dao dong quanh muc tam cua so, khong troi vo han.
    out[key] = Math.max(0, Math.min(MAX_TICK, cur + tickDelta(count, win, KEYS.indexOf(key), cur)));
    return out;
  }

  // Số hiển thị 1 trang con = số gộp server (hoặc mức gốc khi mất server)
  // + tick local của chính trình duyệt này.
  function displayForPage(merged, tick, key) {
    var base = (merged !== null && merged !== undefined && isFinite(merged))
      ? merged : BASE[key];
    return Math.max(0, Math.floor(Number(base) || 0)) + Math.max(0, Math.floor(Number(tick[key]) || 0));
  }

  // Số hiển thị trang chủ = số gộp tổng từ server (hoặc 611 khi mất
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

  // v91 (BUG-02): khóa leader chung trong localStorage — tab nào giữ khóa
  // thì tick, tab khác chỉ đọc + hiển thị lại.
  function readLeader() {
    return safe(function () {
      var raw = window.localStorage.getItem(LEADER_KEY);
      if (!raw) return null;
      return JSON.parse(raw);
    }, null);
  }
  function saveLeader(obj) {
    if (!obj) return;
    safe(function () { window.localStorage.setItem(LEADER_KEY, JSON.stringify(obj)); }, null);
  }
  function amLeader() {
    var stored = readLeader();
    if (!stored || stored.tab !== TAB_ID || !isFinite(Number(stored.at))) return false;
    return (Date.now() - Number(stored.at)) < LEADER_TTL;
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

  // v91 (BUG-02): 1 nhịp tick có điều kiện leader — tab không phải leader
  // thì đọc lại state mới nhất từ tab leader rồi chỉ hiển thị lại (không
  // ghi đè state cũ lên state mới của leader). Nhờ vậy N tab mở cùng lúc
  // cũng chỉ tăng đúng nhịp 1 tab.
  function maybeTick(key) {
    if (!state) return;
    var now = Date.now();
    var lead = leaderState(readLeader(), now, TAB_ID);
    if (!lead.leader) {
      state = loadState(readStored(), now);
      render();
      return;
    }
    saveLeader(lead.save);
    state = loadState(readStored(), now);
    tick(key);
  }

  function schedule(key, delay, nextStep) {
    setTimeout(function () {
      maybeTick(key);
      schedule(key, nextIntervalMs(nextStep), nextStep + 1);
    }, delay);
  }

  function detectPageKey() {
    if (typeof document === 'undefined') return null;
    var el = document.querySelector('[data-online]');
    return el ? el.getAttribute('data-online') : null;
  }

  // Dòng xu trong popup: chỉ hiện khi đã đăng nhập và RPC trả về.
  // Chưa đăng nhập / RPC lỗi / M7 chưa chạy → ẩn dòng xu, KHÔNG hiện 0
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
    // v91 (BUG-02): chỉ leader mới ghi lastSeen lúc mở trang — tab follower
    // ghi đè state cũ của nó lên state mới của leader sẽ làm mất tick.
    var lead0 = leaderState(readLeader(), Date.now(), TAB_ID);
    if (lead0.leader) { saveLeader(lead0.save); save(); }
    render();
    initPopup();
    // v91 (BUG-06): phiên đổi (đăng nhập/đăng xuất) thì làm mới NGAY dòng
    // xu popup — đăng xuất không còn giữ dòng xu cũ tới chu kỳ 60s.
    try {
      var A = window.V2SAuthUI;
      if (A && typeof A.onSessionChange === 'function') A.onSessionChange(function () { fetchPoints(); });
    } catch (e) { /* bỏ qua — popup vẫn làm mới theo chu kỳ 60s */ }
    KEYS.forEach(function (k) { schedule(k, (STAGGER_MS[k] || 0) + INTERVALS_MS[0], 1); });
    fetchMerged();
    mergedTimer = setInterval(function () { fetchMerged(); fetchPoints(); }, MERGED_REFRESH_MS);
    sendHeartbeat();
    heartbeatTimer = setInterval(sendHeartbeat, HEARTBEAT_MS);
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) { if (state && amLeader()) { state.lastSeen = Date.now(); save(); } }
      else { fetchMerged(); sendHeartbeat(); fetchPoints(); }
    });
    window.addEventListener('beforeunload', function () {
      if (state && amLeader()) { state.lastSeen = Date.now(); save(); }
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
    MAX_TICK: MAX_TICK, LEADER_KEY: LEADER_KEY, LEADER_TTL: LEADER_TTL,
    leaderState: leaderState,
    formatVi: formatVi, sumTick: sumTick, shouldReset: shouldReset,
    loadState: loadState, nextIntervalMs: nextIntervalMs,
    tickTimesMs: tickTimesMs, applyTick: applyTick, tickDelta: tickDelta,
    counterWindow8h: counterWindow8h, hash01: hash01, seedForWindow: seedForWindow,
    windowCenter: windowCenter,
    displayForPage: displayForPage, displayTotal: displayTotal,
    valueForKey: valueForKey, shouldShowPopup: shouldShowPopup,
    fetchPoints: fetchPoints,
    init: init
  };
  if (typeof window !== 'undefined') window.Ver2OnlineCounter = API;
  // v90: lam moi ngay dong diem popup sau moi lan tru diem thanh cong
  // (reward.js goi window.V20RefreshPopupPoints() trong spendPoints()).
  if (typeof window !== 'undefined') window.V20RefreshPopupPoints = fetchPoints;
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
  }
})();
