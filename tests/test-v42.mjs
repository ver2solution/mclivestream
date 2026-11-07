/* v42 tests — Node only, no browser. v42 = 4 viec (user-directed rang sang
   06/11/2026):
   (1) BO LOC / SAP XEP 2 trang con:
       - Trang Mau (danh-sach-mau.html): them o "Sắp xếp" (fSort) sau o Gioi
         tinh: Mac dinh (moi nhat) / Luong yeu cau thap->cao / cao->thap /
         Doanh thu dat duoc thap->cao / cao->thap. Luong dung salaryNum
         (17/20 "Thỏa thuận" = null, 3 mau co so: th-03/th-08 120.000,
         th-11 250.000); mau null LUON xep cuoi o ca 2 chieu. Doanh thu dung
         parseRevenue(topRevenue) — hien ca 20 deu "Chưa cập nhật" nen sap
         xep doanh thu khong doi thu tu (tat ca bang nhau, giu nguyen thu tu
         goc); logic dung khi co topRevenue that (test bang du lieu gia).
       - Trang Shop (danh-sach-shop.html): them o "Sắp xếp" (fShopSort) sau o
         Linh vuc live (Mac dinh / Luong gio thap->cao / cao->thap / Luong
         thang thap->cao / cao->thap) + o "Giờ làm" (fShopShift) sau o Sap
         xep (Tat ca gio / Sáng / Chiều / Tối / Fulltime). Luong gio dung
         parseHourlyMin moi (lay so THAP NHAT trong khoang gio, chi xet
         phan truoc moc gio de khong lay nham so hoa hong/thang o sau);
         luong thang dung parseMonthlyMax (v41). Shop khong co luong do
         LUON xep cuoi o ca 2 chieu.
       - Gio lam: them truong "shifts" cho moi shop trong data.js, suy ra tu
         req (chi gan khi req ghi RO — xem ghi chu dau data.js + bao cao v42):
         fulltime/full-time/toan thoi gian -> ["fulltime"]; moc gio
         05:00-11:00 -> "sang", 11:00-17:00 -> "chieu", 17:00-24:00 -> "toi"
         (1 shop co the co nhieu ca); khong ghi gio nao -> [] (chi hien khi
         chon "Tất cả giờ"). QUYET DINH: shop fulltime hien trong MOI ca khi
         loc gio lam (fulltime lam ca ngay) + khi loc rieng "Fulltime".
       - Sap xep ket hop dung voi bo loc cu + phan trang (mau 12/trang, shop
         9/trang) + dong bo URL (sort=, shift=) + prefill tu URL; nut Dat lai
         reset ca o moi ve mac dinh.
   (2) DONG HUONG DAN CHU SO HUU (.owner-note) o cuoi MOI the mau/shop, ngay
       DUOI .disclaimer (v40): "Đăng ký > Đăng nhập để sửa hồ sơ này, hoặc
       liên hệ Zalo để được gỡ bỏ." (them dau phay sau "hồ sơ này"). Link
       "Đăng ký"/"Đăng nhập" dung loai (mau: danh-sach-mau.html#dang-nhap-mau;
       shop: danh-sach-shop.html#dang-nhap-shop); "Zalo" -> zalo.me/0329983699
       (tab moi). Ly do: khop quy tac so huu ho so chot 05/11/2026 23:38.
   (3) FAQ trang chu (#faq): them muc thu 4 ve mien tru trach nhiem
       ("Ver2Solution có chịu trách nhiệm về thông tin trên hồ sơ không?" —
       dap dung van ban mien tru da chot o v40).
   (4) FAQ trang chu (#faq): them muc thu 5 ve cach sua ho so ("Muốn sửa hồ
       sơ thì phải làm thế nào?" — dap khop quy tac so huu ho so 23:38).
   (5) sw.js CACHE = 'v76-shell-1'. Du lieu khong doi: 20 mau, 30 shop,
       25 bai (chi them truong shifts cho shop; khong doi salary/topRevenue/
       req goc). KHONG doi trang chu (ngoai 2 muc FAQ), menu/nav, 4 o tin,
       trust strip v41, disclaimer v40. */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let pass = 0, fail = 0;
