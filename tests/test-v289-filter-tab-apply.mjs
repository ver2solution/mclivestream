// test-v289-filter-tab-apply.mjs — v449 (#61): bo loc mang sang tab khac
// Truoc fix: setCat (trang Mau) + setShopCat (trang Shop) chi doi section
// hien thi + so dem, KHONG chay lai apply() cho muc vua chon — muc moi hien
// danh sach CHUA LOC trong khi form loc chung + URL van giu tham so loc cu
// (nguoi dung ket luan "bo loc khong ap dung"). Sau fix: chuyen tab thi ap
// dung lai bo loc cua muc vua chon, KHONG cuon (apply(false), giu v207/v213);
// guard trong initSectionFilter.apply: doScroll === false thi khong bao gio
// cuon (goi cu doScroll=true/undefined giu nguyen hanh vi cu).
// Chay: node tests/test-v289-filter-tab-apply.mjs (tu goc repo hoac goc stage).
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

const appJs = fs.readFileSync(path.join(root, 'js/app.js'), 'utf8');
const swJs = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');

// --- Tinh: app.js ---
check('app.js co guard v449 (doScroll === false thi khong cuon)',
  appJs.includes("if(doScroll !== false && (doScroll === true || !opts.noScroll) && target.scrollIntoView)"));
check('app.js KHONG con guard cu (khong co doScroll !== false)',
  !appJs.includes("if((doScroll === true || !opts.noScroll) && target.scrollIntoView)"));
check('app.js setCat v449: muc moi goi h.apply(false)',
  appJs.includes('if(h2 && h2.apply) h2.apply(false);'));
check('app.js setCat v449: lot goi lotCtl.apply(false)',
  appJs.includes('if(lotCtl && lotCtl.apply) lotCtl.apply(false);'));
check('app.js setCat v449: factory goi facCtl.apply(false)',
  appJs.includes('if(facCtl && facCtl.apply) facCtl.apply(false);'));
check('app.js setCat v449: model goi modelRender(giua trang URL)',
  appJs.includes('modelRender(pg);'));
check('app.js setShopCat v449: muc moi goi h.apply(false)',
  appJs.includes('if(h3 && h3.apply) h3.apply(false);'));
check('app.js setShopCat v449: shop goi render(giua trang URL)',
  appJs.includes('render(pg3);'));
check('app.js setCat/setShopCat v449 KHONG qua cong diem (khong gateFilterApply trong khoi moi)',
  !/v449 \(#61[\s\S]{0,400}gateFilterApply/.test(appJs));
check('app.js khong con marker xung dot', !/^>>>>>>>|^<<<<<<<|^}>>>>>>>|^}<<<<<<</m.test(appJs));

// --- Tinh: sw.js ---
check("sw.js CACHE la v449-filter-tab-apply-1", swJs.includes("const CACHE = 'v449-filter-tab-apply-1';"));
check("sw.js KHONG con CACHE cu v435", !swJs.includes("const CACHE = 'v435-user-menu-chat-link-1';"));
check('sw.js khong con marker xung dot', !/^>>>>>>>|^<<<<<<<|^}>>>>>>>|^}<<<<<<</m.test(swJs));

