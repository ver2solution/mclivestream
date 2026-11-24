// test-v426-friendly-error-password.mjs — Glint VLL L5 hoi quy (khung chat
// 24/11/2026): dat MK moi loi server 2 lan, chi hien "Da co loi xay ra".
// Goc: friendlyError() khong dich cac loi GoTrue khi doi MK — MK trung MK
// cu / MK yeu / MK tung bi lo (breach) / link het han deu roi ve cau chung
// chung, nguoi dung khong biet sua gi. Fix: them 3 nhanh dich (trung MK cu,
// yeu/bi lo, link het han). Cac nhanh cu giu nguyen.
// Chay: node tests/test-v426-friendly-error-password.mjs (tu goc repo).
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let pass = 0, fail = 0;
function check(name, ok, extra) {
  if (ok) { pass++; console.log('PASS ' + name); }
  else { fail++; console.log('FAIL ' + name + (extra !== undefined ? ' — ' + extra : '')); }
}

const src = fs.readFileSync(path.join(root, 'mclivestream-supabase.js'), 'utf8');
const start = src.indexOf('var VIETNAMESE_RE');
const end = src.indexOf('// ---------- Hồ sơ', start);
check('trich duoc VIETNAMESE_RE + friendlyError', start !== -1 && end !== -1);
const sb = { console };
vm.createContext(sb);
vm.runInContext(src.slice(start, end) + '\nthis.__V = { friendlyError };', sb);
const friendlyError = sb.__V.friendlyError;

// 3 nhanh moi (v426).
check('MK trung MK cu -> bao doi MK khac',
  friendlyError({ message: 'New password should be different from the old password.' }) === 'Mật khẩu mới phải khác mật khẩu cũ.',
  'got ' + friendlyError({ message: 'New password should be different from the old password.' }));
check('MK tung bi lo (breach) -> bao chon MK manh hon',
  friendlyError({ message: 'Password has been found in a public data breach.' }) === 'Mật khẩu này quá yếu hoặc đã từng bị lộ, hãy chọn mật khẩu khác mạnh hơn.',
  'got ' + friendlyError({ message: 'Password has been found in a public data breach.' }));
check('MK qua pho bien (too common) -> bao chon MK manh hon',
  friendlyError({ message: 'Password is too common.' }) === 'Mật khẩu này quá yếu hoặc đã từng bị lộ, hãy chọn mật khẩu khác mạnh hơn.');
check('MK qua yeu (too weak) -> bao chon MK manh hon',
  friendlyError({ message: 'Password is too weak.' }) === 'Mật khẩu này quá yếu hoặc đã từng bị lộ, hãy chọn mật khẩu khác mạnh hơn.');
check('link het han (session expired) -> bao gui lai link',
  friendlyError({ message: 'session expired' }) === 'Link đặt lại đã hết hạn, hãy gửi lại link mới.');
check('phien recovery mat (auth session missing) -> bao gui lai link',
  friendlyError({ message: 'Auth session missing!' }) === 'Link đặt lại đã hết hạn, hãy gửi lại link mới.');
check('JWT khong hop le (invalid jwt) -> bao gui lai link',
  friendlyError({ message: 'invalid JWT' }) === 'Link đặt lại đã hết hạn, hãy gửi lại link mới.');

// Hoi quy: cac nhanh cu van dung.
check('MK ngan -> can it nhat 8 ky tu',
  friendlyError({ message: 'Password should be at least 8 characters.' }) === 'Mật khẩu cần ít nhất 8 ký tự.');
check('sai dang nhap -> email/MK chua dung',
  friendlyError({ message: 'Invalid login credentials' }) === 'Email hoặc mật khẩu chưa đúng.');
check('thong bao tieng Viet tu web giu nguyen',
  friendlyError({ message: 'Email này đã đăng ký.' }) === 'Email này đã đăng ký.');
check('loi la -> cau chung chung',
  friendlyError({ message: 'Something totally unknown 12345' }) === 'Đã có lỗi xảy ra, hãy thử lại sau.');

console.log('\n' + pass + ' PASS, ' + fail + ' FAIL');
process.exit(fail ? 1 : 0);
