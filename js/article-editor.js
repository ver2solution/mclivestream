/* Trình soạn thảo rich text cho tab "Viết bài" (console admin) — v122.
   Zero-dependency, chạy offline (không gọi CDN ngoài): dùng contenteditable
   + document.execCommand. Xuất HTML theo whitelist dùng chung với publisher
   (tools/publish-article-drafts.mjs) — chỉ các thẻ/attr an toàn mới được giữ.
   Nội dung lưu vào article_drafts.body DƯỚI DẠNG HTML đã sanitize (thay cho
   markup nhẹ '## '/'- '/'> ' trước đây). Publisher nhận cả 2 dạng:
   body markup cũ render như trước, body HTML đi qua sanitize + giữ nguyên
   định dạng. KHÔNG đổi schema bảng hay RPC (admin_submit_article giữ nguyên).
   Hàm thuần (markupToHtml, seoChecklist) không dùng DOM nên test được bằng
   Node qua vm; phần trình duyệt chỉ chạy khi có document. */
(function (root) {
  'use strict';

  /* ---------- Whitelist dùng chung với publisher (giữ đồng bộ 2 file) ---------- */
  var ALLOWED_TAGS = {
    p: ['style'], h2: ['style'], h3: ['style'], ul: [], ol: [], li: [],
    strong: [], b: [], em: [], i: [], u: [], s: [],
    a: ['href', 'title'], blockquote: [],
    img: ['src', 'alt', 'title', 'width', 'height', 'loading'],
    figure: [], figcaption: [],
    video: ['src', 'controls', 'preload', 'poster', 'width', 'height'],
    source: ['src', 'type'],
    iframe: ['src', 'allowfullscreen', 'frameborder', 'allow'],
    span: ['style'], br: [], hr: []
  };
  var VOID_TAGS = { br: 1, hr: 1, img: 1, source: 1 };
  var ALLOWED_STYLE_PROPS = ['text-align', 'color', 'background-color', 'font-family', 'font-size'];
  var NAMED_COLORS = ['black', 'white', 'red', 'green', 'blue', 'orange', 'gray', 'grey', 'darkgreen', 'darkred', 'navy', 'teal', 'purple', 'brown', 'yellow'];
  var ALLOWED_FONTS = ['be vietnam pro', 'arial', 'helvetica', 'times new roman', 'georgia', 'courier new', 'sans-serif', 'serif', 'monospace'];

  function isSafeColor(v) {
    v = String(v || '').trim().toLowerCase();
    if (/^#[0-9a-f]{3}$/.test(v) || /^#[0-9a-f]{6}$/.test(v) || /^#[0-9a-f]{8}$/.test(v)) return true;
    if (/^rgba?\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}\s*(,\s*(0|1|0?\.\d+)\s*)?\)$/.test(v)) return true;
    return NAMED_COLORS.indexOf(v) !== -1;
  }
  function isSafeFontSize(v) {
    v = String(v || '').trim().toLowerCase();
    var m = v.match(/^(\d+(?:\.\d+)?)(px|em|rem|%)$/);
    if (!m) return false;
    var n = parseFloat(m[1]);
    if (m[2] === 'px') return n >= 10 && n <= 36;
    if (m[2] === '%' ) return n >= 60 && n <= 220;
    return n >= 0.6 && n <= 2.4;
  }
  function isSafeFontFamily(v) {
    var parts = String(v || '').toLowerCase().split(',');
    if (!parts.length) return false;
    for (var i = 0; i < parts.length; i++) {
      var f = parts[i].trim().replace(/^['"]|['"]$/g, '');
      if (ALLOWED_FONTS.indexOf(f) === -1) return false;
    }
    return true;
  }
  function sanitizeStyle(styleStr) {
    var out = [];
    String(styleStr || '').split(';').forEach(function (decl) {
      var idx = decl.indexOf(':');
      if (idx < 0) return;
      var prop = decl.slice(0, idx).trim().toLowerCase();
      var val = decl.slice(idx + 1).trim();
      if (ALLOWED_STYLE_PROPS.indexOf(prop) === -1) return;
      if (prop === 'text-align' && ['left', 'center', 'right', 'justify'].indexOf(val.toLowerCase()) === -1) return;
      if ((prop === 'color' || prop === 'background-color') && !isSafeColor(val)) return;
      if (prop === 'font-family' && !isSafeFontFamily(val)) return;
      if (prop === 'font-size' && !isSafeFontSize(val)) return;
      out.push(prop + ':' + val);
    });
    return out.join(';');
  }
  function isSafeUrl(u, allowRelative) {
    u = String(u || '').trim();
    if (!u) return false;
    var low = u.replace(/^[\u0000-\u0020]+/, '').toLowerCase();
    if (/^(javascript|data|vbscript):/.test(low)) return false;
    if (/^https?:\/\//.test(low) || /^mailto:/.test(low)) return true;
    if (!allowRelative) return false;
    // Đường dẫn tương đối: /..., ./..., ../..., #..., hoặc tên file không scheme
    // (vd ../danh-sach-mau.html, images/x.jpg) — dùng cho link nội bộ trong bài.
    if (/^[#/?]/.test(u) || /^\.{1,2}\//.test(u)) return true;
    if (/^[a-z][a-z0-9+.-]*:/i.test(u)) return false; // scheme lạ thì chặn
    return true;
  }
  function isYouTubeEmbed(u) {
    return /^https:\/\/(www\.)?(youtube\.com\/embed\/|youtube-nocookie\.com\/embed\/)[A-Za-z0-9_-]+/.test(String(u || '').trim());
  }

  /* Sanitize HTML bằng DOMParser (chỉ chạy trong trình duyệt). Trả về HTML
     sạch theo whitelist; thẻ không cho phép bị gỡ nhưng giữ lại chữ bên
     trong (trừ script/style/iframe lạ thì gỡ cả nội dung). */
  function sanitizeHtml(html) {
    if (typeof document === 'undefined' || typeof DOMParser === 'undefined') return String(html || '');
    var doc = new DOMParser().parseFromString('<div>' + String(html || '') + '</div>', 'text/html');
    var body = doc.body;
    function clean(node) {
      var kids = Array.prototype.slice.call(node.childNodes);
      for (var i = 0; i < kids.length; i++) {
        var k = kids[i];
        if (k.nodeType === 8) { node.removeChild(k); continue; } // comment
        if (k.nodeType !== 1) continue; // text node: giữ
        var tag = k.tagName.toLowerCase();
        if (tag === 'script' || tag === 'style' || tag === 'link' || tag === 'meta' || tag === 'object' || tag === 'embed') {
          node.removeChild(k); continue;
        }
        if (tag === 'iframe' && !isYouTubeEmbed(k.getAttribute('src') || '')) { node.removeChild(k); continue; }
        if (!ALLOWED_TAGS.hasOwnProperty(tag)) {
          // Gỡ thẻ, giữ lại nội dung bên trong (đã clean đệ quy trước).
          clean(k);
          while (k.firstChild) node.insertBefore(k.firstChild, k);
          node.removeChild(k); continue;
        }
        clean(k);
        var allowed = ALLOWED_TAGS[tag];
        var attrs = Array.prototype.slice.call(k.attributes || []);
        for (var j = 0; j < attrs.length; j++) {
          var name = attrs[j].name.toLowerCase();
          if (allowed.indexOf(name) === -1 || name.indexOf('on') === 0) { k.removeAttribute(attrs[j].name); continue; }
          if (name === 'href' || name === 'src' || name === 'poster') {
            if (!isSafeUrl(k.getAttribute(name), true)) { k.removeAttribute(name); }
          }
          if (name === 'style') {
            var s = sanitizeStyle(k.getAttribute('style') || '');
            if (s) k.setAttribute('style', s); else k.removeAttribute('style');
          }
        }
        if (tag === 'a') { k.setAttribute('target', '_blank'); k.setAttribute('rel', 'noopener'); }
        if (tag === 'img' && !k.getAttribute('alt')) k.setAttribute('alt', '');
        if (tag === 'video' && !k.hasAttribute('controls')) k.setAttribute('controls', '');
      }
    }
    clean(body);
    // Gỡ thẻ p rỗng do contenteditable sinh ra (chỉ còn <br>).
    var html2 = body.innerHTML.replace(/<p>(<br\s*\/?>)?<\/p>/gi, '');
    return html2;
  }

  /* Chuyển markup nhẹ cũ ('## ', '- ', '> ', '**bold**') thành HTML cho editor. */
  function escText(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
  function inlineBoldHtml(s) {
    return escText(s).replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  }
  function markupToHtml(markup) {
    var lines = String(markup || '').replace(/\r\n/g, '\n').split('\n');
    var out = [], para = [], list = [];
    function flushPara() { if (para.length) { out.push('<p>' + para.map(inlineBoldHtml).join(' ') + '</p>'); para = []; } }
    function flushList() { if (list.length) { out.push('<ul><li>' + list.map(inlineBoldHtml).join('</li><li>') + '</li></ul>'); list = []; } }
    lines.forEach(function (raw) {
      var line = raw.trim();
      if (!line) { flushPara(); flushList(); return; }
      if (line.indexOf('## ') === 0) { flushPara(); flushList(); out.push('<h2>' + inlineBoldHtml(line.slice(3).trim()) + '</h2>'); return; }
      if (line.indexOf('- ') === 0) { flushPara(); list.push(line.slice(2).trim()); return; }
      if (line.indexOf('> ') === 0) { flushPara(); flushList(); out.push('<blockquote>' + inlineBoldHtml(line.slice(2).trim()) + '</blockquote>'); return; }
      if (list.length) flushList();
      para.push(line);
    });
    flushPara(); flushList();
    return out.join('\n');
  }
  function isMarkupBody(body) {
    var t = String(body || '').trim();
    if (!t) return true;
    if (t.charAt(0) === '<') return false;
    return /^(## |\- |> )/m.test(t) || t.indexOf('<') === -1;
  }
  function bodyToEditorHtml(body) {
    var t = String(body || '').trim();
    if (!t) return '';
    return isMarkupBody(t) ? markupToHtml(t) : sanitizeHtml(t);
  }

  /* ---------- Kiểm tra SEO live (thuần, không cần DOM) ---------- */
  function stripTags(html) {
    return String(html || '').replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
  }
  function wordCount(html) {
    var t = stripTags(html);
    return t ? t.split(/\s+/).length : 0;
  }
  function countOccurrences(text, kw) {
    if (!kw) return 0;
    var hay = String(text || '').toLowerCase();
    var needle = String(kw || '').toLowerCase().trim();
    if (!needle) return 0;
    var n = 0, i = 0;
    while ((i = hay.indexOf(needle, i)) !== -1) { n++; i += needle.length; }
    return n;
  }
  function seoChecklist(d, keyword) {
    var items = [];
    var title = String((d && d.title) || '').trim();
    var summary = String((d && d.summary) || '').trim();
    var slug = String((d && d.slug) || '').trim().toLowerCase();
    var body = String((d && d.body) || '');
    var kw = String(keyword || '').trim();
    var plain = stripTags(body);
    var words = wordCount(body);
    var kwInTitle = kw ? countOccurrences(title, kw) > 0 : null;
    var kwCount = kw ? countOccurrences(plain, kw) : 0;
    var density = words ? (kwCount / words * 100) : 0;
    var h2n = (body.match(/<h2[\s>]/gi) || []).length + (body.match(/^## /gm) || []).length;
    var imgTags = body.match(/<img[^>]*>/gi) || [];
    var hasVideo = /<video[\s>]/i.test(body) || /youtube(-nocookie)?\.com\/embed\//i.test(body);
    var internalLinks = (body.match(/href="(?:[^"]*\/)?(?:danh-sach-|tin-tuc|index\.html|bai-viet\/)/gi) || []).length;
    var altOk = false;
    if (kw) {
      var alts = [];
      imgTags.forEach(function (tag) { var m = tag.match(/alt="([^"]*)"/i); if (m) alts.push(m[1]); });
      if (String((d && d.image_alt) || '').toLowerCase().indexOf(kw.toLowerCase()) !== -1) altOk = true;
      if (alts.some(function (a) { return a.toLowerCase().indexOf(kw.toLowerCase()) !== -1; })) altOk = true;
    }
    items.push({ key: 'title-len', label: 'Tiêu đề 55–60 ký tự (đang ' + title.length + ')', ok: title.length >= 55 && title.length <= 60, warn: title.length > 0 && (title.length < 55 || title.length > 60) });
    items.push({ key: 'title-kw', label: kw ? 'Tiêu đề chứa từ khóa chính' : 'Chưa nhập từ khóa chính', ok: kwInTitle === true, warn: kwInTitle === false });
    items.push({ key: 'meta-len', label: 'Mô tả ngắn 150–160 ký tự (đang ' + summary.length + ')', ok: summary.length >= 150 && summary.length <= 160, warn: summary.length > 0 && (summary.length < 150 || summary.length > 160) });
    items.push({ key: 'slug-kw', label: kw ? 'Slug chứa từ khóa chính' : 'Slug chưa kiểm tra từ khóa', ok: kw ? slug.indexOf(kw.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')) !== -1 : false, warn: !!kw });
    items.push({ key: 'h2', label: 'Có tiêu đề mục H2 (đang ' + h2n + ')', ok: h2n >= 1, warn: h2n === 0 });
    items.push({ key: 'kw-density', label: kw ? ('Mật độ từ khóa 1–2% (đang ' + density.toFixed(1) + '%, ' + kwCount + ' lần / ' + words + ' từ)') : 'Chưa nhập từ khóa chính', ok: kw ? (density >= 1 && density <= 2) : false, warn: !!kw });
    items.push({ key: 'img', label: 'Có ảnh minh hoạ (' + imgTags.length + ' ảnh trong bài' + ((d && d.image_url) ? ' + ảnh đại diện' : '') + ')', ok: imgTags.length > 0 || !!(d && d.image_url), warn: imgTags.length === 0 && !(d && d.image_url) });
    items.push({ key: 'img-alt', label: kw ? 'Alt ảnh chứa từ khóa chính' : 'Alt ảnh chưa kiểm tra từ khóa', ok: altOk, warn: !!kw && !altOk });
    items.push({ key: 'video', label: 'Có video trong bài', ok: hasVideo, warn: !hasVideo });
    items.push({ key: 'links', label: 'Ít nhất 2 link nội bộ (đang ' + internalLinks + ')', ok: internalLinks >= 2, warn: internalLinks < 2 });
    return items;
  }

  /* ---------- Trình soạn thảo (chỉ chạy trong trình duyệt) ---------- */
  var FONTS = [
    { label: 'Mặc định (Be Vietnam Pro)', value: '"Be Vietnam Pro", Arial, sans-serif' },
    { label: 'Arial', value: 'Arial, Helvetica, sans-serif' },
    { label: 'Times New Roman', value: '"Times New Roman", Georgia, serif' },
    { label: 'Georgia', value: 'Georgia, serif' },
    { label: 'Courier New', value: '"Courier New", monospace' }
  ];
  var SIZES = ['14', '16', '18', '20', '24', '28', '32'];
  var TEXT_COLORS = ['#000000', '#333333', '#0b5d4e', '#b91c1c', '#1d4ed8', '#b45309'];
  var HIGHLIGHTS = ['#fef08a', '#bbf7d0', '#bfdbfe', '#fecaca', '#e9d5ff'];

  var ed = null; // { editorEl, textareaEl, toolbarEl, seoEl, keywordEl }

  function exec(cmd, val) {
    try {
      var editorEl = ed && ed.editorEl;
      if (editorEl) editorEl.focus();
      document.execCommand('styleWithCSS', false, true);
      document.execCommand(cmd, false, val == null ? null : val);
      syncToTextarea();
    } catch (e) { /* lệnh không hỗ trợ trên trình duyệt này thì bỏ qua */ }
  }
  function syncToTextarea() {
    if (!ed || !ed.editorEl || !ed.textareaEl) return;
    var clean = sanitizeHtml(ed.editorEl.innerHTML);
    ed.textareaEl.value = clean;
    if (typeof ed.onChange === 'function') { try { ed.onChange(clean); } catch (e) {} }
  }
  function getHtml() {
    if (!ed || !ed.editorEl) return '';
    return sanitizeHtml(ed.editorEl.innerHTML);
  }
  function setHtml(html) {
    if (!ed || !ed.editorEl) return;
    ed.editorEl.innerHTML = sanitizeHtml(html || '');
    syncToTextarea();
  }
  function setFromBody(body) {
    setHtml(bodyToEditorHtml(body || ''));
  }
  function insertHtmlAtCursor(html) {
    try {
      var editorEl = ed && ed.editorEl;
      if (editorEl) editorEl.focus();
      document.execCommand('styleWithCSS', false, true);
      document.execCommand('insertHTML', false, sanitizeHtml(html));
      syncToTextarea();
    } catch (e) { /* fallback: chèn cuối bài */ if (ed && ed.editorEl) { ed.editorEl.innerHTML += sanitizeHtml(html); syncToTextarea(); } }
  }
  function insertImage(url, alt) {
    var a = String(alt || '').trim();
    var fig = a
      ? '<figure><img src="' + url.replace(/"/g, '') + '" alt="' + a.replace(/"/g, '&quot;') + '" loading="lazy"><figcaption>' + a.replace(/</g, '&lt;') + '</figcaption></figure>'
      : '<img src="' + url.replace(/"/g, '') + '" alt="" loading="lazy">';
    insertHtmlAtCursor(fig + '<p></p>');
  }
  function insertVideoUrl(url) {
    var u = String(url || '').trim();
    var m = u.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{6,})/);
    if (m) {
      insertHtmlAtCursor('<p><iframe src="https://www.youtube-nocookie.com/embed/' + m[1] + '" allowfullscreen frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"></iframe></p>');
      return true;
    }
    if (/^https?:\/\/.*\.(mp4|webm|mov)(\?.*)?$/i.test(u)) {
      insertHtmlAtCursor('<p><video controls preload="metadata" src="' + u.replace(/"/g, '') + '"></video></p>');
      return true;
    }
    return false;
  }
  function applyColor(kind, color) {
    if (kind === 'text') exec('foreColor', color);
    else exec('hiliteColor', color);
  }
  function bindToolbar() {
    if (!ed || !ed.toolbarEl) return;
    ed.toolbarEl.addEventListener('click', function (e) {
      var btn = e.target && e.target.closest ? e.target.closest('[data-ed-cmd]') : null;
      if (!btn) return;
      var cmd = btn.getAttribute('data-ed-cmd');
      var val = btn.getAttribute('data-ed-val');
      if (cmd === 'fontName' || cmd === 'fontSize') { exec(cmd, val); return; }
      if (cmd === 'foreColor' || cmd === 'hiliteColor') { applyColor(cmd === 'foreColor' ? 'text' : 'hl', val); return; }
      if (cmd === 'createLink') {
        var url = window.prompt('Dán link (http(s) hoặc đường dẫn nội bộ):', 'https://');
        if (url === null) return;
        url = String(url || '').trim();
        if (!url) return;
        if (!isSafeUrl(url, true)) { alert('Link không hợp lệ.'); return; }
        exec('createLink', url);
        return;
      }
      if (cmd === 'insertImage') { if (typeof window.V2SArticleMedia !== 'undefined' && window.V2SArticleMedia.openPicker) window.V2SArticleMedia.openPicker('image'); return; }
      if (cmd === 'insertVideo') { if (typeof window.V2SArticleMedia !== 'undefined' && window.V2SArticleMedia.openPicker) window.V2SArticleMedia.openPicker('video'); return; }
      if (cmd === 'formatBlock') { exec('formatBlock', val); return; }
      exec(cmd, val);
    });
    // Select font/size đổi bằng change (không phải click).
    ed.toolbarEl.addEventListener('change', function (e) {
      var sel = e.target && e.target.closest ? e.target.closest('[data-ed-select]') : null;
      if (!sel) return;
      var cmd = sel.getAttribute('data-ed-select');
      exec(cmd, sel.value);
    });
  }
  function bindPaste() {
    if (!ed || !ed.editorEl) return;
    ed.editorEl.addEventListener('paste', function (e) {
      try {
        e.preventDefault();
        var html = (e.clipboardData || window.clipboardData).getData('text/html');
        var text = (e.clipboardData || window.clipboardData).getData('text/plain');
        if (html) { insertHtmlAtCursor(sanitizeHtml(html)); }
        else if (text) {
          var paras = String(text).split(/\n{2,}/).map(function (p) { return '<p>' + escText(p).replace(/\n/g, '<br>') + '</p>'; }).join('');
          insertHtmlAtCursor(paras);
        }
      } catch (err) { /* để trình duyệt dán mặc định nếu chặn thất bại */ }
    });
    ed.editorEl.addEventListener('input', function () { syncToTextarea(); });
    ed.editorEl.addEventListener('keyup', function () { syncToTextarea(); });
  }
  function init(config) {
    if (typeof document === 'undefined') return false;
    var $ = function (id) { return document.getElementById(id); };
    ed = {
      editorEl: (config && config.editorEl) || $('admArtBodyEditor'),
      textareaEl: (config && config.textareaEl) || $('admArtBody'),
      toolbarEl: (config && config.toolbarEl) || $('admArtToolbar'),
      seoEl: (config && config.seoEl) || $('admArtSeo'),
      keywordEl: (config && config.keywordEl) || $('admArtKeyword'),
      onChange: (config && config.onChange) || null
    };
    if (!ed.editorEl || !ed.textareaEl) return false;
    bindToolbar();
    bindPaste();
    // Nạp lại nội dung đã có trong textarea (bản thảo cũ đang mở).
    if (ed.textareaEl.value) setFromBody(ed.textareaEl.value);
    syncToTextarea();
    return true;
  }

  var API = {
    ALLOWED_TAGS: ALLOWED_TAGS,
    sanitizeHtml: sanitizeHtml, sanitizeStyle: sanitizeStyle,
    markupToHtml: markupToHtml, bodyToEditorHtml: bodyToEditorHtml, isMarkupBody: isMarkupBody,
    stripTags: stripTags, wordCount: wordCount, seoChecklist: seoChecklist,
    FONTS: FONTS, SIZES: SIZES, TEXT_COLORS: TEXT_COLORS, HIGHLIGHTS: HIGHLIGHTS,
    init: init, getHtml: getHtml, setHtml: setHtml, setFromBody: setFromBody,
    syncToTextarea: syncToTextarea, insertHtmlAtCursor: insertHtmlAtCursor,
    insertImage: insertImage, insertVideoUrl: insertVideoUrl, exec: exec
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  root.V2SArticleEditor = API;
})(typeof window !== 'undefined' ? window : this);
