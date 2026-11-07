/* v44 tests — Node only, no browser. v44 = nhat quan ngon ngu (C1–C12) + sua
   noi dung (F1–F5), nguoi dung duyet het rang sang 06/11/2026 (xem
   hidden_files/nhat-quan-ngon-ngu-v44-2026-11-06.md). Quy tac chung:
   - KHONG sua du lieu goc ho so mau/shop NGOAI C8 (D1–D9 giu nguyen tuyet
     doi: "Duyênn", "ekip", "2K–2K6", "m58–m68", "0.5%", "training"...).
   - KHONG sua chuoi DA CHOT (disclaimer v40, dong PR v41, 2 cau hoi FAQ
     moi v42, owner-note v42) — kiem tra van nguyen van o day.
   - KHONG sua so lieu, ngay thang, ten rieng, ten thuong hieu, URL, slug,
     ngay ISO.
   (C1) "tỉ" -> "tỷ" toan web (van ban hien thi): 42 cho (bai-viet + data.js
     takeaway). "tỉnh" KHONG duoc cham (regex \btỉ\b). 2 cho "tỉ" con lai
     trong app.js la regex parseRevenue (dong 354/359) — CO TINH giu lai
     de ham van hieu ca 2 cach viet cu/moi, khong phai van ban hien thi.
   (C2) "minh hoạ" -> "minh họa" (app.js dong 27, 1 cho duy nhat).
   (C3) "EMARKETER" -> "eMarketer" (ai-lam-thay-phan-tim-hang §6, 1 cho).
   (C4) "quý 3" -> "quý III" (9 cho, chi trong bai gen-z; dang "quý 3-2026"
     -> "quý III-2026", giu gach noi giua quy va nam). MO RONG (de quy III
     khong le loi — cac bai khac von dung so La Ma: "quý II/III/IV" co san
     o tiktok-shop-thu-hep, nguoi-tieu-dung-bot-san-sale): "quý 2" -> "quý II"
     (gen-z 2 cho + livestream-ban-hang-my "quý 2/2025" + mua-le-2026-my
     "quý 2"), "quý 4" -> "quý IV" (gen-z 2 cho + tiktok-shop-my-black-friday
     "quý 4/2025"). Tong C4: 19 cho.
   (C5) "TP HCM" -> "TP. Hồ Chí Minh" trong bai-viet (5 cho: nguoi-tieu-dung
     3, livestream-cung-kol 2). req goc sh-18 "Fulltime tại TP HCM" GIU
     NGUYEN (du lieu goc).
   (C6) "tháng 5/2026" -> "tháng 05/2026" (2 cho: phi-san-tang §1,
     nguoi-tieu-dung-bot-san-sale chu thich anh).
   (C7) gach noi "-" -> "–" cho khoang so hien thi (14 cho: "70-30" 6 lan,
     "20-25 đơn", "1-2 ngày", "8-10 lần", "10-15 đơn", "200-300 đơn",
     "10-15%", "40-45%", "1-2 món" trong takeaway data.js). GIU NGUYEN:
     ngay ISO (2026-10-27), ten file/slug ("11-11", "3-4" trong slug),
     ten quy tac "3-3-30", "quý III-2026" (gach noi giua quy va nam),
     du lieu goc shop ("80-100k/h", "0.5% - 1%").
   (C8) sh-30 req "Đào tạo 1-1 từ đầu" -> "Đào tạo 1:1 từ đầu" (1 cho duy
     nhat duoc phep sua trong du lieu goc — chuan hoa dau cau).
   (C9) nhan/tieu de giao dien "live" -> "livestream" (chi nhan/tieu de,
     khong cham van phong noi trong bai bao):
     - danh-sach-shop.html: H1 "tìm mẫu live" -> "tìm mẫu livestream";
       nhan loc "Lĩnh vực live" -> "Lĩnh vực livestream"; placeholder
       "cần mẫu live" -> "cần mẫu livestream"; nhan "Lịch live" ->
       "Lịch livestream"; muc tin shop "Giờ live:" -> "Giờ livestream:".
     - js/app.js: "🎯 Lĩnh vực live" -> "🎯 Lĩnh vực livestream";
       "📺 Kênh live" -> "📺 Kênh livestream"; "Giỏi live nhất" ->
       "Giỏi livestream nhất"; "Kênh live" (trang chi tiet shop, 2 cho) ->
       "Kênh livestream".
     - trang-cua-toi.html: placeholder "3 tháng live gia dụng, 1 năm live
       thời trang" -> livestream; nhan "Loại sản phẩm muốn live" ->
       "Loại sản phẩm muốn livestream"; nhan "1 video live mẫu" ->
       "1 video livestream mẫu".
     - chi-tiet-shop.html: meta "kênh live" -> "kênh livestream" (3 the).
     - bai-viet-bop-reach.html: link dieu huong "Trang chủ sàn mẫu live"
       -> "Trang chủ sàn mẫu livestream".
     GIU NGUYEN (co chu dich, ghi ro): "live" trong than bai bao
     ("mỗi buổi live", "buổi live đông mắt"...); thuat ngu "live online"
     (hinh thuc truc tuyen, khac voi "livestream"); cau van trong than
     trang ("giờ live", "Sau buổi live" o buoc 3 trang Shop; "lịch live"
     o index.html; "mẫu live" o intro tin-tuc.html).
   (C10) FAQ trang chu: "Chỉ mẫu tự up hoặc sửa hồ sơ mới cần đăng nhập."
     -> "Chỉ mẫu tự đăng hoặc sửa hồ sơ mới cần đăng nhập."
   (C11) vi-tien-ao.html §5: "1 đơn đang active" -> "1 đơn đang chạy";
     "Client không tự cộng hoặc trừ số dư, không tự kích hoạt up top."
     -> "Bạn không thể tự cộng hoặc trừ số dư, cũng không thể tự kích
     hoạt up top."
   (C12) footer quy-tac-diem-thuong.html: "kinh doanh online. Zalo 032
     998 3699." -> "kinh doanh online · Zalo 032 998 3699."
   (F1) danh-sach-shop.html buoc 1: cau sai "sắp xếp theo lượt xem, bình
     luận, lương hoặc mới nhất" -> "sắp xếp theo lương giờ, lương tháng
     hoặc lọc theo giờ làm để tìm đúng mẫu nhanh hơn."
   (F2) vi-tien-ao.html muc 4: tieu de tach "Hết hạn / Hoàn xu" thanh 2
     muc rieng "Hết hạn → Hoàn xu" (kiem chung tu tai lieu noi bo
     docs-email-marketing-va-tien-ao.md dong 120-121 + 173: don co DUNG 5
     trang thai rieng; doan "1 trong 5 trạng thái" nay dung, giu nguyen).
   (F3) viet lai van ban ky thuat noi bo hien cong khai (danh-sach-shop
     + vi-tien-ao): bo ten file migration, ten bang DB, ten tai lieu noi
     bo, "migration M2/M3", "service_role" khoi van ban hien thi; giu
     nguyen y nghia that (luu that, cho duyet, marketing tach rieng theo
     dong y). BO SUNG (phat hien them khi kiem chung, khong co trong bao
     cao v43): trang-cua-toi.html thong bao loi luu "cần chạy file
     supabase-migration-top-revenue.sql trên Supabase Dashboard" -> viet
     lai bang tieng Viet nguoi dung. Ten cot "marketing_opt_in" trong
     <script> cua vi-tien-ao.html la code (khong hien thi), giu nguyen.
   (F4) trang-cua-toi.html: bo "không dùng service_role trên web" ->
     "Web không thu thập CCCD và không lưu mật khẩu của bạn."
   (F5) js/app.js trang chi tiet shop: "Đang hiện 1 tin tuyển đang mở."
     -> "Hiện có 1 tin tuyển đang mở." (KIEM CHUNG: chuoi nay HARDCODE
     so 1 — trang chi tiet luon render dung 1 tin tuyen cho 1 shop, khong
     phai mau dong co bien dem; test-v32 cap nhat theo.)
   sw.js CACHE = 'v76-shell-1' (ghi chu dau file v43 -> v44 -> v49). */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let pass = 0, fail = 0;
