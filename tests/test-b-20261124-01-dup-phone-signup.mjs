/* B-20261124-01 — Cảnh báo trùng SĐT rõ ràng trên form đăng ký.
   Node only, no browser. Behavioral: isDuplicatePhoneError +
   friendlyError trong mclivestream-supabase.js (chạy trong vm với
   supabase stub). Static: nhánh lỗi trong catch đăng ký của
   js/auth-ui.js + nguyên văn câu chữ §4 + event đo + luật cuộn. */
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let pass = 0, fail = 0;
function t(name, cond, extra = '') { if (cond) { pass++; console.log('PASS B-20261124-01:', name); } else { fail++; console.log('FAIL B-20261124-01:', name, extra); } }

const auth = fs.readFileSync(path.join(root, 'js/auth-ui.js'), 'utf8');
const apiSrc = fs.readFileSync(path.join(root, 'mclivestream-supabase.js'), 'utf8');
const dangky = fs.readFileSync(path.join(root, 'dang-ky.html'), 'utf8');
const css = fs.readFileSync(path.join(root, 'v20.css'), 'utf8');

const PHONE_MSG = 'SĐT này đã được đăng ký rồi. Nếu đây là SĐT của bạn, hãy đăng nhập hoặc lấy lại mật khẩu thay vì đăng ký mới.';
const FALLBACK = 'Đăng ký chưa thành công. Hãy kiểm tra lại thông tin rồi thử lại, hoặc nhắn Zalo 032 998 3699 nếu vẫn không được.';
const FIELD_ERR = 'SĐT này đã được dùng để đăng ký. Nếu đây là SĐT của bạn, hãy đăng nhập thay vì đăng ký mới.';

// ---- Behavioral: nạp mclivestream-supabase.js trong vm ----
const sandbox = {
  window: {
    MCLIVESTREAM_SUPABASE_CONFIG: { url: 'https://example.supabase.co', anonKey: 'anon-key' },
    supabase: { createClient: function () { return {}; } }
  },
  module: { exports: {} },
  console
};
vm.createContext(sandbox);
vm.runInContext(apiSrc, sandbox);
const API = sandbox.window.McLivestreamAPI;
t('API load được trong vm (đã cấu hình giả)', !!API && typeof API.friendlyError === 'function');
t('isDuplicatePhoneError được export', !!API && typeof API.isDuplicatePhoneError === 'function');

if (API && typeof API.isDuplicatePhoneError === 'function') {
  const isDup = API.isDuplicatePhoneError;
  t('nhận diện: "Phone number already registered"', isDup({ message: 'Phone number already registered' }));
  t('nhận diện: duplicate key trên ràng buộc phone', isDup({ message: 'duplicate key value violates unique constraint "profiles_phone_zalo_key"' }));
  t('nhận diện: mã 23505 + ràng buộc phone', isDup({ code: '23505', message: 'duplicate key value violates unique constraint "users_phone_key"' }));
  t('nhận diện: thông điệp tiếng Việt "số điện thoại ... đã"', isDup({ message: 'Số điện thoại này đã được đăng ký' }));
  t('nhận diện: chuỗi lỗi dạng string', isDup('phone already exists'));
  t('KHÔNG nhận diện: trùng email "User already registered"', !isDup({ message: 'User already registered' }));
  t('KHÔNG nhận diện: 23505 trên ràng buộc khác (job post)', !isDup({ code: '23505', message: 'duplicate key value violates unique constraint "job_posts_pkey"' }));
  t('KHÔNG nhận diện: lỗi mạng', !isDup({ message: 'Failed to fetch' }));
  t('KHÔNG nhận diện: "Số điện thoại chưa đúng định dạng" (có "số điện thoại" nhưng không có "đã")', !isDup({ message: 'Số điện thoại chưa đúng định dạng' }));
  t('KHÔNG nhận diện: null / {} / chuỗi rỗng', !isDup(null) && !isDup({}) && !isDup(''));
}

if (API && typeof API.friendlyError === 'function') {
  const f = API.friendlyError;
  const phoneErr = { message: 'Phone number already registered' };
  t('friendlyError: lỗi trùng SĐT + context signup → câu §4 (không link, không lộ tài khoản khác)', f(phoneErr, 'signup') === PHONE_MSG, f(phoneErr, 'signup'));
  t('friendlyError: lỗi trùng SĐT KHÔNG context → giữ hành vi cũ (câu chung), không lọt câu đăng ký sang form khác', f(phoneErr) === 'Đã có lỗi xảy ra, hãy thử lại sau.', f(phoneErr));
  t('friendlyError: trùng SĐT thắng nhánh 23505 ngay cả với context signup', f({ code: '23505', message: 'duplicate key "users_phone_key"' }, 'signup') === PHONE_MSG);
  t('friendlyError: 23505 + signup (không phải SĐT) → câu dự phòng §4, KHÔNG còn "Nội dung này đã được gửi rồi."', f({ code: '23505', message: 'duplicate key value violates unique constraint "job_posts_pkey"' }, 'signup') === FALLBACK);
  t('friendlyError: 23505 + review KHÔNG đổi', f({ code: '23505', message: 'duplicate key' }, 'review') === 'Bạn đã đánh giá hồ sơ này rồi.');
  t('friendlyError: 23505 + jobpost KHÔNG đổi', f({ code: '23505', message: 'duplicate key' }, 'jobpost') === 'Tin này đã được gửi, hãy xem mục tin của tôi.');
  t('friendlyError: 23505 không context KHÔNG đổi', f({ code: '23505', message: 'duplicate key' }) === 'Nội dung này đã được gửi rồi.');
  t('friendlyError: trùng email KHÔNG đổi', f({ message: 'User already registered' }) === 'Email này đã đăng ký. Hãy đăng nhập hoặc dùng chức năng quên mật khẩu.');
  t('friendlyError: lỗi mạng KHÔNG đổi', f({ message: 'Failed to fetch' }) === 'Không kết nối được mạng, hãy kiểm tra lại kết nối rồi thử lại.');
}

