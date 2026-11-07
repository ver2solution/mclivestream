// test-v65.mjs — v65: trust strip gon lai (grid 4 cot, nut xuong duoi khung)
// + bo loc Xuong them o Tinh/Thanh pho (nguoi dung yeu cau 16:02 ngay 06/11).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
import { createHash } from 'node:crypto';
import vm from 'node:vm';
const sha256 = (f) => createHash('sha256').update(fs.readFileSync(path.join(root, f))).digest('hex');
// chay app.js trong vm de test facMatches that
const sb = { window: {}, module: { exports: {} }, console, document: { querySelectorAll: () => [], getElementById: () => null, addEventListener: () => {} }, location: { search: '' } };
sb.window = sb.window || {};
vm.createContext(sb);
vm.runInContext(fs.readFileSync(path.join(root, 'js/data.js'), 'utf8'), sb);
vm.runInContext(fs.readFileSync(path.join(root, 'js/app.js'), 'utf8'), sb);
const V = sb.window.V20;
let pass = 0, fail = 0;
function t(name, ok, extra = '') { if (ok) { pass++; console.log('PASS v65:', name); } else { fail++; console.log('FAIL v65:', name, extra); } }
const indexHtml = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const shopHtml = fs.readFileSync(path.join(root, 'danh-sach-shop.html'), 'utf8');
const css = fs.readFileSync(path.join(root, 'v20.css'), 'utf8');
const appJs = fs.readFileSync(path.join(root, 'js/app.js'), 'utf8');
const sw = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');

// ---- (A) Trust strip: 1 grid 4 cot x 2 hang, du 8 o ----
t('Trust: chi con 1 div .trust-nums trong trang chu (khong con hang rieng lots/factories)',
  (indexHtml.match(/class="trust-nums"/g) || []).length === 1
  && !indexHtml.includes('trust-nums-lots') && !indexHtml.includes('trust-nums-factories'));
t('Trust: du 8 o .trust-num trong grid, dung thu tu Mau/Shop/Khach/Xuong/Tinh/Lo/Thu mua/Cho',
  (indexHtml.match(/class="trust-num"/g) || []).length === 8
  && indexHtml.indexOf('id="trustModels"') < indexHtml.indexOf('id="trustShops"')
  && indexHtml.indexOf('id="trustShops"') < indexHtml.indexOf('id="trustFactories"')
  && indexHtml.indexOf('id="trustFactories"') < indexHtml.indexOf('id="trustFactoryProvinces"')
  && indexHtml.indexOf('id="trustFactoryProvinces"') < indexHtml.indexOf('id="trustLots"')
  && indexHtml.indexOf('id="trustLots"') < indexHtml.indexOf('id="trustBuyers"')
  && indexHtml.indexOf('id="trustBuyers"') < indexHtml.indexOf('id="trustBatch"'));
t('Trust: so lieu khong doi (20 mau / 30 shop / 400+ / 20 xuong / 6 tinh / 8 lo / 3 thu mua / 2 cho)',
  indexHtml.includes('<b id="trustModels">20</b>') && indexHtml.includes('<b id="trustShops">30</b>')
  && indexHtml.includes('<b>400+</b>') && indexHtml.includes('<b id="trustFactories">20</b>')
  && indexHtml.includes('<b id="trustFactoryProvinces">6</b>') && indexHtml.includes('<b id="trustLots">8</b>')
  && indexHtml.includes('<b id="trustBuyers">3</b>') && indexHtml.includes('<b id="trustBatch">2</b>'));
t('v75: nut "Xem shop đang tuyển" DA XOA (khong con div .trust-cta, khong con text nut)',
  !indexHtml.includes('<div class="trust-cta">') && !indexHtml.includes('Xem shop đang tuyển →'));
t('v75: khong con data-track xem-shop-dang-tuyen / href #shop-tuyen tren trang chu',
  !indexHtml.includes('data-track="xem-shop-dang-tuyen"') && !indexHtml.includes('href="#shop-tuyen"'));
t('CSS: .trust-nums la grid 4 cot (gap 14px 20px), so 28px',
  css.includes('.trust-nums{display:grid;grid-template-columns:repeat(4,1fr);gap:14px 20px;flex-basis:100%;min-width:0}')
  && /\.trust-num b\{[^}]*font-size:28px/.test(css));
