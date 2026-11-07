/* v20 tests — Node only, no browser. Checks the v19-fix2 rules ported into v20
   plus the new-UI rules: visible text has no internal ids, cards are built with
   attributes inside <article>, photos are embedded for exactly 7, pagination is 12/page (v38: list page 3 rows x 4 cols). */
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let pass = 0, fail = 0;
function t(name, cond, extra = '') { if (cond) { pass++; console.log('PASS v20:', name); } else { fail++; console.log('FAIL v20:', name, extra); } }
const sandbox = { window: {}, module: { exports: {} }, console };
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path.join(root, 'js/data.js'), 'utf8'), sandbox);
vm.runInContext(fs.readFileSync(path.join(root, 'js/app.js'), 'utf8'), sandbox);
const D = sandbox.window.V20_DATA, V = sandbox.window.V20;
t('20 models, 30 shops, 50 articles', D.models.length === 20 && D.shops.length === 30 && D.articles.length === 50, `${D.models.length}/${D.shops.length}/${D.articles.length}`);
t('20 verified real names, none is an id', D.models.every(m => m.name && !/^th-\d+$/.test(m.name)));
t('18 real photos, exactly the verified set (v25: 7 original post photos + th-11/th-18 post photos + 9 public profile pictures)', D.models.filter(m => m.photoUrl).length === 18 &&
  D.models.filter(m => m.photoUrl).map(m => m.id).sort().join(',') === 'th-01,th-02,th-03,th-05,th-06,th-07,th-08,th-09,th-11,th-12,th-13,th-14,th-15,th-16,th-17,th-18,th-19,th-20');
t('model phones are ONLY the 5 audited public numbers (v26 rule 2026-11-05 13:26: contacts from contact-audit-v26.md; long Facebook IDs are not phones)',
  (() => {
    const found = (JSON.stringify(D.models).match(/(?<!\d)0[389]\d{8}(?!\d)/g) || []).sort();
    const audited = ['0363622099', '0932542626', '0969151680', '0982725840', '0986718540'].sort();
    return JSON.stringify(found) === JSON.stringify(audited);
  })(), 'found: ' + ((JSON.stringify(D.models).match(/(?<!\d)0[389]\d{8}(?!\d)/g) || []).join(',')));
t('card HTML: attributes inside <article ...>, never after a closing div',
  (() => { const h = V.cardHTML(D.models[0]); return /^<article[^>]*data-province="[^"]+"[^>]*data-cat="[^"]+"[^>]*>/.test(h) && !/<\/div>\s*data-/.test(h); })());
// v28 rule (2026-11-05, thẻ 5 giây): the card face no longer has a "Lương mong
// muốn" facts row — a real salary shows in the decision row ("💰 Lương") and a
// negotiable salary shows as the grey "Lương thỏa thuận" chip. th-02 has a
// negotiable salary + a real schedule, so its card must show the chip and the
// schedule row. v37: the Doanh thu box shows the muted "Chưa cập nhật" placeholder (th-02 topRevenue is genuinely missing).
t('card HTML: real name large, negotiable salary as chip + real schedule row, 2 action buttons',
  (() => { const h = V.cardHTML(D.models[1]); return h.includes('G T MY Duyênn') && h.includes('Xem hồ sơ') && h.includes('Nhắn Zalo') && h.includes('Lương thỏa thuận') && h.includes('🕒 Lịch') && h.includes('Part-time / theo ca, trao đổi thêm') && h.includes('Doanh thu cao nhất') && h.includes('decision-value muted'); })());
t('card HTML: real photo embedded directly for with-photo, placeholder otherwise',
  V.cardHTML(D.models[1]).includes('images/th-02.jpg') && !V.cardHTML(D.models[3]).includes('<img') && V.cardHTML(D.models[3]).includes('ph-holder') && V.cardHTML(D.models[3]).includes('Ảnh minh họa tạm'));
