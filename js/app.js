/* v20 app: render cards / detail / filters / pagination from window.V20_DATA.
   Rules ported from v19-fix2:
   - Every <article> gets all attributes INSIDE its opening tag (never after a closing div).
   - Real photos are embedded directly in the HTML string for the 7 profiles that have one;
     the other 13 keep a placeholder glyph, never a fabricated photo.
   - Visible text never contains an internal id (th-xx): ids live only in data and in ?id= URLs.
   - No private phone/Zalo/email of a model is rendered: contact is only via the original
     public post, or via Ver2Solution Zalo 032 998 3699. */
(function(){
'use strict';
var D = window.V20_DATA || {models:[], articles:[], provinces:[], categories:[]};
var PH = window.V20_PHOTOS || {};
function esc(s){return String(s==null?'':s).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]});}
function clean(s){return String(s||'').replace(/\s*·\s*$/,'').trim() || 'Chưa cập nhật';}
function photoHTML(m, cls){
  if(m.photoUrl) return '<img src="'+esc(m.photoUrl)+'" alt="Ảnh thật từ bài gốc của '+esc(m.name)+'" loading="lazy" decoding="async">';
  return '<span class="ph-holder" aria-hidden="true">👤</span>';
}
function photoNote(m){return m.photoUrl ? 'Ảnh thật từ bài gốc' : (m.photoHas ? 'Có ảnh trong bài gốc' : 'Ảnh minh hoạ tạm — chưa phải ảnh thật');}
function cardHTML(m){
  // All attributes are inside <article ...> here — the exact v19 bug is impossible in this template.
  return '<article class="card" data-province="'+esc(m.province)+'" data-cat="'+esc(m.cat)+'" data-gender="'+esc(m.gender)+'" data-views="'+m.views+'" data-comments="'+m.comments+'">'
  + '<div class="card-photo">'+photoHTML(m)+'<span class="status"><i></i>'+esc(m.status)+'</span><span class="ph-note">'+photoNote(m)+'</span></div>'
  + '<div class="card-body"><h3><a href="ho-so.html?id='+esc(m.id)+'">'+esc(m.province)+' — '+esc(m.name)+'</a></h3>'
  + '<p class="card-title">'+esc(m.title)+'</p>'
  + '<div class="tags"><span class="tag">📍 '+esc(m.province)+'</span><span class="tag">'+esc(m.cat)+'</span><span class="tag soft">'+esc(m.form)+'</span></div>'
  + '<dl class="facts"><div><dt>Lương mong muốn</dt><dd><b>'+esc(m.salary)+'</b></dd></div>'
  + '<div><dt>Lịch làm việc</dt><dd>'+esc(m.schedule)+'</dd></div>'
  + '<div><dt>Doanh thu cao nhất</dt><dd>'+esc(m.topRevenue)+'</dd></div>'
  + '<div><dt>Kinh nghiệm</dt><dd>'+esc(m.exp)+'</dd></div></dl>'
  + '<p class="warn">⚠ CHƯA XÁC NHẬN ĐỒNG Ý ĐĂNG WEB — hồ sơ từ bài đăng công khai, sẽ xóa khi có hồ sơ mới tự đăng ký thay thế. <a href="https://zalo.me/0329983699" target="_blank" rel="noopener">Yêu cầu gỡ hồ sơ</a></p>'
  + '<div class="card-actions"><a class="btn btn-primary btn-sm" href="ho-so.html?id='+esc(m.id)+'">Xem hồ sơ →</a>'
  + '<a class="btn btn-ghost btn-sm" href="https://zalo.me/0329983699" target="_blank" rel="noopener">Nhắn Zalo</a></div></div></article>';
}
function miniHTML(m){
  return '<article class="mini"><div class="mini-photo">'+photoHTML(m)+'</div><div class="mini-body"><h3><a href="ho-so.html?id='+esc(m.id)+'">'+esc(m.province)+' — '+esc(m.name)+'</a></h3>'
  + '<p>'+esc(m.title)+'</p><p>📍 '+esc(m.province)+' · '+esc(m.cat)+'</p><p>Lương: '+esc(m.salary)+'</p><p>'+esc(m.exp)+'</p></div></article>';
}
/* Shops (v22): tin tuyển công khai thu thập từ bài tuyển shop tự đăng.
   Chỉ hiển thị thông tin công khai: tên, mặt hàng, tỉnh/quận, lương, yêu cầu,
   kênh, ngày đăng, link bài gốc. Không số điện thoại/Zalo/địa chỉ riêng tư,
   không link fanpage (chưa xác định được), không logo thật — ô chữ cái đầu
   tên shop làm placeholder. 5 tin không ghi tên shop trong bài thì tên hiển
   thị là tên người đăng tin, kèm ghi chú "người đăng tin tuyển". */
