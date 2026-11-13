/* Test v199 — Đồng bộ quy trình hạng mục con: bấm hạng mục chỉ đổi bộ lọc,
   không trôi; chỉ khi chọn bộ lọc (Áp dụng) mới cuộn xuống kết quả
   (anh dặn lần 2 ngày 13/11/2026 — "click vào đó thì chỉ bộ lọc mới thay đổi,
   chọn bộ lọc mới trôi xuống kết quả cần tìm").
   - Cross-link giữa các trang: bỏ #hash (trình duyệt tự nhảy neo = trôi),
     dùng ?newobj=<key>; trang đích đọc ?newobj= rồi bấm nút switch tương ứng
     (setShopCat/setCat/setKiotCat) — KHÔNG cuộn.
   - Nút switch 3 mục mới bên Shop (event-mkt/logistics/agency-ads) bỏ
     display:none — bấm được ngay trên trang Shop, bộ lọc đổi theo.
   - Nút Áp dụng của mục con mới (trang Mẫu + trang Shop) sau khi apply thì
     cuộn tới section kết quả (trang Kiot đã làm đúng từ trước — onFilterChange).
   - Giữ nguyên: deep-link hash #lo-hang-xa-kho / #xuong-may-gia-cong ở trang
     Mẫu + nhảy tới thẻ #<id thẻ> v197 ở trang Kiot.
   Node only, no browser. Chạy: node tests/test-v199-newobj-filter-sync.mjs */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let pass = 0, fail = 0;
function t(name, cond, extra = '') {
  if (cond) { pass++; console.log('PASS v199:', name); }
  else { fail++; console.log('FAIL v199:', name, extra); }
}
const readPrep = (f) => fs.readFileSync(path.join(root, f), 'utf8');

const mau = readPrep('danh-sach-mau.html');
const shop = readPrep('danh-sach-shop.html');
const kiot = readPrep('thanh-ly-kiot.html');
const index = readPrep('index.html');
const app = readPrep('js/app.js');

/* 1. Cross-link dùng ?newobj=, không còn #hash tới mục mới. */
t('mau: 3 link sang Shop dùng ?newobj=', ['?newobj=logistics', '?newobj=event-mkt', '?newobj=agency-ads'].every(s => mau.includes('danh-sach-shop.html' + s)));
t('shop: 2 link sang Mau dùng ?newobj=', ['?newobj=class-live', '?newobj=class-makeup'].every(s => shop.includes('danh-sach-mau.html' + s)));
t('index: 5 link Xem tất cả dùng ?newobj=', ['danh-sach-mau.html?newobj=class-live', 'danh-sach-mau.html?newobj=class-makeup', 'danh-sach-shop.html?newobj=event-mkt', 'danh-sach-shop.html?newobj=logistics', 'thanh-ly-kiot.html?newobj=rentals'].every(s => index.includes(s)));
t('không còn link #hash tới mục mới (mau/shop/kiot/index)', !/href="[^"]*#(su-kien-marketing|logistics-trung-viet|agency-ads-livestream|lop-livestream-mc|lop-makeup|dich-vu-chuyen-nha|thiet-bi-phong-live|cho-thue-cua-hang-kho)"/.test(mau + shop + kiot + index));

/* 2. Nút switch 3 mục mới bên Shop hiện (không còn display:none). */
t('shop: nút event-mkt hiện', /data-uni-cat="event-mkt"[^>]*>/.test(shop) && !/data-uni-cat="event-mkt"[^>]*display:none/.test(shop));
t('shop: nút logistics hiện', /data-uni-cat="logistics"[^>]*>/.test(shop) && !/data-uni-cat="logistics"[^>]*display:none/.test(shop));
t('shop: nút agency-ads hiện', /data-uni-cat="agency-ads"[^>]*>/.test(shop) && !/data-uni-cat="agency-ads"[^>]*display:none/.test(shop));

/* 3. Script mở mục lúc tải trang đọc ?newobj= và KHÔNG cuộn (bỏ lệnh trôi). */
t('shop: landing script đọc ?newobj=', shop.includes("get('newobj')") && shop.includes("cat !== 'event-mkt'"));
t('mau: landing script đọc ?newobj=', mau.includes("get('newobj')") && mau.includes("ncat === 'class-live'"));
t('kiot: landing script đọc ?newobj=', kiot.includes("get('newobj')") && kiot.includes("cat === 'chuyen-nha'"));
t('3 trang: không còn lệnh cuộn "if(s) s.scrollIntoView();" ở script mở mục', !/if\(s\) s\.scrollIntoView\(\);/.test(mau + shop + kiot));

/* 4. Áp dụng lọc mục mới thì cuộn xuống kết quả (Mẫu + Shop; Kiot đã có). */
t('mau: apply mục mới cuộn tới section', /uniCount[\s\S]{0,600}scrollIntoView\(\{ behavior: 'smooth', block: 'start' \}\)/.test(app));
t('shop: apply mục mới cuộn tới section', /shopCount[\s\S]{0,600}scrollIntoView\(\{ behavior: 'smooth', block: 'start' \}\)/.test(app));
t('kiot: onFilterChange vẫn cuộn tới section (giữ nguyên)', /onFilterChange[\s\S]{0,500}s\.scrollIntoView\(\{ behavior: 'smooth', block: 'start' \}\)/.test(kiot));

/* 5. Hồi quy: giữ deep-link cũ không liên quan tới mục mới. */
t('mau: vẫn giữ hash #lo-hang-xa-kho / #xuong-may-gia-cong', mau.includes("'#lo-hang-xa-kho'") && mau.includes("'#xuong-may-gia-cong'"));
t('kiot: vẫn giữ nhảy tới thẻ #<id thẻ> v197', kiot.includes("v197") && kiot.includes("card.scrollIntoView()"));
t('shop: setShopCat vẫn mở rộng đúng mục được chọn', app.includes("cs.classList.remove('collapsed')"));
t('sw.js CACHE = v199-shell-1 (app.js đổi nên bump CACHE)', readPrep('sw.js').includes("const CACHE = 'v199-shell-1'"));

console.log(`\nv199: ${pass} PASS, ${fail} FAIL`);
process.exit(fail ? 1 : 0);
