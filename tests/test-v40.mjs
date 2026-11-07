/* v40 tests — Node only, no browser. v40 = 4 viec (yeu cau nguoi dung toi 05/11/2026):
   (1) Viet 2 bai demo con lai thanh bai day du (800-1500 tu, co muc luc, phan
       "Ver2Solution rut ra cho shop nho", chu ky chuan): "Ho so MC livestream:
       7 muc bat buoc..." (cat Tin moi Livestream) va "Luong MC livestream theo
       buoi: Mat bang gia o thoi trang, my pham va gia dung" (cat Tin nganh hang).
       Ca 2 co trang bai-viet moi + infographic tu lam SVG + PNG 1200x630
       (imgSelf:true) + data.js (page/img/takeaway/date 2026-11-05, giu nguyen
       title/cat/source) + sitemap 28 -> 30 URL + sw.js cache v40-shell-1 (v41: v41-shell-1, v42: v42-shell-1, v43: v43-shell-1, v44: v45-shell-1).
       DU LIEU CHI DUNG SO DA KIEM CHUNG: bai 1 — 7 truong bat buoc, 20 ho so
       that, 18/20 co anh that, 5/20 co SDT/Zalo, 1/20 co email, luong "Thoa
       thuan" 17/20, TP.HCM 11 / Ha Noi 5 / Toan quoc 4. Bai 2 — 17/20 ghi
       "Thoa thuan"; 3 ho so con lai ghi luong theo GIO (120.000-150.000
       dong/gio x2, tu 250.000 dong/gio x1); luong shop ghi theo THANG
       (59K 16-36 trieu, KOSS 5 tu 15 trieu, Anh Mai 17 trieu, GAMETOK 8-18
       trieu, YAOHAI 15-17 trieu). KHONG co so lieu luong theo BUOI da kiem
       chung — bai 2 PHAI noi ro dieu nay, TUYET DOI khong bia so luong buoi.
   (2) Thay anh dai dien bai bop reach (anh nguoi dung gui toi 05/11):
       images/bai-viet/bop-reach.webp; data.js them img; bai-viet-bop-reach.html
       doi og:image + twitter:image + them anh hero-img; o tin ghim so 1 tren
       trang chu tu dung anh moi (pinCardHTML lay tu truong img).
   (3) Them dong mien tru trach nhiem vao CUOI moi the mau (cardHTML) va moi
       the shop (shopCardHTML), SAU .card-actions: "Mien tru trach nhiem:
       Thong tin duoc tong hop tu bai dang cong khai cua cong dong, giu nguyen
       noi dung goc. Thong tin lien he hien thi de cac ben tu trao doi cong viec
       truc tiep voi nhau. Ver2Solution khong thu bat ky phi dich vu nao — day
       chi la trang cong dong ket noi." — class .disclaimer (12px, mut, nghieng).
   (4) Du lieu khong doi: 20 mau, 30 shop, 50 bai. LUU Y: nhiem vu goc ghi
       "tong 27 bai" la KHONG khop so that (data.js chi co 25 bai) — test nay
       khang dinh so that 25, khong theo con so 27 sai. */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let pass = 0, fail = 0;
function t(name, cond, extra = '') { if (cond) { pass++; console.log('PASS v40:', name); } else { fail++; console.log('FAIL v40:', name, extra); } }
const ogOf = (img) => img.replace(/\.[a-z0-9]+$/i, '-og.jpg'); // v76: og:image la ban 1200x630 JPEG cua data.js img
const sb = { window: {}, module: { exports: {} }, console, URLSearchParams };
vm.createContext(sb);
vm.runInContext(fs.readFileSync(path.join(root, 'js/data.js'), 'utf8'), sb);
vm.runInContext(fs.readFileSync(path.join(root, 'js/app.js'), 'utf8'), sb);
const D = sb.window.V20_DATA, V = sb.window.V20;
const css = fs.readFileSync(path.join(root, 'v20.css'), 'utf8');
const sw = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');
const BASE = 'https://ver2solution.github.io/mclivestream/';
const norm = (s) => (s || '').replace(/\s+/g, ' ').trim();
function wordCount(html) {
  const body = ((html.split('<div class="article-body">')[1] || '').split('<p style="margin-top:20px">Nguồn:')[0] || '');
  const text = body.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  return text ? text.split(' ').length : 0;
}
const DISCLAIMER = 'Miễn trừ trách nhiệm: Thông tin được tổng hợp từ bài đăng công khai của cộng đồng, giữ nguyên nội dung gốc. Thông tin liên hệ hiển thị để các bên tự trao đổi công việc trực tiếp với nhau. Ver2Solution không thu bất kỳ phí dịch vụ nào — đây chỉ là trang cộng đồng kết nối.';
const DEMOS = [
  { slug: 'ho-so-mc-livestream-7-muc-bat-buoc',
    title: 'Hồ sơ MC livestream: 7 mục bắt buộc giúp mẫu được shop tìm thấy nhanh hơn',
    cat: 'Tin mới Livestream' },
  { slug: 'luong-mc-livestream-theo-buoi',
    title: 'Lương MC livestream theo buổi: Mặt bằng giá ở thời trang, mỹ phẩm và gia dụng',
    cat: 'Tin ngành hàng' },
];

