/* v34 tests — Node only, no browser. v34 adds the 6 idol/game streamer shops
   (user-directed 2026-11-05 ~21:08: post ALL collected shop data) as
   sh-25..sh-30, read from each shop's own public Facebook post:
   (1) 30 shops total, ids sh-01..sh-30 in order, unique; first 24 unchanged.
   (2) the 6 new shops have the exact name/product/province/district/salary/
       req/channels/date/src read from their posts; channels are
       "Chưa cập nhật" where the post does not state them; contacts are only
       the Zalo numbers the posts themselves publish (source "post").
   (3) all 30 cards render with the v32 template (detail link, "Xem chi tiết
       shop →", "Nhắn Zalo" for shops with a Zalo contact); the 6 new shops'
       detail pages render (checked for sh-25).
   (4) HTML counts say 30 everywhere (trust strip, home link, list header,
       no-API status text).
   The v20–v32 suites still run. */
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let pass = 0, fail = 0;
function t(name, cond, extra = '') { if (cond) { pass++; console.log('PASS v34:', name); } else { fail++; console.log('FAIL v34:', name, extra); } }

const sb = { window: {}, module: { exports: {} }, console, URLSearchParams };
vm.createContext(sb);
vm.runInContext(fs.readFileSync(path.join(root, 'js/data.js'), 'utf8'), sb);
const D = sb.window.V20_DATA;

// ---- (1) counts + ids ----
t('30 shops total', D.shops.length === 30, 'got ' + D.shops.length);
const shopIds = D.shops.map(s => s.id);
t('every shop has a unique id', new Set(shopIds).size === 30 && shopIds.every(Boolean));
t('shop ids are sh-01..sh-30 in order', shopIds.every((id, i) => id === 'sh-' + String(i + 1).padStart(2, '0')));
t('first shop still Chạm Loa, 24th still Mylan (order kept)', D.shops[0].name === 'Chạm Loa' && D.shops[23].name === 'Công ty TNHH Giấy Mylan');
t('new shops are sh-25..sh-30 in collection order',
  D.shops.slice(24).map(s => s.id).join(',') === 'sh-25,sh-26,sh-27,sh-28,sh-29,sh-30');
t('all shop src links unique (30 distinct original posts)',
  new Set(D.shops.map(s => s.src)).size === 30);

