// Mẫu cấu hình Supabase cho sàn mclivestream (dùng khi khôi phục từ bản sao lưu).
// Cách khôi phục: copy file này thành supabase-config.js, rồi điền Project URL
// và publishable key (public) lấy từ Supabase Dashboard > Settings > API.
// TUYỆT ĐỐI KHÔNG điền service_role key vào đây hay bất kỳ file web nào.
// Không ghi mật khẩu, không lưu CCCD ở đây.
window.MCLIVESTREAM_SUPABASE_CONFIG = {
  url: 'https://YOUR-PROJECT-REF.supabase.co',
  anonKey: 'YOUR-ANON-KEY'
};
