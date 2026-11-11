/* v165 — Nhan so huu ho so (profile claim V1, 12/11/2026).
   Quy tac chot 05/11/2026 23:38: chi chu ho so dang ky tai khoan, khop
   thong tin lien he moi duoc sua/huy ho so. Phan chu dong (de xuat so
   huu) truoc day CHUA duoc code — chi co dong chu tinh (ownerNoteHTML)
   + comment app.js v42. Zalo + Rion test doc lap 12/11 deu khong thay
   de xuat o buoc nao (dang ky xong chi bao "Tai khoan da xong",
   trang-cua-toi.html chi la form trang, ho-so.html?id=th-03 cung khong
   co nut nhan so huu).
   V1 (nhe, anh Tho chot theo toan quyen): trung SDT/email chi HIEN nut
   de xuat — user xac nhan SDT + tick cam ket -> yeu cau pending ->
   admin duyet tay (doi chieu bai goc Facebook) roi moi gan ho so.
   KHONG cho nhan chi vi trung SDT (SDT cong khai ai cung thay duoc).
   V2 (gui ma OTP ve SDT/Zalo) de sau — chua co ha tang gui ma.
   Chi trung TEN (khong trung SDT/email) -> chi canh bao nhe, khong
   hien nut nhan; admin doi chieu tay trong hang cho duyet.
   Diem cham:
   (1) trang-cua-toi.html — SAU dang nhap: lay phone_zalo tu
       user_metadata, chuan hoa, tim trong data.js theo contacts[].value;
       khop thi hien banner de xuat. Dat buoc kiem tra o day (SAU dang
       nhap) de tranh tai data.js ~598KB luc dang ky (goi y cua Rion).
   (2) trang chi tiet ho-so.html / chi-tiet-shop.html — khi user da dang
       nhap va SDT trung lien he cua ho so dang xem thi hien nut
       "Day la ho so cua ban? Nhan so huu" (o .claim-slot do
       ownerNoteHTML render).
   Nap sau js/data.js + js/auth-ui.js + mclivestream-supabase.js.
   Thieu 1 trong 3 thi cac ham tra ve trang thai an toan, khong vo trang.
   Bang profile_claims chua co (SQL chua chay) thi bao nhan "chuc nang
   dang duoc kich hoat, lien he Zalo", khong crash. */
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

  function getUserContact(user) {
    var md = (user && user.user_metadata) || {};
    var phone = md.phone_zalo || '';
    var email = (user && user.email) || md.contact_email || '';
    try {
      var p = JSON.parse((typeof window !== 'undefined' && window.localStorage)
        ? (window.localStorage.getItem('v2s_signup_prefs') || 'null') : 'null');
      if (p) {
        if (!phone && p.phoneZalo) phone = p.phoneZalo;
        if (!email && p.contactEmail) email = p.contactEmail;
      }
    } catch (e) {}
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

  /* ---- UI: hop thoai xac nhan nhan so huu (inline, thay the noi dung
     cua container truyen vao) ---- */
  function claimDialogHTML(profile, masked) {
    return '<div class="claim-box">'
      + '<p><b>Hồ sơ này có phải của bạn không?</b></p>'
      + '<p>Số Zalo bạn đã đăng ký (<b>' + esc(masked) + '</b>) trùng với liên hệ trên hồ sơ <b>' + esc(profile.name) + '</b>. Chỉ chủ hồ sơ mới được nhận sở hữu.</p>'
      + '<p><label class="claim-commit"><input type="checkbox" class="claim-confirm"> Tôi cam kết đây là hồ sơ của chính tôi, thông tin liên hệ trên hồ sơ là của tôi.</label></p>'
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
    if (!confirm || !submit || !cancel) return;
    confirm.addEventListener('change', function () { submit.disabled = !confirm.checked; });
    cancel.addEventListener('click', function () { if (typeof onClose === 'function') onClose(); });
    submit.addEventListener('click', function () {
      if (submit.disabled) return;
      submit.disabled = true;
      if (msgEl) { msgEl.textContent = 'Đang gửi yêu cầu…'; msgEl.className = 'claim-msg'; }
      submitClaim(profile.id, profile.kind).then(function () {
        box.innerHTML = '<p class="claim-done">✓ Đã gửi yêu cầu nhận sở hữu hồ sơ <b>' + esc(profile.name) + '</b>. Yêu cầu đang chờ admin duyệt — bạn sẽ thấy hồ sơ này ở Trang của tôi sau khi được duyệt.</p>';
      }, function (err) {
        submit.disabled = false;
        if (msgEl) {
          msgEl.textContent = friendly(err);
          msgEl.className = 'claim-msg err';
        }
      });
    });
  }

  function claimStatusHTML(claim, profile) {
    if (!claim) return '';
    if (claim.status === 'pending') return '<p class="claim-status">⏳ Yêu cầu nhận sở hữu hồ sơ <b>' + esc(profile.name) + '</b> đang chờ admin duyệt.</p>';
    if (claim.status === 'approved') return '<p class="claim-status ok">✓ Hồ sơ <b>' + esc(profile.name) + '</b> đã được gán cho bạn — sửa tại <a href="trang-cua-toi.html">Trang của tôi</a>.</p>';
    if (claim.status === 'rejected') return '<p class="claim-status err">Yêu cầu nhận sở hữu hồ sơ <b>' + esc(profile.name) + '</b> đã bị từ chối — kiểm tra lại thông tin rồi gửi lại nếu đúng là hồ sơ của bạn.</p>';
    return '';
  }

  /* Mo hop thoai trong container; onClose khoi phuc lai nut kich hoat. */
  function openClaimDialog(container, profile, user, onClose) {
    if (!container) return;
    var c = getUserContact(user);
    container.innerHTML = claimDialogHTML(profile, maskPhone(c.phone));
    wireClaimDialog(container, profile, user, onClose);
  }

  /* ---- (1) Trang cua toi: banner de xuat sau dang nhap ---- */
  function renderMyPageBanner(banner, user, serverName) {
    var c = getUserContact(user);
    var m = findMatches(c.phone, c.email, serverName);
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
    if (m.phoneMatches.length) {
      html += '<div class="claim-banner"><p><b>🔎 Tìm thấy hồ sơ khớp với bạn</b></p>'
        + '<p>Các hồ sơ dưới đây có số Zalo / email trùng với thông tin bạn đã đăng ký. Nếu đây là hồ sơ của bạn, hãy nhận sở hữu để tự sửa thông tin:</p>';
      m.phoneMatches.forEach(function (p) {
        html += '<div class="claim-row" data-claim-row="' + esc(p.id) + '">'
          + '<span><b>' + esc(p.name) + '</b> (' + (p.kind === 'shop' ? 'shop' : 'mẫu') + ')</span> '
          + '<button class="btn btn-primary btn-sm claim-open" type="button" data-claim-profile="' + esc(p.id) + '" data-claim-kind="' + esc(p.kind) + '" data-claim-name="' + esc(p.name) + '">Nhận sở hữu hồ sơ này</button>'
          + '<span class="claim-row-status"></span></div>';
      });
      html += '<div class="claim-dialog-slot"></div></div>';
    }
    if (m.nameMatches.length) {
      html += '<div class="claim-banner soft"><p><b>ℹ️ Tìm thấy hồ sơ có tên giống bạn</b></p><p>'
        + m.nameMatches.map(function (p) { return '<b>' + esc(p.name) + '</b> (' + (p.kind === 'shop' ? 'shop' : 'mẫu') + ')'; }).join(', ')
        + ' — chưa trùng SĐT/email nên chưa nhận sở hữu được. Nếu là hồ sơ của bạn, nhắn <a href="' + ZALO_URL + '" target="_blank" rel="noopener">Zalo 032 998 3699</a> để admin đối chiếu.</p></div>';
    }
    banner.innerHTML = html;
    if (!html) return Promise.resolve('nomatch');
    /* Trang thai yeu cau da gui (neu co) + gan su kien nut nhan. */
    var slot = banner.querySelector('.claim-dialog-slot');
    var jobs = m.phoneMatches.map(function (p) {
      return fetchClaim(p.id).then(function (claim) {
        var row = banner.querySelector('[data-claim-row="' + p.id + '"]');
        if (!row) return;
        var st = row.querySelector('.claim-row-status');
        var btn = row.querySelector('.claim-open');
        if (claim && claim.status === 'pending') {
          if (btn) btn.style.display = 'none';
          if (st) st.innerHTML = '⏳ Đang chờ admin duyệt.';
        } else if (claim && claim.status === 'approved') {
          if (btn) btn.style.display = 'none';
          if (st) st.innerHTML = '✓ Đã được duyệt — sửa tại <a href="trang-cua-toi.html">Trang của tôi</a>.';
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
          if (claim && claim.status === 'pending') {
            slot.innerHTML = claimStatusHTML(claim, profile);
            return;
          }
          if (claim && claim.status === 'approved') {
            slot.innerHTML = claimStatusHTML(claim, profile);
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
    TABLE_NOT_READY_MSG: TABLE_NOT_READY_MSG
  };

  if (typeof window !== 'undefined') window.V2SClaim = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})();
