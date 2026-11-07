/* v38 tests — Node only, no browser. v38 = 1 dong 4 o tin moi tren trang
   chu theo yeu cau nguoi dung (22:19 + chinh lai 22:37 ngay 05/11/2026):
   (1) Hang tin moi (#homePinned) duoi hero search: dung 4 khung; lay bai
       pinned truoc (moi nhat), chua du 4 thi lap bang bai moi nhat,
       khong trung lap. Khung co anh hoac o placeholder + tieu de + chuyen
       muc, link toi trang bai.
   (2) Muc Tin moi (#homeNews) GIU NGUYEN list 6 bai moi nhat nhu cu
       (news-item: chuyen muc + tieu de link + ngay) — muc Tin tuc de
       nguyen, khong doi sang 4 cot chuyen muc.
   (3) v40: khong con bai nao thieu anh hay thieu link — 2 bai demo da co
       page + img infographic, pin card link noi bo toi trang bai-viet.
   (4) CSS chi co .pinned-row (grid 4 cot, gap 16px) + responsive 2 cot
       (1000px) / 1 cot (600px); KHONG con .news-cols; sw.js CACHE =
       'v41-shell-1' (v41), v42: 'v42-shell-1', v43: 'v43-shell-1', v44: 'v45-shell-1', v47: 'v47-shell-1'; du lieu khong doi (20 mau, 30 shop, 50 bai).
   v47 (06/11/2026): them 5 bai (1 bai tu khoa SEO "tuyen mau livestream"
   duoc ghim + 4 bai tin tuc) — hang ghim doi thanh [bai tu khoa 06/11,
   bop reach 03/11, 7 muc bat buoc 05/11, luong MC 05/11]; bai le-11-11
   (03/11) roi khoi hang ghim vi chi con 4 khung.
   v80 (07/11/2026): them 10 bai, ghim bai tu khoa SEO "viec lam mau
   livestream" (07/11) — hang ghim [11st, viec-lam 07/11, tuyen-mau 06/11,
   bop-reach 03/11]; bai "7 muc bat buoc" (05/11) bi go ghim vi da du 4. */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let pass = 0, fail = 0;
function t(name, cond, extra = '') { if (cond) { pass++; console.log('PASS v38:', name); } else { fail++; console.log('FAIL v38:', name, extra); } }
const sb = { window: {}, module: { exports: {} }, console, URLSearchParams };
vm.createContext(sb);
vm.runInContext(fs.readFileSync(path.join(root, 'js/data.js'), 'utf8'), sb);
vm.runInContext(fs.readFileSync(path.join(root, 'js/app.js'), 'utf8'), sb);
const D = sb.window.V20_DATA, V = sb.window.V20;
const css = fs.readFileSync(path.join(root, 'v20.css'), 'utf8');
const sw = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');
const indexHtml = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const flat = css.replace(/\s+/g, '');

// ---- (0) index.html: co #homePinned + #homeNews (list cu), khong co #homeNewsCols ----
t('index.html co #homePinned va #homeNews, khong con #homeNewsCols',
  indexHtml.includes('id="homePinned"') && indexHtml.includes('id="homeNews"') && !indexHtml.includes('id="homeNewsCols"'));
t('hang tin moi nam ngay duoi hero (truoc trust-strip)',
  indexHtml.indexOf('id="homePinned"') < indexHtml.indexOf('trust-strip'));
t('muc tin giu tieu de (v66: thanh link xanh toi tin-tuc.html) + nut "Xem tất cả tin →"',
  indexHtml.includes('<h2><a href="tin-tuc.html" data-track="tieu-de-tin-tuc">Tin mới thị trường Livestream/TMĐT Việt Nam và Thế giới</a></h2>') && indexHtml.includes('Xem tất cả tin →'));
t('muc tin dung div .news-list nhu cu',
  indexHtml.includes('<div class="news-list" id="homeNews">'));

