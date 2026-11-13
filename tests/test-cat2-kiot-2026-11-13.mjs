/* Test v196 — 2 muc moi trang Thanh ly Kiot: 'Dich vu chuyen nha' +
   'Thiet bi Phong Live' (13/11/2026, anh Tho chot 13:49 — them 2 muc con
   trong trang Thanh ly Kiot, menu/loc dong bo nhu mau/shop/lo/xuong/kiot,
   nav chinh giu nguyen 7 muc theo form v194 da khoa 13:35).
   Goi: js/data.js (2 mang moi) + js/app.js (NEWOBJ x7) + js/search.js
   (2 loai tim kiem moi) + thanh-ly-kiot.html (switch 3 nut + 2 section +
   script chuyen muc) + sw.js (CACHE v196-shell-1).
   Node only, no browser. Chay: node tests/test-cat2-kiot-2026-11-13.mjs
   Luu y duong dan: data.js/search.js/thanh-ly-kiot.html/sw.js trong prep
   nay = live (da doi chieu md5 truoc khi sua); app.js trong prep giu them
   code v185 + fix parseMonthlyMax chua deploy — goi deploy v196 lay
   app.js tu LIVE + cung patch (staging hidden_files/cat2-livebase).
   Bao phu: du lieu (11 muc/mang, id duy nhat, gia > 0, avatar ton tai),
   cau hinh app.js/search.js, HTML (switch + section + nav 7 muc),
   render that qua DOM shim (11 the/muc, dem H2, dem nut (11)). */
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const staging = root;
let pass = 0, fail = 0;
function t(name, cond, extra = '') {
  if (cond) { pass++; console.log('PASS v196:', name); }
  else { fail++; console.log('FAIL v196:', name, extra); }
}
const readPrep = (f) => fs.readFileSync(path.join(root, f), 'utf8');
const readStaging = (f) => fs.readFileSync(path.join(staging, f), 'utf8');

/* ---- DOM shim toi thieu (mau test-v130 / test-v184) ---- */
function mockEl() {
  return { innerHTML: '', textContent: '', style: {}, hidden: false, value: '',
    classList: { _s: new Set(), add(c) { this._s.add(c); }, remove(c) { this._s.delete(c); }, toggle(c) { this._s.has(c) ? this._s.delete(c) : this._s.add(c); }, contains(c) { return this._s.has(c); } },
    setAttribute() {}, getAttribute() { return null; }, appendChild() {}, addEventListener() {}, closest: () => null };
}
const els = {};
function el(id) { if (!els[id]) els[id] = mockEl(); return els[id]; }
const switchBtns = ['kiot', 'chuyen-nha', 'thiet-bi-live'].map((cat) => {
  const span = mockEl();
  const b = mockEl();
  b.getAttribute = (a) => (a === 'data-uni-cat' ? cat : null);
  b.querySelector = (sel) => (sel === '.uni-cat-count' ? span : null);
  b._span = span;
  return b;
});
const sb = {
  window: {}, module: { exports: {} }, console, URLSearchParams,
  document: { getElementById: (id) => els[id] || null, addEventListener: () => {},
    querySelectorAll: (sel) => (sel === '.uni-cat-btn[data-uni-cat]' ? switchBtns : []),
    querySelector: () => null },
};
vm.createContext(sb);
vm.runInContext(readPrep('js/data.js'), sb);
vm.runInContext(readStaging('js/app.js'), sb);
const D = sb.window.V20_DATA;
const V = sb.window.V20;
const appJs = readStaging('js/app.js');
const searchJs = readPrep('js/search.js');
const kiotHtml = readPrep('thanh-ly-kiot.html');
const swJs = readStaging('sw.js');

