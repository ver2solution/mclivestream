/* v74 tests — Node only, no browser. v74 = build LAI SACH khoi "Tim mau cho
   11.11 — 3 buoc, khong can dang nhap" tren nen v73 (ban live hien tai).
   Ban hub v63 cu BI LOI, khong deploy: worker truoc copy nham tu v64-prep
   dang lam do (suite thuc te 5.050 PASS, 24 FAIL; bao cao "5.074 PASS,
   0 FAIL" la sai). v74 chi port code hub DA KIEM CHUNG cua v63 (ham
   hubZaloHref/hubCardHTML/hubResults/hubAllLink/hubEmptyHTML/initHub,
   CSS .hub-*, defaultModelOrder) len v73-prep, doi chieu tung phan voi
   thiet ke 2026-11-06 (design-2026-11-06-tim-mau-nhanh-cho-shop-11-11.md)
   + data.js v73, khong copy mu ca file. Thu tu mac dinh trang Mau o v74
   dung rotateWindow (v64, cua so 8 tieng gio VN), khong dung rotateDaily
   (v63 dung rotateDaily — expectedOrder o day doi theo cho khop).
   (A) Khoi .hub-card moi ngay duoi tieu de trang Shop, TRUOC the loc tin
       tuyen shop: h2 + dong phu + 2 o select (chi tinh/linh vuc co mau that,
       kem so luong) + vung ket qua toi da 3 the + dong dem/link + dong phu
       Zalo chung.
   (B) JS rieng trong js/app.js: hubZaloHref (tin nhan soan san dung mau cau
       thiet ke 04/11), hubCardHTML (tai dung cardHTML v28, chi doi link
       "Nhan Zalo" + them link video demo neu co), hubResults (loc tinh/cat
       + xep DUNG thu tu mac dinh trang Mau), hubAllLink (deep-link
       prov/cat), hubEmptyHTML (to hop 0 mau), initHub (render ngay khi doi
       1 trong 2 o, khong can nut Ap dung).
   (C) Sua 1 cau mo ta sai su that (§2.3 thiet ke: "album anh va 1 video
       demo") — cau nay DA KHONG CON tren trang Shop tu v62 (v62 bo 2 doan
       gioi thieu sau filter); v74 chi khang dinh lai bang test, khong sua
       them.
   (D) Khong doi js/data.js (20 mau / 30 shop / 50 bai), khong doi bo loc
       tin tuyen shop, phan trang, form ho so shop / dang tin, trang chu,
       trang mau, trang chi tiet. */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let pass = 0, fail = 0;
function t(name, cond, extra = '') { if (cond) { pass++; console.log('PASS v74:', name); } else { fail++; console.log('FAIL v74:', name, extra); } }
const sha = (p) => crypto.createHash('sha256').update(fs.readFileSync(path.join(root, p))).digest('hex');

const shopHtml = fs.readFileSync(path.join(root, 'danh-sach-shop.html'), 'utf8');
const css = fs.readFileSync(path.join(root, 'v20.css'), 'utf8');
const appJs = fs.readFileSync(path.join(root, 'js/app.js'), 'utf8');
const D = (() => { const sb = { window: {} }; vm.createContext(sb); vm.runInContext(fs.readFileSync(path.join(root, 'js/data.js'), 'utf8'), sb); return sb.window.V20_DATA; })();
const V = (() => { const sb = { window: {}, module: { exports: {} }, console }; vm.createContext(sb); vm.runInContext(fs.readFileSync(path.join(root, 'js/data.js'), 'utf8'), sb); vm.runInContext(fs.readFileSync(path.join(root, 'js/app.js'), 'utf8'), sb); return sb.window.V20; })();

// ---- (A) Cau truc khoi hub trong HTML ----
const hubSection = (shopHtml.match(/<section class="hub-card" id="tim-mau-1111"[\s\S]*?<\/section>/) || [''])[0];
t('Hub: section .hub-card#tim-mau-1111 ton tai', hubSection.length > 0);
t('Hub: nam ngay duoi tieu de trang, TRUOC the loc tin tuyen shop',
  shopHtml.indexOf('id="tim-mau-1111"') > shopHtml.indexOf('<h1>Tìm shop tuyển mẫu livestream</h1>')
  && shopHtml.indexOf('id="tim-mau-1111"') < shopHtml.indexOf('class="filter-card cols-3"'));
