/* v24 tests — Node only, no browser. Covers the v24 additions only:
   daily rotation of model order (day-of-year, inside each tier, so the
   photo-first rule and the views/comments sort never break) and 4 new
   selling shops (public info only). The v20/v22/v23 suites still run.
   The 6 idol/game streamer posts and the 2 new unconsented models from
   the same Facebook run are NOT on the web. */
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const v23root = path.resolve(root, '..', 'mclivestream-final-v23');
let pass = 0, fail = 0;
function t(name, cond, extra = '') { if (cond) { pass++; console.log('PASS v24:', name); } else { fail++; console.log('FAIL v24:', name, extra); } }
function loadData(dir) {
  const sb = { window: {}, module: { exports: {} }, console };
  vm.createContext(sb);
  vm.runInContext(fs.readFileSync(path.join(dir, 'js/data.js'), 'utf8'), sb);
  vm.runInContext(fs.readFileSync(path.join(dir, 'js/app.js'), 'utf8'), sb);
  return { D: sb.window.V20_DATA, V: sb.window.V20 };
}
const { D, V } = loadData(root);
const old = loadData(v23root);
const D23 = old.D;

// ---- Rotation: day-of-year ----
t('dayOfYear: 2026-11-05 is day 309, 2026-01-01 is day 1, 2026-12-31 is day 365',
  V.dayOfYear(new Date(2026, 10, 5)) === 309
  && V.dayOfYear(new Date(2026, 0, 1)) === 1
  && V.dayOfYear(new Date(2026, 11, 31)) === 365);
t('rotateWindow: same 8h window gives the same order (stable within a window, v64)',
  (() => {
    // 08:00/15:59 Saigon tuyet doi (window8h dem theo gio Saigon; suite chay duoi UTC)
    const a = V.rotateWindow(V.withPhotoFirst(D.models), V.photoTier, new Date(Date.UTC(2026, 10, 5, 1, 0)));
    const b = V.rotateWindow(V.withPhotoFirst(D.models), V.photoTier, new Date(Date.UTC(2026, 10, 5, 8, 59)));
    return a.map(m => m.id).join(',') === b.map(m => m.id).join(',');
  })());
t('rotateWindow: consecutive 8h windows give a different order inside the photo tiers (v64)',
  (() => {
    const a = V.rotateWindow(V.withPhotoFirst(D.models), V.photoTier, new Date(Date.UTC(2026, 10, 5, 1, 0)));
    const b = V.rotateWindow(V.withPhotoFirst(D.models), V.photoTier, new Date(Date.UTC(2026, 10, 5, 9, 0)));
    return a.map(m => m.id).join(',') !== b.map(m => m.id).join(',')
      && a.map(m => m.id).sort().join(',') === b.map(m => m.id).sort().join(',');
  })());
t('rotateWindow: does not mutate the input list (v64: rotateDaily la alias)',
  (() => {
    const before = V.withPhotoFirst(D.models).map(m => m.id).join(',');
    V.rotateDaily(V.withPhotoFirst(D.models), V.photoTier, new Date(2026, 10, 5));
    return V.withPhotoFirst(D.models).map(m => m.id).join(',') === before;
  })());
t('v25 replaces this v24 home check: homeTop8 first 8 all have a REAL photoUrl (not just photoHas)',
  (() => {
    const shown = V.homeTop8(D.models, new Date(2026, 10, 5));
    return shown.length === 8 && shown.every(m => m.photoUrl)
      && V.cardHTML(shown[7]).includes('<img src="images/th-');
  })());
