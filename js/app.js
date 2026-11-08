/* v20 app: render cards / detail / filters / pagination from window.V20_DATA.
   Rules ported from v19-fix2:
   - Every <article> gets all attributes INSIDE its opening tag (never after a closing div).
   - Real photos are embedded directly in the HTML string for the 18 profiles that have one;
     the other 2 (th-04, th-10 — no retrievable public photo) keep a placeholder glyph,
     never a fabricated photo. photoSrc says where a photo came from: "post" (the model's
     own public post) or "profile" (the model's public Facebook profile picture).
   - Visible text never contains an internal id (th-xx): ids live only in data and in ?id= URLs.
   - Contact rule (v26, user-approved 2026-11-05 13:26, spec §8, audit contact-audit-v26.md):
     `contacts` in data.js holds ONLY items the model/shop published themselves in
     their public post or on their public channel, each with source_url. Those are
     rendered in full (Zalo as zalo.me link, phone as tel: link, email as mailto:,
     Facebook/TikTok/Shopee as external links) with the note "Các bên chủ động liên
     hệ trao đổi, thông tin là công khai." and the CHƯA XÁC NHẬN label + removal
     request. Anything not in `contacts` (no public source) is never rendered —
     no private phone/Zalo/email is ever shown, invented or guessed. */
(function(){
'use strict';
var D = window.V20_DATA || {models:[], articles:[], provinces:[], categories:[]};
var PH = window.V20_PHOTOS || {};
function esc(s){return String(s==null?'':s).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]});}
function clean(s){return String(s||'').replace(/\s*·\s*$/,'').trim() || 'Chưa cập nhật';}
function photoHTML(m, cls){
  if(m.photoUrl) return '<img src="'+esc(m.photoUrl)+'" alt="'+(m.photoSrc==='profile' ? 'Ảnh đại diện công khai của ' : 'Ảnh thật từ bài gốc của ')+esc(m.name)+'" loading="lazy" decoding="async">';
  // v101: the rut gon 5 cot — mau khong anh hien tinh tim viec trong o anh
  // thay cho icon 👤 (chi khi goi voi cls='compact', tuc the danh sach;
  // the mini o trang chi tiet + anh lon o trang chi tiet giu 👤).
  if(cls === 'compact' && hasReal(m.province)) return '<span class="card-compact-noimg" aria-hidden="true"><span>📍 '+esc(m.province)+'</span></span>';
  return '<span class="ph-holder" aria-hidden="true">👤</span>';
}
function photoNote(m){return m.photoUrl ? (m.photoSrc==='profile' ? 'Ảnh đại diện công khai' : 'Ảnh thật từ bài gốc') : (m.photoHas ? 'Có ảnh trong bài gốc' : 'Ảnh minh họa tạm — chưa phải ảnh thật');}
/* v28 — thẻ 5 giây (thiết kế 2026-11-05, design-2026-11-05-the-ho-so-5-giay.md):
   Mặt thẻ CHỈ render hàng có giá trị thật. Hàng nào là "Chưa cập nhật" hoặc
   rỗng thì không render — không hiện tiêu đề hàng kèm chữ chiếm chỗ. Lương
   "Thỏa thuận" không phải một hàng: nó thành 1 chip xám "Lương thỏa thuận"
   cạnh tag lĩnh vực. "Doanh thu cao nhất" rời khỏi mặt thẻ cho tới khi có
   hồ sơ có số thật (hiện tại 0/20, nên chưa thẻ nào hiện hàng này); khi mẫu
   tự đăng ký nhập được doanh thu đã kiểm chứng thì hàng tự xuất hiện lại,
   không cần sửa code. Không suy ra nhãn mới từ dữ liệu cũ (không chip
   "khung vàng", "còn trống 11.11"); không hiện lượt xem/bình luận (đang
   0/0). Trang chi tiết GIỮ NGUYÊN bảng đầy đủ 4 hàng kể cả "Chưa cập nhật"
   (initDetail không chạm tới đây) — chỉ dọn mặt thẻ, không giấu thông tin. */
function hasReal(v){ var s = String(v==null?'':v).trim(); return s !== '' && s !== 'Chưa cập nhật'; }
/* v99 (§1b/§1c dac ta the rut gon + sao len top): quy tac hien thi
   2 dong duoi anh cho ca 5 loai the. Cac ham *Line tra ve HTML AN TOAN
   (chu da esc, hoac link <a> "Chi tiet") — noi goi dung truc tiep,
   KHONG esc them. Diem chung: thieu dia diem thi dong 1 gan link nguon
   kem chu "Chi tiet" (khong ghi chung chung); fallback "Thoa thuan"
   chi cho dong 2 (luong shop, mat hang xuong). */
var CAT_LABELS = {'quan-ao':'Quần áo','nam':'Nam','nu':'Nữ','tre-em':'Trẻ em','giay-dep':'Giày dép','my-pham':'Mỹ phẩm','phu-kien':'Phụ kiện','tpcn':'TPCN','gia-dung':'Gia dụng & Đời sống','idol':'Idol / Streamer','cong-nghe':'Công nghệ','khac':'Khác','toan-bo-cua-hang':'Toàn bộ cửa hàng','sang-mat-bang':'Sang mặt bằng','hang-ton-kho':'Hàng tồn kho'};
function catLabel(code){ var s = String(code==null?'':code).trim(); return CAT_LABELS[s] || s; }
function sourceDetailLink(url){ var u = String(url||'').trim(); if(!u) return 'Chi tiết'; return '<a class="card-line-link" href="'+esc(u)+'" target="_blank" rel="noopener">Chi tiết</a>'; }
// v99: tim tinh/thanh trong chuoi tu do (tieu de/meta lo) — khop ten dai
// nhat trong D.provinces; chi dung cho lo (khong co truong prov rieng).
// 'TP.HCM' la cach viet tat pho bien trong bai goc (khong co trong
// D.provinces) nen them alias hien dung nhu trong nguon.
function findProvinceInText(text){
  var t = String(text||''); if(!t) return '';
  var best = '';
  (D.provinces||[]).forEach(function(p){ if(p && t.indexOf(p) >= 0 && p.length > best.length) best = p; });
  if(!best && t.indexOf('TP.HCM') >= 0) best = 'TP.HCM';
  return best;
}
function modelFields(m){
  // Cac linh vuc cua ho so: uu tien mang fields (neu co), roi cat don,
  // roi chuoi tu do desired_product_types (ho so tu dang ky).
  var out = [];
  var push = function(v){ String(v||'').split(',').forEach(function(x){ var s = x.trim(); if(s && out.indexOf(s) < 0) out.push(s); }); };
  if(m && m.fields && m.fields.length) m.fields.forEach(push);
  else { push(m && m.cat); push(m && m.desired_product_types); }
  return out;
}
function modelFieldLine(m){
  var pri = m && (m.priority_field || m.priorityField);
  if(hasReal(pri)) return esc(catLabel(pri));
  var fs = modelFields(m);
  if(!fs.length) return 'Nhiều lĩnh vực';
  if(fs.length === 1) return esc(catLabel(fs[0]));
  return 'Live được ' + fs.length + ' lĩnh vực';
}
function modelLocationLine(m){
  if(m && hasReal(m.province)) return esc(m.province);
  return sourceDetailLink(m && m.src);
}
function shopLocationLine(s){
  if(s && hasReal(s.province)){
    var loc = esc(s.province);
    if(s.district && s.district !== 'Chưa cập nhật') loc += ' — ' + esc(s.district);
    return loc;
  }
  return sourceDetailLink(s && s.src);
}
function shopSalaryLine(s){
  if(s && hasReal(s.salary)) return esc(s.salary);
  return 'Thoả thuận';
}
function lotLocationLine(l){
  var p = findProvinceInText((l && l.title ? l.title + ' ' : '') + (l && l.meta ? l.meta : ''));
  if(p) return esc(p);
  return sourceDetailLink(l && l.url);
}
function lotValueLine(l){
  if(l && typeof l.priceNum === 'number' && typeof l.qty === 'number' && l.qty > 0) return fmtVnd(l.priceNum * l.qty) + 'đ';
  if(l && hasReal(l.cat)) return esc(catLabel(l.cat));
  if(l && typeof l.qty === 'number' && l.qty > 0) return fmtVnd(l.qty) + ' cái';
  return 'Chưa cập nhật';
}
function factoryLocationLine(f){
  if(f && hasReal(f.prov)) return esc(f.prov);
  return sourceDetailLink(f && f.url);
}
function factoryItemsLine(f){
  var items = String((f && f.items) || '').split(',');
  var first = items.length ? items[0].trim() : '';
  if(first) return esc(first);
  return 'Thoả thuận';
}
function kiotLocationLine(k){
  if(k && hasReal(k.prov)) return esc(k.prov);
  return sourceDetailLink(k && k.url);
}
function kiotTypeLine(k){
  if(k && hasReal(k.cat)) return esc(catLabel(k.cat));
  return sourceDetailLink(k && k.url);
}
/* v85 (M1 đã chạy 13:57 07/11, 3 cột highest_revenue_*): doanh thu chỉ
   tính/hiển thị khi đã xác minh (highest_revenue_verified = true) và có
   số (highest_revenue_amount > 0). Số tự khai chưa xác minh, số trong
   chuỗi topRevenue cũ và "Chưa cập nhật" đều không tính — không bịa số,
   không hiện số tự khai như số đã xác minh. Dữ liệu tĩnh data.js chưa có
   hồ sơ nào có số đã xác minh nên hiện tại mọi nơi vẫn hiện "Chưa cập
   nhật" như trước; khi mẫu tự đăng ký nhập số + admin xác minh thì số tự
   hiện, không cần sửa code. */
function verifiedRevenue(m){
  if(m && m.highest_revenue_verified === true && typeof m.highest_revenue_amount === 'number' && m.highest_revenue_amount > 0) return m.highest_revenue_amount;
  return null;
}
function revenueText(m){
  var v = verifiedRevenue(m);
  if(v === null) return 'Chưa cập nhật';
  var note = hasReal(m.highest_revenue_note) ? ' (' + String(m.highest_revenue_note).trim() + ')' : '';
  return fmtVnd(v) + 'đ' + note;
}
function isNegotiableSalary(m){ return String(m.salary||'').trim() === 'Thỏa thuận'; }
/* v37: ALWAYS render all decision boxes, even when a value is missing
   (shown muted as "Chưa cập nhật"). Hiding empty values made the inner blocks
   start at different heights in every row (same root cause as the shop cards,
   visual QA 05/11). */
function decisionHTML(m){
  var sal = (hasReal(m.salary) && !isNegotiableSalary(m)) ? esc(m.salary) : (isNegotiableSalary(m) ? 'Thỏa thuận' : 'Chưa cập nhật');
  var sch = hasReal(m.schedule) ? esc(m.schedule) : 'Chưa cập nhật';
  var rev = esc(revenueText(m));
  var exp = hasReal(m.exp) ? esc(m.exp) : 'Chưa cập nhật';
  var miss = function(v){ return v === 'Chưa cập nhật' ? ' muted' : ''; };
  return '<div class="decision">'
  + '<div class="decision-row">'
  + '<div class="decision-item"><span class="decision-label">💰 Lương</span><b class="decision-value'+miss(sal)+'">'+sal+'</b></div>'
  + '<div class="decision-item"><span class="decision-label">🕒 Lịch</span><span class="decision-value'+miss(sch)+'">'+sch+'</span></div>'
  + '</div>'
  + '<div class="decision-row"><div class="decision-item"><span class="decision-label">📈 Doanh thu cao nhất</span><b class="decision-value'+miss(rev)+'">'+rev+'</b></div></div>'
  + '<div class="decision-exp"><span class="decision-label">Kinh nghiệm</span><span class="decision-value'+miss(exp)+'">'+exp+'</span></div>'
  + '</div>';
}
/* v40: dong mien tru trach nhiem o cuoi moi the mau/shop (yeu cau nguoi dung
   toi 05/11/2026, ban viet lai da chot) — dat sau nut hanh dong, o day the. */
var DISCLAIMER = 'Miễn trừ trách nhiệm: Thông tin được tổng hợp từ bài đăng công khai của cộng đồng, giữ nguyên nội dung gốc. Thông tin liên hệ hiển thị để các bên tự trao đổi công việc trực tiếp với nhau. Ver2Solution không thu bất kỳ phí dịch vụ nào — đây chỉ là trang cộng đồng kết nối.';
/* v42: dong huong dan chu so huu o cuoi moi the (yeu cau nguoi dung 06/11/2026),
   ngay DUOI .disclaimer, la phan tu cuoi cung cua the. Khop quy tac so huu ho
   so chot 05/11/2026 23:38: chi chu ho so dang ky tai khoan, khop thong tin
   lien he moi duoc sua/huy ho so — dong nay huong dan chu ho so cach sua
   (dang ky/dang nhap) hoac go (lien he Zalo). Link dang ky/dang nhap dung loai:
   the mau -> danh-sach-mau.html#dang-nhap-mau, the shop ->
   danh-sach-shop.html#dang-nhap-shop (duong dan tuong doi day du de link dung
   tu moi trang: trang chu, trang danh sach, trang chi tiet).
   v85: link "Đăng ký" tro dung trang dang ky RIENG dang-ky.html (kem
   ?type= theo loai the); link "Đăng nhập" giu neo muc dang nhap tren
   trang danh sach (form dang nhap nhanh tai cho, van hoat dong). */
function ownerNoteHTML(kind){
  var type = kind === 'shop' ? 'shop' : 'model';
  var loginHref = kind === 'shop' ? 'danh-sach-shop.html#dang-nhap-shop' : 'danh-sach-mau.html#dang-nhap-mau';
  return '<p class="owner-note"><a href="dang-ky.html?type='+type+'">Đăng ký</a> &gt; <a href="'+loginHref+'">Đăng nhập</a> để sửa hồ sơ này, hoặc liên hệ <a href="https://zalo.me/0329983699" target="_blank" rel="noopener">Zalo</a> để được gỡ bỏ.</p>';
}
/* ---- Điểm thưởng v2 (GĐ2, 07/11/2026) — nút thích/chia sẻ, ghim, xếp ghim ----
   Xem goals/.../diem-thuong-v2-2026-11-07.md. Client chỉ gọi RPC M7 qua
   window.Ver2Reward (awardInteraction / pinPost / getMyPointsBalance);
   RPC chưa có thì nút báo "chưa bật", không vỡ trang. Khách vãng lai: 0 điểm,
   bấm nút chỉ thấy ghi chú đăng nhập. */
function pointsButtonsHTML(targetType, targetId){
  return '<span class="v2s-points-row" data-v2s-target-type="'+esc(targetType)+'" data-v2s-target-id="'+esc(targetId)+'">'
  + '<button class="btn btn-ghost btn-sm" type="button" data-v2s-like>👍 Thích · +10</button>'
  + '<button class="btn btn-ghost btn-sm" type="button" data-v2s-share>↗ Chia sẻ · +20</button>'
  + '<button class="btn btn-ghost btn-sm" type="button" data-v2s-pin>📌 Ghim lên top</button>'
  + '<span class="v2s-points-msg" role="status"></span></span>';
}
function articleRef(a){
  var h = articleHref(a) || '';
  var parts = String(h).split('/');
  return parts[parts.length - 1] || h;
}
// v92 (BUG-14): nút Thích phải đổi trạng thái NGAY sau khi bấm — đổi nhãn
// thành "👍 Đã thích", thêm class v2s-liked, vô hiệu nút (không bấm lặp
// trong cùng lượt render). Chỉ gọi khi RPC awardInteraction đã trả ok.
function markLiked(btn){
  try {
    if (!btn) return;
    if (btn.classList && btn.classList.add) btn.classList.add('v2s-liked');
    btn.textContent = '👍 Đã thích';
    btn.disabled = true;
    if (btn.setAttribute) btn.setAttribute('aria-pressed', 'true');
  } catch (e) {}
}
/* v99 (§2 dac ta sao len top): sao = xep hang cong khai, KHONG cong
   diem, ai cung an duoc (khac nut Thich +10 diem, chi tai khoan).
   - Gioi han 1 sao / 1 ho so / 1 phien an danh / 1 ngay (khach) hoac
     1 sao / 1 tai khoan / 1 ngay (da dang nhap): server kiem tra qua
     RPC star_profile; client them lop chan dia phuong (localStorage)
     de nut hien "da sao" ngay ca khi tai lai trang.
   - Tang sao 60 phut: last_starred_at trong 60 phut -> xep truoc theo
     so sao giam dan, roi theo thoi gian an sao gan nhat giam dan;
     het 60 phut rot ve thu tu mac dinh. Chi ap dung tang sao cho
     grid mau (initList) + grid shop (initShops) — 2 grid render lai
     duoc an toan; lo/xuong/kiot chi hien nut sao + so sao (grid cua
     chung duoc bo loc chup lai luc khoi tao nen khong render lai). */
var STAR_STORE_KEY = 'v2s_stars_v1';
var STAR_STATS = {}; // id -> {count, last} (nap tu profile_star_stats)
var STAR_WINDOW_MS = 60 * 60 * 1000;
function starStoreRead(){
  try { var raw = (typeof localStorage !== 'undefined') ? localStorage.getItem(STAR_STORE_KEY) : null; return raw ? JSON.parse(raw) : {}; } catch (e) { return {}; }
}
function starStoreWrite(map){
  try { if (typeof localStorage !== 'undefined') localStorage.setItem(STAR_STORE_KEY, JSON.stringify(map)); } catch (e) {}
}
function starKey(type, id){ return String(type || '') + ':' + String(id || ''); }
function starTodayStr(d){ d = d || new Date(); var y = d.getFullYear(), m = ('0' + (d.getMonth() + 1)).slice(-2), dd = ('0' + d.getDate()).slice(-2); return y + '-' + m + '-' + dd; }
function starredToday(type, id, today){
  var map = starStoreRead();
  return map[starKey(type, id)] === (today || starTodayStr());
}
function markStarredToday(type, id){
  var map = starStoreRead(); map[starKey(type, id)] = starTodayStr(); starStoreWrite(map);
}
function starCountOf(id){ var s = STAR_STATS[id]; return (s && typeof s.count === 'number') ? s.count : 0; }
function starButtonHTML(targetType, targetId){
  var count = starCountOf(targetId);
  var done = starredToday(targetType, targetId);
  return '<button class="v2s-star-btn' + (done ? ' starred' : '') + '" type="button" data-star-type="' + esc(targetType) + '" data-star-id="' + esc(targetId) + '" data-star-count="' + count + '"' + (done ? ' disabled' : '') + ' aria-label="Ấn sao để đưa hồ sơ này lên top 60 phút">★ <span class="v2s-star-count">' + count + '</span></button>';
}
function starTierOf(item, stats, now){
  var s = stats && item && stats[item.id];
  if(!s || !s.last) return 0;
  var t = Date.parse(s.last);
  if(!isFinite(t)) return 0;
  return (now - t) < STAR_WINDOW_MS ? 1 : 0;
}
function applyStarOrder(list, stats, now){
  // On dinh (stable): tang 1 truoc (sao giam dan, moi nhat truoc),
  // tang 0 giu nguyen thu tu goc.
  var n = (now == null) ? Date.now() : now;
  var tier1 = [], tier0 = [];
  (list || []).forEach(function(it){ (starTierOf(it, stats, n) === 1 ? tier1 : tier0).push(it); });
  tier1.sort(function(a, b){
    var sa = stats[a.id] || {}, sb = stats[b.id] || {};
    var dc = (sb.count || 0) - (sa.count || 0);
    if(dc) return dc;
    return Date.parse(sb.last || 0) - Date.parse(sa.last || 0);
  });
  return tier1.concat(tier0);
}
function refreshStarCounts(){
  if(typeof document === 'undefined' || !document.querySelectorAll) return;
  var btns = document.querySelectorAll('.v2s-star-btn');
  for(var i = 0; i < btns.length; i++){
    var b = btns[i], id = b.getAttribute('data-star-id'), ty = b.getAttribute('data-star-type');
    var c = starCountOf(id);
    if(b.setAttribute) b.setAttribute('data-star-count', String(c));
    var n = (b.querySelector) ? b.querySelector('.v2s-star-count') : null; if(n) n.textContent = String(c);
    if(starredToday(ty, id)){ if(b.classList) b.classList.add('starred'); b.disabled = true; }
  }
}
function fetchStarStats(){
  // Nap bang dem sao cong khai; loi (migration chua chay) -> {} im lang.
  var M = (typeof window !== 'undefined') ? window.McLivestreamAPI : null;
  if(!M || typeof M.fetchStarStats !== 'function') return Promise.resolve({});
  return M.fetchStarStats().then(function(rows){
    var map = {};
    (rows || []).forEach(function(r){ if(r && r.profile_id) map[r.profile_id] = {count: Number(r.star_count) || 0, last: r.last_starred_at || null}; });
    STAR_STATS = map;
    return map;
  }, function(){ return {}; });
}
function starClick(btn, api){
  // Bam sao: lac quan +1 ngay + vo hieu nut, goi RPC, that bai thi hoan lai.
  // api mac dinh = window.McLivestreamAPI (test truyen api gia).
  if(!btn) return Promise.resolve(null);
  var type = btn.getAttribute ? btn.getAttribute('data-star-type') : null;
  var id = btn.getAttribute ? btn.getAttribute('data-star-id') : null;
  if(!type || !id) return Promise.resolve(null);
  if(starredToday(type, id)) return Promise.resolve(null);
  var A = api || ((typeof window !== 'undefined') ? window.McLivestreamAPI : null);
  if(!A || typeof A.starProfile !== 'function'){
    if(btn.setAttribute) btn.setAttribute('title', 'Chưa kết nối được, thử lại sau.');
    return Promise.resolve(null);
  }
  var before = starCountOf(id);
  var beforeLast = (STAR_STATS[id] && STAR_STATS[id].last) || null;
  STAR_STATS[id] = {count: before + 1, last: new Date().toISOString()};
  if(btn.classList) btn.classList.add('starred');
  btn.disabled = true;
  refreshStarCounts();
  return A.starProfile(type, id).then(function(count){
    STAR_STATS[id] = {count: Number(count) || before + 1, last: new Date().toISOString()};
    markStarredToday(type, id);
    refreshStarCounts();
    return STAR_STATS[id].count;
  }, function(err){
    var msg = String((err && err.message) || err || '');
    if(/already_starred_today/i.test(msg)){
      markStarredToday(type, id);
      refreshStarCounts();
      return starCountOf(id);
    }
    STAR_STATS[id] = {count: before, last: beforeLast};
    if(btn.classList) btn.classList.remove('starred');
    btn.disabled = false;
    refreshStarCounts();
    if(btn.setAttribute) btn.setAttribute('title', 'Chưa gửi được sao, thử lại sau.');
    return null;
  });
}
function initStars(){
  if(typeof document === 'undefined' || !document.addEventListener) return;
  // Uy thac click: the render dong (phan trang/loc) khong can gan lai.
  document.addEventListener('click', function(e){
    var t = e && e.target;
    if(!t) return;
    var btn = (t.closest && t.closest('.v2s-star-btn')) || null;
    if(!btn) return;
    e.preventDefault();
    starClick(btn);
  });
  // Nap so sao roi cap nhat so hien thi + sap xep lai grid mau/shop
  // (chi khi co sao trong 60 phut — khong thi giu nguyen thu tu).
  fetchStarStats().then(function(map){
    refreshStarCounts();
    var hasRecent = false, now = Date.now();
    Object.keys(map).forEach(function(k){ if(starTierOf({id: k}, map, now) === 1) hasRecent = true; });
    if(!hasRecent) return;
    try {
      if(typeof modelGridRender === 'function'){
        var p = params(); var pg = parseInt(p.page || '1', 10) || 1;
        modelGridRender(pg);
      }
    } catch (e) {}
    try {
      var shopEl = document.getElementById('publicShopsList');
      if(shopEl && typeof shopEl._shopRender === 'function'){
        var p2 = params(); var pg2 = parseInt(p2.page || '1', 10) || 1;
        shopEl._shopRender(pg2);
      }
    } catch (e) {}
  });
}
function cardHTML(m, opts){
  // v99 (§1): the rut gon — anh 46/51 + ten overlay cuoi anh + dung
  // 2 dong (noi tim viec, linh vuc) + nut sao. Luong/gio lam/luot xem/
  // binh luan/danh gia/lien he/diem chi con o trang chi tiet (ho-so.html).
  // opts (v63: zaloHref/demoUrl) duoc giu de tuong thich nhung khong
  // con dung tren the danh sach. data-gender mang "" khi khong ro gioi
  // tinh (v28) — chu placeholder khong bao gio vao DOM.
  opts = opts || {};
  return '<article class="card card-compact" data-v2s-id="'+esc(m.id)+'" data-province="'+esc(m.province)+'" data-cat="'+esc(m.cat)+'" data-gender="'+esc(hasReal(m.gender)?m.gender:'')+'" data-views="'+m.views+'" data-comments="'+m.comments+'">'
  + '<a class="card-compact-photo" href="ho-so.html?id='+esc(m.id)+'">'+photoHTML(m, 'compact')+'<span class="card-compact-name">'+esc(m.name)+'</span></a>'
  + starButtonHTML('model_profile', m.id)
  + '<div class="card-compact-lines"><p class="card-compact-line">'+modelLocationLine(m)+'</p><p class="card-compact-line">'+modelFieldLine(m)+'</p></div>'
  + '</article>';
}
function miniHTML(m){
  return '<article class="mini"><div class="mini-photo">'+photoHTML(m)+'</div><div class="mini-body"><h3><a data-track="xem-ho-so" href="ho-so.html?id='+esc(m.id)+'">'+esc(m.province)+' — '+esc(m.name)+'</a></h3>'
  + '<p>'+esc(m.title)+'</p><p>📍 '+esc(m.province)+' · '+esc(m.cat)+'</p><p>Lương: '+esc(m.salary)+'</p><p>'+esc(m.exp)+'</p></div></article>';
}
/* Contacts (v26, spec §8): render ONLY the audited `contacts` array from data.js.
   Every value is escaped before render (AGENTS.md §1.7). Zalo numbers are
   10-digit strings already normalised in data.js; the link is always zalo.me,
   never a bare number. Items with no public source simply do not exist in
   `contacts`, so they are never rendered and never shown as "Chưa cập nhật". */
