/* v423 — Phase 1 V2.0: Dynamic Onboarding (wizard 4 buoc).
   ---------------------------------------------------------------------------
   LUU DO: buoc 1 = form dang ky hien co (js/auth-ui.js signUp, KHONG doi);
   buoc 2 = chon vai tro (9 the A–I, chon nhieu, 1 vai tro chinh);
   buoc 3 = cau hoi theo vai tro + muc tieu (19) + dia ly/lam viec + khao sat
   nhu cau (17 ca nhan / 16 shop); buoc 4 = hoan thien chuyen sau (tuy chon)
   + thanh hoan thien + cai dat quyen rieng tu.
   DOT 1 (Loai A, KHONG migration): cau tra loi luu NHAP localStorage theo
   userId (`v2s_onboarding_<uid>`), KHONG luu mat khau duoi moi hinh thuc;
   3 truong da co (noi lam viec / linh vuc / linh vuc uu tien) duoc dong bo
   vao `v2s_signup_prefs_<uid>` de trang-cua-toi dien san nhu cu (v99/v111).
   Dong bo len server (`onboarding_drafts` + cac bang dot 2) chi chay sau
   migration — xem file SQL ban nhap trong goal V2.0.
   DIEM NOI (auth-ui.js): dang-ky.html truyen `onSignupSession` vao authCfg;
   auth-ui.js goi no sau khi dang ky co session — tra ve true thi GIU
   nguoi dung o lai trang lam wizard (khong redirect), tra ve false thi
   redirect nhu cu. Trang khac khong truyen callback nen khong anh huong.
   PHEU DANG KY (js/analytics.js, an danh tuyet doi): ghi event vao
   web_analytics_events qua V2SAnalytics.record('form_result', <ten>) —
   cot `element` mang ten buoc, error_message NULL = thanh cong. */
