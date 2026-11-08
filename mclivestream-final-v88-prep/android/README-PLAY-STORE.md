# Ver2Solution — App Play Store (Trusted Web Activity)

## Đây là gì, và đây KHÔNG phải là gì
- Đây là **gói chuẩn bị** để đưa web v20 lên Google Play dưới dạng Trusted Web Activity (TWA):
  app Android mỏng, mở web v20 toàn màn hình qua Chrome, không có thanh địa chỉ khi
  Digital Asset Links xác minh đúng. Nội dung app vẫn là web trên GitHub Pages, cập nhật
  web là cập nhật app — không cần phát hành bản app mới cho mỗi lần đổi nội dung web.
- Đây **KHÔNG phải app đã nộp, đã ký hay đã phát hành**. Không có keystore, không có
  mật khẩu ký, không có tài khoản Play Console nào được tạo hay dùng trong bước này.
- Đây cũng **không phải app native riêng**: không có code Android riêng cho tìm mẫu,
  lọc hay liên hệ — mọi tính năng vẫn là web v20.

## Vì sao chọn TWA, không phải WebView tự viết
- TWA là cách chính thức của Google để đưa PWA lên Play: dùng engine Chrome của máy,
  chia sẻ cookie/storage/service worker với trình duyệt, hiển thị toàn màn hình.
- WebView tự viết sẽ phải tự lo bảo mật, cập nhật engine, đăng nhập và hiệu năng, và
  dễ bị Google đánh giá thấp hơn. WebView chỉ là phương án dự phòng nếu TWA không xác
  minh được (xem cuối file), không phải hướng chính.

## Các file trong gói này
- `app/src/main/AndroidManifest.xml` — activity TWA, URL mặc định
  `https://ver2solution.github.io/mclivestream/`, intent-filter autoVerify cho origin này.
- `app/src/main/res/values/strings.xml` — tên app và asset_statements trỏ về origin web.
- `app/build.gradle`, `build.gradle`, `settings.gradle`, `gradle.properties` — cấu hình
  build (applicationId `com.ver2solution.mclivestream`, version 1.0 / code 1, targetSdk 36).
- `app/src/main/res/mipmap-xxxhdpi/ic_launcher.png` — icon launcher từ logo Ver2Solution.
- `twa-manifest.json` — đầu vào cho Bubblewrap (`bubblewrap init --manifest <URL manifest>`),
  để ai build bằng Bubblewrap cũng ra cùng package và origin.
- `../.well-known/assetlinks.json` — **BẢN MẪU, CHƯA DÙNG ĐƯỢC**: fingerprint trong file
  hiện là chuỗi giữ chỗ. Chỉ thay bằng fingerprint thật sau bước ký (mục 4).

## Quy trình nộp — phần nào trợ lý làm được, phần nào chỉ người dùng làm được
### 1. Người dùng: tạo tài khoản Google Play Console (trợ lý không làm thay được)
- Đăng nhập Play Console bằng tài khoản Google của chính người dùng, chấp nhận thỏa
  thuận phân phối, trả phí đăng ký nhà phát triển **25 USD một lần cho mỗi tài khoản**
  (không phải phí hằng năm, không phải phí theo app — theo chính sách công khai của
  Google Play; số tiền cuối cùng hiển thị trong chính quy trình đăng ký của tài khoản đó).
- Chọn loại tài khoản: cá nhân (cần xác minh danh tính và thiết bị) hoặc tổ chức
  (thường cần xác minh tổ chức, có thể cần mã D-U-N-S — Google cấp mã này miễn phí
  nhưng có thể mất thời gian). Trợ lý không cung cấp được giấy tờ tùy thân, thẻ thanh
  toán hay mã D-U-N-S của người dùng.
- Lưu ý cho tài khoản cá nhân mới (tạo sau 13/11/2023, theo quy định công khai của
  Google): trước khi được xét quyền phát hành production, app phải chạy thử nghiệm kín
  với **ít nhất 12 tester tham gia liên tục trong 14 ngày**, rồi mới nộp đơn xin quyền
  production để Google xét. Đây là thời gian chờ, không phải phí. Bảng điều khiển của
  chính tài khoản đó là nơi chốt yêu cầu áp dụng cho tài khoản đó.

### 2. Người dùng hoặc máy build của người dùng: tạo keystore và ký (trợ lý không giữ khóa)
- Tạo keystore RIÊNG cho app này, chỉ trên máy của người dùng, và giữ file keystore
  + mật khẩu ở nơi an toàn, không gửi qua chat, không đưa vào repo:
  `keytool -genkeypair -v -keystore ver2solution-release.keystore -alias ver2solution -keyalg RSA -keysize 2048 -validity 10000`
