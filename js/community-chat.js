/* v324 (17/11/2026): Mục chat cộng đồng trang chủ — Vị trí 1, thiết kế v3 đã duyệt 22:28 17/11.
   1 khung duy nhất: chat tổng 3/5 (6 tin mới nhất, mới nhất ở ĐẦU) + Top tương tác 1/5
   + 4 danh sách nổi bật 1/5 (từ data.js). Khách chỉ xem, đăng nhập mới gửi; AI TẮT;
   không SĐT/email; không Xu từ chat. Realtime theo mẫu admin_comments (RPC +
   postgres_changes INSERT trên chat_messages + polling 60 giây fallback).
   v334 (18/11/2026, anh Thọ: CÔNG BẰNG, tin mới lên đầu — không phân biệt AI,
   bot, test hay user): toàn bộ tin (thật + bot) xếp theo giờ, mới nhất trước.
   KHÔNG tự cuộn khi người dùng đang đọc tin cũ (luật cuộn v213); nút
   "Về tin mới nhất" (↑, lên đầu) hiện khi đã cuộn xuống.
   Backend: RPC chat V4 (PR-03) — get_home_chat_messages / post_home_chat_message /
   get_home_chat_top. Không đưa dữ liệu demo giả lên live: khi chưa có tin thật
   thì khung chat hiện "Chưa có tin nhắn — hãy là người đầu tiên trò chuyện".
   v325 (18/11/2026): tin bot từ js/chat-bots.js vẽ đè lên sau mỗi lần render
   (repaint) — tin bot chỉ ở phía client, không ghi DB.
   v326 (18/11/2026): dòng ghi chú bot đổi theo trạng thái đăng nhập
   (setLoggedIn) — khách thấy lời mời đăng nhập, người đã đăng nhập thấy
   link chỉnh mục tóm tắt. */
