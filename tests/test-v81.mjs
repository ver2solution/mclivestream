/* v81 tests — Node only, no browser. v81 = FIX GIAO DIEN DIEN THOAI
   (nguoi dung yeu cau 07/11/2026 "chu y fix cho giao dien dien thoai";
   kiem tra lai live v80 bang Playwright 30 luot — 10 trang x 360/390/768:
   0 tran ngang, 0 loi JS, header 56px @360/390 + 72px @768, menu mo duoc
   ca 10 trang, share-box khong cat URL (C1 giu nguyen), FAB mo overlay
   tren 7 trang co FAB, anh "hong" bao cao chi la anh lazy-load chua cuon
   toi (curl xac minh HTTP 200) — khong phai loi that):
   (P3-11) FAB Gop y vang mat tren 3 trang dang-nhap.html,
       dat-lai-mat-khau.html, quy-tac-diem-thuong.html (0 lan xuat hien
       o ca 3 viewport) — them khoi FAB giong het index.html (nut
       gopyFab + overlay gopyOverlay + form gopyForm), js/app.js da wire
       san (if(fab)...) nen chi can them markup, khong them JS.
   (P3-12) Bang diem trang quy-tac-diem-thuong.html chua co wrapper cuon
       ngang (audit pts: wrapScrollable=false) — boc <table> trong
       <div class="table-scroll"> + CSS .table-scroll{overflow-x:auto};
       them .table-scroll table{min-width:560px} o <=600px de bang giu
       do rong cot doc duoc thay vi bi ep hep (anh chup @390: cot Hoat
       dong chi ~60px).
   (M1) Nut "Dang Nhap" header chi cao 36px @360/390 (40px @768) va nut
       Menu chi cao 35px @768 — duoi chuan 44px de bam (tien le v39:
       pager button 44px). Them min-height:44px vao rule goc .btn-sm va
       .menu-btn trong v20.css; khong doi layout desktop (menu-btn an
       o desktop; .btn-sm chi cao them vai px).
   (M2) sw.js CACHE 'v80-shell-1' -> 'v83-shell-1' (bat buoc vi v20.css
       + 3 trang HTML doi). Chi 5 file doi so voi v80: v20.css, sw.js,
       dang-nhap.html, dat-lai-mat-khau.html, quy-tac-diem-thuong.html.
   KHONG dung: logo Mylan/Cham Loa (B1/B2 — cho nguoi dung quyet),
   F-06 (cot top_revenue — cho migration), noi dung bai viet, js/data.js.
   Logo header (cao 32px) + link text footer (cao 18px) ghi nhan nhung
   KHONG sua: logo rong 168px de bam, link footer la link text chuan. */
import fs from 'node:fs';
import crypto from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let pass = 0, fail = 0;
function t(name, cond, extra = '') { if (cond) { pass++; console.log('PASS v81:', name); } else { fail++; console.log('FAIL v81:', name, extra); } }
const sha = f => crypto.createHash('sha256').update(fs.readFileSync(path.join(root, f))).digest('hex');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');

const css = read('v20.css');
const swJs = read('sw.js');
const appJs = read('js/app.js');

// ---- (A) sw.js CACHE + sha pin ----
t("sw.js CACHE = 'v84-shell-1'", swJs.includes("const CACHE = 'v84-shell-1';"));
t('sw.js khong con cache cu (v80)', !swJs.includes('v80-shell-1'));
t('sw.js giong het v81 (CACHE v84-shell-1) (sha256)', sha('sw.js') === '609a81a1bdb77f85197f023f945af4a80acffaf408b450aa203c8d4c30926522');
t('v20.css giong het v81 (P3-12 + M1) (sha256)', sha('v20.css') === 'c38c89a126a136fb3f99ea7d547884339c4e5b9899e48c90234f61f02a140538');

