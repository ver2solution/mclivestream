/* v52 tests — Node only, no browser. v52 = he thong skin trang tri theo su
   kien le hoi, tu dong bat/tat theo ngay (yeu cau nguoi dung 06/11/2026 —
   lam luon bo 3 skin Tet Nguyen Dan, Noel, Tet Duong lich):
   (1) js/themes.js: config THEMES (Noel 01/12–26/12 + Tet Duong 28/12–03/01
       lap hang nam theo ngay-thang; Tet theo cua so nam cu the) +
       getActiveTheme(date) thuan tuy tra id theme hoac null +
       applyTheme(date?) them class len <html> + nut "Tat hieu ung"
       (localStorage 'ver2theme-fx', chi tat lop roi, giu mau theme).
   (2) v20.css: 3 class theme (doi bien mau + dai mau 6px tren cung) +
       hieu ung roi 2 lop bang CSS thuan (keyframes theme-fall-a/b) +
       .theme-fx-off + .theme-fx-toggle + prefers-reduced-motion.
   (3) Moi trang deu nap js/themes.js truoc js/app.js (46 trang).
   (4) sw.js CACHE = 'v76-shell-1' + precache js/themes.js.
   (5) Dai logo doi tac v51 KHONG doi: 18 the logo-card, o tron 48px,
       anh icon mau goc (khong grayscale), nam gon trong khung trang.
       (v54 cap nhat: them 20 logo moi -> 58 the, xem test-v54.mjs).
   Ngay Tet da tra cuu (lich am Viet Nam UTC+7; nguon: lichamviet.com,
   giaimaconso.com, lichviet.app, trimenh.com.vn):
   - Mung 1 Tet Dinh Mui 2027 = Thu Bay 06/02/2027 (giao thua toi
     05/02/2027; thang Chap Binh Ngo chi co 29 ngay, khong co 30 Tet).
   - Mung 1 Tet Mau Than 2028 = Thu Tu 26/01/2028 (giao thua toi 25/01/2028).
   Cua so Tet: 2 tuan truoc Mung 1 -> 1 tuan sau Mung 1. */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let pass = 0, fail = 0;
function t(name, cond, extra = '') { if (cond) { pass++; console.log('PASS v52:', name); } else { fail++; console.log('FAIL v52:', name, extra); } }
const D = (y, m, d) => new Date(y, m - 1, d); // thang 1-12 cho gon

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
// Du lieu goc de doi chieu khong doi (nap data.js nhu test-v41).
const sb2 = { window: {}, module: { exports: {} }, console, document: { getElementById: () => null, addEventListener: () => {}, querySelectorAll: () => [] } };
vm.createContext(sb2);
vm.runInContext(fs.readFileSync(path.join(root, 'js/data.js'), 'utf8'), sb2);
const DATA = sb2.window.V20_DATA;

// ---- (a) Config THEMES: du 3 theme, ngay hop le ----
t('config: du 3 theme (noel, tet-duong, tet)', T.THEMES.length === 3 && T.THEMES.map((x) => x.id).join(',') === 'noel,tet-duong,tet');
t('config: class theme dung ten da chot', T.THEMES.map((x) => x.cls).join(',') === 'theme-noel,theme-tet-duong,theme-tet');
t('config Noel: lap hang nam 01/12–26/12 (start < end, khong qua nam)', (() => { const n = T.THEMES[0]; return n.kind === 'md' && n.start.m === 12 && n.start.d === 1 && n.end.m === 12 && n.end.d === 26; })());
t('config Tet Duong: lap hang nam 28/12–03/01 (cua so QUA NAM co chu thich)', (() => { const n = T.THEMES[1]; return n.kind === 'md' && n.start.m === 12 && n.start.d === 28 && n.end.m === 1 && n.end.d === 3; })());
t('config Tet: 2 cua so theo nam, moi cua start < end va xep theo thu tu thoi gian', (() => {
  const w = T.THEMES[2].windows; if (T.THEMES[2].kind !== 'years' || w.length !== 2) return false;
  const n = (s) => { const p = s.split('-'); return new Date(+p[0], +p[1] - 1, +p[2]).getTime(); };
  return n(w[0].start) < n(w[0].end) && n(w[1].start) < n(w[1].end) && n(w[0].start) < n(w[1].start);
})());
t('config Tet: cua so 2027 chua Mung 1 Tet Dinh Mui 06/02/2027 (23/01–13/02/2027)', T.THEMES[2].windows[0].start === '2027-01-23' && T.THEMES[2].windows[0].end === '2027-02-13' && T.THEMES[2].windows[0].note.includes('06/02/2027'));
t('config Tet: cua so 2028 chua Mung 1 Tet Mau Than 26/01/2028 (12/01–02/02/2028)', T.THEMES[2].windows[1].start === '2028-01-12' && T.THEMES[2].windows[1].end === '2028-02-02' && T.THEMES[2].windows[1].note.includes('26/01/2028'));
t('config Tet: ghi chu sua ten nam moi dung (Dinh Mui 2027, khong phai Binh Ngo)', themesJs.includes('Đinh Mùi') && !themesJs.includes('Mùng 1 Tết Bính Ngọ'));

