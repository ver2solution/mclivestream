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
  // sẽ chặn nếu client cố đổi chúng. v85 (M1 đã chạy 13:57 07/11):
  // highest_revenue_verified cũng strip ở client — chỉ admin xác minh
  // mới được đặt true, client gửi kèm true sẽ bị policy INSERT chặn 42501.
  var PROTECTED_FIELDS = [
    'moderation_status', 'consent_status', 'is_pinned',
    'view_count', 'is_demo', 'achievement_label',
    'highest_revenue_verified',
    // v121 (notes admin): ghi chú chỉ admin đặt qua RPC
    // admin_set_profile_notes; user không được gửi kèm khi lưu hồ sơ
    // (form user không có ô notes; trigger DB cũng chặn nếu cố đổi).
    'notes',
    // v124 (tin lô/xưởng/kiot tự đăng): expires_at + shop_id do server
    // quản lý — client không được gửi kèm (hàm submit tự gắn shop_id sau
    // khi strip; trigger DB chặn đổi 2 trường này từ client).
    'expires_at', 'shop_id'
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
    // Đồng ý marketing là ô tick RIÊNG, mặc định không tick sẵn (xem form đăng ký).
    // Lưu vào user_metadata để còn dấu vết đồng ý ngay cả khi bảng
    // marketing_consents (migration M4) chưa chạy; bảng M4 là nguồn chính
    // để tách danh sách marketing, xem js/wallet.js saveMarketingConsent().
    var res = await client.auth.signUp({
      email: opts.email,
      password: opts.password,
      options: { data: {
        phone_zalo: opts.phoneZalo || '',
        account_type: opts.accountType || '',
        marketing_opt_in: !!opts.marketingOptIn,
        marketing_purpose: 'Nhận thông tin, ưu đãi và tin tuyển mẫu từ Ver2Solution',
        // v99 (§1b): 3 o ho so thu thap ngay khi dang ky (dang-ky.html)
        // de the hien dung ngay sau khi dang ky; auth-ui.js truyen qua
        // opts khi co, thieu thi de trong (trang-cua-toi dien sau).
        // v111 (N1): auth-ui.js da truyen du 3 truong tu v111.
        work_location: opts.workLocation || '',
        desired_field: opts.desiredField || '',
        priority_field: opts.priorityField || '',
        // v111 (N1): email lien he de trang-cua-toi dien san o Email khi
        // tao ho so (cung cap voi phone_zalo o tren).
        contact_email: opts.email || ''
      },
      // v49: redirect xac nhan email ve trang chu /mclivestream/ (xem SITE_URL).
      emailRedirectTo: SITE_URL }
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
    /* v161 (Rion — loi phien nghiem trong 11/11): signOut() mac dinh chi
       xoa token o may nay (scope 'local') ma KHONG thu hoi refresh token
       tren server. Tab/cua so khac (hoac client Supabase thu hai trong
       cung trang — js/analytics.js) van giu refresh token trong bo nho,
       timer tu refresh se ghi token moi lai localStorage -> phien da dang
       xuat "tu khoi phuc" (admin 22:46 + 22:49). Dung scope 'global' de
       thu hoi refresh token tren server; neu goi mang loi thi roi ve
       signOut local de may nay van dang xuat. LUU Y hanh vi doi: dang
       xuat se dang xuat tren MOI thiet bi (dien thoai + PC). */
    try {
      await client.auth.signOut({ scope: 'global' });
    } catch (e) {
      await client.auth.signOut();
    }
  }

  async function getSession() {
    var res = await client.auth.getSession();
    return res.data.session || null;
  }

  // v97: doc session ben vung cho cac tac vu can dang nhap (luu ho so).
  // Uu tien cache dung chung cua js/auth-ui.js — 1 nguon dung duy nhat
  // ma trang-cua-toi.html da xac nhan — roi moi doc truc tiep tu client;
  // thu lai 1 lan sau khoang nghi ngan neu ca 2 deu null (phien co the
  // dang duoc khoi phuc). Nhờ vậy trang hien "Da dang nhap" thi luu ho
  // so khong bao loi "Can dang nhap" nua (loi 15:58 ngay 08/11/2026:
  // init() thay session nhung saveMyProfile() doc lai truc tiep thi
  // gap null nhat thoi). Trang chua nap auth-ui.js thi di thang vao
  // doc truc tiep, khong doi hanh vi.
  async function getSessionRobust() {
    try {
      var A = (typeof window !== 'undefined') ? window.V2SAuthUI : null;
      if (A && typeof A.getSessionRobust === 'function') {
        var s = await A.getSessionRobust(3000);
        if (s) return s;
      } else if (A && typeof A.getSession === 'function') {
        var s2 = await A.getSession();
        if (s2) return s2;
      }
    } catch (e) { /* roi xuong doc truc tiep */ }
    var direct = await getSession();
    if (direct) return direct;
    await new Promise(function (r) { setTimeout(r, 600); });
    return await getSession();
  }

  // Quên mật khẩu: gửi link đặt lại về email đã đăng ký.
  // F-03/F-13 (v46): redirectTo mặc định trỏ về trang đặt mật khẩu mới
  // dat-lai-mat-khau.html (phải thêm URL này vào Redirect URLs trên
  // Dashboard); không dùng window.location.href nữa — link reset cũ trỏ
  // về trang danh sách và thành link đăng nhập ma thuật.
  // URL goc cua web (trang chu) — dung lam redirect xac nhan email dang ky.
  // FIX (v49): GoTrue tu suy redirect_to mac dinh ve goc
  // ver2solution.github.io (thieu /mclivestream/) du Site URL tren
  // Dashboard da dung (kiem tra 2 lan, 11:23) — thu xac nhan 11:21 van sai
  // — nen truyen tuong minh qua emailRedirectTo trong signUp. Doi cung luc
  // voi RESET_PASSWORD_URL khi domain chinh ver2solution.com dung duoc.
  var SITE_URL = 'https://vieclamlivestream.online/';
  var RESET_PASSWORD_URL = 'https://vieclamlivestream.online/dat-lai-mat-khau.html';
  async function resetPassword(email, redirectTo) {
    var res = await client.auth.resetPasswordForEmail(email, {
      redirectTo: redirectTo || RESET_PASSWORD_URL
    });
    if (res.error) throw res.error;
  }

  // Đặt mật khẩu mới sau khi bấm link khôi phục (trang dat-lai-mat-khau.html).
  // supabase-js tự nhận session từ hash #access_token=...&type=recovery.
  async function updatePassword(newPassword) {
    var res = await client.auth.updateUser({ password: newPassword });
    if (res.error) throw res.error;
    return res.data;
  }

  // F-09 (v46): dịch lỗi Supabase/PostgREST sang câu tiếng Việt thân thiện.
  // Thông điệp do chính web tự ném (đã là tiếng Việt) giữ nguyên; lỗi
  // tiếng Anh kỹ thuật không bao giờ hiện ra màn hình — lỗi gốc chỉ ghi
  // console.error để debug. context: 'review' | 'jobpost' để dịch mã
  // trùng lặp 23505 cho đúng chỗ.
  var VIETNAMESE_RE = /[àáảãạăắằẳẵặâấầẩẫậđèéẻẽẹêếềểễệìíỉĩịòóỏõọôốồổỗộơớờởỡợùúủũụưứừửữựỳýỷỹỵ]/;
  function friendlyError(err, context) {
    var raw = String((err && (err.message || err.code)) || err || '');
    var lower = raw.toLowerCase();
    var code = String((err && err.code) || '');
    var out = null;
    if (lower.indexOf('invalid login credentials') !== -1) out = 'Email hoặc mật khẩu chưa đúng.';
    else if (lower.indexOf('email not confirmed') !== -1) out = 'Email chưa được xác nhận. Hãy kiểm tra hộp thư và bấm link xác nhận.';
    else if (lower.indexOf('user already registered') !== -1) out = 'Email này đã đăng ký. Hãy đăng nhập hoặc dùng chức năng quên mật khẩu.';
    else if (lower.indexOf('email rate limit exceeded') !== -1) out = 'Đã gửi quá nhiều email trong 1 giờ. Hãy thử lại sau 1 giờ.';
    else if (lower.indexOf('password should be at least') !== -1) out = 'Mật khẩu cần ít nhất 8 ký tự.';
    else if (lower.indexOf('failed to fetch') !== -1 || lower.indexOf('networkerror') !== -1 || lower.indexOf('network request failed') !== -1) out = 'Không kết nối được mạng, hãy kiểm tra lại kết nối rồi thử lại.';
    else if (code === '23505' || lower.indexOf('23505') !== -1 || lower.indexOf('duplicate key') !== -1) {
      if (context === 'review') out = 'Bạn đã đánh giá hồ sơ này rồi.';
      else if (context === 'jobpost') out = 'Tin này đã được gửi, hãy xem mục tin của tôi.';
      else out = 'Nội dung này đã được gửi rồi.';
    }
    else if (code === '42501' || lower.indexOf('42501') !== -1 || lower.indexOf('row-level security') !== -1) out = 'Bạn chưa có quyền thực hiện việc này.';
    else if (code === 'PGRST205' || code === '42P01' || lower.indexOf('pgrst205') !== -1 || lower.indexOf('42p01') !== -1 || lower.indexOf('could not find the table') !== -1 || lower.indexOf('does not exist') !== -1) out = 'Hệ thống chưa sẵn sàng, hãy thử lại sau.';
    else if (VIETNAMESE_RE.test(raw)) out = raw; // Thông điệp web tự ném — đã là tiếng Việt.
    else out = 'Đã có lỗi xảy ra, hãy thử lại sau.';
    if (typeof console !== 'undefined' && console.error && out !== raw) {
      try { console.error('[McLivestreamAPI]', err); } catch (e) {}
    }
    return out;
  }

  // ---------- Hồ sơ ----------
  // F-02 (v46): đọc view công khai public_profiles — view đã lọc sẵn
  // approved + consented + NOT is_demo nên KHÔNG còn .eq moderation /
  // consent (2 cột này không còn trong view). Cột riêng tư
  // (date_of_birth, phone_zalo, contact_email, contact_zalo,
  // auth_user_id) không có trong view nên API không thể lộ nữa.
  function publicProfileQuery() {
    return client.from('public_profiles')
      .select('*');
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
    var session = await getSessionRobust();
    if (!session) return null;
    var res = await client.from('profiles')
      .select('*')
      .eq('auth_user_id', session.user.id)
      .maybeSingle();
    if (res.error) throw res.error;
    return res.data || null;
  }

  async function saveMyProfile(data) {
    var session = await getSessionRobust();
    if (!session) throw new Error('Cần đăng nhập mới lưu được hồ sơ.');
    var clean = stripProtected(data);
    clean.auth_user_id = session.user.id;
    // Email hồ sơ mặc định lấy từ tài khoản Auth nếu mẫu để trống.
    if (!clean.contact_email) clean.contact_email = session.user.email;
    // v111 (N1): SDT Zalo mac dinh lay tu user_metadata.phone_zalo
    // (da gui len luc dang ky) neu ho so de trong — cung cap voi
    // contact_email o tren. Trang-cua-toi van can them prefill hien
    // thi o mo form (HTML, ngoai pham vi v111 nhom nay); day la luoi
    // an toan de ho so LUU xong van co dung SDT lien he.
    if (!clean.phone_zalo && session.user.user_metadata && session.user.user_metadata.phone_zalo) {
      clean.phone_zalo = session.user.user_metadata.phone_zalo;
    }
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

  // F-06 (v46): gửi kèm mã phiên ẩn danh (1 lượt/ngày/mã phiên, theo
  // hàm increment_profile_view mới); không có mã phiên thì bỏ qua,
  // không đếm. Không bao giờ ném lỗi — đếm view không được làm vỡ trang.
  async function incrementView(profileId) {
    try {
      var hash = null;
      if (typeof window !== 'undefined' && window.V2SAnalytics && typeof window.V2SAnalytics.getSessionId === 'function') {
        hash = window.V2SAnalytics.getSessionId();
      }
      if (!hash) return;
      await client.rpc('increment_profile_view', { p_profile_id: profileId, p_session_hash: hash });
    } catch (e) { /* bỏ qua lặng lẽ */ }
  }

  // v99 (§5 đặc tả sao lên top): ấn sao lên top 60 phút. Khách vãng lai
  // cũng ấn được (không cần đăng nhập); giới hạn 1 sao/hồ sơ/ngày do RPC
  // star_profile kiểm tra (theo session_hash + theo auth_user_id nếu có).
  // Trả về số sao mới; lỗi 'already_starred_today' khi đã sao hôm nay.
  async function starProfile(targetType, profileId) {
    var hash = null;
    if (typeof window !== 'undefined' && window.V2SAnalytics && typeof window.V2SAnalytics.getSessionId === 'function') {
      hash = window.V2SAnalytics.getSessionId();
    }
    if (!hash) throw new Error('Không xác định được phiên ẩn danh.');
    var res = await client.rpc('star_profile', { p_profile_id: profileId, p_session_hash: hash, p_target_type: targetType || 'model_profile' });
    if (res.error) throw res.error;
    return Number(res.data);
  }

  // v99: lấy bảng đếm sao công khai (profile_star_stats) để hiện số sao +
  // sắp xếp tầng sao 60 phút. Lỗi thì trả [] — không bao giờ làm vỡ trang.
  async function fetchStarStats() {
    try {
      var res = await client.from('profile_star_stats').select('profile_id,target_type,star_count,last_starred_at');
      if (res.error) return [];
      return res.data || [];
    } catch (e) { return []; }
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
    // F-17 (v46): chống gửi trùng 1 đánh giá / 1 hồ sơ / 60 giây (client).
    // Ghi mốc thời gian CHỈ khi gửi thành công.
    var throttleKey = 'v2s_review_' + profileId;
    var throttled = false;
    try {
      var last = Number(window.localStorage.getItem(throttleKey) || 0);
      throttled = !!(last && Date.now() - last < 60000);
    } catch (e) { throttled = false; }
    if (throttled) throw new Error('Bạn vừa đánh giá hồ sơ này, hãy thử lại sau 60 giây.');
    // F-17 (v46): gửi kèm auth_user_id khi đã đăng nhập để chặn 1 tài
    // khoản đánh giá 2 lần cùng hồ sơ (unique index phía server); khách
    // vãng lai gửi null và vẫn đánh giá được (chờ duyệt như thiết kế).
    var authUserId = null;
    try { var s = await getSession(); if (s) authUserId = s.user.id; } catch (e) { /* bỏ qua */ }
    var payload = {
      profile_id: profileId,
      reviewer_name: review.reviewerName || 'Khách',
      rating: rating,
      comment: String(review.comment).trim(),
      moderation_status: 'pending' // Luôn pending, admin duyệt mới hiển thị.
    };
    if (authUserId) payload.auth_user_id = authUserId;
    var res = await client.from('profile_reviews').insert(payload);
    // Cột auth_user_id chưa có (SQL F-17 chưa chạy): thử lại không kèm cột
    // để form vẫn gửi được; chống trùng lúc này chỉ còn chống trùng client.
    if (res.error && (res.error.code === '42703' || String(res.error.message || '').indexOf('42703') !== -1) && payload.auth_user_id) {
      delete payload.auth_user_id;
      res = await client.from('profile_reviews').insert(payload);
    }
    if (res.error) throw res.error;
    try { window.localStorage.setItem(throttleKey, String(Date.now())); } catch (e) {}
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
  // F-10 (v46): tên file an toàn + kiểm tra loại/dung lượng trước khi tải.
  // Tên gốc bị bỏ (chống '../' và ký tự đặc biệt); giới hạn 5 MB/file.
  // Lưu ý: video demo cũng giới hạn 5 MB theo đặc tả — nếu đội muốn mức
  // khác cho video thì đổi MAX_UPLOAD_BYTES riêng cho video ở đây.
  var MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
  var IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
  var IMAGE_EXTS = ['jpg', 'jpeg', 'png', 'webp'];
  var VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime'];
  var VIDEO_EXTS = ['mp4', 'webm', 'mov'];
  function newUuid() {
    try {
      if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
    } catch (e) {}
    return 'u' + Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
  }
  function safeUploadName(file, allowedExts) {
    var name = String((file && file.name) || '');
    var ext = name.split('.').pop().toLowerCase();
    if (allowedExts.indexOf(ext) === -1) ext = allowedExts[0];
    return newUuid() + '.' + ext;
  }
  function checkUploadFile(file, allowedTypes, allowedExts, label) {
    if (!file) throw new Error('Cần 1 file ' + label + '.');
    if (file.size && file.size > MAX_UPLOAD_BYTES) throw new Error('File quá lớn, tối đa 5 MB mỗi file.');
    if (file.type && allowedTypes.indexOf(file.type) === -1) throw new Error('Định dạng file ' + label + ' chưa được hỗ trợ.');
    var ext = String(file.name || '').split('.').pop().toLowerCase();
    if (allowedExts.indexOf(ext) === -1) throw new Error('Định dạng file ' + label + ' chưa được hỗ trợ.');
  }

  function publicUrl(path) {
    return client.storage.from('profile-media').getPublicUrl(path).data.publicUrl;
  }

  async function uploadAlbumImages(files) {
    var session = await getSessionRobust();
    if (!session) throw new Error('Cần đăng nhập mới tải ảnh lên được.');
    var list = Array.prototype.slice.call(files || []);
    if (list.length < 1 || list.length > 5) throw new Error('Album cần 1 đến 5 ảnh.');
    var urls = [];
    for (var i = 0; i < list.length; i++) {
      checkUploadFile(list[i], IMAGE_TYPES, IMAGE_EXTS, 'ảnh');
      var path = session.user.id + '/album/' + safeUploadName(list[i], IMAGE_EXTS);
      var up = await client.storage.from('profile-media').upload(path, list[i]);
      if (up.error) throw up.error;
      urls.push(publicUrl(path));
    }
    return urls;
  }

  async function uploadDemoVideo(file) {
    var session = await getSessionRobust();
    if (!session) throw new Error('Cần đăng nhập mới tải video lên được.');
    if (!file) throw new Error('Cần 1 video demo.');
    checkUploadFile(file, VIDEO_TYPES, VIDEO_EXTS, 'video demo');
    var path = session.user.id + '/demo/' + safeUploadName(file, VIDEO_EXTS);
    var up = await client.storage.from('profile-media').upload(path, file);
    if (up.error) throw up.error;
    return publicUrl(path);
  }


  // ---------- Hồ sơ shop và tin tuyển mẫu (M2/M3, lưu thật) ----------
  // Yêu cầu đã chạy supabase-migration-shop-m2-m3.sql trên Dashboard.
  // Nếu bảng chưa có, các hàm này ném lỗi chứa 42P01/PGRST205 — trang Shop
  // bắt lỗi đó để báo "chưa chạy migration", KHÔNG giả vờ đã lưu.
  function isTableMissingError(err) {
    var m = String((err && (err.code || err.message)) || '');
    return m.indexOf('42P01') !== -1 || m.indexOf('PGRST205') !== -1
      || /does not exist|Could not find the table/i.test(m);
  }

  // F-02 (v46): đọc view công khai public_shop_profiles — view đã lọc
  // sẵn approved nên KHÔNG còn .eq moderation_status (cột không còn
  // trong view). Cột riêng tư (phone, email, address, store_addresses)
  // không có trong view.
  async function fetchApprovedShops() {
    var res = await client.from('public_shop_profiles').select('*')
      .order('created_at', { ascending: false });
    if (res.error) throw res.error;
    return res.data || [];
  }

  async function fetchMyShopProfile() {
    var session = await getSession();
    if (!session) throw new Error('Cần đăng nhập mới xem được hồ sơ shop.');
    var res = await client.from('shop_profiles').select('*')
      .eq('auth_user_id', session.user.id).maybeSingle();
    if (res.error) throw res.error;
    return res.data || null;
  }

  async function saveMyShopProfile(data) {
    var session = await getSession();
    if (!session) throw new Error('Cần đăng nhập mới lưu được hồ sơ shop.');
    var clean = stripProtected(data);
    clean.auth_user_id = session.user.id;
    requireFields(clean, ['shop_name', 'province']);
    var res = await client.from('shop_profiles')
      .upsert(clean, { onConflict: 'auth_user_id' }).select().single();
    if (res.error) throw res.error;
    return res.data;
  }

  async function uploadShopLogo(file) {
    var session = await getSession();
    if (!session) throw new Error('Cần đăng nhập mới tải logo lên được.');
    if (!file) throw new Error('Cần 1 file logo.');
    checkUploadFile(file, IMAGE_TYPES, IMAGE_EXTS, 'logo');
    var path = 'shop/' + session.user.id + '/logo/' + safeUploadName(file, IMAGE_EXTS);
    var up = await client.storage.from('profile-media').upload(path, file);
    if (up.error) throw up.error;
    return publicUrl(path);
  }

  // F-02 (v46): đọc view công khai public_shop_job_posts — view đã JOIN
  // sẵn shop_name từ shop đã duyệt nên KHÔNG dùng quan hệ nhúng
  // shop_profiles(...) nữa (view không có khóa ngoại) và KHÔNG còn
  // .eq moderation_status. Giao diện đọc tên shop từ j.shop_name.
  async function fetchApprovedJobPosts() {
    var res = await client.from('public_shop_job_posts')
      .select('id, shop_name, province, field, schedule, salary, channels, description, created_at')
      .order('created_at', { ascending: false });
    if (res.error) throw res.error;
    return res.data || [];
  }

  async function fetchMyJobPosts() {
    var shop = await fetchMyShopProfile();
    if (!shop) return [];
    var res = await client.from('shop_job_posts').select('*')
      .eq('shop_id', shop.id).order('created_at', { ascending: false });
    if (res.error) throw res.error;
    return res.data || [];
  }

  async function submitJobPost(data) {
    var session = await getSession();
    if (!session) throw new Error('Cần đăng nhập mới đăng tin được.');
    var shop = await fetchMyShopProfile();
    if (!shop) throw new Error('Chưa có hồ sơ shop. Hãy lưu hồ sơ shop trước, rồi mới đăng tin.');
    var clean = stripProtected(data);
    clean.shop_id = shop.id;
    clean.auth_user_id = session.user.id;
    // F-07 (v46): khóa chống gửi trùng phía server — mỗi lần bấm gửi có
    // 1 mã riêng; bấm đúp / gửi lại cùng mã trả 23505, UI báo "Tin này
    // đã được gửi" (xem friendlyError với context 'jobpost').
    clean.client_idempotency_key = newIdempotencyKey();
    requireFields(clean, ['province', 'field']);
    var res = await client.from('shop_job_posts').insert(clean).select().single();
    // Cột client_idempotency_key chưa có (SQL F-07 chưa chạy): thử lại
    // không kèm mã để form vẫn gửi được; chống trùng lúc này chỉ còn
    // guardSubmit ở client.
    if (res.error && (res.error.code === '42703' || String(res.error.message || '').indexOf('42703') !== -1)) {
      delete clean.client_idempotency_key;
      res = await client.from('shop_job_posts').insert(clean).select().single();
    }
    if (res.error) throw res.error;
    return res.data;
  }

  // ---------- Tin lô / xưởng / kiot tự đăng (v124) ----------
  // Yêu cầu đã chạy supabase-migration-user-listings-v124.sql.
  // User ghi trực tiếp qua RLS (giống submitJobPost); duyệt qua RPC admin.
  var LISTING_TABLES = { lot: 'user_lots', factory: 'user_factories', kiot: 'user_kiots' };
  var LISTING_VIEWS = { lot: 'public_user_lots', factory: 'public_user_factories', kiot: 'public_user_kiots' };
  function listingTable(kind) {
    var t = LISTING_TABLES[kind];
    if (!t) throw new Error('Loại tin không hợp lệ: ' + kind);
    return t;
  }
  function listingView(kind) {
    var v = LISTING_VIEWS[kind];
    if (!v) throw new Error('Loại tin không hợp lệ: ' + kind);
    return v;
  }
  // Hồ sơ shop đã duyệt là điều kiện bắt buộc để đăng tin (theo đặc tả §2).
  async function requireApprovedShop() {
    var shop = await fetchMyShopProfile();
    if (!shop) throw new Error('Chưa có hồ sơ shop. Hãy lưu hồ sơ shop trước, rồi mới đăng tin.');
    if (shop.moderation_status !== 'approved') throw new Error('Hồ sơ shop đang chờ duyệt. Tin chỉ đăng được sau khi hồ sơ shop đã duyệt.');
    return shop;
  }
  // Tin của chính mình (mọi trạng thái), mới nhất trước.
  async function fetchMyListings(kind) {
    var session = await getSession();
    if (!session) throw new Error('Cần đăng nhập mới xem được tin của mình.');
    var res = await client.from(listingTable(kind)).select('*')
      .eq('auth_user_id', session.user.id).order('created_at', { ascending: false });
    if (res.error) throw res.error;
    return res.data || [];
  }
  // Hàm chung cho 3 loại tin: gắn shop_id + auth_user_id + khóa chống
  // gửi trùng; fallback 42703 khi cột client_idempotency_key chưa có
  // (migration v124 chưa chạy) — giống mẫu submitJobPost.
  async function submitUserListing(kind, data, requiredFields) {
    var session = await getSession();
    if (!session) throw new Error('Cần đăng nhập mới đăng tin được.');
    var shop = await requireApprovedShop();
    var clean = stripProtected(data);
    clean.shop_id = shop.id;
    clean.auth_user_id = session.user.id;
    clean.client_idempotency_key = newIdempotencyKey();
    requireFields(clean, requiredFields);
    var res = await client.from(listingTable(kind)).insert(clean).select().single();
    if (res.error && (res.error.code === '42703' || String(res.error.message || '').indexOf('42703') !== -1)) {
      delete clean.client_idempotency_key;
      res = await client.from(listingTable(kind)).insert(clean).select().single();
    }
    if (res.error) throw res.error;
    return res.data;
  }
  async function submitUserLot(data) {
    // Theo schema user_lots (§2 đặc tả): price_unit (cái/kg/bộ/thùng/lô),
    // contact_zalo/contact_phone; KHÔNG có unit / retail_price_num / address.
    return submitUserListing('lot', data, ['title', 'province', 'cat', 'price_num', 'qty', 'description']);
  }
  async function submitUserFactory(data) {
    // Theo schema user_factories: moq (số lượng tối thiểu), phone, website;
    // KHÔNG có price_num / worker_count (xưởng không có giá).
    return submitUserListing('factory', data, ['name', 'items', 'cat', 'province']);
  }
  async function submitUserKiot(data) {
    // Theo schema user_kiots: rent_monthly (tiền thuê/tháng); KHÔNG có
    // rent_num / address.
    return submitUserListing('kiot', data, ['title', 'kind', 'province', 'price_num', 'description']);
  }
  // Sửa tin của mình — client không được đổi trạng thái/xuất xứ
  // (stripProtected); trigger DB tự đưa tin đã duyệt về pending.
  async function updateUserListing(kind, id, data) {
    var session = await getSession();
    if (!session) throw new Error('Cần đăng nhập mới sửa được tin.');
    var clean = stripProtected(data);
    var res = await client.from(listingTable(kind)).update(clean)
      .eq('id', id).eq('auth_user_id', session.user.id).select().single();
    if (res.error) throw res.error;
    return res.data;
  }
  // Đóng tin: đặt moderation_status='closed' trực tiếp (không qua
  // stripProtected); trigger cho phép pending/approved → closed.
  async function closeUserListing(kind, id) {
    var session = await getSession();
    if (!session) throw new Error('Cần đăng nhập mới đóng được tin.');
    var res = await client.from(listingTable(kind)).update({ moderation_status: 'closed' })
      .eq('id', id).eq('auth_user_id', session.user.id).select().single();
    if (res.error) throw res.error;
    return res.data;
  }
  // Xóa tin của mình — chỉ xóa được khi chưa đăng (pending/rejected/
  // closed); tin đã duyệt thì bấm Đóng tin thay vì Xóa.
  async function deleteUserListing(kind, id) {
    var session = await getSession();
    if (!session) throw new Error('Cần đăng nhập mới xóa được tin.');
    var cur = await client.from(listingTable(kind)).select('moderation_status')
      .eq('id', id).eq('auth_user_id', session.user.id).maybeSingle();
    if (cur.error) throw cur.error;
    if (!cur.data) throw new Error('Không tìm thấy tin.');
    if (cur.data.moderation_status === 'approved') throw new Error('Tin đang đăng thì bấm Đóng tin thay vì Xóa.');
    var res = await client.from(listingTable(kind)).delete()
      .eq('id', id).eq('auth_user_id', session.user.id);
    if (res.error) throw res.error;
    return true;
  }
  // Ảnh tin: bucket profile-media, prefix listings/<uid>/<kind>/<listingId>/,
  // tối đa 5 ảnh ≤5 MB (checkUploadFile), không video ở v1.
  // Quy trình form: tạo tin trước (lấy id) → tải ảnh → update tin với
  // mảng images — vì đường dẫn ảnh cần id của tin.
  async function uploadListingImages(files, kind, listingId) {
    var session = await getSessionRobust();
    if (!session) throw new Error('Cần đăng nhập mới tải ảnh lên được.');
    if (!listingId) throw new Error('Thiếu mã tin để tải ảnh.');
    var list = Array.prototype.slice.call(files || []);
    if (list.length < 1 || list.length > 5) throw new Error('Album cần 1 đến 5 ảnh.');
    var urls = [];
    for (var i = 0; i < list.length; i++) {
      checkUploadFile(list[i], IMAGE_TYPES, IMAGE_EXTS, 'ảnh');
      var path = 'listings/' + session.user.id + '/' + kind + '/' + listingId + '/' + safeUploadName(list[i], IMAGE_EXTS);
      var up = await client.storage.from('profile-media').upload(path, list[i]);
      if (up.error) throw up.error;
      urls.push(publicUrl(path));
    }
    return urls;
  }
  // Tin đã duyệt của mọi thành viên (view public, không cần đăng nhập).
  async function fetchApprovedUserListings(kind) {
    var res = await client.from(listingView(kind)).select('*')
      .order('created_at', { ascending: false }).limit(50);
    if (res.error) throw res.error;
    return res.data || [];
  }
  async function fetchApprovedUserLots() { return fetchApprovedUserListings('lot'); }
  async function fetchApprovedUserFactories() { return fetchApprovedUserListings('factory'); }
  async function fetchApprovedUserKiots() { return fetchApprovedUserListings('kiot'); }

  function newIdempotencyKey() {
    try {
      if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
    } catch (e) {}
    return 'idem-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 12);
  }

  window.McLivestreamAPI = {
    client: client,
    signUp: signUp, signIn: signIn, signOut: signOut, getSession: getSession,
    resetPassword: resetPassword, updatePassword: updatePassword,
    friendlyError: friendlyError,
    fetchPublicProfiles: fetchPublicProfiles, fetchTopProfiles: fetchTopProfiles,
    fetchMyProfile: fetchMyProfile, saveMyProfile: saveMyProfile,
    incrementView: incrementView,
    starProfile: starProfile, fetchStarStats: fetchStarStats,
    fetchApprovedReviews: fetchApprovedReviews, submitReview: submitReview, submitFeedback: submitFeedback,
    uploadAlbumImages: uploadAlbumImages, uploadDemoVideo: uploadDemoVideo,
    isTableMissingError: isTableMissingError,
    fetchApprovedShops: fetchApprovedShops, fetchMyShopProfile: fetchMyShopProfile,
    saveMyShopProfile: saveMyShopProfile, uploadShopLogo: uploadShopLogo,
    fetchApprovedJobPosts: fetchApprovedJobPosts, fetchMyJobPosts: fetchMyJobPosts,
    submitJobPost: submitJobPost,
    // v124: tin lô / xưởng / kiot tự đăng
    fetchMyListings: fetchMyListings,
    submitUserLot: submitUserLot, submitUserFactory: submitUserFactory, submitUserKiot: submitUserKiot,
    updateUserListing: updateUserListing, closeUserListing: closeUserListing, deleteUserListing: deleteUserListing,
    uploadListingImages: uploadListingImages,
    fetchApprovedUserLots: fetchApprovedUserLots, fetchApprovedUserFactories: fetchApprovedUserFactories,
    fetchApprovedUserKiots: fetchApprovedUserKiots
  };
})();
