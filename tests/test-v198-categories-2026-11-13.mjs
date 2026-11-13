/* Test v198 — Kiot 2 hàng + chuyển "Cho thuê mặt bằng" sang Kiot +
   thêm "Agency Ads Livestream" bên Shop (anh giao 15:11 ngày 13/11/2026).
   - data.js: mảng agencyAds mới (ag-01 placeholder + ag-02..ag-11 thật).
   - app.js: NEWOBJ_TYPES.rentals.page -> thanh-ly-kiot.html; agencyAds mới;
     NEWOBJ_UNI_CATS.rentals.provId -> kiotProv; 'agency-ads' mới;
     initNewObjSection rentals dùng kiotProv/kiotSort; thêm init agencyAds;
     setShopCat: danh sách section cứng bỏ cho-thue, thêm agency-ads.
   - search.js: NEWOBJ_META 'thue-mb'.page -> thanh-ly-kiot.html;
     'agency-ads' mới ở TYPE_LABELS/TYPE_ORDER/NEWOBJ_META/NEWOBJ_DATA_MAP/count.
   - danh-sach-shop.html: hết cho-thue/rentals; section Agency Ads mới.
   - danh-sach-mau.html: XÓA nút link cho-thue khỏi switch bên Shop (v198b, lệnh anh 15:50) + link agency mới.
   - index.html: link home cho-thue -> thanh-ly-kiot.html.
   - thanh-ly-kiot.html: KIOT_MAX_ROWS 24->12; hết rows-1; section + nút
     Cho thuê mới; inline script (map/hash/reset/ternary) đủ rentals.
   Node only, no browser. Chạy: node tests/test-v198-categories-2026-11-13.mjs */
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let pass = 0, fail = 0;
function t(name, cond, extra = '') {
  if (cond) { pass++; console.log('PASS v198:', name); }
  else { fail++; console.log('FAIL v198:', name, extra); }
}
const readPrep = (f) => fs.readFileSync(path.join(root, f), 'utf8');

function mockEl() {
  return { innerHTML: '', textContent: '', style: {}, hidden: false, value: '',
    classList: { _s: new Set(), add(c) { this._s.add(c); }, remove(c) { this._s.delete(c); }, toggle(c) { this._s.has(c) ? this._s.delete(c) : this._s.add(c); }, contains(c) { return this._s.has(c); } },
    setAttribute() {}, getAttribute() { return null; }, appendChild() {}, addEventListener() {}, closest: () => null,
    scrollIntoView() { this._scrolled = (this._scrolled || 0) + 1; } };
}
const els = {};
function el(id) { if (!els[id]) els[id] = mockEl(); return els[id]; }
const loc = { hash: '', pathname: '/danh-sach-shop.html', search: '' };
const sb = {
  window: {}, module: { exports: {} }, console, URLSearchParams,
  location: loc,
  document: { getElementById: (id) => els[id] || null, addEventListener: () => {},
    querySelectorAll: () => [], querySelector: () => null },
};
vm.createContext(sb);
vm.runInContext(readPrep('js/data.js'), sb);
vm.runInContext(readPrep('js/app.js'), sb);
const D = sb.window.V20_DATA;
const V = sb.window.V20;
const appJs = readPrep('js/app.js');
const searchJs = readPrep('js/search.js');
const swJs = readPrep('sw.js');
const shopHtml = readPrep('danh-sach-shop.html');
const mauHtml = readPrep('danh-sach-mau.html');
const indexHtml = readPrep('index.html');
const kiotHtml = readPrep('thanh-ly-kiot.html');

/* ---- 1. data.js: mảng agencyAds ---- */
const ag = D.agencyAds;
t('agencyAds: 11 mục', Array.isArray(ag) && ag.length === 11, 'n=' + (ag && ag.length));
t('agencyAds: id duy nhất ag-01..ag-11', new Set(ag.map(x => x.id)).size === 11
  && ag.every((x, i) => x.id === 'ag-' + String(i + 1).padStart(2, '0')));
t('agencyAds: type đều agencyAds', ag.every(x => x.type === 'agencyAds'));
t('agencyAds: 11/11 có avatar local (không hotlink scontent)', ag.every(x => typeof x.avatar === 'string' && x.avatar.length > 0 && !x.avatar.includes('fbcdn.net')));
t('agencyAds: avatar ag-02..ag-11 là images-new/ag-*.jpg', ag.slice(1).every(x => /^images-new\/ag-\d\d\.jpg$/.test(x.avatar)));
t('agencyAds: 10 thật có sourceUrl facebook.com', ag.slice(1).every(x => typeof x.sourceUrl === 'string' && x.sourceUrl.includes('facebook.com')));
t('agencyAds: ag-08 giá rõ 500000 + suffix buổi live', ag[7].price === 500000 && ag[7].priceSuffix === '/buổi live đầu tiên');
t('agencyAds: 9 mục còn lại không giá (null, không bịa)', ag.filter((x, i) => i !== 0 && i !== 7).every(x => x.price === null));
t('agencyAds: dateAdded 2026-11-13, expiresAt 2026-12-13', ag.every(x => x.dateAdded === '2026-11-13' && x.expiresAt === '2026-12-13'));

