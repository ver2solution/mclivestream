/* v17 — Module Supabase API: lớp bọc mỏng quanh window.McLivestreamAPI.
 * Mọi trang dùng API qua McApi thay vì gọi window.McLivestreamAPI rải rác.
 * API thật vẫn nằm ở mclivestream-supabase.js (anon key, không service_role);
 * file này chỉ chuẩn hóa tên gọi, kiểm tra null và quy tắc hiển thị.
 * Quy tắc hiển thị công khai (không được đổi): hồ sơ chỉ hiện khi
 * moderation_status = 'approved' VÀ consent_status = 'consented'.
 * Hồ sơ mới luôn ở 'pending'.
 */
(function (root, factory) {
  var api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') root.McApi = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  function raw() {
    if (typeof window !== 'undefined') return window.McLivestreamAPI || null;
    return null;
  }

  function isConfigured() { return !!raw(); }

  /* Hồ sơ đủ điều kiện hiện công khai (dùng cho dữ liệu Supabase trả về). */
  function isPublicProfile(p) {
    return !!p && p.moderation_status === 'approved' && p.consent_status === 'consented';
  }

  function publicProfiles(list) {
    return (list || []).filter(isPublicProfile);
  }

  function fetchPublicProfiles() {
    var api = raw();
    if (!api || !api.fetchPublicProfiles) return Promise.resolve(null);
    return api.fetchPublicProfiles();
  }

  function fetchTopProfiles(limit) {
    var api = raw();
    if (!api || !api.fetchTopProfiles) return Promise.resolve(null);
    return api.fetchTopProfiles(limit);
  }

  return {
    isConfigured: isConfigured,
    isPublicProfile: isPublicProfile,
    publicProfiles: publicProfiles,
    fetchPublicProfiles: fetchPublicProfiles,
    fetchTopProfiles: fetchTopProfiles
  };
});
