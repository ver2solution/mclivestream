/* Admin console GĐ2 — quan-tri.html (v116, chưa deploy).
   Console quản trị riêng của Ver2Solution. Nguyên tắc (đặc tả
   trang-quan-tri-spec-2026-11-06.md §0.2 + §3):
   - Quyền kiểm tra ở SERVER (RPC is_admin() + mọi hàm admin_* đều kiểm
     tra is_admin() đầu hàm). Client chỉ ẩn/hiện giao diện.
   - Mọi hành động ghi qua RPC SECURITY DEFINER (admin_*, GĐ1/GĐ2);
     KHÔNG UPDATE trực tiếp bảng qua REST.
   - Mọi hành động đều ghi admin_audit_log (trong cùng giao dịch).
   - RPC chưa chạy (GĐ1/GĐ2) thì tab hiện "Chưa có dữ liệu — migration
     chưa chạy", KHÔNG bịa số.
   - Cổng vào: thử is_admin() trước (GĐ1); nếu hàm chưa có (PGRST202)
     thì lùi về cổng cũ get_online_breakdown() (kiểm tra email chủ ở
     server) và chỉ mở mục Tổng quan — các tab khác khóa cho tới khi
     chạy GĐ1/GĐ2.
   - Không có service_role key, không mật khẩu trong file này.
   - GĐ3: tab Trao đổi (admin_comments) — chat live trực tiếp giữa các
     admin: Realtime postgres_changes (INSERT) + presence 'admin-room',
     fallback polling 60 giây; RPC admin_post_comment /
     get_admin_comments / admin_delete_admin_comment
     (supabase-migration-admin-g3-comments-draft.sql).
   - P2 (09/11, sửa trước khi giao tài khoản admin): badge tin chưa đọc
     trên nút tab Trao đổi (đếm theo lần xem gần nhất, localStorage) +
     phân trang 20 dòng/trang cho mọi danh sách + ô tìm email ở tab
     Người dùng & xu (lọc client-side, xem loadUsers). */