function t(name, cond, extra = '') { if (cond) { pass++; console.log('PASS v42:', name); } else { fail++; console.log('FAIL v42:', name, extra); } }
const D = (() => { const sb = { window: {} }; vm.createContext(sb); vm.runInContext(fs.readFileSync(path.join(root, 'js/data.js'), 'utf8'), sb); return sb.window.V20_DATA; })();
const V = (() => { const sb = { window: {}, module: { exports: {} }, console }; vm.createContext(sb); vm.runInContext(fs.readFileSync(path.join(root, 'js/data.js'), 'utf8'), sb); vm.runInContext(fs.readFileSync(path.join(root, 'js/app.js'), 'utf8'), sb); return sb.window.V20; })();
const appJs = fs.readFileSync(path.join(root, 'js/app.js'), 'utf8');
const css = fs.readFileSync(path.join(root, 'v20.css'), 'utf8');
const mauHtml = fs.readFileSync(path.join(root, 'danh-sach-mau.html'), 'utf8');
const shopHtml = fs.readFileSync(path.join(root, 'danh-sach-shop.html'), 'utf8');
const indexHtml = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const swJs = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');
const DISCLAIMER = 'Miễn trừ trách nhiệm: Thông tin được tổng hợp từ bài đăng công khai của cộng đồng, giữ nguyên nội dung gốc. Thông tin liên hệ hiển thị để các bên tự trao đổi công việc trực tiếp với nhau. Ver2Solution không thu bất kỳ phí dịch vụ nào — đây chỉ là trang cộng đồng kết nối.';

// ---- (1a) HTML: o Sap xep trang Mau ----
t('trang Mau: co select fSort sau o Gioi tinh',
  mauHtml.includes('id="fSort"') && mauHtml.indexOf('id="fGender"') < mauHtml.indexOf('id="fSort"') && mauHtml.indexOf('id="fSort"') < mauHtml.indexOf('id="fQ"'));
t('trang Mau: fSort du 5 lua chon dung value + nhan',
  ['<option value="">Mặc định (mới nhất)</option>', '<option value="wage-asc">Lương yêu cầu: thấp → cao</option>', '<option value="wage-desc">Lương yêu cầu: cao → thấp</option>', '<option value="revenue-asc">Doanh thu đạt được: thấp → cao</option>', '<option value="revenue-desc">Doanh thu đạt được: cao → thấp</option>'].every(o => mauHtml.includes(o)));

// ---- (1b) HTML: o Sap xep + Gio lam trang Shop ----
t('trang Shop: co select fShopSort sau o Linh vuc, fShopShift sau fShopSort',
  shopHtml.includes('id="fShopSort"') && shopHtml.includes('id="fShopShift"')
  && shopHtml.indexOf('id="fShopCat"') < shopHtml.indexOf('id="fShopSort"')
  && shopHtml.indexOf('id="fShopSort"') < shopHtml.indexOf('id="fShopShift"')
  && shopHtml.indexOf('id="fShopShift"') < shopHtml.indexOf('id="fPayType"'));
t('trang Shop: fShopSort du 5 lua chon dung value + nhan',
  ['<option value="">Mặc định (mới nhất)</option>', '<option value="hourly-asc">Lương giờ: thấp → cao</option>', '<option value="hourly-desc">Lương giờ: cao → thấp</option>', '<option value="monthly-asc">Lương tháng: thấp → cao</option>', '<option value="monthly-desc">Lương tháng: cao → thấp</option>'].every(o => shopHtml.includes(o)));
t('trang Shop: fShopShift du 5 lua chon dung value + nhan',
  ['<option value="">Tất cả giờ</option>', '<option value="sang">Sáng</option>', '<option value="chieu">Chiều</option>', '<option value="toi">Tối</option>', '<option value="fulltime">Fulltime</option>'].every(o => shopHtml.includes(o)));

// ---- (1c) parseHourlyMin ----
const hourlyCases = [
  ['50.000 – 120.000 VNĐ/giờ', 50000],
  ['Cast 150-200k/h', 150000],
  ['90.000đ/giờ livestream', 90000],
  ['Thỏa thuận', null],
  ['16–36 triệu/tháng', null],
  ['80-100k/h', 80000],
  ['95.000 – 140.000đ/giờ + 0.5% - 1% Hoa hồng', 95000],
  ['100.000 – 150.000đ/giờ + Hoa hồng 1%/gmv', 100000],
  ['70.000đ - 100.000đ / giờ (8.000.000đ - 15.000.000đ/tháng)', 70000],
  ['150-170/h (có ăn lãi doanh thu)', 150000],
  ['Cast: 100k/h', 100000],
  ['Chưa cập nhật', null],
  ['100k/giờ + 1% doanh thu + thưởng', 100000],
  ['90.000đ - 100.000đ/h + Phụ cấp ăn ca + Hoa hồng', 90000],
  ['20.000.000 – 50.000.000 VNĐ (Lương cơ bản 13 triệu + % Hoa hồng)', null],
];
hourlyCases.forEach(([s, want]) => {
  t('parseHourlyMin(' + JSON.stringify(s) + ') = ' + want, V.parseHourlyMin(s) === want, 'got ' + V.parseHourlyMin(s));
});

