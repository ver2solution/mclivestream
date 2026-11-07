/* v53 tests — Node only, no browser. v53 = loi chuc mung ngay le theo theme
   (yeu cau nguoi dung 06/11/2026 — them loi chuc cho ngay dac biet dung
   skin le hoi v52):
   (1) js/themes.js: moi theme co greeting rieng (Noel chuc Giang sinh an
       lanh; Tet Duong chuc mung nam moi; Tet chuc mung nam moi {year} —
       {year} thay bang ten nam am cua cua so dang bat: Dinh Mui 2027,
       Mau Than 2028, khong ghi cung ten nam cho ca 2 nam) +
       getGreeting(date) thuan tuy + seasonKey(date) dinh danh mua le +
       thanh chuc mung (id themeGreeting) do applyTheme() tu tao, dat dau
       <main> (ngay duoi header, tren hero), chi khi theme dang bat; nut
       dong luu localStorage 'ver2theme-greeting' THEO MUA (cung mua dong
       roi khong hien lai; mua sau — ke ca Tet Duong qua nam moi hay Tet
       nam sau — tu hien lai; het dip tu an).
   (2) v20.css: .theme-greeting (+ nut dong + mobile) trong khoi SKIN LE
       HOI; mau nen lay tu bien --brandsoft nen tu doi theo tung theme.
   (3) sw.js CACHE = 'v76-shell-1' (doi theo quy tac moi lan deploy doi
       file) + precache js/themes.js.
   (4) Hoi quy v52: cua so ngay theme khong doi, dai logo doi tac v51
       khong doi, du lieu khong doi (20 mau, 30 shop, 50 bai), 40 trang
       nap themes.js truoc app.js.
   Ngay Tet da tra cuu (lich am Viet Nam UTC+7): Mung 1 Tet Dinh Mui 2027
   = Thu Bay 06/02/2027; Mung 1 Tet Mau Than 2028 = Thu Tu 26/01/2028. */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let pass = 0, fail = 0;
function t(name, cond, extra = '') { if (cond) { pass++; console.log('PASS v53:', name); } else { fail++; console.log('FAIL v53:', name, extra); } }
const D = (y, m, d) => new Date(y, m - 1, d); // thang 1-12 cho gon
const NOEL = '🎄 Giáng sinh an lành! Ver2Solution chúc các chủ shop một mùa lễ ấm áp — livestream đông khách, chốt đơn liên tục.';
const TET_DUONG = '🎉 Chúc mừng năm mới! Ver2Solution chúc các chủ shop năm mới khởi sắc — đơn hàng tăng trưởng, livestream bứt phá.';
const TET_2027 = '🧧 Chúc mừng năm mới Đinh Mùi! Ver2Solution kính chúc các chủ shop năm mới an khang, phát tài — livestream rộn ràng, đơn về như ý.';
const TET_2028 = '🧧 Chúc mừng năm mới Mậu Thân! Ver2Solution kính chúc các chủ shop năm mới an khang, phát tài — livestream rộn ràng, đơn về như ý.';

// ---- Nap js/themes.js trong vm voi DOM gia + localStorage gia ----
function mkClassList() { const s = new Set(); return { add: (c) => s.add(c), remove: (c) => s.delete(c), contains: (c) => s.has(c), _set: s }; }
const docEl = { classList: mkClassList() };
let appended = [];
let mainEl = null;
function mkEl() {
  const el = {
    id: '', className: '', type: '', textContent: '', onclick: null,
    children: [], attrs: {}, firstChild: null,
    setAttribute(k, v) { this.attrs[k] = v; },
    appendChild(c) { this.children.push(c); this.firstChild = this.children[0]; return c; },
    insertBefore(c, ref) { const i = ref ? this.children.indexOf(ref) : -1; if (i > -1) this.children.splice(i, 0, c); else this.children.push(c); this.firstChild = this.children[0] || null; return c; },
    remove() {
      let i = appended.indexOf(this); if (i > -1) appended.splice(i, 1);
      if (mainEl) { const j = mainEl.children.indexOf(this); if (j > -1) mainEl.children.splice(j, 1); mainEl.firstChild = mainEl.children[0] || null; }
    },
  };
  return el;
}
mainEl = mkEl();
const fakeDoc = {
  documentElement: docEl,
  body: { appendChild: (el) => { appended.push(el); } },
  getElementById: (id) => appended.find((el) => el.id === id) || mainEl.children.find((el) => el.id === id) || null,
  querySelector: (sel) => (sel === 'main' ? mainEl : null),
  createElement: () => mkEl(),
};
const store = {};
const fakeLS = { getItem: (k) => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); } };
const sb = { window: {}, module: { exports: {} }, console, document: fakeDoc, localStorage: fakeLS };
vm.createContext(sb);
const themesJs = fs.readFileSync(path.join(root, 'js/themes.js'), 'utf8');
vm.runInContext(themesJs, sb);
const T = sb.module.exports;
const css = fs.readFileSync(path.join(root, 'v20.css'), 'utf8');
const indexHtml = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const swJs = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');
const sb2 = { window: {}, module: { exports: {} }, console, document: { getElementById: () => null, addEventListener: () => {}, querySelectorAll: () => [] } };
vm.createContext(sb2);
vm.runInContext(fs.readFileSync(path.join(root, 'js/data.js'), 'utf8'), sb2);
const DATA = sb2.window.V20_DATA;
const bar = () => fakeDoc.getElementById('themeGreeting');
const barText = () => { const b = bar(); return b && b.children[0] ? b.children[0].textContent : null; };
const closeBtn = () => { const b = bar(); return b && b.children[1] ? b.children[1] : null; };

