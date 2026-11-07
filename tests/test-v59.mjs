/* v59 tests — Node only, no browser. v59 = day het cac huong dan dung tai
   khoan + huong dan dung cho tung doi tuong vao muc Hoi dap (#faq) tren
   trang chu (yeu cau nguoi dung 06/11/2026 14:42). FAQ tu 5 muc len 13 muc:
   5 cu giu nguyen thu tu + noi dung, them 8 muc moi o CUOI theo thu tu:
   (6) cac loai tai khoan, (7) mau tim viec, (8) mau dang ky tai khoan tim viec,
   (9) shop tim mau, (10) shop dang ky tai khoan + dang tin tuyen mau,
   (11) muc Lo hang xa kho hoat dong the nao, (12) mua lo can luu y gi,
   (13) doanh nghiep muon dang lo thi lam sao.
   Quy tac noi dung: chi viet nhung gi da xay xong hoac dang chuan bi ro rang
   (tai khoan lo xa kho chi noi "dang duoc chuan bi", khong hua da co; nut
   "Bao cao lo nay" chua co nen KHONG ghi trong FAQ; diem thuong M5 chua
   live nen KHONG dua vao FAQ). So lieu lo (8/3/2) va thay doi v57/v58
   nguyen ven. LUU Y: khi bump CACHE, cac test cu khang dinh CACHE
   v58-shell-1 da duoc cap nhat dong loat sang v76-shell-1 + ghi chu dau
   file sw.js doi sang v59 — chi doi chuoi phien ban, khong doi logic khac
   cua cac test do. */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let pass = 0, fail = 0;
function t(name, cond, extra = '') { if (cond) { pass++; console.log('PASS v59:', name); } else { fail++; console.log('FAIL v59:', name, extra); } }
const sha = (p) => crypto.createHash('sha256').update(fs.readFileSync(path.join(root, p))).digest('hex');

const indexHtml = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const shopHtml = fs.readFileSync(path.join(root, 'danh-sach-shop.html'), 'utf8');
const css = fs.readFileSync(path.join(root, 'v20.css'), 'utf8');
const swJs = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');
const faqSection = (indexHtml.match(/<section class="section collapsed" id="faq">[\s\S]*?<\/section>/) || [''])[0];
const faqSteps = faqSection.match(/<div class="step[^"]*">[\s\S]*?<\/div>/g) || [];

// ---- (a) FAQ: 13 muc, 5 cu nguyen ven + 8 moi o cuoi dung thu tu ----
t('FAQ trang chu: dung 13 muc .step (5 cu + 8 moi)', faqSteps.length === 13, 'got ' + faqSteps.length);
t('FAQ: 5 muc cu giu nguyen thu tu + noi dung', faqSteps[0].includes('Xem hồ sơ có cần đăng nhập không?')
  && faqSteps[3].includes('<h3>Ver2Solution có chịu trách nhiệm về thông tin trên hồ sơ không?</h3>')
  && faqSteps[4].includes('<h3>Muốn sửa hồ sơ thì phải làm thế nào?</h3>'));
t('FAQ muc 6: dung 2 loai tai khoan (Ca nhan tim viec + Doanh nghiep/To chuc, loai 2 gom lo/xuong/kho/tim nhan su, v60)', faqSteps[5].includes('<h3>Trên web có những loại tài khoản nào?</h3>')
  && faqSteps[5].includes('tài khoản Cá nhân tìm việc') && faqSteps[5].includes('tài khoản Doanh nghiệp / Tổ chức')
  && faqSteps[5].includes('đăng lô xả kho') && faqSteps[5].includes('đăng xưởng may nhận gia công') && faqSteps[5].includes('kho hàng') && faqSteps[5].includes('tìm nhân sự')
  && !faqSteps[5].includes('tài khoản riêng'));
t('FAQ muc 7: mau tim viec (loc tinh/linh vuc/gio/luong + tu lien he shop)', faqSteps[6].includes('<h3>Mẫu livestream tìm việc trên web thế nào?</h3>')
  && faqSteps[6].includes('Tỉnh / Thành phố') && faqSteps[6].includes('Giờ làm') && faqSteps[6].includes('tự liên hệ shop'));