// ---- (1d) parseMonthlyMax kiem tra lai (v41) ----
[['16–36 triệu/tháng + KPI + thưởng ngày', 36], ['15–17 triệu/tháng + hoa hồng 16–20%', 17], ['Từ 15 triệu/tháng + hoa hồng', 15], ['8–18 triệu/tháng + hoa hồng', 18], ['50.000 – 120.000 VNĐ/giờ', null], ['70.000đ - 100.000đ / giờ (8.000.000đ - 15.000.000đ/tháng)', 15], ['20.000.000 – 50.000.000 VNĐ (Lương cơ bản 13 triệu + % Hoa hồng)', null]].forEach(([s, want]) => {
  t('parseMonthlyMax(' + JSON.stringify(s) + ') = ' + want, V.parseMonthlyMax(s) === want, 'got ' + V.parseMonthlyMax(s));
});

// ---- (1e) sortModelsBy: luong ----
const wageAsc = V.sortModelsBy(D.models, 'wage-asc');
t('sap luong mau tang: 120.000 (th-03, th-08) truoc 250.000 (th-11), 17 mau null cuoi cung',
  wageAsc.slice(0, 3).map(m => m.id).join(',') === 'th-03,th-08,th-11'
  && wageAsc.slice(3).every(m => m.salaryNum === null || m.salaryNum === undefined)
  && wageAsc.length === 20);
const wageDesc = V.sortModelsBy(D.models, 'wage-desc');
t('sap luong mau giam: th-11 (250.000) dau, roi th-03/th-08 (120.000), 17 mau null cuoi cung',
  wageDesc.slice(0, 3).map(m => m.id).join(',') === 'th-11,th-03,th-08'
  && wageDesc.slice(3).every(m => m.salaryNum === null || m.salaryNum === undefined));
t('sortModelsBy mac dinh ("") tra ve ban sao dung thu tu goc, khong doi mang goc',
  V.sortModelsBy(D.models, '').map(m => m.id).join(',') === D.models.map(m => m.id).join(',')
  && V.sortModelsBy(D.models, '') !== D.models);

// ---- (1f) sortModelsBy: doanh thu (hien tai tat ca "Chưa cập nhật") ----
const revAsc = V.sortModelsBy(D.models, 'revenue-asc');
const revDesc = V.sortModelsBy(D.models, 'revenue-desc');
t('sap doanh thu mau hien tai KHONG doi thu tu (ca 20 deu "Chưa cập nhật")',
  revAsc.map(m => m.id).join(',') === D.models.map(m => m.id).join(',')
  && revDesc.map(m => m.id).join(',') === D.models.map(m => m.id).join(','));
const fakeModels = [
  { id: 'x1', salaryNum: null, topRevenue: 'Chưa cập nhật' },
  { id: 'x2', salaryNum: null, topRevenue: '50 triệu' },
  { id: 'x3', salaryNum: null, topRevenue: '120.000.000' },
  { id: 'x4', salaryNum: null, topRevenue: '2,5 tỷ' },
];
t('sap doanh thu dung voi du lieu gia: tang x2 (50tr) < x3 (120tr) < x4 (2,5 ty), x1 null cuoi',
  V.sortModelsBy(fakeModels, 'revenue-asc').map(m => m.id).join(',') === 'x2,x3,x4,x1');
t('sap doanh thu giam voi du lieu gia: x4 > x3 > x2, x1 null cuoi',
  V.sortModelsBy(fakeModels, 'revenue-desc').map(m => m.id).join(',') === 'x4,x3,x2,x1');