// ---- (1) hang tin moi: dung 4 khung, ghim truoc roi lap bang moi nhat ----
const pinned = V.getPinnedRow(D.articles);
t('hang tin moi co dung 4 bai', pinned.length === 4);
t('bai ghim duy nhat (bop-reach, user ghim tay) dung dau hang (v84)',
  pinned[0].pinned === true && pinned[0].title.includes('bóp reach') && pinned[0].date === '2026-11-03');
t('3 o con lai la 3 bai moi them vao web gan nhat (v82, theo thu tu them vao — khong theo date bai goc) (v84)',
  pinned[1].pinned === false && pinned[1].title.includes('Đặc sản địa phương') && pinned[1].date === '2026-11-07'
  && pinned[2].pinned === false && pinned[2].title.includes('Chợ 4.0') && pinned[2].date === '2026-11-04'
  && pinned[3].pinned === false && pinned[3].title.includes('16 tỷ lượt xem') && pinned[3].date === '2026-11-07');
t('chi o 1 la bai ghim, 3 o sau la bai moi them (v84: chi user ghim 1 bai)',
  pinned[0].pinned === true && pinned.slice(1).every(a => a.pinned === false));
t('khong bai nao lap lai trong hang tin moi',
  new Set(pinned.map(a => a.title)).size === 4);
const pinnedHtml = pinned.map(a => V.pinCardHTML(a)).join('');
t('moi khung co anh hoac o placeholder + tieu de + chuyen muc',
  pinned.every(a => {
    const h = V.pinCardHTML(a);
    return h.includes('class="pin-card"') && h.includes(V.esc(a.title)) && h.includes(V.esc(a.cat))
      && (a.img ? h.includes('<img') : h.includes('pin-noimg'));
  }));
t('khung link toi trang bai (page neu co, khong thi url)',
  pinnedHtml.includes('href="bai-viet-bop-reach.html"')
  && pinnedHtml.includes('href="bai-viet/hang-viet-ke-chuyen-dac-san-ban-chay-tiktok.html"')
  && pinnedHtml.includes('href="bai-viet/cho-40-tieu-thuong-hoc-livestream-tiktok.html"')
  && pinnedHtml.includes('href="bai-viet/shopee-live-video-tet-2026-16-ty-luot-xem.html"'));

// ---- (2) muc Tin moi giu nguyen list 6 bai moi nhat ----
const newest6 = D.articles.slice().sort(function(x, y){ return (x.date||'')>(y.date||'')?-1:((x.date||'')<(y.date||'')?1:0); }).slice(0, 6);
t('list tin moi co dung 6 bai moi nhat', newest6.length === 6);
t('list tin moi xep dung thu tu ngay giam dan',
  newest6.every((a, i) => i === 0 || (newest6[i-1].date||'') >= (a.date||'')));
t('khong con ham 4 cot (getNewsCol/newsColHTML/NEWS_CATS) trong app.js',
  typeof V.getNewsCol === 'undefined' && typeof V.newsColHTML === 'undefined' && typeof V.NEWS_CATS === 'undefined');

// ---- (3) v40: khong con bai nao thieu anh hay thieu link (2 demo da co page + img) ----
t('khong con bai nao thieu anh (v40: 2 demo da co img infographic)', !D.articles.find(a => !a.img));
t('khong con bai nao thieu ca page lan url (v40: 2 demo da co page)', !D.articles.find(a => !a.page && !a.url));
const demos = D.articles.filter(a => a.url === null && a.kind !== 'keyword');
t('bai demo (url null) gio link noi bo toi trang bai-viet, co anh',
  demos.length === 2 && demos.every(a => V.pinCardHTML(a).includes('href="bai-viet/') && V.pinCardHTML(a).includes('<img')));

