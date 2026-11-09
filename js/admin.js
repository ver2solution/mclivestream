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
  var PAGE_FIELDS = { comments: 'commentsPage', moderation: 'modPage', faq: 'faqPage', users: 'usersPage', audit: 'auditPage', testdata: 'testPage' };
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
    usersPage: 0, commentsPage: 0, modPage: 0, faqPage: 0, auditPage: 0, testPage: 0,
    usersQuery: '', // từ khóa tìm email (tab Người dùng & xu); rỗng = không lọc
    testData: null // kết quả get_admin_test_data gần nhất (để phân trang client-side)
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
  var MOD_KIND_LABEL = { profile: 'Hồ sơ mẫu', shop_profile: 'Hồ sơ shop', job_post: 'Tin tuyển' };
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
    return '<tr data-uid="' + esc(u.user_id) + '"><td style="padding:8px;border-bottom:1px solid #eee">' + esc(u.email || '')
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
        + '<p style="font-size:13px;color:#666">Điều chỉnh âm chỉ trừ tới số dư 0 — phần thiếu ghi thành nợ xu (trừ dần khi user có hoạt động tạo xu sau này). Admin không được tự điều chỉnh xu của chính mình.</p>';
      var ab = $('admAdjustBtn');
      if (ab) ab.addEventListener('click', onAdjustPoints);
      var gb = $('admGrantAdminBtn');
      if (gb) gb.addEventListener('click', onGrantAdmin);
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
            if (state.activeTab === 'chat') appendChatMessage(payload.new);
            else if (payload.new.author_id !== state.userId
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
    state.chatTimer = setInterval(function () { loadChat().catch(function () { /* lần sau thử lại */ }); }, 60000);
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

  /* ---------- điều phối nút bấm (ủy quyền 1 listener) ---------- */
  var MOD_RPC = { profile: ['approve_profile', 'reject_profile'], shop_profile: ['approve_shop_profile', 'reject_shop_profile'], job_post: ['approve_job_post', 'reject_job_post'] };
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
      } else if (act === 'approve-mod' || act === 'reject-mod') {
        var kind = btn.getAttribute('data-kind');
        var pair = MOD_RPC[kind];
        if (!pair) { setMsg(msg, 'Loại mục không hỗ trợ.', true); return; }
        if (act === 'approve-mod') {
          if (!window.confirm('Duyệt mục này?')) return;
          var args = kind === 'profile' ? { p_profile_id: id } : kind === 'shop_profile' ? { p_shop_id: id } : { p_post_id: id };
          await rpc(pair[0], args);
          setMsg(msg, 'Đã duyệt.');
        } else {
          var rr = window.prompt('Lý do từ chối (bắt buộc):', '');
          if (rr === null || !String(rr).trim()) { setMsg(msg, 'Từ chối cần có lý do.', true); return; }
          await rpc(pair[1], kind === 'profile' ? { p_profile_id: id, p_reason: String(rr).trim() }
            : kind === 'shop_profile' ? { p_shop_id: id, p_reason: String(rr).trim() }
            : { p_post_id: id, p_reason: String(rr).trim() });
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
    chat: { label: 'Trao đổi', load: loadChat }
  };
  var PAGE_LOADERS = { comments: loadComments, moderation: loadModeration, faq: loadFaq, users: loadUsers, audit: loadAudit, testdata: loadTestData };
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
    if (cr) cr.addEventListener('click', function () { loadChat(); });
    var ci = $('admChatInput');
    if (ci) ci.addEventListener('keydown', function (e) { if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') onSendChat(); });
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
    window.Ver2Admin = { init: main, switchTab: switchTab, state: state };
  }
})();
