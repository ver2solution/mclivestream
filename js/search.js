/* Tìm kiếm v173 (12/11/2026) — theo thiết kế đã duyệt 14:48 ngày 12/11/2026
   (D1 chỉ dữ liệu web mình, D2 trang riêng tim-kiem.html, D3 khớp tên lên trước).
   Tính năng ĐỘC LẬP: chỉ ĐỌC window.V20_DATA (js/data.js), không ghi/sửa dữ liệu,
   không gọi server/Supabase, không log từ khóa (riêng tư — v1 không ghi lại từ khóa).
   Chạy 100% trong trình duyệt: chuẩn hóa → quét 11 mảng → chấm điểm 0–100 → lọc → render.
   Core (normalize/score/search/parseDeepLink/suggest) là hàm thuần — dùng chung cho
   trình duyệt (window.V2S_Search) và test Node (module.exports), 1 nguồn duy nhất.
   Lệch nhỏ so với thiết kế, có lý do (ghi rõ để QA biết):
   - (a) Slug bài báo (item.page, vd .../pham-thoai-58-ty-...) được tính như tiêu đề
     phụ khi chấm điểm (100/80/60 như tiêu đề): dữ liệu thật 12/11 không có bài nào
     có "Phạm Thoại" trong tiêu đề — bài Phạm Thoại chỉ mang tên đó trong slug.
     Không có điểm này thì gõ "Phạm Thoại" ra 0 kết quả, T1 không thể đạt.
   - (b) Lọc mobile dùng hàng chip loại (ngang, cuộn được) thay cho bottom-sheet "Lọc"
     trong thiết kế — cùng chức năng, ít code hơn, không cần JS riêng.
   - (c) Đối sánh tỉnh dùng khóa tỉnh (bỏ "TP."/"Tỉnh", "TP.HCM"="TP. Hồ Chí Minh")
     vì dữ liệu ghi tỉnh không thống nhất (TP.HCM / TP. Hồ Chí Minh / TP HCM). */
