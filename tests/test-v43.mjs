/* v43 tests — Node only, no browser. v43 = 3 viec (rang sang 06/11/2026):
   (1) KIEM TRA CHINH TA + NGON NGU TOAN BO WEBSITE — sua 4 loi RO RANG:
       - bai-viet/canh-bao-lua-dao-livestream-ngoc-trai.html §6: "không rõ
         minh bạch" -> "không minh bạch" ("không rõ minh bạch" khong phai
         tieng Viet dung: "rõ" + "minh bạch" mau thuan nhau).
       - bai-viet/nguoi-tieu-dung-bot-san-sale.html §2: "Giảm cuồng nhiệt
         với những dịp "siêu sale" trên sàn đang là xu hướng." -> "Người mua
         bớt cuồng nhiệt với những dịp "siêu sale" trên sàn đang là xu hướng."
         (cau goc thieu chu ngu: "Giảm cuồng nhiệt" khong dung lam chu de).
       - bai-viet/xa-kho-do-gia-dung-cuoi-nam.html §5: "bán nhanh mẫu mới
         mới nhập tiếp" -> "bán nhanh mẫu mới, rồi mới nhập tiếp" (lap tu
         "mới mới").
       - bai-viet/ban-da-kenh-mo-dau-ra-hang-viet.html §2: "phối hợp hợp
         kênh" -> "phối hợp đa kênh" (lap "hợp hợp", khong song song voi
         cac muc khac trong danh sach 6 kenh).
       KHONG sua: du lieu goc ho so mau/shop trong data.js (giu nguyen noi
       dung goc, ke ca khi thay sai chinh ta — chi liet ke vao bao cao);
       ten thuong hieu, thuat ngu tieng Anh co chu dich, ten rieng, so lieu,
       URL, ma; cac chuoi DA CHOT (disclaimer v40, dong PR v41, 2 cau hoi FAQ
       moi v42, owner-note v42) — khong co loi chinh ta nen giu nguyen.
       Nhom CAN QUYET (khong tu sua, chi liet ke vao bao cao): ty vs ti
       (88 vs 103), minh họa vs minh hoạ (18 vs 1), eMarketer vs EMARKETER
       (10 vs 1), quý 3 vs quý III (9 vs 17), TP HCM vs TP. Hồ Chí Minh
       trong bai-viet (5 vs 5), tháng 05/2026 vs tháng 5/2026 (9 vs 2),
       dau gach noi trong khoang so ("-" vs "–": 70-30, 10-15, 20-25,
       200-300, 8-10, 40-45, 1-2, 1-2 trong takeaway 11.11), "1-1" vs "1:1"
       trong du lieu shop, "mẫu live"/"live" vs "mẫu livestream"/"livestream",
       "tự up" trong FAQ, "active"/"Client" trong vi-tien-ao.html.
   (2) DOI NHAN 2 O SAP XEP (user-directed):
       - danh-sach-shop.html: nhan o fShopSort "Sắp xếp" -> "Sắp xếp lương"
         (chi doi <label>, khong doi 5 lua chon ben trong).
       - danh-sach-mau.html: nhan o fSort "Sắp xếp" -> "Sắp xếp doanh thu"
         (chi doi <label>, khong doi 5 lua chon ben trong).
   (3) THEM O LOC "GIO LAM" VAO TRANG DANH SACH MAU (user-directed):
       - js/data.js: them truong "shifts" cho moi mau, suy ra tu "schedule"
         (chi gan khi schedule ghi RO moc gio/ca — xem ghi chu dau data.js):
         th-03 ["chieu","toi"] (14h–18h hoac 19h–23h); th-05 ["toi"]
         (Sau 18h00); th-12 ["toi"] (20h–22h30); th-13 ["sang","chieu"]
         ("Ca ngày" = lam ban ngay = sang+chieu — quyet dinh v43);
         th-14 ["toi"] (Dang trong ca toi); th-16 ["toi"] (Uu tien ca toi);
         th-20 ["chieu","toi"] (Ranh ca chieu va toi); 13 mau con lai []:
         "Chưa cập nhật" (7 mau), "Chưa cập nhật giờ cụ thể", "4 tiếng/ngày,
         linh hoạt" (thoi luong, khong phai moc gio), "Part-time / theo ca,
         trao doi them", "Đang trống lịch", "Còn trống một vài khung giờ",
         "Còn nhiều khung giờ trống" (chung chung, khong phai moc gio).
         KHONG mau nao ghi fulltime -> o loc mau CHI co 4 lua chon
         (Tat ca gio / Sáng / Chiều / Tối), KHONG co Fulltime nhu trang Shop.
       - danh-sach-mau.html: them select id="fShift" NGAY SAU o Sap xep
         (fSort), nhan "Giờ làm", data-track="loc-gio-lam-mau".
       - js/app.js: loc theo shifts trong filterModels (ket hop dung voi
         Tinh/Linh vuc/Gioi tinh/Tim kiem/Sap xep + phan trang 12/trang) +
         dong bo URL (shift=, prefill tu URL) + nut Dat lai reset ca o moi.
         Mau khong co fulltime nen khong ap quyet dinh fulltime-hien-trong-
         moi-ca nhu shop.
   (4) sw.js CACHE = 'v76-shell-1' (ghi chu dau file v43 -> v44 -> v49). Du lieu
       khong doi: 20 mau, 30 shop, 25 bai (chi them truong shifts cho mau;
       khong doi salary/schedule/exp/req goc). */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let pass = 0, fail = 0;
