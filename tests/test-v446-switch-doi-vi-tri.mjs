// test-v446-switch-doi-vi-tri.mjs — v446 (25/11/2026, anh quyet 22:52):
// (1) Doi vi tri 2 nut switch tren danh-sach-mau.html: Agency Ads
//     Livestream len dong 1 (vi tri 4), Logistics Trung-Viet xuong dong 2
//     (vi tri 2); thu tu nut: model, lot, factory, agency-ads,
//     logistics-noi-dia, logistics.
// (2) Dong 2 xep gon ve trai: moi nut dung dung 1 o (25%), KHONG gian
//     ra het hang — v20.css .list-switch .uni-cat-btn flex-grow:0
//     (v445 de flex-grow:1 nen 2 nut dong 2 gian moi nut ~50% rong).
// (3) CACHE v446 (v20.css trong SHELL).
// Chạy: node tests/test-v446-switch-doi-vi-tri.mjs (từ gốc repo).
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let pass = 0, fail = 0;
function check(name, ok, extra) {
  if (ok) { pass++; console.log('PASS ' + name); }
  else { fail++; console.log('FAIL ' + name + (extra !== undefined ? ' — ' + extra : '')); }
}

/* ---------- (1) Thu tu nut switch tren danh-sach-mau.html ---------- */
const mauHtml = fs.readFileSync(path.join(root, 'danh-sach-mau.html'), 'utf8');
const switchBlock = (mauHtml.match(/<div class="uni-cat-switch list-switch"[\s\S]*?<\/div>/) || [])[0] || '';
const order = [...switchBlock.matchAll(/data-uni-cat="([^"]+)"/g)].map(function (m) { return m[1]; });
const expected = ['model', 'lot', 'factory', 'agency-ads', 'logistics-noi-dia', 'logistics'];
check('(1) thu tu 6 nut switch dung: model, lot, factory, agency-ads, logistics-noi-dia, logistics',
  JSON.stringify(order) === JSON.stringify(expected), 'got ' + order.join(','));
check('(1) Agency Ads o vi tri 4 (dong 1, cuoi)', order[3] === 'agency-ads', 'got ' + order[3]);
check('(1) Logistics Trung-Viet o vi tri 6 (dong 2, thu 2)', order[5] === 'logistics', 'got ' + order[5]);
check('(1) Logistics noi dia o vi tri 5 (dong 2, dau)', order[4] === 'logistics-noi-dia', 'got ' + order[4]);
check('(1) nut active van la Tim Mau (data-uni-cat="model")',
  /class="uni-cat-btn active" data-uni-cat="model"/.test(switchBlock));
check('(1) 6 nut, khong trung data-uni-cat', order.length === 6 && new Set(order).size === 6, 'got ' + order.length);

/* ---------- (2) CSS: dong 2 khong gian ---------- */
const css = fs.readFileSync(path.join(root, 'v20.css'), 'utf8');
check('(2) v20.css: .list-switch .uni-cat-btn flex:0 1 calc(25% - 5px) (khong grow)',
  css.includes('.uni-cat-switch.list-switch .uni-cat-btn{flex:0 1 calc(25% - 5px)}'));
check('(2) v20.css: khong con flex:1 1 calc(25% - 5px) cho .list-switch (v445 cu)',
  !css.includes('.uni-cat-switch.list-switch .uni-cat-btn{flex:1 1 calc(25% - 5px)}'));
check('(2) v20.css: luat mobile list-switch (cuon ngang) van giu nguyen',
  css.includes('@media(max-width:600px){.uni-cat-switch.list-switch{flex-direction:row;flex-wrap:nowrap;overflow-x:auto'));
check('(2) v20.css: .list-switch bo tron 16px van giu', css.includes('.uni-cat-switch.list-switch{border-radius:16px}'));

/* ---------- (3) CACHE + hoi quy v445 ---------- */
const sw = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');
// Gop v444+v446+v447 (26/11, goi Cloudflare): CACHE lay ban cao nhat v447.
check('(3) sw.js: CACHE = v447-the-hang-van-chuyen-gon-1 (gop 3 goi)', sw.includes("const CACHE = 'v447-the-hang-van-chuyen-gon-1'"));
check('(3) danh-sach-mau.html: "Logistics nội địa" van dung x2 (v445 khong vo)',
  (mauHtml.match(/Logistics nội địa/g) || []).length === 2, 'got ' + (mauHtml.match(/Logistics nội địa/g) || []).length);

/* ---------- (4) Trang Shop khong doi ---------- */
const shopHtml = fs.readFileSync(path.join(root, 'danh-sach-shop.html'), 'utf8');
const shopSwitch = (shopHtml.match(/<div class="uni-cat-switch list-switch"[\s\S]*?<\/div>/) || [])[0] || '';
const shopOrder = [...shopSwitch.matchAll(/data-uni-cat="([^"]+)"/g)].map(function (m) { return m[1]; });
check('(4) danh-sach-shop.html: switch van 4 nut, thu tu khong doi',
  JSON.stringify(shopOrder) === JSON.stringify(['shop', 'class-live', 'class-makeup', 'event-mkt']), 'got ' + shopOrder.join(','));

/* ---------- (5) Tim kiem van du 11 hang (hoi quy nhe) ---------- */
const require = createRequire(import.meta.url);
const API = require(path.join(root, 'js/search.js'));
const sb = { window: {}, console };
vm.createContext(sb);
vm.runInContext(fs.readFileSync(path.join(root, 'js/data.js'), 'utf8'), sb);
const data = sb.window.V20_DATA;
const counts = API.countByType(API.buildIndex(data));
check('(5) tim kiem: counts["logistics-noi-dia"] van = 11', counts['logistics-noi-dia'] === 11, 'got ' + counts['logistics-noi-dia']);

console.log('\n' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