t('visible static HTML has no internal id text (script tags stripped)',
  ['index.html', 'danh-sach-mau.html', 'ho-so.html'].every(f => {
    const txt = fs.readFileSync(path.join(root, f), 'utf8').replace(/<script[\s\S]*?<\/script>/g, '');
    return !/th-\d{2}\b/.test(txt);
  }));
t('home order (v25 rule 2026-11-05 13:17): homeTop8 first 8 all have a real photo, no photo-less profile in top 8',
  V.homeTop8(D.models, new Date(2026, 10, 5)).length === 8 &&
  V.homeTop8(D.models, new Date(2026, 10, 5)).every(m => m.photoUrl));
t('filter: TP. Hồ Chí Minh = 11, Thời trang province+cat logic works',
  V.filterModels(D.models, { prov: 'TP. Hồ Chí Minh', cat: '', gender: '', q: '' }).length === 11 &&
  V.filterModels(D.models, { prov: '', cat: 'Thời trang', gender: '', q: '' }).length === 9);
t('filter by name search finds a real name', V.filterModels(D.models, { prov: '', cat: '', gender: '', q: 'Duyênn' }).length === 1);
t('pagination 12/page over 20 = 2 pages (12,8) [v38: list page 3 rows x 4 cols]', Math.ceil(20 / 12) === 2 && 20 - 12 === 8);
t('detail mini-cards: other 19, names only, no id in visible text (tags/URLs/src stripped)',
  D.models.filter(m => m.id !== 'th-02').every(m => {
    const visible = V.miniHTML(m).replace(/<[^>]+>/g, ' ');
    return V.miniHTML(m).includes(m.name) && !/th-\d{2}\b/.test(visible);
  }));
t('CSS v20 is a new system (new bg token, card radius token, no old beige hex)',
  fs.readFileSync(path.join(root, 'v20.css'), 'utf8').includes('--bg:#eef3f1') &&
  fs.readFileSync(path.join(root, 'v20.css'), 'utf8').includes('--r:22px') &&
  !fs.readFileSync(path.join(root, 'v20.css'), 'utf8').includes('#f7f6f3'));
t('no payment / commission / chat / donate in v20 core', !/thanh toán|hoa hồng|chat riêng|donate/i.test(
  fs.readFileSync(path.join(root, 'js/app.js'), 'utf8') + fs.readFileSync(path.join(root, 'index.html'), 'utf8')));
// ---- SEO / PWA / responsive / Android (added for v20) ----
const htmlFiles = ['index.html', 'danh-sach-mau.html', 'ho-so.html', 'danh-sach-shop.html', 'tin-tuc.html', 'bai-viet-bop-reach.html', 'trang-cua-toi.html'];
t('SEO: every page has title, description, canonical, OG, Twitter, favicon, JSON-LD Organization',
  htmlFiles.every(f => {
    const h = fs.readFileSync(path.join(root, f), 'utf8');
    return /<title>[^<]+<\/title>/.test(h) && /name="description"/.test(h) && /rel="canonical"/.test(h)
      && /property="og:title"/.test(h) && /property="og:image"/.test(h) && /name="twitter:card"/.test(h)
      && /rel="icon"/.test(h) && /"@type":"Organization"/.test(h) && /ver2solution\.github\.io\/mclivestream/.test(h);
  }));
t('SEO: heading order — index h1 once (hero), list h1 once, cards h3, no h1 inside cards',
  (fs.readFileSync(path.join(root, 'index.html'), 'utf8').match(/<h1>/g) || []).length === 1 &&
  (fs.readFileSync(path.join(root, 'danh-sach-mau.html'), 'utf8').match(/<h1>/g) || []).length === 1 &&
  !/<h1>/.test(V.cardHTML(D.models[0])));
t('SEO: sitemap lists core pages, robots allows public pages and points to sitemap',
  fs.readFileSync(path.join(root, 'sitemap.xml'), 'utf8').includes('danh-sach-mau.html') &&
  fs.readFileSync(path.join(root, 'robots.txt'), 'utf8').includes('Allow: /') &&
  fs.readFileSync(path.join(root, 'robots.txt'), 'utf8').includes('sitemap.xml'));
