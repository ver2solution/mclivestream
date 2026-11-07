/* v25 tests — Node only, no browser. Covers the v25 additions only:
   (1) home top 8 contains ONLY profiles with a real photo (photoUrl), per the
   user rule settled 2026-11-05 13:17; rotation is once a day (day-of-year,
   stable within a day) inside the with-photo group; profiles without a real
   photo never reach the home top 8 but still show on the list page.
   (2) 11 new real photos (18/20 now): th-11/th-18 from the model's own public
   post, th-01/th-03/th-05/th-07/th-12/th-13/th-15/th-17/th-19 from the model's
   public Facebook profile picture (user-approved 2026-11-05 13:17: public
   profile picture only, no login, no private photo). th-19's post photo is
   only its live setup (no person), so the profile picture is used instead.
   th-04/th-10 still have no retrievable public photo.
   The v20/v22/v23/v24 suites still run. */
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const v24root = path.resolve(root, '..', 'mclivestream-final-v24');
let pass = 0, fail = 0;
function t(name, cond, extra = '') { if (cond) { pass++; console.log('PASS v25:', name); } else { fail++; console.log('FAIL v25:', name, extra); } }
function loadData(dir) {
  const sb = { window: {}, module: { exports: {} }, console };
  vm.createContext(sb);
  vm.runInContext(fs.readFileSync(path.join(dir, 'js/data.js'), 'utf8'), sb);
  vm.runInContext(fs.readFileSync(path.join(dir, 'js/app.js'), 'utf8'), sb);
  return { D: sb.window.V20_DATA, V: sb.window.V20, PH: sb.window.V20_PHOTOS };
}
const { D, V, PH } = loadData(root);
const old = loadData(v24root);
const D24 = old.D;

const DAYS = [5, 6, 7, 8, 9, 10].map(d => new Date(2026, 10, d));
const top8 = d => V.homeTop8(D.models, d);

// ---- Rule 1: home top 8 = only real photos, every day ----
t('homeTop8 exists and home uses it (app.js no longer builds home from rotateDaily+withPhotoFirst)',
  typeof V.homeTop8 === 'function'
  && fs.readFileSync(path.join(root, 'js/app.js'), 'utf8').includes('var shown=homeTop8(D.models);')
  && !fs.readFileSync(path.join(root, 'js/app.js'), 'utf8').includes('rotateDaily(withPhotoFirst(D.models), photoTier)'));
t('home top 8 is exactly 8 profiles on today + the next 5 days',
  DAYS.every(d => top8(d).length === 8), DAYS.map(d => top8(d).length).join(','));
t('every home top-8 profile has a real photoUrl on all 6 days',
  DAYS.every(d => top8(d).every(m => !!m.photoUrl)));
t('every home top-8 card renders a real <img> (no placeholder glyph) on all 6 days',
  DAYS.every(d => top8(d).every(m => {
    const h = V.cardHTML(m);
    return h.includes('<img src="images/th-') && !h.includes('ph-holder');
  })));
t('th-04 and th-10 (no real photo) never enter the home top 8 on any of the 6 days',
  DAYS.every(d => top8(d).every(m => m.id !== 'th-04' && m.id !== 'th-10')));
t('home top 8 only ever contains the 18 profiles with a real photo',
  DAYS.every(d => top8(d).every(m => D.models.find(x => x.id === m.id).photoUrl)));

// ---- Rule 2: rotate 3 times a day (8h windows, v64) ----
t('homeTop8: same 8h window (08:00 vs 15:59 Saigon) gives the same order (v64)',
  (() => {
    // window8h() dem theo gio Saigon (+7h tren epoch) nen ngay gio test phai
    // la 08:00/15:59 Saigon tuyet doi (Date.UTC), khong phu thuoc TZ cua shell
    // (suite chay duoi UTC o day; new Date(2026,10,5,8,0) duoi UTC la 15:00
    // Saigon — roi sang cua so khac).
    const a = top8(new Date(Date.UTC(2026, 10, 5, 1, 0))).map(m => m.id).join(',');
    const b = top8(new Date(Date.UTC(2026, 10, 5, 8, 59))).map(m => m.id).join(',');
    return a === b;
  })());
