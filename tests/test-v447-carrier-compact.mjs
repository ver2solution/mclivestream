// test-v447-carrier-compact.mjs — v447 (25/11/2026, anh bao 22:54):
// The hang van chuyen noi dia dang GON theo form chung (1 anh logo +
// ten + 2 tag + hotline • website + gia tham khao CLAMP 2 dong + nut
// "Xem chi tiet →"); toan bo du lieu chuyen sang modal chi tiet dung
// chung (findDetailItem + lotFactoryKiotDetailHTML). Logo hang la anh
// dai dien (logo thuong hieu cua chinh hang — khong phai anh bia bai
// viet nen khong vi pham lenh cam logo 24/11).
// Chạy: node tests/test-v447-carrier-compact.mjs (từ gốc repo).
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let pass = 0, fail = 0;
function check(name, ok, extra) {
  if (ok) { pass++; console.log('PASS ' + name); }
  else { fail++; console.log('FAIL ' + name + (extra !== undefined ? ' — ' + extra : '')); }
}
const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);

const appJs = fs.readFileSync(path.join(root, 'js/app.js'), 'utf8');
const dataJs = fs.readFileSync(path.join(root, 'js/data.js'), 'utf8');
const css = fs.readFileSync(path.join(root, 'v20.css'), 'utf8');
const swJs = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');

/* ---------- (1) Du lieu: 11 hang + truong logo ---------- */
const sb = { window: {}, console };
vm.createContext(sb);
vm.runInContext(dataJs, sb);
const data = sb.window.V20_DATA || {};
const carriers = data.logisticsNoiDia || [];
check('(1) data.js: logisticsNoiDia du 11 hang', carriers.length === 11, 'got ' + carriers.length);
const ids = carriers.map((c) => c.id);
check('(1) data.js: du 11 id carrier-* dung thu tu',
  eq(ids, ['carrier-ghn', 'carrier-ghtk', 'carrier-viettelpost', 'carrier-jt', 'carrier-best', 'carrier-vnpost', 'carrier-spx', 'carrier-ahamove', 'carrier-lalamove', 'carrier-grabexpress', 'carrier-ninjavan']),
  ids.join(','));
check('(1) data.js: moi hang co truong logo = images/carriers/<id>.png',
  carriers.every((c) => c.logo === 'images/carriers/' + c.id + '.png'),
  carriers.filter((c) => c.logo !== 'images/carriers/' + c.id + '.png').map((c) => c.id).join(','));
check('(1) data.js: cac truong goc van du (name/hotline/website/scope/status/services)',
  carriers.every((c) => c.name && c.hotline && c.website && c.scope && c.status && Array.isArray(c.services)));
const ghn = carriers.find((c) => c.id === 'carrier-ghn') || {};
check('(1) data.js: GHN co du truong chi tiet (weightFormula/codNote/insuranceNote/registerSteps/unverified/source)',
  !!(ghn.weightFormula && ghn.codNote && ghn.insuranceNote && Array.isArray(ghn.registerSteps) && ghn.registerSteps.length > 0 && Array.isArray(ghn.unverified) && ghn.source && ghn.priceSummary && ghn.priceNote && ghn.priceUrl));
check('(1) data.js: Ninja Van van stopped + co statusNote',
  (carriers.find((c) => c.id === 'carrier-ninjavan') || {}).status === 'stopped'
  && !!(carriers.find((c) => c.id === 'carrier-ninjavan') || {}).statusNote);

/* ---------- (2) Logo files: ton tai + PNG hop le ---------- */
const pngMagic = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const logoBad = [];
for (const c of carriers) {
  const p = path.join(root, c.logo || '');
  try {
    const buf = fs.readFileSync(p);
    if (!buf.subarray(0, 8).equals(pngMagic) || buf.length < 500) logoBad.push(c.id + '(bad png/size ' + buf.length + ')');
  } catch (e) { logoBad.push(c.id + '(missing)'); }
}
check('(2) 11 file logo local ton tai + PNG hop le (>=500 bytes)', logoBad.length === 0, logoBad.join('; '));