function t(name, cond, extra = '') { if (cond) { pass++; console.log('PASS v44:', name); } else { fail++; console.log('FAIL v44:', name, extra); } }
const D = (() => { const sb = { window: {} }; vm.createContext(sb); vm.runInContext(fs.readFileSync(path.join(root, 'js/data.js'), 'utf8'), sb); return sb.window.V20_DATA; })();
const V = (() => { const sb = { window: {}, module: { exports: {} }, console }; vm.createContext(sb); vm.runInContext(fs.readFileSync(path.join(root, 'js/data.js'), 'utf8'), sb); vm.runInContext(fs.readFileSync(path.join(root, 'js/app.js'), 'utf8'), sb); return sb.window.V20; })();
const appJs = fs.readFileSync(path.join(root, 'js/app.js'), 'utf8');
const shopHtml = fs.readFileSync(path.join(root, 'danh-sach-shop.html'), 'utf8');
const mauHtml = fs.readFileSync(path.join(root, 'danh-sach-mau.html'), 'utf8');
const indexHtml = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const viTienAo = fs.readFileSync(path.join(root, 'vi-tien-ao.html'), 'utf8');
const swJs = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');
const stripScripts = h => h.replace(/<script[\s\S]*?<\/script>/g, '');
const allHtml = fs.readdirSync(path.join(root, 'bai-viet')).filter(f => f.endsWith('.html')).map(f => read('bai-viet/' + f)).join('\n')
  + ['index.html', 'danh-sach-mau.html', 'danh-sach-shop.html', 'ho-so.html', 'chi-tiet-shop.html', 'tin-tuc.html', 'quy-tac-diem-thuong.html', 'vi-tien-ao.html', 'trang-cua-toi.html', 'bai-viet-bop-reach.html'].map(read).join('\n');

