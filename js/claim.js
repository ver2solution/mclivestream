/* v165 — Nhan so huu ho so (profile claim V1, 12/11/2026).
   V2 (21/11/2026, thiet ke DA DUYET 13:49): cham diem ung vien (SĐT
   +50 / email +40 / ten +20 / tinh +10 / linh vuc +10 / link nguon
   +20, tran 100, hien toi da 5, nguong >=20), bang chung 3 loai
   (source_account_link / source_code_post / manual_review),
   trang thai disputed/revoked, huy hieu muc xac minh L0–L3, tab duyet
   claim trong console admin (js/admin.js). Chi frontend: 3 bang moi
   (identity_evidence, claim_disputes, audit_events) + RPC duyet/gan/
   tranh chap/thu hoi CHUA CO — migration cho backup V5-00 xong moi
   chay; moi ham goi backend deu tra {supported:false} khi RPC/bang
   chua co, khong crash, khong hien du lieu gia.
   Bang profile_claims DA CO live (xac minh REST 13:5x 21/11: HTTP 200;
   migration 12/11 da chay). Luat cung: matcher chi tao ung vien,
   KHONG BAO GIO tu cap quyen (khong ham nao gan quyen khi chua co
   admin duyet + RPC gan ho so). */
(function () {
  'use strict';

  var TABLE_NOT_READY_MSG = 'Chức năng nhận sở hữu đang được kích hoạt, bạn liên hệ Zalo 032 998 3699 để được hỗ trợ nhé.';
  var ZALO_URL = 'https://zalo.me/0329983699';

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  /* Chuan hoa SDT ve khoa so sanh: chi giu chu so; bo ma quoc gia 84;
     bo so 0 dau; lay 9 so cuoi (so thue bao). Vd: '+84 969 151 680',
     '0969151680', '969151680' -> cung khoa '969151680'. */
  function phoneKey(v) {
    var d = String(v || '').replace(/\D/g, '');
    if (d.length >= 11 && d.indexOf('84') === 0) d = d.slice(2);
    if (d.length === 10 && d.charAt(0) === '0') d = d.slice(1);
    if (d.length < 9) return '';
    return d.slice(-9);
  }
  function maskPhone(v) {
    var d = String(v || '').replace(/\D/g, '');
    if (!d) return '';
    return '••••••' + d.slice(-3);
  }
  function normName(v) {
    return String(v || '').toLowerCase().replace(/\s+/g, ' ').replace(/^\s+|\s+$/g, '');
  }
  function normEmail(v) { return String(v || '').trim().toLowerCase(); }

  /* Lien he cua 1 ho so thu thap: chi lay SDT (provider zalo/phone)
     + email — khong lay link Facebook (khong dung de khop danh tinh). */
  function itemContacts(item) {
    var out = { phones: [], emails: [] };
    var list = (item && item.contacts) || [];
    for (var i = 0; i < list.length; i++) {
      var c = list[i] || {};
      var p = String(c.provider || '').toLowerCase();
      var val = String(c.value || '').trim();
      if (!val) continue;
      if (p === 'zalo' || p === 'phone' || p === 'sdt' || p === 'tel') {
        var k = phoneKey(val);
        if (k) out.phones.push(k);
      } else if (p === 'email' || p === 'mail') {
        out.emails.push(normEmail(val));
      }
    }
    return out;
  }

  /* Tim ho so thu thap khop voi user. Tra ve:
     { phoneMatches: [{kind,id,name}], nameMatches: [...], dataLoaded: bool }
     phoneMatches = trung SDT hoac email (du dieu kien hien nut nhan).
     nameMatches = chi trung TEN (chi canh bao nhe, khong hien nut). */
  function findMatches(userPhone, userEmail, userName) {
    var D = (typeof window !== 'undefined') ? window.V20_DATA : null;
    var phoneMatches = [], nameMatches = [];
    if (!D) return { phoneMatches: phoneMatches, nameMatches: nameMatches, dataLoaded: false };
    var pk = phoneKey(userPhone);
    var em = normEmail(userEmail);
    var nm = normName(userName);
    function scan(list, kind) {
      for (var i = 0; i < (list || []).length; i++) {
        var it = list[i];
        if (!it || !it.id) continue;
        var c = itemContacts(it);
        var hit = false;
        if (pk && c.phones.indexOf(pk) !== -1) hit = true;
        if (!hit && em && c.emails.indexOf(em) !== -1) hit = true;
        if (hit) { phoneMatches.push({ kind: kind, id: it.id, name: it.name || it.id }); continue; }
        if (nm && normName(it.name) === nm) nameMatches.push({ kind: kind, id: it.id, name: it.name || it.id });
      }
    }
    scan(D.models, 'model');
    scan(D.shops, 'shop');
    return { phoneMatches: phoneMatches, nameMatches: nameMatches, dataLoaded: true };
  }

  function findProfile(kind, id) {
    var D = (typeof window !== 'undefined') ? window.V20_DATA : null;
    if (!D) return null;
    var list = kind === 'shop' ? (D.shops || []) : (D.models || []);
    for (var i = 0; i < list.length; i++) {
      if (list[i] && list[i].id === id) return list[i];
    }
    return null;
  }

  /* ---- V2: cham diem ung vien (chi xep hang goi y, KHONG cap quyen) ----
     SDT khop +50; email khop +40; ten khop +20; cung tinh +10; cung
     linh vuc +10; URL nguon trung +20; tran 100. Can it nhat 1 trong
     3 can cuoc (SDT/email/ten) moi tinh diem — chi tinh/linh vuc
     (khong ten/SDT/email) = 0, tranh goi y bua. */
  function normPlace(v) {
    return String(v || '').replace(/\s+/g, ' ').replace(/^\s+|\s+$/g, '').toLowerCase();
  }
  function normUrl(v) {
    var s = String(v || '').trim();
    while (s.length > 1 && s.charAt(s.length - 1) === '/') s = s.slice(0, -1);
    return s;
  }
  function sourceUrls(item) {
    var out = [];
    var list = (item && item.contacts) || [];
    for (var i = 0; i < list.length; i++) {
      var u = normUrl((list[i] || {}).source_url);
      if (u) out.push(u);
    }
    return out;
  }
  function scoreCandidate(item, user) {
    var reasons = [];
    var score = 0;
    if (!item || !item.id) return { score: 0, reasons: reasons };
    var u = user || {};
    var c = itemContacts(item);
    var pk = phoneKey(u.phone);
    var em = normEmail(u.email);
    var nm = normName(u.name);
    var phoneHit = !!(pk && c.phones.indexOf(pk) !== -1);
    var emailHit = !!(em && c.emails.indexOf(em) !== -1);
    var nameHit = !!(nm && normName(item.name) === nm);
    if (!phoneHit && !emailHit && !nameHit) return { score: 0, reasons: reasons };
    if (phoneHit) { score += 50; reasons.push('Trùng SĐT'); }
    if (emailHit) { score += 40; reasons.push('Trùng email'); }
    if (nameHit) { score += 20; reasons.push('Trùng tên'); }
    if (u.province && normPlace(item.province) && normPlace(item.province) === normPlace(u.province)) {
      score += 10; reasons.push('Cùng tỉnh');
    }
    if (u.category && normPlace(item.cat) && normPlace(item.cat) === normPlace(u.category)) {
      score += 10; reasons.push('Cùng lĩnh vực');
    }
    if (u.sourceUrl) {
      var su = normUrl(u.sourceUrl);
      var urls = sourceUrls(item);
      if (su && urls.indexOf(su) !== -1) { score += 20; reasons.push('Trùng link nguồn'); }
    }
    if (score > 100) score = 100;
    return { score: score, reasons: reasons };
  }

  /* V2: tim ung vien xep hang cho user. Tra ve:
     { candidates: toi da 5 (trung SDT/email, diem giam dan, kem
       canClaim=true + reasons), nameOnly: toi da 5 (chi trung ten,
       canClaim=false — chi canh bao, khong nut nhan), dataLoaded } */
  function findCandidates(user) {
    var D = (typeof window !== 'undefined') ? window.V20_DATA : null;
    var out = { candidates: [], nameOnly: [], dataLoaded: false };
    if (!D) return out;
    out.dataLoaded = true;
    var u = user || {};
    function scan(list, kind) {
      for (var i = 0; i < (list || []).length; i++) {
        var it = list[i];
        if (!it || !it.id) continue;
        var s = scoreCandidate(it, u);
        var c = itemContacts(it);
        var pk = phoneKey(u.phone);
        var em = normEmail(u.email);
        var nm = normName(u.name);
        var phoneHit = !!(pk && c.phones.indexOf(pk) !== -1);
        var emailHit = !!(em && c.emails.indexOf(em) !== -1);
        var nameHit = !!(nm && normName(it.name) === nm);
        if ((phoneHit || emailHit) && s.score >= 20) {
          out.candidates.push({ kind: kind, id: it.id, name: it.name || it.id, province: it.province || '', category: it.cat || '', score: s.score, reasons: s.reasons, canClaim: true });
        } else if (nameHit) {
          out.nameOnly.push({ kind: kind, id: it.id, name: it.name || it.id, province: it.province || '', category: it.cat || '', score: s.score, reasons: s.reasons, canClaim: false });
        }
      }
    }
    scan(D.models, 'model');
    scan(D.shops, 'shop');
    function byScoreDesc(a, b) {
      if (b.score !== a.score) return b.score - a.score;
      return String(a.name).localeCompare(String(b.name), 'vi');
    }
    out.candidates.sort(byScoreDesc);
    out.nameOnly.sort(byScoreDesc);
    out.candidates = out.candidates.slice(0, 5);
    out.nameOnly = out.nameOnly.slice(0, 5);
    return out;
  }

  /* v269 (MC-94, 15/11/2026): localStorage dung chung giua cac tai khoan
     tren cung trinh duyet — khoa chung 'v2s_signup_prefs' lam SDT/email
     cua TK truoc roi sang banner/TK sau (goc MC-94/MC-92: banner chi cho
     SDT 0969151680 hien ca khi dang nhap TK khac). Thu tu moi: (1)
     user_metadata.phone_zalo; (2) khoa RIENG 'v2s_signup_prefs_<user.id>';
     (3) khoa chung CHI KHI shared.contactEmail khop email TK hien tai
     (giong v221 o trang-cua-toi.html). */
  function getUserContact(user) {
    var md = (user && user.user_metadata) || {};
    var phone = md.phone_zalo || '';
    var email = (user && user.email) || md.contact_email || '';
    var acctEmail = (user && user.email) || md.contact_email || '';
    var uid = (user && user.id) ? String(user.id) : '';
    function readPrefs(key){
      try {
        if (typeof window === 'undefined' || !window.localStorage) return null;
        return JSON.parse(window.localStorage.getItem(key) || 'null');
      } catch (e) { return null; }
    }
    var p = uid ? readPrefs('v2s_signup_prefs_' + uid) : null;
    if (p) {
      if (!phone && p.phoneZalo) phone = p.phoneZalo;
      if (!email && p.contactEmail) email = p.contactEmail;
    }
    if ((!phone || !email) && acctEmail) {
      var shared = readPrefs('v2s_signup_prefs');
      if (shared && shared.contactEmail === acctEmail) {
        if (!phone && shared.phoneZalo) phone = shared.phoneZalo;
        if (!email && shared.contactEmail) email = shared.contactEmail;
      }
    }
    return { phone: phone, email: email };
  }

  function getSession() {
    var A = (typeof window !== 'undefined') ? window.V2SAuthUI : null;
    if (A && typeof A.getSessionRobust === 'function') return A.getSessionRobust(3000);
    if (A && typeof A.getSession === 'function') return A.getSession();
    var M = (typeof window !== 'undefined') ? window.McLivestreamAPI : null;
    if (M && typeof M.getSession === 'function') return M.getSession();
    return Promise.resolve(null);
  }

  function friendly(err) {
    var M = (typeof window !== 'undefined') ? window.McLivestreamAPI : null;
    if (M && typeof M.friendlyError === 'function') return M.friendlyError(err);
    return 'Đã có lỗi xảy ra, hãy thử lại sau.';
  }

  function submitClaim(profileId, kind) {
    var M = (typeof window !== 'undefined') ? window.McLivestreamAPI : null;
    if (!M || typeof M.submitProfileClaim !== 'function') return Promise.reject(new Error(TABLE_NOT_READY_MSG));
    return M.submitProfileClaim(profileId, kind).catch(function (err) {
      if (M.isTableMissingError && M.isTableMissingError(err)) throw new Error(TABLE_NOT_READY_MSG);
      throw err;
    });
  }

  function fetchClaim(profileId) {
    var M = (typeof window !== 'undefined') ? window.McLivestreamAPI : null;
    if (!M || typeof M.fetchMyProfileClaim !== 'function') return Promise.resolve(null);
    return M.fetchMyProfileClaim(profileId).catch(function (err) {
      if (M.isTableMissingError && M.isTableMissingError(err)) return null;
      throw err;
    });
  }

  /* ---- V2: bang chung + goi backend (graceful khi RPC/bang chua co) ----
     3 bang moi + RPC duyet/gan/tranh chap/thu hoi thuoc goi A (migration),
     CHUA CO live (cho backup V5-00). Moi ham duoi day thu goi backend neu
     co, tra {supported:false} khi chua co — khong crash, khong hien du
     lieu gia. Bang chung user nop duoc luu tam tren trinh duyet cua
     chinh user do (localStorage) de doi chieu sau, khong gui di dau. */
  var EVIDENCE_KINDS = {
    source_account_link: 'Liên kết tài khoản nguồn',
    source_code_post: 'Mã xác minh đăng trên nguồn',
    manual_review: 'Đối soát tay (ghi chú)'
  };
  function validateEvidence(kind, detail) {
    if (!EVIDENCE_KINDS[kind]) return { ok: false, error: kind === 'business_doc' ? 'Bằng chứng doanh nghiệp chỉ admin xác minh, bạn chọn loại khác nhé.' : 'Loại bằng chứng không hợp lệ.' };
    var d = String(detail || '').trim();
    if (!d) return { ok: false, error: 'Bạn nhập nội dung bằng chứng nhé.' };
    if (d.length > 500) return { ok: false, error: 'Nội dung bằng chứng tối đa 500 ký tự.' };
    if (kind === 'source_account_link' && !/^https?:\/\//i.test(d)) return { ok: false, error: 'Liên kết nguồn phải bắt đầu bằng http:// hoặc https://.' };
    return { ok: true };
  }
  function getApi(api) {
    if (api) return api;
    return (typeof window !== 'undefined') ? window.McLivestreamAPI : null;
  }
  function isMissingBackendError(err) {
    var msg = String((err && (err.message || err.code)) || err || '').toLowerCase();
    return msg.indexOf('42p01') !== -1 || msg.indexOf('pgrst205') !== -1
      || msg.indexOf('pgrst202') !== -1 || msg.indexOf('does not exist') !== -1
      || msg.indexOf('not found') !== -1 || msg.indexOf('404') !== -1
      || msg.indexOf('could not find the function') !== -1;
  }
  function storeEvidenceLocal(profileId, userId, kind, detail) {
    try {
      if (typeof window === 'undefined' || !window.localStorage) return false;
      var key = 'v2s_claim_evidence_' + String(userId || 'anon') + '_' + String(profileId || '');
      window.localStorage.setItem(key, JSON.stringify({ kind: kind, detail: String(detail || '').slice(0, 500), at: new Date().toISOString() }));
      return true;
    } catch (e) { return false; }
  }
  function readEvidenceLocal(profileId, userId) {
    try {
      if (typeof window === 'undefined' || !window.localStorage) return null;
      var key = 'v2s_claim_evidence_' + String(userId || 'anon') + '_' + String(profileId || '');
      return JSON.parse(window.localStorage.getItem(key) || 'null');
    } catch (e) { return null; }
  }
  function submitEvidence(api, claimId, kind, detail, profileId, userId) {
    var v = validateEvidence(kind, detail);
    if (!v.ok) return Promise.resolve({ ok: false, error: v.error });
    var M = getApi(api);
    storeEvidenceLocal(profileId || claimId, userId, kind, detail);
    if (!M || typeof M.insertEvidence !== 'function') {
      return Promise.resolve({ ok: true, supported: false, stored: 'local', note: 'Bằng chứng đã lưu trên trình duyệt của bạn — hệ thống xét duyệt hoàn thiện sẽ nhận lại sau.' });
    }
    return M.insertEvidence(claimId, kind, detail).then(function (res) {
      return { ok: true, supported: true, stored: 'backend', data: res || null };
    }).catch(function (err) {
      if (isMissingBackendError(err)) return { ok: true, supported: false, stored: 'local', note: 'Bằng chứng đã lưu trên trình duyệt của bạn — hệ thống xét duyệt hoàn thiện sẽ nhận lại sau.' };
      throw err;
    });
  }
  /* Cac RPC goi A (chua co live): thu goi neu co, tra {supported:false}
     neu chua co — tab admin hien thong bao cho migration thay vi crash. */
  function callRpc(api, fnName, args) {
    var M = getApi(api);
    if (!M || typeof M[fnName] !== 'function') return Promise.resolve({ supported: false });
    var out;
    try { out = M[fnName].apply(M, args || []); } catch (e) {
      if (isMissingBackendError(e)) return Promise.resolve({ supported: false });
      return Promise.reject(e);
    }
    return Promise.resolve(out).then(function (res) {
      if (res && typeof res === 'object' && 'supported' in res) return res;
      return { supported: true, ok: true, data: res };
    }).catch(function (err) {
      if (isMissingBackendError(err)) return { supported: false };
      throw err;
    });
  }
  function loadPendingClaims(api) { return callRpc(api, 'getPendingClaims', []); }
  function reviewClaim(api, claimId, action, note) { return callRpc(api, 'reviewClaim', [claimId, action, note]); }
  function linkProfile(api, claimId) { return callRpc(api, 'linkProfileToUser', [claimId]); }
  function openDispute(api, profileId, kind, reason) { return callRpc(api, 'openDispute', [profileId, kind, reason]); }
  function revokeClaim(api, claimId, reason) { return callRpc(api, 'revokeClaim', [claimId, reason]); }
  function withdrawClaim(api, claimId) { return callRpc(api, 'withdrawClaim', [claimId]); }

  /* ---- V2: may trang thai claim (thuan, khong cham DB) ---- */
  function resolveSecondClaim(existingStatus) {
    if (existingStatus === 'pending' || existingStatus === 'approved' || existingStatus === 'disputed') return 'disputed';
    return 'pending';
  }
  function canRequestDelete(claim) { return !!(claim && claim.status === 'approved'); }
  var DELETE_ACTIONS = ['delete_requested', 'delete_done'];
  var CLAIM_AUDIT_ACTIONS = ['claim_submitted', 'claim_approved', 'claim_rejected', 'profile_linked', 'profile_unlinked', 'dispute_opened', 'dispute_resolved', 'claim_revoked', 'delete_requested', 'delete_done'];

  /* ---- V2: muc xac minh L0–L3 (khong bao gio hien L0 nhu da xac minh) ----
     L1: co claim approved (qua doi chieu admin — V2 chua co OTP).
     L2: approved + ho so da gan cho user. L3: shop approved + bang chung
     business_doc da duoc admin xac minh. */
  function verificationLevel(input) {
    var inp = input || {};
    var claims = inp.claims || [];
    var linked = inp.linkedProfileIds || [];
    var evidence = inp.evidence || [];
    var approved = null;
    for (var i = 0; i < claims.length; i++) {
      if (claims[i] && claims[i].status === 'approved') { approved = claims[i]; break; }
    }
    if (!approved) return 'L0';
    var isLinked = linked.indexOf(approved.profile_id) !== -1;
    if (!isLinked) return 'L1';
    var bizOk = false;
    for (var j = 0; j < evidence.length; j++) {
      if (evidence[j] && evidence[j].kind === 'business_doc' && evidence[j].verified) { bizOk = true; break; }
    }
    if (bizOk && (approved.profile_kind === 'shop' || approved.kind === 'shop')) return 'L3';
    return 'L2';
  }
  function verificationBadgeHTML(level) {
    if (level === 'L1') return '<span class="verify-badge l1" title="Đã xác minh qua đối chiếu admin">✓ Đã xác minh L1</span>';
    if (level === 'L2') return '<span class="verify-badge l2" title="Đã xác minh hồ sơ — đã gán cho chủ hợp lệ">✓ Đã xác minh L2</span>';
    if (level === 'L3') return '<span class="verify-badge l3" title="Đã xác minh tổ chức">✓ Đã xác minh L3</span>';
    return '';
  }

  /* ---- UI: hop thoai xac nhan nhan so huu (inline, thay the noi dung
     cua container truyen vao) ---- */
  /* V2: them muc bang chung (tuy chon — khong nop van gui duoc nhu V1).
     3 loai: lien ket tai khoan nguon / ma xac minh dang tren nguon /
     doi soat tay. business_doc chi admin xac minh, khong co o day. */
  function claimDialogHTML(profile, masked) {
    return '<div class="claim-box">'
      + '<p><b>Hồ sơ này có phải của bạn không?</b></p>'
      + '<p>Số Zalo bạn đã đăng ký (<b>' + esc(masked) + '</b>) trùng với liên hệ trên hồ sơ <b>' + esc(profile.name) + '</b>. Chỉ chủ hồ sơ mới được nhận sở hữu.</p>'
      + '<p><label class="claim-commit"><input type="checkbox" class="claim-confirm"> Tôi cam kết đây là hồ sơ của chính tôi, thông tin liên hệ trên hồ sơ là của tôi.</label></p>'
      + '<p><label>Bằng chứng sở hữu (không bắt buộc — có bằng chứng admin duyệt nhanh hơn):<br>'
      + '<select class="claim-evidence-kind"><option value="">— Không nộp bằng chứng ngay —</option>'
      + '<option value="source_account_link">Liên kết tài khoản nguồn (dán URL trang cá nhân / bài đăng gốc)</option>'
      + '<option value="source_code_post">Mã xác minh đăng trên nguồn (đăng mã do hệ thống cấp lên bài / tường nguồn)</option>'
      + '<option value="manual_review">Đối soát tay (ghi chú để admin liên hệ xác minh)</option>'
      + '</select></label></p>'
      + '<p class="claim-evidence-detail-wrap" hidden><input type="text" class="claim-evidence-detail" placeholder="Dán link hoặc nhập nội dung bằng chứng" maxlength="500"></p>'
      + '<p><button class="btn btn-primary claim-submit" type="button" disabled>Gửi yêu cầu nhận sở hữu</button> '
      + '<button class="btn btn-ghost claim-cancel" type="button">Hủy</button></p>'
      + '<p class="claim-msg"></p>'
      + '<p class="claim-note">Admin sẽ đối chiếu với bài gốc trên Facebook rồi duyệt — thường trong 24 giờ. Sau khi duyệt, bạn tự sửa được hồ sơ này tại Trang của tôi.</p>'
      + '</div>';
  }

  function wireClaimDialog(box, profile, user, onClose) {
    var confirm = box.querySelector('.claim-confirm');
    var submit = box.querySelector('.claim-submit');
    var cancel = box.querySelector('.claim-cancel');
    var msgEl = box.querySelector('.claim-msg');
    var evKind = box.querySelector('.claim-evidence-kind');
    var evDetailWrap = box.querySelector('.claim-evidence-detail-wrap');
    var evDetail = box.querySelector('.claim-evidence-detail');
    if (!confirm || !submit || !cancel) return;
    confirm.addEventListener('change', function () { submit.disabled = !confirm.checked; });
    if (evKind && evDetailWrap) {
      evKind.addEventListener('change', function () {
        evDetailWrap.hidden = !evKind.value;
        if (evDetail) evDetail.placeholder = evKind.value === 'source_account_link' ? 'Dán URL trang cá nhân / bài đăng gốc (https://…)' : evKind.value === 'source_code_post' ? 'Nhập mã xác minh bạn đã đăng trên nguồn' : 'Ghi chú để admin liên hệ xác minh';
      });
    }
    cancel.addEventListener('click', function () { if (typeof onClose === 'function') onClose(); });
    submit.addEventListener('click', function () {
      if (submit.disabled) return;
      var kind = evKind ? evKind.value : '';
      var detail = evDetail ? evDetail.value : '';
      if (kind) {
        var v = validateEvidence(kind, detail);
        if (!v.ok) {
          if (msgEl) { msgEl.textContent = v.error; msgEl.className = 'claim-msg err'; }
          return;
        }
      }
      submit.disabled = true;
      if (msgEl) { msgEl.textContent = 'Đang gửi yêu cầu…'; msgEl.className = 'claim-msg'; }
      submitClaim(profile.id, profile.kind).then(function (claimRes) {
        var claimId = (claimRes && claimRes.id) || profile.id;
        var afterEvidence = function (evNote) {
          var done = '✓ Đã gửi yêu cầu nhận sở hữu hồ sơ <b>' + esc(profile.name) + '</b>. Yêu cầu đang chờ admin duyệt — bạn sẽ thấy hồ sơ này ở Trang của tôi sau khi được duyệt.';
          if (evNote) done += '<br><span class="claim-evidence-note">' + esc(evNote) + '</span>';
          box.innerHTML = '<p class="claim-done">' + done + '</p>';
        };
        if (!kind) { afterEvidence(''); return; }
        var uid = (user && user.id) ? String(user.id) : '';
        submitEvidence(null, claimId, kind, detail, profile.id, uid).then(function (ev) {
          afterEvidence(ev && ev.note ? ev.note : '');
        }, function () { afterEvidence(''); });
      }, function (err) {
        submit.disabled = false;
        if (msgEl) {
          msgEl.textContent = friendly(err);
          msgEl.className = 'claim-msg err';
        }
      });
    });
  }

  /* V2: them disputed/revoked + nut rut yeu cau (pending). Chuoi V1
     (pending/approved/rejected) giu nguyen — test hoi quy khop. */
  function claimStatusHTML(claim, profile, opts) {
    if (!claim) return '';
    var showWithdraw = !!(opts && opts.showWithdraw);
    if (claim.status === 'pending') return '<p class="claim-status">⏳ Yêu cầu nhận sở hữu hồ sơ <b>' + esc(profile.name) + '</b> đang chờ admin duyệt.</p>'
      + (showWithdraw ? '<p><button class="btn btn-ghost btn-sm claim-withdraw" type="button" data-claim-profile="' + esc(claim.profile_id || profile.id) + '">Rút yêu cầu</button> <span class="claim-withdraw-msg"></span></p>' : '');
    if (claim.status === 'approved') return '<p class="claim-status ok">✓ Hồ sơ <b>' + esc(profile.name) + '</b> đã được gán cho bạn — sửa tại <a href="trang-cua-toi.html">Trang của tôi</a>.</p>';
    if (claim.status === 'rejected') return '<p class="claim-status err">Yêu cầu nhận sở hữu hồ sơ <b>' + esc(profile.name) + '</b> đã bị từ chối — kiểm tra lại thông tin rồi gửi lại nếu đúng là hồ sơ của bạn.</p>';
    if (claim.status === 'disputed') return '<p class="claim-status warn">⚖️ Hồ sơ <b>' + esc(profile.name) + '</b> đang được xem xét tranh chấp — tạm ẩn khỏi tìm kiếm. Admin sẽ đối chiếu bằng chứng của các bên rồi quyết định.</p>';
    if (claim.status === 'revoked') return '<p class="claim-status err">Quyền sở hữu hồ sơ <b>' + esc(profile.name) + '</b> đã bị thu hồi. Nếu bạn là chủ thật, nhắn <a href="' + ZALO_URL + '" target="_blank" rel="noopener">Zalo 032 998 3699</a> để khiếu nại.</p>';
    return '';
  }

  /* V2: gan su kien nut "Rut yeu cau" trong 1 container. RPC rut chua
     co (goi A) -> hien huong dan lien he admin/Zalo thay vi gia vo. */
  function wireWithdrawButtons(container) {
    if (!container || typeof document === 'undefined') return;
    var btns = container.querySelectorAll ? container.querySelectorAll('.claim-withdraw') : [];
    btns.forEach(function (btn) {
      if (btn._v2sWithdrawWired) return;
      btn._v2sWithdrawWired = true;
      btn.addEventListener('click', function () {
        var claimId = btn.getAttribute('data-claim-profile') || '';
        var msgEl = container.querySelector('.claim-withdraw-msg');
        btn.disabled = true;
        withdrawClaim(null, claimId).then(function (res) {
          if (res && res.supported) {
            if (msgEl) msgEl.textContent = 'Đã rút yêu cầu.';
            btn.style.display = 'none';
          } else {
            btn.disabled = false;
            if (msgEl) msgEl.textContent = 'Chức năng rút đang chờ hệ thống xét duyệt hoàn thiện — nhắn Zalo 032 998 3699 để admin rút giúp bạn.';
          }
        }, function () {
          btn.disabled = false;
          if (msgEl) msgEl.textContent = 'Đã có lỗi xảy ra, hãy thử lại sau.';
        });
      });
    });
  }

  /* Mo hop thoai trong container; onClose khoi phuc lai nut kich hoat. */
  function openClaimDialog(container, profile, user, onClose) {
    if (!container) return;
    var c = getUserContact(user);
    container.innerHTML = claimDialogHTML(profile, maskPhone(c.phone));
    wireClaimDialog(container, profile, user, onClose);
  }

  /* ---- (1) Trang cua toi: banner de xuat sau dang nhap ----
     V2: dung findCandidates — ung vien xep hang theo diem + ly do
     "Vi sao duoc goi y"; toi da 5 ung vien; nameOnly giu banner mem V1. */
  function renderMyPageBanner(banner, user, serverName) {
    var c = getUserContact(user);
    var m = findCandidates({ phone: c.phone, email: c.email, name: serverName });
    if (!m.dataLoaded) {
      /* data.js chua tai xong (defer) — thu lai 1 lan sau 1.5s. */
      return new Promise(function (resolve) {
        setTimeout(function () {
          if ((typeof window !== 'undefined') && window.V20_DATA) {
            renderMyPageBanner(banner, user, serverName).then(resolve, resolve);
          } else { resolve('nodata'); }
        }, 1500);
      });
    }
    var html = '';
    if (m.candidates.length) {
      html += '<div class="claim-banner"><p><b>🔎 Tìm thấy hồ sơ khớp với bạn</b></p>'
        + '<p>Các hồ sơ dưới đây có số Zalo / email trùng với thông tin bạn đã đăng ký. Nếu đây là hồ sơ của bạn, hãy nhận sở hữu để tự sửa thông tin:</p>';
      m.candidates.forEach(function (p) {
        html += '<div class="claim-row" data-claim-row="' + esc(p.id) + '">'
          + '<span><b>' + esc(p.name) + '</b> (' + (p.kind === 'shop' ? 'shop' : 'mẫu') + ')' + (p.province ? ' · ' + esc(p.province) : '') + '</span><br>'
          + '<span class="claim-reasons">Vì sao được gợi ý: ' + esc(p.reasons.join(' · ')) + '</span> '
          + '<button class="btn btn-primary btn-sm claim-open" type="button" data-claim-profile="' + esc(p.id) + '" data-claim-kind="' + esc(p.kind) + '" data-claim-name="' + esc(p.name) + '">Nhận sở hữu hồ sơ này</button>'
          + '<span class="claim-row-status"></span></div>';
      });
      html += '<div class="claim-dialog-slot"></div></div>';
    }
    if (m.nameOnly.length) {
      html += '<div class="claim-banner soft"><p><b>ℹ️ Tìm thấy hồ sơ có tên giống bạn</b></p><p>'
        + m.nameOnly.map(function (p) { return '<b>' + esc(p.name) + '</b> (' + (p.kind === 'shop' ? 'shop' : 'mẫu') + ')'; }).join(', ')
        + ' — chưa trùng SĐT/email nên chưa nhận sở hữu được. Nếu là hồ sơ của bạn, nhắn <a href="' + ZALO_URL + '" target="_blank" rel="noopener">Zalo 032 998 3699</a> để admin đối chiếu.</p></div>';
    }
    banner.innerHTML = html;
    if (!html) return Promise.resolve('nomatch');
    /* Trang thai yeu cau da gui (neu co) + gan su kien nut nhan. */
    var slot = banner.querySelector('.claim-dialog-slot');
    var jobs = m.candidates.map(function (p) {
      return fetchClaim(p.id).then(function (claim) {
        var row = banner.querySelector('[data-claim-row="' + p.id + '"]');
        if (!row) return;
        var st = row.querySelector('.claim-row-status');
        var btn = row.querySelector('.claim-open');
        if (!claim) return;
        if (claim.status === 'pending') {
          if (btn) btn.style.display = 'none';
          if (st) st.innerHTML = '⏳ Đang chờ admin duyệt. <button class="btn btn-ghost btn-sm claim-withdraw" type="button" data-claim-profile="' + esc(p.id) + '">Rút yêu cầu</button> <span class="claim-withdraw-msg"></span>';
          wireWithdrawButtons(row);
        } else if (claim.status === 'approved') {
          if (btn) btn.style.display = 'none';
          if (st) st.innerHTML = '✓ Đã được duyệt — sửa tại <a href="trang-cua-toi.html">Trang của tôi</a>.';
        } else if (claim.status === 'disputed') {
          if (btn) btn.style.display = 'none';
          if (st) st.innerHTML = '⚖️ Đang xem xét tranh chấp.';
        } else if (claim.status === 'revoked') {
          if (btn) btn.style.display = 'none';
          if (st) st.innerHTML = 'Quyền sở hữu đã bị thu hồi.';
        }
      }, function () {});
    });
    banner.querySelectorAll('.claim-open').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var profile = {
          id: btn.getAttribute('data-claim-profile'),
          kind: btn.getAttribute('data-claim-kind'),
          name: btn.getAttribute('data-claim-name')
        };
        openClaimDialog(slot, profile, user, function () {
          if (slot) slot.innerHTML = '';
          renderMyPageBanner(banner, user, serverName);
        });
      });
    });
    return Promise.all(jobs).then(function () { return 'ok'; });
  }

  /* Kiem tra lai chi phan trung TEN khi user vua go ten vao form
     (o myFullName) — hien/cap nhat canh bao nhe ma khong doi lai
     phan trung SDT. */
  function checkNameMatch(user, name) {
    var banner = (typeof document !== 'undefined') ? document.getElementById('claimBanner') : null;
    if (!banner || !name) return;
    var c = getUserContact(user);
    var m = findMatches(c.phone, c.email, name);
    if (!m.dataLoaded || !m.nameMatches.length) return;
    var old = banner.querySelector('.claim-banner.soft');
    if (old) return; /* da co canh bao — khong lap lai */
    var div = document.createElement('div');
    div.className = 'claim-banner soft';
    div.innerHTML = '<p><b>ℹ️ Tìm thấy hồ sơ có tên giống bạn</b></p><p>'
      + m.nameMatches.map(function (p) { return '<b>' + esc(p.name) + '</b> (' + (p.kind === 'shop' ? 'shop' : 'mẫu') + ')'; }).join(', ')
      + ' — chưa trùng SĐT/email nên chưa nhận sở hữu được. Nếu là hồ sơ của bạn, nhắn <a href="' + ZALO_URL + '" target="_blank" rel="noopener">Zalo 032 998 3699</a> để admin đối chiếu.</p>';
    banner.appendChild(div);
  }

  function initMyPageClaim(session, serverName) {
    var banner = (typeof document !== 'undefined') ? document.getElementById('claimBanner') : null;
    if (!banner) return Promise.resolve('nobanner');
    var user = session && session.user ? session.user : null;
    if (!user) { banner.innerHTML = ''; return Promise.resolve('none'); }
    return renderMyPageBanner(banner, user, serverName || '').catch(function () { return 'error'; });
  }

  /* ---- (2) Trang chi tiet: dien nut nhan vao .claim-slot ---- */
  function fillClaimSlots() {
    var slots = (typeof document !== 'undefined')
      ? document.querySelectorAll('.claim-slot') : [];
    if (!slots.length) return Promise.resolve('noslot');
    return getSession().then(function (s) {
      var user = s && s.user ? s.user : null;
      if (!user) return 'nouser';
      var c = getUserContact(user);
      var jobs = [];
      slots.forEach(function (slot) {
        if (slot._v2sClaimDone) return;
        slot._v2sClaimDone = true;
        var id = slot.getAttribute('data-claim-profile');
        var kind = slot.getAttribute('data-claim-kind') || 'model';
        var profile = findProfile(kind, id);
        if (!profile) return;
        var contacts = itemContacts(profile);
        var pk = phoneKey(c.phone);
        var em = normEmail(c.email);
        var matched = (pk && contacts.phones.indexOf(pk) !== -1)
          || (em && contacts.emails.indexOf(em) !== -1);
        if (!matched) return;
        jobs.push(fetchClaim(id).then(function (claim) {
          if (claim && (claim.status === 'pending' || claim.status === 'approved' || claim.status === 'disputed' || claim.status === 'revoked')) {
            slot.innerHTML = claimStatusHTML(claim, profile, { showWithdraw: claim.status === 'pending' });
            wireWithdrawButtons(slot);
            return;
          }
          var btnHtml = '<button class="btn btn-primary claim-open" type="button">Đây là hồ sơ của bạn? Nhận sở hữu</button>'
            + '<div class="claim-dialog-slot"></div>';
          if (claim && claim.status === 'rejected') {
            btnHtml = claimStatusHTML(claim, profile) + btnHtml;
          }
          slot.innerHTML = btnHtml;
          var btn = slot.querySelector('.claim-open');
          var dlg = slot.querySelector('.claim-dialog-slot');
          if (btn) btn.addEventListener('click', function () {
            btn.style.display = 'none';
            openClaimDialog(dlg, profile, user, function () {
              if (dlg) dlg.innerHTML = '';
              if (btn) btn.style.display = '';
              fillClaimSlots();
            });
          });
        }, function () {}));
      });
      return Promise.all(jobs).then(function () { return 'ok'; });
    }).catch(function () { return 'error'; });
  }

  /* Trang chi tiet render xong o DOMContentLoaded (app.js) — claim.js
     nap SAU app.js nen handler nay chay sau, slot da co trong DOM.
     Dang ky them lang nghe doi phien (dang nhap tab khac) de dien lai
     nut khi user doi. */
  function autoInit() {
    if (typeof document === 'undefined') return;
    function run() { fillClaimSlots(); }
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', run);
    } else {
      run();
    }
    try {
      var A = (typeof window !== 'undefined') ? window.V2SAuthUI : null;
      if (A && typeof A.onSessionChange === 'function') {
        A.onSessionChange(function (user) {
          if (!user) return;
          document.querySelectorAll('.claim-slot').forEach(function (s) { s._v2sClaimDone = false; s.innerHTML = ''; });
          fillClaimSlots();
        });
      }
    } catch (e) {}
  }
  autoInit();

  var api = {
    phoneKey: phoneKey,
    maskPhone: maskPhone,
    normName: normName,
    normEmail: normEmail,
    itemContacts: itemContacts,
    findMatches: findMatches,
    findProfile: findProfile,
    getUserContact: getUserContact,
    submitClaim: submitClaim,
    fetchClaim: fetchClaim,
    initMyPageClaim: initMyPageClaim,
    checkNameMatch: checkNameMatch,
    fillClaimSlots: fillClaimSlots,
    claimStatusHTML: claimStatusHTML,
    TABLE_NOT_READY_MSG: TABLE_NOT_READY_MSG,
    /* V2 */
    scoreCandidate: scoreCandidate,
    findCandidates: findCandidates,
    EVIDENCE_KINDS: EVIDENCE_KINDS,
    validateEvidence: validateEvidence,
    submitEvidence: submitEvidence,
    storeEvidenceLocal: storeEvidenceLocal,
    readEvidenceLocal: readEvidenceLocal,
    loadPendingClaims: loadPendingClaims,
    reviewClaim: reviewClaim,
    linkProfile: linkProfile,
    openDispute: openDispute,
    revokeClaim: revokeClaim,
    withdrawClaim: withdrawClaim,
    resolveSecondClaim: resolveSecondClaim,
    canRequestDelete: canRequestDelete,
    DELETE_ACTIONS: DELETE_ACTIONS,
    CLAIM_AUDIT_ACTIONS: CLAIM_AUDIT_ACTIONS,
    verificationLevel: verificationLevel,
    verificationBadgeHTML: verificationBadgeHTML
  };

  if (typeof window !== 'undefined') window.V2SClaim = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})();
