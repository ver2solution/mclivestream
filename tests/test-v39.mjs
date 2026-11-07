/* v39 tests — Node only, no browser. v39 = fix trai nghiem MOBILE (yeu cau
   nguoi dung toi 05/11/2026, sua theo code CSS vi trinh duyet kiem tra
   khong tu thu hep cua so duoc nen chua co bao cao truc quan):
   (1) Menu mo bi vo o may tinh bang 601-1000px: .head-in thieu
       flex-wrap — them flex-wrap ngay tu <=1000px, nav mo xuong hang
       rieng (margin-top 8px).
   (2) Dien thoai 360px bi an o thong tin thu 2 + muc Kinh nghiem/Yeu cau
       (2 quy tac display:none o <=360px) — BO han, giu du thong tin,
       chi thu gon padding/min-height.
   (3) Nut Gop y (💬) lo lung giua man hinh che noi dung — o <=600px
       chuyen xuong goc duoi phai (bottom:20px, khong con top:50%).
   (4) Nut header/section-head bi ep full-width o <=360px — thu hep
       pham vi width:100% chi cho nut trong .card-actions, .search-card,
       .filter-card, .form-card; giu min-height:48px cho nut bam chinh.
   (5) Nut phan trang nho kho bam — o <=600px min-height:44px,
       padding 10px 16px.
   (6) 4 o tin xep doc qua dai o <=600px — doi sang dang ngang: anh
       120px ben trai (ti le 4:3), tieu de + chuyen muc ben phai, badge
       so 1-4 van o goc anh.
   (7) Chong tran ngang o 360px: o nhap trong luoi co min-width:0.
   Chi sua v20.css (+ test) va sw.js (cache v39-shell-1 luc v39, v40: v40-shell-1, v41: v41-shell-1, v42: v42-shell-1, v43: v43-shell-1, v44: v47-shell-1); du lieu khong
   doi (20 mau, 30 shop, 50 bai); trang chu van 2 hang, phan trang
   trang con van mau 12/trang, shop 9/trang. */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let pass = 0, fail = 0;
function t(name, cond, extra = '') { if (cond) { pass++; console.log('PASS v39:', name); } else { fail++; console.log('FAIL v39:', name, extra); } }
const sb = { window: {}, module: { exports: {} }, console, URLSearchParams };
vm.createContext(sb);
vm.runInContext(fs.readFileSync(path.join(root, 'js/data.js'), 'utf8'), sb);
vm.runInContext(fs.readFileSync(path.join(root, 'js/app.js'), 'utf8'), sb);
const D = sb.window.V20_DATA, V = sb.window.V20;
const css = fs.readFileSync(path.join(root, 'v20.css'), 'utf8');
const sw = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');
const flat = css.replace(/\s+/g, '');
// Lay noi dung 1 khoi @media(max-width:Xpx){...} (dem dau ngoac de dung o dong dung).
function mediaBlock(width) {
  const start = css.indexOf('@media(max-width:' + width + 'px){');
  if (start < 0) return '';
  let depth = 0, i = css.indexOf('{', start);
  for (; i < css.length; i++) {
    if (css[i] === '{') depth++;
    else if (css[i] === '}') { depth--; if (depth === 0) return css.slice(start, i + 1); }
  }
  return '';
}
const m1000 = mediaBlock(1000).replace(/\s+/g, '');
const m600 = mediaBlock(600).replace(/\s+/g, '');
const m360 = mediaBlock(360).replace(/\s+/g, '');

// ---- (1) menu mo o may tinh bang 601-1000px: head-in wrap, nav xuong hang rieng ----
t('(1) o <=1000px .head-in co flex-wrap:wrap', m1000.includes('.head-in{flex-wrap:wrap}'));
t('(1) nav mo o <=1000px co margin-top va margin-left:0 (xuong hang rieng, khong tran)',
  m1000.includes('.main-nav.open{display:flex;flex-direction:column;width:100%;margin-left:0;margin-top:8px}'));
t('(1) menu-btn van hien o <=1000px, nav an mac dinh', m1000.includes('.menu-btn{display:block}') && m1000.includes('.main-nav{display:none}'));

// ---- (2) khong con quy tac an thong tin o <=360px; giu du thong tin, chi thu gon ----
t('(2) khong con display:none cho decision-item thu 2 o <=360px',
  !css.includes('.decision-row .decision-item:nth-child(2){display:none}'));
t('(2) khong con display:none cho decision-exp o <=360px',
  !css.includes('.card-body:has(.decision-row) .decision-exp{display:none}'));
t('(2) o <=360px chi thu gon padding/min-height (7px 9px / 56px)',
  m360.includes('.decision-item,.decision-exp{padding:7px9px;min-height:56px}'));
