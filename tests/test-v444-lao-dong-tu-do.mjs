// test-v444-lao-dong-tu-do.mjs — v444: trang rieng "Lao Dong Tu Do" (7 tab),
// xoa FAQ cuoi trang chu, nav 6 muc (bo Hoi dap + Dang ky, them Lao Dong
// Tu Do), loc tinh 34 don vi + yeu cau, khong tu cuon khi doi tab/loc (v213).
// Chay: node tests/test-v444-lao-dong-tu-do.mjs (tu goc repo hoac goc stage).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import { execSync } from 'node:child_process';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let pass = 0, fail = 0;
function check(name, ok, extra) {
  if (ok) { pass++; console.log('PASS ' + name); }
  else { fail++; console.log('FAIL ' + name + (extra !== undefined ? ' — ' + extra : '')); }
}
const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);

const pageHtml = fs.readFileSync(path.join(root, 'lao-dong-tu-do.html'), 'utf8');
const indexHtml = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const appJs = fs.readFileSync(path.join(root, 'js/app.js'), 'utf8');
const dataJs = fs.readFileSync(path.join(root, 'js/data.js'), 'utf8');
const css = fs.readFileSync(path.join(root, 'v20.css'), 'utf8');
const swJs = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');
const sweepJs = fs.readFileSync(path.join(root, 'tools/nav-sweep-lao-dong-tu-do.mjs'), 'utf8');

// --- Du lieu: trich tu data.js ---
function extractArray(src, name, closeRe) {
  const re = new RegExp('"' + name + '": \\[([\\s\\S]*?)' + closeRe);
  const m = src.match(re);
  if (!m) return null;
  return vm.runInNewContext('[' + m[1] + ']', {});
}
const jobs = dataJs.includes('"freelanceJobs": []') ? [] : extractArray(dataJs, 'freelanceJobs', '\\n \\],');
const people = dataJs.includes('"freelancePeople": []') ? [] : extractArray(dataJs, 'freelancePeople', '\\n \\],');
const cats = extractArray(dataJs, 'freelanceCats', '\\n \\],\\n "freelanceTab7"');
const tab7m = dataJs.match(/"freelanceTab7": (\{[^}]*\})/);
const tab7 = tab7m ? vm.runInNewContext('(' + tab7m[1] + ')', {}) : null;
const provinces = extractArray(dataJs, 'provinces', '\\n \\],');
check('freelanceJobs bat dau rong []', Array.isArray(jobs) && jobs.length === 0);
check('freelancePeople bat dau rong []', Array.isArray(people) && people.length === 0);
check('trich duoc freelanceCats (6 nhom)', Array.isArray(cats) && cats.length === 6, cats ? String(cats.length) : 'null');
if (cats) {
  check('6 nhom dung key theo thiet ke',
    eq(cats.map((c) => c.key), ['san-xuat', 'van-tai', 'dich-vu', 'cham-soc', 'xay-dung', 'nong-nghiep']),
    cats.map((c) => c.key).join(','));
  check('6 nhom dung nhan theo thiet ke',
    eq(cats.map((c) => c.label), ['Sản xuất và nhà máy', 'Vận tải, kho bãi và giao nhận', 'Dịch vụ, ăn uống và bán lẻ', 'Chăm sóc gia đình và làm đẹp', 'Xây dựng và sửa chữa', 'Nông nghiệp']));
  check('moi nhom co vi du cong viec', cats.every((c) => c.examples && c.examples.length > 5));
}
check('freelanceTab7 dung key + nhan', tab7 && tab7.key === 'ca-nhan' && tab7.label === 'Cá Nhân & Cửa hàng tìm người', tab7 ? JSON.stringify(tab7) : 'null');
check('provinces dung 35 muc (34 don vi + Toan quoc / Live online)',
  Array.isArray(provinces) && provinces.length === 35 && provinces.includes('Toàn quốc / Live online'),
  provinces ? String(provinces.length) : 'null');
check('provinces KHONG con 63 tinh cu', !provinces || !provinces.includes('Bắc Giang'));
check('khong SDT/email lo trong du lieu moi',
  !/0\d{9,10}/.test(JSON.stringify(cats)) && !/@/.test(JSON.stringify(cats)));

// --- Tinh: trang lao-dong-tu-do.html ---
const tabKeys = [...pageHtml.matchAll(/data-fl-tab="([^"]+)"/g)].map((m) => m[1]);
check('trang co du 7 tab dung thu tu', eq(tabKeys, ['san-xuat', 'van-tai', 'dich-vu', 'cham-soc', 'xay-dung', 'nong-nghiep', 'ca-nhan']), tabKeys.join(','));
check('tab 7 nhan dung "Cá Nhân & Cửa hàng tìm người"', pageHtml.includes('Cá Nhân &amp; Cửa hàng tìm người'));
check('trang co du o loc: tinh/kinh nghiem/hinh thuc/luong toi thieu/sap xep',
  ['id="flProv"', 'id="flExp"', 'id="flWorkType"', 'id="flMinSalary"', 'id="flSort"'].every((s) => pageHtml.includes(s)));
