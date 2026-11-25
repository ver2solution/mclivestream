/* v423 tests — Node only, no browser. Phase 1 V2.0 Dynamic Onboarding
   (ban hop nhat V2.0 §4 + thiet ke Phase 1 v1 §11, 24/11/2026):
   (1) Cau hinh: 9 vai tro A–I; 19 muc tieu; 17 nhu cau ca nhan + 16 nhu cau
       shop; 16 nganh; 35 tinh/thanh (34 + 'Toan quoc / Live online') khop
       dung danh sach tren dang-ky.html; moi truong cau hoi co key/label/
       type/privacy hop le; bo G/H/I toi thieu co du; D dung chung bo Shop.
   (2) Rieng tu: khong truong nao ten nhay cam (password/token/cccd...);
       truong thu nhap/lien he/ngoai hinh mac dinh private.
   (3) Logic thuan: validateStep buoc 2/3; computeCompletion tinh tu du
       lieu that (Talent day du = 90% vi xac thuc = 0 o dot 1); mergeDraft
       gop khong mat du lieu va loai bo khoa mat khau; stripSensitive;
       funnelEventName; defaultDest fallback khi khong co location.
   (4) Tinh: dang-ky.html giu nguyen form dang ky cu (du 9 o + panel kich
       hoat + V2SAuthUI.initAuthUI) va them wizard (#onboardingWizard,
       #onboardingResume, 2 script moi, onSignupSession, initPage);
       js/auth-ui.js co diem noi onSignupSession truoc redirect va giu
       redirect cu; sw.js CACHE = v423; v20.css co khoi .ob-*.
   E2E trinh duyet that (dang ky moi 3 vai tro A/C/E + luu nhap + tiep tuc
   + bo qua truong tuy chon) chay sau khi deploy len live — khong co moi
   truong TEST (Q-N231). */
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let pass = 0, fail = 0;
function t(name, cond, extra = '') { if (cond) { pass++; console.log('PASS v423:', name); } else { fail++; console.log('FAIL v423:', name, extra); } }

const sb = { window: {}, console };
vm.createContext(sb);
vm.runInContext(fs.readFileSync(path.join(root, 'js/onboarding-fields.js'), 'utf8'), sb);
vm.runInContext(fs.readFileSync(path.join(root, 'js/onboarding.js'), 'utf8'), sb);
const CF = sb.window.V2SOnboardingFields;
const OB = sb.window.V2SOnboarding;

// ---- (1) cau hinh ----
t('9 vai tro A–I, moi vai tro co label + mo ta', CF.ROLES.length === 9 && CF.ROLES.map(r => r.key).join('') === 'ABCDEFGHI' && CF.ROLES.every(r => r.label && r.desc));
t('19 muc tieu su dung', CF.GOALS.length === 19 && new Set(CF.GOALS.map(g => g.key)).size === 19);
t('17 nhu cau ca nhan + 16 nhu cau shop', CF.NEEDS_PERSONAL.length === 17 && CF.NEEDS_SHOP.length === 16);
t('16 nganh hang dung chung Talent/Shop', CF.INDUSTRIES.length === 16);
t('35 tinh/thanh (34 + Toan quoc / Live online)', CF.PROVINCES.length === 35 && CF.PROVINCES.includes('Toàn quốc / Live online'));
const dkHtml = fs.readFileSync(path.join(root, 'dang-ky.html'), 'utf8');
const workLocSelect = dkHtml.match(/<select id="authSuWorkLocation">([\s\S]*?)<\/select>/);
const provInHtml = workLocSelect ? (workLocSelect[1].match(/<option[^>]*>([^<]*)<\/option>/g) || []).map(s => s.replace(/<[^>]+>/g, '').trim()).filter(Boolean) : [];
t('danh sach tinh trong cau hinh khop dung o Noi tim viec tren dang-ky.html', provInHtml.length === CF.PROVINCES.length + 1 /* + 'Chọn tỉnh / thành phố' */ && CF.PROVINCES.every(p => provInHtml.includes(p)), 'html=' + provInHtml.length + ' config=' + CF.PROVINCES.length);
const ALLOWED_TYPES = ['text', 'number', 'select', 'multi', 'range', 'boolean', 'textarea', 'url'];
const ALLOWED_PRIVACY = ['public', 'logged_in', 'partners', 'private'];
let fieldCount = 0, fieldErrors = [];
Object.keys(CF.QUESTIONS).forEach(function (rk) {
  const qs = CF.QUESTIONS[rk];
  if (typeof qs === 'string') return; /* D -> 'C' */
  qs.forEach(function (sec) {
    (sec.fields || []).forEach(function (fd) {
      fieldCount++;
      if (!fd.key || !fd.label || !ALLOWED_TYPES.includes(fd.type)) fieldErrors.push(rk + ':' + fd.key + ':type');
      if (!ALLOWED_PRIVACY.includes(fd.privacy)) fieldErrors.push(rk + ':' + fd.key + ':privacy');
      if ((fd.type === 'select' || fd.type === 'multi') && !(fd.options && fd.options.length)) fieldErrors.push(rk + ':' + fd.key + ':options');
    });
  });
});
t('moi truong cau hoi hop le (key/label/type/privacy/options)', fieldCount > 60 && fieldErrors.length === 0, fieldErrors.slice(0, 5).join('; '));
t('bo cau hoi G/H/I toi thieu co du', ['G', 'H', 'I'].every(rk => Array.isArray(CF.QUESTIONS[rk]) && CF.QUESTIONS[rk].length > 0 && CF.QUESTIONS[rk][0].fields.length >= 3));
t('D dung chung bo cau hoi Shop (C)', CF.QUESTIONS.D === 'C' && OB.getQuestionsForRole('D').length === OB.getQuestionsForRole('C').length && OB.getQuestionsForRole('D').length > 0);
t('9 hinh thuc hop tac Creator + 16 vi tri tuyen Shop', CF.COLLAB_TYPES.length === 9 && CF.HIRE_POSITIONS.length === 16);

