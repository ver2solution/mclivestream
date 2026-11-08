# Email marketing có đồng ý + Tiền ảo nền tảng và up top — Thiết kế v20 (KHUNG, CHƯA THU TIỀN THẬT)

Tiêu chuẩn áp dụng (người dùng chốt 2026-11-04 lúc 21:51): web phải hiện đại,
chuyên nghiệp hơn nhiều web việc làm đang có trên thị trường, trải nghiệm tốt
nhất. Tiêu chuẩn này áp tự động, không chờ duyệt từng bước, và được dùng để
soát lại thiết kế dưới đây: điểm nào còn thua đối thủ thì sửa ngay trong thiết
kế, không giữ nguyên vì lý do đã làm rồi. Không sao chép giao diện, tên, ảnh
hay nội dung của đối thủ, chỉ học cấu trúc và trải nghiệm rồi làm thành của
Ver2Solution.

## 1. Email marketing có đồng ý

### 1.1. Ô tick riêng, mặc định không tick sẵn
- Form đăng ký mẫu (`danh-sach-mau.html`, ô `maSuMarketing`) và form đăng ký
  shop (`danh-sach-shop.html`, ô `shSuMarketing`) đều có 1 ô tick riêng:
  “Tôi đồng ý nhận thông tin, ưu đãi và tin tuyển mẫu từ Ver2Solution qua email.”
- Ô này mặc định KHÔNG tick sẵn trong HTML (không có thuộc tính `checked`).
  Code đăng ký truyền đúng trạng thái tick vào `signUp({marketingOptIn})`.
- Người không tick chỉ nhận email hệ thống: xác nhận tài khoản, đặt lại mật
  khẩu, thông báo hồ sơ được duyệt. Người tick mới nhận email marketing.

### 1.2. Mục đích thu thập, ghi rõ ngay dưới ô tick
Mục đích duy nhất của email marketing: gửi thông tin, ưu đãi và tin tuyển mẫu
từ Ver2Solution. Không dùng email đăng ký để gửi quảng cáo của bên thứ ba,
không bán hay chia sẻ danh sách email cho bên khác. Văn bản này ghi ngay dưới
ô tick trên cả 2 form, không giấu trong điều khoản dài.

### 1.3. Cách rút đồng ý
- Bỏ tick và bấm Lưu trên trang `vi-tien-ao.html` (mục 1), hoặc nhắn Zalo
  032 998 3699. Sau khi rút, `marketing_opt_in` chuyển thành `false` và
  `withdrawn_at` được ghi thời điểm rút.
- Mọi chiến dịch email marketing sau thời điểm rút phải loại người đã rút ra
  khỏi danh sách gửi, không gửi “nốt đợt này”.

### 1.4. Tách danh sách marketing khỏi danh sách hệ thống trong Supabase
- Nguồn chính: bảng `marketing_consents` (migration M4).
  - `marketing_opt_in = true` + `consent_at` có giá trị: thuộc danh sách marketing.
  - `marketing_opt_in = false`: không thuộc danh sách marketing, vẫn thuộc
    danh sách hệ thống (tài khoản Auth) để nhận email hệ thống.
- Nguồn dự phòng: `user_metadata.marketing_opt_in` trong Auth, do
  `signUp()` lưu ngay lúc đăng ký, để còn dấu vết đồng ý ngay cả khi bảng M4
  chưa chạy. Khi bảng M4 đã chạy, `js/wallet.js` `saveMarketingConsent()`
  ghi vào bảng M4 và bảng M4 là nguồn chính khi xuất danh sách gửi.
- RLS: `marketing_consents` không có policy SELECT công khai, chỉ chủ tài
  khoản đọc/sửa đồng ý của chính mình. Xuất danh sách gửi email marketing
  phải làm từ phía admin (Dashboard / công cụ gửi mail có xác thực), không
  làm từ web công khai, và chỉ xuất các dòng đang có `marketing_opt_in = true`.
- Tùy chọn nhận tin theo tỉnh/lĩnh vực: `alert_province`, `alert_field`
  trong cùng bảng M4. Chỉ có ý nghĩa khi `marketing_opt_in = true`. Đây là
  điểm hơn TopCV/VietnamWorks ở chỗ người dùng tự chọn đúng tin mình cần,
  thay vì nhận mọi email chung chung.

### 1.5. Việc chưa làm trong khung này
- Chưa có công cụ gửi email hàng loạt, chưa có mẫu email, chưa có link
  hủy đăng ký 1 lần bấm trong email. Trước khi gửi chiến dịch đầu tiên phải
  có: công cụ gửi chỉ lấy danh sách `marketing_opt_in = true`, mẫu email có
  tên người gửi Ver2Solution rõ ràng, và link hủy đăng ký 1 lần bấm cập nhật
  lại `marketing_opt_in = false`.