// ---- (1g) sortShopsBy: luong gio ----
const hAsc = V.sortShopsBy(D.shops, 'hourly-asc');
const hAscVals = hAsc.map(s => V.parseHourlyMin(s.salary));
t('sap luong gio shop tang: 50000 (sh-02) dau, 70000 (sh-05) thu 2, 13 shop co luong gio truoc 17 shop null',
  hAsc[0].id === 'sh-02' && hAsc[1].id === 'sh-05'
  && hAscVals.slice(0, 13).every(v => v !== null) && hAscVals.slice(13).every(v => v === null)
  && JSON.stringify(hAscVals.slice(0, 13)) === JSON.stringify([50000, 70000, 80000, 80000, 90000, 90000, 95000, 100000, 100000, 100000, 100000, 150000, 150000]));
const hDesc = V.sortShopsBy(D.shops, 'hourly-desc');
const hDescVals = hDesc.map(s => V.parseHourlyMin(s.salary));
t('sap luong gio shop giam: 150000 dau, 50000 cuoi nhom co luong, 17 shop null cuoi cung',
  hDescVals.slice(0, 13).every(v => v !== null) && hDescVals.slice(13).every(v => v === null)
  && hDescVals[0] === 150000 && hDescVals[12] === 50000);

// ---- (1h) sortShopsBy: luong thang ----
const mAsc = V.sortShopsBy(D.shops, 'monthly-asc');
const mAscVals = mAsc.map(s => V.parseMonthlyMax(s.salary));
t('sap luong thang shop tang: 15 (sh-05, sh-26) dau, 36 (sh-25) cuoi nhom co luong, 23 shop null cuoi',
  mAscVals.slice(0, 7).join(',') === '15,15,17,17,18,18,36' && mAscVals.slice(7).every(v => v === null)
  && mAsc[0].id === 'sh-05' && mAsc[6].id === 'sh-25');
const mDesc = V.sortShopsBy(D.shops, 'monthly-desc');
const mDescVals = mDesc.map(s => V.parseMonthlyMax(s.salary));
t('sap luong thang shop giam: 36 dau, 15 cuoi nhom co luong, 23 shop null cuoi',
  mDescVals.slice(0, 7).join(',') === '36,18,18,17,17,15,15' && mDescVals.slice(7).every(v => v === null));
t('sortShopsBy mac dinh ("") tra ve ban sao dung thu tu goc',
  V.sortShopsBy(D.shops, '').map(s => s.id).join(',') === D.shops.map(s => s.id).join(','));

// ---- (1i) truong shifts ----
const validShifts = ['sang', 'chieu', 'toi', 'fulltime'];
t('du 30 shop co truong shifts la mang, chi chua gia tri hop le',
  D.shops.length === 30 && D.shops.every(s => Array.isArray(s.shifts) && s.shifts.every(x => validShifts.includes(x))));
t('13 shop co ca lam, 17 shop shifts rong; dung 2 shop fulltime (sh-18, sh-24)',
  D.shops.filter(s => s.shifts.length > 0).length === 13
  && D.shops.filter(s => s.shifts.includes('fulltime')).map(s => s.id).join(',') === 'sh-18,sh-24');
t('shifts suy ra dung tung shop mau: sh-02 [chieu,toi], sh-12 [sang,toi], sh-06/sh-19/sh-20 du 3 ca, sh-15 [sang], sh-13 [chieu]',
  JSON.stringify(D.shops.find(s => s.id === 'sh-02').shifts) === JSON.stringify(['chieu', 'toi'])
  && JSON.stringify(D.shops.find(s => s.id === 'sh-12').shifts) === JSON.stringify(['sang', 'toi'])
  && ['sh-06', 'sh-19', 'sh-20'].every(id => JSON.stringify(D.shops.find(s => s.id === id).shifts) === JSON.stringify(['sang', 'chieu', 'toi']))
  && JSON.stringify(D.shops.find(s => s.id === 'sh-15').shifts) === JSON.stringify(['sang'])
  && JSON.stringify(D.shops.find(s => s.id === 'sh-13').shifts) === JSON.stringify(['chieu']));
t('data.js: ghi chu quy tac suy ra shifts nam trong comment dau file',
  fs.readFileSync(path.join(root, 'js/data.js'), 'utf8').includes('v42 shifts (suy ra tu req cua shop'));

// ---- (1j) loc gio lam (filterShops + shift) ----
t('loc ca Toi: 9 shop co "toi" + 2 shop fulltime = 11 (fulltime hien trong moi ca)',
  V.filterShops(D.shops, { shift: 'toi' }).length === 11);