t('rotateDaily: list-page order (views/comments/photo tiers) changes by day but keeps the same 20 profiles and the same tier order',
  (() => {
    const tier = m => m.views + '|' + m.comments + '|' + V.photoTier(m);
    const sorted = D.models.slice().sort((a, b) => (b.views - a.views) || (b.comments - a.comments) || ((b.photoUrl ? 1 : 0) - (a.photoUrl ? 1 : 0)));
    const a = V.rotateDaily(sorted, tier, new Date(2026, 10, 5));
    const b = V.rotateDaily(sorted, tier, new Date(2026, 10, 6));
    const tierOf = m => V.photoTier(m);
    const tiersOk = list => {
      const seen = list.map(tierOf);
      return seen.indexOf('b') === -1 || seen.lastIndexOf('a') < seen.indexOf('b');
    };
    return a.map(m => m.id).join(',') !== b.map(m => m.id).join(',')
      && a.map(m => m.id).sort().join(',') === D.models.map(m => m.id).sort().join(',')
      && tiersOk(a) && tiersOk(b)
      && a.slice(0, 6).length === 6; // first page still 6 per page
  })());
t('app.js: home uses homeTop8 (photoUrl-only, v25 rule), list page still rotates after sorting',
  (() => {
    const js = fs.readFileSync(path.join(root, 'js/app.js'), 'utf8');
    return js.includes('var shown=homeTop8(D.models);')
      // v74: sort + rotateWindow tach ra defaultModelOrder (initList + hub
      // dung chung ham nay — van xoay sau khi sap xep, khong doi hanh vi).
      && js.includes('list=defaultModelOrder(list);')
      && js.includes('function defaultModelOrder(list, date){')
      && js.includes("return rotateWindow(out, function(m){ return m.views+'|'+m.comments+'|'+photoTier(m); }, date);")
      && !/rotateDaily\([^)]*2026/.test(js); // no hardcoded date
  })());

// ---- 4 new shops ----
const NEW_SHOPS = [
  { name: 'Javata Affiliate Team', province: 'Hà Nội', district: 'Long Biên', date: '2026-11-05', src: 'https://www.facebook.com/groups/337105752372137/posts/969098779172828' },
  { name: 'Truong Phuc Anh', province: 'Hà Nội', district: 'Dương Nội', date: '2026-11-04', src: 'https://www.facebook.com/groups/337105752372137/posts/968270825922290' },
  { name: 'Thời Trang Nam Rustico', province: 'Hà Nội', district: 'Hà Đông', date: '2026-11-04', src: 'https://www.facebook.com/groups/1002938194724844/posts/1705818247770165' },
  { name: 'Công ty TNHH Giấy Mylan', province: 'TP. Hồ Chí Minh', district: 'Quận 12', date: '2026-11-04', src: 'https://www.facebook.com/groups/337105752372137/posts/968219079260798' },
];
t('30 shops total, all with a name and a Facebook post link, all links unique',
  D.shops.length === 30
  && D.shops.every(s => s.name && /^https:\/\/www\.facebook\.com\/groups\/[^/]+\/posts\/\d+$/.test(s.src))
  && new Set(D.shops.map(s => s.src)).size === 30,
  `${D.shops.length} shops`);
t('the 4 new shops are present with the exact original-post link, province, district and date',
  NEW_SHOPS.every(n => {
    const s = D.shops.find(x => x.name === n.name);
    return s && s.src === n.src && s.province === n.province && s.district === n.district && s.date === n.date && s.shopNameKnown === true;
  }));
t('new shops (v26): logo only for Mylan (contain); contacts only the audited public numbers (Mylan 0948972643, Rustico 0965765494, Truong Phuc Anh 0868553009, Javata 0865863929); no top-level phone/email fields',
  D.shops.filter(s => NEW_SHOPS.some(n => n.name === s.name))
    .every(s => !('fanpageUrl' in s) && !('logoUrl' in s) && !('phone' in s) && !('email' in s))
  && D.shops.find(s => s.name === 'Công ty TNHH Giấy Mylan').logo === 'images-shop/shop-mylan.png'
  && D.shops.find(s => s.name === 'Công ty TNHH Giấy Mylan').logoFit === 'contain'
  && NEW_SHOPS.slice(0, 3).every(n => D.shops.find(s => s.name === n.name).logo === '')
  && (() => {
    const nums = (JSON.stringify(D.shops.filter(s => NEW_SHOPS.some(n => n.name === s.name))).match(/(?<!\d)0[389]\d{8}(?!\d)/g) || []).sort();
    return JSON.stringify(nums) === JSON.stringify(['0865863929', '0868553009', '0948972643', '0965765494']);
  })());
