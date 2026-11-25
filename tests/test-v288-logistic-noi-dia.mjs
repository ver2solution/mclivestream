// test-v288-logistic-noi-dia.mjs — v443: danh muc "Logistic noi dia" (trang Mau, canh muc Logistics Trung-Viet)
// Truoc fix: shop muon biet hang van chuyen noi dia nao, gia bao nhieu, dang ky
// the nao phai tu tim tung web hang. Sau fix: 11 the hang trong mang moi
// logisticsNoiDia (data.js) + nut switch + section logistics-noi-dia tren
// danh-sach-mau.html + render/loc pham vi + trang thai trong js/app.js.
// Luat gia: chi ghi so DA XAC MINH (25/11/2026); muc nao chua xac minh ghi
// trong 'unverified' — KHONG bia gia (31 muc, doi chieu file nghien cuu).
// Chay: node tests/test-v288-logistic-noi-dia.mjs (tu goc repo hoac goc stage).
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
const isHttps = (u) => typeof u === 'string' && /^https:\/\//.test(u);

const html = fs.readFileSync(path.join(root, 'danh-sach-mau.html'), 'utf8');
const appJs = fs.readFileSync(path.join(root, 'js/app.js'), 'utf8');
const dataJs = fs.readFileSync(path.join(root, 'js/data.js'), 'utf8');
const css = fs.readFileSync(path.join(root, 'v20.css'), 'utf8');
const swJs = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');

// --- Du lieu: trich mang logisticsNoiDia tu data.js ---
function extractArray(src, name, closeRe) {
  const re = new RegExp('"' + name + '": \\[([\\s\\S]*?)' + closeRe);
  const m = src.match(re);
  if (!m) return null;
  return vm.runInNewContext('[' + m[1] + ']', {});
}
const carriers = extractArray(dataJs, 'logisticsNoiDia', '\\n \\],\\n "rentals"');
check('trich duoc mang logisticsNoiDia tu data.js', Array.isArray(carriers));
const logisticsOld = extractArray(dataJs, 'logistics', '\\n\\],\\n// v443');
check('mang logistics cu van du 33 muc (30 goc + lg-31..33 group-work 26/11)', Array.isArray(logisticsOld) && logisticsOld.length === 33, logisticsOld ? String(logisticsOld.length) : 'null');