t('FAQ muc 8: mau dang ky tai khoan tim viec (nhan nut dung nhu trang Mau)', faqSteps[7].includes('<h3>Mẫu đăng ký tài khoản tìm việc thế nào?</h3>')
  && faqSteps[7].includes('“Đăng ký tài khoản tìm việc”') && faqSteps[7].includes('trùng khớp với thông tin trên hồ sơ'));
t('FAQ muc 9: shop tim mau (loc tinh/linh vuc + album/video demo + khong trung gian)', faqSteps[8].includes('<h3>Shop tìm mẫu livestream trên web thế nào?</h3>')
  && faqSteps[8].includes('album ảnh và video demo') && faqSteps[8].includes('không trung gian và không giữ tiền'));
t('FAQ muc 10: shop dang ky tai khoan + dang tin (nhan nut + muc da duyet dung nhu trang Shop)', faqSteps[9].includes('<h3>Shop đăng ký tài khoản và đăng tin tuyển mẫu thế nào?</h3>')
  && faqSteps[9].includes('“Đăng ký tài khoản Cửa hàng / Doanh nghiệp”')
  && faqSteps[9].includes('“Shop đã đăng ký hồ sơ trên sàn (đã duyệt)”'));
t('FAQ muc 11: muc Lo hang xa kho hoat dong the nao (3 nhom + nhan Chua xac thuc + 60 ngay, v60)', faqSteps[10].includes('<h3>Mục Lô hàng xả kho hoạt động thế nào?</h3>')
  && faqSteps[10].includes('đơn vị thu mua / ký gửi tồn kho') && faqSteps[10].includes('chợ/sàn/trung tâm thương mại/tổ chức xả kho')
  && faqSteps[10].includes('Chưa xác thực — không phải lô chính hãng của thương hiệu') && faqSteps[10].includes('60 ngày'));
t('FAQ muc 12: mua lo can luu y gi (khong coc truoc khi xem hang + COD + HSD/tem/seal)', faqSteps[11].includes('<h3>Mua lô xả kho cần lưu ý gì?</h3>')
  && faqSteps[11].includes('Không chuyển tiền cọc khi chưa xem hàng trực tiếp') && faqSteps[11].includes('(COD)')
  && faqSteps[11].includes('hạn sử dụng, tem, seal'));
t('FAQ muc 13: doanh nghiep muon dang lo (lien he Zalo + tu dang lo bang tai khoan Doanh nghiep/To chuc dang chuan bi, v60)', faqSteps[12].includes('<h3>Doanh nghiệp muốn đăng lô xả kho thì làm sao?</h3>')
  && faqSteps[12].includes('liên hệ Zalo 032 998 3699') && faqSteps[12].includes('đang được chuẩn bị, sẽ mở khi hoàn thành')
  && faqSteps[12].includes('tài khoản Doanh nghiệp / Tổ chức') && !faqSteps[12].includes('tài khoản riêng'));
t('FAQ: khong hua he thong chua co (khong ghi "Báo cáo lô này", khong ghi diem thuong M5)', !faqSection.includes('Báo cáo lô này') && !faqSection.includes('điểm thưởng') && !faqSection.includes('điểm danh tiếng'));
t('FAQ: 2 muc dang ky tai khoan (mau + shop) deu co so Zalo ho tro', faqSteps[7].includes('032 998 3699') && faqSteps[9].includes('032 998 3699'));
t('FAQ: thu tu dung — muc sua ho so (5) truoc muc loai tai khoan (6), muc lo (11) truoc muc mua lo (12)',
  faqSection.indexOf('Muốn sửa hồ sơ thì phải làm thế nào?') < faqSection.indexOf('Trên web có những loại tài khoản nào?')
  && faqSection.indexOf('Mục Lô hàng xả kho hoạt động thế nào?') < faqSection.indexOf('Mua lô xả kho cần lưu ý gì?'));

// ---- (b) Nav "Hỏi đáp" van tro dung #faq ----
t('Nav: muc Hỏi đáp van link index.html#faq', indexHtml.includes('href="index.html#faq"'));