// ---- (4) CSS + sw.js + du lieu ----
t('CSS: .pinned-row grid 4 cot, gap 16px', /\.pinned-row\{[^}]*grid-template-columns:repeat\(4,1fr\)[^}]*gap:16px/.test(flat));
t('CSS: .pin-img ti le 16/9 (o nho gon), object-fit cover', /\.pin-img\{[^}]*aspect-ratio:16\/9[^}]*object-fit:cover/.test(flat));
t('CSS: .pin-num la badge tron 28px, mau thuong hieu, goc duoi trai anh (v78 B3)',
  /\.pin-num\{[^}]*position:absolute[^}]*top:auto;bottom:8px[^}]*left:8px[^}]*width:28px[^}]*height:28px[^}]*border-radius:50%[^}]*background:var\(--brand\)/.test(flat));
t('CSS: .pin-card co position:relative de dinh badge so',
  /\.pin-card\{[^}]*position:relative/.test(flat));
t('CSS: .pin-card h3 nho gon (15px, margin 8px 10px 2px), .pin-cat 12px',
  /\.pin-cardh3\{[^}]*font-size:15px/.test(flat) && /\.pin-cat\{[^}]*font-size:12px/.test(flat));
t('CSS: .pin-card bo goc 8px, khong bong do', /\.pin-card\{[^}]*border-radius:8px/.test(flat) && !/\.pin-card\{[^}]*box-shadow/.test(flat));
t('CSS: .pin-card h3 toi da 2 dong', /\.pin-cardh3\{[^}]*-webkit-line-clamp:2/.test(flat));
t('CSS: KHONG con .news-cols / .news-col / .news-feat / .news-small',
  !css.includes('.news-cols') && !css.includes('.news-col') && !css.includes('.news-feat') && !css.includes('.news-small'));
t('CSS: responsive 1000px -> 2 cot (chi .pinned-row)', /\.pinned-row\{grid-template-columns:repeat\(2,1fr\)\}/.test(flat));
t('CSS: responsive 600px -> 1 cot (chi .pinned-row)', /\.pinned-row\{grid-template-columns:1fr\}/.test(flat));
t('CSS: .news-list van ton tai cho trang tin-tuc.html', css.includes('.news-list'));
t("sw.js CACHE = 'v84-shell-1'", sw.includes("const CACHE = 'v84-shell-1'"));
t('du lieu khong doi: 20 mau, 30 shop, 50 bai', D.models.length === 20 && D.shops.length === 30 && D.articles.length === 50);

// ---- (5) v38b: phan trang trang con 3 hang (mau 12/trang, shop 9/trang) + khung shop can doi; trang chu GIU NGUYEN 2 hang ----
const appJs = fs.readFileSync(path.join(root, 'js/app.js'), 'utf8');
const mauHtml = fs.readFileSync(path.join(root, 'danh-sach-mau.html'), 'utf8');
const shopHtml = fs.readFileSync(path.join(root, 'danh-sach-shop.html'), 'utf8');
t('trang mau: initList phan trang 12/trang (3 hang x 4 cot)',
  appJs.includes('Math.ceil(list.length/12)') && appJs.includes('list.slice((pg-1)*12,pg*12)'));
t('trang mau: mo ta phan trang 12 ho so chuyen sang FAQ muc 9 (v62) + grid 4 cot',
  !mauHtml.includes('mỗi trang tối đa 12 hồ sơ') && indexHtml.includes('Danh sách mẫu phân trang, mỗi trang tối đa 12 hồ sơ.') && mauHtml.includes('<div class="grid" id="listGrid"') && !mauHtml.includes('grid grid-3'));
t('trang mau: 20 ho so = 2 trang (12 + 8)', Math.ceil(20 / 12) === 2 && 20 - 12 === 8);
t('trang shop: co nav #shopPager trong danh-sach-shop.html',
  shopHtml.includes('id="shopPager"') && shopHtml.includes('Chuyển trang shop'));