if (carriers) {
  check('du 11 hang', carriers.length === 11, String(carriers.length));
  check('id duy nhat', new Set(carriers.map(c => c.id)).size === 11);
  check('du 8 hang toan-quoc', carriers.filter(c => c.scope === 'toan-quoc').length === 8, String(carriers.filter(c => c.scope === 'toan-quoc').length));
  check('du 3 hang noi-thanh', carriers.filter(c => c.scope === 'noi-thanh').length === 3);
  check('chi 1 hang da ngung (Ninja Van)', carriers.filter(c => c.status === 'stopped').length === 1 && carriers.find(c => c.status === 'stopped').id === 'carrier-ninjavan');
  check('hang da ngung xep cuoi mang', carriers[carriers.length - 1].status === 'stopped');
  check('tong so muc chua xac minh = 31 (khop file nghien cuu)', carriers.reduce((n, c) => n + c.unverified.length, 0) === 31, String(carriers.reduce((n, c) => n + c.unverified.length, 0)));
  const required = ['id', 'name', 'shortName', 'website', 'priceUrl', 'hotline', 'scope', 'status', 'updated', 'services', 'priceModel', 'source'];
  check('moi hang du truong bat buoc', carriers.every(c => required.every(f => c[f] !== undefined && c[f] !== null && c[f] !== '')));
  check('moi hang updated = 2026-11-25', carriers.every(c => c.updated === '2026-11-25'));
  check('scope chi co toan-quoc/noi-thanh', carriers.every(c => ['toan-quoc', 'noi-thanh'].includes(c.scope)));
  check('status chi co active/stopped', carriers.every(c => ['active', 'stopped'].includes(c.status)));
  check('priceModel chi co per-kg/per-km/flat', carriers.every(c => ['per-kg', 'per-km', 'flat'].includes(c.priceModel)));
  check('3 hang noi-thanh dung per-km', carriers.filter(c => c.scope === 'noi-thanh').every(c => c.priceModel === 'per-km'));
  check('moi website/priceUrl deu https', carriers.every(c => isHttps(c.website) && isHttps(c.priceUrl)));
  check('registerUrl (khi co) deu https', carriers.every(c => c.registerUrl === null || isHttps(c.registerUrl)));
  const stopped = carriers.find(c => c.status === 'stopped');
  check('hang da ngung: registerUrl null + priceSummary null + co statusNote + khong buoc dang ky',
    stopped.registerUrl === null && stopped.priceSummary === null && !!stopped.statusNote && stopped.registerSteps.length === 0);
  check('hang dang hoat dong: co priceSummary + co registerUrl + co buoc dang ky',
    carriers.filter(c => c.status === 'active').every(c => !!c.priceSummary && isHttps(c.registerUrl) && c.registerSteps.length >= 1));
  check('khong muc chua xac minh nao xuat hien trong priceSummary (khong bia gia)',
    carriers.every(c => !c.priceSummary || c.unverified.every(u => !c.priceSummary.includes(u.split(' ')[0]))),
    carriers.filter(c => c.priceSummary && c.unverified.some(u => c.priceSummary.includes(u.split(' ')[0]))).map(c => c.id).join(','));
  check('Ninja Van dung hotline/file nghien cuu (1900 886 877, khong phai 1900 636296 cua ban thiet ke)',
    stopped.hotline === '1900 886 877' && stopped.email === 'support_vn@ninjavan.co', stopped.hotline);
}

// --- Tinh: HTML (danh-sach-mau.html) ---
check('HTML co nut switch logistics-noi-dia', html.includes('data-uni-cat="logistics-noi-dia"'));
check('nut moi nam SAU nut Agency Ads, TRUOC nut Logistics Trung-Viet (thu tu v446)', html.indexOf('data-uni-cat="logistics-noi-dia"') > html.indexOf('data-uni-cat="agency-ads"') && html.indexOf('data-uni-cat="logistics-noi-dia"') < html.indexOf('data-uni-cat="logistics"'));
check('HTML co section #logistics-noi-dia', html.includes('id="logistics-noi-dia"'));
check('section moi nam SAU section logistics-trung-viet', html.indexOf('id="logistics-noi-dia"') > html.indexOf('id="logistics-trung-viet"'));
check('HTML co #logisticsNoiDiaGrid', html.includes('id="logisticsNoiDiaGrid"'));
check('HTML co 2 o loc fCarrierScope + fCarrierStatus', html.includes('id="fCarrierScope"') && html.includes('id="fCarrierStatus"'));
check('HTML co #logisticsNoiDiaCount/#logisticsNoiDiaEmpty/#logisticsNoiDiaCountH2/#logisticsNoiDiaSub',
  html.includes('id="logisticsNoiDiaCount"') && html.includes('id="logisticsNoiDiaEmpty"') && html.includes('id="logisticsNoiDiaCountH2"') && html.includes('id="logisticsNoiDiaSub"'));
check('HTML co #logisticsNoiDiaMoreBtn', html.includes('id="logisticsNoiDiaMoreBtn"'));
check('gioi thieu section ghi ro gia tham khao + canh bao LEX', html.includes('THAM KHẢO ngày 25/11/2026') && html.includes('LEX (Lazada Logistics)'));
check('o loc pham vi co du 3 lua chon', html.includes('<option value="toan-quoc">Toàn quốc</option>') && html.includes('<option value="noi-thanh">Nội thành</option>'));
check('o loc trang thai co du 3 lua chon', html.includes('<option value="active">Đang hoạt động</option>') && html.includes('<option value="stopped">Đã ngừng</option>'));