t('Hub: h2 dung nguyen van thiet ke', hubSection.includes('<h2 id="hub-title">Tìm mẫu cho 11.11 — 3 bước, không cần đăng nhập</h2>'));
t('Hub: dong phu dung su that (20 mau, chi hien thong tin that)', hubSection.includes('Hiện có 20 mẫu trên sàn. Chọn tỉnh và lĩnh vực rồi xem ngay mẫu phù hợp — chỉ hiện thông tin thật.'));
t('Hub: o tinh chi liet ke 3 tinh co mau that + so luong 11/5/4',
  hubSection.includes('<option value="TP. Hồ Chí Minh">TP. Hồ Chí Minh (11 mẫu)</option>')
  && hubSection.includes('<option value="Hà Nội">Hà Nội (5 mẫu)</option>')
  && hubSection.includes('<option value="Toàn quốc / Live online">Toàn quốc / Live online (4 mẫu)</option>')
  && hubSection.includes('<option value="">Tất cả tỉnh (20 mẫu)</option>'));
t('Hub: o linh vuc chi liet ke 4 linh vuc co mau that + so luong 9/8/2/1',
  hubSection.includes('<option value="Thời trang">Thời trang (9 mẫu)</option>')
  && hubSection.includes('<option value="Chung / Đa ngành">Chung / Đa ngành (8 mẫu)</option>')
  && hubSection.includes('<option value="Gia dụng">Gia dụng (2 mẫu)</option>')
  && hubSection.includes('<option value="Mỹ phẩm">Mỹ phẩm (1 mẫu)</option>')
  && hubSection.includes('<option value="">Tất cả lĩnh vực (20 mẫu)</option>'));
t('Hub: vung ket qua + dong dem + dong phu Zalo chung dung id',
  hubSection.includes('id="hubResults"') && hubSection.includes('id="hubCount"') && hubSection.includes('id="hubSub"')
  && hubSection.includes('Nhắn Zalo Ver2Solution 032 998 3699'));
t('Hub: trang thai ban dau la dong huong dan + link xem tat ca 20 mau',
  hubSection.includes('Chọn tỉnh và lĩnh vực ở trên để xem mẫu phù hợp — hoặc <a href="danh-sach-mau.html">xem tất cả 20 mẫu →</a>'));
t('Hub: khong co chu "Còn trống" / "Sẵn sàng 11.11" / "Sẵn sàng nhận" tren trang Shop',
  !shopHtml.includes('Còn trống') && !shopHtml.includes('Sẵn sàng 11.11') && !shopHtml.includes('Sẵn sàng nhận'));
t('Hub: khong co link "Xem video demo" nao duoc render san (0 demo that)',
  !shopHtml.includes('Xem video demo'));
t('Hub: cau sai su that §2.3 ("album ảnh và 1 video demo") khong con tren trang Shop (da bo tu v62)',
  !shopHtml.includes('album ảnh và 1 video demo') && !shopHtml.includes('album ảnh'));

// ---- (B) hubResults: so luong + thu tu khop trang Mau ----
const FIXED_DATE = new Date(2026, 10, 6); // ngay co dinh de xoay theo ngay on dinh
function expectedOrder(list, date) {
  const sorted = list.slice().sort((a, b) => (b.views - a.views) || (b.comments - a.comments) || ((b.photoUrl ? 1 : 0) - (a.photoUrl ? 1 : 0)));
  return V.rotateWindow(sorted, (m) => m.views + '|' + m.comments + '|' + V.photoTier(m), date);
}
const COMBOS = [
  ['TP. Hồ Chí Minh', 'Chung / Đa ngành', 8],
  ['Hà Nội', 'Thời trang', 4],
  ['Toàn quốc / Live online', 'Thời trang', 3],
  ['TP. Hồ Chí Minh', 'Thời trang', 2],
  ['Toàn quốc / Live online', 'Gia dụng', 1],
  ['Hà Nội', 'Gia dụng', 1],
  ['TP. Hồ Chí Minh', 'Mỹ phẩm', 1],
  ['Hà Nội', 'Mỹ phẩm', 0],
];
for (const [prov, cat, n] of COMBOS) {
  const got = V.hubResults(prov, cat, FIXED_DATE);
  const exp = expectedOrder(V.filterModels(D.models, { prov, cat }), FIXED_DATE);
  t(`hubResults ${prov} | ${cat}: dung ${n} mau + dung thu tu trang Mau`,
    got.length === n && got.map((m) => m.id).join(',') === exp.map((m) => m.id).join(','),
    `got=${got.length} ids=${got.map((m) => m.id).join(',')}`);
}
t('hubResults rong: tra ve du 20 mau theo thu tu mac dinh',
  V.hubResults('', '', FIXED_DATE).length === 20
  && V.hubResults('', '', FIXED_DATE).map((m) => m.id).join(',') === expectedOrder(D.models, FIXED_DATE).map((m) => m.id).join(','));