var CONTACT_NOTE = 'Các bên chủ động liên hệ trao đổi, thông tin là công khai.';
function defaultContactLabel(p){
  return {facebook:'Facebook', zalo:'Zalo', phone:'Số điện thoại', email:'Email', tiktok:'TikTok', shopee:'Shopee', threads:'Threads'}[p] || 'Liên hệ';
}
function digitsOnly(v){ return String(v||'').replace(/\D/g,''); }
function contactHref(c){
  if(c.provider==='zalo') return 'https://zalo.me/'+digitsOnly(c.value);
  if(c.provider==='phone') return 'tel:'+digitsOnly(c.value);
  if(c.provider==='email') return 'mailto:'+c.value;
  return c.value; // facebook / tiktok / shopee / threads: full public URL
}
function contactItemHTML(c, trackAttr){
  var label = esc(c.label || defaultContactLabel(c.provider));
  var href = esc(contactHref(c));
  var ext = (c.provider==='facebook'||c.provider==='tiktok'||c.provider==='shopee'||c.provider==='threads') ? ' target="_blank" rel="noopener"' : '';
  // v99: nut Zalo doi tu the danh sach sang khoi lien he cua trang chi tiet —
  // giu event analytics tren chinh link Zalo do (trackAttr = 'data-track="nhan-zalo-mau"' hoac '...-shop').
  var tr = (trackAttr && (c.provider==='zalo' || c.provider==='phone')) ? ' ' + trackAttr : '';
  if(c.provider==='facebook'||c.provider==='tiktok'||c.provider==='shopee'||c.provider==='threads'){
    return '<li><a href="'+href+'"'+ext+'>'+label+'</a></li>';
  }
  return '<li>'+label+': <a'+tr+' href="'+href+'"'+ext+'>'+esc(c.value)+'</a></li>';
}
function contactsBlockHTML(contacts, trackAttr){
  if(!contacts || !contacts.length) return '';
  return '<ul class="contact-list">'+contacts.map(function(c){ return contactItemHTML(c, trackAttr); }).join('')+'</ul>';
}
/* Điểm v2 (GĐ2, 20:22 07/11): xem liên hệ 1 hồ sơ = 5 điểm/lần bấm (1 lần/
   ngày/hồ sơ). contactsBlockHTML() giữ nguyên (render danh sách đầy đủ,
   dùng sau khi đã trả điểm + test cũ); hàm này bọc nó trong khối ẩn + nút
   "Xem liên hệ". LƯU Ý: số liên hệ vẫn nằm trong js/data.js công
   khai nên đây là cửa thu điểm ở giao diện, không phải kiểm soát truy cập
   thật — xem spec §12. Nút bấm được xử lý tập trung trong initPointsUI.
   v92 (08/11/2026): xem liên hệ TẠM MIỄN PHÍ (cờ V20_FREE_SERVICES ở
   js/reward.js) — nhãn nút bỏ "(5 điểm)", bấm hiện ngay không trừ điểm;
   code trừ điểm giữ nguyên để mở lại chỉ bằng 1 cờ. */
function gatedContactsHTML(targetType, targetId, contacts){
  if(!contacts || !contacts.length) return '';
  var trackAttr = targetType==='model_profile' ? 'data-track="nhan-zalo-mau"' : 'data-track="nhan-zalo-shop"';
  return '<div class="v2s-contacts-gated" data-v2s-target-type="'+esc(targetType)+'" data-v2s-target-id="'+esc(targetId)+'">'
  + '<div class="v2s-contacts-hidden" hidden>'+contactsBlockHTML(contacts, trackAttr)+contactNoteHTML()+'</div>'
  + '<p><button class="btn btn-ghost btn-sm" type="button" data-v2s-view-contact>👁 Xem liên hệ</button> <span class="v2s-contact-msg" role="status"></span></p></div>';
}
function contactNoteHTML(){ return '<p class="contact-note">'+CONTACT_NOTE+'</p>'; }
/* Shops (v22): tin tuyển công khai thu thập từ bài tuyển shop tự đăng.
   v26: 3 shops have a verified real logo (images-shop/; FANI square = cover,
   Chạm Loa + Mylan transparent/wide = contain on white, never cropped).
   The other 21 keep the initial-letter placeholder. Contact block + Notes
   (spec §8.3) show ONLY the audited public contacts; a shop with no public
   number/email shows no Zalo/phone/email line at all. No private phone/Zalo/
   address, no fabricated fanpage link, no Thế Giới Giấy content for Mylan. */
function shopInitial(s){ return (String(s.name||'?').trim().charAt(0)||'?').toUpperCase(); }
function shopLogoHTML(s, compact){
  // v101: the rut gon 5 cot — shop khong logo hien ten san pham ban trong
  // o anh thay cho chu cai dau (chi khi goi voi compact=true, tuc the danh
  // sach; trang chi tiet shop + fallback anh loi giu chu cai dau). Truong
  // product trong hoac 'Chưa cập nhật' thi giu chu cai dau.
  if(!s.logo){
    if(compact && hasReal(s.product)) return '<span class="card-compact-noimg" aria-hidden="true"><span>🛍️ '+esc(s.product)+'</span></span>';
    return '<span class="shop-initial" aria-hidden="true">'+esc(shopInitial(s))+'</span>';
  }
  var fit = s.logoFit==='contain' ? 'shop-logo--contain' : 'shop-logo--cover';
  var init = esc(shopInitial(s));
  return '<img class="shop-logo '+fit+'" src="'+esc(s.logo)+'" alt="Logo '+esc(s.name)+'" loading="lazy" onerror="this.outerHTML=\'<span class=shop-initial>'+init+'</span>\'">';
}
/* Shop decision block (v32, v37): same "5-second card" pattern as decisionHTML
   for models — salary / province / field / channels / requirements up front.
   v37: ALWAYS render all 4 boxes + the requirements box, even when a value is
   missing (shown muted as "Chưa cập nhật"). v32 hid empty values, which made
   the inner blocks start at different heights in every row, so the buttons
   never lined up (visual QA 05/11: e.g. Javata had only a "Tỉnh" box, its
   "Yêu cầu chính" started ~90px higher than its neighbours'). A salary
   starting with "Thỏa thuận" shows "Thỏa thuận" in the box (the grey chip in
   the tags row stays); the full salary text stays on the detail page. */
function shopDecisionHTML(s){
  var sal = hasReal(s.salary) ? esc(s.salary) : 'Chưa cập nhật';
  var prov = hasReal(s.province) ? esc(s.province) : 'Chưa cập nhật';
  var field = hasReal(s.product) ? esc(s.product) : 'Chưa cập nhật';
  var chan = hasReal(s.channels) ? esc(s.channels) : 'Chưa cập nhật';
  var req = hasReal(s.req) ? esc(s.req) : 'Chưa cập nhật';
  var miss = function(v){ return v === 'Chưa cập nhật' ? ' muted' : ''; };
  return '<div class="decision">'
  + '<div class="decision-row">'
  + '<div class="decision-item"><span class="decision-label">💰 Lương</span><b class="decision-value'+miss(sal)+'">'+sal+'</b></div>'
  + '<div class="decision-item"><span class="decision-label">📍 Tỉnh</span><span class="decision-value'+miss(prov)+'">'+prov+'</span></div>'
  + '</div>'
  + '<div class="decision-row">'
  + '<div class="decision-item"><span class="decision-label">🎯 Lĩnh vực livestream</span><span class="decision-value'+miss(field)+'">'+field+'</span></div>'
  + '<div class="decision-item"><span class="decision-label">📺 Kênh livestream</span><span class="decision-value'+miss(chan)+'">'+chan+'</span></div>'
  + '</div>'
  + '<div class="decision-exp"><span class="decision-label">Yêu cầu chính</span><span class="decision-value'+miss(req)+'">'+req+'</span></div>'
  + '</div>';
}
function shopCardHTML(s){
  // v99 (§1c): the shop rut gon — logo/chu cai dau 46/51 + ten overlay
  // + dung 2 dong (noi muon tuyen, muc luong de xuat; thieu luong thi
  // "Thoa thuan") + nut sao. Chi tiet day du chi con o trang chi tiet.
  var url='chi-tiet-shop.html?id='+s.id;
  return '<article class="shop-card card-compact" data-v2s-id="'+esc(s.id)+'">'
  + '<a class="card-compact-photo card-compact-photo--shop" href="'+url+'">'+shopLogoHTML(s, true)+'<span class="card-compact-name">'+esc(s.name)+'</span></a>'
  + starButtonHTML('shop_profile', s.id)
  + '<div class="card-compact-lines"><p class="card-compact-line">'+shopLocationLine(s)+'</p><p class="card-compact-line">'+shopSalaryLine(s)+'</p></div>'
  + '</article>';
}
function sortShopsNewest(list){
  return list.slice().sort(function(a,b){ return (a.date||'')>(b.date||'')?-1:((a.date||'')<(b.date||'')?1:0); });
}
function withPhotoFirst(list){
  // Downloaded real photos first (7), then profiles whose original post has a photo
  // but whose file was not downloaded yet (labelled "Có ảnh trong bài gốc"), then the rest.
  return list.filter(function(m){return m.photoUrl;})
    .concat(list.filter(function(m){return !m.photoUrl && m.photoHas;}))
    .concat(list.filter(function(m){return !m.photoHas;}));
}
/* v64: xoay 3 lan/ngay, moi 8 tieng (cua so 00:00 / 08:00 / 16:00 gio VN).
   Thay the xoay 1 lan/ngay theo day-of-year (v24) — nguoi dung chot 15:37
   ngay 06/11: tat ca khung hien noi dung doi tuong o trang Shop + trang Mau
   deu xoay random 3 lan/ngay. Xoay xay ra TRONG tung tier, nen quy tac
   uu tien (anh that / logo ro) khong bao gio pha: muc van o trong tier cua
   no, chi thu tu trong tier doi sau moi 8 tieng. On dinh trong cung cua so;
   khong doi du lieu hay tieu de. */
function dayOfYear(d){ d = d || new Date(); var start = new Date(d.getFullYear(), 0, 0); return Math.floor((d - start) / 86400000); }
function window8h(d){ d = d || new Date(); return Math.floor((d.getTime() + 7*3600*1000) / (8*3600*1000)); }
function rotateArr(list, offset){ var n = list.length; if(!n) return list.slice(); var k = ((offset % n) + n) % n; return list.slice(k).concat(list.slice(0, k)); }
function photoTier(m){ return m.photoUrl ? 'a' : (m.photoHas ? 'b' : 'c'); }
function rotateWindow(list, tierOf, date){
  var win = window8h(date);
  var tiers = {}, order = [];
  list.forEach(function(m){ var k = tierOf(m); if(!(k in tiers)){ tiers[k] = []; order.push(k); } tiers[k].push(m); });
  var out = [];
  order.forEach(function(k){ out = out.concat(rotateArr(tiers[k], win)); });
  return out;
}
function rotateDaily(list, tierOf, date){ return rotateWindow(list, tierOf, date); }
/* v25 (quy tắc người dùng chốt 2026-11-05 13:17): top 8 trang chủ CHỈ gồm hồ sơ
   có ảnh đại diện thật (photoUrl). Hồ sơ không có ảnh thật không bao giờ vào
   top 8 dù xoay thế nào — kể cả hồ sơ có photoHas nhưng chưa tải được ảnh.
   v64: xoay 3 lần/ngày theo cửa sổ 8 tiếng (giờ VN), ổn định trong cửa sổ;
   xoay trong nhóm có ảnh thật, không đổi dữ liệu hay tiêu đề. Trang danh
   sách vẫn hiện đủ 20. */
function homeTop8(models, date){
  var withPhoto = models.filter(function(m){ return !!m.photoUrl; });
  return rotateArr(withPhoto, window8h(date)).slice(0, 8);
}
/* v64: thu tu mac dinh cua trang Shop: moi nhat truoc, roi xoay 3 lan/ngay
   theo cua so 8 tieng trong tung nhom — shop CO logo that (3 shop: FANI,
   Cham Loa, Mylan) luon len truoc, shop chua co logo xoay sau. Khi nguoi
   dung chon sap xep (luong/gio) thi KHONG xoay, giu dung thu tu sap xep. */
function logoTier(s){ return s.logo ? '0' : '1'; }
function defaultShopOrder(list, date){
  return rotateWindow(sortShopsNewest(list.slice()), logoTier, date);
}
/* v64: xoay the tinh (lo / xuong may) tren trang Shop — the la HTML tinh,
   khong qua JS render. Xoay vong trong tung .lot-grid theo cua so 8 tieng
   (gio VN): 6 the dau (2 hang mac dinh) doi sau moi 8 tieng, nhom lo van
   giu nguyen (khong tron nhom). An toan vi the chi la link, khong co
   listener. Khong lam gi neu trang khong co .lot-grid. */
function rotateStaticGrids(date){
  var win = window8h(date);
  var grids = document.querySelectorAll ? document.querySelectorAll('.lot-grid') : [];
  for(var gi = 0; gi < grids.length; gi++){
    var grid = grids[gi];
    var cards = [];
    for(var ci = 0; ci < grid.children.length; ci++){ cards.push(grid.children[ci]); }
    if(cards.length < 2) continue;
    var k = ((win % cards.length) + cards.length) % cards.length;
    var rotated = cards.slice(k).concat(cards.slice(0, k));
    for(var ri = 0; ri < rotated.length; ri++){ grid.appendChild(rotated[ri]); }
  }
}
/* v64: bo loc cho muc Lo hang xa kho + muc Xuong may (trang Shop). The la
   HTML tinh, loc bang data-attribute tren the:
   - Lo: data-price (VND/cai toi thieu, '' neu khong cong khai),
     data-qty (so mon, ''), data-cat (nam/nu/tre-em/quan-ao/giay-dep/
     my-pham/phu-kien).
   - Xuong: data-moq (so san pham toi thieu, '' neu khong cong khai),
     data-cat (nhu tren + tpcn), data-prov (tinh: TP.HCM/Ha Noi/Binh Duong/
     Nam Dinh/Hung Yen/Dong Nai). Gia tri don xuong hien chua co du lieu gia
     nen dung MOQ lam quy mo don (nho <30 / vua 30-100 / lon >100).
   Quy tac: the thieu du lieu cua 1 tieu chi dang loc thi KHONG khop (an di);
   the khop duoc dua len dau moi grid de quy tac thu gon 2 hang (nth-child)
   van hien dung 6 the khop dau. Khi dang loc, tu mo rong section (bo
   collapsed) + CUON TOI THE KHOP DAU TIEN de xem ket qua ngay; bam Dat lai
   thi tra lai thu tu goc + thu gon lai. */
function inRange(v, key){
  if(key === 'lt20') return v < 20000;
  if(key === '20-50') return v >= 20000 && v <= 50000;
  if(key === '50-100') return v > 50000 && v <= 100000;
  if(key === 'gt100') return v > 100000;
  if(key === 'lt500') return v < 500;
  if(key === '500-1000') return v >= 500 && v <= 1000;
  if(key === '1000-5000') return v > 1000 && v <= 5000;
  if(key === 'gt5000') return v > 5000;
  return true;
}
function lotMatches(card, f){
  if(f.price){
    var p = card.getAttribute('data-price');
    if(p === null || p === '') return false;
    if(!inRange(parseInt(p, 10), f.price)) return false;
  }
  if(f.qty){
    var q = card.getAttribute('data-qty');
    if(q === null || q === '') return false;
    if(!inRange(parseInt(q, 10), f.qty)) return false;
  }
  if(f.cat && card.getAttribute('data-cat') !== f.cat) return false;
  return true;
}
function facMatches(card, f){
  if(f.prov && card.getAttribute('data-prov') !== f.prov) return false;
  if(f.value){
    var m = card.getAttribute('data-moq');
    if(m === null || m === '') return false;
    var mv = parseInt(m, 10);
    if(f.value === 'small' && !(mv < 30)) return false;
    if(f.value === 'medium' && !(mv >= 30 && mv <= 100)) return false;
    if(f.value === 'large' && !(mv > 100)) return false;
  }
  if(f.moq){
    var mm = card.getAttribute('data-moq');
    if(mm === null || mm === '') return false;
    if(parseInt(mm, 10) > parseInt(f.moq, 10)) return false;
  }
  if(f.cat && card.getAttribute('data-cat') !== f.cat) return false;
  return true;
}
/* v72: nut mo/dong bo loc tren mobile (<=600px). Nut chi hien tren mobile
   (CSS .filter-toggle); desktop bo loc luon mo nen nut an, khong doi hanh vi.
   Bam nut: doi class .filters-open tren section chua nut; cap nhat
   aria-expanded + nhan nut. Sau khi ap dung bo loc thi gap lai (goi tu cac
   handler apply) de thay ket qua ngay, kieu san TMDT. */
function filterSectionOf(btn){
  var el = btn;
  if(el && el.closest){ var s = el.closest('section'); if(s) return s; }
  while(el){ if(el.tagName && String(el.tagName).toLowerCase() === 'section') return el; el = el.parentElement || el.parentNode; }
  return null;
}
function initFilterToggle(){
  var btns = (document.querySelectorAll) ? document.querySelectorAll('.filter-toggle') : [];
  for(var i = 0; i < btns.length; i++){
    (function(btn){
      /* v78 C2: chi gan handler 1 lan cho moi nut. Dispatcher goi ca
         initList() (trang Mau) lan initShops() (moi trang) — trang Mau bi
         gan 2 listener: bam 1 lan toggle 2 lan (mo roi dong ngay) nen
         .filter-card mai display:none, nut khong doi nhan. */
      if(btn._filterToggleBound) return;
      btn._filterToggleBound = true;
      btn.addEventListener('click', function(){
        var sec = filterSectionOf(btn);
        if(!sec) return;
        if(!btn._label) btn._label = btn.textContent;
        var open = sec.classList.toggle('filters-open');
        btn.setAttribute('aria-expanded', open ? 'true' : 'false');
        btn.textContent = open ? '✕ Ẩn bộ lọc' : btn._label;
      });
    })(btns[i]);
  }
}
function closeFilters(sec){
  if(!sec || !sec.classList) return;
  sec.classList.remove('filters-open');
  var btn = (sec.querySelector) ? sec.querySelector('.filter-toggle') : null;
  if(btn){ btn.setAttribute('aria-expanded', 'false'); if(btn._label) btn.textContent = btn._label; }
}
function closeFilterOf(btn){ var sec = filterSectionOf(btn); if(sec) closeFilters(sec); }
/* v75: FAQ trang chu chi hien 3 cau dau; nut "Xem thêm câu hỏi" mo/thu gon
   cac cau con lai. Pattern giong nut Xem them lo/xuong: section bat dau co
   class .collapsed, cac .step tu cau 4 mang class .faq-extra, CSS an khi
   section collapsed; bam nut doi class + aria-expanded + nhan nut. */
