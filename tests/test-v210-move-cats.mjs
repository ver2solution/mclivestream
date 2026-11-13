// test-v210-move-cats.mjs — v210: chuyen danh muc theo tieu de menu.
// Logistics/Su kien/Agency Ads -> section + nut that tren trang Shop
// (danh-sach-mau.html); Lop Livestream/Lop Makeup -> section + nut that tren
// trang Mau (danh-sach-shop.html). Bam nut mo section ngay tai cho: KHONG
// nhay trang, KHONG cuon (bo v202ScrollToNewObj ca 2 trang). Link "Xem tat
// ca" trang chu + bang link cron own-groups-13 doi theo.
// Chay: node tests/test-v210-move-cats.mjs (tu goc repo/staging).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const mau = fs.readFileSync(path.join(root, 'danh-sach-mau.html'), 'utf8');
const shop = fs.readFileSync(path.join(root, 'danh-sach-shop.html'), 'utf8');
const index = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const app = fs.readFileSync(path.join(root, 'js', 'app.js'), 'utf8');
const sw = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');
let pass = 0, fail = 0;
function check(name, ok) {
  if (ok) { pass++; console.log('PASS ' + name); }
  else { fail++; console.log('FAIL ' + name); }
}
function btn(html, cat) {
  const m = html.match(new RegExp('<button[^>]*data-uni-cat="' + cat + '"[^>]*>', ''));
  return m ? m[0] : null;
}
const visible = (tag) => tag && !/display:none/.test(tag);
function divById(html, id) {
  const i = html.indexOf('id="' + id + '"');
  if (i < 0) return '';
  const j = html.lastIndexOf('<div', i);
  const k = html.indexOf('</div>', i);
  return html.slice(j, k);
}
function firstSwitch(html) {
  const i = html.indexOf('<div class="uni-cat-switch" role="group" aria-label="Chọn loại hạng mục tìm kiếm">');
  if (i < 0) return '';
  return html.slice(i, html.indexOf('</div>', i));
}

// 1. Trang Shop (mau.html): switch chinh CHI 3 nut (model/lot/factory); 3 nut dich vu o hang rieng co nhan
const mauSwitch = firstSwitch(mau);
const mauRow = divById(mau, 'shopServicesSwitch');
check('mau: switch chinh co model/lot/factory', ['model', 'lot', 'factory'].every(c => mauSwitch.includes('data-uni-cat="' + c + '"')));
check('mau: switch chinh KHONG co logistics/event-mkt/agency-ads', ['logistics', 'event-mkt', 'agency-ads'].every(c => !mauSwitch.includes('data-uni-cat="' + c + '"')));
check('mau: nhan hang rieng "Dich vu cho shop:"', mau.includes('>Dịch vụ cho shop:</p>'));
check('mau: nut logistics hien o hang rieng (button)', visible(btn(mauRow, 'logistics')));
check('mau: nut event-mkt hien o hang rieng (button)', visible(btn(mauRow, 'event-mkt')));
check('mau: nut agency-ads hien o hang rieng (button)', visible(btn(mauRow, 'agency-ads')));
check('mau: khong con nut class-live', !btn(mau, 'class-live'));
check('mau: khong con nut class-makeup', !btn(mau, 'class-makeup'));
check('mau: khong con link <a> nhay sang shop', !/uni-cat-btn" href="danh-sach-shop\.html\?newobj=/.test(mau));
check('mau: khong con link <a> nao trong switch', !/<a class="uni-cat-btn"/.test(mau));

// 2. Trang Shop (mau.html): 3 section dich vu co, 2 section lop hoc het
check('mau: section su-kien-marketing co', mau.includes('id="su-kien-marketing"'));
check('mau: section logistics-trung-viet co', mau.includes('id="logistics-trung-viet"'));
check('mau: section agency-ads-livestream co', mau.includes('id="agency-ads-livestream"'));
check('mau: khong con section lop-livestream-mc', !mau.includes('id="lop-livestream-mc"'));
check('mau: khong con section lop-makeup', !mau.includes('id="lop-makeup"'));
// 3. Trang Shop (mau.html): loc co 2 o cua 3 muc shop, het o hoc phi
check('mau: loc co fShopPriceSort', mau.includes('id="fShopPriceSort"'));
check('mau: loc co fShopLogOpt', mau.includes('id="fShopLogOpt"'));
check('mau: loc het fUniClassSort', !mau.includes('id="fUniClassSort"'));

// 4. Trang Mau (shop.html): switch chinh CHI nut shop; 2 nut lop hoc o hang rieng co nhan
const shopSwitch = divById(shop, 'shopFilterSwitch');
const shopRow = divById(shop, 'modelClassesSwitch');
check('shop: switch chinh co nut shop', shopSwitch.includes('data-uni-cat="shop"'));
check('shop: switch chinh KHONG co class-live/class-makeup', !shopSwitch.includes('data-uni-cat="class-live"') && !shopSwitch.includes('data-uni-cat="class-makeup"'));
check('shop: nhan hang rieng "Lop hoc cho mau:"', shop.includes('>Lớp học cho mẫu:</p>'));
check('shop: nut class-live hien o hang rieng (button)', visible(btn(shopRow, 'class-live')));
check('shop: nut class-makeup hien o hang rieng (button)', visible(btn(shopRow, 'class-makeup')));
check('shop: khong con nut event-mkt', !btn(shop, 'event-mkt'));
check('shop: khong con nut logistics', !btn(shop, 'logistics'));
check('shop: khong con nut agency-ads', !btn(shop, 'agency-ads'));
check('shop: khong con link <a> nhay sang mau', !/uni-cat-btn" href="danh-sach-mau\.html\?newobj=/.test(shop));
check('shop: khong con link <a> nao trong switch', !/<a class="uni-cat-btn"/.test(shop));