t('v75 CSS: khong con .trust-cta; <=900px grid 2 cot van nguyen',
  !css.includes('.trust-cta')
  && /@media\(max-width:900px\)\{\.trust-nums\{grid-template-columns:repeat\(2,1fr\)/.test(css));
t('CSS: trust-strip gon hon (padding 18px 22px, gap 16px)',
  css.includes('padding:18px 22px') && /\.trust-strip\{[^}]*gap:16px/.test(css));

// ---- (B) Bo loc Xuong: them o Tinh/Thanh pho ----
t('Loc xuong: co o fFacProv (Tinh/Thanh pho) dung dau filter, du 6 tinh kem so luong',
  shopHtml.includes('id="fFacProv"')
  && shopHtml.includes('<option value="TP.HCM">TP. Hồ Chí Minh (8)</option>')
  && shopHtml.includes('<option value="Hà Nội">Hà Nội (5)</option>')
  && shopHtml.includes('<option value="Bình Dương">Bình Dương (3)</option>')
  && shopHtml.includes('<option value="Nam Định">Nam Định (2)</option>')
  && shopHtml.includes('<option value="Hưng Yên">Hưng Yên (1)</option>')
  && shopHtml.includes('<option value="Đồng Nai">Đồng Nai (1)</option>'));
t('Loc xuong: 40 xuong trong data.js co data-prov (TP.HCM 16 / Ha Noi 11 / Da Nang 3 / Binh Duong 5 / Nam Dinh 3 / Hung Yen 1 / Dong Nai 1)',
  (() => { const F = sb.window.V20_DATA.factories; const c = (p) => F.filter(f => f.prov === p).length; return F.length === 40 && F.every(f => !!f.prov) && c('TP.HCM') === 16 && c('Hà Nội') === 11 && c('Đà Nẵng') === 3 && c('Bình Dương') === 5 && c('Nam Định') === 3 && c('Hưng Yên') === 1 && c('Đồng Nai') === 1; })());
t('Loc xuong: facMatches that loc dung tinh (the khac tinh thi khong khop)',
  (() => {
    const card = (attrs) => ({ getAttribute: (k) => (k in attrs ? attrs[k] : null) });
    const fHCM = card({ 'data-moq': '30', 'data-cat': 'quan-ao', 'data-prov': 'TP.HCM' });
    const fHN = card({ 'data-moq': '30', 'data-cat': 'quan-ao', 'data-prov': 'Hà Nội' });
    const fNoProv = card({ 'data-moq': '30', 'data-cat': 'quan-ao', 'data-prov': '' });
    return V.facMatches(fHCM, { prov: 'TP.HCM' })
      && !V.facMatches(fHN, { prov: 'TP.HCM' })
      && V.facMatches(fHN, { prov: 'Hà Nội' })
      && !V.facMatches(fNoProv, { prov: 'TP.HCM' })
      && V.facMatches(fHCM, { prov: 'TP.HCM', value: 'medium', cat: 'quan-ao' })
      && !V.facMatches(fHCM, { prov: 'Hà Nội', value: 'medium' })
      && V.facMatches(fHCM, {});
  })());

// ---- (C) Hash khoa file da doi (v65) ----
t("index.html giong het v65 (trust grid 4 cot + nut xuong duoi khung) (sha256)", sha256('index.html') === '27ec4c15cc98c68650084b12de7f2b839a8f76d42f1933e01fc0981abbe47aa2');
t("danh-sach-shop.html giong het v65 (them loc tinh xuong + data-prov 20 the) (sha256)", sha256('danh-sach-shop.html') === 'c5abd47006c2c86393dca16fa16e549b8f37a1e65b099fefbfaa1723e23b6818');
t("v20.css giong het v65 (trust grid + trust-cta) (sha256)", sha256('v20.css') === 'c38c89a126a136fb3f99ea7d547884339c4e5b9899e48c90234f61f02a140538');
t("js/app.js giong het v65 (facMatches them tinh) (sha256)", sha256('js/app.js') === 'e3f5c43293d2b71f2fd0b804a31ce4a4a88f47a83bfdab607eab5ee75467b072');
t("sw.js CACHE = 'v84-shell-1'", sw.includes("const CACHE = 'v84-shell-1'"));

console.log(`v65: ${pass} PASS, ${fail} FAIL`);
process.exit(fail ? 1 : 0);