// ---- (C1) "tỉ" -> "tỷ" ----
t('C1: khong con "tỉ" doc lap trong van ban hien thi (HTML + data.js)',
  // Luu y: /\btỉ\b/ trong JS la ASCII-only nen KHOP NHAM "tỉnh" (vi "ỉ" khong
  // phai \w) — dung (?!nh) de loai "tỉnh". Script sua dung Python (\b Unicode).
  !/tỉ(?!nh)/.test(allHtml) && !/tỉ(?!nh)/.test(JSON.stringify(D.articles)),
  'con "tỉ" o: ' + (allHtml.match(/tỉ(?!nh)/g) || []).length + ' cho HTML');
t('C1: "tỷ" co mat dung dang moi (vd "411.800 tỷ đồng", "tiền tỷ")',
  read('bai-viet/gen-z-gen-y-tang-chi-tieu-cuoi-nam.html').includes('411.800 tỷ đồng')
  && D.articles.some(a => (a.takeaway || '').includes('tiền tỷ')));
t('C1: "tỉnh" khong bi cham (khong thanh "tỷnh")',
  appJs.includes("'Hồ sơ mẫu thật · '") && appJs.includes("tỉnh") && !/tỷnh/.test(appJs + allHtml));
t('C1: parseRevenue van hieu ca "tỉ" cu (regex giu lai co tinh, khong phai van ban hien thi)',
  // "5.000 tỉ" = 5.000 x 1 ty = 5e12 (khong phai 5e9).
  V.parseRevenue('5.000 tỉ') === 5000000000000 && V.parseRevenue('5.000 tỷ') === 5000000000000);

// ---- (C2) "minh hoạ" -> "minh họa" ----
t('C2: app.js dung "Ảnh minh họa tạm", het "minh hoạ"',
  appJs.includes('Ảnh minh họa tạm') && !appJs.includes('minh hoạ'));

// ---- (C3) "EMARKETER" -> "eMarketer" ----
t('C3: ai-lam-thay dung "mô hình của eMarketer", het "EMARKETER"',
  read('bai-viet/ai-lam-thay-phan-tim-hang.html').includes('mô hình của eMarketer')
  && !read('bai-viet/ai-lam-thay-phan-tim-hang.html').includes('EMARKETER'));

