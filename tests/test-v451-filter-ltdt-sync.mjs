// test-v451-filter-ltdt-sync.mjs — v451: dong bo kich co bo loc trang Lao Dong Tu Do voi trang Mau/Shop
// Truoc fix: trang lao-dong-tu-do.html dung <div class="filter-card"> (mac dinh 4 cot,
// o loc padding 12px) + o loc khong co .uni-field + nut Ap dung/Dat lai nam TRONG
// card o <div class="full"> (can trai, mobile width:100% xep chong) — trong khi trang
// danh-sach-mau.html / danh-sach-shop.html dung filter-card cols-6 (6 cot deu, o loc
// desktop padding 9px/font 13px) + o loc .uni-field + nut nam NGOAI card o
// <div class="filter-actions"> (can phai, width:auto, min-height 48px; mobile flex:1
// chia doi). Ket qua: o loc LDTD to/cao hon + nut lech hang so voi cac trang menu khac.
// Sau fix: LDTD dung dung cau truc cua trang Mau/Shop (chi doi cau truc + class, giu
// nguyen id/data-track/nhan nut/hanh vi loc).
// Chay: node tests/test-v451-filter-ltdt-sync.mjs (tu goc repo hoac goc stage).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let pass = 0, fail = 0;
function check(name, ok, extra) {
  if (ok) { pass++; console.log('PASS ' + name); }
  else { fail++; console.log('FAIL ' + name + (extra !== undefined ? ' — ' + extra : '')); }
}

const ltdt = fs.readFileSync(path.join(root, 'lao-dong-tu-do.html'), 'utf8');
const mau = fs.readFileSync(path.join(root, 'danh-sach-mau.html'), 'utf8');
const shop = fs.readFileSync(path.join(root, 'danh-sach-shop.html'), 'utf8');
const swJs = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');

// --- 1. filter-card dong bo: cols-6 nhu trang Mau/Shop ---
check('LDTD filter-card co class cols-6', ltdt.includes('<div class="filter-card cols-6">'));
check('Trang Mau dung filter-card cols-6 (mau chuan)', mau.includes('<div class="filter-card cols-6"'));
check('Trang Shop dung filter-card cols-6 (mau chuan)', shop.includes('<div class="filter-card cols-6"'));
check('LDTD KHONG con filter-card khong cols', !ltdt.includes('<div class="filter-card">'));

// --- 2. o loc boc .uni-field (5 o) ---
const uniFields = (ltdt.match(/<div class="uni-field"><label for="fl/g) || []).length;
check('LDTD co du 5 o loc .uni-field', uniFields === 5, 'got ' + uniFields);
for (const fid of ['flProv', 'flExp', 'flWorkType', 'flMinSalary', 'flSort']) {
  check('LDTD giu nguyen o loc ' + fid, ltdt.includes('id="' + fid + '"'));
}

// --- 3. nut Ap dung / Dat lai ra NGOAI card, trong .filter-actions ---
const faIdx = ltdt.indexOf('<div class="filter-actions">');
check('LDTD co .filter-actions', faIdx !== -1);
check('LDTD KHONG con <div class="full"> chua nut', !ltdt.includes('<div class="full">'));
check('Nut Ap dung nam trong .filter-actions',
  faIdx !== -1 && ltdt.slice(faIdx, faIdx + 400).includes('id="flApplyBtn"'));
check('Nut Dat lai nam trong .filter-actions',
  faIdx !== -1 && ltdt.slice(faIdx, faIdx + 400).includes('id="flResetBtn"'));
check('Nut Ap dung/Dat lai KHONG con trong filter-card',
  !/filter-card cols-6[\s\S]*?flApplyBtn[\s\S]*?<\/div>\s*<div class="filter-actions"/.test(ltdt));
check('LDTD giu nhan nut Ap dung / Dat lai',
  ltdt.includes('>Áp dụng</button>') && ltdt.includes('>Đặt lại</button>'));
check('LDTD giu data-track nut loc',
  ltdt.includes('data-track="ap-dung-loc-lao-dong"') && ltdt.includes('data-track="dat-lai-loc-lao-dong"'));

// --- 4. luat .filter-actions trong <style> cua trang, giong het trang Mau/Shop ---
const rules = [
  '.filter-actions{display:flex;justify-content:flex-end;gap:10px;margin:10px 2px 0}',
  '.filter-actions .btn{width:auto;min-height:48px}',
  '@media(max-width:600px){.filter-actions .btn{flex:1}}',
];
for (const r of rules) {
  check('LDTD <style> co luat: ' + r.slice(0, 40) + '…', ltdt.includes(r));
  check('Trang Mau co cung luat (mau chuan)', mau.includes(r));
  check('Trang Shop co cung luat (mau chuan)', shop.includes(r));
}

// --- 5. dem ket qua van o ngoai card, giu id ---
check('LDTD giu <p id="flCount"> ngoai card',
  ltdt.includes('<p class="filter-count" id="flCount"'));
check('LDTD giu danh sach + pager + empty', ltdt.includes('id="flList"') && ltdt.includes('id="flPager"') && ltdt.includes('id="flEmpty"'));

// --- 6. switch tab khong doi (7 nut, list-switch 25%/hang) ---
const tabs = (ltdt.match(/class="uni-cat-btn fl-tab-btn/g) || []).length;
check('LDTD giu 7 nut tab', tabs === 7, 'got ' + tabs);
check('LDTD giu .uni-cat-switch.list-switch', ltdt.includes('<div class="uni-cat-switch list-switch"'));

// --- 7. sw.js CACHE bump ---
check('sw.js CACHE = v451-filter-ltdt-sync-1',
  swJs.includes("const CACHE = 'v451-filter-ltdt-sync-1';"));

console.log(`\n${pass} PASS, ${fail} FAIL`);
process.exit(fail ? 1 : 0);
