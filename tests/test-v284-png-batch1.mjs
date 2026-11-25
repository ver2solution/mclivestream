// test-v284-png-batch1.mjs — PNG batch 1 (25/11/2026, lenh anh Tho 14:17):
// 15 bai viet dung anh PNG do hoa chu (infographic/title card) lam anh dai
// dien. Fix: thay bang 1 anh that song dong, tai ve local
// images/bai-viet/<slug>.jpg (<=1200w, q82), ghi nguon anh o figcaption
// (mau v437: "Nguon anh: <domain>."). Kem 6 mau sua co photoHas false->true
// (anh that da co san images/th-XX.jpg, da doc ky tung anh).
// Chay: node tests/test-v284-png-batch1.mjs (tu goc repo).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let pass = 0, fail = 0;
function check(name, ok, extra) {
  if (ok) { pass++; console.log('PASS ' + name); }
  else { fail++; console.log('FAIL ' + name + (extra !== undefined ? ' — ' + extra : '')); }
}

// slug -> nguon ghi o figcaption
const FIX = {
  'singles-day-2026-trung-quoc-ban-qua-livestream': 'chinamarketbrief.com',
  'ho-so-mc-livestream-7-muc-bat-buoc': 'petapixel.com',
  'luong-mc-livestream-theo-buoi': 'gearlaunch.com',
  'ai-lam-thay-phan-tim-hang': 'Getty Images',
  'tiktok-shop-tien-toi-100-ty-usd': 'vulcanpost.com',
  'le-11-11-trung-quoc-ban-goi-ai-qua-livestream': 'businessoffashion.com',
  'nguoi-tieu-dung-2026-vua-thoai-mai-vua-that': 'americannewsgroup.com',
  'shopee-ai-cho-nguoi-ban': 'seller.shopee.ph',
  'tiktok-shop-my-black-friday-2026': 'abramark.com.br',
  'tuyen-mau-livestream': 'streamagency.com',
  'san-11st-mc-ai-live-sale-11-11': 'tarreo.com',
  'eu-thu-phi-buu-kien-temu-shein': 'mini-pelle-occasion.fr',
  'viec-lam-mau-livestream': 'bustle.com',
  'tiktok-shop-siet-video-gan-gio-hang': 'bemomentiq.com',
  'nhap-hang-trung-quoc-cuoi-nam-2026': 'zgjtb.com',
};

const dataJs = fs.readFileSync(path.join(root, 'js/data.js'), 'utf8');

for (const [slug, domain] of Object.entries(FIX)) {
  const html = fs.readFileSync(path.join(root, 'bai-viet', slug + '.html'), 'utf8');
  const imgRel = `../images/bai-viet/${slug}.jpg`;
  const imgFull = `https://vieclamlivestream.online/images/bai-viet/${slug}.jpg`;
  check(slug + ': hero-img dung anh that local', html.includes(`<img class="hero-img" src="${imgRel}"`), 'hero src');
  check(slug + ': og:image dung anh that', html.includes(`og:image" content="${imgFull}"`), 'og:image');
  check(slug + ': twitter:image dung anh that', html.includes(`twitter:image" content="${imgFull}"`), 'twitter:image');
  check(slug + ': JSON-LD image dung anh that', html.includes(`"image":${JSON.stringify(imgFull)}`), 'json-ld');
  check(slug + ': figcaption ghi nguon anh ' + domain, html.includes('Nguồn ảnh: ' + domain + '.'), 'caption');
  check(slug + ': khong con anh PNG do hoa trong HTML', !html.includes(`images/bai-viet/${slug}.png`), 'png in html');
  check(slug + ': data.js img dung anh that', dataJs.includes(`"img": "${imgFull}"`) || dataJs.includes(`"img":"${imgFull}"`), 'data.js img');
  const imgPath = path.join(root, 'images/bai-viet', slug + '.jpg');
  check(slug + ': file anh ton tai', fs.existsSync(imgPath), 'missing file');
  if (fs.existsSync(imgPath)) {
    const buf = fs.readFileSync(imgPath);
    check(slug + ': file anh la JPEG that', buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff, 'magic bytes');
    check(slug + ': file anh 10KB-200KB', buf.length > 10 * 1024 && buf.length < 200 * 1024, buf.length + ' bytes');
  }
}
// 6 mau sua co photoHas: anh that da co san, chi lap co.
const FLAG_FIX = ['th-01', 'th-03', 'th-05', 'th-07', 'th-12', 'th-13'];
for (const id of FLAG_FIX) {
  const m = dataJs.match(new RegExp('"id": "' + id + '",[\\s\\S]{0,900}?"photoHas": (true|false)'));
  check(id + ': photoHas=true', !!m && m[1] === 'true', m ? m[1] : 'khong tim thay');
  check(id + ': file anh ton tai', fs.existsSync(path.join(root, 'images', id + '.jpg')), 'missing file');
}
// Toan cuc: chi con 61 bai PNG (76 - 15), khong bai nao trong lo 1 con .png.
const pngImgs = (dataJs.match(/"img":\s*"https:\/\/vieclamlivestream\.online\/images\/bai-viet\/[^"]*\.png"/g) || []).length;
check('data.js: con 61 bai PNG (cho lo 2-5)', pngImgs === 61, pngImgs + ' png img');
const batch1StillPng = Object.keys(FIX).filter(s => dataJs.includes(`images/bai-viet/${s}.png"`)).length;
check('data.js: 0 bai lo 1 con .png', batch1StillPng === 0, batch1StillPng + ' bai');

console.log(`\n${pass} PASS, ${fail} FAIL`);
process.exit(fail ? 1 : 0);