// ---- (C4) "quý 3" -> "quý III" (+ mo rong quý 2/4 -> II/IV) ----
t('C4: gen-z dung "quý III-2026" (meta + lead + muc), het "quý 3" dang so',
  read('bai-viet/gen-z-gen-y-tang-chi-tieu-cuoi-nam.html').includes('Quý III-2026')
  && read('bai-viet/gen-z-gen-y-tang-chi-tieu-cuoi-nam.html').includes('trong quý III-2026')
  && !/quý 3\b/i.test(read('bai-viet/gen-z-gen-y-tang-chi-tieu-cuoi-nam.html')));
t('C4 mo rong: het "quý 2"/"quý 4" dang so o toan bo bai-viet + data.js',
  !/quý [24]\b/i.test(allHtml) && !/quý [24]\b/i.test(JSON.stringify(D.articles)));
t('C4 mo rong: "quý II"/"quý IV" co mat dung cho (gen-z, livestream-my, mua-le, black-friday)',
  read('bai-viet/gen-z-gen-y-tang-chi-tieu-cuoi-nam.html').includes('trong quý II lên 141 điểm')
  && read('bai-viet/gen-z-gen-y-tang-chi-tieu-cuoi-nam.html').includes('trong quý IV')
  && read('bai-viet/livestream-ban-hang-my-tang-gan-50-phan-tram.html').includes('quý II/2025')
  && read('bai-viet/tiktok-shop-my-black-friday-2026.html').includes('quý IV/2025'));

// ---- (C5) "TP HCM" -> "TP. Hồ Chí Minh" (bai-viet) ----
t('C5: bai-viet dung "TP. Hồ Chí Minh", het "TP HCM"',
  read('bai-viet/nguoi-tieu-dung-bot-san-sale.html').includes('phường Gia Định (TP. Hồ Chí Minh)')
  && read('bai-viet/livestream-cung-kol-mo-dau-ra.html').includes('ở TP. Hồ Chí Minh')
  && !/TP HCM/.test(allHtml.split('bai-viet').join('')));
t('C5: req goc sh-18 GIU NGUYEN "Fulltime tại TP HCM" (du lieu goc, khong sua)',
  D.shops.find(s => s.id === 'sh-18').req === 'Fulltime tại TP HCM; tuyển 1 bạn.');

// ---- (C6) "tháng 5/2026" -> "tháng 05/2026" ----
t('C6: 2 cho dung "tháng 05/2026", het "tháng 5/2026"',
  read('bai-viet/phi-san-tang-thang-05-2026.html').includes('kể từ tháng 05/2026')
  && read('bai-viet/nguoi-tieu-dung-bot-san-sale.html').includes('vào tháng 05/2026')
  && !allHtml.includes('tháng 5/2026'));

// ---- (C7) "-" -> "–" cho khoang so hien thi ----
t('C7: cac khoang so dung en-dash ("70–30", "20–25 đơn", "1–2 ngày", "8–10 lần", "10–15 đơn", "200–300 đơn", "10–15%", "40–45%")',
  read('bai-viet/nguoi-tieu-dung-bot-san-sale.html').includes('đồng tài trợ 70–30')
  && read('bai-viet/nguoi-tieu-dung-bot-san-sale.html').includes('chốt 20–25 đơn mỗi đợt')
  && read('bai-viet/nguoi-tieu-dung-bot-san-sale.html').includes('gói gọn 1–2 ngày mỗi tháng')
  && read('bai-viet/livestream-cung-kol-mo-dau-ra.html').includes('tăng khoảng 8–10 lần')
  && read('bai-viet/livestream-cung-kol-mo-dau-ra.html').includes('chốt khoảng <b>10–15 đơn')
  && read('bai-viet/livestream-cung-kol-mo-dau-ra.html').includes('nhận <b>200–300 đơn')
  && read('bai-viet/livestream-cung-kol-mo-dau-ra.html').includes('10–15% tổng đơn hàng')
  && read('bai-viet/livestream-cung-kol-mo-dau-ra.html').includes('40–45% từ năm ngoái'));
t('C7: takeaway data.js dung "1–2 món", het "1-2 món"',
  D.articles.find(a => a.title.includes('11.11 trên TikTok Shop')).takeaway.includes('chọn 1–2 món chủ lực')
  && !D.articles.some(a => (a.takeaway || '').includes('1-2 món')));
