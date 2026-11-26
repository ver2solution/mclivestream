// test-v287-png-batch4.mjs — PNG batch 4 (26/11/2026):
// 15 bai viet dung anh PNG do hoa chu (infographic/title card) lam anh dai
// dien. Fix: thay bang 1 anh that song dong, tai ve local
// images/bai-viet/<slug>.jpg (<=1200w, q82), ghi nguon anh o figcaption
// (mau v437: "Nguon anh: <domain>."). Mau theo test-v286 (batch 3, PR #130).
// Chay: node tests/test-v287-png-batch4.mjs (tu goc repo).
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
  'shopee-vs-tiktok-shop-song-ma-11-11-2026': 'pexels.com',
    'dinh-doanh-thu-d1-12-11-2026': 'pexels.com',
    'tiktok-shop-my-black-friday-2025-500-trieu-usd-4-ngay': 'pexels.com',
    'live-commerce-han-quoc-47-nghin-ty-won-2025': 'pexels.com',
    'tan-tuyen-kuaishou-double-11-2026-600-trieu-ndt': 'pexels.com',
    'mau-livestream-luong-theo-gio-bang-luong-tin-tuyen-11-11': 'pexels.com',
    'tuyen-mau-livestream-part-time-ha-noi': 'pexels.com',
    'viec-lam-mc-livestream': 'pexels.com',
    'tiktok-shop-dong-bang-hoa-hong-90-ngay-koc-can-biet': 'pexels.com',
    'phi-tiktok-shop-2026-hoa-hong-9-178-phan-tram': 'pexels.com',
    'quang-cao-facebook-live-2026-shop-nho-chay-the-nao': 'pexels.com',
    'ai-livestream-thay-mc-that-shop-nho-co-nen-dung': 'pexels.com',
    'nhap-hang-trung-quoc-cuoi-nam-chot-don-truoc-thang-12': 'pexels.com',
    'livestream-ban-xe-xiaomi-su7-88898-don-24-gio': 'pexels.com',
    'dong-minh-chau-livestream-ban-dieu-hoa-1027-ty-ndt-mot-ngay': 'pexels.com'
};

// slug -> mo ta anh that (og:image:alt + hero alt)
const ALT = {
  'shopee-vs-tiktok-shop-song-ma-11-11-2026': 'Người phụ nữ mua sắm online bằng điện thoại, cầm thẻ tín dụng, bên cạnh nhiều túi mua sắm',
    'dinh-doanh-thu-d1-12-11-2026': 'Các đồng tiền xếp thành biểu đồ tăng trưởng',
    'tiktok-shop-my-black-friday-2025-500-trieu-usd-4-ngay': 'Hai phụ nữ xách túi mua sắm đi trong trung tâm thương mại',
    'live-commerce-han-quoc-47-nghin-ty-won-2025': 'Người dẫn livestream giới thiệu giày bốt trước điện thoại trên tripod có đèn vòng',
    'tan-tuyen-kuaishou-double-11-2026-600-trieu-ndt': 'Chồng thùng carton cao trong kho hàng lớn',
    'mau-livestream-luong-theo-gio-bang-luong-tin-tuyen-11-11': 'Người mẫu livestream chuẩn bị điện thoại trên tripod và đèn vòng tại nhà',
    'tuyen-mau-livestream-part-time-ha-noi': 'Người mẫu trẻ livestream trước điện thoại gắn chân máy',
    'viec-lam-mc-livestream': 'MC chỉnh micro trong studio ghi âm',
    'tiktok-shop-dong-bang-hoa-hong-90-ngay-koc-can-biet': 'KOC quay video đánh giá sản phẩm, có đèn vòng và máy quay',
    'phi-tiktok-shop-2026-hoa-hong-9-178-phan-tram': 'Bàn tay bấm máy tính trên hóa đơn công ty',
    'quang-cao-facebook-live-2026-shop-nho-chay-the-nao': 'Bàn tay cầm điện thoại hiển thị quảng cáo Facebook',
    'ai-livestream-thay-mc-that-shop-nho-co-nen-dung': 'Người đàn ông lớn tuổi uống cà phê, đối diện cánh tay robot',
    'nhap-hang-trung-quoc-cuoi-nam-chot-don-truoc-thang-12': 'Tàu hàng chở container tại cảng',
    'livestream-ban-xe-xiaomi-su7-88898-don-24-gio': 'Xe sedan điện màu đen trong studio, bên cạnh trụ sạc điện treo tường',
    'dong-minh-chau-livestream-ban-dieu-hoa-1027-ty-ndt-mot-ngay': 'Máy điều hòa treo tường trong nội thất hiện đại'
};

