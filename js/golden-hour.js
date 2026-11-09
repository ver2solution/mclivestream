/* v116 — Dải đếm ngược "Giờ vàng 11.11" trên trang chủ (thiết kế 09/11/2026).
   Phạm vi: chỉ dải #gio-vang-1111-strip trên index.html + file này + CSS
   .golden-hour-strip trong v20.css. Không sửa js/data.js, hero, form tìm
   kiếm, chip, dải kích hoạt; không thêm migration, không thêm ảnh.
   RÀNG BUỘC DEPLOY (thiết kế §2.1): dải CHỈ deploy cùng bản mà trang
   gio-vang-1111.html đã live (HTTP 200). Trang đó chưa tồn tại lúc code
   bản này — dải ở trạng thái GIỮ LẠI, không đóng gói deploy cho tới khi
   trang giờ vàng xong. Không đổi link dải sang tinh-lai-1111.html.
   Giờ: mọi khung giờ trong bảng là GIỜ VN. Code chuyển thời điểm tuyệt
   đối sang giờ tường VN (UTC+7) rồi mới so sánh, nên đếm ngược đúng dù
   múi giờ máy khách / máy test khác VN. */
(function () {
  'use strict';

  var VN_OFFSET_MS = 7 * 60 * 60 * 1000;
  // 21:00 ngày 11/11/2026 giờ VN — sau mốc này dải tự ẩn (thiết kế §2.1).
  var GOLDEN_END_MS = Date.UTC(2026, 10, 11, 21, 0, 0) - VN_OFFSET_MS;
  var DISMISS_KEY = 'v2s-golden-hour-dismissed';
  var SOON_MS = 15 * 60 * 1000;

  // Bảng khung giờ DUY NHẤT được phép dùng (thiết kế §2.3, nguồn nghiên
  // cứu §1.1 — noti.sale 07/11 + antt.nguoiduatin.vn). Không thêm khung,
  // không tự suy ra khung mới. Ghi chú điều kiện mã rút gọn đúng câu chữ
  // thiết kế dùng trên dải; điều kiện đầy đủ nằm ở trang gio-vang-1111.html.
  // Lưu ý: khung TikTok 23h ngày 11/11 có trong bảng nhưng không bao giờ
  // được chọn — dải ẩn từ 21h 11/11 theo §2.1 (giữ lại cho đủ bảng gốc).
  var SLOTS = [
    { day: 9, platform: 'TikTok Shop', hour: 11, note: 'mã 50% tối đa 11 triệu' },
    { day: 9, platform: 'TikTok Shop', hour: 23, note: 'mã 50% tối đa 11 triệu' },
    { day: 10, platform: 'Lazada', hour: 0, note: 'Flash Hour' },
    { day: 10, platform: 'TikTok Shop', hour: 11, note: 'mã 50% tối đa 11 triệu' },
    { day: 10, platform: 'Lazada', hour: 12, note: 'Flash Hour' },
    { day: 10, platform: 'Lazada', hour: 19, note: 'Flash Hour' },
    { day: 10, platform: 'Lazada', hour: 20, note: 'mã 20% tối đa 11 triệu, đơn từ 5 triệu' },
    { day: 10, platform: 'TikTok Shop', hour: 23, note: 'mã 50% tối đa 11 triệu' },
    { day: 11, platform: 'Shopee', hour: 0, note: 'SPayLater 11 triệu, đơn từ 5 triệu' },
    { day: 11, platform: 'Lazada', hour: 0, note: 'Flash Hour' },
    { day: 11, platform: 'Shopee', hour: 9, note: 'SPayLater 11 triệu, đơn từ 5 triệu' },
    { day: 11, platform: 'TikTok Shop', hour: 11, note: 'mã 50% tối đa 11 triệu' },
    { day: 11, platform: 'Shopee', hour: 12, note: 'SPayLater 11 triệu, đơn từ 5 triệu' },
    { day: 11, platform: 'Lazada', hour: 12, note: 'Flash Hour' },
    { day: 11, platform: 'Shopee', hour: 15, note: 'SPayLater 11 triệu, đơn từ 5 triệu' },
    { day: 11, platform: 'Lazada', hour: 19, note: 'Flash Hour' },
    { day: 11, platform: 'Shopee', hour: 21, note: 'SPayLater 11 triệu, đơn từ 5 triệu' },
    { day: 11, platform: 'TikTok Shop', hour: 23, note: 'mã 50% tối đa 11 triệu' }
  ];
  // Ưu tiên khi 2 khung trùng giờ (thiết kế §2.3): Shopee trước (sàn có mã
  // lớn nhất đợt này), rồi TikTok Shop, rồi Lazada.
  var PLATFORM_RANK = { 'Shopee': 0, 'TikTok Shop': 1, 'Lazada': 2 };

  // Thời điểm bắt đầu của 1 khung, tính bằng ms tuyệt đối (khung HHh ngày
  // D tháng 11/2026 giờ VN).
  function slotStartMs(slot) {
    return Date.UTC(2026, 10, slot.day, slot.hour, 0, 0) - VN_OFFSET_MS;
  }

  // Giờ tường VN (năm/tháng/ngày/giờ) của 1 thời điểm tuyệt đối.
  function vnParts(ms) {
    var d = new Date(ms + VN_OFFSET_MS);
    return {
      year: d.getUTCFullYear(), month: d.getUTCMonth(), day: d.getUTCDate(),
      hour: d.getUTCHours()
    };
  }

  // Khung tiếp theo: thời điểm bắt đầu > hiện tại gần nhất; hết khung trong
  // ngày thì sang ngày sau. Trả null khi không còn khung nào.
  function nextGoldenSlot(nowMs) {
    var best = null, bestStart = Infinity;
    for (var i = 0; i < SLOTS.length; i++) {
      var start = slotStartMs(SLOTS[i]);
      if (start > nowMs && start < bestStart) { best = SLOTS[i]; bestStart = start; }
      // Trùng giờ: khung có PLATFORM_RANK thấp hơn thắng (start bằng nhau
      // thì vòng lặp giữ khung đầu tiên gặp — bảng đã xếp Shopee trước
      // Lazada ở các giờ trùng 0h/12h ngày 11/11).
      else if (start > nowMs && start === bestStart && best
        && PLATFORM_RANK[SLOTS[i].platform] < PLATFORM_RANK[best.platform]) {
        best = SLOTS[i];
      }
    }
    return best;
  }

  function dayWord(nowMs, slot) {
    var now = vnParts(nowMs);
    if (slot.day === now.day) return 'hôm nay';
    if (slot.day === 11) return '11/11';
    return 'ngày mai';
  }

  function eyebrow(nowMs) {
    var now = vnParts(nowMs);
    var todayMs = Date.UTC(now.year, now.month, now.day);
    var day11Ms = Date.UTC(2026, 10, 11);
    var left = Math.round((day11Ms - todayMs) / 86400000);
    if (left <= 0) return '🔥 11.11 · HÔM NAY';
    if (left === 1) return '🔥 11.11 · CÒN 1 NGÀY';
    return '🔥 11.11 · CÒN ' + left + ' NGÀY';
  }

  function formatCountdown(ms) {
    if (!(ms > 0)) ms = 0;
    var s = Math.floor(ms / 1000);
    var h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
    function p(n) { return (n < 10 ? '0' : '') + n; }
    return p(h) + ':' + p(m) + ':' + p(sec);
  }

  // Trạng thái dải tại 1 thời điểm (ms tuyệt đối). Dùng cho cả DOM lẫn test.
  function goldenState(nowMs, dismissed) {
    if (dismissed || nowMs >= GOLDEN_END_MS) return { show: false };
    var slot = nextGoldenSlot(nowMs);
    if (!slot) return { show: false };
    var left = slotStartMs(slot) - nowMs;
    if (left <= 0) return { show: false }; // guard: không bao giờ hiện số âm
    return {
      show: true,
      slot: slot,
      msLeft: left,
      soon: left < SOON_MS,
      eyebrow: eyebrow(nowMs),
      line: 'Khung tiếp theo: ' + slot.platform + ' · ' + dayWord(nowMs, slot)
        + ' ' + slot.hour + 'h — ' + slot.note,
      countdown: 'Mở sau ' + formatCountdown(left)
    };
  }

  var api = {
    SLOTS: SLOTS, GOLDEN_END_MS: GOLDEN_END_MS, DISMISS_KEY: DISMISS_KEY,
    slotStartMs: slotStartMs, nextGoldenSlot: nextGoldenSlot,
    formatCountdown: formatCountdown, goldenState: goldenState, eyebrow: eyebrow
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') window.V2SGoldenHour = api;

  // ---- Gắn DOM (chỉ chạy trong trình duyệt) ----
  if (typeof document === 'undefined') return;
  function init() {
    var strip = document.getElementById('gio-vang-1111-strip');
    if (!strip) return;
    var eyebrowEl = document.getElementById('goldenHourEyebrow');
    var lineEl = document.getElementById('goldenHourLine');
    var countEl = document.getElementById('goldenHourCount');
    var soonEl = document.getElementById('goldenHourSoon');
    var closeBtn = document.getElementById('goldenHourClose');
    var timer = null;
    function stop() { if (timer) { clearInterval(timer); timer = null; } }
    function tick() {
      var dismissed = false;
      try { dismissed = window.localStorage.getItem(DISMISS_KEY) === '1'; } catch (e) {}
      var st = goldenState(Date.now(), dismissed);
      if (!st.show) { strip.hidden = true; stop(); return; }
      if (eyebrowEl) eyebrowEl.textContent = st.eyebrow;
      if (lineEl) lineEl.textContent = st.line;
      if (countEl) countEl.textContent = st.countdown;
      if (soonEl) soonEl.hidden = !st.soon;
      strip.classList.toggle('soon', !!st.soon);
      strip.hidden = false;
    }
    if (closeBtn) closeBtn.addEventListener('click', function () {
      try { window.localStorage.setItem(DISMISS_KEY, '1'); } catch (e) {}
      strip.hidden = true; stop();
    });
    tick();
    timer = setInterval(tick, 1000);
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else { init(); }
})();
