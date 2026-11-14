/* M16 — Xu chung Ver2Solution ↔ Phật Pháp Online (09/11/2026, DRAFT).
   Cầu nối "2 sổ cái độc lập + 1 cầu nối", liên kết bằng email, chỉ xu
   KIẾM nối 1:1, xu NẠP không chuyển chéo (xem phuong-an-xu-doc-lap-
   dong-bo-2026-11-09.md). Module này CHỈ ĐỌC số dư qua RPC + GỌI RPC
   để chuyển/tiêu xu — KHÔNG tự cộng/trừ số dư, KHÔNG ghi trực tiếp
   vào points_ledger / wallet_accounts (nguyên tắc M5, giữ như
   js/reward.js). Mọi cộng/trừ qua RPC SECURITY DEFINER M16.
   - Số dư tách xu kiếm / xu nạp (M16): "Xu kiếm được: A" / "Xu nạp: B".
   - Hiển thị 3 dòng: "Xu Ver2Solution: A • Xu Phật Pháp: B • Tổng dùng
     được: A+B" + trạng thái bên kia + số âm theo mẫu thiết kế §5.3.
   - Nút chuyển liên web: gọi xu_cross_transfer_init (tối thiểu 10 xu,
     tối đa 100 xu/ngày pilot); bên kia bảo trì thì nút hiện "tạm dừng".
   - Lịch sử xu liên web: cả 2 sổ + nhãn "⏳ Chờ đồng bộ" cho
     offline_spend pending + mục "Số âm đang bù".
   - TIỀN CÚNG DƯỜNG KHÔNG ĐI QUA CẦU NỐI — module này không có code
     nào liên quan tới cúng dường/tùy hỷ.
   - Cầu nối tắt được bằng 1 cờ: XU_CHUNG_ENABLED=false thì mọi hàm
     trả {ok:false} và không gọi RPC (đúng lộ trình §6 thiết kế: cầu
     nối dùng 1 lần rồi bỏ khi có backend chung; xem thêm mục "quyết
     định đang chờ Rion" trong api-contract-cau-noi-xu-2026-11-09.md). */
