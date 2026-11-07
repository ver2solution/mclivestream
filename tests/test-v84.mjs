// test-v84.mjs — v84: hang 4 o Tin moi trang chu TU DAY bai moi them vao web.
// Nguyen nhan (user bao 07/11): them bai bao moi nhung hang 4 o trang chu
// khong doi — vi hang kin 4 bai ghim (11st pinOrder 1, viec-lam, tuyen-mau,
// bop-reach) nen vong lap khong chay, va vong lap xep theo date bai GOC
// (bai moi them ve su kien cu van chìm). User chi ghim tay 1 bai bop-reach.
// (A) data.js: chi con 1 bai pinned (bop-reach); 11st/tuyen-mau/viec-lam
//     da go ghim (11st khong con pinOrder).
// (B) getPinnedRow (js/app.js, 1 dong doi): bai ghim len truoc; 3 o con lai
//     lap bang bai MOI THEM VAO WEB gan nhat theo thu tu them vao (bai them
//     sau nam CUOI mang articles -> dao nguoc mang), KHONG theo date bai goc.
// (C) Mock: bai moi them du date cu hon van len truoc; bai ghim pinOrder van
//     len truoc bai moi them.
// (D) sw.js CACHE = v86-shell-1 + hash khoa file da doi.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let pass = 0, fail = 0;
function t(name, ok, extra = '') { if (ok) { pass++; console.log('PASS v84:', name); } else { fail++; console.log('FAIL v84:', name, extra); } }
const sha = (p) => crypto.createHash('sha256').update(fs.readFileSync(path.join(root, p))).digest('hex');

const sb = { window: {}, module: { exports: {} }, console, document: { querySelectorAll: () => [], getElementById: () => null, addEventListener: () => {} }, location: { search: '' } };
vm.createContext(sb);
vm.runInContext(fs.readFileSync(path.join(root, 'js/data.js'), 'utf8'), sb);
vm.runInContext(fs.readFileSync(path.join(root, 'js/app.js'), 'utf8'), sb);
const V = sb.window.V20;
const D = sb.window.V20_DATA;
const appJs = fs.readFileSync(path.join(root, 'js/app.js'), 'utf8');
const sw = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');
const indexHtml = fs.readFileSync(path.join(root, 'index.html'), 'utf8');

// ---- (A) Chi con 1 bai ghim ----
t('Chi co 1 bai ghim: bop-reach (user ghim tay)',
  D.articles.filter(a => a.pinned).length === 1
  && D.articles.find(a => a.pinned).url === 'bai-viet-bop-reach.html');
const a11 = D.articles.find(a => a.page === 'bai-viet/san-11st-mc-ai-live-sale-11-11.html');
const tuyen = D.articles.find(a => a.page === 'bai-viet/tuyen-mau-livestream.html');
const viec = D.articles.find(a => a.page === 'bai-viet/viec-lam-mau-livestream.html');
t('11st: pinned:false, khong con pinOrder', !!a11 && a11.pinned === false && a11.pinOrder === undefined);
t('tuyen-mau + viec-lam: pinned:false', !!tuyen && tuyen.pinned === false && !!viec && viec.pinned === false);
t('Tong 50 bai khong doi', D.articles.length === 50);

// ---- (B) Hang ghim that: bop + 3 bai moi them gan nhat (v82) ----
const row = V.getPinnedRow(D.articles);
t('Hang ghim co du 4 o', row.length === 4);
t('O 1 la bai ghim duy nhat bop-reach', row[0].url === 'bai-viet-bop-reach.html' && row[0].pinned === true);
t('O 2-4 la 3 bai moi them gan nhat theo thu tu them vao (v82)',
  row[1].page === 'bai-viet/hang-viet-ke-chuyen-dac-san-ban-chay-tiktok.html'
  && row[2].page === 'bai-viet/cho-40-tieu-thuong-hoc-livestream-tiktok.html'
  && row[3].page === 'bai-viet/shopee-live-video-tet-2026-16-ty-luot-xem.html');