// ---- (1) data.js: 2 bai demo co du page/img/takeaway/date; giu nguyen title/cat/source ----
for (const d of DEMOS) {
  const a = D.articles.find(x => x.title === d.title);
  t('data.js co bai demo: ' + d.slug, !!a);
  if (!a) continue;
  t('data.js title/cat/source giu nguyen: ' + d.slug,
    a.cat === d.cat && a.source === 'Bài demo nội bộ — Ver2Solution');
  t('data.js page: ' + d.slug, a.page === 'bai-viet/' + d.slug + '.html');
  t('data.js img la PNG local day du: ' + d.slug,
    a.img === BASE + 'images/bai-viet/' + d.slug + '.png');
  t('data.js imgSelf true (infographic tu lam): ' + d.slug, a.imgSelf === true);
  t('data.js takeaway 1-2 cau, > 50 ky tu: ' + d.slug,
    typeof a.takeaway === 'string' && a.takeaway.length > 50);
  t('data.js date = 2026-11-05: ' + d.slug, a.date === '2026-11-05');
  t('data.js url van null (bai noi bo, khong link goc ngoai): ' + d.slug, a.url === null);
}

// ---- (2) 2 file bai-viet moi: ton tai, du meta SEO/OG/nav/chu ky, 800-1500 tu ----
for (const d of DEMOS) {
  const a = D.articles.find(x => x.title === d.title);
  const p = path.join(root, 'bai-viet', d.slug + '.html');
  t('page file exists: ' + d.slug, fs.existsSync(p));
  if (!fs.existsSync(p)) continue;
  const s = fs.readFileSync(p, 'utf8');
  t('h1 == data.js title: ' + d.slug, norm((s.match(/<h1 itemprop="headline">(.*?)<\/h1>/s) || ['', ''])[1]) === a.title);
  t('title tag co data.js title: ' + d.slug, s.includes('<title>' + a.title + ' — Ver2Solution</title>'));
  t('meta description present: ' + d.slug, /<meta name="description" content="[^"]{20,}">/.test(s));
  t('canonical == page URL: ' + d.slug, s.includes('<link rel="canonical" href="' + BASE + a.page + '">'));
  for (const tag of ['og:type" content="article"', 'og:site_name', 'og:title', 'og:description', 'og:image', 'og:url', 'article:published_time', 'article:author', 'twitter:card" content="summary_large_image"', 'twitter:title', 'twitter:description', 'twitter:image', 'application/ld+json']) {
    t(tag + ' present: ' + d.slug, s.includes(tag));
  }
  t('og:url == page URL: ' + d.slug, s.includes('<meta property="og:url" content="' + BASE + a.page + '">'));
  const og = (s.match(/<meta property="og:image" content="([^"]+)">/) || [])[1] || '';
  t('og:image == ban 1200x630 cua data.js img (v76): ' + d.slug, og === ogOf(a.img), 'og=' + og + ' img=' + a.img);
  t('twitter:image == og:image: ' + d.slug, s.includes('<meta name="twitter:image" content="' + og + '">'));
  t('published_time == 2026-11-05: ' + d.slug, s.includes('article:published_time" content="2026-11-05"'));
  // Infographic SVG + PNG
  const png = path.join(root, 'images/bai-viet/' + d.slug + '.png');
  const buf = fs.existsSync(png) ? fs.readFileSync(png) : Buffer.alloc(0);
  const isPng = buf.length > 24 && buf.slice(0, 8).equals(Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]));
  const w = isPng ? buf.readUInt32BE(16) : 0, h = isPng ? buf.readUInt32BE(20) : 0;
  t('infographic PNG exists 1200x630: ' + d.slug, isPng && w === 1200 && h === 630, w + 'x' + h);
  t('infographic SVG cung ten ton tai: ' + d.slug, fs.existsSync(path.join(root, 'images/bai-viet/' + d.slug + '.svg')));
  t('hero img uses local PNG: ' + d.slug, s.includes('src="../images/bai-viet/' + d.slug + '.png"'));
  // Takeaway callout == data.js takeaway
  const tw = (s.match(/<b>Theo Ver2Solution:<\/b>\s*([\s\S]*?)<\/div>/) || [])[1] || '';
  t('takeaway callout present: ' + d.slug, tw.length > 50);
  t('data.js takeaway == page takeaway: ' + d.slug, norm(tw.replace(/<[^>]+>/g, '')) === norm(a.takeaway));
  // Nguon noi bo: khong link goc ngoai
  t('nguon ghi Ver2Solution, khong link ngoai: ' + d.slug, s.includes('Nguồn: <b>Ver2Solution</b>'));
  t('standard signature block: ' + d.slug, s.includes('Ver2Solution.com</b> — Kênh cập nhật tin tức thị trường và xu hướng kinh doanh online') && s.includes('032 998 3699 (Zalo)'));
  // Nav du 5 muc
  const nav = (s.match(/<nav[^>]*>[\s\S]*?<\/nav>/) || [''])[0];
  t('nav du 5 muc (Trang chu, Mau, Shop, Tin tuc, Hoi dap): ' + d.slug,
    ['Trang chủ', 'Dành cho Mẫu', 'Dành cho Shop', 'Tin tức', 'Hỏi đáp'].every(x => nav.includes('>' + x + '</a>')) && !nav.includes('Cách hoạt động') && !nav.includes('Lộ trình'));
  // Muc luc khop h2
  const tocLinks = [...s.matchAll(/href="#(bai-muc-\d+)"/g)].map(m => m[1]);
  const h2s = [...s.matchAll(/<h2 id="(bai-muc-\d+)">/g)].map(m => m[1]);
  t('TOC khop h2 (du muc): ' + d.slug, tocLinks.length >= 5 && tocLinks.length === h2s.length && tocLinks.every((x, i) => x === h2s[i]), 'toc=' + tocLinks.length + ' h2=' + h2s.length);
  // So tu 800-1500
  const wc = wordCount(s);
  t('so tu article-body 800-1500: ' + d.slug, wc >= 800 && wc <= 1500, 'got ' + wc);
}

