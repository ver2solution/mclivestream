/* v110 — Form "Đặt câu hỏi cho Ver2Solution" trên trang Hỏi đáp
   (hoi-dap.html, trên Top, trước các mục hỏi đáp tĩnh).
   Bố cục: select mục tính năng 1/3 trái + textarea 2/3 phải (CSS
   .faq-ask-grid trong v20.css); mobile ≤600px xếp dọc.
   Mục đích: thu thập thắc mắc/trải nghiệm người dùng để Ryan đọc
   và sửa code ngay khi có người hỏi.
   Lưu trữ: INSERT trực tiếp vào bảng `faq_questions` (migration
   supabase-faq-questions-2026-11-08.sql, CHƯA chạy live — phải chạy
   migration TRƯỚC khi deploy v110, vì client INSERT trực tiếp qua
   anon key + RLS). KHÔNG qua RPC (bảng mới, policy anon INSERT đã
   mở — khác bình luận phải qua RPC vì RLS chặn INSERT trực tiếp,
   NEW-01). KHÔNG cộng xu khi gửi câu hỏi (không có luật này).
   Validate: bắt buộc chọn mục, câu hỏi ≥10 ký tự sau khi cắt khoảng
   trắng (khớp CHECK của bảng). Chống bấm gửi 2 lần (cờ inFlight +
   vô hiệu nút). Lỗi mạng/Supabase báo rõ, không vỡ trang. */