function initFaqToggle(){
  var sec = document.getElementById('faq');
  if(!sec) return;
  var btn = document.getElementById('faqMoreBtn');
  if(!btn) return;
  btn.addEventListener('click', function(){
    var collapsed = sec.classList.toggle('collapsed');
    var open = !collapsed;
    btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    btn.textContent = open ? 'Thu gọn ↑' : 'Xem thêm câu hỏi ↓';
  });
}
// v91 (9): bảng "Chưa có dữ liệu" thống nhất cho mọi bộ lọc — banner rõ
// ràng (class .empty-state) + hướng dẫn nới bộ lọc, thay cho các dòng chữ
// thường rời rạc trước đây. Người dùng dặn: lọc 0 kết quả thì phải nhảy
// bảng thông báo "Chưa có dữ liệu" + cuộn tới khu vực kết quả.
function emptyResultsHTML(guidance){
  return '<p class="empty-state" role="status"><b>Chưa có dữ liệu.</b> ' + (guidance || 'Hãy nới bộ lọc hoặc bấm Đặt lại.') + '</p>';
}
function initSectionFilter(opts){
  var section = document.getElementById(opts.sectionId);
  if(!section) return null;
  /* v96: nut Ap dung / Dat lai la tuy chon — trang Shop dung 1 nut chung
     (uniApplyBtn/uniResetBtn) dieu phoi ca lo + xuong nen khong gan nut
     rieng o day; tra ve {apply, reset} de khung chung goi. */
  var applyBtn = opts.applyId ? document.getElementById(opts.applyId) : null;
  var resetBtn = opts.resetId ? document.getElementById(opts.resetId) : null;
  var grids = [];
  var gEls = section.querySelectorAll('.lot-grid');
  for(var gi = 0; gi < gEls.length; gi++){
    var cards = [];
    for(var ci = 0; ci < gEls[gi].children.length; ci++){ cards.push(gEls[gi].children[ci]); }
    grids.push({el: gEls[gi], orig: cards.slice()});
  }
  function setExpanded(open){
    var moreBtn = document.getElementById(opts.moreBtnId);
    if(open){ section.classList.remove('collapsed'); }
    else { section.classList.add('collapsed'); }
    if(moreBtn){
      moreBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
      moreBtn.textContent = open ? 'Thu gọn ↑' : 'Xem thêm ↓';
    }
  }
  function apply(){
    var f = opts.readForm();
    var active = !!(f.price || f.qty || f.prov || f.value || f.moq || f.cat);
    var total = 0, first = null;
    grids.forEach(function(g){
      var matched = [], rest = [];
      g.orig.forEach(function(card){
        if(opts.matches(card, f)){ matched.push(card); } else { rest.push(card); }
      });
      matched.forEach(function(card){ g.el.appendChild(card); card.classList.remove('lot-filtered-out'); });
      rest.forEach(function(card){ g.el.appendChild(card); card.classList.add('lot-filtered-out'); });
      total += matched.length;
      if(!first && matched.length) first = matched[0];
    });
    var countEl = document.getElementById(opts.countId);
    if(countEl) countEl.textContent = active ? (total + ' ' + opts.label + ' khớp bộ lọc') : '';
    var emptyEl = document.getElementById(opts.emptyId);
    if(emptyEl) emptyEl.hidden = !(active && total === 0);
    if(active){ setExpanded(true); }
    /* v72: mobile — gap bo loc sau khi ap dung de thay ket qua ngay. */
    closeFilterOf(applyBtn);
    var target = first || section;
    // v91 (9): 0 kết quả → cuộn tới đúng bảng "Chưa có dữ liệu" (có
    // scroll-margin để header sticky không che).
    if (!first && emptyEl && !emptyEl.hidden) target = emptyEl;
    if(target.scrollIntoView){ target.scrollIntoView({behavior: 'smooth', block: 'start'}); }
  }
  function reset(){
    grids.forEach(function(g){
      g.orig.forEach(function(card){ g.el.appendChild(card); card.classList.remove('lot-filtered-out'); });
    });
    var sels = section.querySelectorAll('select');
    for(var si = 0; si < sels.length; si++){ sels[si].value = ''; }
    /* v67: khoi loc da chuyen len dau trang (ngoai section) — reset them select trong khoi loc theo id */
    var fEl = opts.filterId ? document.getElementById(opts.filterId) : null;
    if(fEl){ var fSels = fEl.querySelectorAll('select'); for(var fi = 0; fi < fSels.length; fi++){ fSels[fi].value = ''; } }
    var countEl = document.getElementById(opts.countId);
    if(countEl) countEl.textContent = '';
    var emptyEl = document.getElementById(opts.emptyId);
    if(emptyEl) emptyEl.hidden = true;
    setExpanded(false);
  }
  if(applyBtn) applyBtn.addEventListener('click', function(){ return gateFilterApply(opts.pointsCategory || 'lot', pointsPageName(), apply, applyBtn); });
  if(resetBtn) resetBtn.addEventListener('click', reset);
  return {apply: apply, reset: reset};
}
function initLotFilter(){
  /* v96: doc tu khung loc chung (fUni*); dem + thong bao dung chung
     (uniCount/uniEmpty); khong gan nut rieng — khung chung dieu phoi. */
  return initSectionFilter({
    sectionId: 'lo-hang-xa-kho', moreBtnId: 'lotMoreBtn', filterId: 'uniFilter', pointsCategory: 'lot',
    countId: 'uniCount', emptyId: 'uniEmpty', label: 'lô',
    readForm: function(){
      var cat = uniCatToLotFac(document.getElementById('fUniCat').value);
      return {
        price: document.getElementById('fUniLotPrice').value,
        qty: document.getElementById('fUniLotQty').value,
        cat: cat === null ? '__none__' : cat
      };
    },
    matches: lotMatches
  });
}
function initFactoryFilter(){
  /* v96: nhu tren; tinh doi 'TP. Hồ Chí Minh' -> 'TP.HCM' cho data-prov. */
  return initSectionFilter({
    sectionId: 'xuong-may-gia-cong', moreBtnId: 'factoryMoreBtn', filterId: 'uniFilter', pointsCategory: 'factory',
    countId: 'uniCount', emptyId: 'uniEmpty', label: 'xưởng',
    readForm: function(){
      var cat = uniCatToLotFac(document.getElementById('fUniCat').value);
      return {
        prov: uniProvToFactory(document.getElementById('fUniProv').value),
        value: document.getElementById('fUniFacValue').value,
        moq: document.getElementById('fUniFacMoq').value,
        cat: cat === null ? '__none__' : cat
      };
    },
    matches: facMatches
  });
}
function params(){
  var p={}; try{new URLSearchParams(location.search).forEach(function(v,k){p[k]=v;});}catch(e){} return p;
}
/* v45: doc gia tri o loc, an toan khi o khong co tren trang (vd test stub
   DOM chi co cac o cu) — tra ve '' thay vi nem loi. */
function elVal(id){ var el=document.getElementById(id); return el ? el.value : ''; }
function setParams(p){
  var q=new URLSearchParams(); Object.keys(p).forEach(function(k){if(p[k]) q.set(k,p[k]);});
  try{history.replaceState(null,'',location.pathname+(q.toString()?'?'+q.toString():''));}catch(e){}
}
function filterModels(list, f){
  return list.filter(function(m){
    if(f.prov && m.province!==f.prov) return false;
    if(f.cat && m.cat!==f.cat) return false;
    if(f.gender && m.gender!==f.gender) return false;
    /* v43: loc gio lam theo truong shifts (suy ra tu schedule, xem data.js).
       Chi mau co ca do moi hien; shifts rong chi hien khi chon "Tất cả giờ".
       Mau khong co fulltime nen khong ap quyet dinh fulltime-hien-trong-moi-ca
       nhu shop. */
    if(f.shift){ var sh = m.shifts || []; if(sh.indexOf(f.shift) === -1) return false; }
    /* v45: loc theo gia tri. revMin tinh theo trieu (doanh thu DA XAC
       MINH, v85 M1); mau chua co doanh thu da xac minh bi loai khi co
       nhap — hien 0/20 mau co doanh thu that nen loc nay chua ra ket qua
       cho toi khi co du lieu, dung thiet ke, khong bia du lieu. */
    if(f.revMin != null){ var r = verifiedRevenue(m); if(r === null || r < f.revMin * 1000000) return false; }
    if(f.wageMin != null){ var w = (typeof m.salaryNum === 'number' ? m.salaryNum : null); if(w === null || w < f.wageMin) return false; }
    if(f.q){var hay=(m.name+' '+m.title+' '+m.province+' '+m.cat+' '+m.form+' '+m.exp).toLowerCase(); if(hay.indexOf(f.q.toLowerCase())===-1) return false;}
    return true;
  });
}
function renderPager(el, page, totalPages, total, onPage, perPage, label){
  if(!el) return;
  perPage=perPage||6; label=label||'hồ sơ';
  var html='<button type="button" data-track="chuyen-trang" data-p="'+(page-1)+'"'+(page<=1?' disabled':'')+'>← Trang trước</button>';
  for(var i=1;i<=totalPages;i++) html+='<button type="button" data-track="chuyen-trang" data-p="'+i+'"'+(i===page?' class="current" disabled':'')+'>'+i+'</button>';
  html+='<button type="button" data-track="chuyen-trang" data-p="'+(page+1)+'"'+(page>=totalPages?' disabled':'')+'>Trang sau →</button>';
  html+='<span class="pager-info">Trang '+page+' / '+totalPages+' — đang hiện '+(total===0?0:((page-1)*perPage+1))+'–'+Math.min(page*perPage,total)+' trên tổng số '+total+' '+label+'.</span>';
  el.innerHTML=html;
  el.querySelectorAll('button[data-p]').forEach(function(b){b.addEventListener('click',function(){onPage(parseInt(b.getAttribute('data-p'),10));});});
}
/* Home: hero search + 2 rows, 8 with-photo first */
/* Articles with their own page (v23): link to our page, not out to the source.
   Older articles without a page still link out to the source as before. */
function articleLink(a){
  if(a.page) return '<a href="'+esc(a.page)+'">'+esc(a.title)+'</a>';
  if(!a.url) return '<strong>'+esc(a.title)+'</strong>';
  if(/^https?:\/\//.test(a.url)) return '<a href="'+esc(a.url)+'" target="_blank" rel="noopener">'+esc(a.title)+'</a>';
  return '<a href="'+esc(a.url)+'">'+esc(a.title)+'</a>';
}
function articleHref(a){ return a.page || a.url || ''; }
function sortByDateDesc(list){
  return list.slice().sort(function(x,y){ return (x.date||'')>(y.date||'')?-1:((x.date||'')<(y.date||'')?1:0); });
}
function articleTarget(a){
  var href = articleHref(a);
  if(!href) return {href:'', blank:false};
  return {href:href, blank:!a.page};
}
function articleTitleHTML(a){
  var tg = articleTarget(a);
  if(!tg.href) return '<strong>'+esc(a.title)+'</strong>';
  return '<a href="'+esc(tg.href)+'"'+(tg.blank?' target="_blank" rel="noopener"':'')+'>'+esc(a.title)+'</a>';
}
function articleMediaHTML(a, cls){
  // Bai khong co anh -> o mau thuong hieu + so 2 (khong de trong, khong anh vo).
  if(a.img) return '<img class="'+cls+'" src="'+esc(a.img)+'" alt="'+esc(a.title)+'" loading="lazy">';
  return '<span class="'+cls+' pin-noimg" aria-hidden="true"><b>2</b></span>';
}
/* Hang ghim (v84): toi da 4 o — bai ghim (pinned:true) len truoc, xep theo
   pinOrder tang dan roi ngay giam dan. Chua du 4 o thi LAP BANG BAI MOI
   THEM VAO WEB GAN NHAT (thu tu them vao = thu tu trong mang articles,
   bai them sau nam CUOI mang nen dao nguoc mang) — KHONG xep theo truong
   date (date la ngay cua bai GOC, bai moi them ve su kien cu van phai len).
   Chi nguoi dung ghim tay (hien chi bai bop-reach); cron bai bao 08:21
   KHONG tu ghim bai moi nua (bai moi pinned:false), de hang tu day. */
function getPinnedRow(list){
  var pinned = (list||[]).filter(function(a){ return !!a.pinned; });
  pinned.sort(function(a, b){
    var ao = (typeof a.pinOrder === 'number') ? a.pinOrder : Infinity;
    var bo = (typeof b.pinOrder === 'number') ? b.pinOrder : Infinity;
    if(ao !== bo) return ao - bo;
    return (a.date||'') > (b.date||'') ? -1 : ((a.date||'') < (b.date||'') ? 1 : 0);
  });
  var newest = (list||[]).slice().reverse(); // v84: moi them vao web = cuoi mang -> dao nguoc (khong xep theo date bai goc)
  var picked = pinned.slice(0, 4);
  for(var i=0; i<newest.length && picked.length<4; i++){
    if(picked.indexOf(newest[i]) === -1) picked.push(newest[i]);
  }
  return picked;
}
/* v100: quy chuan the tin rut gon — 1 anh dai dien nho 16:9 + dung 2 dong
   (dong 1: tieu de, toi da 2 dong co cat ...; dong 2: chuyen muc · ngay).
   Dung CHUNG cho tin-tuc, trang chu (homeNews + homePinned) va hang tin
   trang Mau. Noi dung day du van o trang bai-viet; chi rut gon phan hien
   thi danh sach. So thu tu (neu co) nam goc duoi-trai cua anh, khong them
   dong. */
/* v100: the tin rut gon — 1 anh dai dien + 2 dong thong tin (tieu de + chuyen muc · ngay).
   - withPoints=true (chi danh sach tin-tuc.html): them hang nut diem/ghim v92
     (Thich +10 / Chia se +20 / Ghim len top) NGOAI link bai — day la hang
     hanh dong, khong phai dong thong tin; trang chu + hang tin trang Mau
     khong co hang nut nay (nhu truoc v100). */
function newsCardHTML(a, n, withPoints){
  var tg = articleTarget(a);
  var num = (typeof n === 'number') ? '<span class="pin-num" aria-label="Tin ' + n + '">' + n + '</span>' : '';
  var inner = num + articleMediaHTML(a, 'news-card-img')
    + '<h3>'+esc(a.title)+'</h3>'
    + '<p class="news-card-meta">'+esc(a.cat)+' · '+(a.date?esc(a.date):'Chưa có ngày')+'</p>';
  var points = withPoints ? pointsButtonsHTML('article', articleRef(a)) : '';
  if(!tg.href) return '<article class="news-card">'+inner+points+'</article>';
  return '<article class="news-card"><a href="'+esc(tg.href)+'"'+(tg.blank?' target="_blank" rel="noopener"':'')+'>'+inner+'</a>'+points+'</article>';
}
/* pinCardHTML giu lai lam bi danh (test cu + code khac goi) — cung mau the rut gon v100. */
function pinCardHTML(a, n){ return newsCardHTML(a, n); }
/* v100: hang 4 o tin tuc tren trang Danh cho Mau (duoi bo loc #shopFilter):
   4 bai moi nhat thuoc 2 chuyen muc "Đời Sống" + "Dòng tiền" (ban dau
   dung 4 bai A1–A4 moi viet; co bai moi cung chuyen muc thi tu cap nhat). */
function initModelNewsRow(){
  var row=document.getElementById('modelNewsRow'); if(!row) return;
  var list=(D.articles||[]).map(function(a,i){ return {a:a, i:i}; })
    .filter(function(x){ return x.a.cat==='Đời Sống' || x.a.cat==='Dòng tiền'; })
    .sort(function(p,q){ var d=(p.a.date||'')<(q.a.date||'')?1:((p.a.date||'')>(q.a.date||'')?-1:0); return d!==0?d:(q.i-p.i); })
    .slice(0,4).map(function(x){ return x.a; });
  row.innerHTML='<h2><a href="tin-tuc.html" data-track="tieu-de-tin-doi-song-mau">Đời sống &amp; dòng tiền cho mẫu livestream</a></h2>'
    + '<div class="news-row-4">' + list.map(function(a){ return newsCardHTML(a); }).join('') + '</div>'
    + '<p style="margin:10px 0 0"><a href="tin-tuc.html">Xem tất cả tin →</a></p>';
}
/* v41 trust strip: so lieu tinh DONG tu data.js (khong ghi so cung vao HTML).
   Quy tac luong/doanh thu cua mau (user-directed 06/11): doanh thu cao nhat
   (highest_revenue_amount DA XAC MINH, v85 M1) la tieu de khi co du lieu da
   kiem chung; hien tai ca 20 mau deu "Chua cap nhat" nen fallback la luong
   de xuat THAP NHAT (min salaryNum) kem ghi chu doanh thu chua co du lieu.
   Khi 1 mau co doanh thu da xac minh thi code tu chuyen sang hien thi
   doanh thu, khong can sua tay. So tu khai/chuoi topRevenue cu khong tinh.
   Luong shop cao nhat: chi xet luong thang — parse cac so TRUOC cum
   "trieu/thang" (khoang "16–36" -> 36; "Tu 15" -> 15; "8–18" -> 18; phan
   tram hoa hong sau cum do khong tinh). 400+ la hang so cong dong do nguoi
   dung xac nhan, khong bao gio tinh tu data.js. */
function fmtVnd(n){ return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '.'); }
function parseMonthlyMax(s){
  if(!s || s.indexOf('/tháng') < 0) return null;
  // Dang "triệu/tháng": so la trieu (vd "16–36" -> 36; "Tu 15" -> 15).
  if(s.indexOf('triệu/tháng') >= 0){
    var head = s.slice(0, s.indexOf('triệu/tháng'));
    var nums = head.match(/\d+(?:[.,]\d+)?/g);
    if(!nums) return null;
    var max = null;
    nums.forEach(function(x){ var v = parseFloat(x.replace(',', '.')); if(max === null || v > max) max = v; });
    return max;
  }
  // Dang "đ/tháng": so la VND (vd "8.000.000đ - 15.000.000đ/tháng" -> 15 trieu).
  // Regex quet toi khoang ngay truoc "/tháng" nen khong lay nham luong gio
  // dung truoc (vd sh-05: "70.000đ - 100.000đ / giờ (8.000.000đ - 15.000.000đ/tháng" -> 15).
  var m = s.match(/([\d.]+)\s*đ(?:\s*[–-]\s*([\d.]+)\s*đ)?\s*\/tháng/);
  if(!m) return null;
  var hi = m[2] || m[1];
  var v = parseFloat(hi.replace(/\./g, '')) / 1000000;
  return isNaN(v) ? null : v;
}
function parseRevenue(s){
  if(!s || s === 'Chưa cập nhật') return null;
  var m = s.match(/([\d.,]+)\s*(tỷ|tỉ|triệu|tr|k|nghìn)?/i);
  if(!m) return null;
  var v = parseFloat(m[1].replace(/\./g, '').replace(',', '.'));
  if(isNaN(v)) return null;
  var unit = (m[2] || '').toLowerCase();
  if(unit === 'tỷ' || unit === 'tỉ') v *= 1000000000;
  else if(unit === 'triệu' || unit === 'tr') v *= 1000000;
  else if(unit === 'k' || unit === 'nghìn') v *= 1000;
  return v;
}
/* v45: parse so tien nguoi dung nhap o o loc gia tri ("150k", "150.000",
   "1,5", "15"). Quy uoc Viet: dau "." la phan cach hang nghin, dau ","
   la thap phan, hau to "k"/"K" = x1000. Tra ve so, hoac null neu rong /
   khong phai so / <= 0 (0 tro xuong nghia la "khong gioi han"). */
function parseMoneyInput(s){
  if(s == null) return null;
  var t = String(s).trim().toLowerCase().replace(/\s+/g, '');
  if(!t) return null;
  var mult = 1;
  if(t.charAt(t.length - 1) === 'k'){ mult = 1000; t = t.slice(0, -1); }
  t = t.replace(/\./g, '').replace(',', '.');
  if(!/^\d+(\.\d+)?$/.test(t)) return null;
  var v = parseFloat(t) * mult;
  if(isNaN(v) || v <= 0) return null;
  return v;
}
/* v42: parse luong gio thap nhat tu text salary cua shop.
   Chi xet chuoi co don vi gio ("giờ" hoac "/h"); lay phan text TRUOC moc gio
   dau tien de khong lay nham so %/thang o sau (vd "95.000 – 140.000đ/giờ
   + 0.5% - 1%" -> 95000, khong lay 0.5/1; "70.000đ - 100.000đ / giờ
   (8.000.000đ - 15.000.000đ/tháng)" -> 70000, khong lay phan thang).
   So co dau "." la phan cach hang nghin ("50.000" -> 50000); so < 1000 hoac
   co hau to "k" hieu la nghin dong ("100k" -> 100000, "150-170/h" -> 150000).
   Tra ve so thap nhat trong khoang, hoac null neu khong co luong gio. */
function parseHourlyMin(s){
  if(!s) return null;
  var low = String(s).toLowerCase();
  var cut = low.indexOf('giờ');
  var cutH = low.indexOf('/h');
  if(cut === -1 && cutH === -1) return null;
  var end = cut !== -1 && cutH !== -1 ? Math.min(cut, cutH) : (cut !== -1 ? cut : cutH);
  var head = low.slice(0, end);
  var toks = head.match(/(\d[\d.,]*)\s*(k)?/g);
  if(!toks) return null;
  var min = null;
  toks.forEach(function(tok){
    var m = tok.match(/([\d.,]+)\s*(k)?/);
    if(!m) return;
    var raw = m[1];
    var v;
    if(raw.indexOf('.') !== -1){ v = parseInt(raw.replace(/\./g, ''), 10); }
    else if(raw.indexOf(',') !== -1){ v = parseFloat(raw.replace(',', '.')); }
    else { v = parseInt(raw, 10); }
    if(isNaN(v)) return;
    if(m[2] === 'k' || v < 1000) v = v * 1000;
    if(min === null || v < min) min = v;
  });
  return min;
}
/* v42: sap xep. null (khong co gia tri) LUON xep cuoi cung o ca 2 chieu.
   sortModelsBy: 'wage-asc'/'wage-desc' dung salaryNum; 'revenue-asc'/
   'revenue-desc' dung verifiedRevenue (v85 M1 — chi so DA XAC MINH, so
   tu khai/chuoi topRevenue cu khong tinh) — hien ca 20 mau deu
   "Chưa cập nhật" nen sap xep doanh thu khong doi thu tu (tat ca bang nhau).
   sortShopsBy: 'hourly-asc'/'hourly-desc' dung parseHourlyMin; 'monthly-asc'/
   'monthly-desc' dung parseMonthlyMax (v41). Mac dinh ('') tra ve ban sao
   khong doi thu tu — trang goi se dung pipeline mac dinh cua rieng no. */
function sortByVal(list, get, dir){
  return list.slice().sort(function(a, b){
    var va = get(a), vb = get(b);
    if(va === null && vb === null) return 0;
    if(va === null) return 1;
    if(vb === null) return -1;
    return dir * (va - vb);
  });
}
function sortModelsBy(list, sort){
  if(sort === 'wage-asc') return sortByVal(list, function(m){ return (typeof m.salaryNum === 'number' ? m.salaryNum : null); }, 1);
  if(sort === 'wage-desc') return sortByVal(list, function(m){ return (typeof m.salaryNum === 'number' ? m.salaryNum : null); }, -1);
  if(sort === 'revenue-asc') return sortByVal(list, function(m){ return verifiedRevenue(m); }, 1);
  if(sort === 'revenue-desc') return sortByVal(list, function(m){ return verifiedRevenue(m); }, -1);
  return list.slice();
}
function sortShopsBy(list, sort){
  if(sort === 'hourly-asc') return sortByVal(list, function(s){ return parseHourlyMin(s.salary); }, 1);
  if(sort === 'hourly-desc') return sortByVal(list, function(s){ return parseHourlyMin(s.salary); }, -1);
  if(sort === 'monthly-asc') return sortByVal(list, function(s){ return parseMonthlyMax(s.salary); }, 1);
  if(sort === 'monthly-desc') return sortByVal(list, function(s){ return parseMonthlyMax(s.salary); }, -1);
  return list.slice();
}
/* v76: lo/xuong trong data.js — so PR tinh tu data.js, khong con so ghi cung.
   Quy tac 60 ngay: chi ap dung nhom 1 (lo si). Ngay trong data.js la ngay dang
   goc trong bai goc (khong co ngay dang len web rieng); lo co (ngay hien tai -
   ngay dang) > 60 ngay thi khong render va khong tinh vao so PR. Nhom 2
   (thu mua/ky gui), nhom 3 (cho/san/TTTM/chuong trinh) va xuong may khong
   gioi han thoi gian — render het. */