// ---- (a) Config: moi theme co greeting rieng, ngan gon, nhac Ver2Solution ----
t('config: du 3 theme deu co greeting (string khong rong)', T.THEMES.length === 3 && T.THEMES.every((x) => typeof x.greeting === 'string' && x.greeting.length > 0));
t('config: greeting ngan gon (moi loi chuc < 160 ky tu)', T.THEMES.every((x) => x.greeting.length < 160), T.THEMES.map((x) => x.id + '=' + x.greeting.length).join(', '));
t('config: moi greeting deu nhac Ver2Solution + shop', T.THEMES.every((x) => x.greeting.includes('Ver2Solution') && x.greeting.includes('shop')));
t('config Noel: greeting chuc Giang sinh an lanh', T.THEMES[0].greeting === NOEL);
t('config Tet Duong: greeting chuc mung nam moi', T.THEMES[1].greeting === TET_DUONG);
t('config Tet: greeting co cho giu {year}, khong ghi cung ten nam', T.THEMES[2].greeting.includes('{year}') && !T.THEMES[2].greeting.includes('Đinh Mùi') && !T.THEMES[2].greeting.includes('Mậu Thân'));
t('config Tet: moi cua so co yearName dung (Dinh Mui 2027, Mau Than 2028)', T.THEMES[2].windows[0].yearName === 'Đinh Mùi' && T.THEMES[2].windows[1].yearName === 'Mậu Thân');
t('config Tet: cua so ngay KHONG doi so voi v52 (23/01–13/02/2027, 12/01–02/02/2028)', T.THEMES[2].windows[0].start === '2027-01-23' && T.THEMES[2].windows[0].end === '2027-02-13' && T.THEMES[2].windows[1].start === '2028-01-12' && T.THEMES[2].windows[1].end === '2028-02-02');
t('config Noel/Tet Duong: cua so ngay KHONG doi so voi v52', T.THEMES[0].start.m === 12 && T.THEMES[0].start.d === 1 && T.THEMES[0].end.m === 12 && T.THEMES[0].end.d === 26 && T.THEMES[1].start.m === 12 && T.THEMES[1].start.d === 28 && T.THEMES[1].end.m === 1 && T.THEMES[1].end.d === 3);

// ---- (b) getGreeting: dung loi chuc theo ngay mau, ngay thuong tra null ----
const gCases = [
  [D(2026, 12, 1), NOEL, 'Noel: bien bat dau 01/12'],
  [D(2026, 12, 15), NOEL, 'Noel: giua thang 12'],
  [D(2026, 12, 26), NOEL, 'Noel: bien ket thuc 26/12'],
  [D(2026, 12, 27), null, 'Ngay thuong: 27/12 khong greeting'],
  [D(2026, 12, 28), TET_DUONG, 'Tet Duong: bien bat dau 28/12'],
  [D(2027, 1, 1), TET_DUONG, 'Tet Duong: 01/01'],
  [D(2027, 1, 3), TET_DUONG, 'Tet Duong: bien ket thuc 03/01'],
  [D(2027, 1, 4), null, 'Ngay thuong: 04/01 khong greeting'],
  [D(2027, 1, 23), TET_2027, 'Tet 2027: bien bat dau cua so 23/01'],
  [D(2027, 2, 6), TET_2027, 'Tet 2027: Mung 1 Tet Dinh Mui 06/02 dung ten Dinh Mui'],
  [D(2027, 2, 13), TET_2027, 'Tet 2027: bien ket thuc cua so 13/02'],
  [D(2027, 2, 14), null, 'Ngay thuong: 14/02 khong greeting'],
  [D(2028, 1, 12), TET_2028, 'Tet 2028: bien bat dau cua so 12/01'],
  [D(2028, 1, 26), TET_2028, 'Tet 2028: Mung 1 Tet Mau Than 26/01 dung ten Mau Than (khong phai Dinh Mui)'],
  [D(2028, 2, 2), TET_2028, 'Tet 2028: bien ket thuc cua so 02/02'],
  [D(2026, 11, 6), null, 'Ngay thuong: 06/11/2026 (hom nay) khong greeting'],
  [D(2026, 6, 15), null, 'Ngay thuong: giua thang 6 khong greeting'],
];
gCases.forEach(([date, want, name]) => t('getGreeting: ' + name, T.getGreeting(date) === want, `got=${T.getGreeting(date)}`));
t('getGreeting: ngay khong hop le tra null', T.getGreeting(new Date('xx')) === null);
t('getGreeting: nhan ca chuoi ngay', T.getGreeting('2026-12-15') === NOEL);

