// test-v425-lot-price-total.mjs — Gia lo hien sai (Glint VLL L10, khung chat
// 24/11/2026): lo 6,5 trieu CA LO hien 552.500.000d. Goc: lotValueLine() luon
// hien priceNum x qty (don gia x so luong, quy tac 08/11) — nhung lot-53/65/
// 218 co priceNum LA tong gia ca lo ("265.000d/lo", "2.800.000d/lo",
// "6.500.000d/ca lo"), qty chi la so mon trong lo. Fix: flag priceTotal
// tren 3 lo + nhanh rieng trong lotValueLine (hien dung priceNum, khong
// nhan qty). Lo thuong (don gia x so luong) giu nguyen.
// Chay: node tests/test-v425-lot-price-total.mjs (tu goc repo).
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let pass = 0, fail = 0;
function check(name, ok, extra) {
  if (ok) { pass++; console.log('PASS ' + name); }
  else { fail++; console.log('FAIL ' + name + (extra !== undefined ? ' — ' + extra : '')); }
}

const appSrc = fs.readFileSync(path.join(root, 'js/app.js'), 'utf8');
// fmtVnd (1 dong) + khoi tu esc() toi het lotValueLine().
const fStart = appSrc.indexOf('function fmtVnd(n){');
const fEnd = appSrc.indexOf('\n', fStart);
const eStart = appSrc.indexOf('function esc(s){');
const lStart = appSrc.indexOf('function lotValueLine(l){');
const lEnd = appSrc.indexOf('\nfunction ', lStart + 10);
check('trich duoc fmtVnd + khoi esc..lotValueLine', fStart !== -1 && eStart !== -1 && lStart !== -1 && lEnd !== -1);
const sb = { console, CAT_LABELS: {} };
vm.createContext(sb);
vm.runInContext(appSrc.slice(fStart, fEnd) + '\n' + appSrc.slice(eStart, lEnd)
  + '\nthis.__V = { lotValueLine };', sb);
const lotValueLine = sb.__V.lotValueLine;

// Du lieu live.
global.window = {};
vm.createContext(global);
vm.runInContext(fs.readFileSync(path.join(root, 'js/data.js'), 'utf8'), global);
const D = global.window.V20_DATA;
const byId = {};
(D.lots || []).forEach((l) => { byId[l.id] = l; });

// 3 lo gia ca lo: hien DUNG gia ca lo, khong nhan qty.
check('lot-218 (6,5tr ca lo x 85 doi) hien 6.500.000d',
  lotValueLine(byId['lot-218']) === '6.500.000đ', 'got ' + lotValueLine(byId['lot-218']));
check('lot-65 (2,8tr/lo x 110 dam) hien 2.800.000d',
  lotValueLine(byId['lot-65']) === '2.800.000đ', 'got ' + lotValueLine(byId['lot-65']));
check('lot-53 (265K/lo x 25 mon) hien 265.000d',
  lotValueLine(byId['lot-53']) === '265.000đ', 'got ' + lotValueLine(byId['lot-53']));
check('data.js: dung 3 lo co flag priceTotal (lot-53/65/218)',
  (D.lots || []).filter((l) => l.priceTotal === true).map((l) => l.id).sort().join(',') === 'lot-218,lot-53,lot-65',
  'got ' + (D.lots || []).filter((l) => l.priceTotal === true).map((l) => l.id).join(','));
const unflagged = (D.lots || []).filter((l) => typeof l.qty === 'number' && l.qty > 1
  && typeof l.price === 'string' && /cả lô|\/lô/.test(l.price) && l.priceTotal !== true);
check('khong con lo gia ca lo nao thieu flag', unflagged.length === 0, 'got ' + unflagged.map((l) => l.id).join(','));

// Hoi quy: lo thuong van nhan don gia x so luong.
check('lot-120 (6,5tr x 1, khong flag) van hien 6.500.000d',
  lotValueLine(byId['lot-120']) === '6.500.000đ', 'got ' + lotValueLine(byId['lot-120']));
check('lo thuong don gia 50K x 100 van hien 5.000.000d',
  lotValueLine({ priceNum: 50000, qty: 100 }) === '5.000.000đ', 'got ' + lotValueLine({ priceNum: 50000, qty: 100 }));
check('priceTotal thang nhan qty (100K x 5, co flag -> 100.000d)',
  lotValueLine({ priceNum: 100000, qty: 5, priceTotal: true }) === '100.000đ',
  'got ' + lotValueLine({ priceNum: 100000, qty: 5, priceTotal: true }));
check('priceTotal nhung thieu priceNum -> roi ve chuoi gia',
  lotValueLine({ priceTotal: true, price: 'Giá thỏa thuận' }) === 'Giá thỏa thuận',
  'got ' + lotValueLine({ priceTotal: true, price: 'Giá thỏa thuận' }));
check('lo null -> Chưa cập nhật', lotValueLine(null) === 'Chưa cập nhật', 'got ' + lotValueLine(null));

console.log('\n' + pass + ' PASS, ' + fail + ' FAIL');
process.exit(fail ? 1 : 0);