t('hubResults chi loc tinh/cat (khong loc luong/doanh thu/gio lam)',
  V.hubResults('Hà Nội', '', FIXED_DATE).length === 5 && V.hubResults('', 'Mỹ phẩm', FIXED_DATE).length === 1);
t('hubAllLink: du tham so prov/cat, rong thi ve trang Mau khong tham so',
  V.hubAllLink('Hà Nội', 'Thời trang') === 'danh-sach-mau.html?prov=H%C3%A0%20N%E1%BB%99i&cat=Th%E1%BB%9Di%20trang'
  && V.hubAllLink('Hà Nội', '') === 'danh-sach-mau.html?prov=H%C3%A0%20N%E1%BB%99i'
  && V.hubAllLink('', 'Mỹ phẩm') === 'danh-sach-mau.html?cat=M%E1%BB%B9%20ph%E1%BA%A9m'
  && V.hubAllLink('', '') === 'danh-sach-mau.html');
t('hubEmptyHTML: to hop 0 mau dung mau cau thiet ke (Ha Noi + My pham)',
  V.hubEmptyHTML('Hà Nội', 'Mỹ phẩm') === 'Chưa có mẫu Mỹ phẩm ở Hà Nội. Thử chọn Toàn quốc / Live online, hoặc <a href="danh-sach-mau.html?cat=M%E1%BB%B9%20ph%E1%BA%A9m">xem tất cả mẫu Mỹ phẩm →</a>');

// ---- (C) hubZaloHref + hubCardHTML ----
const sample = D.models.find((m) => m.province === 'Hà Nội' && m.cat === 'Thời trang');
const expectedMsg = 'Chào Ver2Solution, tôi là shop cần mẫu ' + sample.name + ' live Thời trang đợt 11.11 (10–13/11). Nhờ giới thiệu và xác nhận lịch trống giúp tôi.';
t('hubZaloHref: Zalo chung + tin nhan soan san dung mau cau (ten that + linh vuc + dot 11.11)',
  V.hubZaloHref(sample) === 'https://zalo.me/0329983699?text=' + encodeURIComponent(expectedMsg));
