// test-v288-png-batch5.mjs — PNG batch 5 (26/11/2026):
// 16 bai viet dung anh PNG do hoa chu (infographic/title card) lam anh dai
// dien. Fix: thay bang 1 anh that song dong, tai ve local
// images/bai-viet/<slug>.jpg (<=1200w, q82), ghi nguon anh o figcaption
// (mau v437: "Nguon anh: <domain>."). Mau theo test-v287 (batch 4, PR #131).
// Chay: node tests/test-v288-png-batch5.mjs (tu goc repo).
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
  'shopee-live-indonesia-erigo-raffi-ahmad-305000-usd-10-phut': 'pexels.com',
    'khairul-aming-43-trieu-rm-mot-phien-live-tiktok-shop-malaysia': 'pexels.com',
    'amazon-prime-day-2025-241-ty-usd-4-ngay-live-ban-hang': 'pexels.com',
    'tieu-duong-ca-douyin-100-trieu-ndt-mot-dem': 'pexels.com',
    'simba-kuaishou-1427-ty-ndt-phien-mo-man-618': 'pexels.com',
    'lai-suat-ty-gia-dau-tu-cong-anh-huong-shop-nho-2026': 'pexels.com',
    'du-lich-thang-12-mau-livestream-nghi-sau-mua-sale': 'pexels.com',
    'mua-sam-qua-video-ngan-social-commerce-tang-manh-2026': 'pexels.com',
    'mami-louisse-1-trieu-usd-1-ngay-koc-indonesia-ban-my-pham': 'pexels.com',
    'nong-dan-son-dong-80000-don-dao-livestream-nong-san': 'pexels.com',
    'thuong-hieu-viet-tiktok-shop-my-151-ty-usd-xuyen-bien-gioi': 'pexels.com',
    'tiktok-shop-100-ngay-toi-tet-2027-shop-nho-lam-gi': 'pexels.com',
    'mo-neo-gia-livestream-tam-ly-khach-chot-don': 'pexels.com',
    'thi-truong-livestream-viet-nam-q4-2026-shopee-tiktok-shop': 'pexels.com',
    'tinh-nao-dang-can-lo-xa-kho-thoi-trang-nhat': 'pexels.com',
    'dong-tien-11-11-nguoi-viet-mua-gi-sau-sale': 'pexels.com'
};

// slug -> mo ta anh that (og:image:alt + hero alt)
const ALT = {
  'shopee-live-indonesia-erigo-raffi-ahmad-305000-usd-10-phut': 'Người phụ nữ giơ váy xanh giới thiệu trước điện thoại đang quay, phía sau là giá treo quần áo',
    'khairul-aming-43-trieu-rm-mot-phien-live-tiktok-shop-malaysia': 'Người đàn ông cười cầm quả bí ngòi quay vlog nấu ăn trong bếp, máy quay ở tiền cảnh',
    'amazon-prime-day-2025-241-ty-usd-4-ngay-live-ban-hang': 'Thùng carton xếp trước cửa kho hàng',
    'tieu-duong-ca-douyin-100-trieu-ndt-mot-dem': 'Người phụ nữ làm việc với laptop bên đèn ring light, phía sau là giá treo quần áo',
    'simba-kuaishou-1427-ty-ndt-phien-mo-man-618': 'Người phụ nữ ngồi trên sofa giơ túi xách vàng giới thiệu trước máy quay',
    'lai-suat-ty-gia-dau-tu-cong-anh-huong-shop-nho-2026': 'Nhiều tờ tiền giấy các nước xếp xen kẽ chụp từ trên xuống',
    'du-lich-thang-12-mau-livestream-nghi-sau-mua-sale': 'Vali nâu kiểu cổ đặt trên bãi cát ven biển',
    'mua-sam-qua-video-ngan-social-commerce-tang-manh-2026': 'Người phụ nữ dùng điện thoại, tay cầm mảnh vải cạnh giá treo quần áo',
    'mami-louisse-1-trieu-usd-1-ngay-koc-indonesia-ban-my-pham': 'Các tuýp mỹ phẩm không nhãn hiệu và cọ trang điểm trên nền trắng',
    'nong-dan-son-dong-80000-don-dao-livestream-nong-san': 'Những quả đào chín mọng trên cành trong vườn',
    'thuong-hieu-viet-tiktok-shop-my-151-ty-usd-xuyen-bien-gioi': 'Tàu chở hàng lớn chất đầy container trên biển lúc hoàng hôn',
    'tiktok-shop-100-ngay-toi-tet-2027-shop-nho-lam-gi': 'Hoa đào hồng nở trên cành',
    'mo-neo-gia-livestream-tam-ly-khach-chot-don': 'Thẻ giá trắng trống trên nền đen',
    'thi-truong-livestream-viet-nam-q4-2026-shopee-tiktok-shop': 'Người phụ nữ châu Á livestream bằng điện thoại gắn trên tripod trong nhà',
    'tinh-nao-dang-can-lo-xa-kho-thoi-trang-nhat': 'Hai bàn tay chọn áo len nhiều màu treo trên giá quần áo',
    'dong-tien-11-11-nguoi-viet-mua-gi-sau-sale': 'Người phụ nữ mặc áo khoác nâu cầm nhiều túi giấy mua sắm trên phố'
};