t('C7: het cac dang cu "70-30", "20-25 đơn", "1-2 ngày", "8-10 lần", "10-15 đơn", "200-300 đơn", "10-15%", "40-45%"',
  !/70-30|20-25 đơn|1-2 ngày|8-10 lần|10-15 đơn|200-300 đơn|10-15%|40-45%/.test(allHtml));
t('C7: GIU NGUYEN ngay ISO, ten quy tac "3-3-30", "11-11" trong slug, "quý III-2026"',
  read('bai-viet/mua-le-2026-my-dien-thoai-chiem-gan-3-4.html').includes('"datePublished":"2026-10-14"')
  && read('bai-viet-bop-reach.html').includes('quy tắc 3-3-30')
  && read('bai-viet/gen-z-gen-y-tang-chi-tieu-cuoi-nam.html').includes('quý III-2026'));

// ---- (C8) sh-30 req "1-1" -> "1:1" ----
t('C8: sh-30 req dung "Đào tạo 1:1 từ đầu", het "1-1" trong req nay',
  D.shops.find(s => s.id === 'sh-30').req === 'Đào tạo 1:1 từ đầu. Không áp KPI. Đến phỏng vấn nhận lì xì.');

// ---- (C9) nhan/tieu de "live" -> "livestream" ----
t('C9: H1 trang Shop "tìm shop tuyển mẫu livestream", het "tìm mẫu live" (v57: viet cho doi tuong Mau)',
  shopHtml.includes('<h1>Tìm shop tuyển mẫu livestream</h1>'));
t('C9: nhan loc Shop "Lĩnh vực livestream", het "<label>Lĩnh vực live</label>"',
  shopHtml.includes('<label>Lĩnh vực livestream</label><select id="fShopCat"')
  && !shopHtml.includes('<label>Lĩnh vực live</label>'));
t('C9: app.js nhan quyet dinh "🎯 Lĩnh vực livestream" + "📺 Kênh livestream", het dang cu',
  // "Kênh livestream" chua "Kênh live" dang substring -> dung (?!stream).
  appJs.includes('🎯 Lĩnh vực livestream') && appJs.includes('📺 Kênh livestream')
  && !/Lĩnh vực live(?!stream)/.test(appJs) && !/Kênh live(?!stream)/.test(appJs));
t('C9: app.js "Giỏi livestream nhất" + "Kênh livestream" o trang chi tiet shop',
  appJs.includes('<b>Giỏi livestream nhất</b>')
  && appJs.includes("<div class=\"fact\"><b>Kênh livestream</b>")
  && appJs.includes("<p><b>Kênh livestream:</b>"));
t('C9: trang Shop muc tin "Giờ livestream:", placeholder "cần mẫu livestream", nhan "Lịch livestream"',
  shopHtml.includes("· Giờ livestream: ")
  && shopHtml.includes('placeholder="Mặt hàng cụ thể cần mẫu livestream"')
  && shopHtml.includes('<label>Lịch livestream'));
t('C9: trang-cua-toi placeholder/nhan dung "livestream"',
  read('trang-cua-toi.html').includes('placeholder="VD: 3 tháng livestream gia dụng, 1 năm livestream thời trang"')
  && read('trang-cua-toi.html').includes('Loại sản phẩm muốn livestream')
  && read('trang-cua-toi.html').includes('Video demo (1 video livestream mẫu, không bắt buộc nếu đã có)'));
t('C9: meta chi-tiet-shop + link bop-reach dung "livestream"',
  read('chi-tiet-shop.html').includes('kênh livestream và liên hệ')
  && !read('chi-tiet-shop.html').includes('kênh live và liên hệ')
  && read('bai-viet-bop-reach.html').includes('Trang chủ sàn mẫu livestream'));
t('C9: GIU NGUYEN "live" trong than bai bao + thuat ngu "live online" + cau van than trang',
  read('bai-viet-bop-reach.html').includes('mỗi buổi live')
  && appJs.includes("' + live online'")
  && read('trang-cua-toi.html').includes('hoặc live online')
  && shopHtml.includes('giờ live và thù lao'));

// ---- (C10) "tự up" -> "tự đăng" ----
t('C10: FAQ trang chu "Chỉ mẫu tự đăng hoặc sửa hồ sơ mới cần đăng nhập.", het "tự up"',
  indexHtml.includes('Chỉ mẫu tự đăng hoặc sửa hồ sơ mới cần đăng nhập.')
  && !indexHtml.includes('tự up'));

