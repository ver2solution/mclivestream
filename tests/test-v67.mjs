// test-v67.mjs — v67: kiem tra chinh ta toan web + gon trang Shop (06/11/2026).
// (A) Viet hoa chu cai dau: 10 nhan trust strip (index.html + js/app.js),
//     3 span rule-grid 3-3-30 (bai-viet-bop-reach), 4 o bang tinh loi
//     (tiktok-shop-1111-tinh-loi), 4 cau sau dau hai cham (shop x2, vi-tien-ao,
//     quy-tac-diem-thuong). Khong co loi chinh ta loai (a) nao tim thay.
// (B) Xoa 2 doan .lot-intro trang Shop (lo + xuong); giu 4 dong .lot-sub.
// (C) Gop 3 bo loc len dau trang Shop (filter-area sau H1, thu tu shop -> lo
//     -> xuong); JS: initSectionFilter reset() reset them select trong khoi
//     loc theo filterId (khoi loc da ra ngoai section).
// (D) sw.js CACHE = v76-shell-1 + hash khoa file da doi.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let pass = 0, fail = 0;
function t(name, ok, extra = '') { if (ok) { pass++; console.log('PASS v67:', name); } else { fail++; console.log('FAIL v67:', name, extra); } }
const sha = (p) => crypto.createHash('sha256').update(fs.readFileSync(path.join(root, p))).digest('hex');

const indexHtml = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const shopHtml = fs.readFileSync(path.join(root, 'danh-sach-shop.html'), 'utf8');
const css = fs.readFileSync(path.join(root, 'v20.css'), 'utf8');
const appJs = fs.readFileSync(path.join(root, 'js/app.js'), 'utf8');
const sw = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');
const bop = fs.readFileSync(path.join(root, 'bai-viet-bop-reach.html'), 'utf8');
const lap = fs.readFileSync(path.join(root, 'bai-viet/tiktok-shop-1111-tinh-loi.html'), 'utf8');
const wallet = fs.readFileSync(path.join(root, 'vi-tien-ao.html'), 'utf8');
const rules = fs.readFileSync(path.join(root, 'quy-tac-diem-thuong.html'), 'utf8');

// ---- (A1) Trust strip: 10 nhan viet hoa (HTML tinh) ----
t('Trust: 10 nhan viet hoa trong index.html',
  indexHtml.includes('<span id="trustModelProvinces">Hồ sơ mẫu thật · 2 tỉnh + live online</span>')
  && indexHtml.includes('<span class="trust-sub" id="trustModelPay">Lương đề xuất từ 120.000đ/giờ</span>')
  && indexHtml.includes('<span id="trustShopProvinces">Shop đang tuyển mẫu · 2 tỉnh</span>')
  && indexHtml.includes('<span class="trust-sub" id="trustShopPay">Lương cao nhất 36 triệu/tháng</span>')
  && indexHtml.includes('<span>Khách bán livestream cần tuyển mẫu</span>')
  && indexHtml.includes('<span>Xưởng/nhà máy may nhận gia công</span>')
  && indexHtml.includes('<span>Tỉnh có xưởng nhận gia công</span>')
  && indexHtml.includes('<span>Lô xả hàng tồn kho</span>')
  && indexHtml.includes('<span>Đơn vị thu mua / ký gửi tồn kho</span>')
  && indexHtml.includes('<span>Chợ/sàn/TTTM/tổ chức xả kho</span>'));
t('Trust: khong con nhan viet thuong (tru FAQ giua cau)',
  !indexHtml.includes('<span>hồ sơ mẫu thật') && !indexHtml.includes('<span>lương đề xuất')
  && !indexHtml.includes('<span>shop đang tuyển') && !indexHtml.includes('<span>lương cao nhất')
  && !indexHtml.includes('<span>khách bán livestream') && !indexHtml.includes('<span>xưởng/nhà máy')
  && !indexHtml.includes('<span>tỉnh có xưởng') && !indexHtml.includes('<span>lô xả hàng')
  && !indexHtml.includes('<span>đơn vị thu mua') && !indexHtml.includes('<span>chợ/sàn/TTTM'));
t('Trust: FAQ muc 11 VAN giu chu thuong giua cau (khong sua nham)',
  indexHtml.includes('doanh nghiệp/shop xả hàng tồn kho, đơn vị thu mua / ký gửi tồn kho, và chợ/sàn/trung tâm thương mại/tổ chức xả kho'));

// ---- (A2) Trust strip: 5 chuoi JS viet hoa (renderTrustStats) ----
t('Trust JS: 5 chuoi renderTrustStats viet hoa',
  appJs.includes("'Hồ sơ mẫu thật · '") && appJs.includes("'Doanh thu cao nhất '")
  && appJs.includes("'Lương đề xuất từ '") && appJs.includes("'Shop đang tuyển mẫu · '")
  && appJs.includes("'Lương cao nhất '"));