(function () {
  'use strict';

  /* ---------- Chuẩn hóa ---------- */
  function normalize(s) {
    return (s || '').toString().toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .replace(/[-_\/\\]+/g, ' ')
      .replace(/[^a-z0-9 ]+/g, ' ')
      .replace(/\s+/g, ' ').trim();
  }
  /* FULL-MC-041 (21/11/2026): tách token từ truy vấn đã chuẩn hóa — bỏ token rỗng,
     bỏ token 1 ký tự, khử trùng, giữ thứ tự. KHÔNG dùng stopword ở v1. */
  function tokenize(q) {
    var seen = {}, out = [];
    (q || '').split(/\s+/).forEach(function (t) {
      if (t && t.length > 1 && !seen[t]) { seen[t] = 1; out.push(t); }
    });
    return out;
  }
  /* Khóa tỉnh để đối sánh: "TP. Hồ Chí Minh" / "TP.HCM" / "TP HCM" -> "ho chi minh". */
  function provKey(s) {
    var k = normalize(s).replace(/^(tp|tinh|thanh pho)\s+/, '').replace(/\s+/g, ' ').trim();
    if (k === 'hcm' || k === 'tp hcm' || k === 'sai gon') k = 'ho chi minh';
    return k;
  }
  /* Ngày: "2026-11-03" (ISO) hoặc "02/11/2026" (DD/MM/YYYY). Lỗi -> 0. */
  function parseDateMs(s) {
    if (!s) return 0;
    s = (s || '').toString().trim();
    var m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (m) return Date.parse(m[1] + '-' + m[2] + '-' + m[3] + 'T00:00:00Z') || 0;
    m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (m) return Date.parse(m[3] + '-' + m[2].padStart(2, '0') + '-' + m[1].padStart(2, '0') + 'T00:00:00Z') || 0;
    var t = Date.parse(s);
    return isNaN(t) ? 0 : t;
  }
  function escHtml(s) {
    return (s == null ? '' : String(s)).replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  /* v283 (MBS-4): thoi gian tim that chi 1–4 ms — (ms/1000).toFixed(2) luon ra "0,00 giay".
     <1s hien mili-giay (1 chu so thap phan), >=1s hien giay 2 chu so thap phan. */
  function fmtElapsed(ms) {
    if (ms >= 1000) return (ms / 1000).toFixed(2).replace('.', ',') + ' giây';
    return ms.toFixed(1).replace('.', ',') + ' ms';
  }

  var TYPE_LABELS = { all: 'Tất cả', mau: 'Mẫu', shop: 'Shop', lo: 'Lô', xuong: 'Xưởng', kiot: 'Kiot', bai: 'Bài báo', 'lop-live': 'Lớp Livestream', 'lop-makeup': 'Lớp Makeup', 'su-kien': 'Sự kiện Marketing', logistics: 'Logistics', 'thue-mb': 'Cho thuê mặt bằng', 'agency-ads': 'Agency Ads Livestream', 'chuyen-nha': 'Dịch vụ chuyển nhà', 'thiet-bi-live': 'Thiết bị Phòng Live' };
  var TYPE_ORDER = ['all', 'mau', 'shop', 'lo', 'xuong', 'kiot', 'lop-live', 'lop-makeup', 'su-kien', 'logistics', 'thue-mb', 'agency-ads', 'chuyen-nha', 'thiet-bi-live', 'bai'];
  /* v179 + v196 + v198: 8 danh muc doi tuong moi — anh xa loai tim kiem -> mang data.js + trang hien thi. */
  var NEWOBJ_META = {
    'lop-live': {label: 'Lớp Livestream / MC / Thuyết trình', page: 'danh-sach-mau.html'},
    'lop-makeup': {label: 'Lớp Makeup', page: 'danh-sach-mau.html'},
    'su-kien': {label: 'Sự kiện Marketing', page: 'danh-sach-shop.html'},
    'logistics': {label: 'Logistics Trung – Việt', page: 'danh-sach-shop.html'},
    'thue-mb': {label: 'Cho thuê cửa hàng / kho hàng', page: 'thanh-ly-kiot.html'},
    'agency-ads': {label: 'Agency Ads Livestream', page: 'danh-sach-shop.html'},
    'chuyen-nha': {label: 'Dịch vụ chuyển nhà', page: 'thanh-ly-kiot.html'},
    'thiet-bi-live': {label: 'Thiết bị Phòng Live', page: 'thanh-ly-kiot.html'}
  };
  var NEWOBJ_DATA_MAP = {'lop-live': 'classesLive', 'lop-makeup': 'classesMakeup', 'su-kien': 'eventsMarketing', 'logistics': 'logistics', 'thue-mb': 'rentals', 'agency-ads': 'agencyAds', 'chuyen-nha': 'movingServices', 'thiet-bi-live': 'liveEquipment'};
  /* v229: nhan loai con Kiot — BAN SAO cua KIOT_SUBTYPES trong js/app.js
     (search.js doc lap, chay ca trong Node test khong co window.V20;
     test v229 doi chieu 2 map phai khop nhau tung ma). */
  var KIOT_SUBTYPE_LABELS = {'tron-goi': 'Chuyển nhà trọn gói', 'thue-xe-tai': 'Thuê xe tải / chở đồ lẻ', 'phong-tro': 'Chuyển phòng trọ / sinh viên', 'van-phong': 'Chuyển văn phòng', 'den-live': 'Đèn phòng live', 'micro': 'Micro & thu âm', 'webcam': 'Webcam & thu hình', 'combo': 'Combo trọn bộ', 'chan-may': 'Chân máy & phụ kiện', 'mat-pho': 'Cửa hàng mặt phố', 'kho-xuong': 'Kho / nhà xưởng'};
  var HOT_FALLBACK = ['mẫu livestream', 'tuyển mẫu livestream', 'Phạm Thoại', 'xả kho thời trang', 'xưởng may', 'thanh lý kiot', 'mẫu livestream Hà Nội', 'livestream bán hàng'];

  /* ---------- Xây chỉ mục 1 lần ---------- */
  function entryFor(type, raw) {
    var e = { type: type, raw: raw, id: raw.id || '', dateMs: parseDateMs(raw.date), dateLabel: raw.date || '' };
    if (type === 'mau') {
      e.title = raw.name || ''; e.desc = raw.title || ''; e.cat = raw.cat || ''; e.prov = raw.province || '';
      /* v258 (PC-S2): them nhan loai chung "mẫu livestream" vao field — truoc day
         tim "mẫu livestream" ra 0 ho so Mau vi khong truong nao cua ho so chua
         dung cum do (ten la ten nguoi, title/cat la linh vuc). Gio moi ho so
         Mau deu khop cum nay (diem 40), nhu cach S1-2 sua "lớp makeup" 11/11. */
      e.field = [raw.title, raw.cat, 'mẫu livestream'].join(' '); e.img = raw.photoUrl || ''; e.salary = raw.salary || '';
      e.url = 'danh-sach-mau.html#' + raw.id; e.chips = [raw.province, raw.cat, raw.salary].filter(Boolean);
      e.status = raw.status || '';
    } else if (type === 'shop') {
      e.title = raw.name || ''; e.desc = raw.product || ''; e.cat = raw.product || ''; e.prov = raw.province || '';
      e.field = [raw.product, raw.channels].join(' '); e.img = raw.logo || ''; e.salary = raw.salary || '';
      e.url = 'danh-sach-shop.html#' + raw.id;
      e.chips = [raw.province, raw.district, raw.channels].filter(Boolean);
    } else if (type === 'bai') {
      e.title = raw.title || ''; e.desc = raw.takeaway || ''; e.cat = raw.cat || ''; e.prov = '';
      e.field = [raw.cat, raw.source].join(' '); e.img = raw.img || '';
      e.slug = raw.page || ''; e.url = raw.page || raw.url || '#';
      e.chips = [raw.cat, raw.source, raw.date].filter(Boolean);
    } else if (type === 'lo') {
      e.title = raw.title || ''; e.desc = raw.meta || ''; e.cat = raw.cat || ''; e.prov = '';
      e.field = raw.cat || ''; e.img = ''; e.label = raw.label || '';
      e.url = 'danh-sach-lo.html#' + raw.id;
      e.chips = [raw.price, raw.qty ? (raw.qty.toLocaleString('vi-VN') + ' món') : '', raw.date].filter(Boolean);
    } else if (type === 'xuong') {
      e.title = raw.name || ''; e.desc = raw.items || ''; e.cat = raw.cat || ''; e.prov = raw.prov || '';
      e.field = raw.items || ''; e.img = ''; e.label = raw.label || '';
      e.url = 'danh-sach-xuong.html#' + raw.id;
      e.chips = [raw.prov, raw.moq ? ('MOQ: ' + raw.moq) : '', raw.date].filter(Boolean);
    } else if (type === 'kiot') {
      e.title = raw.title || ''; e.desc = raw.meta || ''; e.cat = raw.cat || ''; e.prov = raw.prov || '';
      e.field = raw.cat || ''; e.img = raw.img || ''; e.label = raw.label || '';
      e.url = 'thanh-ly-kiot.html#' + raw.id;
      e.chips = [raw.price, raw.prov, raw.date].filter(Boolean);
    } else if (NEWOBJ_META[type]) {
      /* v179 + v196: 7 danh muc moi — tieu de = ten, mo ta = noi dung chi tiet,
         field = don vi to chuc + nhan danh muc (+ hinh thuc van chuyen),
         anh = avatar (bat buoc), chip = tinh + nhan gia/gia + ngay dang. */
      var nm = NEWOBJ_META[type];
      e.title = raw.name || ''; e.desc = raw.detail || ''; e.cat = nm.label; e.prov = raw.province || '';
      /* v229: index them nhan + ma loai con Kiot (vd go "chuyen van phong"
         ra mv-11 qua nhan "Chuyen van phong"; go "capture card" ra le-07
         qua ten + nhan "Webcam & thu hinh"). Khong doi logic xep hang. */
      var stLabel = (raw.subType && KIOT_SUBTYPE_LABELS[raw.subType]) || '';
      e.field = [raw.provider, nm.label, stLabel, raw.subType || '', raw.logisticsOption || ''].join(' ');
      e.img = raw.avatar || '';
      e.url = nm.page + '#' + raw.id;
      e.chips = [raw.province, (raw.priceLabel || '') + ': ' + (raw.price != null ? raw.price.toLocaleString('vi-VN') + 'đ' + (raw.priceSuffix || '') : 'Liên hệ'), raw.dateAdded || ''].filter(Boolean);
    }
    e.nTitle = normalize(e.title);
    e.nSlug = normalize(e.slug || '');
    e.nField = normalize(e.field);
    e.nProv = normalize(e.prov);
    e.nCat = normalize(e.cat);
    e.nDesc = normalize(e.desc);
    e.provK = provKey(e.prov);
    return e;
  }
  function buildIndex(data) {
    data = data || {};
    var out = [];
    var map = { mau: data.models, shop: data.shops, bai: data.articles, lo: data.lots, xuong: data.factories, kiot: data.kiots };
    /* v179 + v196: them 7 mang moi vao chi muc (khong doi logic xep hang). */
    Object.keys(NEWOBJ_DATA_MAP).forEach(function (t) { map[t] = data[NEWOBJ_DATA_MAP[t]]; });
    Object.keys(map).forEach(function (t) {
      (map[t] || []).forEach(function (raw) { out.push(entryFor(t, raw)); });
    });
    return out;
  }
  function countByType(index) {
    var c = { all: index.length, mau: 0, shop: 0, lo: 0, xuong: 0, kiot: 0, bai: 0, 'lop-live': 0, 'lop-makeup': 0, 'su-kien': 0, logistics: 0, 'thue-mb': 0, 'agency-ads': 0, 'chuyen-nha': 0, 'thiet-bi-live': 0 };
    index.forEach(function (e) { if (c[e.type] != null) c[e.type]++; });
    return c;
  }

  /* ---------- Chấm điểm 0–100 (thiết kế mục (a).4) ---------- */
  function titleScore(nText, q) {
    if (!nText || !q) return 0;
    if (nText === q) return 100;
    if (nText.indexOf(q) === 0) return 80;
    if (nText.indexOf(q) !== -1) return 60;
    return 0;
  }
  /* FULL-MC-041: điểm tốt nhất của 1 token trên các trường (thang cũ giữ nguyên:
     tiêu đề/slug 100/80/60 theo titleScore, field 40, tỉnh-danh mục 30, mô tả 20). */
  function fieldScoreForToken(e, tok) {
    var s = 0;
    s = Math.max(s, titleScore(e.nTitle, tok));
    s = Math.max(s, titleScore(e.nSlug, tok)); /* slug bài = tiêu đề phụ (xem ghi chú đầu file) */
    if (e.nField && e.nField.indexOf(tok) !== -1) s = Math.max(s, 40);
    if ((e.nProv && e.nProv.indexOf(tok) !== -1) || (e.nCat && e.nCat.indexOf(tok) !== -1)) s = Math.max(s, 30);
    if (e.nDesc && e.nDesc.indexOf(tok) !== -1) s = Math.max(s, 20);
    return s;
  }
  /* FULL-MC-041: AND giữa các token, OR giữa các trường — một mục khớp khi MỖI
     token đều xuất hiện trong ÍT NHẤT MỘT trường. Điểm = tổng điểm các token,
     chặn trần 100. +20 (chặn 100) khi toàn bộ truy vấn xuất hiện liên tục trong
     tiêu đề/slug — chỉ áp cho truy vấn > 1 token: truy vấn 1 token giữ nguyên
     điểm cũ (titleScore/field/...) nên hồi quy A2 giữ cả tổng lẫn thứ hạng. */
  function scoreEntry(e, q, nowMs) {
    var tokens = tokenize(q);
    if (!tokens.length) return 0;
    var s = 0;
    for (var i = 0; i < tokens.length; i++) {
      var ts = fieldScoreForToken(e, tokens[i]);
      if (ts === 0) return 0; /* thiếu 1 token -> không khớp */
      s += ts;
    }
    s = Math.min(100, s);
    if (tokens.length > 1 && ((e.nTitle && e.nTitle.indexOf(q) !== -1) || (e.nSlug && e.nSlug.indexOf(q) !== -1))) s = Math.min(100, s + 20);
    if (s > 0 && e.dateMs && nowMs && (nowMs - e.dateMs) <= 15 * 86400000 && (nowMs - e.dateMs) >= 0) s = Math.min(100, s + 5);
    return s;
  }
  function byRelevance(a, b) {
    if (b.score !== a.score) return b.score - a.score;
    if (b.dateMs !== a.dateMs) return b.dateMs - a.dateMs;
    return (a.title || '').localeCompare(b.title || '');
  }
  function byNewest(a, b) {
    if (b.dateMs !== a.dateMs) return b.dateMs - a.dateMs;
    if (b.score !== a.score) return b.score - a.score;
    return (a.title || '').localeCompare(b.title || '');
  }

  /* ---------- Tìm kiếm ---------- */
  function search(index, qRaw, opts) {
    opts = opts || {};
    var t0 = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
    var q = normalize(qRaw);
    var type = TYPE_LABELS[opts.type] ? opts.type : 'all';
    var tinhK = opts.tinh ? provKey(opts.tinh) : '';
    var catN = opts.cat ? normalize(opts.cat) : '';
    var sort = opts.sort === 'moi-nhat' ? 'moi-nhat' : 'lien-quan';
    var nowMs = opts.nowMs || Date.now();
    if (!q || q.length < 2) {
      /* v329 (TK-01, 18/11/2026): tra ve SO DEM THAT cua toan bo chi muc
         (truoc day countByType([]) -> tat ca 0, chip loc hien 0 het).
         qRaw giu lai de UI phan biet "chua go gi" voi "go toan ky tu dac
         biet" (TK-02: '%^&*' chuan hoa ve ''). */
      return { q: q, qRaw: qRaw, results: [], counts: countByType(index), total: 0, tooShort: true, elapsedMs: 0, sort: sort, type: type };
    }
    var scored = [];
    index.forEach(function (e) {
      if (tinhK) {
        if (!e.provK) return; /* mục không có tỉnh (lô/bài) thì không khớp lọc tỉnh */
        if (e.provK !== tinhK && e.provK.indexOf(tinhK) === -1 && tinhK.indexOf(e.provK) === -1) return;
      }
      if (catN) {
        var hay = (e.nCat + ' ' + e.nField).replace(/\s+/g, ' ');
        if (hay.indexOf(catN) === -1 && catN.indexOf(e.nCat) === -1) return;
      }
      var s = scoreEntry(e, q, nowMs);
      if (s > 0) { var c = Object.assign({}, e); c.score = s; scored.push(c); }
    });
    scored.sort(sort === 'moi-nhat' ? byNewest : byRelevance);
    var counts = countByType(scored);
    var results = type === 'all' ? scored : scored.filter(function (e) { return e.type === type; });
    var t1 = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
    return { q: q, qRaw: qRaw, results: results, counts: counts, total: results.length, tooShort: false, elapsedMs: t1 - t0, sort: sort, type: type };
  }

  /* ---------- Deep link: tim-kiem.html?q=…&type=…&tinh=…&cat=…&sort=… ---------- */
  function parseDeepLink(search) {
    var p = {};
    try { p = new URLSearchParams(search || ''); } catch (err) { p = { get: function () { return null; } }; }
    var q = (p.get('q') || '').trim();
    var type = (p.get('type') || 'all').toLowerCase();
    if (!TYPE_LABELS[type]) type = 'all';
    var sort = (p.get('sort') || 'lien-quan').toLowerCase();
    if (sort !== 'moi-nhat') sort = 'lien-quan';
    return { q: q, type: type, tinh: (p.get('tinh') || '').trim(), cat: (p.get('cat') || '').trim(), sort: sort };
  }
  function buildDeepLink(state) {
    var parts = [];
    if (state.q) parts.push('q=' + encodeURIComponent(state.q));
    if (state.type && state.type !== 'all') parts.push('type=' + encodeURIComponent(state.type));
    if (state.tinh) parts.push('tinh=' + encodeURIComponent(state.tinh));
    if (state.cat) parts.push('cat=' + encodeURIComponent(state.cat));
    if (state.sort && state.sort !== 'lien-quan') parts.push('sort=' + encodeURIComponent(state.sort));
    return 'tim-kiem.html' + (parts.length ? '?' + parts.join('&') : '');
  }

  /* ---------- Gợi ý tự động (autocomplete) ---------- */
  function hotKeywords() {
    try {
      if (typeof window !== 'undefined' && window.V2S_SEO_KEYWORDS && window.V2S_SEO_KEYWORDS.length) {
        return window.V2S_SEO_KEYWORDS.map(function (k) { return k.kw || k; }).filter(Boolean);
      }
    } catch (err) {}
    return HOT_FALLBACK.slice();
  }
  function suggest(index, qRaw, recentList) {
    var q = normalize(qRaw);
    if (!q || q.length < 2) return { names: [], hot: [], recent: [] };
    var tokens = tokenize(q);
    /* FULL-MC-041: gợi ý tên khi tiêu đề/slug chứa ĐỦ token (thay vì chỉ bắt đầu
       bằng nguyên cụm). Lượt 1 ưu tiên tên bắt đầu bằng token đầu, lượt 2 mọi tên
       chứa đủ token. Khớp cả tiêu đề lẫn slug bài (slug là tên bài trong URL —
       vd bài Phạm Thoại chỉ mang tên đó trong slug, xem ghi chú đầu file). */
    function hasAllTokens(text) {
      if (!text) return false;
      for (var i = 0; i < tokens.length; i++) if (text.indexOf(tokens[i]) === -1) return false;
      return true;
    }
    var names = [], seen = {};
    index.forEach(function (e) {
      if (names.length >= 5) return;
      if (((e.nTitle.indexOf(tokens[0]) === 0 || (e.nSlug && e.nSlug.indexOf(tokens[0]) === 0)) && (hasAllTokens(e.nTitle) || hasAllTokens(e.nSlug))) && !seen[e.title]) { seen[e.title] = 1; names.push({ title: e.title, type: e.type }); }
    });
    if (names.length < 5) {
      index.forEach(function (e) {
        if (names.length >= 5) return;
        if ((hasAllTokens(e.nTitle) || hasAllTokens(e.nSlug)) && !seen[e.title]) { seen[e.title] = 1; names.push({ title: e.title, type: e.type }); }
      });
    }
    var hot = hotKeywords().filter(function (k) { return normalize(k).indexOf(q) !== -1; }).slice(0, 5);
    var recent = (recentList || []).filter(function (r) { return normalize(r).indexOf(q) !== -1; }).slice(0, 3);
    return { names: names, hot: hot, recent: recent };
  }

  var API = {
    normalize: normalize, tokenize: tokenize, provKey: provKey, parseDateMs: parseDateMs, escHtml: escHtml,
    fmtElapsed: fmtElapsed,
    buildIndex: buildIndex, countByType: countByType, scoreEntry: scoreEntry,
    search: search, parseDeepLink: parseDeepLink, buildDeepLink: buildDeepLink,
    suggest: suggest, hotKeywords: hotKeywords, TYPE_LABELS: TYPE_LABELS, TYPE_ORDER: TYPE_ORDER,
    KIOT_SUBTYPE_LABELS: KIOT_SUBTYPE_LABELS
  };

  /* ================= UI — chỉ chạy trong trình duyệt ================= */
  if (typeof window !== 'undefined' && typeof document !== 'undefined') {
    window.V2S_Search = API;

    var RECENT_KEY = 'v2s_recent_search';
    var SAVED_KEY = 'v2s_saved_search';
    function loadJson(key) { try { return JSON.parse(localStorage.getItem(key) || '[]'); } catch (e) { return []; } }
    function saveJson(key, v) { try { localStorage.setItem(key, JSON.stringify(v)); } catch (e) {} }
    function rememberSearch(q) {
      var list = loadJson(RECENT_KEY).filter(function (x) { return x !== q; });
      list.unshift(q); saveJson(RECENT_KEY, list.slice(0, 5));
    }
    function isSaved(e) { return loadJson(SAVED_KEY).indexOf(e.type + ':' + e.id) !== -1; }
    function toggleSaved(e) {
      var list = loadJson(SAVED_KEY), k = e.type + ':' + e.id, i = list.indexOf(k);
      if (i === -1) list.push(k); else list.splice(i, 1);
      saveJson(SAVED_KEY, list); return i === -1;
    }
    function initials(title) {
      var t = (title || '?').trim();
      var words = t.split(/\s+/).filter(Boolean);
      var s = words.length > 1 ? (words[0][0] + words[1][0]) : t.slice(0, 2);
      return escHtml(s.toUpperCase());
    }
    function itemKey(e) { return e.type + ':' + (e.id || e.title); }

    function cardHTML(e, idx) {
      var media = e.img
        ? '<img src="' + escHtml(e.img) + '" alt="' + escHtml(e.title) + '" loading="lazy">'
        : '<span class="sr-initials" aria-hidden="true">' + initials(e.title) + '</span>';
      var chips = (e.chips || []).map(function (c) { return '<span>' + escHtml(c) + '</span>'; }).join('');
      var label = e.label ? '<span class="sr-label">' + escHtml(e.label) + '</span>' : '';
      var status = e.status ? '<span>' + escHtml(e.status) + '</span>' : '';
      var saved = isSaved(e) ? ' saved' : '';
      return '<article class="sr-card" data-idx="' + idx + '" data-key="' + escHtml(itemKey(e)) + '">' +
        '<div class="sr-media sr-media-' + e.type + '">' + media + '</div>' +
        '<div class="sr-body">' +
        '<span class="sr-type">' + escHtml(TYPE_LABELS[e.type]) + (e.score != null ? ' · ' + e.score + ' điểm' : '') + '</span>' +
        '<h3><a href="' + escHtml(e.url) + '">' + escHtml(e.title) + '</a></h3>' +
        (e.desc ? '<p>' + escHtml(e.desc) + '</p>' : '') +
        '<div class="sr-chips">' + chips + status + '</div>' + label +
        '<a class="sr-cta" href="' + escHtml(e.url) + '">' +
        (e.type === 'bai' ? 'Đọc bài →' : e.type === 'shop' ? 'Xem shop →' : e.type === 'lo' ? 'Xem lô →' : e.type === 'xuong' ? 'Xem xưởng →' : e.type === 'kiot' ? 'Xem kiot →' : NEWOBJ_META[e.type] ? 'Xem chi tiết →' : 'Xem hồ sơ →') + '</a>' +
        '</div>' +
        '<div class="sr-rail"><button type="button" class="sr-save' + saved + '" data-save="' + escHtml(itemKey(e)) + '" aria-label="Lưu">' + (isSaved(e) ? '♥ Đã lưu' : '♥ Lưu') + '</button>' +
        '<button type="button" class="sr-share" data-share="' + escHtml(e.url) + '" aria-label="Chia sẻ">↗ Chia sẻ</button></div>' +
        '</article>';
    }

    var index = null, state = null, shown = 0, currentRes = null, suggestTimer = null, searchTimer = null;

    function isMobile() { return window.matchMedia && window.matchMedia('(max-width:767px)').matches; }
    function batchSize() { return isMobile() ? 10 : 20; }

    function $(id) { return document.getElementById(id); }

    function renderFilters(counts) {
      var html = TYPE_ORDER.map(function (t) {
        var n = counts[t] || 0;
        var cls = (state.type === t ? ' on' : '') + (t !== 'all' && n === 0 ? ' zero' : '');
        return '<a href="#" data-type="' + t + '" class="sr-filter' + cls + '">' + escHtml(TYPE_LABELS[t]) + ' <span class="n">' + n + '</span></a>';
      }).join('');
      var f = $('searchFilters'); if (f) f.innerHTML = '<h5>Bộ lọc</h5>' + html +
        '<h5 style="margin-top:18px">Sắp xếp</h5>' +
        '<a href="#" data-sort="lien-quan" class="sr-filter' + (state.sort === 'lien-quan' ? ' on' : '') + '">Liên quan nhất</a>' +
        '<a href="#" data-sort="moi-nhat" class="sr-filter' + (state.sort === 'moi-nhat' ? ' on' : '') + '">Mới nhất</a>';
      var chips = $('searchTypeChips');
      if (chips) {
        chips.innerHTML = TYPE_ORDER.map(function (t) {
          var n = counts[t] || 0;
          return '<button type="button" data-type="' + t + '" class="sr-chip-type' + (state.type === t ? ' on' : '') + (t !== 'all' && n === 0 ? ' zero' : '') + '">' + escHtml(TYPE_LABELS[t]) + ' (' + n + ')</button>';
        }).join('');
      }
    }

    function renderMeta(res) {
      var m = $('searchMeta'); if (!m) return;
      if (!res) { m.textContent = ''; return; }
      if (res.tooShort) {
        /* v329 (TK-02, 18/11/2026): go tu khoa nhung chuan hoa ve rong
           (toan ky tu dac biet, vd '%^&*') -> hien "0 ket qua" thay vi
           xoa trang dong dem. Go that su trong / 1 ky tu -> de trong
           (chi hien tu khoa pho bien).
           v383 (TK-01, 21/11/2026): go THAT SU TRONG (bam Enter khi o trong)
           -> hien dong huong dan thay vi de trong (QA 20-21/11: khong co
           dong dem, khong co thong bao nao; fix v369 chua len live, rebase len v383). 1 ky tu van de trong nhu cu. */
        if (state.q && !res.q) {
          m.innerHTML = 'Tìm thấy <b>0 kết quả</b> cho “<b>' + escHtml(state.q) + '</b>”';
          return;
        }
        if (!state.q) {
          m.textContent = 'Nhập từ khóa để tìm kiếm mẫu, shop, lô, xưởng, kiot hoặc bài báo.';
          return;
        }
        m.textContent = '';
        return;
      }
      m.innerHTML = 'Tìm thấy <b>' + res.total + ' kết quả</b> cho “<b>' + escHtml(state.q) + '</b>” · ' + fmtElapsed(res.elapsedMs);
    }

    function renderResults(res, append) {
      var box = $('searchResults'); if (!box) return;
      var end = $('searchEnd'), more = $('searchLoadMore'), empty = $('searchEmpty');
      if (!append) { box.innerHTML = ''; shown = 0; }
      var next = res.results.slice(shown, shown + batchSize());
      var oldEnd = box.querySelector('.sr-end-card'); if (oldEnd) oldEnd.remove();
      var html = next.map(function (e, i) { return cardHTML(e, shown + i); }).join('');
      box.insertAdjacentHTML('beforeend', html);
      shown += next.length;
      var done = res.results.length > 0 && shown >= res.results.length;
      /* Mobile: thẻ cuối "Đã hết kết quả" nằm TRONG feed (thẻ snap cuối) để người
         vuốt thấy ngay; PC giữ dòng chữ ngoài danh sách như cũ. */
      if (done && isMobile()) box.insertAdjacentHTML('beforeend', '<div class="sr-card sr-end-card"><div><div class="empty-big">✓</div><p>Đã hết kết quả</p><p class="small">Thử từ khóa khác nhé.</p></div></div>');
      if (end) end.hidden = isMobile() ? true : !done;
      if (more) more.hidden = !(shown < res.results.length);
      if (empty) empty.hidden = res.results.length > 0;
      updateFeedStatus();
    }

    function updateFeedStatus() {
      var st = $('feedStatus'); if (!st) return;
      if (!isMobile() || !currentRes || !currentRes.results.length) { st.hidden = true; return; }
      st.hidden = false;
      var idx = currentIndex();
      var dots = '';
      if (currentRes.results.length <= 10) {
        for (var i = 0; i < currentRes.results.length; i++) dots += '<i class="' + (i === idx ? 'on' : '') + '"></i>';
      }
      st.innerHTML = '<span>' + (idx + 1) + ' / ' + currentRes.results.length + ' kết quả · “' + escHtml(state.q) + '”</span><span class="feed-dots">' + dots + '</span>';
    }
    function currentIndex() {
      var box = $('searchResults'); if (!box) return 0;
      var cards = box.querySelectorAll('.sr-card');
      if (!cards.length) return 0;
      /* So theo khung nhìn (getBoundingClientRect), KHÔNG dùng offsetTop:
         offsetTop tính theo offsetParent (body) nên lệch khỏi scrollTop của khung feed. */
      var boxTop = box.getBoundingClientRect().top, best = 0, bestD = Infinity;
      cards.forEach(function (c, i) { var d = Math.abs(c.getBoundingClientRect().top - boxTop); if (d < bestD) { bestD = d; best = i; } });
      return best;
    }

    function showPopular() {
      var box = $('searchChips'); if (!box) return;
      var hot = hotKeywords().slice(0, 8);
      box.innerHTML = '<b>Tìm kiếm phổ biến:</b> ' + hot.map(function (k) {
        return '<button type="button" class="sr-chip" data-q="' + escHtml(k) + '">' + escHtml(k) + '</button>';
      }).join('');
      box.hidden = false;
    }
    function showEmptyState(q) {
      var empty = $('searchEmpty'); if (!empty) return;
      /* FULL-MC-041: them 1 dong goi y bo bot 1 tu khi truy van > 1 tu (chi bo tu
         dau — tu con lai giu nguyen thu tu go cua nguoi dung, hien bang chu goc
         co dau); 3 nut tu khoa hot thay vi 4. Khung cu + goi y cu giu nguyen. */
      var words = (q || '').trim().split(/\s+/).filter(Boolean);
      var dropHint = words.length > 1
        ? '<p class="small">Thử bỏ bớt 1 từ — ví dụ chỉ tìm “' + escHtml(words.slice(1).join(' ')) + '” thay vì “' + escHtml(q) + '”.</p>'
        : '';
      empty.innerHTML = '<div class="empty-big">🔍</div><p><b>Không tìm thấy kết quả cho “' + escHtml(q) + '”</b></p>' +
        dropHint +
        '<p class="small">Gợi ý: kiểm tra chính tả · thử từ ngắn hơn · bỏ dấu thử (“pham thoai”) · hoặc thử từ khóa phổ biến:</p>' +
        '<p>' + hotKeywords().slice(0, 3).map(function (k) {
          return '<button type="button" class="sr-chip" data-q="' + escHtml(k) + '">' + escHtml(k) + '</button>';
        }).join('') + '</p>';
      empty.hidden = false;
    }

    function runSearch(push) {
      if (!index) return;
      /* KHÔNG đóng gợi ý ở đây: gợi ý phải ở lại trong lúc gõ để bấm được
         (đóng khi submit / bấm ra ngoài / Esc — xem document click + submit). */
      var q = ($('searchQ') ? $('searchQ').value : '').trim();
      state.q = q;
      var box = $('searchResults');
      if (box && q && q.length >= 2) {
        box.innerHTML = '<div class="skel"></div><div class="skel" style="width:70%"></div><div class="skel" style="width:85%"></div>';
      }
      var res = search(index, q, { type: state.type, tinh: state.tinh, cat: state.cat, sort: state.sort });
      currentRes = res;
      if (q && q.length >= 2) rememberSearch(q);
      if (res.tooShort) {
        /* v283 (MBS-2): an feed trong khi chua co tu khoa — feed mobile cao 514px,
           de trong thi trang nhu trang trang; chi hien lai khi co ket qua (nhanh duoi). */
        if (box) { box.innerHTML = ''; box.hidden = true; }
        if ($('searchEnd')) $('searchEnd').hidden = true;
        if ($('searchLoadMore')) $('searchLoadMore').hidden = true;
        /* v329 (TK-01): hien SO DEM THAT cua chi muc (res.counts) thay vi
           countByType([]) -> chip loc khong con 0 het khi chua go tu khoa. */
        renderFilters(res.counts);
        renderMeta(res);
        /* v329 (TK-02): go toan ky tu dac biet (vd '%^&*', chuan hoa ve '')
           -> hien hop "Khong tim thay ket qua" + goi y nhu truong hop 0 ket
           qua that, thay vi chi hien tu khoa pho bien. Go trong / 1 ky tu
           thi giu nhu cu (tu khoa pho bien). */
        if (q && !res.q) {
          showEmptyState(q);
        } else {
          if ($('searchEmpty')) $('searchEmpty').hidden = true;
          showPopular();
        }
      } else if (res.results.length === 0) {
        /* v283 (MBS-2): an feed trong khi 0 ket qua — neu khong, hop "Khong tim thay"
           bi day xuong duoi feed trong 514px (y~1102 o 390px), nguoi dung chi thay
           trang trang. */
        if (box) { box.innerHTML = ''; box.hidden = true; }
        if ($('searchEnd')) $('searchEnd').hidden = true;
        if ($('searchLoadMore')) $('searchLoadMore').hidden = true;
        renderFilters(res.counts);
        renderMeta(res);
        showEmptyState(q);
      } else {
        if (box) box.hidden = false;
        if ($('searchEmpty')) $('searchEmpty').hidden = true;
        renderFilters(res.counts);
        renderMeta(res);
        renderResults(res, false);
      }
      updateFeedStatus();
      var url = buildDeepLink(state);
      try {
        if (push) history.pushState(null, '', url);
        else history.replaceState(null, '', url);
      } catch (e) {}
    }

    function showSuggest() {
      var dd = $('searchSuggest'); if (!dd || !index) return;
      var q = ($('searchQ') ? $('searchQ').value : '').trim();
      var s = suggest(index, q, loadJson(RECENT_KEY));
      if (!q || q.length < 2 || (!s.names.length && !s.hot.length && !s.recent.length)) { dd.hidden = true; dd.innerHTML = ''; return; }
      var html = '';
      if (s.names.length) html += '<div class="sg-group">Kết quả khớp</div>' + s.names.map(function (n) {
        return '<button type="button" class="sg-item" data-q="' + escHtml(n.title) + '" data-type="' + n.type + '"><b>' + escHtml(n.title) + '</b> <span>' + escHtml(TYPE_LABELS[n.type]) + '</span></button>';
      }).join('');
      if (s.hot.length) html += '<div class="sg-group">Từ khóa phổ biến</div>' + s.hot.map(function (k) {
        return '<button type="button" class="sg-item" data-q="' + escHtml(k) + '" data-type="all">' + escHtml(k) + '</button>';
      }).join('');
      if (s.recent.length) html += '<div class="sg-group">Tìm gần đây</div>' + s.recent.map(function (r) {
        return '<button type="button" class="sg-item" data-q="' + escHtml(r) + '" data-type="all">' + escHtml(r) + '</button>';
      }).join('');
      dd.innerHTML = html; dd.hidden = false;
    }

    function applyStateFromUrl() {
      state = parseDeepLink(location.search);
      var qEl = $('searchQ'); if (qEl) qEl.value = state.q || '';
    }

    function init() {
      var data = (typeof window !== 'undefined') ? window.V20_DATA : null;
      if (!data) {
        var box = $('searchResults');
        if (box) box.innerHTML = '<p>Chưa tải được dữ liệu tìm kiếm — thử tải lại trang.</p>';
        return;
      }
      index = buildIndex(data);
      applyStateFromUrl();
      var qEl = $('searchQ'), form = $('searchForm');
      if (form) form.addEventListener('submit', function (e) { e.preventDefault(); hideSuggest(); runSearch(true); if (qEl) qEl.blur(); });
      if (qEl) {
        qEl.addEventListener('input', function () {
          clearTimeout(suggestTimer); suggestTimer = setTimeout(showSuggest, 150);
          clearTimeout(searchTimer); searchTimer = setTimeout(function () { runSearch(false); }, 250);
        });
        qEl.addEventListener('focus', showSuggest);
        qEl.addEventListener('keydown', function (e) { if (e.key === 'Escape') hideSuggest(); });
      }
      document.addEventListener('click', function (e) {
        var dd = $('searchSuggest');
        if (dd && !dd.hidden && !(dd.contains(e.target) || (e.target.id === 'searchQ'))) hideSuggest();
        var t = e.target.closest('[data-q]');
        if (t) {
          var qEl2 = $('searchQ'); if (qEl2) qEl2.value = t.getAttribute('data-q');
          /* Bấm gợi ý/chip là tìm từ khóa mới: loại lọc theo đúng loại của gợi ý
             (tên khớp) hoặc về Tất cả (từ khóa phổ biến/tìm gần đây) — nếu giữ lọc
             cũ thì gợi ý bài báo có thể ra 0 kết quả khi đang lọc Mẫu. */
          state.type = t.getAttribute('data-type') || 'all';
          hideSuggest(); runSearch(true); return;
        }
        var f = e.target.closest('[data-type]');
        if (f) { e.preventDefault(); state.type = f.getAttribute('data-type'); runSearch(true); return; }
        var s = e.target.closest('[data-sort]');
        if (s) { e.preventDefault(); state.sort = s.getAttribute('data-sort'); runSearch(true); return; }
        var sv = e.target.closest('[data-save]');
        if (sv) { e.preventDefault(); var k = sv.getAttribute('data-save'); var on = toggleSaved({ type: k.split(':')[0], id: k.split(':').slice(1).join(':') }); sv.classList.toggle('saved', on); sv.textContent = on ? '♥ Đã lưu' : '♥ Lưu'; return; }
        var sh = e.target.closest('[data-share]');
        if (sh) {
          e.preventDefault();
          var url = sh.getAttribute('data-share');
          var abs = new URL(url, location.href).href;
          if (navigator.share) { navigator.share({ title: document.title, url: abs }).catch(function () {}); }
          else if (navigator.clipboard) { navigator.clipboard.writeText(abs).catch(function () {}); sh.textContent = '✓ Đã copy link'; }
          return;
        }
        if (!$('searchSuggest') || !$('searchSuggest').contains(e.target)) hideSuggest();
      });
      var more = $('searchLoadMore');
      if (more) more.addEventListener('click', function () { if (currentRes) renderResults(currentRes, true); });
      var box = $('searchResults');
      if (box) {
        box.addEventListener('scroll', function () {
          updateFeedStatus();
          if (currentRes && shown < currentRes.results.length && box.scrollTop + box.clientHeight > box.scrollHeight - 400) renderResults(currentRes, true);
        });
      }
      window.addEventListener('scroll', function () {
        if (!isMobile() && currentRes && shown < currentRes.results.length && (window.innerHeight + window.scrollY > document.body.scrollHeight - 600)) renderResults(currentRes, true);
      });
      window.addEventListener('popstate', function () { applyStateFromUrl(); runSearch(false); });
      runSearch(false);
      if (!state.q) showPopular();
    }
    function hideSuggest() { var dd = $('searchSuggest'); if (dd) { dd.hidden = true; } }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
  }

  if (typeof module !== 'undefined' && module.exports) module.exports = API;
})();