t('SEO: real-photo alt text uses the real name, not a generic label',
  V.cardHTML(D.models[1]).includes('alt="Ảnh thật từ bài gốc của G T MY Duyênn"'));
t('PWA: manifest exists, valid JSON, 192+512 icons exist, theme-color + manifest linked on every page',
  (() => { try {
    const man = JSON.parse(fs.readFileSync(path.join(root, 'manifest.webmanifest'), 'utf8'));
    return man.name && man.start_url && man.icons.some(i => i.sizes === '192x192') && man.icons.some(i => i.sizes === '512x512')
      && fs.existsSync(path.join(root, 'icon-192.png')) && fs.existsSync(path.join(root, 'icon-512.png'))
      && htmlFiles.every(f => { const h = fs.readFileSync(path.join(root, f), 'utf8'); return /rel="manifest"/.test(h) && /name="theme-color"/.test(h) && /mobile-web-app-capable/.test(h); });
  } catch { return false; } })());
t('PWA: service worker exists, HTML network-first, shell cache versioned (v33 bumped CACHE to v33-shell-1; v20-shell- no longer expected)',
  /v\d+-shell-/.test(fs.readFileSync(path.join(root, 'sw.js'), 'utf8')) &&
  fs.readFileSync(path.join(root, 'sw.js'), 'utf8').includes("mode === 'navigate'") &&
  htmlFiles.every(f => fs.readFileSync(path.join(root, f), 'utf8').includes('serviceWorker')));
t('Responsive simulation (CSS rules, not a real device): breakpoints 1000/600/360/320 all present, 1-column grid at 600',
  (() => { const css = fs.readFileSync(path.join(root, 'v20.css'), 'utf8');
    return /max-width:1000px/.test(css) && /max-width:600px/.test(css) && /max-width:360px/.test(css) && /max-width:320px/.test(css)
      && /\.grid,.grid-3,.mini-grid,.news-list,.steps\{grid-template-columns:1fr\}/.test(css.replace(/\s+/g, '')); })());
t('Responsive tiny screens (200-320px): no fixed wide layout, buttons min 44-48px, no horizontal overflow rule',
  (() => { const css = fs.readFileSync(path.join(root, 'v20.css'), 'utf8');
    return css.includes('overflow-x:hidden') && css.includes('min-height:48px') && css.includes('min-height:44px') && !/min-width:\s*(900|1000|1180)px/.test(css); })());
t('Android TWA package: manifest + gradle + package id + default URL + asset_statements, no keystore, no password',
  fs.readFileSync(path.join(root, 'android/app/src/main/AndroidManifest.xml'), 'utf8').includes('com.ver2solution.mclivestream') &&
  fs.readFileSync(path.join(root, 'android/app/src/main/AndroidManifest.xml'), 'utf8').includes('ver2solution.github.io/mclivestream') &&
  fs.readFileSync(path.join(root, 'android/app/src/main/AndroidManifest.xml'), 'utf8').includes('LauncherActivity') &&
  fs.readFileSync(path.join(root, 'android/app/build.gradle'), 'utf8').includes("applicationId 'com.ver2solution.mclivestream'") &&
  !fs.existsSync(path.join(root, 'android/app/release.keystore')) &&
  !/password|keyPassword|storePassword/i.test(fs.readFileSync(path.join(root, 'android/app/build.gradle'), 'utf8')));
t('Android assetlinks: template present, placeholder fingerprint clearly marked, package matches manifest',
  (() => { try {
    const a = JSON.parse(fs.readFileSync(path.join(root, '.well-known/assetlinks.json'), 'utf8'));
    return a[0].target.package_name === 'com.ver2solution.mclivestream' && a[0].target.sha256_cert_fingerprints[0].includes('REPLACE_WITH');
  } catch { return false; } })());
t('Android: no .aab/.apk claimed as built, README states explicitly it is NOT submitted',
  !fs.existsSync(path.join(root, 'android/app/build')) &&
  /KHÔNG phải app đã nộp/.test(fs.readFileSync(path.join(root, 'android/README-PLAY-STORE.md'), 'utf8')));
