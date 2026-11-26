/* js/smart-profile.js — Hồ sơ nghề nghiệp thông minh FWA (21/11/2026, nhánh feat/user-social-mvp).
   Nâng cấp trang Cá nhân (trang-cua-toi.html, mục 6) theo chỉ thị Owner P1 21/11:
   - 4 vai trò (MC/Host/Mẫu, Shop/Tuyển dụng, KOC/Creator, Studio/Agency), một người có thể nhiều vai trò.
   - Bố cục 5 khối: Tôi là ai? / Tôi giỏi điều gì? / Tôi đang cần gì? / Tôi phù hợp với ai? / Hành động ngay.
   - Gợi ý theo quy tắc từ js/data.js công khai, có lý do dễ hiểu, KHÔNG điểm phù hợp, KHÔNG bịa số liệu.
   - Portfolio ảnh/video lưu localStorage; thẻ chia sẻ (canvas) KHÔNG chứa SĐT/email/thu nhập.
   - Xu: chỉ hiển thị tiến độ hoàn thiện; Xu do backend xác nhận sau đồng bộ tài khoản (S2) — bản thử nghiệm KHÔNG cộng Xu, KHÔNG tự sửa số dư.
   - Dữ liệu mẫu chỉ hiện ở chế độ "Xem mẫu", ghi rõ DEMO — không giả làm dữ liệu production.
   - Đọc hồ sơ MVP (v2s_social_profile_v1: kỹ năng/khu vực/nhu cầu/thu nhập) để dùng chung, không nhập trùng.
   - ?selftest=1 chạy kiểm thử nội bộ, ghi vào #smart-selftest + document.title. */
