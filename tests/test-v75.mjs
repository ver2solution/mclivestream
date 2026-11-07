/* v75 tests — Node only, no browser. v75 = 2 thay doi tren trang chu theo
   yeu cau nguoi dung toi 06/11/2026 (23:08 + 23:15):
   (1) XOA nut "Xem shop đang tuyển →" khoi trang chu (anh chup nut tren
       trang chu). Chi doi 3 file so voi v74-hub-prep:
       - index.html: xoa <div class="trust-cta">...</div> (nut duoi khung
         trust-strip, href #shop-tuyen, data-track xem-shop-dang-tuyen).
       - v20.css: xoa luat .trust-cta (chi nut nay dung, khong con cho nao dung).
       - sw.js: CACHE v74-shell-1 -> v76-shell-1.
   (2) CHUYEN nut "Xem tất cả tin →" cua muc Tin tuc (#lo-trinh) tu tieu de
       muc xuong ben duoi hang tin: section-head chi con tieu de link,
       them <div class="section-foot"> ngay sau #homeNews, nut giu nguyen
       class btn btn-ghost btn-sm + href tin-tuc.html; them CSS .section-foot
       (flex, can phai, margin-top 12px).
   (3) FAQ trang chu (#faq, 13 cau) chi hien 3 cau dau: section bat dau co
       class collapsed, cac .step tu cau 4 mang class faq-extra, CSS
       #faq.collapsed .faq-extra{display:none}; nut "Xem thêm câu hỏi ↓"
       (btn btn-ghost btn-sm, id faqMoreBtn) ngay sau div.steps, bam thi
       hien du 13 cau va doi nhan "Thu gọn ↑"; ham initFaqToggle() trong
       js/app.js theo pattern toggle .collapsed cua lo/xuong.
   KHONG doi: muc "Shop đang tuyển mẫu" (#shop-tuyen) tren trang chu,
   trust-strip + 8 o so lieu, hub "Tim mau 11.11" cua v74 tren trang Shop,
   danh-sach-shop.html / js/app.js / js/data.js (20 mau / 30 shop / 50 bai).
   (A) Nut da xoa khoi trang chu. (B) Muc Shop + trust strip van nguyen.
   (C) CSS khong con .trust-cta. (D) Khong hoi quy v74. (E) Hash khoa + CACHE.
   (F) Nut "Xem tất cả tin" chuyen xuong duoi hang tin.
   (G) FAQ chi hien 3 cau dau + nut Xem them. */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let pass = 0, fail = 0;
function t(name, cond, extra = '') { if (cond) { pass++; console.log('PASS v75:', name); } else { fail++; console.log('FAIL v75:', name, extra); } }
const sha = (p) => crypto.createHash('sha256').update(fs.readFileSync(path.join(root, p))).digest('hex');

const indexHtml = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const shopHtml = fs.readFileSync(path.join(root, 'danh-sach-shop.html'), 'utf8');
const css = fs.readFileSync(path.join(root, 'v20.css'), 'utf8');
const swJs = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');
const appJs = fs.readFileSync(path.join(root, 'js/app.js'), 'utf8');

// ---- (A) Nut "Xem shop đang tuyển →" da xoa khoi trang chu ----
t('v75: trang chu khong con text "Xem shop đang tuyển →"', !indexHtml.includes('Xem shop đang tuyển →'));
t('v75: trang chu khong con <div class="trust-cta">', !indexHtml.includes('<div class="trust-cta">'));
t('v75: trang chu khong con data-track="xem-shop-dang-tuyen"', !indexHtml.includes('data-track="xem-shop-dang-tuyen"'));
t('v75: trang chu khong con href="#shop-tuyen"', !indexHtml.includes('href="#shop-tuyen"'));
t('v75: trang chu khong con chuoi "trust-cta" o dau', !indexHtml.includes('trust-cta'));