t('trang shop: mo ta "mỗi trang tối đa 9 shop" da chuyen sang FAQ muc 7 (v61, khong con tren trang Shop)',
  !shopHtml.includes('mỗi trang tối đa 9 shop') && indexHtml.includes('Danh sách shop phân trang, mỗi trang tối đa 9 shop.'));
t('trang shop: initShops phan trang 9/trang + label \"tin tuyển\"',
  appJs.includes('var perPage=9;') && appJs.includes("},perPage,'tin tuyển')"));
t('renderPager co tham so perPage + label (mac dinh 6 / \"hồ sơ\")',
  appJs.includes('function renderPager(el, page, totalPages, total, onPage, perPage, label)') && appJs.includes("perPage=perPage||6; label=label||'hồ sơ';"));

// ---- (5b) mo phong initShops qua DOMContentLoaded handler (nhu test-v31) ----
function stubEl() { return { innerHTML: '', textContent: '', value: '', addEventListener() {}, querySelectorAll: () => [] }; }
const shopEls = { publicShopsList: stubEl(), shopPager: stubEl(),
  fShopProv: stubEl(), fShopCat: stubEl(), fShopSort: stubEl(), fShopShift: stubEl(), applyShopBtn: stubEl(), resetShopBtn: stubEl() };
const shopHandlers = {};
const sb2 = { window: {}, module: { exports: {} }, console, URLSearchParams, location: { search: '' } };
sb2.document = { getElementById: id => shopEls[id] || null, createElement: () => stubEl(), addEventListener(type, fn) { shopHandlers[type] = fn; } };
vm.createContext(sb2);
vm.runInContext(fs.readFileSync(path.join(root, 'js/data.js'), 'utf8'), sb2);
vm.runInContext(fs.readFileSync(path.join(root, 'js/app.js'), 'utf8'), sb2);
t('handler DOMContentLoaded da dang ky (stub shop)', typeof shopHandlers['DOMContentLoaded'] === 'function');
shopHandlers['DOMContentLoaded']();
t('trang shop 1: hien 9 the shop', (shopEls.publicShopsList.innerHTML.match(/shop-card/g) || []).length === 9);
t('trang shop 1: pager \"Trang 1 / 4 — đang hiện 1–9 trên tổng số 30 tin tuyển.\"',
  shopEls.shopPager.innerHTML.includes('Trang 1 / 4') && shopEls.shopPager.innerHTML.includes('đang hiện 1–9 trên tổng số 30 tin tuyển.'));
t('trang shop 1 (v61): khong con dong dem publicShopsCount (da xoa khoi HTML + JS)',
  !shopHtml.includes('id="publicShopsCount"') && !appJs.includes('publicShopsCount'));
sb2.location = { search: '?page=2' };
shopHandlers['DOMContentLoaded']();
t('trang shop 2 (?page=2): hien 9 the, pager 10–18',
  (shopEls.publicShopsList.innerHTML.match(/shop-card/g) || []).length === 9
  && shopEls.shopPager.innerHTML.includes('Trang 2 / 4') && shopEls.shopPager.innerHTML.includes('đang hiện 10–18 trên tổng số 30 tin tuyển.'));
sb2.location = { search: '?page=4' };
shopHandlers['DOMContentLoaded']();
t('trang shop 4 (?page=4): hien 3 the cuoi, pager 28–30',
  (shopEls.publicShopsList.innerHTML.match(/shop-card/g) || []).length === 3
  && shopEls.shopPager.innerHTML.includes('Trang 4 / 4') && shopEls.shopPager.innerHTML.includes('đang hiện 28–30 trên tổng số 30 tin tuyển.'));
sb2.location = { search: '?page=99' };
shopHandlers['DOMContentLoaded']();
t('trang shop ?page=99: kep ve trang cuoi (4), khong vo',
  shopEls.shopPager.innerHTML.includes('Trang 4 / 4') && (shopEls.publicShopsList.innerHTML.match(/shop-card/g) || []).length === 3);