t('Trust JS: ghi chu trong ngoac van giu nguyen (bat dau bang dau ngoac don)',
  appJs.includes("'(doanh thu cao nhất chưa có dữ liệu — sẽ thay bằng doanh thu cao nhất khi có)'"));

// ---- (A3) Rule-grid 3-3-30 + bang tinh loi ----
t('Bop-reach: 3 span rule-grid viet hoa',
  bop.includes('<span>Group / ngày là tối đa</span>')
  && bop.includes('<span>Tiếng giữa các lần đăng</span>')
  && bop.includes('<span>Caption phải đổi mới</span>'));
t('Tinh-loi: 4 o bang viet hoa (so lieu giu nguyen)',
  lap.includes('<td>Khoảng 33.000 đồng</td>') && lap.includes('<td>Khoảng 13.000 đồng</td>')
  && lap.includes('<td>Khoảng 7.000 đồng</td>')
  && lap.includes('<td>Khoảng 48.000 đồng (24.000 đồng/món)</td>')
  && lap.includes('33.000') && lap.includes('13.000') && lap.includes('7.000') && lap.includes('48.000'));
t('Tinh-loi: doan van giua cau VAN viet thuong (khong sua nham)',
  lap.includes('còn lời khoảng 33.000 đồng') && lap.includes('còn lời khoảng 13.000 đồng'));

// ---- (A4) Cau sau dau hai cham ----
t('Nhan: 2 cau trang Shop viet hoa sau dau hai cham',
  shopHtml.includes('<strong>Lưu thật vào hệ thống:</strong> Form này lưu hồ sơ thật khi shop đã đăng nhập.')
  && shopHtml.includes('<strong>Lưu thật vào hệ thống:</strong> Tin được lưu vào hệ thống, trạng thái chờ duyệt,'));
t('Nhan: vi-tien-ao + quy-tac viet hoa sau dau hai cham',
  wallet.includes('<strong>Gợi ý theo hồ sơ thật, không phải gợi ý ảo:</strong> Hồ sơ chưa có ảnh thật thì ưu tiên')
  && rules.includes('<strong>Lưu ý:</strong> Bảng điểm dưới đây là bảng chính thức,'));

// ---- (B) Xoa 2 doan .lot-intro, giu .lot-sub ----
t('Shop: khong con .lot-intro (da xoa 2 doan gioi thieu dai)',
  !shopHtml.includes('lot-intro') && !shopHtml.includes('Giúp doanh nghiệp xả hàng tồn kho thu về vốn')
  && !shopHtml.includes('Giúp shop và thương hiệu tìm xưởng may nhận gia công'));
t('Shop: giu du 4 dong .lot-sub (3 lo + 1 xuong, co so luong)',
  (shopHtml.match(/<p class="lot-sub"/g) || []).length === 4
  && shopHtml.includes('đang có 8 lô') && shopHtml.includes('Đang có 3 đơn vị')
  && shopHtml.includes('Đang có 2 chương trình') && shopHtml.includes('đang có 20 xưởng/nhà máy'));

// ---- (C1) Gop 3 bo loc: thu tu + vi tri ----
t('Loc: co khu vuc filter-area sau H1, dung 3 tieu de theo thu tu shop -> lo -> xuong',
  shopHtml.includes('<div class="filter-area">')
  && shopHtml.indexOf('<h3 class="filter-title">Tìm shop tuyển mẫu</h3>') > shopHtml.indexOf('<h1>Tìm shop tuyển mẫu livestream</h1>')
  && shopHtml.indexOf('<h3 class="filter-title">Tìm shop tuyển mẫu</h3>') < shopHtml.indexOf('<h3 class="filter-title">Tìm lô hàng xả kho</h3>')
  && shopHtml.indexOf('<h3 class="filter-title">Tìm lô hàng xả kho</h3>') < shopHtml.indexOf('<h3 class="filter-title">Tìm xưởng may nhận gia công</h3>')
  && shopHtml.indexOf('<h3 class="filter-title">Tìm xưởng may nhận gia công</h3>') < shopHtml.indexOf('id="lo-hang-xa-kho"'));
t('Loc: ca 3 khoi filter nam TRUOC section lo (tren dau trang)',
  shopHtml.indexOf('id="lotFilter"') < shopHtml.indexOf('id="lo-hang-xa-kho"')
  && shopHtml.indexOf('id="factoryFilter"') < shopHtml.indexOf('id="lo-hang-xa-kho"')
  && shopHtml.indexOf('id="lotFilter"') < shopHtml.indexOf('id="factoryFilter"'));
