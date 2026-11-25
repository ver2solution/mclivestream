/* v364 (19/11/2026): CHAT-01 (P2) — trang chat dung RPC theo phong.
   Migration CHAT-01 da chay xong (2 phan, kiem chung 5/5 + 6/6):
   list_chat_rooms (danh sach phong server-driven) + get_chat_messages
   (theo phong, tra them author_username/avatar_url/parent_id/reply_to)
   + post_chat_message (tra loi + idempotency client_msg_id + chong spam
   10s + toi da 60 tin/gio + kiem mute) + delete_my_chat_message (chi
   xoa tin cua minh) + report_chat_message + block_chat_user.
   Kiem duyet (mute_chat_user / moderate_chat_message) lam o console
   admin (js/admin.js), khong lam tren trang chat cong khai.
   v360 (19/11/2026, lenh Owner 16:27): Trang chat cong dong day du
   /cong-dong/chat (V4 PR-04) — Chat tong truoc, doc lap voi trang chu.
   CHI tin THAT tu DB qua RPC chat V4 (PR-03); khong bot, khong so online
   gia, khong tin demo. Khach chua dang nhap: chi thay loi moi, KHONG goi
   RPC doc tin. Thu tu hien thi: cu -> moi (moi nhat o CUOI, khac khung
   chat nho trang chu hien moi nhat o DAU) — chuan trang chat day du, o
   soan co dinh phia duoi. Luat cuon v213: chi tu cuon xuong tin moi khi
   nguoi dung dang o cuoi khung; dang doc tin cu thi giu nguyen vi tri.
   Phan trang: tai tin cu bang p_offset; dedupe theo id (khong nhan doi
   khi reconnect/Realtime + polling cung chay). */