(function () {
  'use strict';
  // Cờ tắt cầu nối (xem header): false = toàn bộ module đứng yên,
  // web chạy như chưa có M16 (chỉ xu local). Đổi 1 cờ để tắt/bật.
  var XU_CHUNG_ENABLED = true;
  var XFER_MIN = 10; // chuyển liên web tối thiểu 10 xu/lần (pilot)
  var XFER_DAILY_MAX = 100; // tối đa 100 xu/ngày/user (pilot)
  var OFFLINE_DAILY_MAX = 20; // hạn mức tiêu ngoại tuyến 20 xu/ngày
  var DEBT_REPAY_RATE = 0.5; // bù âm 50% số xu kiếm mới (§5.2)
  var DEBT_CAP = -50; // trần âm −50 xu (§5.2)
  // Loại ledger liên web (M16) hiển thị trong Lịch sử xu liên web.
  var CROSS_TYPES = ['game_earn', 'xfer_out_hold', 'xfer_in',
    'xfer_out_refund', 'offline_spend', 'offline_spend_settle',
    'debt_repay', 'debt_cleared'];
  var CROSS_LABELS = {
    game_earn: 'Xu game', xfer_out_hold: 'Chuyển liên web (đang khóa)',
    xfer_in: 'Nhận xu liên web', xfer_out_refund: 'Hoàn xu chuyển liên web',
    offline_spend: 'Tiêu ngoại tuyến', offline_spend_settle: 'Đồng bộ tiêu ngoại tuyến',
    debt_repay: 'Bù số âm', debt_cleared: 'Đã bù xong số âm'
  };

  function api() { return (typeof window !== 'undefined' && window.McLivestreamAPI) ? window.McLivestreamAPI : null; }
  function rpcErrorText(res) {
    if (!res) return 'Không rõ lỗi.';
    var e = res.error || res;
    return String((e && (e.message || e.code)) || e || 'Không rõ lỗi.');
  }
  // v222 (S1-1): phân biệt lỗi cầu nối CHƯA BẬT với lỗi mạng/lỗi khác.
  // M16 chưa chạy → PostgREST 404 PGRST202 "Could not find the function
  // public.xu_* ..." hoặc PostgREST 42703 cột sync_status chưa có (lịch
  // sử query points_ledger). Cả hai đều KHÔNG sửa được bằng "tải lại
  // trang" — hiện đúng thông báo "cầu nối chưa bật" + vô hiệu form
  // chuyển liên web, thay vì bắt người dùng tải lại vô ích.
  function bridgeErrorCode(res) {
    try {
      var e = (res && res.error) || res || {};
      var code = String(e.code || '');
      var msg = String(e.message || e || '');
      if (code === 'PGRST202' || msg.indexOf('Could not find the function') !== -1) return 'bridge_not_enabled';
      if (code === '42703' || msg.indexOf('sync_status does not exist') !== -1) return 'bridge_not_enabled';
    } catch (err) {}
    return null;
  }
  var BRIDGE_NOT_ENABLED_TEXT = 'Xu liên web chưa được bật — cầu nối đang chờ kích hoạt. Số dư xu ở web này vẫn dùng bình thường.';
  // v166 (C1/N1): đọc session qua V2SAuthUI khi có (1 nguồn đúng duy
  // nhất) — xem ghi chú ở js/comments.js.
  async function sessionUser() {
    var a = api(); if (!a) throw new Error('Chưa kết nối được Supabase, hãy thử lại sau.');
    var session = null;
    try {
      var A = (typeof window !== 'undefined') ? window.V2SAuthUI : null;
      // v222 (S1-1): getSession() đọc 1 lần có thể trả null khi GoTrue
      // chưa khôi phục xong session từ localStorage → form hiện sai
      // "Cần đăng nhập" dù đã đăng nhập. getSessionRobust thử lại tới
      // ~2 giây rồi mới kết luận null (chỉ chậm khi thật sự chưa đăng nhập).
      if (A && typeof A.getSessionRobust === 'function') session = await A.getSessionRobust(2000);
      else if (A && typeof A.getSession === 'function') session = await A.getSession();
    } catch (e) { session = null; }
    if (!session) session = await a.getSession();
    if (!session) throw new Error('Cần đăng nhập mới dùng được xu liên web.');
    return { api: a, user: session.user };
  }
  function newUuid() {
    try {
      if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
    } catch (e) {}
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      var r = Math.random() * 16 | 0;
      return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });
  }
  // Giờ HH:MM giờ VN từ ISO (vd "14:32"), ISO hỏng thì trả ''.
  function formatHhMm(iso) {
    try {
      var d = new Date(iso);
      if (isNaN(d.getTime())) return '';
      return new Intl.DateTimeFormat('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', hour: '2-digit', minute: '2-digit', hour12: false }).format(d);
    } catch (e) { return ''; }
  }
  function escapeHtml(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function firstRow(data) {
    if (Array.isArray(data)) return data[0] || null;
    return (data && typeof data === 'object') ? data : null;
  }

  // ---- RPC M16: chỉ đọc / gọi RPC, không tự cộng trừ ----
  // Số dư 2 bên: {mc_earn, mc_topup, pp_earn, pp_topup, debt,
  // total_usable, other_side_status}. RPC chưa chạy → {ok:false}.
  async function getBalances() {
    if (!XU_CHUNG_ENABLED) return { ok: false, error: 'Cầu nối xu liên web đang tắt.' };
    try {
      var s = await sessionUser();
      var res = await s.api.client.rpc('xu_get_balances', {});
      if (res.error) {
        var bc = bridgeErrorCode(res);
        if (bc) { try { console.warn('[xu-chung] getBalances: ' + bc, rpcErrorText(res)); } catch (e2) {} }
        return { ok: false, code: bc, error: rpcErrorText(res) };
      }
      var d = firstRow(res.data);
      if (!d) return { ok: false, error: 'Không đọc được số dư xu liên web.' };
      return {
        ok: true,
        mc_earn: Number(d.mc_earn) || 0, mc_topup: Number(d.mc_topup) || 0,
        pp_earn: Number(d.pp_earn) || 0, pp_topup: Number(d.pp_topup) || 0,
        debt: Number(d.debt) || 0,
        total_usable: Number(d.total_usable) || 0,
        other_side_status: String(d.other_side_status || 'bao_tri')
      };
    } catch (e) { return { ok: false, error: String((e && e.message) || e) }; }
  }
  // Trạng thái bên kia: {side, status, last_sync_at, last_sync_seq}.
  // status: 'song' | 'bao_tri' | 'chua_lien_ket'.
  async function getHealth() {
    if (!XU_CHUNG_ENABLED) return { ok: false, error: 'Cầu nối xu liên web đang tắt.' };
    try {
      var s = await sessionUser();
      var res = await s.api.client.rpc('xu_health_check', {});
      if (res.error) {
        var bc = bridgeErrorCode(res);
        if (bc) { try { console.warn('[xu-chung] getHealth: ' + bc, rpcErrorText(res)); } catch (e2) {} }
        return { ok: false, code: bc, error: rpcErrorText(res) };
      }
      var d = firstRow(res.data);
      if (!d) return { ok: false, error: 'Không kiểm tra được trạng thái bên kia.' };
      return {
        ok: true, side: String(d.side || 'phatphap'),
        status: String(d.status || 'bao_tri'),
        last_sync_at: d.last_sync_at || null,
        last_sync_seq: (d.last_sync_seq == null) ? null : Number(d.last_sync_seq)
      };
    } catch (e) { return { ok: false, error: String((e && e.message) || e) }; }
  }
  function healthText(h) {
    if (!h || !h.ok) return 'Phật Pháp Online: chưa kiểm tra được trạng thái.';
    var hhmm = h.last_sync_at ? formatHhMm(h.last_sync_at) : '';
    if (h.status === 'song') return 'Phật Pháp Online: đang hoạt động' + (hhmm ? ' (cập nhật lần cuối ' + hhmm + ')' : '') + '.';
    if (h.status === 'chua_lien_ket') return 'Phật Pháp Online: tài khoản chưa liên kết — liên kết bằng email để dùng xu liên web.';
    return 'Phật Pháp Online: đang bảo trì' + (hhmm ? ' (cập nhật lần cuối ' + hhmm + ')' : '') + ' — bạn vẫn tiêu được xu ở web này; xu bên kia sẽ dùng lại được khi kết nối.';
  }
  // Liên kết tài khoản bằng email của chính mình (RPC xu_link_account).
  async function linkAccount(email) {
    if (!XU_CHUNG_ENABLED) return { ok: false, error: 'Cầu nối xu liên web đang tắt.' };
    try {
      var s = await sessionUser();
      var res = await s.api.client.rpc('xu_link_account', { p_email: String(email || '').trim().toLowerCase() });
      if (res.error) return { ok: false, error: rpcErrorText(res) };
      return { ok: true, status: String(res.data || 'pending') };
    } catch (e) { return { ok: false, error: String((e && e.message) || e) }; }
  }
  // Chuyển xu liên web (MC → Phật Pháp, pilot): kiểm tra sức khỏe bên
  // kia trước — bên kia bảo trì thì KHÔNG gọi init, trả paused.
  // amount: số nguyên 10..100. Trả {ok, transfer_id} hoặc {ok:false,
  // code:'paused'|'invalid_amount'|..., error}.
  async function transferCrossWeb(amount) {
    if (!XU_CHUNG_ENABLED) return { ok: false, code: 'disabled', error: 'Cầu nối xu liên web đang tắt.' };
    var n = Math.floor(Number(amount));
    if (!n || n < XFER_MIN) return { ok: false, code: 'invalid_amount', error: 'Chuyển liên web tối thiểu 10 xu/lần.' };
    if (n > XFER_DAILY_MAX) return { ok: false, code: 'invalid_amount', error: 'Chuyển liên web tối đa 100 xu/ngày (pilot).' };
    var h = await getHealth();
    // v222 (S1-1): cầu nối chưa bật thì báo đúng ngay, khỏi gọi init
    // (gọi cũng chỉ 404) và khỏi hiện lỗi PostgREST tiếng Anh.
    if (!h.ok && h.code === 'bridge_not_enabled') {
      return { ok: false, code: 'bridge_not_enabled', error: 'Cầu nối xu liên web chưa được bật — chuyển liên web tạm thời chưa dùng được.' };
    }
    if (h.ok && h.status !== 'song') {
      return { ok: false, code: 'paused', error: 'Tạm dừng vì web bên kia đang bảo trì — thử lại khi kết nối.' };
    }
    try {
      var s = await sessionUser();
      var email = String((s.user && s.user.email) || '').toLowerCase();
      var key = 'xfer:' + email + ':' + newUuid();
      var res = await s.api.client.rpc('xu_cross_transfer_init', {
        p_email: email, p_amount: n, p_idempotency_key: key
      });
      if (res.error) {
        var msg = rpcErrorText(res);
        if (bridgeErrorCode(res)) return { ok: false, code: 'bridge_not_enabled', error: 'Cầu nối xu liên web chưa được bật — chuyển liên web tạm thời chưa dùng được.' };
        var code = 'transfer_failed';
        ['account_not_linked', 'insufficient_earn_balance', 'xfer_daily_cap', 'debt_locked', 'xfer_amount_below_minimum'].forEach(function (c) {
          if (msg.indexOf(c) !== -1) code = c;
        });
        return { ok: false, code: code, error: msg };
      }
      return { ok: true, transfer_id: String(res.data || ''), idempotency_key: key };
    } catch (e) { return { ok: false, code: 'transfer_failed', error: String((e && e.message) || e) }; }
  }

  // ---- Hiển thị (chỉ render số server trả, không tính lại số dư) ----
  // Số xu kiếm nữa cần để bù xong số âm (ước tính §5.3: bù 50% nên cần
  // gấp đôi số âm). debt = −12 → cần kiếm thêm khoảng 24 xu.
  function debtEstimate(debt) {
    var d = Math.abs(Number(debt) || 0);
    if (!d) return 0;
    return Math.ceil(d / DEBT_REPAY_RATE);
  }
  // Khối số âm theo mẫu thiết kế §5.3 (HTML đã escape).
  function debtHtml(debt, reason) {
    var d = Number(debt) || 0;
    if (d >= 0) return '';
    var need = debtEstimate(d);
    var why = reason ? ' do ' + escapeHtml(reason) : '';
    return '<p class="xu-chung-debt" style="color:#b3261e">−' + Math.abs(d) + ' xu</p>'
      + '<p>Bạn đang âm ' + Math.abs(d) + ' xu' + why + '. Mỗi lần nhận xu mới, '
      + 'hệ thống sẽ trừ 50% để bù dần — bạn vẫn dùng web bình thường.</p>'
      + '<p>Dự kiến hết sau khoảng ' + need + ' xu kiếm nữa (ước tính theo tốc độ bù 50%).</p>';
  }
  // 3 dòng số dư + trạng thái bên kia + số âm. balances: kết quả
  // getBalances(); health: kết quả getHealth() (tùy chọn).
  // v167 (N9, tiep): khi da dang nhap ma tai so du loi thi bao
  // "Chua tai duoc..." chu khong bao "Can dang nhap..." — cau cu
  // hien ca khi da dang nhap vi getBalances() tra {ok:false} cho
  // MOI loi (chua dang nhap, RPC loi, M16 chua chay). loggedIn
  // truyen tu refreshSummary (co session thi true).
  function summaryHtml(balances, health, loggedIn) {
    if (!balances || !balances.ok) {
      // v222 (S1-1): cầu nối chưa bật thì nói đúng bệnh — tải lại trang
      // không bao giờ sửa được 404 PGRST202; chỉ lỗi khác mới nhắc tải lại.
      if (loggedIn && balances && balances.code === 'bridge_not_enabled') {
        return '<p>' + BRIDGE_NOT_ENABLED_TEXT + '</p>';
      }
      return loggedIn
        ? '<p>Chưa tải được số dư xu liên web, hãy tải lại trang.</p>'
        : '<p>Cần đăng nhập để xem số dư xu liên web.</p>';
    }
    var mc = (balances.mc_earn || 0) + (balances.mc_topup || 0);
    var pp = (balances.pp_earn || 0) + (balances.pp_topup || 0);
    var html = '<p class="xu-chung-lines">Xu Ver2Solution: <b>' + mc + '</b>'
      + ' • Xu Phật Pháp: <b>' + pp + '</b>'
      + ' • Tổng dùng được: <b>' + (balances.total_usable || 0) + '</b></p>'
      + '<p class="xu-chung-split">Xu kiếm được: ' + (balances.mc_earn || 0)
      + ' • Xu nạp: ' + (balances.mc_topup || 0)
      + ' (chỉ xu kiếm mới chuyển được sang web kia; xu nạp chỉ tiêu ở web đã nạp).</p>'
      + '<p class="xu-chung-health">' + escapeHtml(healthText(health)) + '</p>';
    if ((balances.debt || 0) < 0) html += debtHtml(balances.debt);
    return html;
  }
  function renderSummary(el, balances, health, loggedIn) {
    if (!el) return;
    el.innerHTML = summaryHtml(balances, health, loggedIn);
  }
  // Nạp + render toàn bộ khối tóm tắt (dùng cho vi.html + header sau này).
  async function refreshSummary(el) {
    if (!el) return { ok: false, error: 'Thiếu vị trí hiển thị.' };
    var b = await getBalances();
    var h = await getHealth();
    var loggedIn = false;
    try { var s = await sessionUser(); loggedIn = !!(s && s.user); } catch (e) { loggedIn = false; }
    renderSummary(el, b, h.ok ? h : null, loggedIn);
    return b;
  }
  // Lịch sử xu liên web — CHỈ ĐỌC points_ledger (policy M5 owner read),
  // lọc các type M16, mới nhất lên đầu. Dòng offline_spend pending gắn
  // nhãn "⏳ Chờ đồng bộ". Không ghi gì.
  async function getCrossHistory(limit) {
    if (!XU_CHUNG_ENABLED) return { ok: false, items: [] };
    try {
      var s = await sessionUser();
      var res = await s.api.client.from('points_ledger')
        .select('id,delta,type,reason,created_at,sync_status')
        .eq('auth_user_id', s.user.id)
        .in('type', CROSS_TYPES)
        .order('created_at', { ascending: false })
        .limit(Math.max(1, Math.min(100, Number(limit) || 20)));
      if (res.error) {
        var bc2 = bridgeErrorCode(res);
        if (bc2) { try { console.warn('[xu-chung] getCrossHistory: ' + bc2, rpcErrorText(res)); } catch (e2) {} }
        return { ok: false, code: bc2, items: [] };
      }
      return { ok: true, items: Array.isArray(res.data) ? res.data : [] };
    } catch (e) { return { ok: false, items: [] }; }
  }
  function crossHistoryHtml(items, debt) {
    var html = '';
    if ((Number(debt) || 0) < 0) {
      html += '<div class="xu-chung-debt-box"><h4>Số âm đang bù</h4>'
        + debtHtml(debt)
        + '</div>';
    }
    if (!items || !items.length) return html + '<p>Chưa có giao dịch xu liên web nào.</p>';
    html += '<ul class="xu-chung-history">';
    items.forEach(function (it) {
      var label = CROSS_LABELS[it.type] || 'Xu liên web';
      var delta = (Number(it.delta) || 0) > 0 ? '+' + it.delta : String(it.delta);
      var pending = (it.type === 'offline_spend' && it.sync_status === 'pending')
        ? ' <span class="xu-chung-pending">⏳ Chờ đồng bộ</span>' : '';
      html += '<li><b>' + escapeHtml(label) + '</b> ' + escapeHtml(delta) + ' xu'
        + pending
        + (it.reason ? ' — ' + escapeHtml(it.reason) : '')
        + '</li>';
    });
    return html + '</ul>';
  }
  async function refreshHistory(el) {
    if (!el) return { ok: false, items: [] };
    // v166 (N9): phân biệt "chưa đăng nhập" với "tải lỗi" — trước đây
    // cả hai đều giữ nguyên dòng mặc định "Chưa tải được lịch sử xu
    // liên web" (hoặc render "Chưa có giao dịch" như thể đã tải xong).
    var loggedIn = true;
    try { await sessionUser(); } catch (e) { loggedIn = false; }
    if (!loggedIn) { el.innerHTML = '<p>Cần đăng nhập để xem lịch sử xu liên web.</p>'; return { ok: false, items: [] }; }
    var r = await getCrossHistory(20);
    var b = { ok: false, debt: 0 };
    try { b = await getBalances(); } catch (e) { b = { ok: false, debt: 0 }; }
    if (!r.ok) {
      // v222 (S1-1): cầu nối chưa bật thì nói đúng bệnh, không nhắc tải lại.
      el.innerHTML = (r.code === 'bridge_not_enabled')
        ? '<p>' + BRIDGE_NOT_ENABLED_TEXT + '</p>'
        : '<p>Chưa tải được lịch sử xu liên web, hãy tải lại trang.</p>';
      return r;
    }
    el.innerHTML = crossHistoryHtml(r.items, b.ok ? b.debt : 0);
    return r;
  }

  // ---- Gắn tự động (vi.html) ----
  function initXuChung() {
    if (typeof document === 'undefined') return;
    var summaryEl = document.getElementById('xuChungSummary');
    var historyEl = document.getElementById('xuChungHistory');
    var form = document.getElementById('xuChungTransferForm');
    var amountEl = document.getElementById('xuChungAmount');
    var msgEl = document.getElementById('xuChungMsg');
    var submitEl = document.getElementById('xuChungSubmit');
    if (summaryEl) refreshSummary(summaryEl).then(function (b) {
      // v222 (S1-1): cầu nối chưa bật → vô hiệu form chuyển liên web
      // (bấm cũng chỉ 404), tránh bắt người dùng thử đi thử lại.
      if (b && !b.ok && b.code === 'bridge_not_enabled' && submitEl) submitEl.disabled = true;
    });
    if (historyEl) refreshHistory(historyEl);
    /* v224 (S2-8): theo doi phien — dang xuat thi summary/history ve "Can dang
       nhap" + khoa nut chuyen; dang nhap lai thi tai lai. Truoc day initXuChung
       chi chay 1 lan luc tai trang nen du lieu cu ket toi khi tai lai trang. */
    try {
      var A = window.V2SAuthUI;
      if (A && typeof A.onSessionChange === 'function') {
        A.onSessionChange(function (user) {
          if (!user) {
            if (submitEl) submitEl.disabled = true;
            if (summaryEl) renderSummary(summaryEl, { ok: false }, null, false);
            if (historyEl) historyEl.innerHTML = '<p>Cần đăng nhập để xem lịch sử xu liên web.</p>';
            return;
          }
          if (summaryEl) refreshSummary(summaryEl).then(function (b) {
            if (submitEl) submitEl.disabled = !!(b && !b.ok && b.code === 'bridge_not_enabled');
          });
          if (historyEl) refreshHistory(historyEl);
        });
      }
    } catch (e) { /* bo qua — van tai 1 lan luc mo trang */ }
    if (form && form.getAttribute('data-v2s-xu-chung-wired') !== '1') {
      form.setAttribute('data-v2s-xu-chung-wired', '1');
      form.addEventListener('submit', function (ev) {
        ev.preventDefault();
        if (!amountEl || !msgEl) return;
        var n = Math.floor(Number(amountEl.value));
        if (submitEl) submitEl.disabled = true;
        msgEl.textContent = 'Đang chuyển…';
        msgEl.className = 'xu-chung-msg';
        transferCrossWeb(n).then(function (out) {
          if (submitEl) submitEl.disabled = false;
          if (out.ok) {
            msgEl.textContent = 'Đã khóa ' + n + ' xu để chuyển sang Phật Pháp. Chờ bên kia xác nhận — xem trạng thái trong Lịch sử xu liên web.';
            msgEl.className = 'xu-chung-msg ok';
            if (summaryEl) refreshSummary(summaryEl);
            if (historyEl) refreshHistory(historyEl);
          } else {
            msgEl.textContent = out.error || 'Chưa chuyển được xu.';
            msgEl.className = 'xu-chung-msg err';
          }
        });
      });
    }
  }
  if (typeof document !== 'undefined') {
    if (document.readyState === 'complete' || document.readyState === 'interactive') initXuChung();
    else if (document.addEventListener) document.addEventListener('DOMContentLoaded', initXuChung);
  }

  var API = {
    ENABLED: XU_CHUNG_ENABLED,
    XFER_MIN: XFER_MIN, XFER_DAILY_MAX: XFER_DAILY_MAX,
    OFFLINE_DAILY_MAX: OFFLINE_DAILY_MAX, DEBT_REPAY_RATE: DEBT_REPAY_RATE,
    DEBT_CAP: DEBT_CAP, CROSS_TYPES: CROSS_TYPES, CROSS_LABELS: CROSS_LABELS,
    getBalances: getBalances, getHealth: getHealth, healthText: healthText,
    linkAccount: linkAccount, transferCrossWeb: transferCrossWeb,
    debtEstimate: debtEstimate, debtHtml: debtHtml, summaryHtml: summaryHtml,
    renderSummary: renderSummary, refreshSummary: refreshSummary,
    getCrossHistory: getCrossHistory, crossHistoryHtml: crossHistoryHtml,
    refreshHistory: refreshHistory, initXuChung: initXuChung
  };
  if (typeof window !== 'undefined') window.Ver2XuChung = API;
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
})();
