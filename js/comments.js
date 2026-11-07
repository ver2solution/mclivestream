/* v2 — Mục bình luận GĐ2 (mới, 07/11/2026).
   Dùng chung cho trang chi tiết hồ sơ mẫu (ho-so.html), chi tiết shop
   (chi-tiet-shop.html) và trang bài báo (bai-viet/*.html, tin-tuc.html).
   Bảng `comments` (M6): target_type IN ('model_profile','shop_profile',
   'article'), target_ref = id data.js (th-…/sh-…) hoặc tên file bài báo.
   - Bình luận mới LUÔN ở trạng thái chờ duyệt (moderation_status='pending'),
     KHÔNG tự duyệt, KHÔNG tự cộng điểm lúc gửi (points 0 ở phía client).
   - Điểm bình luận v2 (+10, tối đa 1 lần/ngày toàn site) được cộng qua RPC
     award_interaction_points() của js/reward.js — chỉ hiện "+10 điểm" khi
     RPC thực sự trả 10; trả 0 nghĩa là đã tính loại này hôm nay.
   - Khách vãng lai vẫn bình luận được (tên "Khách Vãng Lai", 0 điểm) nhưng
     thấy ghi chú mời đăng ký/đăng nhập; người đã đăng nhập thấy ghi chú ngắn.
   - Client không bao giờ đọc/ghi points_ledger hay wallet_balances.
   RPC/bảng chưa có (M6/M7 chưa chạy) thì form báo lỗi rõ, không vỡ trang. */