(function () {
  'use strict';

  var DRAFT_PREFIX = 'v2s_onboarding_';
  var DONE_PREFIX = 'v2s_onboarding_done_';
  var PREFS_PREFIX = 'v2s_signup_prefs_';
  var SENSITIVE_RE = /pass|password|token|secret|cccd|cmnd|otp|pin/i;

  function F() { return (typeof window !== 'undefined') ? window.V2SOnboardingFields : null; }

  function esc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function safe(fn, fallback) { try { return fn(); } catch (e) { return fallback; } }
  function isEmpty(v) {
    if (v == null) return true;
    if (typeof v === 'string') return v.trim() === '';
    if (Array.isArray(v)) return v.length === 0;
    if (typeof v === 'object') return Object.keys(v).length === 0;
    return false;
  }

  /* ---------- Logic thuan (khong DOM) — test-v423 bao phu ---------- */

  function getQuestionsForRole(roleKey) {
    var fields = F(); if (!fields) return [];
    var q = fields.QUESTIONS[roleKey];
    if (q === 'C') q = fields.QUESTIONS.C; /* D dung chung bo Shop. */
    return Array.isArray(q) ? q : [];
  }

  function requiredFieldsFor(roles) {
    var out = [];
    (roles || []).forEach(function (rk) {
      getQuestionsForRole(rk).forEach(function (sec) {
        (sec.fields || []).forEach(function (fd) {
          if (fd.required && out.indexOf(fd.key) === -1) out.push(fd.key);
        });
      });
    });
    return out;
  }

  function stripSensitive(obj) {
    var out = {};
    Object.keys(obj || {}).forEach(function (k) {
      if (SENSITIVE_RE.test(k)) return;
      var v = obj[k];
      if (v && typeof v === 'object' && !Array.isArray(v)) out[k] = stripSensitive(v);
      else out[k] = v;
    });
    return out;
  }

  function mergeDraft(existing, patch) {
    var base = stripSensitive(existing || {});
    var p = stripSensitive(patch || {});
    Object.keys(p).forEach(function (k) {
      if (k === 'answers' && base.answers && typeof p.answers === 'object') {
        base.answers = Object.assign({}, base.answers, p.answers);
      } else if (k === 'goals' && base.goals && typeof p.goals === 'object') {
        base.goals = Object.assign({}, base.goals, p.goals);
      } else if (k === 'needs' && base.needs && typeof p.needs === 'object') {
        base.needs = Object.assign({}, base.needs, p.needs);
      } else {
        base[k] = p[k];
      }
    });
    return base;
  }

  function draftKey(userId) { return DRAFT_PREFIX + (userId || 'guest'); }
  function doneKey(userId) { return DONE_PREFIX + (userId || 'guest'); }

  /* Kiem tra buoc: buoc 2 can >=1 vai tro + 1 vai tro chinh; buoc 3 can du
     cac truong bat buoc cua cac vai tro da chon. Tra ve danh sach loi. */
  function validateStep(state) {
    var errors = [];
    if (!state) return ['Thiếu dữ liệu đăng ký.'];
    if (state.step === 2) {
      if (!state.roles || !state.roles.length) errors.push('Hãy chọn ít nhất 1 vai trò.');
      if (!state.primary) errors.push('Hãy chọn 1 vai trò chính.');
      else if (state.roles.indexOf(state.primary) === -1) errors.push('Vai trò chính phải nằm trong các vai trò đã chọn.');
    }
    if (state.step === 3) {
      var req = requiredFieldsFor(state.roles || []);
      req.forEach(function (k) {
        if (isEmpty((state.answers || {})[k])) errors.push('Chưa nhập: ' + k);
      });
    }
    return errors;
  }

  /* Tinh % hoan thien tu du lieu that. Nhom xac thuc = 0 o dot 1 (chua co
     co che xac minh) — hien rieng, khong gop de khong danh lua nguoi dung. */
  function computeCompletion(state) {
    var fields = F();
    var weights = fields ? fields.COMPLETION_WEIGHTS : null;
    var primary = (state && state.primary) || '';
    var w = (primary === 'A' || primary === 'B') ? (weights && weights.talent)
      : (primary === 'C' || primary === 'D') ? (weights && weights.shop)
      : (weights && weights.other);
    if (!w) w = { basic: 20, goals: 15, skills: 20, experience: 15, portfolio: 15, work: 15 };
    var a = (state && state.answers) || {};
    var goals = (state && state.goals) || {};
    var filled = {
      basic: !isEmpty(a.display_name || a.shop_name || a.channel_name || a.org_name || a.staff_title),
      goals: Object.keys(goals).length > 0,
      skills: !isEmpty(a.skills || a.collab_types || a.staff_skills || a.skill_to_learn || a.services),
      experience: !isEmpty(a.years_experience) || !isEmpty(a.platforms) || !isEmpty(a.projects) || !isEmpty(a.industry_experience),
      portfolio: !isEmpty(a.portfolio_links || a.portfolio || a.demo_video || a.featured_video || a.intro_video || a.org_portfolio),
      work: !isEmpty(a.work_form || a.work_place || a.available_time || a.work_area || a.area || a.work_form_geo),
      shop: !isEmpty(a.shop_name || a.org_name),
      industries: !isEmpty(a.industries || a.shop_industries || a.content_field),
      hiring: !isEmpty(a.hire_positions),
      scale: !isEmpty(a.idol_count) || !isEmpty(a.shifts_per_day),
      verification: false
    };
    var total = 0, got = 0, breakdown = {};
    Object.keys(w).forEach(function (g) {
      total += w[g];
      var v = filled[g] ? w[g] : 0;
      got += v;
      breakdown[g] = { weight: w[g], got: v, done: !!filled[g] };
    });
    return { pct: total ? Math.round(got / total * 100) : 0, breakdown: breakdown, total: total, got: got };
  }

  function funnelEventName(step, action) {
    var map = { 1: 'signup_step_1_done', 2: 'signup_step_2_done', 3: 'signup_step_3_done', 4: 'signup_complete' };
    if (action === 'start') return 'signup_start';
    if (action === 'draft') return 'signup_draft_saved';
    if (action === 'resumed') return 'signup_resumed';
    if (action === 'abandoned') return 'signup_abandoned';
    return map[step] || 'signup_step_done';
  }

  function track(eventName) {
    safe(function () {
      var A = (typeof window !== 'undefined') ? window.V2SAnalytics : null;
      if (A && typeof A.record === 'function') A.record('form_result', eventName);
    });
  }

  /* ---------- DOM ---------- */

  var wizardEl = null, resumeEl = null, state = null, userId = null, destUrl = 'trang-cua-toi.html';

  function defaultDest(res) {
    /* Cung luat nhu auth-ui.js v166/P1: shop ve danh-sach-mau.html#ho-so-shop,
       mau ve trang-cua-toi.html; ?next= duoc ton trong. */
    try {
      var q = new URLSearchParams(location.search);
      var next = q.get('next');
      if (next) return next;
      var acct = '';
      try { acct = (res && res.session && res.session.user && res.session.user.user_metadata && res.session.user.user_metadata.account_type) || ''; } catch (e) { acct = ''; }
      if (!acct && state && state.roles) acct = (state.primary === 'C' || state.primary === 'D') ? 'shop' : 'model';
      if (acct === 'shop') return 'danh-sach-mau.html#ho-so-shop';
    } catch (e) { /* bo qua */ }
    return 'trang-cua-toi.html';
  }

  function freshState() {
    return { step: 2, roles: [], primary: null, answers: {}, goals: {}, goalPriority: {}, needs: {}, privacy: {}, savedAt: null };
  }

  function loadDraft() {
    return safe(function () {
      var raw = window.localStorage.getItem(draftKey(userId));
      if (!raw) return null;
      var d = JSON.parse(raw);
      return d && typeof d === 'object' ? stripSensitive(d) : null;
    }, null);
  }

  function saveDraft(silent) {
    if (!state) return;
    state.savedAt = Date.now();
    safe(function () {
      window.localStorage.setItem(draftKey(userId), JSON.stringify(stripSensitive(state)));
    });
    if (!silent) track(funnelEventName(state.step, 'draft'));
    var el = wizardEl && wizardEl.querySelector('.ob-draft-note');
    if (el) el.textContent = 'Đã lưu nháp lúc ' + new Date(state.savedAt).toLocaleTimeString('vi-VN') + ' — mở lại trang này để tiếp tục.';
  }

  /* Dong bo 3 truong da co vao v2s_signup_prefs de trang-cua-toi dien san
     (giong v221: merge, giu phoneZalo/contactEmail cu). */
  function syncPrefill() {
    safe(function () {
      var a = state.answers || {};
      var prefs = {};
      try { prefs = JSON.parse(window.localStorage.getItem(PREFS_PREFIX + userId) || '{}') || {}; } catch (e) { prefs = {}; }
      var wl = a.work_area || a.area || '';
      var df = (a.industries && a.industries[0]) || (a.shop_industries && a.shop_industries[0]) || a.content_field && a.content_field[0] || '';
      var pf = a.top_industry || a.main_industry || '';
      if (wl) prefs.workLocation = wl;
      if (df) prefs.desiredField = df;
      if (pf) prefs.priorityField = pf;
      if (prefs.workLocation || prefs.desiredField || prefs.priorityField || prefs.contactEmail) {
        window.localStorage.setItem(PREFS_PREFIX + userId, JSON.stringify(prefs));
        window.localStorage.setItem('v2s_signup_prefs', JSON.stringify(prefs));
      }
    });
  }

  function chipGroup(name, options, selected, onToggle) {
    var wrap = document.createElement('div');
    wrap.className = 'ob-chips';
    (options || []).forEach(function (opt) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'ob-chip' + ((selected || []).indexOf(opt) !== -1 ? ' sel' : '');
      b.textContent = opt;
      b.setAttribute('data-track', 'onboarding-chip');
      b.addEventListener('click', function () { b.classList.toggle('sel'); onToggle(opt, b); });
      wrap.appendChild(b);
    });
    return wrap;
  }

  function fieldInput(fd, value, onChange) {
    var val = value == null ? '' : value;
    var el;
    if (fd.type === 'select') {
      el = document.createElement('select');
      var ph = document.createElement('option'); ph.value = ''; ph.textContent = 'Chọn…'; el.appendChild(ph);
      (fd.options || []).forEach(function (opt) {
        var o = document.createElement('option'); o.value = opt; o.textContent = opt;
        if (val === opt) o.selected = true;
        el.appendChild(o);
      });
      el.addEventListener('change', function () { onChange(el.value); });
    } else if (fd.type === 'multi') {
      el = chipGroup(fd.key, fd.options, val, function (opt) {
        var cur = Array.isArray(val) ? val.slice() : [];
        var i = cur.indexOf(opt);
        if (i === -1) cur.push(opt); else cur.splice(i, 1);
        val = cur;
        onChange(cur);
      });
      return el;
    } else if (fd.type === 'boolean') {
      el = document.createElement('label');
      el.className = 'ob-check';
      var cb = document.createElement('input');
      cb.type = 'checkbox'; cb.checked = !!val;
      cb.addEventListener('change', function () { onChange(cb.checked); });
      el.appendChild(cb);
      el.appendChild(document.createTextNode(' ' + fd.label));
      return el;
    } else if (fd.type === 'range') {
      el = document.createElement('div');
      el.className = 'ob-range';
      var from = document.createElement('input');
      from.type = 'number'; from.placeholder = 'Từ'; from.min = fd.min || 0;
      from.value = (val && val.from != null) ? val.from : '';
      var to = document.createElement('input');
      to.type = 'number'; to.placeholder = 'Đến'; to.min = fd.min || 0;
      to.value = (val && val.to != null) ? val.to : '';
      var emit = function () { onChange({ from: from.value === '' ? null : Number(from.value), to: to.value === '' ? null : Number(to.value) }); };
      from.addEventListener('input', emit); to.addEventListener('input', emit);
      el.appendChild(from); el.appendChild(document.createTextNode(' — ')); el.appendChild(to);
      return el;
    } else if (fd.type === 'textarea') {
      el = document.createElement('textarea');
      el.rows = 3; el.value = val;
      el.addEventListener('input', function () { onChange(el.value); });
    } else {
      el = document.createElement('input');
      el.type = fd.type === 'url' ? 'url' : fd.type === 'number' ? 'number' : 'text';
      if (fd.type === 'number') { if (fd.min != null) el.min = fd.min; if (fd.max != null) el.max = fd.max; }
      el.value = val;
      el.addEventListener('input', function () { onChange(fd.type === 'number' && el.value !== '' ? Number(el.value) : el.value); });
    }
    return el;
  }

  function renderField(fd) {
    var wrap = document.createElement('div');
    wrap.className = 'ob-field';
    if (fd.type !== 'boolean') {
      var lab = document.createElement('label');
      lab.className = 'ob-label';
      lab.textContent = fd.label + (fd.required ? ' *' : '');
      wrap.appendChild(lab);
    }
    var input = fieldInput(fd, (state.answers || {})[fd.key], function (v) {
      state.answers[fd.key] = v;
    });
    wrap.appendChild(input);
    if (fd.help) {
      var h = document.createElement('p');
      h.className = 'ob-help';
      h.textContent = fd.help;
      wrap.appendChild(h);
    }
    var err = document.createElement('p');
    err.className = 'field-err ob-err';
    err.id = 'ob-err-' + fd.key;
    wrap.appendChild(err);
    return wrap;
  }

  function renderGoals() {
    var fields = F(); if (!fields) return document.createElement('div');
    var box = document.createElement('div');
    box.className = 'ob-section';
    var h = document.createElement('h3');
    h.textContent = 'Mục tiêu sử dụng (chọn nhiều)';
    box.appendChild(h);
    var p = document.createElement('p');
    p.className = 'ob-why';
    p.textContent = 'Mục tiêu quyết định menu, bảng tin và cơ hội hệ thống gợi ý cho bạn. Chọn xong có thể đổi lại bất cứ lúc nào.';
    box.appendChild(p);
    var chips = document.createElement('div');
    chips.className = 'ob-chips';
    fields.GOALS.forEach(function (g) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'ob-chip' + (state.goals[g.key] ? ' sel' : '');
      b.textContent = g.label;
      b.addEventListener('click', function () {
        if (state.goals[g.key]) { delete state.goals[g.key]; delete state.goalPriority[g.key]; b.classList.remove('sel'); }
        else { state.goals[g.key] = true; state.goalPriority[g.key] = 2; b.classList.add('sel'); }
        renderPriorityRow();
      });
      chips.appendChild(b);
    });
    box.appendChild(chips);
    var pr = document.createElement('div');
    pr.className = 'ob-priority';
    pr.id = 'obGoalPriority';
    box.appendChild(pr);
    function renderPriorityRow() {
      pr.innerHTML = '';
      var keys = Object.keys(state.goals);
      if (!keys.length) return;
      var t = document.createElement('p');
      t.className = 'ob-help';
      t.textContent = 'Mức ưu tiên (1 = cao nhất):';
      pr.appendChild(t);
      keys.forEach(function (k) {
        var g = null;
        fields.GOALS.forEach(function (gg) { if (gg.key === k) g = gg; });
        if (!g) return;
        var row = document.createElement('label');
        row.className = 'ob-prio-row';
        row.textContent = g.label + ' ';
        var sel = document.createElement('select');
        [[1, 'Ưu tiên 1 — cao nhất'], [2, 'Ưu tiên 2'], [3, 'Ưu tiên 3']].forEach(function (opt) {
          var o = document.createElement('option');
          o.value = opt[0]; o.textContent = opt[1];
          if ((state.goalPriority[k] || 2) === opt[0]) o.selected = true;
          sel.appendChild(o);
        });
        sel.addEventListener('change', function () { state.goalPriority[k] = Number(sel.value); });
        row.appendChild(sel);
        pr.appendChild(row);
      });
    }
    renderPriorityRow();
    return box;
  }

  function renderGeo(seenKeys) {
    var fields = F(); if (!fields) return document.createElement('div');
    var box = document.createElement('div');
    box.className = 'ob-section';
    var h = document.createElement('h3');
    h.textContent = 'Địa lý và hình thức làm việc';
    box.appendChild(h);
    var p = document.createElement('p');
    p.className = 'ob-why';
    p.textContent = 'Chỉ lưu tỉnh/thành — không yêu cầu công khai địa chỉ nhà riêng.';
    box.appendChild(p);
    var geoFields = [
      { key: 'work_area', label: 'Tỉnh / thành phố', type: 'select', options: fields.PROVINCES, privacy: 'logged_in', prefillKey: 'workLocation' },
      { key: 'can_relocate', label: 'Có thể di chuyển', type: 'boolean', privacy: 'logged_in' },
      { key: 'can_remote', label: 'Có thể làm việc từ xa', type: 'boolean', privacy: 'logged_in' },
      { key: 'can_travel', label: 'Có thể đi công tác', type: 'boolean', privacy: 'logged_in' },
      { key: 'work_distance_km', label: 'Khoảng cách làm việc mong muốn (km)', type: 'number', min: 0, privacy: 'logged_in' },
      { key: 'available_hours', label: 'Khung giờ rảnh', type: 'text', privacy: 'logged_in', help: 'VD: tối 19h–22h các ngày trong tuần.' },
      { key: 'desired_hours_per_week', label: 'Số giờ làm việc mong muốn / tuần', type: 'number', min: 0, max: 168, privacy: 'logged_in' },
      { key: 'work_form_geo', label: 'Hình thức làm việc', type: 'multi', options: ['Full-time', 'Part-time', 'Freelancer', 'Theo ca'], privacy: 'logged_in' }
    ];
    /* Bo qua truong da hoi o muc vai tro (vd work_area da co o muc Shop) —
       tranh render trung 2 lan cung 1 khoa. */
    geoFields.forEach(function (fd) { if (!seenKeys || !seenKeys[fd.key]) box.appendChild(renderField(fd)); });
    return box;
  }

  function renderNeeds() {
    var fields = F(); if (!fields) return document.createElement('div');
    var shopRole = state.roles.some(function (r) { return r === 'C' || r === 'D' || r === 'E' || r === 'H'; });
    var personalRole = state.roles.some(function (r) { return r === 'A' || r === 'B' || r === 'F' || r === 'G' || r === 'I'; });
    var box = document.createElement('div');
    box.className = 'ob-section';
    var h = document.createElement('h3');
    h.textContent = 'Khảo sát nhu cầu (tùy chọn)';
    box.appendChild(h);
    var p = document.createElement('p');
    p.className = 'ob-why';
    p.textContent = 'Nhu cầu của bạn quyết định menu, tiện ích và bảng tin hệ thống gợi ý. Đổi lại được bất cứ lúc nào.';
    box.appendChild(p);
    function needsBlock(title, list) {
      var t = document.createElement('p');
      t.className = 'ob-sub';
      t.textContent = title;
      box.appendChild(t);
      var selectedLabels = list.filter(function (n) { return state.needs[n.key]; }).map(function (n) { return n.label; });
      box.appendChild(chipGroup(title, list.map(function (n) { return n.label; }), selectedLabels, function (label) {
        var item = null;
        list.forEach(function (n) { if (n.label === label) item = n; });
        if (!item) return;
        if (state.needs[item.key]) delete state.needs[item.key];
        else state.needs[item.key] = true;
      }));
    }
    if (personalRole) needsBlock('Nhu cầu cá nhân', fields.NEEDS_PERSONAL);
    if (shopRole) needsBlock('Nhu cầu chủ Shop', fields.NEEDS_SHOP);
    return box;
  }

  function renderStep2() {
    var fields = F();
    var box = document.createElement('div');
    var h = document.createElement('h2');
    h.textContent = 'Bước 2 — Bạn dùng web với vai trò nào?';
    box.appendChild(h);
    var p = document.createElement('p');
    p.className = 'ob-why';
    p.textContent = 'Chọn nhiều vai trò được. Chọn 1 vai trò chính để hệ thống thiết lập menu và trang chủ ban đầu cho bạn — đổi lại được sau trong Cài đặt.';
    box.appendChild(p);
    var grid = document.createElement('div');
    grid.className = 'ob-role-grid';
    fields.ROLES.forEach(function (r) {
      var card = document.createElement('button');
      card.type = 'button';
      card.className = 'ob-role-card' + (state.roles.indexOf(r.key) !== -1 ? ' sel' : '') + (state.primary === r.key ? ' primary' : '');
      card.setAttribute('data-role', r.key);
      card.innerHTML = '<span class="ob-role-ic" aria-hidden="true">' + esc(r.icon) + '</span>' +
        '<b>' + esc(r.label) + '</b><span>' + esc(r.desc) + '</span>' +
        (state.primary === r.key ? '<span class="ob-role-main">★ Vai trò chính</span>' : '');
      card.addEventListener('click', function (ev) {
        if (ev.shiftKey || ev.altKey) {
          /* Shift/Alt + bam = dat lam vai tro chinh. */
          state.primary = r.key;
          if (state.roles.indexOf(r.key) === -1) state.roles.push(r.key);
        } else {
          var i = state.roles.indexOf(r.key);
          if (i === -1) {
            state.roles.push(r.key);
            if (!state.primary) state.primary = r.key;
          } else {
            state.roles.splice(i, 1);
            if (state.primary === r.key) state.primary = state.roles[0] || null;
          }
        }
        render();
      });
      grid.appendChild(card);
    });
    box.appendChild(grid);
    var hint = document.createElement('p');
    hint.className = 'ob-help';
    hint.textContent = 'Bấm 1 lần để chọn/bỏ chọn. Giữ Shift (hoặc Alt) rồi bấm để đặt vai trò đó làm vai trò chính.';
    box.appendChild(hint);
    return box;
  }

  function renderStep3() {
    var box = document.createElement('div');
    var h = document.createElement('h2');
    h.textContent = 'Bước 3 — Câu hỏi theo vai trò của bạn';
    box.appendChild(h);
    state.roles.forEach(function (rk) {
      getQuestionsForRole(rk).forEach(function (sec) {
        var s = document.createElement('div');
        s.className = 'ob-section';
        var sh = document.createElement('h3');
        sh.textContent = sec.section;
        s.appendChild(sh);
        if (sec.why) {
          var w = document.createElement('p');
          w.className = 'ob-why';
          w.textContent = sec.why;
          s.appendChild(w);
        }
        (sec.fields || []).forEach(function (fd) { s.appendChild(renderField(fd)); });
        box.appendChild(s);
      });
    });
    box.appendChild(renderGoals());
    /* Thu thap khoa da hoi o muc vai tro de muc Dia ly bo qua truong trung. */
    var seenKeys = {};
    state.roles.forEach(function (rk) {
      getQuestionsForRole(rk).forEach(function (sec) {
        (sec.fields || []).forEach(function (fd) { seenKeys[fd.key] = true; });
      });
    });
    box.appendChild(renderGeo(seenKeys));
    box.appendChild(renderNeeds());
    return box;
  }

  function renderStep4() {
    var comp = computeCompletion(state);
    var box = document.createElement('div');
    var h = document.createElement('h2');
    h.textContent = 'Bước 4 — Hoàn thiện hồ sơ (tùy chọn)';
    box.appendChild(h);
    var p = document.createElement('p');
    p.className = 'ob-why';
    p.textContent = 'Làm ngay hoặc làm sau từ Trang của tôi. Hệ thống nhắc bổ sung định kỳ — không bắt hoàn thành mới được vào hệ thống.';
    box.appendChild(p);
    var bar = document.createElement('div');
    bar.className = 'ob-complete';
    bar.innerHTML = '<div class="ob-complete-bar"><div class="ob-complete-fill" style="width:' + comp.pct + '%"></div></div>' +
      '<p><b>Hồ sơ của bạn đã hoàn thiện ' + comp.pct + '%</b></p>';
    box.appendChild(bar);
    var list = document.createElement('ul');
    list.className = 'ob-checklist';
    var labels = { basic: 'Thông tin cơ bản', goals: 'Mục tiêu sử dụng', skills: 'Kỹ năng / chuyên môn', experience: 'Kinh nghiệm', portfolio: 'Portfolio', work: 'Điều kiện làm việc', shop: 'Thông tin Shop', industries: 'Ngành hàng', hiring: 'Nhu cầu tuyển dụng', scale: 'Quy mô hoạt động', verification: 'Xác thực danh tính' };
    Object.keys(comp.breakdown).forEach(function (g) {
      var b = comp.breakdown[g];
      var li = document.createElement('li');
      li.textContent = (b.done ? '✓ ' : '○ ') + (labels[g] || g) + ' — ' + b.got + '/' + b.weight + '%';
      list.appendChild(li);
    });
    box.appendChild(list);
    var vnote = document.createElement('p');
    vnote.className = 'ob-help';
    vnote.textContent = 'Mục Xác thực danh tính đang là 0% vì chưa có cơ chế xác minh (Nghị định 248/2026 yêu cầu xác minh danh tính người bán — sẽ bổ sung ở đợt sau).';
    box.appendChild(vnote);
    var pr = document.createElement('div');
    pr.className = 'ob-section';
    var ph = document.createElement('h3');
    ph.textContent = 'Quyền riêng tư';
    pr.appendChild(ph);
    var pp = document.createElement('p');
    pp.className = 'ob-why';
    pp.textContent = 'Mặc định: thu nhập, liên hệ và ngoại hình là riêng tư. Đổi xong áp dụng ngay cho cả hồ sơ cũ lẫn mới.';
    pr.appendChild(pp);
    [['income', 'Thu nhập mong muốn'], ['contact', 'Thông tin liên hệ'], ['appearance', 'Thông tin ngoại hình']].forEach(function (pair) {
      var row = document.createElement('label');
      row.className = 'ob-prio-row';
      row.textContent = pair[1] + ' ';
      var sel = document.createElement('select');
      [['private', 'Riêng tư — chỉ mình tôi'], ['partners', 'Chỉ đối tác được cấp quyền'], ['logged_in', 'Chỉ người đăng nhập'], ['public', 'Công khai']].forEach(function (opt) {
        var o = document.createElement('option');
        o.value = opt[0]; o.textContent = opt[1];
        if ((state.privacy[pair[0]] || 'private') === opt[0]) o.selected = true;
        sel.appendChild(o);
      });
      sel.addEventListener('change', function () { state.privacy[pair[0]] = sel.value; });
      row.appendChild(sel);
      pr.appendChild(row);
    });
    box.appendChild(pr);
    return box;
  }

  function render() {
    if (!wizardEl) return;
    wizardEl.innerHTML = '';
    var prog = document.createElement('div');
    prog.className = 'ob-progress';
    var steps = ['1. Tài khoản', '2. Vai trò', '3. Câu hỏi', '4. Hoàn thiện'];
    steps.forEach(function (label, i) {
      var s = document.createElement('span');
      s.className = 'ob-step' + (state.step === i + 1 ? ' active' : '') + (state.step > i + 1 ? ' done' : '');
      s.textContent = label;
      prog.appendChild(s);
    });
    wizardEl.appendChild(prog);
    var body = state.step === 2 ? renderStep2() : state.step === 3 ? renderStep3() : renderStep4();
    wizardEl.appendChild(body);
    var errBox = document.createElement('p');
    errBox.className = 'field-err ob-err-main';
    errBox.id = 'obErrMain';
    wizardEl.appendChild(errBox);
    var nav = document.createElement('div');
    nav.className = 'ob-nav';
    if (state.step > 2) {
      var back = document.createElement('button');
      back.type = 'button'; back.className = 'btn btn-ghost';
      back.textContent = '← Quay lại';
      back.addEventListener('click', function () { state.step -= 1; saveDraft(true); render(); });
      nav.appendChild(back);
    }
    var draftBtn = document.createElement('button');
    draftBtn.type = 'button'; draftBtn.className = 'btn btn-ghost';
    draftBtn.textContent = 'Lưu nháp & tiếp tục sau';
    draftBtn.addEventListener('click', function () { saveDraft(false); });
    nav.appendChild(draftBtn);
    var later = document.createElement('button');
    later.type = 'button'; later.className = 'btn btn-ghost';
    later.textContent = 'Để sau';
    later.addEventListener('click', function () {
      saveDraft(true);
      track(funnelEventName(state.step, 'abandoned'));
      window.location.href = destUrl;
    });
    nav.appendChild(later);
    var next = document.createElement('button');
    next.type = 'button'; next.className = 'btn btn-primary';
    next.textContent = state.step === 4 ? 'Hoàn tất →' : 'Tiếp tục →';
    next.addEventListener('click', function () {
      var errs = validateStep(state);
      var errMain = document.getElementById('obErrMain');
      if (errs.length) {
        if (errMain) errMain.textContent = errs[0] + (errs.length > 1 ? ' (' + errs.length + ' lỗi — xem các ô đỏ bên trên)' : '');
        errs.forEach(function () { /* loi chi tiet hien o tung o (ob-err) khi render lai */ });
        /* Danh dau cac o bat buoc thieu. */
        if (state.step === 3) {
          requiredFieldsFor(state.roles || []).forEach(function (k) {
            var e = document.getElementById('ob-err-' + k);
            if (e && isEmpty((state.answers || {})[k])) e.textContent = 'Trường bắt buộc — hãy nhập hoặc quay lại chọn vai trò khác.';
          });
        }
        return;
      }
      if (errMain) errMain.textContent = '';
      saveDraft(true);
      if (state.step === 4) { finish(); return; }
      track(funnelEventName(state.step));
      state.step += 1;
      render();
      if (wizardEl) wizardEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    nav.appendChild(next);
    wizardEl.appendChild(nav);
    var note = document.createElement('p');
    note.className = 'ob-draft-note';
    wizardEl.appendChild(note);
  }

  function finish() {
    syncPrefill();
    saveDraft(true);
    /* v454 (T-v423-polish, 26/11/2026): hoan tat thi XOA nhap — truoc day
       chi ghi doneKey, nhap con lai nen banner khoi phuc van hien + mo lai
       Buoc 4 sau khi da hoan tat. Giu doneKey lam ban ghi hoan tat. */
    safe(function () { window.localStorage.setItem(doneKey(userId), JSON.stringify({ at: Date.now(), step: 4, pct: computeCompletion(state).pct })); window.localStorage.removeItem(draftKey(userId)); });
    track('signup_complete');
    window.location.href = destUrl;
  }

  /* Mo wizard sau khi dang ky xong (goi tu onSignupSession). Tra ve true
     neu mo duoc (auth-ui.js giu nguoi dung o lai), false neu khong mo duoc
     (auth-ui.js redirect nhu cu). */
  function openWizard(res, dest) {
    if (!F() || !wizardEl) return false;
    try {
      userId = (res && res.session && res.session.user && res.session.user.id) || userId || 'guest';
    } catch (e) { userId = userId || 'guest'; }
    if (dest) destUrl = dest;
    else destUrl = defaultDest(res);
    var d = loadDraft();
    state = d ? mergeDraft(freshState(), d) : freshState();
    if (d && d.step) track(funnelEventName(d.step, 'resumed'));
    track(funnelEventName(1));
    wizardEl.hidden = false;
    if (resumeEl) resumeEl.hidden = true;
    render();
    wizardEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
    return true;
  }

  function initPage(opts) {
    var o = opts || {};
    wizardEl = document.getElementById('onboardingWizard');
    resumeEl = document.getElementById('onboardingResume');
    if (!wizardEl || !F()) return false;
    /* Nguoi da dang nhap mo lai trang: lay userId tu session de tim nhap. */
    safe(function () {
      var API = (typeof window !== 'undefined') ? window.McLivestreamAPI : null;
      if (API && typeof API.getSession === 'function') {
        API.getSession().then(function (sess) {
          if (sess && sess.user && sess.user.id) {
            userId = sess.user.id;
            var d = loadDraft();
            var done = safe(function () { return !!window.localStorage.getItem(doneKey(userId)); }, false);
            /* v454 (T-v423-polish): chi hien banner khi co nhap VA chua hoan
               tat — lop phong thu cho nhap cu con sot tu truoc fix (dieu kien
               cu (d || !done) luon dung khi nhap ton tai). */
            if (d && !done && resumeEl) {
              resumeEl.hidden = false;
              var btn = resumeEl.querySelector('[data-ob-resume]');
              if (btn) btn.addEventListener('click', function () {
                destUrl = defaultDest(null);
                openWizard(null, destUrl);
              });
            }
          }
        }).catch(function () { /* bo qua — wizard van mo duoc sau dang ky */ });
      }
    });
    if (o.presetRole) {
      state = freshState();
      state.roles = [o.presetRole];
      state.primary = o.presetRole;
    }
    return true;
  }

  var API = {
    initPage: initPage, openWizard: openWizard, finish: finish,
    getQuestionsForRole: getQuestionsForRole, requiredFieldsFor: requiredFieldsFor,
    validateStep: validateStep, computeCompletion: computeCompletion,
    mergeDraft: mergeDraft, stripSensitive: stripSensitive,
    draftKey: draftKey, doneKey: doneKey, funnelEventName: funnelEventName,
    defaultDest: defaultDest, _freshState: freshState
  };

  if (typeof window !== 'undefined') window.V2SOnboarding = API;
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
})();