// ---- (3) Bai luong: KHONG chua so luong buoi bia; noi ro chua co so lieu ----
const luongHtml = fs.readFileSync(path.join(root, 'bai-viet/luong-mc-livestream-theo-buoi.html'), 'utf8');
const luongText = luongHtml.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
const FORBIDDEN = [
  /\d[\d.,]*\s*(nghìn|ngàn|triệu|tr)\s*\/\s*buổi/i,
  /\d[\d.,]*\s*đ\s*\/\s*buổi/i,
  /\d[\d.,]*\s*(nghìn|ngàn|triệu)\s*(một|mỗi)?\s*buổi/i,
  /500\.?000\s*đ/i,
  /\d[\d.,]*\s*đồng\s*\/\s*buổi/i,
];
FORBIDDEN.forEach((re, i) => {
  const m = luongText.match(re);
  t('bai luong KHONG chua mau luong buoi bia #' + (i + 1), !m, m ? 'phat hien: ' + m[0] : '');
});
t('bai luong noi ro chua co so lieu luong theo buoi', /chưa có số liệu lương theo buổi/i.test(luongHtml));
t('bai luong co ty le Thoa thuan 17/20', /17\s*(trên|\/)\s*20/.test(luongHtml) && luongHtml.includes('Thỏa thuận'));
t('bai luong co luong GIO da kiem chung (120.000-150.000, tu 250.000)', luongHtml.includes('120.000–150.000 đồng/giờ') && luongHtml.includes('250.000 đồng/giờ'));
t('bai luong co luong THANG da kiem chung kem chu "tháng"', luongHtml.includes('16–36 triệu/tháng') && luongHtml.includes('17 triệu/tháng') && luongHtml.includes('8–18 triệu/tháng'));