// ---- (b) getActiveTheme: ngay mau ----
const cases = [
  [D(2026, 12, 1), 'noel', 'Noel: bien bat dau 01/12'],
  [D(2026, 12, 15), 'noel', 'Noel: giua thang 12'],
  [D(2026, 12, 26), 'noel', 'Noel: bien ket thuc 26/12'],
  [D(2026, 12, 27), null, 'Ngay thuong: 27/12 (giua Noel va Tet Duong) khong theme'],
  [D(2026, 12, 28), 'tet-duong', 'Tet Duong: bien bat dau 28/12'],
  [D(2026, 12, 31), 'tet-duong', 'Tet Duong: 31/12'],
  [D(2027, 1, 1), 'tet-duong', 'Tet Duong: 01/01'],
  [D(2027, 1, 3), 'tet-duong', 'Tet Duong: bien ket thuc 03/01'],
  [D(2027, 1, 4), null, 'Ngay thuong: 04/01 (sau Tet Duong, truoc Tet) khong theme'],
  [D(2027, 1, 23), 'tet', 'Tet 2027: bien bat dau cua so 23/01'],
  [D(2027, 2, 6), 'tet', 'Tet 2027: Mung 1 Tet Dinh Mui 06/02'],
  [D(2027, 2, 13), 'tet', 'Tet 2027: bien ket thuc cua so 13/02'],
  [D(2027, 2, 14), null, 'Ngay thuong: 14/02 (sau cua so Tet 2027) khong theme'],
  [D(2028, 1, 12), 'tet', 'Tet 2028: bien bat dau cua so 12/01'],
  [D(2028, 1, 26), 'tet', 'Tet 2028: Mung 1 Tet Mau Than 26/01'],
  [D(2028, 2, 2), 'tet', 'Tet 2028: bien ket thuc cua so 02/02'],
  [D(2026, 11, 6), null, 'Ngay thuong: 06/11/2026 (hom nay) khong theme'],
  [D(2026, 6, 15), null, 'Ngay thuong: giua thang 6 khong theme'],
  [D(2027, 12, 25), 'noel', 'Noel lap lai hang nam: 25/12/2027 van la Noel'],
  [D(2028, 1, 1), 'tet-duong', 'Tet Duong lap lai hang nam: 01/01/2028'],
];
cases.forEach(([date, want, name]) => t('getActiveTheme: ' + name, T.getActiveTheme(date) === want, `got=${T.getActiveTheme(date)} want=${want}`));
t('getActiveTheme: ngay khong hop le tra null', T.getActiveTheme(new Date('xx')) === null);
t('getActiveTheme: nhan ca chuoi ngay', T.getActiveTheme('2026-12-15') === 'noel');

