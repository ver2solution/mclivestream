/* v64 tests — Node only, no browser. v64 = 4 thay doi theo yeu cau nguoi dung
   15:35–15:39 ngay 06/11/2026:
   (A) Tin tuc: bo ghi chu section-head duoi H1 (giong trang Mau/Shop o v62).
   (B) Khoang cach tieu de -> noi dung xuong 1/3 (toan site, ap cho Shop/Mau/
       Tin tuc + cac muc moi sau nay): .section-head h1{margin:0} (bo margin
       mac dinh trinh duyet ~21px — nguyen nhan khoang cach lon trong anh
       nguoi dung gui) + .section-head margin-bottom 16->5px (1/3 cua 16px).
   (C) Xoay 3 lan/ngay, moi 8 tieng (cua so 00:00/08:00/16:00 gio VN) thay
       xoay 1 lan/ngay: trang Shop (the shop + the lo + the xuong may) +
       trang Mau + trang chu. Trang chu uu tien: mau CO anh that, shop CO
       logo ro (3 shop: sh-01 Cham Loa, sh-09 FANI, sh-24 Mylan).
   (D) Muc xuong may chi show 2 hang (6 the) mac dinh — khoa lai hanh vi
       da co tu v60 (collapsed + CSS an the 7+). */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let pass = 0, fail = 0;
function t(name, cond, extra = '') { if (cond) { pass++; console.log('PASS v64:', name); } else { fail++; console.log('FAIL v64:', name, extra); } }
const sha = (p) => crypto.createHash('sha256').update(fs.readFileSync(path.join(root, p))).digest('hex');

const newsHtml = fs.readFileSync(path.join(root, 'tin-tuc.html'), 'utf8');
const shopHtml = fs.readFileSync(path.join(root, 'danh-sach-shop.html'), 'utf8');
const css = fs.readFileSync(path.join(root, 'v20.css'), 'utf8');
const appJs = fs.readFileSync(path.join(root, 'js/app.js'), 'utf8');

// ---- chay app.js trong vm de test ham xoay (theo mau loadData cua test-v24) ----
const sb = { window: {}, module: { exports: {} }, console, document: { querySelectorAll: () => [], getElementById: () => null, addEventListener: () => {} }, location: { search: '' } };
sb.window = sb.window || {};
vm.createContext(sb);
vm.runInContext(fs.readFileSync(path.join(root, 'js/data.js'), 'utf8'), sb);
vm.runInContext(fs.readFileSync(path.join(root, 'js/app.js'), 'utf8'), sb);
const V = sb.window.V20;
const D = sb.window.V20_DATA;
const W = (y, mo, d, h) => new Date(Date.UTC(y, mo, d, h - 7, 0)); // h = gio Saigon (window8h dem theo gio Saigon; suite chay duoi UTC)

// ---- (A) Tin tuc: bo ghi chu ----
t('Tin tuc: khong con ghi chu duoi H1', !newsHtml.includes('Tin mới nhất xếp trước'));
t('Tin tuc: H1 van nguyen', newsHtml.includes('<h1>Tin tức thị trường</h1>'));
t('Tin tuc: khung notice ve so lieu VAN con (chi bo ghi chu section-head)', newsHtml.includes('Lưu ý về số liệu'));

// ---- (B) Khoang cach tieu de -> noi dung xuong 1/3 ----
t('CSS: .section-head h1 margin 0 (bo margin mac dinh trinh duyet)', css.includes('.section-head h1{margin:0'));
t('CSS: section-head margin-bottom 16->5px (1/3)', css.includes('margin-bottom:5px}'));
t('CSS: .section van 17px (v62, khong doi)', css.includes('.section{margin:17px 0}'));

// ---- (C1) window8h: cua so 00:00/08:00/16:00 gio VN ----
t('window8h: 00:00-07:59 cung cua so, 08:00-15:59 cung cua so, 16:00-23:59 cung cua so',
  V.window8h(W(2026, 10, 6, 0)) === V.window8h(W(2026, 10, 6, 7))
  && V.window8h(W(2026, 10, 6, 8)) === V.window8h(W(2026, 10, 6, 15))
  && V.window8h(W(2026, 10, 6, 16)) === V.window8h(W(2026, 10, 6, 23)));
