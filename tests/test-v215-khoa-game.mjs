// test-v215-khoa-game.mjs — kiểm tra tĩnh gói v215 (tạm khoá Popup Game).
// Chạy: node tests/test-v215-khoa-game.mjs  (exit 0 = PASS)
import fs from 'node:fs';
const css = fs.readFileSync(new URL('../v20.css', import.meta.url), 'utf8');
const sw = fs.readFileSync(new URL('../sw.js', import.meta.url), 'utf8');
let pass = 0, fail = 0;
function check(name, ok, extra = '') {
  if (ok) { pass++; console.log('PASS ' + name + (extra ? ' — ' + extra : '')); }
  else { fail++; console.log('FAIL ' + name + (extra ? ' — ' + extra : '')); }
}
check('v20.css co khoi v215-khoa-game', css.includes('v215-khoa-game'));
check('v20.css an .game-entry bang display:none!important', css.includes('.game-entry{display:none!important}'));
check('v20.css khong xoa/sua luat cu (chi them o cuoi)', css.includes('.sr-end-card'));
check('sw.js CACHE = v215-shell-1', sw.includes("const CACHE = 'v215-shell-1'"));
check('sw.js SHELL co v20.css (de cache moi cap nhat)', sw.includes("'v20.css'"));
check('sw.js khong con CACHE v213', !sw.includes('v213-shell-1'));
console.log(`v215: ${pass}/${pass + fail} PASS`);
process.exit(fail ? 1 : 0);
