/* v60 tests — Node only, no browser. v60 = 2 sua theo yeu cau nguoi dung
   06/11/2026:
   (A) Quy tac lo moi (chot 14:47): lo giu 60 ngay (thay 15 ngay cu) + 4
       dieu kien xoa — FAQ muc Lo hang xa kho (muc 11) doi "Lô chỉ giữ
       15 ngày trên web" thanh "Lô giữ 60 ngày trên web; lô bị xoá sớm hơn
       nếu bài gốc bị xoá, có người phản ánh yêu cầu xoá, hoặc chủ
       shop/doanh nghiệp tự đăng ký đăng nhập để xoá bài." Khong con
       "15 ngày" trong index.html.
   (B) Trang Dành cho Shop: them tieu de H2 "Danh sách shop tuyển mẫu
       livestream" (id shop-list-title) ngay tren luoi shop
       (#publicShopsList), trong cung section voi H1 — truoc day luoi shop
       khong co tieu de rieng.
   LUU Y: khi bump CACHE, cac test cu khang dinh CACHE v59-shell-1 da duoc
   cap nhat dong loat sang v76-shell-1 + ghi chu dau file sw.js doi sang
   v60 — chi doi chuoi phien ban, khong doi logic khac cua cac test do. */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let pass = 0, fail = 0;
function t(name, cond, extra = '') { if (cond) { pass++; console.log('PASS v60:', name); } else { fail++; console.log('FAIL v60:', name, extra); } }
const sha = (p) => crypto.createHash('sha256').update(fs.readFileSync(path.join(root, p))).digest('hex');

const indexHtml = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const shopHtml = fs.readFileSync(path.join(root, 'danh-sach-shop.html'), 'utf8');
const css = fs.readFileSync(path.join(root, 'v20.css'), 'utf8');
const swJs = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');
const faqSection = (indexHtml.match(/<section class="section collapsed" id="faq">[\s\S]*?<\/section>/) || [''])[0];
const faqSteps = faqSection.match(/<div class="step[^"]*">[\s\S]*?<\/div>/g) || [];

// ---- (A) FAQ muc lo: 60 ngay + 4 dieu kien xoa, khong con 15 ngay ----
t('FAQ van dung 13 muc (5 cu + 8 moi, v59 nguyen ven)', faqSteps.length === 13, 'got ' + faqSteps.length);
t('FAQ muc 11: lo giu 60 ngay (khong con 15 ngay)', faqSteps[10].includes('Lô giữ 60 ngày trên web') && !faqSteps[10].includes('15 ngày'));
t('FAQ muc 11: du 3 dieu kien xoa som (bai goc bi xoa / phan anh / chu tu xoa)', faqSteps[10].includes('bài gốc bị xoá') && faqSteps[10].includes('có người phản ánh yêu cầu xoá') && faqSteps[10].includes('chủ shop/doanh nghiệp tự đăng ký đăng nhập để xoá bài'));
t('FAQ muc 11: van co nhan Chua xac thuc + 3 nhom lo + khong thu phi', faqSteps[10].includes('Chưa xác thực — không phải lô chính hãng của thương hiệu') && faqSteps[10].includes('đơn vị thu mua / ký gửi tồn kho') && faqSteps[10].includes('Ver2Solution không thu phí'));
t('index.html: khong con chuoi "15 ngày" o bat cu cho nao', !indexHtml.includes('15 ngày'), 'con sot 15 ngay');

// ---- (B) Trang Shop: H2 Danh sach shop tuyen mau livestream tren luoi shop ----
t('Trang Shop: co H2 "Danh sách shop tuyển mẫu livestream" (id shop-list-title)', shopHtml.includes('<h2 id="shop-list-title">Danh sách shop tuyển mẫu livestream</h2>'));
t('Trang Shop: H2 nam NGAY TREN luoi shop #publicShopsList', shopHtml.indexOf('id="shop-list-title"') > -1 && shopHtml.indexOf('id="shop-list-title"') < shopHtml.indexOf('id="publicShopsList"') && shopHtml.indexOf('id="publicShopsList"') - shopHtml.indexOf('id="shop-list-title"') < 200);
t('Trang Shop: H2 nam SAU muc lo (trong cung section voi H1)', shopHtml.indexOf('id="shop-list-title"') > shopHtml.indexOf('id="lo-hang-xa-kho"'));
t('Trang Shop: H1 van "Tìm shop tuyển mẫu livestream" (khong doi)', shopHtml.includes('<h1>Tìm shop tuyển mẫu livestream</h1>'));
t('Trang Shop: muc lo van collapsed + nut Xem them (v57 nguyen ven)', shopHtml.includes('<section class="lot-section collapsed" id="lo-hang-xa-kho"') && shopHtml.includes('id="lotMoreBtn"'));
t('Trang Shop: luoi shop + phan trang van con', shopHtml.includes('<div class="shop-grid" id="publicShopsList"') && shopHtml.includes('id="shopPager"'));