t('homeTop8: order changes across 8h windows (6 distinct orders in 6 windows, v64)',
  (() => {
    const orders = DAYS.map(d => top8(d).map(m => m.id).join(','));
    return new Set(orders).size === 6
      && orders.every(o => o.split(',').length === 8);
  })(), DAYS.map(d => top8(d).map(m => m.id).join(',')).join(' | '));
t('homeTop8: does not mutate the models list',
  (() => {
    const before = D.models.map(m => m.id).join(',');
    top8(new Date(2026, 10, 5));
    return D.models.map(m => m.id).join(',') === before;
  })());

// ---- 11 new photos: files, labels, sources ----
const NEW_PHOTOS = {
  'th-11': 'post', 'th-18': 'post',
  'th-01': 'profile', 'th-03': 'profile', 'th-05': 'profile', 'th-07': 'profile',
  'th-12': 'profile', 'th-13': 'profile', 'th-15': 'profile', 'th-17': 'profile', 'th-19': 'profile',
};
t('18/20 models now have a real photo (was 7/20 in v24)',
  D.models.filter(m => m.photoUrl).length === 18
  && D24.models.filter(m => m.photoUrl).length === 7);
t('all 11 new photos point at images/th-XX.jpg and the files exist and are real JPEGs',
  Object.keys(NEW_PHOTOS).every(id => {
    const m = D.models.find(x => x.id === id);
    if (!m || m.photoUrl !== 'images/' + id + '.jpg') return false;
    const p = path.join(root, m.photoUrl);
    if (!fs.existsSync(p)) return false;
    const buf = fs.readFileSync(p);
    return buf.length > 10000 && buf[0] === 0xFF && buf[1] === 0xD8 && buf[2] === 0xFF;
  }));
t('every photoUrl in data.js has an existing file (all 18)',
  D.models.filter(m => m.photoUrl).every(m => fs.existsSync(path.join(root, m.photoUrl))));
t('V20_PHOTOS map has exactly the 18 real photos and matches photoUrl',
  Object.keys(PH).length === 18
  && D.models.filter(m => m.photoUrl).every(m => PH[m.id] === m.photoUrl));
t('photoSrc is recorded for every model: post/profile/null, matching the 11 new photos',
  Object.entries(NEW_PHOTOS).every(([id, src]) => D.models.find(x => x.id === id).photoSrc === src)
  && D.models.find(x => x.id === 'th-04').photoSrc === null
  && D.models.find(x => x.id === 'th-10').photoSrc === null
  && D.models.filter(m => m.photoUrl).every(m => m.photoSrc === 'post' || m.photoSrc === 'profile'));
t('photo label is honest: profile pictures say "Ảnh đại diện công khai", post photos say "Ảnh thật từ bài gốc"',
  (() => {
    const prof = V.cardHTML(D.models.find(m => m.id === 'th-01'));
    const post = V.cardHTML(D.models.find(m => m.id === 'th-11'));
    return prof.includes('Ảnh đại diện công khai') && !prof.includes('Ảnh thật từ bài gốc')
      && post.includes('Ảnh thật từ bài gốc') && !post.includes('Ảnh đại diện công khai');
  })());
t('th-04 and th-10 still have no photo (photoUrl null, placeholder card, still on the list page)',
  ['th-04', 'th-10'].every(id => {
    const m = D.models.find(x => x.id === id);
    return m.photoUrl === null && V.cardHTML(m).includes('ph-holder');
  }));

// ---- List page still complete; nothing else changed ----
t('list page still has all 20 profiles (th-04/th-10 included, with placeholder)',
  D.models.length === 20
  && D.models.map(m => V.cardHTML(m)).join('').match(/<article class="card"/g).length === 20);
t('models unchanged except photos: same 20 ids/names/order/titles as v24',
  D.models.length === D24.models.length
  && D.models.every((m, i) => m.id === D24.models[i].id && m.name === D24.models[i].name
    && m.title === D24.models[i].title && m.province === D24.models[i].province
    && m.src === D24.models[i].src && m.status === D24.models[i].status));