## 2. Tiền ảo nền tảng và up top

### 2.1. Khái niệm và điều khoản
- Xu nền tảng chỉ dùng trong nền tảng để mua dịch vụ up top, ghim hồ sơ và
  làm nổi bật tin tuyển mẫu. Xu không phải tiền thật, không rút thành tiền
  mặt, không chuyển nhượng cho tài khoản khác, không đổi ngược thành tiền.
- Xu chỉ có giá trị khi dùng dịch vụ trong nền tảng; nếu tài khoản bị khóa vì
  gian lận, xu còn lại không được hoàn thành tiền mặt, trừ khi chính sách
  hoàn tiền sau này quy định khác và được công bố trước.
- Không có nhân vật ảo tạo lượt xem, bình luận hay tương tác giả. Lượt xem
  và bình luận chỉ tính từ người dùng thật. Game hóa chỉ tính điểm từ hoạt
  động thật đã kiểm chứng được (ví dụ hồ sơ được duyệt, tin tuyển mẫu được
  duyệt) và chỉ do admin hoặc hệ thống tự động ghi nhận, không do người dùng
  tự cộng.

### 2.2. Bảng dữ liệu (migration M4)
- `wallet_accounts`: 1 ví / 1 tài khoản, `balance_coins >= 0`. Trigger ép ví
  mới tạo luôn có số dư 0. Không có policy UPDATE cho client.
- `wallet_transactions`: nhật ký `topup_request`, `topup`, `spend`, `refund`,
  `bonus_real_activity`, trạng thái `pending/completed/failed/refunded`.
  Client chỉ được tạo giao dịch `pending`, không có policy UPDATE/DELETE.
- `boost_orders`: đơn up top, trạng thái
  `pending → active → expired`, hoặc `rejected/refunded`. Client chỉ tạo đơn
  `pending`. Index duy nhất chống 1 đối tượng, 1 dịch vụ, tối đa 1 đơn active.
- Toàn bộ số dư, trừ xu, kích hoạt và hoàn xu phải do admin / Edge Function /
  webhook cổng thanh toán làm sau này. `js/wallet.js` không có hàm nào cộng
  xu, trừ xu, tạo giao dịch `topup`/`bonus` hay kích hoạt đơn từ phía client.

### 2.3. Nạp tiền — khung chờ, chưa thu tiền thật
- Quy đổi ĐỀ XUẤT (chưa phải giá bán đã bật): 1.000 VNĐ = 1 xu, nạp tối thiểu
  50.000 VNĐ = 50 xu. `requestTopUp()` chỉ tạo giao dịch `topup_request`
  ở trạng thái `pending`, không cộng xu, không trừ tiền thật.
- Trước khi bật thu tiền thật, bắt buộc phải có đủ 4 thứ, thiếu 1 thì không bật:
  1. Cổng thanh toán có xác thực chữ ký webhook, không tin callback từ trình duyệt.
  2. Đối soát: mỗi giao dịch thanh toán thật đối chiếu đúng 1 giao dịch
     `topup_request` đang pending, đúng số tiền, đúng tài khoản, chống nạp trùng.
  3. Cộng xu chỉ khi webhook đã xác thực và đối soát khớp; cộng sai thì hoàn
     giao dịch và ghi nhật ký, không sửa tay số dư trên web.
  4. Chính sách hoàn tiền và hỗ trợ khi thanh toán lỗi, công bố trước trên
     trang Ví và marketing.

### 2.4. Bảng giá đề xuất, vị trí hiển thị và thời gian kích hoạt
Bảng giá xem được không cần đăng nhập trên `vi-tien-ao.html`.

| Dịch vụ | Xu | Vị trí hiển thị | Kích hoạt |
|---|---|---|---|
| Up top hồ sơ / tin 24 giờ | 20 | Đầu danh sách đã lọc theo tỉnh/lĩnh vực đang xem | Trong 24 giờ sau khi duyệt |
| Up top hồ sơ / tin 7 ngày | 100 | Đầu danh sách đã lọc theo tỉnh/lĩnh vực đang xem | Trong 24 giờ sau khi duyệt |
| Ghim hồ sơ ở trang chủ 7 ngày | 200 | Hàng hồ sơ nổi bật ở trang chủ, trong 2 hàng đã chốt | Trong 24 giờ sau khi duyệt, không đảm bảo vị trí cố định |
| Làm nổi bật tin tuyển mẫu 7 ngày | 80 | Khung nổi bật ở đầu danh sách tin đã duyệt của shop | Trong 24 giờ sau khi duyệt, chỉ áp cho tin của shop đã được duyệt |

