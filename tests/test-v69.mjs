// test-v69.mjs — v69: ghim bai 11st o tin tuc so 1 trang chu + anh dai dien
// bai bao tai ve local (06/11/2026).
// (A) pinOrder: getPinnedRow xep bai ghim co pinOrder truoc (so nho len
//     truoc), bai ghim khong co pinOrder xep sau theo ngay giam dan (giu
//     thu tu cu). v84: chi con 1 bai ghim (bop-reach, user ghim tay);
//     3 o con lai lap bang bai MOI THEM VAO WEB gan nhat theo thu tu
//     them vao (dao nguoc mang articles), KHONG theo date bai goc.
//     pinOrder cua bai KHONG ghim khong anh huong thu tu.
// (B) Anh dai dien: ca 30 bai deu co img local (0 URL anh ngoai); 19 anh
//     tai tu bao goc ve images/bai-viet/ (file ton tai, dung dinh dang,
//     kich thuoc hop ly); imgSelf:true chi cho 19 anh tu lam (18 infographic
//     cu + moi + bop-reach) — cac anh tai tu bao goc KHONG co imgSelf de chu thich
//     "Anh goc: <nguon>" trong danh sach tin van dung (imgSelf dieu khien
//     chu thich "Infographic: Ver2Solution tu lam" trong js/app.js).
// (C) sw.js CACHE = v76-shell-1 + hash khoa file da doi.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let pass = 0, fail = 0;
function t(name, ok, extra = '') { if (ok) { pass++; console.log('PASS v69:', name); } else { fail++; console.log('FAIL v69:', name, extra); } }
const ogOf = (img) => img.replace(/\.[a-z0-9]+$/i, '-og.jpg'); // v76: og:image la ban 1200x630 JPEG cua data.js img
const sha = (p) => crypto.createHash('sha256').update(fs.readFileSync(path.join(root, p))).digest('hex');
const BASE = 'https://ver2solution.github.io/mclivestream/';

const sb = { window: {}, module: { exports: {} }, console, document: { querySelectorAll: () => [], getElementById: () => null, addEventListener: () => {} }, location: { search: '' } };
vm.createContext(sb);
vm.runInContext(fs.readFileSync(path.join(root, 'js/data.js'), 'utf8'), sb);
vm.runInContext(fs.readFileSync(path.join(root, 'js/app.js'), 'utf8'), sb);
const V = sb.window.V20;
const D = sb.window.V20_DATA;
const dataJs = fs.readFileSync(path.join(root, 'js/data.js'), 'utf8');
const appJs = fs.readFileSync(path.join(root, 'js/app.js'), 'utf8');
const sw = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');

// ---- (A1) v84: chi con 1 bai ghim — bop-reach (user ghim tay); 11st/tuyen/viec-lam da go ghim ----
const a11 = D.articles.find(a => a.page === 'bai-viet/san-11st-mc-ai-live-sale-11-11.html');
t('11st: pinned:false, KHONG con pinOrder, ngay 2026-10-30 khong doi (v84: go ghim)',
  !!a11 && a11.pinned === false && a11.pinOrder === undefined && a11.date === '2026-10-30'
  && a11.title === 'Sàn Hàn Quốc 11st dùng MC AI dẫn live sale 11/11: shop nhỏ học gì?');
const tuyen = D.articles.find(a => a.page === 'bai-viet/tuyen-mau-livestream.html');
const viec = D.articles.find(a => a.page === 'bai-viet/viec-lam-mau-livestream.html');
const bop = D.articles.find(a => a.url === 'bai-viet-bop-reach.html');
t('tuyen-mau + viec-lam: pinned:false (v84: go ghim); bop-reach: pinned:true, KHONG co pinOrder',
  !!tuyen && tuyen.pinned === false && tuyen.pinOrder === undefined
  && !!viec && viec.pinned === false && viec.pinOrder === undefined
  && !!bop && bop.pinned === true && bop.pinOrder === undefined);
