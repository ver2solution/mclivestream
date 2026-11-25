/* v423 — Phase 1 V2.0: cau hinh truong dang ky dong (Dynamic Onboarding).
   ---------------------------------------------------------------------------
   NGUON: ban hop nhat V2.0 (files/chi-thi-hop-nhat-v2-0-2026-11-24.md) §4 +
   thiet ke Phase 1 v1 §3.2/§5 + ban hop nhat V1.0 §III–VIII.
   Dot 1 (Loai A, KHONG migration): cau hinh o day la ban TINH, seed cho bang
   `onboarding_fields` khi migration dot 2 chay (xem hidden_files/
   sql-phase1-onboarding-migration-draft-2026-11-24.sql). Doi cau hoi / them
   nganh / them vai tro: sua file nay (dot 1) hoac sua bang config (dot 2) —
   KHONG hardcode cau hoi vao man hinh.
   QUY TAC RIENG TU: thu nhap + lien he + ngoai hinh mac dinh `private`;
   khong truong nao mac dinh `public` tru nghe danh / gioi thieu ngan /
   nganh hang. Khong luu CCCD, khong luu mat khau vao nhap duoi moi hinh thuc.
   GHI CHU SO LIEU: 19 muc tieu (§III.3) — "quan ly Shop da nen tang trong
   tuong lai" khong tach thanh muc tieu rieng vi da co trong nhu cau Shop
   (needs_shop: ket noi nhieu nen tang). 34 tinh/thanh lay dung danh sach
   hien co tren dang-ky.html (doi chieu lai dia gioi hanh chinh khi lam). */