// ---- (c) seasonKey: dinh danh mua le (Tet Duong qua nam la 1 mua) ----
const kCases = [
  [D(2026, 12, 15), 'noel:2026-12-1', 'Noel 2026'],
  [D(2026, 12, 30), 'tet-duong:2026-12-28', 'Tet Duong 30/12/2026'],
  [D(2027, 1, 2), 'tet-duong:2026-12-28', 'Tet Duong 02/01/2027 CUNG mua voi 30/12/2026'],
  [D(2028, 1, 1), 'tet-duong:2027-12-28', 'Tet Duong 01/01/2028 la mua MOI'],
  [D(2027, 2, 6), 'tet:2027-01-23', 'Tet 2027'],
  [D(2028, 1, 26), 'tet:2028-01-12', 'Tet 2028 la mua khac Tet 2027'],
  [D(2026, 11, 6), null, 'Ngay thuong khong co seasonKey'],
];
kCases.forEach(([date, want, name]) => t('seasonKey: ' + name, T.seasonKey(date) === want, `got=${T.seasonKey(date)} want=${want}`));

// ---- (d) applyTheme + thanh chuc mung (DOM gia) ----
t('greeting: ngay thuong 06/11/2026 khong co thanh chuc', T.applyTheme(D(2026, 11, 6)) === null && bar() === null && mainEl.children.length === 0);
t('greeting: ngay Noel 15/12 tao thanh chuc (id themeGreeting, class theme-greeting, role status)', (() => {
  T.applyTheme(D(2026, 12, 15));
  const b = bar();
  return !!b && b.className === 'theme-greeting' && b.attrs.role === 'status';
})());
t('greeting: noi dung thanh chuc Noel dung loi chuc da chot', barText() === NOEL);
t('greeting: thanh chuc dat DAU <main> (truoc noi dung cu)', (() => {
  const dummy = mkEl(); dummy.id = 'old-first'; mainEl.children.push(dummy); mainEl.firstChild = mainEl.children[0];
  T.applyTheme(D(2026, 12, 20));
  return mainEl.children[0] === bar() && mainEl.children[1] === dummy;
})());
t('greeting: nut dong co ky tu ✕ + aria-label tieng Viet', (() => { const b = closeBtn(); return !!b && b.textContent === '✕' && b.attrs['aria-label'] === 'Đóng lời chúc'; })());
t('greeting: bam nut dong -> thanh bien mat + luu localStorage theo mua', (() => {
  closeBtn().onclick();
  return bar() === null && store['ver2theme-greeting'] === 'noel:2026-12-1';
})());
t('greeting: cung mua Noel 2026 da dong thi mo lai trang van khong hien', T.applyTheme(D(2026, 12, 22)) === 'noel' && bar() === null);
t('greeting: mua Noel 2027 moi thi tu hien lai', (() => { T.applyTheme(D(2027, 12, 15)); return barText() === NOEL; })());
t('greeting: doi theme Noel -> Tet thi chi co 1 thanh, noi dung doi sang Tet Dinh Mui', (() => {
  T.applyTheme(D(2027, 2, 6));
  const bars = mainEl.children.filter((el) => el.id === 'themeGreeting');
  return bars.length === 1 && barText() === TET_2027;
})());
t('greeting: dong Tet 2027 khong chan Tet 2028 (mua khac)', (() => {
  closeBtn().onclick();
  if (store['ver2theme-greeting'] !== 'tet:2027-01-23') return false;
  T.applyTheme(D(2028, 1, 26));
  return barText() === TET_2028;
})());
t('greeting: dong Tet Duong 30/12/2026 thi 02/01/2027 van an (cung mua qua nam)', (() => {
  T.applyTheme(D(2026, 12, 30));
  if (barText() !== TET_DUONG) return false;
  closeBtn().onclick();
  T.applyTheme(D(2027, 1, 2));
  return bar() === null && store['ver2theme-greeting'] === 'tet-duong:2026-12-28';
})());
t('greeting: het dip (14/02/2027) thi thanh chuc tu bien mat + nut hieu ung cung mat', (() => {
  const r = T.applyTheme(D(2027, 2, 14));
  return r === null && bar() === null && fakeDoc.getElementById('themeFxToggle') === null;
})());
t('js/themes.js: export them getGreeting/seasonKey/GREET_KEY', typeof T.getGreeting === 'function' && typeof T.seasonKey === 'function' && T.GREET_KEY === 'ver2theme-greeting');
t('js/themes.js: van tu chay applyTheme luc nap, khong crash khi khong co document', themesJs.includes('try{applyTheme();}catch(e){}'));

