// test-v454-onboarding-polish.mjs — v454 / T-v423-polish (BA §2, kien truc D-V423-POLISH §3.6).
// 2 diem nho tu E2E v423 (03:21–03:26, PASS 7/7 buoc):
//  (1) Banner khoi phuc nhap VAN hien sau khi bam "Hoan tat" — goc: finish() chi ghi
//      doneKey, khong xoa draftKey; dieu kien hien banner (d || !done) luon dung.
//      Fix: finish() removeItem(draftKey) + dieu kien thanh d && !done.
//  (2) Nut "Dang xuat" bam xong khong doi giao dien ngay — goc: doSignOut() chi xoa
//      headerName/headerBalance, khong xoa headerNameUserId nen _settle (lookup ten
//      ho so, toi da 3s — TK moi khong co full_name trong metadata) van thay uid cu
//      va ve lai ten cu len header; chuoi sau signOut khong goi lai render header.
//      Fix: doSignOut() xoa ca headerNameUserId; apply(null) dua menu ve chua dang
//      nhap; auth-ui.js goi tuong minh V20HeaderRefresh() sau signOut + trong
//      listener SIGNED_OUT.
// Chay: node tests/test-v454-onboarding-polish.mjs  (tu thu muc goc repo)
// E2E trinh duyet that (1 TK moi: Hoan tat -> het banner; Dang xuat -> header doi
// ngay, khong hoi quy wizard/luu nhap/khoi phuc) chay sau khi deploy len live.
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let pass = 0, fail = 0;
function t(name, cond, extra = '') {
  if (cond) { pass++; console.log('PASS v454:', name); }
  else { fail++; console.log('FAIL v454:', name, extra); }
}

const obSrc = fs.readFileSync(path.join(root, 'js/onboarding.js'), 'utf8');
const authUi = fs.readFileSync(path.join(root, 'js/auth-ui.js'), 'utf8');
const appJs = fs.readFileSync(path.join(root, 'js/app.js'), 'utf8');
const sw = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');