function parseVnDate(s){
  if(!s) return null;
  var m = String(s).match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if(!m) return null;
  var d = new Date(parseInt(m[3], 10), parseInt(m[2], 10) - 1, parseInt(m[1], 10));
  return isNaN(d.getTime()) ? null : d;
}
function lotActive(l, ref){
  if(!l || l.group !== 1) return true; /* chi nhom 1 chiu quy tac 60 ngay */
  var d = parseVnDate(l.date);
  if(!d) return true; /* khong co ngay hop le: hien de khoi mat du lieu */
  /* kiem tra kieu Date bang duck-type (khong dung instanceof) de chay dung
     ca khi ref duoc tao o realm khac (vd test chay qua vm). */
  var r = (ref && typeof ref.getTime === 'function') ? ref : new Date();
  var days = (r.getTime() - d.getTime()) / 86400000;
  return days <= 60; /* ngay tuong lai (days am) van hien */
}
function lotsByGroup(lots, ref){
  var out = {g1: [], g2: [], g3: []};
  (lots || []).forEach(function(l){
    if(l.group === 1){ if(lotActive(l, ref)) out.g1.push(l); }
    else if(l.group === 2){ out.g2.push(l); }
    else if(l.group === 3){ out.g3.push(l); }
  });
  return out;
}
function lotFactoryStats(lots, factories, ref){
  var byGroup = lotsByGroup(lots, ref);
  var provs = {};
  (factories || []).forEach(function(f){ if(f.prov) provs[f.prov] = true; });
  return {lotCount: byGroup.g1.length, buyerCount: byGroup.g2.length, batchCount: byGroup.g3.length, factoryCount: (factories || []).length, factoryProvinceCount: Object.keys(provs).length};
}
/* v76: the lo/xuong render tu data.js — phai GIONG HET the tinh cu (cung
   class, data-*, thu tu) de bo loc + nut Xem them 2 hang chay y nhu cu.
   v92 (C2): withComments=true thi them nut "Bình luận (N)" + khung mount
   an duoi moi the — bam moi mo form + tai danh sach (lazy-load, xu ly
   tap trung trong Ver2Comments.initCardComments). lotCardHTML dung chung
   cho ca kiot (trang thanh-ly-kiot goi voi doi tuong kiot): phan biet
   target_type theo tien to id ('kiot-' -> 'kiot', con lai -> 'lot'). */
function commentToggleHTML(targetType, targetId){
  return '<p><button class="btn btn-ghost btn-sm v2s-comment-toggle" type="button" data-v2s-comment-toggle data-v2s-target-type="'+esc(targetType)+'" data-v2s-target-id="'+esc(targetId)+'">💬 Bình luận</button></p>'
  + '<div class="v2s-comments-inline" data-v2s-comments-for="'+esc(targetType)+':'+esc(targetId)+'" hidden></div>';
}
function lotCardHTML(l, withComments){
  // v99 (§1c): the lo/kiot rut gon — khoi mau 46/51 + ten overlay + dung
  // 2 dong (dia diem; tong gia tri -> loai mat hang -> so luong) + nut
  // sao. Nut binh luan (v92 C2) giu nguyen duoi 2 dong. data-price/
  // data-qty/data-cat giu nguyen de bo loc lo (lotMatches) chay y cu.
  // v101: o anh khong con chi la icon — lo nhom 2 hien "Thu mua: <loai>",
  // lo nhom 1 + nhom 3 hien "Xa kho: <loai>", kiot hien loai hinh (nhan
  // tieng Viet tu cat); lo/kiot khong co cat thi giu icon cu.
  var targetType = (l && l.id && String(l.id).indexOf('kiot-') === 0) ? 'kiot' : 'lot';
  var photoContent;
  if(targetType === 'kiot'){
    photoContent = hasReal(l.cat) ? '<span class="card-compact-noimg" aria-hidden="true"><span>🏪 '+esc(catLabel(l.cat))+'</span></span>' : '<span class="card-compact-ph" aria-hidden="true">🏪</span>';
  } else if(l && l.group === 2){
    photoContent = hasReal(l.cat) ? '<span class="card-compact-noimg" aria-hidden="true"><span>📦 Thu mua: '+esc(catLabel(l.cat))+'</span></span>' : '<span class="card-compact-ph" aria-hidden="true">📦</span>';
  } else {
    photoContent = hasReal(l.cat) ? '<span class="card-compact-noimg" aria-hidden="true"><span>📦 Xả kho: '+esc(catLabel(l.cat))+'</span></span>' : '<span class="card-compact-ph" aria-hidden="true">📦</span>';
  }
  // Kiot co truong prov rieng (dung luon); lo phai quet tinh trong tieu de/meta.
  var line1 = targetType === 'kiot' ? kiotLocationLine(l) : lotLocationLine(l);
  var line2 = targetType === 'kiot' ? kiotTypeLine(l) : lotValueLine(l);
  return '<article class="lot-card card-compact" data-price="' + (l.priceNum == null ? '' : l.priceNum) + '" data-qty="' + (l.qty == null ? '' : l.qty) + '" data-cat="' + esc(l.cat) + '" data-v2s-id="'+esc(l.id)+'">'
  + '<a class="card-compact-photo card-compact-photo--' + targetType + '" href="' + esc(l.url) + '" target="_blank" rel="noopener">' + photoContent + '<span class="card-compact-name">' + esc(l.title) + '</span></a>'
  + starButtonHTML(targetType, l.id)
  + '<div class="card-compact-lines"><p class="card-compact-line">' + line1 + '</p><p class="card-compact-line">' + line2 + '</p></div>'
  + (withComments ? commentToggleHTML(targetType, l.id) : '') + '</article>';
}
function factoryCardHTML(f, withComments){
  // v99 (§1c): the xuong rut gon — khoi mau 46/51 + ten overlay + dung
  // 2 dong (dia diem; loai mat hang gia cong — nhieu loai thi lay loai
  // chinh, thieu thi "Thoa thuan") + nut sao. Nut binh luan (v92 C2)
  // giu nguyen. data-moq/data-cat/data-prov giu nguyen cho facMatches.
  return '<article class="lot-card card-compact" data-moq="' + (f.moq == null ? '' : f.moq) + '" data-cat="' + esc(f.cat) + '" data-prov="' + esc(f.prov) + '" data-v2s-id="'+esc(f.id)+'">'
  + '<a class="card-compact-photo card-compact-photo--factory" href="' + esc(f.url) + '" target="_blank" rel="noopener"><span class="card-compact-ph" aria-hidden="true">🏭</span><span class="card-compact-name">' + esc(f.name) + '</span></a>'
  + starButtonHTML('factory', f.id)
  + '<div class="card-compact-lines"><p class="card-compact-line">' + factoryLocationLine(f) + '</p><p class="card-compact-line">' + factoryItemsLine(f) + '</p></div>'
  + (withComments ? commentToggleHTML('factory', f.id) : '') + '</article>';
}
/* v76: render the lo/xuong tu data.js vao trang Shop + cap nhat dong dem
   (.lot-sub) + o loc tinh dung chung (fUniProv) theo so lieu thuc te. Goi TRUOC
   initLotFilter/initFactoryFilter vi cac ham do chup lai danh sach the trong
   grid luc khoi tao. Tren trang khac (khong co section lo/xuong) thi khong lam gi. */
function renderLotSections(ref){
  var lots = D.lots || [], factories = D.factories || [];
  var byGroup = lotsByGroup(lots, ref);
  var g1 = document.getElementById('lotGrid1');
  if(g1) g1.innerHTML = byGroup.g1.map(function(l){ return lotCardHTML(l, true); }).join(''); // v92 (C2): nut Binh luan duoi moi the lo
  var g2 = document.getElementById('lotGrid2');
  if(g2) g2.innerHTML = byGroup.g2.map(function(l){ return lotCardHTML(l, true); }).join('');
  var g3 = document.getElementById('lotGrid3');
  if(g3) g3.innerHTML = byGroup.g3.map(function(l){ return lotCardHTML(l, true); }).join('');
  var fg = document.getElementById('factoryGrid');
  if(fg) fg.innerHTML = factories.map(function(f){ return factoryCardHTML(f, true); }).join(''); // v92 (C2): nut Binh luan duoi moi the xuong
  var s1 = document.getElementById('lotSub1');
  // v99 (§1c): the lo rut gon chi con 2 dong nen nhan "Chưa xác thực" khong
  // con cho tren moi the — hien canh bao chung o tieu de muc lo (v55: 20/20 lo deu chua xac thuc).
  if(s1) s1.textContent = 'Doanh nghiệp và shop xả hàng tồn kho theo lô sỉ — đang có ' + byGroup.g1.length + ' lô. Lưu ý: các lô đều chưa xác thực — không phải lô chính hãng của thương hiệu.';
  var s2 = document.getElementById('lotSub2');
  if(s2) s2.textContent = 'Doanh nghiệp cần xả kho số lượng lớn có thể liên hệ các đơn vị thu mua dưới đây để thu về vốn tái sản xuất. Giá thu mua không công khai, liên hệ trực tiếp để thỏa thuận. Đang có ' + byGroup.g2.length + ' đơn vị.';
  var s3 = document.getElementById('lotSub3');
  if(s3) s3.textContent = 'Chương trình xả kho theo đợt của chợ, sàn, trung tâm thương mại và tổ chức — bán lẻ từng món, không phải lô sỉ. Đang có ' + byGroup.g3.length + ' chương trình.';
  var fs = document.getElementById('factorySub');
  if(fs) fs.textContent = 'Xưởng và nhà máy may nhận gia công quần áo cho shop và thương hiệu — đang có ' + factories.length + ' xưởng/nhà máy.';
  /* v96: o loc tinh dung chung (fUniProv): dung lua chon theo so xuong
     thuc te tung tinh. Gia tri 'TP. Hồ Chí Minh' dung chung cho shop/mau;
     khi loc xuong, JS doi ve 'TP.HCM' (xem uniProvToFactory). Them lua chon
     'Toàn quốc / Live online' cho mau (khong co xuong nao o muc nay). */
  var sel = document.getElementById('fUniProv');
  if(sel){
    var counts = {}, order = [];
    factories.forEach(function(f){
      if(!f.prov) return;
      if(!counts[f.prov]){ counts[f.prov] = 0; order.push(f.prov); }
      counts[f.prov]++;
    });
    var html = '<option value="">Tất cả tỉnh</option>';
    order.forEach(function(p){
      var val = (p === 'TP.HCM') ? 'TP. Hồ Chí Minh' : p;
      html += '<option value="' + esc(val) + '">' + esc(val) + '</option>';
    });
    html += '<option value="Toàn quốc / Live online">Toàn quốc / Live online</option>';
    sel.innerHTML = html;
  }
}
function trustStats(models, shops, lots, factories, ref){
  models = models || []; shops = shops || [];
  var provs = {}, online = false, minWage = null, maxRev = null;
  models.forEach(function(m){
    if(m.province === 'Toàn quốc / Live online'){ online = true; }
    else if(m.province){ provs[m.province] = true; }
    if(typeof m.salaryNum === 'number' && m.salaryNum > 0 && (minWage === null || m.salaryNum < minWage)) minWage = m.salaryNum;
    var r = verifiedRevenue(m);
    if(r !== null && (maxRev === null || r > maxRev)) maxRev = r;
  });
  var shopProvs = {}, maxMonthly = null;
  shops.forEach(function(s){
    if(s.province){ shopProvs[s.province] = true; }
    var mm = parseMonthlyMax(s.salary);
    if(mm !== null && (maxMonthly === null || mm > maxMonthly)) maxMonthly = mm;
  });
  var lf = lotFactoryStats(lots, factories, ref);
  return {modelCount: models.length, modelProvinceCount: Object.keys(provs).length, modelOnline: online, minWage: minWage, maxRevenue: maxRev, shopCount: shops.length, shopProvinceCount: Object.keys(shopProvs).length, maxMonthly: maxMonthly, lotCount: lf.lotCount, buyerCount: lf.buyerCount, batchCount: lf.batchCount, factoryCount: lf.factoryCount, factoryProvinceCount: lf.factoryProvinceCount};
}
function renderTrustStats(){
  var st = trustStats(D.models, D.shops || [], D.lots || [], D.factories || []);
  var tm = document.getElementById('trustModels'); if(tm) tm.textContent = String(st.modelCount);
  var ts = document.getElementById('trustShops'); if(ts) ts.textContent = String(st.shopCount);
  var mp = document.getElementById('trustModelProvinces');
  if(mp) mp.textContent = 'Hồ sơ mẫu thật · ' + st.modelProvinceCount + ' tỉnh' + (st.modelOnline ? ' + live online' : '');
  var mpay = document.getElementById('trustModelPay');
  var mnote = document.getElementById('trustModelPayNote');
  if(st.maxRevenue !== null){
    if(mpay) mpay.textContent = 'Doanh thu cao nhất ' + fmtVnd(st.maxRevenue) + 'đ';
    if(mnote) mnote.textContent = '';
  } else if(st.minWage !== null){
    if(mpay) mpay.textContent = 'Lương đề xuất từ ' + fmtVnd(st.minWage) + 'đ/giờ';
    if(mnote) mnote.textContent = '(doanh thu cao nhất chưa có dữ liệu — sẽ thay bằng doanh thu cao nhất khi có)';
  }
  var sp = document.getElementById('trustShopProvinces');
  if(sp) sp.textContent = 'Shop đang tuyển mẫu · ' + st.shopProvinceCount + ' tỉnh';
  var spay = document.getElementById('trustShopPay');
  if(spay && st.maxMonthly !== null) spay.textContent = 'Lương cao nhất ' + st.maxMonthly + ' triệu/tháng';
  /* v76: 6 so lo/xuong tinh tu data.js (nhu mau/shop); so ghi cung trong
     index.html chi la du phong khi JS loi. */
  var tl = document.getElementById('trustLots'); if(tl) tl.textContent = String(st.lotCount);
  var tb = document.getElementById('trustBuyers'); if(tb) tb.textContent = String(st.buyerCount);
  var tba = document.getElementById('trustBatch'); if(tba) tba.textContent = String(st.batchCount);
  var tf = document.getElementById('trustFactories'); if(tf) tf.textContent = String(st.factoryCount);
  var tfp = document.getElementById('trustFactoryProvinces'); if(tfp) tfp.textContent = String(st.factoryProvinceCount);
}
function initHome(){
  var grid=document.getElementById('homeGrid'); if(!grid) return;
  // v41 trust strip: so lieu tinh dong tu data.js; so tinh trong index.html
  // (20 / 30) chi la du phong neu JS loi — dai khong bao gio trong.
  renderTrustStats();
  // v25: exactly 8, ALL with a real photo (homeTop8 filters by photoUrl first,
  // then rotates by day-of-year). Profiles without a real photo never reach home.
  var shown=homeTop8(D.models);
  grid.innerHTML=shown.map(cardHTML).join('');
  // v38: hang tin ghim (4 khung) duoi hero search. Muc Tin moi (#homeNews)
  // giu nguyen list 6 bai moi nhat nhu cu (user-directed 22:37 05/11:
  // chi them 1 dong 4 o tin moi, muc Tin tuc de nguyen).
  // v38c: hang tin moi danh so 1-4 (badge tren anh), o nho gon (anh 16:9).
  var pinned=document.getElementById('homePinned');
  if(pinned) pinned.innerHTML=getPinnedRow(D.articles||[]).map(function(a,i){return pinCardHTML(a,i+1);}).join('');
  var news=document.getElementById('homeNews');
  /* v100: muc Tin moi dung chung the tin rut gon (1 anh + 2 dong). */
  if(news) news.innerHTML=D.articles.slice().sort(function(x,y){return (x.date||'')>(y.date||'')?-1:((x.date||'')<(y.date||'')?1:0);}).slice(0,6).map(function(a){
    return newsCardHTML(a);
  }).join('');
  var homeShops=document.getElementById('homeShops');
  if(homeShops) homeShops.innerHTML=defaultShopOrder(D.shops||[]).slice(0,6).map(shopCardHTML).join('');
  var form=document.getElementById('heroSearch');
  if(form) form.addEventListener('submit',function(e){e.preventDefault();
    var q=document.getElementById('heroQ').value.trim();
    var prov=document.getElementById('heroProv').value;
    var cat=document.getElementById('heroCat').value;
    var dest='danh-sach-shop.html'; var qs=[];
    if(q) qs.push('q='+encodeURIComponent(q)); if(prov) qs.push('prov='+encodeURIComponent(prov)); if(cat) qs.push('cat='+encodeURIComponent(cat));
    var href=dest+(qs.length?'?'+qs.join('&'):'');
    function go(){ location.href=href; }
    // v90: dung bo loc THAT (chon tinh/linh vuc) thi tru 1 diem nhu o trang
    // danh sach (gateFilterApply, category 'model' — dich la danh-sach-shop.html,
    // v96-swap: grid mau gio o trang Shop);
    // chi go tu khoa (q) thi mien phi, di thang. Doi trong 10s sau lan tru
    // truoc thi mien phi (bucket 10s, chung voi bo loc trang danh sach).
    if(!prov && !cat){ go(); return; }
    loadPointsScripts().then(function(){
      return pointsSessionUser().then(function(user){
        var msgEl=filterMsgEl(form);
        function say(html){ if(msgEl) msgEl.innerHTML=html; }
        if(!user){
          say('Hãy <a href="dang-ky.html">đăng ký</a> để dùng bộ lọc — đăng ký đủ nhận 250 điểm thưởng! Đã có tài khoản? <a href="dang-nhap.html">Đăng nhập</a>');
          return;
        }
        var R2=window.Ver2Reward;
        if(R2 && R2.FREE_SERVICES===true){ go(); return; } // v92: lọc tạm miễn phí, không trừ điểm
        if(!R2 || typeof R2.spendPoints !== 'function'){ say('Hệ thống điểm chưa bật (đang chờ migration M7), chưa lọc được.'); return; }
        var now=Date.now();
        if(typeof R2.shouldChargeFilter === 'function' && !R2.shouldChargeFilter(filterLastCharge('model'), now)){ go(); return; }
        var bucket=(typeof R2.filterChargeBucket === 'function') ? R2.filterChargeBucket(now) : Math.floor(now/10000);
        var key='filter:'+user.id+':model:'+bucket;
        return R2.spendPoints('filter',1,'model','index.html',key).then(function(res){
          if(res && res.ok){ filterNoteCharge('model', now); go(); return; }
          if(res && res.code === 'insufficient_balance'){
            say('Bạn đã hết điểm để lọc. <a href="huong-dan-diem.html">Xem cách kiếm điểm →</a>');
            return;
          }
          // Loi he thong/RPC: khong chan nguoi dung, van chuyen + ghi log.
          try { if(typeof console !== 'undefined' && console.error) console.error('[v90] heroSearch tru diem loi, van chuyen:', (res && (res.code || res.error)) || 'unknown'); } catch(e2){}
          go();
        }).catch(function(err){
          try { if(typeof console !== 'undefined' && console.error) console.error('[v90] heroSearch tru diem loi, van chuyen:', err); } catch(e2){}
          go();
        });
      });
    }).catch(function(err){
      try { if(typeof console !== 'undefined' && console.error) console.error('[v90] heroSearch tru diem loi, van chuyen:', err); } catch(e2){}
      go();
    });
  });
}
/* Shop page (v22): all public job posts, newest first, rendered from D.shops */
/* v38: trang danh sach shop phan trang 9/trang (3 hang x 3 cot), dong bo
   URL ?page= nhu trang mau; dong dem hien theo trang hien tai. */
/* v38c: nhom linh vuc rong cho bo loc shop — truong product cua shop la
   chu tu do (vd "Thời trang nữ size S–M", "Idol Livestream") nen gom ve
   6 nhom rong de loc. Khong doi du lieu, chi gom nhom khi loc. */
function shopCatGroup(p){
  p = (p||'').toLowerCase();
  if(p.indexOf('thời trang')!==-1 || p.indexOf('áo dài')!==-1 || p.indexOf('giày dép')!==-1 || p.indexOf('công sở')!==-1) return 'Thời trang';
  if(p.indexOf('mỹ phẩm')!==-1 || p.indexOf('nail')!==-1 || p.indexOf('nhuộm')!==-1 || p.indexOf('vòng ngọc')!==-1 || p.indexOf('trang sức')!==-1 || p.indexOf('dược')!==-1) return 'Mỹ phẩm & Làm đẹp';
  if(p.indexOf('gia dụng')!==-1 || p.indexOf('đồ dùng')!==-1 || p.indexOf('hải sản')!==-1) return 'Gia dụng & Đời sống';
  if(p.indexOf('idol')!==-1 || p.indexOf('streamer')!==-1) return 'Idol / Streamer';
  if(p.indexOf('công nghệ')!==-1) return 'Công nghệ';
  return 'Khác';
}
/* v96: bo loc chung trang Shop — anh xa gia tri "Linh vuc / Mat hang" dung
   chung (fUniCat) ve tung he rieng: nhom shop (filterShops), linh vuc mau
   (hub/filterModels), ma lo/xuong (data-cat). Gia tri khong co tuong duong
   o lo/xuong (gia dung, idol, cong nghe, khac) tra ve null -> khong khop
   the nao (hien "Chua co du lieu"), khong bia du lieu. Gia tri da la ten
   nhom (vd tu URL cu ?cat=Thời trang) duoc giu nguyen. */
var UNI_CAT_TO_SHOP = {'quan-ao':'Thời trang','nam':'Thời trang','nu':'Thời trang','tre-em':'Thời trang','giay-dep':'Thời trang','my-pham':'Mỹ phẩm & Làm đẹp','phu-kien':'Khác','tpcn':'Mỹ phẩm & Làm đẹp','gia-dung':'Gia dụng & Đời sống','idol':'Idol / Streamer','cong-nghe':'Công nghệ','khac':'Khác'};
var UNI_CAT_TO_MODEL = {'quan-ao':'Thời trang','nam':'Thời trang','nu':'Thời trang','tre-em':'Thời trang','giay-dep':'Thời trang','my-pham':'Mỹ phẩm','phu-kien':'Chung / Đa ngành','tpcn':'Chung / Đa ngành','gia-dung':'Gia dụng','idol':'Chung / Đa ngành','cong-nghe':'Chung / Đa ngành','khac':'Chung / Đa ngành'};
var UNI_CAT_TO_LOTFAC = {'quan-ao':'quan-ao','nam':'nam','nu':'nu','tre-em':'tre-em','giay-dep':'giay-dep','my-pham':'my-pham','phu-kien':'phu-kien','tpcn':'tpcn'};
var SHOP_TO_UNI_CAT = {'Thời trang':'quan-ao','Mỹ phẩm & Làm đẹp':'my-pham','Gia dụng & Đời sống':'gia-dung','Idol / Streamer':'idol','Công nghệ':'cong-nghe','Khác':'khac'};
function uniCatToShop(v){ return v ? (UNI_CAT_TO_SHOP[v] || v) : ''; }
function uniCatToModel(v){ return v ? (UNI_CAT_TO_MODEL[v] || v) : ''; }
function uniCatToLotFac(v){ return v ? (UNI_CAT_TO_LOTFAC[v] || null) : ''; }
function shopCatToUni(v){ return v ? (SHOP_TO_UNI_CAT[v] || v) : ''; }
/* v96-swap (08/11): doi noi dung 2 trang — trang Shop hien DANH SACH MAU,
   trang Mau hien DANH SACH SHOP. Anh xa nguoc ten linh vuc mau -> ma dung
   chung, de dien san dropdown fUniCat tu URL ?cat= ten linh vuc mau (tu
   hero search / chip trang chu / hub). "Thực phẩm" khong co ma dung chung
   tuong duong nen khong co trong bang nay; truong hop do initList dung
   bien rieng uniModelCat de loc truc tiep theo ten linh vuc mau. */
var MODEL_CAT_TO_UNI = {'Thời trang':'quan-ao','Mỹ phẩm':'my-pham','Gia dụng':'gia-dung','Chung / Đa ngành':'khac'};
/* v96-swap: kieu sap xep cua bo loc chung (luong gio / luong thang) dich
   sang sap xep mau — luong gio = luong yeu cau theo gio cua mau
   (salaryNum); luong thang khong co truong tuong duong o mau nen dich
   sang doanh thu da xac minh (proxy thu nhap thang cua mau). */
function uniSortToModelSort(v){
  if(v==='hourly-asc') return 'wage-asc';
  if(v==='hourly-desc') return 'wage-desc';
  if(v==='monthly-asc') return 'revenue-asc';
  if(v==='monthly-desc') return 'revenue-desc';
  return '';
}
/* v96: tinh dung chung — gia tri 'TP. Hồ Chí Minh' dung cho shop/mau; du
   lieu xuong dung 'TP.HCM' (data-prov) nen doi khi loc xuong. */
