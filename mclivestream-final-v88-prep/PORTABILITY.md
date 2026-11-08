# Portable — chuyển host / chuyển domain cho bản v20 (KHÔNG deploy file này)

## Nguyên tắc
- **Mọi link nội bộ đều tương đối** (`index.html`, `danh-sach-mau.html`, `tin-tuc.html`, …,
  `v20.css`, `js/data.js`, `js/app.js`, `manifest.webmanifest` dùng `start_url: index.html`,
  service worker dùng đường dẫn tương đối). Logic chạy trong `js/app.js` và `js/data.js`
  không hard-code domain GitHub Pages.
- **Chỉ 1 file cấu hình domain:** `site.config.json` (`origin` + `basePath`).
  Các thẻ SEO tĩnh chứa domain đầy đủ (canonical, og:url, og:image, twitter:image,
  sitemap.xml, robots.txt) được sinh/đổi từ file đó bằng script, không sửa tay từng trang.
- **Cấu hình Supabase tách riêng:** `supabase-config.js` chỉ chứa Project URL và
  publishable key (public), không phải domain web, không đổi khi chuyển host
  (chỉ đổi khi đổi project Supabase).

## Đổi domain — chỉ sửa 1 chỗ
1. Sửa `origin` và `basePath` trong `site.config.json`.
   - Sang `ver2solution.com/mclivestream`: `origin = https://ver2solution.com`,
     `basePath = /mclivestream`.
   - Sang host khác ở root: `basePath = ""`.
2. Chạy: `node tools/update-domain.mjs`
   (mặc định đổi từ `https://ver2solution.github.io/mclivestream` sang giá trị mới).
3. Chạy lại bộ test v20 rồi mới deploy.
4. **Bắt buộc trên Supabase Dashboard** (không phải việc của code web): vào
   Authentication → URL Configuration, thêm domain mới vào Site URL / Redirect URLs,
   nếu không link đặt lại mật khẩu sẽ không quay về domain mới.
5. `.nojekyll` chỉ cần cho GitHub Pages; sang host khác giữ lại cũng vô hại.
   `sw.js` dùng cache theo origin nên host mới không bị dính cache của host cũ.

## Không deploy theo web
- `tests/`, `README.md`, `PORTABILITY.md` (file này), `android/` (gói TWA, cần ký riêng),
  `.well-known/assetlinks.json` **nguyên trạng** (chứa fingerprint giữ chỗ, chỉ deploy khi
  có fingerprint Play Signing thật), `tools/` (chỉ chạy lúc chuẩn bị deploy),
  `site.config.json` (chỉ dùng lúc chuẩn bị deploy; deploy kèm cũng vô hại nhưng không cần),
  các file migration `.sql` (chạy trên Dashboard, không phải trang web).
- Khi khôi phục từ bản sao lưu zip: copy các file deploy, rồi tạo `supabase-config.js`
  từ `supabase-config.example.js` bằng Project URL + publishable key lấy từ Dashboard.
  Bản sao lưu KHÔNG chứa keystore, mật khẩu, service_role hay thông tin đăng nhập nào;
  file `supabase-config.js` thật cũng KHÔNG có trong zip vì lý do đó.

## Danh sách file cần deploy lên GitHub Pages (link cũ)
`index.html`, `danh-sach-mau.html`, `danh-sach-shop.html`, `tin-tuc.html`,
`ho-so.html`, `bai-viet-bop-reach.html`, `trang-cua-toi.html`, `v20.css`,
`js/data.js`, `js/app.js`, `supabase-config.js`, `mclivestream-supabase.js`,
`sw.js`, `manifest.webmanifest`, `robots.txt`, `sitemap.xml`,
`favicon.png`, `apple-touch-icon.png`, `icon-192.png`, `icon-512.png`,
`icon-maskable-512.png`, `logo.png`, thư mục `images/`, file rỗng `.nojekyll`.
Trang chi tiết dùng query (`ho-so.html?id=th-xx`) nên không đưa vào sitemap;
trang `trang-cua-toi.html` là trang app sau đăng nhập nên đặt `noindex`, cũng không
đưa vào sitemap.
