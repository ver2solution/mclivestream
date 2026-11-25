/* matching.js — FWA Matching & Personalization V1 (25/11/2026, Issue #58, lane Claude).
   Module THUẦN (pure functions), không DOM, không mạng, không localStorage,
   không ghi gì. Dùng được trong trình duyệt (window.V2SMatch) và Node
   (module.exports) để test.

   Nguyên tắc (xem docs/fwa/MATCHING_CONTRACT.md):
   1. Chỉ dùng thông tin user/nhà tuyển dụng TỰ ĐIỀN cho 5 yếu tố công
      khai: lĩnh vực hàng, địa bàn, ca làm, nền tảng live, mức lương.
   2. KHÔNG dùng và KHÔNG suy đoán thuộc tính nhạy cảm: giới tính, chiều
      cao, tuổi, ngoại hình, ảnh, tên, lượt xem, đánh giá, liên hệ. Yêu cầu
      kiểu "nữ", "cao 1m60", "dưới 25 tuổi" trong tin tuyển bị bỏ qua.
   3. Giải thích được: mỗi kết quả trả về điểm 0–100 = tổng trọng số các
      yếu tố KHỚP, kèm lý do từng yếu tố (khớp / không khớp / thiếu dữ liệu).
      Thiếu dữ liệu = 0 điểm cho yếu tố đó, không phạt thêm, không đoán.
   4. Đầu ra chỉ gồm trường công khai theo whitelist (publicCard). Liên hệ
      (SĐT/email/Zalo/link nguồn) KHÔNG BAO GIỜ đi qua module này với bất
      kỳ vai trò nào — Contact Gate là việc của server (lane Codex #3/#14).
   5. Module không có hàm ghi/duyệt/claim/cấp quyền. AI Admin và Human Admin
      chỉ đọc kết quả như member; quyết định quyền nằm ở server + Human Admin.
*/
(function () {
  'use strict';

  var VERSION = 'match-v1-2026-11-25';

  var WEIGHTS = { category: 30, province: 25, shift: 15, platform: 15, salary: 15 };

  var FACTOR_LABEL = {
    category: 'Lĩnh vực hàng',
    province: 'Địa bàn',
    shift: 'Ca làm',
    platform: 'Nền tảng live',
    salary: 'Mức lương'
  };

  /* Trường KHÔNG BAO GIỜ được đọc để chấm điểm, cũng không được xuất ra. */
  var SENSITIVE_FIELDS = [
    'gender', 'height', 'age', 'birthYear', 'dob', 'weight', 'photoUrl', 'photoHas',
    'photoSrc', 'phone', 'email', 'zalo', 'facebook', 'contact', 'src', 'address',
    'rating', 'views', 'comments', 'topRevenue', 'top_revenue', 'religion', 'ethnicity',
    'marital', 'health'
  ];

  /* Whitelist đầu ra theo loại đối tượng. */
  var PUBLIC_FIELDS = {
    job: ['id', 'name', 'product', 'province', 'district', 'salary', 'shifts', 'date', 'logo'],
    candidate: ['id', 'name', 'title', 'province', 'cat', 'form', 'salary', 'shifts', 'status', 'date']
  };

  var GUEST_LIMIT = 5;
  var MAX_LIMIT = 50;
  var ROLES = ['guest', 'member', 'human_admin', 'ai_admin', 'owner'];

  /* ---------- Chuẩn hoá chuỗi ---------- */
  function lower(s) { return String(s == null ? '' : s).toLowerCase().normalize('NFC'); }
  function fold(s) {
    // bỏ dấu tiếng Việt để so khớp từ khoá ổn định
    return lower(s).normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd');
  }
  function isUnknownText(s) {
    var f = fold(s).trim();
    return !f || /^(chua cap nhat|chua ghi|khong ro|n\/a|-)/.test(f);
  }
  function uniq(a) {
    var out = [];
    for (var i = 0; i < a.length; i++) if (out.indexOf(a[i]) < 0) out.push(a[i]);
    return out;
  }

  /* ---------- Lĩnh vực hàng ---------- */
  var CATEGORY_RULES = [
    ['thoi-trang', /thoi trang|quan ao|ao dai|giay dep|so mi|t-shirt|polo|dam |vay|do ngu|cong so|unisex|do gym|yoga|ao body|linen|vali|hang quang chau/],
    ['my-pham', /my pham|skincare|son |nuoc hoa|xit khoang|lam dep|nhuom toc|goi|duong da|nail/],
    ['gia-dung', /gia dung|do dung gia dinh|home decor|noi that|do go|nganh giay/],
    ['trang-suc-phu-kien', /trang suc|phu kien|vong ngoc|da phong thuy|tram huong/],
    ['thuc-pham', /thuc pham|nong san|dac san|hai san|ocop|mat ong|nuoc mam|fmcg|duoc|wellness/],
    ['me-be', /me (&|va) be|me & be|bim|sua/],
    ['cong-nghe', /cong nghe|thiet bi|am thanh|dien thoai|may tinh/],
    ['giai-tri', /idol|giai tri|nhay|streamer|game/]
  ];
  var CATEGORY_LABEL = {
    'thoi-trang': 'Thời trang', 'my-pham': 'Mỹ phẩm', 'gia-dung': 'Gia dụng',
    'trang-suc-phu-kien': 'Trang sức / phụ kiện', 'thuc-pham': 'Thực phẩm / nông sản',
    'me-be': 'Mẹ & bé', 'cong-nghe': 'Công nghệ', 'giai-tri': 'Giải trí / idol'
  };
  function parseCategories(text) {
    var f = ' ' + fold(text) + ' ';
    var out = [];
    for (var i = 0; i < CATEGORY_RULES.length; i++) if (CATEGORY_RULES[i][1].test(f)) out.push(CATEGORY_RULES[i][0]);
    return out;
  }
  function isGeneralist(text) { return /chung|da nganh|moi nganh|nhieu nganh/.test(fold(text)); }

  /* ---------- Địa bàn ---------- */
  function normProvince(p) {
    if (isUnknownText(p)) return '';
    var f = fold(p).replace(/^(tp\.?|thanh pho|tinh)\s*/, '').replace(/\s+/g, ' ').trim();
    if (/^(ho chi minh|hcm|sai gon)/.test(f)) return 'ho chi minh';
    if (/toan quoc|online|tu xa|remote/.test(f)) return '*';
    return f;
  }

  /* ---------- Ca làm ---------- */
  var ALL_SHIFTS = ['sang', 'chieu', 'toi'];
  function parseShifts(list, text) {
    var parts = [].concat(Array.isArray(list) ? list : [], text ? [text] : []);
    var out = [], flexible = false;
    for (var i = 0; i < parts.length; i++) {
      var f = fold(parts[i]);
      if (isUnknownText(f)) continue;
      if (/linh hoat|flexible|tu chon/.test(f)) flexible = true;
      if (/full ?time|toan thoi gian|ca ngay/.test(f)) out = out.concat(ALL_SHIFTS);
      if (/\bsang\b/.test(f)) out.push('sang');
      if (/\bchieu\b/.test(f)) out.push('chieu');
      if (/\btoi\b|\bdem\b/.test(f)) out.push('toi');
    }
    return { shifts: uniq(out), flexible: flexible };
  }

  /* ---------- Nền tảng live ---------- */
  var PLATFORM_RULES = [
    ['tiktok', /tik ?tok/], ['shopee', /shopee/], ['facebook', /facebook|fb live|\bfb\b/],
    ['lazada', /lazada/], ['youtube', /youtube/], ['instagram', /instagram/], ['tiki', /\btiki\b/]
  ];
  /* `channels` của shop đôi khi là NGUỒN tin tuyển (TopCV, Threads, www.facebook.com)
     chứ không phải nền tảng live — chỉ tin TikTok/Shopee/Lazada/YouTube ở đó;
     Facebook chỉ tính khi xuất hiện trong nội dung yêu cầu. */
  function parsePlatforms(text, opts) {
    var f = fold(text), out = [];
    for (var i = 0; i < PLATFORM_RULES.length; i++) {
      var id = PLATFORM_RULES[i][0];
      if (opts && opts.sourceField && (id === 'facebook' || id === 'instagram')) continue;
      if (PLATFORM_RULES[i][1].test(f)) out.push(id);
    }
    return out;
  }

  /* ---------- Mức lương ---------- */
  /* Trả {unit:'hour'|'month', min, max} (VND) hoặc null. Chỉ đọc phần đầu
     (trước '(' '+' ';') vì phần sau thường là hoa hồng/ghi chú. */
  function parseSalary(text) {
    if (typeof text === 'number' && isFinite(text) && text > 0) {
      return { unit: text >= 1000000 ? 'month' : 'hour', min: text, max: text };
    }
    var s = fold(text);
    if (isUnknownText(s)) return null;
    s = s.split(/[(+;]/)[0];
    var unit = null;
    if (/trieu|\/\s*thang/.test(s)) unit = 'month';
    else if (/\/\s*(1\s*)?(gio|h)\b|\d\s*k?\s*\/\s*h|\bmoi gio\b/.test(s)) unit = 'hour';
    else if (/\/\s*ca\b|\/\s*video/.test(s)) return null; // theo ca/video: không so sánh được
    var re = /(\d+(?:[.,]\d+)*)\s*(k|trieu|tr)?/g, m, nums = [];
    while ((m = re.exec(s))) {
      var raw = m[1], v;
      if (/^\d{1,3}([.,]\d{3})+$/.test(raw)) v = parseFloat(raw.replace(/[.,]/g, ''));
      else v = parseFloat(raw.replace(',', '.'));
      if (!isFinite(v) || v <= 0) continue;
      nums.push({ v: v, suf: m[2] || '' });
    }
    if (!nums.length) return null;
    var lastSuf = '';
    for (var j = nums.length - 1; j >= 0; j--) { if (nums[j].suf) lastSuf = nums[j].suf; else if (lastSuf && nums[j].v < 1000) nums[j].suf = lastSuf; }
    var vals = nums.slice(0, 2).map(function (n) {
      if (n.suf === 'k') return n.v * 1000;
      if (n.suf === 'trieu' || n.suf === 'tr') return n.v * 1000000;
      if (n.v < 1000) return unit === 'month' ? n.v * 1000000 : n.v * 1000;
      return n.v;
    });
    if (!unit) unit = vals[0] >= 1000000 ? 'month' : (vals[0] >= 10000 ? 'hour' : null);
    if (!unit) return null;
    var min = Math.min.apply(null, vals), max = Math.max.apply(null, vals);
    return { unit: unit, min: min, max: max };
  }

  /* ---------- Hồ sơ chuẩn hoá (chỉ 5 yếu tố) ---------- */
  function emptyProfile() {
    return { categories: [], generalist: false, province: '', shifts: [], flexibleShift: false, platforms: [], salary: null };
  }

  /* Từ form user tự điền (voluntary). Trường lạ bị bỏ qua. */
  function preferencesFromInput(input) {
    var p = emptyProfile();
    if (!input || typeof input !== 'object') return p;
    var cats = Array.isArray(input.categories) ? input.categories : (input.categories ? [input.categories] : []);
    for (var i = 0; i < cats.length; i++) {
      if (CATEGORY_LABEL[cats[i]]) p.categories.push(cats[i]);
      else { p.categories = p.categories.concat(parseCategories(cats[i])); if (isGeneralist(cats[i])) p.generalist = true; }
    }
    p.categories = uniq(p.categories);
    if (input.generalist === true) p.generalist = true;
    p.province = normProvince(input.province);
    var sh = parseShifts(input.shifts, '');
    p.shifts = sh.shifts; p.flexibleShift = sh.flexible || input.flexibleShift === true;
    var pl = Array.isArray(input.platforms) ? input.platforms.join(' ') : (input.platforms || '');
    p.platforms = parsePlatforms(pl);
    if (input.salaryMin != null && input.salaryMin !== '') {
      var n = Number(input.salaryMin);
      if (isFinite(n) && n > 0) {
        var unit = input.salaryUnit === 'month' || input.salaryUnit === 'hour' ? input.salaryUnit : (n >= 1000000 ? 'month' : 'hour');
        p.salary = { unit: unit, min: n, max: n };
      }
    } else if (input.salary) p.salary = parseSalary(input.salary);
    return p;
  }

  /* Từ bản ghi models (hồ sơ mẫu live công khai trong data.js). */
  function profileFromCandidate(c) {
    var p = emptyProfile();
    if (!c || typeof c !== 'object') return p;
    var catText = [c.cat, c.form, c.title].join(' ');
    p.categories = parseCategories(catText);
    p.generalist = isGeneralist(c.cat);
    p.province = normProvince(c.province);
    var sh = parseShifts(c.shifts, c.schedule);
    p.shifts = sh.shifts; p.flexibleShift = sh.flexible;
    p.platforms = parsePlatforms([c.title, c.form, c.exp].join(' '));
    p.salary = parseSalary(c.salaryNum != null ? c.salaryNum : c.salary);
    return p;
  }

  /* Từ bản ghi shops (tin tuyển). Không đọc yêu cầu ngoại hình/giới tính/tuổi. */
  function profileFromJob(j) {
    var p = emptyProfile();
    if (!j || typeof j !== 'object') return p;
    p.categories = parseCategories(j.product);
    p.province = normProvince(j.province);
    var sh = parseShifts(j.shifts, '');
    p.shifts = sh.shifts; p.flexibleShift = sh.flexible;
    p.platforms = uniq(parsePlatforms(j.channels, { sourceField: true }).concat(parsePlatforms(j.req)));
    p.salary = parseSalary(j.salary);
    return p;
  }

  /* ---------- Chấm điểm ---------- */
  function factor(key, status, earned, detail) {
    return { factor: key, label: FACTOR_LABEL[key], weight: WEIGHTS[key], earned: earned, status: status, detail: detail };
  }
  function intersect(a, b) { return a.filter(function (x) { return b.indexOf(x) >= 0; }); }

  /* seeker = hồ sơ người tìm việc (đã chuẩn hoá), job = hồ sơ tin (đã chuẩn hoá).
     Đối xứng về dữ liệu; điểm = tổng earned (0–100). */
  function scorePair(seeker, job) {
    seeker = seeker || emptyProfile(); job = job || emptyProfile();
    var f = [];

    // Lĩnh vực
    if (!job.categories.length || (!seeker.categories.length && !seeker.generalist)) {
      f.push(factor('category', 'unknown', 0, 'Chưa đủ thông tin lĩnh vực'));
    } else {
      var ci = intersect(seeker.categories, job.categories);
      if (ci.length) f.push(factor('category', 'match', WEIGHTS.category, 'Cùng lĩnh vực: ' + ci.map(function (c) { return CATEGORY_LABEL[c]; }).join(', ')));
      else if (seeker.generalist) f.push(factor('category', 'partial', Math.round(WEIGHTS.category / 2), 'Ứng viên đa ngành'));
      else f.push(factor('category', 'mismatch', 0, 'Khác lĩnh vực'));
    }

    // Địa bàn
    if (!seeker.province || !job.province) f.push(factor('province', 'unknown', 0, 'Chưa đủ thông tin địa bàn'));
    else if (seeker.province === job.province || job.province === '*' || seeker.province === '*') f.push(factor('province', 'match', WEIGHTS.province, job.province === '*' || seeker.province === '*' ? 'Làm online / toàn quốc' : 'Cùng tỉnh/thành'));
    else f.push(factor('province', 'mismatch', 0, 'Khác tỉnh/thành'));

    // Ca làm
    var sKnown = seeker.shifts.length || seeker.flexibleShift, jKnown = job.shifts.length || job.flexibleShift;
    if (!sKnown || !jKnown) f.push(factor('shift', 'unknown', 0, 'Chưa đủ thông tin ca làm'));
    else if (seeker.flexibleShift || job.flexibleShift) f.push(factor('shift', 'match', WEIGHTS.shift, 'Ca linh hoạt'));
    else {
      var si = intersect(seeker.shifts, job.shifts);
      f.push(si.length ? factor('shift', 'match', WEIGHTS.shift, 'Trùng ca: ' + si.join(', ')) : factor('shift', 'mismatch', 0, 'Không trùng ca'));
    }

    // Nền tảng
    if (!seeker.platforms.length || !job.platforms.length) f.push(factor('platform', 'unknown', 0, 'Chưa đủ thông tin nền tảng'));
    else {
      var pi = intersect(seeker.platforms, job.platforms);
      f.push(pi.length ? factor('platform', 'match', WEIGHTS.platform, 'Cùng nền tảng: ' + pi.join(', ')) : factor('platform', 'mismatch', 0, 'Khác nền tảng'));
    }

    // Lương: so trong cùng đơn vị; mong muốn tối thiểu của ứng viên vs mức trần của tin
    var ss = seeker.salary, js = job.salary;
    if (!ss || !js || ss.unit !== js.unit) f.push(factor('salary', 'unknown', 0, !ss || !js ? 'Chưa đủ thông tin lương' : 'Khác đơn vị lương (giờ/tháng)'));
    else if (js.max >= ss.min) f.push(factor('salary', 'match', WEIGHTS.salary, 'Mức lương đáp ứng mong muốn'));
    else if (js.max >= ss.min * 0.8) f.push(factor('salary', 'partial', Math.round(WEIGHTS.salary / 2), 'Mức lương gần mong muốn (≥80%)'));
    else f.push(factor('salary', 'mismatch', 0, 'Mức lương thấp hơn mong muốn'));

    var score = 0, known = 0;
    for (var i = 0; i < f.length; i++) { score += f[i].earned; if (f[i].status !== 'unknown') known += f[i].weight; }
    return { score: score, coverage: known, reasons: f };
  }

  /* ---------- Đầu ra an toàn ---------- */
  function publicCard(kind, rec) {
    var fields = PUBLIC_FIELDS[kind] || [];
    var out = {};
    for (var i = 0; i < fields.length; i++) {
      var k = fields[i];
      if (rec && rec[k] !== undefined && SENSITIVE_FIELDS.indexOf(k) < 0) out[k] = Array.isArray(rec[k]) ? rec[k].slice() : rec[k];
    }
    return out;
  }

  function resolveViewer(opts) {
    var role = opts && opts.viewer && opts.viewer.role;
    return ROLES.indexOf(role) >= 0 ? role : 'guest'; // không rõ vai trò = guest (an toàn nhất)
  }

  function rank(seeker, items, toProfile, kind, isSeekerSide, opts) {
    opts = opts || {};
    var role = resolveViewer(opts);
    var limit = Math.max(0, Math.min(MAX_LIMIT, opts.limit == null ? 10 : (opts.limit | 0)));
    if (role === 'guest') limit = Math.min(limit, GUEST_LIMIT);
    var minScore = opts.minScore == null ? 1 : Number(opts.minScore);
    var list = Array.isArray(items) ? items : [];
    var scored = [];
    for (var i = 0; i < list.length; i++) {
      var it = list[i];
      if (!it || typeof it !== 'object' || !it.id) continue;
      var other = toProfile(it);
      var r = isSeekerSide ? scorePair(seeker, other) : scorePair(other, seeker);
      if (r.score < minScore) continue;
      scored.push({ rec: it, r: r });
    }
    scored.sort(function (a, b) {
      if (b.r.score !== a.r.score) return b.r.score - a.r.score;
      if (b.r.coverage !== a.r.coverage) return b.r.coverage - a.r.coverage;
      var da = String(a.rec.date || ''), db = String(b.rec.date || '');
      if (da !== db) return da < db ? 1 : -1;
      return String(a.rec.id) < String(b.rec.id) ? -1 : 1;
    });
    return {
      version: VERSION,
      viewerRole: role,
      gated: role === 'guest',
      total: scored.length,
      items: scored.slice(0, limit).map(function (x) {
        return { card: publicCard(kind, x.rec), score: x.r.score, coverage: x.r.coverage, reasons: x.r.reasons };
      })
    };
  }

  /* Gợi ý việc cho người tìm việc. prefs = preferencesFromInput(...) hoặc profileFromCandidate(...). */
  function recommendJobs(prefs, jobs, opts) { return rank(prefs || emptyProfile(), jobs, profileFromJob, 'job', true, opts); }

  /* Gợi ý ứng viên cho một tin tuyển. job = bản ghi shop (thô). */
  function recommendCandidates(job, candidates, opts) {
    return rank(profileFromJob(job), candidates, profileFromCandidate, 'candidate', false, opts);
  }

  /* Gợi ý người cùng nghề (kết nối) cho người tìm việc: cùng lĩnh vực/địa bàn/nền tảng. */
  function recommendPeers(prefs, candidates, opts) {
    var self = opts && opts.excludeId;
    var list = (Array.isArray(candidates) ? candidates : []).filter(function (c) { return c && c.id !== self; });
    return rank(prefs || emptyProfile(), list, profileFromCandidate, 'candidate', true, opts);
  }

  var api = {
    VERSION: VERSION,
    WEIGHTS: WEIGHTS,
    SENSITIVE_FIELDS: SENSITIVE_FIELDS,
    PUBLIC_FIELDS: PUBLIC_FIELDS,
    GUEST_LIMIT: GUEST_LIMIT,
    ROLES: ROLES,
    CATEGORY_LABEL: CATEGORY_LABEL,
    parseCategories: parseCategories,
    parseShifts: parseShifts,
    parsePlatforms: parsePlatforms,
    parseSalary: parseSalary,
    normProvince: normProvince,
    preferencesFromInput: preferencesFromInput,
    profileFromCandidate: profileFromCandidate,
    profileFromJob: profileFromJob,
    scorePair: scorePair,
    publicCard: publicCard,
    recommendJobs: recommendJobs,
    recommendCandidates: recommendCandidates,
    recommendPeers: recommendPeers
  };

  if (typeof window !== 'undefined') window.V2SMatch = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})();