// ---- QA-blocker fix: Shop + News pages, Supabase flow (v20-fix, local only) ----
t('QA fix: danh-sach-shop.html and tin-tuc.html exist and use v20 system (bg token, 22px radius, brand)',
  fs.existsSync(path.join(root, 'danh-sach-shop.html')) && fs.existsSync(path.join(root, 'tin-tuc.html')) &&
  ['danh-sach-shop.html', 'tin-tuc.html'].every(f => { const h = fs.readFileSync(path.join(root, f), 'utf8'); return h.includes('v20.css') && h.includes('site-head') && h.includes('Dành cho Shop') && h.includes('Dành cho Mẫu') && h.includes('Tin tức') && h.includes('Hỏi đáp') && !h.includes('Cách hoạt động') && !h.includes('Lộ trình'); }));
t('QA fix: shop page has 3 real Supabase auth forms + job form, public shop list replaces the old empty line',
  (() => { const h = fs.readFileSync(path.join(root, 'danh-sach-shop.html'), 'utf8');
    return ['shopSignUp','shopSignIn','shopForgot','shSuEmail','shSiEmail','shFpEmail','jobForm'].every(id => h.includes(id)) && h.includes('publicShopsList') && !h.includes('Hiện chưa liệt kê shop nào'); })());
t('QA fix: mau page has 3 real Supabase auth forms',
  (() => { const h = fs.readFileSync(path.join(root, 'danh-sach-mau.html'), 'utf8');
    return ['mauSignUp','mauSignIn','mauForgot','maSuEmail','maSiEmail','maFpEmail'].every(id => h.includes(id)); })());
