/* BXH-02 — Trang Bảng xếp hạng tương tác /bang-xep-hang (19/11/2026).
   Thiết kế: hidden_files/thiet-ke-bang-xep-hang-2026-11-18.md §3–§5 + §13
   (Q1 đồng bộ tổng-trước-tầng-phá-tie, Q2 24 hạng/trang, Q3 sitemap).
   Gọi RPC get_full_leaderboard (BXH-01): rank toàn cục, chat_count /
   comment_count tách riêng, total_rows. Trang đầu: bục Top 3 + 21 hàng
   bảng = 24 người; mỗi lần "Tải thêm" +24. Poll 60 giây như loadTop
   trang chủ; đổi bộ lọc reset về hạng 1. Tên hiển thị là chữ thường,
   KHÔNG phải link (chưa có username trong RPC — xem thiết kế §7).
   Không đưa dữ liệu demo giả: RPC lỗi hoặc 0 dòng thì hiện trạng thái
   trống/lỗi, không vẽ số mẫu. Không tự cuộn (v213): tải thêm chỉ chèn
   hàng, không scrollIntoView. RPC dùng await như js/community-chat.js
   (PostgrestBuilder chỉ có .then(), KHÔNG dùng .catch() — v341). */
(function () {
  'use strict';

  var RPC_NAME = 'get_full_leaderboard';
  var PAGE_SIZE = 24; /* Q2: 24 hạng/trang (bục 3 + bảng 21 ở trang đầu). */
  var POLL_MS = 60000;

  var state = {
    onlyReal: false,
    rows: [],        /* các dòng đã tải, đúng thứ tự hạng toàn cục */
    totalRows: 0,
    updatedAt: null,
    loading: false,
    loadedOnce: false
  };

  function api() { return (typeof window !== 'undefined' && window.McLivestreamAPI) ? window.McLivestreamAPI : null; }
  function client() { var a = api(); return (a && a.client) || null; }
  function $(id) { return document.getElementById(id); }
  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function lvClass(lv) {
    if (lv >= 5) return 'lv lv-gold';
    if (lv >= 3) return 'lv lv-green';
    return 'lv';
  }
  function fmtTime(d) {
    var h = d.getHours(); var m = d.getMinutes();
    return (h < 10 ? '0' + h : '' + h) + ':' + (m < 10 ? '0' + m : '' + m);
  }
  function tierOf(r) {
    if (r.is_bot === true || r.author_role === 'bot') return 2;
    if (r.is_test === true) return 1;
    return 0;
  }
  function tierLabel(t) { return t === 0 ? 'người thật' : (t === 1 ? 'Test' : 'Bot'); }
  function roleLabel(r) {
    if (r.is_bot === true || r.author_role === 'bot') return '🤖 Bot';
    if (r.is_test === true) return 'Test · tên thật';
    if (r.author_role === 'shop') return 'Chủ Shop';
    if (r.author_role === 'model') return 'Mẫu Live';
    return 'Thành viên';
  }

  async function rpc(name, args) {
    var c = client();
    if (!c || typeof c.rpc !== 'function') throw new Error('Chưa kết nối được Supabase.');
    var res = await c.rpc(name, args || {});
    if (res.error) throw res.error;
    return res.data;
  }

  function fetchPage(limit, offset) {
    return rpc(RPC_NAME, { p_limit: limit, p_offset: offset, p_only_real: state.onlyReal });
  }

  /* Tải lại từ hạng 1 tới số dòng đang hiển thị (poll 60s / đổi lọc).
     Đổi lọc thì reset về 24 dòng đầu. */
  async function refresh(reset) {
    if (state.loading) return;
    state.loading = true;
    var keep = reset ? PAGE_SIZE : Math.max(state.rows.length, PAGE_SIZE);
    try {
      var rows = await fetchPage(keep, 0);
      state.rows = rows || [];
      state.totalRows = state.rows.length ? (Number(state.rows[0].total_rows) || state.rows.length) : 0;
      state.updatedAt = new Date();
      state.loadedOnce = true;
      render();
    } catch (e) {
      renderError();
    } finally {
      state.loading = false;
    }
  }

  async function loadMore() {
    if (state.loading) return;
    if (state.rows.length >= state.totalRows) return;
    state.loading = true;
    var btn = $('lbMoreBtn');
    if (btn) btn.disabled = true;
    try {
      var rows = await fetchPage(PAGE_SIZE, state.rows.length);
      rows = rows || [];
      if (rows.length) {
        state.rows = state.rows.concat(rows);
        state.totalRows = Number(rows[0].total_rows) || state.totalRows;
        state.updatedAt = new Date();
        render();
      } else {
        state.totalRows = state.rows.length;
        render();
      }
    } catch (e) {
      renderError();
    } finally {
      state.loading = false;
      if (btn) btn.disabled = false;
    }
  }

  function podiumHtml(top3) {
    var order = [1, 0, 2]; /* hiển thị 2 – 1 – 3 (hạng 1 ở giữa, cao hơn) */
    var html = '';
    order.forEach(function (idx) {
      var r = top3[idx];
      if (!r) return;
      var rank = r.rank;
      var lv = (typeof r.level === 'number' && r.level > 0) ? r.level : 1;
      html += '<div class="lb-pod p' + rank + '">'
        + (rank === 1 ? '<span class="lb-crown" aria-hidden="true">👑</span>' : '')
        + '<div class="lb-medal">' + rank + '</div>'
        + '<div class="lb-pname">' + esc(r.author_name || 'Khách') + '</div>'
        + '<div class="lb-prole">' + esc(roleLabel(r)) + '</div>'
        + '<span class="' + lvClass(lv) + '">Lv.' + lv + '</span>'
        + '<div class="lb-total">' + esc(r.interact_count) + '<small>tổng tương tác</small></div>'
        + '<div class="lb-split">💬 <b>' + esc(r.chat_count) + '</b> tin chat · ✍️ <b>' + esc(r.comment_count) + '</b> bình luận</div>'
        + '</div>';
    });
    return html;
  }

  function rowHtml(r) {
    var lv = (typeof r.level === 'number' && r.level > 0) ? r.level : 1;
    return '<div class="lb-row"><div class="lb-rank">' + esc(r.rank) + '</div>'
      + '<div class="lb-who"><b>' + esc(r.author_name || 'Khách') + '</b>'
      + '<span>' + esc(roleLabel(r)) + '</span>'
      + '<span class="lb-m-break">💬 ' + esc(r.chat_count) + ' tin chat · ✍️ ' + esc(r.comment_count) + ' bình luận</span></div>'
      + '<span class="' + lvClass(lv) + '">Lv.' + lv + '</span>'
      + '<span class="lb-num lb-c-chat">' + esc(r.chat_count) + '</span>'
      + '<span class="lb-num lb-c-cmt">' + esc(r.comment_count) + '</span>'
      + '<span class="lb-total-col">' + esc(r.interact_count) + '</span></div>';
  }

  /* Ghi chú đồng hạng: chỉ hiện khi các dòng đang hiển thị có đồng tổng
     mà khác tầng (đúng luật Q1: tổng bằng nhau mới xét tầng). */
  function tieNoteHtml(rows) {
    var notes = [];
    var i = 0;
    while (i < rows.length) {
      var j = i + 1;
      while (j < rows.length && Number(rows[j].interact_count) === Number(rows[i].interact_count)) j++;
      if (j - i >= 2) {
        var group = rows.slice(i, j);
        var tiers = {};
        group.forEach(function (r) { tiers[tierOf(r)] = true; });
        if (Object.keys(tiers).length >= 2) {
          var parts = group.map(function (r) {
            return 'hạng ' + r.rank + ' (' + tierLabel(tierOf(r)) + ')';
          });
          notes.push('Đồng hạng ' + esc(rows[i].interact_count) + ' điểm: ' + parts.join(' xếp trên ') + ' — đúng thứ tự ưu tiên Người thật &gt; Test &gt; Bot.');
        }
      }
      i = j;
    }
    if (!notes.length) return '';
    return '<div class="lb-note">⚖️ <b>' + notes.join('<br>') + '</b></div>';
  }

  function render() {
    var rows = state.rows;
    var meta = $('lbMeta');
    if (meta) {
      meta.innerHTML = 'Đang có <b>' + esc(state.totalRows) + ' người</b> xếp hạng'
        + (state.updatedAt ? ' · Cập nhật lúc <b>' + esc(fmtTime(state.updatedAt)) + '</b>' : '')
        + ' · Tự cập nhật mỗi 60 giây';
    }
    var podium = $('lbPodium');
    var table = $('lbTable');
    var empty = $('lbEmpty');
    var err = $('lbError');
    if (err) err.hidden = true;
    if (!rows.length) {
      if (podium) { podium.innerHTML = ''; podium.hidden = true; }
      if (table) { table.hidden = true; }
      if (empty) empty.hidden = false;
      return;
    }
    if (empty) empty.hidden = true;
    var top3 = rows.slice(0, 3);
    var rest = rows.slice(3);
    if (podium) {
      podium.innerHTML = podiumHtml(top3);
      podium.hidden = false;
    }
    if (table) {
      var html = '<div class="lb-head"><div>Hạng</div><div>Người chơi</div><div>Cấp độ</div>'
        + '<div style="text-align:right">Tin chat hôm nay</div>'
        + '<div style="text-align:right">Bình luận đã duyệt</div>'
        + '<div style="text-align:right">Tổng</div></div>';
      rest.forEach(function (r) { html += rowHtml(r); });
      html += tieNoteHtml(rows);
      html += '<div class="lb-more"><button class="btn btn-primary" id="lbMoreBtn" type="button" data-track="bxh-tai-them">Tải thêm 24 hạng ↓</button>'
        + '<div class="lb-shown" id="lbShown"></div></div>';
      table.innerHTML = html;
      /* Không có hàng bảng (≤3 người): ẩn hẳn bảng, chỉ giữ bục. */
      table.hidden = (rest.length === 0);
      var btn = $('lbMoreBtn');
      if (btn) btn.addEventListener('click', loadMore);
      updateShown();
    }
  }

  function updateShown() {
    var shown = $('lbShown');
    if (shown) shown.textContent = 'Đang hiển thị ' + state.rows.length + ' / ' + state.totalRows + ' người';
    var btn = $('lbMoreBtn');
    if (btn) btn.style.display = (state.rows.length >= state.totalRows) ? 'none' : '';
  }

  function renderError() {
    var err = $('lbError');
    var meta = $('lbMeta');
    if (!state.loadedOnce) {
      /* Chưa có dữ liệu: hiện trạng thái lỗi thay cho bục + bảng. */
      var podium = $('lbPodium'); if (podium) podium.hidden = true;
      var table = $('lbTable'); if (table) table.hidden = true;
      var empty = $('lbEmpty'); if (empty) empty.hidden = true;
      if (err) err.hidden = false;
    } else if (meta && meta.innerHTML.indexOf('Chưa tải được dữ liệu mới') === -1) {
      /* Đã có dữ liệu: giữ nguyên bảng, chỉ ghi chú chưa cập nhật được. */
      meta.innerHTML += ' · Chưa tải được dữ liệu mới, sẽ thử lại sau.';
    }
  }

  function setFilter(onlyReal, btn) {
    if (state.onlyReal === onlyReal) return;
    state.onlyReal = onlyReal;
    var all = document.querySelectorAll('[data-lb-filter]');
    for (var i = 0; i < all.length; i++) all[i].classList.remove('active');
    if (btn) btn.classList.add('active');
    state.rows = [];
    state.totalRows = 0;
    refresh(true);
  }

  function init() {
    var allBtn = $('lbFilterAll');
    var realBtn = $('lbFilterReal');
    if (allBtn) allBtn.addEventListener('click', function () { setFilter(false, allBtn); });
    if (realBtn) realBtn.addEventListener('click', function () { setFilter(true, realBtn); });
    refresh(true);
    setInterval(function () { refresh(false); }, POLL_MS);
  }

  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
  }
})();
