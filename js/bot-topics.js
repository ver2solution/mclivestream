/* v356 (19/11/2026, anh Thọ 14:10): Hàng chọn chủ đề Bot tóm tắt tin trên
   top mục chat cộng đồng trang chủ — lối tắt tới mục "Bot tóm tắt tin" ở
   Trang của tôi (v325). Dùng CHUNG 7 chủ đề + localStorage v2s_bot_prefs +
   API window.V2SChatBots (getPrefs/savePrefs/topics) của js/chat-bots.js;
   KHÔNG tạo hệ chủ đề thứ hai (10 chuyên mục bài viết ở bản demo chỉ là
   minh họa — Bot thật chỉ đọc 7 chủ đề này). Khách chưa đăng nhập thấy hàng
   mờ + nút Đăng nhập; đã đăng nhập thấy chip chọn chủ đề + Lưu / Tắt tóm
   tắt. Lưu xong bắn event v2s-bot-prefs-changed để khung chat đổi theo ngay
   (engine đọc lại lựa chọn mỗi lần đăng tin, tối đa 15 giây). Không tự
   cuộn (luật v213); không dùng window.confirm/window.prompt. */
(function () {
  'use strict';

  var PREFS_KEY = 'v2s_bot_prefs';
  /* Dự phòng khi js/chat-bots.js chưa kịp tải — cùng 7 chủ đề, cùng nhãn. */
  var FALLBACK_TOPICS = [
    { id: 'huong-dan', label: 'Hướng dẫn dùng web' },
    { id: 'tin-hot', label: 'Tin mới hot' },
    { id: 'an-choi', label: 'Nơi ăn chơi' },
    { id: 'nghe-nghiep', label: 'Phát triển nghề nghiệp' },
    { id: 'tang-don', label: 'Tăng đơn hàng' },
    { id: 'tai-chinh', label: 'Quản lý tài chính cá nhân' },
    { id: 'doanh-nghiep', label: 'Tổ chức doanh nghiệp' }
  ];

  function $(id) { return document.getElementById(id); }
  function authUI() { return (typeof window !== 'undefined' && window.V2SAuthUI) ? window.V2SAuthUI : null; }
  function botsAPI() { return (typeof window !== 'undefined' && window.V2SChatBots) ? window.V2SChatBots : null; }

  function topics() {
    var b = botsAPI();
    return (b && b.topics && b.topics.length) ? b.topics : FALLBACK_TOPICS;
  }
  function defaultPrefs() {
    var t = {};
    topics().forEach(function (x) { t[x.id] = true; });
    return { enabled: true, topics: t };
  }
  function readPrefs() {
    var b = botsAPI();
    if (b && typeof b.getPrefs === 'function') {
      try { return b.getPrefs(); } catch (e) { /* rơi xuống đọc trực tiếp */ }
    }
    try {
      var raw = window.localStorage.getItem(PREFS_KEY);
      if (!raw) return defaultPrefs();
      var p = JSON.parse(raw);
      if (!p || typeof p !== 'object') return defaultPrefs();
      var out = defaultPrefs();
      if (typeof p.enabled === 'boolean') out.enabled = p.enabled;
      if (p.topics && typeof p.topics === 'object') {
        topics().forEach(function (x) {
          if (typeof p.topics[x.id] === 'boolean') out.topics[x.id] = p.topics[x.id];
        });
      }
      return out;
    } catch (e) { return defaultPrefs(); }
  }
  function writePrefs(p) {
    var b = botsAPI();
    if (b && typeof b.savePrefs === 'function') {
      try { b.savePrefs(p); } catch (e) { /* bỏ qua */ }
    } else {
      try { window.localStorage.setItem(PREFS_KEY, JSON.stringify(p)); } catch (e) { /* bỏ qua */ }
    }
    /* Cùng tab: báo engine chat-bots vẽ lại ngay (như Trang của tôi). */
    try { window.dispatchEvent(new Event('v2s-bot-prefs-changed')); } catch (e) { /* bỏ qua */ }
  }

  var draft = null; /* bản nháp chưa lưu: { enabled, topics } */
  var msgTimer = null;

  function showMsg(text, sticky) {
    var m = $('botTopicsMsg');
    if (!m) return;
    m.textContent = text || '';
    if (msgTimer) { clearTimeout(msgTimer); msgTimer = null; }
    if (text && !sticky) {
      msgTimer = setTimeout(function () { if (m) m.textContent = ''; }, 4000);
    }
  }

  function renderChips() {
    var box = $('botTopicsChips');
    if (!box || !draft) return;
    var html = '';
    topics().forEach(function (t) {
      var on = !!draft.topics[t.id];
      html += '<button type="button" class="bot-topic-chip' + (on ? ' on' : '') + '" data-bot-topic="'
        + t.id + '" aria-pressed="' + (on ? 'true' : 'false') + '"' + (draft.enabled ? '' : ' disabled') + '>'
        + t.label + '</button>';
    });
    box.innerHTML = html;
    box.querySelectorAll('[data-bot-topic]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        if (!draft.enabled) return;
        var id = btn.getAttribute('data-bot-topic');
        draft.topics[id] = !draft.topics[id];
        renderChips();
      });
    });
    var saveBtn = $('botTopicsSave');
    if (saveBtn) saveBtn.disabled = !draft.enabled;
    var toggleBtn = $('botTopicsToggle');
    if (toggleBtn) toggleBtn.textContent = draft.enabled ? 'Tắt tóm tắt' : 'Bật lại tóm tắt';
  }

  function countSelected() {
    var n = 0;
    topics().forEach(function (t) { if (draft && draft.topics[t.id]) n++; });
    return n;
  }

  function saveDraft() {
    if (!draft || !draft.enabled) return;
    writePrefs({ enabled: true, topics: draft.topics });
    var n = countSelected();
    showMsg(n > 0
      ? 'Đã lưu: bot sẽ tóm tắt theo ' + n + ' chủ đề bạn đã chọn.'
      : 'Đã lưu: chưa chọn chủ đề nào nên bot sẽ không tóm tắt.');
  }

  function toggleBot() {
    if (!draft) return;
    if (draft.enabled) {
      draft.enabled = false;
      writePrefs({ enabled: false, topics: draft.topics });
      showMsg('Đã tắt bot tóm tắt — khung chat chỉ hiện tin thật của người dùng.');
    } else {
      /* Bật lại: nếu chưa chọn chủ đề nào thì chọn hết (tránh trạng thái
         "bật" nhưng không có chủ đề nào để tóm tắt). */
      if (countSelected() === 0) {
        topics().forEach(function (t) { draft.topics[t.id] = true; });
      }
      draft.enabled = true;
      writePrefs({ enabled: true, topics: draft.topics });
      showMsg('Đã bật lại bot tóm tắt.');
    }
    renderChips();
  }

  function showState(loggedIn) {
    var row = $('botTopicsRow');
    var guest = $('botTopicsGuest');
    var user = $('botTopicsUser');
    if (!row || !guest || !user) return;
    if (loggedIn) {
      draft = readPrefs();
      renderChips();
      guest.hidden = true;
      user.hidden = false;
      row.hidden = false;
    } else {
      guest.hidden = false;
      user.hidden = true;
      row.hidden = false;
    }
  }

  async function refreshAuth() {
    var A = authUI();
    if (!A || typeof A.getSession !== 'function') { showState(false); return; }
    try {
      var s = await A.getSession();
      showState(!!(s && s.user));
    } catch (e) { showState(false); }
  }

  function init() {
    var row = $('botTopicsRow');
    if (!row) return;
    var saveBtn = $('botTopicsSave');
    if (saveBtn) saveBtn.addEventListener('click', saveDraft);
    var toggleBtn = $('botTopicsToggle');
    if (toggleBtn) toggleBtn.addEventListener('click', toggleBot);
    refreshAuth();
    var A = authUI();
    if (A && typeof A.onSessionChange === 'function') {
      try { A.onSessionChange(function () { refreshAuth(); }); } catch (e) { /* bỏ qua */ }
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
