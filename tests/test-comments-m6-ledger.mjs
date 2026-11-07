/* Test M6 v2 (D1 sổ cái + D3 thu hồi điểm). Chỉ kiểm tra file local,
   không gọi Supabase, không cộng/trừ điểm thật, không deploy. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
let pass = 0, fail = 0;
function check(name, ok) { if (ok) { pass++; console.log('PASS comments-m6-ledger: ' + name); } else { fail++; console.log('FAIL comments-m6-ledger: ' + name); } }
const m6 = read('../goals/mc-livestream-job-board/hidden_files/supabase-migration-comments-m6.sql');
const m5 = read('supabase-migration-reward-points-m5.sql');

// --- D1: credit qua sổ cái, không UPDATE trần ---
check('M6 credit_comment_points ghi sổ cái qua append_points_ledger', m6.includes('append_points_ledger'));
check('M6 credit KHÔNG còn UPDATE trực tiếp reward_points', !m6.includes('reward_points = reward_points +'));
check('M6 credit dùng idempotency_key comment:<comment_id>', m6.includes("'comment:' || p_comment_id::text"));
check('M6 credit đồng bộ trạng thái khi đã ghi ledger (duyệt lại không cộng trùng)', m6.includes("WHERE idempotency_key = 'comment:' || p_comment_id::text"));
check('M6 credit chặn khi M5 v2 (sổ cái) chưa chạy', m6.includes("table_name = 'points_ledger'") && m6.includes("table_name = 'wallet_balances'"));
check('M6 credit ghi thời điểm cộng điểm (points_credited_at)', m6.includes('points_credited_at = now()'));
check('M6 credit không cộng điểm cho bình luận đã xóa', m6.includes('c.deleted_at IS NOT NULL THEN RETURN false') || m6.includes('deleted_at IS NOT NULL'));

// --- D3/B1: xóa mềm + thu hồi ---
check('M6 có xóa mềm: deleted_at + delete_reason + points_credited_at', m6.includes('deleted_at timestamptz') && m6.includes("delete_reason text CHECK (delete_reason IN ('spam', 'violation', 'user_request', 'other'))") && m6.includes('points_credited_at timestamptz'));
check('M6 có hàm delete_comment + thu hồi type reclaim', m6.includes('delete_comment') && m6.includes("'reclaim'"));
check('M6 thu hồi chỉ trong 7 ngày từ lúc cộng điểm', m6.includes("interval '7 days'") && m6.includes('points_credited_at + interval'));
check('M6 thu hồi chỉ khi lý do spam/vi phạm', m6.includes("p_reason IN ('spam', 'violation')"));
check('M6 thu hồi dùng idempotency_key reclaim:<comment_id>', m6.includes("'reclaim:' || p_comment_id::text"));
check('M6 points_status có trạng thái reclaimed', m6.includes("'reclaimed'"));
check('M6 bình luận đã xóa không hiện công khai', m6.includes("moderation_status = 'approved' AND deleted_at IS NULL"));
check('M6 backfill không cộng điểm cho bình luận đã xóa', /backfill_queued_comment_points[\s\S]*?deleted_at IS NULL/.test(m6));
check('M6 approve/reject chặn bình luận đã xóa', m6.includes('Bình luận đã bị xóa, không duyệt được') && m6.includes('Bình luận đã bị xóa, không từ chối được'));
check('M6 bình luận chưa cộng điểm bị xóa thì nhả suất (queued về none)', m6.includes("points_status = 'queued'") && /IF c\.points_status = 'queued' THEN[\s\S]*?points_status = 'none'/.test(m6));

// --- Số dư chặn ở 0 (khớp helper M5) ---
check('M5 helper chặn số dư âm khi thu hồi (GREATEST)', m5.includes('GREATEST(p_delta, -v_balance)'));
check('M6 ghi rõ phần thiếu vào reason khi số dư không đủ thu hồi', m6.includes('thiếu') && m6.includes('v_shortfall'));

// --- An toàn chung ---
check('M6 delete_comment là SECURITY DEFINER và không gọi được qua RPC công khai', m6.includes('delete_comment') && m6.includes('SECURITY DEFINER') && m6.includes('REVOKE ALL ON FUNCTION public.delete_comment(uuid, text) FROM PUBLIC'));
check('M6 không dùng service_role key thật, không gán mật khẩu', !/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/.test(m6) && !/password\s*=\s*['"][^'"]+['"]/i.test(m6));
console.log(pass + ' PASS, ' + fail + ' FAIL');
process.exit(fail ? 1 : 0);