function t(name, cond, extra = '') { if (cond) { pass++; console.log('PASS v43:', name); } else { fail++; console.log('FAIL v43:', name, extra); } }
const D = (() => { const sb = { window: {} }; vm.createContext(sb); vm.runInContext(fs.readFileSync(path.join(root, 'js/data.js'), 'utf8'), sb); return sb.window.V20_DATA; })();
const V = (() => { const sb = { window: {}, module: { exports: {} }, console }; vm.createContext(sb); vm.runInContext(fs.readFileSync(path.join(root, 'js/data.js'), 'utf8'), sb); vm.runInContext(fs.readFileSync(path.join(root, 'js/app.js'), 'utf8'), sb); return sb.window.V20; })();
const appJs = fs.readFileSync(path.join(root, 'js/app.js'), 'utf8');
const mauHtml = fs.readFileSync(path.join(root, 'danh-sach-mau.html'), 'utf8');
const shopHtml = fs.readFileSync(path.join(root, 'danh-sach-shop.html'), 'utf8');
const swJs = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');

// ---- (1) 4 loi chinh ta da sua: chuoi moi co mat, chuoi cu bien mat ----
t('chinh ta 1: canh-bao-lua-dao §6 dung "không minh bạch", het "không rõ minh bạch"',
  read('bai-viet/canh-bao-lua-dao-livestream-ngoc-trai.html').includes('nhằm nhận tiền thưởng từ các nguồn không minh bạch trên mạng')
  && !read('bai-viet/canh-bao-lua-dao-livestream-ngoc-trai.html').includes('không rõ minh bạch'));
t('chinh ta 2: bot-san-sale §2 dung "Người mua bớt cuồng nhiệt", het "Giảm cuồng nhiệt"',
  read('bai-viet/nguoi-tieu-dung-bot-san-sale.html').includes('Người mua bớt cuồng nhiệt với những dịp "siêu sale" trên sàn đang là xu hướng.')
  && !read('bai-viet/nguoi-tieu-dung-bot-san-sale.html').includes('Giảm cuồng nhiệt'));
t('chinh ta 3: xa-kho-do-gia-dung §5 dung "bán nhanh mẫu mới, rồi mới nhập tiếp", het "mẫu mới mới"',
  read('bai-viet/xa-kho-do-gia-dung-cuoi-nam.html').includes('bán nhanh mẫu mới, rồi mới nhập tiếp')
  && !read('bai-viet/xa-kho-do-gia-dung-cuoi-nam.html').includes('mẫu mới mới'));
t('chinh ta 4: ban-da-kenh §2 dung "phối hợp đa kênh", het "phối hợp hợp kênh"',
  read('bai-viet/ban-da-kenh-mo-dau-ra-hang-viet.html').includes('phối hợp đa kênh')
  && !read('bai-viet/ban-da-kenh-mo-dau-ra-hang-viet.html').includes('phối hợp hợp kênh'));