Gói dịch vụ (công khai trước khi đăng nhập, không chặn xem hồ sơ bằng gói):
- Gói Khởi động — 50 xu: up top 24 giờ hoặc làm nổi bật tin 7 ngày, chọn 1 khi dùng.
- Gói Tăng tốc — 180 xu: up top 7 ngày + làm nổi bật tin 7 ngày.
- Gói Nổi bật — 300 xu: ghim trang chủ 7 ngày + up top 7 ngày.
- Lưu ý: gói là cách gọi tên mức dịch vụ, không phải mã giảm giá tự động;
  việc trừ xu theo gói vẫn phải qua đơn up top đã duyệt, không trừ trực tiếp
  từ phía client.

### 2.5. Theo dõi đơn và hoàn tiền khi dịch vụ lỗi
- Đơn up top luôn hiện đúng 1 trạng thái: Chờ duyệt → Đã duyệt → Đang chạy →
  Hết hạn / Hoàn xu, trong mục Đơn up top của bạn trên `vi-tien-ao.html`.
- Hoàn xu: nếu dịch vụ không được kích hoạt trong 24 giờ sau khi duyệt, hoặc
  lỗi kỹ thuật khiến dịch vụ không hiển thị đúng thời gian đã mua, hoàn toàn
  bộ xu đã trừ vào ví. Nếu hủy trước khi kích hoạt, hoàn toàn bộ xu. Sau khi
  đã kích hoạt và hiển thị đúng, chỉ hoàn phần thời gian chưa chạy khi lỗi
  thuộc về nền tảng. Không hoàn tiền mặt cho xu đã nạp, trừ trường hợp cổng
  thanh toán và chính sách hoàn tiền sau này quy định khác và được công bố trước.
- Hoàn xu phải tạo giao dịch `refund` trong `wallet_transactions`, không sửa
  tay số dư và không xóa giao dịch gốc.

### 2.6. Chống gian lận nạp và up top ảo
- Không tin số dư từ phía client: mọi quyết định kích hoạt phải đọc lại số dư
  từ Supabase ở phía admin/Edge Function, kiểm tra đủ xu rồi mới trừ.
- 1 đối tượng, 1 dịch vụ, tối đa 1 đơn active (index duy nhất trong M4).
- Không cộng xu từ yêu cầu nạp chưa đối soát; không kích hoạt đơn chưa duyệt;
  không cho up top hồ sơ/tin chưa được duyệt (ghim trang chủ chỉ cho hồ sơ đã
  duyệt, làm nổi bật chỉ cho tin của shop đã duyệt).
- Lịch sử ví không sửa được từ phía client; giao dịch bonus chỉ từ hoạt động
  thật và chỉ do admin/Edge Function ghi nhận, với ghi chú rõ hoạt động nào.
- Nạp tiền bất thường (nhiều yêu cầu pending liên tiếp, số tiền lệch quy đổi)
  phải bị giữ lại để đối soát tay, không tự động cộng xu.

### 2.7. Gợi ý dịch vụ theo hồ sơ thật
Hồ sơ chưa có ảnh thật thì ưu tiên hoàn thiện ảnh và video demo trước khi mua
up top, vì up top chỉ tăng người xem, không tự làm hồ sơ đẹp lên; hồ sơ đã có
ảnh thật và đã được duyệt thì up top mới phát huy. Gợi ý này dựa trên dữ liệu
thật của chính tài khoản, không phải xếp hạng ảo.

## 3. So sánh với 6 web đã nghiên cứu — Ver2Solution hơn ở đâu, còn thua ở đâu và đã sửa gì

Nghiên cứu trước đó chỉ đọc trang công khai, không đăng nhập, không sao chép
giao diện, tên, ảnh hay nội dung của đối thủ. Bảng dưới đây chỉ so cấu trúc
và trải nghiệm, không dùng số liệu của đối thủ làm số liệu của Ver2Solution.

