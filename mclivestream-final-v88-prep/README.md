# TRẠNG THÁI DEPLOY (cập nhật 17:21 ngày 2026-11-05, ca docs-deploy)

**v29 ĐÃ DEPLOY LIVE khoảng 16:25 ngày 2026-11-05** — GitHub Pages
build #61 Success, repo 65 commit, link
`https://ver2solution.github.io/mclivestream/`. Kiểm chứng live
17:21 cùng ngày: `index.html` 11.578 byte, `js/app.js` 29.014 byte,
diff = 0 so với gói này; sitemap live 24 URL; 1 trang bài viết trả
200. QA ca chiều 16:21–16:26 kết luận **ĐẠT CÓ ĐIỀU KIỆN** cho
v28/v29 đang live (test v28 252 PASS, test v29 908 PASS, 0 FAIL lúc
16:21) — đây là xác nhận hậu deploy vì bản đã live trước khi QA
duyệt; lần sau duyệt trước khi deploy. Chạy lại bộ test 17:21:
**907 PASS, 1 FAIL** — 1 FAIL là assertion cũ trong
`tests/test-v27.mjs` vẫn đòi policy `FOR SELECT TO anon`, trong khi
migration đã sửa đúng theo QA (bỏ SELECT anon, đọc qua 2 hàm RPC);
test chưa cập nhật, không phải lỗi code web. Migration analytics
CHƯA chạy trên Supabase — chỉ chạy sau khi người dùng duyệt. Các
dòng "CHƯA deploy / Live hiện tại là vXX" trong từng mục v24–v29
dưới đây là trạng thái tại thời điểm xây từng bản, giữ nguyên làm
lịch sử, không sửa.

# mclivestream v29 — Viết đầy đủ 17 bài báo chỉ có link ngoài (05/11)