t('Loc: khoi lotFilter/factoryFilter KHONG con trong 2 section',
  (() => {
    const lotSec = shopHtml.slice(shopHtml.indexOf('id="lo-hang-xa-kho"'), shopHtml.indexOf('id="shop-list-title"'));
    const facSec = shopHtml.slice(shopHtml.indexOf('id="xuong-may-gia-cong"'));
    return !lotSec.includes('id="lotFilter"') && !lotSec.includes('id="factoryFilter"')
      && !facSec.includes('id="lotFilter"') && !facSec.includes('id="factoryFilter"');
  })());
t('Loc: du id moi khoi (shop 6 + lo 7 + xuong 8), moi id dung 1 lan',
  ['fShopProv', 'fShopCat', 'fShopSort', 'fShopShift', 'fPayType', 'fPayMin', 'applyShopBtn', 'resetShopBtn',
   'fLotPrice', 'fLotQty', 'fLotCat', 'lotApplyBtn', 'lotResetBtn', 'lotCount', 'lotEmpty',
   'fFacProv', 'fFacValue', 'fFacMoq', 'fFacCat', 'factoryApplyBtn', 'factoryResetBtn', 'factoryCount', 'factoryEmpty']
    .every((id) => (shopHtml.match(new RegExp('id="' + id + '"', 'g')) || []).length === 1));
t('Loc: 2 section van giu h2 + luoi the + nut Xem them (chi mat khoi filter)',
  shopHtml.includes('<h2 id="lot-title">Lô hàng xả kho</h2>')
  && shopHtml.includes('<h2 id="factory-title">Xưởng / Nhà máy may nhận gia công</h2>')
  && shopHtml.includes('id="lotMoreBtn"') && shopHtml.includes('id="factoryMoreBtn"')
  && shopHtml.includes('<div class="lot-grid" id="lotGrid1"></div>')
  && shopHtml.includes('<div class="lot-grid" id="factoryGrid"></div>')
  && (() => { const sb67 = { window: {}, module: { exports: {} }, console, document: { getElementById: () => null, addEventListener: () => {}, querySelectorAll: () => [] } }; vm.createContext(sb67); vm.runInContext(fs.readFileSync(path.join(root, 'js/data.js'), 'utf8'), sb67); const DD = sb67.window.V20_DATA; return DD.lots.length === 14 && DD.factories.length === 40; })());

// ---- (C2) CSS + JS cho khoi loc moi ----
t('CSS: co quy tac .filter-title (tieu de khoi loc)',
  css.includes('.filter-title{margin:14px 0 6px;font-size:15px}')
  && css.includes('.filter-area .filter-title:first-child{margin-top:6px}'));
t('JS: initLotFilter/initFactoryFilter truyen filterId',
  appJs.includes("filterId: 'lotFilter'") && appJs.includes("filterId: 'factoryFilter'"));
t('JS: reset() reset them select trong khoi loc theo filterId (v67)',
  appJs.includes("var fEl = opts.filterId ? document.getElementById(opts.filterId) : null;"));

// ---- (C3) Mock-DOM: reset() xoa select trong khoi loc da ra ngoai section ----
const sb = { window: {}, module: { exports: {} }, console, document: { querySelectorAll: () => [], getElementById: () => null, addEventListener: () => {} }, location: { search: '' } };
sb.window = sb.window || {};
vm.createContext(sb);
vm.runInContext(fs.readFileSync(path.join(root, 'js/data.js'), 'utf8'), sb);
vm.runInContext(fs.readFileSync(path.join(root, 'js/app.js'), 'utf8'), sb);
const V = sb.window.V20;
t('Mock reset: Dat lai xoa select trong khoi loc (khoi loc ngoai section, section khong con select)',
  (() => {
    const mkCard = (attrs) => {
      const cls = new Set();
      return { _a: attrs, getAttribute(k) { return k in this._a ? this._a[k] : null; },
        classList: { add(c) { cls.add(c); }, remove(c) { cls.delete(c); }, contains(c) { return cls.has(c); } },
        scrollCalls: 0, scrollIntoView() { this.scrollCalls++; } };
    };
    const cards = [mkCard({ 'data-price': '12000', 'data-qty': '300', 'data-cat': 'nu' }),
      mkCard({ 'data-price': '60000', 'data-qty': '8000', 'data-cat': 'quan-ao' })];
    const grid = { children: cards.slice(), appendChild(c) { const i = this.children.indexOf(c); if (i >= 0) this.children.splice(i, 1); this.children.push(c); } };
    const secCls = new Set(['collapsed']);
    // section SAU v67: khong con select ben trong (khoi loc da chuyen len dau trang)
    const section = { classList: { add(c) { secCls.add(c); }, remove(c) { secCls.delete(c); }, contains(c) { return secCls.has(c); } },
      querySelectorAll(sel) { return sel === '.lot-grid' ? [grid] : []; } };
    const moreBtn = { setAttribute() {}, textContent: '' };
    const sels = { fLotPrice: { value: 'lt20' }, fLotQty: { value: '' }, fLotCat: { value: '' } };
    // khoi loc o ngoai section: reset() phai tim select qua filterId
    const filterEl = { querySelectorAll(sel) { return sel === 'select' ? [sels.fLotPrice, sels.fLotQty, sels.fLotCat] : []; } };
    const applyBtn = { _h: null, addEventListener(e, fn) { this._h = fn; }, click() { this._h(); } };
    const resetBtn = { _h: null, addEventListener(e, fn) { this._h = fn; }, click() { this._h(); } };
    const countEl = { textContent: '' };
    const emptyEl = { hidden: true };
    const byId = { 'lo-hang-xa-kho': section, lotMoreBtn: moreBtn, lotApplyBtn: applyBtn, lotResetBtn: resetBtn, lotCount: countEl, lotEmpty: emptyEl,
      lotFilter: filterEl, fLotPrice: sels.fLotPrice, fLotQty: sels.fLotQty, fLotCat: sels.fLotCat };
    const origDoc = sb.document;
    sb.document = { getElementById(id) { return byId[id] || null; }, querySelectorAll() { return []; } };
    V.initLotFilter();
    applyBtn.click();
    const okApply = countEl.textContent === '1 lô khớp bộ lọc' && !secCls.has('collapsed');
    resetBtn.click();
    const okReset = sels.fLotPrice.value === '' && sels.fLotQty.value === '' && sels.fLotCat.value === ''
      && secCls.has('collapsed') && countEl.textContent === ''
      && grid.children.map(c => cards.indexOf(c)).join(',') === '0,1';
    sb.document = origDoc;
    return okApply && okReset;
  })());

