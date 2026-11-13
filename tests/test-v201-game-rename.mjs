/* Test v201 — P4: Popup game đổi tên "Game Nông Trại" → "Chuyển Sinh Thế Giới Mới"
   (Rion chốt 13:33 ngày 13/11/2026; P4 trong nhóm bug khung chat).
   - 244 file HTML: tên mới + href mới https://truyenthuaphatphap.online/nong-trai.html
   - Giữ nguyên: id="gameEntry", class="game-entry", data-track="game-nong-trai",
     icon 🌾, mô tả "Chơi game kiếm Xu · gieo lúa, nuôi gà, thu hoạch".
   - HTML-only, KHÔNG bump CACHE (sw.js vẫn v200-shell-1, như v194/v199b).
   - Không còn chuỗi cũ nào trong toàn bộ *.html.
   Node only, no browser. Chạy: node tests/test-v201-game-rename.mjs */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let pass = 0, fail = 0;
function t(name, cond, extra = '') {
  if (cond) { pass++; console.log('PASS v201:', name); }
  else { fail++; console.log('FAIL v201:', name, extra); }
}

function listHtml(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name === 'node_modules') continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) listHtml(p, out);
    else if (e.name.endsWith('.html')) out.push(p);
  }
  return out;
}

const NEW_SNIPPET = '<a class="game-entry" id="gameEntry" href="https://truyenthuaphatphap.online/nong-trai.html" data-track="game-nong-trai"><span class="game-entry-ic" aria-hidden="true">🌾</span><span>Chuyển Sinh Thế Giới Mới<small>Chơi game kiếm Xu · gieo lúa, nuôi gà, thu hoạch</small></span></a>';

const files = listHtml(root);
t('tổng số file HTML trong prep', files.length >= 244, `thấy ${files.length}`);

let withEntry = 0, withOldName = 0, withOldHref = 0, badSnippet = [];
const noEntry = [];
for (const f of files) {
  const s = fs.readFileSync(f, 'utf8');
  const hasNew = s.includes('Chuyển Sinh Thế Giới Mới');
  const hasOldName = s.includes('Game Nông Trại');
  const hasOldHref = s.includes('phatphaponline.pages.dev/nong-trai');
  const hasNewHref = s.includes('truyenthuaphatphap.online/nong-trai.html');
  const entryCount = (s.match(/id="gameEntry"/g) || []).length;
  if (hasOldName) withOldName++;
  if (hasOldHref) withOldHref++;
  if (entryCount === 0) { noEntry.push(path.relative(root, f)); continue; }
  withEntry++;
  if (entryCount !== 1) badSnippet.push(`${path.relative(root, f)}: ${entryCount} gameEntry`);
  if (!hasNew || !hasNewHref || !s.includes(NEW_SNIPPET)) badSnippet.push(`${path.relative(root, f)}: snippet không khớp nguyên văn`);
  if (!s.includes('data-track="game-nong-trai"')) badSnippet.push(`${path.relative(root, f)}: mất data-track`);
  if (!s.includes('Chơi game kiếm Xu · gieo lúa, nuôi gà, thu hoạch')) badSnippet.push(`${path.relative(root, f)}: mất mô tả gốc`);
}

t('đúng 244 file có popup game-entry (id="gameEntry")', withEntry === 244, `thấy ${withEntry}`);
t('0 file còn tên cũ "Game Nông Trại"', withOldName === 0, `còn ${withOldName} file`);
t('0 file còn href cũ phatphaponline.pages.dev/nong-trai', withOldHref === 0, `còn ${withOldHref} file`);
t('244/244 file có snippet mới nguyên văn (tên + href + icon + mô tả + data-track)', badSnippet.length === 0, badSnippet.slice(0, 5).join(' | '));
t('file không có game-entry chỉ là trang không popup (quan-tri + trang hệ thống)', noEntry.length === files.length - 244, noEntry.join(', '));

/* Hồi quy: nav + CACHE không đổi (gói HTML-only, không bump CACHE). */
const sw = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');
t("sw.js CACHE = v205-shell-1 (v205 bump CACHE)", sw.includes("const CACHE = 'v205-shell-1'") && !sw.includes('v201-shell'));
const index = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const navLabels = ['Trang chủ', 'Dành cho Mẫu', 'Dành cho Shop', 'Thanh lý Kiot', 'Tin tức', 'Hỏi đáp', 'Đăng ký'];
t('index.html nav vẫn đủ 7 nhãn (không đụng menu)', navLabels.every((l) => index.includes(l)), navLabels.filter((l) => !index.includes(l)).join(', '));

console.log(`\n=== v201: ${pass} PASS / ${fail} FAIL ===`);
process.exit(fail ? 1 : 0);