t('loc ca Sang: 5 shop co "sang" + 2 fulltime = 7',
  V.filterShops(D.shops, { shift: 'sang' }).length === 7);
t('loc ca Chieu: 5 shop co "chieu" + 2 fulltime = 7',
  V.filterShops(D.shops, { shift: 'chieu' }).length === 7);
t('loc rieng Fulltime: chi 2 shop fulltime',
  V.filterShops(D.shops, { shift: 'fulltime' }).map(s => s.id).join(',') === 'sh-18,sh-24');
t('khong loc gio (shift rong): du 30 shop',
  V.filterShops(D.shops, { shift: '' }).length === 30 && V.filterShops(D.shops, {}).length === 30);
t('loc ket hop ca Toi + Ha Noi = 8 (ca 8 deu Ha Noi; 2 fulltime o TP.HCM khong vao)',
  V.filterShops(D.shops, { shift: 'toi', prov: 'Hà Nội' }).length === 8);
t('loc ket hop ca Sang + TP.HCM = 2 (chi 2 shop fulltime, vi 5 shop sang deu o Ha Noi)',
  V.filterShops(D.shops, { shift: 'sang', prov: 'TP. Hồ Chí Minh' }).map(s => s.id).join(',') === 'sh-18,sh-24');

// ---- (1k) dong bo URL + prefill + reset (app.js) ----
t('initList: readForm co sort (fSort), prefill p.sort, reset gom fSort',
  appJs.includes("sort:document.getElementById('fSort').value")
  && appJs.includes("if(p.sort) document.getElementById('fSort').value=p.sort;")
  && appJs.includes("'fProv','fCat','fGender','fSort','fShift','fRevMin','fWageMin','fQ'"));
t('initShops: readForm co sort + shift, prefill p.sort/p.shift, reset gom ca 2',
  appJs.includes("sort:document.getElementById('fShopSort').value")
  && appJs.includes("shift:document.getElementById('fShopShift').value")
  && appJs.includes("if(p.sort) document.getElementById('fShopSort').value=p.sort;")
  && appJs.includes("if(p.shift) document.getElementById('fShopShift').value=p.shift;")
  && appJs.includes("'fShopProv','fShopCat','fShopSort','fShopShift','fPayType','fPayMin'"));
t('initList: chon sap xep thi dung sortModelsBy, mac dinh giu pipeline cu (views + rotateWindow, v64)',
  appJs.includes('list=sortModelsBy(list,f.sort);') && appJs.includes('if(f.sort){'));
t('initShops: chon sap xep thi dung sortShopsBy, mac dinh dung defaultShopOrder (xoay 8h + uu tien logo, v64)',
  appJs.includes('sortShopsBy(D.shops||[],f.sort)') && appJs.includes('defaultShopOrder(D.shops||[])'));
t('export window.V20: parseHourlyMin, sortModelsBy, sortShopsBy',
  typeof V.parseHourlyMin === 'function' && typeof V.sortModelsBy === 'function' && typeof V.sortShopsBy === 'function');