t('window8h: 3 cua so khac nhau trong 1 ngay',
  new Set([V.window8h(W(2026, 10, 6, 0)), V.window8h(W(2026, 10, 6, 8)), V.window8h(W(2026, 10, 6, 16))]).size === 3);

// ---- (C2) rotateWindow: on dinh trong cua so, doi sau moi 8 tieng ----
t('rotateWindow: cung cua so cho cung thu tu, cua so ke cho thu tu khac (khong doi tap hop)',
  (() => {
    const a = V.rotateWindow(D.models, V.photoTier, W(2026, 10, 6, 8)).map(m => m.id);
    const b = V.rotateWindow(D.models, V.photoTier, W(2026, 10, 6, 15)).map(m => m.id);
    const c = V.rotateWindow(D.models, V.photoTier, W(2026, 10, 6, 16)).map(m => m.id);
    return a.join(',') === b.join(',') && a.join(',') !== c.join(',')
      && a.slice().sort().join(',') === c.slice().sort().join(',');
  })());

// ---- (C3) homeTop8: xoay 3 lan/ngay, van chi co anh that ----
t('homeTop8: 3 cua so trong ngay cho 3 thu tu khac nhau, tat ca co anh that',
  (() => {
    const orders = [0, 8, 16].map(h => V.homeTop8(D.models, W(2026, 10, 6, h)).map(m => m.id).join(','));
    return new Set(orders).size === 3
      && orders.every(o => o.split(',').length === 8)
      && [0, 8, 16].every(h => V.homeTop8(D.models, W(2026, 10, 6, h)).every(m => !!m.photoUrl));
  })());

// ---- (C4) defaultShopOrder: logo ro len truoc + xoay 3 lan/ngay ----
t('defaultShopOrder: 3 shop co logo that (sh-01/sh-09/sh-24) luon o 3 vi tri dau, xoay trong nhom',
  (() => {
    const a = V.defaultShopOrder(D.shops, W(2026, 10, 6, 8)).map(s => s.id);
    const b = V.defaultShopOrder(D.shops, W(2026, 10, 6, 16)).map(s => s.id);
    const logoIds = ['sh-01', 'sh-09', 'sh-24'];
    const first3a = a.slice(0, 3).slice().sort().join(',');
    const first3b = b.slice(0, 3).slice().sort().join(',');
    return first3a === logoIds.slice().sort().join(',')
      && first3b === logoIds.slice().sort().join(',')
      && a.slice(0, 3).join(',') !== b.slice(0, 3).join(',')
      && a.slice().sort().join(',') === b.slice().sort().join(',');
  })());
t('defaultShopOrder: trang chu dung defaultShopOrder (khong dung sortShopsNewest truc tiep)',
  appJs.includes('defaultShopOrder(D.shops||[]).slice(0,6)'));

// ---- (C5) Trang Shop: mac dinh dung defaultShopOrder; chon sap xep thi khong xoay ----
t('Trang Shop: mac dinh dung defaultShopOrder, chon sap xep thi dung sortShopsBy (khong xoay)',
  appJs.includes('defaultShopOrder(D.shops||[])') && appJs.includes('sortShopsBy(D.shops||[],f.sort)'));

// ---- (C6) rotateStaticGrids: xoay the lo + xuong may trong tung grid ----
t('rotateStaticGrids: xoay vong the trong tung .lot-grid theo cua so 8 tieng',
  (() => {
    // fake DOM: 2 grid (lo 8 the, xuong 20 the), moi the la 1 object co id
    const mkGrid = (n, prefix) => {
      const kids = Array.from({ length: n }, (_, i) => ({ id: prefix + (i + 1) }));
      return { children: kids, appendChild(c) { const ix = this.children.indexOf(c); if (ix >= 0) this.children.splice(ix, 1); this.children.push(c); } };
    };
    const g1 = mkGrid(8, 'lot'), g2 = mkGrid(20, 'fac');
    const origDoc = sb.document;
    sb.document = { querySelectorAll: () => [g1, g2] };
    V.rotateStaticGrids(W(2026, 10, 6, 8));
    const order8 = g1.children.map(c => c.id).join(',');
    const g1b = mkGrid(8, 'lot');
    sb.document = { querySelectorAll: () => [g1b] };
    V.rotateStaticGrids(W(2026, 10, 6, 16));
    const order16 = g1b.children.map(c => c.id).join(',');
    sb.document = origDoc;
    return order8 !== 'lot1,lot2,lot3,lot4,lot5,lot6,lot7,lot8'
      && order8 !== order16
      && g1.children.length === 8 && g2.children.length === 20;
  })());