(function () {
  'use strict';
  var GUEST_NOTE = 'Đăng ký / đăng nhập tài khoản để bình luận và các hoạt động khác được cộng điểm thưởng, đổi quà.';
  var LOGGED_IN_NOTE = 'Bình luận từ 20 ký tự, sau khi được duyệt sẽ được cộng 10 điểm (tối đa 1 lần/ngày cho mỗi loại hoạt động).';
  var VALID_TYPES = ['model_profile', 'shop_profile', 'article'];

  function esc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function api() { return (typeof window !== 'undefined' && window.McLivestreamAPI) ? window.McLivestreamAPI : null; }
  function reward() { return (typeof window !== 'undefined' && window.Ver2Reward) ? window.Ver2Reward : null; }
  async function currentUser() {
    var a = api();
    if (!a || typeof a.getSession !== 'function') return null;
    try {
      var s = await a.getSession();
      return (s && s.user) ? s.user : null;
    } catch (e) { return null; }
  }
  function loginHref() {
    try {
      var p = String(location.pathname || '');
      var next = p.split('/').pop() || 'index.html';
      return 'dang-nhap.html?next=' + encodeURIComponent(next);
    } catch (e) { return 'dang-nhap.html'; }
  }

  // Đọc các bình luận ĐÃ DUYỆT, chưa bị xóa mềm, mới nhất trước.
  async function loadComments(targetType, targetRef) {
    var a = api();
    if (!a || !a.client) throw new Error('Chưa kết nối được Supabase, hãy thử lại sau.');
    var res = await a.client.from('comments').select('id,commenter_name,comment,created_at')
      .eq('target_type', targetType).eq('target_ref', String(targetRef))
      .eq('moderation_status', 'approved').is('deleted_at', null)
      .order('created_at', { ascending: false }).limit(50);
    if (res.error) throw res.error;
    return res.data || [];
  }
  function commentsListHTML(list) {
    if (!list || !list.length) return '<p class="v2s-comments-empty">Chưa có bình luận nào được duyệt.</p>';
    return '<ul class="v2s-comments-list">' + list.map(function (c) {
      var when = '';
      try { when = c.created_at ? new Date(c.created_at).toLocaleDateString('vi-VN') : ''; } catch (e) {}
      return '<li><b>' + esc(c.commenter_name || 'Khách Vãng Lai') + '</b>'
        + (when ? ' <span class="v2s-comments-date">' + esc(when) + '</span>' : '')
        + '<p>' + esc(c.comment) + '</p></li>';
    }).join('') + '</ul>';
  }

  // Gửi 1 bình luận: validate ≥20 ký tự, insert pending, rồi (nếu đã đăng
  // nhập) gọi RPC tính điểm. Trả {ok, points, message} — KHÔNG ném lỗi.
  async function submitComment(targetType, targetRef, text, displayName) {
    if (VALID_TYPES.indexOf(targetType) === -1) return { ok: false, points: 0, message: 'Loại mục bình luận không hợp lệ.' };
    if (!targetRef) return { ok: false, points: 0, message: 'Thiếu mục bình luận.' };
    var R = reward();
    var err = R && typeof R.validateComment === 'function' ? R.validateComment(text) : null;
    if (err) return { ok: false, points: 0, message: err };
    var a = api();
    if (!a || !a.client) return { ok: false, points: 0, message: 'Chưa kết nối được Supabase, hãy thử lại sau.' };
    var user = await currentUser();
    var name = String(displayName || '').trim()
      || (user && user.user_metadata && (user.user_metadata.display_name || user.user_metadata.full_name))
      || (user ? user.email : '') || 'Khách Vãng Lai';
    try {
      var res = await a.client.from('comments').insert({
        target_type: targetType, target_ref: String(targetRef),
        comment: String(text).trim(), commenter_name: name.slice(0, 100),
        moderation_status: 'pending'
      }).select('id').single();
      if (res.error) return { ok: false, points: 0, message: 'Chưa gửi được bình luận: ' + String(res.error.message || res.error) };
    } catch (e) {
      return { ok: false, points: 0, message: 'Chưa gửi được bình luận: ' + String((e && e.message) || e) };
    }
    // Bình luận đã gửi (đang chờ duyệt). Điểm chỉ tính sau khi duyệt — gọi
    // RPC ngay để hệ thống ghi nhận lượt trong ngày; RPC/M7 là nơi quyết
    // định có cộng hay không (0 = đã tính loại này hôm nay).
    var points = 0, pointsMsg = '';
    if (user && R && typeof R.awardInteraction === 'function') {
      var r = await R.awardInteraction('comment', targetType, targetRef);
      if (r && r.ok && Number(r.points) > 0) { points = Number(r.points); pointsMsg = ' +' + points + ' điểm (1 lần/ngày)'; }
      else if (r && r.ok) { pointsMsg = 'Đã tính điểm bình luận hôm nay'; }
    }
    return { ok: true, points: points, message: 'Bình luận đã gửi, đang chờ duyệt.' + (pointsMsg ? ' ' + pointsMsg : '') };
  }

  // Vẽ mục bình luận (form + danh sách) vào 1 phần tử. container: element
  // hoặc id. Trả promise (xong khi đã tải danh sách, lỗi tải thì vẫn hiện form).
  async function renderComments(targetType, targetRef, container) {
    var el = typeof container === 'string' ? document.getElementById(container) : container;
    if (!el) return false;
    var user = await currentUser();
    var note = user
      ? '<p class="v2s-note">' + esc(LOGGED_IN_NOTE) + '</p>'
      : '<p class="v2s-note">' + esc(GUEST_NOTE) + ' <a href="dang-ky.html">Đăng ký</a> · <a href="' + esc(loginHref()) + '">Đăng nhập</a></p>';
    el.innerHTML = '<section class="v2s-comments"><h2>Bình luận</h2>' + note
      + '<form class="v2s-comment-form"><label>Tên hiển thị<input name="v2sName" maxlength="100" placeholder="Khách Vãng Lai" value=""></label>'
      + '<label>Bình luận *<textarea name="v2sText" rows="3" required minlength="20" placeholder="Viết bình luận từ 20 ký tự trở lên…"></textarea></label>'
      + '<p class="v2s-comment-msg" role="status"></p>'
      + '<button class="btn btn-primary btn-sm" type="submit">Gửi bình luận</button></form>'
      + '<div class="v2s-comments-list-wrap"><p>Đang tải bình luận…</p></div></section>';
    var form = el.querySelector('.v2s-comment-form');
    var msgEl = el.querySelector('.v2s-comment-msg');
    var listWrap = el.querySelector('.v2s-comments-list-wrap');
    async function refreshList() {
      try { listWrap.innerHTML = commentsListHTML(await loadComments(targetType, targetRef)); }
      catch (e) { listWrap.innerHTML = '<p class="v2s-comments-empty">Chưa tải được bình luận (hệ thống bình luận chưa bật).</p>'; }
    }
    form.addEventListener('submit', async function (e) {
      e.preventDefault();
      var btn = form.querySelector('button[type="submit"]');
      if (btn) btn.disabled = true;
      var text = form.v2sText.value;
      var name = form.v2sName.value;
      var out = await submitComment(targetType, targetRef, text, name);
      if (msgEl) msgEl.textContent = out.message;
      if (out.ok) { form.v2sText.value = ''; }
      if (btn) btn.disabled = false;
    });
    await refreshList();
    return true;
  }

  var API = {
    GUEST_NOTE: GUEST_NOTE, LOGGED_IN_NOTE: LOGGED_IN_NOTE,
    loadComments: loadComments, submitComment: submitComment,
    renderComments: renderComments, commentsListHTML: commentsListHTML
  };
  if (typeof window !== 'undefined') window.Ver2Comments = API;
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
})();
