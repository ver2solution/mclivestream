/* v17 — Module Utils: hàm tiện ích dùng chung cho mọi trang.
 * Hàm thuần, không đọc DOM, không gọi API. Tương thích trình duyệt
 * (window.McUtils) và Node (module.exports) để chạy test.
 * Nguồn: tách từ code inline của v16, giữ nguyên hành vi.
 */
(function (root, factory) {
  var api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') root.McUtils = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  /* Escape HTML trước khi chèn dữ liệu vào trang (chống XSS).
   * Áp dụng cho tên, tiêu đề, mô tả, mọi chuỗi lấy từ dữ liệu. */
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }

  /* Chỉ chấp nhận URL ngoài an toàn hoặc đường dẫn nội bộ. */
  function safeUrl(u) {
    var s = String(u || '');
    if (/^https?:\/\//i.test(s)) return s;
    if (/^[a-z0-9\-_./#?=&]+$/i.test(s)) return s;
    return '#';
  }

  return { esc: esc, safeUrl: safeUrl };
});
