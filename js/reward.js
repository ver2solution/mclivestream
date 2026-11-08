/* v2 — Xu thưởng GĐ2 (07/11/2026, thay thế bảng D2 ngày 06/11).
   Xem goals/mc-livestream-job-board/hidden_files/diem-thuong-v2-2026-11-07.md
   (nguồn đúng duy nhất cho bảng xu v2).
   Bảng xu v2 — MỘT bảng duy nhất cho mọi tài khoản đã đăng nhập:
   - Đăng ký: mỗi trường điền đúng +30 (5 trường = 150); tạo tài khoản +100.
     Tổng 250 nếu tick đồng ý marketing, 220 nếu không tick (trường marketing
     chỉ +30 khi tick). Khách vãng lai 0 xu.
   - Tương tác, mỗi loại tối đa 1 lần/ngày TOÀN SITE: bình luận +10, thích +10,
     chia sẻ lên tường +20. Tối đa 40 xu/ngày từ tương tác.
   - Ghim bài lên top danh mục: 1 xu = 1 giờ, chọn 1..720 giờ, trừ xu
     ngay khi ghim; hết pinned_until thì bài về thứ tự thường.
   - Trần ngày D2 (shop 50 / mẫu 30) ĐÃ HỦY. Không hết hạn xu. Không mua
     xu. (Chuyển xu: người dùng chốt lại 20:23 ngày 07/11 là ĐƯỢC PHÉP —
     tối thiểu 10 xu/lần, bằng email người nhận, không phí; xem spec §1b.)
   Bổ sung 20:22 ngày 07/11 (bảng giá tiêu xu): lọc 1 xu/lần (đổi 2 ô
   trong 10s chỉ tính 1 lần); xem liên hệ 1 hồ sơ 5 xu/lần bấm (1 lần/
   ngày/hồ sơ); ghim 1 xu/giờ. Xem/đọc bài viết, duyệt danh sách chưa lọc,
   máy tính lãi sau phí sàn: MIỄN PHÍ. Mọi lần trừ xu qua RPC spend_points()
   (M7, SECURITY DEFINER); client không tự trừ số dư. Chuyển xu qua RPC
   transfer_points() — cần đủ 30 ngày online liên tiếp (chốt 20:25 ngày
   07/11, áp dụng mọi tài khoản, không hồi tố, không ngoại lệ admin).
   Nguyên tắc an toàn (giữ từ M5, xem docs-diem-thuong-tuong-tac-m5.md):
   - Client KHÔNG cộng/trừ số dư, KHÔNG duyệt sự kiện, KHÔNG tự active liên
     kết, KHÔNG tự trừ xu khi đổi dịch vụ hay chuyển/tặng, KHÔNG ghi trực
     tiếp vào points_ledger / wallet_balances.
   - Client chỉ tạo: yêu cầu liên kết pending, sự kiện pending với points=0,
     đơn đổi dịch vụ pending, giao dịch chuyển/tặng pending, bình luận pending.
   - Xu thật chỉ cộng/trừ qua 4 RPC M7 (xem awardRegistration,
     awardInteraction, getMyPointsBalance, pinPost). RPC chưa chạy (M7 chưa
     deploy) thì các hàm này trả {ok:false} / 0, KHÔNG ném lỗi ra ngoài,
     KHÔNG làm vỡ trang.
   - Đọc cho popup online: getMyPointsSummary() qua RPC get_my_points_summary()
     (M7.8b) — chỉ đọc số dư + xu đã tiêu, không cộng/trừ.
   - Bán lấy tiền thật chỉ qua trung gian nền tảng khi có cổng thanh toán +
     chính sách phí/tranh chấp; file này KHÔNG tạo đơn bán thật, chỉ giữ
     kind='sale_platform' ở dạng khung chờ trong SQL, và hàm client dưới đây
     từ chối tạo đơn bán cho tới khi khung đó được bật. */
