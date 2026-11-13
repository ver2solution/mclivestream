// test-v204-switch-hidden.mjs — v204: an 2 nut Lop (trang Mau) + 3 nut dich vu
// (trang Shop) theo quyet cua anh 12:35 (v194). Nut an chi de script mo theo
// ?newobj= tu trang kia; section + deep-link + cross-link + nut cuon v202
// phai con nguyen. Chay: node tests/test-v204-switch-hidden.mjs (tu goc repo).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const mau = fs.readFileSync(path.join(root, 'danh-sach-mau.html'), 'utf8');
const shop = fs.readFileSync(path.join(root, 'danh-sach-shop.html'), 'utf8');
let pass = 0, fail = 0;
function check(name, ok) {
  if (ok) { pass++; console.log('PASS ' + name); }
  else { fail++; console.log('FAIL ' + name); }
}
function btn(html, cat) {
  const m = html.match(new RegExp('<button[^>]*data-uni-cat="' + cat + '"[^>]*>', ''));
  return m ? m[0] : null;
}
const hidden = (tag) => tag && /style="display:none"/.test(tag);
const visible = (tag) => tag && !/display:none/.test(tag);

// 1. Trang Mau: 2 nut Lop AN
check('mau: nut class-live an (display:none)', hidden(btn(mau, 'class-live')));
check('mau: nut class-makeup an (display:none)', hidden(btn(mau, 'class-makeup')));
// 2. Trang Mau: 3 nut cua Shop HIEN
check('mau: nut model hien', visible(btn(mau, 'model')));
check('mau: nut lot hien', visible(btn(mau, 'lot')));
check('mau: nut factory hien', visible(btn(mau, 'factory')));
// 3. Trang Mau: 3 cross-link sang Shop con nguyen
check('mau: cross-link logistics sang shop', mau.includes('href="danh-sach-shop.html?newobj=logistics"'));
check('mau: cross-link event-mkt sang shop', mau.includes('href="danh-sach-shop.html?newobj=event-mkt"'));
check('mau: cross-link agency-ads sang shop', mau.includes('href="danh-sach-shop.html?newobj=agency-ads"'));
// 4. Trang Shop: 3 nut dich vu AN
check('shop: nut event-mkt an (display:none)', hidden(btn(shop, 'event-mkt')));
check('shop: nut logistics an (display:none)', hidden(btn(shop, 'logistics')));
check('shop: nut agency-ads an (display:none)', hidden(btn(shop, 'agency-ads')));
// 5. Trang Shop: nut shop HIEN + 2 cross-link Lop sang Mau con nguyen
check('shop: nut shop hien', visible(btn(shop, 'shop')));
check('shop: cross-link class-live sang mau', shop.includes('href="danh-sach-mau.html?newobj=class-live"'));
check('shop: cross-link class-makeup sang mau', shop.includes('href="danh-sach-mau.html?newobj=class-makeup"'));
// 6. Section van con tren trang (mo duoc bang ?newobj=)
check('mau: section lop-livestream-mc con', mau.includes('id="lop-livestream-mc"'));
check('mau: section lop-makeup con', mau.includes('id="lop-makeup"'));
check('shop: section su-kien-marketing con', shop.includes('id="su-kien-marketing"'));
check('shop: section logistics-trung-viet con', shop.includes('id="logistics-trung-viet"'));
check('shop: section agency-ads-livestream con', shop.includes('id="agency-ads-livestream"'));
// 7. Ham cuon v202 con nguyen ca 2 trang (deep-link van cuon toi muc)
check('mau: v202ScrollToNewObj con', mau.includes('function v202ScrollToNewObj'));
check('shop: v202ScrollToNewObj con', shop.includes('function v202ScrollToNewObj'));
// 8. Menu/nav khong doi (7 muc v194)
check('mau: nav con "Dành cho Mẫu"', mau.includes('Dành cho Mẫu'));
check('shop: nav con "Dành cho Shop"', shop.includes('Dành cho Shop'));
check('mau: nav con "Đăng ký"', mau.includes('Đăng ký'));
check('shop: nav con "Đăng ký"', shop.includes('Đăng ký'));
// 9. Khong nut nao khac bi an them trong switch (mau: dung 2 nut an; shop: dung 3 nut an)
const hiddenInSwitch = (html) => {
  const sw = html.match(/<div class="uni-cat-switch"[\s\S]*?<\/div>/);
  return sw ? (sw[0].match(/style="display:none"/g) || []).length : -1;
};
check('mau: switch co dung 2 nut an', hiddenInSwitch(mau) === 2);
check('shop: switch co dung 3 nut an', hiddenInSwitch(shop) === 3);

console.log(pass + ' PASS / ' + fail + ' FAIL');
process.exit(fail ? 1 : 0);