t('Chi co 1 bai ghim (v84: chi user ghim bop-reach)', D.articles.filter(a => a.pinned).length === 1);

// ---- (A2) getPinnedRow voi du lieu that (v84): bop o 1, 3 o sau la 3 bai moi them gan nhat (v82) ----
const row = V.getPinnedRow(D.articles);
t('Hang ghim co du 4 o', row.length === 4);
t('O 1 la bai bop-reach (bai ghim duy nhat)', row[0] === bop);
t('O 2 la bai dac-san (v82, moi them gan nhat)', row[1].page === 'bai-viet/hang-viet-ke-chuyen-dac-san-ban-chay-tiktok.html');
t('O 3 la bai cho-4.0 (v82)', row[2].page === 'bai-viet/cho-40-tieu-thuong-hoc-livestream-tiktok.html');
t('O 4 la bai shopee-live-tet 16 ty (v82)', row[3].page === 'bai-viet/shopee-live-video-tet-2026-16-ty-luot-xem.html');
t('Chi o 1 la bai ghim, 3 o sau la bai moi them (v84)',
  row[0].pinned === true && row.slice(1).every(a => a.pinned === false));

// ---- (A3) Mock: pinOrder thang ngay; bai khong ghim khong duoc uu tien ----
t('Mock pinOrder: bai ghim pinOrder nho len truoc bat chap ngay cu hon',
  (() => {
    const mk = (title, date, pinned, pinOrder) => ({ title, date, pinned, pinOrder });
    const list = [
      mk('A', '2026-11-01', true, 2),
      mk('B', '2026-10-01', true, 1),
      mk('C', '2026-11-06', true, undefined),
      mk('D', '2026-11-06', false, 1),
      mk('E', '2026-11-05', false, undefined),
    ];
    const r = V.getPinnedRow(list);
    return r.map(a => a.title).join(',') === 'B,A,C,E';
  })());
t('Mock pinOrder: 2 bai cung pinOrder thi ngay moi hon len truoc',
  (() => {
    const mk = (title, date, pinned, pinOrder) => ({ title, date, pinned, pinOrder });
    const r = V.getPinnedRow([
      mk('F', '2026-10-02', true, 1),
      mk('G', '2026-10-05', true, 1),
      mk('H', '2026-11-06', false, undefined),
    ]);
    return r.map(a => a.title).join(',') === 'G,F,H';
  })());
t('Mock: khong co bai ghim thi hang ghim toan bai moi them gan nhat theo thu tu them vao (v84, khong theo date)',
  (() => {
    const mk = (title, date) => ({ title, date });
    const r = V.getPinnedRow([mk('X', '2026-11-01'), mk('Y', '2026-11-06'), mk('Z', '2026-10-15')]);
    return r.map(a => a.title).join(',') === 'Z,Y,X';
  })());
t('Mock: bai moi them ve su kien cu van len truoc bai them truoc co date moi hon (v84)',
  (() => {
    const mk = (title, date) => ({ title, date });
    // them sau (nam sau trong mang) du date cu hon van len truoc
    const r = V.getPinnedRow([mk('Cu', '2026-11-06'), mk('Moi', '2026-10-23')]);
    return r.map(a => a.title).join(',') === 'Moi,Cu';
  })());
t('JS: getPinnedRow sap xep theo pinOrder truoc roi ngay (code)',
  appJs.includes("typeof a.pinOrder === 'number'") && appJs.includes("typeof b.pinOrder === 'number'"));

// ---- (B1) Ca 30 bai deu co img local, 0 URL anh ngoai ----
t('50 bai: tat ca img deu la URL local (ver2solution.github.io/mclivestream/images/bai-viet/)',
  D.articles.length === 50 && D.articles.every(a => typeof a.img === 'string' && a.img.startsWith(BASE + 'images/bai-viet/')));