// ---- (C) Doi ten 2 nhom lo + moi nhom co 1 dong hien thong tin (v60) ----
const lotSection = (shopHtml.match(/<section class="lot-section collapsed" id="lo-hang-xa-kho"[\s\S]*?<\/section>/) || [''])[0];
t('Nhom 1: tieu de moi "Doanh nghiệp/ Shop xả hàng tồn kho"', shopHtml.includes('<h3>Doanh nghiệp/ Shop xả hàng tồn kho</h3>'));
t('Nhom 1: khong con tieu de cu "Lô hàng xả kho</h3>" (h2 section van giu)', !shopHtml.includes('<h3>Lô hàng xả kho</h3>') && shopHtml.includes('<h2 id="lot-title">Lô hàng xả kho</h2>'));
t('Nhom 1: co dong thong tin "đang có 8 lô" (v76: them id lotSub1)', shopHtml.includes('<p class="lot-sub" id="lotSub1">Doanh nghiệp và shop xả hàng tồn kho theo lô sỉ — đang có 8 lô.</p>'));
t('Nhom 2: tieu de GIU NGUYEN "Đơn vị thu mua / ký gửi tồn kho"', shopHtml.includes('<h3>Đơn vị thu mua / ký gửi tồn kho</h3>'));
t('Nhom 2: dong thong tin co "Đang có 3 đơn vị"', shopHtml.includes('Đang có 3 đơn vị.</p>'));
t('Nhom 3: tieu de moi "Chợ/ Sàn/ TTTM/ Tổ chức xả kho"', shopHtml.includes('<h3>Chợ/ Sàn/ TTTM/ Tổ chức xả kho</h3>'));
t('Nhom 3: khong con tieu de cu "Xả kho theo đợt — bán lẻ từng món</h3>"', !shopHtml.includes('<h3>Xả kho theo đợt — bán lẻ từng món</h3>'));
t('Nhom 3: dong thong tin co "Đang có 2 chương trình"', shopHtml.includes('Đang có 2 chương trình.</p>'));
t('Nhom 3: dong thong tin noi ro cho/san/TTTM/to chuc, ban le tung mon, khong phai lo si', shopHtml.includes('Chương trình xả kho theo đợt của chợ, sàn, trung tâm thương mại và tổ chức — bán lẻ từng món, không phải lô sỉ.'));
t('Moi nhom lo co dung 1 dong .lot-sub (3 dong trong section lo; muc xuong may co 1 dong rieng)', (lotSection.match(/<p class="lot-sub"/g) || []).length === 3, `got=${(lotSection.match(/<p class="lot-sub"/g) || []).length}`);
t('FAQ muc 11: ten 3 nhom moi (doanh nghiep/shop + cho/san/TTTM/to chuc)', faqSteps[10].includes('doanh nghiệp/shop xả hàng tồn kho') && faqSteps[10].includes('chợ/sàn/trung tâm thương mại/tổ chức xả kho'));
t('PR trang chu: nhan nhom 3 moi "chợ/sàn/TTTM/tổ chức xả kho"', indexHtml.includes('<b id="trustBatch">2</b><span>Chợ/sàn/TTTM/tổ chức xả kho</span>'));
t('PR trang chu: nhan nhom 1 + 2 giu nguyen', indexHtml.includes('<b id="trustLots">8</b><span>Lô xả hàng tồn kho</span>') && indexHtml.includes('<b id="trustBuyers">3</b><span>Đơn vị thu mua / ký gửi tồn kho</span>'));