/* ================= A. Du lieu ================= */
for (const [arr, pfx, page] of [['movingServices', 'mv', 'thanh-ly-kiot.html'], ['liveEquipment', 'le', 'thanh-ly-kiot.html']]) {
  const a = D[arr];
  t(`${arr}: 11 muc (1 mau + 10 that)`, Array.isArray(a) && a.length === 11, 'got ' + (a && a.length));
  t(`${arr}: id ${pfx}-01..${pfx}-11 du, duy nhat`, a && new Set(a.map((x) => x.id)).size === 11 && a.every((x, i) => x.id === `${pfx}-${String(i + 1).padStart(2, '0')}`));
  t(`${arr}: type dung`, a && a.every((x) => x.type === arr));
  t(`${arr}: gia > 0, co avatar`, a && a.every((x) => x.price > 0 && x.avatar));
  t(`${arr}: avatar ton tai trong prep`, a && a.every((x) => fs.existsSync(path.join(root, x.avatar))), a && a.filter((x) => !fs.existsSync(path.join(root, x.avatar))).map((x) => x.avatar).join(','));
  t(`${arr}: 10 muc that co sourceUrl Facebook`, a && a.slice(1).every((x) => /^https:\/\/www\.facebook\.com\//.test(x.sourceUrl || '')));
  t(`${arr}: placeholder sourceUrl noi bo`, a && a[0].sourceUrl === `https://vieclamlivestream.online/${page}#${pfx}-01`);
  t(`${arr}: dateAdded 2026-11-13, expiresAt 2026-12-13`, a && a.every((x) => x.dateAdded === '2026-11-13' && x.expiresAt === '2026-12-13'));
}
t('5 mang cu khong doi so luong', D.classesLive.length === 11 && D.classesMakeup.length === 11 && D.eventsMarketing.length === 11 && D.logistics.length === 11 && D.rentals.length === 11);
t('articles van 218', D.articles.length === 218);

/* ================= B. Cau hinh app.js ================= */
t('NEWOBJ_TYPES co 7 muc, 2 muc moi tro ve thanh-ly-kiot.html',
  V.NEWOBJ_TYPES.movingServices && V.NEWOBJ_TYPES.movingServices.page === 'thanh-ly-kiot.html' &&
  V.NEWOBJ_TYPES.liveEquipment && V.NEWOBJ_TYPES.liveEquipment.page === 'thanh-ly-kiot.html' &&
  Object.keys(V.NEWOBJ_TYPES).length === 7);
t('NEWOBJ_ARRAYS 7 muc', Array.isArray(V.NEWOBJ_ARRAYS) && V.NEWOBJ_ARRAYS.length === 7 && V.NEWOBJ_ARRAYS.includes('movingServices') && V.NEWOBJ_ARRAYS.includes('liveEquipment'));
t('NEWOBJ_UNI_CATS: chuyen-nha/thiet-bi-live dung provId kiotProv',
  V.NEWOBJ_UNI_CATS['chuyen-nha'] && V.NEWOBJ_UNI_CATS['chuyen-nha'].type === 'movingServices' && V.NEWOBJ_UNI_CATS['chuyen-nha'].provId === 'kiotProv' &&
  V.NEWOBJ_UNI_CATS['thiet-bi-live'] && V.NEWOBJ_UNI_CATS['thiet-bi-live'].type === 'liveEquipment' && V.NEWOBJ_UNI_CATS['thiet-bi-live'].provId === 'kiotProv');
t('NEWOBJ_SECTIONS 7 muc, 2 grid moi', Array.isArray(V.NEWOBJ_SECTIONS) && V.NEWOBJ_SECTIONS.length === 7 &&
  V.NEWOBJ_SECTIONS.some((s) => s.type === 'movingServices' && s.gridId === 'movingGrid') &&
  V.NEWOBJ_SECTIONS.some((s) => s.type === 'liveEquipment' && s.gridId === 'liveEquipGrid'));
t('app.js co 2 lenh initNewObjSection cho 2 muc moi',
  appJs.includes("sectionId: 'dich-vu-chuyen-nha'") && appJs.includes("sectionId: 'thiet-bi-phong-live'") &&
  appJs.includes("provId: 'kiotProv'"));
t('newObjCount: 11/11', V.newObjCount('movingServices') === 11 && V.newObjCount('liveEquipment') === 11);

/* ================= C. Render that qua DOM shim ================= */
['movingGrid', 'liveEquipGrid', 'movingSub', 'liveEquipSub', 'movingCountH2', 'liveEquipCountH2'].forEach((id) => el(id));
V.renderNewObjSections();
function countCards(html) { return (html.match(/<article/g) || []).length; }
t('render: movingGrid 11 the', countCards(el('movingGrid').innerHTML) === 11, 'got ' + countCards(el('movingGrid').innerHTML));
t('render: liveEquipGrid 11 the', countCards(el('liveEquipGrid').innerHTML) === 11, 'got ' + countCards(el('liveEquipGrid').innerHTML));
t('render: the chua dung id + ten + gia', el('movingGrid').innerHTML.includes('id="mv-02"') && el('liveEquipGrid').innerHTML.includes('id="le-10"') &&
  el('movingGrid').innerHTML.includes('Giá dịch vụ') && el('liveEquipGrid').innerHTML.includes('Giá bán'));
t('render: H2 dem (11)', el('movingCountH2').textContent === '(11)' && el('liveEquipCountH2').textContent === '(11)');
t('render: nut switch dem (11)', (() => { V.refreshNewObjCatCounts(); return switchBtns[1]._span.textContent === '(11)' && switchBtns[2]._span.textContent === '(11)'; })());
t('render: 5 muc cu van render du', (() => {
  ['classLiveGrid', 'classMakeupGrid', 'eventMarketingGrid', 'logisticsGrid', 'rentalsGrid'].forEach((id) => el(id));
  V.renderNewObjSections();
  return ['classLiveGrid', 'classMakeupGrid', 'eventMarketingGrid', 'logisticsGrid', 'rentalsGrid'].every((id) => countCards(el(id).innerHTML) === 11);
})());

/* ================= D. search.js ================= */
t('search.js TYPE_LABELS co 2 loai moi', searchJs.includes("'chuyen-nha': 'Dịch vụ chuyển nhà'") && searchJs.includes("'thiet-bi-live': 'Thiết bị Phòng Live'"));
t('search.js TYPE_ORDER co 2 loai moi truoc bai', searchJs.includes("'thue-mb', 'chuyen-nha', 'thiet-bi-live', 'bai'"));
t('search.js NEWOBJ_META tro ve thanh-ly-kiot.html', searchJs.includes("'chuyen-nha': {label: 'Dịch vụ chuyển nhà', page: 'thanh-ly-kiot.html'}") &&
  searchJs.includes("'thiet-bi-live': {label: 'Thiết bị Phòng Live', page: 'thanh-ly-kiot.html'}"));
t('search.js NEWOBJ_DATA_MAP dung mang', searchJs.includes("'chuyen-nha': 'movingServices'") && searchJs.includes("'thiet-bi-live': 'liveEquipment'"));
t('search.js countByType co 2 loai moi', searchJs.includes("'chuyen-nha': 0, 'thiet-bi-live': 0"));

/* ================= E. thanh-ly-kiot.html ================= */
t('switch co 3 nut: kiot (active) + 2 muc moi co span dem',
  (kiotHtml.match(/data-uni-cat="kiot"/g) || []).length === 1 &&
  (kiotHtml.match(/data-uni-cat="chuyen-nha"/g) || []).length === 1 &&
  (kiotHtml.match(/data-uni-cat="thiet-bi-live"/g) || []).length === 1 &&
  kiotHtml.includes('class="uni-cat-btn active" data-uni-cat="kiot"'));
t('2 section moi du id (grid/count/empty/more/H2/sub)', ['dich-vu-chuyen-nha', 'thiet-bi-phong-live', 'movingGrid', 'liveEquipGrid', 'movingCount', 'liveEquipCount', 'movingEmpty', 'liveEquipEmpty', 'movingMoreBtn', 'liveEquipMoreBtn', 'movingCountH2', 'liveEquipCountH2'].every((id) => kiotHtml.includes(`id="${id}"`)));
t('2 section moi mac dinh an (hidden) + collapsed', kiotHtml.includes('id="dich-vu-chuyen-nha" aria-labelledby="moving-title" hidden') && kiotHtml.includes('id="thiet-bi-phong-live" aria-labelledby="liveequip-title" hidden'));
t('kiotListWrap bao danh sach kiot', kiotHtml.includes('<div id="kiotListWrap">') && kiotHtml.includes('</div>\n<section class="lot-section filter-section collapsed rows-1" id="dich-vu-chuyen-nha"'));
t('script chuyen muc co setKiotCat + hash', kiotHtml.includes('function setKiotCat(cat)') && kiotHtml.includes("'#dich-vu-chuyen-nha': 'chuyen-nha'") && kiotHtml.includes("'#thiet-bi-phong-live': 'thiet-bi-live'"));
t('nav chinh van 7 muc dung form v194 (khong them/xoa)',
  (() => { const m = kiotHtml.match(/<nav class="main-nav" id="mainNav">([\s\S]*?)<\/nav>/); if (!m) return false;
    const links = [...m[1].matchAll(/href="([^"]+)"/g)].map((x) => x[1]);
    return links.length === 7 && links.join('|') === 'index.html|danh-sach-shop.html|danh-sach-mau.html|thanh-ly-kiot.html|tin-tuc.html|hoi-dap.html|dang-ky.html?type=model'; })());

/* ================= F. sw.js ================= */
t('CACHE v196-shell-1', swJs.includes("const CACHE = 'v196-shell-1'") && !swJs.includes("v195-shell-1"));

console.log(`\nv196: ${pass} PASS, ${fail} FAIL`);
process.exit(fail ? 1 : 0);