/* ---------- (3) Trich ham tu app.js + chay trong VM ---------- */
function grab(re) { const m = appJs.match(re); return m ? m[0] : null; }
const fEsc = grab(/function esc\(s\)\{[^\n]*\}/);
const fHasReal = grab(/function hasReal\(v\)\{[^\n]*\}/);
const fPriceLabel = grab(/function carrierPriceModelLabel\(m\)\{[\s\S]*?\n\}/);
const fScopeLabel = grab(/function carrierScopeLabel\(sc\)\{[^\n]*\}/);
const fCard = grab(/function carrierCardHTML\(c\)\{[\s\S]*?\n\}/);
const fFindLot = grab(/function findLotFactoryKiot\(id\)\{[\s\S]*?\n\}/);
const fFind = grab(/function findDetailItem\(id\)\{[\s\S]*?\n\}/);
const fModal = grab(/function lotFactoryKiotDetailHTML\(kind, item\)\{[\s\S]*?\n\}/);
check('(3) trich duoc 8 ham tu app.js (esc/hasReal/carrierPriceModelLabel/carrierScopeLabel/carrierCardHTML/findLotFactoryKiot/findDetailItem/lotFactoryKiotDetailHTML)',
  [fEsc, fHasReal, fPriceLabel, fScopeLabel, fCard, fFindLot, fFind, fModal].every(Boolean));