// ---- (2) the 6 new shops: exact data from their public posts ----
const NEW = [
  { id: 'sh-25', name: '59K Entertainment', product: 'Idol Livestream', province: 'TP. Hồ Chí Minh', district: 'Quận 8',
    salary: '16–36 triệu/tháng + KPI + thưởng ngày', channels: 'Chưa cập nhật', date: '2026-11-05',
    src: 'https://www.facebook.com/groups/337105752372137/posts/969053609177345', zalo: '0369101543',
    reqHas: ['Idol Live nam/nữ', 'MC Livestream tiếng Anh', 'không cần kinh nghiệm'] },
  { id: 'sh-26', name: 'KOSS 5', product: 'Idol Livestream', province: 'TP. Hồ Chí Minh', district: 'Quận 1',
    salary: 'Từ 15 triệu/tháng + hoa hồng', channels: 'Chưa cập nhật', date: '2026-11-05',
    src: 'https://www.facebook.com/groups/337105752372137/posts/969044702511569', zalo: '0347514152',
    reqHas: ['Idol Livestream', 'Trợ lý Vận hành', 'Stylist'] },
  { id: 'sh-27', name: 'Anh Mai', product: 'Idol Livestream', province: 'TP. Hồ Chí Minh', district: 'Quận 5',
    salary: '17 triệu/tháng + hoa hồng và thưởng', channels: 'Chưa cập nhật', date: '2026-11-05',
    src: 'https://www.facebook.com/groups/337105752372137/posts/968970739185632', zalo: '0398717445',
    reqHas: ['Không cần kinh nghiệm', 'đào tạo từ A–Z'] },
  { id: 'sh-28', name: 'GAMETOK LIVE', product: 'Streamer Game', province: 'TP. Hồ Chí Minh', district: 'Quận 4',
    salary: '8–18 triệu/tháng + hoa hồng', channels: 'TikTok', date: '2026-11-04',
    src: 'https://www.facebook.com/groups/337105752372137/posts/968057325943640', zalo: '0398704111',
    reqHas: ['Livestream TikTok', 'chơi game', 'Không bắt buộc kinh nghiệm'] },
  { id: 'sh-29', name: 'Qingxiang Nexplay', product: 'Streamer Game', province: 'TP. Hồ Chí Minh', district: 'Quận 4',
    salary: '8–18 triệu/tháng + thưởng KPI', channels: 'TikTok', date: '2026-11-04',
    src: 'https://www.facebook.com/groups/337105752372137/posts/968342475915125', zalo: '0398855402',
    reqHas: ['Nam/Nữ/LGBT', 'đào tạo từ đầu'] },
  { id: 'sh-30', name: 'YAOHAI', product: 'Streamer Game', province: 'Hà Nội', district: 'Hà Đông',
    salary: '15–17 triệu/tháng + hoa hồng 16–20%', channels: 'Chưa cập nhật', date: '2026-11-04',
    src: 'https://www.facebook.com/groups/1002938194724844/posts/1705679061117417', zalo: '0358546899',
    reqHas: ['Đào tạo 1:1 từ đầu', 'Không áp KPI'] },
];
for (const n of NEW) {
  const s = D.shops.find(x => x.id === n.id);
  t('new shop exists: ' + n.id, !!s);
  if (!s) continue;
  t(n.id + ' name', s.name === n.name, s.name);
  t(n.id + ' shopNameKnown true', s.shopNameKnown === true);
  t(n.id + ' product', s.product === n.product, s.product);
  t(n.id + ' province/district', s.province === n.province && s.district === n.district, s.province + ' / ' + s.district);
  t(n.id + ' salary', s.salary === n.salary, s.salary);
  t(n.id + ' req has key phrases', n.reqHas.every(p => s.req.includes(p)), s.req);
  t(n.id + ' channels', s.channels === n.channels, s.channels);
  t(n.id + ' date', s.date === n.date, s.date);
  t(n.id + ' src', s.src === n.src, s.src);
  t(n.id + ' src is a Facebook group post', /^https:\/\/www\.facebook\.com\/groups\/[^/]+\/posts\/\d+$/.test(s.src));
  t(n.id + ' logo empty (initial-letter placeholder)', s.logo === '');
  const z = (s.contacts || []).filter(c => c.provider === 'zalo');
  t(n.id + ' exactly 1 Zalo contact from its own post', z.length === 1 && z[0].value === n.zalo && z[0].source === 'post' && z[0].source_url === n.src, JSON.stringify(z));
  t(n.id + ' no invented Facebook profile contact', !(s.contacts || []).some(c => c.provider === 'facebook'));
}
t('25/30 shops have a public Zalo/phone number, 1/30 a public email',
  D.shops.filter(s => (s.contacts || []).some(c => c.provider === 'zalo' || c.provider === 'phone')).length === 25
  && D.shops.filter(s => (s.contacts || []).some(c => c.provider === 'email')).length === 1);

