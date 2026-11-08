# Nguồn logo đối tác — dải "Đồng hành cùng các thương hiệu lớn" (v49)

Tất cả file logo trong thư mục này đều tải về máy (không hotlink), dùng cho
dải logo trang chủ `index.html`. Logo là tài sản thương hiệu của từng đơn vị,
chỉ dùng để ghi nhận đối tác đã triển khai dự án cùng Ver2Solution.

| File | Thương hiệu | Nguồn tải về | Ghi chú |
|---|---|---|---|
| google.png (640×216, 44 KB) | Google | https://upload.wikimedia.org/wikipedia/commons/2/2f/Google_2015_logo.svg (Wikimedia Commons, render PNG 1280px rồi thu nhỏ 640px) | Wordmark nhiều màu, nền trong suốt |
| meta.png (640×129, 31 KB) | Meta | https://upload.wikimedia.org/wikipedia/commons/7/7b/Meta_Platforms_Inc._logo.svg (Wikimedia Commons, render PNG 1280px rồi thu nhỏ 640px) | Logo ∞ + "Meta", nền trong suốt |
| tiktok.png (331×313, 13 KB) | TikTok | https://upload.wikimedia.org/wikipedia/commons/e/e8/Tiktok_logo.png (Wikimedia Commons, "Tiktok logo.png") | CHỈ CÓ biểu tượng nốt nhạc (đen, nền trong suốt) — không tìm được file wordmark "TikTok" kèm chữ dạng PNG trong suốt dùng được (file "Tiktok logo text.svg" trên Commons thực chất chỉ là chữ "O"; ảnh trên similarpng bị dính nền caro giả trong suốt). Dùng nốt nhạc là đủ nhận diện, alt="TikTok". |
| thaco.png (640×160, 28 KB) | THACO | https://upload.wikimedia.org/wikipedia/commons/e/e1/Thaco_Logo.svg (Wikimedia Commons, render PNG 1280px rồi thu nhỏ 640px) | "THACO / TRUONG HAI AUTO", nền trong suốt |
| tpbank.png (640×195, 56 KB) | TPBank | https://upload.wikimedia.org/wikipedia/commons/4/48/Logo_TPBank.svg (Wikimedia Commons, render PNG 1280px rồi thu nhỏ 640px) | Logo + slogan "Vì chúng tôi hiểu bạn", nền trong suốt |
| coccoc.png (266×64, 9 KB) | Cốc Cốc | https://coccoc.com/assets/images/logo.png (trang chủ chính thức coccoc.com) | Logo đầy đủ: icon "C" + chữ "cốc cốc", nền trong suốt. (File "Coc coc logo.png" trên Commons là ảnh chụp trang chủ trình duyệt, không dùng được; file "Coc Coc logo 2023.svg" chỉ có icon.) |
| dem-kim-cuong.png (300×300, 26 KB) | Đêm Kim Cương | https://seongon.com/wp-content/uploads/2026/06/logo-doi-tac-9.png (trang đối tác SEONGON) | Ảnh logo là logo **Thế Giới Kim Cương** (kim cương + "THẾ GIỚI KIM CƯƠNG / THÀNH VIÊN TẬP ĐOÀN DOJI") — đây là thương hiệu đứng sau tên "Đêm Kim Cương" trong danh sách đối tác của Ver2Solution; không có logo riêng nào mang tên "Đêm Kim Cương". Alt giữ "Đêm Kim Cương" theo cách gọi của Ver2Solution. |
| flamingo.jpg (500×268, 12 KB) | Flamingo | http://hamisa.com.vn/Images/About/Flamingo_branding_Final_2017636250120751410076.png (trang khách hàng Hamisa) | Logo "FLAMINGO GROUP" (vòng tròn cam + chữ xanh/đen), nền trắng (JPEG). 2 nguồn khác cùng logo đã đối chiếu: mainland.vn, vpq.vn. |
| bao-kinh-te-do-thi.png (640×146, 30 KB) | Báo Kinh tế & Đô thị | https://upload.wikimedia.org/wikipedia/commons/9/9d/Kinh_te_Do_thi_Logo.png (Wikimedia Commons, render PNG 1280px rồi thu nhỏ 640px) | Wordmark đỏ "Kinh tế & Đô thị", nền trong suốt |

