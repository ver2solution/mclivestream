#!/usr/bin/env node
/* Publisher bài viết Tin tức — chuyển bản thảo (article_drafts) thành file web.
   Cơ chế (đặc tả admin-owner-partner-spec-2026-11-09.md §7 + migration GĐ4):
     1. Admin (vd Muse Zalo) viết bài trong console (tab "Viết bài") →
        RPC admin_submit_article lưu bản thảo vào Supabase (status 'ready').
     2. Script này đọc bản thảo (file JSON — tải từ nút "Tải JSON" trong
        console, hoặc xuất từ Supabase) → sinh:
          - bai-viet/<slug>.html (mẫu chuẩn SEO, theo file bai-viet mẫu)
          - 1 mục mới trong js/data.js (mảng articles)
          - 1 URL mới trong sitemap.xml
     3. Đi cùng deploy sau (v117). Sau khi deploy xong, gọi RPC
        admin_mark_article_published để đánh dấu đã đăng (tránh đăng trùng).
   Cách dùng:
     node tools/publish-article-drafts.mjs --draft <draft.json> [--root <prep-dir>] [--dry-run] [--force] [--strict] [--rejections-out <file.json>]
   - --draft: 1 file JSON bản thảo (1 object) hoặc 1 mảng các bản thảo.
   - --root:  thư mục gốc của prep (mặc định: thư mục cha của tools/).
   - --dry-run: chỉ in ra những gì sẽ làm, không ghi file.
   - --force: ghi đè file bai-viet/<slug>.html và mục data.js đã có (mặc
     định: từ chối nếu slug đã tồn tại — tránh đăng trùng).
   - --strict: biến cảnh báo SEO thành lỗi chặn (dùng khi kiểm tra tay).
   - --rejections-out <file.json> (GĐ4b, pipeline tự động): thay vì dừng
     ngay ở bản thảo lỗi đầu tiên, ghi lý do từ chối SEO của TỪNG bản
     thảo lỗi vào file JSON này (dạng [{id, slug, title, reason, at}])
     rồi đăng tiếp các bản thảo khác. File được GHI THÊM (append) nếu
     đã có — cron gọi script nhiều lần trong 1 lượt vẫn gom đủ lý do.
     Cron đọc file này rồi gọi RPC admin_set_article_rejection để hiện
     lý do trong console cho tác giả tự sửa. Chế độ này vẫn dừng (exit 1)
     khi KHÔNG có bài nào được đăng.
   Đăng lại bản đã đăng (GĐ4b): bản thảo có trường "page" (bai-viet/
   <slug>.html — tức bài đã đăng, tác giả sửa xong quay về 'ready') được
   coi là BẢN ĐĂNG LẠI: cổng SEO bỏ qua trùng tiêu đề/slug của chính
   bài đó, file HTML được ghi đè, mục data.js cũ (cùng page) được THAY
   THẾ (không tạo trùng), URL sitemap cũ được thay thế. Bản thảo mới
   (page rỗng) trùng slug/page với bài đã có vẫn bị từ chối như cũ.
   Cổng SEO (Bước 5, he-thong-viet-bai-seo-100-tu-khoa.md): trước khi đăng,
   checkSeo() chặn bản thảo thiếu title/meta/ảnh/H1 hoặc trùng tiêu đề/
   slug; cảnh báo khi title chưa 55–60 ký tự, meta chưa 150–160 ký tự,
   thiếu H2, có số liệu nhưng không có nguồn, từ khóa tiêu đề ít xuất
   hiện trong nội dung. Bài lỗi SEO không lên live — ghi log để sửa.
   Không có service_role key, không mật khẩu, không gọi mạng trong script
   này (chỉ đọc file JSON local + ghi file trong prep). */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const BASE_URL = 'https://vieclamlivestream.online'; // v118: doi sang domain rieng
const ARTICLE_CATS = ['Công nghệ', 'Livestream', 'Phân tích', 'Xu hướng', 'Dòng tiền', 'Thị trường', 'Hàng hoá', 'Đang hot', 'Đời Sống', 'Việc Làm'];