- Ghi lại SHA-256 fingerprint của khóa upload bằng:
  `keytool -list -v -keystore ver2solution-release.keystore -alias ver2solution`
- Trong `app/build.gradle`, thêm `signingConfigs` đọc từ biến môi trường của máy build
  (không ghi mật khẩu trực tiếp vào file), rồi build:
  `./gradlew bundleRelease` → file `.aab` trong `app/build/outputs/bundle/release/`.
- Cách nhanh hơn, không cần viết tay Gradle: dùng Bubblewrap với `twa-manifest.json`:
  `bubblewrap init --manifest https://ver2solution.github.io/mclivestream/manifest.webmanifest`
  rồi `bubblewrap build` để ra `.apk` và `.aab` đã ký bằng keystore vừa tạo.

### 3. Người dùng: tạo app trong Play Console và upload
- Tạo app mới, điền store listing (tên, mô tả ngắn/dài, icon, ảnh chụp màn hình trên
  điện thoại thật — ảnh chụp phải lấy từ app thật sau khi build, không dùng ảnh mô phỏng),
  khai báo nội dung app (quyền riêng tư, đối tượng, quảng cáo — app v20 không thu thập
  dữ liệu riêng, không có thanh toán trong app, không có quảng cáo; khai đúng như vậy),
  chọn quốc gia phát hành, rồi upload file `.aab`.

### 4. Người dùng: lấy fingerprint ký của Play và hoàn tất Digital Asset Links
- Sau lần upload đầu tiên, nếu bật Play App Signing, Google sẽ ký lại app bằng khóa
  của chính Google — fingerprint này KHÁC fingerprint của khóa upload ở máy người dùng.
- Vào Play Console → Setup → App integrity, copy **SHA-256 của khóa ký app (App signing
  key)**, thay chuỗi giữ chỗ trong `../.well-known/assetlinks.json` bằng fingerprint thật
  đó (giữ cả fingerprint khóa upload nếu muốn chuyển đổi mượt), deploy file này lên web
  tại `https://ver2solution.github.io/mclivestream/.well-known/assetlinks.json`, phục vụ
  dạng `application/json`, không redirect.
- Kiểm tra bằng công cụ Statement List Generator/Tester của Google trước khi nộp bản
  cuối. Nếu assetlinks sai hoặc thiếu, app vẫn mở được nhưng sẽ hiện thanh địa chỉ
  Chrome (fallback Custom Tab) — đó là dấu hiệu xác minh thất bại, không phải app hỏng.

### 5. Người dùng: thử nghiệm kín, rồi xin production, rồi chờ Google xét duyệt
- Chạy thử nghiệm kín đủ 12 tester / 14 ngày (nếu tài khoản thuộc diện này), sửa lỗi
  nếu Google báo, nộp đơn xin quyền production, rồi gửi bản production để xét duyệt.
  Thời gian xét duyệt do Google quyết định; trợ lý không thể rút ngắn hay đảm bảo đậu.

## Những thứ cần người dùng quyết định / cung cấp trước khi nộp
1. Tài khoản Google nào đứng tên Play Console: cá nhân hay tổ chức (công ty Ver2Solution)?
2. Package name có giữ `com.ver2solution.mclivestream` không? Đổi sau khi phát hành sẽ
   rất khó — chốt trước lần upload đầu tiên.
3. Keystore do ai giữ, lưu ở đâu, và ai giữ mật khẩu? (Trợ lý không giữ.)
4. Ảnh chụp màn hình store listing lấy từ thiết bị thật nào, sau khi app build xong?
5. Có bật Play App Signing không? (Khuyến nghị bật, vì đó là mặc định và là cách lấy
   fingerprint ở mục 4.)

## Phương án dự phòng WebView (chỉ dùng nếu TWA không xác minh được)
- Một Activity WebView duy nhất, bật JavaScript + DOM storage, giới hạn domain cho phép
  là `ver2solution.github.io/mclivestream`, chặn mở link ngoài domain bằng trình duyệt
  hệ thống, không lưu mật khẩu, không thu thập dữ liệu. Phương án này không có trong
  gói TWA này để tránh nhầm lẫn hai app; chỉ viết thêm khi người dùng chọn hướng này
  sau khi TWA thất bại xác minh.