(function () {
  'use strict';

  var PRIVACY = { PUBLIC: 'public', LOGGED_IN: 'logged_in', PARTNERS: 'partners', PRIVATE: 'private' };

  /* 9 vai tro A–I (§4.2 / V1.0 §III.2). `legacyType` anh xa ?type=model|shop cu. */
  var ROLES = [
    { key: 'A', label: 'Mẫu / Idol / MC Livestream', desc: 'Mẫu live, mẫu ảnh, MC, Idol tìm việc theo ca, theo booking', icon: '🎤', legacyType: 'model' },
    { key: 'B', label: 'Creator / KOC / KOL / Affiliate', desc: 'Creator video, KOC/KOL, Affiliate nhận chiến dịch', icon: '🎬', legacyType: null },
    { key: 'C', label: 'Chủ Shop / Nhà bán hàng', desc: 'Chủ shop nhỏ bán livestream / online / sàn TMĐT', icon: '🏪', legacyType: 'shop' },
    { key: 'D', label: 'Doanh nghiệp / Nhà tuyển dụng', desc: 'Doanh nghiệp, thương hiệu cần tuyển đội livestream', icon: '🏢', legacyType: 'shop' },
    { key: 'E', label: 'Agency / Studio / Quản lý Talent', desc: 'Agency Talent, Studio livestream', icon: '🎥', legacyType: null },
    { key: 'F', label: 'Nhân sự vận hành / Kỹ thuật / Content', desc: 'Kỹ thuật live, vận hành sàn, Content, quay dựng, CSKH, kho', icon: '🛠️', legacyType: null },
    { key: 'G', label: 'Người mới muốn học nghề Livestream', desc: 'Chưa có nghề, đang học để vào nghề', icon: '🌱', legacyType: null },
    { key: 'H', label: 'Đối tác cung cấp dịch vụ', desc: 'Vận hành sàn, logistics, thiết kế, đào tạo', icon: '🤝', legacyType: null },
    { key: 'I', label: 'Người đang khám phá cơ hội', desc: 'Chưa xác định vai trò, đang tìm hiểu', icon: '🔍', legacyType: null }
  ];

  /* 19 muc tieu su dung (§III.3). Luu muc do uu tien 1–3 cho tung muc tieu. */
  var GOALS = [
    { key: 'job_fulltime', label: 'Tìm việc toàn thời gian' },
    { key: 'job_parttime', label: 'Tìm việc bán thời gian' },
    { key: 'job_shift', label: 'Tìm việc theo ca' },
    { key: 'job_home', label: 'Tìm việc tại nhà' },
    { key: 'job_nearby', label: 'Tìm việc gần nơi sinh sống' },
    { key: 'income_up', label: 'Tăng thu nhập' },
    { key: 'booking', label: 'Nhận Booking' },
    { key: 'ad_contract', label: 'Nhận hợp đồng quảng cáo' },
    { key: 'affiliate', label: 'Làm Affiliate' },
    { key: 'personal_brand', label: 'Xây dựng thương hiệu cá nhân' },
    { key: 'find_shop', label: 'Tìm Shop để hợp tác' },
    { key: 'find_idol', label: 'Tìm Idol Livestream' },
    { key: 'recruit', label: 'Tuyển nhân viên' },
    { key: 'find_creator', label: 'Tìm Creator quảng bá sản phẩm' },
    { key: 'manage_live_team', label: 'Quản lý đội ngũ Livestream' },
    { key: 'expand_sales', label: 'Mở rộng hoạt động bán hàng' },
    { key: 'find_partner', label: 'Tìm kiếm đối tác' },
    { key: 'learn_live', label: 'Học nghề Livestream' },
    { key: 'learn_business', label: 'Tìm hiểu kiến thức kinh doanh' }
  ];

  /* Khao sat nhu cau tuy chon — V2.0 §IV (moi trong V2.0, chua co o V1.0). */
  var NEEDS_PERSONAL = [
    { key: 'need_job', label: 'Tìm việc' }, { key: 'need_income', label: 'Tăng thu nhập' },
    { key: 'need_learn_job', label: 'Học nghề' }, { key: 'need_language', label: 'Học ngoại ngữ' },
    { key: 'need_brand', label: 'Xây dựng thương hiệu cá nhân' }, { key: 'need_content', label: 'Sáng tạo nội dung' },
    { key: 'need_video', label: 'Quay dựng video' }, { key: 'need_affiliate', label: 'Affiliate' },
    { key: 'need_calendar', label: 'Quản lý lịch cá nhân' }, { key: 'need_tasks', label: 'Quản lý công việc' },
    { key: 'need_finance', label: 'Quản lý tài chính cá nhân' }, { key: 'need_saving', label: 'Tiết kiệm' },
    { key: 'need_skills', label: 'Phát triển kỹ năng' }, { key: 'need_friends', label: 'Kết nối bạn bè nghề nghiệp' },
    { key: 'need_partner', label: 'Tìm đối tác' }, { key: 'need_startup', label: 'Khởi nghiệp' },
    { key: 'need_sell_online', label: 'Kinh doanh online' }
  ];
  var NEEDS_SHOP = [
    { key: 'need_recruit', label: 'Tuyển dụng' }, { key: 'need_staff', label: 'Quản lý nhân viên' },
    { key: 'need_live_team', label: 'Quản lý đội Livestream' }, { key: 'need_work', label: 'Quản lý công việc' },
    { key: 'need_reports', label: 'Quản lý báo cáo' }, { key: 'need_shifts', label: 'Quản lý ca làm' },
    { key: 'need_content_mgmt', label: 'Quản lý Content' }, { key: 'need_affiliate_mgmt', label: 'Quản lý Affiliate' },
    { key: 'need_ads', label: 'Quản lý quảng cáo' }, { key: 'need_products', label: 'Quản lý sản phẩm' },
    { key: 'need_stock', label: 'Quản lý kho' }, { key: 'need_orders', label: 'Quản lý đơn hàng' },
    { key: 'need_customers', label: 'Quản lý khách hàng' }, { key: 'need_money', label: 'Quản lý thu chi' },
    { key: 'need_multi_platform', label: 'Kết nối nhiều nền tảng' }, { key: 'need_training', label: 'Đào tạo nhân viên' }
  ];

  /* 16 nganh hang (§IV.B) — dung chung cho Talent va Shop de dong bo Matching. */
  var INDUSTRIES = [
    'Thời trang nữ', 'Thời trang nam', 'Mỹ phẩm', 'Chăm sóc sắc đẹp', 'Trang sức', 'Phụ kiện',
    'Đồ gia dụng', 'Nội thất', 'Mẹ và bé', 'Thực phẩm', 'Đồ công nghệ', 'Điện tử',
    'Thể thao', 'Sản phẩm số', 'Dịch vụ', 'Các ngành khác'
  ];

  /* 34 tinh/thanh + 'Toan quoc / Live online' — lay dung danh sach dang-ky.html hien co. */
  var PROVINCES = [
    'Hà Nội', 'Huế', 'Lai Châu', 'Điện Biên', 'Sơn La', 'Lạng Sơn', 'Quảng Ninh', 'Thanh Hóa',
    'Nghệ An', 'Hà Tĩnh', 'Cao Bằng', 'Tuyên Quang', 'Lào Cai', 'Thái Nguyên', 'Phú Thọ', 'Bắc Ninh',
    'Hưng Yên', 'Hải Phòng', 'Ninh Bình', 'Quảng Trị', 'Đà Nẵng', 'Quảng Ngãi', 'Gia Lai', 'Khánh Hòa',
    'Lâm Đồng', 'Đắk Lắk', 'TP. Hồ Chí Minh', 'Đồng Nai', 'Tây Ninh', 'Cần Thơ', 'Vĩnh Long',
    'Đồng Tháp', 'Cà Mau', 'An Giang', 'Toàn quốc / Live online'
  ];

  var PLATFORMS = ['Facebook Livestream', 'TikTok Shop', 'Shopee Live', 'Lazada', 'YouTube', 'Livestream đa nền tảng', 'Tại Studio', 'Tại Shop', 'Tại nhà'];
  var COLLAB_TYPES = ['Review sản phẩm', 'Quay video ngắn', 'Livestream bán hàng', 'Đại sứ thương hiệu', 'Quảng cáo', 'Affiliate theo hoa hồng', 'Nhận sản phẩm trải nghiệm', 'UGC', 'Hợp tác dài hạn'];
  var HIRE_POSITIONS = ['Idol Livestream', 'MC Livestream', 'Mẫu ảnh', 'Creator', 'Affiliate', 'Kỹ thuật Livestream', 'Vận hành sàn TMĐT', 'Content', 'Quay dựng video', 'Marketing', 'Quảng cáo', 'CSKH', 'Nhân sự kho', 'Nhân sự đóng gói', 'Quản lý đội ngũ', 'Freelancer'];
  var STAFF_TITLES = ['Kỹ thuật Livestream', 'Vận hành TikTok Shop', 'Vận hành Shopee', 'Chuyên viên quảng cáo', 'Content Creator', 'Quay phim', 'Dựng phim', 'Thiết kế', 'CSKH', 'Nhân viên kho', 'Quản lý bán hàng', 'Nhân viên Marketing', 'Nhân viên SEO'];

  /* Dinh dang 1 truong:
     key, label, type (text|number|select|multi|range|boolean|textarea|url),
     options (select/multi), required (bool), privacy, help, why (giai thich
     "Bổ sung thông tin này sẽ giúp ích gì cho bạn?"), prefillKey (khoa map
     sang v2s_signup_prefs de trang-cua-toi dien san — chi 3 truong da co). */
  function f(key, label, type, opts) {
    var o = opts || {};
    return { key: key, label: label, type: type, options: o.options || null,
      required: !!o.required, privacy: o.privacy || PRIVACY.LOGGED_IN,
      help: o.help || '', why: o.why || '', prefillKey: o.prefillKey || null,
      min: o.min, max: o.max };
  }

  /* Bo cau hoi theo vai tro. C/D dung chung bo SHOP (D tap trung tuyen dung).
     G/H/I la bo toi thieu de xuat (§4.3 ban hop nhat V2.0 — Owner da duyet
     kem ban hop nhat 22:12 24/11). */
  var QUESTIONS = {
    A: [
      { section: 'Hồ sơ nghề nghiệp', why: 'Hồ sơ đầy đủ giúp Shop tìm thấy bạn nhanh hơn và tin tưởng hơn khi mời phỏng vấn.', fields: [
        f('display_name', 'Tên nghề nghiệp / nghệ danh', 'text', { required: true, privacy: PRIVACY.PUBLIC, help: 'Tên hiển thị trên thẻ hồ sơ của bạn.' }),
        f('bio', 'Giới thiệu bản thân', 'textarea', { privacy: PRIVACY.PUBLIC, help: '2–3 câu: bạn là ai, live giỏi mặt hàng nào.' }),
        f('job_title', 'Chức danh', 'select', { options: ['Mẫu livestream', 'MC livestream', 'Idol livestream', 'Mẫu ảnh', 'MC / Host sự kiện'], privacy: PRIVACY.PUBLIC }),
        f('years_experience', 'Số năm kinh nghiệm', 'number', { min: 0, max: 50, privacy: PRIVACY.LOGGED_IN }),
        f('current_job', 'Công việc hiện tại', 'text', { privacy: PRIVACY.LOGGED_IN }),
        f('ready_status', 'Trạng thái sẵn sàng nhận việc', 'select', { options: ['Sẵn sàng nhận ca', 'Đang xem xét', 'Tạm nghỉ'], privacy: PRIVACY.PUBLIC, help: 'Hiện ngay trên thẻ hồ sơ và trong tìm kiếm.' }),
        f('languages', 'Ngôn ngữ sử dụng', 'multi', { options: ['Tiếng Việt', 'Tiếng Anh', 'Tiếng Trung', 'Tiếng Hàn', 'Ngôn ngữ khác'], privacy: PRIVACY.LOGGED_IN }),
        f('live_style', 'Phong cách Livestream', 'multi', { options: ['Vui nhộn', 'Chuyên nghiệp', 'Nhẹ nhàng', 'Bán hàng nhanh', 'Tư vấn sâu'], privacy: PRIVACY.LOGGED_IN }),
        f('skills', 'Kỹ năng', 'multi', { options: ['Giao tiếp', 'Tư vấn', 'Chốt đơn', 'Xử lý tình huống', 'Xây dựng kịch bản', 'Quay video', 'Sáng tạo nội dung'], privacy: PRIVACY.LOGGED_IN })
      ] },
      { section: 'Chuyên môn ngành hàng', why: 'Ngành mạnh nhất quyết định bạn xuất hiện trong tìm kiếm nào của Shop.', fields: [
        f('industries', 'Ngành hàng (chọn nhiều)', 'multi', { options: INDUSTRIES, required: true, privacy: PRIVACY.PUBLIC, prefillKey: 'desiredField' }),
        f('top_industry', 'Ngành mạnh nhất', 'select', { options: INDUSTRIES, required: true, privacy: PRIVACY.PUBLIC, prefillKey: 'priorityField' }),
        f('industry_experience', 'Kinh nghiệm theo ngành mạnh nhất', 'text', { privacy: PRIVACY.LOGGED_IN, help: 'VD: 2 năm thời trang nữ, từng live 300+ phiên.' }),
        f('brands_worked', 'Thương hiệu từng hợp tác', 'text', { privacy: PRIVACY.LOGGED_IN }),
        f('demo_video', 'Video Livestream tiêu biểu (link)', 'url', { privacy: PRIVACY.LOGGED_IN })
      ] },
      { section: 'Kinh nghiệm theo nền tảng', why: 'Shop cần biết bạn đã live ở đâu để xếp ca đúng nền tảng.', fields: [
        f('platforms', 'Nền tảng đã live', 'multi', { options: PLATFORMS, privacy: PRIVACY.LOGGED_IN }),
        f('social_links', 'Link kênh / hồ sơ mạng xã hội', 'url', { privacy: PRIVACY.LOGGED_IN, help: 'Số liệu tự khai và số liệu xác minh qua kết nối chính thức được phân biệt rõ.' })
      ] },
      { section: 'Năng lực và Portfolio', why: 'Portfolio tốt là thứ Shop xem đầu tiên trước khi nhắn tin.', fields: [
        f('portfolio_links', 'Album ảnh / Portfolio (link)', 'url', { privacy: PRIVACY.LOGGED_IN }),
        f('intro_video', 'Video giới thiệu bản thân (link)', 'url', { privacy: PRIVACY.LOGGED_IN }),
        f('achievements', 'Thành tích nghề nghiệp', 'textarea', { privacy: PRIVACY.LOGGED_IN })
      ] },
      { section: 'Thông tin ngoại hình (tùy chọn)', why: 'Chỉ dùng khi công việc người mẫu yêu cầu. Không dùng để chấm điểm uy tín hay loại bỏ ứng viên.', fields: [
        f('height', 'Chiều cao (cm)', 'number', { min: 100, max: 220, privacy: PRIVACY.PRIVATE }),
        f('clothing_size', 'Size trang phục', 'text', { privacy: PRIVACY.PRIVATE }),
        f('shoe_size', 'Size giày', 'text', { privacy: PRIVACY.PRIVATE }),
        f('fashion_style', 'Phong cách thời trang', 'text', { privacy: PRIVACY.PRIVATE })
      ] },
      { section: 'Mức thu nhập mong muốn', why: 'Tách lương cứng khỏi thu nhập tiềm năng để tránh tranh chấp khi đối soát. Mặc định riêng tư.', fields: [
        f('pay_hour', 'Lương theo giờ (VNĐ, khoảng từ–đến)', 'range', { min: 0, privacy: PRIVACY.PRIVATE }),
        f('pay_session', 'Thu nhập theo buổi Livestream (VNĐ)', 'range', { min: 0, privacy: PRIVACY.PRIVATE }),
        f('pay_month', 'Lương theo tháng (VNĐ, khoảng từ–đến)', 'range', { min: 0, privacy: PRIVACY.PRIVATE }),
        f('booking_fee', 'Phí Booking (VNĐ)', 'number', { min: 0, privacy: PRIVACY.PRIVATE }),
        f('commission_pct', 'Mức hoa hồng mong muốn (%)', 'number', { min: 0, max: 100, privacy: PRIVACY.PRIVATE }),
        f('income_visibility', 'Ai được xem mức thu nhập của bạn', 'select', { options: ['Chỉ mình tôi', 'Chỉ nhà tuyển dụng đủ điều kiện', 'Công khai'], privacy: PRIVACY.PRIVATE })
      ] },
      { section: 'Điều kiện làm việc', why: 'Shop lọc theo điều kiện làm việc trước khi mời — khớp ngay từ đầu thì đỡ mất thời gian hai bên.', fields: [
        f('work_place', 'Nơi làm việc', 'multi', { options: ['Tại Shop', 'Tại Studio', 'Tại nhà'], privacy: PRIVACY.LOGGED_IN }),
        f('work_form', 'Hình thức làm việc', 'multi', { options: ['Full-time', 'Part-time', 'Freelancer'], privacy: PRIVACY.LOGGED_IN }),
        f('work_arrangement', 'Hình thức hợp tác', 'multi', { options: ['Theo ca', 'Theo dự án', 'Hợp đồng dài hạn'], privacy: PRIVACY.LOGGED_IN }),
        f('has_equipment', 'Có thiết bị Livestream cá nhân', 'boolean', { privacy: PRIVACY.LOGGED_IN }),
        f('has_space', 'Có không gian Livestream', 'boolean', { privacy: PRIVACY.LOGGED_IN }),
        f('can_self_film', 'Có khả năng tự quay dựng video', 'boolean', { privacy: PRIVACY.LOGGED_IN }),
        f('can_receive_samples', 'Có thể nhận sản phẩm mẫu', 'boolean', { privacy: PRIVACY.LOGGED_IN })
      ] },
      { section: 'Mục tiêu phát triển nghề nghiệp', why: 'Dùng để cá nhân hóa cơ hội, nội dung và công cụ cho bạn.', fields: [
        f('career_goals', 'Mục tiêu của bạn', 'multi', { options: ['Có công việc ổn định', 'Tăng thu nhập', 'Nhận nhiều Booking hơn', 'Xây dựng thương hiệu cá nhân', 'Trở thành Creator', 'Phát triển Affiliate', 'Mở Shop', 'Xây dựng đội ngũ', 'Học kỹ năng mới'], privacy: PRIVACY.LOGGED_IN })
      ] }
    ],
    B: [
      { section: 'Hồ sơ kênh', why: 'Shop tìm Creator theo ngành hàng và tệp khán giả, không tìm theo follower chung chung.', fields: [
        f('channel_name', 'Tên kênh', 'text', { required: true, privacy: PRIVACY.PUBLIC }),
        f('channel_platforms', 'Nền tảng hoạt động', 'multi', { options: ['TikTok', 'Facebook', 'YouTube', 'Shopee Video', 'Instagram'], required: true, privacy: PRIVACY.PUBLIC }),
        f('channel_url', 'Đường dẫn kênh', 'url', { privacy: PRIVACY.LOGGED_IN }),
        f('content_field', 'Lĩnh vực nội dung', 'multi', { options: INDUSTRIES, privacy: PRIVACY.PUBLIC }),
        f('creative_style', 'Phong cách sáng tạo', 'text', { privacy: PRIVACY.LOGGED_IN }),
        f('publish_freq', 'Tần suất xuất bản', 'select', { options: ['Hằng ngày', '3–4 video/tuần', '1–2 video/tuần', 'Không đều'], privacy: PRIVACY.LOGGED_IN }),
        f('followers_self', 'Số người theo dõi (tự khai)', 'number', { min: 0, privacy: PRIVACY.LOGGED_IN, help: 'Số liệu tự khai — chưa phải số đã xác minh.' }),
        f('featured_video', 'Video tiêu biểu (link)', 'url', { privacy: PRIVACY.LOGGED_IN })
      ] },
      { section: 'Hình thức hợp tác', why: 'Shop lọc Creator theo hình thức hợp tác trước khi gửi lời mời.', fields: [
        f('collab_types', 'Hình thức hợp tác nhận', 'multi', { options: COLLAB_TYPES, required: true, privacy: PRIVACY.PUBLIC })
      ] },
      { section: 'Điều kiện nhận chiến dịch', why: 'Điều kiện rõ ràng giúp hai bên chốt nhanh, tránh đàm phán vòng vo.', fields: [
        f('desired_industries', 'Ngành hàng mong muốn', 'multi', { options: INDUSTRIES, privacy: PRIVACY.LOGGED_IN }),
        f('excluded_industries', 'Ngành hàng không nhận', 'multi', { options: INDUSTRIES, privacy: PRIVACY.LOGGED_IN }),
        f('expected_fee', 'Mức phí dự kiến (VNĐ)', 'number', { min: 0, privacy: PRIVACY.PRIVATE }),
        f('expected_commission', 'Hoa hồng mong muốn (%)', 'number', { min: 0, max: 100, privacy: PRIVACY.PRIVATE }),
        f('available_time', 'Thời gian có thể thực hiện', 'text', { privacy: PRIVACY.LOGGED_IN }),
        f('can_produce', 'Có khả năng sản xuất nội dung', 'boolean', { privacy: PRIVACY.LOGGED_IN }),
        f('can_self_live', 'Có khả năng tự Livestream', 'boolean', { privacy: PRIVACY.LOGGED_IN })
      ] }
    ],
    C: [
      { section: 'Thông tin Shop', why: 'Hồ sơ kinh doanh riêng — không dùng hồ sơ cá nhân thay thế toàn bộ thông tin doanh nghiệp.', fields: [
        f('shop_name', 'Tên Shop', 'text', { required: true, privacy: PRIVACY.PUBLIC }),
        f('shop_bio', 'Giới thiệu Shop', 'textarea', { privacy: PRIVACY.PUBLIC }),
        f('business_type', 'Loại hình kinh doanh', 'select', { options: ['Cá nhân / hộ kinh doanh', 'Shop online', 'Doanh nghiệp', 'Thương hiệu'], privacy: PRIVACY.LOGGED_IN }),
        f('work_area', 'Khu vực hoạt động', 'select', { options: PROVINCES, required: true, privacy: PRIVACY.PUBLIC, prefillKey: 'workLocation' }),
        f('staff_count_range', 'Số lượng nhân sự', 'select', { options: ['1 người', '2–5 người', '5–20 người', 'Trên 20 người'], privacy: PRIVACY.LOGGED_IN }),
        f('years_active', 'Số năm hoạt động', 'number', { min: 0, max: 50, privacy: PRIVACY.LOGGED_IN }),
        f('website', 'Website', 'url', { privacy: PRIVACY.LOGGED_IN }),
        f('fanpage', 'Fanpage', 'url', { privacy: PRIVACY.LOGGED_IN }),
        f('tiktok', 'Kênh TikTok', 'url', { privacy: PRIVACY.LOGGED_IN }),
        f('store_link', 'Link gian hàng', 'url', { privacy: PRIVACY.LOGGED_IN })
      ] },
      { section: 'Ngành hàng kinh doanh', why: 'Dùng chung hệ thống danh mục với Talent để đồng bộ Matching.', fields: [
        f('shop_industries', 'Ngành hàng (chọn nhiều)', 'multi', { options: INDUSTRIES, required: true, privacy: PRIVACY.PUBLIC }),
        f('main_industry', 'Ngành chính', 'select', { options: INDUSTRIES, required: true, privacy: PRIVACY.PUBLIC }),
        f('main_products', 'Sản phẩm chủ lực', 'text', { privacy: PRIVACY.LOGGED_IN }),
        f('price_segment', 'Phân khúc giá', 'select', { options: ['Bình dân', 'Trung cấp', 'Cao cấp'], privacy: PRIVACY.LOGGED_IN }),
        f('sell_model', 'Hình thức bán', 'multi', { options: ['Bán lẻ', 'Bán buôn', 'Thương hiệu tự sản xuất', 'Nhập hàng', 'Đại lý', 'Dropshipping'], privacy: PRIVACY.LOGGED_IN })
      ] },
      { section: 'Quy mô và hoạt động Livestream', why: 'Quy mô đội live quyết định Shop cần tuyển ai và cần công cụ quản lý nào.', fields: [
        f('idol_count', 'Số Idol hiện có', 'number', { min: 0, privacy: PRIVACY.LOGGED_IN }),
        f('ops_staff', 'Nhân sự vận hành', 'number', { min: 0, privacy: PRIVACY.LOGGED_IN }),
        f('live_rooms', 'Phòng Livestream', 'number', { min: 0, privacy: PRIVACY.LOGGED_IN }),
        f('shifts_per_day', 'Ca Livestream mỗi ngày', 'number', { min: 0, privacy: PRIVACY.LOGGED_IN }),
        f('live_hours', 'Khung giờ hoạt động', 'text', { privacy: PRIVACY.LOGGED_IN }),
        f('has_studio', 'Có Studio riêng', 'boolean', { privacy: PRIVACY.LOGGED_IN }),
        f('has_live_equipment', 'Có thiết bị Livestream', 'boolean', { privacy: PRIVACY.LOGGED_IN }),
        f('has_content_team', 'Có đội sản xuất nội dung', 'boolean', { privacy: PRIVACY.LOGGED_IN }),
        f('expand_need', 'Có nhu cầu mở rộng đội ngũ', 'boolean', { privacy: PRIVACY.LOGGED_IN }),
        f('selling_platforms', 'Nền tảng đang bán hàng', 'multi', { options: ['TikTok Shop', 'Shopee', 'Lazada', 'Facebook', 'Website'], privacy: PRIVACY.LOGGED_IN })
      ] },
      { section: 'Nhu cầu tuyển dụng', why: 'Tin tuyển rõ ràng (số lượng, ngân sách, hình thức trả) giúp mẫu ứng tuyển đúng ngay từ đầu.', fields: [
        f('hire_positions', 'Vị trí cần tuyển (chọn nhiều)', 'multi', { options: HIRE_POSITIONS, privacy: PRIVACY.PUBLIC }),
        f('hire_count', 'Số lượng cần tuyển', 'number', { min: 0, privacy: PRIVACY.LOGGED_IN }),
        f('hire_deadline', 'Thời gian cần nhân sự', 'text', { privacy: PRIVACY.LOGGED_IN }),
        f('hire_budget', 'Ngân sách tuyển dụng', 'text', { privacy: PRIVACY.PRIVATE, help: 'Chỉ bạn xem được.' }),
        f('pay_form', 'Hình thức trả lương', 'select', { options: ['Theo giờ', 'Theo ca', 'Theo tháng', 'Hoa hồng theo doanh số', 'Kết hợp (giờ + hoa hồng)'], privacy: PRIVACY.LOGGED_IN }),
        f('hire_requirements', 'Yêu cầu chuyên môn', 'textarea', { privacy: PRIVACY.LOGGED_IN }),
        f('hire_area', 'Khu vực tuyển', 'select', { options: PROVINCES, privacy: PRIVACY.LOGGED_IN }),
        f('hire_shifts', 'Ca làm việc', 'multi', { options: ['Ca sáng', 'Ca chiều', 'Ca tối', 'Ca đêm', 'Linh hoạt'], privacy: PRIVACY.LOGGED_IN })
      ] }
    ],
    D: 'C', /* Doanh nghiep dung chung bo cau hoi Shop (tap trung tuyen dung). */
    E: [
      { section: 'Hồ sơ tổ chức', why: 'Agency/Studio cần hồ sơ tổ chức riêng để Shop tin tưởng giao Talent và Booking.', fields: [
        f('org_name', 'Tên Agency / Studio', 'text', { required: true, privacy: PRIVACY.PUBLIC }),
        f('org_field', 'Lĩnh vực hoạt động', 'multi', { options: ['Quản lý Talent', 'Studio Livestream', 'Sản xuất nội dung', 'Đào tạo', 'Dịch vụ khác'], privacy: PRIVACY.PUBLIC }),
        f('talent_count', 'Số lượng Talent', 'number', { min: 0, privacy: PRIVACY.LOGGED_IN }),
        f('studio_count', 'Số lượng Studio', 'number', { min: 0, privacy: PRIVACY.LOGGED_IN }),
        f('org_locations', 'Địa điểm hoạt động', 'multi', { options: PROVINCES, privacy: PRIVACY.LOGGED_IN }),
        f('equipment', 'Trang thiết bị', 'text', { privacy: PRIVACY.LOGGED_IN }),
        f('services', 'Dịch vụ cung cấp', 'multi', { options: ['Cung cấp Idol/MC', 'Cho thuê Studio', 'Sản xuất video', 'Đào tạo livestream', 'Quản lý chiến dịch'], privacy: PRIVACY.PUBLIC }),
        f('top_industries', 'Ngành hàng thế mạnh', 'multi', { options: INDUSTRIES, privacy: PRIVACY.PUBLIC }),
        f('partners', 'Đối tác từng hợp tác', 'text', { privacy: PRIVACY.LOGGED_IN }),
        f('org_needs', 'Nhu cầu hiện tại', 'multi', { options: ['Tuyển dụng Talent', 'Tìm khách hàng', 'Kết nối Shop'], privacy: PRIVACY.LOGGED_IN }),
        f('ref_price', 'Giá dịch vụ tham khảo', 'text', { privacy: PRIVACY.PRIVATE }),
        f('org_portfolio', 'Portfolio doanh nghiệp (link)', 'url', { privacy: PRIVACY.LOGGED_IN })
      ] }
    ],
    F: [
      { section: 'Hồ sơ chuyên môn', why: 'Shop tìm nhân sự kỹ thuật theo đúng chức danh và công cụ thành thạo.', fields: [
        f('staff_title', 'Chức danh', 'select', { options: STAFF_TITLES, required: true, privacy: PRIVACY.PUBLIC }),
        f('staff_skills', 'Kỹ năng', 'textarea', { privacy: PRIVACY.LOGGED_IN }),
        f('tools', 'Công cụ thành thạo', 'text', { privacy: PRIVACY.LOGGED_IN }),
        f('years_experience', 'Năm kinh nghiệm', 'number', { min: 0, max: 50, privacy: PRIVACY.LOGGED_IN }),
        f('industries', 'Ngành hàng', 'multi', { options: INDUSTRIES, privacy: PRIVACY.LOGGED_IN }),
        f('projects', 'Dự án từng thực hiện', 'textarea', { privacy: PRIVACY.LOGGED_IN }),
        f('achievements', 'Thành tích', 'textarea', { privacy: PRIVACY.LOGGED_IN }),
        f('desired_salary', 'Mức lương mong muốn (VNĐ/tháng)', 'number', { min: 0, privacy: PRIVACY.PRIVATE }),
        f('work_form', 'Hình thức làm việc', 'multi', { options: ['Full-time', 'Part-time', 'Freelancer', 'Theo dự án'], privacy: PRIVACY.LOGGED_IN }),
        f('portfolio', 'Portfolio (link)', 'url', { privacy: PRIVACY.LOGGED_IN }),
        f('area', 'Khu vực', 'select', { options: PROVINCES, privacy: PRIVACY.LOGGED_IN }),
        f('available_time', 'Thời gian sẵn sàng nhận việc', 'text', { privacy: PRIVACY.LOGGED_IN }),
        f('career_goal', 'Mục tiêu phát triển', 'text', { privacy: PRIVACY.LOGGED_IN })
      ] }
    ],
    G: [
      { section: 'Bạn muốn học gì', why: 'Học đúng kỹ năng cần cho nghề livestream — hệ thống sẽ gợi ý lộ trình phù hợp.', fields: [
        f('skill_to_learn', 'Kỹ năng muốn học (chọn nhiều)', 'multi', { options: ['Nói trước camera', 'Giới thiệu sản phẩm', 'Chốt đơn', 'Quay dựng video', 'Affiliate', 'Xây dựng thương hiệu cá nhân'], required: true, privacy: PRIVACY.LOGGED_IN }),
        f('learn_goal', 'Mục tiêu học', 'text', { privacy: PRIVACY.LOGGED_IN }),
        f('free_time', 'Thời gian rảnh để học', 'text', { privacy: PRIVACY.LOGGED_IN }),
        f('learn_budget', 'Ngân sách học (nếu có)', 'text', { privacy: PRIVACY.PRIVATE })
      ] }
    ],
    H: [
      { section: 'Dịch vụ bạn cung cấp', why: 'Shop tìm đối tác dịch vụ theo khu vực và bảng giá — rõ ràng thì được mời nhanh.', fields: [
        f('services', 'Dịch vụ cung cấp (chọn nhiều)', 'multi', { options: ['Vận hành sàn TMĐT', 'Logistics / giao vận', 'Thiết kế', 'Đào tạo', 'Quay dựng', 'Quảng cáo', 'Dịch vụ khác'], required: true, privacy: PRIVACY.PUBLIC }),
        f('service_area', 'Khu vực phục vụ', 'multi', { options: PROVINCES, privacy: PRIVACY.LOGGED_IN }),
        f('ref_price', 'Bảng giá tham khảo', 'text', { privacy: PRIVACY.PRIVATE }),
        f('portfolio', 'Dự án đã làm (link)', 'url', { privacy: PRIVACY.LOGGED_IN })
      ] }
    ],
    I: [
      { section: 'Khám phá cơ hội', why: 'Chỉ cần mục tiêu, sở thích và khu vực — bổ sung sau khi bạn chọn vai trò rõ hơn.', fields: [
        f('explore_goals', 'Mục tiêu của bạn', 'multi', { options: GOALS.map(function (g) { return g.label; }), privacy: PRIVACY.LOGGED_IN }),
        f('interests', 'Sở thích / ngành quan tâm', 'multi', { options: INDUSTRIES, privacy: PRIVACY.LOGGED_IN }),
        f('area', 'Khu vực', 'select', { options: PROVINCES, privacy: PRIVACY.LOGGED_IN })
      ] }
    ]
  };

  /* Trong so hoan thien ho so — Talent (de xuat, kiem chung bang du lieu thuc
     sau khi chay). Vai tro khac dung bo trong so mac dinh (chia deu 6 nhom). */
  var COMPLETION_WEIGHTS = {
    talent: { basic: 15, goals: 10, skills: 20, experience: 15, portfolio: 20, work: 10, verification: 10 },
    shop: { basic: 20, shop: 25, industries: 15, hiring: 20, scale: 10, verification: 10 },
    other: { basic: 20, goals: 15, skills: 20, experience: 15, portfolio: 15, work: 15 }
  };

  var API = {
    PRIVACY: PRIVACY, ROLES: ROLES, GOALS: GOALS,
    NEEDS_PERSONAL: NEEDS_PERSONAL, NEEDS_SHOP: NEEDS_SHOP,
    INDUSTRIES: INDUSTRIES, PROVINCES: PROVINCES,
    PLATFORMS: PLATFORMS, COLLAB_TYPES: COLLAB_TYPES,
    HIRE_POSITIONS: HIRE_POSITIONS, STAFF_TITLES: STAFF_TITLES,
    QUESTIONS: QUESTIONS, COMPLETION_WEIGHTS: COMPLETION_WEIGHTS,
    VERSION: 1
  };

  if (typeof window !== 'undefined') window.V2SOnboardingFields = API;
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
})();
