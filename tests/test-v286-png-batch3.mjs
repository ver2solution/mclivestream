// test-v286-png-batch3.mjs — PNG batch 3 (26/11/2026):
// 15 bai viet dung anh PNG do hoa chu (infographic/title card) lam anh dai
// dien. Fix: thay bang 1 anh that song dong, tai ve local
// images/bai-viet/<slug>.jpg (<=1200w, q82), ghi nguon anh o figcaption
// (mau v437: "Nguon anh: <domain>."). Mau theo test-v285 (batch 2, PR #129).
// Chay: node tests/test-v286-png-batch3.mjs (tu goc repo).
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
  'shop-nho-giu-tien-mua-11-11-tien-ve-khi-nao': 'pexels.com',
    'gia-vang-hom-nay-11-11-2026-sjc-140-9-trieu': 'pexels.com',
    'phi-san-shopee-tiktok-shop-lazada-thang-11-2026': 'pexels.com',
    'tiktok-shop-vs-shopee-cuoi-2026-shop-nho-chon-san-nao': 'pexels.com',
    'fomo-khach-chot-don-trong-live-3-nghien-cuu-moi': 'pexels.com',
    'mat-hang-tiem-nang-ban-livestream-tet-2027': 'pexels.com',
    'thue-mau-livestream-gia-bao-nhieu-1-gio-theo-tinh': 'pexels.com',
    'thue-mau-livestream-lan-dau-5-sai-lam-live-flop': 'pexels.com',
    'mc-ai-live-24-7-hon-100000-shop-tq-da-dung': 'pexels.com',
    'mat-hang-nao-noi-nhat-mua-11-11-bach-hoa-tang-806-phan-tram': 'pexels.com',
    'lazada-11-11-2026-live-9-tieng-voucher-11-trieu-shop-nho-lam-gi': 'pexels.com',
    'tong-ket-double-11-viet-nam-d1-12-11-dinh-doanh-thu': 'pexels.com',
    'vo-ha-linh-237-ty-so-voi-phien-11-11-2026': 'pexels.com',
    'ly-giai-ky-toi-11-11-taobao-live-2026': 'pexels.com',
    'dong-vu-huy-double-11-2026-mo-hinh-sieu-ca-the': 'pexels.com'
};

// slug -> mo ta anh that (og:image:alt + hero alt)
const ALT = {
  'shop-nho-giu-tien-mua-11-11-tien-ve-khi-nao': 'Người đếm tiền mặt trên bàn, bên cạnh laptop và máy tính',
    'gia-vang-hom-nay-11-11-2026-sjc-140-9-trieu': 'Quầy trang sức vàng trong tiệm vàng, dây chuyền và vòng tay vàng xếp san sát',
    'phi-san-shopee-tiktok-shop-lazada-thang-11-2026': 'Người dùng điện thoại quét mã vạch trên các gói hàng',
    'tiktok-shop-vs-shopee-cuoi-2026-shop-nho-chon-san-nao': 'Phụ nữ xem app mua sắm trên điện thoại, tay cầm thẻ ngân hàng',
    'fomo-khach-chot-don-trong-live-3-nghien-cuu-moi': 'Điện thoại đang phát phiên livestream có nhãn LIVE với người dẫn hào hứng',
    'mat-hang-tiem-nang-ban-livestream-tet-2027': 'Quầy hàng Tết rực rỡ với hoa đào hồng, hoa mai vàng, lồng đèn đỏ và giỏ quà trang trí',
    'thue-mau-livestream-gia-bao-nhieu-1-gio-theo-tinh': 'Điện thoại gắn tripod đang quay nữ mẫu giơ váy hồng, bên cạnh đèn ring light đang sáng',
    'thue-mau-livestream-lan-dau-5-sai-lam-live-flop': 'Phụ nữ ngồi trên sàn quay vlog thời trang trước điện thoại gắn tripod, vẻ mặt lúng túng',
    'mc-ai-live-24-7-hon-100000-shop-tq-da-dung': 'Robot hình người với khuôn mặt là màn hình số hiển thị dữ liệu',
    'mat-hang-nao-noi-nhat-mua-11-11-bach-hoa-tang-806-phan-tram': 'Giỏ hàng đầy gói hàng tạp hóa trong lối đi siêu thị với kệ hàng hai bên',
    'lazada-11-11-2026-live-9-tieng-voucher-11-trieu-shop-nho-lam-gi': 'Phụ nữ châu Á cười tươi livestream bán hàng trước điện thoại gắn tripod, tay cầm lon nước',
    'tong-ket-double-11-viet-nam-d1-12-11-dinh-doanh-thu': 'Hai người đóng gói đơn hàng online với thùng carton dán mã vạch, laptop và băng keo',
    'vo-ha-linh-237-ty-so-voi-phien-11-11-2026': 'Phụ nữ châu Á tô son đỏ trước điện thoại gắn tripod trong phiên live makeup',
    'ly-giai-ky-toi-11-11-taobao-live-2026': 'Nam giới trang điểm trước gương với bảng phấn mắt, son môi và cọ trên bàn',
    'dong-vu-huy-double-11-2026-mo-hinh-sieu-ca-the': 'Nam đầu bếp đeo tạp dề nấu ăn trong bếp hiện đại với nồi inox trên bếp và chảo treo phía sau'
};

