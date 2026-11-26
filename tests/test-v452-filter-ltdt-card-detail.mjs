// test-v452-filter-ltdt-card-detail.mjs — v452: dong bo form loc LDTD +
// the freelance gon theo form chung + modal chi tiet dung chung.
// Chay: node tests/test-v452-filter-ltdt-card-detail.mjs <duong-dan-js/data.js-live>
// Doc: stage lao-dong-tu-do.html / js/app.js / v20.css / sw.js (base origin/main 348d5a6),
// data.js live de lay 18 tin freelance that.
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const STAGE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const LIVE_DATA = process.argv[2] || '/tmp/ld2.js';
let pass = 0, fail = 0;
function t(name, cond, extra) {
  if (cond) { pass++; console.log('PASS ' + name); }
  else { fail++; console.log('FAIL ' + name + (extra ? ' — ' + extra : '')); }
}

const html = fs.readFileSync(path.join(STAGE, 'lao-dong-tu-do.html'), 'utf8');
const appJs = fs.readFileSync(path.join(STAGE, 'js/app.js'), 'utf8');
const css = fs.readFileSync(path.join(STAGE, 'v20.css'), 'utf8');
const sw = fs.readFileSync(path.join(STAGE, 'sw.js'), 'utf8');

// ---- 1. Form loc: label ngan 1 dong, khong con label dai ----
t('label Kinh nghiem (ngan)', html.includes('<label for="flExp">Kinh nghiệm</label>'));
t('khong con label Yeu cau kinh nghiem', !html.includes('Yêu cầu kinh nghiệm'));
t('label Luong toi thieu (ngan)', html.includes('<label for="flMinSalary">Lương tối thiểu</label>'));
t('khong con label Muc luong toi thieu (dong/thang)', !html.includes('Mức lương tối thiểu (đồng/tháng)'));
t('option sap xep Moi nhat (ngan)', html.includes('<option value="newest">Mới nhất</option>'));
t('option sap xep Cu nhat (ngan)', html.includes('<option value="oldest">Cũ nhất</option>'));
t('khong con option Moi nhat truoc (mac dinh)', !html.includes('Mới nhất trước (mặc định)'));
// ---- 2. Dong dem: het dam, theo form chung 13px muted ----
t('flCount het font-weight:800', !html.includes('id="flCount" style="margin:8px 2px 0;font-weight:800"'));
t('flCount van ton tai', html.includes('id="flCount"'));
// ---- 3. v451 con nguyen: nut ngoai card, tab switch 7 nut ----
t('filter-actions van con (v451)', html.includes('<div class="filter-actions">'));
t('tab switch van 7 nut', (html.match(/fl-tab-btn/g) || []).length === 7);
t('filter-card van cols-6 (v451)', html.includes('class="filter-card cols-6"'));