// ---- (1b) chuoi DA CHOT khong doi (khong co loi chinh ta) ----
const DISCLAIMER = 'Miễn trừ trách nhiệm: Thông tin được tổng hợp từ bài đăng công khai của cộng đồng, giữ nguyên nội dung gốc. Thông tin liên hệ hiển thị để các bên tự trao đổi công việc trực tiếp với nhau. Ver2Solution không thu bất kỳ phí dịch vụ nào — đây chỉ là trang cộng đồng kết nối.';
t('chuoi chot khong doi: disclaimer v40 nguyen van trong app.js',
  appJs.includes(DISCLAIMER));
t('chuoi chot khong doi: dong PR v41 nguyen van trong index.html',
  read('index.html').includes('Ver2Solution — hơn 8 năm xây dựng hệ sinh thái dịch vụ cho shop bán hàng online và livestream. Hơn 1.000 khách hàng toàn quốc, từ shop nhỏ đến tập đoàn lớn, đã tin dùng dịch vụ của chúng tôi — gồm các dự án triển khai cùng Thaco Trường Hải, TPBank, Cốc Cốc, Đêm Kim Cương và hàng trăm doanh nghiệp khác.'));
t('chuoi chot khong doi: 2 cau hoi FAQ moi v42 nguyen van trong index.html',
  read('index.html').includes('Ver2Solution có chịu trách nhiệm về thông tin trên hồ sơ không?')
  && read('index.html').includes('Muốn sửa hồ sơ thì phải làm thế nào?'));
t('chuoi chot khong doi: owner-note v42 nguyen van trong app.js',
  appJs.includes('để sửa hồ sơ này, hoặc liên hệ') && appJs.includes('để được gỡ bỏ.'));

// ---- (2) 2 nhan sap xep moi ----
t('nhan moi: trang Shop o fShopSort la "Sắp xếp lương", dung ngay truoc select',
  shopHtml.includes('<label>Sắp xếp lương</label><select id="fShopSort"'));
t('nhan moi: trang Mau o fSort la "Sắp xếp doanh thu", dung ngay truoc select',
  mauHtml.includes('<label>Sắp xếp doanh thu</label><select id="fSort"'));
t('nhan moi: khong con nhan "Sắp xếp" tran dung truoc fSort/fShopSort',
  !mauHtml.includes('<label>Sắp xếp</label><select id="fSort"')
  && !shopHtml.includes('<label>Sắp xếp</label><select id="fShopSort"'));
t('nhan moi: 5 lua chon trong fSort khong doi (value + nhan)',
  ['<option value="">Mặc định (mới nhất)</option>', '<option value="wage-asc">Lương yêu cầu: thấp → cao</option>', '<option value="wage-desc">Lương yêu cầu: cao → thấp</option>', '<option value="revenue-asc">Doanh thu đạt được: thấp → cao</option>', '<option value="revenue-desc">Doanh thu đạt được: cao → thấp</option>'].every(o => mauHtml.includes(o)));
t('nhan moi: 5 lua chon trong fShopSort khong doi (value + nhan)',
  ['<option value="">Mặc định (mới nhất)</option>', '<option value="hourly-asc">Lương giờ: thấp → cao</option>', '<option value="hourly-desc">Lương giờ: cao → thấp</option>', '<option value="monthly-asc">Lương tháng: thấp → cao</option>', '<option value="monthly-desc">Lương tháng: cao → thấp</option>'].every(o => shopHtml.includes(o)));
t('nhan moi (v45, v57): o Gio lam trang Shop nhan "Giờ làm" (5 lua chon, co Fulltime khong doi)',
  shopHtml.includes('<label>Giờ làm</label><select id="fShopShift"')
  && shopHtml.includes('<option value="fulltime">Fulltime</option>'));

// ---- (3) O loc Gio lam trang Mau: HTML ----
t('loc gio lam mau: co select fShift ngay sau fSort, nhan "Giờ làm", data-track dung',
  mauHtml.includes('id="fShift"') && mauHtml.includes('<label>Giờ làm</label><select id="fShift" data-track="loc-gio-lam-mau">')
  && mauHtml.indexOf('id="fSort"') < mauHtml.indexOf('id="fShift"')
  && mauHtml.indexOf('id="fShift"') < mauHtml.indexOf('id="fQ"'));