// --- Tinh: app.js ---
check('app.js co NEWOBJ_UNI_CATS logistics-noi-dia (type logisticsNoiDia)',
  appJs.includes("'logistics-noi-dia': {type: 'logisticsNoiDia', sectionId: 'logistics-noi-dia'"));
check('app.js an so nut khi dang chon (NEWOBJ_NO_COUNT)', appJs.includes("'logistics-noi-dia': 1"));
check('app.js setMauListVisibility co logistics-noi-dia', appJs.includes("'logistics-noi-dia': ['logistics-noi-dia']"));
check('app.js setCat thu gon section moi o ca 4 nhanh', (appJs.match(/collapseSection\('logistics-noi-dia', 'logisticsNoiDiaMoreBtn'\)/g) || []).length === 4,
  String((appJs.match(/collapseSection\('logistics-noi-dia', 'logisticsNoiDiaMoreBtn'\)/g) || []).length));
check('app.js initSectionFilter active check mo rong scope/status',
  appJs.includes('f.scope || f.status'));
check('app.js co carrierCardHTML + renderCarrierCards + carrierMatches + initCarrierSection',
  appJs.includes('function carrierCardHTML(c)') && appJs.includes('function renderCarrierCards()') && appJs.includes('function carrierMatches(card, f)') && appJs.includes('function initCarrierSection()'));
check('app.js goi initCarrierSection tu initNewObjSections', appJs.includes('initCarrierSection(); /* v443'));
check('app.js dang ky handle vao V2S_NEWOBJ_FILTERS', appJs.includes("window.V2S_NEWOBJ_FILTERS['logistics-noi-dia'] = h;"));
check('app.js render xep hang da ngung cuoi', appJs.includes("(a.status === 'stopped' ? 1 : 0) - (b.status === 'stopped' ? 1 : 0)"));
check('app.js KHONG them logisticsNoiDia vao NEWOBJ_ARRAYS (mang khac dang)',
  !/NEWOBJ_ARRAYS = \[[^\]]*logisticsNoiDia/.test(appJs));
check('app.js KHONG doi mang logistics cu (khong sua NEWOBJ_SECTIONS logistics)',
  appJs.includes("{type: 'logistics', gridId: 'logisticsGrid'"));

// --- Tinh: v20.css + sw.js ---
check('v20.css co CSS the hang (.carrier-stopped/.tag-stopped/.carrier-filters)',
  css.includes('.carrier-card.carrier-stopped') && css.includes('.tag-stopped') && css.includes('.carrier-filters'));
check('sw.js CACHE la v435-user-menu-chat-link-1 (snapshot 26/11, da bump qua v443)', swJs.includes("const CACHE = 'v435-user-menu-chat-link-1';"));
check('sw.js KHONG con CACHE cu v417', !swJs.includes("const CACHE = 'v417-job-post-card-1';"));

