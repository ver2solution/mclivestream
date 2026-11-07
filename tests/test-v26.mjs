/* v26 tests — Node only, no browser. Covers the v26 additions only:
   (1) trust strip on home (spec §4): after the hero, before the model
   section; 3 verified numbers 30 / 20 / 400+ (v75: nut CTA "Xem shop
   đang tuyển →" xuong duoi khung da XOA theo yeu cau nguoi dung 06/11).
   (2) 3 real shop logos (spec §5): FANI cover, Chạm Loa + Mylan contain
   (never cropped), 21 shops keep the initial-letter placeholder, onerror
   fallback to the initial when an image fails.
   (3) full public contacts + Notes (spec §8, audit contact-audit-v26.md):
   ONLY the audited items are in data.js and rendered — 5/20 models with a
   public Zalo/phone number, 1/20 with a public email, 25/30 shops with a
   public Zalo/phone number, 1/24 with a public email; the verbatim Notes
   line appears on shop cards and (via contactNoteHTML) in the model detail
   contact block; model list cards stay contact-free (spec §8.5).
   (4) Chạm Loa special case (audit §4): original post unreadable, only the
   public fanpage link, no Zalo number guessed, tin NOT removed in v26.
   The v20/v22/v23/v24/v25 suites still run (5 assertions in them were
   updated to the new v26 rule and are marked v26 in those files). */
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const v25root = path.resolve(root, '..', 'mclivestream-final-v25');
let pass = 0, fail = 0;
function t(name, cond, extra = '') { if (cond) { pass++; console.log('PASS v26:', name); } else { fail++; console.log('FAIL v26:', name, extra); } }
function loadData(dir) {
  const sb = { window: {}, module: { exports: {} }, console };
  vm.createContext(sb);
  vm.runInContext(fs.readFileSync(path.join(dir, 'js/data.js'), 'utf8'), sb);
  vm.runInContext(fs.readFileSync(path.join(dir, 'js/app.js'), 'utf8'), sb);
  return { D: sb.window.V20_DATA, V: sb.window.V20 };
}
const { D, V } = loadData(root);
const old = loadData(v25root);
const D25 = old.D;
const NOTE = 'Các bên chủ động liên hệ trao đổi, thông tin là công khai.';
const AUDIT_MODEL_PHONES = ['0363622099', '0932542626', '0969151680', '0982725840', '0986718540'].sort();
const AUDIT_SHOP_PHONES = ['0333422259', '0336190155', '0339705529', '0347514152', '0352514268', '0353215046', '0358546899', '0367889506', '0369101543', '0377067362', '0398704111', '0398717445', '0398855402', '0829078209', '0865863929', '0868553009', '0876020006', '0912569229', '0931482789', '0941722001', '0948972643', '0965765494', '0967488936', '0971759240', '0975848831', '0981167717'].sort();
const PHONE_RE = /(?<!\d)0[389]\d{8}(?!\d)/g;
const phonesIn = s => (s.match(PHONE_RE) || []).sort();

// ---- (1) Trust strip (v41: dong PR + so lieu tinh dong; v26 goc: 3 so 30/20/400+) ----
t('index.html: trust strip exists after the hero and before the model section, with the 3 verified numbers (v75: nut CTA "Xem shop đang tuyển" da xoa)',
  (() => {
    const h = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
    const heroEnd = h.indexOf('</section>', h.indexOf('class="hero"'));
    const strip = h.indexOf('class="trust-strip"');
    const models = h.indexOf('Mẫu có ảnh lên trước');
    return strip > heroEnd && strip < models
      && h.includes('id="trustShops">30<') && h.includes('id="trustModels">20<')
      && h.includes('<b>400+</b>')
      && h.includes('Shop đang tuyển mẫu') && h.includes('Hồ sơ mẫu thật')
      && h.includes('Khách bán livestream cần tuyển mẫu')
      && h.includes('Ver2Solution — hơn 8 năm xây dựng hệ sinh thái dịch vụ')
      && !h.includes('Xem shop đang tuyển →') && !h.includes('data-track="xem-shop-dang-tuyen"');
  })());
t('app.js fills the trust numbers from real data via renderTrustStats/trustStats; 400+ stays a static constant',
  (() => {
    const js = fs.readFileSync(path.join(root, 'js/app.js'), 'utf8');
    return js.includes("document.getElementById('trustShops')")
      && js.includes("document.getElementById('trustModels')")
      && js.includes('function renderTrustStats') && js.includes('function trustStats')
      && js.includes('trustStats(D.models, D.shops')
      && !/trustClients|400 \+/.test(js.replace(/400\+ là hằng số/g, ''));
  })());