// --- Logic thuan: trich initSectionFilter + chay trong vm voi DOM gia ---
const mFilter = appJs.match(/function initSectionFilter\(opts\)\{[\s\S]*?\n\}/);
check('trich duoc initSectionFilter', !!mFilter);
if (mFilter) {
  let scrollCount = 0;
  function fakeEl() {
    const el = {
      _cls: new Set(),
      classList: {
        add(c) { el._cls.add(c); },
        remove(c) { el._cls.delete(c); },
        toggle(c, f) { if (f === undefined) { el._cls.has(c) ? el._cls.delete(c) : el._cls.add(c); } else { f ? el._cls.add(c) : el._cls.delete(c); } },
        contains(c) { return el._cls.has(c); }
      },
      setAttribute() {},
      textContent: '',
      hidden: false,
      value: '',
      children: [],
      querySelectorAll() { return []; },
      appendChild(c) { el._order.push(c); },
      addEventListener() {},
      scrollIntoView() { scrollCount++; },
      _order: []
    };
    return el;
  }
  // 2 the: 1 khop tinh HN, 1 khong khop
  const cardHN = fakeEl(); cardHN._prov = 'HN';
  const cardHCM = fakeEl(); cardHCM._prov = 'HCM';
  const grid = fakeEl(); grid.children = [cardHN, cardHCM];
  const section = fakeEl();
  section.querySelectorAll = (sel) => sel === '.lot-grid' ? [grid] : [];
  const moreBtn = fakeEl();
  const countEl = fakeEl();
  const emptyEl = fakeEl();
  const byId = {
    'sec-test': section,
    'sec-test-more': moreBtn,
    'sec-test-count': countEl,
    'sec-test-empty': emptyEl
  };
  let currentProv = '';
  const sandbox = {
    document: {
      getElementById: (id) => byId[id] || null,
      querySelectorAll: () => []
    },
    CLASS_MORE: {},
    refreshClassMoreBtn: () => {},
    closeFilterOf: () => {},
    console
  };
  vm.createContext(sandbox);
  vm.runInContext(mFilter[0] + '\nthis.__initSectionFilter = initSectionFilter;', sandbox);
  const initSectionFilter = sandbox.__initSectionFilter;
  check('initSectionFilter chay duoc trong vm', typeof initSectionFilter === 'function');

  // Section KHONG co noScroll (giong lot/factory): apply() mac dinh CUON.
  const ctl = initSectionFilter({
    sectionId: 'sec-test', moreBtnId: 'sec-test-more',
    countId: 'sec-test-count', emptyId: 'sec-test-empty', label: 'muc',
    readForm: () => ({ prov: currentProv }),
    matches: (card, f) => !f.prov || card._prov === f.prov
  });
  check('initSectionFilter tra ve {apply, reset, refresh}', !!ctl && typeof ctl.apply === 'function' && typeof ctl.reset === 'function');

  // Loc HN: chi the HN khop; the HCM bi danh dau lot-filtered-out.
  currentProv = 'HN';
  scrollCount = 0;
  ctl.apply(false);
  check('apply(false) van loc dung (the khop hien, the lech bi an)',
    !cardHN._cls.has('lot-filtered-out') && cardHCM._cls.has('lot-filtered-out'));
  check('apply(false) KHONG cuon (guard v449)', scrollCount === 0, 'scroll=' + scrollCount);
  check('apply(false) hien dong dem dung', countEl.textContent === "1 muc khớp bộ lọc", JSON.stringify(countEl.textContent));

  // apply() khong doi so (hanh vi cu): van cuon toi the khop dau tien.
  scrollCount = 0;
  ctl.apply();
  check('apply() khong doi so VAN cuon (hanh vi cu giu nguyen)', scrollCount === 1, 'scroll=' + scrollCount);
  check('apply() van loc dung', !cardHN._cls.has('lot-filtered-out') && cardHCM._cls.has('lot-filtered-out'));

  // apply(true) (nut Ap dung): cuon.
  scrollCount = 0;
  ctl.apply(true);
  check('apply(true) VAN cuon (nut Ap dung, v213)', scrollCount === 1, 'scroll=' + scrollCount);

  // Bo loc: tat ca hien lai, dong dem rong.
  currentProv = '';
  scrollCount = 0;
  ctl.apply(false);
  check('apply(false) khi bo loc: tat ca the hien lai',
    !cardHN._cls.has('lot-filtered-out') && !cardHCM._cls.has('lot-filtered-out'));
  check('apply(false) khi bo loc: dong dem rong', countEl.textContent === '');

  // Section CO noScroll (giong muc moi): apply() mac dinh KHONG cuon,
  // apply(true) (nut Ap dung) VAN cuon.
  const section2 = fakeEl();
  const card2 = fakeEl(); card2._prov = 'HN';
  const grid2 = fakeEl(); grid2.children = [card2];
  section2.querySelectorAll = (sel) => sel === '.lot-grid' ? [grid2] : [];
  byId['sec-new'] = section2;
  byId['sec-new-more'] = fakeEl();
  byId['sec-new-count'] = fakeEl();
  byId['sec-new-empty'] = fakeEl();
  const ctl2 = initSectionFilter({
    sectionId: 'sec-new', moreBtnId: 'sec-new-more',
    countId: 'sec-new-count', emptyId: 'sec-new-empty', label: 'muc moi',
    noScroll: true,
    readForm: () => ({ prov: currentProv }),
    matches: (card, f) => !f.prov || card._prov === f.prov
  });
  currentProv = 'HN';
  scrollCount = 0;
  ctl2.apply();
  check('muc moi (noScroll): apply() mac dinh KHONG cuon', scrollCount === 0, 'scroll=' + scrollCount);
  scrollCount = 0;
  ctl2.apply(true);
  check('muc moi (noScroll): apply(true) VAN cuon (nut Ap dung, v213)', scrollCount === 1, 'scroll=' + scrollCount);
  scrollCount = 0;
  ctl2.apply(false);
  check('muc moi (noScroll): apply(false) KHONG cuon (chuyen tab)', scrollCount === 0, 'scroll=' + scrollCount);
}

console.log('\n' + pass + ' PASS, ' + fail + ' FAIL');
process.exit(fail ? 1 : 0);