// ---- 4. CSS: the gon theo form chung ----
t('fl-card flex row', /\.fl-card\{display:flex;gap:12px;align-items:flex-start\}/.test(css));
t('o icon dai dien freelance 72px', css.includes('.card-compact-photo--freelance{flex:none;width:72px;aspect-ratio:1'));
t('fl-desc clamp 2 dong', /\.fl-desc\{display:-webkit-box;-webkit-line-clamp:2;/.test(css));
t('nut Xem chi tiet co style', css.includes('.fl-detail-link{'));
// ---- 5. sw.js CACHE bump ----
t('CACHE v452', sw.includes("const CACHE = 'v452-filter-ltdt-card-detail-1'"));
t('het CACHE v451', !sw.includes('v451-filter-ltdt-sync-1'));

// ---- 6. Chay app.js that trong vm + data live ----
const el = () => ({ style: {}, setAttribute() {}, appendChild() {}, classList: { add() {}, remove() {}, toggle() {} }, addEventListener() {}, querySelector: () => null, querySelectorAll: () => [] });
const sb = {
  window: {}, console, URLSearchParams, setTimeout, clearTimeout,
  document: { addEventListener() {}, getElementById: () => null, querySelector: () => null, querySelectorAll: () => [], createElement: el, body: { appendChild() {} } },
  localStorage: { getItem: () => null, setItem() {}, removeItem() {} },
  navigator: {}, location: { href: 'https://vieclamlivestream.online/lao-dong-tu-do.html', search: '', pathname: '/lao-dong-tu-do.html' },
};
vm.createContext(sb);
vm.runInContext(fs.readFileSync(LIVE_DATA, 'utf8'), sb); // nap data.js live -> window.V20_DATA
vm.runInContext(appJs, sb); // nap app.js stage
const W = sb.window;
t('app.js nap duoc, V20 ton tai', typeof W.V20 === 'object');
t('V20 xuat ham moi v452 (freelanceSalaryNum, freelanceCatIcon)', typeof W.V20.freelanceSalaryNum === 'function' && typeof W.V20.freelanceCatIcon === 'function');
const D = W.V20_DATA;
t('data live co 16 viec + 2 nguoi', Array.isArray(D.freelanceJobs) && D.freelanceJobs.length === 16 && D.freelancePeople.length === 2);

// ---- 7. freelanceSalaryNum: luong chuoi loc duoc (ham trong IIFE -> lay qua window.V20) ----
const num = W.V20.freelanceSalaryNum;
t('salaryNum "285.000đ/ca" = 285000', num({ salary: '285.000đ/ca' }) === 285000);
t('salaryNum "10.000.000–14.000.000" = 10000000', num({ salary: '10.000.000–14.000.000' }) === 10000000);
t('salaryNum so 7000000 giu nguyen', num({ salary: 7000000 }) === 7000000);
t('salaryNum rong = NaN', Number.isNaN(num({})));
const matches = W.V20.freelanceMatches;
const fl1 = D.freelanceJobs.find(j => j.id === 'fl-001');
t('loc luong: fl-001 (285k) qua min 200k', matches(fl1, { prov: '', exp: '', workType: '', minSalary: '200000' }) === true);
t('loc luong: fl-001 (285k) rot min 300k', matches(fl1, { prov: '', exp: '', workType: '', minSalary: '300000' }) === false);

// ---- 8. The gon: data-v2s-id + o icon + nut Xem chi tiet ----
const cardHTML = W.V20.freelanceCardHTML;
const c1 = cardHTML(fl1);
t('the co data-v2s-id fl-001', c1.includes('data-v2s-id="fl-001"'));
t('the co o icon card-compact-photo--freelance', c1.includes('card-compact-photo card-compact-photo--freelance'));
t('the co icon san-xuat 🏭', c1.includes('🏭'));
t('the co nut Xem chi tiet', c1.includes('class="fl-detail-link"') && c1.includes('Xem chi tiết →'));
t('the van hien du tieu de + luong + ngay', c1.includes('Đóng gói nước giải khát') && c1.includes('285.000đ/ca') && c1.includes('Đăng ngày 26/11/2026'));
const fp1 = D.freelancePeople.find(p => p.id === 'fp-001');
const cp = cardHTML(fp1);
t('the nguoi co icon 👤 + tag Tim viec', cp.includes('👤') && cp.includes('Tìm việc'));

// ---- 9. findDetailItem biet freelance, khong hong loai khac ----
const find = W.V20.findDetailItem;
t('find fl-001 -> kind freelance', (() => { const f = find('fl-001'); return f && f.kind === 'freelance' && f.item.id === 'fl-001'; })());
t('find fp-002 -> kind freelance', (() => { const f = find('fp-002'); return f && f.kind === 'freelance'; })());
t('find lot-331 van kind lot', (() => { const f = find('lot-331'); return f && f.kind === 'lot'; })());
t('find th-270 van kind model', (() => { const f = find('th-270'); return f && f.kind === 'model'; })());

// ---- 10. Modal chi tiet dung chung cho freelance ----
const modal = W.V20.lotFactoryKiotDetailHTML;
const withUrl = Object.assign({}, fl1, { url: 'https://www.facebook.com/groups/vieclambenluclongan2023/posts/926628370440213', source: 'Việc làm Bến Lức Long An' });
const m1 = modal('freelance', withUrl);
t('modal co fact Nhom nghe', m1.includes('<b>Nhóm nghề</b>'));
t('modal co fact Muc luong + Ngay dang', m1.includes('<b>Mức lương</b>') && m1.includes('<b>Ngày đăng</b>') && m1.includes('26/11/2026'));
t('modal co fact Nguon (ten nhom)', m1.includes('<b>Nguồn</b>') && m1.includes('Việc làm Bến Lức Long An'));
t('modal co mo ta day du', m1.includes('Đóng gói nước giải khát tại KCN Phú An Thạnh'));
t('modal co link nguon an sau cong (origin-gate)', m1.includes('origin-gate') && m1.includes('Xem bài gốc →') && m1.includes('926628370440213'));
t('modal co lien he (cong lien he)', m1.includes('Liên hệ qua Cổng liên hệ sau khi đăng nhập'));
t('modal KHONG co nut sao (chua co enum sao freelance)', !m1.includes('starButton') && !m1.includes('★'));
t('modal mien tru KHONG nhac ghim sao', !m1.includes('ấn sao ★'));
const m0 = modal('freelance', fl1); // chua co url (du lieu live hien tai)
t('modal khong url thi khong hien link nguon', !m0.includes('Xem bài gốc'));
t('modal van co day du facts khi khong url', m0.includes('<b>Nhóm nghề</b>') && m0.includes('285.000đ/ca'));
// ---- 11. Hoi quy: modal lot van dung nhu cu ----
const lot331 = D.lots.find(x => x.id === 'lot-331');
const ml = modal('lot', lot331);
t('modal lot van co facts + khong lan freelance', ml.includes('<b>Địa điểm</b>') && !ml.includes('Nhóm nghề'));

console.log(`\n${pass} PASS, ${fail} FAIL`);
process.exit(fail ? 1 : 0);