// ---- (1l) mo phong initList/initShops qua DOMContentLoaded (nhu test-v38) ----
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
// Trang Mau: ?sort=wage-asc -> the dau la th-03 (120.000), trang 1 co 12 the
{
  const els = { listGrid: stubEl(), pager: stubEl(), listInfo: stubEl(), fProv: stubEl(), fCat: stubEl(), fGender: stubEl(), fSort: stubEl(), fShift: stubEl(), fQ: stubEl(), applyBtn: stubEl(), resetBtn: stubEl() };
  const { sb } = runDom('?sort=wage-asc', els);
  void sb;
  const html = els.listGrid.innerHTML;
  const firstId = (html.match(/ho-so\.html\?id=(th-\d+)/) || [])[1];
  t('mo phong trang Mau ?sort=wage-asc: the dau la th-03, trang 1 du 12 the',
    firstId === 'th-03' && (html.match(/<article class="card"/g) || []).length === 12, 'first=' + firstId);
  t('mo phong trang Mau ?sort=wage-asc: prefill fSort = wage-asc',
    els.fSort.value === 'wage-asc', 'fSort=' + els.fSort.value);
}
// Trang Shop: ?shift=toi -> 11 shop loc duoc, trang 1 hien 9 the, pager "Trang 1 / 2"
{
  const els = { publicShopsList: stubEl(), shopPager: stubEl(), fShopProv: stubEl(), fShopCat: stubEl(), fShopSort: stubEl(), fShopShift: stubEl(), applyShopBtn: stubEl(), resetShopBtn: stubEl() };
  runDom('?shift=toi', els);
  t('mo phong trang Shop ?shift=toi: trang 1 hien 9 the, pager Trang 1 / 2, 11 tin (v61: khong con dong dem)',
    (els.publicShopsList.innerHTML.match(/shop-card/g) || []).length === 9
    && els.shopPager.innerHTML.includes('Trang 1 / 2') && els.shopPager.innerHTML.includes('trên tổng số 11 tin tuyển.'));
  t('mo phong trang Shop ?shift=toi: prefill fShopShift = toi',
    els.fShopShift.value === 'toi', 'fShopShift=' + els.fShopShift.value);
}
// Trang Shop: ?sort=hourly-asc -> the dau la sh-02 (50000)
{
  const els = { publicShopsList: stubEl(), shopPager: stubEl(), fShopProv: stubEl(), fShopCat: stubEl(), fShopSort: stubEl(), fShopShift: stubEl(), applyShopBtn: stubEl(), resetShopBtn: stubEl() };
  runDom('?sort=hourly-asc', els);
  const html = els.publicShopsList.innerHTML;
  t('mo phong trang Shop ?sort=hourly-asc: the dau la sh-02, truoc sh-05',
    html.indexOf('id=sh-02') !== -1 && html.indexOf('id=sh-02') < html.indexOf('id=sh-05'));
  t('mo phong trang Shop ?sort=hourly-asc: prefill fShopSort = hourly-asc',
    els.fShopSort.value === 'hourly-asc', 'fShopSort=' + els.fShopSort.value);
}

// ---- (2) Dong huong dan chu so huu (.owner-note) ----
const ownerModel = V.ownerNoteHTML('model');
const ownerShop = V.ownerNoteHTML('shop');
t('ownerNoteHTML(mau): dung van ban + link Dang ky/Dang nhap toi danh-sach-mau.html#dang-nhap-mau + link Zalo tab moi',
  ownerModel.includes('<p class="owner-note">')
  && ownerModel.includes('<a href="danh-sach-mau.html#dang-nhap-mau">Đăng ký</a>')
  && ownerModel.includes('<a href="danh-sach-mau.html#dang-nhap-mau">Đăng nhập</a>')
  && ownerModel.includes('để sửa hồ sơ này, hoặc liên hệ')
  && ownerModel.includes('<a href="https://zalo.me/0329983699" target="_blank" rel="noopener">Zalo</a>')
  && ownerModel.includes('để được gỡ bỏ.</p>'));
t('ownerNoteHTML(shop): dung van ban + link Dang ky/Dang nhap toi danh-sach-shop.html#dang-nhap-shop + link Zalo',
  ownerShop.includes('<a href="danh-sach-shop.html#dang-nhap-shop">Đăng ký</a>')
  && ownerShop.includes('<a href="danh-sach-shop.html#dang-nhap-shop">Đăng nhập</a>')
  && ownerShop.includes('https://zalo.me/0329983699'));
const cardHtml = V.cardHTML(D.models[0]);
const shopCardHtml = V.shopCardHTML(D.shops[0]);
t('the mau render ra co .owner-note dung link mau, nam SAU .disclaimer (cuoi the)',
  cardHtml.includes('<p class="owner-note">') && cardHtml.includes('danh-sach-mau.html#dang-nhap-mau')
  && cardHtml.indexOf('class="owner-note"') > cardHtml.indexOf('class="disclaimer"')
  && cardHtml.indexOf('class="owner-note"') > cardHtml.indexOf('class="card-actions"'));
t('the shop render ra co .owner-note dung link shop, nam SAU .disclaimer (cuoi the)',
  shopCardHtml.includes('<p class="owner-note">') && shopCardHtml.includes('danh-sach-shop.html#dang-nhap-shop')
  && shopCardHtml.indexOf('class="owner-note"') > shopCardHtml.indexOf('class="disclaimer"')
  && shopCardHtml.indexOf('class="owner-note"') > shopCardHtml.indexOf('class="card-actions"'));
t('moi the mau + the shop deu co .owner-note (20 + 30 the)',
  D.models.every(m => V.cardHTML(m).includes('class="owner-note"'))
  && D.shops.every(s => V.shopCardHTML(s).includes('class="owner-note"')));
