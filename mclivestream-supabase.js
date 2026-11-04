/* v13: gender được truyền thẳng qua saveMyProfile; cần chạy supabase-migration-gender.sql trước khi lưu hồ sơ có giới tính. */
/* ============================================================
 * Sàn mclivestream — Tích hợp Supabase giai đoạn 1
 * Dùng cùng web tĩnh GitHub Pages, không cần server riêng.
 * Cách dùng: nạp supabase-js, rồi supabase-config.js, rồi file này.
 * Nếu chưa cấu hình (URL / key còn placeholder), window.McLivestreamAPI
 * = null và web dùng dữ liệu tĩnh cũ — không vỡ giao diện.
 * KHÔNG đưa service_role key vào file này.
 * ============================================================ */
(function () {
  'use strict';

  var cfg = window.MCLIVESTREAM_SUPABASE_CONFIG || {};
  var isConfigured = cfg.url && cfg.anonKey
    && !String(cfg.url).includes('YOUR-PROJECT-REF')
    && !String(cfg.anonKey).includes('YOUR-ANON-KEY');

  if (!isConfigured || !window.supabase) {
    window.McLivestreamAPI = null;
    return;
  }

  var client = window.supabase.createClient(cfg.url, cfg.anonKey);

  // Các cột chủ hồ sơ KHÔNG được gửi khi lưu — trigger trong schema.sql
  // sẽ chặn nếu client cố đổi chúng.
  var PROTECTED_FIELDS = [
    'moderation_status', 'consent_status', 'is_pinned',
    'view_count', 'is_demo', 'achievement_label'
  ];

  function stripProtected(data) {
    var out = {};
    Object.keys(data || {}).forEach(function (k) {
      if (PROTECTED_FIELDS.indexOf(k) === -1) out[k] = data[k];
    });
    return out;
  }

  function requireFields(data, fields) {
    var missing = fields.filter(function (f) {
      return data[f] === undefined || data[f] === null || String(data[f]).trim() === '';
    });
    if (missing.length) {
      throw new Error('Thiếu trường bắt buộc: ' + missing.join(', '));
    }
  }

  var REQUIRED_PROFILE_FIELDS = [
    'full_name', 'date_of_birth', 'hometown', 'work_location',
    'education', 'experience', 'desired_field',
    'phone_zalo', 'contact_email'
  ];

  // ---------- Auth ----------
  async function signUp(opts) {
    var res = await client.auth.signUp({
      email: opts.email,
      password: opts.password,
      options: { data: { phone_zalo: opts.phoneZalo || '' } }
    });
    if (res.error) throw res.error;
    return res.data;
  }

  async function signIn(opts) {
    var res = await client.auth.signInWithPassword({
      email: opts.email, password: opts.password
    });
    if (res.error) throw res.error;
    return res.data;
  }

  async function signOut() {
    await client.auth.signOut();
  }

  async function getSession() {
    var res = await client.auth.getSession();
    return res.data.session || null;
  }

  // Quên mật khẩu: gửi link đặt lại về email đã đăng ký.
  // redirectTo nên trỏ về trang đăng nhập của web sau khi deploy thật.
  async function resetPassword(email, redirectTo) {
    var res = await client.auth.resetPasswordForEmail(email, {
      redirectTo: redirectTo || window.location.href
    });
    if (res.error) throw res.error;
  }

  // ---------- Hồ sơ ----------
  function publicProfileQuery() {
    return client.from('profiles')
      .select('*')
      .eq('moderation_status', 'approved')
      .eq('consent_status', 'consented');
  }

  async function fetchPublicProfiles() {
    var res = await publicProfileQuery()
      .order('is_pinned', { ascending: false })
      .order('view_count', { ascending: false })
      .order('created_at', { ascending: false });
    if (res.error) throw res.error;
    return res.data || [];
  }

  // Mục 8 hồ sơ trang chủ: ghim trước, rồi nhiều xem nhất.
  // Hồ sơ mới không tự lọt vào đây.
  async function fetchTopProfiles(limit) {
    var res = await publicProfileQuery()
      .order('is_pinned', { ascending: false })
      .order('view_count', { ascending: false })
      .limit(limit || 8);
    if (res.error) throw res.error;
    return res.data || [];
  }

  async function fetchMyProfile() {
    var session = await getSession();
    if (!session) return null;
    var res = await client.from('profiles')
      .select('*')
      .eq('auth_user_id', session.user.id)
      .maybeSingle();
    if (res.error) throw res.error;
    return res.data || null;
  }

  async function saveMyProfile(data) {
    var session = await getSession();
    if (!session) throw new Error('Cần đăng nhập mới lưu được hồ sơ.');
    var clean = stripProtected(data);
    clean.auth_user_id = session.user.id;
    // Email hồ sơ mặc định lấy từ tài khoản Auth nếu mẫu để trống.
    if (!clean.contact_email) clean.contact_email = session.user.email;
    requireFields(clean, REQUIRED_PROFILE_FIELDS);
    if (clean.album_images && clean.album_images.length > 5) {
      throw new Error('Album tối đa 5 ảnh.');
    }
    var res = await client.from('profiles')
      .upsert(clean, { onConflict: 'auth_user_id' })
      .select()
      .single();
    if (res.error) throw res.error;
    return res.data;
  }

  async function incrementView(profileId) {
    await client.rpc('increment_profile_view', { p_profile_id: profileId });
  }

  // ---------- Đánh giá (không cần đăng nhập) ----------
  async function fetchApprovedReviews(profileId) {
    var res = await client.from('profile_reviews')
      .select('*')
      .eq('profile_id', profileId)
      .eq('moderation_status', 'approved')
      .order('created_at', { ascending: false });
    if (res.error) throw res.error;
    return res.data || [];
  }

  async function submitReview(profileId, review) {
    var rating = Number(review.rating);
    if (!rating || rating < 1 || rating > 5) throw new Error('Đánh giá phải từ 1 đến 5 sao.');
    if (!review.comment || !String(review.comment).trim()) throw new Error('Cần nhập nhận xét.');
    var res = await client.from('profile_reviews').insert({
      profile_id: profileId,
      reviewer_name: review.reviewerName || 'Khách',
      rating: rating,
      comment: String(review.comment).trim(),
      moderation_status: 'pending' // Luôn pending, admin duyệt mới hiển thị.
    });
    if (res.error) throw res.error;
  }

  // ---------- Góp ý (không cần đăng nhập) ----------
  async function submitFeedback(fb) {
    if (!fb.content || !String(fb.content).trim()) throw new Error('Cần nhập nội dung góp ý.');
    var res = await client.from('feedback').insert({
      name: fb.name || null,
      kind: fb.kind || 'Khác',
      rating: fb.rating || null,
      content: String(fb.content).trim(),
      page: fb.page || null
    });
    if (res.error) throw res.error;
  }

  // ---------- Media ----------
  function publicUrl(path) {
    return client.storage.from('profile-media').getPublicUrl(path).data.publicUrl;
  }

  async function uploadAlbumImages(files) {
    var session = await getSession();
    if (!session) throw new Error('Cần đăng nhập mới tải ảnh lên được.');
    var list = Array.prototype.slice.call(files || []);
    if (list.length < 1 || list.length > 5) throw new Error('Album cần 1 đến 5 ảnh.');
    var urls = [];
    for (var i = 0; i < list.length; i++) {
      var path = session.user.id + '/album/' + Date.now() + '-' + i + '-' + list[i].name;
      var up = await client.storage.from('profile-media').upload(path, list[i]);
      if (up.error) throw up.error;
      urls.push(publicUrl(path));
    }
    return urls;
  }

  async function uploadDemoVideo(file) {
    var session = await getSession();
    if (!session) throw new Error('Cần đăng nhập mới tải video lên được.');
    if (!file) throw new Error('Cần 1 video demo.');
    var path = session.user.id + '/demo/' + Date.now() + '-' + file.name;
    var up = await client.storage.from('profile-media').upload(path, file);
    if (up.error) throw up.error;
    return publicUrl(path);
  }

  window.McLivestreamAPI = {
    client: client,
    signUp: signUp, signIn: signIn, signOut: signOut, getSession: getSession,
    resetPassword: resetPassword,
    fetchPublicProfiles: fetchPublicProfiles, fetchTopProfiles: fetchTopProfiles,
    fetchMyProfile: fetchMyProfile, saveMyProfile: saveMyProfile,
    incrementView: incrementView,
    fetchApprovedReviews: fetchApprovedReviews, submitReview: submitReview, submitFeedback: submitFeedback,
    uploadAlbumImages: uploadAlbumImages, uploadDemoVideo: uploadDemoVideo
  };
})();
