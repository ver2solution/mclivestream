/* v19 — Module Filter URL: trạng thái lọc tỉnh / lĩnh vực / giới tính /
 * sắp xếp + từ khóa tìm kiếm (q) + số trang (page) được đưa vào URL để
 * chia sẻ và quay lại không mất lọc. V19 sửa điểm còn thiếu của v18:
 * tham số page trước đây chưa nối vào URL nên chia sẻ link kèm số trang
 * không được; nay page được parse/build cùng 5 khóa còn lại, và đổi lọc
 * thì page về 1 (đúng hành vi đã chốt ở v17.2).
 * Bài học từ CareerViet và timviec: lọc không đưa vào URL thì sang trang
 * là mất, người dùng phải chọn lại từ đầu.
 * Tương thích trình duyệt (window.McFilterUrl) và Node (module.exports).
 */
(function (root, factory) {
  var api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') root.McFilterUrl = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var KEYS = ['prov', 'cat', 'gender', 'sort', 'q', 'page'];

  function parseFilterParams(search) {
    var out = {};
    var qs = String(search || '').replace(/^\?/, '');
    if (!qs) return out;
    qs.split('&').forEach(function (pair) {
      var kv = pair.split('=');
      if (kv.length < 2) return;
      var key = decodeURIComponent(kv[0]);
      var val = decodeURIComponent(kv[1].replace(/\+/g, ' ')).trim();
      if (KEYS.indexOf(key) !== -1 && val) out[key] = val;
    });
    return out;
  }

  function buildFilterQuery(opts) {
    var parts = [];
    KEYS.forEach(function (key) {
      if (opts && opts[key]) parts.push(encodeURIComponent(key) + '=' + encodeURIComponent(opts[key]));
    });
    return parts.join('&');
  }

  function readSelects(doc) {
    function val(id) {
      var el = doc.getElementById(id);
      return el ? (el.value || '').trim() : '';
    }
    return { prov: val('prov'), cat: val('cat'), gender: val('gender'), sort: val('sortM') };
  }

  /* Bản trình duyệt: đặt select theo URL, bấm Áp dụng nếu có lọc trong
   * URL; khi shop bấm Áp dụng thì ghi trạng thái lọc vào URL. */
  function bindFilterUrl() {
    if (typeof document === 'undefined' || typeof location === 'undefined') return false;
    var params = parseFilterParams(location.search);
    var map = { prov: 'prov', cat: 'cat', gender: 'gender', sort: 'sortM' };
    var hasFilter = false;
    Object.keys(map).forEach(function (key) {
      if (!params[key]) return;
      var el = document.getElementById(map[key]);
      if (!el) return;
      var ok = Array.prototype.some.call(el.options || [], function (o) { return o.value === params[key] || o.text === params[key]; });
      if (ok) { el.value = params[key]; hasFilter = true; }
    });
    var applyBtn = document.getElementById('applyBtn');
    if (applyBtn) {
      applyBtn.addEventListener('click', function () {
        try {
          var q = buildFilterQuery(readSelects(document));
          var url = location.pathname + (q ? '?' + q : '');
          history.replaceState(null, '', url);
        } catch (e) { /* URL không ghi được thì lọc vẫn chạy bình thường */ }
      });
      if (hasFilter) applyBtn.click();
    }
    return hasFilter;
  }

  return {
    KEYS: KEYS,
    parseFilterParams: parseFilterParams,
    buildFilterQuery: buildFilterQuery,
    readSelects: readSelects,
    bindFilterUrl: bindFilterUrl
  };
});