// 5. Trang Mau (shop.html): 2 section lop hoc co (rows-1), 3 section dich vu het
check('shop: section lop-livestream-mc co', shop.includes('id="lop-livestream-mc"'));
check('shop: section lop-makeup co', shop.includes('id="lop-makeup"'));
check('shop: lop hoc giu class rows-1', /id="lop-livestream-mc"[^>]*rows-1|rows-1" id="lop-livestream-mc"/.test(shop) || (shop.includes('id="lop-livestream-mc"') && /class="lot-section filter-section collapsed rows-1" id="lop-livestream-mc"/.test(shop)));
check('shop: khong con section su-kien-marketing', !shop.includes('id="su-kien-marketing"'));
check('shop: khong con section logistics-trung-viet', !shop.includes('id="logistics-trung-viet"'));
check('shop: khong con section agency-ads-livestream', !shop.includes('id="agency-ads-livestream"'));
// 6. Trang Mau (shop.html): loc co o hoc phi, het 2 o cua 3 muc shop
check('shop: loc co fUniClassSort', shop.includes('id="fUniClassSort"'));
check('shop: loc het fShopPriceSort', !shop.includes('id="fShopPriceSort"'));
check('shop: loc het fShopLogOpt', !shop.includes('id="fShopLogOpt"'));

// 7. Bo cuon v202 ca 2 trang (khong con ham, khong con loi goi)
check('mau: het ham v202ScrollToNewObj', !mau.includes('v202ScrollToNewObj'));
check('shop: het ham v202ScrollToNewObj', !shop.includes('v202ScrollToNewObj'));
check('mau: ?newobj= mo dung 3 muc shop', /ncat === 'logistics'/.test(mau) && /ncat === 'event-mkt'/.test(mau) && /ncat === 'agency-ads'/.test(mau));
check('shop: ?newobj= mo dung 2 muc lop hoc', /cat !== 'class-live'/.test(shop) && /cat !== 'class-makeup'/.test(shop));

// 8. Trang chu: 5 link Xem tat ca doi dich dung
check('index: lop live -> shop page', index.includes('href="danh-sach-shop.html?newobj=class-live"'));
check('index: lop makeup -> shop page', index.includes('href="danh-sach-shop.html?newobj=class-makeup"'));
check('index: su kien -> mau page', index.includes('href="danh-sach-mau.html?newobj=event-mkt"'));
check('index: logistics -> mau page', index.includes('href="danh-sach-mau.html?newobj=logistics"'));
check('index: agency -> mau page', index.includes('href="danh-sach-mau.html?newobj=agency-ads"'));
check('index: kiot khong doi (rentals)', index.includes('href="thanh-ly-kiot.html?newobj=rentals"'));
check('index: kiot khong doi (chuyen-nha)', index.includes('href="thanh-ly-kiot.html?newobj=chuyen-nha"'));
check('index: kiot khong doi (thiet-bi-live)', index.includes('href="thanh-ly-kiot.html?newobj=thiet-bi-live"'));

// 9. app.js: tinh theo trang + khoa/mo truong theo muc moi
check('app: tinh PROV theo trang', app.includes("var PROV = document.getElementById('fUniProv') ? 'fUniProv' : (document.getElementById('fShProv') ? 'fShProv' : 'kiotProv');"));
check('app: initNewObjSection dung PROV', (app.match(/provId: PROV/g) || []).length === 8);
check('app: UNI_LOCKABLE co logistics', app.includes("'logistics': ['fShopPriceSort', 'fShopLogOpt']"));
check('app: UNI_LOCKABLE co event-mkt', app.includes("'event-mkt': ['fShopPriceSort']"));
check('app: UNI_LOCKABLE co agency-ads', app.includes("'agency-ads': ['fShopPriceSort']"));
check('app: UNI_LOCKABLE het class-live', !/'class-live': \['fUniClassSort'\]/.test(app));
check('app: UNI_LOCKABLE_ALL co fShopPriceSort/fShopLogOpt', app.includes("'fShopPriceSort','fShopLogOpt'"));
check('app: setShopCat co khoi fUniClassSort', app.includes("var cs = document.getElementById('fUniClassSort');"));
check('app: setShopCat het khoi fShopLogOpt', !app.includes("var lo = document.getElementById('fShopLogOpt');"));
check('app: setShopCat bind ca 2 hang nut', app.includes("document.querySelectorAll('#shopFilterSwitch .uni-cat-btn, #modelClassesSwitch .uni-cat-btn')"));

// 10. sw.js: bump CACHE
check('sw: CACHE = v210-shell-1', sw.includes("const CACHE = 'v210-shell-1';"));
check('sw: het CACHE v207-shell-1', !sw.includes("v207-shell-1"));

console.log(`\n${pass} PASS, ${fail} FAIL`);
process.exit(fail ? 1 : 0);
