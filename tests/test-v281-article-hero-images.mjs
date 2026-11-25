// test-v281-article-hero-images.mjs — v437 (25/11/2026, lenh anh Tho 12:12):
// 11 bai viet dung logo-c-mark.png lam anh dai dien (hero + og:image +
// twitter:image + JSON-LD image + data.js img). Fix: thay bang 1 anh that
// song dong/bai, tai ve local images/bai-viet/<slug>.jpg, ghi nguon anh o
// figcaption (theo mau "Nguon anh: jingdaily.com." cua bai meo-ban).
// Cam dung logo lam anh dai dien tu nay.
// Chay: node tests/test-v281-article-hero-images.mjs (tu goc repo).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let pass = 0, fail = 0;
function check(name, ok, extra) {
  if (ok) { pass++; console.log('PASS ' + name); }
  else { fail++; console.log('FAIL ' + name + (extra !== undefined ? ' — ' + extra : '')); }
}

const LOGO = 'https://vieclamlivestream.online/logo-c-mark.png';
// slug -> nguon ghi o figcaption
const FIX = {
  '3-giay-dau-quyet-dinh-nguoi-xem-o-lai-hay-thoat-cach-mc-mo-dau-phien-live': 'khamphalichsu.com',
  'black-friday-27-11-shop-tuyen-mau-live-gap-3-viec-can-chot-truoc-gio-live': 'taichinhcongnghe.vn',
  'live-vang-nguoi-xem-phai-lam-sao-seeding-cta-va-tuong-tac-giu-chan': 'tuonganlaw.com',
  'phien-live-237-ty-3-dieu-shop-tuyen-mau-live-can-biet': 'cafebiz.vn',
  'tuyen-mc-livestream-my-pham-yeu-cau-that-va-cach-chuan-bi-buoi-thu-live': 'blog.abit.vn',
  'checklist-truoc-gio-live-am-thanh-anh-sang-kich-ban-va-chot-don': 'lpstudio.vn',
  'phien-live-58-ty-trong-36-gio-shop-da-chuan-bi-nhung-gi': 'doanhnhansaigon.vn',
  'tuyen-mau-live-thoi-trang-mo-ta-cong-viec-lich-lam-va-cach-ung-tuyen-dung-nghe': 'vuanem.com',
  '100-ty-trong-17-gio-bai-hoc-chon-mau-live-dung-nganh-dung-tinh': 'taichinhdoanhnghiep.net.vn',
  'xuong-va-kiot-tuyen-mau-live-tai-cho-khac-gi-so-voi-mau-live-online': 'congdoanvietnam.vn',
  'meo-ban-thoi-trang-livestream-hoc-truong-dai-dich-70-ty-dong-2-gio-live': 'jingdaily.com',
};

const dataJs = fs.readFileSync(path.join(root, 'js/data.js'), 'utf8');

for (const [slug, domain] of Object.entries(FIX)) {
  const html = fs.readFileSync(path.join(root, 'bai-viet', slug + '.html'), 'utf8');
  const imgRel = `../images/bai-viet/${slug}.jpg`;
  const imgFull = `https://vieclamlivestream.online/images/bai-viet/${slug}.jpg`;
  check(slug + ': hero-img dung anh local tuong doi', html.includes(`<img class="hero-img" src="${imgRel}"`), 'hero src');
  check(slug + ': og:image dung anh that', html.includes(`og:image" content="${imgFull}"`), 'og:image');
  check(slug + ': twitter:image dung anh that', html.includes(`twitter:image" content="${imgFull}"`), 'twitter:image');
  check(slug + ': JSON-LD image dung anh that', html.includes(`"image":${JSON.stringify(imgFull)}`), 'json-ld');
  check(slug + ': figcaption ghi nguon anh ' + domain, html.includes('Nguồn ảnh: ' + domain + '.'), 'caption');
  check(slug + ': khong con logo trong HTML', !html.includes(LOGO), 'logo in html');
  check(slug + ': data.js img dung anh that', dataJs.includes(`"img": "${imgFull}"`) || dataJs.includes(`"img":"${imgFull}"`), 'data.js img');
  const imgPath = path.join(root, 'images/bai-viet', slug + '.jpg');
  check(slug + ': file anh ton tai', fs.existsSync(imgPath), 'missing file');
  if (fs.existsSync(imgPath)) {
    const buf = fs.readFileSync(imgPath);
    check(slug + ': file anh la JPEG that', buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff, 'magic bytes');
    check(slug + ': file anh 10KB-200KB', buf.length > 10 * 1024 && buf.length < 200 * 1024, buf.length + ' bytes');
  }
}
// Toan cuc: khong bai viet nao con dung logo lam anh dai dien.
const logoInArticles = (dataJs.match(/"img":\s*"https:\/\/vieclamlivestream\.online\/logo-c-mark\.png"/g) || []).length;
check('data.js: 0 article dung logo lam img', logoInArticles === 0, logoInArticles + ' logo img');

console.log(`\n${pass} PASS, ${fail} FAIL`);
process.exit(fail ? 1 : 0);