t('initShops goi renderLotSections ngay dau (v76: render the lo/xuong truoc khi xoay + loc), roi moi rotateStaticGrids',
  (() => { const i = appJs.indexOf('function initShops(){'); const body = appJs.slice(i, i + 400); return body.indexOf('renderLotSections();') > -1 && body.indexOf('renderLotSections();') < body.indexOf('rotateStaticGrids();') && body.indexOf('rotateStaticGrids();') < body.indexOf('initLotFilter()'); })());

// ---- (D) Muc xuong may chi show 2 hang (6 the) mac dinh ----
t('Xuong may: section co class collapsed + CSS an the 7+ (chi show 2 hang)',
  shopHtml.includes('id="xuong-may-gia-cong"') && shopHtml.includes('class="lot-section collapsed"')
  && css.includes('.lot-section.collapsed .lot-grid .lot-card:nth-child(n+7){display:none}'));
t('Xuong may: du 20 the, nut Xem them rieng',
  (shopHtml.match(/id="xuong-may-gia-cong"/g) || []).length === 1
  && shopHtml.includes('id="factoryMoreBtn"'));

// ---- (E) Hash khoa file da doi (v64) ----
t('tin-tuc.html giong het v64 (bo ghi chu section-head) (sha256)', sha('tin-tuc.html') === '0f462574e8c5afc7b09d179d4ec691f96fda11f1646c7aa6cc58eab136e529ac');
t('v20.css giong het v64 (h1 margin 0 + section-head 5px + loc lot-filtered-out) (sha256)', sha('v20.css') === '277d60ad92802afa8b68597fda4a2dd5f85c2c1edacd6fc44999b79dc3e47d87');
t('js/app.js giong het v64 (xoay 8h + uu tien logo + xoay the tinh + loc lo/xuong) (sha256)', sha('js/app.js') === 'ae11dfaf0e5383a7d2d2f1d8c33de31090f1a5fd39e0251edb0f8b69d4590a20');


// ---- (F) Bo loc lo/xuong (trang Shop) ----
const shopHtml2 = fs.readFileSync(path.join(root, 'danh-sach-shop.html'), 'utf8');
t('Loc lo: du 3 o loc + nut Ap dung/Dat lai + dong dem + dong rong',
  ['fLotPrice', 'fLotQty', 'fLotCat', 'lotApplyBtn', 'lotResetBtn', 'lotCount', 'lotEmpty'].every(id => shopHtml2.includes('id="' + id + '"')));
t('Loc xuong: du 3 o loc + nut Ap dung/Dat lai + dong dem + dong rong',
  ['fFacProv', 'fFacValue', 'fFacMoq', 'fFacCat', 'factoryApplyBtn', 'factoryResetBtn', 'factoryCount', 'factoryEmpty'].every(id => shopHtml2.includes('id="' + id + '"')));
t('Loc lo: 14 lo trong data.js co du truong data-price/data-qty/data-cat (the render mang du thuoc tinh de loc)',
  D.lots.length === 14 && D.lots.every(l => 'priceNum' in l && 'qty' in l && !!l.cat));
t('Loc xuong: 40 xuong trong data.js co du truong data-moq/data-cat/data-prov; tong 54 muc co data-cat',
  D.factories.length === 40 && D.factories.every(f => 'moq' in f && !!f.cat && !!f.prov)
  && D.lots.length + D.factories.length === 54);
t('CSS: the khong khop bo loc luon an (.lot-filtered-out)',
  css.includes('.lot-card.lot-filtered-out{display:none}'));