// slug -> tieu de bai (figcaption phai ghi dung tieu de cua chinh bai do)
const TITLES = {
  'shop-nho-giu-tien-mua-11-11-tien-ve-khi-nao': 'Shop nhỏ giữ tiền 11.11: tiền về khi nào, giữ bao nhiêu?',
    'gia-vang-hom-nay-11-11-2026-sjc-140-9-trieu': 'Giá vàng 11/11: SJC 140,9 triệu, tiền khách chảy đi đâu?',
    'phi-san-shopee-tiktok-shop-lazada-thang-11-2026': 'Phí sàn Shopee, TikTok Shop, Lazada 11/2026: bảng mới nhất',
    'tiktok-shop-vs-shopee-cuoi-2026-shop-nho-chon-san-nao': 'TikTok Shop vs Shopee cuối 2026: shop nhỏ chọn sàn nào?',
    'fomo-khach-chot-don-trong-live-3-nghien-cuu-moi': 'FOMO khiến khách chốt đơn trong live: 3 nghiên cứu nói gì',
    'mat-hang-tiem-nang-ban-livestream-tet-2027': 'Mặt hàng nào còn tiềm năng bán livestream dịp Tết 2027?',
    'thue-mau-livestream-gia-bao-nhieu-1-gio-theo-tinh': 'Thuê mẫu livestream giá bao nhiêu 1 giờ? Bảng theo tỉnh 2026',
    'thue-mau-livestream-lan-dau-5-sai-lam-live-flop': 'Thuê mẫu livestream lần đầu: 5 sai lầm khiến live đầu flop',
    'mc-ai-live-24-7-hon-100000-shop-tq-da-dung': 'MC AI live 24/7: hơn 100.000 shop TQ dùng, shop Việt học gì',
    'mat-hang-nao-noi-nhat-mua-11-11-bach-hoa-tang-806-phan-tram': 'Mặt hàng nổi nhất mùa 11.11: bách hóa tăng 80,6%, nhập gì?',
    'lazada-11-11-2026-live-9-tieng-voucher-11-trieu-shop-nho-lam-gi': 'Lazada 11.11 hôm nay: live 9 tiếng, voucher 11 triệu đồng',
    'tong-ket-double-11-viet-nam-d1-12-11-dinh-doanh-thu': 'Double 11 Việt Nam 2026: đỉnh doanh thu D+1 rơi vào 12/11',
    'vo-ha-linh-237-ty-so-voi-phien-11-11-2026': 'Võ Hà Linh 237 tỷ: phiên 11/11/2026 có phá kỷ lục không?',
    'ly-giai-ky-toi-11-11-taobao-live-2026': 'Lý Giai Kỳ 11/11: nửa giờ bán 2.000 tỷ Token AI trong live',
    'dong-vu-huy-double-11-2026-mo-hinh-sieu-ca-the': 'Đổng Vũ Huy Double 11: 679 triệu NDT gia dụng trong 3 ngày'
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
// Toan cuc: chi con 31 bai PNG (46 - 15), khong bai nao trong lo 3 con .png.
const pngImgs = (dataJs.match(/"img":\s*"https:\/\/vieclamlivestream\.online\/images\/bai-viet\/[^"]*\.png"/g) || []).length;
check('data.js: con 31 bai PNG (cho lo 4-5)', pngImgs === 31, pngImgs + ' png img');
const batch3StillPng = Object.keys(FIX).filter(s => dataJs.includes(`images/bai-viet/${s}.png"`)).length;
check('data.js: 0 bai lo 3 con .png', batch3StillPng === 0, batch3StillPng + ' bai');

console.log(`\n${pass} PASS, ${fail} FAIL`);
process.exit(fail ? 1 : 0);
