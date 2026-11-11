/* v96: kich hoat ho so sau dang ky (thiet ke 08/11/2026 — "Tao ho so
   trong 2 phut").
   - Panel (A) tren dang-ky.html: chi hien khi tai khoan DA DANG NHAP ma
     CHUA CO ho so (mau hoac shop); tai khoan da co ho so giu hop
     "Da dang nhap" cu. Khong xac dinh duoc (loi mang/Supabase) thi giu
     hop cu, khong hien panel sai.
   - Dai (B) tren trang chu: cung dieu kien + chua bam x tat (localStorage).
   - "Co ho so" dung dung cach kiem tra cua form Trang cua toi /
     form ho so shop: McLivestreamAPI.fetchMyProfile() /
     fetchMyShopProfile(). Loai tai khoan lay tu
     user.user_metadata.account_type ('model' | 'shop'); khong co thi
     do ca 2 loai, mac dinh 'model' khi chua co ho so nao.
   - Khong doi schema, khong them migration, khong sua js/data.js,
     khong doi validation hay luong duyet ho so. Tat ca chu dong deu
     qua textContent (khong chen HTML tu du lieu nguoi dung). */
(function () {
  'use strict';

  var DISMISS_KEY = 'v2s-activation-dismissed';

  /* Copy theo dung thiet ke 08/11. Nhom chuan bi khop dung nhan cac
     truong BAT BUOC (*) cua form that: mau = 9 truong cua
     trang-cua-toi.html#myProfileForm; shop = 3 truong cua
     danh-sach-mau.html#shopProfileForm. Khong ghi so diem co dinh
     (diem chi hien khi RPC tra ve > 0, xem showPointsLine). */
  var CONTENT = {
    model: {
      title: 'Tài khoản đã xong — tạo hồ sơ trong 2 phút',
      sub: 'Shop chỉ liên hệ được với mẫu có hồ sơ. Hồ sơ mới gửi ở trạng thái chờ duyệt, chỉ hiện công khai sau khi admin duyệt.',
      prep: [
        '✓ Thông tin của bạn: họ tên, ngày sinh, quê quán',
        '✓ Việc bạn muốn làm: nơi làm việc, lĩnh vực, kinh nghiệm, học vấn',
        '✓ Liên hệ: số Zalo, email'
      ],
      optional: 'Điền thêm nếu muốn được tìm thấy nhanh hơn: lương mong muốn, lịch làm việc, ảnh, video demo.',
      ctaText: 'Tạo hồ sơ mẫu của tôi →',
      ctaHref: 'trang-cua-toi.html',
      ctaTrack: 'tao-ho-so-mau-sau-dang-ky',
      laterText: 'Để sau — xem mẫu đang được tuyển →',
      laterHref: 'danh-sach-mau.html',
      stripTitle: 'Chưa có hồ sơ — shop chưa tìm thấy bạn',
      stripSub: 'Tạo trong 2 phút: tên, tỉnh, lĩnh vực, lương, lịch làm — hồ sơ chờ duyệt rồi mới hiện công khai.',
      stripCtaText: 'Tạo hồ sơ ngay →',
      stripCtaHref: 'trang-cua-toi.html'
    },
    shop: {
      title: 'Tài khoản đã xong — tạo hồ sơ shop trong 2 phút',
      sub: 'Mẫu chỉ ứng tuyển được vào shop có hồ sơ. Hồ sơ mới gửi ở trạng thái chờ duyệt, chỉ hiện công khai sau khi admin duyệt.',
      prep: [
        '✓ Tên shop',
        '✓ Tỉnh / Thành phố shop ở đó',
        '✓ Cửa hàng có hoặc không'
      ],
      optional: 'Điền thêm nếu muốn được tìm thấy nhanh hơn: địa chỉ, số điện thoại, email, mặt hàng kinh doanh, giờ livestream, kênh livestream.',
      ctaText: 'Tạo hồ sơ shop →',
      ctaHref: 'danh-sach-mau.html#ho-so-shop', // A3 10/11 un-swap v96
      ctaTrack: 'tao-ho-so-shop-sau-dang-ky',
      laterText: 'Để sau — xem mẫu trước →',
      laterHref: 'danh-sach-mau.html',
      stripTitle: 'Chưa có hồ sơ shop — mẫu chưa ứng tuyển được',
      stripSub: 'Tạo trong 2 phút: tên, tỉnh, lĩnh vực, lương, lịch làm — hồ sơ chờ duyệt rồi mới hiện công khai.',
      stripCtaText: 'Tạo hồ sơ ngay →',
      stripCtaHref: 'danh-sach-mau.html#ho-so-shop' // A3 10/11 un-swap v96
    }
  };

  function $(id) {
    return (typeof document !== 'undefined' && document.getElementById) ? document.getElementById(id) : null;
  }

  function getSessionUser() {
    /* 1 nguon dung: V2SAuthUI.getSession() (xem trang-cua-toi.html);
       McLivestreamAPI.getSession() chi la du phong. */
    try {
      var A = (typeof window !== 'undefined') ? window.V2SAuthUI : null;
      if (A && typeof A.getSession === 'function') {
        return A.getSession().then(function (s) { return (s && s.user) ? s.user : null; });
      }
    } catch (e) {}
    try {
      var M = (typeof window !== 'undefined') ? window.McLivestreamAPI : null;
      if (M && typeof M.getSession === 'function') {
        return M.getSession().then(function (s) { return (s && s.user) ? s.user : null; });
      }
    } catch (e) {}
    return Promise.resolve(null);
  }

  function getAccountType(user) {
    if (!user) return '';
    var md = user.user_metadata || {};
    var t = md.account_type || '';
    return (t === 'model' || t === 'shop') ? t : '';
  }

  function fetchProfileByType(type) {
    var M = (typeof window !== 'undefined') ? window.McLivestreamAPI : null;
    if (!M) return Promise.reject(new Error('Chưa kết nối Supabase.'));
    if (type === 'shop') {
      if (typeof M.fetchMyShopProfile !== 'function') return Promise.reject(new Error('Thiếu hàm fetchMyShopProfile.'));
      return M.fetchMyShopProfile();
    }
    if (typeof M.fetchMyProfile !== 'function') return Promise.reject(new Error('Thiếu hàm fetchMyProfile.'));
    return M.fetchMyProfile();
  }

  /* Cache theo user.id trong phien trang: panel (init) + quyet dinh
     chuyen trang (decidePostSignup) dung chung 1 lan kiem tra. */
  var checkCache = {};
  function checkActivation(user) {
    if (!user || !user.id) return Promise.reject(new Error('Chưa đăng nhập.'));
    var key = user.id;
    if (checkCache[key]) return checkCache[key];
    var type = getAccountType(user);
    function finish(hasProfile, accountType) {
      return { hasProfile: !!hasProfile, accountType: accountType };
    }
    var promise;
    if (type === 'model' || type === 'shop') {
      promise = fetchProfileByType(type).then(function (row) { return finish(!!row, type); });
    } else {
      /* Khong ro loai: thu ho so mau truoc, roi ho so shop; chua co ho
         so nao thi mac dinh 'model' (luong chinh cua san). */
      promise = fetchProfileByType('model').then(function (row) {
        if (row) return finish(true, 'model');
        return fetchProfileByType('shop').then(function (shopRow) {
          return finish(!!shopRow, shopRow ? 'shop' : 'model');
        });
      });
    }
    checkCache[key] = promise;
    promise.then(null, function () { delete checkCache[key]; });
    return promise;
  }

  function fillPanel(c, user) {
    var title = $('activationTitle'); if (title) title.textContent = c.title;
    var sub = $('activationSub'); if (sub) sub.textContent = c.sub;
    var prep = $('activationPrep');
    if (prep) {
      while (prep.firstChild) prep.removeChild(prep.firstChild);
      c.prep.forEach(function (line) {
        var li = document.createElement('li');
        li.textContent = line;
        prep.appendChild(li);
      });
    }
    var opt = $('activationOptional'); if (opt) opt.textContent = c.optional;
    var cta = $('activationCta');
    if (cta) {
      cta.textContent = c.ctaText;
      cta.setAttribute('href', c.ctaHref);
      cta.setAttribute('data-track', c.ctaTrack);
    }
    var later = $('activationLater');
    if (later) {
      later.textContent = c.laterText;
      later.setAttribute('href', c.laterHref);
    }
    var em = $('activationEmail'); if (em) em.textContent = user.email || '';
  }

  function wirePanelSignOut() {
    var btn = $('activationSignOut');
    if (!btn || btn._v2sActivationWired) return;
    btn._v2sActivationWired = true;
    btn.addEventListener('click', function () {
      /* Dung dung luong dang xuat cua auth-ui.js (nut goc trong hop cu). */
      var orig = $('authSignOut');
      if (orig && typeof orig.click === 'function') { orig.click(); return; }
      try {
        var M = (typeof window !== 'undefined') ? window.McLivestreamAPI : null;
        if (M && typeof M.signOut === 'function') M.signOut();
      } catch (e) {}
      try { if (typeof window !== 'undefined' && window.location) window.location.reload(); } catch (e) {}
    });
  }

  /* 'panel' = da hien panel (chua co ho so); 'old' = giu hop cu (da co
     ho so); 'error' = khong xac dinh duoc, giu hop cu; 'none' = khong
     co panel tren trang nay hoac chua dang nhap. */
  function maybeShowRegisterPanel(user) {
    if (!user) return Promise.resolve('none');
    var panel = $('activationPanel');
    if (!panel) return Promise.resolve('none');
    return checkActivation(user).then(function (r) {
      if (r.hasProfile) return 'old';
      fillPanel(CONTENT[r.accountType] || CONTENT.model, user);
      var box = $('authUserBox'); if (box) box.style.display = 'none';
      panel.hidden = false;
      wirePanelSignOut();
      return 'panel';
    }, function () { return 'error'; });
  }

  function initRegisterPanel() {
    var panel = $('activationPanel');
    if (!panel) return Promise.resolve('none');
    return getSessionUser().then(function (user) {
      if (!user) return 'none';
      return maybeShowRegisterPanel(user);
    }, function () { return 'error'; });
  }

  /* v165 (claim — sua loi Rion (a) 12/11): dong bo lai panel khi phien
     doi (dang ky xong / dang nhap o tab khac). Panel truoc day chi
     render 1 lan luc tai trang (initRegisterPanel) nen email cu van
     hien trong khi header da hien tai khoan moi — trang hien lan 2
     dong dang nhap khac email nhau. An panel truoc roi danh gia lai
     cho user hien tai (checkActivation cache theo user.id nen user moi
     duoc kiem tra moi, khong dung ket qua cu). */
  function refreshRegisterPanel(user) {
    var panel = $('activationPanel');
    if (!panel) return Promise.resolve('none');
    panel.hidden = true;
    if (!user) return Promise.resolve('none');
    return maybeShowRegisterPanel(user);
  }

  function isDismissed() {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        return window.localStorage.getItem(DISMISS_KEY) === '1';
      }
    } catch (e) {}
    return false;
  }

  function fillStrip(c) {
    var t = $('activationStripTitle'); if (t) t.textContent = c.stripTitle;
    var s = $('activationStripSub'); if (s) s.textContent = c.stripSub;
    var cta = $('activationStripCta');
    if (cta) {
      cta.textContent = c.stripCtaText;
      cta.setAttribute('href', c.stripCtaHref);
      cta.setAttribute('data-track', 'tao-ho-so-trang-chu');
    }
  }

  function wireStripClose() {
    var btn = $('activationStripClose');
    if (!btn || btn._v2sActivationWired) return;
    btn._v2sActivationWired = true;
    btn.addEventListener('click', function () {
      var strip = $('kich-hoat-ho-so');
      if (strip) strip.hidden = true;
      try {
        if (typeof window !== 'undefined' && window.localStorage) window.localStorage.setItem(DISMISS_KEY, '1');
      } catch (e) {}
    });
  }

  /* 'strip' = da hien dai; 'none' = khach vang lai / khong co dai;
     'dismissed' = nguoi dung da bam x truoc do; 'old' = da co ho so;
     'error' = khong xac dinh duoc, giu an. */
  function initHomeStrip() {
    var strip = $('kich-hoat-ho-so');
    if (!strip) return Promise.resolve('none');
    if (isDismissed()) return Promise.resolve('dismissed');
    return getSessionUser().then(function (user) {
      if (!user) return 'none';
      return checkActivation(user).then(function (r) {
        if (r.hasProfile) return 'old';
        fillStrip(CONTENT[r.accountType] || CONTENT.model);
        strip.hidden = false;
        wireStripClose();
        return 'strip';
      }, function () { return 'error'; });
    }, function () { return 'error'; });
  }

  /* Dong diem trong panel: chi hien khi RPC award_registration_points()
     tra ve diem > 0 (auth-ui.js goi ham nay). Khong tu ghi so co dinh. */
  function showPointsLine(points) {
    var el = $('activationPoints');
    if (!el) return;
    var n = Number(points || 0);
    if (!(n > 0)) return;
    el.textContent = 'Bạn nhận được ' + n + ' xu thưởng!';
    el.hidden = false;
  }

  var api = {
    CONTENT: CONTENT,
    DISMISS_KEY: DISMISS_KEY,
    getAccountType: getAccountType,
    checkActivation: checkActivation,
    maybeShowRegisterPanel: maybeShowRegisterPanel,
    refreshRegisterPanel: refreshRegisterPanel,
    decidePostSignup: maybeShowRegisterPanel,
    initRegisterPanel: initRegisterPanel,
    initHomeStrip: initHomeStrip,
    showPointsLine: showPointsLine,
    _resetCache: function () { checkCache = {}; }
  };

  if (typeof window !== 'undefined') window.V2SActivation = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})();
