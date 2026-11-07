/* v37 tests — Node only, no browser. v37 = làm lại thẻ mẫu/shop gọn gàng
   kiểu Brands Vietnam (user-directed 2026-11-05 ~21:47) + sửa thẻ shop
   "không đều" (visual QA 05/11, browser-task:bb7dd5a5):
   (1) Cấu trúc cố định: mọi thẻ shop đều có đúng 4 decision-item + 1
       decision-exp; mọi thẻ mẫu đều có đúng 3 decision-item + 1
       decision-exp. Giá trị thiếu hiện "Chưa cập nhật" mờ (muted), không
       bỏ ô — bỏ ô làm các khối bắt đầu ở độ cao khác nhau trong mỗi hàng.
   (2) Nút nằm cuối thẻ shop (sau .shop-src và .warn) để margin-top:auto
       ghim nút xuống đáy thẻ, các nút thẳng hàng trong 1 hàng lưới.
   (3) Tag "người đăng tin tuyển" chuyển từ h3 (gây xuống 2 dòng, bị cắt
       ở mép thẻ) vào hàng tags; pill sản phẩm bỏ khỏi hàng tags (trùng
       với subtitle + ô "Lĩnh vực live").
   (4) Nhãn nút rút gọn 1 dòng ("Xem chi tiết →", "Bài tuyển gốc →");
       giá trị lương cho xuống tối đa 2 dòng thay vì cắt "…".
   (5) CSS: .decision-item/.decision-exp min-height 72px; .decision-value
       clamp 2 dòng; h3 shop min-height 55px + tên clamp 2 dòng;
       .card-actions .btn nowrap; .shop-logo--contain nền #eef7f2 (logo
       trắng Mylan hiện rõ); .tag nowrap; .decision-value.muted.
   (6) sw.js CACHE = 'v76-shell-1' (v41; app.js + v20.css đổi ở v37, trust strip đổi ở v41, lọc/sắp xếp + owner-note đổi ở v42; v43: chinh ta 4 bai + loc gio lam mau + doi nhan sap xep; v44: nhat quan ngon ngu + sua noi dung).
   Dữ liệu không đổi: 20 mẫu, 30 shop, 25 bài. */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let pass = 0, fail = 0;
function t(name, cond, extra = '') { if (cond) { pass++; console.log('PASS v37:', name); } else { fail++; console.log('FAIL v37:', name, extra); } }
const sb = { window: {}, module: { exports: {} }, console, URLSearchParams };
vm.createContext(sb);
vm.runInContext(fs.readFileSync(path.join(root, 'js/data.js'), 'utf8'), sb);
vm.runInContext(fs.readFileSync(path.join(root, 'js/app.js'), 'utf8'), sb);
const D = sb.window.V20_DATA, V = sb.window.V20;
const css = fs.readFileSync(path.join(root, 'v20.css'), 'utf8');
const sw = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');
const shopCards = D.shops.map(s => V.shopCardHTML(s));
const modelCards = D.models.map(m => V.cardHTML(m));

// ---- (1) cau truc co dinh ----
t('moi the shop co dung 4 decision-item + 1 decision-exp',
  shopCards.every(h => (h.match(/decision-item/g) || []).length === 4 && (h.match(/decision-exp/g) || []).length === 1));
t('moi the mau co dung 3 decision-item + 1 decision-exp',
  modelCards.every(h => (h.match(/decision-item/g) || []).length === 3 && (h.match(/decision-exp/g) || []).length === 1));
t('gia tri thieu hien placeholder muted (khong bo o): Javata co 3 placeholder',
  (shopCards[D.shops.findIndex(s => s.name.includes('Javata'))].match(/decision-value muted/g) || []).length === 3);
t('moi placeholder "Chưa cập nhật" deu co class muted',
  shopCards.concat(modelCards).every(h => !/<(?:b|span) class="decision-value">Chưa cập nhật<\/(?:b|span)>/.test(h)));