(function () {
  'use strict';
  // v92 (08/11/2026, người dùng chốt 11:32): TẠM KHÓA trừ xu cho lọc +
  // xem liên hệ + dịch vụ khác — tất cả MIỄN PHÍ, chỉ ghim bài vẫn tính
  // xu. Cờ này bypass việc gọi spend_points('filter'/'contact_view')
  // ở js/app.js (gateFilterApply, hero search, xem liên hệ). KHÔNG xóa
  // code trừ xu (spendPoints/filterChargeBucket/shouldChargeFilter +
  // RPC phía server giữ nguyên) — mở lại thu phí chỉ bằng cách đổi cờ
  // này thành false rồi kiểm tra lại. Cửa đăng nhập cho khách vãng lai
  // vẫn giữ nguyên ở js/app.js (chỉ khóa việc TRẢ xu, không khóa cửa
  // đăng ký). Ghim bài KHÔNG đi qua cờ này (luôn tính xu).
  var V20_FREE_SERVICES = true;
  // ---- Bảng xu v2 (CHỐT 07/11/2026, thay thế D2) ----
  var INTERACTION_POINTS = { comment: 10, like: 10, share: 20 };
  var MAX_PER_TYPE_PER_DAY = 1; // mỗi loại tối đa 1 lần tính xu/ngày/site-wide
  var MAX_INTERACTION_POINTS_PER_DAY = 40; // 10 + 10 + 20
  var REGISTRATION_FIELD_POINTS = 30;
  var REGISTRATION_FIELD_COUNT = 5;
  var REGISTRATION_ACCOUNT_POINTS = 100;
  var PIN_POINT_PER_HOUR = 1; // 1 xu = 1 giờ ghim
  var PIN_MIN_HOURS = 1;
  var PIN_MAX_HOURS = 720; // 30 ngày
  // Giữ tên POINTS để code cũ đọc được bảng v2 (không còn chia shop/model).
  var POINTS = {
    interaction: INTERACTION_POINTS,
    maxPerTypePerDay: MAX_PER_TYPE_PER_DAY,
    maxInteractionPerDay: MAX_INTERACTION_POINTS_PER_DAY,
    registrationField: REGISTRATION_FIELD_POINTS,
    registrationFields: REGISTRATION_FIELD_COUNT,
    registrationAccount: REGISTRATION_ACCOUNT_POINTS,
    pinPointPerHour: PIN_POINT_PER_HOUR,
    pinMinHours: PIN_MIN_HOURS,
    pinMaxHours: PIN_MAX_HOURS
  };
  // Trần chuyển/tặng ĐỀ XUẤT cũ (M5). Quy tắc chuyển xu mới chốt 20:23
  // ngày 07/11 (xem spec §1b) chưa có RPC nên submitGift() bên dưới chỉ
  // còn là hàm legacy pending, không nối UI mới.
  var TRANSFER_LIMITS = { maxRewardPointsPerDay: 200, maxRecipientsPerDay: 3, minHoldingDays: 7 };
  var PROVIDERS = ['facebook', 'tiktok', 'instagram', 'zalo', 'threads'];
  var INTERACTION_TYPES = ['comment', 'like', 'share'];

  // v91 (BUG-10): timestamp ISO UTC → giờ Việt Nam dễ đọc, vd "00:41 ngày
  // 08/11" (withYear=true: "00:41 ngày 08/11/2026"). ISO hỏng thì trả lại
  // chuỗi gốc, không ném lỗi. Dùng cho thông báo ghim + lịch sử xu.
  function formatVnDateTime(iso, withYear) {
    try {
      var d = new Date(iso);
      if (isNaN(d.getTime())) return String(iso || '');
      var timePart = new Intl.DateTimeFormat('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', hour: '2-digit', minute: '2-digit', hour12: false }).format(d);
      // v91 fix: Intl 'vi-VN' khong nam tra '08-11' (gach noi), khong phai
      // '08/11' nhu BUG-10 yeu cau — dung formatToParts de ghep chac chan
      // DD/MM (hoac DD/MM/YYYY khi withYear).
      var parts = new Intl.DateTimeFormat('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', day: '2-digit', month: '2-digit', year: 'numeric' }).formatToParts(d);
      var dd = '', mm = '', yyyy = '';
      parts.forEach(function (p) { if (p.type === 'day') dd = p.value; else if (p.type === 'month') mm = p.value; else if (p.type === 'year') yyyy = p.value; });
      var datePart = withYear ? dd + '/' + mm + '/' + yyyy : dd + '/' + mm;
      return timePart + ' ngày ' + datePart;
    } catch (e) { return String(iso || ''); }
  }
  // v91 (BUG-05): nhãn tiếng Việt cho 15 loại giao dịch xu trong sổ cái
  // points_ledger (M7). Loại lạ → 'Xu thưởng'.
  var POINTS_HISTORY_LABELS = {
    comment: 'Bình luận', like: 'Thích', share: 'Chia sẻ',
    redemption: 'Đổi dịch vụ', gift: 'Tặng xu', transfer: 'Chuyển xu',
    transfer_out: 'Chuyển xu đi', transfer_in: 'Nhận xu',
    reclaim: 'Thu hồi xu', adjust: 'Điều chỉnh xu',
    registration_field: 'Đăng ký: điền trường', account_created: 'Tạo tài khoản',
    pin: 'Ghim bài', filter: 'Lọc danh sách', contact_view: 'Xem liên hệ'
  };
  function pointsHistoryLabel(type) { return POINTS_HISTORY_LABELS[String(type || '')] || 'Xu thưởng'; }
  // v91 (BUG-05): lịch sử giao dịch xu — đọc TRỰC TIẾP bảng points_ledger
  // (policy M5 points_ledger_owner_read cho chủ tài khoản SELECT dòng của
  // mình: auth.uid() = auth_user_id), mới nhất lên đầu. CHỈ ĐỌC, không ghi.
  // Lỗi / chưa đăng nhập / policy chưa có → {ok:false, items:[]}, KHÔNG ném.
  async function getMyPointsHistory(limit) {
    try {
      var s = await sessionUser();
      var res = await s.api.client.from('points_ledger')
        .select('id,delta,balance_after,type,reason,created_at')
        .eq('auth_user_id', s.user.id)
        .order('created_at', { ascending: false })
        .limit(Math.max(1, Math.min(100, Number(limit) || 20)));
      if (res.error) return { ok: false, items: [] };
      return { ok: true, items: Array.isArray(res.data) ? res.data : [] };
    } catch (e) { return { ok: false, items: [] }; }
  }
  function dayKeySaigon(date) {
    var d = date || new Date();
    // en-CA cho ra YYYY-MM-DD, múi giờ Asia/Ho_Chi_Minh = giờ Việt Nam.
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
  }
  function validateComment(text) {
    var t = String(text || '').trim();
    if (t.length < 20) return 'Bình luận tính xu cần từ 20 ký tự trở lên.';
    if (/^(.)\1{19,}$/.test(t)) return 'Bình luận không được là 1 ký tự lặp lại.';
    return null;
  }
  function normalizeEvidenceUrl(url) {
    var u = String(url || '').trim();
    if (!u) return '';
    // Chuẩn hóa tối thiểu ở client để chống dùng lại link chỉ khác dấu / cuối.
    // Băm SHA-256 thật phải làm ở phía server/admin khi duyệt, không tin băm client.
    return u.replace(/\/+$/, '');
  }
  // ---- Hàm thuần v2 ----
  // Xu cho 1 loại tương tác (comment/like/share). Loại lạ = 0.
  function pointsForInteraction(type) {
    return INTERACTION_POINTS[type] || 0;
  }
  // Giữ tên pointsFor cũ: pointsFor(action) hoặc pointsFor(actorType, action).
  function pointsFor(a, b) {
    return pointsForInteraction(b || a);
  }
  // Chi phí ghim = số giờ (1 xu = 1 giờ). Giờ ngoài 1..720 trả về -1.
  function pinCostHours(hours) {
    var h = Math.floor(Number(hours));
    if (!h || h < PIN_MIN_HOURS || h > PIN_MAX_HOURS) return -1;
    return h * PIN_POINT_PER_HOUR;
  }
  function validatePinHours(hours) {
    var h = Math.floor(Number(hours));
    if (!h || isNaN(h)) return 'Hãy chọn số giờ ghim.';
    if (h < PIN_MIN_HOURS) return 'Ghim ít nhất 1 giờ.';
    if (h > PIN_MAX_HOURS) return 'Ghim tối đa 720 giờ (30 ngày).';
    return null;
  }
  // Loại này hôm nay đã được tính xu chưa? true = đã tính → lượt này +0.
  function canEarnInteractionToday(alreadyEarnedToday) {
    return !alreadyEarnedToday;
  }
  // Wrapper cũ (D2: trần ngày theo loại tài khoản) — v2 chỉ còn trần chung
  // 40 xu/ngày từ tương tác, không chia shop/model. Giữ để code cũ không vỡ.
  function canEarnToday(alreadyApprovedToday, newPoints) {
    return (Number(alreadyApprovedToday || 0) + Number(newPoints || 0)) <= MAX_INTERACTION_POINTS_PER_DAY;
  }
  // Xu đăng ký: fieldsCompleted = số trường đã điền đúng (0..5, trong đó
  // trường marketing chỉ tính khi người dùng tick). Cộng +100 tạo tài khoản.
  // Nhận số, hoặc object {email,phone,password,password2,marketing} (truthy).
  function registrationPoints(fieldsCompleted) {
    var n = 0;
    if (typeof fieldsCompleted === 'number') n = Math.floor(fieldsCompleted);
    else if (fieldsCompleted && typeof fieldsCompleted === 'object') {
      n = ['email', 'phone', 'password', 'password2', 'marketing'].filter(function (k) { return !!fieldsCompleted[k]; }).length;
    }
    if (n < 0) n = 0;
    if (n > REGISTRATION_FIELD_COUNT) n = REGISTRATION_FIELD_COUNT;
    return n * REGISTRATION_FIELD_POINTS + REGISTRATION_ACCOUNT_POINTS;
  }
  // Ghim còn hiệu lực không? pinned_until phải sau thời điểm so sánh.
  function isPinActive(pin, now) {
    if (!pin || !pin.pinned_until) return false;
    var until = new Date(pin.pinned_until).getTime();
    var t = now ? new Date(now).getTime() : Date.now();
    return !isNaN(until) && until > t;
  }
  // Xếp lại danh sách đã render: bài được ghim (còn hạn) lên trước, xếp theo
  // pinned_until giảm dần (ghim lâu nhất lên trước); còn lại giữ nguyên thứ
  // tự ban đầu (stable). list: mảng item có id; pins: [{target_id,
  // pinned_until}]. Không đổi list gốc.
  function sortPinnedFirst(list, pins, now) {
    var arr = (list || []).slice();
    var active = (pins || []).filter(function (p) { return isPinActive(p, now); });
    if (!active.length) return arr;
    var rank = {};
    active.slice().sort(function (a, b) { return new Date(b.pinned_until) - new Date(a.pinned_until); })
      .forEach(function (p, i) { rank[String(p.target_id)] = i; });
    return arr.sort(function (a, b) {
      var ra = rank[String(a && a.id)] !== undefined ? rank[String(a.id)] : Infinity;
      var rb = rank[String(b && b.id)] !== undefined ? rank[String(b.id)] : Infinity;
      return ra - rb; // sort ổn định: bằng hạng thì giữ thứ tự cũ
    });
  }
  function api() { return (typeof window !== 'undefined' && window.McLivestreamAPI) ? window.McLivestreamAPI : null; }
  function errMissing() { return new Error('Chưa kết nối được Supabase, hãy thử lại sau.'); }
  function rpcErrorText(res) {
    if (!res) return 'Không rõ lỗi.';
    var e = res.error || res;
    return String((e && (e.message || e.code)) || e || 'Không rõ lỗi.');
  }
  // Trích số xu từ kết quả RPC (M7 có thể trả số, hoặc object
  // {points_awarded|points|awarded|total_awarded}).
  function extractPoints(data) {
    if (typeof data === 'number') return data;
    if (data && typeof data === 'object') {
      var v = data.points_awarded;
      if (v === undefined) v = data.points;
      if (v === undefined) v = data.awarded;
      if (v === undefined) v = data.total_awarded;
      if (typeof v === 'number') return v;
    }
    return 0;
  }
  async function sessionUser() {
    var a = api(); if (!a) throw errMissing();
    var session = await a.getSession(); if (!session) throw new Error('Cần đăng nhập mới dùng được xu thưởng.');
    return { api: a, user: session.user };
  }
  async function ensureWalletRow() {
    var s = await sessionUser();
    var res = await s.api.client.from('wallet_accounts').select('*').eq('auth_user_id', s.user.id).maybeSingle();
    if (res.error) throw res.error;
    if (res.data) return { api: s.api, user: s.user, wallet: res.data };
    var ins = await s.api.client.from('wallet_accounts').insert({ auth_user_id: s.user.id }).select().single();
    if (ins.error) throw ins.error;
    return { api: s.api, user: s.user, wallet: ins.data };
  }

  // ---- RPC M7 (v2): không bao giờ ném lỗi ra ngoài ----
  // Cộng xu đăng ký (250 nếu tick marketing, 220 nếu không). Gọi 1 lần
  // sau khi đăng ký thành công CÓ session. RPC chưa có → {ok:false}.
  async function awardRegistration() {
    try {
      var s = await sessionUser();
      var res = await s.api.client.rpc('award_registration_points', {});
      if (res.error) return { ok: false, error: rpcErrorText(res), points: 0 };
      return { ok: true, points: extractPoints(res.data), data: res.data };
    } catch (e) {
      if (typeof console !== 'undefined' && console.error) console.error('[reward v2] award_registration_points lỗi:', e);
      return { ok: false, error: String((e && e.message) || e), points: 0 };
    }
  }
  // Cộng xu tương tác (comment +10 / like +10 / share +20, mỗi loại tối đa
  // 1 lần/ngày toàn site). Trả {ok, points}: points = 0 khi đã tính loại đó
  // trong ngày hôm nay. targetType: 'model_profile' | 'shop_profile' |
  // 'article'; targetId: id data.js (th-…/sh-…) hoặc tên file bài báo.
  async function awardInteraction(type, targetType, targetId) {
    if (INTERACTION_TYPES.indexOf(type) === -1) return { ok: false, error: 'Loại tương tác không hợp lệ.', points: 0 };
    if (!targetType || !targetId) return { ok: false, error: 'Thiếu mục tương tác.', points: 0 };
    try {
      var s = await sessionUser();
      var res = await s.api.client.rpc('award_interaction_points', {
        p_type: type, p_target_type: String(targetType), p_target_id: String(targetId)
      });
      if (res.error) return { ok: false, error: rpcErrorText(res), points: 0 };
      return { ok: true, points: extractPoints(res.data), data: res.data };
    } catch (e) {
      if (typeof console !== 'undefined' && console.error) console.error('[reward v2] award_interaction_points lỗi:', e);
      return { ok: false, error: String((e && e.message) || e), points: 0 };
    }
  }
  // Số dư xu của tài khoản đang đăng nhập. Lỗi / chưa đăng nhập / M7 chưa
  // chạy → 0 (không ném lỗi).
  async function getMyPointsBalance() {
    var r = await getMyPointsBalanceResult();
    return r.balance;
  }
  // Bản chi tiết để header phân biệt "số dư 0 thật" với "lỗi/mất mạng":
  // {ok:true, balance} khi RPC trả về, {ok:false, balance:0} khi lỗi.
  async function getMyPointsBalanceResult() {
    try {
      var s = await sessionUser();
      var res = await s.api.client.rpc('get_my_points_balance', {});
      if (res.error) return { ok: false, balance: 0 };
      var v = extractPoints(res.data);
      if (typeof res.data === 'object' && res.data && res.data.balance !== undefined) v = Number(res.data.balance) || 0;
      return { ok: true, balance: Number(v) || 0 };
    } catch (e) { return { ok: false, balance: 0 }; }
  }

  // Số dư + xu đã tiêu của tài khoản đang đăng nhập (popup online:
  // "Đã tiêu: Y xu • Còn lại: Z xu"). Chỉ đọc qua RPC
  // get_my_points_summary() (M7.8b, SECURITY DEFINER); spent =
  // total_reward_spent trên wallet_accounts. Lỗi / chưa đăng nhập /
  // M7 chưa chạy → {ok:false, balance:0, spent:0}, KHÔNG ném lỗi.
  async function getMyPointsSummary() {
    try {
      var s = await sessionUser();
      var res = await s.api.client.rpc('get_my_points_summary', {});
      if (res.error) return { ok: false, balance: 0, spent: 0 };
      var d = res.data;
      if (!d || typeof d !== 'object') return { ok: false, balance: 0, spent: 0 };
      return {
        ok: true,
        balance: Math.max(0, Number(d.balance) || 0),
        spent: Math.max(0, Number(d.spent) || 0)
      };
    } catch (e) { return { ok: false, balance: 0, spent: 0 }; }
  }

  // ---- Bảng giá tiêu xu v2 (chốt 20:22 ngày 07/11) ----
  // Lọc 1 xu/lần; xem liên hệ 5 xu/lần bấm (mỗi hồ sơ 1 lần/ngày);
  // ghim 1 xu/giờ. Xem/đọc bài viết, duyệt danh sách chưa lọc, máy tính
  // lãi sau phí sàn: MIỄN PHÍ (không qua hàm này).
  // v92 (08/11/2026): lọc + xem liên hệ TẠM MIỄN PHÍ (cờ V20_FREE_SERVICES
  // ở đầu file) — PRICES dưới đây GIỮ NGUYÊN để mở lại thu phí chỉ bằng
  // 1 cờ; spendPoints() vẫn trừ đúng giá này khi cờ tắt.
  var PRICES = { filter: 1, contact_view: 5, pin_per_hour: 1 };
  var FILTER_DEDUP_MS = 10000; // đổi 2 ô lọc trong 10s chỉ tính 1 lần
  var TRANSFER_MIN_POINTS = 10;

  // Trừ xu qua RPC spend_points() (M7, SECURITY DEFINER, kiểm tra số dư
  // phía server, không cho âm). Client KHÔNG tự trừ số dư.
  // HợP ĐỒNG M7.11 — spend_points(p_type, p_amount, p_ref_type, p_ref_id,
  // p_idempotency_key) → số xu ĐÃ TRỪ (số dương; 0 nếu khóa đã tồn tại).
  // kind: 'filter' | 'contact_view'; category: 'model'|'shop'|'lot'|
  // 'factory'|'kiot' (lọc) hoặc target_type (xem liên hệ) → p_ref_type;
  // targetRef: trang lọc (vd 'danh-sach-mau.html') hoặc target_id → p_ref_id.
  // idempotencyKey do client tạo theo quy tắc trong spec (filter:<user>:
  // <category>:<bucket 10s>, contact:<user>:<type>:<id>:<YYYY-MM-DD>).
  // Trả {ok:true} khi trừ xong, {ok:false, code, error} khi lỗi.
  // code='insufficient_balance' khi hết xu; code='rpc_missing' khi RPC
  // spend_points chưa có (M7 chưa chạy phần này) — caller KHÔNG được trừ
  // khống hay cho dùng miễn phí lặng lẽ, phải báo rõ cho người dùng.
  async function spendPoints(kind, amount, category, targetRef, idempotencyKey) {
    if (['filter', 'contact_view'].indexOf(kind) === -1) return { ok: false, code: 'invalid_kind', error: 'Loại trừ xu không hợp lệ.' };
    if (!amount || Number(amount) <= 0) return { ok: false, code: 'invalid_amount', error: 'Số xu trừ phải lớn hơn 0.' };
    try {
      var s = await sessionUser();
      var res = await s.api.client.rpc('spend_points', {
        p_type: kind, p_amount: Math.floor(Number(amount)),
        p_ref_type: String(category || ''), p_ref_id: String(targetRef || ''),
        p_idempotency_key: String(idempotencyKey || '')
      });
      if (res.error) {
        var msg = rpcErrorText(res);
        if (/insufficient_balance/i.test(msg)) return { ok: false, code: 'insufficient_balance', error: 'Bạn đã hết xu.' };
        if (/spend_price_mismatch/i.test(msg)) return { ok: false, code: 'spend_price_mismatch', error: msg };
        if (/PGRST202/i.test(msg) || /Could not find the function/i.test(msg) || res.error.code === 'PGRST202') return { ok: false, code: 'rpc_missing', error: 'Hệ thống xu chưa bật (đang chờ migration M7).' };
        return { ok: false, code: 'spend_failed', error: msg };
      }
      var d = res.data;
      if (d && typeof d === 'object' && d.ok === false) {
        var m2 = String(d.message || d.error || '');
        if (/insufficient_balance/i.test(m2)) return { ok: false, code: 'insufficient_balance', error: 'Bạn đã hết xu.' };
        return { ok: false, code: 'spend_failed', error: m2 || 'Trừ xu chưa thành công.' };
      }
      // v90: tru diem xong -> lam moi NGAY ca 2 noi hien diem (khong doi tai
      // lai trang, khong doi chu ky 60s): pill header + dong diem popup online.
      try { if (typeof window !== 'undefined' && typeof window.V20HeaderRefresh === 'function') window.V20HeaderRefresh(); } catch (e2) {}
      try { if (typeof window !== 'undefined' && typeof window.V20RefreshPopupPoints === 'function') window.V20RefreshPopupPoints(); } catch (e2) {}
      return { ok: true };
    } catch (e) {
      if (typeof console !== 'undefined' && console.error) console.error('[reward v2] spend_points lỗi:', e);
      return { ok: false, code: 'spend_failed', error: String((e && e.message) || e) };
    }
  }
  // Nhóm 10 giây cho key chống trừ lặp khi lọc: floor(nowMs / 10000).
  // v91 fix: dung kiem tra null/undefined thay cho `||` — nowMs = 0 la moc
  // hop le (khong phai "thieu"), `0 || Date.now()` se tra bucket sai.
  function filterChargeBucket(nowMs) { var n = (nowMs === undefined || nowMs === null) ? Date.now() : Number(nowMs); return Math.floor(n / FILTER_DEDUP_MS); }
  // Đổi lọc lần này có tính phí không? true = đã qua 10s từ lần trừ trước.
  function shouldChargeFilter(lastChargeTs, nowMs) {
    var now = (nowMs === undefined || nowMs === null) ? Date.now() : Number(nowMs);
    var last = Number(lastChargeTs || 0);
    if (!last) return true;
    return (now - last) >= FILTER_DEDUP_MS;
  }
  // Khóa ghi nhớ "đã xem liên hệ hồ sơ này hôm nay" (client, theo ngày
  // Asia/Saigon). RPC cũng tự trả 0 nếu key đã tồn tại (chống trừ lặp 2 lớp).
  function contactViewKey(targetType, targetId, day) {
    return 'contact:' + String(targetType) + ':' + String(targetId) + ':' + String(day || dayKeySaigon(new Date()));
  }
  function contactViewStore() {
    try {
      var raw = (typeof localStorage !== 'undefined') ? localStorage.getItem('v20_contact_viewed_v1') : null;
      return raw ? JSON.parse(raw) : {};
    } catch (e) { return {}; }
  }
  function hasViewedContactToday(targetType, targetId, day) {
    var store = contactViewStore();
    return !!store[contactViewKey(targetType, targetId, day)];
  }
  function markContactViewed(targetType, targetId, day) {
    try {
      if (typeof localStorage === 'undefined') return;
      var store = contactViewStore();
      store[contactViewKey(targetType, targetId, day)] = 1;
      localStorage.setItem('v20_contact_viewed_v1', JSON.stringify(store));
    } catch (e) { /* bỏ qua — lần sau trừ lại theo RPC */ }
  }

  // ---- Chuyển xu (chốt 20:23 + điều kiện 30 ngày 20:25 ngày 07/11) ----
  // Kiểm tra phía client trước khi gọi RPC: đủ số dư, ≥10, số nguyên,
  // không phải email của mình. Trả chuỗi lỗi tiếng Việt hoặc null.
  function validateTransfer(input) {
    var o = input || {};
    var email = String(o.recipientEmail || '').trim().toLowerCase();
    var myEmail = String(o.myEmail || '').trim().toLowerCase();
    var amount = Number(o.amount);
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'Hãy nhập email người nhận đúng định dạng.';
    if (myEmail && email === myEmail) return 'Không chuyển xu cho chính mình.';
    if (!amount || isNaN(amount) || Math.floor(amount) !== amount) return 'Số xu chuyển phải là số nguyên.';
    if (amount < TRANSFER_MIN_POINTS) return 'Chuyển xu tối thiểu 10 xu/lần.';
    if (Number(o.balance) < amount) return 'Số dư xu của bạn không đủ để chuyển.';
    return null;
  }
  // Gọi RPC transfer_points(p_recipient_email, p_amount, p_note).
  // RPC trả TABLE (ok, message, current_streak, days_remaining); ok=false +
  // message='not_eligible' khi chưa đủ 30 ngày online. Lỗi cứng raise
  // exception phía server: recipient_not_found / cannot_transfer_to_self /
  // amount_below_minimum / insufficient_balance / not_logged_in.
  // Trả {ok, code, message, current_streak, days_remaining} — KHÔNG ném lỗi.
  async function transferPoints(recipientEmail, amount, note) {
    try {
      var s = await sessionUser();
      var res = await s.api.client.rpc('transfer_points', {
        p_recipient_email: String(recipientEmail || '').trim(),
        p_amount: Math.floor(Number(amount || 0)),
        p_note: note ? String(note).slice(0, 200) : null
      });
      if (res.error) {
        var msg = rpcErrorText(res);
        var code = 'transfer_failed';
        ['recipient_not_found', 'cannot_transfer_to_self', 'amount_below_minimum', 'insufficient_balance', 'not_logged_in', 'not_eligible'].forEach(function (c) {
          if (msg.indexOf(c) !== -1) code = c;
        });
        if (code === 'transfer_failed' && (/PGRST202/i.test(msg) || /Could not find the function/i.test(msg))) code = 'rpc_missing';
        return { ok: false, code: code, message: msg, current_streak: 0, days_remaining: 30 };
      }
      var row = Array.isArray(res.data) ? (res.data[0] || {}) : (res.data || {});
      return {
        ok: row.ok !== false,
        code: row.ok === false ? String(row.message || 'transfer_failed') : 'ok',
        message: String(row.message || (row.ok === false ? 'Chưa chuyển được xu.' : 'Đã chuyển xu.')),
        current_streak: Number(row.current_streak || 0),
        days_remaining: Number(row.days_remaining || 0)
      };
    } catch (e) {
      if (typeof console !== 'undefined' && console.error) console.error('[reward v2] transfer_points lỗi:', e);
      return { ok: false, code: 'transfer_failed', message: String((e && e.message) || e), current_streak: 0, days_remaining: 30 };
    }
  }
  // Chuỗi online liên tiếp để chuyển xu: RPC get_my_transfer_streak()
  // trả TABLE (current_streak, days_remaining, eligible).
  async function getMyTransferStreak() {
    try {
      var s = await sessionUser();
      var res = await s.api.client.rpc('get_my_transfer_streak', {});
      if (res.error) return { ok: false, current_streak: 0, days_remaining: 30, eligible: false };
      var row = Array.isArray(res.data) ? (res.data[0] || {}) : (res.data || {});
      return {
        ok: true,
        current_streak: Number(row.current_streak || 0),
        days_remaining: Number(row.days_remaining || 0),
        eligible: row.eligible === true || (Number(row.current_streak || 0) >= 30 && Number(row.days_remaining || 0) <= 0)
      };
    } catch (e) { return { ok: false, current_streak: 0, days_remaining: 30, eligible: false }; }
  }
  // Lịch sử chuyển xu (cả gửi + nhận): RPC get_my_transfer_history(p_limit).
  async function getMyTransferHistory(limit) {
    try {
      var s = await sessionUser();
      var res = await s.api.client.rpc('get_my_transfer_history', { p_limit: Math.max(1, Math.min(100, Number(limit) || 20)) });
      if (res.error) return { ok: false, items: [] };
      var items = Array.isArray(res.data) ? res.data : [];
      return { ok: true, items: items };
    } catch (e) { return { ok: false, items: [] }; }
  }
  // Ghi hoạt động ngày (để chuỗi 30 ngày online chạy được): upsert 1 dòng
  // vào user_daily_activity (user_id, activity_date = ngày Asia/Saigon hôm
  // nay). Lỗi thì nuốt lặng, không vỡ trang. Khách vãng lai không ghi
  // (không có session). KHÔNG BAO GIỜ ném lỗi.
  async function recordDailyActivity() {
    try {
      var s = await sessionUser();
      var res = await s.api.client.from('user_daily_activity').upsert(
        { user_id: s.user.id, activity_date: dayKeySaigon(new Date()) },
        { onConflict: 'user_id,activity_date' }
      );
      if (res.error) return false;
      return true;
    } catch (e) { return false; }
  }
  // Ghim bài lên top danh mục: 1 xu = 1 giờ. hours 1..720, trừ xu ngay
  // khi ghim. Trả {ok:true, pin} khi thành công, {ok:false, error} khi lỗi
  // (sai số giờ, không đủ xu, RPC chưa có).
  // Ánh xạ target_type → category theo enum M7.2 (cố định): model_profile→
  // mau, shop_profile→shop, lot→lo, factory→xuong, article→bai-viet,
  // kiot→kiot. pin_post() từ chối category sai cặp nên client luôn map ở đây.
  var PIN_CATEGORY = { model_profile: 'mau', shop_profile: 'shop', lot: 'lo', factory: 'xuong', article: 'bai-viet', kiot: 'kiot' };
  function pinCategoryForTargetType(targetType) {
    return PIN_CATEGORY[targetType] || String(targetType || '');
  }
  async function pinPost(targetType, targetId, category, hours) {
    var herr = validatePinHours(hours);
    if (herr) return { ok: false, error: herr, points: 0 };
    if (!targetType || !targetId) return { ok: false, error: 'Thiếu bài cần ghim.', points: 0 };
    try {
      var s = await sessionUser();
      var res = await s.api.client.rpc('pin_post', {
        p_target_type: String(targetType), p_target_id: String(targetId),
        p_category: pinCategoryForTargetType(category || targetType), p_hours: Math.floor(Number(hours))
      });
      if (res.error) return { ok: false, error: rpcErrorText(res), points: 0 };
      return { ok: true, pin: res.data, cost: pinCostHours(hours) };
    } catch (e) {
      if (typeof console !== 'undefined' && console.error) console.error('[reward v2] pin_post lỗi:', e);
      return { ok: false, error: String((e && e.message) || e), points: 0 };
    }
  }

  // Yêu cầu liên kết MXH: CHỈ tạo pending. Admin duyệt mới tạo dòng active
  // trong social_links. Client không bao giờ tự insert social_links active.
  async function submitSocialLinkRequest(provider, socialId, socialHandle, evidenceUrl) {
    if (PROVIDERS.indexOf(provider) === -1) throw new Error('Nền tảng mạng xã hội không hợp lệ.');
    if (!socialId) throw new Error('Thiếu ID tài khoản mạng xã hội.');
    var w = await ensureWalletRow();
    var res = await w.api.client.from('social_link_requests').insert({
      wallet_id: w.wallet.id, auth_user_id: w.user.id, provider: provider,
      social_id: String(socialId), social_handle: socialHandle || null,
      evidence_url: evidenceUrl || null, status: 'pending'
    }).select().single();
    if (res.error) throw res.error;
    return res.data;
  }

  // Sự kiện tính xu: CHỈ tạo pending, points=0. Admin/Edge Function duyệt
  // mới cộng xu. Bình luận ngoài web vẫn phải qua kiểm chứng ở mục 4 của docs.
  async function submitEngagement(actorType, articleSlug, action, platform, evidenceUrl) {
    if (['model', 'shop'].indexOf(actorType) === -1) throw new Error('Loại tài khoản không hợp lệ.');
    if (['like', 'comment', 'share'].indexOf(action) === -1) throw new Error('Hành động không hợp lệ.');
    if (!articleSlug) throw new Error('Thiếu bài báo.');
    var w = await ensureWalletRow();
    var res = await w.api.client.from('engagement_events').insert({
      wallet_id: w.wallet.id, auth_user_id: w.user.id, actor_type: actorType,
      article_slug: String(articleSlug), action: action, platform: platform || 'platform',
      evidence_url: evidenceUrl || null,
      evidence_hash: evidenceUrl ? normalizeEvidenceUrl(evidenceUrl) : null,
      status: 'pending', points: 0, day_key: dayKeySaigon(new Date())
    }).select().single();
    if (res.error) throw res.error;
    return res.data;
  }

  // Đổi dịch vụ: CHỈ tạo pending, KHÔNG trừ xu/xu. Giá đổi CHƯA CHỐT nên
  // hàm này nhận số xu/xu người dùng muốn dùng, admin kiểm tra số dư và
  // giá chốt rồi mới duyệt. Không có giá mặc định trong code.
  async function submitRewardRedemption(pointsUsed, coinsUsed) {
    var p = Number(pointsUsed || 0), c = Number(coinsUsed || 0);
    if (p + c <= 0) throw new Error('Cần chọn số xu hoặc xu muốn dùng để đổi dịch vụ.');
    var w = await ensureWalletRow();
    var res = await w.api.client.from('reward_redemptions').insert({
      wallet_id: w.wallet.id, auth_user_id: w.user.id,
      service_code: 'tang-chuyen-doi-livestream',
      points_used: p, coins_used: c, status: 'pending'
    }).select().single();
    if (res.error) throw res.error;
    return res.data;
  }

  // Chuyển/tặng (legacy M5, pending-only): quy tắc chuyển xu mới chốt
  // 20:23 ngày 07/11 (tối thiểu 10 xu/lần, bằng email người nhận, không
  // phí, ghi 2 dòng ledger transfer_out/transfer_in) CHƯA có RPC nên hàm
  // này chưa nối với quy tắc mới; giữ lại để code cũ không vỡ. Bán qua
  // nền tảng là khung chờ, hàm submitSale dưới đây từ chối tạo đơn bán cho
  // tới khi cổng thanh toán + chính sách được bật.
  async function submitGift(toWalletId, toAuthUserId, amount, message) {
    var amt = Number(amount || 0);
    if (!toWalletId || !toAuthUserId) throw new Error('Thiếu tài khoản nhận.');
    if (!amt || amt <= 0) throw new Error('Số xu tặng phải lớn hơn 0.');
    if (amt > TRANSFER_LIMITS.maxRewardPointsPerDay) throw new Error('Vượt trần tặng đề xuất trong ngày.');
    var w = await ensureWalletRow();
    if (String(toWalletId) === String(w.wallet.id)) throw new Error('Không tặng cho chính mình.');
    var res = await w.api.client.from('wallet_transfers').insert({
      from_wallet_id: w.wallet.id, to_wallet_id: toWalletId,
      from_auth_user_id: w.user.id, to_auth_user_id: toAuthUserId,
      kind: 'gift', balance_type: 'reward_points', amount: amt,
      message: message || null, status: 'pending'
    }).select().single();
    if (res.error) throw res.error;
    return res.data;
  }
  function submitSale() {
    throw new Error('Bán qua nền tảng là khung chờ, chưa bật: cần cổng thanh toán và chính sách phí/tranh chấp trước khi tạo đơn bán thật.');
  }

  var API = {
    FREE_SERVICES: V20_FREE_SERVICES, // v92: true = lọc + xem liên hệ tạm miễn phí (chỉ ghim tính xu); đổi cờ V20_FREE_SERVICES ở đầu file để mở lại thu phí
    POINTS: POINTS, INTERACTION_POINTS: INTERACTION_POINTS,
    MAX_PER_TYPE_PER_DAY: MAX_PER_TYPE_PER_DAY,
    MAX_INTERACTION_POINTS_PER_DAY: MAX_INTERACTION_POINTS_PER_DAY,
    REGISTRATION_FIELD_POINTS: REGISTRATION_FIELD_POINTS,
    REGISTRATION_FIELD_COUNT: REGISTRATION_FIELD_COUNT,
    REGISTRATION_ACCOUNT_POINTS: REGISTRATION_ACCOUNT_POINTS,
    PIN_POINT_PER_HOUR: PIN_POINT_PER_HOUR, PIN_MIN_HOURS: PIN_MIN_HOURS, PIN_MAX_HOURS: PIN_MAX_HOURS,
    TRANSFER_LIMITS: TRANSFER_LIMITS, PROVIDERS: PROVIDERS,
    dayKeySaigon: dayKeySaigon, validateComment: validateComment,
    normalizeEvidenceUrl: normalizeEvidenceUrl, canEarnToday: canEarnToday, pointsFor: pointsFor,
    pointsForInteraction: pointsForInteraction, pinCostHours: pinCostHours,
    validatePinHours: validatePinHours, canEarnInteractionToday: canEarnInteractionToday,
    registrationPoints: registrationPoints, isPinActive: isPinActive, sortPinnedFirst: sortPinnedFirst,
    pinCategoryForTargetType: pinCategoryForTargetType, PIN_CATEGORY: PIN_CATEGORY,
    awardRegistration: awardRegistration, awardInteraction: awardInteraction,
    getMyPointsBalance: getMyPointsBalance, pinPost: pinPost,
    getMyPointsBalanceResult: getMyPointsBalanceResult,
    getMyPointsSummary: getMyPointsSummary,
    formatVnDateTime: formatVnDateTime,
    POINTS_HISTORY_LABELS: POINTS_HISTORY_LABELS, pointsHistoryLabel: pointsHistoryLabel,
    getMyPointsHistory: getMyPointsHistory,
    PRICES: PRICES, FILTER_DEDUP_MS: FILTER_DEDUP_MS, TRANSFER_MIN_POINTS: TRANSFER_MIN_POINTS,
    spendPoints: spendPoints, filterChargeBucket: filterChargeBucket,
    shouldChargeFilter: shouldChargeFilter, contactViewKey: contactViewKey,
    hasViewedContactToday: hasViewedContactToday, markContactViewed: markContactViewed,
    validateTransfer: validateTransfer, transferPoints: transferPoints,
    getMyTransferStreak: getMyTransferStreak, getMyTransferHistory: getMyTransferHistory,
    recordDailyActivity: recordDailyActivity,
    submitSocialLinkRequest: submitSocialLinkRequest, submitEngagement: submitEngagement,
    submitRewardRedemption: submitRewardRedemption, submitGift: submitGift, submitSale: submitSale
  };
  if (typeof window !== 'undefined') window.Ver2Reward = API;
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
})();