// ---- (5c) khung shop can doi nhu khung mau ----
const shopCards = D.shops.map(s => V.shopCardHTML(s));
t('CSS: .shop-head la dai neo thi giac co dinh (nen gradient + min-height 100px + bo goc 16px + can giua)',
  /\.shop-head\{[^}]*background:linear-gradient\(160deg,#d9eae4,#eef3f1\)[^}]*min-height:100px/.test(flat)
  && /\.shop-head\{[^}]*border-radius:16px/.test(flat) && /\.shop-head\{[^}]*align-items:center/.test(flat));
t('CSS: .shop-foot gom muc phu (duong ke tren + gap gon)',
  /\.shop-foot\{[^}]*border-top:1pxsolidvar\(--line\)[^}]*padding-top:10px/.test(flat));
t('the shop: cac muc phu gom trong .shop-foot, thu tu meta -> lien he -> ghi chu -> link goc',
  shopCards.every(h => {
    const foot = (h.match(/<div class="shop-foot">[\s\S]*?<\/div>/) || [''])[0];
    const mi = foot.indexOf('shop-meta'), cl = foot.indexOf('contact-list'), no = foot.indexOf('contact-note'), sr = foot.indexOf('shop-src');
    return foot.length > 0 && (mi === -1 || mi < cl) && cl !== -1 && cl < no && no < sr;
  }));
t('the shop: nut van nam sau .shop-src va .warn (actions cuoi the)',
  shopCards.every(h => h.indexOf('card-actions') > h.indexOf('class="shop-src"') && h.indexOf('card-actions') > h.indexOf('class="warn"')));
t('the shop: van du 4 decision-item + 1 decision-exp (khong mat o nao khi can doi)',
  shopCards.every(h => (h.match(/decision-item/g) || []).length === 4 && (h.match(/decision-exp/g) || []).length === 1));
t('the shop: van giu .shop-head + logo 1/4 (test-v32, v57)',
  shopCards.every(h => h.includes('<div class="shop-head">')) && /\.shop-card\.shop-logo,\.shop-card\.shop-initial\{[^}]*width:25%/.test(flat));

// ---- (5e) v38c: 4 o tin danh so 1-2-3-4, o nho gon ----
t('pinCardHTML(a, 1..4) render badge so dung thu tu',
  [1, 2, 3, 4].every(n => V.pinCardHTML(D.articles[0], n).includes('<span class="pin-num"') && V.pinCardHTML(D.articles[0], n).includes('>' + n + '</span>')));
t('pinCardHTML(a) khong so: khong render badge (tuong thich cu)',
  !V.pinCardHTML(D.articles[0]).includes('pin-num'));
const numberedRow = pinned.map((a, i) => V.pinCardHTML(a, i + 1)).join('');
t('hang tin moi render du 4 badge 1-2-3-4 dung thu tu',
  [1, 2, 3, 4].every(n => numberedRow.includes('>' + n + '</span>'))
  && numberedRow.indexOf('>1</span>') < numberedRow.indexOf('>2</span>')
  && numberedRow.indexOf('>2</span>') < numberedRow.indexOf('>3</span>')
  && numberedRow.indexOf('>3</span>') < numberedRow.indexOf('>4</span>'));
t('o dau (bai ghim) mang so 1',
  V.pinCardHTML(pinned[0], 1).includes('>1</span>') && pinned[0].pinned === true);
t('initHome truyen so thu tu vao pinCardHTML',
  appJs.includes('pinCardHTML(a,i+1)'));

// ---- (5d) trang chu KHONG DOI: van 2 hang (8 mau, 6 shop) ----
t('trang chu: homeTop8 van tra 8 mau',
  V.homeTop8(D.models, new Date(2026, 10, 5)).length === 8);
t('trang chu: initHome van slice shop 0,6 (v64: qua defaultShopOrder — xoay 8h + uu tien logo)',
  appJs.includes('defaultShopOrder(D.shops||[]).slice(0,6)'));
