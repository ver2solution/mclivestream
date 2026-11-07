/* v23 tests — Node only, no browser. Covers the v23 additions only:
   2 standalone article pages (POS365 + LaPage) with full rewritten content,
   OG/Twitter share tags, retitled headlines, data.js page links, sitemap.
   The v20 suite and v22 suite still run for the rest. */
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let pass = 0, fail = 0;
function t(name, cond, extra = '') { if (cond) { pass++; console.log('PASS v23:', name); } else { fail++; console.log('FAIL v23:', name, extra); } }
function loadData(dir) {
  const sb = { window: {}, module: { exports: {} }, console };
  vm.createContext(sb);
  vm.runInContext(fs.readFileSync(path.join(dir, 'js/data.js'), 'utf8'), sb);
  vm.runInContext(fs.readFileSync(path.join(dir, 'js/app.js'), 'utf8'), sb);
  return { D: sb.window.V20_DATA, V: sb.window.V20 };
}
const { D, V } = loadData(root);
const pos = fs.readFileSync(path.join(root, 'bai-viet/xa-kho-thoi-trang-cuoi-nam.html'), 'utf8');
const lap = fs.readFileSync(path.join(root, 'bai-viet/tiktok-shop-1111-tinh-loi.html'), 'utf8');
const POS_IMG = 'https://ver2solution.github.io/mclivestream/images/bai-viet/xa-kho-thoi-trang-cuoi-nam-og.jpg'; // v76: og:image la ban 1200x630 JPEG (hero-img van anh goc)
const POS_IMG_REL = '../images/bai-viet/xa-kho-thoi-trang-cuoi-nam.jpeg';
const LAP_IMG = 'https://ver2solution.github.io/mclivestream/images/bai-viet/tiktok-shop-1111-tinh-loi-og.jpg'; // v76: og:image la ban 1200x630 JPEG (hero-img van anh goc)
const LAP_IMG_REL = '../images/bai-viet/tiktok-shop-1111-tinh-loi.jpg';
const POS_URL = 'https://www.pos365.vn/10-tuyet-chieu-xa-hang-cuoi-nam-quan-ao-thu-hoi-von-cuc-nhanh-8163.html';
const LAP_URL = 'https://lapage.vn/vi/blog/post/tiktok-shop-1111-prep-plan';

// ---- Data: counts unchanged, 2 articles gain a page ----
t('data still 20 models, 30 shops, 50 articles (v34 adds 3)',
  D.models.length === 20 && D.shops.length === 30 && D.articles.length === 50,
  `${D.models.length}/${D.shops.length}/${D.articles.length}`);
t('POS365 + LaPage have page fields pointing at real files',
  (() => {
    const p = D.articles.find(a => a.source === 'POS365');
    const l = D.articles.find(a => a.source === 'LaPage');
    return p.page === 'bai-viet/xa-kho-thoi-trang-cuoi-nam.html' && fs.existsSync(path.join(root, p.page))
      && l.page === 'bai-viet/tiktok-shop-1111-tinh-loi.html' && fs.existsSync(path.join(root, l.page));
  })());
t('24 articles have page fields (v40: 2 demos now have full pages; only bop-reach has no page, links via local url)',
  D.articles.filter(a => a.page).length === 49
  && D.articles.filter(a => !a.page).map(a => a.title).join('|') ===
    ['Vì sao 90% Page bị bóp reach khi đi share group? 3 tín hiệu Facebook chấm spam'].join('|'));
t('articleLink: internal link for paged articles; bop-reach links via its local url, demos now link to their bai-viet pages (v40)',
  V.articleLink(D.articles.find(a => a.source === 'POS365')).includes('href="bai-viet/xa-kho-thoi-trang-cuoi-nam.html"')
  && !V.articleLink(D.articles.find(a => a.source === 'POS365')).includes('target="_blank"')
  && V.articleLink(D.articles.find(a => a.source === 'LaPage')).includes('href="bai-viet/tiktok-shop-1111-tinh-loi.html"')
  && V.articleLink(D.articles.find(a => a.url === 'bai-viet-bop-reach.html')).includes('href="bai-viet-bop-reach.html"')
  && !V.articleLink(D.articles.find(a => a.url === 'bai-viet-bop-reach.html')).includes('target="_blank"')
  && D.articles.filter(a => a.url === null).every(a => V.articleLink(a).includes('href="bai-viet/') && !V.articleLink(a).includes('target="_blank"')));

// ---- Retitled headlines: keep original key phrases, add the pain point ----
t('POS365 retitle keeps original phrase and adds the no-loss angle',
  D.articles.find(a => a.source === 'POS365').title === 'Xả kho thời trang cuối năm: 12 chiêu dọn kho mà vẫn giữ thương hiệu, không bán lỗ');
