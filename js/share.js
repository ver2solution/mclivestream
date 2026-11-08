/* v111 — NEW-P7: handler cho nut "Chia se" tren bai-viet/*.html.
   Van de (QA v108 + task B live 08/11): 63 file bai-viet/*.html deu co
   <button data-share="native">Chia se...</button> va <button
   data-share="zalo">Zalo</button>, nhung KHONG co handler nao cho
   data-share trong toan bo js/*.js (grep navigator.share = 0) — nut chet.
   File nay la JS chung NHO, rieng cho chia se (khong sua js/app.js vi
   cac nhom khac dang sua song song): moi trang bai-viet chen 1 the
   <script src="../js/share.js"></script> ngay sau app.js.
   - Nut "Chia se...": Web Share API neu co (navigator.share) — mo hop
     chia se he thong voi dung tieu de + URL cua bai dang mo; neu khong
     co / loi (tru truong hop nguoi dung tu huy) thi copy link + toast.
   - Nut "Zalo": KHONG co endpoint chia se web cong khai nao cua Zalo
     duoc xac minh (tim kiem 09/11 khong thay) nen KHONG mo URL doan mo —
     copy link + toast huong dan dan vao Zalo. Luon hoat dong, khong mo
     trang chet.
   - Tieu de lay tu og:title (neu co), roi <title> (cat hau to
     " — Ver2Solution"), roi h1. URL lay tu <link rel="canonical">
     (neu co), roi location.href — luon la bai dang mo, khong hardcode.
   - Tu dung, khong phu thuoc app.js / Supabase; chay lai 2 lan cung
     khong gan handler trung (co V2SShare + co data-v2s-share-bound). */
