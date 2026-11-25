// test-v435-user-menu-chat-link.mjs — v435 (#60): không tìm thấy Tin nhắn /
// Thông báo ở tài khoản thường.
// Gốc: menu tài khoản (buildUserMenu, js/app.js) chỉ có tên + số xu + Ví điểm
// + Quy tắc điểm + Đăng xuất — không có lối vào khung chat cộng đồng
// (cong-dong/chat.html chỉ link từ trang chủ + tab mobile). Fix: thêm link
// "Tin nhắn" vào menu (sau tên/xu, trước Ví điểm). "Thông báo" chưa có hệ
// thống nào để link nên không thêm link giả. js/app.js nằm trong SHELL
// precache nên bump CACHE.
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const APP = fs.readFileSync(path.join(ROOT, 'js/app.js'), 'utf8');
const SW = fs.readFileSync(path.join(ROOT, 'sw.js'), 'utf8');

let pass = 0, fail = 0;
function ok(name, cond, extra) {
  if (cond) { pass++; console.log('PASS ' + name); }
  else { fail++; console.log('FAIL ' + name + (extra ? ' — ' + extra : '')); }
}

// 1. Menu tài khoản có link "Tin nhắn" tới cong-dong/chat.html.
{
  const m = APP.match(/chatLink\.setAttribute\('href',\s*pathPrefix \+ 'cong-dong\/chat\.html'\)/);
  ok('1. menu co link Tin nhan -> cong-dong/chat.html', !!m);
  ok('1b. nhan link dung "Tin nhắn"', /chatLink\.textContent = 'Tin nhắn'/.test(APP));
}
// 2. Link nằm trong buildUserMenu, trước link Ví điểm (sau tên + số xu).
{
  const iChat = APP.indexOf("chatLink.textContent = 'Tin nhắn'");
  const iWallet = APP.indexOf("walletLink.textContent = 'Ví điểm'");
  const iBuild = APP.indexOf('function buildUserMenu()');
  ok('2. link Tin nhan trong buildUserMenu, truoc Vi diem', iBuild !== -1 && iBuild < iChat && iChat !== -1 && iChat < iWallet, 'build=' + iBuild + ' chat=' + iChat + ' wallet=' + iWallet);
}
// 3. Link dùng pathPrefix (đúng cả trang con bai-viet/*).
ok('3. link dung pathPrefix', /pathPrefix \+ 'cong-dong\/chat\.html'/.test(APP));
// 4. Không thêm link Thông báo giả (không có hệ thống thông báo).
ok('4. khong co link Thong bao gia trong menu', !/textContent = 'Thông báo'/.test(APP));
// 5. CACHE bump vì js/app.js nằm trong SHELL precache.
{
  const m = SW.match(/const CACHE = '([^']+)'/);
  ok('5. CACHE = v435-user-menu-chat-link-1', !!m && m[1] === 'v435-user-menu-chat-link-1', m ? m[1] : 'khong thay CACHE');
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