t('lotMatches: loc dung gia + so luong + mat hang (the thieu du lieu thi khong khop)',
  (() => {
    const card = (attrs) => ({ getAttribute: (k) => (k in attrs ? attrs[k] : null) });
    const lo1 = card({ 'data-price': '6500', 'data-qty': '8000', 'data-cat': 'quan-ao' });
    const loMyPham = card({ 'data-price': '60000', 'data-qty': '', 'data-cat': 'my-pham' });
    const loNoPrice = card({ 'data-price': '', 'data-qty': '', 'data-cat': 'quan-ao' });
    return V.lotMatches(lo1, { price: 'lt20', qty: 'gt5000', cat: 'quan-ao' })
      && !V.lotMatches(lo1, { price: 'gt100' })
      && !V.lotMatches(lo1, { qty: 'lt500' })
      && !V.lotMatches(lo1, { cat: 'my-pham' })
      && V.lotMatches(loMyPham, { price: '50-100', cat: 'my-pham' })
      && !V.lotMatches(loMyPham, { qty: 'lt500' })
      && !V.lotMatches(loNoPrice, { price: 'lt20' })
      && V.lotMatches(loNoPrice, { cat: 'quan-ao' })
      && V.lotMatches(lo1, {});
  })());
t('facMatches: loc dung gia tri don (quy mo MOQ) + so luong toi thieu + mat hang',
  (() => {
    const card = (attrs) => ({ getAttribute: (k) => (k in attrs ? attrs[k] : null) });
    const f10 = card({ 'data-moq': '10', 'data-cat': 'giay-dep' });
    const f100 = card({ 'data-moq': '100', 'data-cat': 'quan-ao' });
    const fNoMoq = card({ 'data-moq': '', 'data-cat': 'quan-ao' });
    return V.facMatches(f10, { value: 'small', moq: '30', cat: 'giay-dep' })
      && !V.facMatches(f10, { value: 'large' })
      && !V.facMatches(f10, { moq: '10' }) === false // MOQ 10 <= 10 -> khop
      && V.facMatches(f100, { value: 'medium' })
      && !V.facMatches(f100, { value: 'small' })
      && !V.facMatches(f100, { moq: '30' }) // MOQ 100 > 30 -> khong nhan don 30
      && V.facMatches(f100, { moq: '100' })
      && !V.facMatches(fNoMoq, { value: 'small' })
      && V.facMatches(fNoMoq, { cat: 'quan-ao' })
      && V.facMatches(f10, {});
  })());
t('Ap dung loc: chi hien the khop, dem dung, mo rong section, CUON toi the khop dau tien',
  (() => {
    // fake DOM toi gian cho 1 section co 1 grid 4 the
    const mkCard = (attrs) => {
      const cls = new Set();
      return { _a: attrs, getAttribute(k) { return k in this._a ? this._a[k] : null; },
        classList: { add(c) { cls.add(c); }, remove(c) { cls.delete(c); }, contains(c) { return cls.has(c); } },
        scrollCalls: 0, scrollIntoView() { this.scrollCalls++; } };
    };
    const cards = [
      mkCard({ 'data-price': '6500', 'data-qty': '8000', 'data-cat': 'quan-ao' }),
      mkCard({ 'data-price': '60000', 'data-qty': '', 'data-cat': 'my-pham' }),
      mkCard({ 'data-price': '', 'data-qty': '', 'data-cat': 'quan-ao' }),
      mkCard({ 'data-price': '12000', 'data-qty': '300', 'data-cat': 'nu' }),
    ];
    const grid = { children: cards.slice(), appendChild(c) { const i = this.children.indexOf(c); if (i >= 0) this.children.splice(i, 1); this.children.push(c); } };
    const secCls = new Set(['collapsed']);
    const section = { classList: { add(c) { secCls.add(c); }, remove(c) { secCls.delete(c); }, contains(c) { return secCls.has(c); } },
      querySelectorAll(sel) { return sel === '.lot-grid' ? [grid] : []; } };
    const moreBtn = { setAttribute() {}, textContent: '' };
    const mkSel = (v) => ({ value: v });
    const sels = { fLotPrice: mkSel('lt20'), fLotQty: mkSel(''), fLotCat: mkSel('') };
    const applyBtn = { _h: null, addEventListener(e, fn) { this._h = fn; }, click() { this._h(); } };
    const resetBtn = { _h: null, addEventListener(e, fn) { this._h = fn; }, click() { this._h(); } };
    const countEl = { textContent: '' };
    const emptyEl = { hidden: true };
    const byId = { 'lo-hang-xa-kho': section, lotMoreBtn: moreBtn, lotApplyBtn: applyBtn, lotResetBtn: resetBtn, lotCount: countEl, lotEmpty: emptyEl,
      fLotPrice: sels.fLotPrice, fLotQty: sels.fLotQty, fLotCat: sels.fLotCat };
    const origDoc = sb.document;
    sb.document = { getElementById(id) { return byId[id] || null; }, querySelectorAll() { return []; } };
    V.initLotFilter();
    applyBtn.click();
    const ok = countEl.textContent === '2 lô khớp bộ lọc'
      && !secCls.has('collapsed')
      && cards[0].classList.contains('lot-filtered-out') === false
      && cards[3].classList.contains('lot-filtered-out') === false
      && cards[1].classList.contains('lot-filtered-out') === true
      && cards[2].classList.contains('lot-filtered-out') === true
      && cards[0].scrollCalls === 1
      && grid.children[0] === cards[0] && grid.children[1] === cards[3];
    // Dat lai: tra thu tu goc + thu gon lai + xoa dem
    resetBtn.click();
    const okReset = secCls.has('collapsed') && countEl.textContent === ''
      && cards.every(c => !c.classList.contains('lot-filtered-out'))
      && grid.children.map(c => cards.indexOf(c)).join(',') === '0,1,2,3';
    sb.document = origDoc;
    return ok && okReset;
  })());