t('trust strip only on home (not in the shop list page or model list page)',
  !fs.readFileSync(path.join(root, 'danh-sach-shop.html'), 'utf8').includes('trust-strip')
  && !fs.readFileSync(path.join(root, 'danh-sach-mau.html'), 'utf8').includes('trust-strip'));
t('CSS: .trust-strip, .trust-nums, .trust-num rules present; responsive stack on mobile',
  (() => {
    const c = fs.readFileSync(path.join(root, 'v20.css'), 'utf8');
    return c.includes('.trust-strip') && c.includes('.trust-nums') && c.includes('.trust-num')
      && c.includes('.trust-num b');
  })());

// ---- (2) Logos ----
t('images-shop/: exactly the 3 verified logo files, real JPEG/PNG (not placeholders)',
  (() => {
    const f = path.join(root, 'images-shop', 'shop-fani-topgia.jpg');
    const cl = path.join(root, 'images-shop', 'shop-chamloa.png');
    const my = path.join(root, 'images-shop', 'shop-mylan.png');
    if (![f, cl, my].every(p => fs.existsSync(p))) return false;
    const fb = fs.readFileSync(f), cb = fs.readFileSync(cl), mb = fs.readFileSync(my);
    return fb.length > 10000 && fb[0] === 0xFF && fb[1] === 0xD8
      && cb.length > 5000 && cb[0] === 0x89 && cb[1] === 0x50
      && mb.length > 1000 && mb[0] === 0x89 && mb[1] === 0x50;
  })());
t('data: logo + logoFit only for the 3 verified shops (FANI cover, Chạm Loa + Mylan contain); 27 others have logo "" (30 shops in v34)',
  D.shops.filter(s => s.logo).length === 3
  && D.shops.find(s => s.name.includes('FANI')).logo === 'images-shop/shop-fani-topgia.jpg'
  && D.shops.find(s => s.name.includes('FANI')).logoFit === 'cover'
  && D.shops.find(s => s.name === 'Chạm Loa').logo === 'images-shop/shop-chamloa.png'
  && D.shops.find(s => s.name === 'Chạm Loa').logoFit === 'contain'
  && D.shops.find(s => s.name.includes('Mylan')).logo === 'images-shop/shop-mylan.png'
  && D.shops.find(s => s.name.includes('Mylan')).logoFit === 'contain'
  && D.shops.filter(s => !s.logo).length === 27
  && D.shops.every(s => 'logo' in s));
t('shopCardHTML: FANI renders cover logo, Chạm Loa + Mylan render contain logos (never cropped)',
  V.shopCardHTML(D.shops.find(s => s.name.includes('FANI'))).includes('<img class="shop-logo shop-logo--cover" src="images-shop/shop-fani-topgia.jpg"')
  && V.shopCardHTML(D.shops.find(s => s.name === 'Chạm Loa')).includes('<img class="shop-logo shop-logo--contain" src="images-shop/shop-chamloa.png"')
  && V.shopCardHTML(D.shops.find(s => s.name.includes('Mylan'))).includes('<img class="shop-logo shop-logo--contain" src="images-shop/shop-mylan.png"'));
t('shopCardHTML: the 27 shops without a logo still render the initial-letter placeholder, no <img>',
  D.shops.filter(s => !s.logo).every(s => {
    const h = V.shopCardHTML(s);
    return h.includes('shop-initial') && !h.includes('<img');
  }));
t('shopCardHTML: every logo img has an onerror fallback to the initial placeholder',
  D.shops.filter(s => s.logo).every(s => {
    const h = V.shopCardHTML(s);
    return h.includes('onerror="this.outerHTML') && h.includes('shop-initial');
  }));
t('CSS: .shop-logo, .shop-logo--cover, .shop-logo--contain present; contain has light-grey background (#eef7f2, v37: so a white logo like Mylan stays visible) + padding, never cropped',
  (() => {
    const c = fs.readFileSync(path.join(root, 'v20.css'), 'utf8');
    return c.includes('.shop-logo') && c.includes('.shop-logo--cover') && c.includes('.shop-logo--contain')
      && /\.shop-logo--cover\{[^}]*object-fit:cover/.test(c.replace(/\s+/g, ''))
      && /\.shop-logo--contain\{[^}]*object-fit:contain/.test(c.replace(/\s+/g, ''))
      && /\.shop-logo--contain\{[^}]*background:#eef7f2/.test(c.replace(/\s+/g, ''));
  })());