// ---- (e) v20.css: rule thanh chuc mung, khoi skin khong dong dai logo ----
t('v20.css: co rule .theme-greeting (flex, nen var(--brandsoft))', /\.theme-greeting\{[^}]*display:flex/.test(css) && /\.theme-greeting\{[^}]*background:var\(--brandsoft\)/.test(css));
t('v20.css: nut dong trong thanh chuc la o tron 26px', /\.theme-greeting button\{[^}]*border-radius:50%/.test(css) && /\.theme-greeting button\{[^}]*width:26px/.test(css));
t('v20.css: thanh chuc co ban mobile (<=600px nho hon)', /@media\(max-width:600px\)\{\.theme-greeting\{[^}]*font-size:13px/.test(css));
t('v20.css: khoi skin KHONG dong vao dai logo doi tac (bo qua chu trong comment)', (() => { const i = css.indexOf('/* SKIN LE HOI'); if (i === -1) return false; const j = css.indexOf('/* Loi chuc mung ngay le (v53', i); const block = css.slice(i, j === -1 ? undefined : j).replace(/\/\*[\s\S]*?\*\//g, ''); return !block.includes('logo-card') && !block.includes('trust-strip') && !block.includes('trust-logos'); })());

// ---- (f) sw.js ----
t("sw.js CACHE = 'v84-shell-1'", swJs.includes("const CACHE = 'v84-shell-1';"));
t('sw.js: khong con CACHE v52-shell-1', !swJs.includes('v52-shell-1'));
t("sw.js: ghi chu dau file doi sang v60", swJs.includes('/* v60 service worker'));
t('sw.js: SHELL van precache js/themes.js', swJs.includes("'js/themes.js'"));

// ---- (g) Hoi quy: dai logo (cap nhat theo v54: 58 the), du lieu, 46 trang nap themes.js ----
t('index.html: dai logo 58 the logo-card (v54 cap nhat: them 20 logo moi, tu 18 -> 58)', (indexHtml.match(/class="logo-card"/g) || []).length === 58);
t('v20.css: o logo tron 48px (border-radius:50%, width+height 48px)', /\.logo-card\{[^}]*border-radius:50%/.test(css) && /\.logo-card\{[^}]*width:48px/.test(css) && /\.logo-card\{[^}]*height:48px/.test(css));
t('v20.css: logo van MAU GOC (khong grayscale, khong opacity mo)', !css.includes('filter:grayscale(1)') && !/\.logo-card img\{[^}]*opacity:\.5/.test(css));
t('v20.css: dai logo van nam gon trong khung trang (.trust-strip overflow:hidden + .trust-logos min-width:0)', /\.trust-strip\{[^}]*overflow:hidden/.test(css) && /\.trust-logos\{[^}]*min-width:0/.test(css));
t('moi trang nap js/themes.js TRUOC js/app.js (66 trang; v68: +1 dang-nhap; v71: +5 bai moi; v77: +4 trang AdSense; v80: +10 bai moi; v82: +5 bai moi; v83: +1 tinh-lai-1111)', (() => {
  function walk(dir) { let out = []; for (const e of fs.readdirSync(dir, { withFileTypes: true })) { const p = path.join(dir, e.name); if (e.isDirectory()) { if (!['node_modules', '.git'].includes(e.name)) out = out.concat(walk(p)); } else if (e.name.endsWith('.html')) out.push(p); } return out; }
  const files = walk(root).map((p) => fs.readFileSync(p, 'utf8')).filter((s) => s.includes('js/app.js'));
  if (files.length !== 66) return false;
  return files.every((s) => { const ti = s.indexOf('js/themes.js'); const ai = s.indexOf('js/app.js'); return ti > -1 && ti < ai; });
})(), `so trang nap app.js phai la 66`);
t('du lieu khong doi: 20 mau, 30 shop, 50 bai', DATA.models.length === 20 && DATA.shops.length === 30 && DATA.articles.length === 50,
  `mau=${DATA.models.length} shop=${DATA.shops.length} bai=${DATA.articles.length}`);

console.log(`v53: ${pass} PASS, ${fail} FAIL`);
process.exit(fail ? 1 : 0);