### 3.1. Ver2Solution hơn ở các điểm đã chốt (giữ và áp vào Ví/marketing)
| Điểm | Ver2Solution | Đối thủ còn yếu ở điểm này |
|---|---|---|
| Thẻ quyết định trong 5 giây | Ảnh thật, tên thật, tỉnh, lĩnh vực giỏi nhất, lương, lịch, doanh thu cao nhất hoặc Chưa cập nhật, trạng thái, 2 nút Xem hồ sơ + Nhắn Zalo | CareerViet thẻ ở trang chủ không thấy lương/lịch; TopCV thẻ cần di chuột mới xem nhanh |
| Lọc đổi URL | Lọc tỉnh/lĩnh vực/giới tính/từ khóa ghi vào URL, sao chép link lọc được, có dòng đếm kết quả | Nhiều sàn lọc không đổi URL, không chia sẻ được link lọc |
| Trang chi tiết khung cố định, ẩn mục trống | Tóm tắt → video demo + album 1–5 ảnh → mong muốn → liên hệ → đánh giá; mục chưa có dữ liệu ẩn hẳn | Trang chi tiết đối thủ có tiêu đề không có giá trị, khối liên quan chỉ “Đang tải…”, chuỗi mẫu chưa render |
| Nhắn Zalo 1 lần bấm | Nút Nhắn Zalo luôn thấy được, từ thẻ tới Zalo không quá 1 lần bấm, thanh liên hệ cố định trên mobile | Đối thủ chặn chuyển đổi bằng đăng nhập hoặc dồn mọi CTA về 1 form dài cuối trang |
| Trang chủ nhẹ, chỉ 2 hàng | Trang chủ chỉ 2 hàng = 8 hồ sơ, không nhồi khối phụ lên đầu | TopCV, CareerViet trang chủ rất nặng, nhiều ảnh và khối trắc nghiệm/giải thưởng/hệ sinh thái làm loãng nút chính |
| Không chặn xem bằng gói trả phí | Xem danh sách và hồ sơ không cần đăng nhập, không cần mua gói; trả phí chỉ tăng hiển thị | Collabstr chặn chuyển đổi sâu bằng gói trả phí; Fiverr người bán mới khó lên top vì thuật toán ưu tiên người đã có đánh giá |
| Số liệu ghi rõ cách đo | Mọi con số chưa kiểm chứng ghi “Chưa cập nhật” hoặc “chưa kiểm chứng (tạm ghi 0)”, không bịa | Đối thủ có số tổng quan không ghi phương pháp đo, % hiệu quả không có phương pháp đo, giá không nêu VAT |

Áp vào Ví/marketing: bảng giá up top xem được không cần đăng nhập; đơn up top
không chặn xem hồ sơ; số dư, lịch sử và trạng thái đơn chỉ chủ tài khoản mới
xem được; mọi con số chưa có (ví dụ lượt đọc thật) vẫn ghi rõ chưa kiểm chứng.

### 3.2. Điểm còn thua đối thủ — đã sửa ngay trong thiết kế này, không giữ nguyên
| Điểm thua trước đây | Đối thủ làm tốt | Cách sửa trong thiết kế này |
|---|---|---|
| Up top chỉ ghi chung chung, không rõ vị trí và thời gian | Fiverr ghi rõ phạm vi, thời gian, số lần sửa theo từng tầng gói; Collabstr ghi rõ luồng tìm → brief → thương lượng → ký quỹ → theo dõi | Mỗi dịch vụ up top nay ghi rõ vị trí hiển thị và SLA kích hoạt trong 24 giờ sau khi duyệt (mục 2.4); đơn có 5 trạng thái theo dõi được |
| Không có gói dịch vụ để chọn nhanh | Fiverr gói 3 tầng, Collabstr storefront có giá gói + đánh giá 1 dòng | Thêm 3 gói Khởi động / Tăng tốc / Nổi bật, giá xu công khai trước khi đăng nhập (mục 2.4) |
| Không theo dõi được đơn sau khi gửi | Fiverr/Collabstr có theo dõi đơn và trạng thái giao dịch | Thêm mục Đơn up top của bạn với 5 trạng thái, và Lịch sử ví đầy đủ trên `vi-tien-ao.html` |
| Email marketing chung chung, không chọn được tin mình cần | TopCV/VietnamWorks có lọc và thông báo theo ngành/khu vực | Thêm tùy chọn nhận tin theo tỉnh/lĩnh vực trong `marketing_consents` (mục 1.4), chỉ có ý nghĩa khi đã tick đồng ý |
| Không có gợi ý dịch vụ theo tình trạng thật của hồ sơ | Fiverr/Collabstr gợi ý gói theo nhu cầu và cấp độ người bán | Thêm gợi ý theo hồ sơ thật: chưa có ảnh thật thì hoàn thiện ảnh/video trước khi mua up top (mục 2.7) |
| Nạp tiền dễ bị hiểu là cộng xu ngay | Cổng thanh toán chuẩn có đối soát và xác thực webhook | Khung này cố tình CHƯA bật thu tiền thật: nạp chỉ tạo pending, cộng xu chỉ khi có cổng + đối soát (mục 2.3) |
| Trang Ví trước đây sẽ nặng nếu nhồi thêm khối | Vieclam24h trang chủ nhẹ nhất, vào thẳng ngành + khu vực | Trang Ví giữ 1 trang duy nhất, 5 mục ngắn theo thứ tự đồng ý → ví → nạp → up top → chống gian lận, không thêm khối trắc nghiệm/giải thưởng |