t('no Thế Giới Giấy content used for Mylan (the wrong fanpage from the audit warning)',
  !JSON.stringify(D.shops).includes('Congtythegioigiay') && !JSON.stringify(D.shops).includes('Thế Giới Giấy')
  && !V.shopCardHTML(D.shops.find(s => s.name.includes('Mylan'))).includes('Congtythegioigiay'));

// ---- (3) Contacts: data matches the audit exactly ----
t('every model and every shop has a non-empty contacts array; every contact has provider/value/label/source/source_url',
  D.models.every(m => Array.isArray(m.contacts) && m.contacts.length > 0)
  && D.shops.every(s => Array.isArray(s.contacts) && s.contacts.length > 0)
  && [...D.models, ...D.shops].every(x => x.contacts.every(c =>
    ['facebook', 'zalo', 'phone', 'email', 'tiktok', 'shopee'].includes(c.provider)
    && c.value && c.label && c.source && c.source_url)));
t('model phones are exactly the 5 audited public numbers (th-02, th-03, th-12, th-14, th-17)',
  JSON.stringify(phonesIn(JSON.stringify(D.models))) === JSON.stringify(AUDIT_MODEL_PHONES),
  phonesIn(JSON.stringify(D.models)).join(','));
t('shop phones are exactly the 26 audited public numbers in 25 shops (Lê Thị Liễu has 2; v34 adds 6 idol/game numbers)',
  JSON.stringify(phonesIn(JSON.stringify(D.shops))) === JSON.stringify(AUDIT_SHOP_PHONES),
  phonesIn(JSON.stringify(D.shops)).join(','));
t('emails: exactly 2 audited public emails (th-14 huonglam2303@gmail.com, FANI dungtvt3382@topgiafani.com)',
  (() => {
    const all = [...D.models, ...D.shops].flatMap(x => x.contacts).filter(c => c.provider === 'email');
    return all.length === 2
      && all.some(c => c.value === 'huonglam2303@gmail.com')
      && all.some(c => c.value === 'dungtvt3382@topgiafani.com');
  })());
t('TikTok/Shopee contacts exist only for DOLLY SECRET (audit §3); no model has a TikTok/Instagram contact',
  D.models.every(m => !m.contacts.some(c => c.provider === 'tiktok' || c.provider === 'instagram'))
  && D.shops.filter(s => s.contacts.some(c => c.provider === 'tiktok' || c.provider === 'shopee')).length === 1
  && D.shops.find(s => s.contacts.some(c => c.provider === 'tiktok')).name === 'DOLLY SECRET');
t('zalo/phone values are 10-digit numbers; emails look like emails; facebook/tiktok/shopee values are https URLs',
  [...D.models, ...D.shops].every(x => x.contacts.every(c => {
    if (c.provider === 'zalo' || c.provider === 'phone') return /^0[389]\d{8}$/.test(c.value);
    if (c.provider === 'email') return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(c.value);
    return /^https:\/\//.test(c.value);
  })));
t('special labels from the audit are kept verbatim (DOLLY Ms. Nhàn, FANI Zalo liên hệ nhanh / Email nhận CV)',
  V.shopCardHTML(D.shops.find(s => s.name === 'DOLLY SECRET')).includes('Zalo liên hệ tuyển dụng (Ms. Nhàn)')
  && V.shopCardHTML(D.shops.find(s => s.name.includes('FANI'))).includes('Zalo liên hệ nhanh')
  && V.shopCardHTML(D.shops.find(s => s.name.includes('FANI'))).includes('Email nhận CV'));

// ---- (3b) Contacts: rendering ----
t('contactNoteHTML returns the exact verbatim Notes line',
  V.contactNoteHTML() === '<p class="contact-note">' + NOTE + '</p>');
t('every shop card shows its contacts + the verbatim Notes line, placed after the facts and before "Tin tuyển công khai"',
  D.shops.every(s => {
    const h = V.shopCardHTML(s);
    const factsEnd = h.indexOf('</dl>');
    const note = h.indexOf(NOTE);
    const src = h.indexOf('Tin tuyển công khai');
    return h.includes('class="contact-list"') && note > factsEnd && note < src;
  }));