t('new shop card HTML (v26): Mylan shows its real logo (contain), public Zalo link, contact note, source link, removal note, onerror fallback',
  (() => {
    const h = V.shopCardHTML(D.shops.find(s => s.name === 'Công ty TNHH Giấy Mylan'));
    return h.includes('Công ty TNHH Giấy Mylan') && h.includes('968219079260798')
      && h.includes('Bài tuyển gốc →') && h.includes('yêu cầu cập nhật hoặc gỡ tin')
      && h.includes('<img class="shop-logo shop-logo--contain" src="images-shop/shop-mylan.png"')
      && h.includes('zalo.me/0948972643') && h.includes('0948972643')
      && h.includes('Các bên chủ động liên hệ trao đổi, thông tin là công khai.')
      && h.includes('onerror="this.outerHTML') && h.includes('shop-initial');
  })());
t('home shops: 6 newest are Chạm Loa, Javata, 59K Entertainment, KOSS 5, Anh Mai (all 5 Nov), then Đỗ Sỹ Khải (4 Nov) — verified with the real sortShopsNewest',
  (() => {
    const six = V.sortShopsNewest(D.shops).slice(0, 6);
    return six.map(s => s.name).join('|') === 'Chạm Loa|Javata Affiliate Team|59K Entertainment|KOSS 5|Anh Mai|Đỗ Sỹ Khải'
      && six.map(s => s.date).join(',') === '2026-11-05,2026-11-05,2026-11-05,2026-11-05,2026-11-05,2026-11-04';
  })());
t('the 6 idol/game streamer posts were ADDED in v34 as sh-25..sh-30 (data name is "59K Entertainment", not "HR 59K Entertainment")',
  ['59K Entertainment', 'KOSS 5', 'Anh Mai', 'GAMETOK LIVE', 'Qingxiang Nexplay', 'YAOHAI'].every(n => D.shops.some(s => s.name === n))
  && D.shops.filter(s => ['sh-25', 'sh-26', 'sh-27', 'sh-28', 'sh-29', 'sh-30'].includes(s.id)).length === 6);
t('the 2 new unconsented models were NOT added to the web (still 20 models, same as v23)',
  D.models.length === 20
  && D.models.every((m, i) => m.name === D23.models[i].name && m.id === D23.models[i].id)
  && !D.models.some(m => /IntelligentBlueberry/i.test(m.name)));

// ---- Counts / pages / unchanged content ----
t('index.html: home shop link now says 30 shops',
  fs.readFileSync(path.join(root, 'index.html'), 'utf8').includes('Xem tất cả 30 shop'));
t('danh-sach-shop.html: header H1 van nguyen, khong con dong dem 30 shop (v62)',
  fs.readFileSync(path.join(root, 'danh-sach-shop.html'), 'utf8').includes('<h1>Tìm shop tuyển mẫu livestream</h1>') && !fs.readFileSync(path.join(root, 'danh-sach-shop.html'), 'utf8').includes('30 shop đang tuyển mẫu'));
t('articles: 25 now (v34 adds 3); the 22 v23 titles are all still present, unchanged',
  D.articles.length === 50 && D23.articles.every(a => D.articles.some(b => b.title === a.title && b.url === a.url)));
t('old 20 shops unchanged (same names and links as v23)',
  D23.shops.every(o => D.shops.some(s => s.name === o.name && s.src === o.src)));
console.log(`\n${pass} PASS, ${fail} FAIL`);
process.exit(fail ? 1 : 0);
