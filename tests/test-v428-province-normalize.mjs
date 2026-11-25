// test-v428-province-normalize.mjs — Loc tinh khong khop du lieu (Glint VLL
// L9, khung chat 24/11/2026): bo loc tinh co 35 muc chuan (34 tinh sau sap
// nhap 2025 + "Toan quoc / Live online") nhung data.js con 113 ho so ghi ten
// tinh cu/khac chuan trong truong "prov"/"province": "TP.HCM" 61,
// "Binh Duong" 15 (14 prov + 1 province), "Nam Dinh" 3, "Hai Duong" 1,
// "Bac Giang" 2 (1 prov + 1 province), "Toan quoc" 12, "Online" 15,
// "Thanh pho Ho Chi Minh" 3, "Binh Thuan" 1 — loc theo tinh chuan khong
// thay nhung ho so nay. Fix: chuan hoa DUNG truong "prov"/"province"
// (khong thay text bai viet/meta): TP.HCM/Binh Duong/Thanh pho Ho Chi Minh
// -> "TP. Ho Chi Minh", Nam Dinh -> "Ninh Binh", Hai Duong -> "Hai Phong",
// Bac Giang -> "Bac Ninh", Toan quoc/Online -> "Toan quoc / Live online",
// Binh Thuan -> "Lam Dong" (sap nhap 2025).
// Chay: node tests/test-v428-province-normalize.mjs (tu goc repo).
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

// Du lieu live.
global.window = {};
vm.createContext(global);
vm.runInContext(fs.readFileSync(path.join(root, 'js/data.js'), 'utf8'), global);
const D = global.window.V20_DATA;
check('tai duoc data.js + D.provinces co 35 muc', D && Array.isArray(D.provinces) && D.provinces.length === 35);
const provSet = new Set(D.provinces);

// Quet TOAN BO D, gom moi gia tri chuoi cua khoa "prov"/"province".
const counts = {};
function walk(x) {
  if (Array.isArray(x)) { x.forEach(walk); return; }
  if (x && typeof x === 'object') {
    for (const k of Object.keys(x)) {
      if ((k === 'prov' || k === 'province') && typeof x[k] === 'string') {
        counts[x[k]] = (counts[x[k]] || 0) + 1;
      } else {
        walk(x[k]);
      }
    }
  }
}
walk(D);

// 9 dang cu/khac chuan phai bien mat hoan toan.
for (const old of ['TP.HCM', 'Bình Dương', 'Nam Định', 'Hải Dương', 'Bắc Giang', 'Toàn quốc', 'Online', 'Thành phố Hồ Chí Minh', 'Bình Thuận']) {
  check('khong con "' + old + '" trong truong prov/province', (counts[old] || 0) === 0, 'got ' + (counts[old] || 0));
}
// Moi gia tri prov/province phai nam trong danh sach 35 tinh chuan.
const outside = Object.keys(counts).filter((v) => !provSet.has(v));
check('moi gia tri prov/province deu nam trong 35 tinh chuan', outside.length === 0,
  outside.length ? 'ngoai danh sach: ' + outside.join(', ') : undefined);
// 6 dang chuan tang dung so luong da chuan hoa (>= so truoc khi sua).
check('"TP. Hồ Chí Minh" >= 400 (321 cu + 61 TP.HCM + 14 Binh Duong prov + 1 province + 3 Thanh pho Ho Chi Minh)',
  (counts['TP. Hồ Chí Minh'] || 0) >= 400, 'got ' + (counts['TP. Hồ Chí Minh'] || 0));
check('"Ninh Bình" >= 30 (27 cu + 3 Nam Dinh)', (counts['Ninh Bình'] || 0) >= 30, 'got ' + (counts['Ninh Bình'] || 0));
check('"Hải Phòng" >= 37 (36 cu + 1 Hai Duong)', (counts['Hải Phòng'] || 0) >= 37, 'got ' + (counts['Hải Phòng'] || 0));
check('"Bắc Ninh" >= 23 (21 cu + 1 Bac Giang prov + 1 province)', (counts['Bắc Ninh'] || 0) >= 23, 'got ' + (counts['Bắc Ninh'] || 0));
check('"Toàn quốc / Live online" >= 127 (100 cu + 12 Toan quoc + 15 Online)',
  (counts['Toàn quốc / Live online'] || 0) >= 127, 'got ' + (counts['Toàn quốc / Live online'] || 0));
check('"Lâm Đồng" >= 22 (21 cu + 1 Binh Thuan)', (counts['Lâm Đồng'] || 0) >= 22, 'got ' + (counts['Lâm Đồng'] || 0));

console.log('\n' + pass + ' PASS, ' + fail + ' FAIL');
process.exit(fail ? 1 : 0);
