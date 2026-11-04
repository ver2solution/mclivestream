/* v17 — Module Render Cards: sinh HTML thẻ hồ sơ và tin tức.
 * Hàm thuần: nhận dữ liệu vào, trả HTML ra, không đọc DOM.
 * Mọi dữ liệu chèn vào HTML đều qua McUtils.esc.
 * Nguồn: tách từ code inline của v16, giữ nguyên nội dung thẻ:
 * tên, tỉnh, giới tính, dịch vụ live, Doanh thu cao nhất, lượt xem,
 * bình luận, nhãn CHƯA XÁC NHẬN ĐỒNG Ý ĐĂNG WEB, link bài gốc,
 * nút yêu cầu gỡ hồ sơ. Không bịa thêm số liệu.
 */
(function (root, factory) {
  var api = factory(typeof window !== 'undefined' ? root.McUtils : null);
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') root.McRender = api;
})(typeof self !== 'undefined' ? self : this, function (McUtils) {
  'use strict';

  var esc = McUtils ? McUtils.esc : function (s) {
    return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  };

  function salaryLabel(m) { return esc(m.salary); }

  function mcHTML(list, limit, provValue) {
    if (!list.length) {
      if (provValue) return '<p>Chưa có hồ sơ ở ' + esc(provValue) + '. Hiện chưa có hồ sơ thật nào ở tỉnh/thành này — không bịa hồ sơ. Hãy chọn tỉnh khác, chọn Toàn quốc / Live online, hoặc bấm Đặt lại toàn bộ.</p>';
      return '<p>Không có mẫu nào khớp bộ lọc. Hãy đặt lại bộ lọc.</p>';
    }
    var shown = list.slice(0, limit || list.length);
    var cards = shown.map(function (m) {
      return '<article class="mc-card duo-card"><div class="mc-photo"><span class="duo-dot ' + (m.status === 'Đang tìm việc' ? 'seeking' : 'employed') + '"><i></i>' + esc(m.status) + '</span><span class="duo-rating">Chưa có đánh giá</span><span class="mc-photo-note">' + (m.photoHas ? 'Có ảnh trong bài gốc' : 'Ảnh minh hoạ tạm — chưa phải ảnh thật') + '</span></div><div class="mc-body">\n' +
        '    <div class="mc-name"><span class="nm c2">' + esc(m.name || m.title) + '</span></div>\n' +
        '    <div class="mc-meta"><span class="t1">📍 ' + esc(m.province) + ' · Giới tính: ' + esc(m.gender) + '</span></div>\n' +
        '    <p class="duo-intro">' + esc(m.title) + ' — ' + esc(m.exp) + '</p>\n' +
        '    <div class="duo-services"><span class="tag main">Dịch vụ live: ' + esc(m.cat) + '</span><span class="tag alt">' + esc(m.form) + '</span></div>\n' +
        '    <div class="pop-line"><span>💰 Doanh thu cao nhất: <b>' + esc(m.topRevenue || 'Chưa cập nhật') + '</b></span></div>\n' +
        '    <div class="pop-line"><span>👁 <b>' + m.views + '</b> lượt xem</span><span>💬 <b>' + m.comments + '</b> bình luận</span></div>\n' +
        '    <div class="mc-foot"><div class="mc-price"><div class="duo-price">' + salaryLabel(m) + '</div><span>Giá theo giờ / thù lao ghi trong bài</span></div><a class="btn btn-brand btn-sm" href="ho-so.html?id=' + esc(m.id) + '" target="_blank" rel="noopener">Xem hồ sơ →</a></div>\n' +
        (m.isSupabase
          ? '    <p class="mc-warn">✓ Hồ sơ đã duyệt và đã đồng ý hiển thị qua Supabase.</p>'
          : '    <p class="mc-warn">⚠ CHƯA XÁC NHẬN ĐỒNG Ý ĐĂNG WEB — <a href="https://zalo.me/0329983699" target="_blank" rel="noopener">Yêu cầu gỡ hồ sơ</a> · <a href="' + esc(m.src) + '" target="_blank" rel="noopener">Xem bài gốc</a></p>') +
        '\n  </div></article>';
    }).join('');
    var more = list.length > shown.length ? '<p class="mc-more"><a href="danh-sach-mau.html">Xem tất cả ' + list.length + ' hồ sơ →</a></p>' : '';
    return cards + more;
  }

  function modelHTML(list) {
    if (!list.length) return '<p>Không có mẫu nào khớp bộ lọc.</p>';
    return list.map(function (m) {
      return '<div class="model-row"><h3>' + esc(m.name || m.title) + ' — ' + esc(m.title) + '</h3>\n' +
        '  <p class="meta">' + esc(m.province) + ' · ' + esc(m.cat) + ' · ' + esc(m.form) + ' · Giới tính: ' + esc(m.gender) + ' · Lương: ' + salaryLabel(m) + ' · 👁 ' + m.views + ' · 💬 ' + m.comments + '</p>\n' +
        '  <p>' + esc(m.exp) + '</p><p>' + (m.isSupabase
          ? '<a href="ho-so.html?id=' + esc(m.id) + '" target="_blank" rel="noopener">Xem toàn bộ →</a>'
          : '<b>Ảnh:</b> ' + esc(m.photo) + ' <a href="' + esc(m.src) + '" target="_blank" rel="noopener">Xem bài gốc →</a> <a href="ho-so.html?id=' + esc(m.id) + '" target="_blank" rel="noopener">Xem toàn bộ →</a>') + '</p></div>';
    }).join('');
  }

  function newsHTML(list) {
    if (!list.length) return '<p>Không có bài nào khớp chuyên mục đã chọn.</p>';
    return list.map(function (a) {
      return '<div class="news-item"><div class="news-cat">' + esc(a.cat) + ' · ' + esc(a.source) + '</div>\n' +
        (a.url
          ? '<a href="' + esc(a.url) + '" target="_blank" rel="noopener">' + esc(a.title) + '</a>'
          : '<strong>' + esc(a.title) + '</strong> <span>(bài demo nội bộ, chưa có link báo gốc)</span>') +
        '\n  <div class="meta">' + (a.date ? ('Ngày: ' + esc(a.date)) : 'Chưa có ngày báo gốc') + '</div></div>';
    }).join('');
  }

  return { esc: esc, salaryLabel: salaryLabel, mcHTML: mcHTML, modelHTML: modelHTML, newsHTML: newsHTML };
});