(function () {
  'use strict';

  var PAGE = 50;
  var POLL_MS = 60000;
  var MAX_BODY = 2000;

  /* Danh sach phong du phong khi RPC list_chat_rooms loi — theo seed DB
     chat_rooms (PR-03): chi chat-tong mo (is_open=true); 6 phong con lai
     dong, hien khoa "Sap mo". */
  var ROOMS_FALLBACK = [
    { slug: 'chat-tong', name: 'Chat tổng', open: true },
    { slug: 'viec-lam', name: 'Việc làm & Tuyển dụng', open: false },
    { slug: 'livestream', name: 'Livestream & Bán hàng', open: false },
    { slug: 'mau-live', name: 'Mẫu Live', open: false },
    { slug: 'chu-shop', name: 'Chủ Shop', open: false },
    { slug: 'kiot-lo', name: 'Kiot & Lô xả kho', open: false },
    { slug: 'hoi-dap', name: 'Hỏi đáp & Chia sẻ', open: false }
  ];
  var ROOM_NOTES = {
    'chat-tong': 'Trò chuyện chung toàn cộng đồng.',
    'viec-lam': 'Tìm việc, tuyển người, chia sẻ kinh nghiệm nghề.',
    'livestream': 'Kỹ thuật live, chốt đơn, tăng chuyển đổi.',
    'mau-live': 'Cộng đồng mẫu livestream.',
    'chu-shop': 'Chủ shop nhỏ trao đổi kinh nghiệm bán live.',
    'kiot-lo': 'Sang nhượng kiot, xả lô tồn kho.',
    'hoi-dap': 'Hỏi đáp chung, chia sẻ kinh nghiệm.'
  };

  var state = {
    loggedIn: false, sending: false, loadingOlder: false,
    msgs: [], seenIds: {}, loadedCount: 0, hasMore: true,
    atBottom: true, unread: 0, channel: null, pollTimer: null,
    room: 'chat-tong', rooms: null, myId: null, replyTo: null
  };

  function api() { return (typeof window !== 'undefined' && window.McLivestreamAPI) ? window.McLivestreamAPI : null; }
  function client() { var a = api(); return (a && a.client) || null; }
  function authUI() { return (typeof window !== 'undefined' && window.V2SAuthUI) ? window.V2SAuthUI : null; }
  function $(id) { return document.getElementById(id); }
  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  // v370 (20/11/2026, B-20261120-08 / FULL-MC-035): URL trong tin nhắn
  // chat thành link bấm được (mở tab mới). Nhận chuỗi ĐÃ esc (nên & trong
  // URL là &amp; — dùng nguyên cho cả href lẫn chữ hiển thị, trình duyệt
  // hiểu đúng). Chỉ link http(s)://; bỏ dấu câu cuối câu (.,;:!?) ra ngoài link.
  function linkifyText(t) {
    try {
      return String(t || '').replace(/((?:https?:\/\/)[^\s<>"']+)/g, function (u) {
        var tail = '';
        var m2 = u.match(/[.,;:!?)\]]+$/);
        if (m2) { tail = m2[0]; u = u.slice(0, u.length - tail.length); }
        if (!u) return tail;
        return '<a href="' + u + '" target="_blank" rel="noopener">' + u + '</a>' + tail;
      });
    } catch (e) { return t; }
  }
  function uuid() {
    try {
      if (window.crypto && typeof window.crypto.randomUUID === 'function') return window.crypto.randomUUID();
    } catch (e) { /* roi ve du phong */ }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      var r = Math.random() * 16 | 0;
      return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });
  }
  function lastSeenKey() { return 'v2s_chat_lastseen_' + state.room; }
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
  function fmtDate(iso) {
    try {
      var d = new Date(iso);
      if (isNaN(d.getTime())) return '';
      return d.getDate() + '/' + (d.getMonth() + 1) + '/' + d.getFullYear();
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
  function maskChatText(t) {
    try {
      if (typeof window !== 'undefined' && window.Ver2Comments && typeof window.Ver2Comments.maskSensitive === 'function') return window.Ver2Comments.maskSensitive(t);
    } catch (e) { /* roi ve chu goc */ }
    return t;
  }
  async function rpc(name, args) {
    var c = client();
    if (!c || typeof c.rpc !== 'function') throw new Error('Chưa kết nối được Supabase.');
    var res = await c.rpc(name, args || {});
    if (res.error) throw res.error;
    return res.data;
  }

  /* --- Danh sach phong (CHAT-01: server-driven qua list_chat_rooms) --- */
  function roomList() {
    return state.rooms || ROOMS_FALLBACK;
  }
  function roomBySlug(slug) {
    var list = roomList();
    for (var i = 0; i < list.length; i++) {
      if (list[i].slug === slug) return list[i];
    }
    return null;
  }
  async function loadRooms() {
    try {
      var rows = await rpc('list_chat_rooms', {});
      if (rows && rows.length) {
        state.rooms = rows.map(function (r) {
          return { slug: r.slug, name: r.name, open: !!r.is_open };
        });
      }
    } catch (e) { /* giu danh sach du phong */ }
    renderRooms('');
  }
  function renderRooms(filter) {
    var list = $('chatRoomList');
    if (!list) return;
    var q = String(filter || '').trim().toLowerCase();
    var html = '';
    roomList().forEach(function (r) {
      if (q && r.name.toLowerCase().indexOf(q) === -1) return;
      html += '<li><button type="button" class="chat-room-item' + (r.slug === state.room ? ' active' : '') + '" data-slug="' + esc(r.slug) + '" data-open="' + (r.open ? '1' : '0') + '">'
        + '<span class="chat-room-name">' + esc(r.name) + '</span>'
        + (r.open ? '<span class="chat-room-open">Đang mở</span>' : '<span class="chat-room-locked">Sắp mở</span>')
        + '</button></li>';
    });
    list.innerHTML = html || '<li><p class="chat-empty">Không tìm thấy phòng.</p></li>';
    var btns = list.querySelectorAll('.chat-room-item');
    for (var i = 0; i < btns.length; i++) {
      btns[i].addEventListener('click', onRoomClick);
    }
  }
  function onRoomClick(ev) {
    var btn = ev.currentTarget;
    var open = btn.getAttribute('data-open') === '1';
    var slug = btn.getAttribute('data-slug');
    if (!open) {
      showHint('Phòng này sẽ mở khi hệ thống phân quyền và kiểm duyệt đã sẵn sàng.');
      return;
    }
    switchRoom(slug);
  }
  function switchRoom(slug) {
    if (slug === state.room) { openConversation(); return; }
    var r = roomBySlug(slug);
    if (!r || !r.open) return;
    state.room = slug;
    state.msgs = [];
    state.seenIds = {};
    state.loadedCount = 0;
    state.hasMore = true;
    state.unread = 0;
    clearReply();
    updateRoomHead();
    renderRooms('');
    renderMessages();
    loadInitial();
    openConversation();
  }
  function updateRoomHead() {
    var r = roomBySlug(state.room);
    var title = $('chatRoomTitle');
    var note = $('chatRoomNote');
    var input = $('chatPageInput');
    if (title) title.textContent = r ? r.name : 'Chat tổng';
    if (note) note.textContent = ROOM_NOTES[state.room] || 'Trò chuyện chung toàn cộng đồng.';
    if (input) input.setAttribute('placeholder', 'Nhắn tin trong ' + (r ? r.name : 'Chat tổng') + '…');
  }
  function openConversation() {
    var app = $('chatApp');
    if (app) app.classList.add('room-open');
    scrollToBottom(true);
  }
  function closeConversation() {
    var app = $('chatApp');
    if (app) app.classList.remove('room-open');
  }

  /* --- Tin nhan --- */
  function avatarHtml(m) {
    /* v371 (20/11/2026, B-20261120-05): avatar cũng là link tới hồ sơ
       (như tên) — trước đây chỉ có tên là link, avatar không bấm được dù
       v364 báo "bấm tên/avatar → hồ sơ". Chỉ link khi RPC trả username. */
    var inner;
    if (m.avatar_url) {
      inner = '<div class="chat-avatar"><img src="' + esc(m.avatar_url) + '" alt="" loading="lazy" referrerpolicy="no-referrer"></div>';
    } else {
      inner = '<div class="chat-avatar">' + esc(initials(m.author_name)) + '</div>';
    }
    if (m.author_username) {
      return '<a class="chat-avatar-link" href="/nguoi-dung.html?u=' + encodeURIComponent(m.author_username) + '">' + inner + '</a>';
    }
    return inner;
  }
  function nameHtml(m) {
    /* CHAT-01: bam ten/avatar -> ho so (chi khi RPC tra username). */
    var name = esc(m.author_name || 'Khách');
    if (m.author_username) {
      return '<a class="chat-name-link" href="/nguoi-dung.html?u=' + encodeURIComponent(m.author_username) + '"><b>' + name + '</b></a>';
    }
    return '<b>' + name + '</b>';
  }
  function messageHtml(m) {
    var kind = m.author_kind || 'user';
    var tag = kind === 'admin' ? '<span class="chat-tag">QUẢN TRỊ</span>'
      : (kind === 'ai' ? '<span class="chat-tag">AI</span>' : '');
    var lv = (typeof m.level === 'number' && m.level > 0) ? m.level : 1;
    var verified = m.is_verified ? ' <span class="verified" title="Đã xác minh đăng ký">✓</span>' : '';
    var quote = '';
    if (m.parent_id && (m.reply_to_author || m.reply_to_body)) {
      quote = '<div class="chat-reply-quote"><b>' + esc(m.reply_to_author || 'Thành viên') + '</b> '
        + esc(m.reply_to_body || '') + '</div>';
    }
    var own = state.myId && m.author_id && m.author_id === state.myId;
    var actions = '<div class="chat-msg-actions">'
      + '<button type="button" class="chat-msg-action" data-chat-action="reply" data-msg-id="' + esc(m.id) + '">Trả lời</button>';
    if (own) {
      actions += '<button type="button" class="chat-msg-action danger" data-chat-action="delete" data-msg-id="' + esc(m.id) + '">Xóa</button>';
    } else {
      actions += '<button type="button" class="chat-msg-action" data-chat-action="report" data-msg-id="' + esc(m.id) + '">Báo cáo</button>'
        + '<button type="button" class="chat-msg-action danger" data-chat-action="block" data-msg-id="' + esc(m.id) + '" data-author-id="' + esc(m.author_id || '') + '">Chặn</button>';
    }
    actions += '</div>';
    return '<div class="chat-msg"' + (m.id ? ' id="chat-msg-' + m.id + '"' : '') + '>'
      + avatarHtml(m)
      + '<div class="chat-body"><div class="chat-meta">' + nameHtml(m)
      + tag + ' <span class="' + lvClass(lv) + '">Lv.' + lv + '</span>'
      + roleBadge(m.author_role) + verified + ' · ' + esc(fmtTime(m.created_at))
      + ' <span title="' + esc(fmtDate(m.created_at)) + '">' + esc(fmtDate(m.created_at)) + '</span></div>'
      + quote
      + '<p class="chat-text">' + linkifyText(esc(maskChatText(m.body || ''))) + '</p>' // v370 (B-20261120-08): URL thành link bấm được
      + actions + '</div></div>';
  }
  function sortAsc(rows) {
    return rows.slice().sort(function (a, b) {
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    });
  }
  function mergeRows(rows) {
    var added = 0;
    (rows || []).forEach(function (m) {
      if (!m || !m.id || state.seenIds[m.id]) return;
      state.seenIds[m.id] = 1;
      state.msgs.push(m);
      added++;
    });
    if (added) state.msgs = sortAsc(state.msgs);
    return added;
  }
  function renderMessages() {
    var list = $('chatPageList');
    if (!list) return;
    if (!state.msgs.length) {
      list.innerHTML = '<p class="chat-empty">Chưa có tin nhắn — hãy là người đầu tiên trò chuyện.</p>';
      return;
    }
    var html = '';
    state.msgs.forEach(function (m) { html += messageHtml(m); });
    list.innerHTML = html;
    updateLoadOlder();
    updateJumpBtn();
  }
  function isAtBottom(wrap) {
    if (!wrap) return true;
    return wrap.scrollHeight - wrap.scrollTop - wrap.clientHeight < 40;
  }
  function scrollToBottom(force) {
    var wrap = $('chatPageListWrap');
    if (!wrap) return;
    if (force || state.atBottom) {
      try { wrap.scrollTop = wrap.scrollHeight; } catch (e) { /* bo qua */ }
    }
    updateJumpBtn();
  }
  function updateJumpBtn() {
    var btn = $('chatPageJump');
    if (!btn) return;
    btn.hidden = state.atBottom;
  }
  function updateLoadOlder() {
    var btn = $('chatLoadOlder');
    if (!btn) return;
    btn.hidden = !state.hasMore || !state.msgs.length;
  }
  function updateUnreadBadge() {
    var badge = $('chatUnreadBadge');
    if (!badge) return;
    badge.hidden = state.unread <= 0;
    badge.textContent = state.unread > 99 ? '99+' : String(state.unread);
  }
  function markSeen() {
    state.unread = 0;
    updateUnreadBadge();
    try {
      if (state.msgs.length) {
        window.localStorage.setItem(lastSeenKey(), state.msgs[state.msgs.length - 1].id);
      }
    } catch (e) { /* bo qua */ }
  }

  async function loadInitial() {
    var list = $('chatPageList');
    try {
      var rows = await rpc('get_chat_messages', { p_room_slug: state.room, p_limit: PAGE, p_offset: 0 });
      state.msgs = [];
      state.seenIds = {};
      state.loadedCount = (rows || []).length;
      state.hasMore = state.loadedCount >= PAGE;
      mergeRows(rows || []);
      renderMessages();
      scrollToBottom(true);
      markSeen();
    } catch (e) {
      if (list && !list.querySelector('.chat-msg')) {
        list.innerHTML = '<p class="chat-empty">Chưa tải được tin nhắn, sẽ thử lại sau.</p>';
      }
    }
  }
  async function loadOlder() {
    if (state.loadingOlder || !state.hasMore) return;
    state.loadingOlder = true;
    var wrap = $('chatPageListWrap');
    var prevHeight = wrap ? wrap.scrollHeight : 0;
    var prevTop = wrap ? wrap.scrollTop : 0;
    try {
      var rows = await rpc('get_chat_messages', { p_room_slug: state.room, p_limit: PAGE, p_offset: state.loadedCount });
      if (!rows || !rows.length) { state.hasMore = false; updateLoadOlder(); return; }
      state.loadedCount += rows.length;
      if (rows.length < PAGE) state.hasMore = false;
      var before = state.msgs.length;
      mergeRows(rows);
      if (state.msgs.length !== before) {
        renderMessages();
        if (wrap) { try { wrap.scrollTop = prevTop + (wrap.scrollHeight - prevHeight); } catch (e) { /* bo qua */ } }
      }
    } catch (e) {
      showHint('Chưa tải được tin cũ, thử lại sau.');
    } finally {
      state.loadingOlder = false;
    }
  }
  async function loadNew() {
    try {
      var rows = await rpc('get_chat_messages', { p_room_slug: state.room, p_limit: 10, p_offset: 0 });
      var added = mergeRows(rows || []);
      if (!added) return;
      var wasBottom = state.atBottom;
      renderMessages();
      if (wasBottom) { scrollToBottom(true); markSeen(); }
      else { state.unread += added; updateUnreadBadge(); }
    } catch (e) { /* polling sau se thu lai */ }
  }

  /* --- Top tuong tac (tai dung get_home_chat_top) --- */
  var TEST_TOP_NAMES = ['anh nguyễn', 'bình trần', 'qa test 1800'];
  function topTier(r) {
    if (!r) return 0;
    if (r.is_bot === true || r.author_role === 'bot') return 2;
    var n = (r.author_name || '').toLowerCase();
    if (n.indexOf('bot') !== -1 || n.indexOf('🤖') !== -1) return 2;
    if (r.is_test === true) return 1;
    if (n.indexOf('test') !== -1 || n.indexOf('qa test') !== -1) return 1;
    for (var i = 0; i < TEST_TOP_NAMES.length; i++) {
      if (n === TEST_TOP_NAMES[i]) return 1;
    }
    return 0;
  }
  async function loadTop() {
    var box = $('chatPageTop');
    if (!box) return;
    try {
      var rows = await rpc('get_home_chat_top', { p_limit: 10 });
      if (!rows || !rows.length) {
        box.innerHTML = '<p class="chat-empty">Chưa có tương tác hôm nay.</p>';
        return;
      }
      rows = rows.slice().sort(function (a, b) {
        var ta = topTier(a), tb = topTier(b);
        if (ta !== tb) return ta - tb;
        return (b.interact_count || 0) - (a.interact_count || 0);
      });
      var html = '';
      rows.forEach(function (r, i) {
        var rank = i + 1;
        var rankHtml = rank === 1 ? '<span class="top-rank r1">👑</span>'
          : '<span class="top-rank r' + (rank <= 3 ? rank : '') + '">' + rank + '</span>';
        var role = (r.is_bot === true || r.author_role === 'bot') ? '🤖 Bot'
          : (r.author_role === 'shop' ? 'Chủ Shop' : (r.author_role === 'model' ? 'Mẫu Live' : 'Thành viên'));
        var lv = (typeof r.level === 'number' && r.level > 0) ? r.level : 1;
        html += '<div class="top-row' + (rank === 1 ? ' top1' : '') + '">' + rankHtml
          + '<div class="top-name"><b>' + esc(r.author_name || 'Khách') + ' <span class="' + lvClass(lv) + '">Lv.' + lv + '</span></b>'
          + '<span>' + esc(role) + '</span></div>'
          + '<span class="top-count">' + esc(r.interact_count) + '</span></div>';
      });
      box.innerHTML = html;
    } catch (e) {
      if (!box.querySelector('.top-row')) box.innerHTML = '<p class="chat-empty">Chưa tải được bảng xếp hạng.</p>';
    }
  }

  /* --- Gui tin (CHAT-01: post_chat_message + tra loi + idempotency) --- */
  function showHint(text) {
    var hint = $('chatPageHint');
    if (!hint) return;
    hint.textContent = text || '';
    hint.hidden = !text;
  }
  function updateCount() {
    var input = $('chatPageInput'), count = $('chatPageCount');
    if (!input || !count) return;
    count.textContent = (input.value || '').length + '/' + MAX_BODY;
  }
  function setReply(m) {
    state.replyTo = m ? { id: m.id, author_name: m.author_name, body: m.body } : null;
    var bar = $('chatReplyBar');
    if (!bar) return;
    if (state.replyTo) {
      var q = $('chatReplyQuote');
      if (q) q.innerHTML = '<b>' + esc(state.replyTo.author_name || 'Thành viên') + '</b> ' + esc((state.replyTo.body || '').slice(0, 80));
      bar.hidden = false;
      var input = $('chatPageInput');
      if (input) input.focus();
    } else {
      bar.hidden = true;
    }
  }
  function clearReply() { setReply(null); }
  async function sendMessage() {
    var input = $('chatPageInput'), btn = $('chatPageSend');
    if (!input || state.sending) return;
    var body = (input.value || '').trim();
    if (!body) return;
    if (body.length > MAX_BODY) { showHint('Tin nhắn tối đa ' + MAX_BODY + ' ký tự.'); return; }
    state.sending = true;
    if (btn) { btn.disabled = true; btn.textContent = 'Đang gửi…'; }
    showHint('');
    try {
      await rpc('post_chat_message', {
        p_room_slug: state.room,
        p_body: body,
        p_parent_id: state.replyTo ? state.replyTo.id : null,
        p_client_msg_id: uuid()
      });
      input.value = '';
      updateCount();
      clearReply();
      await loadNew();
      scrollToBottom(true);
    } catch (e) {
      var msg = String((e && e.message) || e || '');
      if (/Cần đăng nhập/i.test(msg)) showHint('Cần đăng nhập để gửi tin.');
      else if (/Gửi quá nhanh/i.test(msg)) showHint('Gửi quá nhanh, thử lại sau vài giây.');
      else if (/tối đa 2000/i.test(msg)) showHint('Tin nhắn tối đa 2000 ký tự.');
      else if (/khóa chat/i.test(msg)) showHint('Tài khoản đang bị khóa chat tạm thời.');
      else if (/60 tin/i.test(msg)) showHint('Đã gửi quá 60 tin trong 1 giờ, thử lại sau.');
      else showHint('Chưa gửi được — bấm Gửi lại để thử.');
      if (btn) btn.textContent = 'Gửi lại';
    } finally {
      state.sending = false;
      if (btn) {
        btn.disabled = false;
        if (btn.textContent !== 'Gửi lại') btn.textContent = 'Gửi';
      }
    }
  }

  /* --- Hanh dong tren tin (CHAT-01): xoa tin minh / bao cao / chan.
     Xac nhan 2 buoc ngay tren nut (mau delete-draft/delete-task o
     js/admin.js) — KHONG dung window.confirm/window.prompt. */
  function findMsg(id) {
    for (var i = 0; i < state.msgs.length; i++) {
      if (state.msgs[i].id === id) return state.msgs[i];
    }
    return null;
  }
  function twoStep(btn, label) {
    if (btn.getAttribute('data-confirm') === '1') {
      btn.removeAttribute('data-confirm');
      btn.textContent = label;
      return true;
    }
    btn.setAttribute('data-confirm', '1');
    btn.textContent = 'Chắc chắn?';
    btn.classList.add('confirm');
    setTimeout(function () {
      if (btn.getAttribute('data-confirm') === '1') {
        btn.removeAttribute('data-confirm');
        btn.textContent = label;
        btn.classList.remove('confirm');
      }
    }, 5000);
    return false;
  }
  async function deleteOwn(btn) {
    var id = btn.getAttribute('data-msg-id');
    if (!twoStep(btn, 'Xóa')) return;
    btn.disabled = true;
    try {
      await rpc('delete_my_chat_message', { p_message_id: id });
      state.msgs = state.msgs.filter(function (m) { return m.id !== id; });
      delete state.seenIds[id];
      renderMessages();
      showHint('Đã xóa tin của bạn.');
    } catch (e) {
      showHint('Chưa xóa được tin, thử lại sau.');
    } finally {
      btn.disabled = false;
    }
  }
  async function reportMsg(btn) {
    var id = btn.getAttribute('data-msg-id');
    if (!twoStep(btn, 'Báo cáo')) return;
    btn.disabled = true;
    try {
      await rpc('report_chat_message', { p_message_id: id, p_reason: '' });
      showHint('Đã gửi báo cáo, quản trị sẽ xem xét.');
    } catch (e) {
      showHint('Chưa gửi được báo cáo, thử lại sau.');
    } finally {
      btn.disabled = false;
    }
  }
  async function blockUser(btn) {
    var authorId = btn.getAttribute('data-author-id');
    if (!authorId) return;
    if (!twoStep(btn, 'Chặn')) return;
    btn.disabled = true;
    try {
      await rpc('block_chat_user', { p_blocked_id: authorId });
      showHint('Đã chặn người dùng này, tin của họ sẽ không hiện với bạn nữa.');
      loadInitial();
    } catch (e) {
      showHint('Chưa chặn được, thử lại sau.');
    } finally {
      btn.disabled = false;
    }
  }
  function onListClick(ev) {
    var btn = ev.target && ev.target.closest ? ev.target.closest('[data-chat-action]') : null;
    if (!btn) return;
    var action = btn.getAttribute('data-chat-action');
    var id = btn.getAttribute('data-msg-id');
    var m = findMsg(id);
    if (action === 'reply') {
      if (m) setReply(m);
    } else if (action === 'delete') {
      deleteOwn(btn);
    } else if (action === 'report') {
      reportMsg(btn);
    } else if (action === 'block') {
      blockUser(btn);
    }
  }

  /* --- Nut header (v361): dong bo chip tai khoan tren trang chat --- */
  function displayNameFromSession(user) {
    var meta = (user && user.user_metadata) || {};
    var n = String(meta.full_name || meta.name || '').trim();
    if (n) return n;
    var email = (user && user.email) || '';
    return email ? email.split('@')[0] : 'Trang của tôi';
  }
  function syncHeader(user) {
    /* V20HeaderRefresh (js/app.js) khong co tren trang nay vi trang chat
       khong nap app.js/data.js — chip tai khoan o header khong tu doi
       thanh ten + xu khi dang nhap. Dong bo thu cong o day: da dang nhap
       -> ten (+ so xu qua reward.js neu co), bam vao mo Trang cua toi;
       khach -> nut Dang Nhap nhu cu. */
    var btn = document.querySelector('.site-head .btn.btn-primary.btn-sm');
    if (!btn) return;
    if (user) {
      var uid = user.id || null;
      var name = displayNameFromSession(user);
      var balTxt = '';
      /* v279 (P3-4): nhu header chinh (js/app.js renderHeaderLabel) — tach
         ten + so xu thanh 2 span de ten dai khong che mat so xu. */
      var render = function () {
        if (balTxt) btn.innerHTML = '<span class="v2s-hdr-name">' + esc(name) + '</span><span class="v2s-hdr-bal">' + esc(balTxt) + '</span>';
        else btn.textContent = name;
      };
      btn.textContent = name;
      btn.setAttribute('href', '/trang-cua-toi.html');
      btn.setAttribute('title', 'Mở Trang của tôi');
      var R = (typeof window !== 'undefined' && window.Ver2Reward) ? window.Ver2Reward : null;
      if (R && typeof R.getMyPointsBalanceResult === 'function') {
        R.getMyPointsBalanceResult().then(function (r) {
          if (state.myId !== uid) return; // da doi phien — khong ghi de
          if (r && r.ok) { balTxt = ' · ' + (Number(r.balance) || 0) + ' xu'; render(); }
        }).catch(function () { /* giu ten khong so du */ });
      }
      /* v278 (P3-5, vong 3 24/11): metadata khong co ten that thi hoi them
         profiles.full_name / shop_profiles.shop_name nhu header chinh
         (js/app.js apply) — khong thi trang chat hien ten dang email
         (nguyenthilan2411) thay vi ten hien thi (Nguyen Thi Lan). Hien tam
         ten email truoc, lookup ve thi doi ten (giu nguyen so xu neu co). */
      var meta = (user && user.user_metadata) || {};
      var hasMetaName = String(meta.full_name || meta.name || '').trim() !== '';
      var M = (typeof window !== 'undefined' && window.McLivestreamAPI) ? window.McLivestreamAPI : null;
      if (!hasMetaName && M && typeof M.fetchMyProfile === 'function') {
        M.fetchMyProfile().then(function (p) {
          if (state.myId !== uid) return;
          var n = (p && p.full_name) ? String(p.full_name).trim() : '';
          if (n) { name = n; render(); return; }
          if (typeof M.fetchMyShopProfile === 'function') {
            M.fetchMyShopProfile().then(function (s) {
              if (state.myId !== uid) return;
              var sn = (s && s.shop_name) ? String(s.shop_name).trim() : '';
              if (sn) { name = sn; render(); }
            }).catch(function () { /* giu ten email */ });
          }
        }).catch(function () { /* giu ten email */ });
      }
    } else {
      btn.textContent = 'Đăng Nhập';
      btn.setAttribute('href', '/dang-nhap.html?next=/cong-dong/chat');
      btn.removeAttribute('title');
    }
  }

  /* --- Auth: khach chi thay loi moi, KHONG goi RPC doc tin --- */
  async function refreshAuth() {
    var invite = $('chatGuestInvite'), app = $('chatApp');
    var A = authUI();
    var loggedIn = false;
    var user = null;
    if (A && typeof A.getSession === 'function') {
      try {
        var s = await A.getSession();
        user = (s && s.user) || null;
        loggedIn = !!user;
      } catch (e) { loggedIn = false; user = null; }
    }
    state.loggedIn = loggedIn;
    state.myId = user ? user.id : null;
    syncHeader(user);
    if (invite) invite.hidden = loggedIn;
    if (app) app.hidden = !loggedIn;
    if (loggedIn) {
      updateRoomHead();
      loadRooms();
      loadInitial();
      loadTop();
      setupRealtime();
      if (state.pollTimer) clearInterval(state.pollTimer);
      state.pollTimer = setInterval(function () { loadNew(); loadTop(); }, POLL_MS);
    } else {
      if (state.channel) { try { state.channel.unsubscribe(); } catch (e) { /* bo qua */ } state.channel = null; }
      if (state.pollTimer) { clearInterval(state.pollTimer); state.pollTimer = null; }
    }
  }
  function setupRealtime() {
    var c = client();
    if (!c || typeof c.channel !== 'function') return;
    try {
      if (state.channel) { try { state.channel.unsubscribe(); } catch (e) { /* bo qua */ } }
      state.channel = c.channel('chat-page-room')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages' }, function () {
          loadNew();
        })
        .subscribe();
    } catch (e) { /* Realtime khong bat buoc — polling 60s van chay */ }
  }

  function init() {
    if (!$('chatApp') && !$('chatGuestInvite')) return;
    renderRooms('');
    updateRoomHead();
    var search = $('chatRoomSearch');
    if (search) search.addEventListener('input', function () { renderRooms(search.value); });
    var back = $('chatBackBtn');
    if (back) back.addEventListener('click', closeConversation);
    var older = $('chatLoadOlder');
    if (older) older.addEventListener('click', loadOlder);
    var jump = $('chatPageJump');
    if (jump) jump.addEventListener('click', function () { scrollToBottom(true); markSeen(); });
    var list = $('chatPageList');
    if (list) list.addEventListener('click', onListClick);
    var replyCancel = $('chatReplyCancel');
    if (replyCancel) replyCancel.addEventListener('click', clearReply);
    var wrap = $('chatPageListWrap');
    if (wrap) wrap.addEventListener('scroll', function () {
      state.atBottom = isAtBottom(wrap);
      if (state.atBottom) markSeen();
      updateJumpBtn();
    });
    var input = $('chatPageInput');
    if (input) {
      input.addEventListener('input', updateCount);
      input.addEventListener('keydown', function (ev) {
        if (ev.key === 'Enter' && !ev.shiftKey) { ev.preventDefault(); sendMessage(); }
      });
    }
    var send = $('chatPageSend');
    if (send) send.addEventListener('click', sendMessage);
    updateCount();
    refreshAuth();
    var A = authUI();
    if (A && typeof A.onSessionChange === 'function') {
      try { A.onSessionChange(function () { refreshAuth(); }); } catch (e) { /* bo qua */ }
    }
    if (window.matchMedia && window.matchMedia('(max-width:720px)').matches) {
      /* Mobile: mo trang thi thay danh sach phong truoc. */
      closeConversation();
    } else {
      openConversation();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