t('loc gio lam mau: fShift du 4 lua chon dung value + nhan, KHONG co Fulltime',
  ['<option value="">Tất cả giờ</option>', '<option value="sang">Sáng</option>', '<option value="chieu">Chiều</option>', '<option value="toi">Tối</option>'].every(o => mauHtml.includes(o))
  && !mauHtml.includes('<option value="fulltime">'));

// ---- (3b) O loc Gio lam trang Mau: du lieu shifts ----
const wantShifts = {
  'th-01': [], 'th-02': [], 'th-03': ['chieu', 'toi'], 'th-04': [],
  'th-05': ['toi'], 'th-06': [], 'th-07': [], 'th-08': [],
  'th-09': [], 'th-10': [], 'th-11': [], 'th-12': ['toi'],
  'th-13': ['sang', 'chieu'], 'th-14': ['toi'], 'th-15': [],
  'th-16': ['toi'], 'th-17': [], 'th-18': [], 'th-19': [],
  'th-20': ['chieu', 'toi'],
};
t('loc gio lam mau: shifts du 20 mau, dung bang suy ra',
  D.models.length === 20 && D.models.every(m => Array.isArray(m.shifts)
    && JSON.stringify(m.shifts) === JSON.stringify(wantShifts[m.id])),
  'got ' + D.models.map(m => m.id + ':' + JSON.stringify(m.shifts)).join(' '));
t('loc gio lam mau: shifts chi gia tri hop le (sang/chieu/toi), khong co fulltime',
  D.models.every(m => (m.shifts || []).every(s => ['sang', 'chieu', 'toi'].includes(s))));
t('loc gio lam mau: dung 7 mau co ca (th-03, th-05, th-12, th-13, th-14, th-16, th-20)',
  D.models.filter(m => (m.shifts || []).length).map(m => m.id).join(',') === 'th-03,th-05,th-12,th-13,th-14,th-16,th-20');

// ---- (3c) O loc Gio lam trang Mau: loc dung so luong ----
t('loc gio lam mau: ca Sang = 1 (th-13)',
  V.filterModels(D.models, { shift: 'sang' }).map(m => m.id).join(',') === 'th-13');
t('loc gio lam mau: ca Chieu = 3 (th-03, th-13, th-20)',
  V.filterModels(D.models, { shift: 'chieu' }).map(m => m.id).join(',') === 'th-03,th-13,th-20');
t('loc gio lam mau: ca Toi = 6 (th-03, th-05, th-12, th-14, th-16, th-20)',
  V.filterModels(D.models, { shift: 'toi' }).map(m => m.id).join(',') === 'th-03,th-05,th-12,th-14,th-16,th-20');
t('loc gio lam mau: khong chon gio = du 20 mau',
  V.filterModels(D.models, {}).length === 20);
t('loc gio lam mau: ket hop ca Toi + TP.HCM = 3 (th-03, th-05, th-16)',
  V.filterModels(D.models, { shift: 'toi', prov: 'TP. Hồ Chí Minh' }).map(m => m.id).join(',') === 'th-03,th-05,th-16');
t('loc gio lam mau: ket hop ca Sang + Ha Noi = 1 (th-13)',
  V.filterModels(D.models, { shift: 'sang', prov: 'Hà Nội' }).map(m => m.id).join(',') === 'th-13');
t('loc gio lam mau: ket hop ca Chieu + Thoi trang = 2 (th-13, th-20)',
  V.filterModels(D.models, { shift: 'chieu', cat: 'Thời trang' }).map(m => m.id).join(',') === 'th-13,th-20');

// ---- (3d) O loc Gio lam trang Mau: dong bo URL + prefill + reset ----
t('loc gio lam mau: initList readForm co shift (fShift), prefill p.shift, reset gom fShift',
  appJs.includes("shift:document.getElementById('fShift').value")
  && appJs.includes("if(p.shift) document.getElementById('fShift').value=p.shift;")
  && appJs.includes("'fProv','fCat','fGender','fSort','fShift','fRevMin','fWageMin','fQ'"));