// ---- (2) rieng tu ----
const SENSITIVE = /pass|password|token|secret|cccd|cmnd|otp/i;
let sensitiveKeys = [];
Object.keys(CF.QUESTIONS).forEach(function (rk) {
  const qs = CF.QUESTIONS[rk];
  if (typeof qs === 'string') return;
  qs.forEach(function (sec) { (sec.fields || []).forEach(function (fd) { if (SENSITIVE.test(fd.key)) sensitiveKeys.push(fd.key); }); });
});
t('khong truong cau hoi nao ten nhay cam', sensitiveKeys.length === 0, sensitiveKeys.join(','));
const INCOME_KEYS = ['pay_hour', 'pay_session', 'pay_month', 'booking_fee', 'commission_pct', 'income_visibility', 'expected_fee', 'expected_commission', 'hire_budget', 'learn_budget', 'ref_price', 'desired_salary'];
let incomePrivacyBad = [];
Object.keys(CF.QUESTIONS).forEach(function (rk) {
  const qs = CF.QUESTIONS[rk];
  if (typeof qs === 'string') return;
  qs.forEach(function (sec) { (sec.fields || []).forEach(function (fd) { if (INCOME_KEYS.includes(fd.key) && fd.privacy !== 'private') incomePrivacyBad.push(fd.key); }); });
});
t('truong thu nhap/chi phi mac dinh private', incomePrivacyBad.length === 0, incomePrivacyBad.join(','));
t('truong ngoai hinh mac dinh private', OB.getQuestionsForRole('A').find(s => s.section.indexOf('ngoại hình') !== -1).fields.every(fd => fd.privacy === 'private'));