t('3 o sau deu KHONG phai bai ghim', row.slice(1).every(a => a.pinned === false));
t('Bai moi them co date cu (Gia Nai Luong 23/10) KHONG chen vao hang — moi hon moi len, khong phai date moi hon moi len',
  !row.some(a => a.page === 'bai-viet/gia-nai-luong-livestream-570-trieu-ndt-13-tieng.html')
  && D.articles.indexOf(D.articles.find(a => a.page === 'bai-viet/gia-nai-luong-livestream-570-trieu-ndt-13-tieng.html'))
    < D.articles.indexOf(D.articles.find(a => a.page === 'bai-viet/shopee-live-video-tet-2026-16-ty-luot-xem.html')));
t('Khong bai nao lap lai trong hang', new Set(row.map(a => a.title)).size === 4);
const rowHtml = row.map((a, i) => V.pinCardHTML(a, i + 1)).join('');
t('Hang render du 4 khung pin-card, link dung trang bai',
  rowHtml.includes('href="bai-viet-bop-reach.html"')
  && rowHtml.includes('href="bai-viet/hang-viet-ke-chuyen-dac-san-ban-chay-tiktok.html"')
  && rowHtml.includes('href="bai-viet/cho-40-tieu-thuong-hoc-livestream-tiktok.html"')
  && rowHtml.includes('href="bai-viet/shopee-live-video-tet-2026-16-ty-luot-xem.html"'));
t('index.html van co #homePinned + #homeNews',
  indexHtml.includes('id="homePinned"') && indexHtml.includes('id="homeNews"'));

// ---- (C) Mock: thu tu them vao thang date bai goc ----
t('Mock: bai them sau (date cu hon) van len truoc bai them truoc (date moi hon)',
  (() => {
    const mk = (title, date) => ({ title, date });
    const r = V.getPinnedRow([mk('Cu', '2026-11-06'), mk('Moi', '2026-10-23')]);
    return r.map(a => a.title).join(',') === 'Moi,Cu';
  })());
t('Mock: bai ghim pinOrder van len truoc bai moi them',
  (() => {
    const mk = (title, date, pinned, pinOrder) => ({ title, date, pinned, pinOrder });
    const r = V.getPinnedRow([
      mk('Moi1', '2026-11-07', false, undefined),
      mk('Ghim', '2026-10-01', true, 1),
      mk('Moi2', '2026-11-06', false, undefined),
    ]);
    return r.map(a => a.title).join(',') === 'Ghim,Moi2,Moi1';
  })());
t('Mock: khong co bai ghim -> hang toan bai moi them gan nhat (dao nguoc thu tu them)',
  (() => {
    const mk = (title, date) => ({ title, date });
    const r = V.getPinnedRow([mk('A', '2026-11-06'), mk('B', '2026-10-01'), mk('C', '2026-11-01')]);
    return r.map(a => a.title).join(',') === 'C,B,A';
  })());
t('Code: getPinnedRow lap bang dao nguoc mang (thu tu them vao), khong dung sortByDateDesc nua',
  appJs.includes('var newest = (list||[]).slice().reverse();'));
t('sortByDateDesc van ton tai (dung cho #homeNews + tin-tuc, khong xoa)',
  typeof V.sortByDateDesc === 'function');

// ---- (D) CACHE + hash khoa file da doi (v84) ----
t("sw.js CACHE = 'v86-shell-1'", sw.includes("const CACHE = 'v86-shell-1'"));
t('js/data.js giong het v84 (chi 1 bai ghim bop-reach) (sha256)', sha('js/data.js') === '76009b20bc339501db3ab2f6e96993e5a6c6f84d9d50e45a623cde6882d85fdf');
t('js/app.js giong het v84 (getPinnedRow dao nguoc mang) (sha256)', sha('js/app.js') === 'ae11dfaf0e5383a7d2d2f1d8c33de31090f1a5fd39e0251edb0f8b69d4590a20');
t('sw.js giong het v84 (CACHE v86-shell-1) (sha256)', sha('sw.js') === 'f8ee524a81f0c741d07806d784d6aa113e1341495ff73653b7e05124d2cc4253');

console.log(`v84: ${pass} PASS, ${fail} FAIL`);
process.exit(fail ? 1 : 0);
