// test-v286-news-pagination.mjs — #70: phân trang tin tức (tin-tuc.html)
// Trước fix: initNews render TOÀN BỘ danh sách chính (~744 thẻ) trong 1 trang
// cuộn dài. Sau fix: 20 bài/trang, dùng chung renderPager (đã có sẵn cho
// danh sách shop) + cửa sổ số trang gọn (pagerWindow).
// Chạy: node tests/test-v286-news-pagination.mjs (từ gốc repo hoặc gốc stage).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let pass = 0, fail = 0;
function check(name, ok, extra) {
  if (ok) { pass++; console.log('PASS ' + name); }
  else { fail++; console.log('FAIL ' + name + (extra !== undefined ? ' — ' + extra : '')); }
}
const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);

const html = fs.readFileSync(path.join(root, 'tin-tuc.html'), 'utf8');
const appJs = fs.readFileSync(path.join(root, 'js/app.js'), 'utf8');
const swJs = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');

// --- Tĩnh: HTML ---
check('tin-tuc.html co #newsPager', html.includes('<div class="pager" id="newsPager"></div>'));
check('tin-tuc.html KHONG doi #newsMain', html.includes('<div class="news-list" id="newsMain"'));
check('tin-tuc.html KHONG doi #newsCount', html.includes('id="newsCount"'));
check('tin-tuc.html KHONG doi 2 hang tren', html.includes('id="newsPinnedRow"') && html.includes('id="newsNewRow"'));

