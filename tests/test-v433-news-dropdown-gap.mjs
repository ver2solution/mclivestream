// test-v433-news-dropdown-gap.mjs — v433 (#64): menu con Tin tức tự đóng,
// không bấm được tiểu mục.
// Gốc: panel đặt top:calc(100% + 6px) nên có dải trống 6px ngoài vùng hover
// của .nav-news-wrap; rê chuột từ link "Tin tức" xuống panel đi qua dải
// trống thì :hover mất, panel tự đóng trước khi tới được tiểu mục.
// Fix: ::before trong suốt phủ đúng dải 6px, giữ hover liền mạch; chỉ
// desktop (mobile panel là position:static, không có khe hở). v20.css nằm
// trong SHELL precache nên bump CACHE.
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CSS = fs.readFileSync(path.join(ROOT, 'v20.css'), 'utf8');
const SW = fs.readFileSync(path.join(ROOT, 'sw.js'), 'utf8');

let pass = 0, fail = 0;
function ok(name, cond, extra) {
  if (cond) { pass++; console.log('PASS ' + name); }
  else { fail++; console.log('FAIL ' + name + (extra ? ' — ' + extra : '')); }
}

// 1. Có cầu hover ::before phủ đúng dải 6px (top:-6px, height:6px).
const bridge = CSS.match(/\.nav-news-dropdown::before\s*\{[^}]*\}/);
ok('1. co cau hover ::before cho dropdown', !!bridge, bridge ? bridge[0] : 'khong thay rule');
ok('1b. cau phu dung dai 6px (top:-6px, height:6px)',
  !!bridge && /top:\s*-6px/.test(bridge[0]) && /height:\s*6px/.test(bridge[0]),
  bridge ? bridge[0] : '');

// 2. Cầu chỉ áp dụng desktop: rule nằm SAU @media(min-width:1201px).
{
  const mq = CSS.indexOf('@media(min-width:1201px)');
  const br = CSS.indexOf('.nav-news-dropdown::before');
  ok('2. cau chi ap dung desktop (sau @media min-width:1201px)', mq !== -1 && br > mq, 'mq=' + mq + ' br=' + br);
}

// 3. Khoảng cách nhìn thấy giữ nguyên: panel vẫn top:calc(100% + 6px).
ok('3. panel van cach 6px (top:calc(100% + 6px))', /\.nav-news-dropdown\s*\{[^}]*top:\s*calc\(100% \+ 6px\)/.test(CSS));

// 4. Luật hover mở panel còn nguyên.
ok('4. luat hover mo panel con nguyen', CSS.includes('.nav-news-wrap:hover .nav-news-dropdown'));

// 5. Mobile không đổi: panel static trong @media(max-width:1200px).
ok('5. mobile panel van static', /\.main-nav\.open \.nav-news-dropdown\s*\{[^}]*position:\s*static/.test(CSS));

// 6. CACHE bump vì v20.css nằm trong SHELL precache.
{
  const m = SW.match(/const CACHE = '([^']+)'/);
  ok('6. CACHE = v433-news-dropdown-gap-1', !!m && m[1] === 'v433-news-dropdown-gap-1', m ? m[1] : 'khong thay CACHE');
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
