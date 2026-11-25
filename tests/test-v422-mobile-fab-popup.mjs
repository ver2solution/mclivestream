/* v422 tests — P3-mobile-FAB: nut Gop y (#gopyFab) de popup "N nguoi dang
   online" (#onlinePopup) tren mobile 390x844 o trang co thanh tab.
   Goc (mobile-check 18:36 24/11/2026, probe-popup.mjs): FAB bi nhac len
   tren thanh tab (mobile-shell.css: bottom 60+14=74px, cao 48px -> mep
   tren 122px tinh tu day) trong khi popup van bottom:84px (v20.css:686)
   -> chong 38px doc x 48px ngang.
   Fix: them rule .online-popup bottom = 60+14+48+10 = 132px vao
   mobile-shell.css (cung media query <=768px, file load SAU v20.css
   nen thang rule bottom:84px). Khe 10px giu nguyen du co safe-area
   vi cung cong thuc voi FAB.
   Test: (A) tinh — file chua rule + thu tu load; (B) trinh duyet that
   (Playwright, live site + inject NGUYEN VAN file mobile-shell.css
   da sua vao <style> cuoi <head> de mo phong file live moi) — do rect
   popup vs FAB o 390x844 (3 trang co tab) + 768x1024 + 1 trang khong
   tab (khong inject — fix khong duoc anh huong trang khong tab);
   (C) doi chung: khong inject thi index van chong (bug con tren live). */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
// playwright-core: thu bare specifier truoc (chay tu noi co node_modules),
// roi fallback duong dan tuyet doi cua moi truong nay (~/workspace/qa19).
let chromium;
try { ({ chromium } = await import('playwright-core')); }
catch { ({ chromium } = await import('/home/hatch/workspace/qa19/node_modules/playwright-core/index.mjs')); }

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let pass = 0, fail = 0;
function t(name, cond, extra = '') {
  if (cond) { pass++; console.log('PASS v422:', name); }
  else { fail++; console.log('FAIL v422:', name, extra); }
}

// ---- (A) static ----
const shellCss = fs.readFileSync(path.join(root, 'mobile-shell.css'), 'utf8');
t('mobile-shell.css chua rule .online-popup bottom 132px (v422)',
  /\.online-popup\s*\{\s*bottom\s*:\s*calc\(60px \+ env\(safe-area-inset-bottom,0px\) \+ 14px \+ 48px \+ 10px\)\s*\}/.test(shellCss));
t('rule v422 nam trong media query <=768px, sau rule .gopy-fab',
  shellCss.indexOf('.gopy-fab{bottom:calc(60px') !== -1
  && shellCss.indexOf('.online-popup{bottom:calc(60px') > shellCss.indexOf('.gopy-fab{bottom:calc(60px'));
t('mobile-shell.css KHONG doi quy tac FAB (bottom 60+14 giu nguyen)',
  shellCss.includes('.gopy-fab{bottom:calc(60px + env(safe-area-inset-bottom,0px) + 14px)}'));
const v20 = fs.readFileSync(path.join(root, 'v20.css'), 'utf8');
t('v20.css KHONG doi: popup van bottom:84px o <=768px (trang khong tab)',
  v20.includes('.online-popup{top:auto;bottom:84px;transform:none}'));
for (const p of ['index.html', 'danh-sach-mau.html', 'danh-sach-shop.html', 'cong-dong/chat.html', 'trang-cua-toi.html']) {
  const html = fs.readFileSync(path.join(root, p), 'utf8');
  t(`${p}: mobile-shell.css load SAU v20.css`,
    html.indexOf('mobile-shell.css') > html.indexOf('v20.css') && html.indexOf('mobile-shell.css') !== -1);
}
t('bang-xep-hang.html (trang co FAB, khong tab) KHONG load mobile-shell.css',
  !fs.readFileSync(path.join(root, 'bang-xep-hang.html'), 'utf8').includes('mobile-shell.css')
  && fs.readFileSync(path.join(root, 'bang-xep-hang.html'), 'utf8').includes('gopyFab'));

// ---- (B/C) browser ----
const exe = fs.existsSync('/home/hatch/.cache/ms-playwright/chrome-linux64/chrome')
  ? '/home/hatch/.cache/ms-playwright/chrome-linux64/chrome'
  : '/home/hatch/.cache/ms-playwright/chromium-1254/chrome-linux64/chrome';
