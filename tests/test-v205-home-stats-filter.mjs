// test-v205-home-stats-filter.mjs — v205: (A) them 8 so lieu muc moi vao
// .trust-nums trang chu, CHI 2 hang (grid 8 cot); (B) o loc trang Mau/Shop
// chi 2 hang, 2 nut Ap dung / Dat lai ra hang 3 rieng can phai.
// Chay: node tests/test-v205-home-stats-filter.mjs (tu goc repo).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const index = read('index.html');
const css = read('v20.css');
const app = read('js/app.js');
const sw = read('sw.js');
const mau = read('danh-sach-mau.html');
const shop = read('danh-sach-shop.html');
let pass = 0, fail = 0;
function check(name, ok) {
  if (ok) { pass++; console.log('PASS ' + name); }
  else { fail++; console.log('FAIL ' + name); }
}

const NEW = [
  ['trustNewObjClassesLive', 'Lớp học Livestream / MC'],
  ['trustNewObjClassesMakeup', 'Lớp dạy Makeup'],
  ['trustNewObjEventsMarketing', 'Sự kiện Marketing'],
  ['trustNewObjLogistics', 'Logistics Trung – Việt'],
  ['trustNewObjRentals', 'Cho thuê cửa hàng / kho'],
  ['trustNewObjAgencyAds', 'Agency Ads Livestream'],
  ['trustNewObjMovingServices', 'Dịch vụ chuyển nhà'],
  ['trustNewObjLiveEquipment', 'Thiết bị phòng live'],
];
// A1. Trang chu: 16 o trust-num (8 cu + 8 moi)
check('index: dung 16 o trust-num', (index.match(/class="trust-num"/g) || []).length === 16);
NEW.forEach(([id, label]) => {
  check('index: co id ' + id + ' = 11', index.includes('<b id="' + id + '">11</b>'));
  check('index: nhan "' + label + '"', index.includes('<span>' + label + '</span>'));
});
['trustModels', 'trustShops', 'trustFactories', 'trustLots', 'trustBatch'].forEach((id) => {
  check('index: o cu ' + id + ' con', index.includes('id="' + id + '"'));
});
// A2. CSS: grid 8 cot, khong con 4 cot
check('css: .trust-nums grid 8 cot', /\.trust-nums\{display:grid;grid-template-columns:repeat\(8,1fr\)/.test(css));
check('css: khong con repeat(4,1fr) o .trust-nums', !/\.trust-nums\{display:grid;grid-template-columns:repeat\(4,1fr\)/.test(css));
// A3. JS: fill 8 so moi + bump CACHE
NEW.forEach(([id, type]) => {
  check('app.js: fill ' + id, app.includes("'" + id + "'"));
});
check('app.js: dung newObjCount cho so moi', app.includes("newObjCount(p[1])"));
check('sw.js: CACHE = v205-shell-1', sw.includes("const CACHE = 'v205-shell-1'"));
check('sw.js: khong con v200-shell-1', !sw.includes('v200-shell-1'));
// A4. Pin CACHE o 5 test cu da doi sang v205
['test-v200-online-summary.mjs', 'test-v197-hash-jump-2026-11-13.mjs', 'test-v198-categories-2026-11-13.mjs', 'test-v199-newobj-filter-sync.mjs', 'test-v201-game-rename.mjs'].forEach((f) => {
  check('pin ' + f + ' -> v205', read('tests/' + f).includes('v205-shell-1'));
});

// B. Loc Mau + Shop: grid chi chua o loc; nut ra hang rieng can phai.
function gridInner(html, gridId) {
  const m = html.match(new RegExp('<div class="filter-card cols-6" id="' + gridId + '">([\\s\\S]*?)</div>\\s*<div class="filter-actions">'));
  return m ? m[1] : null;
}
const mauGrid = gridInner(mau, 'uniFilter');
const shopGrid = gridInner(shop, 'shopFilter');
check('mau: grid uniFilter co dung 11 o loc', mauGrid && (mauGrid.match(/class="uni-field/g) || []).length === 11);
check('mau: grid khong con .uni-actions', mauGrid && !mauGrid.includes('uni-actions'));
check('mau: co div .filter-actions sau grid', mau.includes('<div class="filter-actions">'));
check('mau: nut Ap dung giu id uniApplyBtn trong .filter-actions', /<div class="filter-actions">[\s\S]*?id="uniApplyBtn"/.test(mau));
check('mau: nut Dat lai giu id uniResetBtn trong .filter-actions', /<div class="filter-actions">[\s\S]*?id="uniResetBtn"/.test(mau));
check('mau: hint/count/empty nam SAU .filter-actions (ngoai grid)', /<div class="filter-actions">[\s\S]*?<p class="filter-hint">/.test(mau));
check('mau: CSS .filter-actions can phai', mau.includes('.filter-actions{display:flex;justify-content:flex-end'));
check('shop: grid shopFilter co dung 8 o loc', shopGrid && (shopGrid.match(/class="uni-field/g) || []).length === 8);
check('shop: grid khong con .uni-actions', shopGrid && !shopGrid.includes('uni-actions'));
check('shop: co div .filter-actions sau grid', shop.includes('<div class="filter-actions">'));
check('shop: nut Ap dung giu id shopApplyBtn trong .filter-actions', /<div class="filter-actions">[\s\S]*?id="shopApplyBtn"/.test(shop));
check('shop: nut Dat lai giu id shopResetBtn trong .filter-actions', /<div class="filter-actions">[\s\S]*?id="shopResetBtn"/.test(shop));
check('shop: hint/count nam SAU .filter-actions (ngoai grid)', /<div class="filter-actions">[\s\S]*?<p class="filter-hint">/.test(shop));
check('shop: CSS .filter-actions can phai', shop.includes('.filter-actions{display:flex;justify-content:flex-end'));
// Nav khong doi
check('mau: nav con "Dành cho Mẫu"', mau.includes('Dành cho Mẫu'));
check('shop: nav con "Dành cho Shop"', shop.includes('Dành cho Shop'));
check('mau: switch van du nut (khong dung v204)', mau.includes('data-uni-cat="class-live"') && mau.includes('style="display:none" data-uni-cat="class-live"'));
check('shop: switch van du nut (khong dung v204)', shop.includes('style="display:none" data-uni-cat="event-mkt"'));

console.log(pass + ' PASS / ' + fail + ' FAIL');
process.exit(fail ? 1 : 0);