function uniProvToFactory(prov){ return prov === 'TP. Hồ Chí Minh' ? 'TP.HCM' : prov; }
function filterShops(list, f){
  return list.filter(function(s){
    if(f.prov && s.province!==f.prov) return false;
    if(f.cat && shopCatGroup(s.product)!==f.cat) return false;
    /* v42: loc gio lam theo truong shifts (suy ra tu req, xem data.js).
       Quyet dinh: shop fulltime hien trong MOI ca (Sang/Chieu/Toi) vi fulltime
       lam ca ngay, dong thoi hien khi loc rieng "Fulltime". Shop khong co gio
       (shifts rong) chi hien khi chon "Tất cả giờ". */
    if(f.shift){
      var sh = s.shifts || [];
      if(f.shift === 'fulltime'){ if(sh.indexOf('fulltime') === -1) return false; }
      else if(sh.indexOf(f.shift) === -1 && sh.indexOf('fulltime') === -1) return false;
    }
    /* v45: loc theo loai luong + muc luong toi thieu. payMin chi ap dung khi
       da chon loai luong; khong chon loai thi payMin bi bo qua (o nhap bi
       disabled o giao dien). */
    if(f.payType === 'hourly' && parseHourlyMin(s.salary) === null) return false;
    if(f.payType === 'monthly' && parseMonthlyMax(s.salary) === null) return false;
    if(f.payMin != null && f.payType === 'hourly'){ var h = parseHourlyMin(s.salary); if(h === null || h < f.payMin) return false; }
    if(f.payMin != null && f.payType === 'monthly'){ var mm = parseMonthlyMax(s.salary); if(mm === null || mm < f.payMin) return false; }
    return true;
  });
}
/* v96: thanh truot chon hang muc cho bo loc chung trang Shop (danh-sach-shop.html).
   1 khung loc dung chung cho 3 hang muc; truong khong ap dung cho hang muc
   dang chon bi khoa (disabled + mo) va xoa gia tri. Nut Ap dung chay dung bo
   loc cua hang muc dang chon; nut Dat lai xoa toan bo + ve hang muc mac dinh.
   Quy tac khoa: Tinh + Linh vuc dung chung (khong khoa); Sap xep + Gio lam +
   Loai luong + Muc luong toi thieu chi cho Tim Mau; Gia tri lo + So luong lo
   chi cho Lo xa kho; Gia tri don + So luong toi thieu chi cho Xuong may.
   v96-swap (08/11): hang muc Tim Mau render GRID MAU (#listGrid) tren
   chinh trang Shop (doi noi dung 2 trang) — modelRender la ham render
   grid mau cua initList; cong diem dung category 'model'. */
var UNI_LOCKABLE = {
  model: ['fUniSort','fUniShift','fUniPayType','fUniPayMin'],
  lot: ['fUniLotPrice','fUniLotQty'],
  factory: ['fUniFacValue','fUniFacMoq']
};
var UNI_LOCKABLE_ALL = ['fUniSort','fUniShift','fUniPayType','fUniPayMin','fUniLotPrice','fUniLotQty','fUniFacValue','fUniFacMoq'];
function getUniCat(){
  var b = document.querySelector('.uni-cat-btn.active');
  return b ? b.getAttribute('data-uni-cat') : 'model';
}
function setUniCatFieldStates(cat){
  UNI_LOCKABLE_ALL.forEach(function(id){
    var el = document.getElementById(id);
    if(!el) return;
    var allowed = UNI_LOCKABLE[cat] && UNI_LOCKABLE[cat].indexOf(id) !== -1;
    var wrap = el.closest ? el.closest('.uni-field') : null;
    if(id === 'fUniPayMin'){
      /* rieng o luong toi thieu: do mo/khoa theo loai luong (syncPayMin);
         o day chi xu ly khi roi khoi hang muc Tim Mau. */
      if(cat !== 'model'){ el.disabled = true; el.value = ''; if(wrap) wrap.classList.add('locked'); }
      else if(wrap) wrap.classList.remove('locked');
      return;
    }
    if(allowed){ el.disabled = false; if(wrap) wrap.classList.remove('locked'); }
    else { el.disabled = true; el.value = ''; if(wrap) wrap.classList.add('locked'); }
  });
}
/* v96: dong bo khoi hub "Tim mau cho 11.11" theo o Tinh + Linh vuc dung chung
   khi ap dung hang muc Tim Mau — goi truc tiep ham render cua hub (khong qua
   cong diem, vi nut Ap dung da qua cong 'shop'). */