// --- Logic thuan: trich carrierMatches + carrierCardHTML tu app.js ---
const mHasReal = appJs.match(/function hasReal\(v\)\{[^\n]*\}/);
const mEsc = appJs.match(/function esc\(s\)\{[^\n]*\}/);
const mMatch = appJs.match(/function carrierMatches\(card, f\)\{[\s\S]*?\n\}/);
const mCard = appJs.match(/function carrierCardHTML\(c\)\{[\s\S]*?\n  return h;\n\}/);
const mLabel = appJs.match(/function carrierPriceModelLabel\(m\)\{[\s\S]*?\n\}/);
const mScope = appJs.match(/function carrierScopeLabel\(sc\)\{[^\n]*\}/);
check('trich duoc hasReal', !!mHasReal);
check('trich duoc esc', !!mEsc);
check('trich duoc carrierMatches', !!mMatch);
check('trich duoc carrierCardHTML', !!mCard);
check('trich duoc 2 ham nhan', !!mLabel && !!mScope);
if (mHasReal && mEsc && mMatch && mCard && mLabel && mScope) {
  const fns = vm.runInNewContext(mHasReal[0] + '\n' + mEsc[0] + '\n' + mLabel[0] + '\n' + mScope[0] + '\n' + mMatch[0] + '\n' + mCard[0] + '\n({ carrierMatches, carrierCardHTML });', {});
  const { carrierMatches, carrierCardHTML } = fns;
  const fake = (scope, status) => ({ getAttribute: (k) => k === 'data-scope' ? scope : status });
  check('carrierMatches: khong loc thi khop het', carrierMatches(fake('toan-quoc', 'active'), { scope: '', status: '' }));
  check('carrierMatches: loc pham vi noi-thanh loai toan-quoc', !carrierMatches(fake('toan-quoc', 'active'), { scope: 'noi-thanh', status: '' }) && carrierMatches(fake('noi-thanh', 'active'), { scope: 'noi-thanh', status: '' }));
  check('carrierMatches: loc trang thai stopped chi giu hang da ngung', !carrierMatches(fake('toan-quoc', 'active'), { scope: '', status: 'stopped' }) && carrierMatches(fake('toan-quoc', 'stopped'), { scope: '', status: 'stopped' }));
  check('carrierMatches: loc kep pham vi + trang thai', carrierMatches(fake('noi-thanh', 'active'), { scope: 'noi-thanh', status: 'active' }) && !carrierMatches(fake('noi-thanh', 'stopped'), { scope: 'noi-thanh', status: 'active' }));
  if (carriers) {
    const ghn = carriers.find(c => c.id === 'carrier-ghn');
    const ghnHtml = carrierCardHTML(ghn);
    check('the GHN (the gon v447): co ten + hotline + gia tham khao + nut Xem chi tiet',
      ghnHtml.includes('Giao Hàng Nhanh (GHN)') && ghnHtml.includes('1900 636677') && ghnHtml.includes('Giá tham khảo:') && ghnHtml.includes('15.500đ') && ghnHtml.includes('Xem chi tiết'));
    check('the GHN (the gon v447): co nhan Theo kg + Toan quoc + nut Xem chi tiet (chi tiet day du o modal)',
      ghnHtml.includes('Theo kg') && ghnHtml.includes('Toàn quốc') && ghnHtml.includes('Xem chi tiết'));
    check('du lieu GHN: co muc Chua xac minh + nguon ghn.vn (hien o modal, khong phai the gon)',
      ghn.unverified.length > 0 && ghn.source.includes('ghn.vn') && ghn.priceUrl === 'https://ghn.vn/bang-gia');
    const nj = carriers.find(c => c.id === 'carrier-ninjavan');
    const njHtml = carrierCardHTML(nj);
    check('the Ninja Van: mo (carrier-stopped) + nhan Da ngung + khong co Cach dang ky',
      njHtml.includes('carrier-stopped') && njHtml.includes('Đã ngừng') && !njHtml.includes('Cách đăng ký'));
    check('the Ninja Van (the gon v447): khong co link dang ky, khong co gia tham khao',
      !njHtml.includes('Đăng ký tại') && !njHtml.includes('Giá tham khảo:'));
    check('du lieu Ninja Van: ghi chu ngung 30/9/2025 + bang gia cu het hieu luc (hien o modal)',
      nj.statusNote.includes('30/9/2025') && nj.priceNote.includes('Bảng giá cũ đã hết hiệu lực'));
    const aha = carriers.find(c => c.id === 'carrier-ahamove');
    check('the Ahamove: nhan Theo km + Noi thanh', carrierCardHTML(aha).includes('Theo km') && carrierCardHTML(aha).includes('Nội thành'));
    check('esc chong XSS trong the (ten co < > duoc thoat)', carrierCardHTML({ id: 'x', name: '<b>X</b>', scope: 'toan-quoc', status: 'active', hotline: '', website: 'https://a.vn', priceUrl: 'https://a.vn', services: [], source: '' }).includes('&lt;b&gt;X&lt;/b&gt;'));
  }
}

console.log('\n' + pass + ' PASS, ' + fail + ' FAIL');
process.exit(fail ? 1 : 0);
