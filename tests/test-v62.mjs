/* v62 tests — Node only, no browser. v62 = 2 sua theo yeu cau nguoi dung
   15:19 ngay 06/11/2026:
   (A) Bo text huong dan nho tren trang Mau + cac trang khac (giong trang Shop
       o v61): trang Mau bo dong dem listInfo + mo ta phan trang 12 ho so +
       ghi chu gioi tinh; trang Shop bo 2 doan gioi thieu sau filter (dong
       "30 shop" + doan giai thich dai); trang chu bo 3 mo ta section-head.
       Huong dan chuyen sang FAQ theo quy tac: phan trang 12 ho so -> FAQ
       muc 9; quy tac gioi tinh -> FAQ muc 3.
   (B) Giam khoang cach TOAN SITE xuong 1/2: .section 34->17px,
       .section-head margin-bottom 16->8px, .filter-card padding 18->9px +
       gap 12->6px, .lot-section padding 22/24->11/12 + margin 18->9px
       (mobile 16->8px). Xoa khoi page-shop cua v61 (khong can rieng trang
       Shop nua). */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let pass = 0, fail = 0;
function t(name, cond, extra = '') { if (cond) { pass++; console.log('PASS v62:', name); } else { fail++; console.log('FAIL v62:', name, extra); } }
const sha = (p) => crypto.createHash('sha256').update(fs.readFileSync(path.join(root, p))).digest('hex');

const indexHtml = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const mauHtml = fs.readFileSync(path.join(root, 'danh-sach-mau.html'), 'utf8');
const shopHtml = fs.readFileSync(path.join(root, 'danh-sach-shop.html'), 'utf8');
const css = fs.readFileSync(path.join(root, 'v20.css'), 'utf8');
const appJs = fs.readFileSync(path.join(root, 'js/app.js'), 'utf8');
const faqSection = (indexHtml.match(/<section class="section collapsed" id="faq">[\s\S]*?<\/section>/) || [''])[0];
const faqSteps = faqSection.match(/<div class="step[^"]*">[\s\S]*?<\/div>/g) || [];

// ---- (A1) Trang Mau: bo dong dem + mo ta phan trang + ghi chu gioi tinh ----
t('Mau: khong con dong dem listInfo (HTML + JS)', !mauHtml.includes('id="listInfo"') && !appJs.includes('listInfo'));
t('Mau: khong con mo ta phan trang 12 ho so', !mauHtml.includes('mỗi trang tối đa 12 hồ sơ'));
t('Mau: H1 van nguyen', mauHtml.includes('<h1>Danh sách mẫu livestream</h1>'));
t('Mau: khong con ghi chu gioi tinh sau filter', !mauHtml.includes('Giới tính chỉ gán Nam hoặc Nữ khi bài gốc ghi rõ'));
t('Mau: bo loc van du (tinh/linh vuc/gio lam/doanh thu/luong/sap xep/tim kiem)', ['fProv', 'fCat', 'fShift', 'fRevMin', 'fWageMin', 'fSort', 'fQ'].every((id) => mauHtml.includes(`id="${id}"`)));

// ---- (A2) Trang Shop: bo 2 doan gioi thieu sau filter ----
t('Shop: khong con dong "30 shop đang tuyển mẫu"', !shopHtml.includes('30 shop đang tuyển mẫu'));
t('Shop: khong con doan giai thich dai sau filter', !shopHtml.includes('Thông tin dưới đây chỉ lấy từ bài tuyển shop tự đăng công khai'));
t('Shop: muc lo + muc xuong may van nguyen', shopHtml.includes('id="lo-hang-xa-kho"') && shopHtml.includes('id="xuong-may-gia-cong"'));

// ---- (A3) Trang chu: bo 3 mo ta section-head ----
t('Trang chu: khong con mo ta "2 hàng — 8 hồ sơ"', !indexHtml.includes('Trang chủ chỉ hiện 2 hàng'));
t('Trang chu: khong con mo ta "6 tin tuyển mới nhất"', !indexHtml.includes('6 tin tuyển mới nhất'));
t('Trang chu: khong con mo ta "Đọc trước khi chốt lịch live"', !indexHtml.includes('Đọc trước khi chốt lịch live'));
t('Trang chu: 3 tieu de section van nguyen (Mau/Shop/Tin — Tin doi thanh link xanh o v66)', indexHtml.includes('<h2>Mẫu có ảnh lên trước</h2>') && indexHtml.includes('<h2>Shop đang tuyển mẫu</h2>') && indexHtml.includes('Tin mới thị trường Livestream/TMĐT Việt Nam và Thế giới'));

// ---- (A4) Huong dan chuyen sang FAQ (theo quy tac Hoi dap) ----
t('FAQ muc 3: co quy tac gioi tinh (chuyen tu trang Mau)', faqSteps[2].includes('Giới tính chỉ gán Nam hoặc Nữ khi bài gốc ghi rõ, không suy đoán từ tên hay ảnh.'));
t('FAQ muc 9: co cau phan trang 12 ho so (chuyen tu trang Mau)', faqSteps[8].includes('Danh sách mẫu phân trang, mỗi trang tối đa 12 hồ sơ.'));

// ---- (B) Giam khoang cach TOAN SITE xuong 1/2 ----
t('CSS: .section 34->17px', css.includes('.section{margin:17px 0}') && !css.includes('.section{margin:34px 0}'));
t('CSS: section-head margin-bottom 16->5px (v64: 1/3 cua 16px goc)', css.includes('margin-bottom:5px}'));
t('CSS: filter-card padding 18->9px + gap 12->6px', css.includes('padding:9px;display:grid') && css.includes('gap:6px}'));
t('CSS: lot-section padding 22/24->11/12 + margin 18->9px', css.includes('padding:11px 12px;margin:9px 0'));
t('CSS: lot-section mobile 16->8px', css.includes('.lot-section{padding:8px}'));
t('CSS: khong con khoi page-shop (v61 da xoa, thay bang giam 1/2 toan site)', !css.includes('page-shop') && !shopHtml.includes('page-shop'));

// ---- (C) Hash khoa file da doi (v62) ----
t('index.html giong het v62 (bo 3 mo ta section-head + FAQ 3/9) (sha256)', sha('index.html') === 'dc7ee7d6a43a904d4c63c8c85ed041e9e2c70853787062506340b061527e7e39');
t('danh-sach-mau.html giong het v62 (bo listInfo + mo ta phan trang + ghi chu gioi tinh) (sha256)', sha('danh-sach-mau.html') === '6e530e9407648b063ff96d6e1f19b2120a364a766004441ac991f3c096544159');
t('danh-sach-shop.html giong het v62 (bo 2 doan gioi thieu + bo class page-shop) (sha256)', sha('danh-sach-shop.html') === '42ae885d402e8e24c1e89b1063ae1f07483614fac7306a6f27eaea1a17bd0f56');
t('v20.css giong het v62 (giam 1/2 toan site + xoa page-shop) (sha256)', sha('v20.css') === '277d60ad92802afa8b68597fda4a2dd5f85c2c1edacd6fc44999b79dc3e47d87');
t('js/app.js giong het v62 (bo cap nhat listInfo) (sha256)', sha('js/app.js') === 'ae11dfaf0e5383a7d2d2f1d8c33de31090f1a5fd39e0251edb0f8b69d4590a20');

console.log(`v62: ${pass} PASS, ${fail} FAIL`);
process.exit(fail ? 1 : 0);