// slug -> tieu de bai (figcaption phai ghi dung tieu de cua chinh bai do)
const TITLES = {
  'shopee-vs-tiktok-shop-song-ma-11-11-2026': 'Shopee TikTok Shop 11/11: 74.400 tỷ đấu 70.100 tỷ quý III',
    'dinh-doanh-thu-d1-12-11-2026': 'Đỉnh doanh thu D+1 12/11: 913,4 tỷ chỉ là mốc của năm 2025',
    'tiktok-shop-my-black-friday-2025-500-trieu-usd-4-ngay': '500 triệu USD trong 4 ngày: TikTok Shop Mỹ Black Friday',
    'live-commerce-han-quoc-47-nghin-ty-won-2025': '4,7 nghìn tỷ won: live commerce Hàn Quốc tăng 35% năm 2025',
    'tan-tuyen-kuaishou-double-11-2026-600-trieu-ndt': '600 triệu NDT trong 5 phiên: Tân Tuyển Double 11 Kuaishou',
    'mau-livestream-luong-theo-gio-bang-luong-tin-tuyen-11-11': 'Mẫu livestream lương theo giờ: bảng lương từ tin tuyển thật',
    'tuyen-mau-livestream-part-time-ha-noi': 'Tuyển mẫu livestream part time Hà Nội: lương, ca làm 2026',
    'viec-lam-mc-livestream': 'Việc làm MC livestream: lương, kỹ năng và lộ trình vào nghề',
    'tiktok-shop-dong-bang-hoa-hong-90-ngay-koc-can-biet': 'TikTok Shop đóng băng hoa hồng 90 ngày: KOC cần biết gì?',
    'phi-tiktok-shop-2026-hoa-hong-9-178-phan-tram': 'Phí TikTok Shop 2026: hoa hồng 9–17,8% và phí giao dịch 6%',
    'quang-cao-facebook-live-2026-shop-nho-chay-the-nao': 'Quảng cáo Facebook Live 2026: shop nhỏ chạy thế nào cho rẻ?',
    'ai-livestream-thay-mc-that-shop-nho-co-nen-dung': 'AI livestream bán hàng thay MC thật: shop nhỏ nên dùng?',
    'nhap-hang-trung-quoc-cuoi-nam-chot-don-truoc-thang-12': 'Nhập hàng Trung Quốc cuối năm: chốt đơn sớm trước tháng 12',
    'livestream-ban-xe-xiaomi-su7-88898-don-24-gio': '88.898 đơn 24 giờ: livestream bán xe Xiaomi SU7 làm sao?',
    'dong-minh-chau-livestream-ban-dieu-hoa-1027-ty-ndt-mot-ngay': '36.000 tỷ đồng 1 ngày: Đổng Minh Châu bán điện máy live'
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
  check(slug + ': figcaption dung tieu de bai', html.includes('Ảnh: Pexels — ' + TITLES[slug]), 'caption title');
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
// Toan cuc: chi con 16 bai PNG (31 - 15), khong bai nao trong lo 4 con .png.
const pngImgs = (dataJs.match(/"img":\s*"https:\/\/vieclamlivestream\.online\/images\/bai-viet\/[^"]*\.png"/g) || []).length;
check('data.js: con 16 bai PNG (cho lo 5)', pngImgs === 16, pngImgs + ' png img');
const batch4StillPng = Object.keys(FIX).filter(s => dataJs.includes(`images/bai-viet/${s}.png"`)).length;
check('data.js: 0 bai lo 4 con .png', batch4StillPng === 0, batch4StillPng + ' bai');

console.log(`\n${pass} PASS, ${fail} FAIL`);
process.exit(fail ? 1 : 0);