// slug -> tieu de bai (figcaption phai ghi dung tieu de cua chinh bai do)
const TITLES = {
  'shopee-live-indonesia-erigo-raffi-ahmad-305000-usd-10-phut': '7,3 tỷ đồng trong 10 phút: Shopee Live Indonesia bán sạch',
    'khairul-aming-43-trieu-rm-mot-phien-live-tiktok-shop-malaysia': '26,7 tỷ đồng một phiên live: Khairul Aming lập kỷ lục mới',
    'amazon-prime-day-2025-241-ty-usd-4-ngay-live-ban-hang': '632.000 tỷ đồng 4 ngày: Amazon Prime Day 2025 kỷ lục mới',
    'tieu-duong-ca-douyin-100-trieu-ndt-mot-dem': '360 tỷ đồng một đêm: Tiểu Dương Ca Douyin bán gì mà hot?',
    'simba-kuaishou-1427-ty-ndt-phien-mo-man-618': '5.100 tỷ đồng một phiên: Simba Kuaishou mở màn 618 ra sao',
    'lai-suat-ty-gia-dau-tu-cong-anh-huong-shop-nho-2026': 'Lãi suất tỷ giá shop nhỏ: Fed giữ nguyên, túi tiền ra sao?',
    'du-lich-thang-12-mau-livestream-nghi-sau-mua-sale': 'Du lịch tháng 12: mẫu livestream nghỉ đâu sau mùa sale?',
    'mua-sam-qua-video-ngan-social-commerce-tang-manh-2026': 'Mua sắm qua video ngắn: 586 tỷ USD, cơ hội cho shop nhỏ',
    'mami-louisse-1-trieu-usd-1-ngay-koc-indonesia-ban-my-pham': '26 tỷ đồng 1 ngày: KOC Indonesia Mami Louisse bán mỹ phẩm',
    'nong-dan-son-dong-80000-don-dao-livestream-nong-san': '80.000 đơn đào 1 mùa: nông dân Sơn Đông livestream nông sản',
    'thuong-hieu-viet-tiktok-shop-my-151-ty-usd-xuyen-bien-gioi': '15,1 tỷ USD: thương hiệu Việt bán qua TikTok Shop Mỹ',
    'tiktok-shop-100-ngay-toi-tet-2027-shop-nho-lam-gi': 'TikTok Shop 100 ngày tới Tết: shop nhỏ làm gì từng chặng',
    'mo-neo-gia-livestream-tam-ly-khach-chot-don': 'Mỏ neo giá livestream: đặt giá sao cho khách chốt đơn ngay',
    'thi-truong-livestream-viet-nam-q4-2026-shopee-tiktok-shop': '74.400 tỷ: thị trường livestream Việt Nam Q4/2026 ra sao',
    'tinh-nao-dang-can-lo-xa-kho-thoi-trang-nhat': 'Lô xả kho thời trang tỉnh nào cần nhất: 112 tin tuyển TP.HCM',
    'dong-tien-11-11-nguoi-viet-mua-gi-sau-sale': '913,4 tỷ 1 ngày: dòng tiền 11/11 người Việt mua gì sau sale'
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
// Toan cuc: chi con 0 bai PNG (16 - 16), khong bai nao trong lo 5 con .png.
const pngImgs = (dataJs.match(/"img":\s*"https:\/\/vieclamlivestream\.online\/images\/bai-viet\/[^"]*\.png"/g) || []).length;
check('data.js: con 0 bai PNG (het)', pngImgs === 0, pngImgs + ' png img');
const batch5StillPng = Object.keys(FIX).filter(s => dataJs.includes(`images/bai-viet/${s}.png"`)).length;
check('data.js: 0 bai lo 5 con .png', batch5StillPng === 0, batch5StillPng + ' bai');

console.log(`\n${pass} PASS, ${fail} FAIL`);
process.exit(fail ? 1 : 0);