(function () {
  'use strict';

  var MSG_LIMIT = 6;
  var TOP_LIMIT = 5;
  var POLL_MS = 60000;
  var MAX_BODY = 2000;

  function api() { return (typeof window !== 'undefined' && window.McLivestreamAPI) ? window.McLivestreamAPI : null; }
  function client() { var a = api(); return (a && a.client) || null; }
  function authUI() { return (typeof window !== 'undefined' && window.V2SAuthUI) ? window.V2SAuthUI : null; }

  function $(id) { return document.getElementById(id); }
  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function initials(name) {
    var parts = String(name || '?').trim().split(/\s+/).filter(Boolean);
    var a = parts.length ? parts[0].charAt(0) : '?';
    var b = parts.length > 1 ? parts[parts.length - 1].charAt(0) : '';
    return (a + b).toUpperCase();
  }
  function fmtTime(iso) {
    try {
      var d = new Date(iso);
      if (isNaN(d.getTime())) return '';
      var h = d.getHours(); var m = d.getMinutes();
      return (h < 10 ? '0' + h : '' + h) + ':' + (m < 10 ? '0' + m : '' + m);
    } catch (e) { return ''; }
  }
  function lvClass(lv) {
    if (lv >= 5) return 'lv lv-gold';
    if (lv >= 3) return 'lv lv-green';
    return 'lv';
  }
  function roleBadge(role) {
    if (role === 'shop') return ' <span class="role role-shop">🏪 Chủ Shop</span>';
    if (role === 'model') return ' <span class="role role-model">🎥 Mẫu Live</span>';
    return '';
  }

  async function rpc(name, args) {
    var c = client();
    if (!c || typeof c.rpc !== 'function') throw new Error('Chưa kết nối được Supabase.');
    var res = await c.rpc(name, args || {});
    if (res.error) throw res.error;
    return res.data;
  }

  /* --- 4 danh sách nổi bật (từ data.js thật) --- */
  function maxMonthly(salary) {
    if (!salary) return 0;
    var s = String(salary);
    // Thu nhập tham khảo (không phải lương cứng) thì bỏ qua — vd TO Media 15–45 triệu.
    if (/tham khảo/i.test(s)) return 0;
    var m = s.match(/(\d+(?:[.,]\d+)?)\s*[–-]\s*(\d+(?:[.,]\d+)?)\s*triệu\/tháng/i);
    if (m) return parseFloat(m[2].replace(',', '.'));
    var m2 = s.match(/(\d+(?:[.,]\d+)?)\s*triệu\/tháng/i);
    if (m2) return parseFloat(m2[1].replace(',', '.'));
    return 0;
  }
  function shortSalary(salary) {
    var s = String(salary || '');
    var m = s.match(/(\d+(?:[.,]\d+)?\s*[–-]\s*\d+(?:[.,]\d+)?\s*triệu\/tháng)/i)
      || s.match(/(\d+(?:[.,]\d+)?\s*triệu\/tháng)/i);
    return m ? m[1] : s.slice(0, 40);
  }
  function parseDateDMY(d) {
    var parts = String(d || '').split('/');
    if (parts.length !== 3) return null;
    var t = new Date(+parts[2], +parts[1] - 1, +parts[0]);
    return isNaN(t.getTime()) ? null : t;
  }
  function fmtDateDMY(d) {
    var t = parseDateDMY(d);
    if (!t) return String(d || '');
    return ('0' + t.getDate()).slice(-2) + '/' + ('0' + (t.getMonth() + 1)).slice(-2) + '/' + t.getFullYear();
  }

  function renderHighlights() {
    var box = $('homeChatHighlights');
    if (!box) return;
    var D = (typeof window !== 'undefined' && window.V20_DATA) ? window.V20_DATA : null;
    if (!D) { box.innerHTML = '<p class="chat-empty">Chưa tải được danh sách.</p>'; scheduleFrameSync(); return; }
    var html = '';

    // 1. Shop tuyển lương cao nhất (lương tháng cứng, bỏ "tham khảo").
    var shops = (D.shops || []).map(function (s) {
      return { name: s.name || '', province: s.province || '', salary: s.salary || '', max: maxMonthly(s.salary) };
    }).filter(function (x) { return x.max > 0 && x.name; })
      .sort(function (a, b) { return b.max - a.max; }).slice(0, 3);
    html += '<div class="hl-group"><h4>💰 Shop tuyển lương cao nhất</h4><ul>';
    if (shops.length) {
      shops.forEach(function (s) {
        html += '<li><a href="danh-sach-shop.html"><b>' + esc(s.name) + '</b><span>' + esc(s.province) + ' · ' + esc(shortSalary(s.salary)) + '</span></a></li>';
      });
    } else { html += '<li><span>Chưa có dữ liệu lương.</span></li>'; }
    html += '</ul></div>';

    // 2. Mẫu có doanh thu cao nhất — 3 case KOL đã xác minh (nguồn: hồ sơ KOL của sàn).
    html += '<div class="hl-group"><h4>📈 Mẫu có doanh thu cao nhất</h4><ul>'
      + '<li><a href="bai-viet/boc-me-vo-ha-linh-237-ty-mot-phien-live-cong-thuc-chot-don.html"><b>Võ Hà Linh</b><span>237 tỷ/phiên live</span></a></li>'
      + '<li><a href="bai-viet/quyen-leo-daily-100-ty-17-gio-livestream.html"><b>Quyền Leo</b><span>100 tỷ/17 giờ live</span></a></li>'
      + '<li><a href="bai-viet/y-tuong-ban-hang-online-pham-thoai-58-ty-36-gio-live.html"><b>Phạm Thoại</b><span>58 tỷ/36 giờ live</span></a></li>'
      + '</ul></div>';

    // 3. Sự kiện marketing mới nhất (theo dateAdded).
    var events = (D.eventsMarketing || []).slice()
      .sort(function (a, b) { return String(b.dateAdded || '').localeCompare(String(a.dateAdded || '')); })
      .slice(0, 3);
    html += '<div class="hl-group"><h4>📣 Sự kiện marketing mới nhất</h4><ul>';
    if (events.length) {
      events.forEach(function (e) {
        var d = e.dateAdded ? fmtDateDMY(String(e.dateAdded).slice(8, 10) + '/' + String(e.dateAdded).slice(5, 7) + '/' + String(e.dateAdded).slice(0, 4)) : '';
        html += '<li><a href="danh-sach-mau.html?newobj=eventsMarketing"><b>' + esc(e.name || '') + '</b><span>' + esc(e.province || '') + (d ? ' · ' + esc(d) : '') + '</span></a></li>';
      });
    } else { html += '<li><span>Chưa có sự kiện mới.</span></li>'; }
    html += '</ul></div>';

    // 4. Hội chợ mua bán mới nhất (lô xả kho mới nhất theo ngày).
    var lots = (D.lots || []).slice()
      .sort(function (a, b) {
        var ta = parseDateDMY(a.date), tb = parseDateDMY(b.date);
        return (tb ? tb.getTime() : 0) - (ta ? ta.getTime() : 0);
      }).slice(0, 3);
    html += '<div class="hl-group"><h4>🛍️ Hội chợ mua bán mới nhất</h4><ul>';
    if (lots.length) {
      lots.forEach(function (l) {
        html += '<li><a href="thanh-ly-kiot.html"><b>' + esc(l.title || '') + '</b><span>' + esc(l.price || '') + (l.date ? ' · ' + esc(fmtDateDMY(l.date)) : '') + '</span></a></li>';
      });
    } else { html += '<li><span>Chưa có lô mới.</span></li>'; }
    html += '</ul></div>';

    box.innerHTML = html;
    scheduleFrameSync();
  }

  /* --- Khung chat tổng --- */
  // v334: công bằng, tin mới lên đầu — tin mới nhất ở ĐẦU danh sách nên
  // "đang ở tin mới nhất" nghĩa là đang ở ĐẦU (scrollTop ~ 0), không phải
  // ở cuối như trước. Nút "Về tin mới nhất" cuộn lên đầu.
  var state = { sending: false, pollTimer: null, channel: null, atTop: true };

  function isAtTop(list) {
    if (!list) return true;
    return list.scrollTop < 12;
  }
  function scrollToTop(list) {
    if (!list) return;
    try { list.scrollTop = 0; } catch (e) { /* bỏ qua */ }
  }
  function updateJumpBtn() {
    var list = $('homeChatList'), btn = $('homeChatJump');
    if (!list || !btn) return;
    state.atTop = isAtTop(list);
    btn.hidden = state.atTop;
  }

  function messageHtml(m) {
    var kind = m.author_kind || 'user';
    var tag = kind === 'admin' ? '<span class="chat-tag">QUẢN TRỊ</span>'
      : (kind === 'ai' ? '<span class="chat-tag">AI</span>' : '');
    var lv = (typeof m.level === 'number' && m.level > 0) ? m.level : 1;
    var verified = m.is_verified ? ' <span class="verified" title="Đã xác minh đăng ký">✓</span>' : '';
    var ts = 0;
    try { ts = new Date(m.created_at).getTime() || 0; } catch (e) { ts = 0; }
    return '<div class="chat-msg" data-ts="' + ts + '">'
      + '<div class="chat-avatar">' + esc(initials(m.author_name)) + '</div>'
      + '<div class="chat-body"><div class="chat-meta"><b>' + esc(m.author_name || 'Khách')
      + '</b>' + tag + ' <span class="' + lvClass(lv) + '">Lv.' + lv + '</span>'
      + roleBadge(m.author_role) + verified + ' · ' + esc(fmtTime(m.created_at)) + '</div>'
      + '<p class="chat-text">' + esc(m.body || '') + '</p></div></div>';
  }

  function restoreScroll(list, prev) {
    if (!list || !prev) return;
    try {
      if (prev.wasTop || prev.top < 12) { scrollToTop(list); return; }
      list.scrollTop = Math.max(0, prev.top + (list.scrollHeight - prev.height));
    } catch (e) { /* bỏ qua */ }
  }

  function renderMessages(rows) {
    var list = $('homeChatList');
    if (!list) return;
    if (!rows || !rows.length) {
      list.innerHTML = '<p class="chat-empty">Chưa có tin nhắn — hãy là người đầu tiên trò chuyện.</p>';
      return;
    }
    // v334 (18/11/2026, anh Thọ: CÔNG BẰNG, tin mới lên đầu — không phân
    // biệt AI, bot, test hay user): hiển thị đúng thứ tự RPC trả về (mới
    // nhất trước), KHÔNG đảo, KHÔNG tách theo loại. Tin test chỉ là tin
    // người dùng bình thường, xếp theo giờ như mọi tin khác.
    // Chụp vị trí cuộn TRƯỚC khi thay innerHTML để giữ nguyên chỗ đang đọc
    // (luật cuộn v213); V2SChatBots.repaint(anchor) chèn tin bot theo giờ
    // và khôi phục vị trí cuộn theo anchor này.
    var anchor = { top: list.scrollTop, height: list.scrollHeight, wasTop: state.atTop };
    var html = '';
    rows.forEach(function (m) { html += messageHtml(m); });
    list.innerHTML = html;
    // v325: vẽ lại tin bot (js/chat-bots.js) sau mỗi lần render tin thật,
    // vì render này thay innerHTML nên tin bot bị xóa theo.
    if (typeof window !== 'undefined' && window.V2SChatBots && typeof window.V2SChatBots.repaint === 'function') {
      try { window.V2SChatBots.repaint(anchor); } catch (e) { /* bỏ qua */ }
    } else {
      restoreScroll(list, anchor);
    }
    updateJumpBtn();
  }

  function renderTop(rows) {
    var box = $('homeChatTop');
    if (!box) return;
    if (!rows || !rows.length) {
      box.innerHTML = '<p class="chat-empty">Chưa có tương tác tuần này.</p>';
    } else {
      var html = '';
      rows.forEach(function (r, i) {
        var rank = i + 1;
        var rankHtml = rank === 1 ? '<span class="top-rank r1">👑</span>'
          : '<span class="top-rank r' + (rank <= 3 ? rank : '') + '">' + rank + '</span>';
        var role = r.author_role === 'shop' ? 'Chủ Shop' : (r.author_role === 'model' ? 'Mẫu Live' : 'Thành viên');
        var lv = (typeof r.level === 'number' && r.level > 0) ? r.level : 1;
        html += '<div class="top-row' + (rank === 1 ? ' top1' : '') + '">' + rankHtml
          + '<div class="top-name"><b>' + esc(r.author_name || 'Khách') + ' <span class="' + lvClass(lv) + '">Lv.' + lv + '</span></b>'
          + '<span>' + esc(role) + '</span></div>'
          + '<span class="top-count">' + esc(r.interact_count) + '</span></div>';
      });
      box.innerHTML = html;
    }
    scheduleFrameSync();
  }

  /* v334: Khung chat cao đúng bằng mục Top bên phải (desktop). Đo chiều cao
     tự nhiên của cột Top bằng bản sao ẩn (không bị kéo giãn bởi lưới), rồi
     đặt chiều cao khung bằng đúng số đó; cột chat và cột nổi bật cuộn bên
     trong. Chỉ chạy trên desktop (>720px); mobile xếp dọc nên không giới hạn.
     Khung chỉ dài đúng bằng Top, cấm dài hơn (anh Thọ 13:00 18/11). */
  var frameSyncTimer = null;
  function syncFrameHeight() {
    var body = document.querySelector('.chat-frame-body');
    var top = document.querySelector('.cf-top');
    if (!body || !top || !top.clientWidth) return;
    if (window.matchMedia && window.matchMedia('(max-width:720px)').matches) {
      body.style.height = '';
      return;
    }
    var clone = top.cloneNode(true);
    var ids = clone.querySelectorAll('[id]');
    for (var i = 0; i < ids.length; i++) ids[i].removeAttribute('id');
    clone.style.cssText = 'position:fixed;left:-9999px;top:0;visibility:hidden;height:auto;width:' + top.clientWidth + 'px;margin:0;';
    document.body.appendChild(clone);
    var h = clone.offsetHeight;
    document.body.removeChild(clone);
    // Khung chỉ dài đúng bằng Top, cấm dài hơn (anh Thọ 13:00 18/11).
    if (h > 0) body.style.height = h + 'px';
  }
  function scheduleFrameSync() {
    if (frameSyncTimer) clearTimeout(frameSyncTimer);
    frameSyncTimer = setTimeout(syncFrameHeight, 50);
  }

  async function loadMessages() {
    try {
      var rows = await rpc('get_home_chat_messages', { p_limit: MSG_LIMIT, p_offset: 0 });
      renderMessages(rows || []);
    } catch (e) {
      var list = $('homeChatList');
      if (list && !list.querySelector('.chat-msg')) {
        list.innerHTML = '<p class="chat-empty">Chưa tải được tin nhắn, sẽ thử lại sau.</p>';
      }
    }
  }
  async function loadTop() {
    try {
      var rows = await rpc('get_home_chat_top', { p_limit: TOP_LIMIT });
      renderTop(rows || []);
    } catch (e) {
      var box = $('homeChatTop');
      if (box && !box.querySelector('.top-row')) {
        box.innerHTML = '<p class="chat-empty">Chưa tải được bảng xếp hạng.</p>';
      }
    }
  }

  /* --- Gửi tin --- */
  function setLoggedIn(loggedIn) {
    var input = $('homeChatInput'), btn = $('homeChatSend');
    if (!input || !btn) return;
    // v325-fix (18/11/2026, anh Thọ): dòng ghi chú dưới ô nhập đổi theo trạng
    // thái đăng nhập — khách thấy lời mời đăng nhập (kích thích đăng ký),
    // người đã đăng nhập thấy link chỉnh mục tóm tắt ở Trang của tôi.
    var note = $('homeChatBotNote');
    if (note) {
      if (loggedIn) {
        note.innerHTML = 'Bạn có thể chọn mục tóm tắt tin theo yêu cầu trong khung chat, hoặc tắt nó đi. <a href="trang-cua-toi.html#bot-tom-tat">Chỉnh ở Trang của tôi →</a>';
      } else {
        note.innerHTML = 'Mẹo nhỏ: Bạn đăng nhập để chọn tin tóm tắt yêu thích cho bot hoặc tắt nó đi. <a href="dang-ky.html">Đăng nhập / Đăng ký →</a>';
      }
    }
    if (loggedIn) {
      input.disabled = false;
      input.placeholder = 'Nhắn tin trong Chat tổng…';
      btn.textContent = 'Gửi';
      btn.onclick = function () { sendMessage(); };
    } else {
      input.disabled = true;
      input.placeholder = 'Đăng nhập để trò chuyện';
      btn.textContent = 'Đăng nhập';
      btn.onclick = function () { window.location.href = 'dang-ky.html'; };
    }
  }
  function showHint(text) {
    var hint = $('homeChatHint');
    if (!hint) return;
    hint.textContent = text || '';
    hint.hidden = !text;
  }
  async function sendMessage() {
    var input = $('homeChatInput'), btn = $('homeChatSend');
    if (!input || state.sending) return;
    var body = (input.value || '').trim();
    if (!body) return;
    if (body.length > MAX_BODY) { showHint('Tin nhắn tối đa ' + MAX_BODY + ' ký tự.'); return; }
    state.sending = true;
    if (btn) btn.disabled = true;
    showHint('');
    try {
      await rpc('post_home_chat_message', { p_body: body });
      input.value = '';
      // Tin mới sẽ về qua Realtime; polling 60s là fallback nếu Realtime rớt.
      await loadMessages();
      // v334: tin mới lên đầu nên cuộn lên đầu để thấy tin mình vừa gửi.
      scrollToTop($('homeChatList'));
    } catch (e) {
      var msg = String((e && e.message) || e || '');
      if (/Cần đăng nhập/i.test(msg)) showHint('Cần đăng nhập để gửi tin.');
      else if (/Gửi quá nhanh/i.test(msg)) showHint('Gửi quá nhanh, thử lại sau vài giây.');
      else if (/tối đa 2000/i.test(msg)) showHint('Tin nhắn tối đa 2000 ký tự.');
      else showHint('Chưa gửi được, thử lại sau.');
    } finally {
      state.sending = false;
      if (btn) btn.disabled = false;
    }
  }
  async function refreshAuth() {
    var A = authUI();
    if (!A || typeof A.getSession !== 'function') { setLoggedIn(false); return; }
    try {
      var s = await A.getSession();
      setLoggedIn(!!(s && s.user));
    } catch (e) { setLoggedIn(false); }
  }

  function setupRealtime() {
    var c = client();
    if (!c || typeof c.channel !== 'function') return;
    try {
      if (state.channel) { try { state.channel.unsubscribe(); } catch (e) { /* bỏ qua */ } }
      state.channel = c.channel('home-chat-room')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages' }, function () {
          loadMessages();
        })
        .subscribe();
    } catch (e) { /* Realtime không bắt buộc — polling 60s vẫn chạy */ }
  }

  function init() {
    if (!$('chat-cong-dong')) return;
    renderHighlights();
    loadMessages();
    loadTop();
    refreshAuth();
    var A = authUI();
    if (A && typeof A.onSessionChange === 'function') {
      try { A.onSessionChange(function () { refreshAuth(); }); } catch (e) { /* bỏ qua */ }
    }
    var list = $('homeChatList');
    if (list) list.addEventListener('scroll', updateJumpBtn);
    var jump = $('homeChatJump');
    // v334: tin mới ở đầu nên nút này cuộn lên đầu khung.
    if (jump) jump.addEventListener('click', function () { scrollToTop(list); updateJumpBtn(); });
    var input = $('homeChatInput');
    if (input) input.addEventListener('keydown', function (ev) {
      if (ev.key === 'Enter' && !ev.shiftKey) { ev.preventDefault(); sendMessage(); }
    });
    setupRealtime();
    // Polling 60s fallback (mẫu admin_comments): Realtime rớt thì vẫn có tin mới.
    if (state.pollTimer) clearInterval(state.pollTimer);
    state.pollTimer = setInterval(function () { loadMessages(); loadTop(); }, POLL_MS);
    // Tải lại 4 danh sách khi data.js sẵn sàng muộn (data.js nạp trước app.js
    // nhưng community-chat.js chạy ngay sau — render lại sau 1s cho chắc).
    setTimeout(renderHighlights, 1000);
    // v334: khung cao bằng mục Top — đo lại khi cửa sổ đổi kích thước.
    if (window.addEventListener) window.addEventListener('resize', scheduleFrameSync);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