// ---- (B) Muc Shop + trust strip van nguyen tren trang chu ----
t('v75: muc "Shop đang tuyển mẫu" (#shop-tuyen) van con tren trang chu',
  indexHtml.includes('<section class="section" id="shop-tuyen">')
  && indexHtml.includes('<h2>Shop đang tuyển mẫu</h2>')
  && indexHtml.includes('Xem tất cả 30 shop →'));
t('v75: trust-strip van nguyen (8 o so lieu, dung so 20/30/400+)',
  indexHtml.includes('class="trust-strip"')
  && (indexHtml.match(/class="trust-num"/g) || []).length === 8
  && indexHtml.includes('<b id="trustModels">20</b>')
  && indexHtml.includes('<b id="trustShops">30</b>')
  && indexHtml.includes('<b>400+</b>'));
t('v75: sau khung trust-strip la muc "Mẫu có ảnh lên trước" (khong vo thu tu DOM)',
  (() => { const s = indexHtml.indexOf('class="trust-strip"'); const e = indexHtml.indexOf('</section>', s);
    const m = indexHtml.indexOf('Mẫu có ảnh lên trước', e);
    return s > -1 && e > s && m > e && indexHtml.indexOf('id="shop-tuyen"') > m; })());
t('v75: dai logo doi tac van du 29 icon/nhom trong trust-strip',
  (indexHtml.match(/images\/partners\/[a-z0-9-]+-icon\.png/g) || []).length === 58);

// ---- (C) CSS khong con .trust-cta ----
t('v75: v20.css khong con class .trust-cta', !css.includes('.trust-cta'));
t('v75: v20.css van co .trust-nums grid 4 cot + .trust-strip',
  css.includes('.trust-nums{display:grid;grid-template-columns:repeat(4,1fr)')
  && css.includes('.trust-strip'));

// ---- (D) Khong hoi quy v74 (hub 11.11 + du lieu khong doi) ----
t('v75: hub "Tim mau 11.11" cua v74 van con tren trang Shop',
  shopHtml.includes('id="tim-mau-1111"') && shopHtml.includes('Tìm mẫu cho 11.11'));
t('v75: danh-sach-shop.html khong doi so voi v74 (sha256)',
  sha('danh-sach-shop.html') === 'c5abd47006c2c86393dca16fa16e549b8f37a1e65b099fefbfaa1723e23b6818');
t('v75: js/app.js khong doi so voi v74 (sha256)',
  sha('js/app.js') === 'e3f5c43293d2b71f2fd0b804a31ce4a4a88f47a83bfdab607eab5ee75467b072');
t('v75: js/data.js khong doi so voi v74 (20 mau / 30 shop / 50 bai) (sha256)',
  sha('js/data.js') === '642a8e3fdb09f0d23d363741692f3da7106586aff84dd47d1bc81613b514fc57');

// ---- (F) v75b: nut "Xem tất cả tin" chuyen xuong duoi hang tin ----
t('v75: nut "Xem tất cả tin →" nam DUOI hang tin (sau #homeNews)',
  indexHtml.indexOf('Xem tất cả tin →') > indexHtml.indexOf('id="homeNews"'));
t('v75: nut "Xem tất cả tin" nam trong <div class="section-foot">, dung class btn btn-ghost btn-sm (v83: them nut cong cu tinh lai truoc nut nay trong cung div)',
  indexHtml.includes('<div class="section-foot">') && indexHtml.includes('<a class="btn btn-ghost btn-sm" href="tin-tuc.html">Xem tất cả tin →</a></div>'));
t('v75: section-head cua #lo-trinh chi con tieu de link (khong con nut)',
  (() => { const s = indexHtml.indexOf('id="lo-trinh"'); const n = indexHtml.indexOf('id="homeNews"', s);
    const head = indexHtml.slice(s, n); return head.includes('tieu-de-tin-tuc') && !head.includes('btn btn-ghost'); })());
t('v75: CSS .section-foot can phai (flex, justify-content:flex-end, margin-top 12px)',
  css.includes('.section-foot{display:flex;justify-content:flex-end;margin:12px 0 0}'));