// ---- (D) CACHE + hash khoa file da doi (v67) ----
t("sw.js CACHE = 'v86-shell-1'", sw.includes("const CACHE = 'v86-shell-1'"));
t("sw.js khong con cache cu (v66/v67/v68)", !/v6[678]-shell-1/.test(sw));
t('index.html giong het v68 (10 nhan trust viet hoa + nut header dang-nhap) (sha256)', sha('index.html') === 'dc7ee7d6a43a904d4c63c8c85ed041e9e2c70853787062506340b061527e7e39');
t('js/app.js giong het v69 (5 chuoi trust + filterId + reset + pinOrder) (sha256)', sha('js/app.js') === 'ae11dfaf0e5383a7d2d2f1d8c33de31090f1a5fd39e0251edb0f8b69d4590a20');
t('danh-sach-shop.html giong het v68 (2 nhan + xoa 2 lot-intro + gop 3 bo loc + nut header dang-nhap) (sha256)', sha('danh-sach-shop.html') === '42ae885d402e8e24c1e89b1063ae1f07483614fac7306a6f27eaea1a17bd0f56');
t('v20.css giong het v68 (them .filter-title + CSS auth) (sha256)', sha('v20.css') === '277d60ad92802afa8b68597fda4a2dd5f85c2c1edacd6fc44999b79dc3e47d87');
t('bai-viet-bop-reach.html giong het v68 (3 span rule-grid + nut header dang-nhap) (sha256)', sha('bai-viet-bop-reach.html') === '65c246d3de68760bf4181d310604678ca357be81e253c0c941cebdca8e9f8456');
t('bai-viet/tiktok-shop-1111-tinh-loi.html giong het v69-rebase (4 o bang + anh local + nut header dang-nhap) (sha256)', sha('bai-viet/tiktok-shop-1111-tinh-loi.html') === '79fc15503ff48080e633af182a48965f68721d9e894ba8bf4f75e0e7f20f586c');
t('vi-tien-ao.html giong het v68 (1 nhan + nut header dang-nhap) (sha256)', sha('vi-tien-ao.html') === '85b0fa7abc3352316f6a1d951cbb87f7a513cf2adeaef7c8ce2f8cd019546aa1');
t('quy-tac-diem-thuong.html giong het v68 (1 nhan + nut header dang-nhap) (sha256)', sha('quy-tac-diem-thuong.html') === 'b264c326c5e1e35c4735aacc4975c00a639f8d1c05eca4e96f494450208c5ce5');
t('danh-sach-mau.html giong het v68 (nut header dang-nhap) (sha256)', sha('danh-sach-mau.html') === '6e530e9407648b063ff96d6e1f19b2120a364a766004441ac991f3c096544159');
t('tin-tuc.html giong het v68 (nut header dang-nhap) (sha256)', sha('tin-tuc.html') === '0f462574e8c5afc7b09d179d4ec691f96fda11f1646c7aa6cc58eab136e529ac');

console.log(`v67: ${pass} PASS, ${fail} FAIL`);
process.exit(fail ? 1 : 0);