t('model detail contact block (contactsBlockHTML): th-02 shows Zalo link + Facebook; th-01 shows Facebook only, no Zalo; th-14 shows Zalo + mailto email',
  V.contactsBlockHTML(D.models.find(m => m.id === 'th-02').contacts).includes('href="https://zalo.me/0982725840"')
  && V.contactsBlockHTML(D.models.find(m => m.id === 'th-02').contacts).includes('0982725840')
  && !V.contactsBlockHTML(D.models.find(m => m.id === 'th-01').contacts).includes('zalo.me/')
  && V.contactsBlockHTML(D.models.find(m => m.id === 'th-14').contacts).includes('href="mailto:huonglam2303@gmail.com"')
  && V.contactsBlockHTML(D.models.find(m => m.id === 'th-14').contacts).includes('href="https://zalo.me/0986718540"'));
t('model detail contact block is wired into initDetail (app.js renders contacts + Notes in the contact card, keeps the two buttons)',
  (() => {
    const js = fs.readFileSync(path.join(root, 'js/app.js'), 'utf8');
    const det = js.slice(js.indexOf('function initDetail'));
    return det.includes('contactsBlockHTML(m.contacts)') && det.includes('contactNoteHTML()')
      && det.includes('Liên hệ trực tiếp với mẫu')
      && det.includes('Chỉ hiển thị thông tin liên hệ do chính mẫu công khai')
      && det.includes('Xem bài gốc trên Facebook') && det.includes('Nhắn Zalo Ver2Solution 032 998 3699')
      && det.includes('Yêu cầu gỡ hồ sơ') && !det.includes('Nhắn Facebook qua bài gốc')
      && !det.includes('Web không đăng số điện thoại, Zalo hay email riêng của mẫu');
  })());
t('shop card: FANI shows fanpage only (no second "Facebook người đăng tin" link); shops without a fanpage show "Facebook người đăng tin"',
  (() => {
    const fani = V.shopCardHTML(D.shops.find(s => s.name.includes('FANI')));
    const khail = V.shopCardHTML(D.shops.find(s => s.name === 'Đỗ Sỹ Khải'));
    return fani.includes('Fanpage Tuyển Dụng FANI') && !fani.includes('Facebook người đăng tin')
      && khail.includes('Facebook người đăng tin');
  })());
t('shop card: Lê Thị Liễu shows BOTH audited numbers; the 4 shops with no number in the post show no OWN Zalo/phone line — only the hard Ver2Solution "Nhắn Zalo" button (zalo.me/0329983699, v32 intent)',
  (() => {
    const lieu = V.shopCardHTML(D.shops.find(s => s.name === 'Lê Thị Liễu'));
    const noNum = ['Phạm Hoàng Lâm', 'Nguyễn Minh Ngọc', 'QTC Marketing', 'Nguyễn Thuý']
      .map(n => V.shopCardHTML(D.shops.find(s => s.name === n)));
    return lieu.includes('0971759240') && lieu.includes('0981167717')
      && noNum.every(h => (h.match(/zalo\.me\/\d+/g) || []).every(u => u === 'zalo.me/0329983699') && !h.includes('tel:'));
  })());
