/* v17 — Module Filters: lọc và sắp xếp hồ sơ mẫu.
 * Hàm thuần: nhận danh sách vào, trả danh sách ra, không đọc DOM.
 * Nguồn: tách từ code inline của v16, giữ nguyên hành vi và thứ tự.
 */
(function (root, factory) {
  var api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') root.McFilters = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  function sortModels(list, mode) {
    var arr = list.slice();
    if (mode === 'comments') arr.sort(function (a, b) { return b.comments - a.comments || b.views - a.views; });
    else if (mode === 'salaryAsc') arr.sort(function (a, b) { return (a.salaryNum == null ? Infinity : a.salaryNum) - (b.salaryNum == null ? Infinity : b.salaryNum); });
    else if (mode === 'salaryDesc') arr.sort(function (a, b) { return (b.salaryNum == null ? -1 : b.salaryNum) - (a.salaryNum == null ? -1 : a.salaryNum); });
    else if (mode === 'newest') arr.sort(function (a, b) { return String(b.date).localeCompare(String(a.date)); });
    else arr.sort(function (a, b) { return b.views - a.views || b.comments - a.comments; });
    return arr;
  }

  /* Bộ lọc chuẩn: tỉnh (khu vực mẫu muốn làm việc), lĩnh vực, giới tính.
   * Giới tính chỉ lọc đúng giá trị đã ghi; không suy đoán. */
  function filterModels(list, opts) {
    opts = opts || {};
    return list.filter(function (m) {
      if (opts.province && m.province !== opts.province) return false;
      if (opts.category && m.cat !== opts.category) return false;
      if (opts.gender && m.gender !== opts.gender) return false;
      return true;
    });
  }

  /* Nhóm Nổi bật trên trang chủ v16: hồ sơ có ảnh trong bài gốc. */
  function featuredModels(list) {
    return list.filter(function (m) { return m.photoHas; });
  }

  /* Nhóm Mới trên trang chủ v16: 6 hồ sơ theo ngày bài đăng mới nhất. */
  function newestModels(list, limit) {
    return sortModels(list, 'newest').slice(0, limit || 6);
  }

  return {
    sortModels: sortModels,
    filterModels: filterModels,
    featuredModels: featuredModels,
    newestModels: newestModels
  };
});
