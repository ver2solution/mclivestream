/* Test v202 — fix bo loc hang muc moi (anh bao 18:01 ngay 13/11/2026).
   Loi goc (tai hien bang Playwright headless, filter-result2.json):
   - 2 nut Lop Livestream / Lop Makeup tren trang Mau con display:none.
   - Sang trang bang ?newobj= chi chon muc ma KHONG cuon — muc nam 2299-3789px
     duoi viewport, nguoi dung chi thay danh sach chinh nen tuong muc bi troi.
   Fix (HTML-only, 2 file):
   - danh-sach-mau.html: bo display:none o 2 nut Lop; them v202ScrollToNewObj
     cuon xuong dung muc khi ?newobj=class-live/class-makeup.
   - danh-sach-shop.html: them v202ScrollToNewObj cuon xuong dung muc khi
     ?newobj=event-mkt/logistics/agency-ads.
   Quy tac "bam nut tren trang khong cuon, chi Ap dung moi cuon" VAN GIU —
   chi truong hop sang trang bang link ?newobj= moi cuon (giong deep-link #hash).
   Chay: node tests/test-v202-filter-newobj.mjs (exit 0 = PASS het).
   Trong workflow deploy: chay TRUC TIEP (dua vao exit code), KHONG grep chuoi. */
import fs from 'node:fs';

let pass = 0, fail = 0;
function check(name, ok, extra) {
  if (ok) { pass++; console.log('PASS: ' + name); }
  else { fail++; console.log('FAIL: ' + name + (extra ? ' — ' + extra : '')); }
}

const mau = fs.readFileSync('danh-sach-mau.html', 'utf8');
const shop = fs.readFileSync('danh-sach-shop.html', 'utf8');
const appJs = fs.existsSync('js/app.js') ? fs.readFileSync('js/app.js', 'utf8') : '';

// 1. Nut Lop tren trang Mau: co du, KHONG con display:none.
check('mau: nut class-live co mat', mau.includes('data-uni-cat="class-live"'));
check('mau: nut class-makeup co mat', mau.includes('data-uni-cat="class-makeup"'));
check('mau: nut class-live KHONG display:none',
  !/data-uni-cat="class-live"[^>]*display:\s*none/.test(mau));
check('mau: nut class-makeup KHONG display:none',
  !/data-uni-cat="class-makeup"[^>]*display:\s*none/.test(mau));
// 2. Khong dong cham hop auth (van an khi chua dang nhap).
check('mau: #shopAuthUserBox van display:none',
  /id="shopAuthUserBox" style="display:none"/.test(mau));
check('shop: #mauAuthUserBox van display:none',
  /id="mauAuthUserBox" style="display:none"/.test(shop));
// 3. Nut Shop ben kia khong bi an them.
check('shop: nut event-mkt KHONG display:none',
  !/data-uni-cat="event-mkt"[^>]*display:\s*none/.test(shop));
check('shop: nut logistics KHONG display:none',
  !/data-uni-cat="logistics"[^>]*display:\s*none/.test(shop));
check('shop: nut agency-ads KHONG display:none',
  !/data-uni-cat="agency-ads"[^>]*display:\s*none/.test(shop));
// 4. Ham cuon v202 co o ca 2 trang + guard khong giat khi da cuon.
for (const [name, html] of [['mau', mau], ['shop', shop]]) {
  check(name + ': dinh nghia v202ScrollToNewObj',
    html.includes('function v202ScrollToNewObj(sectionId)'));
  check(name + ': guard scrollY > 10',
    html.includes('if(window.scrollY > 10) return;'));
  check(name + ': cuon instant (behavior auto)',
    html.includes("s.scrollIntoView({ behavior: 'auto', block: 'start' })"));
  check(name + ': goi v202ScrollToNewObj',
    html.includes('v202ScrollToNewObj('));
}
// 5. Map muc dung: mau class-live->lop-livestream-mc, class-makeup->lop-makeup.
check('mau: class-live -> lop-livestream-mc',
  mau.includes("ncat === 'class-live' ? 'lop-livestream-mc' : 'lop-makeup'"));
check('shop: map du 3 muc',
  shop.includes("'event-mkt': 'su-kien-marketing'") &&
  shop.includes("'logistics': 'logistics-trung-viet'") &&
  shop.includes("'agency-ads': 'agency-ads-livestream'"));
// 6. Cross-link <a> giua 2 trang con nguyen (khong doi href).
check('mau: link sang shop ?newobj=event-mkt',
  mau.includes('href="danh-sach-shop.html?newobj=event-mkt"'));
check('mau: link sang shop ?newobj=logistics',
  mau.includes('href="danh-sach-shop.html?newobj=logistics"'));
check('mau: link sang shop ?newobj=agency-ads',
  mau.includes('href="danh-sach-shop.html?newobj=agency-ads"'));
check('shop: link sang mau ?newobj=class-live',
  shop.includes('href="danh-sach-mau.html?newobj=class-live"'));
check('shop: link sang mau ?newobj=class-makeup',
  shop.includes('href="danh-sach-mau.html?newobj=class-makeup"'));
// 7. Section dich con ton tai o dung trang.
check('mau: co section lop-livestream-mc + lop-makeup',
  mau.includes('id="lop-livestream-mc"') && mau.includes('id="lop-makeup"'));
check('shop: co 3 section moi',
  shop.includes('id="su-kien-marketing"') &&
  shop.includes('id="logistics-trung-viet"') &&
  shop.includes('id="agency-ads-livestream"'));
// 8. HTML-only: khong doi js/app.js (fix nam trong inline script cua 2 trang).
check('js/app.js KHONG chua v202ScrollToNewObj',
  appJs === '' || !appJs.includes('v202ScrollToNewObj'));

console.log(`\n${pass} PASS / ${fail} FAIL`);
process.exit(fail ? 1 : 0);