(function(){
'use strict';
var SMART_KEY='v2s_smart_profile_v1';
var PF_KEY='v2s_smart_portfolio_v1';
var MVP_KEY='v2s_social_profile_v1';
var STATE_KEY='v2s_social_v1';
var ROLES={
  mc:{label:'MC / Host / Mẫu livestream',short:'MC / Mẫu live',cta1:'Mời thử livestream',cta2:'Mời hợp tác'},
  shop:{label:'Shop / Nhà tuyển dụng',short:'Shop tuyển dụng',cta1:'Đăng tuyển',cta2:'Tìm ứng viên'},
  koc:{label:'KOC / Creator / Affiliate',short:'KOC / Creator',cta1:'Mời hợp tác',cta2:'Xem portfolio'},
  studio:{label:'Studio / Agency / Dịch vụ',short:'Studio / Agency',cta1:'Gửi yêu cầu dịch vụ',cta2:'Xem dự án'}
};
var STATUSES={'dang-nhan-viec':'Đang nhận việc','dang-tuyen':'Đang tuyển dụng','san-sang-hop-tac':'Sẵn sàng hợp tác','tam-nghi':'Tạm nghỉ'};
var PLATFORMS=['Facebook','TikTok Shop','Shopee Live','YouTube'];
var SAMPLE_MC={displayName:'Mẫu thử MC 01',primaryRole:'mc',secondaryRoles:['koc'],status:'dang-nhan-viec',platforms:['TikTok Shop','Facebook'],categories:['thời trang','mỹ phẩm'],skills:['dẫn live','chốt đơn','giao tiếp'],region:'Hà Nội',need:'tim-viec',income:{min:'',max:''},experience:'2 năm dẫn live thời trang, đã live 300+ phiên',schedule:'Tối thứ 2–thứ 6, ca 19h–22h',hireNote:'Nhận live thử 1 phiên trước khi ký hợp tác.',payPublic:false};
var SAMPLE_SHOP={displayName:'Shop thử 01',primaryRole:'shop',secondaryRoles:[],status:'dang-tuyen',platforms:['TikTok Shop','Shopee Live'],categories:['thời trang'],skills:[],region:'TP. Hồ Chí Minh',need:'tuyen-mau',income:{min:'',max:''},experience:'Shop thời trang, 3 năm bán online',schedule:'Ca live 9h, 14h, 20h hằng ngày',openPositions:['MC live (2 vị trí)','Mẫu ảnh (1 vị trí)'],hireNote:'Cần MC dẫn live thời trang, ưu tiên có kinh nghiệm chốt đơn.',payPublic:false};
var SAMPLE_PF=[
  {id:'demo1',title:'Phiên live thời trang — mẫu',type:'video',url:'https://www.tiktok.com/',caption:'Video demo phiên live (mẫu).'},
  {id:'demo2',title:'Bộ ảnh lookbook — mẫu',type:'image',url:'https://vieclamlivestream.online/',caption:'Ảnh mẫu lookbook.'},
  {id:'demo3',title:'Clip giới thiệu bản thân — mẫu',type:'video',url:'https://www.youtube.com/',caption:'Video giới thiệu mẫu.'}
];
function $(id){ return document.getElementById(id); }
function esc(s){ return String(s==null?'':s).replace(/[&<>"']/g,function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); }
function loadJSON(key,fallback){ try{ var v=JSON.parse(window.localStorage.getItem(key)||'null'); return v==null?fallback:v; }catch(e){ return fallback; } }
function saveJSON(key,val){ try{ window.localStorage.setItem(key,JSON.stringify(val)); }catch(e){} }
function loadSmart(){ var p=loadJSON(SMART_KEY,{}); if(!p.primaryRole) p.primaryRole='mc'; if(!Array.isArray(p.secondaryRoles)) p.secondaryRoles=[]; if(!Array.isArray(p.platforms)) p.platforms=[]; if(!Array.isArray(p.categories)) p.categories=[]; if(!Array.isArray(p.openPositions)) p.openPositions=[]; return p; }
function loadMVP(){ return loadJSON(MVP_KEY,{}); }
function loadPF(){ var a=loadJSON(PF_KEY,[]); return Array.isArray(a)?a:[]; }
function skillsFromMVP(){ var m=loadMVP(); return (m.spSkills||'').split(',').map(function(s){ return s.trim(); }).filter(Boolean); }
function regionFromMVP(){ var m=loadMVP(); return m.spRegion||''; }
function needFromMVP(){ var m=loadMVP(); return m.spLookingFor||''; }
function incomeFromMVP(){ var m=loadMVP(); return {min:m.spIncomeMin||'',max:m.spIncomeMax||''}; }
function demoMode(){ return !!window.__smartDemo; }
function currentProfile(){
  if(demoMode()){ var p=loadSmart(); return p.primaryRole==='shop'?SAMPLE_SHOP:SAMPLE_MC; }
  var s=loadSmart(); var m=loadMVP();
  return {
    displayName:s.displayName||'', primaryRole:s.primaryRole||'mc', secondaryRoles:s.secondaryRoles||[],
    status:s.status||'', platforms:s.platforms||[], categories:s.categories.length?s.categories:((m.spInterests||'').split(',').map(function(x){ return x.trim(); }).filter(Boolean)),
    experience:s.experience||'', schedule:s.schedule||(m.spWorkHours||''), hireNote:s.hireNote||'',
    openPositions:s.openPositions||[], payPublic:!!s.payPublic,
    skills:skillsFromMVP(), region:regionFromMVP(), need:needFromMVP(), income:incomeFromMVP()
  };
}
function roleLabel(r){ return (ROLES[r]||ROLES.mc).label; }
function statusLabel(s){ return STATUSES[s]||'Chưa đặt trạng thái'; }
function tagList(items){ return items.map(function(x){ return '<span class="smart-tag">'+esc(x)+'</span>'; }).join(''); }
function completionPct(){
  var p=currentProfile(); var m=loadMVP();
  var fields=[p.displayName,p.primaryRole,p.status,p.experience,p.schedule];
  var filled=fields.filter(Boolean).length;
  if(p.platforms.length) filled++;
  if(p.categories.length) filled++;
  if((p.skills||[]).length) filled++;
  if(m.spRegion) filled++;
  if(m.spLookingFor) filled++;
  return Math.round(filled/10*100);
}

/* ---------- Render: 5 khối hồ sơ ---------- */
function needLabel(n){ return {'tim-viec':'Tìm việc livestream','tuyen-mau':'Tuyển mẫu / MC','tim-shop':'Tìm shop hợp tác','tim-doi-tac':'Tìm đối tác / xưởng','kinh-doanh':'Kinh doanh / bán hàng'}[n]||'Chưa đặt nhu cầu'; }
function renderRoleTabs(){
  var wrap=$('smartRoleTabs'); if(!wrap) return;
  var p=currentProfile();
  wrap.innerHTML=Object.keys(ROLES).map(function(k){
    return '<button type="button" class="smart-role-tab'+(p.primaryRole===k?' is-active':'')+'" data-role="'+k+'">'+esc(ROLES[k].short)+'</button>';
  }).join('');
  wrap.querySelectorAll('button').forEach(function(b){
    b.addEventListener('click',function(){
      var s=loadSmart(); s.primaryRole=b.getAttribute('data-role'); saveJSON(SMART_KEY,s);
      window.__smartDemo=false; syncDemoBtn(); renderAll();
    });
  });
}
function renderBlocks(){
  var host=$('smartBlocks'); if(!host) return;
  var p=currentProfile(); var role=ROLES[p.primaryRole]||ROLES.mc;
  var demo=demoMode();
  var payHtml='';
  if(p.payPublic&&p.income&&(p.income.min||p.income.max)){
    payHtml='<p class="smart-line">Mức thù lao mong muốn: <strong>'+esc(p.income.min||'?')+'–'+esc(p.income.max||'?')+' triệu/tháng</strong> <span class="smart-muted">(đã cho phép công khai)</span></p>';
  } else if(p.income&&(p.income.min||p.income.max)){
    payHtml='<p class="smart-line smart-muted">Mức thù lao mong muốn đã điền ở mục 5 nhưng chưa công khai — chỉ bạn thấy dòng này.</p>';
  }
  var b1='<div class="smart-block"><h3>1. Tôi là ai?</h3>'
    +'<p class="smart-name">'+esc(p.displayName||'Chưa đặt tên hiển thị')+(demo?' <span class="smart-demo-badge">DỮ LIỆU MẪU — DEMO</span>':'')+'</p>'
    +'<p class="smart-line"><strong>'+esc(role.label)+'</strong> · <span class="smart-status">'+esc(statusLabel(p.status))+'</span></p>'
    +(p.categories.length?'<p class="smart-line">Chuyên: '+tagList(p.categories)+'</p>':'')
    +(p.region?'<p class="smart-line">Khu vực: '+esc(p.region)+'</p>':'')
    +(p.platforms.length?'<p class="smart-line">Nền tảng: '+esc(p.platforms.join(' · '))+'</p>':'')
    +(p.secondaryRoles.length?'<p class="smart-line smart-muted">Vai trò khác: '+p.secondaryRoles.map(roleLabel).join(' · ')+'</p>':'')
    +payHtml+'</div>';
  var pf=loadPF(); var pfShow=demo?SAMPLE_PF:pf;
  var b2='<div class="smart-block"><h3>2. Tôi giỏi điều gì?</h3>'
    +((p.skills||[]).length?'<p class="smart-line">Kỹ năng: '+tagList(p.skills)+'</p>':'<p class="smart-line smart-muted">Chưa có kỹ năng — điền ở mục 5.</p>')
    +(p.experience?'<p class="smart-line">'+esc(p.experience)+'</p>':'')
    +'<p class="smart-line">Portfolio: '+(pfShow.length? pfShow.length+' mục — xem ở khối Portfolio bên dưới.' : 'chưa có mục nào.')+'</p></div>';
  var b3='<div class="smart-block"><h3>3. Tôi đang cần gì?</h3>'
    +'<p class="smart-line"><strong>'+esc(needLabel(p.need))+'</strong></p>'
    +(p.hireNote?'<p class="smart-line">'+esc(p.hireNote)+'</p>':'')
    +(p.primaryRole==='shop'&&p.openPositions.length?'<p class="smart-line">Vị trí đang tuyển: '+tagList(p.openPositions)+'</p>':'')
    +(p.schedule?'<p class="smart-line">Lịch làm việc: '+esc(p.schedule)+'</p>':'')
    +'</div>';
  var b4='<div class="smart-block"><h3>4. Tôi phù hợp với ai?</h3><div id="smartSuggestList"></div></div>';
  var b5='<div class="smart-block"><h3>5. Hành động ngay</h3>'
    +'<div class="sf-actions"><button type="button" class="sf-btn" data-cta="1">'+esc(role.cta1)+'</button><button type="button" class="sf-btn" data-cta="2">'+esc(role.cta2)+'</button></div>'
    +'<p class="sf-contact-note">Bản thử nghiệm: thao tác liên hệ cần đăng nhập + backend (S2). Chưa gửi lời mời thật. Liên hệ chỉ hiện sau khi đăng nhập, theo Contact Gate.</p></div>';
  host.innerHTML=b1+b2+b3+b4+b5;
  host.querySelectorAll('[data-cta]').forEach(function(b){
    b.addEventListener('click',function(){
      var t=$('smartToast'); if(t) t.textContent='Bản thử nghiệm — "'+b.textContent+'" cần đăng nhập + backend (S2). Chưa gửi lời mời thật.';
    });
  });
  renderSuggestSmart();
}
/* ---------- Gợi ý theo quy tắc (có lý do, không điểm số) ---------- */
function matchReason(hitSkills,region,place){
  var parts=[];
  if(hitSkills.length) parts.push('Khớp kỹ năng: '+hitSkills.join(', '));
  if(region&&place&&place.indexOf(region)!==-1) parts.push('Cùng khu vực: '+region);
  return parts.join(' · ')||'Tin tuyển mới';
}
function renderSuggestSmart(){
  var list=$('smartSuggestList'); if(!list) return;
  var data=window.V20_DATA; var p=currentProfile();
  if(!data){ list.innerHTML='<p class="sf-card-meta">Đang tải dữ liệu gợi ý…</p>'; return; }
  var skills=(p.skills||[]).concat(p.categories||[]);
  var region=p.region||'';
  var out=[];
  if(p.primaryRole==='shop'){
    (data.models||[]).forEach(function(m){
      var hay=((m.cat||'')+' '+(m.exp||'')+' '+(m.title||'')).toLowerCase();
      var hit=skills.filter(function(k){ return k&&hay.indexOf(k.toLowerCase())!==-1; });
      if(hit.length) out.push({name:m.name,meta:'Mẫu live · '+(m.cat||'')+' · '+(m.province||''),why:matchReason(hit,region,m.province||'')});
    });
  } else {
    (data.shops||[]).forEach(function(s){
      var hay=((s.product||'')+' '+(s.req||'')).toLowerCase();
      var hit=skills.filter(function(k){ return k&&hay.indexOf(k.toLowerCase())!==-1; });
      if(hit.length) out.push({name:s.name,meta:'Tuyển mẫu · '+(s.product||'')+' · '+(s.province||''),why:matchReason(hit,region,s.province||'')});
    });
  }
  if(!out.length){
    (data.shops||[]).slice(0,3).forEach(function(s){
      out.push({name:s.name,meta:'Tuyển mẫu · '+(s.product||'')+' · '+(s.province||''),why:'Tin tuyển mới'});
    });
  }
  out=out.slice(0,3);
  list.innerHTML='<p class="sf-card-meta">Gợi ý theo quy tắc khớp kỹ năng/khu vực — chưa phải xếp hạng, không có điểm phù hợp.</p>'+out.map(function(o){
    return '<div class="sf-suggest-card"><strong>'+esc(o.name)+'</strong><p>'+esc(o.meta)+'</p><span class="sf-why">'+esc(o.why)+'</span></div>';
  }).join('');
}
/* ---------- Portfolio ---------- */
function pfThumb(it){
  var letter=(it.title||'?').charAt(0).toUpperCase();
  if(it.type==='image'&&/^https?:\/\//i.test(it.url||'')){
    return '<img src="'+esc(it.url)+'" alt="'+esc(it.title)+'" loading="lazy" onerror="this.style.display=\'none\';this.nextElementSibling.style.display=\'flex\'"><span class="smart-pf-ph" style="display:none">'+esc(letter)+'</span>';
  }
  return '<span class="smart-pf-ph">'+esc(letter)+(it.type==='video'?' ▶':'')+'</span>';
}
function renderPortfolio(){
  var host=$('smartPfGrid'); if(!host) return;
  var demo=demoMode(); var items=demo?SAMPLE_PF:loadPF();
  if(!items.length){ host.innerHTML='<p class="sf-card-meta">Chưa có mục portfolio nào — thêm ảnh/video demo của bạn ở form bên dưới.</p>'; return; }
  host.innerHTML=items.map(function(it){
    return '<div class="smart-pf-item" data-id="'+esc(it.id)+'">'+pfThumb(it)
      +'<div class="smart-pf-cap"><strong>'+esc(it.title)+'</strong><span>'+esc(it.caption||'')+'</span></div>'
      +(demo?'':'<button type="button" class="smart-pf-del" data-del="'+esc(it.id)+'" title="Xóa mục này">×</button>')
      +'</div>';
  }).join('');
  host.querySelectorAll('.smart-pf-item').forEach(function(el){
    el.addEventListener('click',function(ev){
      if(ev.target.getAttribute('data-del')) return;
      openLightbox(items.find(function(x){ return x.id===el.getAttribute('data-id'); }));
    });
  });
  host.querySelectorAll('[data-del]').forEach(function(b){
    b.addEventListener('click',function(ev){
      ev.stopPropagation();
      if(b.getAttribute('data-armed')){ var items2=loadPF().filter(function(x){ return x.id!==b.getAttribute('data-del'); }); saveJSON(PF_KEY,items2); renderPortfolio(); }
      else { b.setAttribute('data-armed','1'); b.textContent='Chắc chắn xóa?'; }
    });
  });
}
function openLightbox(it){
  if(!it) return;
  var m=$('smartModal'); if(!m) return;
  var body=$('smartModalBody');
  if(it.type==='image'&&/^https?:\/\//i.test(it.url||'')){
    body.innerHTML='<img src="'+esc(it.url)+'" alt="'+esc(it.title)+'" style="max-width:100%;border-radius:10px"><p><strong>'+esc(it.title)+'</strong></p><p>'+esc(it.caption||'')+'</p>';
  } else {
    body.innerHTML='<p><strong>'+esc(it.title)+'</strong></p><p>'+esc(it.caption||'')+'</p><p><a href="'+esc(it.url)+'" target="_blank" rel="noopener">Mở video gốc ↗</a></p><p class="sf-card-meta">Video mở ở tab mới — bản thử nghiệm không nhúng video ngoài.</p>';
  }
  m.hidden=false;
}
function closeLightbox(){ var m=$('smartModal'); if(m) m.hidden=true; }
/* ---------- Thẻ chia sẻ (canvas) ---------- */
function drawShareCard(){
  var cv=$('smartShareCanvas'); if(!cv) return false;
  var p=currentProfile(); var role=ROLES[p.primaryRole]||ROLES.mc;
  var ctx=cv.getContext('2d'); if(!ctx) return false;
  var W=cv.width,H=cv.height;
  ctx.fillStyle='#ffffff'; ctx.fillRect(0,0,W,H);
  ctx.fillStyle='#0b5d4e'; ctx.fillRect(0,0,W,300);
  ctx.fillStyle='#F7C948'; ctx.fillRect(0,300,W,10);
  ctx.fillStyle='#ffffff'; ctx.font='bold 44px sans-serif'; ctx.fillText('vieclamlivestream.online',48,90);
  ctx.font='32px sans-serif'; ctx.fillStyle='#F7C948'; ctx.fillText('Hồ sơ nghề nghiệp thông minh — FWA',48,150);
  ctx.fillStyle='#111827'; ctx.font='bold 64px sans-serif';
  wrapText(ctx,p.displayName||'Hồ sơ nghề nghiệp',48,420,W-96,72);
  ctx.fillStyle='#0b5d4e'; ctx.font='bold 40px sans-serif'; ctx.fillText(role.label,48,520);
  ctx.fillStyle='#374151'; ctx.font='34px sans-serif';
  var y=600;
  var skills=(p.skills||[]).slice(0,3);
  if(skills.length){ ctx.fillText('Kỹ năng: '+skills.join(' · '),48,y); y+=56; }
  if(p.categories.length){ ctx.fillText('Chuyên: '+p.categories.slice(0,3).join(' · '),48,y); y+=56; }
  if(p.region){ ctx.fillText('Khu vực: '+p.region,48,y); y+=56; }
  ctx.fillStyle='#0b5d4e'; ctx.font='bold 40px sans-serif';
  ctx.fillText(p.primaryRole==='shop'?'Đang tuyển dụng':'Đang nhận việc / hợp tác',48,y+20);
  ctx.fillStyle='#6b7280'; ctx.font='28px sans-serif';
  ctx.fillText('Sàn việc làm dành cho idol live top 1 Việt Nam',48,H-60);
  ctx.fillText('Liên hệ chỉ hiện sau khi đăng nhập (Contact Gate).',48,H-20);
  return true;
}
function wrapText(ctx,text,x,y,maxW,lh){
  var words=String(text).split(' '); var line=''; var yy=y;
  words.forEach(function(w){
    var t=line?line+' '+w:w;
    if(ctx.measureText(t).width>maxW&&line){ ctx.fillText(line,x,yy); line=w; yy+=lh; }
    else line=t;
  });
  ctx.fillText(line,x,yy);
}
/* ---------- Trung tâm cơ hội ---------- */
function resolveName2(key){
  var data=window.V20_DATA; if(!data) return null;
  var type=key.split(':')[0]; var id=key.slice(type.length+1);
  var coll={model:data.models,shop:data.shops,lot:data.lots}[type];
  if(coll){ var f=coll.find(function(x){ return x.id===id; }); if(f) return f.name||f.title; }
  if(type==='article'){ var a=(data.articles||[]).find(function(x){ return x.url===id; }); if(a) return a.title; }
  return null;
}
function renderOpp(){
  var host=$('smartOppList'); if(!host) return;
  var st={saves:{},follows:{}};
  try{ st=JSON.parse(window.localStorage.getItem(STATE_KEY)||'{}'); st.saves=st.saves||{}; st.follows=st.follows||{}; }catch(e){}
  var saved=Object.keys(st.saves).map(resolveName2).filter(Boolean);
  var followed=Object.keys(st.follows).map(resolveName2).filter(Boolean);
  var h='<p><strong>Tin đã lưu ('+saved.length+'):</strong> '+(saved.length?esc(saved.join(' · ')):'chưa có — bấm Lưu trên Bảng tin.')+'</p>'
    +'<p><strong>Đang theo dõi ('+followed.length+'):</strong> '+(followed.length?esc(followed.join(' · ')):'chưa có — bấm Theo dõi trên Bảng tin.')+'</p>'
    +'<p><strong>Lời mời hợp tác (mẫu):</strong> Shop thử A mời live thử 1 phiên · Studio thử B mời quay portfolio <span class="smart-demo-badge">DEMO</span></p>'
    +'<p class="smart-muted">Ứng tuyển, lịch hẹn và nhiệm vụ phù hợp cần backend (S2) — bản thử nghiệm chưa ghi nhận thao tác thật.</p>';
  host.innerHTML=h;
}
/* ---------- Tiến độ + Xu (chỉ hiển thị, không cộng Xu) ---------- */
function renderProgress(){
  var pct=completionPct();
  var bar=$('smartBar'), txt=$('smartPct');
  if(bar) bar.style.width=pct+'%';
  if(txt) txt.textContent='Hoàn thiện hồ sơ '+pct+'% — '+(pct>=100?'đủ thông tin để nhận gợi ý.':'điền thêm để mở gợi ý phù hợp.');
}
/* ---------- Chế độ xem mẫu / xem như khách ---------- */
function syncDemoBtn(){
  var b=$('smartDemoBtn'); if(b) b.textContent=demoMode()?'Dùng hồ sơ của tôi':'Xem mẫu (MC + Shop)';
}
function syncGuestBtn(){
  var b=$('smartGuestBtn'); if(b) b.textContent=document.body.classList.contains('smart-guest')?'Quay lại chỉnh sửa':'Xem như khách';
}
function renderAll(){
  renderRoleTabs(); renderBlocks(); renderPortfolio(); renderOpp(); renderProgress();
  drawShareCard();
}
/* ---------- Khởi tạo ---------- */
function fillForm(){
  var s=loadSmart();
  var map={smartName:'displayName',smartStatus:'status',smartExperience:'experience',smartSchedule:'schedule',smartHireNote:'hireNote',smartPayPublic:'payPublic'};
  Object.keys(map).forEach(function(id){
    var el=$(id); if(!el) return;
    var v=s[map[id]];
    if(el.type==='checkbox') el.checked=!!v; else if(v!=null) el.value=v;
  });
  PLATFORMS.forEach(function(pl){
    var el=$('smartPf_'+pl.replace(/[^A-Za-z0-9]/g,'')); if(el) el.checked=(s.platforms||[]).indexOf(pl)!==-1;
  });
  var sec=$('smartSecondary'); if(sec){
    sec.querySelectorAll('input').forEach(function(cb){ cb.checked=(s.secondaryRoles||[]).indexOf(cb.value)!==-1; });
  }
}
function readFormIntoSmart(){
  var s=loadSmart();
  var name=$('smartName'); if(name) s.displayName=name.value.trim();
  var st=$('smartStatus'); if(st) s.status=st.value;
  var ex=$('smartExperience'); if(ex) s.experience=ex.value.trim();
  var sc=$('smartSchedule'); if(sc) s.schedule=sc.value.trim();
  var hn=$('smartHireNote'); if(hn) s.hireNote=hn.value.trim();
  var pp=$('smartPayPublic'); if(pp) s.payPublic=pp.checked;
  s.platforms=PLATFORMS.filter(function(pl){ var el=$('smartPf_'+pl.replace(/[^A-Za-z0-9]/g,'')); return el&&el.checked; });
  var sec=$('smartSecondary');
  s.secondaryRoles=sec?Array.prototype.filter.call(sec.querySelectorAll('input'),function(cb){ return cb.checked; }).map(function(cb){ return cb.value; }):[];
  saveJSON(SMART_KEY,s);
}
function init(){
  var root=$('smart-profile'); if(!root) return;
  fillForm(); syncDemoBtn(); renderAll();
  var form=$('smartForm');
  if(form) form.addEventListener('input',function(){ readFormIntoSmart(); renderAll(); });
  var demoBtn=$('smartDemoBtn');
  if(demoBtn) demoBtn.addEventListener('click',function(){ window.__smartDemo=!window.__smartDemo; syncDemoBtn(); renderAll(); });
  var guestBtn=$('smartGuestBtn');
  if(guestBtn) guestBtn.addEventListener('click',function(){ document.body.classList.toggle('smart-guest'); syncGuestBtn(); });
  var pfForm=$('smartPfForm');
  if(pfForm) pfForm.addEventListener('submit',function(ev){
    ev.preventDefault();
    var title=($('smartPfTitle')||{}).value||''; var type=($('smartPfType')||{}).value||'image';
    var url=(($('smartPfUrl')||{}).value||'').trim(); var cap=(($('smartPfCap')||{}).value||'').trim();
    var msg=$('smartPfMsg');
    if(!title.trim()||!/^https?:\/\//i.test(url)){ if(msg) msg.textContent='Cần tiêu đề và link bắt đầu bằng http:// hoặc https://.'; return; }
    var items=loadPF();
    items.push({id:'pf'+Date.now(),title:title.trim(),type:type,url:url,caption:cap});
    saveJSON(PF_KEY,items); renderPortfolio();
    pfForm.reset(); if(msg) msg.textContent='Đã thêm vào portfolio (lưu trên trình duyệt này).';
  });
  var shareBtn=$('smartShareBtn');
  if(shareBtn) shareBtn.addEventListener('click',function(){
    var ok=drawShareCard();
    var msg=$('smartShareMsg');
    if(ok&&msg) msg.textContent='Đã tạo thẻ chia sẻ (không chứa SĐT/email/thu nhập). Bấm "Tải thẻ PNG" để lưu ảnh.';
  });
  var dlBtn=$('smartShareDl');
  if(dlBtn) dlBtn.addEventListener('click',function(){
    var cv=$('smartShareCanvas'); if(!cv) return;
    drawShareCard();
    var a=document.createElement('a'); a.download='fwa-talent-card.png'; a.href=cv.toDataURL('image/png'); a.click();
  });
  var copyBtn=$('smartShareCopy');
  if(copyBtn) copyBtn.addEventListener('click',function(){
    var link=window.location.origin+'/trang-cua-toi.html#smart-profile';
    var done=function(ok){ var m=$('smartShareMsg'); if(m) m.textContent=ok?'Đã sao chép link hồ sơ.':'Không sao chép được — link hồ sơ: '+link; };
    if(navigator.clipboard&&navigator.clipboard.writeText){ navigator.clipboard.writeText(link).then(function(){ done(true); },function(){ done(false); }); }
    else done(false);
  });
  var modal=$('smartModal');
  if(modal){
    modal.addEventListener('click',function(ev){ if(ev.target===modal) closeLightbox(); });
    var x=$('smartModalClose'); if(x) x.addEventListener('click',closeLightbox);
  }
  document.addEventListener('keydown',function(ev){ if(ev.key==='Escape') closeLightbox(); });
  window.SmartProfileReady=true;
  if(/[?&]selftest=1/.test(window.location.search)) setTimeout(runSelfTest,600);
}
function runSelfTest(){
  var out=$('smart-selftest'); var lines=[]; var pass=0; var total=0;
  function check(n,ok){ total++; if(ok) pass++; lines.push((ok?'PASS':'FAIL')+' — '+n); }
  try{
    var s=loadSmart(); s.primaryRole='shop'; saveJSON(SMART_KEY,s); window.__smartDemo=false; renderAll();
    check('vai trò Shop render đúng (có Đăng tuyển / Tìm ứng viên)',/Đăng tuyển|Tìm ứng viên/.test(($('smartBlocks')||{textContent:''}).textContent));
    s.primaryRole='mc'; saveJSON(SMART_KEY,s); renderAll();
    check('vai trò MC render đúng (có Tôi là ai / Mời thử livestream)',/Tôi là ai/.test(($('smartBlocks')||{textContent:''}).textContent)&&/Mời thử livestream/.test(($('smartBlocks')||{textContent:''}).textContent));
    var items=loadPF(); items.push({id:'selftest1',title:'Kiểm thử portfolio',type:'image',url:'https://vieclamlivestream.online/',caption:'mục kiểm thử'});
    saveJSON(PF_KEY,items); renderPortfolio();
    check('portfolio thêm + render được',/Kiểm thử portfolio/.test(($('smartPfGrid')||{textContent:''}).textContent));
    saveJSON(PF_KEY,loadPF().filter(function(x){ return x.id!=='selftest1'; })); renderPortfolio();
    renderSuggestSmart();
    check('gợi ý render được và có lý do',/Khớp|Tin tuyển mới/.test(($('smartSuggestList')||{textContent:''}).textContent));
    var okDraw=drawShareCard();
    check('thẻ chia sẻ vẽ được lên canvas',!!okDraw);
    check('không tràn ngang ở khung hiện tại',document.documentElement.scrollWidth<=window.innerWidth+1);
  }catch(e){ lines.push('FAIL — ngoại lệ: '+e.message); }
  var text='SMART SELFTEST '+pass+'/'+total+'\n'+lines.join('\n');
  if(out){ out.hidden=false; out.textContent=text; }
  document.title='SMART SELFTEST '+(pass===total?'PASS':'FAIL')+' '+pass+'/'+total;
}
if(document.readyState==='loading'){ document.addEventListener('DOMContentLoaded',init); } else { init(); }
})();
