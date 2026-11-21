/* js/social-feed.js — User Social MVP (21/11/2026, nhánh feat/user-social-mvp).
   Bảng tin xã hội: render từ js/data.js công khai.
   KHÔNG hiện SĐT/Zalo/Facebook trên thẻ (Contact Gate P0) — liên hệ chỉ sau đăng nhập.
   Thích/Lưu/Theo dõi lưu localStorage v2s_social_v1 (chưa đồng bộ tài khoản).
   Không bịa số lượt: đếm chỉ hiện khi có tương tác thật trên trình duyệt này.
   ?selftest=1 chạy kiểm thử nội bộ, ghi kết quả vào #sf-selftest + document.title. */
(function(){
'use strict';
var STATE_KEY='v2s_social_v1';
var PAGE_SIZE=10;
var FILTERS=[
  {id:'all',label:'Tất cả'},
  {id:'shop',label:'Việc làm'},
  {id:'model',label:'Mẫu'},
  {id:'lot',label:'Lô xả kho'},
  {id:'article',label:'Bài viết'}
];
var TYPE_LABEL={model:'Mẫu live',shop:'Tuyển mẫu',lot:'Lô xả kho',article:'Bài viết'};
var AVATAR_COLORS=['#0b5d4e','#b45309','#1d4ed8','#be185d','#4d7c0f','#0e7490'];

function esc(s){
  return String(s==null?'':s).replace(/[&<>"']/g,function(c){
    return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];
  });
}
function parseDate(v){
  if(!v) return 0;
  var m=/^(\d{4})-(\d{2})-(\d{2})/.exec(v);
  if(m) return new Date(+m[1],+m[2]-1,+m[3]).getTime();
  m=/^(\d{2})\/(\d{2})\/(\d{4})/.exec(v);
  if(m) return new Date(+m[3],+m[2]-1,+m[1]).getTime();
  return 0;
}
function fmtDate(v){
  var t=parseDate(v);
  if(!t) return esc(v||'');
  var d=new Date(t);
  return d.getDate()+'/'+(d.getMonth()+1)+'/'+d.getFullYear();
}
function trunc(s,n){
  s=String(s||'');
  return s.length>n?s.slice(0,n-1)+'…':s;
}
function hashColor(key){
  var h=0;
  for(var i=0;i<key.length;i++) h=(h*31+key.charCodeAt(i))>>>0;
  return AVATAR_COLORS[h%AVATAR_COLORS.length];
}
function initial(name){
  name=String(name||'?').trim();
  return name? name[0].toUpperCase() : '?';
}
function loadState(){
  try{
    var s=JSON.parse(window.localStorage.getItem(STATE_KEY)||'{}');
    s.likes=s.likes||{}; s.saves=s.saves||{}; s.follows=s.follows||{};
    return s;
  }catch(e){ return {likes:{},saves:{},follows:{}}; }
}
function saveState(s){
  try{ window.localStorage.setItem(STATE_KEY,JSON.stringify(s)); }catch(e){}
}

function buildItems(data){
  var out=[];
  (data.models||[]).forEach(function(m){
    out.push({key:'model:'+m.id,type:'model',id:m.id,name:m.name,
      sub:[m.province,m.cat,fmtDate(m.date)].filter(Boolean).join(' · '),
      text:m.exp||m.title||'',meta:['Lương: '+(m.salary||'Thỏa thuận')].join(' · '),
      date:parseDate(m.date)});
  });
  (data.shops||[]).forEach(function(s){
    out.push({key:'shop:'+s.id,type:'shop',id:s.id,name:s.name,
      sub:[s.province,s.product,fmtDate(s.date)].filter(Boolean).join(' · '),
      text:s.req||'',meta:['Lương: '+(s.salary||'Thỏa thuận'),'Kênh: '+(s.channels||'')].filter(function(x){return x!=='Kênh: ';}).join(' · '),
      date:parseDate(s.date)});
  });
  (data.lots||[]).forEach(function(l){
    out.push({key:'lot:'+l.id,type:'lot',id:l.id,name:l.title,
      sub:[fmtDate(l.date),l.cat||''].filter(Boolean).join(' · '),
      text:l.meta||'',meta:['Giá: '+(l.price||''),'Số lượng: '+(l.qty||'')].join(' · '),
      date:parseDate(l.date)});
  });
  (data.articles||[]).forEach(function(a){
    if(!a.url) return;
    out.push({key:'article:'+a.url,type:'article',id:a.url,name:a.title,
      sub:[a.cat,fmtDate(a.date)].filter(Boolean).join(' · '),
      text:'',meta:['Nguồn: '+(a.source||'vieclamlivestream.online')].join(' · '),
      date:parseDate(a.date),url:a.url});
  });
  out.sort(function(x,y){ return y.date-x.date; });
  return out;
}

var state=loadState();
var items=[];
var filter='all';
var shown=PAGE_SIZE;

function visibleItems(){
  if(filter==='all') return items;
  return items.filter(function(it){ return it.type===filter; });
}
function cardHTML(it){
  var liked=!!state.likes[it.key];
  var saved=!!state.saves[it.key];
  var followed=!!state.follows[it.key];
  var canFollow=(it.type==='model'||it.type==='shop');
  var titleLink=(it.type==='article'&&it.url)
    ? '<a href="'+esc(it.url)+'">'+esc(it.name)+'</a>'
    : esc(it.name);
  var h='';
  h+='<article class="sf-card" data-type="'+it.type+'" data-key="'+esc(it.key)+'">';
  h+='<div class="sf-card-head"><span class="sf-avatar" style="background:'+hashColor(it.key)+'">'+esc(initial(it.name))+'</span>';
  h+='<div><strong>'+titleLink+'</strong><span class="sf-sub">'+esc(it.sub)+'</span></div>';
  h+='<span class="sf-type">'+TYPE_LABEL[it.type]+'</span></div>';
  if(it.text) h+='<p class="sf-card-text">'+esc(trunc(it.text,180))+'</p>';
  if(it.meta) h+='<p class="sf-card-meta">'+esc(it.meta)+'</p>';
  h+='<div class="sf-actions">';
  h+='<button class="sf-btn sf-like'+(liked?' is-on':'')+'" type="button" data-act="like">♥ '+(liked?'Đã thích':'Thích')+'</button>';
  h+='<button class="sf-btn sf-save'+(saved?' is-on':'')+'" type="button" data-act="save">'+(saved?'✓ Đã lưu':'Lưu')+'</button>';
  if(canFollow) h+='<button class="sf-btn sf-follow'+(followed?' is-on':'')+'" type="button" data-act="follow">'+(followed?'✓ Đang theo dõi':'+ Theo dõi')+'</button>';
  h+='<a class="sf-btn" href="/cong-dong/chat.html">Bình luận</a>';
  if(it.type==='model'||it.type==='shop') h+='<button class="sf-btn sf-contact" type="button" data-act="contact">Xem liên hệ</button>';
  h+='</div>';
  h+='<p class="sf-contact-note" hidden>Đăng nhập để xem liên hệ (SĐT/Zalo chỉ hiện cho thành viên đã đăng nhập). <a href="/dang-nhap.html">Đăng nhập</a></p>';
  h+='</article>';
  return h;
}
function render(){
  var feed=document.getElementById('sfFeed');
  var empty=document.getElementById('sfEmpty');
  var more=document.getElementById('sfMore');
  if(!feed) return;
  var vis=visibleItems();
  var slice=vis.slice(0,shown);
  feed.innerHTML=slice.map(cardHTML).join('');
  if(empty) empty.hidden=vis.length!==0;
  if(more) more.hidden=vis.length<=shown;
  document.querySelectorAll('#sfFilters .sf-chip').forEach(function(ch){
    ch.classList.toggle('is-active',ch.getAttribute('data-filter')===filter);
  });
}
function toggleAct(btn){
  var card=btn.closest('.sf-card');
  if(!card) return;
  var key=card.getAttribute('data-key');
  var act=btn.getAttribute('data-act');
  if(act==='like'){ state.likes[key]=!state.likes[key]; if(!state.likes[key]) delete state.likes[key]; }
  if(act==='save'){ state.saves[key]=!state.saves[key]; if(!state.saves[key]) delete state.saves[key]; }
  if(act==='follow'){ state.follows[key]=!state.follows[key]; if(!state.follows[key]) delete state.follows[key]; }
  if(act==='contact'){
    var note=card.querySelector('.sf-contact-note');
    if(note) note.hidden=false;
    return;
  }
  saveState(state);
  render();
}
function init(){
  var feed=document.getElementById('sfFeed');
  if(!feed) return;
  var data=window.V20_DATA;
  if(!data){ feed.innerHTML='<p class="sf-empty">Không tải được dữ liệu bảng tin.</p>'; return; }
  items=buildItems(data);
  var filtersEl=document.getElementById('sfFilters');
  if(filtersEl){
    filtersEl.innerHTML=FILTERS.map(function(f){
      return '<button class="sf-chip'+(f.id===filter?' is-active':'')+'" type="button" data-filter="'+f.id+'">'+f.label+'</button>';
    }).join('');
    filtersEl.addEventListener('click',function(ev){
      var b=ev.target.closest('[data-filter]');
      if(!b) return;
      filter=b.getAttribute('data-filter'); shown=PAGE_SIZE; render();
    });
  }
  feed.addEventListener('click',function(ev){
    var b=ev.target.closest('[data-act]');
    if(b) toggleAct(b);
  });
  var more=document.getElementById('sfMore');
  if(more) more.addEventListener('click',function(){ shown+=PAGE_SIZE; render(); });
  render();
  if(/[?&]selftest=1/.test(window.location.search)) runSelfTest();
}
function runSelfTest(){
  var out=document.getElementById('sf-selftest');
  var lines=[]; var pass=0; var total=0;
  function check(name,ok){ total++; if(ok) pass++; lines.push((ok?'PASS':'FAIL')+' — '+name); }
  try{
    check('render >= 10 thẻ',document.querySelectorAll('#sfFeed .sf-card').length>=10);
    var first=document.querySelector('#sfFeed .sf-card');
    var likeBtn=first&&first.querySelector('[data-act="like"]');
    if(likeBtn){ likeBtn.click(); }
    check('bấm Thích lưu được state',!!state.likes[first.getAttribute('data-key')]);
    var saveBtn=document.querySelector('#sfFeed .sf-card [data-act="save"]');
    if(saveBtn){ saveBtn.click(); }
    check('bấm Lưu lưu được state',Object.keys(state.saves).length>=1);
    var chip=document.querySelector('#sfFilters [data-filter="model"]');
    if(chip){ chip.click(); }
    var vis=document.querySelectorAll('#sfFeed .sf-card');
    var allModel=true;
    vis.forEach(function(c){ if(c.getAttribute('data-type')!=='model') allModel=false; });
    check('lọc Mẫu chỉ hiện thẻ mẫu',vis.length>0&&allModel);
    var followBtn=document.querySelector('#sfFeed .sf-card [data-act="follow"]');
    if(followBtn){ followBtn.click(); }
    check('bấm Theo dõi lưu được state',Object.keys(state.follows).length>=1);
    var contactBtn=document.querySelector('#sfFeed .sf-card [data-act="contact"]');
    if(contactBtn){ contactBtn.click(); }
    var note=document.querySelector('#sfFeed .sf-card .sf-contact-note');
    check('Xem liên hệ hiện ghi chú đăng nhập (không lộ SĐT)',!!note&&!note.hidden);
  }catch(e){ lines.push('FAIL — ngoại lệ: '+e.message); }
  var text='SELFTEST '+pass+'/'+total+'\n'+lines.join('\n');
  if(out){ out.hidden=false; out.textContent=text; }
  document.title='SELFTEST '+(pass===total?'PASS':'FAIL')+' '+pass+'/'+total;
  window.__socialFeed={state:state,count:items.length};
}
if(document.readyState==='loading'){
  document.addEventListener('DOMContentLoaded',init);
}else{
  init();
}
})();
