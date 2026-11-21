/* js/social-profile.js — User Social MVP (21/11/2026, nhánh feat/user-social-mvp).
   Hồ sơ nghề nghiệp bản xem trước trên trang Cá nhân (mục 5).
   Lưu localStorage v2s_social_profile_v1 — CHƯA đồng bộ tài khoản (đồng bộ ở S2, sau backup).
   Gợi ý theo quy tắc từ js/data.js công khai; không lộ liên hệ, không nhập SĐT/giấy tờ.
   ?selftest=1 chạy kiểm thử nội bộ, ghi kết quả vào #sp-selftest + document.title. */
(function(){
'use strict';
var PROFILE_KEY='v2s_social_profile_v1';
var STATE_KEY='v2s_social_v1';
var FIELD_IDS=['spOccupation','spSkills','spRegion','spLookingFor','spWorkHours','spIncomeMin','spIncomeMax','spInterests','spPortfolio'];
function $(id){ return document.getElementById(id); }
function esc(s){ return String(s==null?'':s).replace(/[&<>"']/g,function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); }
function loadProfile(){ try{ return JSON.parse(window.localStorage.getItem(PROFILE_KEY)||'{}'); }catch(e){ return {}; } }
function saveProfile(p){ try{ window.localStorage.setItem(PROFILE_KEY,JSON.stringify(p)); }catch(e){} }
function readForm(){
  var p={};
  FIELD_IDS.forEach(function(id){ var el=$(id); p[id]=el? String(el.value||'').trim() : ''; });
  return p;
}
function completion(p){
  var filled=FIELD_IDS.filter(function(id){ return p[id]; }).length;
  return Math.round(filled/FIELD_IDS.length*100);
}
function renderProgress(){
  var p=readForm();
  var pct=completion(p);
  var bar=$('spBar'), txt=$('spPct');
  if(bar) bar.style.width=pct+'%';
  if(txt) txt.textContent='Hoàn thiện '+pct+'% — '+(pct>=100?'đủ thông tin để nhận gợi ý.':'điền thêm để mở gợi ý phù hợp.');
}
function skillList(p){ return (p.spSkills||'').split(',').map(function(s){ return s.trim(); }).filter(Boolean); }
function renderSuggest(){
  var list=$('spSuggestList'); if(!list) return;
  var data=window.V20_DATA;
  var p=readForm();
  if(!data){ list.innerHTML='<p class="sf-card-meta">Đang tải dữ liệu gợi ý…</p>'; return; }
  var skills=skillList(p);
  var out=[];
  if(p.spLookingFor==='tim-viec'&&skills.length){
    (data.shops||[]).forEach(function(s){
      var hay=((s.product||'')+' '+(s.req||'')).toLowerCase();
      var hit=skills.filter(function(k){ return hay.indexOf(k.toLowerCase())!==-1; });
      if(hit.length) out.push({name:s.name,why:'Khớp kỹ năng: '+hit.join(', ')+' · '+(s.province||''),meta:'Tuyển mẫu · '+(s.product||'')+' · Lương: '+(s.salary||'Thỏa thuận')});
    });
  }else if(p.spLookingFor==='tuyen-mau'&&skills.length){
    (data.models||[]).forEach(function(m){
      var hay=((m.cat||'')+' '+(m.exp||'')).toLowerCase();
      var hit=skills.filter(function(k){ return hay.indexOf(k.toLowerCase())!==-1; });
      if(hit.length) out.push({name:m.name,why:'Khớp kỹ năng: '+hit.join(', ')+' · '+(m.province||''),meta:'Mẫu live · '+(m.cat||'')+' · '+(m.title||'')});
    });
  }
  if(!out.length){
    (data.shops||[]).slice(0,3).forEach(function(s){
      out.push({name:s.name,why:'Tin tuyển mới',meta:'Tuyển mẫu · '+(s.product||'')+' · '+(s.province||'')});
    });
  }
  out=out.slice(0,3);
  list.innerHTML='<p class="sf-card-meta">Gợi ý thử nghiệm — theo quy tắc khớp kỹ năng/khu vực, chưa phải xếp hạng.</p>'+out.map(function(o){
    return '<div class="sf-suggest-card"><strong>'+esc(o.name)+'</strong><p>'+esc(o.meta)+'</p><span class="sf-why">'+esc(o.why)+'</span></div>';
  }).join('');
}
function resolveName(key){
  var data=window.V20_DATA; if(!data) return null;
  var type=key.split(':')[0]; var id=key.slice(type.length+1);
  var coll={model:data.models,shop:data.shops,lot:data.lots}[type];
  if(coll){
    var f=coll.find(function(x){ return x.id===id; });
    if(f) return {name:f.name||f.title,type:type};
  }
  if(type==='article'){
    var a=(data.articles||[]).find(function(x){ return x.url===id; });
    if(a) return {name:a.title,type:type};
  }
  return null;
}
function renderSaved(){
  var list=$('spSavedList'); if(!list) return;
  var st={saves:{},follows:{}};
  try{ st=JSON.parse(window.localStorage.getItem(STATE_KEY)||'{}'); st.saves=st.saves||{}; st.follows=st.follows||{}; }catch(e){}
  var saved=Object.keys(st.saves).map(resolveName).filter(Boolean);
  var followed=Object.keys(st.follows).map(resolveName).filter(Boolean);
  var h='';
  h+='<p><strong>Đã lưu ('+saved.length+'):</strong> '+(saved.length? saved.map(function(x){ return esc(x.name); }).join(' · ') : 'chưa có — bấm Lưu trên Bảng tin.')+'</p>';
  h+='<p><strong>Đang theo dõi ('+followed.length+'):</strong> '+(followed.length? followed.map(function(x){ return esc(x.name); }).join(' · ') : 'chưa có — bấm Theo dõi trên Bảng tin.')+'</p>';
  list.innerHTML=h;
}
function init(){
  var form=$('spForm'); if(!form) return;
  var p=loadProfile();
  FIELD_IDS.forEach(function(id){ var el=$(id); if(el&&p[id]!=null) el.value=p[id]; });
  renderProgress(); renderSuggest(); renderSaved();
  var t=null;
  form.addEventListener('input',function(){
    saveProfile(readForm());
    renderProgress();
    if(t) clearTimeout(t);
    t=setTimeout(renderSuggest,400);
  });
  var saveBtn=$('spSave');
  if(saveBtn) saveBtn.addEventListener('click',function(){
    saveProfile(readForm());
    renderProgress(); renderSuggest(); renderSaved();
    var m=$('spMsg'); if(m) m.textContent='Đã lưu trên trình duyệt này (bản xem trước — sẽ đồng bộ tài khoản ở bản cập nhật hồ sơ S2).';
  });
  window.addEventListener('storage',function(ev){ if(ev.key===STATE_KEY) renderSaved(); });
  if(/[?&]selftest=1/.test(window.location.search)) runSelfTest();
}
function runSelfTest(){
  var out=$('sp-selftest'); var lines=[]; var pass=0; var total=0;
  function check(n,ok){ total++; if(ok) pass++; lines.push((ok?'PASS':'FAIL')+' — '+n); }
  try{
    var occ=$('spOccupation'), sk=$('spSkills'), rg=$('spRegion');
    if(occ){ occ.value='MC livestream'; occ.dispatchEvent(new Event('input',{bubbles:true})); }
    if(sk){ sk.value='thời trang'; sk.dispatchEvent(new Event('input',{bubbles:true})); }
    if(rg){ rg.value='Hà Nội'; rg.dispatchEvent(new Event('input',{bubbles:true})); }
    var pct=completion(readForm());
    check('điền 3 trường thì tiến độ > 0%',pct>0);
    check('gợi ý render được',($('spSuggestList')||{textContent:''}).textContent.length>10);
    check('mục đã lưu/theo dõi render được',($('spSavedList')||{textContent:''}).textContent.length>10);
  }catch(e){ lines.push('FAIL — ngoại lệ: '+e.message); }
  var text='SELFTEST '+pass+'/'+total+'\n'+lines.join('\n');
  if(out){ out.hidden=false; out.textContent=text; }
  document.title='SELFTEST '+(pass===total?'PASS':'FAIL')+' '+pass+'/'+total;
}
if(document.readyState==='loading'){ document.addEventListener('DOMContentLoaded',init); } else { init(); }
})();