check('trang co nut Ap dung + Dat lai + dem + danh sach + trang thai trong + phan trang',
  ['id="flApplyBtn"', 'id="flResetBtn"', 'id="flCount"', 'id="flList"', 'id="flEmpty"', 'id="flPager"', 'id="flTabTitle"'].every((s) => pageHtml.includes(s)));
check('o kinh nghiem du 3 lua chon', pageHtml.includes('<option value="none">Không yêu cầu</option>') && pageHtml.includes('<option value="experienced">Có kinh nghiệm</option>') && pageHtml.includes('<option value="preferred">Ưu tiên có kinh nghiệm</option>'));
check('o hinh thuc du 4 lua chon', ['<option value="full">Toàn thời gian</option>', '<option value="part">Bán thời gian</option>', '<option value="shift">Theo ca</option>', '<option value="seasonal">Thời vụ</option>'].every((s) => pageHtml.includes(s)));
check('trang thai trong co nut Dang tin (login truoc)', pageHtml.includes('dang-nhap.html?next=lao-dong-tu-do.html') && pageHtml.includes('Đăng tin'));
check('nav trang moi: 6 muc, Lao Dong Tu Do active, khong Hoi dap/Dang ky',
  pageHtml.includes('<a href="lao-dong-tu-do.html" class="active">Lao Động Tự Do</a>')
  && pageHtml.includes('<a href="tin-tuc.html" class="">Tin tức</a>')
  && !pageHtml.includes('hoi-dap.html') && !pageHtml.includes('nav-register'));
check('canonical + title dung trang moi',
  pageHtml.includes('href="https://vieclamlivestream.online/lao-dong-tu-do.html"')
  && pageHtml.includes('<title>Lao động tự do — Sàn việc làm MC Livestream vieclamlivestream.online</title>'));
check('trang nap du script can thiet (data.js + app.js + auth-ui)',
  pageHtml.includes('src="js/data.js"') && pageHtml.includes('src="js/app.js"') && pageHtml.includes('src="js/auth-ui.js"'));

// --- Tinh: index.html (xoa FAQ + nav moi) ---
check('index.html KHONG con section FAQ (id="faq")', !indexHtml.includes('id="faq"'));
check('index.html KHONG con nut Xem them cau hoi (faqMoreBtn)', !indexHtml.includes('faqMoreBtn'));
check('index.html nav 6 muc (Lao Dong Tu Do co, khong Hoi dap/Dang ky)',
  indexHtml.includes('<a href="lao-dong-tu-do.html" class="">Lao Động Tự Do</a>')
  && !indexHtml.includes('hoi-dap.html') && !indexHtml.includes('nav-register'));
check('index.html van giu nut Dang Nhap ngoai nav', indexHtml.includes('Đăng Nhập</a>'));

// --- Tinh: app.js ---
check('app.js co initFreelancePage + freelanceCardHTML + freelanceMatches + freelanceSortList + freelanceCatLabel',
  appJs.includes('function initFreelancePage()') && appJs.includes('function freelanceCardHTML(item)')
  && appJs.includes('function freelanceMatches(item, f)') && appJs.includes('function freelanceSortList(list, sort)')
  && appJs.includes('function freelanceCatLabel(key)'));
check('app.js FREELANCE_PER_PAGE = 20', appJs.includes('var FREELANCE_PER_PAGE = 20;'));
check('app.js goi initFreelancePage tu DOMContentLoaded', appJs.includes('safeInit(initFreelancePage);'));
check('app.js export cac ham freelance ra window.V20',
  appJs.includes('initFreelancePage:initFreelancePage') && appJs.includes('freelanceCardHTML:freelanceCardHTML')
  && appJs.includes('freelanceMatches:freelanceMatches'));
check('app.js doi tab KHONG cuon (setTab -> render(false))', appJs.includes("setTab(b.getAttribute('data-fl-tab'), false)"));
check('app.js Ap dung CO cuon (render(true))', appJs.includes("applyBtn.addEventListener('click', function(){ page = 1; render(true); })"));
check('app.js Dat lai KHONG cuon (render(false))', appJs.includes("page = 1; render(false);"));
check('app.js nap tinh tu D.provinces (khong hardcode 63 tinh)', appJs.includes('D.provinces.forEach'));
check('app.js loc dung gatedContactsHTML cho lien he (E-189)', appJs.includes("gatedContactsHTML('freelance', item.contactRef)"));

