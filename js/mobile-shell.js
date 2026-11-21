/* mobile-shell.js — S1 (21/11/2026, nhánh feat/fwa-social-mobile-v1).
   Đánh dấu tab đang mở trên shell mobile 5 tab theo trang hiện tại.
   Không badge số: S1 chưa có nguồn số chưa đọc thật nên không hiện badge giả.
   Không tự cuộn (v213): các tab là link thuần, file này không cuộn trang. */
(function(){
  'use strict';
  function markActive(){
    var nav=document.querySelector('.mobile-shell');
    if(!nav) return;
    var path=window.location.pathname.replace(/\/+$/,'')||'/';
    var map={
      'feed':['/','/index.html','/cong-dong/bang-tin.html'],
      'jobs':['/danh-sach-shop.html'],
      'post':['/danh-sach-mau.html'],
      'chat':['/cong-dong/chat.html','/cong-dong/chat'],
      'me':['/trang-cua-toi.html']
    };
    var active=null;
    Object.keys(map).forEach(function(key){
      if(map[key].indexOf(path)!==-1) active=key;
    });
    nav.querySelectorAll('.ms-tab').forEach(function(tab){
      var on=tab.getAttribute('data-ms-tab')===active;
      tab.classList.toggle('is-active',on);
      if(on){ tab.setAttribute('aria-current','page'); }
      else{ tab.removeAttribute('aria-current'); }
    });
  }
  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',markActive);
  }else{
    markActive();
  }
})();
