/* v36 tests — Node only, no browser. v36 = trang Quy tac cong diem thuong
   (user-directed 2026-11-05 ~21:56: xay 1 trang rieng quy tac cong diem;
   doi qua se chia se sau, KHONG duoc bia danh muc doi qua):
   (1) file quy-tac-diem-thuong.html ton tai, dung head SEO (title, meta
       description, canonical, og), dung nav 5 muc, dung mau thuong hieu
       (theme-color #0b5d4e, v20.css).
   (2) Bang diem dung so da chot tam thoi (M5+M6): binh luan shop 10 /
       mau 5 / bai bao 5; like 1 (toi da 5/ngay); share shop 20 / mau 10
       (toi da 2/ngay); tran ngay shop 50 / mau 30; binh luan tinh diem
       tu 20 ky tu; khach vang lai 0 diem.
   (3) Trang NOI RO doi qua se cong bo giai doan sau — KHONG co danh muc
       doi qua cu the nao (khong bia qua, khong bia gia doi).
   (4) Co link dang ky mau (danh-sach-mau.html#dang-nhap-mau) va dang ky
       shop (danh-sach-shop.html#dang-nhap-shop); vi-tien-ao.html co link
       toi trang quy tac; sitemap co URL trang moi (tong 28 URL luc v36, v40: 30 URL).
   The v20–v35 suites still run. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let pass = 0, fail = 0;
function t(name, cond, extra = '') { if (cond) { pass++; console.log('PASS v36:', name); } else { fail++; console.log('FAIL v36:', name, extra); } }

const p = path.join(root, 'quy-tac-diem-thuong.html');
t('file quy-tac-diem-thuong.html ton tai', fs.existsSync(p));
const h = fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : '';

// ---- (1) head + nav + mau thuong hieu ----
t('title + meta description + canonical + og', h.includes('<title>Quy tắc cộng điểm thưởng') && h.includes('<meta name="description"') && h.includes('rel="canonical" href="https://ver2solution.github.io/mclivestream/quy-tac-diem-thuong.html"') && h.includes('og:title'));
t('nav 6 muc, khong co Cách hoạt động / Lộ trình', (() => {
  const i = h.indexOf('<nav class="main-nav"'); const j = h.indexOf('</nav>', i);
  if (i < 0 || j < 0) return false;
  const nav = h.slice(i, j);
  return (nav.match(/<a href=/g) || []).length === 6 && nav.includes('Thanh lý Kiot') && !nav.includes('Cách hoạt động') && !nav.includes('Lộ trình');
})());
t('mau thuong hieu: theme-color #0b5d4e + v20.css', h.includes('content="#0b5d4e"') && h.includes('href="v20.css"'));

// ---- (2) bang diem dung so ----
t('binh luan shop 10 / mau 5 / bai bao 5', h.includes('Bình luận trên hồ sơ shop') && h.includes('10 điểm') && h.includes('Bình luận trên hồ sơ mẫu') && h.includes('Bình luận trên bài báo'));
t('like 1 diem, toi da 5/ngay', h.includes('Thích (Like)') && h.includes('1 điểm') && h.includes('Tối đa 5 lượt tính điểm/ngày'));
t('share shop 20 / mau 10, toi da 2/ngay', h.includes('Chia sẻ hồ sơ shop') && h.includes('20 điểm') && h.includes('Chia sẻ hồ sơ mẫu') && h.includes('10 điểm') && h.includes('Tối đa 2 lượt tính điểm/ngày'));
t('tran ngay shop 50 / mau 30; binh luan tu 20 ky tu; khach 0 diem', h.includes('50 điểm/ngày cho tài khoản shop') && h.includes('30 điểm/ngày cho tài khoản mẫu') && h.includes('20 ký tự') && h.includes('không được cộng điểm'));

// ---- (3) doi qua: chi noi se cong bo sau, KHONG bia danh muc ----
t('doi qua: noi ro se cong bo giai doan sau', h.includes('Danh mục đổi quà') && h.includes('công bố trong giai đoạn tiếp theo'));
t('KHONG bia danh muc doi qua cu the (khong co gia doi, khong co ten qua)', !/đổi\s+\d+\s*điểm|quà tặng:|danh sách quà/i.test(h));

// ---- (4) link dang ky + vi-tien-ao + sitemap ----
t('co link dang ky mau + shop dung anchor', h.includes('danh-sach-mau.html#dang-nhap-mau') && h.includes('danh-sach-shop.html#dang-nhap-shop'));
const wallet = fs.readFileSync(path.join(root, 'vi-tien-ao.html'), 'utf8');
t('vi-tien-ao.html co link toi trang quy tac', wallet.includes('quy-tac-diem-thuong.html'));
const sm = fs.readFileSync(path.join(root, 'sitemap.xml'), 'utf8');
t('sitemap co URL trang moi, tong 64 URL (v47: +5 bai moi; v48: +1 dat-lai-mat-khau; v68: +1 dang-nhap; v71: +5 bai moi; v76: giu 42 theo chinh sach loai trang detail/app; v77: +4 trang AdSense; v85: +1 dang-ky; v86: +1 thanh-ly-kiot)', sm.includes('quy-tac-diem-thuong.html') && (sm.match(/<url>/g) || []).length === 64);

console.log(`\n${pass} PASS, ${fail} FAIL`);
process.exit(fail ? 1 : 0);