t('v75: tieu de link tin tuc khong doi',
  indexHtml.includes('<h2><a href="tin-tuc.html" data-track="tieu-de-tin-tuc">Tin mới thị trường Livestream/TMĐT Việt Nam và Thế giới</a></h2>'));
t('v75: 2 nut "Xem tất cả" khac tren trang chu van o tieu de muc (20 ho so + 30 shop)',
  indexHtml.includes('Xem tất cả 20 hồ sơ →') && indexHtml.includes('Xem tất cả 30 shop →'));

// ---- (G) v75c: FAQ trang chu chi hien 3 cau dau + nut Xem them ----
const faqSection = (indexHtml.match(/<section class="section collapsed" id="faq">[\s\S]*?<\/section>/) || [''])[0];
const faqSteps = faqSection.match(/<div class="step[^"]*">[\s\S]*?<\/div>/g) || [];
t('v75: #faq bat dau co class collapsed', indexHtml.includes('<section class="section collapsed" id="faq">'));
t('v75: FAQ van du 13 muc .step (khong xoa cau nao)', faqSteps.length === 13, 'got ' + faqSteps.length);
t('v75: 3 cau dau khong co faq-extra, 10 cau sau deu co faq-extra',
  faqSteps.slice(0, 3).every(s => !s.includes('faq-extra'))
  && faqSteps.slice(3).every(s => s.includes('faq-extra')));
t('v75: 3 cau dau + cau cuoi giu nguyen noi dung',
  faqSteps[0].includes('Xem hồ sơ có cần đăng nhập không?')
  && faqSteps[2].includes('Vì sao có hồ sơ ghi “Chưa cập nhật”?')
  && faqSteps[12].includes('Doanh nghiệp muốn đăng lô xả kho thì làm sao?'));
t('v75: nut "Xem thêm câu hỏi ↓" ngay sau div.steps (trong .section-foot, id faqMoreBtn)',
  indexHtml.includes('<div class="section-foot"><button class="btn btn-ghost btn-sm" id="faqMoreBtn" type="button" aria-expanded="false">Xem thêm câu hỏi ↓</button></div>')
  && indexHtml.indexOf('faqMoreBtn') > indexHtml.indexOf('id="homeNews"'));
t('v75: CSS an cau phu khi #faq collapsed', css.includes('#faq.collapsed .faq-extra{display:none}'));
t('v75: js/app.js co initFaqToggle (toggle .collapsed + aria-expanded + doi nhan)',
  appJs.includes('function initFaqToggle()')
  && appJs.includes("getElementById('faqMoreBtn')")
  && appJs.includes("classList.toggle('collapsed')")
  && appJs.includes('Xem thêm câu hỏi ↓') && appJs.includes('Thu gọn ↑')
  && appJs.includes('initFaqToggle();'));
t('v75: js/app.js giong het v75 (them initFaqToggle) (sha256)', sha('js/app.js') === 'e3f5c43293d2b71f2fd0b804a31ce4a4a88f47a83bfdab607eab5ee75467b072');

// ---- (E) Hash khoa file da doi (v75) + CACHE ----
t("v75: sw.js CACHE = 'v84-shell-1'", swJs.includes("const CACHE = 'v84-shell-1';"));
t("v75: sw.js khong con cache cu (v74)", !swJs.includes('v74-shell-1'));
t('v75: index.html giong het v75 (da xoa nut trust-cta) (sha256)', sha('index.html') === '27ec4c15cc98c68650084b12de7f2b839a8f76d42f1933e01fc0981abbe47aa2');
t('v75: v20.css giong het v75 (da xoa luat .trust-cta) (sha256)', sha('v20.css') === 'c38c89a126a136fb3f99ea7d547884339c4e5b9899e48c90234f61f02a140538');
t('v75: sw.js giong het v75 (CACHE v84-shell-1) (sha256)', sha('sw.js') === '609a81a1bdb77f85197f023f945af4a80acffaf408b450aa203c8d4c30926522');

console.log(`\n${pass} PASS, ${fail} FAIL`);
if (fail) process.exitCode = 1;
