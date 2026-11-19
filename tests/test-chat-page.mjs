// test-chat-page.mjs — v360: Trang chat cong dong day du /cong-dong/chat (V4 PR-04)
// + sua 404.html duong dan tuyet doi. Chay: node tests/test-chat-page.mjs
// Tu repo root. Khong phu thuoc mang.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let pass = 0, fail = 0;
function ok(cond, label) {
  if (cond) { pass++; console.log('PASS ' + label); }
  else { fail++; console.log('FAIL ' + label); }
}
function read(p) { return fs.readFileSync(path.join(root, p), 'utf8'); }

const chat = read('cong-dong/chat.html');
ok(fs.existsSync(path.join(root, 'cong-dong/chat.html')), 'cong-dong/chat.html ton tai');
ok(chat.includes('noindex,nofollow'), 'chat.html co meta noindex,nofollow (chat rieng tu khong index)');
ok(chat.includes('Tham gia cộng đồng Livestream Việt Nam'), 'loi moi: tieu de dung nguyen van Owner');
ok(chat.includes('Đăng ký miễn phí để trò chuyện với chủ shop, MC, idol, KOC và hàng nghìn thành viên trong cộng đồng. Tìm việc làm, chia sẻ kinh nghiệm và kết nối cơ hội kinh doanh.'), 'loi moi: mo ta dung nguyen van Owner');
ok(chat.includes('ĐĂNG KÝ MIỄN PHÍ') && chat.includes('ĐÃ CÓ TÀI KHOẢN? ĐĂNG NHẬP'), 'loi moi: du 2 nut');
ok(chat.includes('dang-nhap.html?next=/cong-dong/chat'), 'dang nhap xong ve dung phong chat (?next=/cong-dong/chat)');
ok(chat.includes('/js/chat-page.js'), 'chat.html nap js/chat-page.js');
ok(!chat.includes('chat-bots.js') && !chat.includes('js/data.js') && !chat.includes('community-chat.js') && !chat.includes('bot-topics.js'), 'chat.html KHONG nap bot/data.js/khung chat trang chu (chi tin that)');
const relChat = [...chat.matchAll(/(?:href|src)="([^"#:][^"]*)"/g)].map((m) => m[1]).filter((u) => !u.startsWith('http') && !u.startsWith('/') && !u.startsWith('data:'));
ok(relChat.length === 0, 'chat.html: moi duong dan noi bo deu tuyet doi (con tuong doi: ' + relChat.join(', ') + ')');

const js = read('js/chat-page.js');
ok(js.includes('get_home_chat_messages') && js.includes('post_home_chat_message') && js.includes('get_home_chat_top'), 'chat-page.js dung RPC chat V4 hien co');
ok(js.includes("'chat-tong'"), 'chat-page.js mo phong Chat tong');
ok(!js.includes('V2SChatBots'), 'chat-page.js KHONG dung bot (chi tin that tu DB)');
ok(js.includes('get_home_chat_messages') && js.includes('p_offset'), 'chat-page.js co phan trang (p_offset)');

const nf = read('404.html');
ok(nf.includes('href="/v20.css"') && nf.includes('href="/favicon.png"'), '404.html: CSS + favicon duong dan tuyet doi');
const rel404 = [...nf.matchAll(/href="([^"#:][^"]*)"/g)].map((m) => m[1]).filter((u) => !u.startsWith('http') && !u.startsWith('/'));
ok(rel404.length === 0, '404.html: khong con href tuong doi (con: ' + rel404.join(', ') + ')');
ok(nf.includes('/bai-viet/') && nf.includes('location.replace'), '404.html: giu logic chuyen huong /bai/ cua v267');

const css = read('v20.css');
ok(css.includes('.chat-page{') && css.includes('.chat-guest-invite') && css.includes('.chat-room-item') && css.includes('.chat-page-composer'), 'v20.css co CSS trang chat day du');
ok(css.includes('[hidden]{display:none!important}'), 'v20.css co [hidden]{display:none!important} (display:grid/flex thang [hidden] mac dinh)');
ok(css.includes('@media (max-width:720px)') && css.includes('.chat-page.room-open'), 'v20.css co responsive mobile (danh sach phong / hoi thoai)');

const sw = read('sw.js');
ok(sw.includes('v361-shell-1'), 'sw.js CACHE v361-shell-1');

const login = read('dang-nhap.html');
ok(!login.includes("v.charAt(0) === '/'"), 'dang-nhap.html: safeNext KHONG loai duong dan tuyet doi bat dau / (loi v360)');
ok(login.includes("v.indexOf('//') === 0"), 'dang-nhap.html: safeNext VAN chan // (protocol-relative)');

ok(chat.includes('/js/reward.js'), 'chat.html nap js/reward.js (lay so xu cho chip header)');
ok(js.includes('syncHeader') && js.includes("'/trang-cua-toi.html'"), 'chat-page.js dong bo chip header (ten + xu, bam vao mo Trang cua toi)');

console.log(`\n${pass} PASS, ${fail} FAIL`);
process.exit(fail ? 1 : 0);
