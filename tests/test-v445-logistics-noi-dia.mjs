// test-v445-logistics-noi-dia.mjs — v445 (25/11/2026, anh quyet 21:49 + 21:51 + 21:52):
// (1) Sua nhan "Logistic nội địa" (sai ngu phap) thanh "Logistics nội địa"
//     (nut switch + H2 tren danh-sach-mau.html) — khop muc anh em
//     "Logistics Trung–Việt" (co s).
// (2) Dua 11 hang van chuyen noi dia (mang logisticsNoiDia, data.js) vao chi
//     muc tim kiem (js/search.js): dang ky loai 'logistics-noi-dia'
//     (TYPE_LABELS/TYPE_ORDER/NEWOBJ_META/NEWOBJ_DATA_MAP/countByType) +
//     nhanh entryFor rieng (ten + ten viet tat + dich vu + nhan + pham vi).
// (3) Switch tieu muc: 1 hang chi chua TOI DA 4 tieu muc, thua xuong dong 2
//     (v20.css .uni-cat-switch.list-switch .uni-cat-btn flex-basis 25%).
// Chạy: node tests/test-v445-logistics-noi-dia.mjs (từ gốc repo).
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

/* ---------- (1) Nhan hien thi tren danh-sach-mau.html ---------- */
const mauHtml = fs.readFileSync(path.join(root, 'danh-sach-mau.html'), 'utf8');
const goodLabel = (mauHtml.match(/Logistics nội địa/g) || []).length;
const badLabel = (mauHtml.match(/Logistic nội địa/g) || []).length;
check('(1) danh-sach-mau.html: "Logistics nội địa" dung x2 (nut + H2)', goodLabel === 2, 'got ' + goodLabel);
check('(1) danh-sach-mau.html: 0x "Logistic nội địa" (sai, thieu s)', badLabel === 0, 'got ' + badLabel);
check('(1) nut switch van giu data-uni-cat="logistics-noi-dia" (key khong doi)', mauHtml.includes('data-uni-cat="logistics-noi-dia"'));
check('(1) section van giu id="logistics-noi-dia" (key khong doi)', mauHtml.includes('id="logistics-noi-dia"'));

/* ---------- (2) Tim kiem: nap search.js + data.js that ---------- */
const require = createRequire(import.meta.url);
const API = require(path.join(root, 'js/search.js'));
const sb = { window: {}, console };
vm.createContext(sb);
vm.runInContext(fs.readFileSync(path.join(root, 'js/data.js'), 'utf8'), sb);
const data = sb.window.V20_DATA;
const nCarrier = (data.logisticsNoiDia || []).length;
check('(2) data.js: mang logisticsNoiDia co ' + nCarrier + ' hang', nCarrier === 11, 'got ' + nCarrier);

const idx = API.buildIndex(data);
const counts = API.countByType(idx);
check('(2) chi muc: counts["logistics-noi-dia"] = ' + nCarrier + ' (du 11 hang)', counts['logistics-noi-dia'] === nCarrier, 'got ' + counts['logistics-noi-dia']);
check('(2) TYPE_LABELS["logistics-noi-dia"] = "Logistics nội địa"', API.TYPE_LABELS['logistics-noi-dia'] === 'Logistics nội địa', 'got ' + API.TYPE_LABELS['logistics-noi-dia']);
check('(2) TYPE_ORDER: "logistics-noi-dia" dung ngay sau "logistics"',
  API.TYPE_ORDER.indexOf('logistics-noi-dia') === API.TYPE_ORDER.indexOf('logistics') + 1,
  'logistics@' + API.TYPE_ORDER.indexOf('logistics') + ', logistics-noi-dia@' + API.TYPE_ORDER.indexOf('logistics-noi-dia'));

const byType = function (r, t) { return r.results.filter(function (e) { return e.type === t; }); };

/* Tim theo ten hang (viet tat) */
const rGhn = API.search(idx, 'GHN', {});
const ghn = byType(rGhn, 'logistics-noi-dia');
check('(2) tim "GHN" ra hang GHN (type logistics-noi-dia)', ghn.length >= 1 && /GHN/.test(ghn[0].title), 'got ' + ghn.length + ' hang, top: ' + (ghn[0] ? ghn[0].title : '—'));
if (ghn.length) {
  check('(2) ket qua GHN link ve dung the hang (danh-sach-mau.html#carrier-ghn)', ghn[0].url === 'danh-sach-mau.html#carrier-ghn', 'got ' + ghn[0].url);
  check('(2) ket qua GHN co chip pham vi + hotline', (ghn[0].chips || []).length >= 1, 'chips: ' + JSON.stringify(ghn[0].chips));
}