t('trang chu: 3 mo ta section-head da xoa o v62, tieu de section van nguyen',
  !indexHtml.includes('Trang chủ chỉ hiện 2 hàng — 8 hồ sơ') && !indexHtml.includes('6 tin tuyển mới nhất') && !indexHtml.includes('Đọc trước khi chốt lịch live') && indexHtml.includes('<h2>Mẫu có ảnh lên trước</h2>') && indexHtml.includes('<h2>Shop đang tuyển mẫu</h2>') && indexHtml.includes('Tin mới thị trường Livestream/TMĐT Việt Nam và Thế giới'));

// ---- (6) v38c: bo loc shop (tinh / linh vuc live / tim ten) + bo cuc trang shop giong khung trang Mau ----
t('shopCatGroup gom dung 6 nhom, cong du 30 shop',
  ['Thời trang', 'Mỹ phẩm & Làm đẹp', 'Gia dụng & Đời sống', 'Idol / Streamer', 'Công nghệ', 'Khác']
    .map(c => V.filterShops(D.shops, { cat: c }).length).reduce((a, b) => a + b, 0) === 30);
t('loc shop theo tinh: Ha Noi 20, TP. Ho Chi Minh 10',
  V.filterShops(D.shops, { prov: 'Hà Nội' }).length === 20
  && V.filterShops(D.shops, { prov: 'TP. Hồ Chí Minh' }).length === 10);
t('loc shop theo linh vuc: Thoi trang 13, Idol/Streamer 6, Cong nghe 1, Khac 3',
  V.filterShops(D.shops, { cat: 'Thời trang' }).length === 13
  && V.filterShops(D.shops, { cat: 'Idol / Streamer' }).length === 6
  && V.filterShops(D.shops, { cat: 'Công nghệ' }).length === 1
  && V.filterShops(D.shops, { cat: 'Khác' }).length === 3);
t('loc shop KHONG con loc theo tu khoa (v61): q bi bo qua, tra du 30 shop',
  V.filterShops(D.shops, { q: 'Chạm Loa' }).length === 30
  && V.filterShops(D.shops, { q: 'thời trang' }).length === 30);
t('loc ket hop tinh + linh vuc: Ha Noi + Thoi trang = 12',
  V.filterShops(D.shops, { prov: 'Hà Nội', cat: 'Thời trang' }).length === 12);
t('bo loc shop KHONG co truong loc Gioi tinh (nhu cau shop khac trang Mau)',
  !shopHtml.includes('id="fShopGender"'));
t('bo loc shop co 4 truong fShop (v61, bo o tim ten): tinh / linh vuc / sap xep / gio lam',
  (shopHtml.match(/id="fShop\w+"/g) || []).length === 4
  && shopHtml.includes('id="fShopSort"') && shopHtml.includes('id="fShopShift"'));

// ---- (6b) bo cuc trang shop: section-head gon + filter-card + grid + pager, nhu khung trang Mau ----
t('trang shop: section-head gon (v61: chi con H1, dong dem + mo ta phan trang da xoa, huong dan phan trang chuyen sang FAQ muc 7)',
  shopHtml.includes('<h1>Tìm shop tuyển mẫu livestream</h1>')
  && !shopHtml.includes('id="publicShopsCount"') && !shopHtml.includes('mỗi trang tối đa 9 shop')
  && indexHtml.includes('Danh sách shop phân trang, mỗi trang tối đa 9 shop.'));
t('trang shop: co filter-card (cols-3) voi fShopProv/fShopCat + nut Ap dung/Dat lai (v61: bo o tim ten fShopQ)',
  shopHtml.includes('class="filter-card cols-3"') && shopHtml.includes('id="fShopProv"')
  && shopHtml.includes('id="fShopCat"') && !shopHtml.includes('id="fShopQ"')
  && shopHtml.includes('id="applyShopBtn"') && shopHtml.includes('id="resetShopBtn"'));