let card = null, find = null, modal = null;
if ([fEsc, fHasReal, fPriceLabel, fScopeLabel, fCard, fFindLot, fFind, fModal].every(Boolean)) {
  const D = { models: [], shops: [], logisticsNoiDia: carriers };
  const ctx = vm.createContext({ D, NEWOBJ_ARRAYS: [], NEWOBJ_TYPES: {}, DISCLAIMER: 'Miễn trừ trách nhiệm (test).', console });
  const lib = vm.runInContext(
    [fEsc, fHasReal, fPriceLabel, fScopeLabel, fCard, fFindLot, fFind, fModal].join('\n')
    + '\n({ carrierCardHTML, findDetailItem, lotFactoryKiotDetailHTML });', ctx);
  card = lib.carrierCardHTML; find = lib.findDetailItem; modal = lib.lotFactoryKiotDetailHTML;

  /* ---------- (4) The gon: co logo + ten + hotline/website + gia clamp + nut ---------- */
  const htmlGhn = card(ghn);
  check('(4) the GHN: co anh logo local images/carriers/carrier-ghn.png',
    htmlGhn.includes('<img src="images/carriers/carrier-ghn.png"'));
  check('(4) the GHN: co ten + 2 tag (Theo kg + Toan quoc)',
    htmlGhn.includes('Giao Hàng Nhanh (GHN)') && htmlGhn.includes('Theo kg') && htmlGhn.includes('Toàn quốc'));
  check('(4) the GHN: co hotline + link website rut gon',
    htmlGhn.includes('1900 636677') && htmlGhn.includes('href="https://ghn.vn"') && htmlGhn.includes('>ghn.vn</a>'));
  check('(4) the GHN: gia tham khao co class carrier-price (CLAMP 2 dong)',
    htmlGhn.includes('class="newobj-price carrier-price"') && htmlGhn.includes('Giá tham khảo:') && htmlGhn.includes('15.500đ'));
  check('(4) the GHN: co nut "Xem chi tiết →" + data-detail-id="carrier-ghn"',
    htmlGhn.includes('data-detail-id="carrier-ghn"') && htmlGhn.includes('Xem chi tiết →'));
  check('(4) the GHN: giu id="carrier-ghn" (search deep-link #carrier-ghn)',
    htmlGhn.includes('id="carrier-ghn"'));

  /* ---------- (5) The gon: KHONG do het noi dung ---------- */
  check('(5) the GHN: KHONG chua weightFormula/codNote/insuranceNote/registerSteps',
    !htmlGhn.includes('Khối lượng quy đổi') && !htmlGhn.includes('COD:') && !htmlGhn.includes('Bảo hiểm:') && !htmlGhn.includes('Cách đăng ký'));
  check('(5) the GHN: KHONG chua "Chưa xác minh" / "Nguồn:" / ghi chu gia',
    !htmlGhn.includes('Chưa xác minh') && !htmlGhn.includes('Nguồn:') && !htmlGhn.includes('phụ phí xăng dầu'));
  check('(5) the GHN: KHONG con the <details> mo rong tren the',
    !htmlGhn.includes('<details>') && !htmlGhn.includes('<summary>'));

  /* ---------- (6) The hang da ngung (Ninja Van) ---------- */
  const nv = carriers.find((c) => c.id === 'carrier-ninjavan') || {};
  const htmlNv = card(nv);
  check('(6) the Ninja Van: co nhan "Đã ngừng" + mo (carrier-stopped) + van co nut Xem chi tiet',
    htmlNv.includes('Đã ngừng') && htmlNv.includes('carrier-stopped') && htmlNv.includes('data-detail-id="carrier-ninjavan"'));
  check('(6) the Ninja Van: KHONG co dong gia (priceSummary null) + KHONG do noi dung',
    !htmlNv.includes('carrier-price') && !htmlNv.includes('Bảng giá cũ'));

  /* ---------- (7) The escape HTML ---------- */
  const htmlX = card({ id: 'carrier-x', name: '<script>alert(1)</script>', shortName: 'X', scope: 'toan-quoc', status: 'active', website: 'https://x.vn', hotline: '1900', priceSummary: 'a & b', services: [] });
  check('(7) the: escape HTML (khong chay script)',
    !htmlX.includes('<script>alert') && htmlX.includes('&lt;script&gt;') && htmlX.includes('a &amp; b'));

  /* ---------- (8) findDetailItem: tim duoc hang ---------- */
  const found = find('carrier-ghn');
  check('(8) findDetailItem("carrier-ghn") tra {kind:"carrier", item:GHN}',
    !!found && found.kind === 'carrier' && found.item && found.item.id === 'carrier-ghn');
  check('(8) findDetailItem tra null cho id la', find('carrier-khong-co') === null);

  /* ---------- (9) Modal: du lieu day du ---------- */
  const mGhn = modal('carrier', ghn);
  check('(9) modal GHN: tieu de + icon hang van chuyen + anh logo',
    mGhn.includes('Giao Hàng Nhanh (GHN)') && mGhn.includes('🚚') && mGhn.includes('Hãng vận chuyển') && mGhn.includes('images/carriers/carrier-ghn.png'));
  check('(9) modal GHN: co hotline + email + website',
    mGhn.includes('1900 636677') && mGhn.includes('cskh@ghn.vn') && mGhn.includes('https://ghn.vn'));
  check('(9) modal GHN: co pham vi + thoi gian giao + dich vu',
    mGhn.includes('Toàn quốc') && mGhn.includes('34 tỉnh thành') && mGhn.includes('Nội tỉnh 1 ngày') && mGhn.includes('Giao Chuẩn'));
  check('(9) modal GHN: co gia tham khao DAY DU + ghi chu gia + link bang gia chinh thuc',
    mGhn.includes('15.500đ/0–3kg') && mGhn.includes('phụ phí xăng dầu') && mGhn.includes('https://ghn.vn/bang-gia'));
  check('(9) modal GHN: co cach tinh khoi luong + gia theo loai hang + COD + bao hiem',
    mGhn.includes('Khối lượng quy đổi') && mGhn.includes('Hàng ≥20kg') && mGhn.includes('Thu hộ COD miễn phí') && mGhn.includes('Khai báo ≤3 triệu'));
  check('(9) modal GHN: co "Cách đăng ký" + cac buoc + link dang ky',
    mGhn.includes('Cách đăng ký') && mGhn.includes('Đăng ký online tại sso.ghn.vn') && mGhn.includes('https://sso.ghn.vn/register'));
  check('(9) modal GHN: co "Chưa xác minh" + nguon + ngay cap nhat',
    mGhn.includes('Chưa xác minh') && mGhn.includes('phụ phí hàng dễ vỡ') && mGhn.includes('ghn.vn + levantoan.com') && mGhn.includes('2026-11-25'));
  check('(9) modal GHN: co nut "Truy cập website hãng →" + KHONG co nut sao (chua co enum RPC)',
    mGhn.includes('Truy cập website hãng →') && !mGhn.includes('v2s-star-btn') && !mGhn.includes('data-star-type'));
  const mNv = modal('carrier', nv);
  check('(9) modal Ninja Van: co trang thai ngung + KHONG co gia/COD/bao hiem (truong null)',
    mNv.includes('Đã ngừng toàn bộ dịch vụ') && !mNv.includes('Giá tham khảo') && !mNv.includes('<b>COD</b>'));
}

/* ---------- (10) CSS + CACHE + hoi quy tim kiem ---------- */
check('(10) v20.css: .carrier-price CLAMP 2 dong',
  css.includes('.carrier-card .carrier-price{display:-webkit-box;-webkit-line-clamp:2;'));
check('(10) v20.css: logo hang hien TRON (object-fit:contain, nen trang)',
  css.includes('.carrier-card .newobj-photo img{object-fit:contain') && css.includes('.carrier-card .newobj-photo{background:#fff}'));
check('(10) v20.css: KHONG con CSS cu cua the do het noi dung (.carrier-card details)',
  !css.includes('.carrier-card details{') && !css.includes('.carrier-card .carrier-source{'));
check('(10) sw.js: CACHE = v447-the-hang-van-chuyen-gon-1', swJs.includes("const CACHE = 'v447-the-hang-van-chuyen-gon-1'"));

const require = createRequire(import.meta.url);
const API = require(path.join(root, 'js/search.js'));
const counts = API.countByType(API.buildIndex(data));
check('(10) tim kiem: counts["logistics-noi-dia"] van = 11 (hoi quy v445)',
  counts['logistics-noi-dia'] === 11, 'got ' + counts['logistics-noi-dia']);

console.log('\n' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
