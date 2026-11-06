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
function isNegotiableSalary(m){ return String(m.salary||'').trim() === 'Thỏa thuận'; }
/* v37: ALWAYS render all decision boxes, even when a value is missing
   (shown muted as "Chưa cập nhật"). Hiding empty values made the inner blocks
   start at different heights in every row (same root cause as the shop cards,
   visual QA 05/11). */
function decisionHTML(m){
  var sal = (hasReal(m.salary) && !isNegotiableSalary(m)) ? esc(m.salary) : (isNegotiableSalary(m) ? 'Thỏa thuận' : 'Chưa cập nhật');
  var sch = hasReal(m.schedule) ? esc(m.schedule) : 'Chưa cập nhật';
  var rev = hasReal(m.topRevenue) ? esc(m.topRevenue) : 'Chưa cập nhật';
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
   tu moi trang: trang chu, trang danh sach, trang chi tiet). */
function ownerNoteHTML(kind){
  var href = kind === 'shop' ? 'danh-sach-shop.html#dang-nhap-shop' : 'danh-sach-mau.html#dang-nhap-mau';
  return '<p class="owner-note"><a href="'+href+'">Đăng ký</a> &gt; <a href="'+href+'">Đăng nhập</a> để sửa hồ sơ này, hoặc liên hệ <a href="https://zalo.me/0329983699" target="_blank" rel="noopener">Zalo</a> để được gỡ bỏ.</p>';
}
function cardHTML(m, opts){
  // v63: opts tuy chon (khong doi dau ra mac dinh) — opts.zaloHref doi link nut
  // "Nhan Zalo" (khoi hub 11.11 dung tin nhan soan san), opts.demoUrl them link
  // "Xem video demo" khi ho so co video demo that.
  opts = opts || {};
  var zaloHref = opts.zaloHref || 'https://zalo.me/0329983699';
  var demoLink = opts.demoUrl ? '<a class="btn btn-ghost btn-sm" data-track="xem-video-demo" href="'+esc(opts.demoUrl)+'" target="_blank" rel="noopener">▶ Xem video demo</a>' : '';
  // All attributes are inside <article ...> here — the exact v19 bug is impossible in this template.
  // v28: data-gender carries "" (not the placeholder "Chưa cập nhật") when the
  // gender is unknown, so the placeholder string never enters the rendered DOM
  // at all (design AC #2). No code reads data-gender (filtering uses the data
  // object), so this changes no behaviour — only the invisible attribute value.
  return '<article class="card" data-province="'+esc(m.province)+'" data-cat="'+esc(m.cat)+'" data-gender="'+esc(hasReal(m.gender)?m.gender:'')+'" data-views="'+m.views+'" data-comments="'+m.comments+'">'
  + '<div class="card-photo">'+photoHTML(m)+'<span class="status"><i></i>'+esc(m.status)+'</span><span class="ph-note">'+photoNote(m)+'</span></div>'
  + '<div class="card-body"><h3><a href="ho-so.html?id='+esc(m.id)+'">'+esc(m.province)+' — '+esc(m.name)+'</a></h3>'
  + '<p class="card-title">'+esc(m.title)+'</p>'
  + '<div class="tags"><span class="tag">📍 '+esc(m.province)+'</span><span class="tag">'+esc(m.cat)+'</span><span class="tag soft">'+esc(m.form)+'</span>'+(isNegotiableSalary(m) ? '<span class="tag tag-negotiable">Lương thỏa thuận</span>' : '')+'</div>'
  + decisionHTML(m)
  + '<p class="warn">⚠ CHƯA XÁC NHẬN ĐỒNG Ý ĐĂNG WEB — hồ sơ từ bài đăng công khai, sẽ xóa khi có hồ sơ mới tự đăng ký thay thế. <a href="https://zalo.me/0329983699" target="_blank" rel="noopener">Yêu cầu gỡ hồ sơ</a></p>'
  + '<div class="card-actions"><a class="btn btn-primary btn-sm" data-track="xem-ho-so" href="ho-so.html?id='+esc(m.id)+'">Xem hồ sơ →</a>'
  + demoLink
  + '<a class="btn btn-ghost btn-sm" data-track="nhan-zalo-mau" href="'+esc(zaloHref)+'" target="_blank" rel="noopener">Nhắn Zalo</a></div>'
  + '<p class="disclaimer">'+DISCLAIMER+'</p>'+ownerNoteHTML('model')+'</div></article>';
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
  return {facebook:'Facebook', zalo:'Zalo', phone:'Số điện thoại', email:'Email', tiktok:'TikTok', shopee:'Shopee'}[p] || 'Liên hệ';
}
function digitsOnly(v){ return String(v||'').replace(/\D/g,''); }
function contactHref(c){
  if(c.provider==='zalo') return 'https://zalo.me/'+digitsOnly(c.value);
  if(c.provider==='phone') return 'tel:'+digitsOnly(c.value);
  if(c.provider==='email') return 'mailto:'+c.value;
  return c.value; // facebook / tiktok / shopee: full public URL
}
function contactItemHTML(c){
  var label = esc(c.label || defaultContactLabel(c.provider));
  var href = esc(contactHref(c));
  var ext = (c.provider==='facebook'||c.provider==='tiktok'||c.provider==='shopee') ? ' target="_blank" rel="noopener"' : '';
  if(c.provider==='facebook'||c.provider==='tiktok'||c.provider==='shopee'){
    return '<li><a href="'+href+'"'+ext+'>'+label+'</a></li>';
  }
  return '<li>'+label+': <a href="'+href+'"'+ext+'>'+esc(c.value)+'</a></li>';
}
function contactsBlockHTML(contacts){
  if(!contacts || !contacts.length) return '';
  return '<ul class="contact-list">'+contacts.map(contactItemHTML).join('')+'</ul>';
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
function shopLogoHTML(s){
  if(!s.logo) return '<span class="shop-initial" aria-hidden="true">'+esc(shopInitial(s))+'</span>';
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
  var url='chi-tiet-shop.html?id='+s.id;
  var loc = esc(s.province)+(s.district && s.district!=='Chưa cập nhật' ? ' — '+esc(s.district) : '');
  var name = '<a href="'+url+'">'+esc(s.name)+'</a>';
  var negotiable = hasReal(s.salary) && s.salary.indexOf('Thỏa thuận') === 0;
  var posterTag = s.shopNameKnown ? '' : '<span class="tag soft">người đăng tin tuyển</span>';
  return '<article class="shop-card">'
  + '<div class="shop-head">'+shopLogoHTML(s)+'<div><h3>'+name+'</h3>'
  + '<p class="shop-sub">📍 '+loc+(hasReal(s.product) ? ' · '+esc(s.product) : '')+'</p></div></div>'
  + '<div class="tags"><span class="tag">📍 '+esc(s.province)+'</span>'+(negotiable ? '<span class="tag tag-negotiable">Lương thỏa thuận</span>' : '')+posterTag+'</div>'
  + shopDecisionHTML(s)
  + '<div class="shop-foot">'
  + (hasReal(s.date) ? '<p class="shop-meta">Ngày đăng tin: '+esc(s.date)+'</p>' : '')
  + contactsBlockHTML(s.contacts)
  + contactNoteHTML()
  + '<p class="shop-src">Tin tuyển công khai — <a data-track="xem-bai-tuyen-goc" href="'+esc(s.src)+'" target="_blank" rel="noopener">Bài tuyển gốc →</a></p>'
  + '</div>'
  + '<p class="warn">Shop có thể yêu cầu cập nhật hoặc gỡ tin qua nút Góp ý (💬).</p>'
  + '<div class="card-actions"><a class="btn btn-primary btn-sm" href="'+url+'">Xem chi tiết →</a>'
  + '<a class="btn btn-ghost btn-sm" data-track="nhan-zalo-shop" href="https://zalo.me/0329983699" target="_blank" rel="noopener">Nhắn Zalo</a></div>'
  + '<p class="disclaimer">'+DISCLAIMER+'</p>'+ownerNoteHTML('shop')+'</article>';
  /* v37: (a) .card-actions moved to the END (after .shop-src + .warn) so
     margin-top:auto pins the buttons to the very bottom of the card and they
     line up across a row. Before, .warn/.shop-src sat below the buttons, so
     the buttons' height varied with the text below them. (b) The "người đăng
     tin tuyển" pill moved from the h3 (where it wrapped to 2 lines and got
     clipped at the card edge) into the tags row. (c) The product pill was
     removed from the tags row — the product already shows in the subtitle and
     in the "Lĩnh vực livestream" box, so it duplicated. (d) Button labels shortened
     ("Xem chi tiết →", "Bài tuyển gốc →") so they fit on one line.
     v38 (can doi khung shop nhu khung mau): (e) .shop-head thanh dai neo
     thi giac co dinh (nen gradient xanh + padding + min-height) nhu
     .card-photo cua the mau — moi the shop co cung nhip thi giac o dau the.
     (f) Cac muc phu (ngay dang, lien he, ghi chu, link bai goc) gom vao
     .shop-foot co duong ke tren + gap gon — thu tu trong foot giu nguyen
     (note truoc src, actions van sau src + warn), khong xoa thong tin nao. */
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
function initSectionFilter(opts){
  var section = document.getElementById(opts.sectionId);
  if(!section) return;
  var applyBtn = document.getElementById(opts.applyId);
  var resetBtn = document.getElementById(opts.resetId);
  if(!applyBtn || !resetBtn) return;
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
  applyBtn.addEventListener('click', apply);
  resetBtn.addEventListener('click', reset);
}
function initLotFilter(){
  initSectionFilter({
    sectionId: 'lo-hang-xa-kho', moreBtnId: 'lotMoreBtn', filterId: 'lotFilter',
    applyId: 'lotApplyBtn', resetId: 'lotResetBtn',
    countId: 'lotCount', emptyId: 'lotEmpty', label: 'lô',
    readForm: function(){
      return {
        price: document.getElementById('fLotPrice').value,
        qty: document.getElementById('fLotQty').value,
        cat: document.getElementById('fLotCat').value
      };
    },
    matches: lotMatches
  });
}
function initFactoryFilter(){
  initSectionFilter({
    sectionId: 'xuong-may-gia-cong', moreBtnId: 'factoryMoreBtn', filterId: 'factoryFilter',
    applyId: 'factoryApplyBtn', resetId: 'factoryResetBtn',
    countId: 'factoryCount', emptyId: 'factoryEmpty', label: 'xưởng',
    readForm: function(){
      return {
        prov: document.getElementById('fFacProv').value,
        value: document.getElementById('fFacValue').value,
        moq: document.getElementById('fFacMoq').value,
        cat: document.getElementById('fFacCat').value
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
    /* v45: loc theo gia tri. revMin tinh theo trieu (topRevenue parse ra VND);
       mau chua co doanh thu that (topRevenue null) bi loai khi co nhap — hien
       0/20 mau co doanh thu that nen loc nay chua ra ket qua cho toi khi co
       du lieu, dung thiet ke, khong bia du lieu. */
    if(f.revMin != null){ var r = parseRevenue(m.topRevenue); if(r === null || r < f.revMin * 1000000) return false; }
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
/* Hang ghim: toi da 4 bai co pinned:true. Bai co pinOrder (so, nho = len truoc)
   xep truoc theo pinOrder tang dan; bai ghim khong co pinOrder xep sau theo
   ngay giam dan (giu thu tu cu). Chua du 4 thi lap bang bai moi nhat (khong
   trung lap). Cron bai bao 08:21 quan ly ghim (toi da 4 bai, ghim bai quan
   trong nhat moi ngay, go ghim bai qua 7 ngay). */
function getPinnedRow(list){
  var pinned = (list||[]).filter(function(a){ return !!a.pinned; });
  pinned.sort(function(a, b){
    var ao = (typeof a.pinOrder === 'number') ? a.pinOrder : Infinity;
    var bo = (typeof b.pinOrder === 'number') ? b.pinOrder : Infinity;
    if(ao !== bo) return ao - bo;
    return (a.date||'') > (b.date||'') ? -1 : ((a.date||'') < (b.date||'') ? 1 : 0);
  });
  var newest = sortByDateDesc(list||[]);
  var picked = pinned.slice(0, 4);
  for(var i=0; i<newest.length && picked.length<4; i++){
    if(picked.indexOf(newest[i]) === -1) picked.push(newest[i]);
  }
  return picked;
}
function pinCardHTML(a, n){
  var tg = articleTarget(a);
  var num = (typeof n === 'number') ? '<span class="pin-num" aria-label="Tin ' + n + '">' + n + '</span>' : '';
  var inner = num + articleMediaHTML(a, 'pin-img')
    + '<h3>'+esc(a.title)+'</h3>'
    + '<p class="pin-cat">'+esc(a.cat)+' · '+esc(a.source)+'</p>';
  if(!tg.href) return '<article class="pin-card">'+inner+'</article>';
  return '<article class="pin-card"><a href="'+esc(tg.href)+'"'+(tg.blank?' target="_blank" rel="noopener"':'')+'>'+inner+'</a></article>';
}
/* v41 trust strip: so lieu tinh DONG tu data.js (khong ghi so cung vao HTML).
   Quy tac luong/doanh thu cua mau (user-directed 06/11): doanh thu cao nhat
   (topRevenue) la tieu de khi co du lieu da kiem chung; hien tai ca 20 mau
   deu "Chua cap nhat" nen fallback la luong de xuat THAP NHAT (min salaryNum)
   kem ghi chu doanh thu chua co du lieu. Khi 1 mau co topRevenue that thi
   code tu chuyen sang hien thi doanh thu, khong can sua tay.
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
   'revenue-desc' dung parseRevenue(topRevenue) — hien ca 20 mau deu
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
  if(sort === 'revenue-asc') return sortByVal(list, function(m){ return parseRevenue(m.topRevenue); }, 1);
  if(sort === 'revenue-desc') return sortByVal(list, function(m){ return parseRevenue(m.topRevenue); }, -1);
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
   class, data-*, thu tu) de bo loc + nut Xem them 2 hang chay y nhu cu. */
function lotCardHTML(l){
  return '<article class="lot-card" data-price="' + (l.priceNum == null ? '' : l.priceNum) + '" data-qty="' + (l.qty == null ? '' : l.qty) + '" data-cat="' + esc(l.cat) + '"><h4>' + esc(l.title) + '</h4><p class="lot-price">' + esc(l.price) + '</p><p class="lot-meta">' + esc(l.meta) + '</p><p class="lot-date">' + esc(l.dateLabel) + ': ' + esc(l.date) + '</p><p class="lot-label">' + esc(l.label) + '</p><p><a href="' + esc(l.url) + '" target="_blank" rel="noopener">' + esc(l.linkText) + '</a></p></article>';
}
function factoryCardHTML(f){
  return '<article class="lot-card" data-moq="' + (f.moq == null ? '' : f.moq) + '" data-cat="' + esc(f.cat) + '" data-prov="' + esc(f.prov) + '"><h4>' + esc(f.name) + '</h4><p class="lot-price">' + esc(f.items) + '</p><p class="lot-meta">' + esc(f.meta) + '</p><p class="lot-date">' + esc(f.dateLabel) + ': ' + esc(f.date) + '</p><p class="lot-label">' + esc(f.label) + '</p><p><a href="' + esc(f.url) + '" target="_blank" rel="noopener">' + esc(f.linkText) + '</a></p></article>';
}
/* v76: render the lo/xuong tu data.js vao trang Shop + cap nhat dong dem
   (.lot-sub) + o loc tinh xuong (fFacProv) theo so lieu thuc te. Goi TRUOC
   initLotFilter/initFactoryFilter vi cac ham do chup lai danh sach the trong
   grid luc khoi tao. Tren trang khac (khong co section lo/xuong) thi khong lam gi. */
function renderLotSections(ref){
  var lots = D.lots || [], factories = D.factories || [];
  var byGroup = lotsByGroup(lots, ref);
  var g1 = document.getElementById('lotGrid1');
  if(g1) g1.innerHTML = byGroup.g1.map(lotCardHTML).join('');
  var g2 = document.getElementById('lotGrid2');
  if(g2) g2.innerHTML = byGroup.g2.map(lotCardHTML).join('');
  var g3 = document.getElementById('lotGrid3');
  if(g3) g3.innerHTML = byGroup.g3.map(lotCardHTML).join('');
  var fg = document.getElementById('factoryGrid');
  if(fg) fg.innerHTML = factories.map(factoryCardHTML).join('');
  var s1 = document.getElementById('lotSub1');
  if(s1) s1.textContent = 'Doanh nghiệp và shop xả hàng tồn kho theo lô sỉ — đang có ' + byGroup.g1.length + ' lô.';
  var s2 = document.getElementById('lotSub2');
  if(s2) s2.textContent = 'Doanh nghiệp cần xả kho số lượng lớn có thể liên hệ các đơn vị thu mua dưới đây để thu về vốn tái sản xuất. Giá thu mua không công khai, liên hệ trực tiếp để thỏa thuận. Đang có ' + byGroup.g2.length + ' đơn vị.';
  var s3 = document.getElementById('lotSub3');
  if(s3) s3.textContent = 'Chương trình xả kho theo đợt của chợ, sàn, trung tâm thương mại và tổ chức — bán lẻ từng món, không phải lô sỉ. Đang có ' + byGroup.g3.length + ' chương trình.';
  var fs = document.getElementById('factorySub');
  if(fs) fs.textContent = 'Xưởng và nhà máy may nhận gia công quần áo cho shop và thương hiệu — đang có ' + factories.length + ' xưởng/nhà máy.';
  /* o loc tinh xuong: dung lua chon theo so xuong thuc te tung tinh */
  var sel = document.getElementById('fFacProv');
  if(sel){
    var counts = {}, order = [];
    factories.forEach(function(f){
      if(!f.prov) return;
      if(!counts[f.prov]){ counts[f.prov] = 0; order.push(f.prov); }
      counts[f.prov]++;
    });
    var html = '<option value="">Tất cả tỉnh</option>';
    order.forEach(function(p){
      var label = (p === 'TP.HCM') ? 'TP. Hồ Chí Minh' : p;
      html += '<option value="' + esc(p) + '">' + esc(label) + ' (' + counts[p] + ')</option>';
    });
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
    var r = parseRevenue(m.topRevenue);
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
  if(news) news.innerHTML=D.articles.slice().sort(function(x,y){return (x.date||'')>(y.date||'')?-1:((x.date||'')<(y.date||'')?1:0);}).slice(0,6).map(function(a){
    // Relative .html URLs are internal v20 pages (bai-viet-bop-reach.html now exists).
    var link = articleLink(a);
    return '<div class="news-item"><div class="cat">'+esc(a.cat)+' · '+esc(a.source)+'</div>'
    + link
    + '<div class="meta">'+(a.date?('Ngày: '+esc(a.date)):'Chưa có ngày báo gốc')+'</div></div>';
  }).join('');
  var homeShops=document.getElementById('homeShops');
  if(homeShops) homeShops.innerHTML=defaultShopOrder(D.shops||[]).slice(0,6).map(shopCardHTML).join('');
  var form=document.getElementById('heroSearch');
  if(form) form.addEventListener('submit',function(e){e.preventDefault();
    var q=document.getElementById('heroQ').value.trim();
    var prov=document.getElementById('heroProv').value;
    var cat=document.getElementById('heroCat').value;
    var dest='danh-sach-mau.html'; var qs=[];
    if(q) qs.push('q='+encodeURIComponent(q)); if(prov) qs.push('prov='+encodeURIComponent(prov)); if(cat) qs.push('cat='+encodeURIComponent(cat));
    location.href=dest+(qs.length?'?'+qs.join('&'):'');
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
/* Trang shop: grid + bo loc (tinh / linh vuc livestream) + phan trang
   9/trang, dong bo URL — cung khung bo cuc nhu trang Mau (section-head gon,
   filter-card, grid, pager) nhung truong loc la nhu cau rieng cua shop
   (khong co Gioi tinh). */
function initShops(){
  renderLotSections(); /* v76: render the lo/xuong TRUOC khi bo loc chup danh sach the */
  rotateStaticGrids();
  initLotFilter();
  initFactoryFilter();
  initFilterToggle(); /* v72: nut mo/dong bo loc tren mobile */
  var el=document.getElementById('publicShopsList'); if(!el) return;
  var p=params(); var page=parseInt(p.page||'1',10)||1;
  var perPage=9;
  function readForm(){return {prov:document.getElementById('fShopProv').value,cat:document.getElementById('fShopCat').value,sort:document.getElementById('fShopSort').value,shift:document.getElementById('fShopShift').value,payType:elVal('fPayType'),payMin:parseMoneyInput(elVal('fPayMin'))};}
  function render(pg){
    var f=readForm();
    // v42: mac dinh (sort='') giu sortShopsNewest; chon sap xep thi dung sortShopsBy (bo qua thu tu ngay).
    var list=filterShops(f.sort ? sortShopsBy(D.shops||[],f.sort) : defaultShopOrder(D.shops||[]),f);
    var totalPages=Math.max(1,Math.ceil(list.length/perPage)); if(pg>totalPages) pg=totalPages; if(pg<1) pg=1;
    el.innerHTML=list.length?list.slice((pg-1)*perPage,pg*perPage).map(shopCardHTML).join(''):'<p>Chưa có tin tuyển khớp bộ lọc. Hãy chọn tỉnh khác, chọn lĩnh vực khác, hoặc bấm Đặt lại.</p>';
    renderPager(document.getElementById('shopPager'),pg,totalPages,list.length,function(np){render(np); setParams(Object.assign({},readForm(),{page:String(np)})); el.scrollIntoView();},perPage,'tin tuyển');
    setParams(Object.assign({},f,{page:String(pg)}));
  }
  // prefill from URL keys
  if(p.prov) document.getElementById('fShopProv').value=p.prov;
  if(p.cat) document.getElementById('fShopCat').value=p.cat;
  if(p.sort) document.getElementById('fShopSort').value=p.sort;
  if(p.shift) document.getElementById('fShopShift').value=p.shift;
  if(p.paytype){ var pt=document.getElementById('fPayType'); if(pt) pt.value=p.paytype; }
  if(p.paymin){ var pm=document.getElementById('fPayMin'); if(pm) pm.value=p.paymin; }
  /* v45: o "Muc luong toi thieu" chi nhap duoc sau khi chon loai luong;
     nhan/placeholder doi theo loai; bo chon loai thi khoa + xoa gia tri. */
  function syncPayMin(){
    var pt=elVal('fPayType');
    var inp=document.getElementById('fPayMin'), lab=document.getElementById('fPayMinLabel');
    if(!inp||!lab) return;
    if(pt==='hourly'){ lab.textContent='Lương giờ tối thiểu (đ/giờ)'; inp.placeholder='VD: 100000'; inp.disabled=false; }
    else if(pt==='monthly'){ lab.textContent='Lương tháng tối thiểu (triệu/tháng)'; inp.placeholder='VD: 15'; inp.disabled=false; }
    else { lab.textContent='Mức lương tối thiểu'; inp.placeholder='Chọn loại lương trước'; inp.disabled=true; inp.value=''; }
  }
  var fPayTypeEl=document.getElementById('fPayType');
  if(fPayTypeEl) fPayTypeEl.addEventListener('change',syncPayMin);
  syncPayMin();
  document.getElementById('applyShopBtn').addEventListener('click',function(){render(1); closeFilterOf(document.getElementById('applyShopBtn'));});
  document.getElementById('resetShopBtn').addEventListener('click',function(){['fShopProv','fShopCat','fShopSort','fShopShift','fPayType','fPayMin'].forEach(function(id){var el=document.getElementById(id); if(el) el.value='';}); syncPayMin(); render(1);});
  render(page);
}
/* List page: grid + filters + pagination 12/page, URL-synced */
function initList(){
  var grid=document.getElementById('listGrid'); if(!grid) return;
  initFilterToggle(); /* v72: nut mo/dong bo loc tren mobile */
  var p=params(); var page=parseInt(p.page||'1',10)||1;
  function readForm(){return {prov:document.getElementById('fProv').value,cat:document.getElementById('fCat').value,gender:document.getElementById('fGender').value,sort:document.getElementById('fSort').value,shift:document.getElementById('fShift').value,revMin:parseMoneyInput(elVal('fRevMin')),wageMin:parseMoneyInput(elVal('fWageMin')),q:document.getElementById('fQ').value.trim()};}
  function render(pg){
    var f=readForm(); var list=filterModels(D.models,f);
    if(f.sort){
      // v42: chon sap xep thi dung sortModelsBy (bo qua pipeline mac dinh:
      // sap theo luot xem + xoay theo ngay se pha thu tu luong/doanh thu).
      list=sortModelsBy(list,f.sort);
    } else {
    // v63: tach ra defaultModelOrder de khoi hub 11.11 dung DUNG thu tu nay.
    list=defaultModelOrder(list);
    }
    var totalPages=Math.max(1,Math.ceil(list.length/12)); if(pg>totalPages) pg=totalPages; if(pg<1) pg=1;
    grid.innerHTML=list.length?list.slice((pg-1)*12,pg*12).map(cardHTML).join(''):'<p>Chưa có hồ sơ khớp bộ lọc. Hãy chọn tỉnh khác, chọn Toàn quốc / Live online, hoặc bấm Đặt lại.</p>';
    renderPager(document.getElementById('pager'),pg,totalPages,list.length,function(np){render(np); setParams(Object.assign({},readForm(),{page:String(np)})); grid.scrollIntoView();},12,'hồ sơ');
    setParams(Object.assign({},f,{page:String(pg)}));
  }
  ['fProv','fCat','fGender','fQ'].forEach(function(id){var el=document.getElementById(id); if(el&&p[id==='fProv'?'prov':id==='fCat'?'cat':id==='fGender'?'gender':'q']) el.value=p[id==='fProv'?'prov':id==='fCat'?'cat':id==='fGender'?'gender':'q'];});
  // prefill from URL keys
  if(p.prov) document.getElementById('fProv').value=p.prov;
  if(p.cat) document.getElementById('fCat').value=p.cat;
  if(p.gender) document.getElementById('fGender').value=p.gender;
  if(p.sort) document.getElementById('fSort').value=p.sort;
  if(p.shift) document.getElementById('fShift').value=p.shift;
  if(p.revmin){ var rv=document.getElementById('fRevMin'); if(rv) rv.value=p.revmin; }
  if(p.wagemin){ var wm=document.getElementById('fWageMin'); if(wm) wm.value=p.wagemin; }
  if(p.q) document.getElementById('fQ').value=p.q;
  document.getElementById('applyBtn').addEventListener('click',function(){render(1); closeFilterOf(document.getElementById('applyBtn'));});
  document.getElementById('resetBtn').addEventListener('click',function(){['fProv','fCat','fGender','fSort','fShift','fRevMin','fWageMin','fQ'].forEach(function(id){var el=document.getElementById(id); if(el) el.value='';}); render(1);});
  render(page);
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
function hubCardHTML(m){ return cardHTML(m, {zaloHref: hubZaloHref(m), demoUrl: demoUrlOf(m)}); }
/* v63: ket qua hub = loc theo tinh + linh vuc (chi 2 o nay, khong loc gio lam
   / luong / doanh thu) roi xep DUNG thu tu mac dinh cua trang Mau. */
function hubResults(prov, cat, date){
  return defaultModelOrder(filterModels(D.models, {prov: prov || '', cat: cat || ''}), date);
}
/* v63: link sang trang Mau dung tham so prov/cat ma initList da doc + dien
   san vao bo loc khi tai trang (da kiem chung trong code v52). Ca 2 rong thi
   ve trang Mau khong tham so. */
function hubAllLink(prov, cat){
  var qs = [];
  if(prov) qs.push('prov=' + encodeURIComponent(prov));
  if(cat) qs.push('cat=' + encodeURIComponent(cat));
  return 'danh-sach-mau.html' + (qs.length ? '?' + qs.join('&') : '');
}
/* v63: dong trang thai khi to hop 0 mau — chi noi dung su that + duong doi
   lua chon, khong goi y mau sai tinh/linh vuc, khong hien the trong. */
function hubEmptyHTML(prov, cat){
  var total = (D.models || []).length;
  if(prov && cat) return 'Chưa có mẫu ' + esc(cat) + ' ở ' + esc(prov) + '. Thử chọn Toàn quốc / Live online, hoặc <a href="' + hubAllLink('', cat) + '">xem tất cả mẫu ' + esc(cat) + ' →</a>';
  if(prov) return 'Chưa có mẫu ở ' + esc(prov) + '. Thử chọn Toàn quốc / Live online, hoặc <a href="danh-sach-mau.html">xem tất cả ' + total + ' mẫu →</a>';
  if(cat) return 'Chưa có mẫu ' + esc(cat) + '. <a href="danh-sach-mau.html">Xem tất cả ' + total + ' mẫu →</a>';
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
      if(countEl) countEl.innerHTML = 'Chọn tỉnh và lĩnh vực ở trên để xem mẫu phù hợp — hoặc <a href="danh-sach-mau.html">xem tất cả ' + total + ' mẫu →</a>';
      return;
    }
    var list = hubResults(prov, cat);
    if(!list.length){
      box.innerHTML = '';
      if(countEl) countEl.innerHTML = hubEmptyHTML(prov, cat);
      return;
    }
    box.innerHTML = list.slice(0, 3).map(hubCardHTML).join('');
    if(countEl) countEl.innerHTML = 'Có ' + list.length + ' mẫu phù hợp. <a href="' + hubAllLink(prov, cat) + '">Xem tất cả ' + list.length + ' mẫu →</a>';
  }
  if(provSel) provSel.addEventListener('change', render);
  if(catSel) catSel.addEventListener('change', render);
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
    main.innerHTML=list.map(function(a){
      var href = articleHref(a);
      var imgTarget = a.page ? '' : ' target="_blank" rel="noopener"';
      var imgCap = a.kind === 'keyword' ? 'Infographic: Ver2Solution tự làm từ số liệu tin tuyển thật trên sàn.'
        : (a.imgSelf ? 'Infographic: Ver2Solution tự làm từ số liệu bài gốc.' : 'Ảnh gốc: ' + esc(a.source) + ' — không phải ảnh của Ver2Solution.');
      var imgAlt = a.kind === 'keyword' ? 'Infographic do Ver2Solution tự làm từ số liệu tin tuyển thật trên sàn'
        : (a.imgSelf ? 'Infographic do Ver2Solution tự làm từ số liệu bài gốc' : 'Ảnh gốc từ bài của ' + esc(a.source));
      var img = a.img ? '<a href="' + esc(href) + '"' + imgTarget + '><img src="' + esc(a.img) + '" alt="' + imgAlt + '" loading="lazy" style="width:100%;border-radius:12px;margin:10px 0 4px"></a><div class="meta">' + imgCap + '</div>' : '';
      var tw = a.takeaway ? '<p><b>Theo Ver2Solution:</b> '+esc(a.takeaway)+'</p>' : '';
      return '<div class="news-item"><div class="cat">'+esc(a.cat)+' · '+esc(a.source)+'</div>'+linkHTML(a)
      + '<div class="meta">'+(a.date?('Ngày: '+esc(a.date)+(a.dateNote?' ('+esc(a.dateNote)+')':'')):'Chưa có ngày báo gốc')+'</div>'+img+tw+'</div>';
    }).join('');
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
  + '<div class="fact"><b>Doanh thu cao nhất</b><span>'+esc(m.topRevenue)+'</span></div>'
  + '<div class="fact"><b>Chiều cao / cân nặng</b><span>'+esc(m.height)+'</span></div>'
  + '<div class="fact"><b>Đánh giá</b><span>'+esc(m.rating)+'</span></div>'
  + '<div class="fact"><b>Ngày bài gốc</b><span>'+esc(m.date)+'</span></div></div>'
  + '<h2>Kinh nghiệm</h2><p>'+esc(m.exp)+'</p>'
  + '<p class="warn">⚠ CHƯA XÁC NHẬN ĐỒNG Ý ĐĂNG WEB — hồ sơ từ bài đăng công khai, sẽ xóa khi có hồ sơ mới tự đăng ký thay thế.</p></div></div>'
  + '<div><div class="contact-card"><h2>Liên hệ trực tiếp với mẫu</h2>'
  + contactsBlockHTML(m.contacts)
  + contactNoteHTML()
  + '<p>Chỉ hiển thị thông tin liên hệ do chính mẫu công khai trong bài đăng hoặc trên kênh công khai của mẫu. Thông tin chưa công khai không hiển thị. Trước khi chốt, shop xác nhận lại lịch làm việc và tình trạng tìm việc với mẫu, vì lịch ghi trong bài là tại thời điểm bài đăng.</p>'
  + '<a class="btn btn-light" data-track="xem-bai-goc-mau" href="'+esc(m.src)+'" target="_blank" rel="noopener">Xem bài gốc trên Facebook →</a>'
  + '<a class="btn btn-light" data-track="nhan-zalo-ver2solution" href="https://zalo.me/0329983699" target="_blank" rel="noopener">Nhắn Zalo Ver2Solution 032 998 3699</a>'
  + '<a class="btn btn-ghost" data-track="yeu-cau-go-ho-so" style="background:transparent;color:#fff;border-color:#fff" href="https://zalo.me/0329983699" target="_blank" rel="noopener">Yêu cầu gỡ hồ sơ</a></div>'
  + '<div class="side-card"><h2 style="margin-top:0">Thông tin thêm</h2><p><b>Hình thức:</b> '+esc(m.form)+'</p><p><b>Giới tính:</b> '+esc(m.gender)+'</p><p><b>Bài gốc:</b> <a href="'+esc(m.src)+'" target="_blank" rel="noopener">Xem bài gốc trên Facebook</a> · Ngày bài: '+esc(m.date)+'</p></div></div></div>';
  var others=document.getElementById('otherGrid');
  if(others) others.innerHTML=D.models.filter(function(x){return x.id!==m.id;}).map(miniHTML).join('');
  var title=document.getElementById('detailTitle'); if(title) title.textContent='Hồ sơ: '+m.province+' — '+m.name;
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
  + '<p class="warn">Shop có thể yêu cầu cập nhật hoặc gỡ tin qua nút Góp ý (💬).</p></div></div>'
  + '<div><div class="contact-card"><h2>Liên hệ với shop</h2>'
  + contactsBlockHTML(s.contacts)
  + contactNoteHTML()
  + '<p>Chỉ hiển thị thông tin liên hệ do chính shop công khai trong bài tuyển hoặc trên kênh công khai của shop. Thông tin chưa công khai không hiển thị.</p>'
  + '<a class="btn btn-light" data-track="nhan-zalo-ver2solution" href="https://zalo.me/0329983699" target="_blank" rel="noopener">Nhắn Zalo Ver2Solution 032 998 3699</a></div></div></div>';
  var others=document.getElementById('otherShops');
  if(others) others.innerHTML=(D.shops||[]).filter(function(x){return x.id!==s.id;}).slice(0,6).map(shopCardHTML).join('');
}
if(typeof document!=='undefined') document.addEventListener('DOMContentLoaded',function(){
  initHome(); initList(); initNews(); initDetail(); initShopDetail(); initShops(); initHub(); initFaqToggle();
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
window.V20 = {esc:esc, cardHTML:cardHTML, decisionHTML:decisionHTML, hasRealValue:hasReal, miniHTML:miniHTML, filterModels:filterModels, filterShops:filterShops, shopCatGroup:shopCatGroup, withPhotoFirst:withPhotoFirst, clean:clean, shopCardHTML:shopCardHTML, shopDecisionHTML:shopDecisionHTML, shopLogoHTML:shopLogoHTML, contactsBlockHTML:contactsBlockHTML, contactNoteHTML:contactNoteHTML, contactItemHTML:contactItemHTML, sortShopsNewest:sortShopsNewest, articleLink:articleLink, articleHref:articleHref, sortByDateDesc:sortByDateDesc, articleTarget:articleTarget, articleTitleHTML:articleTitleHTML, articleMediaHTML:articleMediaHTML, getPinnedRow:getPinnedRow, pinCardHTML:pinCardHTML, dayOfYear:dayOfYear, rotateDaily:rotateDaily, rotateWindow:rotateWindow, window8h:window8h, photoTier:photoTier, homeTop8:homeTop8, defaultShopOrder:defaultShopOrder, logoTier:logoTier, rotateStaticGrids:rotateStaticGrids, lotMatches:lotMatches, facMatches:facMatches, inRange:inRange, initLotFilter:initLotFilter, initFactoryFilter:initFactoryFilter, initSectionFilter:initSectionFilter, initFilterToggle:initFilterToggle, filterSectionOf:filterSectionOf, closeFilters:closeFilters, closeFilterOf:closeFilterOf, initShopDetail:initShopDetail, trustStats:trustStats, renderTrustStats:renderTrustStats, parseMonthlyMax:parseMonthlyMax, parseRevenue:parseRevenue, fmtVnd:fmtVnd, parseHourlyMin:parseHourlyMin, sortModelsBy:sortModelsBy, sortShopsBy:sortShopsBy, parseMoneyInput:parseMoneyInput, ownerNoteHTML:ownerNoteHTML, defaultModelOrder:defaultModelOrder, hubZaloHref:hubZaloHref, hubCardHTML:hubCardHTML, hubResults:hubResults, hubAllLink:hubAllLink, hubEmptyHTML:hubEmptyHTML, demoUrlOf:demoUrlOf, initHub:initHub, initFaqToggle:initFaqToggle, parseVnDate:parseVnDate, lotActive:lotActive, lotsByGroup:lotsByGroup, lotFactoryStats:lotFactoryStats, lotCardHTML:lotCardHTML, factoryCardHTML:factoryCardHTML, renderLotSections:renderLotSections};
if(typeof module!=='undefined' && module.exports) module.exports = window.V20;
})();
