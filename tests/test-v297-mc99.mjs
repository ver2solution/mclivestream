// test-v297-mc99.mjs — MC-99 (P1): form bình luận KHÔNG được lộ email.
// Gốc: submitComment + ô "Tên hiển thị" (v244) đều fallback sang user.email
// khi metadata không có display_name/full_name.
// Fix v297: tên chỉ lấy từ metadata (display_name/full_name/name) →
// profiles.full_name (fetchMyProfile, cùng nguồn header) → "Khách Vãng Lai";
// tên chứa '@' (email gõ tay) bị sanitize bỏ. Email không bao giờ thành tên.
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
// File sửa: đường dẫn truyền qua argv[2], mặc định js/comments.js cạnh tests/.
const TARGET = process.argv[2] || new URL('../js/comments.js', import.meta.url).pathname;

let pass = 0, fail = 0;
function check(name, cond, extra) {
  if (cond) { pass++; console.log('PASS  ' + name); }
  else { fail++; console.log('FAIL  ' + name + (extra ? ' — ' + extra : '')); }
}

// ---- Stub Supabase API / Auth / Reward ------------------------------------
function makeChain() {
  const chain = { error: null, data: [] };
  for (const m of ['select', 'eq', 'is', 'order', 'limit']) chain[m] = () => chain;
  chain.then = (res) => res({ error: null, data: [] });
  return chain;
}
function makeEnv({ user, profile, profileThrows = false }) {
  let rpcParams = null;
  let fetchProfileCalls = 0;
  const api = {
    getSession: async () => (user ? { user } : null),
    fetchMyProfile: async () => {
      fetchProfileCalls++;
      if (profileThrows) throw new Error('profiles 500');
      return profile;
    },
    client: {
      rpc: async (_name, params) => { rpcParams = params; return { error: null }; },
      from: () => makeChain(),
    },
  };
  global.window = {
    McLivestreamAPI: api,
    V2SAuthUI: undefined,
    Ver2Reward: { validateComment: () => null },
  };
  return { api, getRpc: () => rpcParams, getFetchCalls: () => fetchProfileCalls };
}
function fakeEl() {
  const stub = { addEventListener() {}, innerHTML: '', querySelector: () => stub, value: '' };
  return { innerHTML: '', querySelector: () => stub };
}
const LAN_ANH = { id: 'u-lananh', email: 'ybkcetx@mailto.plus', user_metadata: {} };
const PROFILE_LAN_ANH = { full_name: 'Nguyễn Thị Lan Anh' };

const C = require(TARGET);

// 1. Tái hiện MC-99: Lan Anh, metadata trống, hồ sơ có tên → tên hồ sơ, không email.
{
  const env = makeEnv({ user: LAN_ANH, profile: PROFILE_LAN_ANH });
  const out = await C.submitComment('article', 'bai-test', 'Bình luận đủ hai mươi ký tự trở lên nhé.', '');
  check('1 submit: tên hồ sơ thay email', out.ok && env.getRpc().p_commenter_name === 'Nguyễn Thị Lan Anh',
    JSON.stringify(env.getRpc()));
}
// 2. Không có tên ở đâu (metadata trống, hồ sơ null) → "Khách Vãng Lai", KHÔNG email.
{
  const env = makeEnv({ user: LAN_ANH, profile: null });
  const out = await C.submitComment('article', 'bai-test', 'Bình luận đủ hai mươi ký tự trở lên nhé.', '');
  check('2 submit: không tên → Khách Vãng Lai (không email)', out.ok && env.getRpc().p_commenter_name === 'Khách Vãng Lai',
    JSON.stringify(env.getRpc()));
}
// 3. Người dùng gõ email vào ô tên → sanitize bỏ, rơi về tên hồ sơ.
{
  const env = makeEnv({ user: LAN_ANH, profile: PROFILE_LAN_ANH });
  const out = await C.submitComment('article', 'bai-test', 'Bình luận đủ hai mươi ký tự trở lên nhé.', 'ybkcetx@mailto.plus');
  check('3 submit: gõ email vào ô tên → tên hồ sơ', out.ok && env.getRpc().p_commenter_name === 'Nguyễn Thị Lan Anh',
    JSON.stringify(env.getRpc()));
}
// 4. Người dùng gõ tên thường → giữ nguyên.
{
  const env = makeEnv({ user: LAN_ANH, profile: PROFILE_LAN_ANH });
  const out = await C.submitComment('article', 'bai-test', 'Bình luận đủ hai mươi ký tự trở lên nhé.', 'Lan Anh Shop');
  check('4 submit: tên gõ tay được giữ', out.ok && env.getRpc().p_commenter_name === 'Lan Anh Shop',
    JSON.stringify(env.getRpc()));
}
// 5. Metadata có full_name → dùng metadata, không cần gọi fetchMyProfile.
{
  const env = makeEnv({ user: { id: 'u2', email: 'a@b.com', user_metadata: { full_name: 'Lan Anh' } }, profile: PROFILE_LAN_ANH });
  const out = await C.submitComment('article', 'bai-test', 'Bình luận đủ hai mươi ký tự trở lên nhé.', '');
  check('5 submit: metadata full_name ưu tiên, không fetch hồ sơ',
    out.ok && env.getRpc().p_commenter_name === 'Lan Anh' && env.getFetchCalls() === 0,
    JSON.stringify(env.getRpc()) + ' fetch=' + env.getFetchCalls());
}
// 6. fetchMyProfile lỗi (bảng profiles lỗi) → vẫn "Khách Vãng Lai", không vỡ.
{
  const env = makeEnv({ user: LAN_ANH, profile: null, profileThrows: true });
  const out = await C.submitComment('article', 'bai-test', 'Bình luận đủ hai mươi ký tự trở lên nhé.', '');
  check('6 submit: profiles lỗi → Khách Vãng Lai, không vỡ', out.ok && env.getRpc().p_commenter_name === 'Khách Vãng Lai',
    JSON.stringify(env.getRpc()));
}
// 7. Khách vãng lai (chưa đăng nhập) → "Khách Vãng Lai".
{
  const env = makeEnv({ user: null, profile: null });
  const out = await C.submitComment('article', 'bai-test', 'ok', '');
  check('7 submit: khách → Khách Vãng Lai', out.ok && env.getRpc().p_commenter_name === 'Khách Vãng Lai',
    JSON.stringify(env.getRpc()));
}
// 8. renderComments: ô tên điền sẵn tên hồ sơ, KHÔNG chứa email.
{
  makeEnv({ user: LAN_ANH, profile: PROFILE_LAN_ANH });
  const el = fakeEl();
  const ok = await C.renderComments('article', 'bai-test', el);
  check('8 render: ô tên = tên hồ sơ, không email',
    ok && el.innerHTML.includes('value="Nguyễn Thị Lan Anh"') && !el.innerHTML.includes('ybkcetx@mailto.plus'),
    el.innerHTML.slice(0, 400));
}
// 9. renderComments: không có tên ở đâu → ô trống (placeholder), KHÔNG email.
{
  makeEnv({ user: LAN_ANH, profile: null });
  const el = fakeEl();
  const ok = await C.renderComments('article', 'bai-test', el);
  check('9 render: không tên → ô trống, không email',
    ok && el.innerHTML.includes('value=""') && !el.innerHTML.includes('ybkcetx@mailto.plus'),
    el.innerHTML.slice(0, 400));
}

console.log(`\n${pass} PASS, ${fail} FAIL`);
process.exit(fail ? 1 : 0);