// ---- (c) v20.css: du 3 class theme + keyframes + tat hieu ung ----
['theme-noel', 'theme-tet-duong', 'theme-tet'].forEach((cls) => {
  t('v20.css: co rule html.' + cls + ' doi bien mau --brand', new RegExp('html\\.' + cls + '\\{[^}]*--brand:').test(css));
  t('v20.css: theme ' + cls + ' co dai mau 6px tren cung (body border-top)', new RegExp('html\\.' + cls + ' body\\{[^}]*border-top:6px').test(css));
  t('v20.css: theme ' + cls + ' co lop roi 1 (body::after)', css.includes('html.' + cls + ' body::after'));
  t('v20.css: theme ' + cls + ' co lop roi 2 (html::after)', css.includes('html.' + cls + '::after'));
});
t('v20.css: co keyframes theme-fall-a + theme-fall-b (hieu ung roi)', css.includes('@keyframes theme-fall-a') && css.includes('@keyframes theme-fall-b'));
t('v20.css: keyframes roi dung quang duong bang o (120px/180px, lap khong giat)', /@keyframes theme-fall-a\{[\s\S]*?to\{background-position:0 120px/.test(css) && /@keyframes theme-fall-b\{[\s\S]*?to\{background-position:0 180px/.test(css));
t('v20.css: lop roi pointer-events:none (khong chan click)', /body::after\{[^}]*pointer-events:none/.test(css) && /::after\{[^}]*pointer-events:none/.test(css));
t('v20.css: .theme-fx-off an ca 2 lop roi', css.includes('html.theme-fx-off body::after') && css.includes('html.theme-fx-off::after') && /theme-fx-off[^}]*display:none/.test(css));
t('v20.css: co nut .theme-fx-toggle (co dinh goc duoi trai, tranh nut Gop y phai)', /\.theme-fx-toggle\{[^}]*position:fixed/.test(css) && /\.theme-fx-toggle\{[^}]*left:12px/.test(css));
t('v20.css: ton trong prefers-reduced-motion (tat animation roi)', css.includes('@media(prefers-reduced-motion:reduce)') && css.includes('animation:none'));
t('v20.css: khoi skin v52 KHONG dong vao dai logo doi tac (bo qua chu trong comment)', (() => { const i = css.indexOf('/* SKIN LE HOI'); if (i === -1) return false; const j = css.indexOf('/* Loi chuc mung ngay le (v53', i); const block = css.slice(i, j === -1 ? undefined : j).replace(/\/\*[\s\S]*?\*\//g, ''); return !block.includes('logo-card') && !block.includes('trust-strip') && !block.includes('trust-logos'); })());

// ---- (d) applyTheme + nut "Tat hieu ung" (DOM gia) ----
t('applyTheme: ngay thuong 06/11/2026 tra null, khong them class theme nao', T.applyTheme(D(2026, 11, 6)) === null && !docEl.classList.contains('theme-noel') && !docEl.classList.contains('theme-tet') && !docEl.classList.contains('theme-tet-duong') && appended.length === 0);
t('applyTheme: ngay Noel 15/12 tra "noel" + them class theme-noel len <html>', T.applyTheme(D(2026, 12, 15)) === 'noel' && docEl.classList.contains('theme-noel'));
t('applyTheme: nut "Tat hieu ung" duoc tao (id themeFxToggle, class theme-fx-toggle)', (() => { const b = fakeDoc.getElementById('themeFxToggle'); return !!b && b.className === 'theme-fx-toggle' && b.textContent === 'Tắt hiệu ứng'; })());
t('nut Tat hieu ung: bam 1 lan -> luu localStorage off + them class theme-fx-off + doi chu nut', (() => {
  const b = fakeDoc.getElementById('themeFxToggle'); b.onclick();
  return store['ver2theme-fx'] === 'off' && docEl.classList.contains('theme-fx-off') && b.textContent === 'Bật hiệu ứng' && docEl.classList.contains('theme-noel');
})());
t('nut Tat hieu ung: bam lan 2 -> mo lai hieu ung (localStorage on, het class theme-fx-off)', (() => {
  const b = fakeDoc.getElementById('themeFxToggle'); b.onclick();
  return store['ver2theme-fx'] === 'on' && !docEl.classList.contains('theme-fx-off') && b.textContent === 'Tắt hiệu ứng';
})());
t('applyTheme: doi sang Tet 06/02/2027 thi class cu bi go (chi con theme-tet)', T.applyTheme(D(2027, 2, 6)) === 'tet' && docEl.classList.contains('theme-tet') && !docEl.classList.contains('theme-noel') && !docEl.classList.contains('theme-tet-duong'));
t('applyTheme: localStorage off truoc thi vua mo theme da co san class theme-fx-off', (() => {
  store['ver2theme-fx'] = 'off'; T.applyTheme(D(2026, 12, 20));
  const b = fakeDoc.getElementById('themeFxToggle');
  return docEl.classList.contains('theme-noel') && docEl.classList.contains('theme-fx-off') && b.textContent === 'Bật hiệu ứng';
})());
t('js/themes.js: tu chay applyTheme luc nap (khong cho crash khi khong co document)', themesJs.includes('try{applyTheme();}catch(e){}'));
t('js/themes.js: nut co id + chu dung tieng Viet trong code', themesJs.includes("id='themeFxToggle'") && themesJs.includes("'Tắt hiệu ứng'") && themesJs.includes("'Bật hiệu ứng'") && themesJs.includes("FX_KEY='ver2theme-fx'"));

// ---- (e) Dai logo doi tac v51 KHONG doi ----
t('index.html: dai logo 58 the logo-card (v54 cap nhat: them 20 logo moi, tu 18 -> 58)', (indexHtml.match(/class="logo-card"/g) || []).length === 58);
t('v20.css: o logo tron 48px (border-radius:50%, width+height 48px)', /\.logo-card\{[^}]*border-radius:50%/.test(css) && /\.logo-card\{[^}]*width:48px/.test(css) && /\.logo-card\{[^}]*height:48px/.test(css));
t('v20.css: logo van MAU GOC (khong grayscale, khong opacity mo)', !css.includes('filter:grayscale(1)') && !/\.logo-card img\{[^}]*opacity:\.5/.test(css));
t('v20.css: dai logo van nam gon trong khung trang (.trust-strip overflow:hidden + .trust-logos min-width:0)', /\.trust-strip\{[^}]*overflow:hidden/.test(css) && /\.trust-logos\{[^}]*min-width:0/.test(css));

// ---- (f) sw.js + (g) moi trang nap themes.js + (h) du lieu khong doi ----
t("sw.js CACHE = 'v86-shell-1'", swJs.includes("const CACHE = 'v86-shell-1';"));
t('sw.js: SHELL precache js/themes.js', swJs.includes("'js/themes.js'"));
t('sw.js: khong con CACHE v51-shell-1', !swJs.includes('v51-shell-1'));
t('moi trang nap js/themes.js TRUOC js/app.js (68 trang; v68: +1 dang-nhap; v71: +5 bai moi; v77: +4 trang AdSense; v80: +10 bai moi; v82: +5 bai moi; v83: +1 tinh-lai-1111; v85: +1 dang-ky; v86: +1 thanh-ly-kiot)', (() => {
  function walk(dir) { let out = []; for (const e of fs.readdirSync(dir, { withFileTypes: true })) { const p = path.join(dir, e.name); if (e.isDirectory()) { if (!['node_modules', '.git'].includes(e.name)) out = out.concat(walk(p)); } else if (e.name.endsWith('.html')) out.push(p); } return out; }
  const files = walk(root).map((p) => fs.readFileSync(p, 'utf8')).filter((s) => s.includes('js/app.js'));
  if (files.length !== 68) return false;
  return files.every((s) => { const ti = s.indexOf('js/themes.js'); const ai = s.indexOf('js/app.js'); return ti > -1 && ti < ai; });
})(), `so trang nap app.js phai la 68`);
t('index.html: themes.js dung truoc app.js', indexHtml.indexOf('js/themes.js') > -1 && indexHtml.indexOf('js/themes.js') < indexHtml.indexOf('js/app.js'));
t('du lieu khong doi: 20 mau, 30 shop, 50 bai', DATA.models.length === 20 && DATA.shops.length === 30 && DATA.articles.length === 50,
  `mau=${DATA.models.length} shop=${DATA.shops.length} bai=${DATA.articles.length}`);

console.log(`v52: ${pass} PASS, ${fail} FAIL`);
process.exit(fail ? 1 : 0);