// ---- (2) nut o cuoi the shop ----
t('nut nam sau .shop-src va .warn (actions cuoi the)',
  shopCards.every(h => h.indexOf('card-actions') > h.indexOf('class="shop-src"') && h.indexOf('card-actions') > h.indexOf('class="warn"')));
t('moi the shop co 2 nut (Xem chi tiet + Nhan Zalo)',
  shopCards.every(h => h.includes('Xem chi tiết →') && h.includes('>Nhắn Zalo</a>')));

// ---- (3) tag + pill ----
t('tag "người đăng tin tuyển" khong con trong h3',
  shopCards.every(h => {
    const head = (h.match(/<h3>[\s\S]*?<\/h3>/) || [''])[0];
    return !head.includes('người đăng tin tuyển');
  }));
t('tag "người đăng tin tuyển" van co trong the (o hang tags) khi shopNameKnown=false',
  shopCards.filter((h, i) => !D.shops[i].shopNameKnown).every(h => h.includes('<span class="tag soft">người đăng tin tuyển</span>')));
t('pill san pham khong con trong hang tags (tranh trung lap)',
  shopCards.every((h, i) => !h.includes('<span class="tag">' + V.esc(D.shops[i].product) + '</span>')));
t('san pham van hien o subtitle va o "Lĩnh vực live"',
  shopCards.every((h, i) => {
    const p = D.shops[i].product;
    if (!p || p === 'Chưa cập nhật') return true;
    return h.includes(V.esc(p));
  }));

// ---- (4) nhan nut rut gon + luong 2 dong ----
t('khong con nhan cu "Xem chi tiết shop →" / "Xem bài tuyển gốc trên Facebook →"',
  shopCards.every(h => !h.includes('Xem chi tiết shop →') && !h.includes('Xem bài tuyển gốc trên Facebook →')));
t('nhan moi "Xem chi tiết →" + "Bài tuyển gốc →" co mat o moi the',
  shopCards.every(h => h.includes('Xem chi tiết →') && h.includes('Bài tuyển gốc →')));

// ---- (5) CSS ----
const flat = css.replace(/\s+/g, '');
t('CSS: .decision-item min-height 72px', /\.decision-item\{[^}]*min-height:72px/.test(flat));
t('CSS: .decision-exp min-height 72px', /\.decision-exp\{[^}]*min-height:72px/.test(flat));
t('CSS: .decision-value clamp 2 dong (khong nowrap)', /\.decision-value\{[^}]*-webkit-line-clamp:2/.test(flat) && !/\.decision-value\{[^}]*white-space:nowrap/.test(flat));
t('CSS: .decision-value.muted co mau mut', /\.decision-value\.muted\{[^}]*color:var\(--mut\)/.test(flat));
t('CSS: .shop-card h3 min-height 55px + ten clamp 2 dong', /\.shop-cardh3\{[^}]*min-height:55px/.test(flat) && /\.shop-cardh3a\{[^}]*-webkit-line-clamp:2/.test(flat));
t('CSS: .card-actions .btn nowrap', /\.card-actions\.btn\{[^}]*white-space:nowrap/.test(flat));
t('CSS: .shop-logo--contain nen #eef7f2 (logo trang hien ro)', /\.shop-logo--contain\{[^}]*background:#eef7f2/.test(flat));
t('CSS: .tag nowrap', /\.tag\{[^}]*white-space:nowrap/.test(flat));

// ---- (6) sw.js cache ----
t("sw.js CACHE = 'v84-shell-1'", sw.includes("const CACHE = 'v84-shell-1'"));

// ---- du lieu khong doi ----
t('du lieu khong doi: 20 mau, 30 shop, 50 bai', D.models.length === 20 && D.shops.length === 30 && D.articles.length === 50);

console.log(`v37: ${pass} PASS, ${fail} FAIL`);