/* ---- 2. app.js: cấu hình danh mục ---- */
t('NEWOBJ_TYPES.rentals.page = thanh-ly-kiot.html', V.NEWOBJ_TYPES.rentals.page === 'thanh-ly-kiot.html');
t('NEWOBJ_TYPES.agencyAds tồn tại, page shop, priceLabel Phí dịch vụ',
  V.NEWOBJ_TYPES.agencyAds && V.NEWOBJ_TYPES.agencyAds.page === 'danh-sach-shop.html'
  && V.NEWOBJ_TYPES.agencyAds.priceLabel === 'Phí dịch vụ' && V.NEWOBJ_TYPES.agencyAds.label === 'Agency Ads Livestream');
t('NEWOBJ_ARRAYS có agencyAds (8 mảng)', V.NEWOBJ_ARRAYS.length === 8 && V.NEWOBJ_ARRAYS.includes('agencyAds'));
t('NEWOBJ_UNI_CATS.rentals.provId = kiotProv', V.NEWOBJ_UNI_CATS.rentals.provId === 'kiotProv');
t('NEWOBJ_UNI_CATS.agency-ads: section agency-ads-livestream, provId fShProv',
  V.NEWOBJ_UNI_CATS['agency-ads'] && V.NEWOBJ_UNI_CATS['agency-ads'].sectionId === 'agency-ads-livestream'
  && V.NEWOBJ_UNI_CATS['agency-ads'].provId === 'fShProv');
