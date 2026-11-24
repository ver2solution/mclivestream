// test-v430-auth-timeout.mjs — v430 (#66): nút kẹt "Đang xử lý…" khi mạng treo.
// Gốc: guardSubmit mở khóa đúng trên mọi đường đã settle, nhưng 4 lời gọi
// mạng auth (signUp/signIn/resetPassword/signOut) không có timeout —
// promise treo thì done() không bao giờ chạy. Fix: withAuthTimeout race
// 20s, hết timeout ném "Mạng chậm, hãy thử lại sau." → handler catch →
// nút mở lại.
import fs from 'node:fs';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = fs.readFileSync(path.join(ROOT, 'js', 'auth-ui.js'), 'utf8');

let pass = 0, fail = 0;
function ok(name, cond, extra) {
  if (cond) { pass++; console.log('PASS ' + name); }
  else { fail++; console.log('FAIL ' + name + (extra ? ' — ' + extra : '')); }
}

// Cắt 1 hàm theo tên bằng cách đếm ngoặc nhọn từ dòng khai báo.
function extractFn(src, decl) {
  const i = src.indexOf(decl);
  if (i < 0) throw new Error('khong thay ' + decl);
  let j = src.indexOf('{', i), depth = 0;
  for (; j < src.length; j++) {
    if (src[j] === '{') depth++;
    else if (src[j] === '}') { depth--; if (depth === 0) return src.slice(i, j + 1); }
  }
  throw new Error('khong dong ngoac ' + decl);
}

const helperSrc = extractFn(SRC, 'function withAuthTimeout(promise)');
const guardSrc = extractFn(SRC, 'function guardSubmit(form, fn)');

// Sandbox: timeout rút ngắn còn 50ms để test chạy nhanh.
const sandbox = { console, setTimeout, Promise, Error, AUTH_TIMEOUT_MS: 50 };
sandbox.window = sandbox;
vm.createContext(sandbox);
vm.runInContext(helperSrc + '\n' + guardSrc + '\nthis.__V = { withAuthTimeout, guardSubmit };', sandbox);
const { withAuthTimeout, guardSubmit } = sandbox.__V;

// 1. Promise xong nhanh → trả đúng giá trị.
{
  const v = await withAuthTimeout(Promise.resolve('OK'));
  ok('1. withAuthTimeout tra gia tri khi xong nhanh', v === 'OK');
}

// 2. Promise treo → hết timeout ném lỗi thân thiện.
{
  let err = null;
  try { await withAuthTimeout(new Promise(function () {})); } catch (e) { err = e; }
  ok('2. withAuthTimeout nem loi khi treo', err instanceof Error && /Mạng chậm/.test(err.message), err && err.message);
}

// 3. guardSubmit: fn treo (qua withAuthTimeout) → nút mở lại sau timeout.
{
  const btn = { disabled: false, textContent: 'Đăng nhập' };
  const form = { __v2sInFlight: false, querySelector: function () { return btn; } };
  let caught = null;
  const p = guardSubmit(form, async function () {
    try { await withAuthTimeout(new Promise(function () {})); }
    catch (e) { caught = e; throw e; }
  });
  ok('3a. nut khoa ngay khi submit', btn.disabled === true && btn.textContent === 'Đang xử lý…');
  await p.catch(function () {});
  ok('3b. nut mo lai sau timeout', btn.disabled === false && btn.textContent === 'Đăng nhập', JSON.stringify(btn));
  ok('3c. co inFlight ha xuong', form.__v2sInFlight === false);
  ok('3d. loi timeout toi duoc handler', caught && /Mạng chậm/.test(caught.message));
}

// 4. Hồi quy: fn xong nhanh → nút mở lại như cũ.
{
  const btn = { disabled: false, textContent: 'Gửi link' };
  const form = { __v2sInFlight: false, querySelector: function () { return btn; } };
  await guardSubmit(form, async function () { await withAuthTimeout(Promise.resolve(1)); });
  ok('4. nut mo lai khi xong nhanh', btn.disabled === false && btn.textContent === 'Gửi link');
}

// 5. Cả 4 điểm gọi auth đều bọc withAuthTimeout + timeout 20s trên live.
ok('5a. signUp boc timeout', SRC.includes('withAuthTimeout(api().signUp({'));
ok('5b. signIn boc timeout', SRC.includes('withAuthTimeout(api().signIn({'));
ok('5c. resetPassword boc timeout', SRC.includes('withAuthTimeout(api().resetPassword(email))'));
ok('5d. signOut boc timeout', SRC.includes('withAuthTimeout(api().signOut())'));
ok('5e. AUTH_TIMEOUT_MS = 20000', /var AUTH_TIMEOUT_MS = 20000;/.test(SRC));
// 5f: bỏ comment rồi mới kiểm (comment ở handler đăng xuất vẫn nhắc tên cũ).
const noComments = SRC.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^[ \t]*\/\/.*$/gm, '');
ok('5f. khong con await api().signUp/signIn/resetPassword/signOut tran', !/await api\(\)\.(signUp|signIn|resetPassword|signOut)\(/.test(noComments));

console.log('\n' + pass + '/' + (pass + fail) + ' PASS');
process.exit(fail ? 1 : 0);
