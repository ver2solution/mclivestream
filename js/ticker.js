/* js/ticker.js — Hàng chữ chạy (ticker) cho Ver2Solution.
 *
 * Module RIÊNG, độc lập với js/app.js: chỉ cần window.V20_DATA (js/data.js).
 * - Tóm tắt TỰ ĐỘNG nội dung mấu chốt của bài web thành 4/6/8 từ, lấy từ trường
 *   takeaway của bài (fallback: title). Độ dài theo số "điểm cốt lõi" trong
 *   takeaway: số liệu (con số) + số mệnh đề. Tóm tắt lấy câu đầu → mệnh đề đầu,
 *   không cắt giữa số và đơn vị ("237 tỷ", "1 phiên", "100 triệu view"), không
 *   kết bằng giới từ/liên từ. Độ dài là mục tiêu: bộ đệm có thể cộng/thêm 1–2 từ
 *   để không cắt giữa chừng.
 * - Strip: nền trắng, chữ đen, chạy phải → trái, tốc độ 2 giây/từ (thời lượng
 *   animation = tổng số từ của 1 vòng lặp × 2 giây). Dừng khi rê chuột lên;
 *   tôn trọng prefers-reduced-motion (CSS).
 * - Vị trí (anh chốt 19:43 ngày 10/11): strip nằm NGAY DƯỚI menu top — ngay sau </header>,
 *   trước <main> (ngoài wrap, full-width), trên mọi nội dung của trang.
 *   data-ticker: home | model | shop | kiot.
 * - Nội dung theo trang (tin mới 3 ngày gần đây, mới nhất trước):
 *   home : tất cả bài 3 ngày.
 *   model: (1) shop deal lương tháng cao nhất (tên + mức lương) → (2) bài Việc Làm
 *          và Livestream xen kẽ nhau tới hết tin 3 ngày.
 *   shop : (1) mẫu deal lương thấp nhất (tên + mức lương cần) → (2) mẫu kinh nghiệm
 *          nhiều nhất (doanh thu livestream chưa có số liệu nên dùng kinh nghiệm)
 *          → (3) bài Hàng hoá ("Hàng mới trend") và Dòng tiền xen kẽ.
 *   kiot : bài Hàng hoá → Livestream → Dòng tiền, xen kẽ vòng tròn tới hết tin 3 ngày.
 * - Quy ước cần anh xác nhận: "Hàng mới trend" = mục "Hàng hoá"; tốc độ 2 giây/từ.
 */
