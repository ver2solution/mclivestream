/* v53 themes — skin trang tri theo su kien le hoi, tu dong bat/tat theo ngay.
   Yeu cau nguoi dung 06/11/2026: lam luon bo 3 skin Tet Nguyen Dan, Noel
   (Giang sinh), Tet Duong lich; het dip tu tro ve giao dien mac dinh.
   v53 them LOI CHUC MUNG theo tung theme (yeu cau nguoi dung 06/11/2026):
   thanh chuc mung nho gon (id themeGreeting) hien dau <main> — ngay duoi
   header, tren hero — chi khi theme dang bat; co nut dong, lua chon dong
   luu localStorage 'ver2theme-greeting' THEO MUA (het mua sau tu hien lai;
   Tet 2027 va Tet 2028 la 2 mua khac nhau). Loi chuc Tet dung cho giu
   {year} de thay bang ten nam am cua cua so dang bat (Dinh Mui 2027,
   Mau Than 2028) — khong ghi cung ten nam cho ca 2 nam.
   - Class theme (theme-noel / theme-tet-duong / theme-tet) dat len <html>
     boi applyTheme() luc nap trang; ngoai moi dip thi khong co class nao.
   - Noel + Tet Duong: lap hang nam theo ngay-thang. Tet Nguyen Dan: ngay am
     nen moi nam khac nhau — cua so theo nam cu the trong THEMES (them nam
     moi chi can them 1 muc windows, khong doi logic).
   - Ngay Tet da tra cuu (nguon: lichamviet.com, giaimaconso.com, lichviet.app,
     trimenh.com.vn — deu dung lich am Viet Nam UTC+7):
     + Mung 1 Tet Dinh Mui 2027 = Thu Bay 06/02/2027 (giao thua toi 05/02/2027,
       thang Chap Binh Ngo chi co 29 ngay, khong co 30 Tet).
     + Mung 1 Tet Mau Than 2028 = Thu Tu 26/01/2028 (giao thua toi 25/01/2028).
     Luu y: nam moi 2027 la Dinh Mui (De), Binh Ngo (Ngua) la nam ket thuc
     vao 29 Chap 05/02/2027 — khong phai ten nam moi.
   - Cua so Tet: 2 tuan truoc Mung 1 -> 1 tuan sau Mung 1.
   - Nut "Tat hieu ung": chi tat lop roi (them class theme-fx-off), van giu
     mau theme; lua chon luu localStorage 'ver2theme-fx' ('off'/'on').
   - getActiveTheme(date) thuan tuy (nhan Date, tra id theme hoac null) de
     test duoc bang Node; applyTheme(date?) tu chay luc nap trang. */