// ---- (C11) "active"/"Client" -> tieng Viet ----
t('C11: vi-tien-ao §5 "1 đơn đang chạy" + "Bạn không thể tự cộng hoặc trừ số dư"',
  viTienAo.includes('chỉ tối đa 1 đơn đang chạy tại 1 thời điểm. Bạn không thể tự cộng hoặc trừ số dư, cũng không thể tự kích hoạt up top.'));
t('C11: het "active"/"Client" trong van ban hien thi vi-tien-ao (tru <script>)',
  !/active|Client/.test(stripScripts(viTienAo)));

// ---- (C12) footer "." -> "·" ----
t('C12: quy-tac-diem-thuong dung "kinh doanh online · Zalo 032 998 3699."',
  read('quy-tac-diem-thuong.html').includes('kinh doanh online · Zalo 032 998 3699.')
  && !read('quy-tac-diem-thuong.html').includes('kinh doanh online. Zalo'));

// ---- (F1) buoc 1 trang Shop ----
t('F1: buoc 1 dung cau moi ve sap xep luong gio/thang + loc gio lam + muc luong toi thieu, het "lượt xem, bình luận" (v57: viet cho doi tuong Mau)',
  shopHtml.includes('rồi dùng thêm sắp xếp theo lương giờ, lương tháng, lọc theo giờ làm hoặc mức lương tối thiểu để tìm đúng shop nhanh hơn.')
  && !shopHtml.includes('lượt xem, bình luận'));

// ---- (F2) 5 trang thai rieng ----
t('F2: tieu de tach thanh 5 muc "Chờ duyệt → Đã duyệt → Đang chạy → Hết hạn → Hoàn xu"',
  viTienAo.includes('<h3>Theo dõi đơn: Chờ duyệt → Đã duyệt → Đang chạy → Hết hạn → Hoàn xu</h3>')
  && !viTienAo.includes('Hết hạn / Hoàn xu'));
t('F2: doan "1 trong 5 trạng thái" giu nguyen (nay dung so dem)',
  viTienAo.includes('hiện đúng 1 trong 5 trạng thái trên trong mục Đơn up top'));

// ---- (F3) viet lai van ban ky thuat noi bo ----
t('F3: trang Shop het ten file migration / "migration M2" / "M2/M3"',
  !shopHtml.includes('supabase-migration') && !shopHtml.includes('migration M2') && !shopHtml.includes('M2/M3'));
t('F3: trang Shop dung cau moi "Lưu thật vào hệ thống" + "Tài khoản đăng nhập dùng chung cho cả sàn" + bao loi moi',
  shopHtml.includes('<strong>Lưu thật vào hệ thống:</strong> Form này lưu hồ sơ thật khi shop đã đăng nhập.')
  && shopHtml.includes('Tài khoản đăng nhập dùng chung cho cả sàn; hồ sơ shop và đăng tin đều được lưu thật vào hệ thống.')
  && shopHtml.includes('Chưa lưu được: hệ thống chưa sẵn sàng. Vui lòng thử lại sau hoặc liên hệ Zalo 032 998 3699.'));
t('F3: vi-tien-ao het ten tai lieu noi bo / ten bang trong van ban hien thi',
  !/docs-email-marketing|marketing_consents|marketing_opt_in/.test(stripScripts(viTienAo)));
t('F3: vi-tien-ao dung cau moi ve danh sach marketing + bo "theo thiết kế trong <code>docs-..."',
  viTienAo.includes('Danh sách nhận email marketing được tách riêng, chỉ gồm những tài khoản đang đồng ý nhận.')
  && !viTienAo.includes('theo thiết kế trong <code>docs-email-marketing-va-tien-ao.md</code>'));
t('F3 bo sung: trang-cua-toi het thong bao loi migration top-revenue, dung cau moi',
  read('trang-cua-toi.html').includes('riêng Doanh thu cao nhất chưa lưu được vì hệ thống chưa sẵn sàng. Vui lòng thử lại sau')
  && !read('trang-cua-toi.html').includes('supabase-migration-top-revenue.sql'));