t('(2) decision-value van toi da 2 dong (khong bi cat xuong 1 dong)',
  css.includes('-webkit-line-clamp:2') && !m360.includes('.decision-exp.decision-value{-webkit-line-clamp:1}'));
{
  const full = { salary: '10 triệu/tháng', schedule: 'Tối 19h-22h', topRevenue: '50 triệu', exp: '2 năm livestream thời trang' };
  const mh = V.decisionHTML(full);
  const modelItems = (mh.match(/decision-item/g) || []).length;
  const modelExp = (mh.match(/decision-exp/g) || []).length;
  t('(2) the mau render du 3 decision-item + 1 decision-exp', modelItems === 3 && modelExp === 1, 'got ' + modelItems + ' + ' + modelExp);
  const shop = D.shops[0];
  const sh = V.shopDecisionHTML(shop);
  const shopItems = (sh.match(/decision-item/g) || []).length;
  const shopExp = (sh.match(/decision-exp/g) || []).length;
  t('(2) the shop render du 4 decision-item + 1 decision-exp', shopItems === 4 && shopExp === 1, 'got ' + shopItems + ' + ' + shopExp);
}

// ---- (3) nut Gop y xuong goc duoi phai o <=600px ----
t('(3) o <=600px .gopy-fab o bottom (top:auto;bottom:20px;transform:none)',
  m600.includes('.gopy-fab{top:auto;bottom:20px;right:14px;transform:none}'));
t('(3) desktop van giu .gopy-fab giua man hinh (top:50%)',
  css.includes('.gopy-fab{position:fixed;right:14px;top:50%;transform:translateY(-50%)'));

// ---- (4) nut full-width o <=360px chi trong the/form, khong ap header/section-head ----
t('(4) khong con quy tac .btn{width:100%} ap cho MOI nut o <=360px',
  !/(^|})\.btn\{width:100%/.test(m360) && !flat.includes('}.btn{width:100%;min-height:48px}'));
t('(4) width:100% chi ap cho nut trong .card-actions/.search-card/.filter-card/.form-card',
  m360.includes('.card-actions.btn,.search-card.btn,.filter-card.btn,.form-card.btn{width:100%;min-height:48px}'));
t('(4) khoi <=360px khong ep nut trong .site-head hay .section-head',
  !m360.includes('.site-head') && !m360.includes('.section-head.btn'));
t('(4) nut trong the/form van min-height:48px (de bam bang ngon tay)',
  m360.includes('min-height:48px'));

// ---- (5) nut phan trang du lon o <=600px ----
t('(5) o <=600px .pager button min-height:44px, padding 10px 16px',
  m600.includes('.pagerbutton{min-height:44px;padding:10px16px}'));

// ---- (6) o tin dang ngang o <=600px ----
t('(6) o <=600px .pin-card a dang grid ngang (anh 120px + chu)',
  m600.includes('.pin-carda{display:grid;grid-template-columns:120px1fr;grid-template-areas:"imgtitle""imgcat"'));
t('(6) o <=600px anh/o placeholder 120px, ti le 4:3',
  m600.includes('.pin-img,.pin-noimg{grid-area:img;width:120px;aspect-ratio:4/3}'));
t('(6) o <=600px tieu de + chuyen muc vao dung vung grid, khong tran (v85: .pin-cat padding-left:0 — huy hieu o goc anh)',
  m600.includes('.pin-cardh3{grid-area:title;margin:0}') && m600.includes('.pin-cat{grid-area:cat;margin:0;padding-left:0}'));
t('(6) badge so 1-4 van o goc anh (duoi trai, bottom/left 16px — v78 B3)',
  m600.includes('.pin-num{top:auto;bottom:16px;left:16px}'));
t('(6) desktop van giu o tin dung (anh 16:9 day chieu rong)',
  css.includes('.pin-img{display:block;width:100%;aspect-ratio:16/9'));

// ---- (7) chong tran ngang o 360px ----
t('(7) o nhap trong luoi co min-width:0 o <=360px',
  m360.includes('.search-cardinput,.search-cardselect,.filter-cardinput,.filter-cardselect,.form-cardinput,.form-cardselect,.form-cardtextarea{min-width:0}'));
t('(7) .tags van flex-wrap:wrap, .card-actions thanh 1 cot o <=360px',
  css.includes('.tags{display:flex;gap:7px;flex-wrap:wrap}') && m360.includes('.card-actions{grid-template-columns:1fr}'));
t('(7) html,body co overflow-x:hidden (luoi cuoi chong tran ngang)',
  css.includes('html,body{overflow-x:hidden}'));

// ---- (8) sw.js + du lieu + so the khong doi ----
t('(8) sw.js CACHE = v86-shell-1', sw.includes("const CACHE = 'v86-shell-1';"));
t('(8) du lieu khong doi: 20 mau, 30 shop, 50 bai',
  D.models.length === 20 && D.shops.length === 30 && D.articles.length === 50);
t('(8) trang chu van 2 hang (homeTop8 = 8), hang tin van 4 o',
  V.homeTop8(D.models, new Date(2026, 10, 5)).length === 8 && V.getPinnedRow(D.articles).length === 4);

console.log('v39: ' + pass + ' PASS, ' + fail + ' FAIL');
process.exit(fail ? 1 : 0);