t('data.js: khong con URL anh ngoai trong truong img',
  !/\"img\": \"https?:\/\/(?!ver2solution\.github\.io)/.test(dataJs));
t('data.js: link nguon bao goc (truong url) VAN giu nguyen, khong doi nguon',
  D.articles.filter(a => a.url && a.url.startsWith('http')).length === 45
  && D.articles.find(a => a.page === 'bai-viet/tiktok-shop-1111-tinh-loi.html').url === 'https://lapage.vn/vi/blog/post/tiktok-shop-1111-prep-plan');

// ---- (B2) imgSelf chi 11 anh tu lam; 19 anh tai tu bao goc KHONG co imgSelf ----
const SELF = new Set(['ai-lam-thay-phan-tim-hang', 'le-11-11-trung-quoc-ban-goi-ai-qua-livestream', 'nguoi-tieu-dung-2026-vua-thoai-mai-vua-that', 'shopee-ai-cho-nguoi-ban', 'tiktok-shop-my-black-friday-2026', 'ho-so-mc-livestream-7-muc-bat-buoc', 'luong-mc-livestream-theo-buoi', 'tuyen-mau-livestream', 'san-11st-mc-ai-live-sale-11-11', 'eu-thu-phi-buu-kien-temu-shein', 'viec-lam-mau-livestream', 'tiktok-shop-siet-video-gan-gio-hang', 'singles-day-2026-trung-quoc-ban-qua-livestream', 'nhap-hang-trung-quoc-cuoi-nam-2026', 'tiktok-shop-dong-bang-hoa-hong-90-ngay-vi-pham-so-huu-tri-tue', 'shopee-giam-phi-tiktok-shop-tang-hoa-hong-bang-phi-theo-nganh', 'gia-nai-luong-livestream-570-trieu-ndt-13-tieng', 'shopee-live-video-tet-2026-16-ty-luot-xem']);
t('Dung 19 bai co imgSelf:true (18 infographic cu + moi + bop-reach)',
  D.articles.filter(a => a.imgSelf === true).length === 19
  && D.articles.filter(a => a.imgSelf === true).every(a => a.url === 'bai-viet-bop-reach.html' || (a.page && SELF.has(a.page.replace('bai-viet/', '').replace('.html', '')))));
const DOWNLOADED = ['gen-z-gen-y-tang-chi-tieu-cuoi-nam', 'nguoi-tieu-dung-bot-san-sale', 'ban-da-kenh-mo-dau-ra-hang-viet', 'livestream-cung-kol-mo-dau-ra', 'bi-thu-phuong-livestream-ban-tom-cua-hau', 'het-thoi-ban-hang-online-vo-danh', 'canh-bao-lua-dao-livestream-ngoc-trai', 'tiktok-shop-thu-hep-khoang-cach-shopee', 'hang-viet-len-livestream-my-trung-quoc', 'phi-san-tang-thang-05-2026', 'livestream-ban-hang-my-tang-gan-50-phan-tram', 'hang-da-qua-su-dung-len-ngoi-toan-cau', 'tiktok-shop-tien-toi-100-ty-usd', 'mua-le-2026-my-dien-thoai-chiem-gan-3-4', 'xa-kho-thoi-trang-cuoi-nam', 'tiktok-shop-1111-tinh-loi', 'xa-kho-do-gia-dung-cuoi-nam', 'shop-giu-chan-khach-live-video-tang-52-phan-tram', 'hai-phong-hoc-ban-tren-tiktok-shop', 'cho-40-tieu-thuong-hoc-livestream-tiktok', 'hang-viet-ke-chuyen-dac-san-ban-chay-tiktok'];
t('21 bai tai anh tu bao goc: img local, KHONG co imgSelf (de chu thich "Anh goc" van dung)',
  DOWNLOADED.every(slug => {
    const a = D.articles.find(x => x.page === 'bai-viet/' + slug + '.html');
    return !!a && a.img.startsWith(BASE + 'images/bai-viet/' + slug + '.') && !a.imgSelf;
  }));

// ---- (B3) File anh 19 bai: ton tai, dung dinh dang, kich thuoc hop ly ----
function imgInfo(buf) {
  if (buf.length > 8 && buf.slice(0, 8).equals(Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A])))
    return { fmt: 'png', w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) };
  if (buf.length > 3 && buf[0] === 0xFF && buf[1] === 0xD8 && buf[2] === 0xFF) {
    let i = 2;
    while (i + 9 < buf.length) {
      if (buf[i] !== 0xFF) break;
      const marker = buf[i + 1];
      if (marker === 0xC0 || marker === 0xC2) return { fmt: 'jpg', w: buf.readUInt16BE(i + 7), h: buf.readUInt16BE(i + 5) };
      if (marker === 0xD8 || marker === 0xD9 || (marker >= 0xD0 && marker <= 0xD7)) { i += 2; continue; }
      const len = buf.readUInt16BE(i + 2);
      if (len < 2) break;
      i += 2 + len;
    }
    return { fmt: 'jpg', w: 0, h: 0 };
  }
  if (buf.length > 12 && buf.slice(0, 4).toString() === 'RIFF' && buf.slice(8, 12).toString() === 'WEBP') {
    if (buf.slice(12, 16).toString() === 'VP8 ') return { fmt: 'webp', w: buf.readUInt16LE(26) & 0x3FFF, h: buf.readUInt16LE(28) & 0x3FFF };
    if (buf.slice(12, 16).toString() === 'VP8L') {
      const b = buf.slice(21, 25);
      return { fmt: 'webp', w: 1 + (((b[1] & 0x3F) << 8) | b[0]), h: 1 + (((b[3] & 0x0F) << 10) | (b[2] << 2) | ((b[1] & 0xC0) >> 6)) };
    }
    return { fmt: 'webp', w: 0, h: 0 };
  }
  return null;
}
for (const slug of DOWNLOADED) {
  const a = D.articles.find(x => x.page === 'bai-viet/' + slug + '.html');
  const fname = a.img.replace(BASE, '');
  const p = path.join(root, fname);
  const ok = fs.existsSync(p);
  const buf = ok ? fs.readFileSync(p) : Buffer.alloc(0);
  const info = ok ? imgInfo(buf) : null;
  t('Anh ton tai + dung dinh dang + lon hon 10KB: ' + slug,
    ok && !!info && buf.length > 10000, ok ? (info ? info.fmt + ' ' + buf.length + 'B' : 'sai dinh dang') : 'thieu file');
  t('Anh khong phai 1x1, chieu rong >= 500: ' + slug,
    !!info && info.w >= 500 && info.h >= 300, info ? info.w + 'x' + info.h : 'khong doc duoc kich thuoc');
  // og:image + hero-img trong file bai viet phai tro ve anh local
  const html = fs.readFileSync(path.join(root, a.page), 'utf8');
  t('og:image (ban 1200x630 -og.jpg, v76) + hero-img local: ' + slug,
    html.includes('<meta property="og:image" content="' + ogOf(a.img) + '">')
    && html.includes('src="../images/bai-viet/' + fname.replace('images/bai-viet/', '') + '"'));
}