(function () {
  'use strict';

  var SECONDS_PER_WORD = 2;
  var DAYS_WINDOW = 3;

  var D = (typeof window !== 'undefined' && window.V20_DATA) || { models: [], shops: [], articles: [] };

  /* ---------- tiện ích ---------- */
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function wordsOf(s) {
    return String(s || '').replace(/\s+/g, ' ').trim().split(' ').filter(Boolean);
  }
  function fmtDate(d) {
    var m = d.getMonth() + 1, day = d.getDate();
    return d.getFullYear() + '-' + (m < 10 ? '0' : '') + m + '-' + (day < 10 ? '0' : '') + day;
  }
  function cutoffDateStr(todayStr) {
    var base = todayStr ? new Date(todayStr + 'T00:00:00') : new Date();
    base.setDate(base.getDate() - DAYS_WINDOW);
    return fmtDate(base);
  }
  function articleHref(a) {
    if (a && a.page) return a.page;
    if (a && a.url) return a.url;
    return '#';
  }
  function isExternal(href) { return /^https?:\/\//i.test(href); }

  /* ---------- bộ tóm tắt 4-6-8 từ ---------- */
  var UNITS = ['tỷ', 'triệu', 'nghìn', 'tỉ', '%', 'đồng', 'ndt', 'usd', 'tệ'];
  var QTY_NOUNS = ['tỷ', 'triệu', 'nghìn', 'tỉ', '%', 'đồng', 'đơn', 'người', 'giờ', 'phút',
    'lượt', 'ndt', 'usd', 'tệ', 'phiên', 'ngày', 'tháng', 'năm', 'lần', 'buổi', 'ca',
    'tấn', 'kg', 'chiếc', 'cái', 'bộ', 'hộp', 'gói', 'mẫu', 'shop', 'video', 'bài', 'view', 'follow',
    'tin', 'vị'];
  // Từ mở đầu nên bỏ khi tóm tắt bắt đầu bằng nó ("Với đồ gia dụng..." → "đồ gia dụng...").
  // KHÔNG bỏ "không"/"đừng"/"chưa" vì bỏ sẽ đảo nghĩa.
  var LEAD_STRIP = ['với', 'trong', 'của', 'khi', 'nếu', 'để', 'từ', 'theo', 'là', 'đây', 'đó', 'và', 'nhưng'];
  var BAD_END = ['trong', 'của', 'và', 'với', 'từ', 'đến', 'tại', 'ngày', 'tháng', 'năm', 'là',
    'đã', 'đang', 'sẽ', 'một', 'các', 'những', 'khi', 'sau', 'trước', 'nhưng', 'mà', 'thì',
    'được', 'có', 'không', 'lên', 'xuống', 'ra', 'vào', 'cho', 'theo', 'mỗi', 'cả', 'rất',
    'quá', 'chỉ', 'để', 'này', 'đó', 'kia'];
  function normWord(w) { return String(w).toLowerCase().replace(/[.,:;!?()""'']/g, ''); }
  function isNumber(w) { return /^\d/.test(String(w).replace(/^[^\d]+/, '')); }
  function isUnit(w) { return UNITS.indexOf(normWord(w)) >= 0; }
  function isQtyNoun(w) {
    var nw = normWord(w);
    if (QTY_NOUNS.indexOf(nw) >= 0) return true;
    // Đơn vị có dấu "/" ("đồng/giờ", "triệu/lượng", "NDT/tháng"): lấy phần trước "/".
    return QTY_NOUNS.indexOf(nw.split('/')[0]) >= 0;
  }
  function isBadEnd(w) { return BAD_END.indexOf(normWord(w)) >= 0; }

  function cutWords(words, target) {
    if (!words.length) return '';
    var n = Math.min(target, words.length);
    // Không tách số khỏi đơn vị/danh từ đi kèm ("237 tỷ", "1 phiên", "100 triệu view").
    var pass = 0;
    while (pass < 3) {
      pass++;
      var before = n;
      if (n < words.length && isNumber(words[n - 1]) && isQtyNoun(words[n])) n++;
      else if (n < words.length && isUnit(words[n - 1]) && isQtyNoun(words[n])) n++;
      if (n === before) break;
    }
    // Không kết bằng giới từ/liên từ: lùi lại (tối thiểu 4 từ).
    while (n > 4 && isBadEnd(words[n - 1])) n--;
    // Lùi tới mức tối thiểu mà vẫn gặp giới từ: kéo dài qua nó 1 từ.
    if (isBadEnd(words[n - 1]) && n < words.length) {
      n++;
      if (n < words.length && isNumber(words[n - 1]) && isQtyNoun(words[n])) n++;
    }
    return words.slice(0, n).join(' ');
  }

  // Bảo vệ dấu phân cách trong số ("30.000", "913,4") khỏi bị tách câu/mệnh đề.
  function protectNumbers(s) {
    return String(s).replace(/(\d)\.(\d)/g, '$1\u0001$2').replace(/(\d),(\d)/g, '$1\u0002$2');
  }
  function restoreNumbers(s) {
    return String(s).replace(/\u0001/g, '.').replace(/\u0002/g, ',');
  }

  function summarizeArticle(a) {
    var text = (a && (a.takeaway || a.title)) || '';
    text = String(text).replace(/\s+/g, ' ').trim();
    if (!text) return '';
    var ptext = protectNumbers(text);
    // Lấy câu đầu tiên.
    var sent = ptext.split(/[.。!?\n]/)[0].trim();
    sent = sent.replace(/^(Ver2Solution|Ver2 Solution)[,:—–-]?\s*/i, '');
    // Bỏ ngày mở đầu KHÔNG kèm năm ("Ngày 08/11, ..."). Ngày CÓ năm ("Ngày 12/11/2025,")
    // phải GIỮ LẠI — đó là dữ liệu năm cũ, bỏ đi sẽ khiến số liệu trông như thống kê
    // hiện tại (vd 913,4 tỷ của 12/11/2025 mà tưởng là 11/11/2026).
    sent = sent.replace(/^Ngày\s+\d{1,2}\/\d{1,2},\s*/i, '');
    // Bảo vệ khoảng số ("7 – 15 triệu", "5 - 20%") khỏi bị tách ở dấu gạch ngang.
    sent = sent.replace(/(\d)\s*[–—-]\s*(\d)/g, '$1–$2');
    // Mệnh đề đầu: tách ở dấu phẩy/chấm phẩy/hai chấm hoặc gạch ngang có khoảng trắng.
    // Mệnh đề ngắn hơn 4 từ (vd "Host Douyin,") hoặc mở đầu bằng giới từ (vd "Với đồ
    // gia dụng,") thì lấy cả câu để có đủ chất liệu tóm tắt.
    var clause = sent.split(/[,;:]|\s[—–]\s/)[0].trim();
    var clauseWords = wordsOf(clause);
    var src = (clauseWords.length >= 4 && LEAD_STRIP.indexOf(normWord(clauseWords[0])) < 0) ? clause : sent;
    var words = wordsOf(src);
    // Bỏ tối đa 2 từ mở đầu là giới từ/liên từ ("Với", "là"...), giữ nguyên nghĩa.
    var stripped = 0;
    while (words.length > 4 && stripped < 2 && LEAD_STRIP.indexOf(normWord(words[0])) >= 0) {
      words.shift(); stripped++;
    }
    if (!words.length) return '';
    // Số điểm cốt lõi: số liệu + số mệnh đề trong toàn bộ takeaway.
    var figures = (text.match(/\d+(?:[.,]\d+)?/g) || []).length;
    var clauses = ptext.split(/[,;]/).length;
    var points = figures + clauses;
    var target = points >= 5 ? 8 : points >= 3 ? 6 : 4;
    return restoreNumbers(cutWords(words, target));
  }

  /* ---------- lương / kinh nghiệm ---------- */
  // Cùng logic parseMonthlyMax của js/app.js (v41): trần lương tháng, triệu/tháng.
  function parseMonthlyMax(s) {
    if (!s || s.indexOf('/tháng') < 0) return null;
    if (s.indexOf('triệu/tháng') >= 0) {
      var head = s.slice(0, s.indexOf('triệu/tháng'));
      var nums = head.match(/\d+(?:[.,]\d+)?/g);
      if (!nums) return null;
      var max = null;
      nums.forEach(function (x) { var v = parseFloat(x.replace(',', '.')); if (max === null || v > max) max = v; });
      return max;
    }
    var m = s.match(/([\d.]+)\s*đ(?:\s*[–-]\s*([\d.]+)\s*đ)?\s*\/tháng/);
    if (!m) return null;
    var hi = m[2] || m[1];
    var v = parseFloat(hi.replace(/\./g, '')) / 1000000;
    return isNaN(v) ? null : v;
  }
  // "5 năm" → 60, "3 tháng livestream" → 3, "Hơn 1 năm" → 12 (lấy số đầu tiên).
  function expMonths(e) {
    if (!e) return null;
    var m = String(e).match(/(\d+(?:[.,]\d+)?)\s*(năm|tháng)/i);
    if (!m) return null;
    var v = parseFloat(m[1].replace(',', '.'));
    return /tháng/i.test(m[2]) ? v : v * 12;
  }
  function fmtVnd(n) {
    return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  }
  function pickHighestShop() {
    var best = null;
    (D.shops || []).forEach(function (s) {
      var mm = parseMonthlyMax(s.salary);
      if (mm === null) return;
      if (!best || mm > best.mm || (mm === best.mm && String(s.id) < String(best.shop.id))) best = { shop: s, mm: mm };
    });
    return best;
  }
  function pickLowestModel() {
    var best = null;
    (D.models || []).forEach(function (m) {
      if (typeof m.salaryNum !== 'number') return;
      var em = expMonths(m.exp);
      // Lương giờ thấp nhất; hoà thì lấy mẫu kinh nghiệm nhiều hơn, rồi id sớm hơn.
      if (!best || m.salaryNum < best.model.salaryNum ||
        (m.salaryNum === best.model.salaryNum && (em || 0) > (best.expMonths || 0)) ||
        (m.salaryNum === best.model.salaryNum && (em || 0) === (best.expMonths || 0) && String(m.id) < String(best.model.id))) {
        best = { model: m, expMonths: em };
      }
    });
    return best;
  }
  function pickMostExperiencedModel() {
    var best = null;
    (D.models || []).forEach(function (m) {
      var em = expMonths(m.exp);
      if (em === null) return;
      if (!best || em > best.expMonths || (em === best.expMonths && String(m.id) < String(best.model.id))) best = { model: m, expMonths: em };
    });
    return best;
  }
  function expLabel(months) {
    if (months % 12 === 0) return (months / 12) + ' năm kinh nghiệm';
    return months + ' tháng kinh nghiệm';
  }

  /* ---------- xây danh sách tin ---------- */
  function recentArticles(todayStr) {
    var cut = cutoffDateStr(todayStr);
    return (D.articles || []).filter(function (a) { return (a.date || '') >= cut; })
      .sort(function (a, b) { return String(b.date || '').localeCompare(String(a.date || '')); });
  }
  function byCats(arts) {
    var map = {};
    arts.forEach(function (a) { (map[a.cat] = map[a.cat] || []).push(a); });
    return map;
  }
  // Xen kẽ vòng tròn: lấy 1 tin từ mỗi danh sách theo lượt (mới nhất trước).
  function alternateLists(lists) {
    var out = [], i = 0, added = true;
    while (added) {
      added = false;
      for (var k = 0; k < lists.length; k++) {
        if (i < lists[k].length) { out.push(lists[k][i]); added = true; }
      }
      i++;
    }
    return out;
  }
  function articleItem(a) { return { text: summarizeArticle(a), href: articleHref(a) }; }

  function buildItems(page, todayStr) {
    var recent = recentArticles(todayStr);
    var cats = byCats(recent);
    var items = [];
    if (page === 'home') {
      items = recent.map(articleItem);
    } else if (page === 'model') {
      var shop = pickHighestShop();
      if (shop) items.push({ text: shop.shop.name + ' — lương cao nhất ' + shop.mm + ' triệu/tháng', href: 'danh-sach-shop.html' });
      items = items.concat(alternateLists([cats['Việc Làm'] || [], cats['Livestream'] || []]).map(articleItem));
    } else if (page === 'shop') {
      var low = pickLowestModel();
      if (low) items.push({ text: low.model.name + ' — cần ' + fmtVnd(low.model.salaryNum) + 'đ/giờ', href: 'danh-sach-mau.html' });
      var exp = pickMostExperiencedModel();
      if (exp) items.push({ text: exp.model.name + ' — ' + expLabel(exp.expMonths), href: 'danh-sach-mau.html' });
      items = items.concat(alternateLists([cats['Hàng hoá'] || [], cats['Dòng tiền'] || []]).map(articleItem));
    } else if (page === 'kiot') {
      items = alternateLists([cats['Hàng hoá'] || [], cats['Livestream'] || [], cats['Dòng tiền'] || []]).map(articleItem);
    }
    return items.filter(function (it) { return it.text; });
  }

  /* ---------- render ---------- */
  function renderTicker(el, todayStr) {
    var page = el.getAttribute('data-ticker');
    var items = buildItems(page, todayStr);
    if (!items.length) { el.style.display = 'none'; return; }
    var track = el.querySelector('.ticker-track');
    if (!track) return;
    var oneCopy = items.map(function (it) {
      var ext = isExternal(it.href) ? ' target="_blank" rel="noopener"' : '';
      return '<a class="ticker-item" href="' + esc(it.href) + '"' + ext + '>' + esc(it.text) + '</a><span class="ticker-sep" aria-hidden="true">•</span>';
    }).join('');
    track.innerHTML = oneCopy;
    // Nhân bản tới khi 1 khối đủ rộng phủ kín viewport, rồi nhân đôi khối đó
    // để vòng lặp translateX(0 → -50%) chạy liền mạch không khoảng trống.
    var containerW = el.clientWidth || 800;
    var guard = 0;
    while (track.scrollWidth < containerW && guard < 10) { track.innerHTML += oneCopy; guard++; }
    var blockWords = 0;
    var nodes = track.querySelectorAll('.ticker-item');
    for (var i = 0; i < nodes.length; i++) blockWords += wordsOf(nodes[i].textContent).length;
    track.innerHTML += track.innerHTML;
    var dur = Math.max(10, blockWords * SECONDS_PER_WORD);
    track.style.animationDuration = dur + 's';
    el.setAttribute('data-items', String(items.length));
    el.setAttribute('data-duration', String(dur));
  }

  function initTicker(todayStr) {
    var els = document.querySelectorAll('.ticker[data-ticker]');
    for (var i = 0; i < els.length; i++) renderTicker(els[i], todayStr);
  }

  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { initTicker(); });
    else initTicker();
  }

  if (typeof window !== 'undefined') {
    window.V20Ticker = {
      SECONDS_PER_WORD: SECONDS_PER_WORD,
      DAYS_WINDOW: DAYS_WINDOW,
      summarizeArticle: summarizeArticle,
      buildItems: buildItems,
      recentArticles: recentArticles,
      pickHighestShop: pickHighestShop,
      pickLowestModel: pickLowestModel,
      pickMostExperiencedModel: pickMostExperiencedModel,
      initTicker: initTicker
    };
  }
})();