(function () {
  'use strict';
  if (typeof window === 'undefined' || window.V2SShare) return;

  var TOAST_ID = 'v2s-share-toast';
  var TITLE_SUFFIX = ' — Ver2Solution';

  function docOf(d) { return d || (typeof document !== 'undefined' ? document : null); }
  function locOf(l) { return l || (typeof location !== 'undefined' ? location : null); }
  function navOf(n) { return n || (typeof navigator !== 'undefined' ? navigator : null); }

  function metaContent(doc, selector) {
    try {
      var el = doc.querySelector(selector);
      var v = el && (el.getAttribute('content') || el.content);
      return v ? String(v).trim() : '';
    } catch (e) { return ''; }
  }

  // Tieu de bai dang mo: og:title > <title> (cat hau to) > h1 > ''.
  function shareTitle(doc) {
    doc = docOf(doc);
    if (!doc) return '';
    var t = metaContent(doc, 'meta[property="og:title"]');
    if (t) return t;
    t = String(doc.title || '').trim();
    if (t && t.slice(-TITLE_SUFFIX.length) === TITLE_SUFFIX) t = t.slice(0, -TITLE_SUFFIX.length).trim();
    if (t) return t;
    try {
      var h1 = doc.querySelector('h1');
      if (h1 && h1.textContent) return String(h1.textContent).trim();
    } catch (e) { /* bo qua */ }
    return '';
  }

  // URL bai dang mo: canonical > location.href.
  function shareUrl(doc, loc) {
    doc = docOf(doc); loc = locOf(loc);
    var u = '';
    if (doc) {
      try {
        var link = doc.querySelector('link[rel="canonical"]');
        u = link && (link.getAttribute('href') || link.href) ? String(link.getAttribute('href') || link.href).trim() : '';
      } catch (e) { u = ''; }
    }
    if (!u && loc && loc.href) u = String(loc.href);
    return u;
  }

  function getShareData(doc, loc) {
    return { title: shareTitle(doc), url: shareUrl(doc, loc) };
  }

  function showToast(doc, msg) {
    doc = docOf(doc);
    if (!doc || !doc.createElement || !doc.body) return null;
    try {
      var old = doc.getElementById ? doc.getElementById(TOAST_ID) : null;
      if (old && old.remove) old.remove();
      var el = doc.createElement('div');
      el.id = TOAST_ID;
      el.setAttribute('role', 'status');
      el.textContent = msg;
      el.style.cssText = 'position:fixed;left:50%;bottom:24px;transform:translateX(-50%);'
        + 'background:#0b5d4e;color:#fff;padding:10px 16px;border-radius:10px;'
        + 'font-size:14px;line-height:1.4;z-index:9999;max-width:min(92vw,480px);'
        + 'text-align:center;box-shadow:0 4px 16px rgba(0,0,0,.25);';
      doc.body.appendChild(el);
      setTimeout(function () { if (el.remove) el.remove(); }, 2600);
      return el;
    } catch (e) { return null; }
  }

  // Copy text: Clipboard API neu co, fallback textarea + execCommand.
  function copyText(text, nav, doc) {
    nav = navOf(nav); doc = docOf(doc);
    if (nav && nav.clipboard && typeof nav.clipboard.writeText === 'function') {
      try { return Promise.resolve(nav.clipboard.writeText(text)); }
      catch (e) { /* roi xuong fallback */ }
    }
    return new Promise(function (resolve, reject) {
      try {
        if (!doc || !doc.createElement || !doc.body) return reject(new Error('no-dom'));
        var ta = doc.createElement('textarea');
        ta.value = text;
        ta.setAttribute('readonly', '');
        ta.style.cssText = 'position:fixed;top:0;left:0;opacity:0;';
        doc.body.appendChild(ta);
        if (typeof ta.select === 'function') ta.select();
        var ok = false;
        if (doc.execCommand) { try { ok = doc.execCommand('copy'); } catch (e) { ok = false; } }
        if (ta.remove) ta.remove();
        if (ok) resolve(); else reject(new Error('copy-failed'));
      } catch (e) { reject(e); }
    });
  }

  function copyLink(doc, loc, nav) {
    var data = getShareData(doc, loc);
    return copyText(data.url, nav, doc).then(function () {
      showToast(doc, 'Đã copy link bài viết — dán vào Zalo/Messenger để gửi.');
      return true;
    }).catch(function () {
      showToast(doc, 'Không copy được link tự động — link bài viết: ' + data.url);
      return false;
    });
  }

  // Nut "Chia se...": Web Share API > copy link. Huy bo (AbortError) thi im lang.
  function shareNative(doc, loc, nav) {
    var data = getShareData(doc, loc);
    nav = navOf(nav);
    if (nav && typeof nav.share === 'function') {
      try {
        var p = nav.share({ title: data.title, text: data.title, url: data.url });
        return Promise.resolve(p).then(function () { return 'shared'; }).catch(function (err) {
          if (err && (err.name === 'AbortError' || err.name === 'NotAllowedError')) return 'cancelled';
          return copyLink(doc, loc, nav).then(function () { return 'copied'; });
        });
      } catch (e) { /* roi xuong copy */ }
    }
    return copyLink(doc, loc, nav).then(function () { return 'copied'; });
  }

  // Nut "Zalo": copy link + toast (khong co endpoint share web cua Zalo
  // duoc xac minh — khong mo URL doan mo).
  function shareZalo(doc, loc, nav) {
    return copyLink(doc, loc, nav).then(function () { return 'copied'; });
  }

  function bindShareButtons(doc, loc, nav) {
    doc = docOf(doc); loc = locOf(loc); nav = navOf(nav);
    if (!doc || typeof doc.querySelectorAll !== 'function') return 0;
    var count = 0;
    var btns = doc.querySelectorAll('button[data-share="native"], button[data-share="zalo"]');
    for (var i = 0; i < btns.length; i++) {
      (function (btn) {
        if (!btn || typeof btn.addEventListener !== 'function') return;
        if (btn.getAttribute && btn.getAttribute('data-v2s-share-bound') === '1') return;
        if (btn.setAttribute) btn.setAttribute('data-v2s-share-bound', '1');
        var kind = btn.getAttribute ? btn.getAttribute('data-share') : '';
        btn.addEventListener('click', function (ev) {
          if (ev && ev.preventDefault) ev.preventDefault();
          if (kind === 'zalo') return shareZalo(doc, loc, nav);
          return shareNative(doc, loc, nav);
        });
        count++;
      })(btns[i]);
    }
    return count;
  }

  function init(doc, loc, nav) {
    doc = docOf(doc);
    if (!doc) return 0;
    if (doc.readyState === 'loading' && typeof doc.addEventListener === 'function') {
      doc.addEventListener('DOMContentLoaded', function () { bindShareButtons(doc, loc, nav); });
      return 0;
    }
    return bindShareButtons(doc, loc, nav);
  }

  init();
  window.V2SShare = {
    getShareData: getShareData, shareTitle: shareTitle, shareUrl: shareUrl,
    copyLink: copyLink, shareNative: shareNative, shareZalo: shareZalo,
    showToast: showToast, copyText: copyText,
    bindShareButtons: bindShareButtons, init: init
  };
})();