// --- Tinh: v20.css + sw.js ---
check('v20.css co CSS the tin + trang thai trong (.fl-card/.fl-empty/.fl-kind)',
  css.includes('.fl-card') && css.includes('.fl-empty') && css.includes('.fl-kind'));
// Gop v444+v446+v447 (26/11, goi Cloudflare): CACHE lay ban cao nhat v447.
check('sw.js CACHE la v447-the-hang-van-chuyen-gon-1 (gop 3 goi)', swJs.includes("const CACHE = 'v447-the-hang-van-chuyen-gon-1';"));
check('sw.js KHONG con CACHE cu v443', !swJs.includes("const CACHE = 'v443-logistic-noi-dia-1';"));

// --- Tinh: nav-sweep script ---
check('script nav-sweep ton tai + co che --write/--dry-run',
  sweepJs.includes('--write') && sweepJs.includes('--dry-run') && sweepJs.includes('lao-dong-tu-do.html'));
let sweepOut = '';
let sweepOk = false;
try {
  sweepOut = execSync('node tools/nav-sweep-lao-dong-tu-do.mjs --dry-run', { cwd: root, encoding: 'utf8' });
  sweepOk = true;
} catch (e) { sweepOut = String((e && e.stdout) || e); }
check('nav-sweep dry-run chay OK (exit 0)', sweepOk, sweepOut.split('\n')[0]);
if (sweepOk) {
  const m = sweepOut.match(/by status: (\{[^}]*\})/);
  const st = m ? JSON.parse(m[1]) : {};
  const tm = sweepOut.match(/total html files: (\d+)/);
  const total = tm ? parseInt(tm[1], 10) : 0;
  // dem truc tiep so file co nav trong cay hien tai (lam viec ca o repo day du
  // lan o stage chi co vai file) — bat buoc: moi file co nav deu duoc doi.
  let navCount = 0, htmlCount = 0;
  (function walkHtml(dir) {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      if (e.name === '.git' || e.name === 'node_modules' || e.name === 'hidden_files' || e.name === '.github') continue;
      const p = path.join(dir, e.name);
      if (e.isDirectory()) walkHtml(p);
      else if (e.name.endsWith('.html')) {
        htmlCount++;
        if (fs.readFileSync(p, 'utf8').includes('id="mainNav"')) navCount++;
      }
    }
  })(root);
  check('nav-sweep: moi file co nav deu duoc doi (changed + unchanged == so file co nav), khong van de',
    total === htmlCount && (st.changed || 0) + (st.unchanged || 0) === navCount && (st['no-nav'] || 0) === htmlCount - navCount,
    JSON.stringify(st) + ' total=' + total + ' html=' + htmlCount + ' nav=' + navCount);
}

// --- Logic thuan: trich ham tu app.js ---
function grab(re) { const m = appJs.match(re); return m ? m[0] : null; }
const fEsc = grab(/function esc\(s\)\{[^\n]*\}/);
const fFmt = grab(/function fmtVnd\(n\)\{[^\n]*\}/);
const fGate = grab(/function gatedContactsHTML\(targetType, targetId\)\{[\s\S]*?\n\}/);
const fCats = grab(/function freelanceCats\(\)\{[\s\S]*?\n\}/);
const fCatLabel = grab(/function freelanceCatLabel\(key\)\{[\s\S]*?\n\}/);
const fTab7 = grab(/function freelanceTab7Label\(\)\{[\s\S]*?\n\}/);
const fSal = grab(/function freelanceSalaryText\(item\)\{[\s\S]*?\n\}/);
const fExp = grab(/function freelanceExpLabel\(exp\)\{[\s\S]*?\n\}/);
const fWt = grab(/function freelanceWorkTypeLabel\(wt\)\{[\s\S]*?\n\}/);
const fDate = grab(/function freelanceDateStr\(s\)\{[\s\S]*?\n\}/);
const fCard = grab(/function freelanceCardHTML\(item\)\{[\s\S]*?\n\}/);
const fMatch = grab(/function freelanceMatches\(item, f\)\{[\s\S]*?\n\}/);
const fSort = grab(/function freelanceSortList\(list, sort\)\{[\s\S]*?\n\}/);
check('trich duoc cac ham thuan tu app.js',
  !![fEsc, fFmt, fGate, fCats, fCatLabel, fTab7, fSal, fExp, fWt, fDate, fCard, fMatch, fSort].every(Boolean),
  [fEsc, fFmt, fGate, fCats, fCatLabel, fTab7, fSal, fExp, fWt, fDate, fCard, fMatch, fSort].map((x, i) => (x ? '' : i)).filter((x) => x !== '').join(','));
