/* v22 tests — Node only, no browser. Covers the v22 additions only:
   20 public shop job posts (public info only), 6 shops on home below the
   8-model rows, 2 new articles (POS365 + LaPage), old content unchanged.
   Counts updated for v34: 30 shops (v24's 24 + v34's 6 idol/game shops).
   The v20 suite (tests/test-v20.mjs) still runs for the rest. */
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const v21root = path.resolve(root, '..', 'mclivestream-final-v21');
let pass = 0, fail = 0;
function t(name, cond, extra = '') { if (cond) { pass++; console.log('PASS v22:', name); } else { fail++; console.log('FAIL v22:', name, extra); } }
function loadData(dir) {
  const sb = { window: {}, module: { exports: {} }, console };
  vm.createContext(sb);
  vm.runInContext(fs.readFileSync(path.join(dir, 'js/data.js'), 'utf8'), sb);
  vm.runInContext(fs.readFileSync(path.join(dir, 'js/app.js'), 'utf8'), sb);
  return { D: sb.window.V20_DATA, V: sb.window.V20 };
}
const { D, V } = loadData(root);
const old = loadData(v21root).D;

// ---- Shops: 30, public info only ----
t('30 shops, every one has a name and a Facebook post link',
  D.shops.length === 30 && D.shops.every(s => s.name && /^https:\/\/www\.facebook\.com\/groups\/[^/]+\/posts\/\d+$/.test(s.src)),
  `${D.shops.length} shops`);
t('shop links are unique (30 distinct original posts)',
  new Set(D.shops.map(s => s.src)).size === 30);
t('shop phones/Zalo are ONLY the 26 audited public numbers in 25 shops (v26 rule 2026-11-05 13:26: contact-audit-v26.md; Lê Thị Liễu has 2; v34 adds 6 idol/game numbers 0369101543/0347514152/0398717445/0398704111/0398855402/0358546899)',
  (() => {
    const found = (JSON.stringify(D.shops).match(/(?<!\d)0[389]\d{8}(?!\d)/g) || []).sort();
    const audited = ['0333422259', '0336190155', '0339705529', '0347514152', '0352514268', '0353215046', '0358546899', '0367889506', '0369101543', '0377067362', '0398704111', '0398717445', '0398855402', '0829078209', '0865863929', '0868553009', '0876020006', '0912569229', '0931482789', '0941722001', '0948972643', '0965765494', '0967488936', '0971759240', '0975848831', '0981167717'].sort();
    return JSON.stringify(found) === JSON.stringify(audited);
  })(), 'found: ' + ((JSON.stringify(D.shops).match(/(?<!\d)0[389]\d{8}(?!\d)/g) || []).join(',')));
t('logo field on all 30 shops, non-empty only for the 3 verified (FANI, Chạm Loa, Mylan); no top-level phone/email/fanpageUrl fields',
  D.shops.every(s => 'logo' in s)
  && D.shops.filter(s => s.logo).map(s => s.name).sort().join('|') === 'Chạm Loa|CÔNG TY TNHH TM XNK FANI / TopGia, TopGiaKids|Công ty TNHH Giấy Mylan'
  && D.shops.every(s => !('fanpageUrl' in s) && !('logoUrl' in s) && !('phone' in s) && !('email' in s)));
t('exactly 5 shops have no shop name in the original post (marked as poster)',
  D.shops.filter(s => !s.shopNameKnown).map(s => s.name).sort().join('|') === 'Lâm|Lâm Hoàng Dũng|Nguyễn Minh Ngọc|Phạm Hoàng Lâm|Đỗ Sỹ Khải');
t('every shop has product, province, salary, requirement, channels, date',
  D.shops.every(s => s.product && s.province && s.salary && s.req && s.channels && /^\d{4}-\d{2}-\d{2}$/.test(s.date)));
t('shop card HTML (v32, v37): Chạm Loa shows its real logo (contain, never cropped), fanpage link, contact note; salary starting with "Thỏa thuận" shows the "Lương thỏa thuận" chip AND the salary box with the full text (v37: all decision boxes always render); the hard Ver2Solution Zalo button (zalo.me/0329983699) is allowed, no other shop Zalo',
  (() => {
    const h = V.shopCardHTML(D.shops[0]);
    return h.includes('Chạm Loa') && h.includes('Thỏa thuận năng lực') && h.includes('Lương thỏa thuận')
      && h.includes('Bài tuyển gốc →')
      && h.includes('2326309658137327') && h.includes('yêu cầu cập nhật hoặc gỡ tin')
      && h.includes('<img class="shop-logo shop-logo--contain" src="images-shop/shop-chamloa.png"')
      && h.includes('Fanpage Chạm Loa') && h.includes('Các bên chủ động liên hệ trao đổi, thông tin là công khai.')
      && h.includes('zalo.me/0329983699') && (h.match(/zalo\.me\/\d+/g) || []).every(u => u === 'zalo.me/0329983699')
      && h.includes('onerror="this.outerHTML') && h.includes('shop-initial');
  })());
t('shop card HTML: unknown shop name is labelled as the poster, not a shop name',
  V.shopCardHTML(D.shops[1]).includes('người đăng tin tuyển'));
t('shop card HTML: all fields escaped (no raw < in output for a crafted name)',
  (() => {
    const h = V.shopCardHTML({ name: 'A<B', shopNameKnown: true, product: 'X&Y', province: 'Hà Nội', district: 'Q', salary: '1', req: 'r', channels: 'T', date: '2026-11-04', src: 'https://www.facebook.com/groups/1/posts/2' });
    return h.includes('A&lt;B') && h.includes('X&amp;Y') && !h.includes('A<B');
  })());