(function () {
  'use strict';

  /* ---------- tiện ích ---------- */
  function $(id) { return document.getElementById(id); }
  function show(id) { var el = $(id); if (el) el.hidden = false; }
  function hide(id) { var el = $(id); if (el) el.hidden = true; }
  function fmt(n) {
    var v = Math.max(0, Math.floor(Number(n) || 0));
    try { return v.toLocaleString('vi-VN'); } catch (e) { return String(v); }
  }
  function esc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function vnTime(iso) {
    try { return new Date(iso).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' }); } catch (e) { return String(iso || ''); }
  }
  function vnDate(iso) {
    try { return new Date(iso).toLocaleDateString('vi-VN'); } catch (e) { return String(iso || ''); }
  }
  function chatTime(iso) {
    try { return new Date(iso).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' }); } catch (e) { return String(iso || ''); }
  }
  function api() { return (typeof window !== 'undefined' && window.McLivestreamAPI) ? window.McLivestreamAPI : null; }
  function client() { var a = api(); return (a && a.client) || null; }
  function friendlyErr(err) {
    var raw = String((err && (err.message || err.code)) || err || '');
    if (/PGRST202|Could not find the function/i.test(raw)) return 'CHƯA CHẠY MIGRATION — hàm quản trị chưa có trên server.';
    if (/Không có quyền quản trị/i.test(raw)) return 'Tài khoản này không có quyền quản trị.';
    if (/not_logged_in|chưa đăng nhập|JWT expired|invalid JWT/i.test(raw)) return 'Phiên đăng nhập đã hết — hãy đăng nhập lại.';
    if (/đã ở trạng thái/i.test(raw)) return raw;
    if (/bắt buộc phải có lý do/i.test(raw)) return raw;
    if (/không được tự/i.test(raw)) return raw;
    if (/email rate limit/i.test(raw)) return 'Đã gửi quá nhiều email trong 1 giờ — hãy thử lại sau 1 giờ.';
    return raw || 'Đã xảy ra lỗi, hãy thử lại.';
  }
  function isMissingFn(err) {
    var raw = String((err && (err.message || err.code)) || err || '');
    return /PGRST202|Could not find the function/i.test(raw);
  }
  async function rpc(name, args) {
    var c = client();
    if (!c || typeof c.rpc !== 'function') throw new Error('Chưa kết nối được Supabase, hãy tải lại trang.');
    var res = await c.rpc(name, args || {});
    if (res.error) throw res.error;
    return res.data;
  }
  function setMsg(el, text, isErr) {
    if (!el) return;
    el.textContent = text || '';
    el.style.color = isErr ? '#b3261e' : '#0b5d4e';
    // Sửa lỗi nút Đăng bài 23:57 ngày 09/11 (phần 2): thông báo lỗi nằm
    // ở đầu panel trong khi nút bấm ở cuối form dài — user đang cuộn
    // ở cuối sẽ không thấy lỗi (tưởng nút không phản hồi). Cuộn tới
    // thông báo khi có lỗi; 'nearest' nên không cuộn nếu đã thấy.
    if (isErr) { try { if (typeof el.scrollIntoView === 'function') el.scrollIntoView({ block: 'nearest' }); } catch (e) { /* cuộn không bắt buộc */ } }
  }

  /* ---------- phân trang (P2): 20 dòng/trang, nút Trước/Sau + số trang ----------
     RPC không trả tổng số dòng nên "còn trang sau" được biết bằng cách lấy
     PAGE_SIZE + 1 dòng: thừa 1 dòng nghĩa là còn trang sau (dòng thừa
     không hiển thị). */
  function pagerHtml(key, page, hasMore) {
    return '<div class="adm-pager" style="margin:12px 0;display:flex;gap:8px;align-items:center;flex-wrap:wrap">'
      + '<button class="btn btn-ghost btn-sm" data-adm-page="' + key + '" data-adm-dir="-1" type="button"'
      + (page <= 0 ? ' disabled' : '') + '>← Trang trước</button>'
      + '<span>Trang ' + (page + 1) + '</span>'
      + '<button class="btn btn-ghost btn-sm" data-adm-page="' + key + '" data-adm-dir="1" type="button"'
      + (hasMore ? '' : ' disabled') + '>Trang sau →</button></div>';
  }
  var PAGE_FIELDS = { comments: 'commentsPage', moderation: 'modPage', faq: 'faqPage', users: 'usersPage', audit: 'auditPage', testdata: 'testPage', write: 'writePage' };
  var PAGE_LOADERS = null; // gán sau khi các hàm load* đã định nghĩa (xem trước § chuyển tab)
  function onPagerClick(e) {
    var btn = e.target && e.target.closest ? e.target.closest('[data-adm-page]') : null;
    if (!btn || btn.disabled) return;
    var key = btn.getAttribute('data-adm-page');
    var dir = parseInt(btn.getAttribute('data-adm-dir') || '0', 10);
    var field = PAGE_FIELDS[key];
    var loader = PAGE_LOADERS && PAGE_LOADERS[key];
    if (!field || !loader || !dir) return;
    state[field] = Math.max(0, (state[field] || 0) + dir);
    loader().catch(function () { /* từng tab tự hiện lỗi */ });
  }

  /* ---------- trạng thái ---------- */
  var PAGE_SIZE = 20; // kich thuoc 1 trang phan trang (P2) — RPC lay PAGE_SIZE + 1 de biet con trang sau
  var state = {
    email: '', userId: '', isAdmin: false, legacyGate: false,
    loaded: {}, // tab nào đã tải
    activeTab: 'overview', // tab đang mở (badge chat chỉ đếm khi không ở tab Trao đổi)
    chatTimer: null, // tự làm mới tab Trao đổi mỗi 60 giây khi đang mở
    chatChannel: null, // kênh Realtime 'admin-room' (mở suốt phiên admin, xem § Trao đổi)
    badgeTimer: null, // tự làm mới badge tin chưa đọc mỗi 60 giây khi không ở tab Trao đổi
    chatUnread: 0, // số tin chưa đọc (tính từ lần xem tab Trao đổi gần nhất)
    chatMessages: [], // danh sách tin đã tải gần nhất (mới nhất trước)
    tasks: [], // danh sách công việc đã tải gần nhất (mới nhất trước, v118)
    usersPage: 0, commentsPage: 0, modPage: 0, faqPage: 0, auditPage: 0, testPage: 0, writePage: 0,
    usersQuery: '', // từ khóa tìm email (tab Người dùng & xu); rỗng = không lọc
    usersList: [], // tài khoản đã tải gần nhất ở tab Người dùng (để form chi tiết lấy notes prefill)
    testData: null, // kết quả get_admin_test_data gần nhất (để phân trang client-side)
    articleDrafts: [], // bản thảo bài viết đã tải gần nhất (tab Viết bài, để tải JSON theo id)
    editingDraftId: null, // id bản thảo đang sửa (GĐ4b) — null = đang viết bài mới
    editingDraftStatus: null, // trạng thái bản thảo đang sửa trước khi sửa (để báo "sẽ đăng lại" nếu đã đăng)
    articleEditorFailed: false // v155: trình soạn thảo rich text init thất bại → đang dùng ô nhập dự phòng (#admArtBody)
  };

  /* ---------- cổng vào ---------- */
  async function getSession() {
    if (window.V2SAuthUI && typeof window.V2SAuthUI.getSession === 'function') return window.V2SAuthUI.getSession();
    var a = api();
    if (a && typeof a.getSession === 'function') return a.getSession();
    return null;
  }

  /* ---------- TỔNG QUAN (logic cũ của quan-tri.html, giữ nguyên) ---------- */
  var LABELS = {
    mau: 'Mẫu livestream (danh-sach-mau.html)',
    shop: 'Shop tuyển mẫu (danh-sach-shop.html)',
    kiot: 'Thanh lý Kiot (thanh-ly-kiot.html)',
    hoidap: 'Hỏi đáp (hoi-dap.html)',
    tintuc: 'Tin tức (tin-tuc.html)',
    home: 'Trang chủ (index.html)',
    total: 'TỔNG (5 trang con + trang chủ)'
  };
  var ORDER = ['mau', 'shop', 'kiot', 'hoidap', 'tintuc', 'home', 'total'];

  async function loadOverview() {
    var rows = await rpc('get_online_breakdown');
    if (!Array.isArray(rows) || !rows.length) throw new Error('Chưa có dữ liệu online.');
    var byPage = {};
    rows.forEach(function (r) { byPage[r.page] = r; });
    var body = $('qtBody');
    var html = '';
    ORDER.forEach(function (k) {
      var r = byPage[k];
      if (!r) return;
      var strong = (k === 'total') ? ' style="font-weight:800;border-top:2px solid #ddd"' : '';
      html += '<tr' + strong + '><td style="padding:8px;border-bottom:1px solid #eee">' + esc(LABELS[k] || k) + '</td>'
        + '<td style="text-align:right;padding:8px;border-bottom:1px solid #eee">' + fmt(r.real_count) + '</td>'
        + '<td style="text-align:right;padding:8px;border-bottom:1px solid #eee">' + fmt(r.base_count) + '</td>'
        + '<td style="text-align:right;padding:8px;border-bottom:1px solid #eee">' + fmt(r.display_count) + '</td></tr>';
    });
    if (body) body.innerHTML = html;
    // Lượt xem thật 24 giờ qua (không bắt buộc).
    try {
      var sum = await rpc('get_analytics_summary', { p_days: 1 });
      var viewsEl = $('qtViews');
      if (!Array.isArray(sum)) { if (viewsEl) viewsEl.textContent = 'Chưa có dữ liệu.'; }
      else {
        var total = 0;
        sum.forEach(function (r) { if (r && r.event_type === 'pageview') total += Number(r.event_count) || 0; });
        if (viewsEl) viewsEl.textContent = 'Lượt xem thật 24 giờ qua: ' + fmt(total) + ' lượt xem trang (pageview).';
      }
    } catch (e) {
      var v2 = $('qtViews');
      if (v2) v2.textContent = 'Chưa có dữ liệu.';
    }
    // Lịch sử chuyển xu toàn bộ tài khoản (không bắt buộc).
    try {
      var tr = await rpc('get_all_transfer_history_admin', { p_limit: 100 });
      var trEl = $('qtTransfers');
      if (!Array.isArray(tr) || !tr.length) { if (trEl) trEl.textContent = 'Chưa có dữ liệu chuyển xu.'; return; }
      var rowsHtml = '';
      tr.forEach(function (r) {
        rowsHtml += '<tr><td style="padding:8px;border-bottom:1px solid #eee">' + esc(r.sender_email) + '</td>'
          + '<td style="padding:8px;border-bottom:1px solid #eee">' + esc(r.recipient_email) + '</td>'
          + '<td style="text-align:right;padding:8px;border-bottom:1px solid #eee">' + fmt(r.amount) + '</td>'
          + '<td style="padding:8px;border-bottom:1px solid #eee">' + esc(r.note) + '</td>'
          + '<td style="text-align:right;padding:8px;border-bottom:1px solid #eee">' + esc(vnTime(r.created_at)) + '</td></tr>';
      });
      var tb = $('qtTransfersBody');
      if (tb) tb.innerHTML = rowsHtml;
      if (trEl) trEl.hidden = true;
      var wrap = $('qtTransfersWrap');
      if (wrap) wrap.hidden = false;
    } catch (e3) {
      var trEl2 = $('qtTransfers');
      if (trEl2) trEl2.textContent = 'Chưa có dữ liệu chuyển xu.';
    }
    // Số đếm tổng quan GĐ2 (không bắt buộc — thiếu thì để trống).
    try {
      var ov = await rpc('get_admin_overview');
      var box = $('qtOverviewCounts');
      if (box && Array.isArray(ov)) {
        var m = {};
        ov.forEach(function (r) { m[r.metric] = Number(r.value) || 0; });
        box.innerHTML = '<b>Bình luận chờ duyệt:</b> ' + fmt(m.comments_pending) + ' · '
          + '<b>Hỏi đáp mới:</b> ' + fmt(m.faq_new) + '/' + fmt(m.faq_total) + ' · '
          + '<b>Xu đã phát (tổng):</b> ' + fmt(m.xu_issued_total) + ' · '
          + '<b>Xu đã thu hồi:</b> ' + fmt(m.xu_reclaimed_total);
        box.hidden = false;
      }
    } catch (e4) { /* GĐ2 chưa chạy — bỏ qua, tab Tổng quan vẫn hiện số online */ }
    try {
      var cnt = await rpc('get_admin_counts');
      var box2 = $('qtAdminCounts');
      if (box2 && Array.isArray(cnt)) {
        var m2 = {};
        cnt.forEach(function (r) { m2[r.metric] = Number(r.value) || 0; });
        box2.innerHTML = '<b>Hồ sơ mẫu chờ duyệt:</b> ' + fmt(m2.profiles_pending) + ' · '
          + '<b>Shop chờ duyệt:</b> ' + fmt(m2.shop_profiles_pending) + ' · '
          + '<b>Tin tuyển chờ duyệt:</b> ' + fmt(m2.job_posts_pending) + ' · '
          // v124: số tin lô/xưởng/kiot chờ duyệt (metric mới trong
          // get_admin_counts; migration v124 chưa chạy thì m2.* = 0).
          + '<b>Lô chờ duyệt:</b> ' + fmt(m2.user_lots_pending) + ' · '
          + '<b>Xưởng chờ duyệt:</b> ' + fmt(m2.user_factories_pending) + ' · '
          + '<b>Kiot chờ duyệt:</b> ' + fmt(m2.user_kiots_pending) + ' · '
          + '<b>Tổng tài khoản:</b> ' + fmt(m2.total_users) + ' · '
          + '<b>Đang khóa:</b> ' + fmt(m2.suspended_users);
        box2.hidden = false;
      }
    } catch (e5) { /* GĐ1 chưa chạy — bỏ qua */ }
  }

  /* ---------- TAB: Duyệt bình luận (GĐ2) ---------- */
  var COMMENT_TARGET_LABEL = {
    model_profile: 'Hồ sơ mẫu', shop_profile: 'Hồ sơ shop', article: 'Bài báo',
    lot: 'Lô xả kho', factory: 'Xưởng may', kiot: 'Thanh lý kiot'
  };
  async function loadComments() {
    var wrap = $('admCommentsList');
    var msg = $('admCommentsMsg');
    if (!wrap) return;
    wrap.innerHTML = '<p>Đang tải…</p>';
    try {
      var rows = await rpc('get_pending_comments', { p_limit: PAGE_SIZE + 1, p_offset: state.commentsPage * PAGE_SIZE });
      var hasMore = Array.isArray(rows) && rows.length > PAGE_SIZE;
      var list = hasMore ? rows.slice(0, PAGE_SIZE) : rows;
      if (!Array.isArray(list) || !list.length) {
        wrap.innerHTML = '<p>Không còn bình luận nào chờ duyệt.</p>' + pagerHtml('comments', state.commentsPage, false);
        if (msg) setMsg(msg, '');
        return;
      }
      var html = '<table class="qt-table" style="width:100%;border-collapse:collapse"><thead><tr>'
        + '<th style="text-align:left;padding:8px;border-bottom:2px solid #ddd">Bình luận</th>'
        + '<th style="text-align:left;padding:8px;border-bottom:2px solid #ddd">Mục</th>'
        + '<th style="text-align:left;padding:8px;border-bottom:2px solid #ddd">Người gửi</th>'
        + '<th style="text-align:right;padding:8px;border-bottom:2px solid #ddd">Xu</th>'
        + '<th style="text-align:left;padding:8px;border-bottom:2px solid #ddd">Ngày gửi</th>'
        + '<th style="text-align:left;padding:8px;border-bottom:2px solid #ddd">Thao tác</th></tr></thead><tbody>';
      list.forEach(function (c) {
        html += '<tr data-cid="' + esc(c.id) + '"><td style="padding:8px;border-bottom:1px solid #eee;max-width:340px">'
          + esc(c.comment) + '</td><td style="padding:8px;border-bottom:1px solid #eee">'
          + esc(COMMENT_TARGET_LABEL[c.target_type] || c.target_type) + '<br><small>' + esc(c.target_ref) + '</small></td>'
          + '<td style="padding:8px;border-bottom:1px solid #eee">' + esc(c.commenter_name || 'Khách Vãng Lai')
          + (c.commenter_email ? '<br><small>' + esc(c.commenter_email) + '</small>' : '') + '</td>'
          + '<td style="text-align:right;padding:8px;border-bottom:1px solid #eee">' + fmt(c.points_value)
          + '<br><small>' + esc(c.points_status || '') + '</small></td>'
          + '<td style="padding:8px;border-bottom:1px solid #eee">' + esc(vnDate(c.created_at)) + '</td>'
          + '<td style="padding:8px;border-bottom:1px solid #eee;white-space:nowrap">'
          + '<button class="btn btn-primary btn-sm" data-adm-act="approve-comment" data-id="' + esc(c.id) + '" type="button">Duyệt +1 xu</button> '
          + '<button class="btn btn-ghost btn-sm" data-adm-act="reject-comment" data-id="' + esc(c.id) + '" type="button">Từ chối</button> '
          + '<button class="btn btn-ghost btn-sm" data-adm-act="delete-comment" data-id="' + esc(c.id) + '" type="button">Xóa</button>'
          + '</td></tr>';
      });
      html += '</tbody></table><p style="font-size:13px;color:#666">Duyệt xong mới cộng +1 xu (luật M11/M12 — điểm chỉ cộng lúc duyệt, không cộng trước). Từ chối cần nhập lý do; xóa vì spam/vi phạm trong 7 ngày thì thu hồi điểm (luật D3/B1).</p>' + pagerHtml('comments', state.commentsPage, hasMore);
      wrap.innerHTML = html;
    } catch (e) {
      wrap.innerHTML = '<p>' + esc(isMissingFn(e) ? 'Chưa có dữ liệu — migration ADMIN GĐ2 chưa chạy (hàm get_pending_comments chưa có).' : friendlyErr(e)) + '</p>';
    }
  }

  /* ---------- TAB: Duyệt hồ sơ / tin tuyển (GĐ1) ---------- */
  var MOD_KIND_LABEL = { profile: 'Hồ sơ mẫu', shop_profile: 'Hồ sơ shop', job_post: 'Tin tuyển',
    // v124: tin lô / xưởng / kiot do thành viên đăng (bảng user_lots /
    // user_factories / user_kiots) — duyệt cùng tab này, không thêm tab mới.
    user_lot: 'Lô (thành viên đăng)', user_factory: 'Xưởng (thành viên đăng)', user_kiot: 'Kiot (thành viên đăng)' };
  async function loadModeration() {
    var wrap = $('admModList');
    if (!wrap) return;
    wrap.innerHTML = '<p>Đang tải…</p>';
    try {
      var rows = await rpc('get_pending_moderation', { p_kind: null, p_limit: PAGE_SIZE + 1, p_offset: state.modPage * PAGE_SIZE });
      var hasMore = Array.isArray(rows) && rows.length > PAGE_SIZE;
      var list = hasMore ? rows.slice(0, PAGE_SIZE) : rows;
      if (!Array.isArray(list) || !list.length) { wrap.innerHTML = '<p>Không còn hồ sơ/tin nào chờ duyệt.</p>' + pagerHtml('moderation', state.modPage, false); return; }
      var html = '<table class="qt-table" style="width:100%;border-collapse:collapse"><thead><tr>'
        + '<th style="text-align:left;padding:8px;border-bottom:2px solid #ddd">Mục</th>'
        + '<th style="text-align:left;padding:8px;border-bottom:2px solid #ddd">Tiêu đề</th>'
        + '<th style="text-align:left;padding:8px;border-bottom:2px solid #ddd">Ngày gửi</th>'
        + '<th style="text-align:left;padding:8px;border-bottom:2px solid #ddd">Thao tác</th></tr></thead><tbody>';
      list.forEach(function (it) {
        var d = it.data || {};
        var sub = d.province || d.work_location || d.field || d.category || '';
        // v124: tin lô/xưởng/kiot — hiện tỉnh · danh mục/loại · giá · tên shop.
        if (it.kind === 'user_lot' || it.kind === 'user_factory' || it.kind === 'user_kiot') {
          var parts = [];
          if (d.province) parts.push(d.province);
          if (d.cat) parts.push(d.cat);
          if (d.kind) parts.push(d.kind);
          if (d.price_num != null) parts.push(fmt(d.price_num) + ' đ');
          if (d.shop_name) parts.push('Shop: ' + d.shop_name);
          sub = parts.join(' · ');
        }
        html += '<tr data-mid="' + esc(it.id) + '"><td style="padding:8px;border-bottom:1px solid #eee">' + esc(MOD_KIND_LABEL[it.kind] || it.kind) + '</td>'
          + '<td style="padding:8px;border-bottom:1px solid #eee">' + esc(it.title || '(không tiêu đề)')
          + (sub ? '<br><small>' + esc(sub) + '</small>' : '') + '</td>'
          + '<td style="padding:8px;border-bottom:1px solid #eee">' + esc(vnDate(it.created_at)) + '</td>'
          + '<td style="padding:8px;border-bottom:1px solid #eee;white-space:nowrap">'
          + '<button class="btn btn-primary btn-sm" data-adm-act="approve-mod" data-kind="' + esc(it.kind) + '" data-id="' + esc(it.id) + '" type="button">Duyệt</button> '
          + '<button class="btn btn-ghost btn-sm" data-adm-act="reject-mod" data-kind="' + esc(it.kind) + '" data-id="' + esc(it.id) + '" type="button">Từ chối</button>'
          + (it.kind === 'profile'
            ? ' <button class="btn btn-ghost btn-sm" data-adm-act="pin-profile" data-id="' + esc(it.id) + '" type="button">Ghim</button>'
            : '')
          + '</td></tr>';
      });
      html += '</tbody></table><p style="font-size:13px;color:#666">Từ chối bắt buộc nhập lý do. Admin không được tự duyệt hồ sơ/tin của chính mình (hàm server chặn).</p>' + pagerHtml('moderation', state.modPage, hasMore);
      wrap.innerHTML = html;
    } catch (e) {
      wrap.innerHTML = '<p>' + esc(isMissingFn(e) ? 'Chưa có dữ liệu — migration ADMIN GĐ1 chưa chạy (hàm get_pending_moderation chưa có).' : friendlyErr(e)) + '</p>';
    }
  }

  /* ---------- TAB: Hỏi đáp (GĐ2) ---------- */
  var FAQ_STATUS_LABEL = { moi: 'Mới', dang_xem: 'Đang xem', dang_sua: 'Đang sửa', da_sua: 'Đã sửa', da_tra_loi: 'Đã trả lời', tu_choi: 'Từ chối' };
  async function loadFaq() {
    var wrap = $('admFaqList');
    var sel = $('admFaqFilter');
    if (!wrap) return;
    wrap.innerHTML = '<p>Đang tải…</p>';
    var status = sel ? (sel.value || null) : null;
    try {
      var rows = await rpc('get_admin_faq', { p_status: status, p_limit: PAGE_SIZE + 1, p_offset: state.faqPage * PAGE_SIZE });
      var hasMore = Array.isArray(rows) && rows.length > PAGE_SIZE;
      var list = hasMore ? rows.slice(0, PAGE_SIZE) : rows;
      if (!Array.isArray(list) || !list.length) { wrap.innerHTML = '<p>Không có câu hỏi nào.</p>' + pagerHtml('faq', state.faqPage, false); return; }
      var html = '<table class="qt-table" style="width:100%;border-collapse:collapse"><thead><tr>'
        + '<th style="text-align:left;padding:8px;border-bottom:2px solid #ddd">Câu hỏi</th>'
        + '<th style="text-align:left;padding:8px;border-bottom:2px solid #ddd">Mục</th>'
        + '<th style="text-align:left;padding:8px;border-bottom:2px solid #ddd">Trạng thái</th>'
        + '<th style="text-align:left;padding:8px;border-bottom:2px solid #ddd">Ngày gửi</th>'
        + '<th style="text-align:left;padding:8px;border-bottom:2px solid #ddd">Đổi trạng thái</th></tr></thead><tbody>';
      list.forEach(function (q) {
        html += '<tr data-qid="' + esc(q.id) + '"><td style="padding:8px;border-bottom:1px solid #eee;max-width:340px">' + esc(q.question)
          + (q.contact ? '<br><small>Liên hệ: ' + esc(q.contact) + '</small>' : '') + '</td>'
          + '<td style="padding:8px;border-bottom:1px solid #eee">' + esc(q.category || '') + '</td>'
          + '<td style="padding:8px;border-bottom:1px solid #eee">' + esc(FAQ_STATUS_LABEL[q.status] || q.status) + '</td>'
          + '<td style="padding:8px;border-bottom:1px solid #eee">' + esc(vnDate(q.created_at)) + '</td>'
          + '<td style="padding:8px;border-bottom:1px solid #eee"><select data-adm-faq="' + esc(q.id) + '">'
          + Object.keys(FAQ_STATUS_LABEL).map(function (k) {
            return '<option value="' + k + '"' + (q.status === k ? ' selected' : '') + '>' + FAQ_STATUS_LABEL[k] + '</option>';
          }).join('') + '</select></td></tr>';
      });
      html += '</tbody></table>' + pagerHtml('faq', state.faqPage, hasMore);
      wrap.innerHTML = html;
    } catch (e) {
      wrap.innerHTML = '<p>' + esc(isMissingFn(e) ? 'Chưa có dữ liệu — migration ADMIN GĐ2 chưa chạy (hàm get_admin_faq chưa có).' : friendlyErr(e)) + '</p>';
    }
  }

  /* ---------- TAB: Người dùng & xu (GĐ1 + GĐ2) ---------- */
  function userRowHtml(u) {
    // v121 (notes admin): badge 🧪 test khi notes = 'Muse test' — nhìn là
    // biết ngay tài khoản nào là test (chỉ admin thấy; user không thấy notes).
    var testBadge = (u.is_test || u.notes === 'Muse test')
      ? ' <span style="display:inline-block;background:#fff3cd;border:1px solid #e8c97a;border-radius:10px;padding:1px 7px;font-size:12px;font-weight:700;color:#6b4e00;white-space:nowrap" title="Tài khoản test — ghi chú: Muse test">🧪 test</span>' : '';
    return '<tr data-uid="' + esc(u.user_id) + '"><td style="padding:8px;border-bottom:1px solid #eee">' + esc(u.email || '') + testBadge
      + '</td><td style="padding:8px;border-bottom:1px solid #eee">' + esc(vnDate(u.created_at)) + '</td>'
      + '<td style="padding:8px;border-bottom:1px solid #eee">' + (u.last_sign_in_at ? esc(vnDate(u.last_sign_in_at)) : '—') + '</td>'
      + '<td style="padding:8px;border-bottom:1px solid #eee">' + (u.has_model_profile ? 'Mẫu ' : '') + (u.has_shop_profile ? 'Shop' : '') + '</td>'
      + '<td style="padding:8px;border-bottom:1px solid #eee">' + (u.is_suspended ? '<b style="color:#b3261e">Đang khóa</b>' : 'Bình thường') + '</td>'
      + '<td style="padding:8px;border-bottom:1px solid #eee;white-space:nowrap">'
      + '<button class="btn btn-primary btn-sm" data-adm-act="view-user" data-id="' + esc(u.user_id) + '" data-email="' + esc(u.email || '') + '" type="button">Xem xu</button> '
      + '<button class="btn btn-ghost btn-sm" data-adm-act="reset-pw" data-email="' + esc(u.email || '') + '" type="button">Gửi email đặt lại MK</button> '
      + (u.is_suspended
        ? '<button class="btn btn-ghost btn-sm" data-adm-act="unsuspend-user" data-id="' + esc(u.user_id) + '" type="button">Mở khóa</button>'
        : '<button class="btn btn-ghost btn-sm" data-adm-act="suspend-user" data-id="' + esc(u.user_id) + '" type="button">Khóa</button>')
      + '</td></tr>';
  }
  function usersTableHtml(list) {
    return '<table class="qt-table" style="width:100%;border-collapse:collapse"><thead><tr>'
      + '<th style="text-align:left;padding:8px;border-bottom:2px solid #ddd">Email</th>'
      + '<th style="text-align:left;padding:8px;border-bottom:2px solid #ddd">Đăng ký</th>'
      + '<th style="text-align:left;padding:8px;border-bottom:2px solid #ddd">Đăng nhập gần nhất</th>'
      + '<th style="text-align:left;padding:8px;border-bottom:2px solid #ddd">Loại</th>'
      + '<th style="text-align:left;padding:8px;border-bottom:2px solid #ddd">Trạng thái</th>'
      + '<th style="text-align:left;padding:8px;border-bottom:2px solid #ddd">Thao tác</th></tr></thead><tbody>'
      + list.map(userRowHtml).join('') + '</tbody></table>';
  }
  async function loadUsers() {
    var wrap = $('admUsersList');
    if (!wrap) return;
    wrap.innerHTML = '<p>Đang tải…</p>';
    try {
      var q = (state.usersQuery || '').trim().toLowerCase();
      if (q) {
        // Tìm theo email: RPC get_admin_users KHÔNG có tham số tìm kiếm
        // (GĐ1 đã chạy live, đổi chữ ký hàm cần migration mới — ngoài
        // phạm vi sửa P2 này). Tổng tài khoản hiện nhỏ (vài chục) nên
        // lấy tối đa 100 tài khoản mới nhất rồi lọc client-side theo
        // email; nếu sau này vượt 100 tài khoản thì cần migration GĐ4
        // thêm p_search cho get_admin_users.
        var all = await rpc('get_admin_users', { p_limit: 100, p_offset: 0 });
        var filtered = (Array.isArray(all) ? all : []).filter(function (u) {
          return String(u.email || '').toLowerCase().indexOf(q) !== -1;
        });
        state.usersList = filtered; // v121: giữ danh sách để form chi tiết lấy notes prefill
        var pageRows = filtered.slice(state.usersPage * PAGE_SIZE, state.usersPage * PAGE_SIZE + PAGE_SIZE);
        var hasMore = (state.usersPage + 1) * PAGE_SIZE < filtered.length;
        if (!pageRows.length) {
          wrap.innerHTML = '<p>Không tìm thấy tài khoản nào có email chứa “' + esc(state.usersQuery.trim()) + '”.</p>'
            + '<p style="font-size:13px;color:#666">Tìm trong tối đa 100 tài khoản mới nhất.</p>'
            + pagerHtml('users', state.usersPage, false);
          return;
        }
        wrap.innerHTML = '<p style="font-size:13px;color:#666">Đang lọc theo email chứa “' + esc(state.usersQuery.trim())
          + '” — ' + fmt(filtered.length) + ' kết quả (tìm trong tối đa 100 tài khoản mới nhất).</p>'
          + usersTableHtml(pageRows) + pagerHtml('users', state.usersPage, hasMore);
        return;
      }
      var rows = await rpc('get_admin_users', { p_limit: PAGE_SIZE + 1, p_offset: state.usersPage * PAGE_SIZE });
      var hasMore2 = Array.isArray(rows) && rows.length > PAGE_SIZE;
      var list = hasMore2 ? rows.slice(0, PAGE_SIZE) : rows;
      state.usersList = list; // v121: giữ danh sách để form chi tiết lấy notes prefill
      if (!Array.isArray(list) || !list.length) { wrap.innerHTML = '<p>Chưa có tài khoản nào.</p>' + pagerHtml('users', state.usersPage, false); return; }
      wrap.innerHTML = usersTableHtml(list) + pagerHtml('users', state.usersPage, hasMore2);
    } catch (e) {
      wrap.innerHTML = '<p>' + esc(isMissingFn(e) ? 'Chưa có dữ liệu — migration ADMIN GĐ1 chưa chạy (hàm get_admin_users chưa có).' : friendlyErr(e)) + '</p>';
    }
  }
  async function viewUser(uid, email) {
    var box = $('admUserDetail');
    var msg = $('admUsersMsg');
    if (!box) return;
    box.hidden = false;
    box.innerHTML = '<h3>' + esc(email || uid) + '</h3><p>Đang tải số dư xu…</p>';
    try {
      var d = await rpc('get_admin_user_points', { p_user_id: uid });
      var rows = (d && Array.isArray(d.ledger) ? d.ledger : []).map(function (r) {
        return '<tr><td style="padding:6px;border-bottom:1px solid #eee;text-align:right">' + (Number(r.delta) > 0 ? '+' : '') + fmt(r.delta) + '</td>'
          + '<td style="padding:6px;border-bottom:1px solid #eee;text-align:right">' + fmt(r.balance_after) + '</td>'
          + '<td style="padding:6px;border-bottom:1px solid #eee">' + esc(r.type || '') + '</td>'
          + '<td style="padding:6px;border-bottom:1px solid #eee">' + esc(r.reason || '') + '</td>'
          + '<td style="padding:6px;border-bottom:1px solid #eee">' + esc(vnTime(r.created_at)) + '</td></tr>';
      }).join('');
      // v121 (notes admin): lấy ghi chú hiện tại của tài khoản này từ danh
      // sách vừa tải (get_admin_users trả notes + is_test) để prefill ô
      // Ghi chú ở cuối form chi tiết; không có trong danh sách thì để trống.
      var notesVal = '';
      try {
        var foundUser = (state.usersList || []).filter(function (x) { return String(x.user_id) === String(uid); })[0];
        if (foundUser) notesVal = foundUser.notes || '';
      } catch (e) { notesVal = ''; }
      box.innerHTML = '<h3>' + esc(email || uid) + '</h3>'
        + '<p><b>Số dư:</b> ' + fmt(d.balance) + ' xu · <b>Đã nhận tổng:</b> ' + fmt(d.earned_total)
        + ' xu · <b>Đã dùng/thu hồi:</b> ' + fmt(d.spent_total) + ' xu</p>'
        + '<table class="qt-table" style="width:100%;border-collapse:collapse"><thead><tr>'
        + '<th style="text-align:right;padding:6px;border-bottom:2px solid #ddd">Xu</th>'
        + '<th style="text-align:right;padding:6px;border-bottom:2px solid #ddd">Số dư sau</th>'
        + '<th style="text-align:left;padding:6px;border-bottom:2px solid #ddd">Loại</th>'
        + '<th style="text-align:left;padding:6px;border-bottom:2px solid #ddd">Lý do</th>'
        + '<th style="text-align:left;padding:6px;border-bottom:2px solid #ddd">Thời gian</th></tr></thead><tbody>'
        + (rows || '<tr><td colspan="5" style="padding:6px">Chưa có giao dịch xu nào.</td></tr>') + '</tbody></table>'
        + '<div style="margin-top:12px"><label>Điều chỉnh xu (âm = trừ, dương = cộng) <input id="admAdjustDelta" type="number" step="1" style="width:110px" placeholder="vd -10"></label> '
        + '<label>Lý do * <input id="admAdjustReason" type="text" style="width:220px" placeholder="vd Thu hồi xu gian lận"></label> '
        + '<button class="btn btn-primary btn-sm" id="admAdjustBtn" data-uid="' + esc(uid) + '" type="button">Áp dụng điều chỉnh</button> '
        + '<button class="btn btn-ghost btn-sm" id="admGrantAdminBtn" data-uid="' + esc(uid) + '" type="button">Cấp quyền admin</button></div>'
        + '<p style="font-size:13px;color:#666">Điều chỉnh âm chỉ trừ tới số dư 0 — phần thiếu ghi thành nợ xu (trừ dần khi user có hoạt động tạo xu sau này). Admin không được tự điều chỉnh xu của chính mình.</p>'
        + '<div style="margin-top:16px;border-top:1px solid #eee;padding-top:12px"><h4 style="margin:0 0 6px">Ghi chú (chỉ admin thấy)</h4>'
        + '<p style="font-size:13px;color:#666;margin:0 0 6px">Ghi chú nội bộ về tài khoản này — người dùng không thấy, không tự xóa được. Ghi “Muse test” để đánh dấu tài khoản test (hiện badge 🧪 test ở danh sách). Tối đa 200 ký tự; để trống để xóa ghi chú.</p>'
        + '<textarea id="admUserNotes" rows="2" maxlength="200" style="width:100%;max-width:520px" placeholder="vd Muse test">' + esc(notesVal) + '</textarea> '
        + '<button class="btn btn-primary btn-sm" id="admSaveNotesBtn" data-uid="' + esc(uid) + '" type="button">Lưu ghi chú</button></div>';
      var ab = $('admAdjustBtn');
      if (ab) ab.addEventListener('click', onAdjustPoints);
      var gb = $('admGrantAdminBtn');
      if (gb) gb.addEventListener('click', onGrantAdmin);
      var nb = $('admSaveNotesBtn');
      if (nb) nb.addEventListener('click', onSaveNotes);
      if (msg) setMsg(msg, '');
    } catch (e) {
      box.innerHTML = '<h3>' + esc(email || uid) + '</h3><p>' + esc(isMissingFn(e) ? 'Chưa có dữ liệu — migration ADMIN GĐ2 chưa chạy (hàm get_admin_user_points chưa có).' : friendlyErr(e)) + '</p>';
    }
  }
  async function onAdjustPoints(e) {
    var btn = e.currentTarget;
    var uid = btn.getAttribute('data-uid');
    var deltaEl = $('admAdjustDelta');
    var reasonEl = $('admAdjustReason');
    var msg = $('admUsersMsg');
    var delta = deltaEl ? parseInt(deltaEl.value, 10) : NaN;
    var reason = reasonEl ? String(reasonEl.value || '').trim() : '';
    if (!delta || isNaN(delta)) { setMsg(msg, 'Nhập số xu điều chỉnh khác 0.', true); return; }
    if (!reason) { setMsg(msg, 'Nhập lý do điều chỉnh xu.', true); return; }
    if (!window.confirm('Điều chỉnh ' + delta + ' xu cho tài khoản này? Lý do: ' + reason)) return;
    btn.disabled = true;
    try {
      var out = await rpc('admin_adjust_points', { p_user_id: uid, p_delta: delta, p_reason: reason });
      setMsg(msg, 'Đã điều chỉnh. Số dư sau: ' + fmt(out && out.balance_after) + ' xu'
        + (out && out.shortfall_debt ? ' — còn nợ ' + fmt(out.shortfall_debt) + ' xu (trừ dần sau).' : ''));
      await viewUser(uid, '');
    } catch (err) { setMsg(msg, friendlyErr(err), true); }
    btn.disabled = false;
  }
  async function onGrantAdmin(e) {
    var btn = e.currentTarget;
    var uid = btn.getAttribute('data-uid');
    var msg = $('admUsersMsg');
    if (!window.confirm('Cấp quyền admin cho tài khoản này? Người này sẽ thấy toàn bộ dữ liệu quản trị.')) return;
    btn.disabled = true;
    try {
      await rpc('admin_grant_admin', { p_user_id: uid, p_note: 'Cấp từ trang quản trị' });
      setMsg(msg, 'Đã cấp quyền admin.');
    } catch (err) { setMsg(msg, friendlyErr(err), true); }
    btn.disabled = false;
  }
  // v121 (notes admin): lưu ghi chú cho tài khoản (chỉ admin; RPC
  // admin_set_profile_notes kiểm tra quyền + ghi audit log). Lưu xong
  // tải lại danh sách để badge 🧪 test cập nhật + mở lại chi tiết.
  async function onSaveNotes(e) {
    var btn = e.currentTarget;
    var uid = btn.getAttribute('data-uid');
    var msg = $('admUsersMsg');
    var ta = $('admUserNotes');
    var val = ta ? String(ta.value || '').trim() : '';
    if (val.length > 200) { setMsg(msg, 'Ghi chú tối đa 200 ký tự.', true); return; }
    if (!window.confirm(val ? 'Lưu ghi chú "' + val + '" cho tài khoản này?' : 'Xóa ghi chú của tài khoản này?')) return;
    btn.disabled = true;
    try {
      await rpc('admin_set_profile_notes', { p_user_id: uid, p_notes: val });
      setMsg(msg, 'Đã lưu ghi chú.');
      await loadUsers();
      await viewUser(uid, '');
    } catch (err) { setMsg(msg, friendlyErr(err), true); }
    btn.disabled = false;
  }

  /* ---------- TAB: Dữ liệu test (GĐ2) ---------- */
  async function loadTestData() {
    var wrap = $('admTestList');
    if (!wrap) return;
    wrap.innerHTML = '<p>Đang tải…</p>';
    try {
      var d = await rpc('get_admin_test_data', { p_limit: 100 });
      state.testData = d || {};
      renderTestData();
    } catch (e) {
      wrap.innerHTML = '<p>' + esc(isMissingFn(e) ? 'Chưa có dữ liệu — migration ADMIN GĐ2 chưa chạy (hàm get_admin_test_data chưa có).' : friendlyErr(e)) + '</p>';
    }
  }
  function renderTestData() {
    // Phân trang client-side: RPC get_admin_test_data trả 1 gói 3 nhóm
    // (users/profiles/comments), không có offset — cắt mỗi nhóm theo
    // cùng số trang, 20 dòng/nhóm/trang.
    var wrap = $('admTestList');
    if (!wrap) return;
    var d = state.testData || {};
    var users = (d && Array.isArray(d.users)) ? d.users : [];
    var profiles = (d && Array.isArray(d.profiles)) ? d.profiles : [];
    var comments = (d && Array.isArray(d.comments)) ? d.comments : [];
    var page = state.testPage || 0;
    var start = page * PAGE_SIZE, end = start + PAGE_SIZE;
    var hasMore = users.length > end || profiles.length > end || comments.length > end;
    var html = '<p style="font-size:13px;color:#666">Danh sách ứng viên test theo mẫu (email/tên chứa test/QA/mailto.plus/mail.tm). '
      + 'CHỈ liệt kê — admin xác nhận từng dòng rồi mới dọn bằng các nút thao tác (từ chối hồ sơ / xóa bình luận / khóa tài khoản). Không tự xóa hàng loạt.</p>';
    html += '<h3>Tài khoản test (' + users.length + ')</h3>';
    html += users.length ? '<ul>' + users.slice(start, end).map(function (u) {
      return '<li>' + esc(u.email) + ' <small>(' + esc(vnDate(u.created_at)) + ' — ' + esc(u.why || '') + ')</small> '
        + '<button class="btn btn-ghost btn-sm" data-adm-act="suspend-user" data-id="' + esc(u.user_id) + '" type="button">Khóa</button></li>';
    }).join('') + '</ul>' : '<p>Không thấy tài khoản test nào.</p>';
    html += '<h3>Hồ sơ test (' + profiles.length + ')</h3>';
    html += profiles.length ? '<ul>' + profiles.slice(start, end).map(function (p) {
      return '<li>[' + esc(p.kind) + '] ' + esc(p.title) + ' <small>(' + esc(vnDate(p.created_at)) + ')</small> '
        + '<button class="btn btn-ghost btn-sm" data-adm-act="reject-mod" data-kind="' + esc(p.kind) + '" data-id="' + esc(p.id) + '" type="button">Từ chối</button></li>';
    }).join('') + '</ul>' : '<p>Không thấy hồ sơ test nào.</p>';
    html += '<h3>Bình luận test (' + comments.length + ')</h3>';
    html += comments.length ? '<ul>' + comments.slice(start, end).map(function (c) {
      return '<li>[' + esc(c.target_type) + ':' + esc(c.target_ref) + '] ' + esc(c.comment || '') + ' <small>(' + esc(c.moderation_status || '') + ')</small> '
        + '<button class="btn btn-ghost btn-sm" data-adm-act="delete-comment" data-id="' + esc(c.id) + '" type="button">Xóa</button></li>';
    }).join('') + '</ul>' : '<p>Không thấy bình luận test nào.</p>';
    html += pagerHtml('testdata', page, hasMore);
    wrap.innerHTML = html;
  }

  /* ---------- TAB: Nhật ký quản trị (GĐ1) ---------- */
  async function loadAudit() {
    var wrap = $('admAuditList');
    var daysEl = $('admAuditDays');
    if (!wrap) return;
    wrap.innerHTML = '<p>Đang tải…</p>';
    try {
      var rows = await rpc('get_admin_audit_log', { p_days: daysEl ? parseInt(daysEl.value, 10) || 7 : 7, p_action: null, p_limit: PAGE_SIZE + 1, p_offset: state.auditPage * PAGE_SIZE });
      var hasMore = Array.isArray(rows) && rows.length > PAGE_SIZE;
      var list = hasMore ? rows.slice(0, PAGE_SIZE) : rows;
      if (!Array.isArray(list) || !list.length) { wrap.innerHTML = '<p>Chưa có hành động quản trị nào trong khoảng này.</p>' + pagerHtml('audit', state.auditPage, false); return; }
      var html = '<table class="qt-table" style="width:100%;border-collapse:collapse"><thead><tr>'
        + '<th style="text-align:left;padding:8px;border-bottom:2px solid #ddd">Thời gian</th>'
        + '<th style="text-align:left;padding:8px;border-bottom:2px solid #ddd">Admin</th>'
        + '<th style="text-align:left;padding:8px;border-bottom:2px solid #ddd">Hành động</th>'
        + '<th style="text-align:left;padding:8px;border-bottom:2px solid #ddd">Đối tượng</th>'
        + '<th style="text-align:left;padding:8px;border-bottom:2px solid #ddd">Chi tiết</th></tr></thead><tbody>';
      list.forEach(function (l) {
        html += '<tr><td style="padding:8px;border-bottom:1px solid #eee">' + esc(vnTime(l.created_at)) + '</td>'
          + '<td style="padding:8px;border-bottom:1px solid #eee">' + esc(l.admin_email || l.admin_user_id || '') + '</td>'
          + '<td style="padding:8px;border-bottom:1px solid #eee">' + esc(l.action || '') + '</td>'
          + '<td style="padding:8px;border-bottom:1px solid #eee">' + esc(l.target_type || '') + '<br><small>' + esc(l.target_id || '') + '</small></td>'
          + '<td style="padding:8px;border-bottom:1px solid #eee"><small>' + esc(l.detail ? JSON.stringify(l.detail) : '') + '</small></td></tr>';
      });
      html += '</tbody></table>' + pagerHtml('audit', state.auditPage, hasMore);
      wrap.innerHTML = html;
    } catch (e) {
      wrap.innerHTML = '<p>' + esc(isMissingFn(e) ? 'Chưa có dữ liệu — migration ADMIN GĐ1 chưa chạy (hàm get_admin_audit_log chưa có).' : friendlyErr(e)) + '</p>';
    }
  }

  /* ---------- TAB: Trao đổi (GĐ3) — chat live trực tiếp giữa các admin ----------
     Realtime: Supabase postgres_changes (INSERT trên admin_comments) đẩy tin
     mới ngay, presence 'admin-room' hiện ai đang mở tab. Mất realtime thì
     polling 60 giây + nút Làm mới vẫn chạy (fallback).
     P2 (09/11): kênh Realtime mở 1 lần sau khi xác nhận admin và GIỮ
     suốt phiên (không hủy khi rời tab) để badge tin chưa đọc nhận được
     INSERT cả khi đang ở tab khác; badge đếm theo lần xem gần nhất
     (localStorage admin_last_seen_chat:<uid>), xóa khi mở tab Trao đổi. */
  function chatItemHtml(m) {
    var mine = m.author_id && m.author_id === state.userId;
    return '<div class="adm-chat-item" data-mid="' + esc(m.id) + '"><p class="adm-chat-meta"><b>' + esc(m.author_email || 'Admin')
      + '</b> · ' + esc(chatTime(m.created_at)) + (mine ? ' · (bạn)' : '') + '</p>'
      + '<div class="adm-chat-body">' + esc(m.body) + '</div>'
      + '<p style="margin:6px 0 0"><button class="btn btn-ghost btn-sm" data-adm-act="delete-chat" data-id="' + esc(m.id) + '" type="button">Xóa</button></p></div>';
  }
  function chatNearBottom(el) {
    if (!el) return true;
    return el.scrollHeight - el.scrollTop - el.clientHeight < 80;
  }
  async function loadChat() {
    var wrap = $('admChatList');
    if (!wrap) return;
    var wasBottom = chatNearBottom(wrap);
    var prevTop = wrap.scrollTop;
    wrap.innerHTML = '<p>Đang tải…</p>';
    try {
      var list = await rpc('get_admin_comments', { p_limit: 50, p_offset: 0 });
      if (!Array.isArray(list) || !list.length) {
        state.chatMessages = [];
        wrap.innerHTML = '<p>Chưa có trao đổi nào — gửi tin đầu tiên.</p>';
        return;
      }
      state.chatMessages = list;
      // RPC trả mới nhất trước; chat hiển thị cũ → mới (tin mới nhất ở cuối).
      wrap.innerHTML = '<div class="adm-chat-list">' + list.slice().reverse().map(chatItemHtml).join('') + '</div>';
      if (wasBottom) wrap.scrollTop = wrap.scrollHeight; else wrap.scrollTop = prevTop;
    } catch (e) {
      wrap.innerHTML = '<p>' + esc(isMissingFn(e) ? 'Chưa có dữ liệu — migration ADMIN GĐ3 chưa chạy (hàm get_admin_comments chưa có).' : friendlyErr(e)) + '</p>';
    }
  }
  function appendChatMessage(m) {
    var wrap = $('admChatList');
    if (!wrap || !m || !m.id) return false;
    var listEl = wrap.querySelector('.adm-chat-list');
    if (!listEl) { loadChat(); return true; } // chưa tải xong / đang trống → tải lại
    if (listEl.querySelector('[data-mid="' + String(m.id).replace(/"/g, '') + '"]')) return false; // đã có (polling/vừa gửi)
    var wasBottom = chatNearBottom(wrap);
    listEl.insertAdjacentHTML('beforeend', chatItemHtml(m));
    if (wasBottom) wrap.scrollTop = wrap.scrollHeight;
    return true;
  }
  function setChatLiveStatus(mode) {
    var dot = $('admChatLiveDot');
    var txt = $('admChatLiveText');
    if (!dot || !txt) return;
    if (mode === 'live') { dot.style.background = '#1faa59'; txt.textContent = 'Trực tiếp'; }
    else if (mode === 'reconnecting') { dot.style.background = '#999'; txt.textContent = 'Đang kết nối lại…'; }
    else { dot.style.background = '#999'; txt.textContent = 'Chưa có kết nối trực tiếp — tự làm mới 60 giây.'; }
  }
  function renderChatPresence() {
    var el = $('admChatPresence');
    if (!el) return;
    var ch = state.chatChannel;
    var emails = [];
    try {
      var st = ch && typeof ch.presenceState === 'function' ? ch.presenceState() : {};
      Object.keys(st).forEach(function (k) {
        (st[k] || []).forEach(function (p) { if (p && p.email) emails.push(p.email); });
      });
    } catch (e) { emails = []; }
    el.innerHTML = 'Đang online: ' + (emails.length ? emails.map(function (a) { return '<b>' + esc(a) + '</b>'; }).join(', ') : '—');
  }
  /* ---------- badge tin chưa đọc tab Trao đổi (P2) ----------
     Đếm tin có created_at sau lần xem tab gần nhất và không phải do
     chính mình gửi. Lần xem lưu theo từng admin (localStorage, key
     admin_last_seen_chat:<uid>); lần đầu chưa có mốc thì lấy "bây giờ"
     làm mốc (không đếm tin cũ từ trước khi tính năng này có). Badge
     cập nhật qua Realtime INSERT (kênh luôn mở khi đã đăng nhập admin)
     + polling 60 giây làm dự phòng khi mất realtime. */
  function chatLastSeenKey() { return 'admin_last_seen_chat:' + (state.userId || 'anon'); }
  function getChatLastSeen() {
    try {
      var v = window.localStorage ? window.localStorage.getItem(chatLastSeenKey()) : null;
      if (v) return v;
    } catch (e) { /* localStorage không dùng được — coi như chưa xem */ }
    var now = new Date().toISOString();
    setChatLastSeen(now);
    return now;
  }
  function setChatLastSeen(iso) {
    try { if (window.localStorage) window.localStorage.setItem(chatLastSeenKey(), iso); } catch (e) { /* bỏ qua */ }
  }
  function updateChatBadge() {
    var b = $('admChatBadge');
    if (!b) return;
    var n = state.chatUnread || 0;
    if (!state.isAdmin || n <= 0) { b.hidden = true; b.textContent = ''; return; }
    b.textContent = n > 99 ? '99+' : String(n);
    b.hidden = false;
  }
  function countUnread(list, lastSeen) {
    var t = Date.parse(lastSeen || '') || 0;
    var n = 0;
    (list || []).forEach(function (m) {
      if (m && m.author_id !== state.userId && (Date.parse(m.created_at || '') || 0) > t) n++;
    });
    return n;
  }
  async function refreshChatBadge() {
    if (!state.isAdmin) return;
    try {
      var list = await rpc('get_admin_comments', { p_limit: 50, p_offset: 0 });
      state.chatUnread = countUnread(list, getChatLastSeen());
      updateChatBadge();
    } catch (e) { /* migration chưa chạy / mất mạng — ẩn badge, không vỡ console */ }
  }
  function markChatSeen() {
    var last = null;
    (state.chatMessages || []).forEach(function (m) {
      var t = Date.parse(m.created_at || '') || 0;
      if (t && (!last || t > Date.parse(last))) last = m.created_at;
    });
    setChatLastSeen(last || new Date().toISOString());
    state.chatUnread = 0;
    updateChatBadge();
  }
  function startBadgeTimer() {
    stopBadgeTimer();
    state.badgeTimer = setInterval(function () {
      if (state.activeTab !== 'chat') refreshChatBadge().catch(function () { /* lần sau thử lại */ });
    }, 60000);
  }
  function stopBadgeTimer() {
    if (state.badgeTimer) { clearInterval(state.badgeTimer); state.badgeTimer = null; }
  }
  function startChatLive() {
    stopChatLive();
    var c = client();
    if (!c || typeof c.channel !== 'function') { setChatLiveStatus('off'); return; }
    try {
      var ch = c.channel('admin-room')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'admin_comments' }, function (payload) {
          setChatLiveStatus('live');
          if (payload && payload.new) {
            if (state.activeTab === 'chat') {
              appendChatMessage(payload.new);
              // Tin mới có thể đã sinh task tự động (trigger) → tải lại
              // danh sách công việc.
              loadTasks().catch(function () { /* lần sau thử lại */ });
            } else if (payload.new.author_id !== state.userId
              && (Date.parse(payload.new.created_at || '') || 0) > (Date.parse(getChatLastSeen()) || 0)) {
              // Đang ở tab khác: không chen tin, chỉ tăng badge chưa đọc.
              state.chatUnread = (state.chatUnread || 0) + 1;
              updateChatBadge();
            }
          }
        })
        .on('presence', { event: 'sync' }, function () { renderChatPresence(); })
        .on('presence', { event: 'join' }, function () { renderChatPresence(); })
        .on('presence', { event: 'leave' }, function () { renderChatPresence(); })
        .subscribe(function (status) {
          if (status === 'SUBSCRIBED') {
            setChatLiveStatus('live');
            try { ch.track({ email: state.email }); } catch (e2) { /* presence không bắt buộc */ }
            renderChatPresence();
          } else {
            setChatLiveStatus('reconnecting');
          }
        });
      state.chatChannel = ch;
    } catch (e) {
      state.chatChannel = null;
      setChatLiveStatus('off');
    }
  }
  function stopChatLive() {
    var ch = state.chatChannel;
    state.chatChannel = null;
    if (ch && typeof ch.unsubscribe === 'function') {
      try { ch.unsubscribe(); } catch (e) { /* bỏ qua */ }
    }
    setChatLiveStatus('off');
  }
  function startChatTimer() {
    stopChatTimer();
    state.chatTimer = setInterval(function () {
      loadChat().catch(function () { /* lần sau thử lại */ });
      loadTasks().catch(function () { /* lần sau thử lại */ });
    }, 60000);
  }
  function stopChatTimer() {
    if (state.chatTimer) { clearInterval(state.chatTimer); state.chatTimer = null; }
  }
  async function onSendChat() {
    var input = $('admChatInput');
    var btn = $('admChatSend');
    var msg = $('admChatMsg');
    if (!input || !btn) return;
    if (state.legacyGate) { setMsg(msg, 'Chưa chạy migration GĐ1/GĐ3 — tab Trao đổi chưa mở được.', true); return; }
    var body = String(input.value || '').trim();
    if (!body) { setMsg(msg, 'Nhập nội dung tin nhắn trước khi gửi.', true); return; }
    if (body.length > 2000) { setMsg(msg, 'Tin nhắn tối đa 2000 ký tự.', true); return; }
    btn.disabled = true;
    try {
      await rpc('admin_post_comment', { p_body: body });
      input.value = '';
      setMsg(msg, 'Đã gửi.');
      await loadChat();
      markChatSeen();
    } catch (err) { setMsg(msg, friendlyErr(err), true); }
    btn.disabled = false;
  }

  /* ---------- TAB: Trao đổi — Danh sách tổng hợp công việc (v118) ----------
     Task tự thêm bằng trigger trên admin_comments (SQL v118): tin mới chứa
     từ khóa chỉ vấn đề (lỗi, cần sửa, thiếu, hỏng...) thì sinh 1 dòng
     admin_tasks (title = câu chứa từ khóa, location trích nếu có tên hệ
     thống/trang). Task thêm tay qua RPC admin_create_task.
     Trạng thái: chua_xu_ly → dang_xu_ly → da_xong → chua_xu_ly (bấm vào
     trạng thái để đổi; admin nào cũng đổi được — người sửa lỗi cần đánh
     dấu tiến độ trên task do bên khác nêu). 'khong_phai_van_de' là trạng
     thái riêng để loại task tự thêm sai mà vẫn giữ dấu vết: không tính
     vào danh sách việc đang làm (mặc định), xem lại bằng bộ lọc.
     QUYỀN (anh Thọ chốt 00:59 ngày 10/11): sửa nội dung (tiêu đề/vị trí/
     mô tả), xóa, và đánh dấu/khôi phục "Không phải vấn đề" CHỈ tác giả
     (author_email trùng email đăng nhập) hoặc owner (ver2solution@gmail.com).
     UI chỉ hiện nút Sửa/Xóa/"Không phải vấn đề" trên task của mình (owner
     thấy hết). Server (RPC + RLS policy) kiểm tra lại — client chỉ ẩn nút.
     Không dùng window.confirm cho xóa (hộp thoại native bị tự tắt trên
     trình duyệt tự động, gây thoát im lặng — xem lỗi nút Đăng bài 09/11);
     xóa xác nhận 2 bước ngay trên nút. */
  var TASK_STATUS = {
    chua_xu_ly: { label: 'Chưa xử lý', next: 'dang_xu_ly', cls: 'st-todo' },
    dang_xu_ly: { label: 'Đang xử lý', next: 'da_xong', cls: 'st-doing' },
    da_xong: { label: 'Đã xong', next: 'chua_xu_ly', cls: 'st-done' },
    khong_phai_van_de: { label: 'Không phải vấn đề', next: 'chua_xu_ly', cls: 'st-notissue' }
  };
  var TASK_OWNER_EMAIL = 'ver2solution@gmail.com';
  var TASK_AUTHOR_NAMES = {
    'ver2solution@gmail.com': 'Ryan',
    'thondads@gmail.com': 'Rion',
    'thond.bds@gmail.com': 'Muse BĐS'
  };
  function taskAuthorName(email) {
    if (TASK_AUTHOR_NAMES[email]) return TASK_AUTHOR_NAMES[email];
    var e = String(email || '');
    return e ? e.split('@')[0] : 'Admin';
  }
  function taskCanEdit(t) {
    return !!t && (t.author_email === state.email || state.email === TASK_OWNER_EMAIL);
  }
  function taskItemHtml(t) {
    var st = TASK_STATUS[t.status] || TASK_STATUS.chua_xu_ly;
    var canEdit = taskCanEdit(t);
    var html = '<div class="adm-task-item" data-tid="' + esc(t.id) + '">'
      + '<p class="adm-task-title">' + esc(t.title) + '</p>'
      + '<p class="adm-task-meta">' + esc(taskAuthorName(t.author_email)) + ' · '
      + esc(t.location || 'Chưa rõ vị trí') + ' · ' + esc(vnDate(t.created_at)) + '</p>';
    if (t.body) html += '<p class="adm-task-body">' + esc(t.body) + '</p>';
    html += '<p style="margin:6px 0 0;display:flex;gap:6px;flex-wrap:wrap;align-items:center">';
    // Task "Không phải vấn đề" chỉ tác giả/owner mới khôi phục được
    // (server chặn) nên với bên khác hiển thị nhãn tĩnh, không bấm được.
    if (t.status === 'khong_phai_van_de' && !canEdit) {
      html += '<span class="adm-task-st ' + st.cls + '">' + esc(st.label) + '</span>';
    } else {
      html += '<button class="adm-task-st ' + st.cls + '" data-adm-act="cycle-task" data-id="' + esc(t.id) + '" data-status="' + esc(t.status) + '" type="button" title="Bấm để đổi trạng thái">' + esc(st.label) + '</button>';
    }
    if (canEdit) {
      html += '<button class="btn btn-ghost btn-sm" data-adm-act="edit-task" data-id="' + esc(t.id) + '" type="button">Sửa</button>';
      if (t.status !== 'khong_phai_van_de') {
        html += '<button class="btn btn-ghost btn-sm" data-adm-act="notissue-task" data-id="' + esc(t.id) + '" type="button">Không phải vấn đề</button>';
      }
      html += '<button class="btn btn-ghost btn-sm" data-adm-act="delete-task" data-id="' + esc(t.id) + '" type="button">Xóa</button>';
    }
    html += '</p>';
    // Form sửa nội tuyến (ẩn mặc định, chỉ hiện khi bấm Sửa).
    if (canEdit) {
      html += '<div class="adm-task-edit" data-edit-for="' + esc(t.id) + '" hidden>'
        + '<p style="margin:8px 0 4px"><label>Vấn đề *<br><input type="text" maxlength="200" value="' + esc(t.title) + '" data-edit-field="title" style="width:100%"></label></p>'
        + '<p style="margin:4px 0"><label>Ở đâu<br><input type="text" maxlength="100" value="' + esc(t.location || '') + '" data-edit-field="location" style="width:100%"></label></p>'
        + '<p style="margin:4px 0"><label>Mô tả<br><textarea maxlength="500" data-edit-field="body" style="width:100%;min-height:56px">' + esc(t.body || '') + '</textarea></label></p>'
        + '<p style="margin:6px 0 0"><button class="btn btn-primary btn-sm" data-adm-act="save-task" data-id="' + esc(t.id) + '" type="button">Lưu</button> '
        + '<button class="btn btn-ghost btn-sm" data-adm-act="cancel-task" data-id="' + esc(t.id) + '" type="button">Hủy</button></p></div>';
    }
    return html + '</div>';
  }
  function taskFilters() {
    var sf = $('admTaskStatusFilter');
    var af = $('admTaskAuthorFilter');
    return {
      status: sf ? String(sf.value || '') : '',
      author: af ? String(af.value || '') : ''
    };
  }
  async function loadTasks() {
    var wrap = $('admTaskList');
    if (!wrap) return;
    var f = taskFilters();
    try {
      var list = await rpc('get_admin_tasks', {
        p_status: f.status === 'all' ? 'all' : (f.status || null),
        p_author_email: f.author || null,
        p_limit: 50, p_offset: 0
      });
      state.tasks = Array.isArray(list) ? list : [];
      if (!state.tasks.length) {
        wrap.innerHTML = '<p>Chưa có công việc nào — vấn đề nêu trong chat sẽ tự thêm vào đây.</p>';
        return;
      }
      wrap.innerHTML = '<div class="adm-task-list">' + state.tasks.map(taskItemHtml).join('') + '</div>';
    } catch (e) {
      wrap.innerHTML = '<p>' + esc(isMissingFn(e) ? 'Chưa có dữ liệu — migration v118 (bảng admin_tasks) chưa chạy.' : friendlyErr(e)) + '</p>';
    }
  }
  async function onAddTask() {
    var titleEl = $('admTaskTitle');
    var locEl = $('admTaskLocation');
    var msg = $('admTaskMsg');
    if (!titleEl) return;
    var title = String(titleEl.value || '').trim();
    var loc = locEl ? String(locEl.value || '').trim() : '';
    if (!title) { setMsg(msg, 'Nhập vấn đề trước khi thêm.', true); return; }
    if (title.length > 200) { setMsg(msg, 'Vấn đề tối đa 200 ký tự.', true); return; }
    try {
      await rpc('admin_create_task', { p_title: title, p_location: loc || null, p_body: null });
      titleEl.value = '';
      if (locEl) locEl.value = '';
      setMsg(msg, 'Đã thêm công việc.');
      await loadTasks();
    } catch (err) { setMsg(msg, friendlyErr(err), true); }
  }

  /* ---------- TAB: Viết bài (GĐ4) — đăng bài Tin tức, tự đăng không duyệt ----------
     Form gửi bản thảo qua RPC admin_submit_article (GĐ4, SECURITY DEFINER +
     audit log). Bài lưu status 'ready' — script publisher
     (tools/publish-article-drafts.mjs) sinh file bai-viet/<slug>.html +
     mục data.js + sitemap rồi đi cùng deploy sau; sau đó gọi
     admin_mark_article_published để tránh đăng trùng.
     Chuyên mục: đúng 1 trong 10 chuyên mục Tin tức đã chốt (mỗi bài mới
     gắn đúng 1 mục). Nội dung bài dùng định dạng đơn giản: dòng '## '
     = tiêu đề mục (h2), dòng trống ngăn đoạn, '- ' = liệt kê, '> ' =
     khối nhấn mạnh; publisher chuyển thành HTML. */
  var ARTICLE_CATS = ['Công nghệ', 'Livestream', 'Phân tích', 'Xu hướng', 'Dòng tiền', 'Thị trường', 'Hàng hoá', 'Đang hot', 'Đời Sống', 'Việc Làm'];
  var ARTICLE_STATUS_LABEL = { ready: 'Chờ đăng', published: 'Đã đăng', deleted: 'Đã xóa', rejected: 'Bị từ chối' };
  // GĐ4b: ai được sửa bản thảo — tác giả của bản đó, hoặc owner
  // (ver2solution@gmail.com, cùng hằng TASK_OWNER_EMAIL). Server chặn
  // bằng RPC admin_update_article_draft; đây chỉ để ẩn nút Sửa cho đẹp.
  function draftCanEdit(d) {
    return !!d && (d.author_email === state.email || state.email === TASK_OWNER_EMAIL);
  }
  function slugify(s) {
    var v = String(s || '').toLowerCase();
    // Bỏ dấu tiếng Việt → chữ không dấu, chỉ giữ a-z0-9, đổi khoảng trắng/dấu khác thành '-'.
    var map = { 'à': 'a', 'á': 'a', 'ả': 'a', 'ã': 'a', 'ạ': 'a', 'ă': 'a', 'ắ': 'a', 'ằ': 'a', 'ẳ': 'a', 'ẵ': 'a', 'ặ': 'a', 'â': 'a', 'ấ': 'a', 'ầ': 'a', 'ẩ': 'a', 'ẫ': 'a', 'ậ': 'a', 'đ': 'd', 'è': 'e', 'é': 'e', 'ẻ': 'e', 'ẽ': 'e', 'ẹ': 'e', 'ê': 'e', 'ế': 'e', 'ề': 'e', 'ể': 'e', 'ễ': 'e', 'ệ': 'e', 'ì': 'i', 'í': 'i', 'ỉ': 'i', 'ĩ': 'i', 'ị': 'i', 'ò': 'o', 'ó': 'o', 'ỏ': 'o', 'õ': 'o', 'ọ': 'o', 'ô': 'o', 'ố': 'o', 'ồ': 'o', 'ổ': 'o', 'ỗ': 'o', 'ộ': 'o', 'ơ': 'o', 'ớ': 'o', 'ờ': 'o', 'ở': 'o', 'ỡ': 'o', 'ợ': 'o', 'ù': 'u', 'ú': 'u', 'ủ': 'u', 'ũ': 'u', 'ụ': 'u', 'ư': 'u', 'ứ': 'u', 'ừ': 'u', 'ử': 'u', 'ữ': 'u', 'ự': 'u', 'ỳ': 'y', 'ý': 'y', 'ỷ': 'y', 'ỹ': 'y', 'ỵ': 'y' };
    v = v.split('').map(function (ch) { return map[ch] || ch; }).join('');
    v = v.replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').replace(/-+/g, '-');
    return v.slice(0, 100);
  }
  // v146-fix (11/11/2026): đo độ dài NỘI DUNG (text thật), không tính mã HTML.
  // Lỗi gốc: body là HTML do editor v122 đồng bộ (thẻ <p>/<h2>/<a href="...">),
  // validateArticleDraft cũ đo body.length trực tiếp nên bài 27.000–30.000 ký tự
  // text bị chặn oan vì HTML dài hơn 30.000 (đo thực: text 27.000 → HTML 31.901).
  // Chỉ dùng để kiểm tra độ dài — body gửi lên server vẫn giữ nguyên HTML.
  function articleTextLength(body) {
    var t = String(body || '')
      .replace(/<[^>]*>/g, ' ')
      .replace(/&nbsp;/gi, ' ')
      .replace(/&lt;/gi, '<').replace(/&gt;/gi, '>').replace(/&quot;/gi, '"')
      .replace(/&#0?39;/g, "'").replace(/&#x27;/gi, "'").replace(/&amp;/gi, '&')
      .replace(/\s+/g, ' ').trim();
    return t.length;
  }
  function validateArticleDraft(d) {
    var errs = [];
    var title = String((d && d.title) || '').trim();
    var slug = String((d && d.slug) || '').trim().toLowerCase();
    var cat = String((d && d.category) || '').trim();
    var summary = String((d && d.summary) || '').trim();
    var body = String((d && d.body) || '').trim();
    var img = String((d && d.image_url) || '').trim();
    var src = String((d && d.source_url) || '').trim();
    var srcName = String((d && d.source_name) || '').trim();
    if (title.length < 1 || title.length > 150) errs.push('Tiêu đề phải từ 1 tới 150 ký tự.');
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || slug.length > 100) errs.push('Slug chỉ gồm chữ thường, số và dấu gạch ngang, tối đa 100 ký tự.');
    if (ARTICLE_CATS.indexOf(cat) === -1) errs.push('Chuyên mục phải là 1 trong 10 chuyên mục Tin tức đã chốt.');
    if (summary.length < 20 || summary.length > 500) errs.push('Mô tả ngắn phải từ 20 tới 500 ký tự.');
    var bodyLen = articleTextLength(body);
    if (bodyLen < 200 || bodyLen > 30000) errs.push('Nội dung bài (không tính mã HTML) phải từ 200 tới 30000 ký tự (đang ' + bodyLen + ').');
    if (!(/^https?:\/\//.test(img) || /^images\//.test(img) || /^\//.test(img))) errs.push('Ảnh đại diện phải là link http(s) hoặc đường dẫn images/...');
    if (src && !/^https?:\/\//.test(src)) errs.push('Link bài gốc phải bắt đầu bằng http:// hoặc https://.');
    if (srcName.length > 100) errs.push('Tên nguồn tối đa 100 ký tự.');
    return errs;
  }
  function articleFormValues() {
    // v122: đồng bộ editor rich text vào textarea ẩn trước khi đọc form.
    // v155: CHỈ đồng bộ khi editor đang sống. Khi editor đã lỗi, syncToTextarea
    // sẽ chép HTML (trống/cũ) của khung soạn đã chết đè lên ô dự phòng mà
    // user vừa nhập — mất dữ liệu (đúng triệu chứng ngày 11/11).
    if (!state.articleEditorFailed) {
      try { if (window.V2SArticleEditor && window.V2SArticleEditor.syncToTextarea) window.V2SArticleEditor.syncToTextarea(); } catch (e) {}
    }
    return {
      title: $('admArtTitle') ? String($('admArtTitle').value || '').trim() : '',
      slug: $('admArtSlug') ? String($('admArtSlug').value || '').trim().toLowerCase() : '',
      category: $('admArtCat') ? String($('admArtCat').value || '').trim() : '',
      summary: $('admArtSummary') ? String($('admArtSummary').value || '').trim() : '',
      image_url: $('admArtImg') ? String($('admArtImg').value || '').trim() : '',
      image_alt: $('admArtImgAlt') ? String($('admArtImgAlt').value || '').trim() : '',
      keyword: $('admArtKeyword') ? String($('admArtKeyword').value || '').trim() : '',
      source_url: $('admArtSourceUrl') ? String($('admArtSourceUrl').value || '').trim() : '',
      source_name: $('admArtSourceName') ? String($('admArtSourceName').value || '').trim() : '',
      publish_date: $('admArtDate') ? String($('admArtDate').value || '') : '',
      body: $('admArtBody') ? String($('admArtBody').value || '').trim() : ''
    };
  }
  function draftToJson(d) {
    // v122: keyword + image_alt chỉ có trong JSON tải về (publisher dùng
    // image_alt cho og:image:alt; RPC admin_submit_article không có 2
    // trường này nên chúng KHÔNG lưu vào article_drafts — xem ghi chú
    // ở ô Từ khóa chính trong quan-tri.html).
    // GĐ4b: kèm id + status + page để pipeline biết bản nào là bản đăng
    // lại (page đã có = bài đã đăng, sửa xong cần ghi đè — xem
    // tools/publish-article-drafts.mjs --rejections-out).
    return JSON.stringify({
      id: d.id || null, status: d.status || null, page: d.page || null,
      title: d.title, slug: d.slug, category: d.category, summary: d.summary,
      body: d.body, image_url: d.image_url, image_alt: d.image_alt || null,
      keyword: d.keyword || null, source_url: d.source_url || null,
      source_name: d.source_name || null, publish_date: d.publish_date || null,
      author_email: d.author_email || state.email || null
    }, null, 2);
  }
  function downloadDraftJson(d) {
    try {
      var blob = new Blob([draftToJson(d)], { type: 'application/json' });
      var a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'article-draft-' + (d.slug || 'bai-viet') + '.json';
      document.body.appendChild(a);
      a.click();
      setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
    } catch (e) { /* tải JSON không bắt buộc — bản thảo đã lưu trên server */ }
  }
  function todayISO() {
    try {
      var d = new Date();
      var m = String(d.getMonth() + 1).padStart(2, '0');
      var day = String(d.getDate()).padStart(2, '0');
      return d.getFullYear() + '-' + m + '-' + day;
    } catch (e) { return ''; }
  }
  function clearArticleForm() {
    var ids = ['admArtTitle', 'admArtSlug', 'admArtSummary', 'admArtImg', 'admArtImgAlt', 'admArtKeyword', 'admArtSourceUrl', 'admArtSourceName', 'admArtBody'];
    ids.forEach(function (id) { var el = $(id); if (el) el.value = ''; });
    var cat = $('admArtCat'); if (cat) cat.value = '';
    var dt = $('admArtDate'); if (dt) dt.value = todayISO();
    var slugEl = $('admArtSlug'); if (slugEl && slugEl.dataset) delete slugEl.dataset.touched;
    // GĐ4b: thoát chế độ sửa (mở lại slug, trả nút Đăng bài, ẩn thanh sửa).
    state.editingDraftId = null;
    state.editingDraftStatus = null;
    if (slugEl) slugEl.disabled = false;
    var sub = $('admArtSubmit'); if (sub) sub.textContent = 'Đăng bài';
    var bar = $('admArtEditBar'); if (bar) bar.hidden = true;
    try { if (window.V2SArticleEditor && window.V2SArticleEditor.setHtml) window.V2SArticleEditor.setHtml(''); } catch (e) {}
    updateArticleSeo();
  }
  // GĐ4b: hủy sửa — thoát chế độ sửa và dọn form (để không vô tình gửi
  // nội dung vừa nạp thành bản thảo mới).
  function cancelArticleEdit() {
    clearArticleForm();
    var m = $('admArtMsg');
    if (m) setMsg(m, 'Đã hủy sửa.');
  }
  /* ---------- v122: SEO live + nạp bản thảo vào form để sửa ---------- */
  function updateArticleSeo() {
    var panel = $('admArtSeo');
    if (!panel) return;
    try {
      if (!window.V2SArticleEditor || !window.V2SArticleEditor.seoChecklist) { panel.innerHTML = ''; return; }
      var v = articleFormValues();
      var items = window.V2SArticleEditor.seoChecklist(v, v.keyword);
      var html = '<b>Kiểm tra SEO (theo hệ thống 100 từ khóa):</b><ul style="margin:6px 0 0;padding-left:18px">';
      items.forEach(function (it) {
        var mark = it.ok ? '✅' : (it.warn ? '⚠️' : '⬜');
        html += '<li>' + mark + ' ' + it.label + '</li>';
      });
      html += '</ul><p style="margin:6px 0 0;font-size:12px;color:#666">Mục ⚠️ là cảnh báo (vẫn gửi được); mục chặn gửi là các lỗi ở validateArticleDraft (tiêu đề/slug/chuyên mục/mô tả/nội dung/ảnh). Từ khóa chính chỉ dùng để kiểm tra live + ghi vào JSON tải về, không lưu vào bảng bản thảo (RPC chưa có trường này).</p>';
      panel.innerHTML = html;
    } catch (e) { /* kiểm tra SEO không được chặn form */ }
  }
  // GĐ4b: nạp bản thảo vào form. forEdit = true (nút "Sửa"): vào chế độ
  // sửa — khóa slug (không đổi slug), đổi nút thành "Lưu bản sửa", lưu
  // xong gọi RPC admin_update_article_draft (KHÔNG tạo bản mới).
  // forEdit = false (nút "Nạp vào form", mặc định cũ): chỉ lấy nội dung
  // làm điểm bắt đầu cho bản thảo MỚI (giữ nguyên slug thì phải xóa bản
  // cũ trước vì slug trùng bị chặn).
  function loadDraftIntoForm(d, forEdit) {
    if (!d) return;
    var set = function (id, v) { var el = $(id); if (el) el.value = v == null ? '' : String(v); };
    set('admArtTitle', d.title);
    set('admArtSlug', d.slug);
    set('admArtCat', d.category);
    set('admArtSummary', d.summary);
    set('admArtImg', d.image_url);
    set('admArtSourceUrl', d.source_url);
    set('admArtSourceName', d.source_name);
    set('admArtDate', d.publish_date);
    var slugEl = $('admArtSlug'); if (slugEl && slugEl.dataset) slugEl.dataset.touched = '1';
    set('admArtBody', d.body || '');
    // v155: khi editor đã lỗi thì KHÔNG gọi setFromBody — bản thảo đã nạp
    // thẳng vào ô dự phòng ở trên; gọi thêm sẽ đồng bộ từ khung soạn đã chết
    // đè lên nội dung vừa nạp.
    if (!state.articleEditorFailed) {
      try {
        if (window.V2SArticleEditor && window.V2SArticleEditor.setFromBody) window.V2SArticleEditor.setFromBody(d.body || '');
      } catch (e) {}
    }
    updateArticleSeo();
    var msg = $('admArtMsg');
    if (forEdit) {
      state.editingDraftId = d.id;
      state.editingDraftStatus = d.status || null;
      if (slugEl) slugEl.disabled = true;
      var sub = $('admArtSubmit'); if (sub) sub.textContent = 'Lưu bản sửa';
      var bar = $('admArtEditBar'); var barTitle = $('admArtEditTitle');
      if (barTitle) barTitle.textContent = '"' + (d.title || d.slug || '') + '"' + (d.status === 'published' ? ' (đã đăng — lưu xong sẽ chờ đăng lại)' : '');
      if (bar) bar.hidden = false;
      if (msg) setMsg(msg, 'Đang sửa bản thảo "' + (d.title || d.slug || '') + '" — slug không đổi, lưu xong bài sẽ chờ đăng lại (nếu đã đăng).');
    } else {
      if (msg) setMsg(msg, 'Đã nạp bản thảo "' + (d.title || d.slug || '') + '" vào form — sửa xong bấm Đăng bài sẽ tạo bản thảo MỚI (xóa bản cũ trước nếu giữ nguyên slug, vì slug trùng bị chặn).');
    }
    var panel = $('admTab-write');
    if (panel) panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  function initArticleEditor() {
    // Nạp datalist 100 từ khóa SEO (js/seo-keywords.js) cho ô Từ khóa chính.
    try {
      var dl = $('admArtKeywordList');
      var kws = (typeof window !== 'undefined' && window.V2S_SEO_KEYWORDS) ? window.V2S_SEO_KEYWORDS : null;
      if (dl && kws && kws.length && !dl.children.length) {
        var seen = {};
        kws.forEach(function (r) {
          var kw = r && r.kw ? String(r.kw) : '';
          if (!kw || seen[kw]) return;
          seen[kw] = 1;
          var o = document.createElement('option');
          o.value = kw;
          o.textContent = kw + (r.group ? ' — ' + r.group : '');
          dl.appendChild(o);
        });
      }
    } catch (e) { /* datalist chỉ hỗ trợ gõ nhanh, thiếu cũng không chặn form */ }
    // v155: trình soạn thảo rich text (js/article-editor.js). KHÔNG nuốt lặng
    // lỗi: nếu init ném lỗi / trả false / script chưa nạp thì KHÔNG listener
    // nào được gắn (paste/input/keyup → syncToTextarea) nên ô "Xem mã HTML"
    // không bao giờ được điền — đúng triệu chứng ngày 11/11 (dán 28.067 ký
    // tự mà form trống, không báo gì). Khi đó phải: (1) log lỗi ra console,
    // (2) hiện lỗi rõ ràng trong form, (3) bật ô nhập body dự phòng.
    var editorOk = false, editorErr = null;
    try {
      if (window.V2SArticleEditor && typeof window.V2SArticleEditor.init === 'function') {
        editorOk = window.V2SArticleEditor.init({ onChange: function () { updateArticleSeo(); } }) !== false;
        if (!editorOk) editorErr = new Error('V2SArticleEditor.init trả về false (thiếu khung soạn thảo hoặc ô mã HTML).');
      } else {
        editorErr = new Error('Không nạp được js/article-editor.js (window.V2SArticleEditor chưa có).');
      }
    } catch (e) { editorOk = false; editorErr = e; }
    if (editorOk) {
      state.articleEditorFailed = false;
    } else {
      if (typeof console !== 'undefined' && console && typeof console.error === 'function') console.error('[Viết bài] Không khởi tạo được trình soạn thảo:', editorErr);
      enableArticleBodyFallback(editorErr);
    }
    try {
      if (window.V2SArticleMedia && window.V2SArticleMedia.init) window.V2SArticleMedia.init();
    } catch (e) { /* kho media lỗi thì form vẫn gửi được (nhập link ảnh tay) */ }
    ['admArtTitle', 'admArtSlug', 'admArtCat', 'admArtSummary', 'admArtImg', 'admArtImgAlt', 'admArtKeyword', 'admArtSourceUrl', 'admArtSourceName'].forEach(function (id) {
      var el = $(id);
      if (el) el.addEventListener('input', updateArticleSeo);
    });
    updateArticleSeo();
  }
  // v155: bật ô nhập body dự phòng khi trình soạn thảo init thất bại.
  // - Tắt khung soạn đã chết (contenteditable) + toolbar để user không gõ/dán
  //   vào chỗ không bao giờ được đọc.
  // - Mở khóa textarea #admArtBody (bỏ readonly) + mở <details> chứa nó + đổi
  //   nhãn, để user nhập/dán trực tiếp — articleFormValues() đọc chính ô này.
  // - Gắn lại kiểm tra SEO live trên ô dự phòng (bình thường onChange của
  //   editor làm việc này).
  // Khi init thành công thì hàm này KHÔNG chạy — giao diện/luồng chính giữ nguyên.
  function enableArticleBodyFallback(err) {
    state.articleEditorFailed = true;
    var reason = (err && (err.message || err)) || 'không rõ nguyên nhân';
    var msg = $('admArtMsg');
    if (msg) setMsg(msg, 'Trình soạn thảo gặp lỗi, đã chuyển sang ô nhập văn bản dự phòng bên dưới — hãy nhập/dán nội dung vào ô đó (khung soạn phía trên đã tắt). Lỗi: ' + reason, true);
    var ed = $('admArtBodyEditor');
    if (ed) {
      try { ed.contentEditable = 'false'; } catch (e) { /* không bắt buộc */ }
      ed.style.display = 'none';
    }
    var tb = $('admArtToolbar');
    if (tb) tb.style.display = 'none';
    var ta = $('admArtBody');
    if (ta) {
      ta.readOnly = false;
      try { ta.removeAttribute('readonly'); } catch (e) { /* không bắt buộc */ }
      ta.placeholder = 'Nhập nội dung bài viết vào đây (trình soạn thảo lỗi, đang dùng ô dự phòng). Tối thiểu 200 ký tự.';
      try { ta.style.minHeight = '320px'; ta.style.display = 'block'; ta.style.width = '100%'; } catch (e) { /* không bắt buộc */ }
      var det = (ta.closest && typeof ta.closest === 'function') ? ta.closest('details') : null;
      if (det) {
        det.open = true;
        var sum = (det.querySelector && typeof det.querySelector === 'function') ? det.querySelector('summary') : null;
        if (sum) sum.textContent = 'Nội dung bài viết (ô nhập dự phòng — trình soạn thảo đang lỗi)';
      }
      try { ta.addEventListener('input', function () { updateArticleSeo(); }); } catch (e) { /* không bắt buộc */ }
    }
  }
  async function onSubmitArticle() {
    var msg = $('admArtMsg');
    var btn = $('admArtSubmit');
    if (state.legacyGate) { setMsg(msg, 'Chưa chạy migration GĐ1/GĐ4 — tab Viết bài chưa mở được.', true); return; }
    var v = articleFormValues();
    var errs = validateArticleDraft(v);
    if (errs.length) { setMsg(msg, errs[0], true); return; }
    // Sửa lỗi nút Đăng bài 23:57 ngày 09/11 (nguyên nhân chính): KHÔNG
    // dùng hộp thoại xác nhận native ở đây nữa. Hộp thoại native bị
    // trình duyệt tự động/tự động hóa chặn hoặc tự tắt thì trả false
    // (hoặc ném lỗi nếu hàm confirm không tồn tại) — hàm thoát im lặng
    // TRƯỚC khi gọi RPC: không thông báo, không gọi RPC, form còn
    // nguyên, đúng triệu chứng Zalo báo (bấm nhiều lần + Enter vẫn
    // "không phản hồi"). Bản thảo chỉ lưu status 'ready' (chưa đăng lên
    // web — còn bước publisher + deploy), xóa được trong danh sách nên
    // không cần xác nhận thêm.
    if (btn) btn.disabled = true;
    try {
      // GĐ4b: đang sửa bản thảo của mình → gọi RPC update (không tạo mới).
      if (state.editingDraftId) {
        await onUpdateArticle(v, msg, btn);
        return;
      }
      var out = await rpc('admin_submit_article', {
        p_title: v.title, p_slug: v.slug, p_category: v.category,
        p_summary: v.summary, p_body: v.body, p_image_url: v.image_url,
        p_source_url: v.source_url || null, p_source_name: v.source_name || null,
        p_publish_date: v.publish_date || null
      });
      setMsg(msg, 'Đã đăng bài (lưu bản thảo). Slug: ' + (out && out.slug ? out.slug : v.slug) + ' — đã tải JSON bản thảo để đưa cho publisher.');
      if (out) downloadDraftJson(out);
      clearArticleForm();
      await loadArticleDrafts();
    } catch (err) { setMsg(msg, friendlyErr(err), true); }
    if (btn) btn.disabled = false;
  }
  // GĐ4b: lưu bản sửa qua RPC admin_update_article_draft (server chặn
  // sửa bài của người khác + chặn đổi slug). Sửa bản đã đăng → status
  // quay về 'ready', pipeline sẽ đăng lại bản sửa (ghi đè HTML + data.js).
  async function onUpdateArticle(v, msg, btn) {
    var wasPublished = state.editingDraftStatus === 'published';
    var id = state.editingDraftId;
    if (btn) btn.disabled = true;
    try {
      var out = await rpc('admin_update_article_draft', {
        p_id: id, p_title: v.title, p_slug: v.slug, p_category: v.category,
        p_summary: v.summary, p_body: v.body, p_image_url: v.image_url,
        p_source_url: v.source_url || null, p_source_name: v.source_name || null,
        p_publish_date: v.publish_date || null
      });
      setMsg(msg, wasPublished
        ? 'Đã lưu bản sửa — bài sẽ được đăng lại trong lượt pipeline tiếp theo (trạng thái Chờ đăng).'
        : 'Đã lưu bản sửa (Chờ đăng).');
      clearArticleForm();
      await loadArticleDrafts();
    } catch (err) { setMsg(msg, friendlyErr(err), true); }
    if (btn) btn.disabled = false;
  }
  async function loadArticleDrafts() {
    var wrap = $('admArtList');
    if (!wrap) return;
    wrap.innerHTML = '<p>Đang tải…</p>';
    try {
      var rows = await rpc('get_admin_article_drafts', { p_status: null, p_limit: PAGE_SIZE + 1, p_offset: state.writePage * PAGE_SIZE });
      var hasMore = Array.isArray(rows) && rows.length > PAGE_SIZE;
      var list = hasMore ? rows.slice(0, PAGE_SIZE) : rows;
      // GĐ4b: admin thường (vd Zalo) chỉ thấy bản thảo của chính mình;
      // owner (ver2solution@gmail.com) thấy tất cả để giám sát.
      var isOwner = state.email === TASK_OWNER_EMAIL;
      if (Array.isArray(list) && !isOwner) list = list.filter(function (d) { return d.author_email === state.email; });
      state.articleDrafts = list;
      if (!Array.isArray(list) || !list.length) {
        wrap.innerHTML = '<p>Chưa có bản thảo nào — viết bài đầu tiên ở form trên.</p>' + pagerHtml('write', state.writePage, false);
        return;
      }
      var html = '<table class="qt-table" style="width:100%;border-collapse:collapse"><thead><tr>'
        + '<th style="text-align:left;padding:8px;border-bottom:2px solid #ddd">Tiêu đề</th>'
        + '<th style="text-align:left;padding:8px;border-bottom:2px solid #ddd">Chuyên mục</th>'
        + '<th style="text-align:left;padding:8px;border-bottom:2px solid #ddd">Trạng thái</th>'
        + '<th style="text-align:left;padding:8px;border-bottom:2px solid #ddd">Người gửi</th>'
        + '<th style="text-align:left;padding:8px;border-bottom:2px solid #ddd">Ngày gửi</th>'
        + '<th style="text-align:left;padding:8px;border-bottom:2px solid #ddd">Thao tác</th></tr></thead><tbody>';
      list.forEach(function (d) {
        // GĐ4b: bài "Bị từ chối" hiện rõ lý do để tác giả tự sửa.
        var statusCell = esc(ARTICLE_STATUS_LABEL[d.status] || d.status);
        if (d.status === 'rejected' && d.rejection_reason) {
          statusCell += '<br><small style="color:#b3261e">Lý do từ chối: ' + esc(d.rejection_reason) + '</small>';
        }
        // GĐ4b: nút Sửa chỉ hiện cho bản thảo của mình (hoặc owner);
        // sửa được cả bài đã đăng — lưu xong bài chờ đăng lại.
        var canEdit = draftCanEdit(d);
        html += '<tr data-did="' + esc(d.id) + '"><td style="padding:8px;border-bottom:1px solid #eee">' + esc(d.title)
          + '<br><small>bai-viet/' + esc(d.slug) + '.html' + (d.page ? ' → ' + esc(d.page) : '') + '</small></td>'
          + '<td style="padding:8px;border-bottom:1px solid #eee">' + esc(d.category) + '</td>'
          + '<td style="padding:8px;border-bottom:1px solid #eee">' + statusCell + '</td>'
          + '<td style="padding:8px;border-bottom:1px solid #eee">' + esc(d.author_email || '') + '</td>'
          + '<td style="padding:8px;border-bottom:1px solid #eee">' + esc(vnDate(d.created_at)) + '</td>'
          + '<td style="padding:8px;border-bottom:1px solid #eee;white-space:nowrap">'
          + '<button class="btn btn-ghost btn-sm" data-adm-act="download-draft" data-id="' + esc(d.id) + '" type="button">Tải JSON</button> '
          + '<button class="btn btn-ghost btn-sm" data-adm-act="load-draft" data-id="' + esc(d.id) + '" type="button">Nạp vào form</button> '
          + (canEdit ? '<button class="btn btn-ghost btn-sm" data-adm-act="edit-draft" data-id="' + esc(d.id) + '" type="button">Sửa</button> ' : '')
          + ((d.status === 'ready' || d.status === 'rejected')
            ? '<button class="btn btn-ghost btn-sm" data-adm-act="delete-draft" data-id="' + esc(d.id) + '" type="button">Xóa</button>'
            : '')
          + (d.status === 'ready'
            ? ' <button class="btn btn-ghost btn-sm" data-adm-act="mark-published" data-id="' + esc(d.id) + '" type="button">Đánh dấu đã đăng</button>'
            : '')
          + '</td></tr>';
      });
      html += '</tbody></table><p style="font-size:13px;color:#666">Bài "Chờ đăng" sẽ được publisher sinh file + đưa vào deploy sau. Bài "Bị từ chối" hiện lý do — bấm Sửa để sửa rồi gửi lại (không cần Ryan). Bài đã đăng cũng sửa được — lưu xong sẽ chờ đăng lại. Nút "Tải JSON" tải bản thảo về máy để đưa cho publisher. Nút "Đánh dấu đã đăng" dùng khi bài đã live trên web mà bản thảo vẫn ở "Chờ đăng".</p>' + pagerHtml('write', state.writePage, hasMore);
      wrap.innerHTML = html;
    } catch (e) {
      wrap.innerHTML = '<p>' + esc(isMissingFn(e) ? 'Chưa có dữ liệu — migration ADMIN GĐ4 chưa chạy (hàm get_admin_article_drafts chưa có).' : friendlyErr(e)) + '</p>';
    }
  }

  /* ---------- điều phối nút bấm (ủy quyền 1 listener) ---------- */
  var MOD_RPC = { profile: ['approve_profile', 'reject_profile'], shop_profile: ['approve_shop_profile', 'reject_shop_profile'], job_post: ['approve_job_post', 'reject_job_post'],
    // v124: tin lô / xưởng / kiot do thành viên đăng — RPC nhận p_listing_id.
    user_lot: ['approve_user_lot', 'reject_user_lot'], user_factory: ['approve_user_factory', 'reject_user_factory'], user_kiot: ['approve_user_kiot', 'reject_user_kiot'] };
  async function onActionClick(e) {
    var btn = e.target && e.target.closest ? e.target.closest('[data-adm-act]') : null;
    if (!btn) return;
    var act = btn.getAttribute('data-adm-act');
    var id = btn.getAttribute('data-id');
    var msg = $('admActionMsg');
    btn.disabled = true;
    try {
      if (act === 'approve-comment') {
        if (!window.confirm('Duyệt bình luận này? Sẽ cộng +1 xu cho người bình luận (nếu đủ điều kiện ngày).')) return;
        var c = await rpc('admin_approve_comment', { p_comment_id: id });
        setMsg(msg, 'Đã duyệt bình luận. Trạng thái điểm: ' + (c.points_status || '') + ' (+' + fmt(c.points_value) + ' xu).');
        await loadComments();
      } else if (act === 'reject-comment') {
        var reason = window.prompt('Lý do từ chối bình luận (bắt buộc):', '');
        if (reason === null || !String(reason).trim()) { setMsg(msg, 'Từ chối cần có lý do.', true); return; }
        await rpc('admin_reject_comment', { p_comment_id: id, p_reason: String(reason).trim() });
        setMsg(msg, 'Đã từ chối bình luận (không cộng xu).');
        await loadComments();
      } else if (act === 'delete-comment') {
        var dr = window.prompt('Lý do xóa (spam / violation / user_request / other):', 'spam');
        if (dr === null) return;
        dr = String(dr).trim();
        if (['spam', 'violation', 'user_request', 'other'].indexOf(dr) === -1) { setMsg(msg, 'Lý do xóa không hợp lệ.', true); return; }
        if (!window.confirm('Xóa bình luận này? (xóa mềm, giữ lại để đối chiếu)')) return;
        await rpc('admin_delete_comment', { p_comment_id: id, p_reason: dr });
        setMsg(msg, 'Đã xóa bình luận (xóa mềm).');
        await loadComments(); await loadTestData();
      } else if (act === 'delete-chat') {
        if (!window.confirm('Xóa tin nhắn này? (xóa mềm, còn lưu trong nhật ký)')) return;
        await rpc('admin_delete_admin_comment', { p_id: id, p_reason: null });
        setMsg(msg, 'Đã xóa tin nhắn.');
        await loadChat();
      } else if (act === 'cycle-task') {
        // Đổi trạng thái workflow: admin nào cũng được (người sửa lỗi cần
        // đánh dấu tiến độ trên task do bên khác nêu). Server chặn khôi
        // phục từ 'khong_phai_van_de' nếu không phải tác giả/owner.
        var cur = btn.getAttribute('data-status') || 'chua_xu_ly';
        var next = (TASK_STATUS[cur] || TASK_STATUS.chua_xu_ly).next;
        await rpc('admin_set_task_status', { p_id: id, p_status: next });
        setMsg(msg, 'Đã đổi trạng thái: ' + TASK_STATUS[next].label + '.');
        await loadTasks();
      } else if (act === 'edit-task') {
        var itemEl = btn.closest ? btn.closest('.adm-task-item') : null;
        var editEl = itemEl ? itemEl.querySelector('.adm-task-edit') : null;
        if (editEl) editEl.hidden = false;
      } else if (act === 'cancel-task') {
        var itemEl2 = btn.closest ? btn.closest('.adm-task-item') : null;
        var editEl2 = itemEl2 ? itemEl2.querySelector('.adm-task-edit') : null;
        if (editEl2) editEl2.hidden = true;
      } else if (act === 'save-task') {
        var itemEl3 = btn.closest ? btn.closest('.adm-task-item') : null;
        if (!itemEl3) { setMsg(msg, 'Không tìm thấy form sửa.', true); return; }
        var fTitle = itemEl3.querySelector('[data-edit-field="title"]');
        var fLoc = itemEl3.querySelector('[data-edit-field="location"]');
        var fBody = itemEl3.querySelector('[data-edit-field="body"]');
        var nt = fTitle ? String(fTitle.value || '').trim() : '';
        var nl = fLoc ? String(fLoc.value || '').trim() : '';
        var nb = fBody ? String(fBody.value || '').trim() : '';
        if (!nt) { setMsg(msg, 'Vấn đề không được để trống.', true); return; }
        await rpc('admin_update_task', { p_id: id, p_title: nt, p_location: nl || null, p_body: nb || null });
        setMsg(msg, 'Đã lưu sửa đổi.');
        await loadTasks();
      } else if (act === 'notissue-task') {
        // Chỉ tác giả/owner (server chặn bên khác); có thể khôi phục lại
        // bằng cách bấm vào trạng thái "Không phải vấn đề".
        await rpc('admin_set_task_status', { p_id: id, p_status: 'khong_phai_van_de' });
        setMsg(msg, 'Đã đánh dấu "Không phải vấn đề" (vẫn giữ dấu vết, xem lại bằng bộ lọc).');
        await loadTasks();
      } else if (act === 'delete-task') {
        // Xác nhận 2 bước ngay trên nút (không dùng window.confirm — hộp
        // thoại native bị tự tắt trên trình duyệt tự động). Chỉ tác giả/
        // owner (server chặn bên khác).
        if (btn.getAttribute('data-armed') !== '1') {
          btn.setAttribute('data-armed', '1');
          btn.textContent = 'Chắc chắn xóa?';
          return;
        }
        await rpc('admin_delete_task', { p_id: id });
        setMsg(msg, 'Đã xóa công việc.');
        await loadTasks();
      } else if (act === 'approve-mod' || act === 'reject-mod') {
        var kind = btn.getAttribute('data-kind');
        var pair = MOD_RPC[kind];
        if (!pair) { setMsg(msg, 'Loại mục không hỗ trợ.', true); return; }
        if (act === 'approve-mod') {
          if (!window.confirm('Duyệt mục này?')) return;
          // v124: tin lô/xưởng/kiot nhận p_listing_id; 3 loại cũ giữ nguyên
          // tên tham số (p_profile_id / p_shop_id / p_post_id).
          var args = kind === 'profile' ? { p_profile_id: id } : kind === 'shop_profile' ? { p_shop_id: id } : kind === 'job_post' ? { p_post_id: id } : { p_listing_id: id };
          await rpc(pair[0], args);
          setMsg(msg, 'Đã duyệt.');
        } else {
          var rr = window.prompt('Lý do từ chối (bắt buộc):', '');
          if (rr === null || !String(rr).trim()) { setMsg(msg, 'Từ chối cần có lý do.', true); return; }
          await rpc(pair[1], kind === 'profile' ? { p_profile_id: id, p_reason: String(rr).trim() }
            : kind === 'shop_profile' ? { p_shop_id: id, p_reason: String(rr).trim() }
            : kind === 'job_post' ? { p_post_id: id, p_reason: String(rr).trim() }
            : { p_listing_id: id, p_reason: String(rr).trim() });
          setMsg(msg, 'Đã từ chối.');
        }
        await loadModeration(); await loadTestData();
      } else if (act === 'pin-profile') {
        if (!window.confirm('Ghim hồ sơ này lên top?')) return;
        await rpc('admin_set_pinned', { p_profile_id: id, p_pinned: true });
        setMsg(msg, 'Đã ghim hồ sơ.');
        await loadModeration();
      } else if (act === 'suspend-user') {
        var sr = window.prompt('Lý do khóa tài khoản (bắt buộc):', '');
        if (sr === null || !String(sr).trim()) { setMsg(msg, 'Khóa tài khoản cần có lý do.', true); return; }
        await rpc('suspend_user', { p_user_id: id, p_reason: String(sr).trim() });
        setMsg(msg, 'Đã khóa tài khoản (tầng ứng dụng — không tạo/sửa được hồ sơ, tin, bình luận).');
        await loadUsers(); await loadTestData();
      } else if (act === 'unsuspend-user') {
        await rpc('unsuspend_user', { p_user_id: id });
        setMsg(msg, 'Đã mở khóa tài khoản.');
        await loadUsers();
      } else if (act === 'reset-pw') {
        var email = btn.getAttribute('data-email') || '';
        if (!email) { setMsg(msg, 'Không có email để gửi.', true); return; }
        if (!window.confirm('Gửi email đặt lại mật khẩu tới ' + email + '?')) return;
        var a = api();
        if (!a || typeof a.resetPassword !== 'function') { setMsg(msg, 'Không gửi được email (chưa có hàm reset).', true); return; }
        await a.resetPassword(email);
        setMsg(msg, 'Đã gửi email đặt lại mật khẩu tới ' + email + '.');
      } else if (act === 'view-user') {
        await viewUser(id, btn.getAttribute('data-email') || '');
      } else if (act === 'delete-draft') {
        if (!window.confirm('Xóa bản thảo này? (chỉ xóa được bản chưa đăng)')) return;
        await rpc('admin_delete_article_draft', { p_id: id, p_reason: null });
        setMsg(msg, 'Đã xóa bản thảo.');
        await loadArticleDrafts();
      } else if (act === 'mark-published') {
        // Nút "Đánh dấu đã đăng" (11/11): dùng khi bài đã live trên web mà
        // bản thảo vẫn ở "Chờ đăng" (vd deploy tay / RPC chưa gọi được).
        // RPC chỉ nhận bản status 'ready', tự ghi published_at + audit log.
        var mp = (state.articleDrafts || []).filter(function (x) { return String(x.id) === String(id); })[0];
        if (!mp) { setMsg(msg, 'Không tìm thấy bản thảo để đánh dấu.', true); }
        else {
          var mpPage = (mp.page && String(mp.page).trim()) ? String(mp.page).trim() : ('bai-viet/' + (mp.slug || '') + '.html');
          if (!window.confirm('Đánh dấu bản thảo này là ĐÃ ĐĂNG? (chỉ dùng khi bài đã live trên web)')) return;
          await rpc('admin_mark_article_published', { p_id: id, p_page: mpPage });
          setMsg(msg, 'Đã đánh dấu đã đăng.');
          await loadArticleDrafts();
        }
      } else if (act === 'load-draft') {
        var ld = (state.articleDrafts || []).filter(function (x) { return String(x.id) === String(id); })[0];
        if (ld) { loadDraftIntoForm(ld); setMsg(msg, 'Đã nạp bản thảo vào form để sửa.'); }
        else setMsg(msg, 'Không tìm thấy bản thảo để nạp.', true);
      } else if (act === 'edit-draft') {
        // GĐ4b: sửa bản thảo của mình (kể cả bài đã đăng) — server chặn
        // sửa bài của người khác bằng RPC admin_update_article_draft.
        var ed = (state.articleDrafts || []).filter(function (x) { return String(x.id) === String(id); })[0];
        if (!ed) { setMsg(msg, 'Không tìm thấy bản thảo để sửa.', true); }
        else if (!draftCanEdit(ed)) { setMsg(msg, 'Không có quyền sửa bài của người khác.', true); }
        else { loadDraftIntoForm(ed, true); setMsg(msg, 'Đã nạp bản thảo vào form để sửa.'); }
      } else if (act === 'download-draft') {
        var dd = (state.articleDrafts || []).filter(function (x) { return String(x.id) === String(id); })[0];
        if (dd) { downloadDraftJson(dd); setMsg(msg, 'Đã tải JSON bản thảo ' + (dd.slug || '') + '.'); }
        else setMsg(msg, 'Không tìm thấy bản thảo để tải.', true);
      }
    } catch (err) {
      setMsg(msg, friendlyErr(err), true);
    } finally {
      btn.disabled = false;
    }
  }

  /* ---------- chuyển tab ---------- */
  var TABS = {
    overview: { label: 'Tổng quan', load: loadOverview },
    comments: { label: 'Duyệt bình luận', load: loadComments },
    moderation: { label: 'Duyệt hồ sơ / tin', load: loadModeration },
    faq: { label: 'Hỏi đáp', load: loadFaq },
    users: { label: 'Người dùng & xu', load: loadUsers },
    testdata: { label: 'Dữ liệu test', load: loadTestData },
    audit: { label: 'Nhật ký', load: loadAudit },
    chat: { label: 'Trao đổi', load: loadChat },
    write: { label: 'Viết bài', load: loadArticleDrafts }
  };
  var PAGE_LOADERS = { comments: loadComments, moderation: loadModeration, faq: loadFaq, users: loadUsers, audit: loadAudit, testdata: loadTestData, write: loadArticleDrafts };
  function switchTab(key) {
    state.activeTab = key;
    Object.keys(TABS).forEach(function (k) {
      var panel = $('admTab-' + k);
      var btn = document.querySelector('[data-adm-tab="' + k + '"]');
      if (panel) panel.hidden = (k !== key);
      if (btn) btn.classList.toggle('sel', k === key);
    });
    // Tab Trao đổi: tải lại mỗi lần mở (để thấy tin mới) + tự làm mới
    // mỗi 60 giây khi đang mở; mở tab thì đánh dấu đã xem (xóa badge).
    // Kênh Realtime + badge chạy suốt phiên admin (mở 1 lần ở main),
    // rời tab Trao đổi KHÔNG hủy kênh để badge vẫn nhận INSERT.
    if (key === 'chat') {
      state.loaded.chat = true;
      loadChat().then(function () { markChatSeen(); }).catch(function (e) { /* tab tự hiện lỗi */ });
      loadTasks().catch(function (e) { /* tab tự hiện lỗi */ });
      startChatTimer();
      return;
    }
    stopChatTimer();
    if (!state.loaded[key]) {
      state.loaded[key] = true;
      var loader = TABS[key] && TABS[key].load;
      if (loader) loader().catch(function (e) { /* từng tab tự hiện lỗi */ });
    }
  }

  /* ---------- khởi động ---------- */
  async function main() {
    var session = null;
    try { session = await getSession(); } catch (e) { session = null; }
    var user = session && session.user ? session.user : null;
    if (!user) { show('qtLogin'); return; }
    state.email = user.email || '';
    state.userId = user.id || '';
    var emEl = $('qtEmail');
    if (emEl) emEl.textContent = state.email;
    var c = client();
    if (!c || typeof c.rpc !== 'function') {
      var m = $('qtErrorMsg');
      if (m) m.textContent = 'Chưa kết nối được Supabase, hãy tải lại trang.';
      show('qtError'); return;
    }
    // Cổng 1 (GĐ1): is_admin() — kiểm tra ở server.
    var adminOk = false, adminFnMissing = false;
    try {
      var r = await c.rpc('is_admin');
      if (r.error) throw r.error;
      adminOk = r.data === true;
    } catch (e) {
      adminFnMissing = isMissingFn(e);
      adminOk = false;
    }
    if (adminFnMissing) {
      // GĐ1 chưa chạy: lùi về cổng cũ (get_online_breakdown kiểm tra
      // email chủ ở server). Chỉ mở Tổng quan; các tab khác khóa.
      try {
        await rpc('get_online_breakdown');
        state.legacyGate = true;
        var ban = $('admLegacyBanner');
        if (ban) ban.hidden = false;
        show('qtMain');
        wireTabs(true);
        await loadOverview();
        state.loaded.overview = true;
        return;
      } catch (e2) {
        var d = $('qtDeniedEmail');
        if (d) d.textContent = state.email;
        show('qtDenied'); return;
      }
    }
    if (!adminOk) {
      var d2 = $('qtDeniedEmail');
      if (d2) d2.textContent = state.email;
      show('qtDenied'); return;
    }
    state.isAdmin = true;
    show('qtMain');
    wireTabs(false);
    await loadOverview();
    state.loaded.overview = true;
    // Kênh Realtime + badge tin chưa đọc: mở 1 lần khi đã xác nhận admin
    // (giữ kênh suốt phiên để badge nhận INSERT cả khi đang ở tab khác;
    // rời tab Trao đổi không hủy kênh nữa — xem § Trao đổi).
    startChatLive();
    startBadgeTimer();
    refreshChatBadge().catch(function () { /* lần sau thử lại */ });
  }
  function wireTabs(locked) {
    var bar = $('admTabs');
    if (!bar) return;
    bar.innerHTML = Object.keys(TABS).map(function (k) {
      var dis = (locked && k !== 'overview') ? ' disabled' : '';
      var title = (locked && k !== 'overview') ? ' title="Chưa chạy migration GĐ1/GĐ2 nên tab này chưa mở được"' : '';
      return '<button type="button" class="adm-tab-btn' + (k === 'overview' ? ' sel' : '') + '" data-adm-tab="' + k + '"' + dis + title + '>' + TABS[k].label
        + (k === 'chat' ? '<span class="adm-tab-badge" id="admChatBadge" hidden></span>' : '') + '</button>';
    }).join('');
    bar.addEventListener('click', function (e) {
      var b = e.target && e.target.closest ? e.target.closest('[data-adm-tab]') : null;
      if (!b || b.disabled) return;
      switchTab(b.getAttribute('data-adm-tab'));
    });
    document.addEventListener('click', onActionClick);
    document.addEventListener('click', onPagerClick);
    var fq = $('admFaqFilter');
    if (fq) fq.addEventListener('change', function () { state.faqPage = 0; loadFaq(); });
    var au = $('admAuditDays');
    if (au) au.addEventListener('change', function () { state.auditPage = 0; loadAudit(); });
    var us = $('admUserSearch');
    var usb = $('admUserSearchBtn');
    var usc = $('admUserSearchClear');
    function runUserSearch() {
      state.usersQuery = us ? String(us.value || '').trim() : '';
      state.usersPage = 0;
      loadUsers();
    }
    if (usb) usb.addEventListener('click', runUserSearch);
    if (us) us.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); runUserSearch(); } });
    if (usc) usc.addEventListener('click', function () {
      if (us) us.value = '';
      state.usersQuery = ''; state.usersPage = 0;
      loadUsers();
    });
    var cs = $('admChatSend');
    if (cs) cs.addEventListener('click', onSendChat);
    var cr = $('admChatRefresh');
    if (cr) cr.addEventListener('click', function () { loadChat(); loadTasks(); });
    var ci = $('admChatInput');
    if (ci) ci.addEventListener('keydown', function (e) { if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') onSendChat(); });
    // Danh sách tổng hợp công việc (v118): bộ lọc + thêm tay.
    var tsf = $('admTaskStatusFilter');
    if (tsf) tsf.addEventListener('change', function () { loadTasks(); });
    var taf = $('admTaskAuthorFilter');
    if (taf) taf.addEventListener('change', function () { loadTasks(); });
    var trf = $('admTaskRefresh');
    if (trf) trf.addEventListener('click', function () { loadChat(); loadTasks(); });
    var tad = $('admTaskAdd');
    if (tad) tad.addEventListener('click', onAddTask);
    // Tab Viết bài (GĐ4): gửi bài + xóa form + tự sinh slug từ tiêu đề.
    var asub = $('admArtSubmit');
    if (asub) asub.addEventListener('click', onSubmitArticle);
    var aclr = $('admArtClear');
    if (aclr) aclr.addEventListener('click', function () { clearArticleForm(); var m = $('admArtMsg'); if (m) setMsg(m, ''); });
    // GĐ4b: nút "Hủy sửa" trên thanh chế độ sửa (thoát sửa + dọn form).
    var aecancel = $('admArtEditCancel');
    if (aecancel) aecancel.addEventListener('click', cancelArticleEdit);
    var atitle = $('admArtTitle');
    var aslug = $('admArtSlug');
    if (atitle && aslug) atitle.addEventListener('input', function () {
      if (!aslug.dataset.touched) aslug.value = slugify(atitle.value);
    });
    if (aslug) aslug.addEventListener('input', function () { aslug.dataset.touched = '1'; });
    var adate = $('admArtDate');
    if (adate && !adate.value) adate.value = todayISO();
    // v122: trình soạn thảo rich text + kho media riêng cho tab Viết bài.
    initArticleEditor();
    var so = $('qtSignOut');
    if (so) so.addEventListener('click', async function () {
      stopChatTimer(); stopBadgeTimer(); stopChatLive();
      try { if (api()) await api().signOut(); } catch (e) { /* bỏ qua */ }
      location.href = 'index.html';
    });
    document.addEventListener('change', function (e) {
      var sel = e.target && e.target.matches ? (e.target.matches('[data-adm-faq]') ? e.target : null) : null;
      if (!sel) return;
      var qid = sel.getAttribute('data-adm-faq');
      var msg = $('admActionMsg');
      rpc('admin_set_faq_status', { p_id: qid, p_status: sel.value, p_note: null })
        .then(function () { setMsg(msg, 'Đã đổi trạng thái câu hỏi.'); })
        .catch(function (err) { setMsg(msg, friendlyErr(err), true); loadFaq(); });
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', main);
  else main();

  if (typeof window !== 'undefined') {
    window.Ver2Admin = { init: main, switchTab: switchTab, state: state, validateArticleDraft: validateArticleDraft, articleTextLength: articleTextLength, slugify: slugify, ARTICLE_CATS: ARTICLE_CATS, ARTICLE_STATUS_LABEL: ARTICLE_STATUS_LABEL, draftCanEdit: draftCanEdit, loadDraftIntoForm: loadDraftIntoForm, updateArticleSeo: updateArticleSeo, initArticleEditor: initArticleEditor, enableArticleBodyFallback: enableArticleBodyFallback, articleFormValues: articleFormValues };
  }
})();