Kiểm chứng 06/11/2026 (v49): mọi file đều mở được bằng PIL (`Image.open` +
`load()`), đúng định dạng PNG/JPEG, không phải trang lỗi HTML; đã xem trực
quan từng logo trước khi đưa vào web (trừ file nguồn SVG đã render qua dịch
vụ thumbnail của Wikimedia).

---

# Icon đối tác — ô tròn 48px (v50, theo yêu cầu người dùng 06/11/2026 11:44–11:45)

Logo đầy đủ v49 hiển thị QUÁ TO trên trình duyệt người dùng (ảnh chụp 11:44:
TPBank khổng lồ kèm slogan, THACO mờ khổng lồ, Cốc Cốc bị cắt — do trình duyệt
dùng v20.css cũ cache, không có quy tắc `.logo-card`, và thuộc tính width/height
640 trên thẻ img khiến ảnh render cỡ tự nhiên). Người dùng chốt làm lại: mỗi
thương hiệu CHỈ LẤY 1 BIỂU TƯỢNG (icon), không lấy bộ logo kèm chữ/slogan; cho
vào Ô TRÒN 48px; ví dụ Cốc Cốc chỉ lấy hình tròn xanh.

Tất cả file `-icon.png` đều 128×128px, < 50 KB, kiểm chứng bằng `file` + PIL,
xem trực quan từng icon trong ô tròn trước khi đưa vào web.

| File icon | Cách lấy | Nguồn/cơ sở |
|---|---|---|
| google-icon.png (128×128, 8 KB) | Tải SVG "Google 'G' logo" từ Wikimedia Commons, render PNG 256px qua cairosvg rồi thu nhỏ 128px | https://upload.wikimedia.org/wikipedia/commons/c/c1/Google_%22G%22_logo.svg |
| meta-icon.png (128×128, 9 KB) | Tải SVG logo Meta đầy đủ từ Wikimedia Commons, render PNG 1024px qua cairosvg, crop chỉ lấy vòng vô cực bên trái (x=0–311, có khe trống 311–374 tách khỏi chữ "Meta") rồi đưa lên canvas vuông 128px | https://upload.wikimedia.org/wikipedia/commons/7/7b/Meta_Platforms_Inc._logo.svg |
| tiktok-icon.png (128×128, 3 KB) | Resize từ tiktok.png v49 (đã là icon nốt nhạc) về 128px | Wikimedia Commons "Tiktok logo.png" (xem bảng v49) |
| tpbank-icon.png (128×128, 11 KB) | Crop từ tpbank.png v49: chỉ lấy hình tam giác cam/vàng bên trái (bbox tam giác x=1–153, y=1–136; crop x=0–160 để loại hẳn thân chữ "T" tím bắt đầu từ x=170), bỏ chữ "TPBank" + slogan "Vì chúng tôi hiểu bạn". Lần crop đầu (x=0–212) bị dính thân chữ "T" nên đã crop lại chặt hơn và xem lại trực quan. | Wikimedia Commons Logo_TPBank.svg (xem bảng v49) |
| coccoc-icon.png (128×128, 22 KB) | Crop từ coccoc.png v49: chỉ lấy hình tròn xanh bên trái (bbox x=0–65, y=0–64), bỏ chữ "cốc cốc" | https://coccoc.com/assets/images/logo.png (xem bảng v49) |
| dem-kim-cuong-icon.png (128×128, 6 KB) | Crop từ dem-kim-cuong.png v49: chỉ lấy hình kim cương đen (bbox x=103–197, y=67–127; khe trống y=127–130 tách khỏi chữ "THẾ GIỚI"), bỏ chữ "THẾ GIỚI KIM CƯƠNG" + dòng đỏ "THÀNH VIÊN TẬP ĐOÀN DOJI" | https://seongon.com/wp-content/uploads/2026/06/logo-doi-tac-9.png (logo thực chất là Thế Giới Kim Cương, xem bảng v49) |
| flamingo-icon.png (128×128, 27 KB) | Crop từ flamingo.jpg v49: chỉ lấy vòng tròn cam (bbox cam x=7–125, y=80–197; crop x=2–130, y=75–202), bỏ chữ "FLAMINGO GROUP"; nền trắng giữ nguyên (nguồn JPEG) | http://hamisa.com.vn/Images/About/Flamingo_branding_Final_2017636250120751410076.png (xem bảng v49) |
| thaco-icon.png (128×128, 4 KB) | THACO KHÔNG CÓ icon riêng: crop từ thaco.png v49 chỉ lấy dòng chữ chính "THACO" màu xanh (hàng xanh y=0–107; crop y=0–112), bỏ dòng đỏ "TRUONG HAI AUTO" (y=127–159). Trong ô tròn 48px, wordmark ngang 640×112 hiển thị nhỏ (~34×6px) — đây là giới hạn của thương hiệu không có icon; nếu muốn rõ hơn cần bỏ THACO khỏi dải hoặc dùng cách thể hiện khác (quyết sau). | Wikimedia Commons Thaco_Logo.svg (xem bảng v49) |
| bao-kinh-te-do-thi-icon.png (128×128, 6 KB) | Báo KTĐT KHÔNG CÓ icon riêng: crop sát wordmark đỏ 1 dòng (bbox alpha x=0–640, y=0–142 — ảnh gốc đã là wordmark duy nhất), giữ nguyên. Trong ô tròn 48px, wordmark ngang 640×142 hiển thị nhỏ (~34×8px) — giới hạn tương tự THACO. | Wikimedia Commons Kinh_te_Do_thi_Logo.png (xem bảng v49) |

