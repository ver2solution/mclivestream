/* v20 — Điểm thưởng tương tác bài báo M5 (LOCAL, CHƯA DEPLOY, CHƯA BẬT).
   Xem docs-diem-thuong-tuong-tac-m5.md trước khi dùng file này.
   Nguyên tắc an toàn, giống M4:
   - Ví thuộc tài khoản nền tảng, MXH chỉ là liên kết xác minh, tối đa 1
     liên kết active / 1 ví, tính trên tổng số nền tảng.
   - Client KHÔNG cộng/trừ số dư, KHÔNG duyệt sự kiện, KHÔNG tự active liên
     kết, KHÔNG tự trừ điểm khi đổi dịch vụ hay chuyển/tặng.
   - Client chỉ tạo: yêu cầu liên kết pending, sự kiện pending với points=0,
     đơn đổi dịch vụ pending, giao dịch chuyển/tặng pending.
   - Bán lấy tiền thật chỉ qua trung gian nền tảng khi có cổng thanh toán +
     chính sách phí/tranh chấp; file này KHÔNG tạo đơn bán thật, chỉ giữ
     kind='sale_platform' ở dạng khung chờ trong SQL, và hàm client dưới đây
     từ chối tạo đơn bán cho tới khi khung đó được bật.
   - Bảng điểm dưới đây là ĐỀ XUẤT, CHƯA CHỐT; giá đổi dịch vụ Tăng chuyển
     đổi Livestream cũng CHƯA CHỐT nên không có hàm đổi theo giá cố định. */
(function () {
  'use strict';
  // Bảng điểm ĐỀ XUẤT, chưa chốt. Đổi 2 cột Shop/Mẫu không làm đổi cấu trúc
  // trần, kiểm chứng hay luồng duyệt.
  var POINTS = {
    shop: { like: 1, comment: 10, share: 20, dailyCap: 50, maxLikePerDay: 5, maxCommentPerDay: 2, maxSharePerDay: 2 },
    model: { like: 1, comment: 5, share: 10, dailyCap: 30, maxLikePerDay: 5, maxCommentPerDay: 2, maxSharePerDay: 2 }
  };
  // Trần chuyển/tặng ĐỀ XUẤT, chưa chốt.
  var TRANSFER_LIMITS = { maxRewardPointsPerDay: 200, maxRecipientsPerDay: 3, minHoldingDays: 7 };
  var PROVIDERS = ['facebook', 'tiktok', 'instagram', 'zalo', 'threads'];

  function dayKeySaigon(date) {
    var d = date || new Date();
    // en-CA cho ra YYYY-MM-DD, múi giờ Asia/Ho_Chi_Minh = giờ Việt Nam.
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
  }
  function validateComment(text) {
    var t = String(text || '').trim();
    if (t.length < 20) return 'Bình luận tính điểm cần từ 20 ký tự trở lên.';
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
  function canEarnToday(actorType, alreadyApprovedToday, newPoints) {
    var table = POINTS[actorType];
    if (!table) return false;
    return (Number(alreadyApprovedToday || 0) + Number(newPoints || 0)) <= table.dailyCap;
  }
  function pointsFor(actorType, action) {
    var table = POINTS[actorType];
    if (!table) return 0;
    return table[action] || 0;
  }
  function api() { return (typeof window !== 'undefined' && window.McLivestreamAPI) ? window.McLivestreamAPI : null; }
  function errMissing() { return new Error('Chưa kết nối được Supabase, hãy thử lại sau.'); }
  async function sessionUser() {
    var a = api(); if (!a) throw errMissing();
    var session = await a.getSession(); if (!session) throw new Error('Cần đăng nhập mới dùng được điểm thưởng.');
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

  // Sự kiện tính điểm: CHỈ tạo pending, points=0. Admin/Edge Function duyệt
  // mới cộng điểm. Bình luận ngoài web vẫn phải qua kiểm chứng ở mục 4 của docs.
  async function submitEngagement(actorType, articleSlug, action, platform, evidenceUrl) {
    if (!POINTS[actorType]) throw new Error('Loại tài khoản không hợp lệ.');
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

  // Đổi dịch vụ: CHỈ tạo pending, KHÔNG trừ điểm/xu. Giá đổi CHƯA CHỐT nên
  // hàm này nhận số điểm/xu người dùng muốn dùng, admin kiểm tra số dư và
  // giá chốt rồi mới duyệt. Không có giá mặc định trong code.
  async function submitRewardRedemption(pointsUsed, coinsUsed) {
    var p = Number(pointsUsed || 0), c = Number(coinsUsed || 0);
    if (p + c <= 0) throw new Error('Cần chọn số điểm hoặc xu muốn dùng để đổi dịch vụ.');
    var w = await ensureWalletRow();
    var res = await w.api.client.from('reward_redemptions').insert({
      wallet_id: w.wallet.id, auth_user_id: w.user.id,
      service_code: 'tang-chuyen-doi-livestream',
      points_used: p, coins_used: c, status: 'pending'
    }).select().single();
    if (res.error) throw res.error;
    return res.data;
  }

  // Chuyển/tặng: CHỈ tạo pending, KHÔNG trừ/cộng. Giai đoạn đầu chỉ cho tặng
  // điểm thưởng (balance_type='reward_points'). Xu nạp giai đoạn đầu KHÔNG
  // tặng/bán. Bán qua nền tảng là khung chờ, hàm này từ chối tạo đơn bán cho
  // tới khi cổng thanh toán + chính sách được bật.
  async function submitGift(toWalletId, toAuthUserId, amount, message) {
    var amt = Number(amount || 0);
    if (!toWalletId || !toAuthUserId) throw new Error('Thiếu tài khoản nhận.');
    if (!amt || amt <= 0) throw new Error('Số điểm tặng phải lớn hơn 0.');
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
    POINTS: POINTS, TRANSFER_LIMITS: TRANSFER_LIMITS, PROVIDERS: PROVIDERS,
    dayKeySaigon: dayKeySaigon, validateComment: validateComment,
    normalizeEvidenceUrl: normalizeEvidenceUrl, canEarnToday: canEarnToday, pointsFor: pointsFor,
    submitSocialLinkRequest: submitSocialLinkRequest, submitEngagement: submitEngagement,
    submitRewardRedemption: submitRewardRedemption, submitGift: submitGift, submitSale: submitSale
  };
  if (typeof window !== 'undefined') window.Ver2Reward = API;
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
})();