t('Ap dung loc 0 ket qua: hien dong rong + cuon toi section',
  (() => {
    const mkCard = (attrs) => {
      const cls = new Set();
      return { _a: attrs, getAttribute(k) { return k in this._a ? this._a[k] : null; },
        classList: { add(c) { cls.add(c); }, remove(c) { cls.delete(c); }, contains(c) { return cls.has(c); } },
        scrollCalls: 0, scrollIntoView() { this.scrollCalls++; } };
    };
    const cards = [mkCard({ 'data-price': '6500', 'data-qty': '8000', 'data-cat': 'quan-ao' })];
    const grid = { children: cards.slice(), appendChild(c) { const i = this.children.indexOf(c); if (i >= 0) this.children.splice(i, 1); this.children.push(c); } };
    const secCls = new Set(['collapsed']);
    let secScroll = 0;
    const section = { classList: { add(c) { secCls.add(c); }, remove(c) { secCls.delete(c); }, contains(c) { return secCls.has(c); } },
      querySelectorAll(sel) { return sel === '.lot-grid' ? [grid] : []; },
      scrollIntoView() { secScroll++; } };
    const moreBtn = { setAttribute() {}, textContent: '' };
    const sels = { fLotPrice: { value: 'gt100' }, fLotQty: { value: '' }, fLotCat: { value: '' } };
    const applyBtn = { _h: null, addEventListener(e, fn) { this._h = fn; }, click() { this._h(); } };
    const resetBtn = { _h: null, addEventListener(e, fn) { this._h = fn; }, click() { this._h(); } };
    const countEl = { textContent: '' };
    const emptyEl = { hidden: true };
    const byId = { 'lo-hang-xa-kho': section, lotMoreBtn: moreBtn, lotApplyBtn: applyBtn, lotResetBtn: resetBtn, lotCount: countEl, lotEmpty: emptyEl,
      fLotPrice: sels.fLotPrice, fLotQty: sels.fLotQty, fLotCat: sels.fLotCat };
    const origDoc = sb.document;
    sb.document = { getElementById(id) { return byId[id] || null; }, querySelectorAll() { return []; } };
    V.initLotFilter();
    applyBtn.click();
    sb.document = origDoc;
    return countEl.textContent === '0 lô khớp bộ lọc' && emptyEl.hidden === false && secScroll === 1;
  })());

console.log(`v64: ${pass} PASS, ${fail} FAIL`);
process.exit(fail ? 1 : 0);