// ---- (3e) O loc Gio lam trang Mau: mo phong DOM ?shift=toi ----
function stubEl() { return { innerHTML: '', textContent: '', value: '', addEventListener() {}, querySelectorAll: () => [], scrollIntoView() {} }; }
function runDom(search, extraEls) {
  const els = Object.assign({}, extraEls);
  const handlers = {};
  const sb = { window: {}, module: { exports: {} }, console, URLSearchParams, location: { search }, history: { replaceState() {} } };
  sb.document = { getElementById: id => els[id] || null, createElement: () => stubEl(), addEventListener(type, fn) { handlers[type] = fn; } };
  vm.createContext(sb);
  vm.runInContext(fs.readFileSync(path.join(root, 'js/data.js'), 'utf8'), sb);
  vm.runInContext(fs.readFileSync(path.join(root, 'js/app.js'), 'utf8'), sb);
  handlers['DOMContentLoaded']();
  return { els, sb };
}
{
  const els = { listGrid: stubEl(), pager: stubEl(), listInfo: stubEl(), fProv: stubEl(), fCat: stubEl(), fGender: stubEl(), fSort: stubEl(), fShift: stubEl(), fQ: stubEl(), applyBtn: stubEl(), resetBtn: stubEl() };
  runDom('?shift=toi', els);
  t('mo phong trang Mau ?shift=toi: hien 6 the, pager Trang 1 / 1 (v62: khong con dong dem listInfo)',
    (els.listGrid.innerHTML.match(/<article class="card"/g) || []).length === 6
    && els.pager.innerHTML.includes('Trang 1 / 1') && els.pager.innerHTML.includes('trên tổng số 6 hồ sơ.'),
    'cards=' + (els.listGrid.innerHTML.match(/<article class="card"/g) || []).length);
  t('mo phong trang Mau ?shift=toi: prefill fShift = toi',
    els.fShift.value === 'toi', 'fShift=' + els.fShift.value);
}
{
  const els = { listGrid: stubEl(), pager: stubEl(), listInfo: stubEl(), fProv: stubEl(), fCat: stubEl(), fGender: stubEl(), fSort: stubEl(), fShift: stubEl(), fQ: stubEl(), applyBtn: stubEl(), resetBtn: stubEl() };
  runDom('?shift=sang', els);
  t('mo phong trang Mau ?shift=sang: hien 1 the (th-13), prefill fShift = sang',
    (els.listGrid.innerHTML.match(/<article class="card"/g) || []).length === 1
    && els.listGrid.innerHTML.includes('ho-so.html?id=th-13')
    && els.fShift.value === 'sang');
}

// ---- (4) sw.js + du lieu khong doi ----
t("sw.js CACHE = 'v84-shell-1' + ghi chu dau file v49",
  swJs.includes("const CACHE = 'v84-shell-1';") && swJs.includes('/* v60 service worker'));
t('du lieu khong doi: 20 mau, 30 shop, 50 bai',
  D.models.length === 20 && D.shops.length === 30 && D.articles.length === 50,
  'mau=' + D.models.length + ' shop=' + D.shops.length + ' bai=' + D.articles.length);
t('du lieu goc khong doi: salary/schedule/exp mau + salary/req shop giu nguyen (chi them shifts; v44 C8 ngoai le duy nhat: sh-30 req "1-1" -> "1:1")',
  D.models.find(m => m.id === 'th-03').salary === '120.000–150.000 đồng/giờ, hỗ trợ test live / thử việc'
  && D.models.find(m => m.id === 'th-02').name === 'G T MY Duyênn'
  && D.models.find(m => m.id === 'th-13').schedule === 'Ca ngày, 4–6 tiếng (2 ca)'
  && D.shops.find(s => s.id === 'sh-02').salary === '50.000 – 120.000 VNĐ/giờ'
  && D.shops.find(s => s.id === 'sh-05').req === 'Nữ, sinh năm 2K–2K6; ưu tiên đã có kinh nghiệm livestream thời trang nữ; 1 ngày 2 ca, mỗi ca 3 tiếng.'
  && D.shops.find(s => s.id === 'sh-30').req === 'Đào tạo 1:1 từ đầu. Không áp KPI. Đến phỏng vấn nhận lì xì.');

console.log(`\nTOTAL v43: ${pass} PASS, ${fail} FAIL`);
process.exit(fail ? 1 : 0);
