// test-v72.mjs — v72: sua giao dien mobile (06/11/2026), kiem chung bang anh
// chup that 390px (Playwright + local server). Hoc Shopee/Lazada (luoi 2 cot,
// bo loc gap duoc, header gon) + VnExpress (tin ngang).
// (A) CSS: header 1 hang (F1), filter cols-3 1 cot (F2), trust strip
//     stretch (F3), hero gon + eyebrow (F4), luoi 2 cot + the gon (F5),
//     FAB nho (F8), nut toggle bo loc (F6).
// (B) HTML: nut toggle tren trang Shop + trang Mau, section filter-section.
// (C) JS: initFilterToggle + closeFilterOf/closeFilters, goi tu initShops/
//     initList, apply gap bo loc.
// (D) Mock-DOM: toggle mo/dong doi class + aria-expanded + nhan nut;
//     apply (lot) gap bo loc.
// (E) CACHE v76-shell-1 + file khong doi giong het v71.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let pass = 0, fail = 0;
function t(name, ok, extra = '') { if (ok) { pass++; console.log('PASS v72:', name); } else { fail++; console.log('FAIL v72:', name, extra); } }
const sha = (p) => crypto.createHash('sha256').update(fs.readFileSync(path.join(root, p))).digest('hex');
const css = fs.readFileSync(path.join(root, 'v20.css'), 'utf8');
const appJs = fs.readFileSync(path.join(root, 'js/app.js'), 'utf8');
const sw = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');
const shopHtml = fs.readFileSync(path.join(root, 'danh-sach-shop.html'), 'utf8');
const mauHtml = fs.readFileSync(path.join(root, 'danh-sach-mau.html'), 'utf8');
const v72css = css.slice(css.indexOf('/* v72:'));

// ---- (A) CSS ----
t('F1: header <=600px thu nho (wrap 12px, head-in gap 8px, logo 15px, badge 32px)',
  v72css.includes('.wrap{padding:0 12px}') && v72css.includes('.head-in{gap:8px;min-height:56px}')
  && v72css.includes('.logo{font-size:15px}') && v72css.includes('.logo-badge{width:32px;height:32px;font-size:18px')
  && v72css.includes('.menu-btn{padding:8px 10px') && v72css.includes('.head-in .btn-sm{padding:8px 10px;font-size:13px}'));
t('F2: .filter-card.cols-3 ve 1 cot o <=600px (ghi de specificity 0,2,0)',
  v72css.includes('.filter-card.cols-3{grid-template-columns:1fr}'));
t('F3: trust strip stretch + huy flex-basis:100% o <=600px',
  v72css.includes('.trust-strip{align-items:stretch;padding:16px}')
  && v72css.includes('.trust-text,.trust-logos,.trust-nums{flex-basis:auto;width:100%}'));
t('F4: hero gon (h1 24px, padding nho) + eyebrow inline-block o <=600px',
  v72css.includes('.hero h1{font-size:24px}') && v72css.includes('.eyebrow{display:inline-block;font-size:12px}')
  && v72css.includes('.eyebrow .live-dot{margin-right:6px}'));
t('F5: luoi 2 cot o <=600px (.grid + .shop-grid) + nut xep doc + the shop gon',
  v72css.includes('.grid{grid-template-columns:repeat(2,1fr);gap:12px}')
  && v72css.includes('.shop-grid{grid-template-columns:repeat(2,1fr);gap:12px}')
  && v72css.includes('.card-actions{grid-template-columns:1fr}')
  && v72css.includes('.shop-card h3{font-size:17px;min-height:0}')
  && v72css.includes('.shop-head{min-height:0;padding:10px}'));
t('F8: nut Gop y nho lai o <=600px (48px)',
  v72css.includes('.gopy-fab{width:48px;height:48px;font-size:20px;bottom:16px;right:12px}'));
t('F5b: the shop mobile xep doc (shop-head column, logo/initial 56px)',
  v72css.includes('.shop-head{flex-direction:column;align-items:flex-start;gap:8px}')
  && v72css.includes('.shop-card .shop-logo,.shop-card .shop-initial{flex:0 0 56px;width:56px;height:56px;font-size:28px}'));
t('F5c: tag nho + decision min-height 60px o mobile (the bot dai)',
  v72css.includes('.tag{font-size:12px;padding:4px 9px}')
  && v72css.includes('.decision-item,.decision-exp{min-height:60px}'));