function fail(msg) { console.error('LỖI: ' + msg); process.exit(1); }
function esc(s) {
  return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
function escAttr(s) { return esc(s).replace(/\n/g, ' '); }
function slugOk(s) { return typeof s === 'string' && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(s) && s.length <= 100; }
function isHttpUrl(s) { return typeof s === 'string' && /^https?:\/\//.test(s); }

// ---------- Sanitize HTML cho body dạng HTML (v122, editor rich text) ----------
// Whitelist DÙNG CHUNG với js/article-editor.js (giữ đồng bộ 2 file).
// Chỉ cho phép các thẻ/attr an toàn; thẻ lạ bị gỡ nhưng giữ chữ bên trong
// (trừ script/style/iframe lạ thì gỡ cả nội dung). Không dùng DOM trong Node.
const ARTICLE_ALLOWED_TAGS = {
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
const ARTICLE_VOID_TAGS = { br: 1, hr: 1, img: 1, source: 1 };
const ARTICLE_STYLE_PROPS = ['text-align', 'color', 'background-color', 'font-family', 'font-size'];
const ARTICLE_NAMED_COLORS = ['black', 'white', 'red', 'green', 'blue', 'orange', 'gray', 'grey', 'darkgreen', 'darkred', 'navy', 'teal', 'purple', 'brown', 'yellow'];
const ARTICLE_FONTS = ['be vietnam pro', 'arial', 'helvetica', 'times new roman', 'georgia', 'courier new', 'sans-serif', 'serif', 'monospace'];
function articleSafeColor(v) {
  v = String(v || '').trim().toLowerCase();
  if (/^#[0-9a-f]{3}$/.test(v) || /^#[0-9a-f]{6}$/.test(v) || /^#[0-9a-f]{8}$/.test(v)) return true;
  if (/^rgba?\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}\s*(,\s*(0|1|0?\.\d+)\s*)?\)$/.test(v)) return true;
  return ARTICLE_NAMED_COLORS.indexOf(v) !== -1;
}
function articleSafeFontSize(v) {
  v = String(v || '').trim().toLowerCase();
  const m = v.match(/^(\d+(?:\.\d+)?)(px|em|rem|%)$/);
  if (!m) return false;
  const n = parseFloat(m[1]);
  if (m[2] === 'px') return n >= 10 && n <= 36;
  if (m[2] === '%') return n >= 60 && n <= 220;
  return n >= 0.6 && n <= 2.4;
}
function articleSafeFontFamily(v) {
  const parts = String(v || '').toLowerCase().split(',');
  if (!parts.length) return false;
  for (const p of parts) {
    const f = p.trim().replace(/^['"]|['"]$/g, '');
    if (ARTICLE_FONTS.indexOf(f) === -1) return false;
  }
  return true;
}
function articleSanitizeStyle(styleStr) {
  const out = [];
  String(styleStr || '').split(';').forEach((decl) => {
    const idx = decl.indexOf(':');
    if (idx < 0) return;
    const prop = decl.slice(0, idx).trim().toLowerCase();
    const val = decl.slice(idx + 1).trim();
    if (ARTICLE_STYLE_PROPS.indexOf(prop) === -1) return;
    if (prop === 'text-align' && ['left', 'center', 'right', 'justify'].indexOf(val.toLowerCase()) === -1) return;
    if ((prop === 'color' || prop === 'background-color') && !articleSafeColor(val)) return;
    if (prop === 'font-family' && !articleSafeFontFamily(val)) return;
    if (prop === 'font-size' && !articleSafeFontSize(val)) return;
    out.push(prop + ':' + val);
  });
  return out.join(';');
}
function articleSafeUrl(u, allowRelative) {
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
function articleIsYouTubeEmbed(u) {
  return /^https:\/\/(www\.)?(youtube\.com\/embed\/|youtube-nocookie\.com\/embed\/)[A-Za-z0-9_-]+/.test(String(u || '').trim());
}
export function sanitizeArticleHtml(html) {
  const src = String(html || '');
  const DROP_CONTENT = { script: 1, style: 1, link: 1, meta: 1, object: 1, embed: 1 };
  let out = '';
  const stack = [];
  let dropDepth = 0; // >0: đang ở trong thẻ phải gỡ cả nội dung
  let i = 0;
  const tagRe = /^<\/?([a-zA-Z][a-zA-Z0-9]*)\b([^>]*)>/;
  const attrRe = /([a-zA-Z-]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;
  while (i < src.length) {
    if (src[i] === '<') {
      // Comment / doctype: bỏ qua.
      if (src.startsWith('<!--', i)) {
        const end = src.indexOf('-->', i + 4);
        i = end === -1 ? src.length : end + 3;
        continue;
      }
      const m = src.slice(i).match(tagRe);
      if (!m) { if (dropDepth === 0) out += '&lt;'; i++; continue; }
      const raw = m[0];
      const closing = raw[1] === '/';
      const tag = m[1].toLowerCase();
      const attrStr = m[2] || '';
      i += raw.length;
      if (dropDepth > 0) {
        if (!closing && DROP_CONTENT[tag]) dropDepth++;
        if (closing && DROP_CONTENT[tag]) dropDepth--;
        // Đóng iframe lạ đang bỏ qua: hạ dropDepth, gỡ marker khỏi stack.
        if (closing && tag === 'iframe' && stack.length && stack[stack.length - 1] === '__iframe_skip__') { stack.pop(); dropDepth = 0; }
        continue;
      }
      if (!closing && DROP_CONTENT[tag]) { dropDepth = 1; continue; }
      if (tag === 'iframe' && !closing) {
        let srcAttr = '';
        let am;
        while ((am = attrRe.exec(attrStr)) !== null) { if (am[1].toLowerCase() === 'src') srcAttr = am[2] != null ? am[2] : (am[3] != null ? am[3] : (am[4] || '')); }
        attrRe.lastIndex = 0;
        if (!articleIsYouTubeEmbed(srcAttr)) { dropDepth = 1; stack.push('__iframe_skip__'); continue; }
      }
      if (!ARTICLE_ALLOWED_TAGS.hasOwnProperty(tag)) continue; // gỡ thẻ, giữ nội dung
      if (closing) {
        if (ARTICLE_VOID_TAGS[tag]) continue;
        // Đóng thẻ gần nhất cùng tên trong stack.
        let idx = -1;
        for (let s = stack.length - 1; s >= 0; s--) { if (stack[s] === tag) { idx = s; break; } }
        if (idx === -1) continue;
        while (stack.length > idx) { const t = stack.pop(); if (t === '__iframe_skip__') { dropDepth = 0; continue; } out += '</' + t + '>'; }
        continue;
      }
      // Thẻ mở: lọc attr theo whitelist.
      const allowed = ARTICLE_ALLOWED_TAGS[tag];
      let attrs = '';
      let am2;
      while ((am2 = attrRe.exec(attrStr)) !== null) {
        const name = am2[1].toLowerCase();
        const val = am2[2] != null ? am2[2] : (am2[3] != null ? am2[3] : (am2[4] || ''));
        if (allowed.indexOf(name) === -1 || name.indexOf('on') === 0) continue;
        if (name === 'href' || name === 'src' || name === 'poster') {
          if (!articleSafeUrl(val, true)) continue;
        }
        if (name === 'style') {
          const s = articleSanitizeStyle(val);
          if (!s) continue;
          attrs += ' style="' + escAttr(s) + '"';
          continue;
        }
        attrs += ' ' + name + '="' + escAttr(val) + '"';
      }
      attrRe.lastIndex = 0;
      if (tag === 'a') {
        if (attrs.indexOf(' target=') === -1) attrs += ' target="_blank"';
        if (attrs.indexOf(' rel=') === -1) attrs += ' rel="noopener"';
      }
      if (tag === 'img' && attrs.indexOf(' alt=') === -1) attrs += ' alt=""';
      if (tag === 'video' && attrs.indexOf(' controls') === -1) attrs += ' controls';
      const selfClose = /\/\s*>$/.test(raw) || ARTICLE_VOID_TAGS[tag];
      out += '<' + tag + attrs + (selfClose && !ARTICLE_VOID_TAGS[tag] ? ' /' : '') + '>';
      if (!selfClose && !ARTICLE_VOID_TAGS[tag]) stack.push(tag);
    } else {
      // Text: escape, gộp tới ký tự '<' tiếp theo.
      const next = src.indexOf('<', i);
      const chunk = next === -1 ? src.slice(i) : src.slice(i, next);
      if (dropDepth === 0) out += esc(chunk);
      i = next === -1 ? src.length : next;
    }
  }
  while (stack.length) { const t = stack.pop(); if (t === '__iframe_skip__') continue; out += '</' + t + '>'; }
  return out;
}
export function isHtmlBody(body) {
  const t = String(body || '').trim();
  if (!t) return false;
  if (t.charAt(0) === '<') return true;
  return /<[a-z][a-z0-9]*(\s[^>]*)?>/i.test(t);
}

// Đo độ dài TEXT THẬT của body (không tính mã HTML) — sửa 11/11/2026:
// body bản thảo là HTML (editor rich text v122) nên đo body.length thô sẽ
// chặn oan bài 27k–30k ký tự (HTML dài hơn text ~18%). Strip thẻ + giải mã
// entity + gộp khoảng trắng rồi mới đo, giống js/admin.js articleTextLength.
export function articleTextLength(body) {
  return String(body || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim().length;
}

export function validateDraft(d) {
  const errs = [];
  if (!d || typeof d !== 'object') return ['Bản thảo phải là 1 object JSON.'];
  const title = String(d.title || '').trim();
  const slug = String(d.slug || '').trim().toLowerCase();
  const cat = String(d.category || '').trim();
  const summary = String(d.summary || '').trim();
  const body = String(d.body || '').trim();
  const img = String(d.image_url || '').trim();
  const src = String(d.source_url || '').trim();
  const srcName = String(d.source_name || '').trim();
  if (title.length < 1 || title.length > 150) errs.push('Tiêu đề phải từ 1 tới 150 ký tự.');
  if (!slugOk(slug)) errs.push('Slug chỉ gồm chữ thường, số và dấu gạch ngang, tối đa 100 ký tự.');
  if (ARTICLE_CATS.indexOf(cat) === -1) errs.push('Chuyên mục phải là 1 trong 10 chuyên mục Tin tức đã chốt.');
  if (summary.length < 20 || summary.length > 500) errs.push('Mô tả ngắn phải từ 20 tới 500 ký tự.');
  const bodyLen = articleTextLength(body);
  if (bodyLen < 200 || bodyLen > 30000) errs.push(`Nội dung bài (không tính mã HTML) phải từ 200 tới 30000 ký tự (đang ${bodyLen}).`);
  if (!(isHttpUrl(img) || /^images\//.test(img) || /^\//.test(img))) errs.push('Ảnh đại diện phải là link http(s) hoặc đường dẫn images/...');
  if (src && !isHttpUrl(src)) errs.push('Link bài gốc phải bắt đầu bằng http:// hoặc https://.');
  if (srcName.length > 100) errs.push('Tên nguồn tối đa 100 ký tự.');
  if (d.publish_date && !/^\d{4}-\d{2}-\d{2}$/.test(String(d.publish_date))) errs.push('Ngày đăng phải dạng YYYY-MM-DD.');
  return errs;
}

// Bỏ dấu tiếng Việt để so sánh từ khóa slug (không dấu) với nội dung (có dấu).
function stripVi(s) {
  return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase();
}

const SEO_CTA_WORDS = ['xem ngay', 'đăng ký', 'tìm hiểu', 'khám phá', 'xem thêm', 'tìm mẫu', 'miễn phí', 'liên hệ', 'tư vấn'];
const SEO_STAT_MARK = /%|tỷ|triệu|nghìn tỷ|tăng\s*\d|giảm\s*\d|\d+\s*(%|tỷ|triệu)/;

// Cổng kiểm tra SEO on-page — Bước 5, he-thong-viet-bai-seo-100-tu-khoa.md.
// ctx: { titles: [tiêu đề đã có, chữ thường], pages: [page đã có] }.
// Trả về { errors: [], warnings: [] }.
//  - errors (CHẶN — không được xuất bản): thiếu title/meta/ảnh/H1,
//    trùng tiêu đề/slug. Pipeline tự động phải dừng bài này, ghi log để
//    Ryan/Zalo sửa, không đăng bài lỗi SEO lên live.
//  - warnings (vẫn đăng, ghi log để tác giả cải thiện): title chưa đúng
//    55–60 ký tự, meta chưa đúng 150–160 ký tự, thiếu H2, có số liệu
//    nhưng không có nguồn, từ khóa tiêu đề ít xuất hiện trong nội dung.
//    Chỉ cảnh báo (không chặn) vì các bài live hiện tại của cron 08:21
//    có <title> dài 90–132 ký tự — chặn cứng theo 55–60 sẽ kẹt gần như
//    mọi bài tin tức. Dùng --strict để biến warnings thành errors khi
//    kiểm tra tay. Siết thành lỗi khi anh Thọ chốt.
export function checkSeo(d, ctx) {
  const errors = [];
  const warnings = [];
  const title = String(d.title || '').trim();
  const summary = String(d.summary || '').trim();
  const body = String(d.body || '').trim();
  const slug = String(d.slug || '').trim().toLowerCase();
  const titles = (ctx && ctx.titles) || [];
  const pages = (ctx && ctx.pages) || [];
  if (title.length < 20) errors.push('Tiêu đề quá ngắn (' + title.length + ' ký tự) — cần tiêu đề đầy đủ, lý tưởng 55–60 ký tự chứa từ khóa chính.');
  if (summary.length < 50) errors.push('Mô tả ngắn quá ngắn (' + summary.length + ' ký tự) — meta description cần 150–160 ký tự chứa từ khóa chính + 1 lời kêu gọi.');
  if (titles.includes(title.toLowerCase())) errors.push('Trùng tiêu đề với bài đã có trên web: "' + title + '".');
  if (pages.includes('bai-viet/' + slug + '.html')) errors.push('Trùng slug/page với bài đã có: bai-viet/' + slug + '.html.');
  if (title.length >= 20 && (title.length < 55 || title.length > 60)) warnings.push('Tiêu đề ' + title.length + ' ký tự (chuẩn 55–60 ký tự).');
  if (summary.length >= 50 && (summary.length < 150 || summary.length > 160)) warnings.push('Mô tả ngắn ' + summary.length + ' ký tự (meta chuẩn 150–160 ký tự).');
  if (!SEO_CTA_WORDS.some((w) => summary.toLowerCase().includes(w))) warnings.push('Mô tả ngắn chưa có lời kêu gọi (vd "Xem ngay", "Đăng ký miễn phí").');
  const { headings } = bodyToHtml(body);
  if (headings.length === 0) warnings.push('Nội dung không có tiêu đề phụ H2 (dòng "## ..." hoặc tiêu đề mục "1. ..." — form chung v306 tự nhận diện cả 2 dạng) — bài khó đọc và thiếu từ khóa phụ.');
  if (SEO_STAT_MARK.test(body) && !String(d.source_url || '').trim()) warnings.push('Nội dung có số liệu nhưng không có link bài gốc (source_url) — số liệu phải có nguồn.');
  const slugWords = slug.split('-').filter((w) => w.length > 2);
  const bodyPlain = stripVi(body);
  const hit = slugWords.filter((w) => bodyPlain.includes(w)).length;
  if (slugWords.length >= 3 && hit < Math.ceil(slugWords.length / 2)) warnings.push('Từ khóa tiêu đề ít xuất hiện trong nội dung (' + hit + '/' + slugWords.length + ' từ slug có mặt) — mật độ từ khóa chính thấp.');
  return { errors, warnings };
}

// Chuẩn hóa ảnh thành URL đầy đủ (cho og:image + data.js img).
export function normalizeImageUrl(imageUrl) {
  const u = String(imageUrl || '').trim();
  if (isHttpUrl(u)) return u;
  if (u.startsWith('/')) return BASE_URL + u;
  if (u.startsWith('images/')) return BASE_URL + '/' + u;
  return u;
}
// Đường dẫn ảnh dùng trong file bai-viet/*.html (tương đối từ thư mục bai-viet/).
export function articleImageSrc(imageUrl) {
  const u = String(imageUrl || '').trim();
  if (isHttpUrl(u)) return u;
  if (u.startsWith('images/')) return '../' + u;
  if (u.startsWith('/')) return '..' + u;
  return u;
}
function inlineBold(s) {
  // **chữ** → <b>chữ</b> (chạy sau khi đã esc HTML).
  return String(s).replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>');
}
// ---- Form chung chong loi muc luc (v306, 16/11/2026) ----
// Ban thao tu editor rich text (v122) thuong viet tieu de muc dang "1. Tieu de"
// va khoi "Muc luc" bang <p> thuong (khong dung '## ' hay <h2>) — script cu
// khong nhan ra nen muc luc chi co 1 muc vo dung "Theo Vieclamlivestream" (loi
// Double 11 anh bao 22:27 16/11). Form chung tu nhan dien ca 2 dang:
//   - tieu de muc: doan van ngan (<=160 ky tu) bat dau bang "N. " (N = 1..99)
//     hoac "- N. " (danh sach trong editor) -> thanh <h2> danh so tuan tu;
//   - khoi "Muc luc": doan "Muc luc" + cac muc ke tiep (rieng le, hoac gop
//     chung 1 doan "1. ... 2. ...") -> thanh link neo toi dung muc; muc nao
//     khong co tieu de tuong ung thi giu nguyen chu thuong (khong tao link chet).
// Doan van dai (>160 ky tu) bat dau bang "N. " KHONG duoc doi (vd danh sach
// nguon tham khao) — tranh nhan nham. Tieu de chua " N. " o giua cung khong
// duoc doi (do la doan gop nhieu muc, chi xu ly o khoi "Muc luc").
const NUMBERED_TITLE_MAX_LEN = 160;
function stripTagsText(s) { return String(s || '').replace(/<[^>]*>/g, '').trim(); }
function unescapeHtml(s) {
  // Text tu sanitizeArticleHtml da duoc esc() 1 lan (&quot;...). Khi dua vao
  // danh sach headings (nav se esc() them 1 lan) phai go esc truoc, neu khong
  // nav hien "&amp;quot;" (loi phat hien khi doi chieu v305: nav moi co
  // "&amp;quot;" trong khi file sua tay dung "&quot;").
  return String(s || '')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ');
}
function parseNumberedTitle(text) {
  const t = String(text || '').trim();
  if (!t || t.length > NUMBERED_TITLE_MAX_LEN) return null;
  const m = t.match(/^(\d{1,2})\.\s+(.+)$/);
  if (!m) return null;
  const title = m[2].trim();
  if (!title || /\s\d{1,2}\.\s+\S/.test(title)) return null;
  return { num: parseInt(m[1], 10), title };
}
function parseDashNumberedTitle(text) {
  const t = String(text || '').trim();
  if (!t || t.length > NUMBERED_TITLE_MAX_LEN) return null;
  const m = t.match(/^-\s*(\d{1,2})\.\s+(.+)$/);
  if (!m) return null;
  const title = m[2].trim();
  if (!title || /\s\d{1,2}\.\s+\S/.test(title)) return null;
  return { num: parseInt(m[1], 10), title };
}
function splitInlineNumberedItems(text) {
  // Doan van gop nhieu muc "1. ... 2. ... 3. ..." (vd Kinh [4]).
  // Tach thanh danh sach {num, title}; tra ve [] neu <2 muc hoac co muc khong hop le.
  const t = String(text || '').trim();
  if (!t) return [];
  const parts = t.split(/(?=\d{1,2}\.\s+)/);
  if (parts.length < 2) return [];
  const items = [];
  for (const part of parts) {
    const p = parseNumberedTitle(part);
    if (!p) return [];
    items.push(p);
  }
  return items;
}
function removeNumberPrefixSafe(inner) {
  // Bo tien to "N. " o dau noi dung HTML cua doan (giu the mo dau nhu <b>).
  // Chi xu ly 2 dang sach: so o dau text, hoac ngay sau 1 the mo. Dang khac
  // tra ve null de phia goi dung text thuong (khong lam hong HTML).
  const s = String(inner || '');
  let m = s.match(/^\s*\d{1,2}\.\s+/);
  if (m) return s.slice(m[0].length);
  m = s.match(/^(<[^>]+>)\s*\d{1,2}\.\s+/);
  if (m) return m[1] + s.slice(m[0].length);
  return null;
}
// Chuyển nội dung bản thảo thành các khối HTML.
//   Dạng markup cũ ('## ', '- ', '> ', '**bold**'): parser cũ, giữ nguyên.
//   Dạng HTML mới (v122, editor rich text): sanitize theo whitelist, đánh số
//   các h2 thành mục lục (id bai-muc-N + tiền tố "N. ") giống parser cũ.
// Trả về { html, headings: [{id, text}] } để dựng mục lục.
export function bodyToHtml(body) {
  if (isHtmlBody(body)) return bodyHtmlToHtml(body);
  const lines = String(body || '').replace(/\r\n/g, '\n').split('\n');
  const blocks = [];
  let para = [];
  let list = [];
  const flushPara = () => { if (para.length) { blocks.push({ t: 'p', text: para.join(' ') }); para = []; } };
  const flushList = () => { if (list.length) { blocks.push({ t: 'ul', items: list }); list = []; } };
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) { flushPara(); flushList(); continue; }
    if (line.startsWith('## ')) { flushPara(); flushList(); blocks.push({ t: 'h2', text: line.slice(3).trim() }); continue; }
    if (line.startsWith('- ')) { flushPara(); list.push(line.slice(2).trim()); continue; }
    if (line.startsWith('> ')) { flushPara(); flushList(); blocks.push({ t: 'callout', text: line.slice(2).trim() }); continue; }
    if (list.length) { flushList(); }
    // Form chung (v306): dong tieu de muc "N. Tieu de" hoac dong "Muc luc" o dau
    // doan van (sau dong trong, para dang rong) tach thanh khoi rieng — neu
    // khong, dong tieu de se bi gop chung voi than bai ngay sau no (para.join(' ')).
    // Chi tach khi o dau doan: dong "N. ..." nam giua doan (vd liet ke trong
    // than bai) van o lai trong doan, tranh nhan nham thanh h2.
    if (para.length === 0 && (/^mục lục$/i.test(line) || parseNumberedTitle(line))) {
      blocks.push({ t: 'p', text: line });
      continue;
    }
    para.push(line);
  }
  flushPara(); flushList();
  // Form chung (v306): nhan dien khoi "Muc luc" + tieu de muc "N. Tieu de" o cap block.
  const tocItems = []; // [{blockIndex, num, title, inline?}]
  let tocAt = -1;
  for (let i = 0; i < blocks.length; i++) {
    if (blocks[i].t === 'p' && /^mục lục$/i.test(blocks[i].text.trim())) { tocAt = i; break; }
  }
  const tocBlockIdx = new Set();
  if (tocAt >= 0) {
    let lastNum = 0;
    for (let i = tocAt + 1; i < blocks.length; i++) {
      const b = blocks[i];
      if (b.t !== 'p') break;
      const items = splitInlineNumberedItems(b.text);
      if (items.length >= 2 && items[0].num > lastNum) {
        tocItems.push({ blockIndex: i, num: items[0].num, title: items[0].title, inline: items });
        tocBlockIdx.add(i);
        lastNum = items[items.length - 1].num;
        continue;
      }
      const d = parseNumberedTitle(b.text);
      if (d) {
        if (d.num <= lastNum) break; // so danh sach bat dau lai -> het khoi muc luc
        lastNum = d.num;
        tocItems.push({ blockIndex: i, num: d.num, title: d.title });
        tocBlockIdx.add(i);
        continue;
      }
      break; // doan khong phai muc -> het khoi muc luc
    }
  }
  // Doi cac khoi <p> tieu de muc (ngoai khoi muc luc) thanh h2 (bo so thu tu).
  for (let i = 0; i < blocks.length; i++) {
    const b = blocks[i];
    if (b.t !== 'p' || tocBlockIdx.has(i) || i === tocAt) continue;
    const st = parseNumberedTitle(b.text);
    if (!st) continue;
    blocks[i] = { t: 'h2', text: st.title };
  }
  // Gan id tuan tu cho h2 + map tieu de -> {id, num} (de link-hoa muc luc dung truoc).
  const headings = [];
  const titleToHeading = new Map();
  let n = 0;
  for (const b of blocks) {
    if (b.t !== 'h2') continue;
    n += 1;
    b.id = 'bai-muc-' + n;
    b.num = n;
    headings.push({ id: b.id, text: n + '. ' + b.text });
    if (!titleToHeading.has(b.text)) titleToHeading.set(b.text, { id: b.id, num: n });
  }
  const html = blocks.map((b, i) => {
    if (b.t === 'h2') {
      return '<h2 id="' + b.id + '">' + b.num + '. ' + inlineBold(esc(b.text)) + '</h2>';
    }
    if (b.t === 'ul') return '<ul>' + b.items.map((it) => '<li>' + inlineBold(esc(it)) + '</li>').join('') + '</ul>';
    if (b.t === 'callout') return '<div class="callout">' + inlineBold(esc(b.text)) + '</div>';
    // Khoi muc luc: link-hoa neu co tieu de tuong ung, khong thi giu nguyen.
    const toc = tocItems.find((t) => t.blockIndex === i);
    if (toc) {
      if (toc.inline) {
        return toc.inline.map((x) => {
          const hit = titleToHeading.get(x.title);
          if (!hit) return '<p>' + x.num + '. ' + esc(x.title) + '</p>';
          return '<p><a href="#' + hit.id + '">' + hit.num + '. ' + esc(x.title) + '</a></p>';
        }).join('\n');
      }
      const hit = titleToHeading.get(toc.title);
      if (!hit) return '<p>' + inlineBold(esc(b.text)) + '</p>';
      return '<p><a href="#' + hit.id + '">' + hit.num + '. ' + esc(toc.title) + '</a></p>';
    }
    return '<p>' + inlineBold(esc(b.text)) + '</p>';
  }).join('\n');
  return { html, headings };
}
function readingMinutes(body) {
  const text = String(body || '').replace(/<[^>]*>/g, ' ').replace(/\*\*/g, '');
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 200));
}
// Nhánh HTML cho bodyToHtml: sanitize rồi đánh số h2 làm mục lục.
// Form chung (v306): truoc khi danh so, doi cac <p> tieu de muc "N. Tieu de"
// thanh <h2> va ghi nhan khoi "Muc luc" de link-hoa sau khi co id.
function convertNumberedHeadingsHtml(clean) {
  const pRe = /<p>([\s\S]*?)<\/p>/g;
  const paras = [];
  let m;
  while ((m = pRe.exec(clean)) !== null) {
    paras.push({ start: m.index, end: m.index + m[0].length, inner: m[1], text: stripTagsText(m[1]) });
  }
  let tocAt = -1;
  for (let i = 0; i < paras.length; i++) {
    if (/^mục lục$/i.test(paras[i].text)) { tocAt = i; break; }
  }
  const tocItems = []; // [{num, title, inline?}]
  const tocParaIdx = new Set();
  if (tocAt >= 0) {
    let lastNum = 0;
    for (let i = tocAt + 1; i < paras.length; i++) {
      const p = paras[i];
      const items = splitInlineNumberedItems(p.text);
      if (items.length >= 2 && items[0].num > lastNum) {
        tocItems.push({ num: items[0].num, title: items[0].title, inline: items });
        tocParaIdx.add(i);
        lastNum = items[items.length - 1].num;
        continue;
      }
      const d = parseDashNumberedTitle(p.text) || parseNumberedTitle(p.text);
      if (d) {
        if (d.num <= lastNum) break; // so danh sach bat dau lai -> het khoi muc luc
        lastNum = d.num;
        tocItems.push({ num: d.num, title: d.title });
        tocParaIdx.add(i);
        continue;
      }
      break; // doan khong phai muc -> het khoi muc luc
    }
  }
  const headingIdx = new Set();
  for (let i = 0; i < paras.length; i++) {
    if (tocParaIdx.has(i) || i === tocAt) continue;
    if (!parseNumberedTitle(paras[i].text)) continue;
    headingIdx.add(i);
  }
  let out = '';
  let last = 0;
  for (const i of headingIdx) {
    const p = paras[i];
    const st = parseNumberedTitle(p.text);
    const stripped = removeNumberPrefixSafe(p.inner);
    const inner = stripped !== null ? stripped : st.title;
    out += clean.slice(last, p.start);
    out += '<h2>' + inner + '</h2>';
    last = p.end;
  }
  out += clean.slice(last);
  return { html: out, tocItems };
}

function linkTocItemsHtml(html, tocItems, titleToHeading) {
  if (!tocItems.length) return html;
  const norm = (s) => String(s || '').replace(/\s+/g, ' ').trim();
  const tocLink = (item) => {
    const hit = titleToHeading.get(item.title);
    if (!hit) return null;
    return '<p><a href="#' + hit.id + '">' + hit.num + '. ' + item.title + '</a></p>';
  };
  const pRe = /<p>([\s\S]*?)<\/p>/g;
  let out = '';
  let last = 0;
  let m;
  let seenToc = false;
  let itemPos = 0;
  while ((m = pRe.exec(html)) !== null) {
    const text = stripTagsText(m[1]);
    if (!seenToc) {
      if (/^mục lục$/i.test(text)) seenToc = true;
      continue;
    }
    if (itemPos >= tocItems.length) break;
    const item = tocItems[itemPos];
    if (item.inline) {
      const joined = item.inline.map((x) => x.num + '. ' + x.title).join(' ');
      if (norm(text) === norm(joined)) {
        out += html.slice(last, m.index);
        out += item.inline.map((x) => tocLink(x) || ('<p>' + x.num + '. ' + x.title + '</p>')).join('');
        last = m.index + m[0].length;
        itemPos++;
      }
      continue;
    }
    const d = parseDashNumberedTitle(text) || parseNumberedTitle(text);
    if (d && d.title === item.title) {
      const linked = tocLink(item);
      if (linked) {
        out += html.slice(last, m.index);
        out += linked;
        last = m.index + m[0].length;
      }
      itemPos++;
    } else {
      break; // het khoi muc luc
    }
  }
  out += html.slice(last);
  return out;
}

export function bodyHtmlToHtml(body) {
  const clean = sanitizeArticleHtml(body);
  const { html: withHeadings, tocItems } = convertNumberedHeadingsHtml(clean);
  const headings = [];
  const titleToHeading = new Map();
  let n = 0;
  const html = withHeadings.replace(/<h2([^>]*)>([\s\S]*?)<\/h2>/gi, function (_m, attrs, inner) {
    n += 1;
    const id = 'bai-muc-' + n;
    const text = inner.replace(/<[^>]*>/g, '').trim(); // dang da esc — giu lam khoa khop muc luc
    headings.push({ id, text: n + '. ' + unescapeHtml(text) }); // nav se esc() 1 lan
    if (!titleToHeading.has(text)) titleToHeading.set(text, { id, num: n });
    return '<h2 id="' + id + '"' + attrs + '>' + n + '. ' + inner + '</h2>';
  });
  return { html: linkTocItemsHtml(html, tocItems, titleToHeading), headings };
}
function vnDateLong(iso) {
  // '2026-11-09' → '09/11/2026'
  const m = String(iso || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return String(iso || '');
  return m[3] + '/' + m[2] + '/' + m[1];
}
function domainOf(url) {
  try { return new URL(url).hostname.replace(/^www\./, ''); } catch (e) { return ''; }
}

// Sinh toàn bộ file bai-viet/<slug>.html theo mẫu bài chuẩn SEO.
export function renderArticleHtml(d) {
  const title = String(d.title).trim();
  const slug = String(d.slug).trim().toLowerCase();
  const cat = String(d.category).trim();
  const summary = String(d.summary).trim();
  const body = String(d.body).trim();
  const date = String(d.publish_date || new Date().toISOString().slice(0, 10));
  const canonical = BASE_URL + '/bai-viet/' + slug + '.html';
  const imgFull = normalizeImageUrl(d.image_url);
  const imgAlt = String((d.image_alt || '')).trim() || title; // v122: alt ảnh đại diện do tác giả nhập (JSON bản thảo); thiếu thì dùng tiêu đề.
  const imgSrc = articleImageSrc(d.image_url);
  const sourceUrl = String(d.source_url || '').trim() || null;
  const sourceName = String(d.source_name || '').trim() || 'Vieclamlivestream';
  const authorLine = sourceUrl
    ? 'Tác giả: <b style="color:var(--ink)">Ban biên tập Vieclamlivestream</b> (viết lại từ bài gốc của ' + esc(sourceName) + ')'
    : 'Tác giả: <b style="color:var(--ink)">Ban biên tập Vieclamlivestream</b>';
  const dateLine = sourceUrl
    ? 'Bài gốc đăng ' + vnDateLong(date)
    : 'Đăng ' + vnDateLong(date);
  let { html: bodyHtml, headings } = bodyToHtml(body);
  // SEO Bước 5: bài PHẢI có mục "Theo Vieclamlivestream" + link nội bộ về
  // danh-sach-mau / danh-sach-shop + trang chủ. Body bản thảo là văn bản
  // thuần (không chèn được link HTML) nên script tự thêm mục này khi tác
  // giả chưa viết — không thêm trùng nếu body đã có. Mục này cũng được
  // đưa vào mục lục với số thứ tự tiếp theo.
  if (!/theo (ver2solution|vieclamlivestream)/i.test(body)) {
    const n = headings.length + 1;
    const secId = 'bai-muc-' + n;
    headings = headings.concat([{ id: secId, text: n + '. Theo Vieclamlivestream' }]);
    bodyHtml += '\n<h2 id="' + secId + '">' + n + '. Theo Vieclamlivestream</h2>\n'
      + '<p>Vieclamlivestream tổng hợp thông tin trên để shop nhỏ và mẫu livestream tham khảo khi bán hàng online và làm việc livestream. Số liệu trong bài đều lấy từ nguồn ghi cuối bài; shop và mẫu nên đối chiếu với tin tuyển thực tế trên sàn trước khi quyết định.</p>\n'
      + '<p>Shop cần thuê mẫu livestream: xem <a href="../danh-sach-mau.html">danh sách mẫu livestream</a>. Mẫu muốn tìm việc live: xem <a href="../danh-sach-shop.html">danh sách shop đang tuyển mẫu</a>. Về <a href="../index.html">trang chủ sàn Vieclamlivestream</a> để xem thêm tin tức và hồ sơ mới.</p>';
  }
  const toc = headings.length
    ? '<nav class="toc" aria-label="Mục lục bài viết">\n            <b>Nội dung bài viết</b>\n            <ol>\n'
      + headings.map((h) => '<li><a href="#' + h.id + '">' + esc(h.text) + '</a></li>').join('')
      + '\n            </ol>\n          </nav>'
    : '';
  const sourcePara = sourceUrl
    ? '<p style="margin-top:20px">Nguồn: <a href="' + escAttr(sourceUrl) + '" target="_blank" rel="noopener"><b>' + esc(sourceName) + '</b></a> — Bài gốc đăng ' + vnDateLong(date) + '. Bài viết trên đây do Vieclamlivestream viết lại bằng tiếng Việt từ bài gốc, không sao chép nguyên văn.</p>'
    : '<p style="margin-top:20px">Bài viết do Ban biên tập Vieclamlivestream thực hiện.</p>';
  const heroCap = sourceUrl
    ? 'Ảnh: ' + esc(sourceName) + ' — ' + esc(title) + '. Nguồn ảnh: ' + esc(domainOf(sourceUrl)) + '.'
    : 'Ảnh minh họa: Vieclamlivestream — ' + esc(title) + '.';
  const metaDesc = summary.length > 155 ? summary.slice(0, 152).trim() + '...' : summary;
  const minutes = readingMinutes(body);
  const encUrl = encodeURIComponent(canonical);
  return '<!DOCTYPE html><html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">\n'
    + '<title>' + esc(title) + '</title>\n'
    + '<meta name="description" content="' + escAttr(metaDesc) + '">\n'
    + '<link rel="canonical" href="' + canonical + '">\n'
    + '<meta property="og:type" content="article"><meta property="og:site_name" content="vieclamlivestream.online">\n'
    + '<meta property="og:title" content="' + escAttr(title) + '">\n'
    + '<meta property="og:description" content="' + escAttr(metaDesc) + '">\n'
    + '<meta property="og:url" content="' + canonical + '">\n'
    + '<meta property="og:image" content="' + escAttr(imgFull) + '">\n'
    + '<meta property="og:image:width" content="1200">\n'
    + '<meta property="og:image:height" content="630">\n'
    + '<meta property="og:image:type" content="image/jpeg">\n'
    + '<meta property="og:image:alt" content="' + escAttr(imgAlt) + '">\n'
    + '<meta property="og:locale" content="vi_VN">\n'
    + '<meta property="article:published_time" content="' + date + '"><meta property="article:author" content="Vieclamlivestream">\n'
    + '<meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="' + escAttr(title) + '">\n'
    + '<meta name="twitter:description" content="' + escAttr(metaDesc) + '">\n'
    + '<meta name="twitter:image" content="' + escAttr(imgFull) + '">\n'
    + '<meta name="theme-color" content="#0b5d4e"><meta name="mobile-web-app-capable" content="yes"><meta name="apple-mobile-web-app-capable" content="yes"><meta name="apple-mobile-web-app-title" content="Vieclamlivestream">\n'
    + '<link rel="icon" href="../favicon.png"><link rel="apple-touch-icon" href="../apple-touch-icon.png"><link rel="manifest" href="../manifest.webmanifest">\n'
    + '<script type="application/ld+json">{"@context":"https://schema.org","@type":"NewsArticle","headline":' + JSON.stringify(title) + ',"image":' + JSON.stringify(imgFull) + ',"datePublished":' + JSON.stringify(date) + ',"author":{"@type":"Organization","name":"Vieclamlivestream","url":"https://vieclamlivestream.online"},"publisher":{"@type":"Organization","name":"Vieclamlivestream","url":"https://vieclamlivestream.online","logo":{"@type":"ImageObject","url":"https://vieclamlivestream.online/logo.png"}}}</script>\n'
    + '<link rel="preconnect" href="https://fonts.googleapis.com">\n'
    + '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n'
    + '<link href="https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@400;500;600;700;800&display=swap" rel="stylesheet">\n'
    + '<link rel="stylesheet" href="../v20.css"><style>\n'
    + '.article{line-height:1.75}.article h1{font-size:32px;line-height:1.25}.article h2{font-size:23px;margin:28px 0 10px}.article h3{font-size:18px;margin:22px 0 8px}\n'
    + '.article-lead{font-size:17px;color:var(--mut)}.article-meta{font-size:13px;color:var(--mut);margin:12px 0}\n'
    + '.toc{background:#f4f8f6;border-radius:12px;padding:16px 18px}.toc ol{margin:8px 0 0;padding-left:20px}\n'
    + '.callout{background:var(--brandsoft);border:1px solid #bfe3cf;border-radius:12px;padding:14px 16px;margin:16px 0}\n'
    + '.article-sig{border-top:1px solid var(--line);margin-top:28px;padding-top:16px;display:flex;flex-direction:column;gap:4px;font-size:14px}\n'
    + '.share-box{background:#fff;border:1px solid var(--line);border-radius:14px;padding:18px;margin:16px 0}\n'
    + '.share-row{display:flex;flex-wrap:wrap;gap:8px}.share-row a,.share-row button{display:inline-block;background:var(--brand);color:#fff;text-decoration:none;font-weight:700;padding:9px 14px;border-radius:9px;border:0;cursor:pointer;font:inherit}\n'
    + '@media(max-width:680px){.article h1{font-size:26px}}\n'
    + '.article-head .news-cat{display:inline-block;background:var(--brand);color:#fff;font-size:12px;font-weight:800;padding:3px 10px;border-radius:999px}\n'
    + '.article-body ul,.article-body ol{padding-left:20px}.share-btn{display:inline-block;background:var(--brand);color:#fff;text-decoration:none;font-weight:700;padding:9px 14px;border-radius:9px}\n'
    + '.article-body img{max-width:100%;height:auto;border-radius:12px}\n'
    + '.article-body figure{margin:16px 0}.article-body figcaption{font-size:13px;color:var(--mut);margin-top:6px}\n'
    + '.article-body video{max-width:100%;border-radius:12px;background:#000}\n'
    + '.article-body iframe{width:100%;aspect-ratio:16/9;border:0;border-radius:12px}\n'
    + '.article-body blockquote{background:var(--brandsoft);border:1px solid #bfe3cf;border-radius:12px;padding:14px 16px;margin:16px 0}\n'
    + '.hero-img{width:100%;border-radius:12px;margin:16px 0 4px}.hero-cap{font-size:13px;color:var(--mut);margin:0 0 8px}\n'
    + '.num-table{width:100%;border-collapse:collapse;margin:14px 0}.num-table th,.num-table td{border:1px solid var(--line);padding:8px 10px;text-align:left}.num-table th{background:#f4f8f6}\n'
    + '</style></head><body>\n'
    + '<p class="online-badge" hidden data-online="tintuc"><span class="online-dot" aria-hidden="true"></span><span class="online-num">211</span>&nbsp;người đang online</p>\n'
    + '<a class="game-entry" id="gameEntry" href="../game/noi-duong-tam.html" data-track="game-noi-duong-tam"><span class="game-entry-ic" aria-hidden="true">🪷</span><span>Nơi dưỡng tâm<small>Chơi game kiếm Xu · thiền, tưới sen, thắp hương</small></span></a>\n'
    + '<div class="online-popup" id="onlinePopup" aria-label="Số người đang online" hidden><div class="online-popup-body"><p class="online-popup-line"><span class="online-dot" aria-hidden="true"></span><span class="online-popup-num">211</span>&nbsp;người đang online</p><p class="online-popup-points" id="onlinePopupPoints" hidden>Đã tiêu: <b class="online-popup-spent">0</b> xu • Còn lại: <b class="online-popup-left">0</b> xu</p></div><button class="online-popup-close" id="onlinePopupClose" type="button" aria-label="Đóng popup">×</button></div>\n'
    + '<header class="site-head"><div class="wrap head-in"><a class="logo" href="../index.html"><span class="logo-badge">2</span><span>vieclamlivestream.online<small>MC LIVESTREAM</small></span></a>\n'
    + '<button class="menu-btn" id="menuBtn" data-track="nut-menu" aria-expanded="false" type="button">Menu</button><nav class="main-nav" id="mainNav"><a href="../index.html" class="">Trang chủ</a><a href="../danh-sach-mau.html" class="">Dành cho Shop</a><a href="../danh-sach-shop.html" class="">Dành cho Mẫu</a><a href="../thanh-ly-kiot.html" class="">Thanh lý Kiot</a><a href="../tin-tuc.html" class="active">Tin tức</a><a href="../hoi-dap.html" class="">Hỏi đáp</a></nav>\n'
    + '<a class="btn btn-primary btn-sm" href="../dang-nhap.html?next=bai-viet/' + slug + '.html">Đăng Nhập</a></div></header>\n'
    + '<main class="wrap">\n'
    + '<p style="margin:20px 0 0"><a href="../tin-tuc.html">← Quay lại mục tin tức</a></p>\n'
    + '<section class="form-card article">\n'
    + '<article itemscope itemtype="https://schema.org/NewsArticle">\n'
    + '          <header class="article-head">\n'
    + '            <span class="news-cat">' + esc(cat) + '</span>\n'
    + '            <h1 itemprop="headline">' + esc(title) + '</h1>\n'
    + '            <p class="article-lead" itemprop="description">' + esc(summary) + '</p>\n'
    + '            <div class="article-meta">\n'
    + '              <span itemprop="author">' + authorLine + '</span>\n'
    + '              <span aria-hidden="true">·</span>\n'
    + '              <time datetime="' + date + '" itemprop="datePublished">' + dateLine + '</time>\n'
    + '              <span aria-hidden="true">·</span><span>' + minutes + ' phút đọc</span>\n'
    + '              <span aria-hidden="true">·</span><span>Chuyên mục: ' + esc(cat) + '</span>\n'
    + '            </div>\n'
    + '          </header>\n\n'
    + '          <div class="share-row" style="margin-top:16px" aria-label="Chia sẻ bài viết">\n'
    + '            <a class="share-btn fb" href="https://www.facebook.com/sharer/sharer.php?u=' + encUrl + '" target="_blank" rel="noopener" data-share="facebook">Facebook</a>\n'
    + '            <button class="share-btn zalo" type="button" data-share="zalo">Zalo</button>\n'
    + '            <a class="share-btn" href="https://www.facebook.com/dialog/send?link=' + encUrl + '" target="_blank" rel="noopener" data-share="messenger">Messenger</a>\n'
    + '            <a class="share-btn" href="https://t.me/share/url?url=' + encUrl + '" target="_blank" rel="noopener" data-share="telegram">Telegram</a>\n'
    + '            <button class="share-btn" type="button" data-share="native">Chia sẻ…</button>\n'
    + '          </div>\n\n'
    + '          <figure style="margin:0"><img class="hero-img" src="' + escAttr(imgSrc) + '" alt="' + escAttr(imgAlt) + '" loading="eager">\n'
    + '          <figcaption class="hero-cap">' + heroCap + '</figcaption></figure>\n\n'
    + (toc ? '          ' + toc + '\n\n' : '')
    + '          <div class="article-body">\n'
    + bodyHtml + '\n'
    + '          </div>\n\n'
    + '          ' + sourcePara + '\n\n'
    + '          <div class="article-sig">\n'
    + '            <span><b>Theo Vieclamlivestream:</b> Vieclamlivestream là sàn việc làm dành cho idol live top 1 Việt Nam — idol tìm việc, shop tìm idol, liên hệ trực tiếp không qua trung gian. Chi tiết: <a href="https://vieclamlivestream.online/">https://vieclamlivestream.online/</a></span>\n'
    + '            <span><b>vieclamlivestream.online</b></span>\n'
    + '            <span>Việc làm livestream cho idol, tin tức cho shop nhỏ bán live.</span>\n'
    + '            <span>Đăng ký miễn phí, tìm việc — tìm mẫu nhanh hơn.</span>\n'
    + '            <span>——————————</span>\n'
    + '            <span>Tư vấn tăng chuyển đổi live: <b><a href="https://zalo.me/0329983699" target="_blank" rel="noopener">Zalo 032 998 3699</a></b></span>\n'
    + '          </div>\n'
    + '        </article>\n'
    + '<div class="share-box"><h3 style="margin-top:0">Chia sẻ bài này cho một chủ shop khác</h3>\n'
    + '<p>Link bài viết để chia sẻ: <b>' + canonical + '</b></p>\n'
    + '<div class="share-row">\n'
    + '<a href="https://www.facebook.com/sharer/sharer.php?u=' + encUrl + '" target="_blank" rel="noopener">Chia sẻ Facebook</a>\n'
    + '<a href="https://t.me/share/url?url=' + encUrl + '" target="_blank" rel="noopener">Telegram</a>\n'
    + '<a href="https://twitter.com/intent/tweet?url=' + encUrl + '" target="_blank" rel="noopener">X (Twitter)</a>\n'
    + '<a href="https://www.linkedin.com/sharing/share-offsite/?url=' + encUrl + '" target="_blank" rel="noopener">LinkedIn</a>\n'
    + '<a href="https://zalo.me/0329983699" target="_blank" rel="noopener">Zalo tư vấn</a>\n'
    + '</div></div>\n'
    + '</section>\n'
    + '<p><a href="../tin-tuc.html">← Quay lại mục tin tức</a> · <a href="../index.html">Trang chủ sàn mẫu live</a></p>\n'
    + '</main>\n'
    + '<footer class="site-foot"><div class="wrap"><p><b>vieclamlivestream.online</b> — Việc làm livestream cho idol, tin tức cho shop nhỏ bán live.<br>Đăng ký miễn phí, tìm việc — tìm mẫu nhanh hơn.<br>Tư vấn tăng chuyển đổi live: <a href="https://zalo.me/0329983699" target="_blank" rel="noopener">Zalo 032 998 3699</a></p>\n'
    + '<p>Web không đăng số điện thoại, Zalo hay email riêng của mẫu. Mọi liên hệ đều qua bài gốc công khai của mẫu hoặc qua vieclamlivestream.online trung gian.</p><p class="powered">Powered by vieclamlivestream.online</p><p class="foot-legal"><a href="../gioi-thieu.html">Giới thiệu</a> · <a href="../chinh-sach-bao-mat.html">Chính sách bảo mật</a> · <a href="../dieu-khoan-su-dung.html">Điều khoản sử dụng</a> · <a href="../lien-he.html">Liên hệ</a> · <a href="../tuyen-bo-mien-tru.html">Tuyên bố miễn trừ</a> · <a href="../chinh-sach-cookie.html">Chính sách cookie</a></p></div></footer>\n'
    + '<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>\n'
    + '<script src="../supabase-config.js"></script>\n'
    + '<script src="../mclivestream-supabase.js"></script>\n'
    + '<script src="../js/auth-ui.js"></script>\n'
    + '<script src="../js/themes.js"></script><script src="../js/app.js"></script><script src="../js/share.js"></script><script src="../js/analytics.js"></script><script src="../js/online-counter.js"></script>\n'
    + '<script>if("serviceWorker" in navigator){window.addEventListener("load",function(){navigator.serviceWorker.register("../sw.js").catch(function(){});});}</script></body></html>\n';
}

// Mục data.js cho bài mới (khớp định dạng các mục hiện có).
export function dataJsEntry(d) {
  const date = String(d.publish_date || new Date().toISOString().slice(0, 10));
  const sourceUrl = String(d.source_url || '').trim() || null;
  const sourceName = String(d.source_name || '').trim() || 'Vieclamlivestream';
  return '  {\n'
    + '   "title": ' + JSON.stringify(String(d.title).trim()) + ',\n'
    + '   "cat": ' + JSON.stringify(String(d.category).trim()) + ',\n'
    + '   "source": ' + JSON.stringify(sourceName) + ',\n'
    + '   "date": ' + JSON.stringify(date) + ',\n'
    + '   "url": ' + (sourceUrl ? JSON.stringify(sourceUrl) : 'null') + ',\n'
    + '   "page": ' + JSON.stringify('bai-viet/' + String(d.slug).trim().toLowerCase() + '.html') + ',\n'
    + '   "img": ' + JSON.stringify(normalizeImageUrl(d.image_url)) + ',\n'
    + '   "pinned": false,\n'
    + '   "takeaway": ' + JSON.stringify(String(d.summary).trim()) + '\n'
    + '  }';
}

// Tìm dòng đóng mảng "articles" trong data.js (dòng '],' đầu tiên sau '"articles": [').
// Trả về { start, close } là chỉ số dòng (0-based).
export function findArticlesArray(lines) {
  let start = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('"articles":')) { start = i; break; }
  }
  if (start < 0) return null;
  for (let i = start + 1; i < lines.length; i++) {
    if (lines[i].trim() === '],') return { start, close: i };
  }
  return null;
}

// ---------- GĐ4b: lý do từ chối SEO + đăng lại bản đã đăng ----------
// Một mục trong file --rejections-out: cron đọc file này rồi gọi RPC
// admin_set_article_rejection để hiện lý do trong console cho tác giả.
export function buildRejectionEntry(d, errors) {
  return {
    id: (d && d.id) || null,
    slug: String((d && d.slug) || '').trim().toLowerCase(),
    title: String((d && d.title) || '').trim(),
    reason: (errors || []).join(' '),
    at: new Date().toISOString()
  };
}
// Gỡ mục bài viết khỏi mảng articles trong data.js (theo page).
// Trả về { lines, removed } — lines là mảng mới (không sửa mảng gốc).
// Dùng khi đăng lại bản đã đăng (--force hoặc bản có d.page): thay thế
// mục cũ thay vì chèn trùng.
export function removeArticleEntry(lines, page) {
  const src = Array.isArray(lines) ? lines : [];
  let pageIdx = -1;
  for (let i = 0; i < src.length; i++) {
    if (src[i].includes('"page": "' + page + '"')) { pageIdx = i; break; }
  }
  if (pageIdx < 0) return { lines: src.slice(), removed: false };
  let start = -1;
  for (let i = pageIdx; i >= 0; i--) {
    if (src[i].trim() === '{') { start = i; break; }
  }
  let end = -1;
  for (let i = pageIdx; i < src.length; i++) {
    const t = src[i].trim();
    if (t === '},' || t === '}') { end = i; break; }
  }
  if (start < 0 || end < 0) return { lines: src.slice(), removed: false };
  const out = src.slice();
  out.splice(start, end - start + 1);
  return { lines: out, removed: true };
}
// Gỡ 1 URL khỏi sitemap (dòng <url><loc>URL</loc></url>).
export function removeSitemapUrl(lines, url) {
  const src = Array.isArray(lines) ? lines : [];
  const idx = src.findIndex((l) => l.includes('<loc>' + url + '</loc>'));
  if (idx < 0) return { lines: src.slice(), removed: false };
  const out = src.slice();
  out.splice(idx, 1);
  return { lines: out, removed: true };
}

function readJson(file) {
  const raw = fs.readFileSync(file, 'utf8');
  const parsed = JSON.parse(raw);
  return Array.isArray(parsed) ? parsed : [parsed];
}

function main() {
  const args = process.argv.slice(2);
  let draftFile = null, root = null, dryRun = false, force = false, strict = false, rejectionsOut = null;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--draft') draftFile = args[++i];
    else if (args[i] === '--root') root = args[++i];
    else if (args[i] === '--dry-run') dryRun = true;
    else if (args[i] === '--force') force = true;
    else if (args[i] === '--strict') strict = true;
    else if (args[i] === '--rejections-out') rejectionsOut = args[++i];
    else if (args[i] === '--help' || args[i] === '-h') {
      console.log('Dùng: node tools/publish-article-drafts.mjs --draft <draft.json> [--root <prep-dir>] [--dry-run] [--force] [--strict] [--rejections-out <file.json>]');
      console.log('  --strict: biến cảnh báo SEO thành lỗi chặn (dùng khi kiểm tra tay).');
      console.log('  --rejections-out: ghi lý do từ chối SEO của từng bản thảo lỗi vào file JSON (append), đăng tiếp các bản thảo khác thay vì dừng ngay.');
      process.exit(0);
    } else fail('Tham số không biết: ' + args[i]);
  }
  if (!draftFile) fail('Thiếu --draft <draft.json>.');
  if (!root) root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const dataJsPath = path.join(root, 'js', 'data.js');
  const sitemapPath = path.join(root, 'sitemap.xml');
  const baiVietDir = path.join(root, 'bai-viet');
  if (!fs.existsSync(dataJsPath)) fail('Không thấy js/data.js trong ' + root);
  if (!fs.existsSync(sitemapPath)) fail('Không thấy sitemap.xml trong ' + root);
  const drafts = readJson(draftFile);
  const dataJs = fs.readFileSync(dataJsPath, 'utf8');
  const dataLines = dataJs.split('\n');
  const arr = findArticlesArray(dataLines);
  if (!arr) fail('Không tìm thấy mảng "articles" trong js/data.js.');
  const sitemap = fs.readFileSync(sitemapPath, 'utf8');
  let newDataLines = dataLines.slice();
  let newSitemap = sitemap;
  let made = 0;
  // Chèn từ cuối lên để chỉ số dòng không lệch khi chèn nhiều bài.
  // Bối cảnh cho cổng SEO: tiêu đề + page đã có trên web (chống trùng).
  const seoCtx = {
    titles: [...dataJs.matchAll(/"title":\s*"((?:[^"\\]|\\.)*)"/g)].map((m) => { try { return JSON.parse('"' + m[1] + '"').toLowerCase(); } catch (e) { return m[1].toLowerCase(); } }),
    pages: [...dataJs.matchAll(/"page":\s*"([^"]*)"/g)].map((m) => m[1]),
  };
  const jobs = [];
  // GĐ4b: chế độ pipeline (--rejections-out): bản thảo lỗi không dừng cả
  // lô — ghi lý do vào file rejections để cron gọi RPC
  // admin_set_article_rejection, rồi đăng tiếp các bản thảo khác.
  // Không có cờ này: giữ hành vi cũ (dừng ngay ở lỗi đầu tiên).
  const rejections = [];
  const rejectOrFail = (d, msg) => {
    if (rejectionsOut) { rejections.push(buildRejectionEntry(d, [msg])); return true; }
    fail(msg);
    return false; // fail() thoát process nên không tới đây
  };
  for (const d of drafts) {
    const errs = validateDraft(d);
    if (errs.length) { if (rejectOrFail(d, 'Bản thảo "' + String(d.title || d.slug || '?') + '" không hợp lệ: ' + errs.join(' '))) continue; }
    const slug = String(d.slug).trim().toLowerCase();
    const page = 'bai-viet/' + slug + '.html';
    // GĐ4b: bản đăng lại = bản thảo có trường page (bài đã đăng, tác giả
    // sửa xong quay về 'ready'). Cổng SEO bỏ qua trùng tiêu đề/page của
    // CHÍNH bài đó (vẫn chặn trùng với bài KHÁC); file HTML + mục data.js
    // + sitemap sẽ được THAY THẾ ở bước ghi (không tạo trùng).
    const isRepublish = String(d.page || '').trim() === page;
    // Cổng SEO (Bước 5): lỗi chặn thì KHÔNG đăng bài này; cảnh báo thì
    // vẫn đăng nhưng in log để Ryan/Zalo sửa. --strict biến cảnh báo thành lỗi.
    // --force ghi đè bài đã có nên bỏ qua kiểm tra trùng tiêu đề/slug.
    const seoCtxFor = force
      ? { titles: [], pages: [] }
      : isRepublish
        ? { titles: seoCtx.titles.filter((t) => t !== String(d.title || '').trim().toLowerCase()), pages: seoCtx.pages.filter((p) => p !== page) }
        : seoCtx;
    const seo = checkSeo(d, seoCtxFor);
    if (seo.errors.length) { if (rejectOrFail(d, 'Bản thảo "' + String(d.title || d.slug || '?') + '" KHÔNG đạt chuẩn SEO, không đăng: ' + seo.errors.join(' '))) continue; }
    if (strict && seo.warnings.length) { if (rejectOrFail(d, 'Bản thảo "' + String(d.title || d.slug || '?') + '" chưa đạt chuẩn SEO (--strict): ' + seo.warnings.join(' '))) continue; }
    if (seo.warnings.length) console.log('CẢNH BÁO SEO "' + String(d.title || '') + '": ' + seo.warnings.join(' | '));
    const htmlPath = path.join(baiVietDir, slug + '.html');
    const url = BASE_URL + '/' + page;
    if (!force && !isRepublish && fs.existsSync(htmlPath)) { if (rejectOrFail(d, 'File đã tồn tại: ' + page + ' (bản đăng lại cần trường page trong JSON, hoặc dùng --force để ghi đè).')) continue; }
    if (!force && !isRepublish && newDataLines.join('\n').includes('"page": "' + page + '"')) {
      if (rejectOrFail(d, 'data.js đã có mục page "' + page + '" (bản đăng lại cần trường page trong JSON, hoặc dùng --force để đăng lại).')) continue;
    }
    if (!force && !isRepublish && newSitemap.includes('<loc>' + url + '</loc>')) {
      if (rejectOrFail(d, 'sitemap.xml đã có URL "' + url + '" (bản đăng lại cần trường page trong JSON, hoặc dùng --force để đăng lại).')) continue;
    }
    jobs.push({ d, slug, htmlPath, page, url, isRepublish });
  }
  // GĐ4b: ghi file lý do từ chối (append nếu file đã có — cron gọi
  // script nhiều lần trong 1 lượt vẫn gom đủ lý do cho mọi bản thảo).
  if (rejections.length && rejectionsOut && !dryRun) {
    try {
      const outPath = path.resolve(rejectionsOut);
      fs.mkdirSync(path.dirname(outPath), { recursive: true });
      let prev = [];
      if (fs.existsSync(outPath)) {
        try { const old = JSON.parse(fs.readFileSync(outPath, 'utf8')); if (Array.isArray(old)) prev = old; } catch (e) { prev = []; }
      }
      fs.writeFileSync(outPath, JSON.stringify(prev.concat(rejections), null, 2), 'utf8');
    } catch (e) { console.error('CẢNH BÁO: không ghi được file rejections-out: ' + e.message); }
  }
  if (rejections.length) console.log('BỊ TỪ CHỐI: ' + rejections.length + ' bản thảo' + (rejectionsOut ? ' — lý do trong ' + rejectionsOut : ' (không có --rejections-out nên không ghi file).'));
  if (!jobs.length && rejections.length) {
    console.log('Không có bài nào được đăng.');
    process.exit(1);
  }
  for (const j of jobs) {
    const html = renderArticleHtml(j.d);
    console.log((dryRun ? '[dry-run] Sẽ tạo: ' : 'Tạo: ') + j.page + ' (' + html.length + ' ký tự)');
    if (!dryRun) fs.writeFileSync(j.htmlPath, html, 'utf8');
    console.log((dryRun ? '[dry-run] Sẽ thêm vào js/data.js: ' : 'Thêm vào js/data.js: ') + j.d.title);
    console.log((dryRun ? '[dry-run] Sẽ thêm vào sitemap.xml: ' : 'Thêm vào sitemap.xml: ') + j.url);
    made += 1;
  }
  if (!dryRun && jobs.length) {
    // GĐ4b: đăng lại (--force hoặc bản có d.page): gỡ mục data.js +
    // URL sitemap cũ của bài đó TRƯỚC khi chèn mục mới — tránh trùng.
    for (const j of jobs) {
      if (force || j.isRepublish) {
        const r1 = removeArticleEntry(newDataLines, j.page);
        if (r1.removed) newDataLines = r1.lines;
        const r2 = removeSitemapUrl(newSitemap.split('\n'), j.url);
        if (r2.removed) newSitemap = r2.lines.join('\n');
      }
    }
    // Chèn các mục data.js ngay trước dòng đóng mảng articles.
    // Dòng trước đó là mục cuối: nếu chưa có dấu phẩy thì thêm dấu phẩy.
    // (Tìm lại dòng đóng vì chỉ số có thể đã lệch sau khi gỡ mục cũ.)
    const arr2 = findArticlesArray(newDataLines);
    if (!arr2) fail('Không tìm thấy mảng "articles" trong js/data.js sau khi gỡ mục cũ.');
    const closeIdx = arr2.close;
    const prevIdx = closeIdx - 1;
    // v233-drafts 14/11/2026: mục cuối có thể là object MỘT DÒNG (vd pipeline bài
    // báo hằng ngày ghi {"title":...} trên 1 dòng, kết thúc bằng "}" không phẩy).
    // Trước đây chỉ xử lý dòng trim đúng "}" (object nhiều dòng) nên chèn sau
    // object một dòng tạo data.js lỗi cú pháp, deploy v233-drafts làm live
    // js/data.js parse lỗi. Xử lý chung: dòng trước kết thúc bằng "}" mà chưa
    // có phẩy thì thêm phẩy — đúng cho cả object một dòng lẫn nhiều dòng.
    const prevTrim = newDataLines[prevIdx] ? newDataLines[prevIdx].trim() : '';
    if (prevTrim.endsWith('},')) {
      // Mục cuối đã có dấu phẩy — chèn thẳng.
    } else if (prevTrim.endsWith('}')) {
      newDataLines[prevIdx] = newDataLines[prevIdx] + ',';
    }
    const entries = jobs.map((j) => dataJsEntry(j.d) + ',').join('\n');
    newDataLines.splice(closeIdx, 0, entries);
    fs.writeFileSync(dataJsPath, newDataLines.join('\n'), 'utf8');
    // Chèn URL vào sitemap ngay trước </urlset>.
    const smLines = newSitemap.split('\n');
    const closeSm = smLines.findIndex((l) => l.trim() === '</urlset>');
    if (closeSm < 0) fail('Không tìm thấy </urlset> trong sitemap.xml.');
    // v396-seo-lastmod 23/11/2026: sitemap phải có <lastmod> (ISO YYYY-MM-DD)
    // từ publish_date của bản thảo — Google dùng lastmod để ưu tiên thu thập
    // lại; sitemap cũ 637 URL không có lastmod nào nên Google không biết
    // trang nào mới. publish_date không đúng định dạng ISO thì bỏ qua
    // lastmod thay vì ghi sai.
    const smEntries = jobs.map((j) => {
      const lm = String(j.d.publish_date || '').trim().slice(0, 10);
      const lmTag = /^\d{4}-\d{2}-\d{2}$/.test(lm) ? '<lastmod>' + lm + '</lastmod>' : '';
      return '  <url><loc>' + j.url + '</loc>' + lmTag + '</url>';
    }).join('\n');
    smLines.splice(closeSm, 0, smEntries);
    fs.writeFileSync(sitemapPath, smLines.join('\n'), 'utf8');
  }
  console.log('Xong: ' + made + ' bài' + (dryRun ? ' (dry-run, chưa ghi file).' : '.'));
  console.log('Bước tiếp theo: kiểm tra file sinh ra, chạy test suite, rồi deploy. Sau deploy, gọi RPC admin_mark_article_published cho từng bản thảo để đánh dấu đã đăng.');
}

if (import.meta.url === 'file://' + process.argv[1] || process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