(function () {
  'use strict';
  var TABLE = 'faq_questions';
  var MIN_LEN = 10;
  var MAX_LEN = 2000;
  var SUCCESS_MSG = 'Đã gửi câu hỏi, Ver2Solution sẽ xem và sửa sớm.';
  var CATEGORIES = ['dang_ky', 'dang_nhap', 'tim_mau', 'tim_shop', 'thanh_ly_kiot',
    'lo_xuong', 'xu', 'ghim_top', 'binh_luan', 'loi_hien_thi', 'khac'];

  function api() { return (typeof window !== 'undefined' && window.McLivestreamAPI) ? window.McLivestreamAPI : null; }

  // Validate thuần (để test được qua Node): trả chuỗi lỗi hoặc null.
  function validateQuestion(category, question) {
    if (!category || CATEGORIES.indexOf(category) === -1) return 'Hãy chọn mục tính năng cho câu hỏi của bạn.';
    var q = String(question == null ? '' : question).trim();
    if (q.length < MIN_LEN) return 'Câu hỏi cần từ 10 ký tự trở lên — hãy mô tả rõ hơn để Ver2Solution sửa đúng chỗ.';
    if (q.length > MAX_LEN) return 'Câu hỏi tối đa 2000 ký tự.';
    return null;
  }

  // Gửi 1 câu hỏi: INSERT trực tiếp bảng faq_questions qua anon client.
  // contact = null (form v110 chưa có ô liên hệ; cột giữ sẵn cho bản sau).
  // status 'moi' — trùng default của bảng, ghi rõ để deterministic.
  // Trả {ok, message} — KHÔNG ném lỗi.
  async function submitQuestion(category, question) {
    var err = validateQuestion(category, question);
    if (err) return { ok: false, message: err };
    var a = api();
    if (!a || !a.client) return { ok: false, message: 'Chưa kết nối được Supabase, hãy thử lại sau.' };
    try {
      var res = await a.client.from(TABLE).insert({
        category: category,
        question: String(question).trim(),
        contact: null,
        status: 'moi'
      });
      if (res.error) return { ok: false, message: 'Chưa gửi được câu hỏi: ' + String(res.error.message || res.error) };
    } catch (e) {
      return { ok: false, message: 'Chưa gửi được câu hỏi: ' + String((e && e.message) || e) };
    }
    return { ok: true, message: SUCCESS_MSG };
  }

  // Gắn form tĩnh trong hoi-dap.html (#faqAskForm): chống bấm gửi 2 lần,
  // hiện thông báo vào #faqAskMsg, xoá form khi gửi xong. Trả false nếu
  // không có form (trang khác) hoặc đã gắn rồi.
  function initFaqAsk(doc) {
    var d = doc || (typeof document !== 'undefined' ? document : null);
    if (!d || typeof d.getElementById !== 'function') return false;
    var form = d.getElementById('faqAskForm');
    if (!form || typeof form.addEventListener !== 'function') return false;
    if (form.getAttribute && form.getAttribute('data-v2s-faq-ask-wired') === '1') return false;
    if (form.setAttribute) form.setAttribute('data-v2s-faq-ask-wired', '1');
    var cat = d.getElementById('faqAskCategory');
    var text = d.getElementById('faqAskText');
    var msg = d.getElementById('faqAskMsg');
    var receipt = d.getElementById('faqAskReceipt');
    var btn = d.getElementById('faqAskSubmit');
    var inFlight = false;
    form.addEventListener('submit', async function (e) {
      if (e && typeof e.preventDefault === 'function') e.preventDefault();
      if (inFlight) return;
      inFlight = true;
      if (btn) btn.disabled = true;
      try {
        var out = await submitQuestion(cat ? cat.value : '', text ? text.value : '');
        if (msg) {
          msg.textContent = out.message;
          msg.className = 'faq-ask-msg' + (out.ok ? ' ok' : ' err');
        }
        // v114 (P3-8): bien nhan sau khi gui — cau hoi, muc, gio VN,
        // ma tham chieu HĐ-YYYYMMDD-HHMM-XXX (xem makeFaqReceipt).
        if (out.ok && receipt) {
          var r = makeFaqReceipt(cat ? cat.value : '', text ? text.value : '');
          var catLabel = '';
          try { if (cat && cat.options && cat.selectedIndex >= 0) catLabel = cat.options[cat.selectedIndex].textContent || cat.options[cat.selectedIndex].text || ''; } catch (e2) {}
          receipt.innerHTML = receiptHTML(r, catLabel);
          receipt.hidden = false;
        }
        if (out.ok && typeof form.reset === 'function') form.reset();
      } finally {
        inFlight = false;
        if (btn) btn.disabled = false;
      }
    });
    return true;
  }

  // v114 (P3-8): bien nhan sau khi gui — ham thuan de test duoc qua
  // Node. now: Date hoac ms (mac dinh bay gio, gio dia phuong cua
  // trinh duyet = gio VN cua nguoi dung). Ma tham chieu dang
  // HĐ-YYYYMMDD-HHMM-XXX (XXX = 3 chu so ngau nhien).
  function pad2(n) { return ('0' + n).slice(-2); }
  function makeFaqReceipt(category, question, now) {
    var d = (now instanceof Date) ? now : new Date(now == null ? Date.now() : now);
    var y = d.getFullYear(), mo = pad2(d.getMonth() + 1), dd = pad2(d.getDate());
    var hh = pad2(d.getHours()), mm = pad2(d.getMinutes());
    var rand = String(Math.floor(Math.random() * 1000) + 1000).slice(1);
    return {
      ref: 'HĐ-' + y + mo + dd + '-' + hh + mm + '-' + rand,
      category: category, question: question,
      time: dd + '/' + mo + '/' + y + ' ' + hh + ':' + mm
    };
  }
  function escHtml(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function receiptHTML(r, catLabel) {
    return '<p><b>Đã nhận câu hỏi của bạn.</b></p>'
      + '<p>Mã tham chiếu: <b>' + escHtml(r.ref) + '</b> · Gửi lúc ' + escHtml(r.time) + ' (giờ Việt Nam)</p>'
      + '<p>Mục: ' + escHtml(catLabel || r.category) + '</p>'
      + '<p>Câu hỏi: ' + escHtml(r.question) + '</p>'
      + '<p>Ver2Solution sẽ xem và sửa sớm — câu trả lời sẽ xuất hiện ở mục Hỏi đáp.</p>';
  }

  // Tự gắn khi trang tải xong (script đặt cuối body nên DOM đã sẵn;
  // vẫn kiểm tra readyState để không bỏ lỡ nếu script nạp muộn).
  function autoInit() {
    if (typeof document === 'undefined') return;
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', function () { initFaqAsk(document); });
    } else {
      initFaqAsk(document);
    }
  }
  autoInit();

  var API = {
    TABLE: TABLE, MIN_LEN: MIN_LEN, MAX_LEN: MAX_LEN, SUCCESS_MSG: SUCCESS_MSG,
    CATEGORIES: CATEGORIES, validateQuestion: validateQuestion,
    submitQuestion: submitQuestion, initFaqAsk: initFaqAsk,
    makeFaqReceipt: makeFaqReceipt, receiptHTML: receiptHTML
  };
  if (typeof window !== 'undefined') window.Ver2FaqAsk = API;
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
})();