t('F7: anh loi tai khong no chu alt (.pin-img nen + font-size:0, card-photo + shop-logo font-size:0)',
  v72css.includes('.pin-img{background:var(--brandsoft);font-size:0}')
  && v72css.includes('.card-photo img{font-size:0}')
  && v72css.includes('.shop-logo{font-size:0}'));
t('F6: .filter-toggle an tren desktop, hien o <=600px; filter-section an/mo bo loc',
  css.includes('.filter-toggle{display:none}')
  && v72css.includes('.filter-toggle{display:flex;align-items:center;justify-content:center;gap:8px;width:100%')
  && v72css.includes('.filter-section .filter-area{display:none}')
  && v72css.includes('.filter-section.filters-open .filter-area{display:block}')
  && v72css.includes('.filter-section>.filter-card{display:none}')
  && v72css.includes('.filter-section.filters-open>.filter-card{display:grid}'));

// ---- (B) HTML ----
t('Shop: section filter-section + nut toggle filterToggleShop dung nhan',
  shopHtml.includes('<section class="section filter-section">')
  && shopHtml.includes('id="filterToggleShop"') && shopHtml.includes('🔍 Bộ lọc: Shop · Lô xả kho · Xưởng may')
  && shopHtml.includes('aria-expanded="false"'));
t('Mau: section filter-section + nut toggle filterToggleMau dung nhan',
  mauHtml.includes('<section class="section filter-section">')
  && mauHtml.includes('id="filterToggleMau"') && mauHtml.includes('🔍 Bộ lọc hồ sơ mẫu')
  && mauHtml.includes('aria-expanded="false"'));

// ---- (C) JS (tinh) ----
t('JS: co initFilterToggle + filterSectionOf + closeFilters + closeFilterOf',
  appJs.includes('function initFilterToggle()') && appJs.includes('function filterSectionOf(btn)')
  && appJs.includes('function closeFilters(sec)') && appJs.includes('function closeFilterOf(btn)'));
t('JS: initShops + initList goi initFilterToggle (v72)',
  appJs.includes('initFilterToggle(); /* v72: nut mo/dong bo loc tren mobile */'));
t('JS: apply (shop/mau/lot) gap bo loc sau khi ap dung',
  appJs.includes("closeFilterOf(document.getElementById('applyShopBtn'))")
  && appJs.includes("closeFilterOf(document.getElementById('applyBtn'))")
  && appJs.includes('closeFilterOf(applyBtn);'));
t('JS: V20 export initFilterToggle + closeFilterOf',
  appJs.includes('initFilterToggle:initFilterToggle') && appJs.includes('closeFilterOf:closeFilterOf'));

// ---- (D) Mock-DOM ----
const sb = { window: {}, module: { exports: {} }, console, document: { querySelectorAll: () => [], getElementById: () => null, addEventListener: () => {} }, location: { search: '' } };
vm.createContext(sb);
vm.runInContext(fs.readFileSync(path.join(root, 'js/data.js'), 'utf8'), sb);
vm.runInContext(fs.readFileSync(path.join(root, 'js/app.js'), 'utf8'), sb);
const V = sb.window.V20;

function mkClassList(initial) {
  const s = new Set(initial || []);
  return { add(c) { s.add(c); }, remove(c) { s.delete(c); }, contains(c) { return s.has(c); },
    toggle(c) { if (s.has(c)) { s.delete(c); return false; } s.add(c); return true; }, _s: s };
}
t('Mock toggle: bam mo/dong doi class filters-open + aria-expanded + nhan nut',
  (() => {
    const secCls = mkClassList([]);
    const toggleBtn = { textContent: '🔍 Bộ lọc hồ sơ mẫu', _h: null,
      addEventListener(e, fn) { this._h = fn; }, click() { this._h(); },
      setAttribute(k, v) { this[k] = v; }, getAttribute(k) { return this[k]; },
      closest(sel) { return sel === 'section' ? section : null; } };
    const section = { tagName: 'SECTION', classList: secCls,
      querySelector(sel) { return sel === '.filter-toggle' ? toggleBtn : null; } };
    const origDoc = sb.document;
    sb.document = { querySelectorAll(sel) { return sel === '.filter-toggle' ? [toggleBtn] : []; },
      getElementById() { return null; } };
    V.initFilterToggle();
    toggleBtn.click();
    const okOpen = secCls.contains('filters-open') && toggleBtn['aria-expanded'] === 'true'
      && toggleBtn.textContent === '✕ Ẩn bộ lọc';
    toggleBtn.click();
    const okClose = !secCls.contains('filters-open') && toggleBtn['aria-expanded'] === 'false'
      && toggleBtn.textContent === '🔍 Bộ lọc hồ sơ mẫu';
    // closeFilterOf khi dang mo: gap + tra nhan
    toggleBtn.click();
    V.closeFilterOf(toggleBtn);
    const okCloseFn = !secCls.contains('filters-open') && toggleBtn['aria-expanded'] === 'false'
      && toggleBtn.textContent === '🔍 Bộ lọc hồ sơ mẫu';
    sb.document = origDoc;
    return okOpen && okClose && okCloseFn;
  })());

