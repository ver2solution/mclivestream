/* v17 — Module Detail Tabs: dựng 5 tab trang chi tiết hồ sơ.
 * Nguồn: tách từ code inline của ho-so.html v16, giữ nguyên 5 tab.
 * v17.3: tab Hồ sơ rút gọn (chỉ mục chính, không tường chữ, không dòng
 * "Liên hệ:" cũ), các tab còn lại giữ ngắn gọn. Hàm buildTabs nhận phần
 * tử detail đã có nội dung hồ sơ và tự dựng thanh tab + panel; không
 * tự tải dữ liệu. Tương thích trình duyệt (window.McDetailTabs) và Node
 * (module.exports chỉ export danh sách tab và hàm buildPanels thuần).
 */
(function (root, factory) {
  var api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') root.McDetailTabs = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var TAB_NAMES = ['Hồ sơ', 'Dịch vụ live', 'Lịch nhận đơn', 'Đánh giá', 'Bài đăng / Story'];

  /* Bản thuần của nội dung từng tab, dùng cho test (không cần DOM):
   * pickWords là hàm chọn các đoạn chứa từ khóa, ở trình duyệt được
   * thay bằng việc quét các thẻ <p> trong nội dung chi tiết. */
  function buildPanels(detailHTML, pick) {
    pick = pick || function () { return '<p>Chưa cập nhật</p>'; };
    return {
      // v17.3 — tab Hồ sơ rút gọn, không còn tường chữ: chỉ các mục chính,
      // không lặp lại ảnh (hero đã có ảnh lớn), không lặp dòng "Liên hệ:"
      // cũ và không lặp link chi tiết / link trang mẫu.
      'Hồ sơ': pick(['CHƯA XÁC NHẬN', 'Kinh nghiệm', 'Lịch làm việc', 'Lương mong muốn', 'Doanh thu cao nhất', 'Học vấn', 'Chiều cao', 'Ghi chú']),
      'Dịch vụ live': pick(['Lĩnh vực', 'Hình thức', 'Kinh nghiệm', 'Doanh thu cao nhất']) + '<p>Giai đoạn 1: shop liên hệ trực tiếp với mẫu qua thông tin trong bài gốc hoặc qua Zalo của Ver2Solution. Không có thanh toán nội bộ, chat riêng hay donate trong bản này.</p>',
      'Lịch nhận đơn': pick(['Lịch làm việc', 'Lịch:']) + '<p>Lịch nhận đơn chi tiết theo ca: Chưa cập nhật. Lịch ghi trong bài gốc là lịch tại thời điểm bài đăng, cần xác nhận lại với mẫu trước khi chốt.</p>',
      'Đánh giá': '<p><b>Chưa có đánh giá.</b> Chưa có đánh giá nào đã kiểm chứng cho hồ sơ này, nên không hiển thị sao hay nhận xét bịa. Đánh giá mới gửi qua form trên web sẽ ở trạng thái chờ duyệt trước khi hiện công khai.</p>',
      'Bài đăng / Story': pick(['Nguồn bài gốc', 'Ảnh:', 'Album ảnh', 'Video demo']) + '<p>Story riêng của mẫu trên web: Chưa cập nhật. Bài đăng gốc trên Facebook được dẫn ở trên để đối chiếu.</p>'
    };
  }

  /* Khôi phục #detail gốc khi hero/tab lỗi: bỏ thanh tab + panel và
   * hiện lại nội dung gốc đã lưu trước khi ẩn. Đây là đường fallback
   * của v19: trang không bao giờ được để trống chỉ vì tab/hero lỗi. */
  function restoreDetail() {
    if (typeof document === 'undefined') return false;
    var detail = document.getElementById('detail');
    if (!detail) return false;
    var bar = document.getElementById('duoTabBar');
    if (bar && bar.parentNode) bar.parentNode.removeChild(bar);
    var wrap = document.getElementById('duoPanels');
    if (wrap && wrap.parentNode) wrap.parentNode.removeChild(wrap);
    if (detail.getAttribute('data-original-detail-html')) {
      detail.innerHTML = detail.getAttribute('data-original-detail-html');
    }
    detail.style.display = '';
    return !!detail.innerHTML.trim();
  }

  /* Bản trình duyệt: quét <p> trong #detail rồi dựng tab, giữ đúng
   * hành vi v16 (tab đầu active, panel đầu là toàn bộ nội dung Hồ sơ).
   * v19: chỉ ẩn #detail gốc sau khi đã lưu bản gốc vào data attribute,
   * và chỉ khi options.hideOriginal !== false. Trang gọi (ho-so.html)
   * phải dựng hero TRƯỚC rồi mới gọi buildTabs, nên tab không bao giờ
   * là nguyên nhân làm mất nội dung trước khi hero xong. */
  function buildTabs(options) {
    if (typeof document === 'undefined') return false;
    var detail = document.getElementById('detail');
    if (!detail || !detail.innerHTML.trim() || document.getElementById('duoTabBar')) return false;
    if (!detail.getAttribute('data-original-detail-html')) {
      detail.setAttribute('data-original-detail-html', detail.innerHTML);
    }
    var tmp = document.createElement('div');
    tmp.innerHTML = detail.innerHTML;
    var ps = Array.prototype.slice.call(tmp.querySelectorAll('p'));
    function pick(words) {
      return ps.filter(function (p) {
        return words.some(function (w) { return p.textContent.indexOf(w) >= 0; });
      }).map(function (p) { return p.outerHTML; }).join('') || '<p>Chưa cập nhật</p>';
    }
    var panels = buildPanels(detail.innerHTML, pick);
    var bar = document.createElement('div');
    bar.id = 'duoTabBar';
    bar.className = 'duo-tabs';
    var wrap = document.createElement('div');
    wrap.id = 'duoPanels';
    Object.keys(panels).forEach(function (name, i) {
      var b = document.createElement('button');
      b.type = 'button';
      b.textContent = name;
      if (i === 0) b.className = 'active';
      b.onclick = function () {
        bar.querySelectorAll('button').forEach(function (x) { x.className = ''; });
        b.className = 'active';
        wrap.innerHTML = '<div class="duo-panel">' + panels[name] + '</div>';
      };
      bar.appendChild(b);
    });
    wrap.innerHTML = '<div class="duo-panel">' + panels['Hồ sơ'] + '</div>';
    detail.parentNode.insertBefore(bar, detail);
    detail.parentNode.insertBefore(wrap, detail);
    if (!options || options.hideOriginal !== false) {
      detail.style.display = 'none';
    }
    return true;
  }

  return { TAB_NAMES: TAB_NAMES, buildPanels: buildPanels, buildTabs: buildTabs, restoreDetail: restoreDetail };
});
