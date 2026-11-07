/* v83-factories tests — Node only, no browser. Covers fac-21..fac-40 added by
   the daily factories cron (11:41) 07/11/2026, folded into the v83 prep
   (calculator build + lot-14):
   (1) 20 new factories, all verified 07/11/2026 by opening each source article
       directly (no invented price/MOQ/address/phone): 11 from the verified
       backup list (Tripi/Mytour listicles 05/06/2025–02/07/2025 + 16/08/2024)
       + 9 fresh finds incl. 3 from Da Nang (new province) and Thinh Phat
       (top10vn, published 03/11/2026). MOQ only when the source states it
       (M&M 30, Xuong May Ha Noi 10); otherwise null = "Khong cong khai".
   (2) Factories total 40 (TP.HCM 16 / Ha Noi 11 / Da Nang 3 / Binh Duong 5 /
       Nam Dinh 3 / Hung Yen 1 / Dong Nai 1) = 7 provinces; no duplicate
       id/name/phone-vs-existing-web-units (checked against fac-01..fac-20).
   (3) js/data.js sha256 rebased to the new hash (lots + factories change).
   CACHE is NOT pinned here: sw.js belongs to the v83 calculator build
   (CACHE v86-shell-1, pinned in tests/test-v83.mjs). */
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let pass = 0, fail = 0;
function t(name, cond, extra = '') { if (cond) { pass++; console.log('PASS v83-factories:', name); } else { fail++; console.log('FAIL v83-factories:', name, extra); } }
const sha = f => crypto.createHash('sha256').update(fs.readFileSync(path.join(root, f))).digest('hex');

const sb = { window: {}, module: { exports: {} }, console, URLSearchParams, document: { getElementById: () => null, addEventListener: () => {}, querySelectorAll: () => [] } };
vm.createContext(sb);
vm.runInContext(fs.readFileSync(path.join(root, 'js/data.js'), 'utf8'), sb);
vm.runInContext(fs.readFileSync(path.join(root, 'js/app.js'), 'utf8'), sb);
const D = sb.window.V20_DATA;
const V = sb.window.V20;

const NEW_NAMES = ['Minh An', 'Xưởng may sỉ', 'M&M Clothing Studio', 'SGmay', 'D&Li', '7store', 'Thịnh Phát', 'Định Phát', 'Mr. Hoàng', 'Trendy', 'Lan Nguyễn', 'Xưởng May Hà Nội', 'An Phong', 'Lan Chi', 'VANDA', 'Đồng Phục Trần', 'Gilio', 'Cẩm Tú', 'Huỳnh Gia Minh', 'Alibu'];
const NEW = D.factories.filter(f => /^fac-(2[1-9]|3[0-9]|40)$/.test(f.id));

t('40 factories total', D.factories.length === 40, `got=${D.factories.length}`);
t('20 new factories fac-21..fac-40', NEW.length === 20, `got=${NEW.length}`);
t('20 new factory names all present', NEW_NAMES.every(n => D.factories.some(f => f.name.includes(n))));
t('7 provinces (TP.HCM 16 / Ha Noi 11 / Da Nang 3 / Binh Duong 5 / Nam Dinh 3 / Hung Yen 1 / Dong Nai 1)',
  (() => { const c = (p) => D.factories.filter(f => f.prov === p).length;
    return new Set(D.factories.map(f => f.prov)).size === 7 && c('TP.HCM') === 16 && c('Hà Nội') === 11 && c('Đà Nẵng') === 3 && c('Bình Dương') === 5 && c('Nam Định') === 3 && c('Hưng Yên') === 1 && c('Đồng Nai') === 1; })());
t('no duplicate factory id/name', new Set(D.factories.map(f => f.id)).size === 40 && new Set(D.factories.map(f => f.name)).size === 40);
t('new factories: full fields + public link + date DD/MM/YYYY + unverified label',
  NEW.every(f => ['id', 'name', 'items', 'meta', 'moq', 'cat', 'prov', 'date', 'dateLabel', 'label', 'url', 'linkText'].every(k => k in f)
    && f.url.startsWith('http') && /^\d{2}\/\d{2}\/\d{4}$/.test(f.date)
    && f.label === 'Chưa xác thực — thông tin tổng hợp từ bài đăng công khai'
    && f.linkText === 'Xem trang gốc →'));
t('new factories: MOQ only from source (M&M 30, Xuong May Ha Noi 10; other 18 null)',
  D.factories.some(f => f.name.includes('M&M') && f.moq === 30)
  && D.factories.some(f => f.name.includes('Xưởng May Hà Nội') && f.moq === 10)
  && NEW.filter(f => f.moq === null).length === 18);
t('new factories: meta has MOQ note + phone + domain (or fanpage when no website)',
  NEW.every(f => f.meta.includes('MOQ:') && /0\d[\d\s.]{7,}/.test(f.meta)));
t('new factories: cards render with target=_blank rel=noopener',
  NEW.every(f => { const h = V.factoryCardHTML(f); return h.includes('target="_blank"') && h.includes('rel="noopener"') && h.includes('href="' + f.url + '"'); }));
t('trustStats: factoryCount 40 / factoryProvinceCount 7',
  (() => { const st = V.trustStats(D.models, D.shops, D.lots, D.factories, new Date(2026, 10, 6)); return st.factoryCount === 40 && st.factoryProvinceCount === 7; })());
t('js/data.js sha256 (lots + factories change)', sha('js/data.js') === '76009b20bc339501db3ab2f6e96993e5a6c6f84d9d50e45a623cde6882d85fdf');

console.log(`\nTOTAL v83-factories: ${pass} PASS, ${fail} FAIL`);
if (fail) process.exitCode = 1;