if ([fEsc, fFmt, fGate, fCats, fCatLabel, fTab7, fSal, fExp, fWt, fDate, fCard, fMatch, fSort].every(Boolean)) {
  const D = { freelanceCats: cats, freelanceTab7: tab7, provinces, freelanceJobs: [], freelancePeople: [] };
  const ctx = vm.createContext({ D, console });
  const lib = vm.runInContext(
    [fEsc, fFmt, fGate, fCats, fCatLabel, fTab7, fSal, fExp, fWt, fDate, fCard, fMatch, fSort].join('\n')
    + '\n({ freelanceMatches, freelanceSortList, freelanceCardHTML, freelanceCatLabel });', ctx);
  const { freelanceMatches: fm, freelanceSortList: fs, freelanceCardHTML: fc, freelanceCatLabel: fcl } = lib;
  const jobA = { id: 'fl-1', title: 'Tuyển phụ kho', cat: 'van-tai', province: 'Hà Nội', salary: 8000000, salaryType: 'month', exp: 'none', workType: 'full', desc: 'Phụ kho ca ngày', postedAt: '2026-11-25' };
  const jobB = { id: 'fl-2', title: 'Tuyển thợ may', cat: 'san-xuat', province: 'TP. Hồ Chí Minh', salary: 12000000, salaryType: 'month', exp: 'experienced', workType: 'shift', desc: 'May mặc xuất khẩu', postedAt: '2026-11-20' };
  check('freelanceCatLabel: dung nhan 6 nhom + tab 7',
    fcl('san-xuat') === 'Sản xuất và nhà máy' && fcl('nong-nghiep') === 'Nông nghiệp' && fcl('ca-nhan') === 'Cá Nhân & Cửa hàng tìm người');
  check('freelanceMatches: khong loc thi khop het', fm(jobA, { prov: '', exp: '', workType: '', minSalary: '' }));
  check('freelanceMatches: loc tinh loai sai tinh', fm(jobA, { prov: 'Hà Nội', exp: '', workType: '', minSalary: '' }) && !fm(jobA, { prov: 'Đà Nẵng', exp: '', workType: '', minSalary: '' }));
  check('freelanceMatches: loc kinh nghiem', fm(jobB, { prov: '', exp: 'experienced', workType: '', minSalary: '' }) && !fm(jobA, { prov: '', exp: 'experienced', workType: '', minSalary: '' }));
  check('freelanceMatches: loc hinh thuc', fm(jobB, { prov: '', exp: '', workType: 'shift', minSalary: '' }) && !fm(jobA, { prov: '', exp: '', workType: 'shift', minSalary: '' }));
  check('freelanceMatches: loc luong toi thieu', fm(jobB, { prov: '', exp: '', workType: '', minSalary: '10000000' }) && !fm(jobA, { prov: '', exp: '', workType: '', minSalary: '10000000' }));
  check('freelanceSortList: moi nhat truoc / cu nhat truoc',
    fs([jobA, jobB], 'newest')[0].id === 'fl-1' && fs([jobA, jobB], 'oldest')[0].id === 'fl-2');
  const htmlA = fc(jobA);
  check('the tin: co tieu de + nhom + tinh + luong + ngay dang',
    htmlA.includes('Tuyển phụ kho') && htmlA.includes('Vận tải, kho bãi và giao nhận') && htmlA.includes('Hà Nội')
    && htmlA.includes('8.000.000đ/tháng') && htmlA.includes('25/11/2026'));
  check('the tin: khong lo SDT/email', !/0\d{9,10}/.test(htmlA) && !/@/.test(htmlA));
  const htmlX = fc({ id: 'fl-x', title: '<script>alert(1)</script>', cat: 'san-xuat', province: 'Hà Nội', salary: 5000000, salaryType: 'month', exp: 'none', workType: 'full', desc: 'a & b', postedAt: '2026-11-25' });
  check('the tin: escape HTML (khong chay script)', !htmlX.includes('<script>alert') && htmlX.includes('&lt;script&gt;') && htmlX.includes('a &amp; b'));
  const peopleHtml = fc({ id: 'fp-1', kind: 'tim-viec', title: 'Tìm việc phụ bếp', cat: 'ca-nhan', province: 'Đà Nẵng', exp: 'experienced', desc: 'Có 2 năm kinh nghiệm', postedAt: '2026-11-24' });
  check('the tab 7: co nhan Tim viec + nhan tab day du',
    peopleHtml.includes('Tìm việc') && peopleHtml.includes('Cá Nhân &amp; Cửa hàng tìm người'));
  const peopleHtml2 = fc({ id: 'fp-2', kind: 'tim-nguoi', title: 'Cửa hàng cần thu ngân', cat: 'ca-nhan', province: 'Hà Nội', exp: 'none', desc: '', postedAt: '2026-11-24' });
  check('the tab 7: kind tim-nguoi co nhan Tim nguoi', peopleHtml2.includes('Tìm người'));
}

console.log('\n' + pass + ' PASS, ' + fail + ' FAIL');
process.exit(fail ? 1 : 0);