// ---- (4) Bai 1: dung so lieu da kiem chung, khong bia ----
const hsHtml = fs.readFileSync(path.join(root, 'bai-viet/ho-so-mc-livestream-7-muc-bat-buoc.html'), 'utf8');
for (const phrase of ['Họ tên', 'Ngày tháng năm sinh', 'Quê quán', 'Nơi muốn làm việc', 'Học vấn', 'Kinh nghiệm', 'Lĩnh vực mong muốn']) {
  t('bai 1 co muc bat buoc: ' + phrase, hsHtml.includes(phrase));
}
t('bai 1 co so 18/20 anh that', hsHtml.includes('18 trên 20 hồ sơ có ảnh thật'));
t('bai 1 co so 5/20 SDT/Zalo, 1/20 email', hsHtml.includes('5 trên 20 hồ sơ') && hsHtml.includes('1 trên 20 hồ sơ'));
t('bai 1 co phan bo TP.HCM 11 / Ha Noi 5 / Toan quoc 4', hsHtml.includes('TP. Hồ Chí Minh 11') && hsHtml.includes('Hà Nội 5') && hsHtml.includes('Toàn quốc / Live online 4'));

// ---- (5) Anh bop reach moi ----
const bop = D.articles.find(x => x.title.startsWith('Vì sao 90% Page bị bóp reach'));
t('bai bop reach ton tai trong data.js', !!bop);
if (bop) {
  t('bai bop reach img tro toi images/bai-viet/bop-reach.webp',
    bop.img === BASE + 'images/bai-viet/bop-reach.webp', 'img=' + bop.img);
  t('bai bop reach giu nguyen title/cat/source/date/url/pinned',
    bop.cat === 'Bán hàng Online hiệu quả' && bop.source === 'Ver2Solution' && bop.date === '2026-11-03' && bop.url === 'bai-viet-bop-reach.html' && bop.pinned === true);
}
const bopImg = path.join(root, 'images/bai-viet/bop-reach.webp');
t('file anh bop-reach.webp ton tai', fs.existsSync(bopImg) && fs.statSync(bopImg).size > 10000);
const bopHtml = fs.readFileSync(path.join(root, 'bai-viet-bop-reach.html'), 'utf8');
t('bai-viet-bop-reach.html og:image la ban 1200x630 -og.jpg (v76)',
  bopHtml.includes('<meta property="og:image" content="' + BASE + 'images/bai-viet/bop-reach-og.jpg">'));
t('bai-viet-bop-reach.html twitter:image la ban 1200x630 -og.jpg (v76)',
  bopHtml.includes('<meta name="twitter:image" content="' + BASE + 'images/bai-viet/bop-reach-og.jpg">'));
t('bai-viet-bop-reach.html co the img hero-img anh moi',
  bopHtml.includes('<img class="hero-img" src="images/bai-viet/bop-reach.webp"'));
t('bai-viet-bop-reach.html hero alt mo ta dung noi dung anh',
  bopHtml.includes('mũi tên đỏ đi xuống') && bopHtml.includes('0 lượt thích') && bopHtml.includes('gãi đầu bối rối'));
const pinnedRow = V.getPinnedRow(D.articles);
t('o tin ghim so 1 la bai bop-reach (user ghim tay duy nhat), so 2-4 la 3 bai moi them gan nhat (v82) (v84)', pinnedRow[0] && pinnedRow[0].title.startsWith('Vì sao 90% Page bị bóp reach') && pinnedRow[1] && pinnedRow[1].title.startsWith('Đặc sản địa phương') && pinnedRow[2] && pinnedRow[2].title.startsWith('Chợ 4.0') && pinnedRow[3] && pinnedRow[3].title.startsWith('Livestream và video ngắn hút 16 tỷ'));
t('pinCardHTML o so 1 dung anh bop-reach.webp, o so 2-4 dung anh 3 bai moi them gan nhat (v82) (v84)',
  V.pinCardHTML(pinnedRow[0], 1).includes('images/bai-viet/bop-reach.webp')
  && V.pinCardHTML(pinnedRow[1], 2).includes('images/bai-viet/hang-viet-ke-chuyen-dac-san-ban-chay-tiktok.jpg')
  && V.pinCardHTML(pinnedRow[2], 3).includes('images/bai-viet/cho-40-tieu-thuong-hoc-livestream-tiktok.jpg')
  && V.pinCardHTML(pinnedRow[3], 4).includes('images/bai-viet/shopee-live-video-tet-2026-16-ty-luot-xem.png'));