t('home shops: newest first, first 6 = five 5 Nov posts (Chạm Loa, Javata, 59K Entertainment, KOSS 5, Anh Mai) then Đỗ Sỹ Khải (4 Nov) — verified with the real sortShopsNewest',
  (() => {
    const six = V.sortShopsNewest(D.shops).slice(0, 6);
    return six.map(s => s.name).join('|') === 'Chạm Loa|Javata Affiliate Team|59K Entertainment|KOSS 5|Anh Mai|Đỗ Sỹ Khải'
      && six.map(s => s.date).join(',') === '2026-11-05,2026-11-05,2026-11-05,2026-11-05,2026-11-05,2026-11-04';
  })());
t('home shops render: 6 cards, all with source links',
  V.sortShopsNewest(D.shops).slice(0, 6).map(s => V.shopCardHTML(s)).join('').split('shop-card').length - 1 === 6);
t('shop page render: all 30 cards, every name present once',
  (() => {
    const html = V.sortShopsNewest(D.shops).map(s => V.shopCardHTML(s)).join('');
    return (html.match(/<article class="shop-card">/g) || []).length === 30
      && D.shops.every(s => html.includes(s.name.replace(/&/g, '&amp;')));
  })());

// ---- Home + shop page structure ----
t('index.html: shop section sits below the 8-model grid, before How-it-works',
  (() => {
    const h = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
    return h.indexOf('id="homeGrid"') < h.indexOf('id="homeShops"') && h.indexOf('id="homeShops"') < h.indexOf('id="cach-hoat-dong"')
      && h.includes('Shop đang tuyển mẫu') && h.includes('Xem tất cả 30 shop');
  })());
t('index.html: still exactly 1 h1, 8-model grid untouched',
  (fs.readFileSync(path.join(root, 'index.html'), 'utf8').match(/<h1>/g) || []).length === 1
  && V.withPhotoFirst(D.models).slice(0, 8).length === 8);
t('danh-sach-shop.html: public list present, old empty line gone, forms untouched, dong dem v61 da xoa',
  (() => {
    const h = fs.readFileSync(path.join(root, 'danh-sach-shop.html'), 'utf8');
    return h.includes('id="publicShopsList"') && !h.includes('id="publicShopsCount"')
      && !h.includes('Hiện chưa liệt kê shop nào') && !h.includes('approvedShopsEmpty')
      && ['shopSignUp', 'shopSignIn', 'shopForgot', 'jobForm', 'shopProfileForm'].every(id => h.includes(id));
  })());
t('CSS: shop grid/card/initial rules present, 3-col desktop, 1-col mobile',
  (() => {
    const c = fs.readFileSync(path.join(root, 'v20.css'), 'utf8');
    return c.includes('.shop-grid') && c.includes('.shop-card') && c.includes('.shop-initial')
      && /\.shop-grid\{display:grid;grid-template-columns:repeat\(3,1fr\)/.test(c.replace(/\s+/g, ''));
  })());

// ---- Articles: exactly 2 new, old 20 unchanged ----
t('22 articles: the 20 v21 titles are all still present, unchanged',
  old.articles.length === 20 && old.articles.every(a => D.articles.some(b => b.title === a.title && b.url === a.url && b.source === a.source)));
t('the 2 new articles are exactly POS365 + LaPage, both with image + takeaway',
  (() => {
    const news = D.articles.filter(a => ['POS365', 'LaPage'].includes(a.source));
    return news.length === 2
      && news.every(a => a.img && /^https:\/\//.test(a.img) && a.takeaway && a.takeaway.length > 50 && a.url && a.date)
      && news.some(a => a.title.includes('Xả kho thời trang cuối năm')) && news.some(a => a.title.includes('11.11 trên TikTok Shop'));
  })());
t('the 3 formerly not-ready articles were ADDED in v34 (Gia Dụng Nhanh, CoMaker, Modern Retail), each with a real page file',
  (() => {
    const three = ['Gia Dụng Nhanh', 'CoMaker', 'Modern Retail'].map(src => D.articles.find(a => a.source === src));
    return three.every(Boolean)
      && three.every(a => a.page && a.page.startsWith('bai-viet/') && fs.existsSync(path.join(root, a.page)))
      && three.map(a => a.page).join('|') === 'bai-viet/xa-kho-do-gia-dung-cuoi-nam.html|bai-viet/shopee-ai-cho-nguoi-ban.html|bai-viet/tiktok-shop-my-black-friday-2026.html';
  })());
t('new articles: POS365 date note keeps both original dates, LaPage date 2026-10-27',
  D.articles.find(a => a.source === 'POS365').dateNote === 'Đăng lần đầu 30/03/2025, cập nhật 25/09/2026'
  && D.articles.find(a => a.source === 'LaPage').date === '2026-10-27');
t('news render in app.js shows original image with source note + takeaway',
  fs.readFileSync(path.join(root, 'js/app.js'), 'utf8').includes('Ảnh gốc:') &&
  fs.readFileSync(path.join(root, 'js/app.js'), 'utf8').includes('không phải ảnh của Ver2Solution') &&
  fs.readFileSync(path.join(root, 'js/app.js'), 'utf8').includes('Theo Ver2Solution:'));
t('tin-tuc.html intro no longer claims no original images are used (v64: ca doan intro da xoa, chi con H1)',
  (() => {
    const h = fs.readFileSync(path.join(root, 'tin-tuc.html'), 'utf8');
    return !h.includes('không dùng ảnh báo gốc') && !h.includes('Tin mới nhất xếp trước');
  })());
t('models untouched: still 20, same names as v21',
  D.models.length === 20 && D.models.every((m, i) => m.name === old.models[i].name && m.id === old.models[i].id));
console.log(`\n${pass} PASS, ${fail} FAIL`);
process.exit(fail ? 1 : 0);
