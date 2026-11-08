/* v2 — Mục bình luận GĐ2 (mới, 07/11/2026).
   Dùng chung cho trang chi tiết hồ sơ mẫu (ho-so.html), chi tiết shop
   (chi-tiet-shop.html) và trang bài báo (bai-viet/*.html, tin-tuc.html).
   Bảng `comments` (M6): target_type IN ('model_profile','shop_profile',
   'article'), target_ref = id data.js (th-…/sh-…) hoặc tên file bài báo.
   v92 (08/11/2026): mở rộng thêm 3 loại mục — 'lot' (lô xả kho),
   'factory' (xưởng may), 'kiot' (thanh lý kiot) — cho các thẻ trên
   trang thanh-ly-kiot (kiot) + mục lô/xưởng trên danh-sach-shop (lô/
   xưởng không có trang chi tiết riêng). Cần migration M10 nới CHECK
   target_type của bảng comments (file riêng, CHƯA chạy live) thì 3 loại
   mới mới INSERT được; client đã chấp nhận trước để không chặn UI.
   - Bình luận mới LUÔN ở trạng thái chờ duyệt (moderation_status='pending'),
     KHÔNG tự duyệt, KHÔNG tự cộng xu lúc gửi (points 0 ở phía client).
   - Xu bình luận v2 (+10, tối đa 1 lần/ngày toàn site) được cộng qua RPC
     award_interaction_points() của js/reward.js — chỉ hiện "+10 xu" khi
     RPC thực sự trả 10; trả 0 nghĩa là đã tính loại này hôm nay.
   - v95: khách vãng lai bình luận ĐƠN GIẢN — chỉ 1 ô bình luận, không cần
     tên, không luật 20 ký tự (chỉ cần ≥2 ký tự, khớp CHECK của bảng
     comments), ghi chú rõ không cần đăng nhập; tên mặc định "Khách Vãng
     Lai", 0 xu. Người đã đăng nhập giữ form đầy đủ + luật ≥20 ký tự
     để tính xu +10.
   - Client không bao giờ đọc/ghi points_ledger hay wallet_balances.
   RPC/bảng chưa có (M6/M7 chưa chạy) thì form báo lỗi rõ, không vỡ trang. */