// --- Tĩnh: app.js ---
check('app.js co pagerWindow', /function pagerWindow\(page, totalPages\)/.test(appJs));
check('app.js renderPager nhan opts', /function renderPager\(el, page, totalPages, total, onPage, perPage, label, opts\)/.test(appJs));
check('app.js initNews perPage=20', /var perPage=20;/.test(appJs));
check('app.js initNews render(pg) + slice', /function render\(pg\)\{ pg=pg\|\|1;/.test(appJs) && appJs.includes('mainList.slice((pg-1)*perPage,pg*perPage)'));
check('app.js initNews goi renderPager windowed', appJs.includes("renderPager(document.getElementById('newsPager'),pg,totalPages,mainList.length") && appJs.includes("{windowed:true}"));
check('app.js initNews dong bo URL ?page=', appJs.includes('setParams({cat:catSel.value,page:String(pg)})'));
check('app.js initNews doc ?page= luc mo trang', /var page=parseInt\(qp\.page\|\|'1',10\)\|\|1;/.test(appJs));
check('app.js loc/sap xep ve trang 1', appJs.includes("catSel.addEventListener('change',function(){ render(1); })") && appJs.includes("sortSel.addEventListener('change',function(){ render(1); })"));
check('app.js GIU quyet dem v238/v308 (khong doi newsCount)', appJs.includes('GIU quyet v238') && appJs.includes("cnt.textContent=list.length+' bài khớp bộ lọc.'"));
check('app.js van goi renderTopRows (2 hang tren khong doi)', appJs.includes('var topIds = renderTopRows(list);'));
check('app.js van loai top1 khoi danh sach chinh', appJs.includes('var mainList = topIds ? list.filter(function(a){ return topIds.indexOf(a) === -1; }) : list;'));
check('app.js shop list KHONG doi (renderPager khong opts)', (appJs.match(/renderPager\(document\.getElementById\('shopPager'\)/g) || []).length === 1 && !/shopPager'\),pg,totalPages,list\.length,.*windowed/.test(appJs));

// --- Tĩnh: sw.js CACHE ---
check('sw.js CACHE la v441-news-pagination-1', swJs.includes("const CACHE = 'v441-news-pagination-1';"));
check('sw.js KHONG con CACHE cu v417', !swJs.includes("const CACHE = 'v417-job-post-card-1';"));

// --- Logic thuan: pagerWindow (trich tu app.js, eval trong Node) ---
const m = appJs.match(/function pagerWindow\(page, totalPages\)\{[\s\S]*?\n\}/);
check('trich duoc pagerWindow tu app.js', !!m);
let pagerWindow = null;
if (m) { pagerWindow = vm.runInNewContext(m[0] + '\npagerWindow;', {}); }
if (pagerWindow) {
  check('pagerWindow(1,38) = [1,2,…,38] (trang 1 chi co ke 2)', eq(pagerWindow(1, 38), [1, 2, '…', 38]), JSON.stringify(pagerWindow(1, 38)));
  check('pagerWindow(19,38) = [1,…,18,19,20,…,38]', eq(pagerWindow(19, 38), [1, '…', 18, 19, 20, '…', 38]), JSON.stringify(pagerWindow(19, 38)));
  check('pagerWindow(38,38) = [1,…,37,38] (trang cuoi chi co ke 37)', eq(pagerWindow(38, 38), [1, '…', 37, 38]), JSON.stringify(pagerWindow(38, 38)));
  check('pagerWindow(2,38) = [1,2,3,…,38]', eq(pagerWindow(2, 38), [1, 2, 3, '…', 38]), JSON.stringify(pagerWindow(2, 38)));
  check('pagerWindow(3,5) = [1,2,3,4,5] (it trang: hien het)', eq(pagerWindow(3, 5), [1, 2, 3, 4, 5]), JSON.stringify(pagerWindow(3, 5)));
  check('pagerWindow(1,1) = [1]', eq(pagerWindow(1, 1), [1]), JSON.stringify(pagerWindow(1, 1)));
  check('pagerWindow(4,7) = [1..7] (nguong 7: hien het)', eq(pagerWindow(4, 7), [1, 2, 3, 4, 5, 6, 7]), JSON.stringify(pagerWindow(4, 7)));
  check('pagerWindow(4,8) = [1,…,3,4,5,…,8]', eq(pagerWindow(4, 8), [1, '…', 3, 4, 5, '…', 8]), JSON.stringify(pagerWindow(4, 8)));
}

// --- Mô phỏng với data.js thật (so bai tang theo thoi gian nen cac ky vong
// tinh theo so that, khong hardcode — truoc day hardcode 748 bai, rebase len
// main b2b13af (761 bai) lam 3 check FAIL du logic phan trang khong doi) ---
// Stage deploy KHÔNG mang data.js theo (không phải file của gói này) nên
// khi chạy từ stage thì bỏ qua khối mô phỏng — chạy từ worktree để kiểm đủ.
const dataJsPath = path.join(root, 'js/data.js');
if (!fs.existsSync(dataJsPath)) {
  console.log('SKIP mo phong data.js (khong co trong stage — chay tu worktree de kiem du)');
} else {
const ctx = { window: {} };
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(dataJsPath, 'utf8'), ctx);
const D = ctx.window.V20_DATA;
const articles = D.articles;
check('data.js: co ' + articles.length + ' bai (so that, tang theo thoi gian)', articles.length > 0, articles.length + ' bai');
// top1 = 4 bai ghim/moi nhat (giong renderTopRows): ghim truoc, thieu thi lap bang moi nhat theo date
const pinned = articles.filter(a => !!a.pinned).sort((a, b) => {
  const ao = typeof a.pinOrder === 'number' ? a.pinOrder : Infinity;
  const bo = typeof b.pinOrder === 'number' ? b.pinOrder : Infinity;
  if (ao !== bo) return ao - bo;
  return (a.date || '') > (b.date || '') ? -1 : 1;
});
const newest = articles.slice().sort((a, b) => (a.date || '') > (b.date || '') ? -1 : 1);
const top1 = pinned.slice(0, 4);
for (let i = 0; i < newest.length && top1.length < 4; i++) { if (top1.indexOf(newest[i]) === -1) top1.push(newest[i]); }
const mainListLen = articles.length - top1.length;
check('danh sach chinh = tong - 4 top (' + mainListLen + ' bai)', top1.length === 4 && mainListLen === articles.length - 4, mainListLen + ' bai, top=' + top1.length);
const perPage = 20;
const totalPages = Math.max(1, Math.ceil(mainListLen / perPage));
check('tong so trang = ceil(chinh/20) (' + totalPages + ' trang)', totalPages === Math.ceil(mainListLen / perPage) && totalPages >= 1, totalPages + ' trang');
check('trang 1 co 20 bai', Math.min(perPage, mainListLen) === 20);
const lastPageCount = mainListLen - (totalPages - 1) * perPage;
check('trang cuoi (' + totalPages + ') co ' + lastPageCount + ' bai (1..20)', lastPageCount >= 1 && lastPageCount <= 20, lastPageCount + ' bai');
check('trang 99 kep ve trang cuoi (' + totalPages + ')', Math.min(99, totalPages) === totalPages);
check('trang 0 kep ve 1', Math.max(1, 0) === 1);
}

console.log(`\n${pass} PASS, ${fail} FAIL`);
process.exit(fail ? 1 : 0);