t('shops: first 24 unchanged vs v24 (same names/links/order, ignoring id/logo/logoFit/contacts/shifts — v31 added sh-xx ids, v24 shops had no id field, v42 added shifts from req); v34 adds 6 idol/game shops sh-25..sh-30',
  D.shops.length === 30
  && JSON.stringify(D.shops.slice(0, 24).map(s => { const { id, logo, logoFit, contacts, shifts, ...rest } = s; return rest; }))
    === JSON.stringify(D24.shops)
  && D.shops.slice(24).map(s => s.name).join('|') === '59K Entertainment|KOSS 5|Anh Mai|GAMETOK LIVE|Qingxiang Nexplay|YAOHAI'
  && D.shops.slice(24).every(s => s.id && s.src && /^https:\/\/www\.facebook\.com\/groups\/[^/]+\/posts\/\d+$/.test(s.src)));
t('articles: 50 now (v34 appends 3 full pages, v47 appends 5: 1 keyword + 4 news; v71 appends 5 news; v80 appends 10: 1 keyword + 9 news; v82 appends 5 news); first 22 same identity as v24 except v40 demos (page/img/takeaway/date added); pinned excluded (v80 pin rotation unpins the oldest); v29 only adds page/img/takeaway/imgSelf to the 17 new full pages (POS365/LaPage already had page/img/takeaway in v23)',
  D.articles.length === 50 && D24.articles.length === 22
  && D.articles.filter(a => a.page).length === 49
  && D.articles.slice(0, 22).every((a, i) => {
    const b = D24.articles[i];
    if (a.source === 'Bài demo nội bộ — Ver2Solution') {
      return a.title === b.title && a.url === b.url && a.source === b.source && a.cat === b.cat
        && a.date === '2026-11-05' && a.page && a.img && a.takeaway && a.imgSelf === true;
    }
    if (a.title !== b.title || a.url !== b.url || a.source !== b.source || a.date !== b.date || a.cat !== b.cat) return false;
    if (['POS365', 'LaPage'].includes(a.source)) {
      // v44: takeaway duoc chuan hoa dau gach noi (C7: "1-2 mon" -> "1–2 mon" o bai LaPage)
      // nen so sanh toan bo tru takeaway; cac truong khac phai khop tuyet doi voi v24.
      // v69: img doi tu URL ngoai sang local nen so sanh toan bo tru ca img.
      const { takeaway: _ta, img: _ia, pinned: _pa, ...aNoTake } = a;
      const { takeaway: _tb, img: _ib, pinned: _pb, ...bNoTake } = b;
      return JSON.stringify(aNoTake) === JSON.stringify(bNoTake);
    }
    const { page, img, takeaway, imgSelf, pinned, ...rest } = a;
    const { pinned: _pb, ...bNoPin } = b;
    return JSON.stringify(rest) === JSON.stringify(bNoPin);
  })
  && D.articles.slice(22).map(a => a.source).join('|') === 'Gia Dụng Nhanh|CoMaker|Modern Retail|Ver2Solution|vietnam.vn|Aju Press|Continental Brief|vietnam.vn|Marketing China|GP Fulfillment|ValueYourNetwork|Thanh Niên|Nông Thôn Việt|Ver2Solution|BrandsVietnam|kinhtechungkhoan.vn|TokenFFF|China Market Brief|China Daily|TechFinancials|BrandsVietnam|BrandsVietnam|BrandsVietnam|Doanh nhân & Pháp luật|VnExpress|Doanh nhân & Pháp luật|Báo Vĩnh Long|kinhtechungkhoan.vn'
  && D.articles.slice(22).every(a => a.page && a.page.startsWith('bai-viet/') && fs.existsSync(path.join(root, a.page))));
t('no internal th-xx id in visible card text (ids only in ?id= URLs and image filenames)',
  (() => {
    const cards = D.models.map(m => V.cardHTML(m)).join('');
    return !/th-\d\d/.test(cards.replace(/ho-so\.html\?id=th-\d\d/g, '').replace(/images\/th-\d\d\.jpg/g, ''));
  })());
console.log(`\n${pass} PASS, ${fail} FAIL`);
process.exit(fail ? 1 : 0);