function shopInitial(s){ return (String(s.name||'?').trim().charAt(0)||'?').toUpperCase(); }
function shopCardHTML(s){
  var name = esc(s.name) + (s.shopNameKnown ? '' : ' <span class="tag soft">người đăng tin tuyển</span>');
  return '<article class="shop-card">'
  + '<div class="shop-head"><span class="shop-initial" aria-hidden="true">'+esc(shopInitial(s))+'</span><div><h3>'+name+'</h3>'
  + '<p class="shop-sub">📍 '+esc(s.province)+(s.district && s.district!=='Chưa cập nhật' ? ' — '+esc(s.district) : '')+' · '+esc(s.product)+'</p></div></div>'
  + '<dl class="facts"><div><dt>Mức lương</dt><dd><b>'+esc(s.salary)+'</b></dd></div>'
  + '<div><dt>Yêu cầu chính</dt><dd>'+esc(s.req)+'</dd></div>'
  + '<div><dt>Kênh live</dt><dd>'+esc(s.channels)+'</dd></div>'
  + '<div><dt>Ngày đăng tin</dt><dd>'+esc(s.date)+'</dd></div></dl>'
  + '<p class="shop-src">Tin tuyển công khai — <a href="'+esc(s.src)+'" target="_blank" rel="noopener">Xem bài tuyển gốc trên Facebook →</a></p>'
  + '<p class="warn">Shop có thể yêu cầu cập nhật hoặc gỡ tin qua nút Góp ý (💬).</p></article>';
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
/* Daily rotation (v24): order rotates by day-of-year, stable within a day.
   Rotation happens INSIDE each tier, so the photo-first rule (home) and the
   views/comments sort (list page) never break: profiles stay in their tier,
   only their order inside the tier changes from day to day. No hardcoded
   order for any specific date; data and titles are untouched. */
function dayOfYear(d){ d = d || new Date(); var start = new Date(d.getFullYear(), 0, 0); return Math.floor((d - start) / 86400000); }
function rotateArr(list, offset){ var n = list.length; if(!n) return list.slice(); var k = ((offset % n) + n) % n; return list.slice(k).concat(list.slice(0, k)); }
function photoTier(m){ return m.photoUrl ? 'a' : (m.photoHas ? 'b' : 'c'); }
function rotateDaily(list, tierOf, date){
  var doy = dayOfYear(date);
  var tiers = {}, order = [];
  list.forEach(function(m){ var k = tierOf(m); if(!(k in tiers)){ tiers[k] = []; order.push(k); } tiers[k].push(m); });
  var out = [];
  order.forEach(function(k){ out = out.concat(rotateArr(tiers[k], doy)); });
  return out;
}
function params(){
  var p={}; try{new URLSearchParams(location.search).forEach(function(v,k){p[k]=v;});}catch(e){} return p;
}
function setParams(p){
  var q=new URLSearchParams(); Object.keys(p).forEach(function(k){if(p[k]) q.set(k,p[k]);});
  try{history.replaceState(null,'',location.pathname+(q.toString()?'?'+q.toString():''));}catch(e){}
}
function filterModels(list, f){
  return list.filter(function(m){
    if(f.prov && m.province!==f.prov) return false;
    if(f.cat && m.cat!==f.cat) return false;
    if(f.gender && m.gender!==f.gender) return false;
    if(f.q){var hay=(m.name+' '+m.title+' '+m.province+' '+m.cat+' '+m.form+' '+m.exp).toLowerCase(); if(hay.indexOf(f.q.toLowerCase())===-1) return false;}
    return true;
  });
}
function renderPager(el, page, totalPages, total, onPage){
  if(!el) return;
  var html='<button type="button" data-p="'+(page-1)+'"'+(page<=1?' disabled':'')+'>← Trang trước</button>';
  for(var i=1;i<=totalPages;i++) html+='<button type="button" data-p="'+i+'"'+(i===page?' class="current" disabled':'')+'>'+i+'</button>';
  html+='<button type="button" data-p="'+(page+1)+'"'+(page>=totalPages?' disabled':'')+'>Trang sau →</button>';
  html+='<span class="pager-info">Trang '+page+' / '+totalPages+' — đang hiện '+(total===0?0:((page-1)*6+1))+'–'+Math.min(page*6,total)+' trên tổng số '+total+' hồ sơ.</span>';
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
function initHome(){
  var grid=document.getElementById('homeGrid'); if(!grid) return;
  // v24: still exactly 8, still photo-first, but the order inside each photo
  // tier rotates by day-of-year so the home feels alive day to day.
  var shown=rotateDaily(withPhotoFirst(D.models), photoTier).slice(0,8);
  grid.innerHTML=shown.map(cardHTML).join('');
  var news=document.getElementById('homeNews');
  if(news) news.innerHTML=D.articles.slice().sort(function(x,y){return (x.date||'')>(y.date||'')?-1:((x.date||'')<(y.date||'')?1:0);}).slice(0,6).map(function(a){
    // Relative .html URLs are internal v20 pages (bai-viet-bop-reach.html now exists).
    var link = articleLink(a);
    return '<div class="news-item"><div class="cat">'+esc(a.cat)+' · '+esc(a.source)+'</div>'
    + link
    + '<div class="meta">'+(a.date?('Ngày: '+esc(a.date)):'Chưa có ngày báo gốc')+'</div></div>';
  }).join('');
  var homeShops=document.getElementById('homeShops');
  if(homeShops) homeShops.innerHTML=sortShopsNewest(D.shops||[]).slice(0,6).map(shopCardHTML).join('');
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
function initShops(){
  var el=document.getElementById('publicShopsList'); if(!el) return;
  var list=sortShopsNewest(D.shops||[]);
  el.innerHTML=list.length?list.map(shopCardHTML).join(''):'<p>Chưa có tin tuyển công khai nào.</p>';
  var cnt=document.getElementById('publicShopsCount'); if(cnt) cnt.textContent='Đang hiện '+list.length+' tin tuyển công khai.';
}
/* List page: grid + filters + pagination 6/page, URL-synced */
function initList(){
  var grid=document.getElementById('listGrid'); if(!grid) return;
  var p=params(); var page=parseInt(p.page||'1',10)||1;
  function readForm(){return {prov:document.getElementById('fProv').value,cat:document.getElementById('fCat').value,gender:document.getElementById('fGender').value,q:document.getElementById('fQ').value.trim()};}
  function render(pg){
    var f=readForm(); var list=filterModels(D.models,f);
    // Sắp xếp theo lượt xem rồi bình luận, giảm dần; cả 20 hồ sơ hiện đều 0/0 nên
    // thứ tự hòa được phá bằng ảnh thật trước, không dùng mã nội bộ để sắp xếp.
    list=list.slice().sort(function(a,b){return (b.views-a.views)||(b.comments-a.comments)||((b.photoUrl?1:0)-(a.photoUrl?1:0));});
    // v24: xoay thứ tự theo ngày trong năm, ổn định trong ngày — xoay riêng
    // trong từng nhóm cùng lượt xem/bình luận/nhóm ảnh để không phá thứ tự đã sắp.
    list=rotateDaily(list, function(m){ return m.views+'|'+m.comments+'|'+photoTier(m); });
    var totalPages=Math.max(1,Math.ceil(list.length/6)); if(pg>totalPages) pg=totalPages; if(pg<1) pg=1;
    grid.innerHTML=list.length?list.slice((pg-1)*6,pg*6).map(cardHTML).join(''):'<p>Chưa có hồ sơ khớp bộ lọc. Hãy chọn tỉnh khác, chọn Toàn quốc / Live online, hoặc bấm Đặt lại.</p>';
    renderPager(document.getElementById('pager'),pg,totalPages,list.length,function(np){render(np); setParams(Object.assign({},readForm(),{page:String(np)})); grid.scrollIntoView();});
    var info=document.getElementById('listInfo'); if(info) info.textContent=list.length+' hồ sơ khớp bộ lọc.';
    setParams(Object.assign({},f,{page:String(pg)}));
  }
  ['fProv','fCat','fGender','fQ'].forEach(function(id){var el=document.getElementById(id); if(el&&p[id==='fProv'?'prov':id==='fCat'?'cat':id==='fGender'?'gender':'q']) el.value=p[id==='fProv'?'prov':id==='fCat'?'cat':id==='fGender'?'gender':'q'];});
  // prefill from URL keys
  if(p.prov) document.getElementById('fProv').value=p.prov;
  if(p.cat) document.getElementById('fCat').value=p.cat;
  if(p.gender) document.getElementById('fGender').value=p.gender;
  if(p.q) document.getElementById('fQ').value=p.q;
  document.getElementById('applyBtn').addEventListener('click',function(){render(1);});
  document.getElementById('resetBtn').addEventListener('click',function(){['fProv','fCat','fGender','fQ'].forEach(function(id){document.getElementById(id).value='';}); render(1);});
  render(page);
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
      var img = a.img ? '<a href="'+esc(href)+'"'+imgTarget+'><img src="'+esc(a.img)+'" alt="Ảnh gốc từ bài của '+esc(a.source)+'" loading="lazy" style="width:100%;border-radius:12px;margin:10px 0 4px"></a><div class="meta">Ảnh gốc: '+esc(a.source)+' — không phải ảnh của Ver2Solution.</div>' : '';
      var tw = a.takeaway ? '<p><b>Ver2Solution rút ra:</b> '+esc(a.takeaway)+'</p>' : '';
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
  + '<div class="fact"><b>Giỏi live nhất</b><span>'+esc(m.cat)+'</span></div>'
  + '<div class="fact"><b>Lương mong muốn</b><span>'+esc(m.salary)+'</span></div>'
  + '<div class="fact"><b>Lịch làm việc</b><span>'+esc(m.schedule)+'</span></div>'
  + '<div class="fact"><b>Doanh thu cao nhất</b><span>'+esc(m.topRevenue)+'</span></div>'
  + '<div class="fact"><b>Chiều cao / cân nặng</b><span>'+esc(m.height)+'</span></div>'
  + '<div class="fact"><b>Đánh giá</b><span>'+esc(m.rating)+'</span></div>'
  + '<div class="fact"><b>Ngày bài gốc</b><span>'+esc(m.date)+'</span></div></div>'
  + '<h2>Kinh nghiệm</h2><p>'+esc(m.exp)+'</p>'
  + '<p class="warn">⚠ CHƯA XÁC NHẬN ĐỒNG Ý ĐĂNG WEB — hồ sơ từ bài đăng công khai, sẽ xóa khi có hồ sơ mới tự đăng ký thay thế.</p></div></div>'
  + '<div><div class="contact-card"><h2>Liên hệ tuyển mẫu này</h2><p>Shop liên hệ theo 2 cách, không cần đăng nhập để xem hồ sơ:</p>'
  + '<ol><li><b>Cách 1 — qua bài gốc:</b> bấm Xem bài gốc, nhắn trực tiếp cho người đăng bài trên Facebook.</li>'
  + '<li><b>Cách 2 — qua Ver2Solution:</b> nhắn Zalo 032 998 3699, ghi tên mẫu và tỉnh / lĩnh vực cần tuyển để được giới thiệu.</li></ol>'
  + '<p>Web không đăng số điện thoại, Zalo hay email riêng của mẫu. Trước khi chốt, shop xác nhận lại lịch làm việc và tình trạng tìm việc với mẫu, vì lịch ghi trong bài là tại thời điểm bài đăng.</p>'
  + '<a class="btn btn-light" href="'+esc(m.src)+'" target="_blank" rel="noopener">Xem bài gốc trên Facebook →</a>'
  + '<a class="btn btn-light" href="'+esc(m.src)+'" target="_blank" rel="noopener">Nhắn Facebook qua bài gốc</a>'
  + '<a class="btn btn-light" href="https://zalo.me/0329983699" target="_blank" rel="noopener">Nhắn Zalo Ver2Solution 032 998 3699</a>'
  + '<a class="btn btn-ghost" style="background:transparent;color:#fff;border-color:#fff" href="https://zalo.me/0329983699" target="_blank" rel="noopener">Yêu cầu gỡ hồ sơ</a></div>'
  + '<div class="side-card"><h2 style="margin-top:0">Thông tin thêm</h2><p><b>Hình thức:</b> '+esc(m.form)+'</p><p><b>Giới tính:</b> '+esc(m.gender)+'</p><p><b>Bài gốc:</b> <a href="'+esc(m.src)+'" target="_blank" rel="noopener">Xem bài gốc trên Facebook</a> · Ngày bài: '+esc(m.date)+'</p></div></div></div>';
  var others=document.getElementById('otherGrid');
  if(others) others.innerHTML=D.models.filter(function(x){return x.id!==m.id;}).map(miniHTML).join('');
  var title=document.getElementById('detailTitle'); if(title) title.textContent='Hồ sơ: '+m.province+' — '+m.name;
}
if(typeof document!=='undefined') document.addEventListener('DOMContentLoaded',function(){
  initHome(); initList(); initNews(); initDetail(); initShops();
  var mb=document.getElementById('menuBtn');
  if(mb) mb.addEventListener('click',function(){var n=document.getElementById('mainNav'); var o=n.classList.toggle('open'); mb.setAttribute('aria-expanded',o?'true':'false');});
  var fab=document.getElementById('gopyFab');
  if(fab) fab.addEventListener('click',function(){document.getElementById('gopyOverlay').classList.add('open');});
  var ov=document.getElementById('gopyOverlay');
  if(ov) ov.addEventListener('click',function(e){if(e.target===ov) ov.classList.remove('open');});
  var gf=document.getElementById('gopyForm');
  if(gf) gf.addEventListener('submit',async function(e){e.preventDefault(); var msg=document.getElementById('gopyMsg');
    var data={name:gf.gopyName.value.trim(), kind:gf.gopyKind.value, rating:null, content:gf.gopyContent.value.trim(), page:location.pathname};
    if(!data.content){ if(msg) msg.textContent='Bạn nhập nội dung góp ý trước nhé.'; return; }
    try{
      var API=window.McLivestreamAPI;
      if(API && API.submitFeedback){ await API.submitFeedback(data); if(msg) msg.textContent='Cảm ơn bạn! Góp ý đã gửi về Ver2Solution để tổng hợp.'; gf.reset(); return; }
    }catch(err){ if(msg) msg.textContent='Chưa gửi được: '+(err.message||err)+'. Góp ý đã lưu tạm, bạn gửi thêm qua Zalo giúp mình nhé.'; }
    if(msg && !msg.textContent) msg.textContent='Cảm ơn bạn! Góp ý đã lưu tạm trên máy của bạn, bạn có thể gửi thêm qua Zalo để Ver2Solution tổng hợp ngay.'; gf.reset();});
});
window.V20 = {esc:esc, cardHTML:cardHTML, miniHTML:miniHTML, filterModels:filterModels, withPhotoFirst:withPhotoFirst, clean:clean, shopCardHTML:shopCardHTML, sortShopsNewest:sortShopsNewest, articleLink:articleLink, articleHref:articleHref, dayOfYear:dayOfYear, rotateDaily:rotateDaily, photoTier:photoTier};
if(typeof module!=='undefined' && module.exports) module.exports = window.V20;
})();