### 3.3. Điểm cố tình KHÔNG học theo đối thủ
Thu phí sàn, ký quỹ, hoa hồng mỗi đơn; chặn xem số liên hệ, nhắn tin hay đăng
chiến dịch bằng gói trả phí; xếp hạng chỉ theo đánh giá/số đơn đã có khiến mẫu
mới không bao giờ lên top; tường link SEO hàng trăm mục ở chân trang; số tổng
quan không ghi phương pháp đo; live bắt mua ngay trong app; hồ sơ chỉ hiện khi
đã có portfolio dài. Thay bằng: liên hệ miễn phí qua Zalo, xếp hạng giai đoạn
đầu theo có ảnh thật trước rồi mới tới lượt xem/bình luận thật, chân trang chỉ
giữ 6 mục menu đã chốt, mọi con số ghi rõ cách đo hoặc “Chưa cập nhật”.

## 4. File đã tạo hoặc sửa trong nhiệm vụ này
- Mới: `supabase-migration-marketing-wallet-m4.sql` — 4 bảng + RLS + trigger.
- Mới: `js/wallet.js` — `Ver2Wallet`: đồng ý marketing, ví, lịch sử, yêu cầu nạp, đơn up top, bảng giá và gói.
- Mới: `vi-tien-ao.html` — trang Ví và marketing, 5 mục, bảng giá và trạng thái đơn xem được.
- Mới: `docs-email-marketing-va-tien-ao.md` — chính file này.
- Mới: `tests/test-marketing-wallet.mjs` — kiểm tra khung (xem mục 5).
- Sửa: `mclivestream-supabase.js` — `signUp()` lưu `marketing_opt_in` vào user_metadata.
- Sửa: `danh-sach-mau.html` — ô tick `maSuMarketing`, mặc định không tick, nạp `js/wallet.js`.
- Sửa: `danh-sach-shop.html` — ô tick `shSuMarketing`, mặc định không tick, nạp `js/wallet.js`.

## 5. Kiểm thử và điểm còn cần chạy migration trên Supabase Dashboard
- Chạy: `node --check` cho `js/wallet.js`, `mclivestream-supabase.js`,
  `vi-tien-ao.html` không phải JS nên kiểm tra bằng test đọc file;
  `node tests/test-marketing-wallet.mjs` phải đạt PASS, 0 FAIL.
- Chưa deploy live trong nhiệm vụ này, theo đúng yêu cầu. Link live hiện tại
  vẫn là bản cũ, chưa có trang Ví và marketing cho tới khi deploy v20 hoàn thiện.
- Cần chạy trên Supabase Dashboard, theo đúng thứ tự, trước khi bật tính năng:
  1. Migration M2/M3 shop (nếu chưa chạy): `supabase-migration-shop-m2-m3.sql`.
  2. Migration M4 trong nhiệm vụ này: `supabase-migration-marketing-wallet-m4.sql`
     → SQL Editor → New query → dán toàn bộ → Run → kiểm tra 4 bảng và đủ
     policy theo mục KIỂM TRA cuối file M4 (marketing_consents 3 policy,
     wallet_accounts 2 policy, wallet_transactions 2 policy, boost_orders 2 policy,
     không có policy UPDATE cho wallet_accounts từ phía client).
  3. Sau khi chạy M4, kiểm tra bằng tài khoản test: đăng ký có tick và không
     tick đồng ý, đổi đồng ý trên trang Ví, tạo ví 0 xu, tạo yêu cầu nạp
     pending (số dư không đổi), tạo đơn up top pending (không trừ xu, không
     kích hoạt). Nếu bước nào cộng xu hoặc kích hoạt ngay từ phía client thì
     đó là lỗi, phải dừng và sửa trước khi deploy.
- Chưa bật thu tiền thật: trước khi bật, phải có cổng thanh toán + đối soát
  theo mục 2.3, công cụ gửi email chỉ lấy danh sách `marketing_opt_in = true`
  và link hủy đăng ký 1 lần bấm theo mục 1.5. Thiếu 1 trong các thứ này thì
  vẫn giữ khung chờ, không bật.
