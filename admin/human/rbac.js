/* admin/human/rbac.js — Human Admin MVP shell (21/11/2026, nhánh feat/human-admin-shell).
   Mô hình phân quyền Owner / Quản lý / Nhân viên + DỮ LIỆU MẪU (ghi rõ là mẫu).
   KHÔNG đọc Supabase, KHÔNG dùng chung code với Admin AI (quan-tri.html).
   Phân quyền server-side + MFA Owner là V5-02 (sau backup) — đây chỉ là shell kiểm thử.
   ?selftest=1 chạy kiểm thử nội bộ, ghi kết quả vào #ha-selftest + document.title. */
(function(){
'use strict';
var ROLES={
  owner:{label:'Owner',badge:'ha-badge-owner',desc:'Toàn quyền: cấp/thu hồi quyền, cấu hình hệ thống, xem mọi nhật ký.'},
  manager:{label:'Quản lý',badge:'ha-badge-manager',desc:'Duyệt hồ sơ/tin, quản lý người dùng, xem nhật ký. Không cấp quyền.'},
  staff:{label:'Nhân viên',badge:'ha-badge-staff',desc:'Xử lý hồ sơ/tin được giao, chat nội bộ, xem báo cáo. Không duyệt, không cấp quyền.'}
};
var PERMISSIONS=[
  {id:'duyet-ho-so',label:'Duyệt hồ sơ mẫu/shop',roles:['owner','manager']},
  {id:'duyet-tin',label:'Duyệt tin tuyển / lô',roles:['owner','manager']},
  {id:'quan-ly-user',label:'Quản lý tài khoản người dùng',roles:['owner','manager']},
  {id:'xem-audit',label:'Xem nhật ký thao tác',roles:['owner','manager']},
  {id:'chat-noi-bo',label:'Chat nội bộ Admin',roles:['owner','manager','staff']},
  {id:'xem-bao-cao',label:'Xem báo cáo / thống kê',roles:['owner','manager','staff']},
  {id:'cap-quyen',label:'Cấp / thu hồi quyền admin',roles:['owner']},
  {id:'sua-cau-hinh',label:'Sửa cấu hình hệ thống',roles:['owner']}
];
/* DỮ LIỆU MẪU — không phải hồ sơ/người dùng thật. */
var SAMPLE_QUEUE=[
  {id:'mau-m01',type:'Mẫu',name:'Mẫu thử 01',place:'Hà Nội',date:'21/11/2026',status:'Chờ duyệt'},
  {id:'shop-m01',type:'Shop',name:'Shop thử 01',place:'TP. Hồ Chí Minh',date:'21/11/2026',status:'Chờ duyệt'},
  {id:'tin-m01',type:'Tin tuyển',name:'Tin tuyển thử 01 — MC thời trang',place:'Hà Nội',date:'21/11/2026',status:'Chờ duyệt'},
  {id:'mau-m02',type:'Mẫu',name:'Mẫu thử 02',place:'Đà Nẵng',date:'20/11/2026',status:'Chờ duyệt'},
  {id:'lot-m01',type:'Lô xả kho',name:'Lô thử 01 — quần áo',place:'TP. Hồ Chí Minh',date:'20/11/2026',status:'Chờ duyệt'}
];
var SAMPLE_USERS=[
  {id:'user-m01',name:'Người dùng mẫu 01',role:'member',joined:'20/11/2026',status:'Hoạt động'},
  {id:'user-m02',name:'Người dùng mẫu 02',role:'member',joined:'20/11/2026',status:'Hoạt động'},
  {id:'user-m03',name:'Người dùng mẫu 03',role:'member',joined:'19/11/2026',status:'Chờ xác minh'},
  {id:'user-m04',name:'Người dùng mẫu 04',role:'member',joined:'19/11/2026',status:'Hoạt động'},
  {id:'user-m05',name:'Người dùng mẫu 05',role:'member',joined:'18/11/2026',status:'Tạm khóa'}
];
var SAMPLE_AUDIT=[
  {time:'21/11/2026 16:40',actor:'owner-mau',action:'Duyệt hồ sơ mẫu thử 01',result:'Thành công'},
  {time:'21/11/2026 16:12',actor:'manager-mau',action:'Duyệt tin tuyển thử 01',result:'Thành công'},
  {time:'21/11/2026 15:48',actor:'owner-mau',action:'Cấp quyền Quản lý cho manager-mau',result:'Thành công'},
  {time:'21/11/2026 15:20',actor:'staff-mau',action:'Xem hồ sơ mẫu thử 02',result:'Thành công'},
  {time:'21/11/2026 14:55',actor:'manager-mau',action:'Từ chối lô thử 01 (thiếu ảnh)',result:'Thành công'}
];
function esc(s){ return String(s==null?'':s).replace(/[&<>"']/g,function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); }
function can(role,action){
  var p=PERMISSIONS.find(function(x){ return x.id===action; });
  return !!p && p.roles.indexOf(role)!==-1;
}
function currentRole(){
  var m=/[?&]role=(owner|manager|staff)/.exec(window.location.search);
  if(m) return m[1];
  var sel=document.getElementById('haRole');
  return sel? sel.value : 'owner';
}
function renderMatrix(){
  var el=document.getElementById('haMatrix'); if(!el) return;
  var h='<table class="ha-table"><thead><tr><th>Hành động</th><th>Owner</th><th>Quản lý</th><th>Nhân viên</th></tr></thead><tbody>';
  PERMISSIONS.forEach(function(p){
    h+='<tr><td>'+esc(p.label)+'</td>';
    ['owner','manager','staff'].forEach(function(r){
      var ok=p.roles.indexOf(r)!==-1;
      h+='<td class="'+(ok?'ha-yes':'ha-no')+'">'+(ok?'✓':'—')+'</td>';
    });
    h+='</tr>';
  });
  el.innerHTML=h+'</tbody></table>';
}
function renderQueue(){
  var el=document.getElementById('haQueue'); if(!el) return;
  var role=currentRole();
  var approve=can(role,'duyet-ho-so');
  var h='<table class="ha-table"><thead><tr><th>Loại</th><th>Tên</th><th>Khu vực</th><th>Ngày gửi</th><th>Trạng thái</th><th></th></tr></thead><tbody>';
  SAMPLE_QUEUE.forEach(function(q){
    h+='<tr><td>'+esc(q.type)+'</td><td>'+esc(q.name)+'</td><td>'+esc(q.place)+'</td><td>'+esc(q.date)+'</td><td>'+esc(q.status)+'</td>';
    h+='<td><button class="ha-btn ha-btn-primary" type="button" data-ha-act="approve" data-ha-id="'+esc(q.id)+'"'+(approve?'':' disabled')+'>Duyệt</button> ';
    h+='<button class="ha-btn" type="button" data-ha-act="reject" data-ha-id="'+esc(q.id)+'"'+(approve?'':' disabled')+'>Từ chối</button></td></tr>';
  });
  el.innerHTML=h+'</tbody></table><p class="ha-empty">Dữ liệu mẫu — nút Duyệt/Từ chối chỉ ghi thao tác mẫu, chưa gửi server.</p>';
}
function renderUsers(){
  var el=document.getElementById('haUsers'); if(!el) return;
  var h='<table class="ha-table"><thead><tr><th>Tên</th><th>Vai trò</th><th>Ngày tham gia</th><th>Trạng thái</th></tr></thead><tbody>';
  SAMPLE_USERS.forEach(function(u){
    h+='<tr><td>'+esc(u.name)+'</td><td>'+esc(u.role)+'</td><td>'+esc(u.joined)+'</td><td>'+esc(u.status)+'</td></tr>';
  });
  el.innerHTML=h+'</tbody></table>';
}
function renderAudit(){
  var el=document.getElementById('haAudit'); if(!el) return;
  var h='<table class="ha-table"><thead><tr><th>Thời gian</th><th>Người thực hiện</th><th>Thao tác</th><th>Kết quả</th></tr></thead><tbody>';
  SAMPLE_AUDIT.forEach(function(a){
    h+='<tr><td>'+esc(a.time)+'</td><td>'+esc(a.actor)+'</td><td>'+esc(a.action)+'</td><td>'+esc(a.result)+'</td></tr>';
  });
  el.innerHTML=h+'</tbody></table>';
}
function renderRole(){
  var role=currentRole();
  var sel=document.getElementById('haRole');
  if(sel) sel.value=role;
  var badge=document.getElementById('haRoleBadge');
  if(badge){ badge.textContent=ROLES[role].label; badge.className='ha-badge '+ROLES[role].badge; }
  var desc=document.getElementById('haRoleDesc');
  if(desc) desc.textContent=ROLES[role].desc;
  var ownerOnly=document.querySelectorAll('[data-ha-owner-only]');
  ownerOnly.forEach(function(el){ el.hidden=(role!=='owner'); });
}
function toast(msg){
  var el=document.getElementById('haToast');
  if(el) el.textContent=msg;
}
function init(){
  renderMatrix(); renderQueue(); renderUsers(); renderAudit(); renderRole();
  var sel=document.getElementById('haRole');
  if(sel) sel.addEventListener('change',function(){ renderRole(); renderQueue(); toast('Đã chuyển vai trò demo: '+ROLES[currentRole()].label+'.'); });
  document.addEventListener('click',function(ev){
    var b=ev.target.closest('[data-ha-act]');
    if(!b) return;
    var id=b.getAttribute('data-ha-id');
    var act=b.getAttribute('data-ha-act');
    var q=SAMPLE_QUEUE.find(function(x){ return x.id===id; });
    if(q){
      q.status=(act==='approve')?'Đã duyệt (mẫu)':'Đã từ chối (mẫu)';
      SAMPLE_AUDIT.unshift({time:'21/11/2026 (mẫu)',actor:currentRole()+'-mau',action:(act==='approve'?'Duyệt ':'Từ chối ')+(q.type)+' '+q.name,result:'Đã ghi (mẫu)'});
      renderQueue(); renderAudit();
      toast('Đã ghi thao tác mẫu: '+(act==='approve'?'duyệt':'từ chối')+' '+q.name+' — chưa gửi server.');
    }
  });
  if(/[?&]selftest=1/.test(window.location.search)) runSelfTest();
}
function runSelfTest(){
  var out=document.getElementById('ha-selftest'); var lines=[]; var pass=0; var total=0;
  function check(n,ok){ total++; if(ok) pass++; lines.push((ok?'PASS':'FAIL')+' — '+n); }
  try{
    check('Owner được cấp quyền',can('owner','cap-quyen')===true);
    check('Nhân viên KHÔNG được cấp quyền',can('staff','cap-quyen')===false);
    check('Quản lý được duyệt hồ sơ',can('manager','duyet-ho-so')===true);
    check('Nhân viên KHÔNG được duyệt hồ sơ',can('staff','duyet-ho-so')===false);
    check('Mọi vai trò đều chat nội bộ',can('owner','chat-noi-bo')&&can('manager','chat-noi-bo')&&can('staff','chat-noi-bo'));
    /* Chỉ kiểm mục nào có trên trang hiện tại (trang Owner không có matrix/queue). */
    if(document.getElementById('haMatrix')) check('Bảng phân quyền render đủ 8 hành động',document.querySelectorAll('#haMatrix tbody tr').length===8);
    if(document.getElementById('haQueue')) check('Hàng đợi render đủ 5 mục mẫu',document.querySelectorAll('#haQueue tbody tr').length===5);
    if(document.getElementById('haAudit')) check('Nhật ký render đủ 5 dòng mẫu',document.querySelectorAll('#haAudit tbody tr').length>=5);
  }catch(e){ lines.push('FAIL — ngoại lệ: '+e.message); }
  var text='SELFTEST '+pass+'/'+total+'\n'+lines.join('\n');
  if(out){ out.hidden=false; out.textContent=text; }
  document.title='SELFTEST '+(pass===total?'PASS':'FAIL')+' '+pass+'/'+total;
}
window.HumanAdmin={ROLES:ROLES,PERMISSIONS:PERMISSIONS,can:can,SAMPLE_QUEUE:SAMPLE_QUEUE,SAMPLE_USERS:SAMPLE_USERS,SAMPLE_AUDIT:SAMPLE_AUDIT};
if(document.readyState==='loading'){ document.addEventListener('DOMContentLoaded',init); } else { init(); }
})();