// ---- Static: nhánh lỗi trong catch đăng ký (js/auth-ui.js) ----
const catchIdx = auth.indexOf('} catch (err) {', auth.indexOf("guardSubmit(su, async function ()"));
const catchBlock = auth.slice(catchIdx, catchIdx + 3000);
t('catch đăng ký: thứ tự nhánh email → trùng SĐT → chung',
  catchBlock.indexOf('isAlreadyRegistered(err)') !== -1 &&
  catchBlock.indexOf('isDupPhoneError(err)') !== -1 &&
  catchBlock.indexOf("friendly(err, 'signup')") !== -1 &&
  catchBlock.indexOf('isAlreadyRegistered(err)') < catchBlock.indexOf('isDupPhoneError(err)') &&
  catchBlock.indexOf('isDupPhoneError(err)') < catchBlock.indexOf("friendly(err, 'signup')"),
  'catch block: ' + catchBlock.slice(0, 120).replace(/\n/g, ' '));
t('catch đăng ký: KHÔNG còn dòng cũ "Đăng ký chưa thành công: " + friendly(err) không context',
  !auth.includes("msg('Đăng ký chưa thành công: ' + friendly(err), 'err')"));
t('trạng thái A: lỗi đỏ dưới ô SĐT đúng nguyên văn §4',
  auth.includes("setFieldError(cfg.inputs.signupPhone, '" + FIELD_ERR + "')"));
t('trạng thái A: hộp đỏ đúng câu §4 + đủ 2 link Đăng nhập / Lấy lại mật khẩu',
  auth.includes('SĐT này đã được đăng ký rồi. Nếu đây là SĐT của bạn, hãy ') &&
  auth.includes('data-track="dang-nhap-loi-trung-sdt"') &&
  auth.includes('data-track="lay-lai-mat-khau-loi-trung-sdt"'));
t('trạng thái A: link "Lấy lại mật khẩu" KHÔNG kèm ?email= (thiết kế §4)',
  (() => {
    const i = catchBlock.indexOf('isDupPhoneError(err)');
    if (i === -1) return false;
    const seg = catchBlock.slice(i, catchBlock.indexOf('trackDupPhoneError()', i));
    return seg.includes('dat-lai-mat-khau.html') && !seg.includes('?email=');
  })());
t('trạng thái A: bắn event dang-ky-trung-sdt qua V2SAnalytics.record',
  auth.includes("A.record('click', 'dang-ky-trung-sdt', null, null, null)"));
t('trạng thái A: có gọi cuộn tới ô SĐT sau khi hiện lỗi',
  catchBlock.includes('scrollToPhoneFieldIfNeeded()'));
t('luật cuộn (§6.6): đúng 1 scrollIntoView, block nearest, có kiểm tra viewport, không smooth',
  (auth.match(/scrollIntoView/g) || []).length === 1 &&
  auth.includes("scrollIntoView({ block: 'nearest' })") &&
  auth.includes('getBoundingClientRect()') &&
  !/scrollIntoView\([^)]*smooth/.test(auth));
t('quy tắc C: câu chung dự phòng §4 hiện khi lỗi không nhận diện được',
  auth.includes("msg('" + FALLBACK + "', 'err')"));
t('hộp vàng B giữ nguyên văn v166', auth.includes('SĐT này đã có tài khoản — nếu đây là SĐT của bạn, hãy '));
t('nhánh trùng email giữ nguyên (hộp đỏ + link lấy lại mật khẩu kèm ?email=)',
  auth.includes('Email này đã được đăng ký. Bạn có muốn lấy lại mật khẩu không?'));
t('guardSubmit KHÔNG đổi (nút mở lại sau lỗi nhờ done())', auth.includes("btn.textContent = 'Đang xử lý…'") && auth.includes('form.__v2sInFlight = false'));
t('KHÔNG dùng window.confirm / window.prompt (v217)', !/window\.confirm|window\.prompt/.test(auth) && !/window\.confirm|window\.prompt/.test(apiSrc));
t('friendlyError có nhánh trùng SĐT (chỉ context signup) TRƯỚC nhánh 23505 chung',
  apiSrc.indexOf("context === 'signup' && isDuplicatePhoneError(err)") !== -1 &&
  apiSrc.indexOf("context === 'signup' && isDuplicatePhoneError(err)") < apiSrc.indexOf("else if (code === '23505'"));
t('friendlyError có nhánh signup cho 23505', apiSrc.includes("else if (context === 'signup') out = '" + FALLBACK + "';"));

// ---- Static: hạ tầng sẵn có KHÔNG đổi ----
t('dang-ky.html: còn đủ #authMsg, #err-authSuPhone, #authSuPhone (không cần đổi HTML)',
  dangky.includes('id="authMsg"') && dangky.includes('id="err-authSuPhone"') && dangky.includes('id="authSuPhone"'));
t('dang-ky.html: form + nút giữ data-track hiện có', dangky.includes('data-track="form-dang-ky"') && dangky.includes('data-track="nut-dang-ky"'));
t('v20.css: còn đủ .auth-msg.err + .field-err + .auth-phone-warn + .invalid (không cần CSS mới)',
  css.includes('.auth-msg.err') && css.includes('.field-err') && css.includes('.auth-phone-warn') && css.includes('input.invalid'));

console.log(`\n${pass} PASS, ${fail} FAIL`);
process.exit(fail ? 1 : 0);