(function () {
  'use strict';
  var GUEST_NOTE = 'Đăng ký / đăng nhập tài khoản để bình luận và các hoạt động khác được cộng xu thưởng, đổi quà.';
  // v95: ghi chú cho form khách đơn giản — rõ ràng là KHÔNG cần đăng nhập.
  // GUEST_NOTE cũ giữ lại (đã export) để không vỡ code khác, nhưng form
  // khách không dùng nữa.
  var GUEST_SIMPLE_NOTE = 'Bình luận với tên Khách Vãng Lai — không cần đăng nhập.';
  var LOGGED_IN_NOTE = 'Bình luận từ 20 ký tự, sau khi được duyệt sẽ được cộng 10 xu (tối đa 1 lần/ngày cho mỗi loại hoạt động).';
  var VALID_TYPES = ['model_profile', 'shop_profile', 'article', 'lot', 'factory', 'kiot'];
  var COUNT_CACHE_KEY = 'v2s-comment-counts-v1';

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

  // Gửi 1 bình luận: gọi RPC submit_comment (SECURITY DEFINER, bypass RLS
  // — sửa NEW-01: INSERT trực tiếp bị RLS chặn 42501), rồi (nếu đã đăng
  // nhập) gọi RPC tính xu. Validate: đã đăng nhập → ≥20 ký tự
  // (validateComment của js/reward.js, để tính xu +10); khách vãng lai
  // → chỉ cần viết gì đó (≥2 ký tự, v95 — khớp CHECK của bảng comments;
  // chặn link + chống spam do RPC lo). Trả {ok, points, message} — KHÔNG
  // ném lỗi.
  async function submitComment(targetType, targetRef, text, displayName) {
    if (VALID_TYPES.indexOf(targetType) === -1) return { ok: false, points: 0, message: 'Loại mục bình luận không hợp lệ.' };
    if (!targetRef) return { ok: false, points: 0, message: 'Thiếu mục bình luận.' };
    var a = api();
    if (!a || !a.client) return { ok: false, points: 0, message: 'Chưa kết nối được Supabase, hãy thử lại sau.' };
    var user = await currentUser();
    var R = reward();
    if (user) {
      var err = R && typeof R.validateComment === 'function' ? R.validateComment(text) : null;
      if (err) return { ok: false, points: 0, message: err };
    } else if (String(text || '').trim().length < 2) {
      return { ok: false, points: 0, message: 'Hãy viết nội dung bình luận.' };
    }
    var name = String(displayName || '').trim()
      || (user && user.user_metadata && (user.user_metadata.display_name || user.user_metadata.full_name))
      || (user ? user.email : '') || 'Khách Vãng Lai';
    // NEW-01 (08/11): INSERT trực tiếp bị RLS chặn (42501) dù policy cho
    // phép — gửi bình luận qua RPC SECURITY DEFINER submit_comment() thay
    // cho INSERT trực tiếp. RPC tự validate + chống spam (luật M7.9b) và
    // luôn tạo bình luận ở trạng thái pending; xu chỉ cộng sau khi duyệt.
    // p_auth_user_id: uid của tài khoản đang đăng nhập, null khi khách vãng lai.
    try {
      var res = await a.client.rpc('submit_comment', {
        p_target_type: targetType, p_target_ref: String(targetRef),
        p_comment: String(text).trim(), p_commenter_name: name.slice(0, 100),
        p_auth_user_id: user ? user.id : null
      });
      if (res.error) return { ok: false, points: 0, message: 'Chưa gửi được bình luận: ' + String(res.error.message || res.error) };
    } catch (e) {
      return { ok: false, points: 0, message: 'Chưa gửi được bình luận: ' + String((e && e.message) || e) };
    }
    // Bình luận đã gửi (đang chờ duyệt). Xu chỉ tính sau khi duyệt — gọi
    // RPC ngay để hệ thống ghi nhận lượt trong ngày; RPC/M7 là nơi quyết
    // định có cộng hay không (0 = đã tính loại này hôm nay).
    var points = 0, pointsMsg = '';
    if (user && R && typeof R.awardInteraction === 'function') {
      var r = await R.awardInteraction('comment', targetType, targetRef);
      if (r && r.ok && Number(r.points) > 0) { points = Number(r.points); pointsMsg = ' +' + points + ' xu (1 lần/ngày)'; }
      else if (r && r.ok) { pointsMsg = 'Đã tính xu bình luận hôm nay'; }
    }
    return { ok: true, points: points, message: 'Bình luận đã gửi, đang chờ duyệt.' + (pointsMsg ? ' ' + pointsMsg : '') };
  }

  // Vẽ mục bình luận (form + danh sách) vào 1 phần tử. container: element
  // hoặc id. Trả promise (xong khi đã tải danh sách, lỗi tải thì vẫn hiện form).
  async function renderComments(targetType, targetRef, container) {
    var el = typeof container === 'string' ? document.getElementById(container) : container;
    if (!el) return false;
    var user = await currentUser();
    // v95: khách vãng lai thấy form ĐƠN GIẢN — chỉ 1 ô bình luận, không ô
    // tên, không minlength, ghi chú rõ không cần đăng nhập. Người đã đăng
    // nhập giữ form đầy đủ (ô tên + minlength=20 để tính xu).
    var note, formHTML;
    if (user) {
      note = '<p class="v2s-note">' + esc(LOGGED_IN_NOTE) + '</p>';
      formHTML = '<form class="v2s-comment-form"><label>Tên hiển thị<input name="v2sName" maxlength="100" placeholder="Khách Vãng Lai" value=""></label>'
        + '<label>Bình luận *<textarea name="v2sText" rows="3" required minlength="20" placeholder="Viết bình luận từ 20 ký tự trở lên…"></textarea></label>'
        + '<p class="v2s-comment-msg" role="status"></p>'
        + '<button class="btn btn-primary btn-sm" type="submit">Gửi bình luận</button></form>';
    } else {
      note = '<p class="v2s-note">' + esc(GUEST_SIMPLE_NOTE) + '</p>';
      formHTML = '<form class="v2s-comment-form">'
        + '<label>Bình luận *<textarea name="v2sText" rows="3" required placeholder="Viết bình luận…"></textarea></label>'
        + '<p class="v2s-comment-msg" role="status"></p>'
        + '<button class="btn btn-primary btn-sm" type="submit">Gửi bình luận</button></form>';
    }
    el.innerHTML = '<section class="v2s-comments"><h2>Bình luận</h2>' + note + formHTML
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
      var name = form.v2sName ? form.v2sName.value : ''; // form khách v95 không có ô tên
      var out = await submitComment(targetType, targetRef, text, name);
      if (msgEl) msgEl.textContent = out.message;
      if (out.ok) { form.v2sText.value = ''; }
      if (btn) btn.disabled = false;
    });
    await refreshList();
    return true;
  }

  // ---- v92 (C2): bình luận dưới mỗi thẻ lô/xưởng/kiot ----
  // Số bình luận ĐÃ DUYỆT theo từng mục (target_type:target_ref), đếm bằng
  // 1 query duy nhất cho cả 3 loại mới, cache theo phiên (sessionStorage)
  // để không truy vấn lại khi cuộn/lọc render lại thẻ. Lỗi mạng → {} (nút
  // vẫn hiện "Bình luận" không số, bấm vẫn mở form bình thường).
  function readCountCache() {
    try {
      if (typeof sessionStorage === 'undefined') return null;
      var raw = sessionStorage.getItem(COUNT_CACHE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
  }
  function writeCountCache(counts) {
    try {
      if (typeof sessionStorage === 'undefined') return;
      sessionStorage.setItem(COUNT_CACHE_KEY, JSON.stringify({ at: Date.now(), counts: counts || {} }));
    } catch (e) { /* bỏ qua — lần sau đếm lại */ }
  }
  async function getCommentCounts(types) {
    var wanted = (types && types.length ? types : ['lot', 'factory', 'kiot']);
    var cached = readCountCache();
    if (cached && cached.counts) return cached.counts;
    var a = api();
    if (!a || !a.client) return {};
    try {
      var res = await a.client.from('comments').select('target_type,target_ref')
        .in('target_type', wanted).eq('moderation_status', 'approved').is('deleted_at', null).limit(1000);
      if (res.error) return {};
      var counts = {};
      (res.data || []).forEach(function (row) {
        var k = String(row.target_type) + ':' + String(row.target_ref);
        counts[k] = (counts[k] || 0) + 1;
      });
      writeCountCache(counts);
      return counts;
    } catch (e) { return {}; }
  }
  // Cập nhật nhãn "Bình luận (N)" cho mọi nút toggle trong root (mặc định
  // document). Nút nào chưa có số thì giữ nhãn "Bình luận".
  function countLabel(n) { return n > 0 ? '💬 Bình luận (' + n + ')' : '💬 Bình luận'; }
  async function refreshCommentCounts(root) {
    var doc = root || (typeof document !== 'undefined' ? document : null);
    if (!doc || typeof doc.querySelectorAll !== 'function') return {};
    var counts = await getCommentCounts();
    var btns = doc.querySelectorAll('[data-v2s-comment-toggle]');
    for (var i = 0; i < btns.length; i++) {
      var b = btns[i];
      if (b.getAttribute('data-v2s-comments-open') === '1') continue; // đang mở: giữ nhãn "Đóng bình luận"
      var k = b.getAttribute('data-v2s-target-type') + ':' + b.getAttribute('data-v2s-target-id');
      var n = counts[k] || 0;
      b.setAttribute('data-v2s-comments-count', String(n)); // để đóng/mở lại vẫn giữ số
      b.textContent = countLabel(n);
    }
    return counts;
  }
  // Gắn 1 lần listener ủy quyền cho nút toggle bình luận dưới thẻ lô/xưởng/
  // kiot (gọi từ js/app.js initPointsUI sau khi trang render xong). Bấm lần
  // đầu: mở khung + renderComments (lazy-load); bấm lại: đóng/mở, không tải
  // lại. 2 thẻ khác nhau không lẫn nhau (mỗi khung gắn đúng target_ref).
  var cardCommentsWired = false;
  function initCardComments(root) {
    var doc = root || (typeof document !== 'undefined' ? document : null);
    if (!doc || cardCommentsWired) return false;
    if (typeof doc.addEventListener !== 'function') return false;
    cardCommentsWired = true;
    doc.addEventListener('click', function (e) {
      var btn = e.target && e.target.closest ? e.target.closest('[data-v2s-comment-toggle]') : null;
      if (!btn) return;
      e.preventDefault();
      var card = btn.closest ? btn.closest('article') : null;
      var mount = null;
      if (card && typeof card.querySelector === 'function') {
        mount = card.querySelector('[data-v2s-comments-for="' + btn.getAttribute('data-v2s-target-type') + ':' + btn.getAttribute('data-v2s-target-id') + '"]');
      }
      if (!mount) return;
      var open = btn.getAttribute('data-v2s-comments-open') === '1';
      if (open) {
        mount.hidden = true;
        btn.setAttribute('data-v2s-comments-open', '0');
        btn.textContent = countLabel(Number(btn.getAttribute('data-v2s-comments-count') || 0));
        return;
      }
      mount.hidden = false;
      btn.setAttribute('data-v2s-comments-open', '1');
      btn.textContent = '💬 Đóng bình luận';
      if (mount.getAttribute('data-v2s-loaded') !== '1') {
        mount.setAttribute('data-v2s-loaded', '1');
        renderComments(btn.getAttribute('data-v2s-target-type'), btn.getAttribute('data-v2s-target-id'), mount);
      }
    });
    refreshCommentCounts(doc);
    return true;
  }

  var API = {
    GUEST_NOTE: GUEST_NOTE, GUEST_SIMPLE_NOTE: GUEST_SIMPLE_NOTE, LOGGED_IN_NOTE: LOGGED_IN_NOTE,
    loadComments: loadComments, submitComment: submitComment,
    renderComments: renderComments, commentsListHTML: commentsListHTML,
    getCommentCounts: getCommentCounts, refreshCommentCounts: refreshCommentCounts,
    initCardComments: initCardComments, VALID_TYPES: VALID_TYPES
  };
  if (typeof window !== 'undefined') window.Ver2Comments = API;
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
})();
