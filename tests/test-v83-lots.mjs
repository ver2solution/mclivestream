/* v83-lots tests — Node only, no browser. Covers lot-14 added by the daily
   lots cron (11:21) 07/11/2026, folded into the v83 prep (calculator build):
   (1) Si Shoes 1996 / Le Hoang Dong — Xa kho giay si 99K-199K, video YouTube
       24/10/2026 (title + description verified by the cron: Zalo 0925-624-642,
       Ninh Kieu, Can Tho; bao hanh keo va de 100 ngay; duoc thu/kiem hang
       truoc khi tra tien; mien phi ship). Group 1, cat giay-dep, priceNum 99000
       (lowest of the 99K-199K range, same convention as lot-03).
   (2) Lots total 14 (9 group 1 + 3 group 2 + 2 group 3); PR lotCount at
       06/11/2026 = 9 (all group-1 lots still within 60 days).
   (3) js/data.js sha256 rebased to the new hash (lots change only).
   CACHE is NOT pinned here: sw.js belongs to the v83 calculator build
   (CACHE v86-shell-1, pinned in tests/test-v83.mjs). */
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let pass = 0, fail = 0;
function t(name, cond, extra = '') { if (cond) { pass++; console.log('PASS v83-lots:', name); } else { fail++; console.log('FAIL v83-lots:', name, extra); } }
const sha = f => crypto.createHash('sha256').update(fs.readFileSync(path.join(root, f))).digest('hex');

const sb = { window: {}, module: { exports: {} }, console, URLSearchParams, document: { getElementById: () => null, addEventListener: () => {}, querySelectorAll: () => [] } };
vm.createContext(sb);
vm.runInContext(fs.readFileSync(path.join(root, 'js/data.js'), 'utf8'), sb);
vm.runInContext(fs.readFileSync(path.join(root, 'js/app.js'), 'utf8'), sb);
const D = sb.window.V20_DATA;
const V = sb.window.V20;

t('14 lots total (9/3/2)', D.lots.length === 14 && D.lots.filter(l => l.group === 1).length === 9 && D.lots.filter(l => l.group === 2).length === 3 && D.lots.filter(l => l.group === 3).length === 2,
  `got=${D.lots.length} g1=${D.lots.filter(l => l.group === 1).length}`);
const lot = D.lots.find(l => l.id === 'lot-14');
t('lot-14 exists', !!lot);
if (lot) {
  t('lot-14: title + date + group + cat', lot.title.includes('Xả kho giày si 99K–199K — Si Shoes 1996') && lot.date === '24/10/2026' && lot.group === 1 && lot.cat === 'giay-dep',
    `${lot.title} | ${lot.date} | g${lot.group} | ${lot.cat}`);
  t('lot-14: price range + priceNum (lowest)', lot.price === '99.000đ–199.000đ/đôi' && lot.priceNum === 99000, `${lot.price} / ${lot.priceNum}`);
  t('lot-14: qty null (video does not state qty)', lot.qty === null);
  t('lot-14: meta has warranty + inspection + ship + channel + Zalo + address',
    lot.meta.includes('Bảo hành keo và đế 100 ngày') && lot.meta.includes('Được thử/kiểm hàng trước khi trả tiền')
    && lot.meta.includes('Miễn phí ship') && lot.meta.includes('Kênh: YouTube') && lot.meta.includes('Zalo 0925-624-642') && lot.meta.includes('Ninh Kiều, Cần Thơ'),
    lot.meta);
  t('lot-14: source link + label + linkText', lot.url === 'https://www.youtube.com/watch?v=4byznxwITAU'
    && lot.label === 'Chưa xác thực — không phải lô chính hãng của thương hiệu' && lot.linkText === 'Xem bài đăng gốc →');
  t('lot-14: card renders with target=_blank rel=noopener', (() => { const h = V.lotCardHTML(lot); return h.includes('target="_blank"') && h.includes('rel="noopener"') && h.includes('href="https://www.youtube.com/watch?v=4byznxwITAU"') && h.includes('data-cat="giay-dep"'); })());
  t('lot-14: active at 06/11/2026 (24/10 = 13 days, within 60)', V.lotActive(lot, new Date(2026, 10, 6)) === true);
}
t('trustStats 06/11/2026: lotCount 9', V.trustStats(D.models, D.shops, D.lots, D.factories, new Date(2026, 10, 6)).lotCount === 9);
t('no duplicate lot titles/urls', new Set(D.lots.map(l => l.title)).size === 14 && new Set(D.lots.map(l => l.url)).size === 14);
t('no lot assigned to a big brand (v55 list)', (() => {
  const BIG = ['Cocoon', 'Cỏ Mềm Homelab', 'Sao Thái Dương', 'Thorakao', 'M.O.I Cosmetics', 'Lemonade', 'Emmié', 'OFÉLIA', 'Lagumi', 'Vedette', 'Coolmate', 'Canifa', 'IVY Moda', 'Yody', 'Juno', 'Vascara', 'SSStutter', 'Routine', 'Degrey', 'Couple TX'];
  return D.lots.every(l => !BIG.some(b => l.title.includes(b)));
})());
t('js/data.js sha256 (lots change only)', sha('js/data.js') === '76009b20bc339501db3ab2f6e96993e5a6c6f84d9d50e45a623cde6882d85fdf');

console.log(`\nTOTAL v83-lots: ${pass} PASS, ${fail} FAIL`);
if (fail) process.exitCode = 1;
