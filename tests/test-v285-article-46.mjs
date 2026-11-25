// test-v285-article-46.mjs — Bài #46: cach-livestream-ban-hang-hieu-qua-cho-shop-moi
// (#46 khung chat chung: bài được link tới nhưng 404, không tồn tại ở đâu — VIẾT MỚI.
// Chạy: node tests/test-v285-article-46.mjs (từ gốc repo hoặc gốc stage).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const slug = 'cach-livestream-ban-hang-hieu-qua-cho-shop-moi';
const url = `https://vieclamlivestream.online/bai-viet/${slug}.html`;
const imgFull = `https://vieclamlivestream.online/images/bai-viet/${slug}.jpg`;
let pass = 0, fail = 0;
function check(name, ok, extra) {
  if (ok) { pass++; console.log('PASS ' + name); }
  else { fail++; console.log('FAIL ' + name + (extra !== undefined ? ' — ' + extra : '')); }
}

const htmlPath = path.join(root, 'bai-viet', slug + '.html');
check('HTML ton tai', fs.existsSync(htmlPath));
const html = fs.readFileSync(htmlPath, 'utf8');

const title = (html.match(/<title>(.*?) — vieclamlivestream\.online<\/title>/) || [])[1] || '';
check('tieu de <=60 ky tu', title.length > 0 && title.length <= 60, title.length + ' ky tu: ' + title);
const desc = (html.match(/<meta name="description" content="([^"]*)">/) || [])[1] || '';
check('mo ta 120-160 ky tu', desc.length >= 120 && desc.length <= 160, desc.length + ' ky tu');
check('mo ta == lead', html.includes(`<p class="article-lead" itemprop="description">${desc}</p>`));
check('canonical dung slug', html.includes(`<link rel="canonical" href="${url}">`));
check('og:url dung slug', html.includes(`og:url" content="${url}"`));
check('og:image la anh that .jpg', html.includes(`og:image" content="${imgFull}"`));
check('og:image 1200x630', html.includes('og:image:width" content="1200"') && html.includes('og:image:height" content="630"'));
check('twitter:image la anh that .jpg', html.includes(`twitter:image" content="${imgFull}"`));
check('JSON-LD image la anh that .jpg', html.includes(`"image":"${imgFull}"`));
check('hero-img dung anh that local', html.includes(`<img class="hero-img" src="../images/bai-viet/${slug}.jpg"`));
check('figcaption ghi nguon beartai.com', html.includes('Nguồn ảnh: beartai.com.'));
check('khong dung logo lam anh dai dien', !html.includes('og:image" content="https://vieclamlivestream.online/logo') && !html.includes('hero-img" src="https://vieclamlivestream.online/logo'));
check('KHONG co khoi game-entry (luat #74)', !html.includes('game-entry'));
const sig = (html.match(/<div class="article-sig">([\s\S]*?)<\/div>/) || [])[1] || '';
check('chu ky dung 2 dong', (sig.match(/<span>/g) || []).length === 2, (sig.match(/<span>/g) || []).length + ' dong');
check('chu ky dong 1 co link web', sig.includes('Theo vieclamlivestream.online:'));
check('chu ky dong 2 co Zalo', sig.includes('Zalo 032 998 3699'));
for (const s of ['meo-livestream-chot-don-xa-kho-truoc-black-friday', 'cach-noi-chuyen-khi-livestream-ban-hang-6-cau-chot-don', 'livestream-ban-quan-ao-nam-tang-46-nu-102-trieu-usd']) {
  check('bai cung chuyen muc ton tai: ' + s, fs.existsSync(path.join(root, 'bai-viet', s + '.html')));
}
for (const s of ['3-giay-dau-quyet-dinh-nguoi-xem-o-lai-hay-thoat-cach-mc-mo-dau-phien-live', 'checklist-truoc-gio-live-am-thanh-anh-sang-kich-ban-va-chot-don', 'tuyen-mau-live-thoi-trang-mo-ta-cong-viec-lich-lam-va-cach-ung-tuyen-dung-nghe']) {
  check('link trong bai ton tai: ' + s, html.includes(`bai-viet/${s}.html`) && fs.existsSync(path.join(root, 'bai-viet', s + '.html')));
}
const body = (html.match(/<div class="article-body">([\s\S]*?)<\/div>\s*<p style="margin-top:20px">/) || [])[1] || '';
const bodyText = body.replace(/<[^>]+>/g, '');
check('noi dung 200-30000 ky tu', bodyText.length >= 200 && bodyText.length <= 30000, bodyText.length + ' ky tu');
check('noi dung co 7 buoc + 5 loi + checklist', body.includes('7 bước chuẩn bị') && body.includes('5 lỗi shop mới') && body.includes('Checklist 10 phút'));
check('so lieu case dung (237/58/100 ty)', body.includes('237 tỷ') && body.includes('58 tỷ') && body.includes('100 tỷ'));

const imgPath = path.join(root, 'images/bai-viet', slug + '.jpg');
check('file anh ton tai', fs.existsSync(imgPath), 'missing file');
if (fs.existsSync(imgPath)) {
  const buf = fs.readFileSync(imgPath);
  check('file anh la JPEG that', buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff, 'magic bytes');
  check('file anh 10KB-200KB', buf.length > 10 * 1024 && buf.length < 200 * 1024, buf.length + ' bytes');
}

const dataJs = fs.readFileSync(path.join(root, 'js/data.js'), 'utf8');
const pageCount = (dataJs.match(new RegExp(`"page": "bai-viet/${slug}\\.html"`, 'g')) || []).length;
check('data.js: bai #46 chi co 1 lan', pageCount === 1, pageCount + ' lan');
check('data.js: cat Livestream', /"title": "Cách livestream bán hàng hiệu quả cho shop mới",\n   "cat": "Livestream"/.test(dataJs));
check('data.js: img la anh that .jpg', dataJs.includes(`"img": "${imgFull}"`));
check('data.js: takeaway == mo ta', dataJs.includes(`"takeaway": "${desc}"`));

console.log(`\n${pass} PASS, ${fail} FAIL`);
process.exit(fail ? 1 : 0);