// ---- (D) Chi 2 loai tai khoan — loai 2 gom moi tinh nang doanh nghiep (v60) ----
t('FAQ muc 6: dung 2 loai (Ca nhan tim viec + Doanh nghiep/To chuc)', faqSteps[5].includes('Có đúng 2 loại tài khoản') && faqSteps[5].includes('(1) tài khoản Cá nhân tìm việc') && faqSteps[5].includes('(2) tài khoản Doanh nghiệp / Tổ chức'));
t('FAQ muc 6: loai 2 gom lo/xuong/kho/tim nhan su + tuyen mau', faqSteps[5].includes('đăng lô xả kho') && faqSteps[5].includes('đăng xưởng may nhận gia công') && faqSteps[5].includes('kho hàng') && faqSteps[5].includes('tìm nhân sự') && faqSteps[5].includes('đăng tin tuyển mẫu'));
t('FAQ muc 6 + 13: khong con "tài khoản riêng" (khong tao loai thu 3)', !faqSteps[5].includes('tài khoản riêng') && !faqSteps[12].includes('tài khoản riêng'));
t('FAQ muc 13: tu dang lo bang tai khoan Doanh nghiep/To chuc (dang chuan bi)', faqSteps[12].includes('Tính năng tự đăng lô kèm album ảnh bằng tài khoản Doanh nghiệp / Tổ chức đang được chuẩn bị'));

// ---- (c) Thay doi v59/v58 nguyen ven ----
t('v59 nguyen ven: FAQ van 13 muc, 8 muc moi van du', faqSteps[5].includes('Trên web có những loại tài khoản nào?') && faqSteps[12].includes('Doanh nghiệp muốn đăng lô xả kho thì làm sao?'));
t('v58 nguyen ven: hang so lieu lo 8/3/2 van co tren trang chu', indexHtml.includes('<b id="trustLots">8</b>') && indexHtml.includes('<b id="trustBuyers">3</b>') && indexHtml.includes('<b id="trustBatch">2</b>'));
t('v58 nguyen ven (v65): 3 so lo van trong grid chung, khong con .trust-nums-lots', !css.includes('.trust-nums-lots') && indexHtml.includes('<b id="trustLots">8</b>'));
t('v56 nguyen ven: Powered by van co tren trang chu', indexHtml.includes('<p class="powered">Powered by Ver2Solution</p>'));

// ---- (d) sw.js: CACHE v60 + SHELL nguyen ven ----
t("sw.js CACHE = 'v86-shell-1'", swJs.includes("const CACHE = 'v86-shell-1';"));
t('sw.js: khong con CACHE v59-shell-1', !swJs.includes('v59-shell-1'));
t("sw.js: ghi chu dau file doi sang v60", swJs.includes('/* v60 service worker'));