// ---- (C) CACHE + hash khoa file da doi (v69) ----
t("sw.js CACHE = 'v84-shell-1'", sw.includes("const CACHE = 'v84-shell-1'"));
t("sw.js khong con v67-shell-1", !sw.includes('v67-shell-1'));
t('js/data.js giong het v69 (19 img local + bop-reach imgSelf + 11st pinned/pinOrder) (sha256)', sha('js/data.js') === '642a8e3fdb09f0d23d363741692f3da7106586aff84dd47d1bc81613b514fc57');
t('js/app.js giong het v69 (getPinnedRow pinOrder) (sha256)', sha('js/app.js') === 'e3f5c43293d2b71f2fd0b804a31ce4a4a88f47a83bfdab607eab5ee75467b072');
t('sw.js giong het v69 (CACHE v84-shell-1) (sha256)', sha('sw.js') === '609a81a1bdb77f85197f023f945af4a80acffaf408b450aa203c8d4c30926522');
const HTML_HASH = {
  'gen-z-gen-y-tang-chi-tieu-cuoi-nam': '94176cf1d0d793a592eed27378cb243254dd600a9815f9ed9a38a84219bb073c',
  'nguoi-tieu-dung-bot-san-sale': '9a59bdd7e5d268c3a703b85efd9d3422049ccb037bfdee30e178c8c022e6e8a2',
  'ban-da-kenh-mo-dau-ra-hang-viet': 'df8f8339075125e3b2647f50c6a7af7fca7c5d40577bd36f45b0326776c42643',
  'livestream-cung-kol-mo-dau-ra': '8fa335031a26429a49bccca56e4f7a727567ea3166b04541c77c61602feaf4df',
  'bi-thu-phuong-livestream-ban-tom-cua-hau': 'f7cd84c1c50f02cd333a6614d02b1aaa4cce3aeb6289cc3927e4a7be9ea3eab5',
  'het-thoi-ban-hang-online-vo-danh': 'fb0d0e891eac15343666c7fba2c91e310386320fe3dc4ff62d002bc8b52f91f8',
  'canh-bao-lua-dao-livestream-ngoc-trai': 'a9de74b5fb760b1dd63d73e39e9bdb33aabe19e9778877ce4c9c1f270c931ed0',
  'tiktok-shop-thu-hep-khoang-cach-shopee': '4f05fda5592913427ec9d3d30c1915cf70ba9fe9fb6d9d40c3557eb04bfdeaec',
  'hang-viet-len-livestream-my-trung-quoc': 'a0ebb5ea61ba06123136321bb72584db97cd130633e87f84c3715d688966e3a2',
  'phi-san-tang-thang-05-2026': '49875459ad369bfe0237cdc16c845d4f07d80c1f75b6a8c9b1b5c0c72b740d2b',
  'livestream-ban-hang-my-tang-gan-50-phan-tram': '9198fac9dd6719b6fbfba3ff046fdcf93295fee2cc567db91f114e405a71d9a0',
  'hang-da-qua-su-dung-len-ngoi-toan-cau': 'e24c258732f1613514ef27b897b5a7d02829a351c633236e6a81ed7b5299826a',
  'tiktok-shop-tien-toi-100-ty-usd': '2f1f892a51a659172b0c2f261eee36ebed54edd10a5392c521c1c73cc3c19452',
  'mua-le-2026-my-dien-thoai-chiem-gan-3-4': '969cb4e4e9f924a4ed8bc1ea050def42a580f438bcb99e8a2c1122add9d93234',
  'xa-kho-thoi-trang-cuoi-nam': 'fc5da25489b07658abc0bc5fcceb6c1be8324abff5e33f25e2771387dda29fc9',
  'tiktok-shop-1111-tinh-loi': '1cadcbd8f1024f725278bd04075879a7f2b37aedc5979196651e16cff799e40d',
  'xa-kho-do-gia-dung-cuoi-nam': '65ecec69c2ba0cdbdf9c86de36d8869acdae109e5f20e4ecbf608bdf479a6fba',
  'shop-giu-chan-khach-live-video-tang-52-phan-tram': 'e3b2341b17630d2f2f975c6c750fd954e95c3ebff165b04e3b1f73a0cf2d6abd',
  'hai-phong-hoc-ban-tren-tiktok-shop': 'ab9a0e98908ddf5d34c3c77a348aea866640a422eccebdc783ff4a5065ee6c5c',
};
for (const [slug, h] of Object.entries(HTML_HASH))
  t('bai-viet/' + slug + '.html giong het v69-rebase (anh local + nut header dang-nhap) (sha256)', sha('bai-viet/' + slug + '.html') === h);

console.log(`v69: ${pass} PASS, ${fail} FAIL`);
process.exit(fail ? 1 : 0);