/* Tim theo ten danh muc — phai ra DU 11 hang. Luu y: 9 muc Trung-Viet cung
   khop vi mo ta cua chung co chu "nội địa" (vd giao ca noi dia) — do la
   hanh vi dung cua tim kiem theo token (khop chuoi con xuyen truong),
   khong phai loi lan loai. Cua that la du 11 hang noi dia deu co mat. */
const rCat = API.search(idx, 'Logistics nội địa', {});
check('(2) tim "Logistics nội địa" ra du ' + nCarrier + ' hang', rCat.counts['logistics-noi-dia'] === nCarrier, 'got ' + rCat.counts['logistics-noi-dia']);
const carrierIds = new Set((data.logisticsNoiDia || []).map(function (c) { return c.id; }));
const foundIds = new Set(byType(rCat, 'logistics-noi-dia').map(function (e) { return e.id; }));
check('(2) tim "Logistics nội địa": du 11 id hang deu co trong ket qua',
  (data.logisticsNoiDia || []).every(function (c) { return foundIds.has(c.id); }),
  'thieu: ' + (data.logisticsNoiDia || []).filter(function (c) { return !foundIds.has(c.id); }).map(function (c) { return c.id; }).join(','));
console.log('INFO tim "Logistics nội địa": total=' + rCat.total + ' (noi-dia=' + rCat.counts['logistics-noi-dia'] + ', trung-viet=' + (rCat.counts.logistics || 0) + ' — trung-viet khop nho mo ta co chu "nội địa")');

/* Tim theo dich vu trong the hang */
const rSvc = API.search(idx, 'Giao Chuẩn', {});
check('(2) tim "Giao Chuẩn" (dich vu) ra hang van chuyen', byType(rSvc, 'logistics-noi-dia').length >= 1, 'got ' + byType(rSvc, 'logistics-noi-dia').length);

/* Tim theo ten viet tat hang khac */
const rGhtk = API.search(idx, 'GHTK', {});
check('(2) tim "GHTK" ra hang Giao Hàng Tiết Kiệm', byType(rGhtk, 'logistics-noi-dia').some(function (e) { return /GHTK/.test(e.title); }), 'got ' + byType(rGhtk, 'logistics-noi-dia').map(function (e) { return e.title; }).join(' | '));

/* Nhap "Logistic nội địa" (sai) van tim duoc nho chuan hoa? — khong bat buoc; chi ghi nhan */
const rBad = API.search(idx, 'Logistic nội địa', {});
console.log('INFO tim "Logistic nội địa" (sai chinh ta): total=' + rBad.total + ', logistics-noi-dia=' + (rBad.counts['logistics-noi-dia'] || 0));

/* ---------- (3) CSS switch 4 nut/hang + CACHE ---------- */
const css = fs.readFileSync(path.join(root, 'v20.css'), 'utf8');
check('(3) v20.css: .list-switch .uni-cat-btn flex-basis calc(25% - 5px) (4/hang)',
  css.includes('.uni-cat-switch.list-switch .uni-cat-btn{flex:1 1 calc(25% - 5px)}'));
check('(3) v20.css: .list-switch bo tron 16px (khung 2 hang)', css.includes('.uni-cat-switch.list-switch{border-radius:16px}'));
check('(3) v20.css: luat mobile list-switch (cuon ngang) van giu nguyen',
  css.includes('@media(max-width:600px){.uni-cat-switch.list-switch{flex-direction:row;flex-wrap:nowrap;overflow-x:auto'));

const sw = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');
check('(3) sw.js: CACHE = v445-logistics-noi-dia-1 (v20.css trong SHELL)', sw.includes("const CACHE = 'v445-logistics-noi-dia-1'"));

/* ---------- (4) Khong con dang sai "Logistic nội địa" trong file doi ---------- */
const searchSrc = fs.readFileSync(path.join(root, 'js/search.js'), 'utf8');
check('(4) js/search.js: 0x "Logistic nội địa" (sai)', (searchSrc.match(/Logistic nội địa/g) || []).length === 0);
check('(4) js/search.js: nhan dung "Logistics nội địa" x2 (TYPE_LABELS + NEWOBJ_META)', (searchSrc.match(/Logistics nội địa/g) || []).length === 2, 'got ' + (searchSrc.match(/Logistics nội địa/g) || []).length);

console.log('\n' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