// ---- (c) Thay doi v58/v57 nguyen ven ----
t('v58 nguyen ven: hang so lieu lo 8/3/2 van co tren trang chu', indexHtml.includes('<b id="trustLots">8</b>') && indexHtml.includes('<b id="trustBuyers">3</b>') && indexHtml.includes('<b id="trustBatch">2</b>'));
t('v58 nguyen ven (v65): 3 so lo van trong grid chung, khong con .trust-nums-lots', !css.includes('.trust-nums-lots') && indexHtml.includes('<b id="trustLots">8</b>'));
t('v57 nguyen ven: muc lo van collapsed + nut Xem them', shopHtml.includes('<section class="lot-section collapsed" id="lo-hang-xa-kho"') && shopHtml.includes('id="lotMoreBtn"'));
t('v57 nguyen ven: H1 trang Shop van "Tìm shop tuyển mẫu livestream"', shopHtml.includes('<h1>Tìm shop tuyển mẫu livestream</h1>'));
t('v56 nguyen ven: Powered by van co tren trang chu', indexHtml.includes('<p class="powered">Powered by Ver2Solution</p>'));

// ---- (d) sw.js: CACHE v59 + SHELL nguyen ven ----
t("sw.js CACHE = 'v86-shell-1'", swJs.includes("const CACHE = 'v86-shell-1';"));
t('sw.js: khong con CACHE v58-shell-1', !swJs.includes('v58-shell-1'));
t("sw.js: ghi chu dau file doi sang v60", swJs.includes('/* v60 service worker'));

// ---- (e) Du lieu + KHONG doi: 8 file noi dung (hash khoa theo v58-prep) ----
const sb2 = { window: {}, module: { exports: {} }, console, document: { getElementById: () => null, addEventListener: () => {}, querySelectorAll: () => [] } };
vm.createContext(sb2);
vm.runInContext(fs.readFileSync(path.join(root, 'js/data.js'), 'utf8'), sb2);
const DATA = sb2.window.V20_DATA;
t('du lieu khong doi: 20 mau, 30 shop, 50 bai', DATA.models.length === 20 && DATA.shops.length === 30 && DATA.articles.length === 50,
  `mau=${DATA.models.length} shop=${DATA.shops.length} bai=${DATA.articles.length}`);
t('danh-sach-shop.html giong het v60 (them H2 Danh sach shop + doi ten 2 nhom lo + dong thong tin moi nhom + muc xuong may 20 don vi) (sha256)', sha('danh-sach-shop.html') === '42ae885d402e8e24c1e89b1063ae1f07483614fac7306a6f27eaea1a17bd0f56');
t('v20.css giong het v58 (sha256)', sha('v20.css') === '277d60ad92802afa8b68597fda4a2dd5f85c2c1edacd6fc44999b79dc3e47d87');
t('js/data.js giong het v58 (sha256)', sha('js/data.js') === '76009b20bc339501db3ab2f6e96993e5a6c6f84d9d50e45a623cde6882d85fdf');
t('js/app.js giong het v58 (sha256)', sha('js/app.js') === 'ae11dfaf0e5383a7d2d2f1d8c33de31090f1a5fd39e0251edb0f8b69d4590a20');
t('js/auth-ui.js giong het v58 (sha256)', sha('js/auth-ui.js') === '46d13e3b95dea2a9157d5668c3b4fca700279a1df8fe5c95ce0b416fa64f2f5c');
t('js/themes.js giong het v58 (sha256, greeting v53 nguyen ven)', sha('js/themes.js') === 'fd8a49bccef9ec152d390d5cfff17e63614967b82707c302191b4a8ebdc15e57');
t('mclivestream-supabase.js giong het v58 (sha256)', sha('mclivestream-supabase.js') === '28027730041e197b387fe8847255dd8c31bf1ec1dbbf0984427bb65d553dbd72');
t('sitemap.xml giong het v58 (sha256)', sha('sitemap.xml') === 'c229a7061ef8b60b611648874a475aaf96e5cb0ea2b46aef112265e7f350459f');

console.log(`v59: ${pass} PASS, ${fail} FAIL`);
process.exit(fail ? 1 : 0);