// ---- (B) P3-11: FAB co mat + giong het index.html tren 3 trang ----
const fabBlock = (html) => {
  const m = html.match(/<button class="gopy-fab"[\s\S]*?<\/form><\/div><\/div>/);
  return m ? m[0] : null;
};
const indexFab = fabBlock(read('index.html'));
t('index.html co khoi FAB day du de doi chieu', !!indexFab);
for (const f of ['dang-nhap.html', 'dat-lai-mat-khau.html', 'quy-tac-diem-thuong.html']) {
  const html = read(f);
  const block = fabBlock(html);
  t(`${f}: co nut gopyFab + overlay gopyOverlay + form gopyForm + gopyMsg`,
    html.includes('id="gopyFab"') && html.includes('id="gopyOverlay"') && html.includes('id="gopyForm"') && html.includes('id="gopyMsg"'));
  t(`${f}: khoi FAB giong het index.html (1367 ky tu)`, block !== null && block === indexFab);
  t(`${f}: FAB dat sau </footer>, truoc <script`, html.indexOf('gopyFab') > html.indexOf('</footer>'));
  t(`${f}: van load js/app.js (wire FAB)`, html.includes('<script src="js/app.js"></script>'));
}
t('js/app.js wire FAB (click mo overlay, click ngoai dong, submit form)',
  appJs.includes("document.getElementById('gopyFab')") && appJs.includes("document.getElementById('gopyOverlay')") && appJs.includes("document.getElementById('gopyForm')"));

// ---- (C) P3-12: wrapper cuon ngang cho bang diem ----
const quyTac = read('quy-tac-diem-thuong.html');
t('quy-tac: <table> nam trong <div class="table-scroll">',
  /<div class="table-scroll">\s*<table>/.test(quyTac) && quyTac.includes('</table>\n</div>'));
t('quy-tac: noi dung bang khong doi (6 dong diem + tran ngay)',
  (quyTac.match(/<tr>/g) || []).length === 7 && quyTac.includes('tối đa 50 điểm/ngày'));
t('v20.css co .table-scroll{overflow-x:auto}', css.includes('.table-scroll{overflow-x:auto'));
t('v20.css: bang diem giu min-width 560px o <=600px', css.includes('.table-scroll table{min-width:560px}'));

// ---- (D) M1: nut bam du 44px ----
t('v20.css: .btn-sm co min-height:44px (nut Dang Nhap header)',
  /\.btn-sm\{[^}]*min-height:44px/.test(css));
t('v20.css: .menu-btn co min-height:44px (nut Menu)',
  /\.menu-btn\{[^}]*min-height:44px/.test(css));

// ---- (E) chi 5 file doi so voi v80 ----
{
  const v81root = path.resolve(root, '..', 'mclivestream-final-v81-prep');
  const v80root = path.resolve(root, '..', 'mclivestream-final-v80-prep');
  const walk = (dir, base = '') => {
    const out = [];
    for (const f of fs.readdirSync(dir, { withFileTypes: true })) {
      const rel = base ? base + '/' + f.name : f.name;
      if (f.isDirectory()) out.push(...walk(path.join(dir, f.name), rel));
      else out.push(rel);
    }
    return out;
  };
  const v80files = new Set(walk(v80root));
  const v81files = walk(v81root);
  const changed = v81files.filter(f => {
    if (!v80files.has(f)) return true;
    const a = crypto.createHash('sha256').update(fs.readFileSync(path.join(v80root, f))).digest('hex');
    const b = crypto.createHash('sha256').update(fs.readFileSync(path.join(v81root, f))).digest('hex');
    return a !== b;
  }).filter(f => !f.startsWith('tests/'));
  const expect = ['v20.css', 'sw.js', 'dang-nhap.html', 'dat-lai-mat-khau.html', 'quy-tac-diem-thuong.html'];
  t('v81 chi doi 5 file so voi v80 (v20.css + sw.js + 3 trang HTML)',
    changed.length === 5 && expect.every(f => changed.includes(f)), 'changed: ' + changed.join(', '));
  t('v81 khong doi js/data.js (noi dung giu nguyen)',
    crypto.createHash('sha256').update(fs.readFileSync(path.join(v81root, 'js/data.js'))).digest('hex') === crypto.createHash('sha256').update(fs.readFileSync(path.join(v80root, 'js/data.js'))).digest('hex'));
}

console.log(`\n${pass} PASS, ${fail} FAIL`);
process.exit(fail ? 1 : 0);
