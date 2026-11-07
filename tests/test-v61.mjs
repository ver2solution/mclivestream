/* v61 tests — Node only, no browser. v61 = 2 sua theo yeu cau nguoi dung
   06/11/2026:
   (A) Trang Shop gon lai: bo o tim theo ten (fShopQ) khoi bo loc + bo 2 dong
       gioi thieu duoi H1 (dong dem publicShopsCount + mo ta phan trang) +
       giam khoang cach (class page-shop: section dau margin-top 14px,
       section-head margin-bottom 12px, filter-card padding 16px/gap 10px,
       lot-section margin 14px 0). Huong dan phan trang 9 shop/trang chuyen
       sang FAQ muc 7 (theo quy tac: noi dung huong dan moi day ve Hoi dap).
   (B) Trang chu: them hang so lieu San xuat (20 xuong/nha may may nhan gia
       cong, 6 tinh) vao khung PR — nam GIUA hang chinh (Mau/Tim Mau) va hang
       Xa kho, dung thu tu: Mau, Tim Mau, San xuat, Xa kho. */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let pass = 0, fail = 0;
function t(name, cond, extra = '') { if (cond) { pass++; console.log('PASS v61:', name); } else { fail++; console.log('FAIL v61:', name, extra); } }
const sha = (p) => crypto.createHash('sha256').update(fs.readFileSync(path.join(root, p))).digest('hex');

const indexHtml = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const shopHtml = fs.readFileSync(path.join(root, 'danh-sach-shop.html'), 'utf8');
const css = fs.readFileSync(path.join(root, 'v20.css'), 'utf8');
const appJs = fs.readFileSync(path.join(root, 'js/app.js'), 'utf8');
const faqSection = (indexHtml.match(/<section class="section collapsed" id="faq">[\s\S]*?<\/section>/) || [''])[0];
const faqSteps = faqSection.match(/<div class="step[^"]*">[\s\S]*?<\/div>/g) || [];

// ---- (A) Trang Shop gon lai ----
// A1. Bo o tim theo ten (fShopQ) khoi HTML + JS
t('Shop: khong con o tim theo ten fShopQ (HTML + JS)', !shopHtml.includes('id="fShopQ"') && !appJs.includes('fShopQ'));
t('Shop: bo loc con du 6 truong (tinh/linh vuc/sap xep/gio lam/loai luong/muc luong toi thieu)', ['fShopProv', 'fShopCat', 'fShopSort', 'fShopShift', 'fPayType', 'fPayMin'].every((id) => shopHtml.includes(`id="${id}"`)));
const filterShopsFn = (appJs.match(/function filterShops\(list, f\)\{[\s\S]*?\n\}/) || [''])[0];
t('Shop: filterShops khong con loc theo tu khoa q (trang Mau van giu fQ)', !filterShopsFn.includes('f.q') && appJs.includes("if(f.q){var hay=(m.name+' '+m.title+")); 
t('Shop: nut Dat lai reset dung 6 o (khong con fShopQ)', appJs.includes("'fShopProv','fShopCat','fShopSort','fShopShift','fPayType','fPayMin']"));
// A2. Bo 2 dong gioi thieu duoi H1
t('Shop: khong con dong dem publicShopsCount (HTML + JS)', !shopHtml.includes('id="publicShopsCount"') && !appJs.includes('publicShopsCount'));
t('Shop: khong con mo ta phan trang tren trang Shop', !shopHtml.includes('mỗi trang tối đa 9 shop'));
t('Shop: H1 van nguyen + khong con class page-shop (v62: giam 1/2 toan site thay cho rieng trang Shop)', shopHtml.includes('<h1>Tìm shop tuyển mẫu livestream</h1>') && !shopHtml.includes('page-shop'));
// A3. Huong dan phan trang chuyen sang FAQ muc 7
t('FAQ muc 7: co cau phan trang 9 shop/trang (chuyen tu trang Shop)', faqSteps[6].includes('Danh sách shop phân trang, mỗi trang tối đa 9 shop.'));
t('FAQ muc 7: van du noi dung loc + xem tin khong can dang nhap', faqSteps[6].includes('lọc theo Tỉnh / Thành phố') && faqSteps[6].includes('Xem tin tuyển không cần đăng nhập.'));
// A4. Khoang cach gon lai (chi trang Shop)
t('CSS: giam 1/2 toan site (v62): .section 34->17px', css.includes('.section{margin:17px 0}'));
t('CSS: giam 1/2 toan site (v62) roi xuong 1/3 (v64): section-head margin-bottom 16->5px', css.includes('margin-bottom:5px}'));
t('CSS: giam 1/2 toan site (v62): filter-card padding 18->9px + gap 12->6px', css.includes('padding:9px;display:grid') && css.includes('gap:6px}'));
t('CSS: giam 1/2 toan site (v62): lot-section padding 22/24->11/12 + margin 18->9px', css.includes('padding:11px 12px;margin:9px 0'));
t('CSS: .section mac dinh giam 1/2 xuong 17px (v62, toan site)', css.includes('.section{margin:17px 0}'));

