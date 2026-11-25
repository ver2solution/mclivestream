// test-v280-job-post-card.mjs — P3-7 vong 3 (24/11/2026): the "Tin tuyen
// cua toi" (trang-cua-toi.html):
// (a) Doan chi tiet cat cut giua chung khong co dau "…" (mo ta slice(0,200)
// roi dung, khong bao la con tiep). Fix: them "…" khi mo ta dai hon 200 ky tu.
// (b) Han nhan hien dang ISO "2026-11-30" thay vi dd/mm/yyyy — goc: form
// dang tin (danh-sach-mau.html) ghep thang f.deadline.value (input date tra
// ISO) vao mo ta. Fix: doi sang dd/mm/yyyy truoc khi ghep; bai cu giu dong
// ISO, khong sua nguoc (theo tien le v227).
// Chay: node tests/test-v280-job-post-card.mjs (tu goc repo).
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

const mau = fs.readFileSync(path.join(root, 'danh-sach-mau.html'), 'utf8');
const toi = fs.readFileSync(path.join(root, 'trang-cua-toi.html'), 'utf8');

// ---- (b) Han nhan dd/mm/yyyy ----
check('(b) form dang tin doi ISO sang dd/mm/yyyy truoc khi ghep mo ta',
  mau.indexOf("var dm=f.deadline.value.match(/^(\\d{4})-(\\d{2})-(\\d{2})$/); lines.push('Hạn nhận hồ sơ: '+(dm?dm[3]+'/'+dm[2]+'/'+dm[1]:f.deadline.value));") !== -1);
check('(b) khong con ghep thang gia tri ISO vao mo ta',
  mau.indexOf("lines.push('Hạn nhận hồ sơ: '+f.deadline.value);") === -1);
// Hanh vi: chay dung bieu thuc dinh dang trong file.
{
  const m = mau.match(/var dm=f\.deadline\.value\.match\((\/\^[^;]+)\);/);
  check('(b) trich duoc regex dinh dang tu file', !!m);
  if (m) {
    const sb = { f: { deadline: { value: '2026-11-30' } }, lines: [] };
    vm.createContext(sb);
    vm.runInContext("var dm=f.deadline.value.match(" + m[1] + "); lines.push('Hạn nhận hồ sơ: '+(dm?dm[3]+'/'+dm[2]+'/'+dm[1]:f.deadline.value));", sb);
    check('(b) "2026-11-30" thanh "Hạn nhận hồ sơ: 30/11/2026"', sb.lines[0] === 'Hạn nhận hồ sơ: 30/11/2026', sb.lines[0]);
  }
}

// ---- (a) Cat mo ta co dau … ----
check('(a) the tin them "…" khi mo ta dai hon 200 ky tu',
  toi.indexOf("(String(r.description).length>200?'…':'')") !== -1);
{
  // Chay dung bieu thuc cat mo ta trong file (voi lstEsc gia).
  const sb = {
    lstEsc(s) { return String(s); },
    r: { description: 'x'.repeat(250) }
  };
  vm.createContext(sb);
  const outLong = vm.runInContext("lstEsc(String(r.description).slice(0,200))+(String(r.description).length>200?'…':'')", sb);
  check('(a) mo ta 250 ky tu: cat 200 + dau …', outLong === 'x'.repeat(200) + '…', 'do dai ' + outLong.length);
  sb.r = { description: 'ngan' };
  const outShort = vm.runInContext("lstEsc(String(r.description).slice(0,200))+(String(r.description).length>200?'…':'')", sb);
  check('(a) mo ta ngan: khong them …', outShort === 'ngan', outShort);
}

console.log('\n' + pass + ' PASS, ' + fail + ' FAIL');
process.exit(fail ? 1 : 0);