t('LaPage retitle keeps original phrase and adds the verified 20% figure',
  D.articles.find(a => a.source === 'LaPage').title === '11.11 trên TikTok Shop: tính lời trước khi giảm giá — giảm 20%, lời mỗi đơn có thể tụt gần 5 lần');

// ---- OG / SEO tags on both pages ----
for (const [name, html, img, imgRel, url] of [
  ['POS365', pos, POS_IMG, POS_IMG_REL, 'https://ver2solution.github.io/mclivestream/bai-viet/xa-kho-thoi-trang-cuoi-nam.html'],
  ['LaPage', lap, LAP_IMG, LAP_IMG_REL, 'https://ver2solution.github.io/mclivestream/bai-viet/tiktok-shop-1111-tinh-loi.html'],
]) {
  t(`${name}: full OG set (title/description/image/url/type article)`,
    html.includes('property="og:type" content="article"')
    && html.includes('property="og:site_name" content="Ver2Solution.com"')
    && html.includes('property="og:title"')
    && html.includes('property="og:description"')
    && html.includes(`property="og:image" content="${img}"`)
    && html.includes(`property="og:url" content="${url}"`));
  t(`${name}: twitter summary_large_image with title/description/image`,
    html.includes('name="twitter:card" content="summary_large_image"')
    && html.includes('name="twitter:title"') && html.includes('name="twitter:description"')
    && html.includes(`name="twitter:image" content="${img}"`));
  t(`${name}: canonical + <title> match the page URL and headline`,
    html.includes(`rel="canonical" href="${url}"`) && html.includes('<title>') && html.includes('— Ver2Solution</title>'));
  t(`${name}: shared header/nav/footer and v20.css, back link to Tin tức`,
    html.includes('../v20.css') && html.includes('../tin-tuc.html') && html.includes('class="site-head"')
    && html.includes('class="site-foot"') && html.includes('../index.html'));
  t(`${name}: hero image is the original source image (v69: downloaded locally) with a source caption`,
    html.includes(`src="${imgRel}"`) && html.includes('Ảnh gốc:') && html.includes('không phải ảnh của Ver2Solution'));
  t(`${name}: full content — 4+ subheads, takeaway, linked source name, Ver2Solution signature`,
    (html.match(/<h2 /g) || []).length >= 4
    && html.includes('Theo Ver2Solution')
    && html.includes('Ver2Solution.com')
    && html.includes('#ver2solution')
    && html.includes('032 998 3699 (Zalo)'));
  t(`${name}: no phone/Zalo other than Ver2Solution's own 032 998 3699`,
    (() => {
      const stripped = html.replace(/032 998 3699/g, '').replace(/0329983699/g, '');
      const zlinks = html.match(/zalo\.me\/[^\s"'<>]+/gi) || [];
      return !/(^|[^0-9])0[389]\d{8}([^0-9]|$)/.test(stripped) && zlinks.every(u => u === 'zalo.me/0329983699');
    })());
}

// ---- Content accuracy: figures from the sources only ----
t('POS365 page: keeps the 12 chiêu, combo ~20%, đồng giá, bậc thang, ký gửi 30–40%',
  pos.includes('12 chiêu') && pos.includes('20%') && pos.includes('99K') && pos.includes('30–40%')
  && pos.includes('Sai lầm chết người') && pos.includes('không xác nhận tính năng hay ưu đãi của phần mềm đó'));
t('LaPage page: keeps the profit table (33.000 / 13.000 / 7.000 / 48.000) and the 5 chặng',
  lap.includes('33.000') && lap.includes('13.000') && lap.includes('7.000') && lap.includes('48.000')
  && lap.includes('gần 5 lần') && lap.includes('19h–23h') && lap.includes('Chặng 1') && lap.includes('Sau 11.11'));
t('both pages: source line links the source NAME to the original article',
  pos.includes(`Nguồn: <a href="${POS_URL}"`) && pos.includes('>POS365</b></a>')
  && lap.includes(`Nguồn: <a href="${LAP_URL}"`) && lap.includes('>LaPage</b></a>'));
t('sitemap lists both new article pages',
  (() => {
    const s = fs.readFileSync(path.join(root, 'sitemap.xml'), 'utf8');
    return s.includes('bai-viet/xa-kho-thoi-trang-cuoi-nam.html') && s.includes('bai-viet/tiktok-shop-1111-tinh-loi.html');
  })());
console.log(`\n${pass} PASS, ${fail} FAIL`);
process.exit(fail ? 1 : 0);
