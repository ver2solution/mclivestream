// test-v448-lao-dong-tu-do-form.mjs — v448: Lao Dong Tu Do switch form = 2 trang danh sach
// (1) 7 tab them class list-switch (1 hang 4 nut, hang 2 xep gon trai, moi nut 25%)
// (2) xoa phu de mo ta hien thi dau trang (meta description SEO giu nguyen)
// (3) sw.js CACHE bump v448
import { readFileSync } from 'node:fs';

const dir = process.argv[2] || '.';
const html = readFileSync(`${dir}/lao-dong-tu-do.html`, 'utf8');
const sw = readFileSync(`${dir}/sw.js`, 'utf8');
let pass = 0, fail = 0;
function check(name, ok) { if (ok) { pass++; console.log('PASS', name); } else { fail++; console.log('FAIL', name); } }

// 1. Switch co class list-switch
check('switch co class list-switch', html.includes('<div class="uni-cat-switch list-switch" role="tablist"'));
// 2. Khong con switch thuong (khong list-switch)
check('khong con uni-cat-switch thuong', !html.includes('<div class="uni-cat-switch" role="tablist"'));
// 3. Du 7 nut tab
const tabs = (html.match(/class="uni-cat-btn fl-tab-btn/g) || []).length;
check('du 7 nut tab (got ' + tabs + ')', tabs === 7);
// 4. Phu de hien thi da xoa (khong con <p> mo ta)
check('khong con <p> phu de hien thi', !html.includes('<p>Việc làm lao động tự do khắp cả nước:'));
// 5. Meta description SEO van giu (khong xoa nham)
check('meta description SEO van giu', html.includes('<meta name="description" content="Việc làm lao động tự do khắp cả nước:'));
// 6. Tieu de + h2 tab dau tien van giu
check('h1 Lao động tự do van giu', html.includes('<h1>Lao động tự do</h1>'));
check('h2 tab dau tien van giu', html.includes('<h2 id="flTabTitle" style="margin-top:0">Sản xuất và nhà máy</h2>'));
// 7. sw.js CACHE v448
check('sw.js CACHE v448-lao-dong-tu-do-form-1', sw.includes("const CACHE = 'v448-lao-dong-tu-do-form-1';"));
// 8. Khong con marker xung dot THUC (dau dong, hoac '}' + marker — dang dong rac v423).
// Chu y: sw.js co comment ghi chu '>>>>>>>' trong dau nhay don (mo ta viec don v423) —
// do KHONG phai marker xung dot, chi kiem tra marker o dau dong.
const markerRe = /^>>>>>>>|^<<<<<<<|^}>>>>>>>|^}<<<<<<</m;
check('khong marker xung dot', !markerRe.test(html) && !markerRe.test(sw));

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