Lưu ý v50: thuộc tính width/height trên thẻ `<img>` trong `index.html` được đặt
bằng đúng kích thước nhỏ thật của file icon (128×128) — để dù trình duyệt dùng
CSS cũ (không có quy tắc `.logo-card`) thì logo vẫn hiển thị nhỏ, không khổng
lồ như v49 (v49 đặt width/height 640 theo file đầy đủ).

---

# Thêm 20 logo thương hiệu Việt vào dải đối tác (v54, theo yêu cầu người dùng 06/11/2026 13:24–13:32)

Người dùng chốt: 20 thương hiệu Việt (10 mỹ phẩm + 10 thời trang) đặt vào
**dải logo đối tác xoay vòng ở trang chủ** (không làm mục mới). Mỗi nhóm
marquee từ 9 logo lên 29 logo (tổng 58 thẻ img), 20 logo mới đặt SAU 9 logo
cũ, không đổi thứ tự 9 logo cũ, không đổi đoạn PR.

Tất cả file `-icon.png` mới đều 128×128px, nền trắng, nội dung vừa tối đa
116px (chừa viền 6px), kiểm chứng bằng PIL + xem trực quan từng icon ở cỡ
thật trước khi đưa vào web. Cách làm giống v50: ưu tiên phần icon/mark của
logo (ô hiển thị là hình tròn 48px); logo chỉ có wordmark thì crop phần chữ
gọn nhất có thể. Các logo wordmark ngang (Canifa, Juno, Vascara, Routine,
Degrey, OFÉLIA, Vedette, M.O.I, Emmié, Yody) trong ô tròn chỉ hiện ~34px
ngang — cùng giới hạn đã ghi ở v50 cho THACO/Báo KTĐT.

3 lần crop đầu bị lỗi đã sửa và xem lại: ngôi sao Sao Thái Dương bị cắt
cánh phải (vùng crop 7,5% quá hẹp → mở 15%); lục giác SSStutter bị cắt
2 cạnh bên (vùng 22–78% quá hẹp → mở toàn chiều ngang, chỉ cắt dưới 70%
để bỏ chữ "SSSTUTTER"); Vedette còn dính slogan "Vẻ đẹp từ thiên nhiên"
(vùng 72% → thu 28–55% chỉ lấy chữ "Vedette"). Icon Cỏ Mềm bản cuối crop
từ file myphamchobabau.vn (bản findtheneedle 1044×1038 cùng logo nhưng URL
đầy đủ không lưu lại; bản 700×405 đủ nét cho icon 128px).

