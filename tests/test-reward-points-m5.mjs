/* Test thiết kế điểm thưởng M5. Chỉ kiểm tra file local, không gọi Supabase,
   không cộng điểm thật, không deploy, không tạo đơn bán thật. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
let pass = 0, fail = 0;
function check(name, ok) { if (ok) { pass++; console.log('PASS reward-m5: ' + name); } else { fail++; console.log('FAIL reward-m5: ' + name); } }
const mig = read('supabase-migration-reward-points-m5.sql');
check('M5 có đủ 5 bảng', ['social_link_requests','social_links','engagement_events','reward_redemptions','wallet_transfers'].every(t => mig.includes('CREATE TABLE IF NOT EXISTS public.' + t)));
check('M5 có cột điểm thưởng cho wallet_accounts', mig.includes('reward_points') && mig.includes('total_reward_points'));
check('M5 khóa 1 ví = 1 MXH active và 1 MXH = 1 ví active', mig.includes('idx_social_links_one_active_per_wallet') && mig.includes('idx_social_links_one_active_per_social') && mig.includes('WHERE status = \'active\''));
check('M5 chặn trùng like trọn đời và comment/share trùng theo ngày', mig.includes('idx_engagement_one_like_per_article') && mig.includes('idx_engagement_one_per_day'));
check('M5 chặn dùng lại link chứng minh', mig.includes('idx_engagement_evidence_hash'));
check('M5 chống tự tặng cho chính mình', mig.includes('wallet_transfer_not_self'));
check('M5 social_links chỉ có policy SELECT cho client, không INSERT/UPDATE client', mig.includes('social_links_owner_read') && !/social_links[^;]*FOR INSERT/i.test(mig) && !/social_links[^;]*FOR UPDATE/i.test(mig));
check('M5 engagement client chỉ insert pending với points=0', mig.includes('engagement_owner_insert_pending') && mig.includes("points = 0"));
check('M5 không dùng service_role key thật, không gán mật khẩu', !/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/.test(mig) && !/password\s*=\s*['"][^'"]+['"]/i.test(mig));
// --- M5 v2 (D1): sổ cái points_ledger + wallet_balances + append_points_ledger ---
check('M5 v2 (D1) có sổ cái points_ledger bất biến', mig.includes('CREATE TABLE IF NOT EXISTS public.points_ledger') && mig.includes('delta integer NOT NULL') && mig.includes('balance_after integer NOT NULL'));
check('M5 v2 có idempotency_key UNIQUE chặn cộng trùng tuyệt đối', mig.includes('idx_points_ledger_idempotency') && mig.includes('idempotency_key text NOT NULL'));
check('M5 v2 có bảng wallet_balances khóa theo ví', mig.includes('CREATE TABLE IF NOT EXISTS public.wallet_balances') && mig.includes('wallet_id uuid PRIMARY KEY'));
check('M5 v2 có hàm append_points_ledger ghi ledger + số dư trong 1 transaction', mig.includes('append_points_ledger') && mig.includes('SECURITY DEFINER') && /INSERT INTO public\.points_ledger/.test(mig) && /UPDATE public\.wallet_balances/.test(mig));
check('M5 v2 chặn số dư âm khi trừ điểm', /GREATEST\(p_delta, -v_balance\)/.test(mig));
check('M5 v2 giữ 3 cột mirror wallet_accounts để hiển thị', mig.includes('reward_points integer NOT NULL DEFAULT 0') && mig.includes('total_reward_points') && mig.includes('total_reward_spent'));
check('M5 v2 points_ledger/wallet_balances chỉ cho client đọc của mình, không ghi', mig.includes('points_ledger_owner_read') && mig.includes('wallet_balances_owner_read') && !/CREATE POLICY[^;]*ON public\.points_ledger FOR (INSERT|UPDATE|DELETE)/i.test(mig) && !/CREATE POLICY[^;]*ON public\.wallet_balances FOR (INSERT|UPDATE|DELETE)/i.test(mig));
check('M5 v2 append_points_ledger không gọi được qua RPC công khai', mig.includes('REVOKE ALL ON FUNCTION public.append_points_ledger'));
const js = read('js/reward.js');
check('reward.js có bảng điểm Shop/Mẫu và trần ngày', js.includes('dailyCap: 50') && js.includes('dailyCap: 30') && js.includes('comment: 10') && js.includes('comment: 5'));
check('reward.js chỉ tạo pending, không cộng/trừ số dư từ client', js.includes("status: 'pending'") && !/reward_points\s*\+=|reward_points\s*-=|balance_coins\s*\+=|balance_coins\s*-=/i.test(js) && !/from\('social_links'\)\.insert/i.test(js));
check('reward.js từ chối tạo đơn bán thật khi khung chờ chưa bật', js.includes('submitSale') && /khung chờ/i.test(js));
check('reward.js tặng chỉ điểm thưởng, không tặng xu nạp ở giai đoạn đầu', js.includes("balance_type: 'reward_points'"));
// Kiểm tra logic thuần túy bằng cách nạp module (file đã guard window/module).
const reward = (await import('../js/reward.js')).default || (await import('../js/reward.js'));
const api = reward.default || reward;
check('Logic trần ngày: Shop 40 + 10 = 50 được, + 11 thì vượt', api.canEarnToday('shop', 40, 10) === true && api.canEarnToday('shop', 40, 11) === false);
check('Logic bình luận: dưới 20 ký tự bị từ chối, từ 20 ký tự được', api.validateComment('ngắn') !== null && api.validateComment('Bình luận này đủ dài để tính điểm thật.') === null);
check('Logic ngày Asia/Saigon trả về dạng YYYY-MM-DD', /^\d{4}-\d{2}-\d{2}$/.test(api.dayKeySaigon(new Date('2026-11-05T00:06:00+07:00'))));
check('Logic bán qua nền tảng luôn ném lỗi khung chờ', (() => { try { api.submitSale(); return false; } catch (e) { return /khung chờ/i.test(e.message); } })());
const docs = read('docs-diem-thuong-tuong-tac-m5.md');
check('Docs ghi rõ ví là tài khoản nền tảng, MXH chỉ là liên kết, 1 ví = 1 MXH', docs.includes('Ví thuộc về tài khoản nền tảng') || docs.includes('Ví là tài khoản nền tảng') || docs.includes('Tài khoản nền tảng Ver2Solution'));
check('Docs tách tặng và bán, bán chỉ qua trung gian nền tảng, chưa bật', docs.includes('Tặng — chuyển miễn phí') && docs.includes('Bán lấy tiền thật — chỉ làm qua trung gian nền tảng'));
check('Docs ghi rõ Zalo chưa tính theo cùng cách link công khai', docs.includes('Zalo') && /không có link/i.test(docs) || docs.includes('Zalo cá nhân'));
check('Docs ghi rõ giá đổi và phí bán là CHƯA CHỐT', docs.includes('CHƯA CHỐT') && docs.includes('Giá đổi'));
check('Docs ghi rõ viết lại theo sổ cái D1 và thu hồi D3', docs.includes('points_ledger') && docs.includes('reclaim') && docs.includes('D1'));
console.log(pass + ' PASS, ' + fail + ' FAIL');
process.exit(fail ? 1 : 0);