t('model list cards stay contact-free (spec §8.5): no contact-list, no model phone number; the only zalo.me link is Ver2Solution 0329983699',
  D.models.every(m => {
    const h = V.cardHTML(m);
    const zlinks = h.match(/zalo\.me\/[^\s"'<>]+/gi) || [];
    return !h.includes('contact-list') && phonesIn(h).every(n => n === '0329983699')
      && zlinks.every(u => u === 'zalo.me/0329983699');
  }));
t('no private phone/Zalo anywhere in rendered output except the audited set + Ver2Solution 0329983699',
  (() => {
    const rendered = D.models.map(m => V.cardHTML(m)).join('')
      + D.shops.map(s => V.shopCardHTML(s)).join('')
      + D.models.map(m => V.contactsBlockHTML(m.contacts)).join('');
    const found = [...new Set(phonesIn(rendered))];
    const allowed = [...AUDIT_MODEL_PHONES, ...AUDIT_SHOP_PHONES, '0329983699'];
    return found.every(n => allowed.includes(n));
  })(), 'found: ' + [...new Set(phonesIn(
    D.models.map(m => V.cardHTML(m)).join('')
    + D.shops.map(s => V.shopCardHTML(s)).join('')
    + D.models.map(m => V.contactsBlockHTML(m.contacts)).join('')))].join(','));
t('contact values are HTML-escaped (crafted label/value with < does not leak raw)',
  (() => {
    const h = V.contactItemHTML({ provider: 'zalo', value: '0982725840', label: 'Zalo <b>x</b>', source: 'post', source_url: 'https://example.com/' });
    const h2 = V.shopCardHTML({ name: 'A<B', shopNameKnown: true, product: 'X&Y', province: 'Hà Nội', district: 'Q', salary: '1', req: 'r', channels: 'T', date: '2026-11-04', src: 'https://www.facebook.com/groups/1/posts/2', logo: 'images-shop/shop-fani-topgia.jpg', logoFit: 'cover', contacts: [{ provider: 'email', value: 'a@b.co', label: 'E<vil', source: 'post', source_url: 'https://example.com/' }] });
    return h.includes('Zalo &lt;b&gt;x&lt;/b&gt;') && !h.includes('<b>x</b>')
      && h2.includes('A&lt;B') && h2.includes('E&lt;vil') && !h2.includes('E<vil');
  })());
t('CSS: .contact-list and .contact-note rules present; dark contact-card variant keeps links/notes readable',
  (() => {
    const c = fs.readFileSync(path.join(root, 'v20.css'), 'utf8');
    return c.includes('.contact-list') && c.includes('.contact-note')
      && c.includes('.contact-card .contact-list a') && c.includes('.contact-card .contact-note');
  })());

// ---- (4) Chạm Loa special case ----
t('Chạm Loa: exactly 1 contact (public fanpage), no Zalo/phone/email in contacts; card may only link the hard Ver2Solution Zalo (zalo.me/0329983699, v32 intent); tin NOT removed in v26',
  (() => {
    const s = D.shops.find(x => x.name === 'Chạm Loa');
    const h = V.shopCardHTML(s);
    return s.contacts.length === 1 && s.contacts[0].provider === 'facebook'
      && s.contacts[0].value === 'https://www.facebook.com/people/Chạm-Loa/61576944824677/'
      && (h.match(/zalo\.me\/\d+/g) || []).every(u => u === 'zalo.me/0329983699')
      && !h.includes('tel:');
  })());
t('danh-sach-shop.html intro §8.4 da xoa o v62 (noi dung huong dan chuyen sang FAQ); grid van co',
  (() => {
    const h = fs.readFileSync(path.join(root, 'danh-sach-shop.html'), 'utf8');
    return !h.includes('Thông tin dưới đây chỉ lấy từ bài tuyển shop tự đăng công khai trên Facebook')
      && !h.includes('Số điện thoại và email riêng của shop không hiện công khai')
      && !h.includes('30 shop đang tuyển mẫu') && h.includes('id="publicShopsList"');
  })());

// ---- v35: menu gon 5 muc (user-directed 2026-11-05 ~21:47: bo "Cách hoạt động"
  // + "Lộ trình", menu 1 hang). Nav cu 7 muc (v25) khong con dung nua.
t('menu v35+v86: exactly 6 items (Trang chủ, Dành cho Mẫu, Dành cho Shop, Thanh lý Kiot, Tin tức, Hỏi đáp), no Cách hoạt động / Lộ trình',
  (() => {
    const nav = h => { const s = fs.readFileSync(path.join(h, 'index.html'), 'utf8'); return s.slice(s.indexOf('<nav class="main-nav"'), s.indexOf('</nav>')); };
    const n = nav(root);
    return (n.match(/<a href=/g) || []).length === 6
      && n.includes('Trang chủ') && n.includes('Dành cho Mẫu') && n.includes('Dành cho Shop')
      && n.includes('Thanh lý Kiot')
      && n.includes('Tin tức') && n.includes('Hỏi đáp')
      && !n.includes('Cách hoạt động') && !n.includes('Lộ trình');
  })());
t('home top 8 still photo-only (v25 rule): 8 profiles, all with a real photo, on 2026-11-05',
  V.homeTop8(D.models, new Date(2026, 10, 5)).length === 8
  && V.homeTop8(D.models, new Date(2026, 10, 5)).every(m => m.photoUrl));
t('models/shops/articles counts vs v25 (20 / 30 / 35); models same ids/names/order, all v25 shops still present by name/link',
  D.models.length === 20 && D.shops.length === 30 && D.articles.length === 50
  && D.models.every((m, i) => m.id === D25.models[i].id && m.name === D25.models[i].name)
  && D25.shops.every(o => D.shops.some(s => s.name === o.name && s.src === o.src)));
t('.nojekyll still present (GitHub Pages serves the new images-shop/ folder)',
  fs.existsSync(path.join(root, '.nojekyll')));
console.log(`\n${pass} PASS, ${fail} FAIL`);
process.exit(fail ? 1 : 0);