// ---- (3) logic thuan ----
t('validateStep buoc 2: chua chon vai tro thi loi', OB.validateStep({ step: 2, roles: [], primary: null }).length >= 1);
t('validateStep buoc 2: 1 vai tro + 1 vai tro chinh thi dat', OB.validateStep({ step: 2, roles: ['A'], primary: 'A' }).length === 0);
t('validateStep buoc 2: vai tro chinh ngoai danh sach thi loi', OB.validateStep({ step: 2, roles: ['A'], primary: 'B' }).length >= 1);
const stA = { step: 3, roles: ['A'], primary: 'A', answers: {} };
const errsA = OB.validateStep(stA);
t('validateStep buoc 3: thieu truong bat buoc cua A thi loi', errsA.some(e => e.indexOf('display_name') !== -1) && errsA.some(e => e.indexOf('industries') !== -1) && errsA.some(e => e.indexOf('top_industry') !== -1), errsA.join('; '));
stA.answers = { display_name: 'Mẫu An', industries: ['Thời trang nữ'], top_industry: 'Thời trang nữ' };
t('validateStep buoc 3: du truong bat buoc thi dat', OB.validateStep(stA).length === 0);
const fullTalent = { step: 4, roles: ['A'], primary: 'A', answers: { display_name: 'Mẫu An', industries: ['Thời trang nữ'], top_industry: 'Thời trang nữ', skills: ['Giao tiếp', 'Chốt đơn'], years_experience: 2, platforms: ['TikTok Shop'], demo_video: 'https://x/y', work_form: ['Full-time'] }, goals: { job_fulltime: true } };
const comp = OB.computeCompletion(fullTalent);
t('computeCompletion: Talent day du = 90% (xac thuc 0 o dot 1)', comp.pct === 90 && comp.breakdown.verification.got === 0, 'pct=' + comp.pct);
t('computeCompletion: trang thai trong = 0%', OB.computeCompletion({ step: 4, roles: ['A'], primary: 'A', answers: {}, goals: {} }).pct === 0);
const merged = OB.mergeDraft({ step: 2, roles: ['A'], answers: { display_name: 'Mẫu An' }, goals: { job_fulltime: true } }, { step: 3, answers: { industries: ['Mỹ phẩm'] }, goals: { income_up: true }, password: 'khong-duoc-luu' });
t('mergeDraft: gop answers/goals, giu du lieu cu, loai mat khau', merged.answers.display_name === 'Mẫu An' && merged.answers.industries[0] === 'Mỹ phẩm' && merged.goals.job_fulltime && merged.goals.income_up && !('password' in merged));
t('stripSensitive: loai password/token/cccd, giu truong thuong', (function () { const s = OB.stripSensitive({ display_name: 'An', password: 'x', auth_token: 'y', cccd: 'z', industries: ['A'] }); return !('password' in s) && !('auth_token' in s) && !('cccd' in s) && s.display_name === 'An'; })());
t('funnelEventName: map dung cac buoc', OB.funnelEventName(1) === 'signup_step_1_done' && OB.funnelEventName(2) === 'signup_step_2_done' && OB.funnelEventName(3) === 'signup_step_3_done' && OB.funnelEventName(4) === 'signup_complete' && OB.funnelEventName(2, 'draft') === 'signup_draft_saved' && OB.funnelEventName(2, 'resumed') === 'signup_resumed' && OB.funnelEventName(2, 'abandoned') === 'signup_abandoned' && OB.funnelEventName(9, 'start') === 'signup_start');
t('defaultDest: khong co location thi ve trang-cua-toi.html', OB.defaultDest(null) === 'trang-cua-toi.html');
t('draftKey/doneKey theo userId', OB.draftKey('u1') === 'v2s_onboarding_u1' && OB.doneKey('u1') === 'v2s_onboarding_done_u1');

// ---- (4) tinh ----
t('dang-ky.html giu nguyen form dang ky cu (du 9 o)', ['authSuEmail', 'authSuPhone', 'authSuPass', 'authSuPass2', 'authSuWorkLocation', 'authSuDesiredField', 'authSuPriorityField', 'authSuMarketing'].every(id => dkHtml.includes('id="' + id + '"')) && dkHtml.includes('id="activationPanel"') && dkHtml.includes('V2SAuthUI.initAuthUI'));
t('dang-ky.html co wizard + resume + 2 script moi', dkHtml.includes('id="onboardingWizard"') && dkHtml.includes('id="onboardingResume"') && dkHtml.includes('js/onboarding-fields.js') && dkHtml.includes('js/onboarding.js') && dkHtml.includes('onSignupSession') && dkHtml.includes('V2SOnboarding.initPage'));
const authUi = fs.readFileSync(path.join(root, 'js/auth-ui.js'), 'utf8');
t('auth-ui.js co diem noi onSignupSession truoc redirect va giu redirect cu', authUi.includes('cfg.onSignupSession') && authUi.includes('location.href = dest'));
const sw = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');
t('sw.js CACHE = v423-onboarding-phase1-1', sw.includes("const CACHE = 'v423-onboarding-phase1-1'"));
const css = fs.readFileSync(path.join(root, 'v20.css'), 'utf8');
t('v20.css co khoi .ob-* (wizard, role card, chip, thanh hoan thien)', ['.ob-wizard', '.ob-role-card', '.ob-chip', '.ob-complete-bar', '.ob-progress'].every(c => css.includes(c)));

console.log('---');
console.log('v423: ' + pass + ' PASS, ' + fail + ' FAIL');
process.exit(fail ? 1 : 0);
