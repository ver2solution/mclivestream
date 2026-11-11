/* Kho lưu trữ media RIÊNG cho bài viết (tab "Viết bài", console admin) — v122.
   Nơi lưu: Supabase Storage bucket 'article-media' (public, riêng biệt với
   bucket 'profile-media' của hồ sơ). Lý do chọn Storage thay vì thư mục repo
   images/bai-viet/: upload trực tiếp từ console admin, file có URL công khai
   ngay, bài viết tham chiếu URL đó — không cần chờ deploy repo để ảnh/video
   lên live; ảnh đại diện http(s) đã được publisher + og:image hỗ trợ sẵn.
   Cần chạy file supabase-migration-article-media-storage.sql 1 lần (tạo
   bucket + policy) trước khi dùng live — chưa chạy thì upload báo lỗi rõ.
   Giới hạn: ảnh jpg/jpeg/png/webp/gif/svg ≤ 5 MB; video mp4/webm/mov ≤ 50 MB.
   Không mật khẩu/token trong file này — dùng phiên đăng nhập admin hiện tại. */
(function (root) {
  'use strict';

  var BUCKET = 'article-media';
  var IMG_EXTS = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'svg'];
  var IMG_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml'];
  var VID_EXTS = ['mp4', 'webm', 'mov'];
  var VID_TYPES = ['video/mp4', 'video/webm', 'video/quicktime'];
  var MAX_IMG_BYTES = 5 * 1024 * 1024;
  var MAX_VID_BYTES = 50 * 1024 * 1024;
  var PAGE_SIZE = 24;

  function api() {
    return (typeof window !== 'undefined' && window.McLivestreamAPI) ? window.McLivestreamAPI : null;
  }
  function storage() {
    var a = api();
    if (!a || !a.client || !a.client.storage) throw new Error('Chưa kết nối Supabase (thiếu McLivestreamAPI).');
    return a.client.storage.from(BUCKET);
  }
  function newUuid() {
    try {
      if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
    } catch (e) {}
    return 'u' + Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
  }
  function extOf(name) {
    return String(name || '').split('.').pop().toLowerCase();
  }
  function fmtSize(n) {
    n = Number(n || 0);
    if (n >= 1024 * 1024) return (n / 1024 / 1024).toFixed(1) + ' MB';
    if (n >= 1024) return Math.round(n / 1024) + ' KB';
    return n + ' B';
  }
  function publicUrl(path) {
    var a = api();
    if (!a || !a.client || !a.client.storage) return '';
    return a.client.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
  }
  function checkFile(file, kind) {
    if (!file) throw new Error('Chưa chọn file.');
    var ext = extOf(file.name);
    if (kind === 'image') {
      if (IMG_EXTS.indexOf(ext) === -1) throw new Error('Ảnh chỉ nhận: ' + IMG_EXTS.join(', ') + '.');
      if (file.type && IMG_TYPES.indexOf(file.type) === -1) throw new Error('Định dạng ảnh chưa được hỗ trợ.');
      if (file.size > MAX_IMG_BYTES) throw new Error('Ảnh quá lớn, tối đa 5 MB.');
    } else {
      if (VID_EXTS.indexOf(ext) === -1) throw new Error('Video chỉ nhận: ' + VID_EXTS.join(', ') + '.');
      if (file.type && VID_TYPES.indexOf(file.type) === -1) throw new Error('Định dạng video chưa được hỗ trợ.');
      if (file.size > MAX_VID_BYTES) throw new Error('Video quá lớn, tối đa 50 MB.');
    }
  }
  async function requireSession() {
    var a = api();
    if (!a || typeof a.getSession !== 'function') throw new Error('Cần đăng nhập admin mới tải media lên được.');
    var s = await a.getSession();
    if (!s) throw new Error('Cần đăng nhập admin mới tải media lên được.');
    return s;
  }
  async function uploadArticleMedia(file, kind) {
    kind = kind === 'video' ? 'video' : 'image';
    checkFile(file, kind);
    await requireSession();
    var folder = kind === 'video' ? 'articles/videos' : 'articles';
    var path = folder + '/' + newUuid() + '.' + extOf(file.name);
    var up = await storage().upload(path, file, { cacheControl: '3600', upsert: false });
    if (up.error) throw up.error;
    return { path: path, url: publicUrl(path), name: file.name, kind: kind, size: file.size };
  }
  async function listArticleMedia(opts) {
    opts = opts || {};
    var search = String(opts.search || '').trim();
    var page = Math.max(0, parseInt(opts.page || 0, 10) || 0);
    var kind = opts.kind || 'all';
    var out = [];
    var folders = kind === 'video' ? ['articles/videos'] : kind === 'image' ? ['articles'] : ['articles', 'articles/videos'];
    for (var f = 0; f < folders.length; f++) {
      var res = await storage().list(folders[f], { limit: 100, offset: 0, sortBy: { column: 'created_at', order: 'desc' } });
      if (res.error) throw res.error;
      (res.data || []).forEach(function (it) {
        if (!it || !it.name || it.name === '.emptyFolderPlaceholder') return;
        var p = folders[f] + '/' + it.name;
        var k = folders[f].indexOf('/videos') !== -1 || VID_EXTS.indexOf(extOf(it.name)) !== -1 ? 'video' : 'image';
        out.push({ path: p, name: it.name, kind: k, size: it.metadata && it.metadata.size, updated_at: it.updated_at, url: publicUrl(p) });
      });
    }
    if (search) {
      var s = search.toLowerCase();
      out = out.filter(function (it) { return String(it.name || '').toLowerCase().indexOf(s) !== -1 || String(it.path || '').toLowerCase().indexOf(s) !== -1; });
    }
    out.sort(function (a, b) { return String(b.updated_at || '').localeCompare(String(a.updated_at || '')); });
    var total = out.length;
    var slice = out.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);
    return { items: slice, total: total, page: page, hasMore: (page + 1) * PAGE_SIZE < total };
  }
  async function deleteArticleMedia(path) {
    await requireSession();
    var res = await storage().remove([String(path)]);
    if (res.error) throw res.error;
    return true;
  }

  /* ---------- Giao diện kho media trong tab Viết bài ---------- */
  var ui = null; // { gridEl, msgEl, searchEl, filterEl, countEl }
  var state = { kind: 'all', search: '', page: 0, items: [] };
  function esc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function escAttr(s) { return esc(s).replace(/\n/g, ' '); }
  function setMsg(t, isErr) {
    if (!ui || !ui.msgEl) return;
    ui.msgEl.textContent = t || '';
    ui.msgEl.style.color = isErr ? '#b91c1c' : '#0b5d4e';
  }
  function renderGrid(list) {
    if (!ui || !ui.gridEl) return;
    if (!list || !list.length) {
      ui.gridEl.innerHTML = '<p style="color:#666">Chưa có file nào trong kho media. Tải ảnh/video lên để dùng cho bài viết.</p>';
      return;
    }
    var html = list.map(function (it) {
      var thumb = it.kind === 'image'
        ? '<img src="' + escAttr(it.url) + '" alt="" loading="lazy" style="width:100%;height:90px;object-fit:cover;border-radius:8px">'
        : '<div style="width:100%;height:90px;border-radius:8px;background:#0b5d4e;color:#fff;display:flex;align-items:center;justify-content:center;font-size:28px">▶</div>';
      return '<div class="art-media-item" data-path="' + escAttr(it.path) + '" style="border:1px solid #ddd;border-radius:10px;padding:8px">'
        + thumb
        + '<p style="margin:6px 0 2px;font-size:12px;word-break:break-all" title="' + escAttr(it.path) + '">' + esc(it.name) + '</p>'
        + '<p style="margin:0 0 6px;font-size:12px;color:#666">' + (it.kind === 'image' ? 'Ảnh' : 'Video') + ' · ' + fmtSize(it.size) + '</p>'
        + '<p style="margin:0;display:flex;flex-wrap:wrap;gap:4px">'
        + '<button type="button" class="btn btn-ghost btn-sm" data-media-act="insert">Chèn vào bài</button>'
        + (it.kind === 'image' ? '<button type="button" class="btn btn-ghost btn-sm" data-media-act="cover">Đặt làm ảnh đại diện</button>' : '')
        + '<button type="button" class="btn btn-ghost btn-sm" data-media-act="copy">Copy link</button>'
        + '<button type="button" class="btn btn-ghost btn-sm" data-media-act="delete">Xóa</button>'
        + '</p></div>';
    }).join('');
    ui.gridEl.innerHTML = '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:10px">' + html + '</div>';
    if (ui.countEl) ui.countEl.textContent = 'Tổng ' + state.total + ' file trong kho.';
  }
  async function refreshGrid() {
    if (!ui || !ui.gridEl) return;
    ui.gridEl.innerHTML = '<p>Đang tải kho media…</p>';
    try {
      var res = await listArticleMedia({ kind: state.kind, search: state.search, page: state.page });
      state.items = res.items;
      state.total = res.total;
      state.hasMore = res.hasMore;
      renderGrid(res.items);
      if (ui.moreEl) ui.moreEl.hidden = !res.hasMore;
      setMsg('');
    } catch (e) {
      var m = String((e && (e.message || e)) || '');
      if (/not found|bucket/i.test(m)) setMsg('Chưa có bucket article-media — cần chạy file supabase-migration-article-media-storage.sql 1 lần trước khi dùng kho media.', true);
      else setMsg('Không tải được kho media: ' + m, true);
      ui.gridEl.innerHTML = '';
    }
  }
  function findItem(path) {
    return (state.items || []).filter(function (x) { return x.path === path; })[0] || null;
  }
  function askAlt(defVal) {
    try {
      var v = window.prompt('Alt text cho ảnh (nên chứa từ khóa chính để tốt SEO):', defVal || '');
      if (v === null) return null;
      return String(v || '').trim();
    } catch (e) { return defVal || ''; }
  }
  async function onGridClick(e) {
    var btn = e.target && e.target.closest ? e.target.closest('[data-media-act]') : null;
    if (!btn) return;
    var itemEl = btn.closest ? btn.closest('.art-media-item') : null;
    if (!itemEl) return;
    var path = itemEl.getAttribute('data-path');
    var it = findItem(path);
    if (!it) return;
    var act = btn.getAttribute('data-media-act');
    try {
      if (act === 'insert') {
        var ed = root.V2SArticleEditor;
        if (!ed) { setMsg('Trình soạn thảo chưa sẵn sàng.', true); return; }
        if (it.kind === 'image') {
          var alt = askAlt('');
          if (alt === null) return;
          ed.insertImage(it.url, alt);
          setMsg('Đã chèn ảnh vào bài.');
        } else {
          ed.insertVideoUrl(it.url);
          setMsg('Đã chèn video vào bài.');
        }
      } else if (act === 'cover') {
        var titleEl = document.getElementById('admArtTitle');
        var imgEl = document.getElementById('admArtImg');
        var altEl = document.getElementById('admArtImgAlt');
        var kwEl = document.getElementById('admArtKeyword');
        if (imgEl) imgEl.value = it.url;
        if (altEl && !String(altEl.value || '').trim()) altEl.value = (titleEl && titleEl.value) ? String(titleEl.value).trim() : (kwEl && kwEl.value ? String(kwEl.value).trim() : '');
        setMsg('Đã đặt làm ảnh đại diện.');
        if (imgEl) imgEl.focus();
      } else if (act === 'copy') {
        try { await navigator.clipboard.writeText(it.url); setMsg('Đã copy link.'); }
        catch (err) { window.prompt('Copy link:', it.url); }
      } else if (act === 'delete') {
        if (!window.confirm('Xóa file này khỏi kho media? Bài đã chèn link này sẽ hỏng ảnh/video.')) return;
        await deleteArticleMedia(it.path);
        setMsg('Đã xóa file.');
        await refreshGrid();
      }
    } catch (err) {
      setMsg('Lỗi: ' + String((err && (err.message || err)) || ''), true);
    }
  }
  function openPicker(kind) {
    var sec = document.getElementById('admArtMedia');
    if (sec) sec.scrollIntoView({ behavior: 'smooth', block: 'start' });
    if (kind && ui && ui.filterEl) {
      state.kind = kind === 'video' ? 'video' : kind === 'image' ? 'image' : 'all';
      ui.filterEl.value = state.kind;
      state.page = 0;
      refreshGrid();
    }
  }
  function init(config) {
    if (typeof document === 'undefined') return false;
    var $ = function (id) { return document.getElementById(id); };
    ui = {
      gridEl: (config && config.gridEl) || $('admArtMediaGrid'),
      msgEl: (config && config.msgEl) || $('admArtMediaMsg'),
      searchEl: (config && config.searchEl) || $('admArtMediaSearch'),
      filterEl: (config && config.filterEl) || $('admArtMediaFilter'),
      countEl: (config && config.countEl) || $('admArtMediaCount'),
      moreEl: (config && config.moreEl) || $('admArtMediaMore'),
      uploadEl: (config && config.uploadEl) || $('admArtMediaUpload'),
      ytEl: (config && config.ytEl) || $('admArtMediaYt'),
      ytBtn: (config && config.ytBtn) || $('admArtMediaYtBtn'),
      refreshBtn: (config && config.refreshBtn) || $('admArtMediaRefresh')
    };
    if (!ui.gridEl) return false;
    if (ui.uploadEl) ui.uploadEl.addEventListener('change', async function () {
      var files = Array.prototype.slice.call(ui.uploadEl.files || []);
      if (!files.length) return;
      setMsg('Đang tải lên ' + files.length + ' file…');
      var ok = 0, errs = [];
      for (var i = 0; i < files.length; i++) {
        var f = files[i];
        var kind = VID_EXTS.indexOf(extOf(f.name)) !== -1 ? 'video' : 'image';
        try { await uploadArticleMedia(f, kind); ok++; }
        catch (err) { errs.push(f.name + ': ' + String((err && (err.message || err)) || '')); }
      }
      ui.uploadEl.value = '';
      setMsg(ok ? ('Đã tải lên ' + ok + ' file.' + (errs.length ? ' Lỗi: ' + errs.join(' ') : '')) : ('Tải lên thất bại: ' + errs.join(' ')), ok === 0);
      await refreshGrid();
    });
    if (ui.searchEl) ui.searchEl.addEventListener('input', function () {
      state.search = String(ui.searchEl.value || '').trim();
      state.page = 0;
      refreshGrid();
    });
    if (ui.filterEl) ui.filterEl.addEventListener('change', function () {
      state.kind = ui.filterEl.value || 'all';
      state.page = 0;
      refreshGrid();
    });
    if (ui.moreEl) ui.moreEl.addEventListener('click', async function () {
      state.page += 1;
      var res = await listArticleMedia({ kind: state.kind, search: state.search, page: state.page });
      state.items = state.items.concat(res.items);
      state.hasMore = res.hasMore;
      renderGrid(state.items);
      ui.moreEl.hidden = !res.hasMore;
    });
    if (ui.refreshBtn) ui.refreshBtn.addEventListener('click', function () { state.page = 0; refreshGrid(); });
    if (ui.ytBtn && ui.ytEl) ui.ytBtn.addEventListener('click', function () {
      var ed = root.V2SArticleEditor;
      var url = String(ui.ytEl.value || '').trim();
      if (!ed) { setMsg('Trình soạn thảo chưa sẵn sàng.', true); return; }
      if (!url) { setMsg('Dán link YouTube trước.', true); return; }
      if (ed.insertVideoUrl(url)) { setMsg('Đã chèn video YouTube vào bài.'); ui.ytEl.value = ''; }
      else setMsg('Link YouTube không hợp lệ (cần link youtube.com/watch?v=... hoặc youtu.be/...).', true);
    });
    ui.gridEl.addEventListener('click', onGridClick);
    refreshGrid();
    return true;
  }

  var API = {
    BUCKET: BUCKET, PAGE_SIZE: PAGE_SIZE,
    MAX_IMG_BYTES: MAX_IMG_BYTES, MAX_VID_BYTES: MAX_VID_BYTES,
    uploadArticleMedia: uploadArticleMedia, listArticleMedia: listArticleMedia,
    deleteArticleMedia: deleteArticleMedia, publicUrl: publicUrl, fmtSize: fmtSize,
    init: init, refreshGrid: refreshGrid, openPicker: openPicker
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  root.V2SArticleMedia = API;
})(typeof window !== 'undefined' ? window : this);
