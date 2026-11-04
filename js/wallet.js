/* v20 — Email marketing có đồng ý + ví tiền ảo nền tảng (KHUNG, CHƯA THU TIỀN THẬT).
   Nguyên tắc an toàn, xem docs-email-marketing-va-tien-ao.md:
   - Client KHÔNG cộng/trừ số dư, KHÔNG tạo giao dịch topup/bonus, KHÔNG kích hoạt up top.
   - Client chỉ: lưu đồng ý marketing của chính mình, tạo ví 0 xu, tạo yêu cầu
     nạp tiền ở trạng thái pending, tạo đơn up top ở trạng thái pending.
   - Mọi cộng xu, trừ xu, kích hoạt, hoàn xu phải do admin / Edge Function /
     webhook cổng thanh toán làm sau này. Chưa có cổng thanh toán trong file này.
   - Không có nhân vật ảo, không tạo lượt xem/bình luận/tương tác giả.
     Điểm thưởng chỉ từ hoạt động thật và chỉ do admin/Edge Function ghi nhận. */
(function () {
  'use strict';
  var SERVICES = {
    // placement/sla: sửa điểm thua Fiverr/Collabstr — trước đây chỉ ghi "up top"
    // chung chung, nay ghi rõ vị trí hiển thị, thời gian kích hoạt và thời hạn.
    boost_24h: { label: 'Up top hồ sơ / tin 24 giờ', coins: 20, days: 1, placement: 'Đầu danh sách đã lọc (theo tỉnh/lĩnh vực đang xem)', sla: 'Kích hoạt trong 24 giờ sau khi duyệt' },
    boost_7d: { label: 'Up top hồ sơ / tin 7 ngày', coins: 100, days: 7, placement: 'Đầu danh sách đã lọc (theo tỉnh/lĩnh vực đang xem)', sla: 'Kích hoạt trong 24 giờ sau khi duyệt' },
    pin_home_7d: { label: 'Ghim hồ sơ ở trang chủ 7 ngày (cần duyệt, không đảm bảo vị trí cố định)', coins: 200, days: 7, placement: 'Hàng hồ sơ nổi bật ở trang chủ, trong 2 hàng đã chốt', sla: 'Kích hoạt trong 24 giờ sau khi duyệt' },
    highlight_job_7d: { label: 'Làm nổi bật tin tuyển mẫu 7 ngày', coins: 80, days: 7, placement: 'Khung nổi bật ở đầu danh sách tin đã duyệt của shop', sla: 'Kích hoạt trong 24 giờ sau khi duyệt' }
  };
  // Gói dịch vụ theo kiểu Fiverr/Collabstr nhưng sửa thành của Ver2Solution:
  // giá xu công khai trước khi đăng nhập, không chặn xem hồ sơ bằng gói trả phí.
  var PACKAGES = {
    starter: { label: 'Gói Khởi động', coins: 50, desc: 'Up top 24 giờ + làm nổi bật tin 7 ngày (chọn 1 trong 2 khi dùng).' },
    growth: { label: 'Gói Tăng tốc', coins: 180, desc: 'Up top 7 ngày + làm nổi bật tin 7 ngày.' },
    spotlight: { label: 'Gói Nổi bật', coins: 300, desc: 'Ghim trang chủ 7 ngày + up top 7 ngày.' }
  };
  // Quy đổi ĐỀ XUẤT, chưa phải giá bán đã bật: 1.000 VNĐ = 1 xu, nạp tối thiểu 50.000 VNĐ = 50 xu.
  var COIN_RATE_VND = 1000;
  var MIN_TOPUP_VND = 50000;

  function api() { return window.McLivestreamAPI; }
  function errMissing() { return new Error('Chưa kết nối được Supabase, hãy thử lại sau.'); }

  async function saveMarketingConsent(optIn, accountType, alerts) {
    var a = api(); if (!a) throw errMissing();
    var session = await a.getSession(); if (!session) throw new Error('Cần đăng nhập mới lưu được đồng ý marketing.');
    var row = {
      auth_user_id: session.user.id,
      account_type: accountType || 'model',
      email: session.user.email,
      marketing_opt_in: !!optIn,
      purpose: 'Nhận thông tin, ưu đãi và tin tuyển mẫu từ Ver2Solution',
      source: 'signup_form',
      alert_province: (alerts && alerts.province) || null,
      alert_field: (alerts && alerts.field) || null
    };
    if (optIn) { row.consent_at = new Date().toISOString(); row.withdrawn_at = null; }
    else { row.withdrawn_at = new Date().toISOString(); }
    var res = await a.client.from('marketing_consents')
      .upsert(row, { onConflict: 'auth_user_id' }).select().single();
    if (res.error) throw res.error;
    return res.data;
  }

  async function getMarketingConsent() {
    var a = api(); if (!a) throw errMissing();
    var session = await a.getSession(); if (!session) return null;
    var res = await a.client.from('marketing_consents').select('*')
      .eq('auth_user_id', session.user.id).maybeSingle();
    if (res.error) throw res.error;
    return res.data || null;
  }

  async function ensureWallet() {
    var a = api(); if (!a) throw errMissing();
    var session = await a.getSession(); if (!session) throw new Error('Cần đăng nhập mới xem được ví.');
    var res = await a.client.from('wallet_accounts').select('*')
      .eq('auth_user_id', session.user.id).maybeSingle();
    if (res.error) throw res.error;
    if (res.data) return res.data;
    // Trigger trong migration M4 ép số dư về 0, client không tự tạo ví có tiền.
    var ins = await a.client.from('wallet_accounts')
      .insert({ auth_user_id: session.user.id }).select().single();
    if (ins.error) throw ins.error;
    return ins.data;
  }

  async function fetchMyWalletTransactions(limit) {
    var a = api(); if (!a) throw errMissing();
    var session = await a.getSession(); if (!session) throw new Error('Cần đăng nhập mới xem được lịch sử ví.');
    var res = await a.client.from('wallet_transactions').select('*')
      .eq('auth_user_id', session.user.id)
      .order('created_at', { ascending: false }).limit(limit || 50);
    if (res.error) throw res.error;
    return res.data || [];
  }

  async function fetchMyBoostOrders() {
    var a = api(); if (!a) throw errMissing();
    var session = await a.getSession(); if (!session) throw new Error('Cần đăng nhập mới xem được đơn up top.');
    var res = await a.client.from('boost_orders').select('*')
      .eq('auth_user_id', session.user.id)
      .order('created_at', { ascending: false });
    if (res.error) throw res.error;
    return res.data || [];
  }

  // Yêu cầu nạp tiền: CHỈ tạo pending, KHÔNG cộng xu, KHÔNG thu tiền thật.
  // Khi cổng thanh toán + đối soát được bật sau này, webhook/admin mới đổi
  // trạng thái sang completed và cộng xu; trước lúc đó số dư không đổi.
  async function requestTopUp(vndAmount) {
    var a = api(); if (!a) throw errMissing();
    var vnd = Number(vndAmount);
    if (!vnd || vnd < MIN_TOPUP_VND) throw new Error('Nạp tối thiểu ' + MIN_TOPUP_VND.toLocaleString('vi-VN') + ' VNĐ.');
    var wallet = await ensureWallet();
    var session = await a.getSession();
    var coins = Math.floor(vnd / COIN_RATE_VND);
    var res = await a.client.from('wallet_transactions').insert({
      wallet_id: wallet.id, auth_user_id: session.user.id,
      type: 'topup_request', amount_coins: coins, status: 'pending',
      note: 'Yêu cầu nạp ' + vnd.toLocaleString('vi-VN') + ' VNĐ = ' + coins + ' xu (chờ xác nhận thanh toán, chưa cộng xu).'
    }).select().single();
    if (res.error) throw res.error;
    return res.data;
  }

  // Đơn up top: CHỈ tạo pending, KHÔNG trừ xu, KHÔNG kích hoạt hiển thị.
  // Admin/Edge Function kiểm tra số dư, trừ xu, đặt starts_at/ends_at và
  // đổi sang active; nếu không đủ xu hoặc đối tượng không hợp lệ thì rejected.
  async function createBoostRequest(targetType, targetId, serviceKey) {
    var a = api(); if (!a) throw errMissing();
    var svc = SERVICES[serviceKey]; if (!svc) throw new Error('Dịch vụ up top không hợp lệ.');
    if (targetType !== 'profile' && targetType !== 'job_post') throw new Error('Đối tượng up top không hợp lệ.');
    if (!targetId) throw new Error('Thiếu đối tượng up top.');
    var session = await a.getSession(); if (!session) throw new Error('Cần đăng nhập mới tạo đơn up top.');
    var res = await a.client.from('boost_orders').insert({
      auth_user_id: session.user.id, target_type: targetType, target_id: String(targetId),
      service: serviceKey, duration_days: svc.days, coins_cost: svc.coins, status: 'pending'
    }).select().single();
    if (res.error) throw res.error;
    return res.data;
  }

  window.Ver2Wallet = {
    SERVICES: SERVICES, PACKAGES: PACKAGES, COIN_RATE_VND: COIN_RATE_VND, MIN_TOPUP_VND: MIN_TOPUP_VND,
    saveMarketingConsent: saveMarketingConsent, getMarketingConsent: getMarketingConsent,
    ensureWallet: ensureWallet, fetchMyWalletTransactions: fetchMyWalletTransactions,
    fetchMyBoostOrders: fetchMyBoostOrders, requestTopUp: requestTopUp,
    createBoostRequest: createBoostRequest
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = window.Ver2Wallet;
})();
