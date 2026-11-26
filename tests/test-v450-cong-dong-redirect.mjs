// test-v450-cong-dong-redirect.mjs — v450 (26/11/2026): #46/B-20261126-03
// /cong-dong.html 404 vi repo khong co file nay (chi co cong-dong/chat.html).
// Go i v450: file chuyen huong moi cong-dong.html -> /cong-dong/chat.html
// (theo mau stub bai-viet) + sw.js bump CACHE.
// Chay: node tests/test-v450-cong-dong-redirect.mjs  (tu thu muc stage hoac repo)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
let pass = 0, fail = 0;
function check(name, ok, extra = '') {
  if (ok) { pass++; console.log('PASS  ' + name); }
  else { fail++; console.log('FAIL  ' + name + (extra ? ' — ' + extra : '')); }
}
function read(p) { try { return fs.readFileSync(path.join(root, p), 'utf8'); } catch { return null; } }

// 1. File chuyen huong ton tai va dung dich
const html = read('cong-dong.html');
check('1. cong-dong.html ton tai', html !== null);
check('2. meta refresh ve /cong-dong/chat.html',
  !!html && html.includes('<meta http-equiv="refresh" content="0; url=https://vieclamlivestream.online/cong-dong/chat.html">'));
check('3. canonical ve /cong-dong/chat.html',
  !!html && html.includes('<link rel="canonical" href="https://vieclamlivestream.online/cong-dong/chat.html">'));
check('4. robots noindex (trang chuyen huong khong len index)',
  !!html && html.includes('<meta name="robots" content="noindex">'));
check('5. link bam tay ve /cong-dong/chat.html',
  !!html && html.includes('<a href="https://vieclamlivestream.online/cong-dong/chat.html">'));
check('6. comment version v450 co trong file',
  !!html && html.includes('v450') && html.includes('#46/B-20261126-03'));
check('7. khong co duong dan sai (khong tro ve /cong-dong.html chinh no)',
  !!html && !html.includes('url=https://vieclamlivestream.online/cong-dong.html"'));

// 2. sw.js bump CACHE
const sw = read('sw.js');
check('8. sw.js ton tai', sw !== null);
check('9. CACHE = v450-cong-dong-redirect-1',
  !!sw && sw.includes("const CACHE = 'v450-cong-dong-redirect-1';"));
check('10. khong con CACHE cu v449',
  !!sw && !sw.includes("'v449-filter-tab-apply-1'"));
check('11. comment v450 co trong sw.js',
  !!sw && sw.includes('v450 (26/11/2026)'));

console.log(`\n${pass} PASS, ${fail} FAIL`);
process.exit(fail ? 1 : 0);