const AUDIT_PHONES = ['0363622099', '0932542626', '0969151680', '0982725840', '0986718540'];
t('hubCardHTML: tai dung cardHTML, chi doi link "Nhan Zalo" sang tin nhan soan san',
  (() => {
    const hub = V.hubCardHTML(sample);
    const plain = V.cardHTML(sample);
    const hubTextLinks = (hub.match(/zalo\.me\/0329983699\?text=/g) || []).length;
    const hubPlainLinks = (hub.match(/href="https:\/\/zalo\.me\/0329983699"/g) || []).length;
    return hubTextLinks === 1 && hubPlainLinks === 2
      && hub.includes('href="ho-so.html?id=' + sample.id + '"')
      && hub.includes('Xem hồ sơ →')
      && hub.replace(/zalo\.me\/0329983699\?text=[^"]+/, 'zalo.me/0329983699') === plain;
  })());
t('hubCardHTML: khong hien link video demo voi du lieu that (0/20 co demo)',
  D.models.every((m) => !V.hubCardHTML(m).includes('Xem video demo')));
t('hubCardHTML: khong hien so Zalo rieng cua mau (5 so cong khai trong kiem toan v26)',
  D.models.every((m) => AUDIT_PHONES.every((p) => !V.hubCardHTML(m).includes(p))));
t('hubCardHTML: co video demo that thi hien link "▶ Xem video demo" mo link goc',
  (() => {
    const withDemo = Object.assign({}, sample, { demo_video_url: 'https://example.com/demo-th01.mp4' });
    const h = V.hubCardHTML(withDemo);
    const withDemoUrl = Object.assign({}, sample, { demoUrl: 'https://example.com/demo2.mp4' });
    return h.includes('▶ Xem video demo') && h.includes('href="https://example.com/demo-th01.mp4"')
      && V.hubCardHTML(withDemoUrl).includes('href="https://example.com/demo2.mp4"');
  })());
t('cardHTML mac dinh khong doi (khong opts = khong demo link, Zalo chung tran)',
  V.cardHTML(sample).includes('href="https://zalo.me/0329983699"') && !V.cardHTML(sample).includes('Xem video demo'));

// ---- (D) initHub qua stub DOM ----
function makeEl(value) {
  return {
    value: value || '', innerHTML: '', textContent: '',
    _listeners: {},
    addEventListener(type, fn) { (this._listeners[type] = this._listeners[type] || []).push(fn); },
    fire(type) { (this._listeners[type] || []).forEach((f) => f()); },
    setAttribute() {}, classList: { toggle() { return false; }, add() {}, remove() {} },
    style: {}, querySelectorAll() { return []; }, scrollIntoView() {},
  };
}
const hubEls = {
  hubResults: makeEl(), hubProv: makeEl(), hubCat: makeEl(),
  hubCount: makeEl(), hubSub: makeEl(),
};
const domSb = {
  window: {}, console,
  location: { search: '', pathname: '/danh-sach-shop.html' },
  history: { replaceState() {} },
  document: {
    _listeners: {},
    addEventListener(type, fn) { (this._listeners[type] = this._listeners[type] || []).push(fn); },
    getElementById(id) { return hubEls[id] || null; },
  },
};
vm.createContext(domSb);
vm.runInContext(fs.readFileSync(path.join(root, 'js/data.js'), 'utf8'), domSb);
vm.runInContext(fs.readFileSync(path.join(root, 'js/app.js'), 'utf8'), domSb);
(domSb.document._listeners.DOMContentLoaded || []).forEach((f) => f());
t('initHub: ban dau chua chon gi — 0 the + dong huong dan + link xem tat ca 20 mau',
  hubEls.hubResults.innerHTML === ''
  && hubEls.hubCount.innerHTML.includes('Chọn tỉnh và lĩnh vực ở trên để xem mẫu phù hợp')
  && hubEls.hubCount.innerHTML.includes('xem tất cả 20 mẫu →')
  && hubEls.hubSub.textContent.includes('Hiện có 20 mẫu trên sàn'));
hubEls.hubProv.value = 'Hà Nội'; hubEls.hubCat.value = 'Thời trang';
hubEls.hubProv.fire('change'); hubEls.hubCat.fire('change');
t('initHub: Ha Noi + Thoi trang — hien dung 3 the, dung thu tu hubResults',
  (hubEls.hubResults.innerHTML.match(/<article class="card"/g) || []).length === 3
  && hubEls.hubCount.innerHTML.includes('Có 4 mẫu phù hợp. ')
  && hubEls.hubCount.innerHTML.includes('danh-sach-mau.html?prov=H%C3%A0%20N%E1%BB%99i&cat=Th%E1%BB%9Di%20trang'));
t('initHub: 3 the ket qua dung id voi 3 the dau cua hubResults',
  (() => {
    const ids = [...new Set([...hubEls.hubResults.innerHTML.matchAll(/ho-so\.html\?id=(th-\d+)/g)].map((m) => m[1]))];
    const exp = V.hubResults('Hà Nội', 'Thời trang').slice(0, 3).map((m) => m.id);
    return ids.join(',') === exp.join(',');
  })());
hubEls.hubProv.value = 'Hà Nội'; hubEls.hubCat.value = 'Mỹ phẩm';
hubEls.hubProv.fire('change');
t('initHub: Ha Noi + My pham (0 mau) — 0 the + dong trang thai that + link xem tat ca My pham',
  hubEls.hubResults.innerHTML === ''
  && hubEls.hubCount.innerHTML.includes('Chưa có mẫu Mỹ phẩm ở Hà Nội')
  && hubEls.hubCount.innerHTML.includes('danh-sach-mau.html?cat=M%E1%BB%B9%20ph%E1%BA%A9m'));
hubEls.hubProv.value = ''; hubEls.hubCat.value = '';
hubEls.hubProv.fire('change');
t('initHub: chon lai "Tat ca" ca 2 o — tro ve dong huong dan, 0 the',
  hubEls.hubResults.innerHTML === '' && hubEls.hubCount.innerHTML.includes('Chọn tỉnh và lĩnh vực ở trên'));

// ---- (E) CSS + JS noi tuyen + khong hoi quy ----
t('CSS: .hub-card ton tai (nen trang, vien, bo tron, bong mo)',
  css.includes('.hub-card{background:#fff;border:1px solid var(--line);border-radius:20px;padding:18px'));
t('CSS: .hub-filters 2 cot desktop, 1 cot <=600px',
  css.includes('.hub-filters{display:grid;grid-template-columns:repeat(2,1fr);gap:6px')
  && css.includes('.search-card,.filter-card,.hub-filters{grid-template-columns:1fr}'));
t('CSS: <=360px chi hien toi da 1 the ket qua; <=280px chi giu tieu de + dong dem',
  css.includes('.hub-results .card:nth-child(n+2){display:none}')
  && css.includes('@media(max-width:280px)') && css.includes('.hub-filters,.hub-results,.hub-help{display:none}'));
t('JS: initHub duoc goi o DOMContentLoaded + export qua window.V20',
  appJs.includes('initHome(); initList(); initNews(); initDetail(); initShopDetail(); initShops(); initHub();')
  && appJs.includes('hubZaloHref:hubZaloHref') && appJs.includes('hubCardHTML:hubCardHTML')
  && appJs.includes('hubResults:hubResults') && appJs.includes('defaultModelOrder:defaultModelOrder'));
t('JS: initList dung defaultModelOrder (cung thu tu voi hub)',
  appJs.includes('list=defaultModelOrder(list);') && appJs.includes('function defaultModelOrder(list, date){'));
t('Khong hoi quy: nen v73 van nguyen (rotateWindow/window8h + defaultShopOrder + rotateStaticGrids)',
  appJs.includes('function rotateWindow(list, tierOf, date){') && appJs.includes('function defaultShopOrder(list, date){')
  && appJs.includes('function rotateStaticGrids(date){') && appJs.includes('rotateWindow:rotateWindow'));
t('Khong hoi quy: js/data.js khong doi (20 mau / 30 shop / 50 bai)',
  sha('js/data.js') === '76009b20bc339501db3ab2f6e96993e5a6c6f84d9d50e45a623cde6882d85fdf'
  && D.models.length === 20 && D.shops.length === 30 && D.articles.length === 50);
t('Khong hoi quy: bo loc tin tuyen shop + phan trang + form shop/dang tin van nguyen',
  ['fShopProv', 'fShopCat', 'fShopSort', 'fShopShift', 'fPayType', 'fPayMin'].every((id) => shopHtml.includes(`id="${id}"`))
  && shopHtml.includes('id="shopPager"') && shopHtml.includes('id="publicShopsList"')
  && shopHtml.includes('id="shopProfileForm"') && shopHtml.includes('id="shopSignIn"'));
t('Khong hoi quy: menu + nut Dang Nhap van du',
  shopHtml.includes('Dành cho Mẫu') && shopHtml.includes('Dành cho Shop') && shopHtml.includes('Đăng Nhập'));
t('Khong hoi quy: muc Lo hang xa kho (14 lo) + muc xuong may (40 xuong) van nguyen trong data.js; HTML chi con 4 container rong',
  D.lots.length === 14 && D.factories.length === 40
  && ['lotGrid1', 'lotGrid2', 'lotGrid3', 'factoryGrid'].every(id => shopHtml.includes('id="' + id + '"'))
  && !shopHtml.includes('<article class="lot-card"'));

// ---- (F) Hash khoa file da doi (v74) + CACHE ----
t("sw.js CACHE = 'v86-shell-1'", fs.readFileSync(path.join(root, 'sw.js'), 'utf8').includes("const CACHE = 'v86-shell-1';"));
t("sw.js khong con cache cu (v73)", !fs.readFileSync(path.join(root, 'sw.js'), 'utf8').includes('v73-shell-1'));
t('danh-sach-shop.html giong het v74 (them khoi hub Tim mau 11.11) (sha256)', sha('danh-sach-shop.html') === '42ae885d402e8e24c1e89b1063ae1f07483614fac7306a6f27eaea1a17bd0f56');
t('v20.css giong het v74 (them CSS .hub-card + responsive 360/280px) (sha256)', sha('v20.css') === '277d60ad92802afa8b68597fda4a2dd5f85c2c1edacd6fc44999b79dc3e47d87');
t('js/app.js giong het v74 (them hubZaloHref/hubCardHTML/hubResults/initHub + defaultModelOrder) (sha256)', sha('js/app.js') === 'ae11dfaf0e5383a7d2d2f1d8c33de31090f1a5fd39e0251edb0f8b69d4590a20');
t('sw.js giong het v74 (CACHE v86-shell-1) (sha256)', sha('sw.js') === 'f8ee524a81f0c741d07806d784d6aa113e1341495ff73653b7e05124d2cc4253');

console.log(`\n${pass} PASS, ${fail} FAIL`);
if (fail) process.exitCode = 1;