// ---- (E) Muc Xuong / Nha may may nhan gia cong (v60, them 06/11) ----
const factorySection = (shopHtml.match(/<section class="lot-section collapsed" id="xuong-may-gia-cong"[\s\S]*?<\/section>/) || [''])[0];
t('muc xuong may: section id xuong-may-gia-cong + H2 dung ten + collapsed mac dinh', factorySection.length > 0 && factorySection.includes('<h2 id="factory-title">Xưởng / Nhà máy may nhận gia công</h2>'));
// v76: the xuong khong con trong HTML tinh — kiem tra tren data.js (render kiem tra o test-v76)
const sb60fac = { window: {}, module: { exports: {} }, console, document: { getElementById: () => null, addEventListener: () => {}, querySelectorAll: () => [] } };
vm.createContext(sb60fac);
vm.runInContext(fs.readFileSync(path.join(root, 'js/data.js'), 'utf8'), sb60fac);
const FAC60 = sb60fac.window.V20_DATA.factories;
t('muc xuong may: dung 40 xuong trong data.js', FAC60.length === 40, `xuong=${FAC60.length}`);
t('muc xuong may: HTML chi con container rong factoryGrid (khong con the tinh)', shopHtml.includes('<div class="lot-grid" id="factoryGrid"></div>') && !factorySection.includes('<article class="lot-card"'));
t('muc xuong may: dong gioi thieu co so "dang co 20 xuong/nha may"', factorySection.includes('đang có 20 xưởng/nhà máy'));
t('muc xuong may: du 20 ten xuong (Vinasilk..Vu Pham)', ['Vinasilk', 'VICT', 'Trạch Xá', 'Dony', 'Yes', 'VAXY', 'TheNewCotton', 'Apis', 'Duy Nguyễn', 'Hoàng Phi', 'Chipi', 'Ninh Hiệp', 'VNXK', 'Mỹ Chi', 'MaiClothing', 'Sao Việt', 'Duy Minh', 'TBC', 'Sơn Nam', 'Vũ Phạm'].every(n => FAC60.some(f => f.name.includes(n))));
t('muc xuong may: moi xuong co link nguon + ngay dang + nhan Chua xac thuc', FAC60.every(f => f.url.startsWith('http') && /^\d{2}\/\d{2}\/\d{4}$/.test(f.date) && f.label === 'Chưa xác thực — thông tin tổng hợp từ bài đăng công khai'));
t('muc xuong may: MOQ dung nguon (VICT 30, Apis 100, Chipi 300, My Chi tu 10, 32 don vi Khong cong khai — ten test v60 cu ghi nham 12 nhung chi kiem tra includes)', FAC60.some(f => f.name.includes('VICT') && f.moq === 30) && FAC60.some(f => f.name.includes('Apis') && f.moq === 100) && FAC60.some(f => f.name.includes('Chipi') && f.moq === 300) && FAC60.some(f => f.name.includes('Mỹ Chi') && f.moq === 10) && FAC60.filter(f => f.moq === null).length === 32);
t('muc xuong may: 2 nguon mang xa hoi (Facebook reel Son Nam + Threads Vu Pham)', FAC60.some(f => f.url.includes('https://www.facebook.com/reel/1095376146740912/')) && FAC60.some(f => f.url.includes('https://www.threads.com/@xuongmayvupham/post/DeIzct8kpPd')));
t('muc xuong may: nut Xem them rieng + script toggle + dong mien tru nguyen van', shopHtml.includes('id="factoryMoreBtn"') && shopHtml.includes('getElementById("xuong-may-gia-cong")') && shopHtml.includes('getElementById("factoryMoreBtn")') && factorySection.includes('Miễn trừ trách nhiệm: Thông tin được tổng hợp từ bài đăng công khai của cộng đồng, giữ nguyên nội dung gốc.'));
t('muc xuong may: nam DUOI luoi shop (sau #shopPager, trong cung section chinh)', shopHtml.indexOf('id="xuong-may-gia-cong"') > shopHtml.indexOf('id="shopPager"'));

// ---- (e) Du lieu + KHONG doi: 7 file noi dung (hash khoa theo v59-prep) ----
const sb2 = { window: {}, module: { exports: {} }, console, document: { getElementById: () => null, addEventListener: () => {}, querySelectorAll: () => [] } };
vm.createContext(sb2);
vm.runInContext(fs.readFileSync(path.join(root, 'js/data.js'), 'utf8'), sb2);
const DATA = sb2.window.V20_DATA;
t('du lieu khong doi: 20 mau, 30 shop, 50 bai', DATA.models.length === 20 && DATA.shops.length === 30 && DATA.articles.length === 50,
  `mau=${DATA.models.length} shop=${DATA.shops.length} bai=${DATA.articles.length}`);
t('v20.css giong het v59 (sha256)', sha('v20.css') === '277d60ad92802afa8b68597fda4a2dd5f85c2c1edacd6fc44999b79dc3e47d87');
t('js/data.js giong het v59 (sha256)', sha('js/data.js') === '76009b20bc339501db3ab2f6e96993e5a6c6f84d9d50e45a623cde6882d85fdf');
t('js/app.js giong het v59 (sha256)', sha('js/app.js') === 'ae11dfaf0e5383a7d2d2f1d8c33de31090f1a5fd39e0251edb0f8b69d4590a20');
t('js/auth-ui.js giong het v59 (sha256)', sha('js/auth-ui.js') === '46d13e3b95dea2a9157d5668c3b4fca700279a1df8fe5c95ce0b416fa64f2f5c');
t('js/themes.js giong het v59 (sha256, greeting v53 nguyen ven)', sha('js/themes.js') === 'fd8a49bccef9ec152d390d5cfff17e63614967b82707c302191b4a8ebdc15e57');
t('mclivestream-supabase.js giong het v59 (sha256)', sha('mclivestream-supabase.js') === '28027730041e197b387fe8847255dd8c31bf1ec1dbbf0984427bb65d553dbd72');
t('sitemap.xml giong het v59 (sha256)', sha('sitemap.xml') === 'c229a7061ef8b60b611648874a475aaf96e5cb0ea2b46aef112265e7f350459f');

console.log(`v60: ${pass} PASS, ${fail} FAIL`);
process.exit(fail ? 1 : 0);