// ---- (F4) bo "service_role" ----
t('F4: trang-cua-toi "Web không thu thập CCCD và không lưu mật khẩu của bạn.", het "service_role"',
  read('trang-cua-toi.html').includes('Web <b>không thu thập CCCD</b> và không lưu mật khẩu của bạn.')
  && !read('trang-cua-toi.html').includes('service_role'));

// ---- (F5) dong dem tin tuyen ----
t('F5: app.js "Hiện có 1 tin tuyển đang mở.", het "Đang hiện 1 tin tuyển đang mở."',
  appJs.includes('Hiện có 1 tin tuyển đang mở.') && !appJs.includes('Đang hiện 1 tin tuyển đang mở.'));

// ---- (D1–D9) du lieu goc khong doi ----
t('D1–D9 khong doi: th-02 "Duyênn", th-06 "ekip", th-10 "Điểm ghi trong bài"',
  D.models.find(m => m.id === 'th-02').name === 'G T MY Duyênn'
  && D.models.find(m => m.id === 'th-06').exp.includes('phối hợp ekip')
  && D.models.find(m => m.id === 'th-10').exp.includes('Điểm ghi trong bài'));
t('D1–D9 khong doi: sh-03 "80-100k/h", sh-05 "2K–2K6", sh-08 "150-170/h", sh-14 "m58–m68", sh-19 "0.5%", sh-26 "training"',
  D.shops.find(s => s.id === 'sh-03').salary === '80-100k/h'
  && D.shops.find(s => s.id === 'sh-05').req.includes('2K–2K6')
  && D.shops.find(s => s.id === 'sh-08').salary.includes('150-170/h')
  && D.shops.find(s => s.id === 'sh-14').req.includes('m58–m68')
  && D.shops.find(s => s.id === 'sh-19').salary.includes('0.5%')
  && D.shops.find(s => s.id === 'sh-26').req.includes('training'));

// ---- chuoi DA CHOT khong doi ----
const DISCLAIMER = 'Miễn trừ trách nhiệm: Thông tin được tổng hợp từ bài đăng công khai của cộng đồng, giữ nguyên nội dung gốc. Thông tin liên hệ hiển thị để các bên tự trao đổi công việc trực tiếp với nhau. Ver2Solution không thu bất kỳ phí dịch vụ nào — đây chỉ là trang cộng đồng kết nối.';
t('chuoi chot khong doi: disclaimer v40 nguyen van trong app.js',
  appJs.includes(DISCLAIMER));
t('chuoi chot khong doi: dong PR v41 nguyen van trong index.html',
  indexHtml.includes('Ver2Solution — hơn 8 năm xây dựng hệ sinh thái dịch vụ cho shop bán hàng online và livestream. Hơn 1.000 khách hàng toàn quốc, từ shop nhỏ đến tập đoàn lớn, đã tin dùng dịch vụ của chúng tôi — gồm các dự án triển khai cùng Thaco Trường Hải, TPBank, Cốc Cốc, Đêm Kim Cương và hàng trăm doanh nghiệp khác.'));
t('chuoi chot khong doi: 2 cau hoi FAQ moi v42 nguyen van trong index.html',
  indexHtml.includes('Ver2Solution có chịu trách nhiệm về thông tin trên hồ sơ không?')
  && indexHtml.includes('Muốn sửa hồ sơ thì phải làm thế nào?'));
t('chuoi chot khong doi: owner-note v42 nguyen van trong app.js',
  appJs.includes('để sửa hồ sơ này, hoặc liên hệ') && appJs.includes('để được gỡ bỏ.'));

// ---- sw.js + du lieu ----
t("sw.js CACHE = 'v84-shell-1' + ghi chu dau file v49",
  swJs.includes("const CACHE = 'v84-shell-1';") && swJs.includes('/* v60 service worker'));
t('du lieu khong doi: 20 mau, 30 shop, 50 bai',
  D.models.length === 20 && D.shops.length === 30 && D.articles.length === 50,
  'mau=' + D.models.length + ' shop=' + D.shops.length + ' bai=' + D.articles.length);

console.log(`\nTOTAL v44: ${pass} PASS, ${fail} FAIL`);
process.exit(fail ? 1 : 0);