t('trang shop: thu tu muc — danh sach (grid+pager) TRUOC steps, steps TRUOC form ho so/dang nhap/dang tin',
  shopHtml.indexOf('id="publicShopsList"') < shopHtml.indexOf('class="steps"')
  && shopHtml.indexOf('class="steps"') < shopHtml.indexOf('id="ho-so-shop"')
  && shopHtml.indexOf('id="ho-so-shop"') < shopHtml.indexOf('id="dang-nhap-shop"')
  && shopHtml.indexOf('id="dang-nhap-shop"') < shopHtml.indexOf('id="dang-tin"'));
t('trang shop: giu nguyen noi dung rieng (steps 3 buoc, shop da duyet, tin da duyet, form)',
  shopHtml.includes('class="steps"') && shopHtml.includes('id="approvedShopsList"')
  && shopHtml.includes('id="approvedJobsList"') && shopHtml.includes('id="shopBackendStatus"')
  && shopHtml.includes('id="shopProfileForm"') && shopHtml.includes('id="jobForm"')
  && !shopHtml.includes('30 shop đang tuyển mẫu'));
t('trang shop: giu muc dang ky/dang nhap shop (id dang-nhap-shop) + anchor noi bo ho-so-shop/dang-tin, khong doi so the trang chu',
  shopHtml.includes('id="dang-nhap-shop"') && shopHtml.includes('href="#ho-so-shop"')
  && shopHtml.includes('href="#dang-tin"'));

// ---- (6c) mo phong loc + phan trang qua DOM stub ----
function resetShopStub() {
  sb2.location = { search: '' };
  shopEls.fShopProv.value = ''; shopEls.fShopCat.value = '';
}
resetShopStub(); shopEls.fShopProv.value = 'Hà Nội'; shopHandlers['DOMContentLoaded']();
t('loc qua form: tinh Ha Noi -> 20 shop, pager 1/3 (v61: khong con dong dem)',
  (shopEls.publicShopsList.innerHTML.match(/shop-card/g) || []).length === 9
  && shopEls.shopPager.innerHTML.includes('Trang 1 / 3')
  && shopEls.shopPager.innerHTML.includes('đang hiện 1–9 trên tổng số 20 tin tuyển.'));
resetShopStub(); shopEls.fShopCat.value = 'Idol / Streamer'; shopHandlers['DOMContentLoaded']();
t('loc qua form: linh vuc Idol/Streamer -> 6 shop, pager 1/1 (v61: khong con dong dem)',
  (shopEls.publicShopsList.innerHTML.match(/shop-card/g) || []).length === 6
  && shopEls.shopPager.innerHTML.includes('Trang 1 / 1')
  && shopEls.shopPager.innerHTML.includes('đang hiện 1–6 trên tổng số 6 tin tuyển.'));
resetShopStub(); sb2.location = { search: '?prov=' + encodeURIComponent('Hà Nội') }; shopHandlers['DOMContentLoaded']();
t('loc qua URL ?prov=Ha Noi: prefill fShopProv + loc dung 20 shop',
  shopEls.fShopProv.value === 'Hà Nội'
  && (shopEls.publicShopsList.innerHTML.match(/shop-card/g) || []).length === 9
  && shopEls.shopPager.innerHTML.includes('Trang 1 / 3'));
resetShopStub(); shopHandlers['DOMContentLoaded']();
t('dat lai bo loc: tro ve du 30 shop, pager 1/4',
  (shopEls.publicShopsList.innerHTML.match(/shop-card/g) || []).length === 9
  && shopEls.shopPager.innerHTML.includes('Trang 1 / 4')
  && shopEls.shopPager.innerHTML.includes('đang hiện 1–9 trên tổng số 30 tin tuyển.'));

console.log(`v38: ${pass} PASS, ${fail} FAIL`);