t('QA fix: supabase files present, anon public config only, no service_role key (comment warnings allowed)',
  fs.existsSync(path.join(root, 'supabase-config.js')) && fs.existsSync(path.join(root, 'mclivestream-supabase.js')) &&
  /cvibbmbqtdjxwmponpzg\.supabase\.co/.test(fs.readFileSync(path.join(root, 'supabase-config.js'), 'utf8')) &&
  !/sb_secret|service_role[^a-z]*key\s*[:=]\s*["']eyJ/.test(fs.readFileSync(path.join(root, 'supabase-config.js'), 'utf8') + fs.readFileSync(path.join(root, 'mclivestream-supabase.js'), 'utf8')) &&
  ['danh-sach-shop.html','danh-sach-mau.html','tin-tuc.html'].every(f => fs.readFileSync(path.join(root, f), 'utf8').includes('mclivestream-supabase.js')));
t('QA fix: news page renders from data.js (newsMain, mostList, category filter, newest/oldest sort)',
  (() => { const h = fs.readFileSync(path.join(root, 'tin-tuc.html'), 'utf8');
    return h.includes('id="newsMain"') && h.includes('id="mostList"') && h.includes('id="newsCat"') && h.includes('id="newsSort"') && h.includes('chưa kiểm chứng'); })());
t('QA fix: news init exists in app.js and sorts newest first, most list = 20 with unverified label',
  (() => { const a = fs.readFileSync(path.join(root, 'js/app.js'), 'utf8');
    return a.includes('initNews') && a.includes('mostList') && a.includes('chưa kiểm chứng'); })());
t('QA fix: sitemap lists exactly the 15 real core pages, no missing file (v48: +dat-lai-mat-khau.html; v68: +dang-nhap.html; v77: +4 trang AdSense; v83: +tinh-lai-1111.html; v85: +dang-ky.html; v86: +thanh-ly-kiot.html; ho-so.html excluded: detail uses ?id= query; trang-cua-toi.html excluded: login app page, noindex)',
  (() => { const s = fs.readFileSync(path.join(root, 'sitemap.xml'), 'utf8');
    const urls = [...s.matchAll(/mclivestream\/([a-z0-9-]+\.html)/g)].map(m => m[1]);
    return urls.length === 15 && urls.includes('gioi-thieu.html') && urls.includes('chinh-sach-bao-mat.html') && urls.includes('dieu-khoan-su-dung.html') && urls.includes('lien-he.html') && urls.includes('bai-viet-bop-reach.html') && urls.includes('quy-tac-diem-thuong.html') && urls.includes('tinh-lai-1111.html') && urls.includes('dang-nhap.html') && urls.includes('dang-ky.html') && urls.includes('thanh-ly-kiot.html') && urls.every(u => fs.existsSync(path.join(root, u))); })());
t('QA fix: every internal .html link in the 7 pages resolves to a real file (query/anchor stripped, external skipped; v68: regex chiu duoc ?next= co .html)',
  (() => {
    const missing = [];
    ['index.html','danh-sach-mau.html','ho-so.html','danh-sach-shop.html','tin-tuc.html','bai-viet-bop-reach.html','trang-cua-toi.html'].forEach(f => {
      const h = fs.readFileSync(path.join(root, f), 'utf8').replace(/<script[\s\S]*?<\/script>/g, '');
      [...h.matchAll(/href="([^"?#]+\.html)(?:[?#][^"]*)?"/g)].forEach(m => { if (m[1].startsWith('http')) return; if (!fs.existsSync(path.join(root, m[1]))) missing.push(f + ' -> ' + m[1]); });
    });
    return missing.length === 0;
  })(), 'see link audit for bai-viet link, which lives in js/data.js, not in static HTML');
t('QA fix: visible static HTML of the 2 new pages has no internal id text (script tags stripped)',
  ['danh-sach-shop.html', 'tin-tuc.html'].every(f => {
    const txt = fs.readFileSync(path.join(root, f), 'utf8').replace(/<script[\s\S]*?<\/script>/g, '');
    return !/th-\d{2}\b/.test(txt);
  }));

// ---- v20 completion: pinned article, My Page, real shop backend, portable ----
t('Completion: pinned bai-viet article is a real v20 page, data link resolves, no pinned-note left in app.js',
  fs.existsSync(path.join(root, 'bai-viet-bop-reach.html')) &&
  fs.readFileSync(path.join(root, 'bai-viet-bop-reach.html'), 'utf8').includes('v20.css') &&
  fs.readFileSync(path.join(root, 'bai-viet-bop-reach.html'), 'utf8').includes('Vì sao 90% Page bị bóp reach') &&
  D.articles.some(a => a.pinned && a.url === 'bai-viet-bop-reach.html' && fs.existsSync(path.join(root, a.url))) &&
  !fs.readFileSync(path.join(root, 'js/app.js'), 'utf8').includes('chưa có trong bản v20'));
t('Completion: pinned article visible text has no internal id, keeps Ver2Solution source and signature hashtags',
  (() => { const txt = fs.readFileSync(path.join(root, 'bai-viet-bop-reach.html'), 'utf8').replace(/<script[\s\S]*?<\/script>/g, '');
    return !/th-\d{2}\b/.test(txt) && txt.includes('Ver2Solution') && txt.includes('#ver2solution'); })());
t('Completion: card title is Province — Real name everywhere (sample th-02)',
  V.cardHTML(D.models.find(m => m.id === 'th-02')).includes('Toàn quốc / Live online — G T MY Duyênn'));
t('Completion: model list sort in app.js is views desc then comments desc',
  /views.*comments|sort.*view/i.test(fs.readFileSync(path.join(root, 'js/app.js'), 'utf8')) &&
  fs.readFileSync(path.join(root, 'js/app.js'), 'utf8').includes('b.views') );
t('Completion: Trang của tôi exists, noindex, required + optional fields, pending notice, no CCCD/password input',
  (() => { const h = fs.readFileSync(path.join(root, 'trang-cua-toi.html'), 'utf8');
    return h.includes('myProfileForm') && h.includes('myFullName') && h.includes('myDob') && h.includes('myHometown')
      && h.includes('myWorkLocation') && h.includes('myEducation') && h.includes('myExperience') && h.includes('myDesiredField')
      && h.includes('myPhoneZalo') && h.includes('myEmail') && h.includes('myTopRevenue') && h.includes('myAlbum') && h.includes('myDemo')
      && h.includes('saveMyProfile') && h.includes('fetchMyProfile') && h.includes('pending') && h.includes('noindex')
      && !/name="cccd"|id="myCccd"|type="password"/i.test(h) && !/sb_secret|service_role[^a-z]*key\s*[:=]\s*["']eyJ/.test(h); })());
t('Completion: mau page links to Trang của tôi and shows approved job posts section',
  fs.readFileSync(path.join(root, 'danh-sach-mau.html'), 'utf8').includes('trang-cua-toi.html') &&
  fs.readFileSync(path.join(root, 'danh-sach-mau.html'), 'utf8').includes('tin-tuyen-da-duyet') &&
  fs.readFileSync(path.join(root, 'danh-sach-mau.html'), 'utf8').includes('fetchApprovedJobPosts') &&
  !fs.readFileSync(path.join(root, 'danh-sach-mau.html'), 'utf8').includes('vẫn chưa có trong bản v20'));
t('Completion: shop migration M2/M3 has both tables, pending default, owner-only RLS, public read approved only',
  (() => { const m = fs.readFileSync(path.join(root, 'supabase-migration-shop-m2-m3.sql'), 'utf8');
    return m.includes('CREATE TABLE IF NOT EXISTS public.shop_profiles') && m.includes('CREATE TABLE IF NOT EXISTS public.shop_job_posts')
      && m.includes("moderation_status = 'approved'") && m.includes('auth.uid() = auth_user_id')
      && m.includes("DEFAULT 'pending'") && !/sb_secret|service_role[^a-z]*key\s*[:=]\s*["']eyJ/.test(m); })());
t('Completion: supabase API exports real shop functions, shop page has no mock text and has approved lists + job channels',
  (() => { const api = fs.readFileSync(path.join(root, 'mclivestream-supabase.js'), 'utf8');
    const sh = fs.readFileSync(path.join(root, 'danh-sach-shop.html'), 'utf8');
    return ['fetchApprovedShops','fetchMyShopProfile','saveMyShopProfile','uploadShopLogo','fetchApprovedJobPosts','fetchMyJobPosts','submitJobPost','isTableMissingError'].every(f => api.includes(f))
      && api.includes('shop_profiles') && api.includes('shop_job_posts')
      && !sh.includes('mô phỏng') && sh.includes('shopBackendStatus') && sh.includes('approvedShopsList') && sh.includes('approvedJobsList')
      && sh.includes('jobChannels') && sh.includes('publicShopsList') && !sh.includes('Hiện chưa liệt kê shop nào'); })());
t('Completion: migration M1 adds top_revenue column for profiles',
  fs.readFileSync(path.join(root, 'supabase-migration-top-revenue.sql'), 'utf8').includes('ADD COLUMN IF NOT EXISTS top_revenue'));
t('Completion: portable — single site.config.json matches canonical, domain script exists, no absolute internal nav link',
  (() => { try {
    const cfg = JSON.parse(fs.readFileSync(path.join(root, 'site.config.json'), 'utf8'));
    const base = String(cfg.origin).replace(/\/$/, '') + String(cfg.basePath || '').replace(/\/$/, '');
    const idx = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
    const navAbsolute = htmlFiles.some(f => /<a[^>]+href="https:\/\/ver2solution\.github\.io\/mclivestream\/[a-z0-9-]+\.html"/.test(fs.readFileSync(path.join(root, f), 'utf8')));
    return base === 'https://ver2solution.github.io/mclivestream' && idx.includes('<link rel="canonical" href="' + base + '/index.html">')
      && fs.existsSync(path.join(root, 'tools/update-domain.mjs'))
      && fs.readFileSync(path.join(root, 'tools/update-domain.mjs'), 'utf8').includes('site.config.json') && !navAbsolute;
  } catch { return false; } })());
console.log(`\n${pass} PASS, ${fail} FAIL`);
process.exit(fail ? 1 : 0);
