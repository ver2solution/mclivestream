/* v325 (18/11/2026): Bot tóm tắt tin trong khung chat trang chủ.
   20 bot AI (avatar images/bots/bot-01..20.png, AI tạo) tự trò chuyện:
   mỗi 15 giây 1 tin, random bot, nội dung tổng hợp từ web theo 7 chủ đề,
   kèm link thật tới bài/trang trên web.
   - Tin bot CHỈ render phía client (không ghi DB, không tính Xu, không
     tính Top tương tác, không gửi qua Realtime). Mỗi lượt truy cập thấy
     một dòng tin ngẫu nhiên khác nhau — đó là chủ ý, để khung chat luôn sống.
   - Người dùng chọn chủ đề / tắt bot ở Trang của tôi (mục "Bot tóm tắt tin",
     lưu localStorage v2s_bot_prefs); khách chưa đăng nhập dùng mặc định
     (bật, đủ 7 chủ đề). Engine đọc lại lựa chọn mỗi lần đăng tin nên đổi
     ở tab Trang của tôi là khung chat đổi theo ngay.
   - Tôn trọng luật cuộn v213: tin mới ở đầu nên chỉ giữ đầu khi người
     dùng đang ở đầu (tin mới nhất); đang đọc tin cũ thì giữ nguyên vị
     trí, hiện nút "Về tin mới nhất" (↑, lên đầu).
   - Rõ ràng là bot: avatar ảnh + nhãn "🤖 Bot" trên mỗi tin, không giả
     làm người thật. */