| File icon | Cách lấy | Nguồn/cơ sở |
|---|---|---|
| cocoon-icon.png (128×128, 10 KB) | Logo đã là hình tròn: giữ nguyên toàn bộ ("the cocoon / ORIGINAL VIETNAM" + viền cam-đỏ) | https://www.beautybox.com.vn/brand-logo/COCOON.png (BeautyBox, 320×320; đã đối chiếu md5) |
| co-mem-homelab-icon.png (128×128, 14 KB) | Chỉ lấy phần mark lá/hoa bên trái (crop x=0–36%), bỏ chữ "Cỏ mềm / Home Lab" | https://myphamchobabau.vn/wp-content/uploads/2022/07/logo-co-mem-700x405.png (700×405) |
| sao-thai-duong-icon.png (128×128, 8 KB) | Chỉ lấy ngôi sao đỏ bên trái (crop x=0–15%), bỏ chữ "THÁI DƯƠNG" | https://upload.wikimedia.org/wikipedia/commons/9/9b/Logo_Sao_Th%C3%A1i_D%C6%B0%C6%A1ng.png (Wikimedia Commons, "Logo Sao Thái Dương.png", 1844×291; đã đối chiếu md5) |
| thorakao-icon.png (128×128, 26 KB) | Chỉ lấy huy hiệu tròn hình thiên thần bên trái (crop x=0–27%), bỏ chữ "THORAKAO" | https://www.thorakao.com/images/new-logo.png (trang chính thức thorakao.com, 1100×291; đã đối chiếu md5) |
| moi-icon.png (128×128, 8 KB) | Chỉ lấy dòng chữ "M.O.I" (crop y=5–62%), bỏ dòng "Make Over Image" | https://assets.tryandreview.com/uploads/images/brands/eef7bce594f96ea92f8fbae2f95a7a339eb1d935.png (TryAndReview, 700×700; đã đối chiếu md5) |
| lemonade-icon.png (128×128, 7 KB) | Chỉ lấy vòng tròn vàng (chữ O trong wordmark LEMONADE, crop giữa x=40–60%), bỏ chữ | Ảnh logo Lemonade 600×266 tải qua image-search ngày 06/11/2026 (CDN lemonade.vn, file.hstatic.net); URL đầy đủ không còn lưu trong lịch sử tải. Đã đối chiếu trực quan với wordmark đầy đủ LEMONADE-OFFICIAL-LOGO-06.png (2836×704, ybox.vn): cùng vòng tròn vàng chữ O. |
| emmie-icon.png (128×128, 7 KB) | Crop sát wordmark "Emmié by happy skin" (y=20–75%) | https://cdn.chanhtuoi.com/no-watermark/6200e6a473354e9fb55326496337a7cb.png (Chanh Tươi, 600×600; đã đối chiếu md5) |
| ofelia-icon.png (128×128, 5 KB) | Crop sát wordmark "OFELIA®" | https://enviaofelia.com/images/ofelia-logo.png?v=5 (trang chính thức enviaofelia.com, 1228×428; đã đối chiếu md5) |
| lagumi-icon.png (128×128, 28 KB) | Chỉ lấy vòng tròn xanh lá (chân dung lá, crop y=0–70%), bỏ chữ "LAGUMI" bên dưới | https://mms.img.susercontent.com/de2163dc82e48f15c5d680b4875aadcd_tn (avatar gian hàng Shopee chính thức của Lagumi, 320×320; đã đối chiếu md5). Không tìm được logo trên trang chủ lagumi.com (web Haravan không lộ URL logo trong nội dung trang); avatar Shopee chính thức là logo tròn của thương hiệu. |
| vedette-icon.png (128×128, 4 KB) | Chỉ lấy chữ "Vedette" (crop y=28–55%), bỏ slogan "Vẻ đẹp từ thiên nhiên" | https://bloganchoi.com/wp-content/uploads/2020/01/logo-vedette-696x696.jpg (BlogAnChoi, 696×696; đã đối chiếu md5). Trang chủ vedette.vn không lộ URL logo trong nội dung crawl được. |
| coolmate-icon.png (128×128, 7 KB) | Crop sát wordmark "COOL MATE" (COOL trên, MATE trong ô đen) | Logo Coolmate 1400×916 tải qua image-search ngày 06/11/2026 (CDN vncdn); URL đầy đủ không còn lưu trong lịch sử tải. |
| canifa-icon.png (128×128, 4 KB) | Crop sát wordmark "CANIFA" đỏ | Logo Canifa (file Logo-Canifa.png, cdn.haitrieu.com) tải qua image-search ngày 06/11/2026; URL đầy đủ không còn lưu (đường dẫn tháng tải không xác định). |
| ivy-moda-icon.png (128×128, 10 KB) | Chỉ lấy mark hình quạt/chữ W bên phải (crop x=70–100%), bỏ chữ "IVY moda" | https://image.donghohaitrieu.com/wp-content/uploads/2023/10/ivy-moda-logo.jpg (Đồng Hồ Hải Triều, 1000×1000). Lưu ý: tải lại cùng URL cho cùng logo nhưng sai khác pixel tối đa 26/255 (máy chủ nén lại, md5 khác, nội dung giống hệt). |
| yody-icon.png (128×128, 5 KB) | Chỉ lấy chữ "yody" (crop y=0–62%), bỏ slogan "look good . feel good" | https://cdn.haitrieu.com/wp-content/uploads/2022/05/Logo-Yody-Slogan.png (Hải Triều, 1200×1029; đã đối chiếu md5) |
| juno-icon.png (128×128, 3 KB) | Crop sát wordmark "JUNO" đỏ | Logo Juno (file Logo-Juno.webp, trumgiamgia.com) tải qua image-search ngày 06/11/2026; URL đầy đủ không còn lưu trong lịch sử tải. |
| vascara-icon.png (128×128, 6 KB) | Crop sát wordmark "vascara" hồng | https://img.gotit.vn/compress/brand/1715336766_gKn1i.png (GotIt, 824×824; đã đối chiếu md5) |
| ssstutter-icon.png (128×128, 7 KB) | Chỉ lấy lục giác chứa 3 sọc S (crop toàn chiều ngang, y=0–70%), bỏ chữ "SSSTUTTER" | https://cdn.haitrieu.com/wp-content/uploads/2022/09/Logo-SSSTUTTER-Transparent.png (Hải Triều, 1200×1200; đã đối chiếu md5) |
| routine-icon.png (128×128, 4 KB) | Crop sát wordmark "ROUTINE" | https://static.ybox.vn/2018/9/1/1536591481433-Routine-logo-color-02-transparent.png (Ybox, 1391×358; đã đối chiếu md5) |
| degrey-icon.png (128×128, 3 KB) | Crop sát wordmark "DEGREY" | https://file.hstatic.net/1000281824/file/artboard_1_d0b1ee0551c34aa0b846e62d14a33666.png (file đính kèm trang degrey.vn, 1134×567; đã đối chiếu md5) |
| couple-tx-icon.png (128×128, 5 KB) | Chỉ lấy mark X đen (crop x=20–80%, y=0–58%), bỏ chữ "COUPLE TX / STYLING YOUR EXPERIENCE" | Logo Couple TX (file LOGO-COUPLE-TX-900X900.png, gigamall.com.vn) tải qua image-search ngày 06/11/2026; URL đầy đủ không còn lưu trong lịch sử tải. Đây là logo hiện tại (mark X đen); bản hồng cũ trên ladicdn là mẫu cũ, không dùng. |

Kiểm chứng 06/11/2026 (v54): 20 file đều 128×128 đúng chuẩn, mở được
bằng PIL, đã xem trực quan từng icon ở cỡ thật (kể cả 3 icon sửa lại sau
lần crop đầu); 9 icon cũ v50–v51 nguyên vẹn (sha256 giống hệt bản v53);
`js/data.js` không đổi (sha256 giống hệt v53); cửa sổ theme v52/v53 không
đổi; dải logo vẫn màu gốc, không grayscale.