// ---- (3) render: all 30 cards with the v32 template ----
function el() { return { innerHTML: '', textContent: '', value: '', appendChild() {}, addEventListener() {} }; }
const els = { shopDetailRoot: el(), otherShops: el(), shopDetailTitle: el() };
const handlers = {};
sb.document = { getElementById: id => els[id] || null, createElement: () => el(), addEventListener(type, fn) { handlers[type] = fn; } };
vm.runInContext(fs.readFileSync(path.join(root, 'js/app.js'), 'utf8'), sb);
const V = sb.window.V20;
t('shopCardHTML exported', typeof V.shopCardHTML === 'function');
let allLink = true, allBtn = true, allZalo = true;
for (const s of D.shops) {
  const c = V.shopCardHTML(s);
  if (!c.includes('chi-tiet-shop.html?id=' + s.id)) allLink = false;
  if (!c.includes('Xem chi tiết →')) allBtn = false;
  const hasZalo = (s.contacts || []).some(x => x.provider === 'zalo');
  if (hasZalo && !c.includes('Nhắn Zalo')) allZalo = false;
}
t('all 30 cards link to their detail page', allLink);
t('all 30 cards have "Xem chi tiết →"', allBtn);
t('every shop with a Zalo contact has a "Nhắn Zalo" button', allZalo);
const card25 = V.shopCardHTML(D.shops[24]);
t('sh-25 card shows name as detail link', card25.includes('<a href="chi-tiet-shop.html?id=sh-25">59K Entertainment</a>'));
t('sh-25 card shows product + salary', card25.includes('Idol Livestream') && card25.includes('16–36 triệu/tháng'));
t('sh-25 card shows Zalo button', card25.includes('Nhắn Zalo'));
t('sh-28 card shows TikTok channel', V.shopCardHTML(D.shops[27]).includes('TikTok'));
t('no fabricated words in any of the 30 cards',
  !D.shops.some(s => /quy mô|phúc lợi|nhân viên|★|5 sao/.test(V.shopCardHTML(s))));

// detail page for sh-25 via the DOM stub
t('initShopDetail exported', typeof V.initShopDetail === 'function');
sb.location = { search: '?id=sh-25' };
handlers['DOMContentLoaded']();
const det25 = els.shopDetailRoot.innerHTML;
t('detail sh-25 h1 is shop name only', det25.includes('<h1>59K Entertainment</h1>') && !det25.includes('<h1>Quận 8 — 59K Entertainment</h1>'));
t('detail sh-25 shows product', det25.includes('Idol Livestream'));
t('detail sh-25 shows salary', det25.includes('16–36 triệu/tháng'));
t('detail sh-25 shows district', det25.includes('Quận 8'));
t('detail sh-25 shows requirement', det25.includes('không cần kinh nghiệm'));
t('detail sh-25 shows date', det25.includes('2026-11-05'));
t('detail sh-25 shows Zalo contact', det25.includes('0369101543') || det25.includes('zalo.me/0369101543'));
t('detail sh-25 links Facebook source (tracked)', det25.includes('data-track="xem-bai-tuyen-goc"') && det25.includes(D.shops[24].src));
t('detail sh-25 renders 6 other shops', (els.otherShops.innerHTML.match(/shop-card/g) || []).length === 6, 'got ' + (els.otherShops.innerHTML.match(/shop-card/g) || []).length);
t('detail sh-25 other shops exclude itself', !els.otherShops.innerHTML.includes('chi-tiet-shop.html?id=sh-25'));

// ---- (4) HTML counts say 30 ----
const indexHtml = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const listHtml = fs.readFileSync(path.join(root, 'danh-sach-shop.html'), 'utf8');
t('trust strip static number is 30', indexHtml.includes('<b id="trustShops">30</b>'));
t('home shop link says 30 shops', indexHtml.includes('Xem tất cả 30 shop →'));
t('list header H1 van nguyen (v62: bo dong dem 30 shop)', listHtml.includes('<h1>Tìm shop tuyển mẫu livestream</h1>'));
t('no-API status text says 30 public posts', listHtml.includes('Bạn vẫn xem được 30 tin tuyển công khai bên dưới; cần hỗ trợ thì nhắn Zalo 032 998 3699.'));
t('no stale "24 shop" text remains in index/danh-sach-shop',
  !/24 shop|24 tin tuyển/.test(indexHtml) && !/24 shop|24 tin tuyển/.test(listHtml));

console.log(`\nv34: ${pass} PASS, ${fail} FAIL`);
process.exit(fail ? 1 : 0);