(function () {
  'use strict';

  var BOT_INTERVAL_MS = 15000; /* v354 (19/11/2026, anh Thọ 13:45): Bot ra tin mỗi 15 giây (trước 5 giây). */
  var MAX_BOT_MSGS = 30;
  var PREFS_KEY = 'v2s_bot_prefs';

  /* 7 chủ đề tóm tắt — khớp ô tích ở Trang của tôi (trang-cua-toi.html). */
  var TOPICS = [
    { id: 'huong-dan', label: 'Hướng dẫn dùng web' },
    { id: 'tin-hot', label: 'Tin mới hot' },
    { id: 'an-choi', label: 'Nơi ăn chơi' },
    { id: 'nghe-nghiep', label: 'Phát triển nghề nghiệp' },
    { id: 'tang-don', label: 'Tăng đơn hàng' },
    { id: 'tai-chinh', label: 'Quản lý tài chính cá nhân' },
    { id: 'doanh-nghiep', label: 'Tổ chức doanh nghiệp' }
  ];

  /* 20 bot: tên + vai trò + avatar. Vai trò quyết định nhãn hiển thị. */
  var BOTS = [
    { name: 'Chi', role: 'model', avatar: 'images/bots/bot-01.png' },
    { name: 'Hùng', role: 'shop', avatar: 'images/bots/bot-02.png' },
    { name: 'Ngọc Lan', role: 'mc', avatar: 'images/bots/bot-03.png' },
    { name: 'Minh Anh', role: 'model', avatar: 'images/bots/bot-04.png' },
    { name: 'Quốc Bảo', role: 'shop', avatar: 'images/bots/bot-05.png' },
    { name: 'Thu Hằng', role: 'model', avatar: 'images/bots/bot-06.png' },
    { name: 'Đức Anh', role: 'idol', avatar: 'images/bots/bot-07.png' },
    { name: 'Phương Thảo', role: 'shop', avatar: 'images/bots/bot-08.png' },
    { name: 'Tuấn Kiệt', role: 'model', avatar: 'images/bots/bot-09.png' },
    { name: 'Hồng Nhung', role: 'mc', avatar: 'images/bots/bot-10.png' },
    { name: 'Văn Sơn', role: 'factory', avatar: 'images/bots/bot-11.png' },
    { name: 'Kim Oanh', role: 'model', avatar: 'images/bots/bot-12.png' },
    { name: 'Hoàng Nam', role: 'shop', avatar: 'images/bots/bot-13.png' },
    { name: 'Diệu Linh', role: 'model', avatar: 'images/bots/bot-14.png' },
    { name: 'Thanh Tùng', role: 'shop', avatar: 'images/bots/bot-15.png' },
    { name: 'Mai Phương', role: 'model', avatar: 'images/bots/bot-16.png' },
    { name: 'Công Danh', role: 'shop', avatar: 'images/bots/bot-17.png' },
    { name: 'Ánh Tuyết', role: 'model', avatar: 'images/bots/bot-18.png' },
    { name: 'Bảo Long', role: 'shop', avatar: 'images/bots/bot-19.png' },
    { name: 'Quỳnh Anh', role: 'model', avatar: 'images/bots/bot-20.png' }
  ];

  /* Nội dung tóm tắt theo chủ đề — mỗi tin: câu trò chuyện + link thật.
     Link đã kiểm chứng tồn tại trên web (18/11/2026). Không bịa số liệu. */
  var CONTENT = {
    'huong-dan': [
      { t: 'Mới vào web thì bấm Đăng ký rồi chọn Mẫu hoặc Shop, điền hồ sơ là xong — hồ sơ duyệt xong mới hiện công khai nhé.', u: 'dang-ky.html?type=model', l: 'Đăng ký tài khoản' },
      { t: 'Muốn tìm mẫu thì vào Danh sách mẫu, lọc theo tỉnh + lĩnh vực, lương hiện ngay trên thẻ, khỏi phải hỏi.', u: 'danh-sach-mau.html', l: 'Danh sách mẫu' },
      { t: 'Shop cần tuyển thì vào Danh sách shop — đang có tin lương cao nhất 40 triệu/tháng ở Hà Nội với TP.HCM.', u: 'danh-sach-shop.html', l: 'Danh sách shop' },
      { t: 'Chưa biết bắt đầu live từ đâu thì đọc bài hướng dẫn này, viết từng bước cho người mới, không cần kinh nghiệm.', u: 'bai-viet/cach-livestream-ban-hang.html', l: 'Cách livestream bán hàng' },
      { t: 'Có gì thắc mắc thì vào mục Hỏi đáp, nhiều câu đã có người hỏi rồi, đỡ phải chờ trả lời.', u: 'hoi-dap.html', l: 'Hỏi đáp' },
      { t: 'Muốn live đông thì thử dịch vụ Comment Seeding — có 4 buổi dùng thử miễn phí, thấy hiệu quả rồi mới quyết.', u: 'bai-viet/dich-vu-comment-seeding-livestream.html', l: 'Dịch vụ Comment Seeding' },
      { t: 'Mẹo nhỏ: link lọc của mình lưu lại được, gửi cho người khác là họ thấy đúng kết quả mình đang xem.', u: 'danh-sach-mau.html', l: 'Danh sách mẫu' },
      { t: 'Đăng nhập xong thì vào Trang của tôi để sửa hồ sơ, xem tin đăng lô/xưởng/kiot của mình và chỉnh mục bot tóm tắt.', u: 'trang-cua-toi.html', l: 'Trang của tôi' }
    ],
    'tin-hot': [
      { t: 'Võ Hà Linh 237 tỷ một phiên live — công thức chốt đơn của chị ấy đáng học lắm, đọc ở đây nhé.', u: 'bai-viet/boc-me-vo-ha-linh-237-ty-mot-phien-live-cong-thuc-chot-don.html', l: 'Bóc mẽ Võ Hà Linh 237 tỷ/phiên' },
      { t: 'Quyền Leo 100 tỷ trong 17 giờ live, con số này nhắc lại vẫn sốc.', u: 'bai-viet/quyen-leo-daily-100-ty-17-gio-livestream.html', l: 'Quyền Leo 100 tỷ/17 giờ' },
      { t: 'Phạm Thoại 58 tỷ sau 36 giờ live — bài này phân tích kỹ cách ảnh giữ mắt xem.', u: 'bai-viet/y-tuong-ban-hang-online-pham-thoai-58-ty-36-gio-live.html', l: 'Phạm Thoại 58 tỷ/36 giờ live' },
      { t: 'Black Friday 27/11 tới rồi, shop nhỏ chuẩn bị gì thì đọc bài này.', u: 'bai-viet/black-friday-2026-12-9-ty-usd-27-11-shop-nho-lam-gi.html', l: 'Black Friday 2026: shop nhỏ làm gì' },
      { t: 'Double 11 vừa rồi shop tự live chiếm tới 62% GMV livestream — tự live đang lên, đừng chỉ trông vào KOL.', u: 'bai-viet/1995-ty-dong-1-ngay-double-11-2026-shop-tu-live-chiem-62-gmv-livestream.html', l: 'Shop tự live chiếm 62% GMV livestream' },
      { t: 'Tin mới trên web hôm nay nhiều lắm, kéo xuống mục Tin mới mà xem.', u: 'tin-tuc.html', l: 'Tin tức' },
      { t: 'Shopee với TikTok Shop đua nhau tăng phí sàn — shop nhớ tính lại giá bán.', u: 'bai-viet/ba-san-dong-loat-tang-phi-san.html', l: 'Ba sàn đồng loạt tăng phí' },
      { t: 'Lịch sale cuối năm đã có đủ mốc 11.11, Black Friday, 12.12 — xem để khỏi tiếc.', u: 'bai-viet/lich-sale-cuoi-nam-2026-11-11-12-12-giang-sinh-tet-2027.html', l: 'Lịch sale cuối năm 2026' }
    ],
    'an-choi': [
      { t: 'Đà Lạt tháng 12 đẹp lắm, 5 trải nghiệm này đi là nhớ.', u: 'bai-viet/du-lich-da-lat-thang-12-5-trai-nghiem.html', l: 'Du lịch Đà Lạt tháng 12' },
      { t: 'Cuối năm rồi, xem tháng nào đi du lịch đẹp nhất để lên lịch nghỉ sau mùa sale.', u: 'bai-viet/cac-thang-di-du-lich-dep-nhat-trong-nam.html', l: 'Các tháng đi du lịch đẹp nhất' },
      { t: 'Quán cà phê check-in đẹp ở Hội An — Faifo Coffee, đi live ngoại cảnh cũng hợp.', u: 'bai-viet/quan-cafe-check-in-dep-faifo-coffee-hoi-an.html', l: 'Faifo Coffee Hội An' },
      { t: 'The Note Coffee Hà Nội — quán này dán đầy giấy note, chụp ảnh sống ảo khỏi chê.', u: 'bai-viet/quan-cafe-check-in-dep-the-note-coffee-ha-noi.html', l: 'The Note Coffee Hà Nội' },
      { t: 'Sài Gòn thì ghé The Workshop Coffee, không gian rộng, ngồi làm việc cả buổi.', u: 'bai-viet/quan-cafe-check-in-dep-the-workshop-coffee-sai-gon.html', l: 'The Workshop Coffee Sài Gòn' },
      { t: 'Túi Mơ To Đà Lạt — quán này view đồi, hoàng hôn đẹp nhất.', u: 'bai-viet/quan-cafe-check-in-dep-tui-mo-to-da-lat.html', l: 'Túi Mơ To Đà Lạt' },
      { t: 'Mẫu livestream nghỉ sau mùa sale thì đi đâu? Bài này gợi ý lịch nghỉ hợp lý.', u: 'bai-viet/du-lich-thang-12-mau-livestream-nghi-sau-mua-sale.html', l: 'Mẫu livestream nghỉ sau mùa sale' },
      { t: 'Danh sách những địa điểm phải đi trong đời — lưu lại đi dần.', u: 'bai-viet/cac-dia-diem-phai-di-trong-doi.html', l: 'Các địa điểm phải đi trong đời' }
    ],
    'nghe-nghiep': [
      { t: 'Nghề livestream ở Trung Quốc đã có 15 triệu người làm — đọc xem họ được trả ra sao.', u: 'bai-viet/nghe-livestream-trung-quoc-15-trieu-nguoi-luong-ra-sao.html', l: 'Nghề livestream Trung Quốc: 15 triệu người' },
      { t: 'Lương mẫu livestream 2026 phân tích kỹ theo từng mức — xem mình đang ở đâu.', u: 'bai-viet/luong-mau-livestream-2026-phan-tich.html', l: 'Lương mẫu livestream 2026' },
      { t: 'Thuê mẫu lần đầu hay flop vì 5 sai lầm này — shop đọc trước khi thuê.', u: 'bai-viet/thue-mau-livestream-lan-dau-5-sai-lam-live-flop.html', l: 'Thuê mẫu lần đầu: 5 sai lầm' },
      { t: 'Thuê mẫu bao nhiêu một giờ thì hợp lý? Bảng giá theo tỉnh đây.', u: 'bai-viet/thue-mau-livestream-gia-bao-nhieu-1-gio-theo-tinh.html', l: 'Thuê mẫu bao nhiêu 1 giờ theo tỉnh' },
      { t: 'Lương MC livestream tính theo buổi — ai làm MC thì tham khảo.', u: 'bai-viet/luong-mc-livestream-theo-buoi.html', l: 'Lương MC livestream theo buổi' },
      { t: 'Muốn tăng thu nhập dịp Tết thì 5 cách này mẫu nào cũng làm được.', u: 'bai-viet/mau-livestream-kiem-tien-tet-5-cach-tang-thu-nhap.html', l: 'Mẫu livestream kiếm tiền Tết: 5 cách' },
      { t: 'Tuyển mẫu live bán quần áo — tin tuyển mẫu mới trên web.', u: 'bai-viet/tuyen-mau-live-ban-quan-ao.html', l: 'Tuyển mẫu live bán quần áo' },
      { t: 'Mẫu mới vào nghề nên đọc bảng lương theo giờ này để khỏi bị ép giá.', u: 'bai-viet/mau-livestream-luong-theo-gio.html', l: 'Mẫu livestream lương theo giờ' }
    ],
    'tang-don': [
      { t: '90 giây đầu quyết định người xem ở lại hay thoát — cách giữ chân đây.', u: 'bai-viet/cach-giu-chan-nguoi-xem-livestream-90-giay-dau-quyet-dinh.html', l: 'Giữ chân người xem: 90 giây đầu' },
      { t: 'Tết này muốn giữ mắt xem thì 4 đòn bẩy này dùng được ngay.', u: 'bai-viet/cach-tang-mat-xem-livestream-tet-4-don-bay-giu-nguoi-xem.html', l: 'Tăng mắt xem livestream Tết' },
      { t: 'Bán qua KOC ở Mỹ: 79 triệu USD trong 30 ngày — mô hình này shop Việt học được.', u: 'bai-viet/mo-hinh-ban-hang-qua-koc-79-trieu-usd-30-ngay-my.html', l: 'Bán qua KOC: 79 triệu USD/30 ngày' },
      { t: 'AI làm thay phần tìm hàng — shop đỡ tốn thời gian chọn sản phẩm.', u: 'bai-viet/ai-lam-thay-phan-tim-hang.html', l: 'AI làm thay phần tìm hàng' },
      { t: '5 prompt AI viết mô tả, kịch bản live, trả lời khách — copy dùng luôn.', u: 'bai-viet/5-prompt-ai-viet-mo-ta-kich-ban-live-tra-loi-khach.html', l: '5 prompt AI cho shop live' },
      { t: 'AI livestream bán hàng Tết: 100.000 gói AI trong 30 phút — đọc để biết xu hướng.', u: 'bai-viet/ai-livestream-ban-hang-tet-100000-goi-ai-30-phut.html', l: 'AI livestream bán hàng Tết' },
      { t: 'Dùng trợ lý AI dẫn khách vào live — shop nhỏ cũng làm được.', u: 'bai-viet/ai-livestream-ban-hang-tro-ly-ai-dan-khach-vao-live.html', l: 'Trợ lý AI dẫn khách vào live' },
      { t: 'Bán hàng không tồn kho, in theo yêu cầu — mô hình vốn ít cho người mới.', u: 'bai-viet/ban-hang-khong-ton-kho-in-theo-yeu-cau.html', l: 'Bán hàng không tồn kho' }
    ],
    'tai-chinh': [
      { t: 'Mẫu livestream chia tiền lương theo 50-30-20 — công thức này dễ nhớ, dễ làm.', u: 'bai-viet/cach-chia-tien-luong-50-30-20-cho-mau-livestream.html', l: 'Chia tiền lương 50-30-20' },
      { t: 'Thu nhập theo buổi thì quản lý tiền kiểu gì? Bài này viết riêng cho mẫu.', u: 'bai-viet/quan-ly-tien-mau-livestream-thu-nhap-theo-buoi.html', l: 'Quản lý tiền mẫu livestream' },
      { t: 'Quản trị dòng tiền, lãi kép, thu nhập thụ động — đọc dần để tiền đẻ ra tiền.', u: 'bai-viet/quan-tri-dong-tien-lai-kep-thu-nhap-thu-dong.html', l: 'Quản trị dòng tiền, lãi kép' },
      { t: 'Tự do tài chính tuổi 30, nghỉ hưu sớm — nghe xa nhưng bắt đầu từ tiết kiệm nhỏ.', u: 'bai-viet/tu-do-tai-chinh-tuoi-30-nghi-huu-som-song-tu-do.html', l: 'Tự do tài chính tuổi 30' },
      { t: 'Tết này Gen Z tiết kiệm chi tiêu kiểu gì mà vẫn có tiền hoàn tiền nhà?', u: 'bai-viet/tiet-kiem-chi-tieu-tet-gen-z-hoan-tien-nha.html', l: 'Tiết kiệm chi tiêu Tết Gen Z' },
      { t: 'Chỉ 5 đô la mở shop — bán hàng online vốn ít, bài này liệt kê 5 mô hình.', u: 'bai-viet/ban-hang-online-von-it-5-do-la-mo-shop-2026.html', l: 'Bán hàng online vốn ít: 5 đô la mở shop' },
      { t: 'Việc làm TikTok Shop Đông Nam Á: thu nhập hoa hồng + kỹ năng cần có.', u: 'bai-viet/viec-lam-tiktok-shop-dong-nam-a-thu-nhap-hoa-hong-ky-nang.html', l: 'Việc làm TikTok Shop Đông Nam Á' },
      { t: 'Lương mẫu livestream Tết — xem mức Tết để deal lương cho xứng.', u: 'bai-viet/luong-mau-livestream-tet.html', l: 'Lương mẫu livestream Tết' }
    ],
    'doanh-nghiep': [
      { t: 'Bán hàng online không cần vốn — 5 mô hình 2026 cho người mới bắt đầu.', u: 'bai-viet/ban-hang-online-khong-can-von-5-mo-hinh-2026.html', l: 'Bán hàng online không cần vốn: 5 mô hình' },
      { t: 'Lịch vận hành livestream 12.12 chia 4 giai đoạn — shop làm theo là không rối.', u: 'bai-viet/livestream-ban-hang-12-12-lich-van-hanh-4-giai-doan.html', l: 'Vận hành livestream 12.12: 4 giai đoạn' },
      { t: 'Mô hình kinh doanh độc lạ: áo chống mồ hôi bán 700.000 USD — ý tưởng từ vấn đề thật.', u: 'bai-viet/mo-hinh-kinh-doanh-doc-la-ao-chong-mo-hoi-700000-usd.html', l: 'Áo chống mồ hôi bán 700.000 USD' },
      { t: 'Thương hiệu Việt lên TikTok Shop Mỹ, 151 tỷ USD xuyên biên giới — học cách làm thương hiệu.', u: 'bai-viet/thuong-hieu-viet-tiktok-shop-my-151-ty-usd-xuyen-bien-gioi.html', l: 'Thương hiệu Việt TikTok Shop Mỹ' },
      { t: 'Mở đầu ra cho hàng Việt — bán đa kênh thay vì chỉ trông vào một sàn.', u: 'bai-viet/ban-da-kenh-mo-dau-ra-hang-viet.html', l: 'Bán đa kênh: mở đầu ra hàng Việt' },
      { t: '56209 gian hàng biến mất một quý — thị trường đang sàng lọc, shop phải chuyên nghiệp hơn.', u: 'bai-viet/56209-gian-hang-bien-mat-mot-quy-metric-q3-2026.html', l: '56209 gian hàng biến mất một quý' },
      { t: 'Bán lẻ Việt Nam tháng 10 tăng 14,7% — thị trường vẫn đang lên.', u: 'bai-viet/ban-le-viet-nam-thang-10-2026-695-nghin-ty-tang-14-7-phan-tram.html', l: 'Bán lẻ Việt Nam tháng 10/2026' },
      { t: 'Bán hàng trên TikTok Shop cho người mới ở Malaysia tăng 140% — thị trường Đông Nam Á còn rộng.', u: 'bai-viet/ban-hang-tren-tiktok-shop-cho-nguoi-moi-malaysia-140-phan-tram.html', l: 'TikTok Shop Malaysia tăng 140%' }
    ]
  };

  /* --- Lựa chọn của người dùng (localStorage) --- */
  function defaultPrefs() {
    var topics = {};
    TOPICS.forEach(function (t) { topics[t.id] = true; });
    return { enabled: true, topics: topics };
  }
  function getPrefs() {
    try {
      var raw = window.localStorage.getItem(PREFS_KEY);
      if (!raw) return defaultPrefs();
      var p = JSON.parse(raw);
      if (!p || typeof p !== 'object') return defaultPrefs();
      var out = defaultPrefs();
      if (typeof p.enabled === 'boolean') out.enabled = p.enabled;
      if (p.topics && typeof p.topics === 'object') {
        TOPICS.forEach(function (t) {
          if (typeof p.topics[t.id] === 'boolean') out.topics[t.id] = p.topics[t.id];
        });
      }
      return out;
    } catch (e) { return defaultPrefs(); }
  }
  function savePrefs(prefs) {
    try { window.localStorage.setItem(PREFS_KEY, JSON.stringify(prefs)); } catch (e) { /* bỏ qua */ }
  }

  /* --- Render tin bot --- */
  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function roleBadge(role) {
    if (role === 'shop') return ' <span class="role role-shop">🏪 Chủ Shop</span>';
    if (role === 'model') return ' <span class="role role-model">🎥 Mẫu Live</span>';
    if (role === 'mc') return ' <span class="role role-model">🎤 MC</span>';
    if (role === 'idol') return ' <span class="role role-model">⭐ Idol Live</span>';
    if (role === 'factory') return ' <span class="role role-shop">🏭 Xưởng</span>';
    return '';
  }
  function fmtTime(d) {
    var h = d.getHours(), m = d.getMinutes();
    return (h < 10 ? '0' + h : '' + h) + ':' + (m < 10 ? '0' + m : '' + m);
  }
  function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

  var messages = [];
  var timer = null;
  var lastTopic = null;

  function makeMessage() {
    var prefs = getPrefs();
    if (!prefs.enabled) return null;
    var enabledTopics = TOPICS.filter(function (t) { return prefs.topics[t.id]; });
    if (!enabledTopics.length) return null;
    /* Tránh 2 tin liên tiếp cùng chủ đề để cuộc trò chuyện đa dạng. */
    var pool = enabledTopics.filter(function (t) { return t.id !== lastTopic; });
    if (!pool.length) pool = enabledTopics;
    var topic = pick(pool);
    lastTopic = topic.id;
    var bot = pick(BOTS);
    var item = pick(CONTENT[topic.id] || []);
    if (!item) return null;
    return { bot: bot, topic: topic.id, text: item.t, url: item.u, link: item.l, time: new Date() };
  }
  function messageHtml(m) {
    var linkHtml = (m.url && m.link)
      ? ' <a class="chat-bot-link" href="' + esc(m.url) + '">👉 ' + esc(m.link) + '</a>' : '';
    return '<div class="chat-msg chat-msg-bot" data-ts="' + m.time.getTime() + '">'
      + '<div class="chat-avatar chat-avatar-bot"><img src="' + esc(m.bot.avatar) + '" alt="' + esc(m.bot.name) + '" width="40" height="40" loading="lazy"></div>'
      + '<div class="chat-body"><div class="chat-meta"><b>' + esc(m.bot.name) + '</b>'
      + ' <span class="chat-tag bot-tag">🤖 Bot</span>' + roleBadge(m.bot.role)
      + ' · ' + esc(fmtTime(m.time)) + '</div>'
      + '<p class="chat-text">' + esc(m.text) + linkHtml + '</p></div></div>';
  }
  function isAtTop(list) {
    if (!list) return true;
    return list.scrollTop < 12;
  }
  function scrollToTop(list) {
    if (!list) return;
    try { list.scrollTop = 0; } catch (e) { /* bỏ qua */ }
  }

  /* v334: Vẽ lại toàn bộ tin bot trong danh sách chat — CÔNG BẰNG, tin mới
     lên đầu, không phân biệt AI, bot, test hay user (anh Thọ 13:00 18/11).
     Mỗi tin bot được chèn vào đúng vị trí theo giờ (mới nhất trước): tin
     bot mới hơn thì ở trên tin người dùng, tin bot cũ hơn thì ở dưới.
     Gọi sau mỗi lần community-chat.js render lại tin thật, vì render đó
     thay innerHTML. Giữ nguyên vị trí đọc khi chèn (luật cuộn v213): đang
     ở đầu (tin mới nhất) → giữ đầu; đang đọc giữa/cuối → giữ nguyên nội
     dung đang xem (scrollTop += độ cao phần chèn thêm). anchor (nếu có)
     là vị trí chụp TRƯỚC khi community-chat.js thay innerHTML. */
  function repaint(anchor) {
    var list = document.getElementById('homeChatList');
    if (!list) return;
    var prefs = getPrefs();
    var prev = anchor || { top: list.scrollTop, height: list.scrollHeight, wasTop: isAtTop(list) };
    var existing = list.querySelectorAll('.chat-msg-bot');
    for (var i = 0; i < existing.length; i++) existing[i].remove();
    if (!prefs.enabled || !messages.length) { restoreScroll(list, prev); updateJump(list); return; }
    /* Nếu danh sách đang hiện câu "Chưa có tin nhắn" thì bỏ câu đó — bot
       đã nói thì khung chat không còn trống. */
    var empty = list.querySelector('.chat-empty');
    if (empty) empty.remove();
    // Chèn từng tin bot (mới nhất trước) vào đúng vị trí theo giờ: tìm
    // tin đầu tiên CŨ HƠN tin bot này rồi chèn ngay trước nó; nếu không có
    // (tin bot cũ nhất) thì gắn ở cuối. data-ts trên mỗi .chat-msg là giờ
    // gửi (ms) — tin thật do community-chat.js gắn, tin bot do messageHtml
    // gắn.
    for (var i = messages.length - 1; i >= 0; i--) {
      var m = messages[i];
      var ts = m.time.getTime();
      var ref = null;
      var kids = list.children;
      for (var j = 0; j < kids.length; j++) {
        var kts = parseInt(kids[j].getAttribute('data-ts') || '0', 10) || 0;
        if (kts < ts) { ref = kids[j]; break; }
      }
      if (ref) ref.insertAdjacentHTML('beforebegin', messageHtml(m));
      else list.insertAdjacentHTML('beforeend', messageHtml(m));
    }
    restoreScroll(list, prev);
    updateJump(list);
  }
  function restoreScroll(list, prev) {
    if (!list || !prev) return;
    try {
      if (prev.wasTop || prev.top < 12) { scrollToTop(list); return; }
      list.scrollTop = Math.max(0, prev.top + (list.scrollHeight - prev.height));
    } catch (e) { /* bỏ qua */ }
  }
  function updateJump(list) {
    var jump = document.getElementById('homeChatJump');
    if (jump) jump.hidden = isAtTop(list);
  }

  function postNext() {
    var prefs = getPrefs();
    if (!prefs.enabled) { stop(); repaint(); return; }
    var m = makeMessage();
    if (!m) return;
    messages.push(m);
    if (messages.length > MAX_BOT_MSGS) messages.splice(0, messages.length - MAX_BOT_MSGS);
    /* v340 (TOP-01, 18/11/2026): ghi tăng 1 tin bot vào Top tương tác qua
       RPC record_bot_message — fire-and-forget, không chặn render; RPC tự
       kiểm allowlist 20 tên + giới hạn 1 lần/bot/phút. */
    recordBotTop(m.bot && m.bot.name);
    repaint();
  }
  /* v341 (18/11/2026, sửa gốc v340): PostgrestBuilder của supabase-js v2 CHỈ
     có .then(), KHÔNG có .catch() — gọi .catch() thì điều kiện typeof là
     false, RPC không bao giờ chạy (số Top đứng yên). Dùng .then() với cả 2
     handler để vừa kích hoạt RPC vừa nuốt lỗi. */
  function recordBotTop(botName) {
    try {
      var api = (typeof window !== 'undefined' && window.McLivestreamAPI) ? window.McLivestreamAPI : null;
      if (!api || !api.client || !botName) return;
      var p = api.client.rpc('record_bot_message', { p_bot_name: botName });
      if (p && typeof p.then === 'function') p.then(function () {}, function () { /* bỏ qua */ });
    } catch (e) { /* bỏ qua */ }
  }
  function start() {
    if (timer) return;
    var prefs = getPrefs();
    if (!prefs.enabled) return;
    /* Tin đầu tiên sau 1,5 giây để người dùng kịp thấy khung chat, rồi
       cứ 5 giây 1 tin. */
    timer = setTimeout(function tick() {
      postNext();
      timer = setTimeout(tick, BOT_INTERVAL_MS);
    }, 1500);
  }
  function stop() {
    if (timer) { clearTimeout(timer); timer = null; }
  }
  /* Đổi lựa chọn ở Trang của tôi (tab khác) thì khung chat đổi theo ngay. */
  function onPrefsChanged() {
    var prefs = getPrefs();
    if (!prefs.enabled) { stop(); messages = []; repaint(); return; }
    start();
  }

  /* Khởi động khi DOM sẵn sàng; community-chat.js render tin thật trước,
     bot vẽ đè lên sau qua repaint. */
  function init() {
    if (!document.getElementById('homeChatList')) return;
    window.addEventListener('storage', function (e) {
      if (e.key === PREFS_KEY) onPrefsChanged();
    });
    /* Trang cá nhân đổi lựa chọn cùng tab thì bắn event này. */
    window.addEventListener('v2s-bot-prefs-changed', onPrefsChanged);
    start();
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else { init(); }

  /* API cho community-chat.js + Trang của tôi. */
  window.V2SChatBots = {
    topics: TOPICS,
    bots: BOTS,
    getPrefs: getPrefs,
    savePrefs: savePrefs,
    repaint: repaint,
    start: start,
    stop: stop,
    onPrefsChanged: onPrefsChanged
  };
})();