(function(){
'use strict';
var THEMES=[
  {id:'noel',name:'Giáng sinh',cls:'theme-noel',kind:'md',
   start:{m:12,d:1},end:{m:12,d:26},
   note:'01/12–26/12 hang nam',
   greeting:'🎄 Giáng sinh an lành! Ver2Solution chúc các chủ shop một mùa lễ ấm áp — livestream đông khách, chốt đơn liên tục.'},
  {id:'tet-duong',name:'Tết Dương lịch',cls:'theme-tet-duong',kind:'md',
   start:{m:12,d:28},end:{m:1,d:3},
   note:'28/12–03/01 hang nam (qua nam)',
   greeting:'🎉 Chúc mừng năm mới! Ver2Solution chúc các chủ shop năm mới khởi sắc — đơn hàng tăng trưởng, livestream bứt phá.'},
  {id:'tet',name:'Tết Nguyên Đán',cls:'theme-tet',kind:'years',
   /* {year} duoc thay bang ten nam am cua cua so dang bat (xem getGreeting). */
   greeting:'🧧 Chúc mừng năm mới {year}! Ver2Solution kính chúc các chủ shop năm mới an khang, phát tài — livestream rộn ràng, đơn về như ý.',
   windows:[
     {start:'2027-01-23',end:'2027-02-13',yearName:'Đinh Mùi',note:'Mùng 1 Tết Đinh Mùi 06/02/2027'},
     {start:'2028-01-12',end:'2028-02-02',yearName:'Mậu Thân',note:'Mùng 1 Tết Mậu Thân 26/01/2028'}
   ]}
];
function parseYMD(s){var p=s.split('-');return new Date(+p[0],+p[1]-1,+p[2]);}
function dayNum(d){return d.getFullYear()*10000+(d.getMonth()+1)*100+d.getDate();}
function inMdRange(d,t){
  var md=(d.getMonth()+1)*100+d.getDate();
  var s=t.start.m*100+t.start.d, e=t.end.m*100+t.end.d;
  if(s<=e) return md>=s && md<=e;
  return md>=s || md<=e; /* cua so qua nam, vd 28/12–03/01 */
}
function inYearWindows(d,t){
  var n=dayNum(d);
  for(var i=0;i<t.windows.length;i++){
    if(n>=dayNum(parseYMD(t.windows[i].start)) && n<=dayNum(parseYMD(t.windows[i].end))) return true;
  }
  return false;
}
function getActiveTheme(date){
  var d=(date instanceof Date)?date:new Date(date);
  if(isNaN(d.getTime())) return null;
  for(var i=0;i<THEMES.length;i++){
    var t=THEMES[i];
    if(t.kind==='md' ? inMdRange(d,t) : inYearWindows(d,t)) return t.id;
  }
  return null;
}
function themeById(id){for(var i=0;i<THEMES.length;i++) if(THEMES[i].id===id) return THEMES[i]; return null;}
/* Loi chuc mung (v53): getGreeting(date) thuan tuy — tra loi chuc cua theme
   dang bat vao ngay do (Tet thay {year} bang ten nam am cua cua so dang
   bat), hoac null khi khong co theme. seasonKey(date) tra khoa dinh danh
   mua le dang bat (vd 'noel:2026-12-1', 'tet-duong:2026-12-28',
   'tet:2027-01-23') de luu lua chon dong thanh chuc: cung 1 mua thi dong
   roi khong hien lai, mua sau (ke ca Tet Duong qua nam moi hay Tet nam
   sau) tu hien lai. */
function activeWindow(d,t){
  var n=dayNum(d);
  for(var i=0;i<t.windows.length;i++){
    if(n>=dayNum(parseYMD(t.windows[i].start)) && n<=dayNum(parseYMD(t.windows[i].end))) return t.windows[i];
  }
  return null;
}
function getGreeting(date){
  var d=(date instanceof Date)?date:new Date(date);
  if(isNaN(d.getTime())) return null;
  var id=getActiveTheme(d);
  if(!id) return null;
  var t=themeById(id);
  if(!t || !t.greeting) return null;
  if(t.kind==='years'){
    var w=activeWindow(d,t);
    return t.greeting.replace('{year}', w && w.yearName ? w.yearName : '');
  }
  return t.greeting;
}
function seasonKey(date){
  var d=(date instanceof Date)?date:new Date(date);
  if(isNaN(d.getTime())) return null;
  var id=getActiveTheme(d);
  if(!id) return null;
  var t=themeById(id);
  if(t.kind==='years'){
    var w=activeWindow(d,t);
    return w ? id+':'+w.start : null;
  }
  /* md: khoa = ngay bat dau cua mua hien tai. Cua so qua nam (28/12–03/01):
     ngay trong thang 1 thuoc ve mua bat dau tu thang 12 nam truoc. */
  var wrap=t.start.m*100+t.start.d > t.end.m*100+t.end.d;
  var md=(d.getMonth()+1)*100+d.getDate();
  var y=d.getFullYear();
  if(wrap && md < t.start.m*100+t.start.d) y=y-1;
  return id+':'+y+'-'+t.start.m+'-'+t.start.d;
}
var GREET_KEY='ver2theme-greeting'; /* gia tri = seasonKey cua mua da dong */
var activeGreetKey=null;
function greetDismissed(key){
  try{return !!(key && typeof localStorage!=='undefined' && localStorage.getItem(GREET_KEY)===key);}catch(e){return false;}
}
function removeGreeting(doc){
  var old=doc.getElementById('themeGreeting');
  if(old && old.remove) old.remove();
}
function ensureGreeting(doc,id,date){
  removeGreeting(doc);
  activeGreetKey=null;
  if(!id) return null;
  var d=(date instanceof Date)?date:new Date(date);
  var text=getGreeting(d);
  if(!text) return null;
  var key=seasonKey(d);
  if(greetDismissed(key)) return null;
  activeGreetKey=key;
  var bar=doc.createElement('div');
  bar.id='themeGreeting';
  bar.className='theme-greeting';
  bar.setAttribute('role','status');
  var span=doc.createElement('span');
  span.textContent=text;
  bar.appendChild(span);
  var btn=doc.createElement('button');
  btn.type='button';
  btn.setAttribute('aria-label','Đóng lời chúc');
  btn.textContent='✕';
  btn.onclick=function(){
    try{if(typeof localStorage!=='undefined' && activeGreetKey) localStorage.setItem(GREET_KEY,activeGreetKey);}catch(e){}
    activeGreetKey=null;
    removeGreeting(doc);
  };
  bar.appendChild(btn);
  /* Dat dau <main> (ngay duoi header, tren hero) — moi trang deu co <main>;
     neu khong co thi roi xuong cuoi body (khong vo trang). */
  var main=(doc.querySelector && doc.querySelector('main')) || null;
  if(main && main.insertBefore) main.insertBefore(bar, main.firstChild || null);
  else if(doc.body && doc.body.appendChild) doc.body.appendChild(bar);
  return bar;
}
var FX_KEY='ver2theme-fx'; /* 'off' = tat hieu ung roi; 'on' hoac chua co = bat */
function fxOff(){
  try{return (typeof localStorage!=='undefined' && localStorage.getItem(FX_KEY)==='off');}catch(e){return false;}
}
function setFx(off){
  try{if(typeof localStorage!=='undefined') localStorage.setItem(FX_KEY,off?'off':'on');}catch(e){}
  /* Chi doi lop hieu ung + chu nut, khong danh gia lai ngay (nut chi bam
     duoc khi dang co theme; ngay van do applyTheme() quyet dinh luc nap). */
  if(typeof document==='undefined' || !activeId) return;
  var root=document.documentElement;
  if(fxOff()) root.classList.add('theme-fx-off'); else root.classList.remove('theme-fx-off');
  var btn=document.getElementById('themeFxToggle');
  if(btn) btn.textContent=fxOff()?'Bật hiệu ứng':'Tắt hiệu ứng';
}
var activeId=null;
function ensureFxToggle(doc){
  var btn=doc.getElementById('themeFxToggle');
  if(!btn){
    btn=doc.createElement('button');
    btn.id='themeFxToggle';
    btn.className='theme-fx-toggle';
    btn.type='button';
    if(doc.body && doc.body.appendChild) doc.body.appendChild(btn);
  }
  btn.textContent=fxOff()?'Bật hiệu ứng':'Tắt hiệu ứng';
  btn.onclick=function(){setFx(!fxOff());};
  return btn;
}
function applyTheme(date){
  if(typeof document==='undefined') return null;
  var id=getActiveTheme(date?date:new Date());
  activeId=id;
  var root=document.documentElement;
  for(var i=0;i<THEMES.length;i++) root.classList.remove(THEMES[i].cls);
  root.classList.remove('theme-fx-off');
  if(!id){
    var old=document.getElementById('themeFxToggle');
    if(old && old.remove) old.remove();
    removeGreeting(document);
    return null;
  }
  root.classList.add(themeById(id).cls);
  if(fxOff()) root.classList.add('theme-fx-off');
  ensureFxToggle(document);
  ensureGreeting(document,id,date);
  return id;
}
/* Tu chay luc nap trang (script dat cuoi <body>, truoc js/app.js). */
try{applyTheme();}catch(e){}
var api={THEMES:THEMES,getActiveTheme:getActiveTheme,applyTheme:applyTheme,themeById:themeById,FX_KEY:FX_KEY,getGreeting:getGreeting,seasonKey:seasonKey,GREET_KEY:GREET_KEY};
if(typeof window!=='undefined') window.Ver2Themes=api;
if(typeof module!=='undefined' && module.exports) module.exports=api;
})();