// ---- A. Tinh — diem 1 (banner nhap sau Hoan tat) ----
t('finish() xoa draftKey sau khi ghi doneKey', obSrc.includes('removeItem(draftKey(userId))') && obSrc.indexOf('removeItem(draftKey(userId))') > obSrc.indexOf('setItem(doneKey(userId)'));
t('finish() van ghi doneKey step 4', /setItem\(doneKey\(userId\), JSON\.stringify\(\{ at: Date\.now\(\), step: 4/.test(obSrc));
t('finish() van goi syncPrefill + saveDraft (khong mat dong bo prefs)', /function finish\(\) \{[\s\S]{0,200}syncPrefill\(\);[\s\S]{0,80}saveDraft\(true\);/.test(obSrc));
t('dieu kien hien banner la d && !done', /if \(d && !done && resumeEl\)/.test(obSrc));
t('khong con dieu kien cu (d || !done) trong lenh if', !/if \([^)]*d \|\| !done/.test(obSrc));

// ---- B. Tinh — diem 2 (Dang xuat doi header ngay) ----
t('listener SIGNED_OUT goi tuong minh V20HeaderRefresh', /event === 'SIGNED_OUT'[\s\S]{0,400}V20HeaderRefresh/.test(authUi));
t('handler dang xuat goi V20HeaderRefresh sau notifySession(null)', /notifySession\(null\); \} catch \(e\) \{\}[\s\S]{0,600}V20HeaderRefresh/.test(authUi));
t('handler dang xuat van goi notifySession(null) truoc (khong mat chuoi cu)', /try \{ notifySession\(null\); \} catch \(e\) \{\}/.test(authUi));
t('doSignOut xoa ca headerNameUserId', /headerName = null; headerBalance = null; headerNameUserId = null;/.test(appJs));
t('khong con doSignOut cu thieu headerNameUserId', !/headerName = null; headerBalance = null;\n/.test(appJs));
t('apply(null) dua menu tai khoan ve chua dang nhap', appJs.includes("if (menuNameEl) menuNameEl.textContent = '';") && appJs.includes('menuPointsEl.hidden = true'));
t('apply(null) van ve nut header thanh Dang Nhap', /btn\.textContent = btn\._loginLabel;/.test(appJs));

// ---- C. CACHE ----
t("sw.js CACHE = v454-onboarding-polish-1 (co dau ;)", /const CACHE = 'v454-onboarding-polish-1';/.test(sw));
t('khong con CACHE v453', !/v453-ltdt-grid-6col-1/.test(sw));

// ---- D. Hanh vi (vm) — diem 1 ----
function makeSb() {
  const store = new Map();
  const localStorage = {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k),
  };
  const wizardEl = { hidden: true, querySelector: () => null };
  const resumeEl = { hidden: true, querySelector: () => ({ addEventListener() {} }) };
  const sb = {
    window: {
      localStorage,
      location: {},
      McLivestreamAPI: { getSession: () => Promise.resolve({ user: { id: 'u-test-1' } }) },
      console,
    },
    document: {
      getElementById: (id) => (id === 'onboardingWizard' ? wizardEl : id === 'onboardingResume' ? resumeEl : null),
    },
    location: { search: '' },
    console,
  };
  vm.createContext(sb);
  vm.runInContext(fs.readFileSync(path.join(root, 'js/onboarding-fields.js'), 'utf8'), sb);
  vm.runInContext(obSrc, sb);
  return { sb, store, localStorage, wizardEl, resumeEl, OB: sb.window.V2SOnboarding };
}
const tick = (ms = 20) => new Promise((r) => setTimeout(r, ms));

async function runBehavior() {
  // D1. Khong nhap, chua hoan tat -> khong banner.
  {
    const { OB, resumeEl } = makeSb();
    OB.initPage({});
    await tick();
    t('banner: khong nhap + chua hoan tat -> AN', resumeEl.hidden === true);
  }
  // D2. Co nhap, chua hoan tat -> hien banner (khong hoi quy khoi phuc nhap).
  {
    const { OB, resumeEl, localStorage } = makeSb();
    localStorage.setItem('v2s_onboarding_u-test-1', JSON.stringify({ step: 3, roles: ['A'], primary: 'A', answers: {}, goals: {} }));
    OB.initPage({});
    await tick();
    t('banner: co nhap + chua hoan tat -> HIEN', resumeEl.hidden === false);
  }
  // D3. Co nhap + DA hoan tat -> AN (diem sua chinh — code cu hien sai).
  {
    const { OB, resumeEl, localStorage } = makeSb();
    localStorage.setItem('v2s_onboarding_u-test-1', JSON.stringify({ step: 4, roles: ['A'], primary: 'A', answers: {}, goals: {} }));
    localStorage.setItem('v2s_onboarding_done_u-test-1', JSON.stringify({ at: Date.now(), step: 4, pct: 70 }));
    OB.initPage({});
    await tick();
    t('banner: co nhap CU + da hoan tat -> AN (lop phong thu d && !done)', resumeEl.hidden === true);
  }
  // D4. Khong nhap + da hoan tat -> AN.
  {
    const { OB, resumeEl, localStorage } = makeSb();
    localStorage.setItem('v2s_onboarding_done_u-test-1', JSON.stringify({ at: Date.now(), step: 4, pct: 70 }));
    OB.initPage({});
    await tick();
    t('banner: khong nhap + da hoan tat -> AN', resumeEl.hidden === true);
  }
  // D5. finish(): nhap bi xoa, doneKey ghi step 4, redirect ve trang-cua-toi.
  {
    const { OB, localStorage, sb } = makeSb();
    OB.initPage({ presetRole: 'A' });
    await tick();
    localStorage.setItem('v2s_onboarding_u-test-1', JSON.stringify({ step: 4, roles: ['A'], primary: 'A', answers: { display_name: 'Mẫu An' }, goals: {} }));
    OB.finish();
    t('finish(): nhap bi XOA khoi localStorage', localStorage.getItem('v2s_onboarding_u-test-1') === null);
    const done = JSON.parse(localStorage.getItem('v2s_onboarding_done_u-test-1') || 'null');
    t('finish(): doneKey ghi step 4', !!done && done.step === 4 && typeof done.at === 'number');
    t('finish(): chuyen ve trang-cua-toi.html', sb.window.location.href === 'trang-cua-toi.html');
  }
}

runBehavior().then(() => {
  console.log('---');
  console.log('v454: ' + pass + ' PASS, ' + fail + ' FAIL');
  process.exit(fail ? 1 : 0);
}).catch((e) => { console.log('FAIL v454: loi chay test', e); process.exit(1); });