const raw = process.env.HTTPS_PROXY || '';
const u = new URL(raw);
const creds = { username: decodeURIComponent(u.username), password: decodeURIComponent(u.password) };
const port = 3129 + Math.floor(Math.random() * 100);
const socat = spawn('socat', [`TCP-LISTEN:${port},fork,bind=127.0.0.1`, 'TCP:[fd8b:4f84:7d32:99::1]:3128'], { stdio: 'ignore' });
await new Promise(r => setTimeout(r, 1500));

async function measure(page, url, inject) {
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await page.waitForTimeout(5000);
  if (inject) await page.addStyleTag({ content: shellCss });
  await page.waitForTimeout(300);
  return page.evaluate(() => {
    const pop = document.getElementById('onlinePopup');
    const fab = document.getElementById('gopyFab');
    if (!pop || !fab) return { found: false };
    const pr = pop.getBoundingClientRect(), fr = fab.getBoundingClientRect();
    const cs = getComputedStyle(pop);
    const overlap = !(pr.bottom < fr.top || pr.top > fr.bottom || pr.right < fr.left || pr.left > fr.right);
    const closeBtn = pop.querySelector('.online-popup-close');
    let closeCovered = null;
    if (closeBtn) {
      const cr = closeBtn.getBoundingClientRect();
      const el = document.elementFromPoint(cr.x + cr.width / 2, cr.y + cr.height / 2);
      closeCovered = !(el && (el === closeBtn || closeBtn.contains(el) || pop.contains(el)));
    }
    return {
      found: true, hidden: pop.hidden, popupBottom: cs.bottom,
      popupRect: pr.toJSON(), fabRect: fr.toJSON(),
      overlap, gap: fr.top - pr.bottom, closeCovered,
    };
  });
}

let browser;
try {
  browser = await chromium.launch({
    executablePath: exe,
    args: ['--no-sandbox', '--ignore-certificate-errors'],
    proxy: { server: `http://127.0.0.1:${port}`, ...creds },
  });
  const base = 'https://vieclamlivestream.online/';

  // (C) control: live chua fix — index 390x844 phai van chong
  {
    const ctx = await browser.newContext({
      viewport: { width: 390, height: 844 },
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
      isMobile: true, hasTouch: true, ignoreHTTPSErrors: true,
    });
    const page = await ctx.newPage();
    const m = await measure(page, base, false);
    t('doi chung: live (chua fix) index 390x844 van chong FAB/popup',
      m.found && m.overlap === true && m.popupBottom === '84px',
      JSON.stringify(m));
    await ctx.close();
  }

  // (B) voi fix: 3 trang co tab, 390x844
  for (const p of ['', 'danh-sach-mau.html', 'danh-sach-shop.html']) {
    const ctx = await browser.newContext({
      viewport: { width: 390, height: 844 },
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
      isMobile: true, hasTouch: true, ignoreHTTPSErrors: true,
    });
    const page = await ctx.newPage();
    const m = await measure(page, base + p, true);
    const label = p === '' ? 'index' : p;
    t(`fix: ${label} 390x844 khong chong, khe >=8px`,
      m.found && !m.hidden && m.overlap === false && m.gap >= 8,
      JSON.stringify(m));
    t(`fix: ${label} popup bottom tinh = 132px`,
      m.found && m.popupBottom === '132px', `bottom=${m.popupBottom}`);
    t(`fix: ${label} nut X popup khong bi FAB che`,
      m.found && m.closeCovered === false, `closeCovered=${m.closeCovered}`);
    await ctx.close();
  }

  // (B) trang co FAB nhung khong tab: KHONG inject — popup van 84px, khong chong
  {
    const ctx = await browser.newContext({
      viewport: { width: 390, height: 844 },
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
      isMobile: true, hasTouch: true, ignoreHTTPSErrors: true,
    });
    const page = await ctx.newPage();
    const m = await measure(page, base + 'bang-xep-hang.html', false);
    t('khong tab: bang-xep-hang 390x844 popup van bottom 84px, khong chong',
      m.found && m.popupBottom === '84px' && m.overlap === false,
      JSON.stringify(m));
    await ctx.close();
  }

  // (B) tablet 768x1024, voi fix: khong chong
  {
    const ctx = await browser.newContext({
      viewport: { width: 768, height: 1024 },
      userAgent: 'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
      isMobile: true, hasTouch: true, ignoreHTTPSErrors: true,
    });
    const page = await ctx.newPage();
    const m = await measure(page, base, true);
    t('fix: index 768x1024 khong chong',
      m.found && m.overlap === false, JSON.stringify(m));
    await ctx.close();
  }
} finally {
  if (browser) await browser.close();
  try { socat.kill(); } catch {}
}

console.log(`\n${pass} PASS, ${fail} FAIL`);
process.exit(fail ? 1 : 0);