**v29 ĐÃ deploy live khoảng 16:25 ngày 2026-11-05 (build #61).**
Lúc xây bản này (16:02), live là v26; v27 (analytics) và v28 (thẻ
5 giây) đã xây xong local, chờ deploy. v29 xây TRÊN v28, theo yêu cầu của người dùng 16:02 ngày 2026-11-05 ("mục tin tức không có nội dung mà click vào chuyển sang nguồn, tôi muốn dịch tiếng Việt viết đầy đủ bài viết đó lên web và dẫn nguồn ở cuối bài") và chuẩn nhấn mạnh ~16:04 (mỗi bài bắt buộc có ảnh minh họa + chuẩn SEO đầy đủ). 17 bài mới đều sao chép đúng cấu trúc 2 trang mẫu v23 (`bai-viet/xa-kho-thoi-trang-cuoi-nam.html`, `bai-viet/tiktok-shop-1111-tinh-loi.html`): SEO + Open Graph + twitter:card summary_large_image + JSON-LD, hero figure, TOC, article-body h2 có id bai-muc-N, callout "Ver2Solution rút ra cho shop nhỏ", dòng nguồn link cuối bài + chữ ký chuẩn. Nội dung dịch/viết lại tiếng Việt văn phong Việt, KHÔNG copy nguyên văn bài gốc, KHÔNG bịa số liệu, giữ đúng sự kiện/ngày/nguồn; tiêu đề giữ nguyên như trong `js/data.js`. Ảnh: 14 bài dùng ảnh gốc của chính tờ báo (đều kiểm chứng HTTP 200, figcaption ghi "Ảnh gốc: <nguồn> — ..., không phải ảnh của Ver2Solution"); 3 bài không lấy được ảnh gốc dùng được (McKinsey chặn curl timeout, Reuters chặn DataDome 401, BusinessWire chặn Akamai) thì TỰ LÀM infographic từ số liệu thật trong bài (1200×630 PNG + SVG cùng tên trong `images/bai-viet/`, figcaption ghi rõ là infographic tự làm, không phải ảnh của nguồn) — KHÔNG bài nào bị chặn tới mức giữ link ngoài, 0 bài bịa nội dung. `js/data.js`: 17 bài thêm `page`/`img`/`takeaway` (3 bài infographic thêm `imgSelf: true`); `sitemap.xml`: 24 URL (7 cũ + 17 mới), không trùng; `js/app.js`: render tin tức sửa caption cho bài `imgSelf`. Lưu ý ngày/ảnh: bài VnEconomy metadata gốc ghi 27/10/2026 nhưng data.js ghi 01/10/2026 — giữ ngày data.js theo chỉ đạo, chưa quyết có sửa data.js không; ảnh Znews dated 2025_08_15 có thể là ảnh minh họa dùng lại; ảnh bài phí sàn dated 22/05/2026 trong khi ngày bài theo data.js là 01/05/2026 (hiển thị giữ 01/05/2026). Test: `tests/test-v29.mjs` mới = **656 PASS, 0 FAIL**; test-v23 và test-v25 cập nhật theo quy tắc mới (19 bài có page; so sánh bài theo trường định danh + chỉ cộng thêm page/img/takeaway/imgSelf), ghi rõ trong file test theo tiền lệ v25/v26; 2 file HTML sửa tên nguồn cho khớp đúng data.js (Euromonitor International, qua BusinessWire; DesignRush News, dẫn dự báo eMarketer). Toàn bộ: **908 PASS, 0 FAIL**. Smoke render tĩnh (`/tmp/smoke-v29-articles.mjs`): **225 PASS, 0 FAIL** — 17 trang đủ doctype/title/h1/hero/takeaway/link nguồn/chữ ký/TOC khớp h2, trang Tin tức render 22 mục với 38 link nội bộ bai-viet/ (19 bài × tiêu đề + ảnh). Khi deploy phải thêm thư mục `images/bai-viet/` vào danh sách file deploy; 3 og:image infographic trỏ về `ver2solution.github.io/mclivestream/images/bai-viet/*.png` nên chỉ tải được sau khi deploy. 2 bài demo nội bộ (url null) và bài bóp reach (link qua url, không page) để nguyên.

# mclivestream v28 — Thẻ hồ sơ 5 giây: chỉ hiện hàng có giá trị thật (05/11)

**v28 chỉ ở local, CHƯA deploy.** Live hiện tại là v25 (build #49/#50, 13:26 ngày 2026-11-05); v26/v27 đã xây xong local, chờ deploy. v28 xây TRÊN v27 theo thiết kế `design-2026-11-05-the-ho-so-5-giay.md` (giao thẳng cho cron developer 15:21 ngày 05/11, không chờ duyệt, theo toàn quyền tự duyệt 12:15/12:34): chỉ sửa hàm `cardHTML` trong `js/app.js` + CSS liên quan trong `v20.css`, áp cho thẻ hồ sơ mẫu ở trang chủ (8 thẻ) và trang mẫu (6 thẻ/trang). Mặt thẻ không còn bảng `facts` 4 hàng: chỉ render hàng có giá trị thật (hàm mới `decisionHTML` + `hasRealValue`, đều escape qua `esc`); lương "Thỏa thuận" thành 1 chip xám "Lương thỏa thuận" cạnh tag (17/20 hồ sơ), không chiếm hàng; lương số thật in đậm ở dòng quyết định (3/20: 120.000–150.000 đồng/giờ x2, Từ 250.000 đồng/giờ x1); lịch thật hiện đúng nguyên văn (13/20); kinh nghiệm luôn hiện, tối đa 2 dòng (20/20); "Doanh thu cao nhất" rời khỏi mặt thẻ cho tới khi có hồ sơ có số thật (hiện 0/20, sẽ tự xuất hiện lại khi có dữ liệu, không cần sửa code); không suy ra chip "khung vàng"/"còn trống 11.11", không hiện lượt xem/bình luận (đang 0/0). Thuộc tính `data-gender` ghi rỗng khi giới tính chưa biết (không code nào đọc nó — lọc dùng đối tượng dữ liệu) để chuỗi "Chưa cập nhật" không còn lọt vào DOM đã render dưới dạng placeholder. Lệch đã đối chiếu với thiết kế: 4 hồ sơ có chữ "Chưa cập nhật" NẰM TRONG câu thật từ bài gốc (kinh nghiệm th-04 "Chưa cập nhật số tháng cụ thể.", th-05 "Chưa cập nhật.", th-10 "Chưa cập nhật. Điểm ghi trong bài: …", lịch th-08 "Chưa cập nhật giờ cụ thể") nên giữ nguyên văn theo tiêu chí 3 của thiết kế (dữ liệu thật giữ nguyên từng chữ) — tiêu chí 2 (0 chuỗi "Chưa cập nhật" trong DOM) được hiểu là 0 lần xuất hiện dưới dạng placeholder, test-v28 khẳng định đúng 4 lần còn lại này và 0 lần ở vị trí khác. Trang chi tiết GIỮ NGUYÊN bảng đầy đủ 4 hàng kể cả "Chưa cập nhật" (initDetail không chạm); thẻ shop vẫn dùng `dl.facts`, không đổi; `miniHTML` không đổi; không đổi `js/data.js`, thứ tự xoay v24/v25, bộ lọc, phân trang, Supabase/migration. CSS mới: `.decision`, `.decision-row` (Lương | Lịch 2 cột khi đủ cả hai, 1 mục giãn hết hàng khi chỉ có 1), `.decision-item`, `.decision-exp`, `.tag-negotiable`; mobile ≤600px xếp dọc; ≤360px thu gọn còn tối đa 1 mục (ưu tiên Lương, không thì Lịch, không thì Kinh nghiệm 1 dòng; dùng `:has`, trình duyệt chưa hỗ trợ thì vẫn hiện đủ mục, không sai dữ liệu). Thiết kế 04/11 "Hỏi lịch 11.11 qua Zalo" cho trang chi tiết CHƯA làm trong v28 (bản đó ghi "chờ người dùng duyệt trước khi code") — để lần chạy sau. Test: `node tests/test-v20.mjs` = **45 PASS, 0 FAIL** (1 assertion cũ cập nhật theo quy tắc mới, ghi rõ trong file test); `node tests/test-v22.mjs` = **23 PASS, 0 FAIL**; `node tests/test-v23.mjs` = **24 PASS, 0 FAIL**; `node tests/test-v24.mjs` = **18 PASS, 0 FAIL**; `node tests/test-v25.mjs` = **21 PASS, 0 FAIL**; `node tests/test-v26.mjs` = **34 PASS, 0 FAIL**; `node tests/test-v27.mjs` = **23 PASS, 0 FAIL**; `node tests/test-v28.mjs` = **27 PASS, 0 FAIL** (mới); marketing-wallet = **16 PASS, 0 FAIL**; reward-m5 = **21 PASS, 0 FAIL**. Tổng **252 PASS, 0 FAIL**. Kiểm tra trực quan trên thiết bị thật (mobile 390px / tablet 768px / desktop 1440px / 320px) và bài test quét 5 giây vẫn thuộc về QA — chưa làm trong lần này, không ghi đạt khi chưa mở máy thật.

# mclivestream v27 — Tracker hành động người dùng ẩn danh (05/11)

**v27 chỉ ở local, CHƯA deploy.** Live hiện tại là v25 (build #49/#50, 13:26 ngày 2026-11-05); v26 đã xây xong local, chờ deploy. v27 xây TRÊN v26 theo yêu cầu người dùng 13:39 ngày 2026-11-05 (theo dõi hành động người dùng trên toàn bộ website để xem khách dừng lại lâu nhất ở đâu và bị lỗi ở điểm nào): file mới `js/analytics.js` nạp sau `js/app.js` trên mọi trang (10 trang HTML, kể cả trang chủ và trang chi tiết vốn không nạp supabase-js — tracker tự nạp CDN supabase-js + `supabase-config.js` khi cần, chỉ dùng khóa anon công khai, không service_role). Tracker ghi: lượt xem trang (trang + trang giới thiệu chỉ giữ origin+đường dẫn, mã phiên ngẫu nhiên theo tab trong sessionStorage), thời gian ở lại từng trang (gửi khi ẩn/rời trang), lượt bấm các phần tử có `data-track` (nút đăng ký/đăng nhập mẫu và shop, thẻ hồ sơ, thẻ shop, nút "Xem shop đang tuyển", nút Góp ý, ô tìm kiếm/bộ lọc — chỉ ghi giá trị data-track tĩnh, KHÔNG ghi từ khóa đã gõ), lỗi JavaScript (window.onerror + unhandledrejection), kết quả gửi form (đăng ký/đăng nhập/đăng tin shop/góp ý: chỉ ghi thành công hay lỗi + thông báo lỗi đã lọc). ẨN DANH TUYỆT ĐỐI: không gửi email, số điện thoại, mật khẩu, nội dung ô nhập, địa chỉ IP hay dấu vân tay; file không đọc `.value` của ô nhập nào (test-v27 khẳng định); thông báo lỗi được lọc email/số điện thoại trước khi gửi. Gửi theo lô về bảng `web_analytics_events` (tối đa 10 sự kiện hoặc 10 giây); gửi lỗi thì xếp hàng vào localStorage (tối đa 200) và thử lại ở lần tải sau; mọi lỗi của tracker được bắt và bỏ qua lặng lẽ nên không làm chậm hay vỡ trang. File migration mới `supabase-migration-web-analytics.sql` (CHỈ viết file, KHÔNG chạy): tạo bảng với các cột id, session_id, page, event_type, element, dwell_seconds, error_message, referrer, created_at; bật RLS; policy anon INSERT + anon SELECT (sự kiện không chứa dữ liệu cá nhân). **Migration phải chạy tay trên Supabase Dashboard** (giống M2/M3) — cron `ver2solution-web-analytics` (~20:41 hằng ngày) chỉ có dữ liệu sau khi v27 deploy + migration đã chạy. Không đổi menu, logic xoay hồ sơ, phân trang, dữ liệu mẫu/shop/bài báo. Test: `node tests/test-v20.mjs` = **45 PASS, 0 FAIL**; `node tests/test-v22.mjs` = **23 PASS, 0 FAIL**; `node tests/test-v23.mjs` = **24 PASS, 0 FAIL**; `node tests/test-v24.mjs` = **18 PASS, 0 FAIL**; `node tests/test-v25.mjs` = **21 PASS, 0 FAIL**; `node tests/test-v26.mjs` = **34 PASS, 0 FAIL**; `node tests/test-v27.mjs` = **23 PASS, 0 FAIL** (mới); marketing-wallet = **16 PASS, 0 FAIL**; reward-m5 = **21 PASS, 0 FAIL**. Tổng **225 PASS, 0 FAIL**. Khi deploy phải thêm file mới `js/analytics.js` vào danh sách file deploy (nằm trong thư mục js đã deploy sẵn, không cần thư mục mới).

# mclivestream v26 — Dải tin cậy + logo shop thật + liên hệ công khai đầy đủ + Notes (05/11)

**v26 chỉ ở local, CHƯA deploy.** Live hiện tại là v25 (build #49/#50, 13:26 ngày 2026-11-05). v26 áp dụng đặc tả `v26-shop-trust-spec.md` (mục 1–9) trên nền v25, theo chốt người dùng 13:26 ngày 2026-11-05: (1) dải tin cậy ngay sau hero trang chủ với 3 số đã kiểm chứng — 24 shop đang tuyển mẫu, 20 hồ sơ mẫu thật, 400+ khách bán livestream cần tuyển mẫu (hằng số do người dùng xác nhận, không tự tăng) — + nút "Xem shop đang tuyển →" tới #shop-tuyen; số 24/20 điền tự động từ dữ liệu thật khi JS chạy; (2) logo thật cho 3 shop đã xác minh — FANI (ảnh vuông, cover), Chạm Loa + Mylan (trong suốt/ngang, contain trên nền trắng, không crop, không giãn), fallback về ô chữ cái khi ảnh lỗi; 21 shop còn lại giữ ô chữ cái, không dùng logo Thế Giới Giấy cho Mylan; (3) hiển thị đầy đủ thông tin liên hệ công khai theo bảng kiểm kê `contact-audit-v26.md` (CHỈ mục mẫu/shop tự công khai, mỗi mục kèm nguồn): 5/20 mẫu có SĐT/Zalo công khai, 1/20 có email công khai, 19/24 shop có SĐT/Zalo công khai, 1/24 có email công khai; trường mới `contacts` (mỗi mẫu/shop ít nhất có link Facebook công khai) + `logo`/`logoFit` trong `js/data.js`; liên hệ đầy đủ chỉ ở trang chi tiết hồ sơ mẫu ("Liên hệ trực tiếp với mẫu") và thẻ shop, thẻ hồ sơ mẫu ở trang chủ/danh sách KHÔNG thêm liên hệ; dòng Notes nguyên văn "Các bên chủ động liên hệ trao đổi, thông tin là công khai." ở cả hai vị trí; câu giới thiệu trang Dành cho Shop sửa theo mục 8.4. Chạm Loa: bài gốc không đọc lại được (POST_NOT_FOUND) nên chỉ có link fanpage công khai, không đoán số Zalo, tin KHÔNG tự gỡ trong v26. Không đổi menu (6 mục), logic xoay hồ sơ v25 (homeTop8), phân trang, Supabase/migration. Test: `node tests/test-v20.mjs` = **45 PASS, 0 FAIL**; `node tests/test-v22.mjs` = **23 PASS, 0 FAIL**; `node tests/test-v23.mjs` = **24 PASS, 0 FAIL**; `node tests/test-v24.mjs` = **18 PASS, 0 FAIL**; `node tests/test-v25.mjs` = **21 PASS, 0 FAIL**; `node tests/test-v26.mjs` = **34 PASS, 0 FAIL** (mới); marketing-wallet = **16 PASS, 0 FAIL**; reward-m5 = **21 PASS, 0 FAIL**; render smoke `/tmp/smoke-v26.mjs` = **9 PASS, 0 FAIL**. Tổng 202 PASS, 0 FAIL. 5 test cũ (v20/v22/v24/v25) khẳng định quy tắc cũ đã cập nhật theo quy tắc mới, ghi rõ trong file test. Khi deploy phải thêm thư mục mới `images-shop/` vào danh sách file deploy (3 file logo) và kiểm tra trực tiếp 3 URL ảnh logo trên domain GitHub Pages sau deploy.

# mclivestream v25 — Top 8 trang chủ chỉ hồ sơ có ảnh thật + 11 ảnh mới (05/11)

**v25 chỉ ở local, CHƯA deploy.** Live hiện tại là v24 (build #47/#48, 13:07 ngày 2026-11-05). v25 sửa đúng quy tắc người dùng chốt 13:17 ngày 2026-11-05: (1) top 8 trang chủ CHỈ gồm hồ sơ có ảnh đại diện thật — hàm mới `homeTop8()` lọc `photoUrl` trước rồi mới xoay, hồ sơ không ảnh thật không bao giờ vào top 8 (vẫn hiện đủ ở trang danh sách mẫu); (2) xoay 1 lần/ngày theo day-of-year, ổn định trong ngày; (3) thêm ảnh thật cho 11 hồ sơ (từ 7/20 lên 18/20): th-11 và th-18 lấy ảnh từ chính bài đăng công khai của mẫu, th-01/th-03/th-05/th-07/th-12/th-13/th-15/th-17/th-19 lấy ảnh đại diện công khai trên trang cá nhân Facebook của mẫu (không đăng nhập, không nhắn tin, không lấy ảnh không công khai; đã kiểm tra từng ảnh bằng mắt: đều là chân dung của đúng người). Ảnh th-19 lấy ảnh đại diện vì ảnh trong bài gốc chỉ chụp góc live (đèn, giá áo, không có người). th-04 (Bảo Trân) và th-10 (Đoàn Vũ Tiến) không lấy được ảnh công khai (trang cá nhân khóa/yêu cầu đăng nhập) nên vẫn không ảnh và không vào top 8. Trường mới `photoSrc: "post" | "profile" | null` ghi rõ nguồn từng ảnh; thẻ ghi "Ảnh đại diện công khai" cho ảnh đại diện, "Ảnh thật từ bài gốc" cho ảnh trong bài; nhãn CHƯA XÁC NHẬN ĐỒNG Ý ĐĂNG WEB + link bài gốc + nút yêu cầu gỡ giữ nguyên mọi hồ sơ. Không đổi menu, shop (vẫn 24, không shop idol/game), bài báo (vẫn 22), Supabase/migration. Test: `node tests/test-v20.mjs` = **45 PASS, 0 FAIL**; `node tests/test-v22.mjs` = **23 PASS, 0 FAIL**; `node tests/test-v23.mjs` = **24 PASS, 0 FAIL**; `node tests/test-v24.mjs` = **18 PASS, 0 FAIL** (2 test cũ khẳng định hành vi v24 đã cập nhật theo quy tắc mới, ghi rõ trong file test); `node tests/test-v25.mjs` = **21 PASS, 0 FAIL**; marketing-wallet = **16 PASS, 0 FAIL**; reward-m5 = **21 PASS, 0 FAIL**; render smoke `/tmp/smoke-v25.mjs` = **7 PASS, 0 FAIL**.

# mclivestream v24 — Xoay thứ tự hồ sơ mỗi ngày + 4 shop bán hàng mới (05/11)

**v24 chỉ ở local, CHƯA deploy.** Live hiện tại là v23 (build #44/#46, 12:49 ngày 2026-11-05). v24 thêm: (1) thứ tự hồ sơ xoay theo ngày trong năm, ổn định trong ngày — xoay riêng trong từng nhóm (nhóm có ảnh thật / nhóm có ảnh trong bài gốc / nhóm còn lại ở trang chủ; nhóm cùng lượt xem–bình luận–nhóm ảnh ở trang danh sách), trang chủ vẫn đúng 8 hồ sơ có ảnh, không đổi dữ liệu hay tiêu đề Tỉnh — Tên thật; (2) 4 shop bán hàng mới từ lần chạy Facebook trưa 05/11 (Javata Affiliate Team, Truong Phuc Anh, Thời Trang Nam Rustico, Công ty TNHH Giấy Mylan) — trang chủ 6 thẻ shop mới nhất, trang Dành cho Shop đủ 24 thẻ; 6 shop tuyển idol/game và 2 mẫu mới chưa đồng ý KHÔNG lên web. Test: `node tests/test-v20.mjs` = **45 PASS, 0 FAIL**; `node tests/test-v22.mjs` = **23 PASS, 0 FAIL**; `node tests/test-v23.mjs` = **24 PASS, 0 FAIL**; `node tests/test-v24.mjs` = **18 PASS, 0 FAIL**; marketing-wallet = **16 PASS, 0 FAIL**; reward-m5 = **21 PASS, 0 FAIL**; render smoke `/tmp/smoke-v24.mjs` = **9 PASS, 0 FAIL**.

# mclivestream v23 — Trang bài viết riêng + OG share cho 2 bài mới (05/11)

**v23 chỉ ở local, CHƯA deploy.** Live hiện tại là v22 (build #42/#43, 12:41 ngày 2026-11-05). v23 thêm: trang bài viết riêng cho 2 bài POS365 và LaPage trong `bai-viet/` (nội dung đầy đủ viết lại tiếng Việt, ảnh gốc ghi nguồn, nguồn là link, chữ ký Ver2Solution, thẻ OG/Twitter đầy đủ), tiêu đề viết lại theo nỗi đau shop nhỏ, `data.js` thêm trường `page`, `app.js` mở trang riêng thay vì link ra ngoài, sitemap thêm 2 trang. Test: `node tests/test-v20.mjs` = **45 PASS, 0 FAIL**; `node tests/test-v22.mjs` = **23 PASS, 0 FAIL**; `node tests/test-v23.mjs` = **24 PASS, 0 FAIL**; render smoke `/tmp/smoke-v23.mjs` = **10 PASS, 0 FAIL**.

# mclivestream v22 — Thêm mục Shop đang tuyển mẫu + 2 bài báo đủ chuẩn (05/11)

**v22 chỉ ở local, CHƯA deploy, CHƯA nộp Play Store.** Live hiện tại vẫn là v21
(build #41, commit `aa75e3b`, 12:12 ngày 2026-11-05). v22 thêm: danh sách 20 shop
tuyển mẫu công khai (trang Dành cho Shop đầy đủ, trang chủ 6 tin mới nhất bên dưới
2 hàng mẫu) và 2 bài báo đủ chuẩn ngày 05/11 (POS365, LaPage). Test:
`node tests/test-v20.mjs` = **45 PASS, 0 FAIL**; `node tests/test-v22.mjs` =
**23 PASS, 0 FAIL**; render smoke `/tmp/smoke-v22.mjs` = **10 PASS, 0 FAIL**.

# mclivestream v20 — Giao diện mới thật sự, học từ các web lớn, sửa lỗi v19-fix2

**CHƯA deploy web, CHƯA nộp Play Store.** Bản này chỉ ở local để parent duyệt
trực quan trước khi deploy. Test: `node tests/test-v20.mjs` = **26 PASS, 0 FAIL**;
`node --check` qua `js/app.js`, `js/data.js`, `sw.js`.

## 1. Vì sao v20 khác rõ v19 (người dùng đã chê v19 "vẫn giao diện cũ, còn xấu hơn")

| Điểm nhìn thấy ngay | v19 (cũ) | v20 (mới) |
|---|---|---|
| Header | Header 64px, nền tối/be, nav chữ thường | Sticky, nền trắng mờ (blur), logo pill xanh + chữ "2", nav dạng pill, nút "Đăng tin tuyển mẫu" bo tròn |
| Trang chủ | Không có hero tìm kiếm nổi bật; danh sách thẻ cũ, ảnh 3/4 | Hero gradient xanh đậm bo 28px + thẻ tìm kiếm trắng nổi (tên, tỉnh, lĩnh vực) + chip tỉnh/ngành bấm là lọc ngay |
| Thẻ mẫu | Ảnh 3/4 hoặc 4/3, tường chữ dài, 1 nút | Ảnh **4/5 chiếm ưu thế**, tên thật lớn 21px, tag pill tỉnh/lĩnh vực/hình thức, bảng lương–lịch–doanh thu–kinh nghiệm, **2 nút ngay trên thẻ: Xem hồ sơ + Nhắn Zalo** |
| Trang riêng của mẫu | Danh sách thẻ dọc, tường chữ | **Lưới thẻ hiện đại 3 cột** (tablet 2, mobile 1), thanh lọc dạng thẻ trắng, phân trang dạng pill |
| Trang chi tiết | Hero rồi tab rồi tường chữ, liên hệ lẫn trong trang | **Layout 2 cột desktop**: trái là ảnh lớn + thông tin chính + kinh nghiệm; phải là thẻ liên hệ xanh sticky + thông tin thêm. Mobile xếp dọc gọn, thẻ liên hệ không còn sticky che nội dung |
| Màu / khoảng cách / bo góc | Nền be, thẻ viền nhạt, bo nhỏ | Nền xanh-nhạt `#eef3f1`, thẻ trắng bo 22px, bóng mềm, khoảng cách rộng hơn; xanh thương hiệu `#0b5d4e` chỉ làm điểm nhấn nên vẫn nhận ra Ver2Solution, không bê nguyên bố cục cũ |

## 2. Logic sửa v19-fix2 đã đưa toàn bộ vào v20 (không lặp lại lỗi v19)

v19-fix2 (test 81 PASS ở v19, không deploy riêng vì giao diện vẫn cũ) đã sửa:
- **Thẻ tĩnh viết sai cấu trúc**: thuộc tính `data-*` và `id` nằm sau thẻ div đóng nên
  trình duyệt hiện chúng thành chữ và lọc/gắn ảnh hỏng. Trong v20, thẻ được sinh bằng
  template `cardHTML()` trong `js/app.js`, mọi thuộc tính đều nằm **trong thẻ mở
  `<article ...>`** trước dấu `>` — lỗi này không thể tái diễn bằng template đó.
- **Danh sách dưới trang chi tiết chỉ là link mã**: đã thay bằng thẻ mini
  (`miniHTML()`) có tên thật, tiêu đề, tỉnh, lĩnh vực, lương, kinh nghiệm và ảnh.
- **Ảnh thật gắn trực tiếp**: 7 hồ sơ có file ảnh được chèn `<img>` trực tiếp trong
  HTML sinh ra, không trông chờ JS gắn sau; 13 hồ sơ còn lại giữ nhãn minh họa tạm.
- **Không hiện mã nội bộ ở phần nhìn thấy**: mã chỉ còn trong dữ liệu và trong URL
  `?id=...`, tên file ảnh và mã nguồn. Test kiểm tra phần nhìn thấy tĩnh của 3 trang
  và văn bản hiển thị của thẻ/mini đều không chứa mã.
- **Lọc giới tính trang chi tiết** đã sửa regex (lỗi thừa ký tự escape ở v19).
- Thứ tự trang chủ: **7 ảnh thật đã tải lên trước, hồ sơ thứ 8 là hồ sơ có ảnh trong
  bài gốc** (nhãn "Có ảnh trong bài gốc"), rồi mới tới hồ sơ không có ảnh.

## 3. Tổng hợp nghiên cứu mở rộng — mỗi điểm mới học từ loại web nào, sửa thành của mình ra sao

Chỉ đọc trang công khai / tài liệu công khai, chỉ học cấu trúc, luồng và trải nghiệm.
**Không sao chép tên, ảnh, hồ sơ hay nội dung cụ thể của bất kỳ web nào; không đăng
nhập, đăng ký hay thanh toán ở bất kỳ web nào trong quá trình nghiên cứu.**

### 3.1 Sàn việc làm lớn (TopCV, VietnamWorks và các marketplace tuyển dụng)
- **Học:** bộ lọc chi tiết theo kỹ năng/kinh nghiệm/lương/địa điểm; thẻ tin giàu tín
  hiệu (vị trí, địa điểm, lương, trạng thái); sắp xếp theo cập nhật mới / đang tìm việc;
  mô tả chi tiết có nhiệm vụ, yêu cầu và lợi ích rõ ràng; nội dung tư vấn dẫn chuyển đổi.
- **Sửa thành của mình:** lọc tỉnh + lĩnh vực + giới tính + tìm theo tên (không bắt
  buộc chọn đủ tỉnh/lĩnh vực mới xem được — khác với form bắt buộc gây kẹt ở v19);
  thẻ ghi đủ tỉnh, lĩnh vực, lương, lịch, kinh nghiệm, doanh thu cao nhất, trạng thái
  Đang tìm việc; trang chi tiết tách rõ "thông tin chính" và "liên hệ tuyển".
- **Tránh lỗi của họ:** lọc mất khi sang trang (v20 ghi cả lọc và số trang vào URL,
  mở link có lọc là lọc được áp ngay); chặn xem/liên hệ bằng modal đăng nhập (v20:
  xem và liên hệ không cần đăng nhập, chỉ mẫu tự up/sửa hồ sơ mới cần đăng nhập);
  form bắt buộc quá nhiều trường (v20: tìm kiếm hero chỉ 3 trường, không bắt buộc).

### 3.2 Nền tảng creator / livestream lớn (TikTok One / Creator Marketplace, các sàn creator)
- **Học:** tìm creator theo niche + thành phố + ngân sách; media kit tóm tắt trong 1
  thẻ (niche, thành phố, giá); trang chi tiết có ảnh/video, đánh giá và nút liên hệ rõ.
- **Sửa thành của mình:** thẻ mẫu = "media kit thu nhỏ" cho shop nhỏ: ảnh lớn, tên thật,
  tỉnh, lĩnh vực, lương, lịch, kinh nghiệm; nút Nhắn Zalo ngay trên thẻ (qua Zalo
  chung của Ver2Solution, không phải số riêng của mẫu); trang chi tiết có khối liên hệ
  2 cách rõ ràng (qua bài gốc / qua Ver2Solution).
- **Tránh lỗi của họ:** chỉ hiện creator đã đăng ký nền tảng (v20 hiện cả hồ sơ từ bài
  công khai, kèm nhãn chưa xác nhận đồng ý và nút yêu cầu gỡ); số liệu tương tác bịa
  hoặc không ghi phương pháp (v20: lượt xem/bình luận đều 0 vì chưa kiểm chứng, đánh
  giá ghi "Chưa có đánh giá", doanh thu ghi "Chưa cập nhật").

### 3.3 Sàn TMĐT (Shopee / Lazada / Tiki và các sàn marketplace)
- **Học:** thanh tìm kiếm + bộ lọc đa chiều ngay đầu trang danh sách; thẻ sản phẩm
  ảnh lớn, giá nổi bật, tag rõ; sắp xếp theo phổ biến/giá/mới nhất; trang chi tiết ảnh
  lớn + thông số + nút hành động cố định; responsive mobile-first.
- **Sửa thành của mình:** hero tìm kiếm ở trang chủ (tên + tỉnh + lĩnh vực) dẫn thẳng
  sang trang danh sách kèm lọc; thẻ mẫu dùng ảnh 4/5 và lương nổi bật như "giá" của
  sàn; trang chi tiết 2 cột với thẻ liên hệ sticky trên desktop; toàn bộ lưới 1 cột
  trên mobile.
- **Tránh lỗi của họ:** render hàng chục ảnh một khung hình gây nặng (v20: trang chủ
  đúng 8 thẻ, trang mẫu 6 thẻ/trang, ảnh `loading="lazy"` + `decoding="async"`, tổng
  core web ~75 KB HTML/CSS/JS chưa tính ảnh); giá lẫn đơn vị tiền ảo (v20 không có đơn
  vị tiền ảo, lương ghi đúng chữ trong bài gốc hoặc "Thỏa thuận").

### 3.4 Các web đã phân tích từ trước (playerduo, CareerViet, timviec, TopCV, Joboko, easyhrm)
- **playerduo:** thẻ dọc ưu tiên ảnh + chấm trạng thái → v20: ảnh 4/5 + chấm "Đang
  tìm việc" trên ảnh; trang chi tiết tách tab → v20: tách 2 cột thông tin chính /
  liên hệ, gọn hơn tab dài.
- **CareerViet:** xem không cần đăng nhập + thẻ giàu tín hiệu → giữ nguyên, thêm nút
  Nhắn Zalo ngay trên thẻ.
- **timviec:** tìm kiếm đổi URL ngay → v20: mọi lọc (tỉnh, lĩnh vực, giới tính, từ
  khóa, số trang) đều ghi vào URL bằng `history.replaceState`.
- **TopCV:** nội dung dẫn chuyển đổi → v20: trang chủ có "Shop tuyển trong 3 bước",
  tin thị trường và hỏi đáp nhanh dẫn về danh sách mẫu và đăng tin.
- **Joboko / easyhrm (chiều ngược):** tránh CTA hỏng, % hiệu quả không có phương pháp
  đo, bảng giá giấu sau mục thu gọn, mọi CTA đổ về một form, form bắt buộc cả mã số
  thuế → v20: mỗi nút tới đúng đích, không bảng giá, không % bịa, không form bắt buộc.

## 4. Dữ liệu giữ nguyên, không bịa
- 20 hồ sơ thật tên thật (đã xác minh ở v19-fix2), 20 bài báo, 7 ảnh thật
  (G T MY Duyênn, Pham Thi Ngoc Diep, Thuỳ Trang, Tran Tieu, Lâm Thu Hường,
  Anh Diep, Nga Trần — tên file ảnh vẫn chứa mã nội bộ, nhưng tên hiển thị là tên thật).
- Menu 6 mục, phân trang 6/trang (6, 6, 6, 2), trang chủ 2 hàng 8 hồ sơ có ảnh lên trước.
- Không thanh toán, hoa hồng, chat riêng, donate, nạp tiền. Không cột doanh thu
  Supabase mới, không video demo mới, không tải lại 5 ảnh lỗi trong bước này.
- **Lưu ý về "số điện thoại" trong test:** một số dãy số trong ID nhóm/bài Facebook dài
  trùng mẫu số điện thoại khi cắt ngắn — đó không phải số riêng của mẫu. Test v20 kiểm
  tra số điện thoại độc lập (có biên, không nằm trong dãy số dài hơn), và dữ liệu v20
  không chứa số riêng nào của mẫu. Liên hệ chuẩn chỉ qua bài gốc hoặc Zalo Ver2Solution.

## 5. SEO chuẩn (chỉ dùng thông tin thật)
- Mỗi trang: `<title>` riêng, `description`, `canonical` về
  `https://ver2solution.github.io/mclivestream/<trang>`, Open Graph, Twitter card,
  favicon, `theme-color`.
- JSON-LD `Organization` (tên Ver2Solution, logo, số Zalo chung, fanpage) trên mọi trang.
- Heading đúng thứ tự: trang chủ 1 `<h1>` (hero), trang mẫu 1 `<h1>`, thẻ dùng `<h3>`,
  trang chi tiết dùng `<h1>` tên mẫu (sinh bằng JS) rồi `<h2>` cho các mục.
- Alt ảnh thật ghi tên thật của mẫu ("Ảnh thật từ bài gốc của …"), ảnh minh họa tạm
  không giả làm ảnh thật.
- `robots.txt` cho phép index trang công khai và trỏ tới `sitemap.xml`; sitemap liệt
  kê trang chủ, trang mẫu, trang shop và trang tin (trang chi tiết có query `?id=` nên
  không đưa vào sitemap — chuẩn sitemap ưu tiên URL ổn định).
- Tốc độ nhẹ: core HTML/CSS/JS ~75 KB (chưa tính ảnh), ảnh lazy, HTML luôn lấy từ
  mạng trước trong service worker để nội dung mới không bị cache cũ che.

## 6. Responsive thật — mô phỏng kích thước, và giới hạn của mô phỏng

| Kích thước mô phỏng | Kết quả theo CSS v20 (không phải render trình duyệt thật) |
|---|---|
| Desktop 1440px | Lưới trang chủ 4 cột, lưới mẫu 3 cột, chi tiết 2 cột, hero search 4 cột, header đầy đủ |
| Tablet 768px | Dưới 1000px: lưới 2 cột, chi tiết 1 cột (thẻ liên hệ hết sticky), hero search 2 cột, menu thu gọn bằng nút Menu |
| Mobile 390px | Dưới 600px: mọi lưới 1 cột, hero search 1 cột, fact-grid 1 cột, header wrap |
| Đồng hồ 280px | Dưới 360px + 320px: padding 10px, nút full-width cao tối thiểu 48px, thẻ xếp dọc, tag xếp dọc, facts xếp dọc |
| Đồng hồ 200px | Như 280px, thêm: logo nhỏ không dòng phụ, tiêu đề 21px, không tràn ngang (`overflow-x:hidden`, ảnh `max-width:100%`) |

**Chưa kiểm tra bằng thiết bị thật:** không có điện thoại, tablet hay đồng hồ thông
minh thật nào được dùng trong bước này; test Node và bảng mô phỏng CSS ở trên không
thay thế kiểm tra trên thiết bị thật. Trước khi deploy, parent cần mở trực quan trên
ít nhất 1 điện thoại Android thật (Chrome) và 1 màn hình desktop, kiểm tra: hero search
không tràn, thẻ không vỡ, nút Menu mở được, thẻ liên hệ không che nội dung khi cuộn,
và trang chi tiết ở chiều rộng 320px trở xuống vẫn đọc được.

## 7. PWA tối thiểu (thêm vào màn hình chính, không phải app native)
- `manifest.webmanifest`: tên, tên ngắn, `display: standalone`, `start_url: index.html`,
  `theme_color #0b5d4e`, icon 192px, 512px và maskable 512px (tạo từ logo hiện có bằng
  thay đổi kích thước, không vẽ logo mới), `apple-touch-icon` 180px, meta
  `mobile-web-app-capable` / `apple-mobile-web-app-capable`.
- `sw.js`: cache shell có version (`v20-shell-1`), HTML luôn network-first, tài nguyên
  tĩnh cache-first rồi cập nhật nền. Đổi version cache khi đổi giao diện để tránh kẹt bản cũ.
- Người dùng vẫn mở được bằng trình duyệt điện thoại bình thường; thêm vào màn hình
  chính là tùy chọn, không bắt buộc cài đặt.

## 8. App Play Store — gói chuẩn bị TWA, CHƯA nộp, CHƯA ký
- Xem chi tiết trong [android/README-PLAY-STORE.md](sandbox://workspace/mclivestream-final-v20/android/README-PLAY-STORE.md).
- Hướng chính: **Trusted Web Activity** — app Android mỏng mở web v20 toàn màn hình qua
  Chrome, package `com.ver2solution.mclivestream`, version 1.0 (code 1), targetSdk 36,
  URL mặc định `https://ver2solution.github.io/mclivestream/`, icon launcher từ logo.
  Có thêm `twa-manifest.json` để build bằng Bubblewrap cho cùng package và origin.
- **Digital Asset Links:** file mẫu ở `.well-known/assetlinks.json` có fingerprint là
  chuỗi giữ chỗ `REPLACE_WITH_PLAY_SIGNING_SHA256_FINGERPRINT` — **không được deploy
  file này nguyên trạng làm bản cuối**, vì xác minh sẽ thất bại và app chỉ mở dạng
  Custom Tab có thanh địa chỉ. Fingerprint thật chỉ có sau khi upload lần đầu và lấy
  từ Play Console → Setup → App integrity (khóa ký của Play, khác khóa upload ở máy).
- **Những thứ trợ lý không tự tạo thay được, cần người dùng:**
  1. Tài khoản Google Play Console (cá nhân hay tổ chức) + phí đăng ký nhà phát triển
     **25 USD một lần cho mỗi tài khoản** (không phải phí hằng năm hay phí theo app,
     theo chính sách công khai của Google Play; số tiền cuối cùng hiển thị trong chính
     quy trình đăng ký của tài khoản đó).
  2. Keystore và mật khẩu ký — chỉ tạo và giữ trên máy của người dùng, không gửi qua
     chat, không đưa vào repo, không có trong gói này (test kiểm tra không có keystore
     và không có mật khẩu trong `app/build.gradle`).
  3. Quyết định package name (đổi sau phát hành rất khó) và loại tài khoản; tổ chức có
     thể cần mã D-U-N-S.
  4. Ảnh chụp màn hình store listing từ app thật sau khi build xong.
  5. Nếu tài khoản cá nhân mới (sau 13/11/2023): thử nghiệm kín **12 tester liên tục
     14 ngày** rồi mới xin quyền production để Google xét — đây là thời gian chờ, và
     bảng điều khiển của chính tài khoản đó mới chốt yêu cầu áp dụng cho tài khoản đó.
- Phương án dự phòng WebView chỉ viết thêm khi người dùng chọn sau khi TWA thất bại
  xác minh; không làm hai app cùng lúc để tránh nhầm lẫn.
- **Giới hạn kiểm tra Android:** các file Gradle/Manifest trong gói này chỉ được kiểm
  tra bằng test đọc nội dung (đúng package, URL, activity TWA, không có keystore hay
  mật khẩu) — **chưa biên dịch thành `.aab`**, vì môi trường này không có Android SDK
  và không có keystore của người dùng. Lần build đầu tiên phải chạy trên máy có Android
  SDK, sau khi keystore được tạo (mục 8, bước 2).

## 9. Deploy — parent làm sau khi duyệt trực quan
Deploy lên GitHub Pages (repo `ver2solution/mclivestream`, branch main, root):
`index.html`, `danh-sach-mau.html`, `ho-so.html`, `v20.css`, `js/data.js`,
`js/app.js`, `sw.js`, `manifest.webmanifest`, `robots.txt`, `sitemap.xml`,
`icon-192.png`, `icon-512.png`, `icon-maskable-512.png`, `apple-touch-icon.png`,
`favicon.png`, `logo.png`, thư mục `images/` (18 ảnh từ v25: 7 ảnh gốc + 11 ảnh mới), và file rỗng
`.nojekyll` (bắt buộc để GitHub Pages phục vụ được thư mục `.well-known` sau này,
vì Jekyll mặc định bỏ qua file/thư mục bắt đầu bằng dấu chấm).
**Không deploy** `tests/`, `README.md`, `android/` (gói Android build riêng, không phải
file web), và **không deploy** `.well-known/assetlinks.json` nguyên trạng cho tới khi
fingerprint thật được điền (mục 8).
Các trang còn lại trên live (Dành cho Shop, Tin tức, bài bóp reach) vẫn là bản v19 cho
tới khi làm v20 cho chúng — menu trong 3 trang v20 vẫn trỏ tới các file đó nên link
không hỏng, chỉ là giao diện chưa đồng bộ hoàn toàn.

## 10. Cố tình chưa làm
Thanh toán, hoa hồng, chat riêng, donate, nạp tiền; hồ sơ shop và đăng tin lưu thật;
cột doanh thu Supabase; 2 video demo thật; tải lại 5 ảnh lỗi; trang đích SEO theo
ngành/khu vực/lương và AI Matching; chuyển stack Next.js/NestJS; app iOS; app native
riêng; nộp Play Store; kiểm tra trên thiết bị thật (mục 6).