t('CSS .owner-note: 12px, mau muted, link mau brand dam',
  /\.owner-note\{[^}]*font-size:12px[^}]*color:var\(--mut\)/.test(css.replace(/\s+/g, ''))
  && /\.owner-note\s+a\{[^}]*color:var\(--brand\)[^}]*font-weight:800/.test(css));
t('the mau: disclaimer van dung van ban + van sau .card-actions (khong vo v40)',
  cardHtml.includes('<p class="disclaimer">' + DISCLAIMER + '</p>')
  && cardHtml.indexOf('class="disclaimer"') > cardHtml.indexOf('class="card-actions"'));

// ---- (3) FAQ: muc thu 4 (mien tru trach nhiem) ----
const faqSection = (indexHtml.match(/<section class="section collapsed" id="faq">[\s\S]*?<\/section>/) || [''])[0];
const faqSteps = faqSection.match(/<div class="step[^"]*">[\s\S]*?<\/div>/g) || [];
t('FAQ trang chu: dung 13 muc .step (5 cu + 8 huong dan tai khoan/doi tuong/lô, v59)', faqSteps.length === 13, 'got ' + faqSteps.length);
t('FAQ muc 1-3 cu khong doi noi dung',
  faqSteps[0].includes('Xem hồ sơ có cần đăng nhập không?')
  && faqSteps[1].includes('Số riêng của mẫu có hiện trên web không?')
  && faqSteps[2].includes('Vì sao có hồ sơ ghi “Chưa cập nhật”?'));
t('FAQ muc 4: h3 dung cau hoi mien tru + p dung van ban mien tru da chot',
  faqSteps[3].includes('<h3>Ver2Solution có chịu trách nhiệm về thông tin trên hồ sơ không?</h3>')
  && faqSteps[3].includes('<p>Thông tin trên web được tổng hợp từ bài đăng công khai của cộng đồng, giữ nguyên nội dung gốc, không chỉnh sửa. Thông tin liên hệ hiển thị để các bên tự trao đổi công việc trực tiếp với nhau. Ver2Solution không thu bất kỳ phí dịch vụ nào — đây chỉ là trang cộng đồng kết nối.</p>'));

// ---- (4) FAQ: muc thu 5 (cach sua ho so) ----
t('FAQ muc 5: h3 dung cau hoi sua ho so + p dung van ban da chot',
  faqSteps[4].includes('<h3>Muốn sửa hồ sơ thì phải làm thế nào?</h3>')
  && faqSteps[4].includes('<p>Chỉ chủ hồ sơ mới sửa được hồ sơ của mình. Bạn đăng ký tài khoản rồi đăng nhập — thông tin liên hệ trong tài khoản phải trùng khớp với thông tin trên hồ sơ thì mới sửa được. Nếu chưa có tài khoản hoặc thông tin không khớp, liên hệ Zalo 032 998 3699 để được hỗ trợ hoặc gỡ bỏ hồ sơ.</p>'));
t('FAQ: thu tu dung — 3 muc cu, muc mien tru thu 4, muc sua ho so thu 5',
  faqSection.indexOf('Xem hồ sơ có cần đăng nhập không?') < faqSection.indexOf('Ver2Solution có chịu trách nhiệm')
  && faqSection.indexOf('Ver2Solution có chịu trách nhiệm') < faqSection.indexOf('Muốn sửa hồ sơ thì phải làm thế nào?'));

// ---- (5) sw.js + du lieu khong doi ----
t("sw.js CACHE = 'v84-shell-1'", swJs.includes("const CACHE = 'v84-shell-1';"));
t('du lieu khong doi: 20 mau, 30 shop, 50 bai',
  D.models.length === 20 && D.shops.length === 30 && D.articles.length === 50);
t('data.js: khong doi salary/topRevenue/req goc cua shop (chi them shifts)',
  D.shops.find(s => s.id === 'sh-02').salary === '50.000 – 120.000 VNĐ/giờ'
  && D.shops.find(s => s.id === 'sh-25').salary === '16–36 triệu/tháng + KPI + thưởng ngày'
  && D.models.every(m => m.topRevenue === 'Chưa cập nhật'));

console.log('v42: ' + pass + ' PASS, ' + fail + ' FAIL');
if (fail > 0) process.exit(1);