// ---- (B) Hang so lieu San xuat tren trang chu ----
// B1. Hang xuong may ton tai, dung so
t('PR: hang so lieu xuong may ton tai (id trustFactories=20, trustFactoryProvinces=6)', indexHtml.includes('<b id="trustFactories">20</b>') && indexHtml.includes('<b id="trustFactoryProvinces">6</b>'));
t('PR: nhan hang xuong may dung ("xưởng/nhà máy may nhận gia công", "tỉnh có xưởng nhận gia công")', indexHtml.includes('<span>Xưởng/nhà máy may nhận gia công</span>') && indexHtml.includes('<span>Tỉnh có xưởng nhận gia công</span>'));
// B2. Thu tu: Mau, Tim Mau, San xuat, Xa kho
t('PR: thu tu dung trong grid — Mau < Shop < Xuong < Lo (v65)', indexHtml.indexOf('id="trustModels"') < indexHtml.indexOf('id="trustShops"') && indexHtml.indexOf('id="trustShops"') < indexHtml.indexOf('id="trustFactories"') && indexHtml.indexOf('id="trustFactories"') < indexHtml.indexOf('id="trustLots"'));
t('PR: khong con class .trust-nums-factories rieng (v65 gop vao grid chung)', !css.includes('.trust-nums-factories') && !indexHtml.includes('trust-nums-factories'));
// B3. Kiem tra cheo: so tren trang chu khop du lieu that trong data.js (v76: the xuong khong con trong HTML tinh)
const sb61 = { window: {}, module: { exports: {} }, console, document: { getElementById: () => null, addEventListener: () => {}, querySelectorAll: () => [] } };
vm.createContext(sb61);
vm.runInContext(fs.readFileSync(path.join(root, 'js/data.js'), 'utf8'), sb61);
const FACT61 = sb61.window.V20_DATA.factories;
t('PR: so xuong tren trang chu (40) khop so xuong trong data.js', FACT61.length === 40, `xuong=${FACT61.length}`);
const provinces = new Set(FACT61.map(f => f.prov));
t('PR: so tinh tren trang chu (7) khop so tinh khac nhau trong data.js', provinces.size === 7, `tinh=${[...provinces].join(', ')}`);
t('PR: HTML trang Shop chi con container rong factoryGrid (khong con the tinh)', shopHtml.includes('<div class="lot-grid" id="factoryGrid"></div>') && !shopHtml.includes('<article class="lot-card"'));
t('PR: hang lo Xa kho van nguyen (8/3/2)', indexHtml.includes('<b id="trustLots">8</b>') && indexHtml.includes('<b id="trustBuyers">3</b>') && indexHtml.includes('<b id="trustBatch">2</b>'));

// ---- (C) Hash khoa file da doi (v61) ----
t('index.html giong het v61 (FAQ 7 phan trang + hang so lieu xuong may) (sha256)', sha('index.html') === 'dc7ee7d6a43a904d4c63c8c85ed041e9e2c70853787062506340b061527e7e39');
t('danh-sach-shop.html giong het v61 (bo fShopQ + bo 2 dong gioi thieu + class page-shop) (sha256)', sha('danh-sach-shop.html') === '42ae885d402e8e24c1e89b1063ae1f07483614fac7306a6f27eaea1a17bd0f56');
t('v20.css giong het v61 (them quy tac page-shop + trust-nums-factories) (sha256)', sha('v20.css') === '277d60ad92802afa8b68597fda4a2dd5f85c2c1edacd6fc44999b79dc3e47d87');
t('js/app.js giong het v61 (bo loc q + bo dong dem) (sha256)', sha('js/app.js') === 'ae11dfaf0e5383a7d2d2f1d8c33de31090f1a5fd39e0251edb0f8b69d4590a20');

console.log(`v61: ${pass} PASS, ${fail} FAIL`);
process.exit(fail ? 1 : 0);