function syncHubFromUni(){
  var hubProv = document.getElementById('hubProv');
  var hubCat = document.getElementById('hubCat');
  var box = document.getElementById('hubResults');
  if(!hubProv || !hubCat || !box) return;
  hubProv.value = document.getElementById('fUniProv').value;
  var mc = uniCatToModel(document.getElementById('fUniCat').value);
  var ok = false;
  for(var i = 0; i < hubCat.options.length; i++){ if(hubCat.options[i].value === mc){ ok = true; break; } }
  hubCat.value = ok ? mc : '';
  if(typeof box._hubRender === 'function'){ box._hubRender(); }
}
function initUniCatSwitch(lotCtl, facCtl, modelRender, syncPayMinFn, onResetFn){
  var btns = document.querySelectorAll('.uni-cat-btn');
  if(!btns.length) return;
  var applyBtn = document.getElementById('uniApplyBtn');
  var resetBtn = document.getElementById('uniResetBtn');
  function collapseSection(id, moreId){
    var s = document.getElementById(id);
    if(s) s.classList.add('collapsed');
    var b = moreId ? document.getElementById(moreId) : null;
    if(b){ b.setAttribute('aria-expanded','false'); b.textContent='Xem thêm ↓'; }
  }
  function clearUniCount(){
    var c = document.getElementById('uniCount'); if(c) c.textContent = '';
    var e = document.getElementById('uniEmpty'); if(e) e.hidden = true;
  }
  function setCat(cat){
    btns.forEach(function(b){
      var on = b.getAttribute('data-uni-cat') === cat;
      b.classList.toggle('active', on);
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
    setUniCatFieldStates(cat);
    if(typeof syncPayMinFn === 'function') syncPayMinFn();
    clearUniCount();
  }
  btns.forEach(function(b){
    b.addEventListener('click', function(){ setCat(b.getAttribute('data-uni-cat')); });
  });
  setUniCatFieldStates(getUniCat());
  if(typeof syncPayMinFn === 'function') syncPayMinFn();
  if(applyBtn){
    applyBtn.addEventListener('click', function(){
      var cat = getUniCat();
      var b = applyBtn;
      if(cat === 'lot'){
        if(lotCtl && lotCtl.apply) return gateFilterApply('lot', 'danh-sach-shop.html', function(){ lotCtl.apply(); closeFilterOf(b); }, b);
      } else if(cat === 'factory'){
        if(facCtl && facCtl.apply) return gateFilterApply('factory', 'danh-sach-shop.html', function(){ facCtl.apply(); closeFilterOf(b); }, b);
      }
      return gateFilterApply('model', 'danh-sach-shop.html', function(){
        if(typeof modelRender === 'function') modelRender(1);
        syncHubFromUni();
        collapseSection('lo-hang-xa-kho', 'lotMoreBtn');
        collapseSection('xuong-may-gia-cong', 'factoryMoreBtn');
        closeFilterOf(b);
      }, b);
    });
  }
  if(resetBtn){
    resetBtn.addEventListener('click', function(){
      var card = document.getElementById('uniFilter');
      if(card){ card.querySelectorAll('select, input').forEach(function(el){ el.value = ''; }); }
      if(lotCtl && lotCtl.reset) lotCtl.reset();
      if(facCtl && facCtl.reset) facCtl.reset();
      if(typeof onResetFn === 'function') onResetFn();
      if(typeof modelRender === 'function') modelRender(1);
      setCat('model');
    });
  }
}
/* v96-swap (08/11): doi noi dung 2 trang — grid MAU (#listGrid) do initList
   render tu khung loc chung; initShopPage goi ham render do qua 2 bien
   nay khi bam Ap dung / Dat lai. uniModelCat/uniModelQ giu bo loc tu URL
   (?cat= ten linh vuc mau khong co ma chung, ?q= tu khoa hero search). */
var uniModelCat = null;
var uniModelQ = '';
var modelGridRender = null;
var modelGridClearQ = null;
/* v96-swap (08/11): doi noi dung 2 trang — trang Mau (danh-sach-mau.html)
   hien DANH SACH SHOP + bo loc shop rieng (fSh*). Ham nay chi render grid
   shop (9/trang + phan trang, dong bo URL); phan lo/xuong + khung loc chung
   chuyen sang initShopPage (trang Shop). */
function initShops(){
  initFilterToggle(); /* v72: nut mo/dong bo loc tren mobile */
  var el=document.getElementById('publicShopsList'); if(!el) return;
  var p=params(); var page=parseInt(p.page||'1',10)||1;
  var perPage=9;
  /* bo loc shop trang Mau — cung truong + cung gia tri nhu bo loc chung
     (fUni*) nhung id rieng fSh* (khong co thanh truot chon hang muc). */
  function readForm(){return {prov:elVal('fShProv'),cat:uniCatToShop(elVal('fShCat')),sort:elVal('fShSort'),shift:elVal('fShShift'),payType:elVal('fShPayType'),payMin:parseMoneyInput(elVal('fShPayMin'))};}
  function render(pg){
    var f=readForm();
    var base=f.sort ? sortShopsBy(D.shops||[],f.sort) : defaultShopOrder(D.shops||[]);
    if(!f.sort) base=applyStarOrder(base, STAR_STATS, Date.now()); // v99 (§2): tang sao 60 phut len truoc
    var list=filterShops(base,f);
    var totalPages=Math.max(1,Math.ceil(list.length/perPage)); if(pg>totalPages) pg=totalPages; if(pg<1) pg=1;
    el.innerHTML=list.length?list.slice((pg-1)*perPage,pg*perPage).map(shopCardHTML).join(''):emptyResultsHTML('Chưa có tin tuyển khớp bộ lọc. Hãy chọn tỉnh khác, chọn lĩnh vực khác, hoặc bấm Đặt lại.');
    renderPager(document.getElementById('shopPager'),pg,totalPages,list.length,function(np){render(np); el.scrollIntoView();},perPage,'tin tuyển');
    setParams(Object.assign({},f,{page:String(pg)}));
  }
  if(p.prov) document.getElementById('fShProv').value=p.prov;
  if(p.cat) document.getElementById('fShCat').value=shopCatToUni(p.cat);
  if(p.sort) document.getElementById('fShSort').value=p.sort;
  if(p.shift) document.getElementById('fShShift').value=p.shift;
  if(p.paytype){ var pt=document.getElementById('fShPayType'); if(pt) pt.value=p.paytype; }
  if(p.paymin){ var pm=document.getElementById('fShPayMin'); if(pm) pm.value=p.paymin; }
  /* v45: o "Muc luong toi thieu" chi nhap duoc sau khi chon loai luong;
     nhan/placeholder doi theo loai; bo chon loai thi khoa + xoa gia tri. */
  function syncPayMin(){
    var pt=elVal('fShPayType');
    var inp=document.getElementById('fShPayMin'), lab=document.getElementById('fShPayMinLabel');
    if(!inp||!lab) return;
    if(pt==='hourly'){ lab.textContent='Lương giờ tối thiểu (đ/giờ)'; inp.placeholder='VD: 100000'; inp.disabled=false; }
    else if(pt==='monthly'){ lab.textContent='Lương tháng tối thiểu (triệu/tháng)'; inp.placeholder='VD: 15'; inp.disabled=false; }
    else { lab.textContent='Mức lương tối thiểu'; inp.placeholder='Chọn loại lương trước'; inp.disabled=true; inp.value=''; }
  }
  var fShPayTypeEl=document.getElementById('fShPayType');
  if(fShPayTypeEl) fShPayTypeEl.addEventListener('change',syncPayMin);
  syncPayMin();
  var applyBtn=document.getElementById('shopApplyBtn');
  if(applyBtn) applyBtn.addEventListener('click',function(){ var b=applyBtn; return gateFilterApply('shop', 'danh-sach-mau.html', function(){ render(1); closeFilterOf(b); }, b); });
  var resetBtn=document.getElementById('shopResetBtn');
  if(resetBtn) resetBtn.addEventListener('click',function(){['fShProv','fShCat','fShSort','fShShift','fShPayType','fShPayMin'].forEach(function(id){var el=document.getElementById(id); if(el) el.value='';}); syncPayMin(); render(1);});
  el._shopRender=render; /* v99: initStars goi lai khi nap xong so sao */
  render(page);
  // v91 (9): vào từ link đã lọc sẵn thì hướng ngay tới dòng kết quả /
  // bảng "Chưa có dữ liệu" (như trang Mẫu).
  try {
    if ((p.prov || p.cat || p.sort || p.shift || p.paytype || p.paymin)
      && el && typeof el.scrollIntoView === 'function') el.scrollIntoView({ behavior: 'auto', block: 'start' });
  } catch (e) {}
}
/* v96-swap (08/11): khoi tao rieng cho trang Shop (danh-sach-shop.html) —
   render the lo/xuong, xoay the, bo loc lo/xuong, khung loc chung
   (uni switch). Grid mau (#listGrid) do initList render; nut Ap dung /
   Dat lai o khung chung goi modelGridRender qua initUniCatSwitch. */
function initShopPage(){
  var uni=document.getElementById('uniFilter'); if(!uni) return;
  renderLotSections(); /* v76: render the lo/xuong TRUOC khi bo loc chup danh sach the */
  rotateStaticGrids();
  var lotCtl = initLotFilter();
  var facCtl = initFactoryFilter();
  initFilterToggle(); /* v72: nut mo/dong bo loc tren mobile */
  /* v45: o "Muc luong toi thieu" chi nhap duoc sau khi chon loai luong;
     nhan/placeholder doi theo loai; bo chon loai thi khoa + xoa gia tri.
     v96: chi mo khi dang o hang muc Tim Mau (truong bi khoa o Lo/Xuong). */
  function syncPayMin(){
    var pt=elVal('fUniPayType');
    var inp=document.getElementById('fUniPayMin'), lab=document.getElementById('fUniPayMinLabel');
    if(!inp||!lab) return;
    if(getUniCat()!=='model'){ lab.textContent='Mức lương tối thiểu'; inp.placeholder='Chọn loại lương trước'; inp.disabled=true; inp.value=''; return; }
    if(pt==='hourly'){ lab.textContent='Lương giờ tối thiểu (đ/giờ)'; inp.placeholder='VD: 100000'; inp.disabled=false; }
    else if(pt==='monthly'){ lab.textContent='Lương tháng tối thiểu (triệu/tháng)'; inp.placeholder='VD: 15'; inp.disabled=false; }
    else { lab.textContent='Mức lương tối thiểu'; inp.placeholder='Chọn loại lương trước'; inp.disabled=true; inp.value=''; }
  }
  var fUniPayTypeEl=document.getElementById('fUniPayType');
  if(fUniPayTypeEl) fUniPayTypeEl.addEventListener('change',syncPayMin);
  syncPayMin();
  /* v96: thanh truot chon hang muc + khoa/mo truong + nut Ap dung / Dat lai
     dung chung cho ca 3 hang muc; hang muc Tim Mau render grid mau. */
  initUniCatSwitch(lotCtl, facCtl, function(pg){ if(typeof modelGridRender==='function') modelGridRender(pg); }, syncPayMin, function(){ if(typeof modelGridClearQ==='function') modelGridClearQ(); });
}
/* List page: grid + filters + pagination 12/page, URL-synced */
/* v96-swap (08/11): grid MAU gio o trang Shop (danh-sach-shop.html), loc
   bang KHUNG LOC CHUNG (#uniFilter, hang muc Tim Mau) thay cho bo loc mau
   cu (fProv...fQ da bo khoi trang Mau). Anh xa truong chung -> mau: tinh
   truc tiep; linh vuc qua uniCatToModel (tru khi URL ?cat= la ten linh vuc
   mau khong co ma chung, vd "Thực phẩm", thi giu bien rieng uniModelCat);
   sap xep qua uniSortToModelSort; gio lam 'fulltime' bo qua (mau khong co
   fulltime); luong gio -> wageMin, luong thang -> revMin (cung don vi
   trieu). Tu khoa ?q= tu hero search duoc giu den khi bam Dat lai. Gioi
   tinh + o tim kiem rieng cua bo loc cu khong con (khung chung khong co
   2 truong nay). */
function initList(){
  var grid=document.getElementById('listGrid'); if(!grid) return;
  initFilterToggle(); /* v72: nut mo/dong bo loc tren mobile */
  var p=params(); var page=parseInt(p.page||'1',10)||1;
  /* prefill tu URL: ?cat= co the la ten linh vuc mau (hero/chip/hub) hoac
     ma dung chung (link cu); ?q= la tu khoa hero search. */
  if(p.cat){
    var mc = p.cat;
    var uniCode = MODEL_CAT_TO_UNI[mc];
    if(uniCode){ var fc=document.getElementById('fUniCat'); if(fc) fc.value=uniCode; uniModelCat=null; }
    else if(UNI_CAT_TO_MODEL[mc]){ var fc2=document.getElementById('fUniCat'); if(fc2) fc2.value=mc; uniModelCat=null; }
    else { uniModelCat=mc; }
  }
  if(p.q) uniModelQ=p.q;
  if(p.prov){ var fp=document.getElementById('fUniProv'); if(fp) fp.value=p.prov; }
  if(p.sort){ var fs=document.getElementById('fUniSort'); if(fs) fs.value=p.sort; }
  if(p.shift){ var fh=document.getElementById('fUniShift'); if(fh) fh.value=p.shift; }
  if(p.paytype){ var pt=document.getElementById('fUniPayType'); if(pt) pt.value=p.paytype; }
  if(p.paymin){ var pm=document.getElementById('fUniPayMin'); if(pm) pm.value=p.paymin; }
  /* doi dropdown Linh vuc -> xoa bien rieng (de dropdown quyet dinh). */
  var fUniCatEl=document.getElementById('fUniCat');
  if(fUniCatEl) fUniCatEl.addEventListener('change',function(){ uniModelCat=null; });
  function readForm(){
    var shift=elVal('fUniShift'); if(shift==='fulltime') shift='';
    var payType=elVal('fUniPayType');
    var payMin=parseMoneyInput(elVal('fUniPayMin'));
    return {
      prov:elVal('fUniProv'),
      cat:(uniModelCat!==null ? uniModelCat : uniCatToModel(elVal('fUniCat'))),
      gender:'',
      sort:uniSortToModelSort(elVal('fUniSort')),
      shift:shift,
      revMin:(payType==='monthly' ? payMin : null),
      wageMin:(payType==='hourly' ? payMin : null),
      q:uniModelQ
    };
  }
  function render(pg){
    var f=readForm(); var list=filterModels(D.models,f);
    if(f.sort){
      list=sortModelsBy(list,f.sort);
    } else {
      list=defaultModelOrder(list);
      list=applyStarOrder(list, STAR_STATS, Date.now()); // v99 (§2): tang sao 60 phut len truoc
    }
    var totalPages=Math.max(1,Math.ceil(list.length/12)); if(pg>totalPages) pg=totalPages; if(pg<1) pg=1;
    grid.innerHTML=list.length?list.slice((pg-1)*12,pg*12).map(cardHTML).join(''):emptyResultsHTML('Chưa có hồ sơ khớp bộ lọc. Hãy chọn tỉnh khác, chọn Toàn quốc / Live online, hoặc bấm Đặt lại.');
    renderPager(document.getElementById('pager'),pg,totalPages,list.length,function(np){render(np); grid.scrollIntoView();},12,'hồ sơ');
    /* URL giu dang ?cat= ten linh vuc mau (nhu hero/chip/hub) + cac khoa
       cua bo loc chung; q chi ghi khi co tu khoa. */
    var sp={prov:f.prov,cat:f.cat,sort:elVal('fUniSort'),shift:elVal('fUniShift'),paytype:elVal('fUniPayType'),paymin:elVal('fUniPayMin'),q:f.q,page:String(pg)};
    setParams(sp);
  }
  modelGridRender=render;
  modelGridClearQ=function(){ uniModelQ=''; uniModelCat=null; };
  grid._modelRender=render;
  grid._modelClearQ=modelGridClearQ;
  render(page);
  // v91 (9): vào từ link đã lọc sẵn (vd tìm kiếm hero trang chủ) thì hướng
  // ngay tới dòng kết quả / bảng "Chưa có dữ liệu", không để người dùng ở
  // đầu trang phải tự cuộn xuống.
  try {
    if ((p.prov || p.cat || p.sort || p.shift || p.paytype || p.paymin || p.q)
      && grid && typeof grid.scrollIntoView === 'function') grid.scrollIntoView({ behavior: 'auto', block: 'start' });
  } catch (e) {}
}
/* v63: thu tu mac dinh cua trang Mau (initList): luot xem giam dan, binh luan
   giam dan, anh that truoc (photoTier), roi xoay trong tung nhom. v64: xoay
   3 lan/ngay theo cua so 8 tieng (gio VN), on dinh trong cua so. Tach ra ham
   rieng de khoi hub 11.11 dung DUNG thu tu do — shop khong thay hai thu tu
   khac nhau cho cung mot bo loc. */
function defaultModelOrder(list, date){
  var out=list.slice().sort(function(a,b){return (b.views-a.views)||(b.comments-a.comments)||((b.photoUrl?1:0)-(a.photoUrl?1:0));});
  return rotateWindow(out, function(m){ return m.views+'|'+m.comments+'|'+photoTier(m); }, date);
}
/* v63: khoi "Tim mau cho 11.11 — 3 buoc" tren trang Danh cho Shop (thiet ke
   2026-11-06, design-2026-11-06-tim-mau-nhanh-cho-shop-11-11.md). Chi 1 khoi
   moi tren danh-sach-shop.html + ham render rieng o day + CSS .hub-card
   trong v20.css. Khong doi du lieu js/data.js, bo loc tin tuyen shop, phan
   trang, form ho so shop / dang tin, trang chu, trang mau hay trang chi tiet.
   Khong hua "Con trong"/"San sang 11.11", khong hien luot xem/binh luan (0/0),
   khong hien so rieng cua mau, khong them o loc gio lam / ca toi. */
var HUB_ZALO = 'https://zalo.me/0329983699';
/* v63: tin nhan Zalo soan san cho shop can mau dot 11.11 — dung mau cau cua
   thiet ke 04/11 ("Hoi lich 11.11 qua Zalo", chua code toi 06/11): neu thiet
   ke 04/11 duoc code sau thi tai dung ham nay, khong viet lai ham moi. Chi
   dung Zalo chung Ver2Solution; khong hien so rieng cua mau o bat ky dau
   (ke ca 5 ho so co Zalo cong khai trong du lieu). */
function hubZaloHref(m){
  var msg = 'Chào Ver2Solution, tôi là shop cần mẫu ' + (m.name || '') + ' live ' + (m.cat || '') + ' đợt 11.11 (10–13/11). Nhờ giới thiệu và xác nhận lịch trống giúp tôi.';
  return HUB_ZALO + '?text=' + encodeURIComponent(msg);
}
/* v63: link video demo cua ho so — truong luu tren Supabase la demo_video_url
   (trang-cua-toi.html, uploadDemoVideo tra ve public URL); chap nhan ca ten
   bien the de phong doi ten truong. Hien tai 0/20 ho so co video demo nen
   khong the nao duoc render; khi mau tu dang ky tai video demo len thi link
   tu xuat hien, khong can sua code. */
function demoUrlOf(m){ return (m && (m.demo_video_url || m.demoUrl || m.demo)) || ''; }
/* v63: the ket qua trong khoi hub = the 5 giay cardHTML (v28) nhung nut
   "Nhan Zalo" mo Zalo kem tin nhan soan san (ten that + linh vuc + dot
   11.11) thay cho link Zalo chung tran; them link "Xem video demo" neu co. */
/* v99: the hub = the rut gon (2 dong + sao) + hang nut rieng DUOI the (nhu
   nut Binh luan cua the lo): link Zalo tin nhan soan san + link video demo
   (neu co). Khong chen them link vao trong 2 dong cua the (§1). */
function hubCardHTML(m){
  var z = hubZaloHref(m), d = demoUrlOf(m);
  return '<div class="hub-card">' + cardHTML(m)
    + '<div class="hub-actions"><a class="btn btn-ghost btn-sm" href="'+esc(z)+'" target="_blank" rel="noopener">Nhắn Zalo</a>'
    + (d ? '<a class="btn btn-ghost btn-sm" href="'+esc(d)+'" target="_blank" rel="noopener">▶ Xem video demo</a>' : '')
    + '</div></div>';
}
/* v63: ket qua hub = loc theo tinh + linh vuc (chi 2 o nay, khong loc gio lam
   / luong / doanh thu) roi xep DUNG thu tu mac dinh cua trang Mau. */
function hubResults(prov, cat, date){
  return defaultModelOrder(filterModels(D.models, {prov: prov || '', cat: cat || ''}), date);
}
/* v63: link sang trang danh sach mau (v96-swap: grid mau gio o trang Shop)
   dung tham so prov/cat ma initList da doc + dien san vao bo loc khi tai
   trang (da kiem chung trong code v52). Ca 2 rong thi ve trang Shop khong
   tham so. */
function hubAllLink(prov, cat){
  var qs = [];
  if(prov) qs.push('prov=' + encodeURIComponent(prov));
  if(cat) qs.push('cat=' + encodeURIComponent(cat));
  return 'danh-sach-shop.html' + (qs.length ? '?' + qs.join('&') : '');
}
/* v63: dong trang thai khi to hop 0 mau — chi noi dung su that + duong doi
   lua chon, khong goi y mau sai tinh/linh vuc, khong hien the trong. */
function hubEmptyHTML(prov, cat){
  var total = (D.models || []).length;
  if(prov && cat) return 'Chưa có mẫu ' + esc(cat) + ' ở ' + esc(prov) + '. Thử chọn Toàn quốc / Live online, hoặc <a href="' + hubAllLink('', cat) + '">xem tất cả mẫu ' + esc(cat) + ' →</a>';
  if(prov) return 'Chưa có mẫu ở ' + esc(prov) + '. Thử chọn Toàn quốc / Live online, hoặc <a href="danh-sach-shop.html">xem tất cả ' + total + ' mẫu →</a>';
  if(cat) return 'Chưa có mẫu ' + esc(cat) + '. <a href="danh-sach-shop.html">Xem tất cả ' + total + ' mẫu →</a>';
  return '';
}
function initHub(){
  var box = document.getElementById('hubResults'); if(!box) return;
  var provSel = document.getElementById('hubProv'), catSel = document.getElementById('hubCat');
  var countEl = document.getElementById('hubCount'), sub = document.getElementById('hubSub');
  var total = (D.models || []).length;
  if(sub) sub.textContent = 'Hiện có ' + total + ' mẫu trên sàn. Chọn tỉnh và lĩnh vực rồi xem ngay mẫu phù hợp — chỉ hiện thông tin thật.';
  function render(){
    var prov = provSel ? provSel.value : '', cat = catSel ? catSel.value : '';
    if(!prov && !cat){
      box.innerHTML = '';
      if(countEl) countEl.innerHTML = 'Chọn tỉnh và lĩnh vực ở trên để xem mẫu phù hợp — hoặc <a href="danh-sach-shop.html">xem tất cả ' + total + ' mẫu →</a>';
      return;
    }
    var list = hubResults(prov, cat);
    if(!list.length){
      box.innerHTML = emptyResultsHTML(hubEmptyHTML(prov, cat));
      if(countEl) countEl.innerHTML = hubEmptyHTML(prov, cat);
      return;
    }
    box.innerHTML = list.slice(0, 3).map(hubCardHTML).join('');
    if(countEl) countEl.innerHTML = 'Có ' + list.length + ' mẫu phù hợp. <a href="' + hubAllLink(prov, cat) + '">Xem tất cả ' + list.length + ' mẫu →</a>';
  }
  if(provSel) provSel.addEventListener('change', function(){ return gateFilterApply('model', pointsPageName(), render, provSel); });
  if(catSel) catSel.addEventListener('change', function(){ return gateFilterApply('model', pointsPageName(), render, catSel); });
  /* v96: khung loc chung trang Shop dong bo hub khi ap dung hang muc Tim Mau
     (goi truc tiep, khong qua cong diem). */
  box._hubRender = render;
  render();
}
/* News page: newest first by default, category filter, oldest sort option.
   Sidebar "most read" is NOT a fabricated read count: no verified read numbers
   exist, so every entry is labelled unverified (0) and ordered newest-first as
   a temporary placeholder, exactly as v19 stated. The pinned article is now
   a real internal page (bai-viet-bop-reach.html). */
function initNews(){
  var main=document.getElementById('newsMain'); if(!main) return;
  var catSel=document.getElementById('newsCat'), sortSel=document.getElementById('newsSort');
  var cats=[]; D.articles.forEach(function(a){if(cats.indexOf(a.cat)===-1) cats.push(a.cat);});
  cats.forEach(function(c){var o=document.createElement('option'); o.value=c; o.textContent=c; catSel.appendChild(o);});
  function linkHTML(a){
    return articleLink(a);
  }
  function render(){
    var list=D.articles.slice();
    if(catSel.value) list=list.filter(function(a){return a.cat===catSel.value;});
    list.sort(function(x,y){var dx=x.date||'',dy=y.date||''; return sortSel.value==='oldest' ? (dx<dy?-1:dx>dy?1:0) : (dx>dy?-1:dx<dy?1:0);});
    /* v100: danh sach tin dung chung the tin rut gon (1 anh + 2 dong).
       Anh goc / takeaway / nut diem chi con o trang chi tiet bai-viet,
       khong hien trong danh sach nua. Bo loc + sap xep + dem + sidebar giu nguyen. */
    main.innerHTML=list.map(function(a){ return newsCardHTML(a, null, true); }).join('') || emptyResultsHTML('Chưa có bài báo nào khớp bộ lọc.');
    var cnt=document.getElementById('newsCount'); if(cnt) cnt.textContent=list.length+' bài khớp bộ lọc.';
    var most=document.getElementById('mostList');
    if(most) most.innerHTML=D.articles.slice().sort(function(x,y){return (x.date||'')>(y.date||'')?-1:1;}).slice(0,20).map(function(a,i){
      return '<li><span class="rank">'+(i+1)+'</span><span>'+linkHTML(a)+'<span class="meta" style="display:block">Lượt đọc: chưa kiểm chứng (tạm ghi 0) · '+(a.date||'Chưa có ngày')+'</span></span></li>';
    }).join('');
  }
  catSel.addEventListener('change',render); sortSel.addEventListener('change',render); render();
}
/* Detail: 2-column layout + mini-card list of the other 19 (names, never ids) */
function initDetail(){
  var root=document.getElementById('detailRoot'); if(!root) return;
  var id=params().id || D.models[0].id;
  var m=D.models.filter(function(x){return x.id===id;})[0];
  if(!m){root.innerHTML='<p>Không tìm thấy hồ sơ.</p>'; return;}
  root.innerHTML='<div class="detail-layout"><div class="detail-main"><div class="detail-photo">'+photoHTML(m)+'<span class="ph-note" style="position:absolute;left:14px;bottom:14px;background:rgba(0,0,0,.62);color:#fff;border-radius:999px;padding:6px 12px;font-size:13px;font-weight:700">'+photoNote(m)+'</span></div>'
  + '<div class="detail-body"><span class="status" style="position:static;display:inline-flex"><i></i>'+esc(m.status)+'</span>'
  + '<h1>'+esc(m.province)+' — '+esc(m.name)+'</h1><p class="subtitle">'+esc(m.title)+'</p>'
  + '<div class="tags"><span class="tag">📍 '+esc(m.province)+'</span><span class="tag">'+esc(m.cat)+'</span><span class="tag soft">'+esc(m.form)+'</span><span class="tag soft">Giới tính: '+esc(m.gender)+'</span></div>'
  + '<div class="fact-grid">'
  + '<div class="fact"><b>Tỉnh / nơi muốn làm việc</b><span>'+esc(m.province)+'</span></div>'
  + '<div class="fact"><b>Giỏi livestream nhất</b><span>'+esc(m.cat)+'</span></div>'
  + '<div class="fact"><b>Lương mong muốn</b><span>'+esc(m.salary)+'</span></div>'
  + '<div class="fact"><b>Lịch làm việc</b><span>'+esc(m.schedule)+'</span></div>'
  + '<div class="fact"><b>Doanh thu cao nhất</b><span>'+esc(revenueText(m))+'</span></div>'
  + '<div class="fact"><b>Chiều cao / cân nặng</b><span>'+esc(m.height)+'</span></div>'
  + '<div class="fact"><b>Đánh giá</b><span>'+esc(m.rating)+'</span></div>'
  + '<div class="fact"><b>Ngày bài gốc</b><span>'+esc(m.date)+'</span></div></div>'
  + '<h2>Kinh nghiệm</h2><p>'+esc(m.exp)+'</p>'
  + '<p class="warn">⚠ CHƯA XÁC NHẬN ĐỒNG Ý ĐĂNG WEB — hồ sơ từ bài đăng công khai, sẽ xóa khi có hồ sơ mới tự đăng ký thay thế.</p>'
  // v99 (§3): sao dong bo voi the danh sach + mien tru + goi y dang ky/
  // dang nhap de sua ho so va ghim top (nut ghim o hop mountPointsDetail).
  + '<p class="detail-star">Ấn sao để đưa hồ sơ này lên top 60 phút: ' + starButtonHTML('model_profile', m.id) + '</p>'
  + '<p class="disclaimer">'+DISCLAIMER+'</p>'+ownerNoteHTML('model')+'</div></div>'
  + '<div><div class="contact-card"><h2>Liên hệ trực tiếp với mẫu</h2>'
  + gatedContactsHTML('model_profile', m.id, m.contacts)
  + '<p>Chỉ hiển thị thông tin liên hệ do chính mẫu công khai trong bài đăng hoặc trên kênh công khai của mẫu. Thông tin chưa công khai không hiển thị. Trước khi chốt, shop xác nhận lại lịch làm việc và tình trạng tìm việc với mẫu, vì lịch ghi trong bài là tại thời điểm bài đăng.</p>'
  + '<a class="btn btn-light" data-track="xem-bai-goc-mau" href="'+esc(m.src)+'" target="_blank" rel="noopener">Xem bài gốc trên Facebook →</a>'
  + '<a class="btn btn-light" data-track="nhan-zalo-ver2solution" href="https://zalo.me/0329983699" target="_blank" rel="noopener">Nhắn Zalo Ver2Solution 032 998 3699</a>'
  + '<a class="btn btn-ghost" data-track="yeu-cau-go-ho-so" style="background:transparent;color:#fff;border-color:#fff" href="https://zalo.me/0329983699" target="_blank" rel="noopener">Yêu cầu gỡ hồ sơ</a></div>'
  + '<div class="side-card"><h2 style="margin-top:0">Thông tin thêm</h2><p><b>Hình thức:</b> '+esc(m.form)+'</p><p><b>Giới tính:</b> '+esc(m.gender)+'</p><p><b>Bài gốc:</b> <a href="'+esc(m.src)+'" target="_blank" rel="noopener">Xem bài gốc trên Facebook</a> · Ngày bài: '+esc(m.date)+'</p></div></div></div>';
  var others=document.getElementById('otherGrid');
  if(others) others.innerHTML=D.models.filter(function(x){return x.id!==m.id;}).map(miniHTML).join('');
  var title=document.getElementById('detailTitle'); if(title) title.textContent='Hồ sơ: '+m.province+' — '+m.name;
  mountPointsDetail('model_profile', m.id);
}
/* Shop detail (v32): company-page layout after the big job sites
   (VietnamWorks company page: header with big logo + name, key facts,
   contact, then the company's own open jobs). The logo is 96px in
   .company-head — NOT inside .detail-photo, whose img rule (absolute,
   inset 0, cover) would stretch it to fill a 4/3 frame. The h1 is the
   shop name only (company-page pattern); the province stays in the
   subtitle, tags and facts. The fact-grid keeps the full table including
   "Chưa cập nhật" (same rule as the model detail page); the job item
   below hides empty values, like a job card. Each shop has exactly 1
   open job (the collected post) — no extra jobs are invented. */
function initShopDetail(){
  var root=document.getElementById('shopDetailRoot'); if(!root) return;
  var id=params().id || (D.shops[0]||{}).id;
  var s=(D.shops||[]).filter(function(x){return x.id===id;})[0];
  if(!s){root.innerHTML='<p>Không tìm thấy shop.</p>'; return;}
  var loc = esc(s.province)+(s.district && s.district!=='Chưa cập nhật' ? ' — '+esc(s.district) : '');
  var sub = (hasReal(s.product) ? '🎯 '+esc(s.product)+' · ' : '')+'📍 '+loc;
  var meta = [];
  if(hasReal(s.salary)) meta.push('💰 '+esc(s.salary));
  meta.push('📍 '+loc);
  if(hasReal(s.date)) meta.push('🗓 '+esc(s.date));
  var jobTitle = hasReal(s.product) ? 'Tuyển mẫu livestream — '+esc(s.product) : 'Tuyển mẫu livestream';
  root.innerHTML='<div class="detail-layout"><div class="detail-main">'
  + '<div class="company-head">'+shopLogoHTML(s)+'<div><h1>'+esc(s.name)+'</h1>'
  + '<p class="shop-sub">'+sub+'</p>'
  + '<div class="tags"><span class="tag">📍 '+esc(s.province)+'</span>'+(hasReal(s.product) ? '<span class="tag">'+esc(s.product)+'</span>' : '')+(s.shopNameKnown ? '' : '<span class="tag soft">người đăng tin tuyển</span>')+'</div></div></div>'
  + '<div class="detail-body">'
  + '<h2>Thông tin shop</h2>'
  + '<div class="fact-grid">'
  + '<div class="fact"><b>Tỉnh / thành phố</b><span>'+esc(s.province)+'</span></div>'
  + '<div class="fact"><b>Quận / huyện</b><span>'+esc(s.district)+'</span></div>'
  + '<div class="fact"><b>Mặt hàng</b><span>'+esc(s.product)+'</span></div>'
  + '<div class="fact"><b>Mức lương</b><span>'+esc(s.salary)+'</span></div>'
  + '<div class="fact"><b>Yêu cầu chính</b><span>'+esc(s.req)+'</span></div>'
  + '<div class="fact"><b>Kênh livestream</b><span>'+esc(s.channels)+'</span></div>'
  + '<div class="fact"><b>Ngày đăng tin</b><span>'+esc(s.date)+'</span></div></div>'
  + '<h2>Tin tuyển đang mở</h2>'
  + '<p class="job-count">Hiện có 1 tin tuyển đang mở.</p>'
  + '<article class="job-item">'
  + '<h3>'+jobTitle+'</h3>'
  + '<p class="job-meta">'+meta.join(' · ')+'</p>'
  + '<p><b>Yêu cầu:</b> '+esc(s.req)+'</p>'
  + (hasReal(s.channels) ? '<p><b>Kênh livestream:</b> '+esc(s.channels)+'</p>' : '')
  + '<div class="card-actions"><a class="btn btn-primary btn-sm" data-track="xem-bai-tuyen-goc" href="'+esc(s.src)+'" target="_blank" rel="noopener">Xem bài tuyển gốc trên Facebook →</a>'
  + '<a class="btn btn-ghost btn-sm" data-track="nhan-zalo-ver2solution" href="https://zalo.me/0329983699" target="_blank" rel="noopener">Nhắn Zalo Ver2Solution</a></div>'
  + '</article>'
  + '<p class="warn">Shop có thể yêu cầu cập nhật hoặc gỡ tin qua nút Góp ý (💬).</p>'
  // v99 (§3): sao dong bo voi the danh sach + mien tru + goi y dang ky/
  // dang nhap de sua tin va ghim top (nut ghim o hop mountPointsDetail).
  + '<p class="detail-star">Ấn sao để đưa shop này lên top 60 phút: ' + starButtonHTML('shop_profile', s.id) + '</p>'
  + '<p class="disclaimer">'+DISCLAIMER+'</p>'+ownerNoteHTML('shop')+'</div></div>'
  + '<div><div class="contact-card"><h2>Liên hệ với shop</h2>'
  + gatedContactsHTML('shop_profile', s.id, s.contacts)
  + '<p>Chỉ hiển thị thông tin liên hệ do chính shop công khai trong bài tuyển hoặc trên kênh công khai của shop. Thông tin chưa công khai không hiển thị.</p>'
  + '<a class="btn btn-light" data-track="nhan-zalo-ver2solution" href="https://zalo.me/0329983699" target="_blank" rel="noopener">Nhắn Zalo Ver2Solution 032 998 3699</a></div></div></div>';
  var others=document.getElementById('otherShops');
  if(others) others.innerHTML=(D.shops||[]).filter(function(x){return x.id!==s.id;}).slice(0,6).map(shopCardHTML).join('');
  mountPointsDetail('shop_profile', s.id);
}
/* v85: thong bao man hinh ban mobile — dung 2 dong (yeu cau nguoi dung
   13:33 + 13:36 ngay 07/11). Chi hien tren mobile (CSS .mobile-notice
   an mac dinh, chi hien <=768px); thanh nho tren cung, tren header,
   tren MOI trang (chen qua js/app.js — script chung chay moi trang).
   Co nut X de tat; sau khi tat thi khong hien lai trong cung phien
   (sessionStorage 'v2s-mobile-notice' = 'off'); phien moi hien lai.
   Khong chan noi dung, khong che nut Dang nhap/Menu, khong tran ngang
   o 390px (static flow, khong fixed). */
var MOBILE_NOTICE_KEY = 'v2s-mobile-notice';
var MOBILE_NOTICE_LINES = ['Mở web PC để xem chi tiết thông tin hay hữu ích', 'Bản thử nghiệm mọi tính năng hoàn toàn miễn phí'];
function initMobileNotice(){
  if(typeof document === 'undefined' || !document.body || !document.createElement) return;
  if(document.getElementById('mobileNotice')) return;
  try {
    if(typeof sessionStorage !== 'undefined' && sessionStorage.getItem(MOBILE_NOTICE_KEY) === 'off') return;
  } catch (e) { /* sessionStorage khong dung duoc thi van hien banner */ }
  var bar = document.createElement('div');
  bar.className = 'mobile-notice';
  bar.id = 'mobileNotice';
  bar.setAttribute('role', 'note');
  var text = document.createElement('div');
  text.className = 'mobile-notice-text';
  MOBILE_NOTICE_LINES.forEach(function (line) {
    var s = document.createElement('span');
    s.textContent = line;
    text.appendChild(s);
  });
  var close = document.createElement('button');
  close.type = 'button';
  close.className = 'mobile-notice-close';
  close.setAttribute('aria-label', 'Đóng thông báo');
  close.textContent = '✕';
  close.addEventListener('click', function () {
    try { if(typeof sessionStorage !== 'undefined') sessionStorage.setItem(MOBILE_NOTICE_KEY, 'off'); } catch (e) {}
    if(bar.parentNode) bar.parentNode.removeChild(bar);
  });
  bar.appendChild(text);
  bar.appendChild(close);
  document.body.insertBefore(bar, document.body.firstChild);
}
/* v85: header phan anh trang thai dang nhap (loi 3, phat hien qua kiem
   chung E2E 13:48 07/11 — truoc day header trang chu van hien nut
   "Đăng Nhập" du da dang nhap). Cap nhat theo yeu cau nguoi dung 15:52
   07/11 (test tren dien thoai that): sau dang nhap nut "Đăng Nhập" BIEN
   MAT, thay bang TEN nguoi dung da dang nhap — bat buoc, moi trang, ca
   mobile lan desktop. Ten lay theo thu tu: user_metadata.full_name/name
   (tai khoan OAuth) -> profiles.full_name (ho so da dien o Trang cua toi)
   -> phan truoc @ cua email (theo bo sung spec 15:52 07/11); chi khi ca 3
   deu khong co moi du phong "Trang của tôi". Nut van tro toi
   trang-cua-toi.html; chua dang nhap thi giu nut "Đăng Nhập" nhu cu. Dung
   chung trang thai phien tu js/auth-ui.js (getSession/onSessionChange);
   khong co auth-ui.js hoac chua ket noi Supabase thi bo qua lang le,
   khong lam vo header. */
function headerMetaName(user){
  if(!user) return null;
  var md = user.user_metadata || {};
  var n = md.full_name || md.name || '';
  if(typeof n === 'string' && n.trim()) return n.trim();
  return null;
}
function headerDisplayName(user){
  if(!user) return null;
  var n = headerMetaName(user);
  if(n) return n;
  var em = user.email || '';
  var at = em.indexOf('@');
  if(at > 0) return em.slice(0, at);
  return null;
}
function initHeaderAuth(){
  if(typeof document === 'undefined' || !document.querySelector) return;
  // v90 (F): [href*="dang-nhap.html"] de khop ca trang bai-viet (href
  // "../dang-nhap.html?next=...") — truoc day chi khop trang goc.
  var btn = document.querySelector('.site-head .btn[href*="dang-nhap.html"]');
  if(!btn) return;
  if(!btn._loginLabel) btn._loginLabel = btn.textContent;
  if(!btn._loginHref) btn._loginHref = btn.getAttribute('href');
  // Tien to thu muc ('' o trang goc, '../' o trang bai-viet) de link
  // Trang cua toi / Trang chu khong tro thanh 404 o trang bai-viet.
  var pathPrefix = (btn._loginHref && btn._loginHref.indexOf('../') === 0) ? '../' : '';
  // Điểm v2 (GĐ2, 20:22 07/11): khi đã đăng nhập, header hiện số dư điểm
  // cạnh tên người dùng, dạng "Tên · 250 điểm". Lỗi/mất mạng/RPC chưa có
  // thì KHÔNG hiện số dư (không vỡ header, không hiện 0 giả).
  var headerName = null, headerBalance = null;
  var menuEl = null, menuNameEl = null, menuPointsEl = null, menuWrap = null;
  function renderHeaderLabel(){
    if(headerName === null) return;
    btn.textContent = headerName + (headerBalance === null ? '' : ' · ' + headerBalance + ' điểm');
    // v90 (F): dong bo ten + diem vao dropdown dang xuat.
    if(menuNameEl) menuNameEl.textContent = headerName;
    if(menuPointsEl){
      if(headerBalance === null){ menuPointsEl.hidden = true; }
      else { menuPointsEl.hidden = false; menuPointsEl.textContent = 'Còn lại: ' + headerBalance + ' điểm'; }
    }
  }
  function loadHeaderBalance(){
    try {
      loadPointsScripts().then(function(){
        var R = window.Ver2Reward;
        if(!R || typeof R.getMyPointsBalanceResult !== 'function') return;
        R.getMyPointsBalanceResult().then(function (r){
          if(r && r.ok){ headerBalance = Number(r.balance) || 0; renderHeaderLabel(); }
        }).catch(function () {});
      });
    } catch (e) { /* bo qua — header giu ten khong so du */ }
  }
  // v90: cho phep lam moi so du header sau khi tru diem (reward.js goi
  // window.V20HeaderRefresh() moi khi spendPoints() thanh cong).
  if(typeof window !== 'undefined') window.V20HeaderRefresh = loadHeaderBalance;
  // v90 (F): dropdown dang xuat duoi vien diem header. Bam vien diem mo
  // dropdown (ten nick + 'Con lai: X diem' + nut Dang xuat); dong khi bam
  // ra ngoai / nhan Escape / sau khi dang xuat. Vien diem do initHeaderAuth
  // tao, dung chung moi trang (goc + bai-viet).
  function toggleMenu(){
    if(!menuEl) return;
    menuEl.hidden = !menuEl.hidden;
  }
  function closeMenu(){
    if(menuEl) menuEl.hidden = true;
  }
  function doSignOut(){
    closeMenu();
    // Cap nhat UI NGAY (giong luong signOut hien co o auth-ui.js:443-462),
    // roi moi doi api().signOut() xong; sau do ve trang chu.
    headerName = null; headerBalance = null;
    try { btn.textContent = btn._loginLabel; btn.setAttribute('href', btn._loginHref); } catch (e) {}
    function goHome(){
      try { if(typeof window !== 'undefined' && window.location) window.location.href = pathPrefix + 'index.html'; } catch (e) {}
    }
    try {
      var M = window.McLivestreamAPI;
      if(M && typeof M.signOut === 'function'){
        var p = M.signOut();
        if(p && typeof p.then === 'function'){ p.then(goHome, goHome); return; }
        goHome(); return;
      }
    } catch (e) {}
    goHome();
  }
  function buildUserMenu(){
    if(menuEl || typeof document === 'undefined' || !document.createElement) return;
    var parent = btn.parentNode;
    if(!parent) return;
    menuWrap = document.createElement('span');
    menuWrap.className = 'user-menu-wrap';
    try { parent.insertBefore(menuWrap, btn); menuWrap.appendChild(btn); } catch (e) { return; }
    menuEl = document.createElement('div');
    menuEl.className = 'user-menu';
    menuEl.hidden = true;
    menuNameEl = document.createElement('a');
    menuNameEl.className = 'user-menu-name';
    menuNameEl.setAttribute('href', pathPrefix + 'trang-cua-toi.html');
    menuEl.appendChild(menuNameEl);
    menuPointsEl = document.createElement('p');
    menuPointsEl.className = 'user-menu-points';
    menuPointsEl.hidden = true;
    menuEl.appendChild(menuPointsEl);
    var out = document.createElement('button');
    out.setAttribute('type', 'button');
    out.className = 'user-menu-logout';
    out.textContent = 'Đăng xuất';
    out.addEventListener('click', function(){ doSignOut(); });
    menuEl.appendChild(out);
    menuWrap.appendChild(menuEl);
    btn.addEventListener('click', function (e){
      if(headerName === null) return; // chua dang nhap: de link dang-nhap chay binh thuong
      if(e && typeof e.preventDefault === 'function') e.preventDefault();
      toggleMenu();
    });
    document.addEventListener('click', function (e){
      if(!menuEl || menuEl.hidden) return;
      try { if(menuWrap && menuWrap.contains(e.target)) return; } catch (err) {}
      closeMenu();
    });
    document.addEventListener('keydown', function (e){
      if(e && e.key === 'Escape') closeMenu();
    });
  }
  buildUserMenu();
  function apply(user){
    if(user){
      headerName = headerDisplayName(user) || 'Trang của tôi';
      btn.setAttribute('href', pathPrefix + 'trang-cua-toi.html');
      renderHeaderLabel();
      loadHeaderBalance();
      if(!headerMetaName(user)){
        /* Chua co ten that trong metadata (dang hien phan truoc @ cua email
           hoac "Trang của tôi") — hoi them bang profiles.full_name; co ten
           that thi doi ten (uu tien hon phan truoc @ cua email). Chi doi ten
           neu nut van dang o trang thai da dang nhap (tranh truong hop nguoi
           dung dang xuat trong luc cho ket qua). */
        try {
          var M = window.McLivestreamAPI;
          if(M && typeof M.fetchMyProfile === 'function'){
            M.fetchMyProfile().then(function (p) {
              if(p && p.full_name && String(p.full_name).trim()
                 && btn.getAttribute('href') === pathPrefix + 'trang-cua-toi.html'){
                headerName = String(p.full_name).trim();
                renderHeaderLabel();
              }
            }).catch(function () {});
          }
        } catch (e) { /* bo qua — giu "Trang của tôi" */ }
      }
    } else {
      headerName = null; headerBalance = null;
      closeMenu(); // v90 (F): dang xuat tu noi khac cung dong dropdown
      btn.textContent = btn._loginLabel;
      btn.setAttribute('href', btn._loginHref);
    }
  }
  try {
    var A = window.V2SAuthUI;
    if(!A || typeof A.getSession !== 'function') return;
    A.getSession().then(function (s) { apply(s && s.user ? s.user : null); }).catch(function () {});
    if(typeof A.onSessionChange === 'function') A.onSessionChange(function (user) { apply(user); });
  } catch (e) { /* bo qua — header giu nut Dang Nhap mac dinh */ }
}
/* v96: dai kich hoat ho so tren trang chu (chi index.html co phan tu
   #kich-hoat-ho-so; trang khac khong co thi bo qua lang le). */
function initActivationStrip(){
  if(typeof document === 'undefined' || !document.getElementById) return;
  if(!document.getElementById('kich-hoat-ho-so')) return;
  try {
    var A = (typeof window !== 'undefined') ? window.V2SActivation : null;
    if(A && typeof A.initHomeStrip === 'function') A.initHomeStrip();
  } catch (e) { /* bo qua — dai an mac dinh */ }
}
/* ---- Điểm thưởng v2: UI chạy lúc tải trang (nút, ghim, bình luận) ---- */
function pointsScriptBase(){
  try { return String(location.pathname || '').indexOf('/bai-viet/') !== -1 ? '../js/' : 'js/'; }
  catch (e) { return 'js/'; }
}
function loadPointsScripts(){
  if (typeof window !== 'undefined' && window.Ver2Reward && window.Ver2Comments) return Promise.resolve(true);
  if (typeof document === 'undefined' || typeof document.createElement !== 'function') return Promise.resolve(false);
  var base = pointsScriptBase();
  function load(src){
    return new Promise(function (resolve){
      if (src.indexOf('reward') !== -1 && window.Ver2Reward) return resolve(true);
      if (src.indexOf('comments') !== -1 && window.Ver2Comments) return resolve(true);
      // Môi trường test (document giả) không có document.head — bỏ qua.
      if (!document.head || typeof document.head.appendChild !== 'function') return resolve(false);
      var s = document.createElement('script'); s.src = src; s.async = false;
      s.onload = function(){ resolve(true); }; s.onerror = function(){ resolve(false); };
      document.head.appendChild(s);
    });
  }
  return load(base + 'reward.js').then(function(){ return load(base + 'comments.js'); });
}
function pointsLoggedIn(){
  try {
    if (window.V2SAuthUI && typeof window.V2SAuthUI.getSession === 'function') {
      return window.V2SAuthUI.getSession().then(function (s){ return !!(s && s.user); }).catch(function(){ return false; });
    }
  } catch (e) {}
  try {
    if (window.McLivestreamAPI && typeof window.McLivestreamAPI.getSession === 'function') {
      return window.McLivestreamAPI.getSession().then(function (s){ return !!(s && s.user); }).catch(function(){ return false; });
    }
  } catch (e) {}
  return Promise.resolve(false);
}
function pointsGuestNoteHTML(){
  return 'Đăng ký / đăng nhập tài khoản để bình luận và các hoạt động khác được cộng điểm thưởng, đổi quà. <a href="dang-ky.html">Đăng ký</a> · <a href="dang-nhap.html">Đăng nhập</a>';
}
function pointsSessionUser(){
  try {
    if (window.V2SAuthUI && typeof window.V2SAuthUI.getSession === 'function') {
      return window.V2SAuthUI.getSession().then(function (s){ return (s && s.user) ? s.user : null; }).catch(function(){ return null; });
    }
  } catch (e) {}
  try {
    if (window.McLivestreamAPI && typeof window.McLivestreamAPI.getSession === 'function') {
      return window.McLivestreamAPI.getSession().then(function (s){ return (s && s.user) ? s.user : null; }).catch(function(){ return null; });
    }
  } catch (e) {}
  return Promise.resolve(null);
}
function pointsPageName(){
  try { var parts = String(location.pathname || '').split('/'); return parts[parts.length - 1] || 'index.html'; }
  catch (e) { return 'index.html'; }
}
// ---- Điểm v2: cổng thu điểm cho bộ lọc (1 điểm/lần, chốt 20:22 07/11) ----
// gateFilterApply(category, page, doApply, msgAnchor): chỉ chạy doApply()
// khi đã trừ được 1 điểm (hoặc lần đổi trong 10s sau lần trừ trước —
// dedup phía client, RPC cũng chống trừ lặp bằng key theo bucket 10s).
// Khách chưa đăng nhập → hiện lời mời đăng ký thay vì lọc. Hết điểm →
// hiện thông báo + link hướng dẫn, KHÔNG áp dụng bộ lọc mới. RPC spend_points
// chưa có (M7 chưa chạy phần này) → báo rõ "chưa bật", KHÔNG lọc khống.
var lastFilterCharge = {};
function filterLastCharge(category){
  var ts = lastFilterCharge[category] || 0;
  try {
    if (typeof localStorage !== 'undefined') {
      var raw = JSON.parse(localStorage.getItem('v20_filter_charge_v1') || '{}');
      if (raw[category] && Number(raw[category]) > ts) ts = Number(raw[category]);
    }
  } catch (e) {}
  return ts;
}
function filterNoteCharge(category, ts){
  lastFilterCharge[category] = ts;
  try {
    if (typeof localStorage !== 'undefined') {
      var raw = JSON.parse(localStorage.getItem('v20_filter_charge_v1') || '{}');
      raw[category] = ts;
      localStorage.setItem('v20_filter_charge_v1', JSON.stringify(raw));
    }
  } catch (e) {}
}
function filterMsgEl(anchorEl){
  if (!anchorEl || !anchorEl.parentNode || typeof document === 'undefined') return null;
  var next = anchorEl.nextSibling;
  while (next && next.nodeType !== 1) next = next.nextSibling;
  if (next && next.className && String(next.className).indexOf('v2s-filter-msg') !== -1) return next;
  if (typeof document.createElement !== 'function') return null;
  var p = document.createElement('p');
  p.className = 'v2s-filter-msg';
  p.setAttribute('role', 'status');
  anchorEl.parentNode.insertBefore(p, anchorEl.nextSibling);
  return p;
}
// v90 (3): sau khi loc ap dung thanh cong, cuon trang toi dau khu vuc ket
// qua (trang danh sach mau/shop — doApply() o day chi render, khong cuon).
// Lo/xuong KHONG cuon o day: apply() cua section da cuon toi the khop dau
// tien (v72); cuon them se ghi de vi tri do. Chi cuon khi loc ap dung
// thanh cong — gate chan (chua dang nhap / het diem / loi) thi khong cuon.
function scrollToResults(category){
  try {
    if (typeof document === 'undefined') return;
    var sel = null;
    if (category === 'model') sel = '#listGrid, #hubResults';
    else if (category === 'shop') sel = '#publicShopsList';
    else return; // 'lot'/'factory': apply() cua section da cuon (v72)
    var el = document.querySelector(sel);
    if (!el || typeof el.scrollIntoView !== 'function') return;
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  } catch (e) { /* loi cuon khong bao gio lam vo loc */ }
}
function gateFilterApply(category, page, doApply, msgAnchor){
  var R = window.Ver2Reward;
  return loadPointsScripts().then(function(){
    return pointsSessionUser().then(function (user){
      var msgEl = msgAnchor ? filterMsgEl(msgAnchor) : null;
      function say(html){ if (msgEl) msgEl.innerHTML = html; }
      if (!user) {
        say('Hãy <a href="dang-ky.html">đăng ký</a> để dùng bộ lọc — đăng ký đủ nhận 250 điểm thưởng! Đã có tài khoản? <a href="dang-nhap.html">Đăng nhập</a>');
        return false;
      }
      var R2 = window.Ver2Reward;
      // v92: lọc tạm miễn phí (cờ V20_FREE_SERVICES ở js/reward.js) — áp
      // dụng ngay, không trừ điểm, không hiện thông báo hết điểm. Cửa đăng
      // nhập cho khách vãng lai đã kiểm tra ở trên, giữ nguyên. R2 không có
      // cờ FREE_SERVICES (bản reward.js cũ / mock test) thì đi đường trừ
      // điểm như cũ.
      if (R2 && R2.FREE_SERVICES === true) {
        try { doApply(); } catch (e) {}
        scrollToResults(category);
        return true;
      }
      if (!R2 || typeof R2.spendPoints !== 'function') { say('Hệ thống điểm chưa bật (đang chờ migration M7), chưa lọc được.'); return false; }
      var now = Date.now();
      if (typeof R2.shouldChargeFilter === 'function' && !R2.shouldChargeFilter(filterLastCharge(category), now)) {
        try { doApply(); } catch (e) {}
        scrollToResults(category); // v90 (3): mien phi trong 10s van cuon toi ket qua
        return true; // đổi trong 10s sau lần trừ trước: miễn phí lần này
      }
      var bucket = (typeof R2.filterChargeBucket === 'function') ? R2.filterChargeBucket(now) : Math.floor(now / 10000);
      var key = 'filter:' + user.id + ':' + category + ':' + bucket;
      return R2.spendPoints('filter', 1, category, page || pointsPageName(), key).then(function (res){
        if (res && res.ok) {
          filterNoteCharge(category, now);
          // v90: hien NGAY "Da tru 1 diem • Con lai: X diem" trong khung thong
          // bao cua bo loc, roi moi ap dung bo loc. X = so du moi (uu tien
          // ket qua spend neu co, neu khong goi RPC so du; loi thi van ap
          // dung bo loc, chi hien "Da tru 1 diem.").
          var bal = (res && typeof res.balance === 'number') ? res.balance : null;
          function showCharged(){
            say(bal !== null ? ('Đã trừ 1 điểm • Còn lại: ' + bal + ' điểm') : 'Đã trừ 1 điểm.');
            try { doApply(); } catch (e) {}
            scrollToResults(category); // v90 (3): tru diem xong cuon toi ket qua
            return true;
          }
          if (bal !== null) return showCharged();
          if (R2 && typeof R2.getMyPointsBalanceResult === 'function') {
            return R2.getMyPointsBalanceResult().then(function (r){
              if (r && r.ok) bal = Number(r.balance) || 0;
              return showCharged();
            }).catch(function(){ return showCharged(); });
          }
          return showCharged();
        }
        if (res && res.code === 'insufficient_balance') {
          say('Bạn đã hết điểm để lọc. <a href="huong-dan-diem.html">Xem cách kiếm điểm →</a>');
          return false;
        }
        say('Chưa lọc được: ' + esc((res && res.error) || 'hệ thống điểm chưa bật.') + ' <a href="huong-dan-diem.html">Hướng dẫn kiếm điểm</a>');
        return false;
      });
    });
  });
}
/* Đọc pin đang chạy qua RPC get_active_pins(p_category) — KHÔNG SELECT
   trực tiếp bảng pinned_posts (RLS owner-only, client không đọc được pin
   của người khác). RPC là SECURITY DEFINER, chỉ trả pin đang active
   (is_active và pinned_until > now()), không trả user_id/points_spent.
   Category dùng đúng enum M7.2: mau/shop/lo/xuong/bai-viet/kiot.
   RPC lỗi/không có dữ liệu → [] → danh sách giữ thứ tự thường, không lỗi. */
function fetchActivePins(category){
  try {
    var A = window.McLivestreamAPI;
    if (!A || !A.client) return Promise.resolve([]);
    return A.client.rpc('get_active_pins', { p_category: category })
      .then(function (res){ if (res.error) return []; return res.data || []; })
      .catch(function(){ return []; });
  } catch (e) { return Promise.resolve([]); }
}
// Xếp lại các thẻ ĐANG HIỂN THỊ trong 1 container: bài được ghim (còn hạn)
// lên trước theo pinned_until giảm dần, còn lại giữ nguyên thứ tự.
// M7/policy SELECT chưa có → pins rỗng → giữ nguyên thứ tự, không báo lỗi.
function applyPinnedOrder(container, pins){
  if (!container || !pins || !pins.length) return;
  var R = window.Ver2Reward;
  var now = new Date();
  var active = pins.filter(function (p){ return R && typeof R.isPinActive === 'function' ? R.isPinActive(p, now) : new Date(p.pinned_until) > now; });
  if (!active.length) return;
  active.sort(function (a, b){ return new Date(b.pinned_until) - new Date(a.pinned_until); });
  var order = {};
  active.forEach(function (p, i){ order[String(p.target_id)] = i; });
  var kids = Array.prototype.slice.call(container.children);
  var has = kids.some(function (el){ return order[String(el.getAttribute('data-v2s-id'))] !== undefined; });
  if (!has) return;
  kids.sort(function (a, b){
    var ra = order[String(a.getAttribute('data-v2s-id'))];
    var rb = order[String(b.getAttribute('data-v2s-id'))];
    if (ra === undefined) ra = Infinity;
    if (rb === undefined) rb = Infinity;
    return ra - rb;
  });
  kids.forEach(function (el){ container.appendChild(el); });
}
function applyPinnedOrderToLists(){
  // Category = enum M7.2 (trang danh sách): mau/shop/lo/xuong/bai-viet/kiot.
  var jobs = [
    ['listGrid', 'mau'], ['publicShopsList', 'shop'],
    ['newsMain', 'bai-viet'], ['lotGrid1', 'lo'], ['lotGrid2', 'lo'],
    ['lotGrid3', 'lo'], ['factoryGrid', 'xuong']
  ];
  jobs.forEach(function (job){
    var el = document.getElementById(job[0]);
    if (!el) return;
    fetchActivePins(job[1]).then(function (pins){ applyPinnedOrder(el, pins); });
  });
  // Kiot (thanh-ly-kiot.html) dùng chung lưới lô — xếp theo category 'kiot'.
  ['lotGrid1', 'lotGrid2', 'lotGrid3'].forEach(function (id){
    var el = document.getElementById(id);
    if (!el) return;
    fetchActivePins('kiot').then(function (pins){ applyPinnedOrder(el, pins); });
  });
}
// Hộp ghim + mục bình luận trên trang chi tiết (ho-so / chi-tiet-shop) và
// trang bài báo. Gọi sau khi trang chi tiết đã render xong.
// v91 (BUG-10): giờ hết hạn ghim hiện giờ Việt Nam dễ đọc ("00:41 ngày
// 08/11") thay vì timestamp ISO UTC thô. R.formatVnDateTime (reward.js)
// chưa có thì rơi về chuỗi gốc.
function pinUntilText(until, R) {
  if (!until) return '';
  try { if (R && typeof R.formatVnDateTime === 'function') return R.formatVnDateTime(until); } catch (e) {}
  return String(until);
}
function mountPointsDetail(targetType, targetId){
  if (typeof document === 'undefined' || typeof document.createElement !== 'function') return;
  var anchor = document.getElementById('detailRoot') || document.getElementById('shopDetailRoot');
  var articleEl = null;
  if (!anchor) {
    // Trang bài báo tĩnh: chỉ gắn khi document hỗ trợ querySelector
    // (bộ test vm dùng document giả không có querySelector — bỏ qua).
    if (typeof document.querySelector !== 'function') return;
    articleEl = document.querySelector('.form-card.article article[itemtype], article[itemtype*="NewsArticle"]');
    if (!articleEl) return;
    targetType = 'article';
    try { var parts = String(location.pathname || '').split('/'); targetId = parts[parts.length - 1] || targetId; } catch (e) {}
  }
  if (!targetId) return;
  if (document.getElementById('v2sPinBox')) return; // chỉ gắn 1 lần
  var wrap = document.createElement('div');
  wrap.innerHTML = '<section class="v2s-pin-box" id="v2sPinBox" data-v2s-target-type="'+esc(targetType)+'" data-v2s-target-id="'+esc(targetId)+'">'
    + '<h2>📌 Ghim lên top bằng điểm</h2>'
    + '<p class="v2s-pin-balance">Số dư điểm của bạn: <b>…</b></p>'
    + '<p>1 điểm = 1 giờ ghim. Sau khi hết hạn ghim, bài trở về thứ tự thường.</p>'
    + '<label>Số giờ ghim (1–720)<input type="number" class="v2s-pin-hours" min="1" max="720" value="24"></label> '
    + '<button class="btn btn-primary btn-sm" type="button" data-v2s-pin-confirm>Ghim lên top</button>'
    + '<p class="v2s-pin-msg" role="status"></p></section>'
    + '<div class="v2s-comments-mount" id="v2sCommentsMount"></div>';
  if (anchor && typeof anchor.insertAdjacentElement === 'function') anchor.insertAdjacentElement('afterend', wrap);
  else if (articleEl && typeof articleEl.insertAdjacentElement === 'function') articleEl.insertAdjacentElement('afterend', wrap);
  else return;
  loadPointsScripts().then(function(){
    var R = window.Ver2Reward, C = window.Ver2Comments;
    var box = document.getElementById('v2sPinBox');
    if (!box) return;
    pointsLoggedIn().then(function (loggedIn){
      var bal = box.querySelector('.v2s-pin-balance');
      var msg = box.querySelector('.v2s-pin-msg');
      var btn = box.querySelector('[data-v2s-pin-confirm]');
      if (!loggedIn) {
        if (bal) bal.innerHTML = pointsGuestNoteHTML();
        // Khách vãng lai: KHÔNG disable nút Ghim — bấm nút sẽ hiện ghi chú
        // "Bạn cần đăng nhập tài khoản để lấy điểm ghim" (handler
        // data-v2s-pin-confirm dưới đây kiểm tra đăng nhập trước khi gọi RPC).
        if (msg) msg.textContent = '';
        return;
      }
      if (R && typeof R.getMyPointsBalance === 'function') {
        R.getMyPointsBalance().then(function (b){ if (bal) bal.innerHTML = 'Số dư điểm của bạn: <b>' + b + ' điểm</b>'; });
      } else if (bal) { bal.textContent = 'Hệ thống điểm thưởng chưa bật (đang chờ migration M7).'; }
    });
    var mount = document.getElementById('v2sCommentsMount');
    if (mount && C && typeof C.renderComments === 'function') C.renderComments(targetType, targetId, mount);
  });
}
function initPointsUI(){
  if (typeof document === 'undefined') return;
  // Nút thích/chia sẻ/ghim trên mọi thẻ (ủy quyền click — thẻ render lại
  // khi lọc/phân trang vẫn chạy).
  document.addEventListener('click', function (e){
    // Xem liên hệ 1 hồ sơ — v92: TẠM MIỄN PHÍ (cờ V20_FREE_SERVICES ở
    // js/reward.js): đã đăng nhập thì hiện ngay, không trừ điểm, không kiểm
    // tra v20_contact_viewed_v1 nữa. Khách vãng lai vẫn thấy lời mời đăng
    // ký (cửa đăng nhập giữ nguyên). Code trừ điểm giữ nguyên để mở lại
    // chỉ bằng 1 cờ.
    var vc = e.target && e.target.closest ? e.target.closest('[data-v2s-view-contact]') : null;
    if (vc) {
      var wrap = vc.closest ? vc.closest('.v2s-contacts-gated') : null;
      if (!wrap) return;
      e.preventDefault();
      var tt = wrap.getAttribute('data-v2s-target-type'), ti = wrap.getAttribute('data-v2s-target-id');
      var hidden = wrap.querySelector('.v2s-contacts-hidden');
      var cmsg = wrap.querySelector('.v2s-contact-msg');
      var reveal = function(){ if (hidden) hidden.hidden = false; vc.style.display = 'none'; if (cmsg) cmsg.textContent = ''; };
      loadPointsScripts().then(function(){
        return pointsSessionUser().then(function (user){
          if (!user) { if (cmsg) cmsg.innerHTML = 'Hãy <a href="dang-ky.html">đăng ký</a> để xem liên hệ — đăng ký đủ nhận 250 điểm! <a href="dang-nhap.html">Đăng nhập</a>'; return; }
          var R = window.Ver2Reward;
          if (R && R.FREE_SERVICES === true) { reveal(); return; } // v92: miễn phí
          if (R && typeof R.hasViewedContactToday === 'function' && R.hasViewedContactToday(tt, ti)) { reveal(); return; }
          if (!R || typeof R.spendPoints !== 'function') { if (cmsg) cmsg.textContent = 'Hệ thống điểm chưa bật (đang chờ migration M7), chưa xem được liên hệ.'; return; }
          var day = (typeof R.dayKeySaigon === 'function') ? R.dayKeySaigon(new Date()) : '';
          var key = (typeof R.contactViewKey === 'function') ? R.contactViewKey(tt, ti, day) : '';
          R.spendPoints('contact_view', 5, tt, ti, key).then(function (res){
            if (res && res.ok) { if (typeof R.markContactViewed === 'function') R.markContactViewed(tt, ti, day); reveal(); }
            else if (res && res.code === 'insufficient_balance') { if (cmsg) cmsg.innerHTML = 'Bạn đã hết điểm để xem liên hệ. <a href="huong-dan-diem.html">Xem cách kiếm điểm →</a>'; }
            else { if (cmsg) cmsg.textContent = 'Chưa xem được liên hệ: ' + ((res && res.error) || 'hệ thống điểm chưa bật.'); }
          });
        });
      });
      return;
    }
    // Nút "Ghim lên top" trong hộp ghim trang chi tiết.
    var pc = e.target && e.target.closest ? e.target.closest('[data-v2s-pin-confirm]') : null;
    if (pc) {
      var box = pc.closest ? pc.closest('.v2s-pin-box') : null;
      if (!box) return;
      e.preventDefault();
      var hoursInput = box.querySelector('.v2s-pin-hours');
      var pinMsg = box.querySelector('.v2s-pin-msg');
      var hours = hoursInput ? Number(hoursInput.value) : 0;
      loadPointsScripts().then(function(){
        return pointsLoggedIn().then(function (loggedIn){
          if (!loggedIn) { if (pinMsg) pinMsg.textContent = 'Bạn cần đăng nhập tài khoản để lấy điểm ghim'; return; }
          var R = window.Ver2Reward;
          if (!R) { if (pinMsg) pinMsg.textContent = 'Hệ thống điểm thưởng chưa bật (đang chờ migration M7).'; return; }
          R.pinPost(box.getAttribute('data-v2s-target-type'), box.getAttribute('data-v2s-target-id'), box.getAttribute('data-v2s-target-type'), hours).then(function (r){
            if (!pinMsg) return;
            if (r && r.ok) {
              var until = r.pin && (r.pin.pinned_until || (Array.isArray(r.pin) && r.pin[0] && r.pin[0].pinned_until));
              pinMsg.textContent = 'Đã ghim lên top' + (until ? ' đến ' + pinUntilText(until, R) : '') + ' (' + hours + ' điểm).';
            } else { pinMsg.textContent = 'Chưa ghim được: ' + ((r && r.error) || 'hệ thống điểm chưa bật.'); }
          });
        });
      });
      return;
    }
    var t = e.target && e.target.closest ? e.target.closest('[data-v2s-like],[data-v2s-share],[data-v2s-pin]') : null;
    if (!t) return;
    var row = t.closest ? t.closest('.v2s-points-row') : null;
    if (!row) return;
    var type = t.hasAttribute('data-v2s-like') ? 'like' : (t.hasAttribute('data-v2s-share') ? 'share' : 'pin');
    var targetType = row.getAttribute('data-v2s-target-type');
    var targetId = row.getAttribute('data-v2s-target-id');
    var msg = row.querySelector('.v2s-points-msg');
    function say(html){ if (msg) msg.innerHTML = html; }
    e.preventDefault();
    loadPointsScripts().then(function(){
      return pointsLoggedIn().then(function (loggedIn){
        if (!loggedIn) { say(type === 'pin' ? 'Bạn cần đăng nhập tài khoản để lấy điểm ghim' : pointsGuestNoteHTML()); return; }
        var R = window.Ver2Reward;
        if (!R) { say('Hệ thống điểm thưởng chưa bật (đang chờ migration M7).'); return; }
        if (type === 'pin') {
          // Form ghim inline trên thẻ: nhập giờ + xác nhận, hiện số dư.
          if (row.querySelector('.v2s-pin-form')) return;
          var form = document.createElement('span');
          form.className = 'v2s-pin-form';
          form.innerHTML = '<input type="number" min="1" max="720" value="24" aria-label="Số giờ ghim"> giờ · <button class="btn btn-primary btn-sm" type="button">Ghim</button> <span class="v2s-pin-balance">…</span>';
          row.appendChild(form);
          var inp = form.querySelector('input');
          var bal = form.querySelector('.v2s-pin-balance');
          if (typeof R.getMyPointsBalance === 'function') R.getMyPointsBalance().then(function (b){ if (bal) bal.textContent = 'Số dư: ' + b + ' điểm'; });
          form.querySelector('button').addEventListener('click', function(){
            var hours = Number(inp.value);
            R.pinPost(targetType, targetId, targetType, hours).then(function (r){
              if (r && r.ok) {
                var until = r.pin && (r.pin.pinned_until || (Array.isArray(r.pin) && r.pin[0] && r.pin[0].pinned_until));
                say('Đã ghim lên top' + (until ? ' đến ' + esc(pinUntilText(until, R)) : '') + ' (' + hours + ' điểm).');
                form.remove();
              } else { say('Chưa ghim được: ' + esc((r && r.error) || 'hệ thống điểm chưa bật.')); }
            });
          });
          return;
        }
        R.awardInteraction(type, targetType, targetId).then(function (r){
          if (r && r.ok && Number(r.points) > 0) { if (type === 'like') markLiked(t); say('+' + Number(r.points) + ' điểm (1 lần/ngày)'); }
          else if (r && r.ok) { if (type === 'like') markLiked(t); say(type === 'like' ? 'Đã tính điểm thích hôm nay' : 'Đã tính điểm chia sẻ hôm nay'); }
          else say('Chưa tính được điểm: ' + esc((r && r.error) || 'hệ thống điểm chưa bật.'));
        });
      });
    });
  });
  // Trang bài báo tĩnh (bai-viet/*.html): gắn hộp ghim + bình luận sau bài.
  if (typeof document.querySelector === 'function'
    && document.querySelector('.form-card.article article[itemtype], article[itemtype*="NewsArticle"]')) {
    mountPointsDetail('article', '');
  }
  // Xếp lại danh sách theo ghim đang hoạt động (lỗi/lưới vắng → giữ nguyên).
  // v92 (C2): bình luận dưới mỗi thẻ lô/xưởng/kiot — gắn listener nút toggle
  // + đếm số bình luận đã duyệt (Ver2Comments.initCardComments).
  loadPointsScripts().then(function(){
    applyPinnedOrderToLists();
    var C = window.Ver2Comments;
    if (C && typeof C.initCardComments === 'function') C.initCardComments();
  });
}
/* ---- Chuyển điểm trên trang ví (vi-tien-ao.html, chốt 20:23 + 20:25) ---- */
function initTransferForm(){
  if (typeof document === 'undefined') return;
  var form = document.getElementById('transferForm');
  if (!form) return;
  var streakEl = document.getElementById('transferStreak');
  var msgEl = document.getElementById('transferMsg');
  var histEl = document.getElementById('transferHistory');
  var submitBtn = document.getElementById('transferSubmit');
  var emailEl = document.getElementById('transferEmail');
  var amountEl = document.getElementById('transferAmount');
  var noteEl = document.getElementById('transferNote');
  var balEl = document.getElementById('transferBalance');
  // v91 (BUG-08): trạng thái phiên hiện tại + cờ đã gắn submit (gắn 1 lần
  // duy nhất dù refreshTransfer chạy nhiều lần khi phiên đổi).
  var streak = null, balance = 0, currentUser = null, submitWired = false;
  function say(t){ if (msgEl) msgEl.textContent = t || ''; }
  function streakText(st){
    if (!st || !st.ok) return 'Chưa tải được chuỗi online (hệ thống điểm chưa bật hoặc mất mạng).';
    if (st.eligible) return 'Đã online liên tiếp ' + st.current_streak + '/30 ngày — bạn đã đủ điều kiện chuyển điểm.';
    return 'Đã online liên tiếp ' + st.current_streak + '/30 ngày — còn ' + st.days_remaining + ' ngày nữa mới được chuyển điểm.';
  }
  function histHTML(items){
    if (!items || !items.length) return '<p>Chưa có lần chuyển điểm nào.</p>';
    return '<ul class="v2s-transfer-history">' + items.map(function (it){
      // get_my_transfer_history() trả direction 'sent'/'received', amount âm
      // khi gửi (-delta), dương khi nhận; counterparty_email là email bên kia.
      var dir = (it.direction === 'received' || it.direction === 'in' || it.type === 'transfer_in') ? 'Nhận' : 'Gửi';
      var other = esc(it.counterparty_email || it.other_email || it.recipient_email || it.sender_email || '');
      var amt = Math.abs(Number(it.amount || it.points || 0));
      var when = '';
      try { when = it.created_at ? new Date(it.created_at).toLocaleDateString('vi-VN') : ''; } catch (e) {}
      return '<li><b>' + dir + ' ' + amt + ' điểm</b>' + (other ? ' — ' + other : '') + (when ? ' · ' + esc(when) : '') + (it.note ? '<br><span>' + esc(it.note) + '</span>' : '') + '</li>';
    }).join('') + '</ul>';
  }
  // v91 (BUG-08): tải lại số dư/chuỗi/lịch sử chuyển điểm mỗi khi phiên đổi
  // (đăng nhập/đăng xuất) thay vì chỉ tải 1 lần lúc mở trang — dòng "Cần
  // đăng nhập..." phải biến mất ngay khi đã đăng nhập và hiện lại khi đăng
  // xuất, không cần tải lại trang.
  function refreshTransfer(){
  loadPointsScripts().then(function(){
    return pointsSessionUser().then(function (user){
      currentUser = user || null;
      var R = window.Ver2Reward;
      if (!user) {
        streak = null; balance = 0;
        if (streakEl) streakEl.innerHTML = 'Cần <a href="dang-nhap.html">đăng nhập</a> để chuyển điểm. Chưa có tài khoản? <a href="dang-ky.html">Đăng ký đủ nhận 250 điểm</a>.';
        if (balEl) balEl.textContent = 'Cần đăng nhập để xem số dư điểm.';
        if (histEl) histEl.innerHTML = '<p>Chưa tải được lịch sử chuyển điểm.</p>';
        if (submitBtn) submitBtn.disabled = true;
        return;
      }
      if (!R) { if (streakEl) streakEl.textContent = 'Hệ thống điểm chưa bật (đang chờ migration M7).'; return; }
      if (typeof R.getMyPointsBalanceResult === 'function') {
        R.getMyPointsBalanceResult().then(function (r){ if (balEl && r && r.ok) balEl.textContent = 'Số dư điểm của bạn: ' + (Number(r.balance) || 0) + ' điểm.'; });
      }
      var jobs = [];
      if (typeof R.getMyTransferStreak === 'function') {
        jobs.push(R.getMyTransferStreak().then(function (st){ streak = st; if (streakEl) streakEl.textContent = streakText(st); if (submitBtn && st && !st.eligible) submitBtn.disabled = true; }));
      }
      if (typeof R.getMyTransferHistory === 'function') {
        jobs.push(R.getMyTransferHistory(20).then(function (h){ if (histEl && h && h.ok) histEl.innerHTML = histHTML(h.items); }));
      }
      if (typeof R.getMyPointsBalanceResult === 'function') {
        jobs.push(R.getMyPointsBalanceResult().then(function (r){ if (r && r.ok) balance = Number(r.balance) || 0; }));
      }
      Promise.all(jobs).catch(function () {});
      if (submitWired) return;
      submitWired = true;
      form.addEventListener('submit', function (e){
        e.preventDefault();
        say('');
        var err = (typeof R.validateTransfer === 'function') ? R.validateTransfer({
          recipientEmail: emailEl ? emailEl.value : '',
          amount: amountEl ? Number(amountEl.value) : 0,
          balance: balance, myEmail: (currentUser && currentUser.email) || ''
        }) : null;
        if (err) { say(err); return; }
        if (streak && !streak.eligible) { say('Chưa đủ 30 ngày online liên tiếp nên chưa chuyển được điểm (còn ' + streak.days_remaining + ' ngày nữa).'); return; }
        if (submitBtn) submitBtn.disabled = true;
        R.transferPoints(emailEl.value, Number(amountEl.value), noteEl ? noteEl.value : '').then(function (res){
          if (submitBtn) submitBtn.disabled = !(streak && streak.eligible);
          if (res && res.ok) {
            say('Đã chuyển ' + Number(amountEl.value) + ' điểm cho ' + emailEl.value.trim() + '.');
            if (typeof R.getMyTransferHistory === 'function') R.getMyTransferHistory(20).then(function (h){ if (histEl && h && h.ok) histEl.innerHTML = histHTML(h.items); });
            if (typeof R.getMyPointsBalanceResult === 'function') R.getMyPointsBalanceResult().then(function (r){ if (balEl && r && r.ok) { balance = Number(r.balance) || 0; balEl.textContent = 'Số dư điểm của bạn: ' + balance + ' điểm.'; } });
            form.reset();
          } else if (res && res.code === 'not_eligible') {
            say('Chưa đủ 30 ngày online liên tiếp (đã ' + (res.current_streak || 0) + '/30 ngày — còn ' + (res.days_remaining || 0) + ' ngày nữa).');
          } else if (res && res.code === 'recipient_not_found') {
            say('Không tìm thấy tài khoản có email này.');
          } else if (res && res.code === 'cannot_transfer_to_self') {
            say('Không chuyển điểm cho chính mình.');
          } else if (res && res.code === 'amount_below_minimum') {
            say('Chuyển điểm tối thiểu 10 điểm/lần.');
          } else if (res && res.code === 'insufficient_balance') {
            say('Số dư điểm của bạn không đủ để chuyển.');
          } else if (res && res.code === 'rpc_missing') {
            say('Hệ thống chuyển điểm chưa bật (đang chờ migration M7).');
          } else {
            say('Chưa chuyển được điểm: ' + ((res && (res.message || res.error)) || 'hệ thống điểm chưa bật.'));
          }
        });
      });
    });
  });
  }
  refreshTransfer();
  try {
    var A = window.V2SAuthUI;
    if (A && typeof A.onSessionChange === 'function') A.onSessionChange(function () { refreshTransfer(); });
  } catch (e) { /* bỏ qua — vẫn tải 1 lần lúc mở trang */ }
}
if(typeof document!=='undefined') document.addEventListener('DOMContentLoaded',function(){
  initMobileNotice(); initHeaderAuth(); initActivationStrip();
  /* v96-swap: initShopPage TRUOC initList — renderLotSections dung lai
     option cua #fUniProv theo tinh co xuong that; prefill URL cua initList
     phai chay sau thi gia tri moi giu duoc. */
  initHome(); initShopPage(); initList(); initNews(); initModelNewsRow(); /* v100: hang tin trang Mau */ initDetail(); initShopDetail(); initShops(); initHub(); initFaqToggle(); initPointsUI(); initTransferForm(); initStars(); /* v99: nap so sao + uy thac click nut sao */
  var mb=document.getElementById('menuBtn');
  if(mb) mb.addEventListener('click',function(){var n=document.getElementById('mainNav'); var o=n.classList.toggle('open'); mb.setAttribute('aria-expanded',o?'true':'false');});
  var fab=document.getElementById('gopyFab');
  if(fab) fab.addEventListener('click',function(){document.getElementById('gopyOverlay').classList.add('open');});
  var ov=document.getElementById('gopyOverlay');
  if(ov) ov.addEventListener('click',function(e){if(e.target===ov) ov.classList.remove('open');});
  var gf=document.getElementById('gopyForm');
  if(gf) gf.addEventListener('submit',function(e){e.preventDefault(); var msg=document.getElementById('gopyMsg');
    var run=async function(){
    var data={name:gf.gopyName.value.trim(), kind:gf.gopyKind.value, rating:null, content:gf.gopyContent.value.trim(), page:location.pathname};
    if(!data.content){ if(msg) msg.textContent='Bạn nhập nội dung góp ý trước nhé.'; return; }
    try{
      var API=window.McLivestreamAPI;
      if(API && API.submitFeedback){ await API.submitFeedback(data); if(msg) msg.textContent='Cảm ơn bạn! Góp ý đã gửi về Ver2Solution để tổng hợp.'; gf.reset(); return; }
    }catch(err){ if(msg) msg.textContent='Chưa gửi được: '+((window.McLivestreamAPI&&McLivestreamAPI.friendlyError)?McLivestreamAPI.friendlyError(err):'Đã có lỗi xảy ra, hãy thử lại sau.')+'. Góp ý đã lưu tạm, bạn gửi thêm qua Zalo giúp mình nhé.'; }
    if(msg && !msg.textContent) msg.textContent='Cảm ơn bạn! Góp ý đã lưu tạm trên máy của bạn, bạn có thể gửi thêm qua Zalo để Ver2Solution tổng hợp ngay.'; gf.reset();};
    if(window.V2SAuthUI) V2SAuthUI.guardSubmit(gf, run); else run();});
});
window.V20 = {esc:esc, cardHTML:cardHTML, photoNote:photoNote, decisionHTML:decisionHTML, hasRealValue:hasReal, verifiedRevenue:verifiedRevenue, revenueText:revenueText, headerDisplayName:headerDisplayName, headerMetaName:headerMetaName, initMobileNotice:initMobileNotice, initHeaderAuth:initHeaderAuth, initActivationStrip:initActivationStrip, MOBILE_NOTICE_LINES:MOBILE_NOTICE_LINES, MOBILE_NOTICE_KEY:MOBILE_NOTICE_KEY, miniHTML:miniHTML, filterModels:filterModels, filterShops:filterShops, shopCatGroup:shopCatGroup, withPhotoFirst:withPhotoFirst, clean:clean, shopCardHTML:shopCardHTML, shopDecisionHTML:shopDecisionHTML, shopLogoHTML:shopLogoHTML, contactsBlockHTML:contactsBlockHTML, contactNoteHTML:contactNoteHTML, contactItemHTML:contactItemHTML, sortShopsNewest:sortShopsNewest, articleLink:articleLink, articleHref:articleHref, sortByDateDesc:sortByDateDesc, articleTarget:articleTarget, articleTitleHTML:articleTitleHTML, articleMediaHTML:articleMediaHTML, getPinnedRow:getPinnedRow, pinCardHTML:pinCardHTML, newsCardHTML:newsCardHTML, initModelNewsRow:initModelNewsRow, dayOfYear:dayOfYear, rotateDaily:rotateDaily, rotateWindow:rotateWindow, window8h:window8h, photoTier:photoTier, homeTop8:homeTop8, defaultShopOrder:defaultShopOrder, logoTier:logoTier, rotateStaticGrids:rotateStaticGrids, lotMatches:lotMatches, facMatches:facMatches, inRange:inRange, initLotFilter:initLotFilter, initFactoryFilter:initFactoryFilter, initSectionFilter:initSectionFilter, initFilterToggle:initFilterToggle, filterSectionOf:filterSectionOf, closeFilters:closeFilters, closeFilterOf:closeFilterOf, initShopDetail:initShopDetail, initDetail:initDetail, trustStats:trustStats, renderTrustStats:renderTrustStats, parseMonthlyMax:parseMonthlyMax, parseRevenue:parseRevenue, fmtVnd:fmtVnd, parseHourlyMin:parseHourlyMin, sortModelsBy:sortModelsBy, sortShopsBy:sortShopsBy, parseMoneyInput:parseMoneyInput, ownerNoteHTML:ownerNoteHTML, defaultModelOrder:defaultModelOrder, hubZaloHref:hubZaloHref, hubCardHTML:hubCardHTML, hubResults:hubResults, hubAllLink:hubAllLink, hubEmptyHTML:hubEmptyHTML, demoUrlOf:demoUrlOf, initHub:initHub, initFaqToggle:initFaqToggle, parseVnDate:parseVnDate, lotActive:lotActive, lotsByGroup:lotsByGroup, lotFactoryStats:lotFactoryStats, lotCardHTML:lotCardHTML, factoryCardHTML:factoryCardHTML, renderLotSections:renderLotSections, pointsButtonsHTML:pointsButtonsHTML, articleRef:articleRef, fetchActivePins:fetchActivePins, applyPinnedOrder:applyPinnedOrder, mountPointsDetail:mountPointsDetail, initPointsUI:initPointsUI, gatedContactsHTML:gatedContactsHTML, gateFilterApply:gateFilterApply, filterMsgEl:filterMsgEl, initTransferForm:initTransferForm, emptyResultsHTML:emptyResultsHTML, pinUntilText:pinUntilText, markLiked:markLiked, commentToggleHTML:commentToggleHTML, uniCatToShop:uniCatToShop, uniCatToModel:uniCatToModel, uniCatToLotFac:uniCatToLotFac, shopCatToUni:shopCatToUni, uniProvToFactory:uniProvToFactory, getUniCat:getUniCat, setUniCatFieldStates:setUniCatFieldStates, syncHubFromUni:syncHubFromUni, initUniCatSwitch:initUniCatSwitch, initShopPage:initShopPage, uniSortToModelSort:uniSortToModelSort, MODEL_CAT_TO_UNI:MODEL_CAT_TO_UNI,
/* v99 (the rut gon + sao len top) */
catLabel:catLabel, sourceDetailLink:sourceDetailLink, findProvinceInText:findProvinceInText, modelFields:modelFields, modelFieldLine:modelFieldLine, modelLocationLine:modelLocationLine, shopLocationLine:shopLocationLine, shopSalaryLine:shopSalaryLine, lotLocationLine:lotLocationLine, lotValueLine:lotValueLine, factoryLocationLine:factoryLocationLine, factoryItemsLine:factoryItemsLine, kiotLocationLine:kiotLocationLine, kiotTypeLine:kiotTypeLine, CAT_LABELS:CAT_LABELS, STAR_STORE_KEY:STAR_STORE_KEY, STAR_WINDOW_MS:STAR_WINDOW_MS, starStoreRead:starStoreRead, starStoreWrite:starStoreWrite, starKey:starKey, starTodayStr:starTodayStr, starredToday:starredToday, markStarredToday:markStarredToday, starCountOf:starCountOf, starButtonHTML:starButtonHTML, starTierOf:starTierOf, applyStarOrder:applyStarOrder, refreshStarCounts:refreshStarCounts, fetchStarStats:fetchStarStats, starClick:starClick, initStars:initStars};
if(typeof module!=='undefined' && module.exports) module.exports = window.V20;
})();
