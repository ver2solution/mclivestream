// test-v285-png-batch2.mjs — PNG batch 2 (26/11/2026):
// 15 bai viet dung anh PNG do hoa chu (infographic/title card) lam anh dai
// dien. Fix: thay bang 1 anh that song dong, tai ve local
// images/bai-viet/<slug>.jpg (<=1200w, q82), ghi nguon anh o figcaption
// (mau v437: "Nguon anh: <domain>."). Mau theo test-v284 (batch 1, PR #119).
// Chay: node tests/test-v285-png-batch2.mjs (tu goc repo).
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
  'tiktok-shop-dong-bang-hoa-hong-90-ngay-vi-pham-so-huu-tri-tue': 'pexels.com',
    'shopee-giam-phi-tiktok-shop-tang-hoa-hong-bang-phi-theo-nganh': 'Doanh nhân & Pháp luật',
    'gia-nai-luong-livestream-570-trieu-ndt-13-tieng': 'pexels.com',
    'shopee-live-video-tet-2026-16-ty-luot-xem': 'Doanh nhân & Pháp luật',
    'mau-livestream': 'unsplash.com',
    '5-prompt-ai-viet-mo-ta-kich-ban-live-tra-loi-khach': 'pexels.com',
    'facebook-bo-reach-thay-viewers-31-10-shop-nho-can-biet': 'pexels.com',
    'gioi-thieu-vieclamlivestream-online': 'pexels.com',
    'tuyen-idol-livestream': 'pexels.com',
    'tam-ly-hoc-tieu-dung-vi-sao-khach-mua-ngay-trong-live': 'pexels.com',
    'tinh-nao-can-lo-xa-kho-thoi-trang-nhat': 'pexels.com',
    'tuyen-streamer-game': 'pexels.com',
    'sinh-vien-kiem-6-con-so-nho-tiktok-shop-talon-krebs': 'Business Insider',
    'shopee-live-video-tang-don-52-phan-tram-video-ngan-dan-ve-live': 'pexels.com',
    'tiktok-shop-11-11-2026-viet-nam-ban-3-15-11': 'pexels.com'
};

// slug -> mo ta anh that (og:image:alt + hero alt)
const ALT = {
  'tiktok-shop-dong-bang-hoa-hong-90-ngay-vi-pham-so-huu-tri-tue': 'Tay cầm điện thoại, ngón tay chạm vào biểu tượng TikTok',
    'shopee-giam-phi-tiktok-shop-tang-hoa-hong-bang-phi-theo-nganh': 'Tay cầm điện thoại hiện logo TikTok, nền logo Shopee',
    'gia-nai-luong-livestream-570-trieu-ndt-13-tieng': 'Nữ streamer trẻ cầm điện thoại quay selfie, giơ áo hồng giới thiệu sản phẩm',
    'shopee-live-video-tet-2026-16-ty-luot-xem': 'Điện thoại livestream trước màn hình mèo thần tài Tết',
    'mau-livestream': 'Nữ mẫu giơ áo sơ mi kẻ caro trước camera trên tripod trong studio',
    '5-prompt-ai-viet-mo-ta-kich-ban-live-tra-loi-khach': 'Người đàn ông gõ laptop, màn hình hiện giao diện ChatGPT',
    'facebook-bo-reach-thay-viewers-31-10-shop-nho-can-biet': 'Tay cầm điện thoại, thư mục ứng dụng mạng xã hội hiện biểu tượng Facebook',
    'gioi-thieu-vieclamlivestream-online': 'Nữ livestreamer ngồi trước bàn có laptop, micro và điện thoại gắn tripod',
    'tuyen-idol-livestream': 'Cô gái trẻ đeo kính râm ngồi trước ring light và điện thoại, phía sau là giá quần áo',
    'tam-ly-hoc-tieu-dung-vi-sao-khach-mua-ngay-trong-live': 'Người phụ nữ mỉm cười trên sofa, tay cầm điện thoại và thẻ ngân hàng khi mua sắm online',
    'tinh-nao-can-lo-xa-kho-thoi-trang-nhat': 'Nhiều áo sơ mi, áo len và quần đủ màu treo san sát trên các giá trong kho thời trang',
    'tuyen-streamer-game': 'Nam game thủ đeo tai nghe quanh cổ, ngồi trước màn hình game, tay cầm điện thoại',
    'sinh-vien-kiem-6-con-so-nho-tiktok-shop-talon-krebs': 'Sinh viên Talon Krebs selfie trong phòng quay với đèn ring light và hộp sản phẩm',
    'shopee-live-video-tang-don-52-phan-tram-video-ngan-dan-ve-live': 'Hai tay cầm điện thoại đang quay video ngắn một cô gái giơ váy xanh trong shop thời trang',
    'tiktok-shop-11-11-2026-viet-nam-ban-3-15-11': 'Laptop mở trang mua sắm online, xung quanh là túi giấy và hộp gói hàng trên ghế sofa'
};

const dataJs = fs.readFileSync(path.join(root, 'js/data.js'), 'utf8');

for (const [slug, domain] of Object.entries(FIX)) {
  const html = fs.readFileSync(path.join(root, 'bai-viet', slug + '.html'), 'utf8');
  const imgRel = `../images/bai-viet/${slug}.jpg`;
  const imgFull = `https://vieclamlivestream.online/images/bai-viet/${slug}.jpg`;
  check(slug + ': hero-img dung anh that local', html.includes(`<img class="hero-img" src="${imgRel}"`), 'hero src');
  check(slug + ': og:image dung anh that', html.includes(`og:image" content="${imgFull}"`), 'og:image');
  check(slug + ': og:image:alt mo ta anh that', html.includes(`og:image:alt" content="${ALT[slug]}"`), 'og:image:alt');
  check(slug + ': twitter:image dung anh that', html.includes(`twitter:image" content="${imgFull}"`), 'twitter:image');
  check(slug + ': JSON-LD image dung anh that', html.includes(`"image":${JSON.stringify(imgFull)}`), 'json-ld');
  check(slug + ': figcaption ghi nguon anh ' + domain, html.includes('Nguồn ảnh: ' + domain + '.'), 'caption');
  check(slug + ': khong con anh PNG do hoa trong HTML', !html.includes(`images/bai-viet/${slug}.png`), 'png in html');
  check(slug + ': data.js img dung anh that', dataJs.includes(`"img": "${imgFull}"`), 'data.js img');
  const imgPath = path.join(root, 'images/bai-viet', slug + '.jpg');
  check(slug + ': file anh ton tai', fs.existsSync(imgPath), 'missing file');
  if (fs.existsSync(imgPath)) {
    const buf = fs.readFileSync(imgPath);
    check(slug + ': file anh la JPEG that', buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff, 'magic bytes');
    check(slug + ': file anh 10KB-200KB', buf.length > 10 * 1024 && buf.length < 200 * 1024, buf.length + ' bytes');
  }
}
// Toan cuc: chi con 46 bai PNG (61 - 15), khong bai nao trong lo 2 con .png.
const pngImgs = (dataJs.match(/"img":\s*"https:\/\/vieclamlivestream\.online\/images\/bai-viet\/[^"]*\.png"/g) || []).length;
check('data.js: con 46 bai PNG (cho lo 3-5)', pngImgs === 46, pngImgs + ' png img');
const batch2StillPng = Object.keys(FIX).filter(s => dataJs.includes(`images/bai-viet/${s}.png"`)).length;
check('data.js: 0 bai lo 2 con .png', batch2StillPng === 0, batch2StillPng + ' bai');

console.log(`\n${pass} PASS, ${fail} FAIL`);
process.exit(fail ? 1 : 0);