t('Mock apply lot: ap dung bo loc gap bo loc (filters-open bi go)',
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
    const secCls = mkClassList(['collapsed', 'filters-open']);
    const toggleBtn = { textContent: '🔍 Bộ lọc: Shop · Lô xả kho · Xưởng may', _label: '🔍 Bộ lọc: Shop · Lô xả kho · Xưởng may',
      setAttribute(k, v) { this[k] = v; } };
    const section = { tagName: 'SECTION', classList: secCls,
      querySelectorAll(sel) { return sel === '.lot-grid' ? [grid] : []; },
      querySelector(sel) { return sel === '.filter-toggle' ? toggleBtn : null; },
      scrollIntoView() {} };
    const moreBtn = { setAttribute() {}, textContent: '' };
    const sels = { fLotPrice: { value: 'lt20' }, fLotQty: { value: '' }, fLotCat: { value: '' } };
    const filterEl = { querySelectorAll(sel) { return sel === 'select' ? [sels.fLotPrice, sels.fLotQty, sels.fLotCat] : []; } };
    const applyBtn = { _h: null, addEventListener(e, fn) { this._h = fn; }, click() { this._h(); },
      closest(sel) { return sel === 'section' ? section : null; } };
    const resetBtn = { _h: null, addEventListener(e, fn) { this._h = fn; }, click() { this._h(); } };
    const countEl = { textContent: '' };
    const emptyEl = { hidden: true };
    const byId = { 'lo-hang-xa-kho': section, lotMoreBtn: moreBtn, lotApplyBtn: applyBtn, lotResetBtn: resetBtn, lotCount: countEl, lotEmpty: emptyEl,
      lotFilter: filterEl, fLotPrice: sels.fLotPrice, fLotQty: sels.fLotQty, fLotCat: sels.fLotCat };
    const origDoc = sb.document;
    sb.document = { getElementById(id) { return byId[id] || null; }, querySelectorAll() { return []; } };
    V.initLotFilter();
    applyBtn.click();
    const ok = countEl.textContent === '1 lô khớp bộ lọc' && !secCls.contains('collapsed')
      && !secCls.contains('filters-open') && toggleBtn['aria-expanded'] === 'false';
    sb.document = origDoc;
    return ok;
  })());

// ---- (E) CACHE + file khong doi giong het v71 ----
t("sw.js CACHE = 'v84-shell-1'", sw.includes("const CACHE = 'v84-shell-1'"));
t("sw.js khong con cache cu (v71)", !sw.includes('v71-shell-1'));
t('js/data.js giong het v71 (khong doi) (sha256)', sha('js/data.js') === '642a8e3fdb09f0d23d363741692f3da7106586aff84dd47d1bc81613b514fc57');
t('index.html giong het v71 (khong doi) (sha256)', sha('index.html') === '27ec4c15cc98c68650084b12de7f2b839a8f76d42f1933e01fc0981abbe47aa2');
t('sitemap.xml giong het v71 (khong doi) (sha256)', sha('sitemap.xml') === 'a5253c4d14a1de2e1095db28a6b9b75998ffaa3af5e3726d1b4f819485fd39f5');
t('tin-tuc.html giong het v71 (khong doi) (sha256)', sha('tin-tuc.html') === 'bab4ccb320ff4cc89e30e02e457aa0813de36ef8a65355d29426259d97768575');

console.log(`v72: ${pass} PASS, ${fail} FAIL`);
process.exit(fail ? 1 : 0);