// ---- (6) Disclaimer cuoi moi the mau + the shop, sau .card-actions ----
t('app.js co hang DISCLAIMER dung van ban da chot', sb.window.V20 && fs.readFileSync(path.join(root, 'js/app.js'), 'utf8').includes("var DISCLAIMER = '" + DISCLAIMER + "';"));
const sampleModel = D.models[0];
const cardHtml = V.cardHTML(sampleModel);
t('the mau render ra co .disclaimer dung van ban da chot',
  cardHtml.includes('<p class="disclaimer">' + DISCLAIMER + '</p>'));
t('the mau: disclaimer nam SAU .card-actions (cuoi the)',
  cardHtml.indexOf('class="disclaimer"') > cardHtml.indexOf('class="card-actions"'));
const sampleShop = D.shops[0];
const shopHtml = V.shopCardHTML(sampleShop);
t('the shop render ra co .disclaimer dung van ban da chot',
  shopHtml.includes('<p class="disclaimer">' + DISCLAIMER + '</p>'));
t('the shop: disclaimer nam SAU .card-actions (cuoi the)',
  shopHtml.indexOf('class="disclaimer"') > shopHtml.indexOf('class="card-actions"'));
const discRule = (css.match(/\.disclaimer\{[^}]*\}/) || [''])[0];
t('CSS .disclaimer: 12px, mau muted, in nghieng, ke tren, padding-top 8px',
  discRule.includes('font-size:12px') && discRule.includes('color:var(--mut)') && discRule.includes('font-style:italic') && discRule.includes('border-top:1px solid var(--line)') && discRule.includes('padding-top:8px'), discRule);

// ---- (7) sitemap 30 URL, khong trung ----
const sm = fs.readFileSync(path.join(root, 'sitemap.xml'), 'utf8');
const locs = [...sm.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1]);
t('sitemap du 64 URL (v48: +1 dat-lai-mat-khau; v68: +1 dang-nhap; v71: +5 bai moi; v77: +4 trang AdSense; v85: +1 dang-ky; v86: +1 thanh-ly-kiot)', locs.length === 64, 'got ' + locs.length);
t('sitemap khong trung', new Set(locs).size === locs.length);
for (const d of DEMOS) t('sitemap co ' + d.slug, locs.includes(BASE + 'bai-viet/' + d.slug + '.html'));
t('sitemap giu bai-viet-bop-reach.html', locs.includes(BASE + 'bai-viet-bop-reach.html'));

// ---- (8) sw.js + du lieu khong doi ----
t('sw.js CACHE = v86-shell-1', sw.includes("const CACHE = 'v86-shell-1';"));
t('du lieu khong doi: 20 mau, 30 shop, 50 bai (khong phai 27 nhu nhiem vu goc ghi)',
  D.models.length === 20 && D.shops.length === 30 && D.articles.length === 50,
  'mau=' + D.models.length + ' shop=' + D.shops.length + ' bai=' + D.articles.length);
t('chi 2 bai demo co date 2026-11-05 va source demo noi bo',
  D.articles.filter(a => a.date === '2026-11-05' && a.source === 'Bài demo nội bộ — Ver2Solution').length === 2);
t('23 bai cu khac van co (page hoac url); chi bai Gia Dung Nhanh duoc phep thieu date (trang goc khong ghi ngay, da xac minh)',
  D.articles.filter(a => a.source !== 'Bài demo nội bộ — Ver2Solution').every(a => (a.page || a.url) && (a.date || a.title.startsWith('Xả kho đồ gia dụng'))));
t('trang chu van 2 hang (homeTop8 = 8), hang tin van 4 o',
  V.homeTop8(D.models, new Date(2026, 10, 5)).length === 8 && V.getPinnedRow(D.articles).length === 4);

console.log('v40: ' + pass + ' PASS, ' + fail + ' FAIL');
process.exit(fail ? 1 : 0);
