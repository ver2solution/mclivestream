// test-v429-game-entry-remove.mjs — Nut game tren trang chu dan toi 404
// (Glint VLL #74, khung chat 24/11/2026): nut noi "Chuyen Sinh The Gioi
// Moi" tren trang chu tro toi https://truyenthuaphatphap.online/nong-trai.html
// — URL nay 404 (kiem browser.open 23:4x 24/11). Game chi co 2 origin TEST
// (test.openworld-game.online + de0765ec.chuyen-sinh-test-v2.pages.dev,
// SHA 0e03647, art v6-d2) da bi Owner VISUAL NO-GO + QA NO-GO 2 lan —
// KHONG co ban choi cong khai de tro nut toi. Fix: go nut game-entry +
// khoi CSS v116 khoi index.html; khi game co ban cong khai thi them lai
// nut voi URL that. PHAM VI GOI NAY: chi index.html (nut cung co mat tren
// 662 file HTML khac — can goi ZIP rieng, ghi trong triage).
// Chay: node tests/test-v429-game-entry-remove.mjs (tu goc repo).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let pass = 0, fail = 0;
function check(name, ok, extra) {
  if (ok) { pass++; console.log('PASS ' + name); }
  else { fail++; console.log('FAIL ' + name + (extra !== undefined ? ' — ' + extra : '')); }
}

const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
check('index.html khong con link nong-trai.html', !html.includes('nong-trai.html'));
check('index.html khong con nut game-entry', !html.includes('game-entry') && !html.includes('gameEntry'));
check('index.html khong con khoi CSS v116', !html.includes('v116-game-entry'));
check('popup online van con (khong xoa lan)', html.includes('id="onlinePopup"'));
check('khoi Lich sale van con (khong xoa lan)', html.includes('id="saleCalendar"'));
check('hero van con', html.includes('<section class="hero">'));

const sw = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');
check('sw.js CACHE da doi so v429', sw.includes("const CACHE = 'v429-game-entry-remove-1'"));

console.log('\n' + pass + ' PASS, ' + fail + ' FAIL');
process.exit(fail ? 1 : 0);