t('NEWOBJ_UNI_CATS.rentals.sectionId giữ nguyên cho-thue-cua-hang-kho', V.NEWOBJ_UNI_CATS.rentals.sectionId === 'cho-thue-cua-hang-kho');
t('NEWOBJ_SECTIONS có agencyAds (grid agencyAdsGrid)', V.NEWOBJ_SECTIONS.some(s => s.type === 'agencyAds' && s.gridId === 'agencyAdsGrid'));
t('init rentals dùng kiotProv/kiotSort (không còn fShProv/fShopPriceSort cho rentals)',
  appJs.includes("sectionId: 'cho-thue-cua-hang-kho'") && /cho-thue-cua-hang-kho'[^;]*provId: 'kiotProv', sortId: 'kiotSort'/.test(appJs));
t('init agencyAds dùng fShProv/fShopPriceSort',
  /sectionId: 'agency-ads-livestream'[^;]*provId: 'fShProv', sortId: 'fShopPriceSort'/.test(appJs));
t('setShopCat: danh sách section cứng có agency-ads-livestream, hết cho-thue-cua-hang-kho',
  appJs.includes("'agency-ads-livestream'") && !appJs.includes("'su-kien-marketing','logistics-trung-viet','cho-thue-cua-hang-kho'"));
t('newObjCount agencyAds = 11', V.newObjCount('agencyAds') === 11);
t('newObjCount rentals = 11 (không đổi)', V.newObjCount('rentals') === 11);
t('newObjPriceText: ag-08 hiện 500.000đ/buổi live đầu tiên', V.newObjPriceText(ag[7]).includes('500.000') && V.newObjPriceText(ag[7]).includes('/buổi live đầu tiên'));
t('newObjPriceText: mục không giá hiện Liên hệ', V.newObjPriceText(ag[1]) === 'Liên hệ');
t('newObjCardHTML: ag-02 render được thẻ có id ag-02', V.newObjCardHTML(ag[1]).includes('id="ag-02"'));

/* ---- 3. search.js ---- */
t("search.js: NEWOBJ_META thue-mb page = thanh-ly-kiot.html", searchJs.includes("'thue-mb': {label: 'Cho thuê cửa hàng / kho hàng', page: 'thanh-ly-kiot.html'}"));
t("search.js: NEWOBJ_META agency-ads page = danh-sach-shop.html", searchJs.includes("'agency-ads': {label: 'Agency Ads Livestream', page: 'danh-sach-shop.html'}"));
t("search.js: NEWOBJ_DATA_MAP agency-ads -> agencyAds", searchJs.includes("'agency-ads': 'agencyAds'"));
t("search.js: TYPE_LABELS + TYPE_ORDER có agency-ads", searchJs.includes("'agency-ads': 'Agency Ads Livestream'") && searchJs.includes("'thue-mb', 'agency-ads'"));
t("search.js: count init có agency-ads: 0", searchJs.includes("'agency-ads': 0"));

/* ---- 4. HTML: shop ---- */
t('shop: hết mọi tham chiếu cho-thue/rentals', !/cho-thue|rentals/i.test(shopHtml));
t('shop: section agency-ads-livestream đủ id (grid/count/empty/moreBtn)', ['agencyAdsGrid', 'agencyAdsCount', 'agencyAdsEmpty', 'agencyAdsMoreBtn'].every(id => shopHtml.includes('id="' + id + '"')));
t('shop: nút switch agency-ads (ẩn, display:none)', shopHtml.includes('data-uni-cat="agency-ads"') && shopHtml.includes('data-track="chon-agency-ads"'));
t('shop: hash map có agency-ads-livestream, hết cho-thue', shopHtml.includes("'#agency-ads-livestream'") && !shopHtml.includes('#cho-thue-cua-hang-kho'));

/* ---- 5. HTML: mau + index ---- */
t('mau: XÓA hẳn nút link cho-thue khỏi switch bên Shop (v198b)', !mauHtml.includes('chon-cho-thue') && !mauHtml.includes('Cho thuê mặt bằng</a>'));
t('mau: link agency-ads-livestream sang shop', mauHtml.includes('href="danh-sach-shop.html#agency-ads-livestream"'));
t('mau: hết link shop#cho-thue', !mauHtml.includes('danh-sach-shop.html#cho-thue'));
t('index: link home cho-thue sang thanh-ly-kiot.html', indexHtml.includes('href="thanh-ly-kiot.html#cho-thue-cua-hang-kho"'));

/* ---- 6. HTML: kiot ---- */
t('kiot: KIOT_MAX_ROWS = 12 (2 hàng)', /var KIOT_MAX_ROWS = 12;/.test(kiotHtml));
t('kiot: hết class rows-1 (mục con hiện 2 hàng khi thu gọn)', !kiotHtml.includes('rows-1'));
t('kiot: section cho-thue-cua-hang-kho đủ id', ['rentalsGrid', 'rentalsCount', 'rentalsEmpty', 'rentalsMoreBtn'].every(id => kiotHtml.includes('id="' + id + '"')));
t('kiot: nút switch rentals (hiện, không display:none)', kiotHtml.includes('data-uni-cat="rentals"'));
t('kiot: inline map có rentals', kiotHtml.includes("'rentals': 'cho-thue-cua-hang-kho'") && kiotHtml.includes("'#cho-thue-cua-hang-kho': 'rentals'"));
t('kiot: v197 card-hash ternary có rentals', kiotHtml.includes("sec.id === 'cho-thue-cua-hang-kho' ? 'rentals'"));
t('kiot: reset list có cho-thue-cua-hang-kho', kiotHtml.includes("'dich-vu-chuyen-nha', 'thiet-bi-phong-live', 'cho-thue-cua-hang-kho'"));
t('kiot B (anh chot 15:37): 3 section con KHÔNG có hidden — hiện luôn',
  kiotHtml.includes('<section class="lot-section filter-section collapsed" id="dich-vu-chuyen-nha" aria-labelledby="moving-title">') &&
  kiotHtml.includes('<section class="lot-section filter-section collapsed" id="thiet-bi-phong-live" aria-labelledby="liveequip-title">') &&
  kiotHtml.includes('<section class="lot-section filter-section collapsed" id="cho-thue-cua-hang-kho" aria-labelledby="rentals-title">'));
t('kiot B: có showKiotDefault (hiện 3 mục + thu gọn 2 hàng)',
  kiotHtml.includes('function showKiotDefault()') && kiotHtml.includes("window.V20.showAllNewObjSections") && kiotHtml.includes("s.classList.add('collapsed')"));
t('kiot B: setKiotCat(kiot) về mặc định, init gọi showKiotDefault',
  kiotHtml.includes("if(!secId){ showKiotDefault(); return; }") && kiotHtml.includes("showKiotDefault();\n    var map = {'#dich-vu-chuyen-nha'"));

/* ---- 7. sw.js ---- */
t('sw.js CACHE = v198-shell-1', swJs.includes("const CACHE = 'v198-shell-1'"));

/* ---- 8. Không hồi quy v197 (STAR_LIMIT_MS chỉ kiểm ở workflow deploy trên
   staging live-base — prep còn code v185 chưa deploy nên vẫn chứa nó) ---- */
t('v197: app.js vẫn có pageOfId + scrollToHashedCard',
  typeof V.pageOfId === 'function' && typeof V.scrollToHashedCard === 'function');
t('v197: kiot hash mv-02 vẫn mở đúng mục (ternary còn chuyen-nha/thiet-bi-live)',
  kiotHtml.includes("sec.id === 'dich-vu-chuyen-nha' ? 'chuyen-nha'") && kiotHtml.includes("sec.id === 'thiet-bi-phong-live' ? 'thiet-bi-live'"));

console.log(`\n== v198: ${pass} PASS, ${fail} FAIL ==`);
process.exit(fail ? 1 : 0);
