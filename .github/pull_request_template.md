# PR evidence checklist — FWA
> Xem `AGENTS.md` và `docs/ops/ENGINEERING_DELIVERY_OS_V1_2026-11-22.md`. Chỉ đánh dấu nếu đã kiểm tra thật. Không đính dữ liệu cá nhân/secrets.

**Issue liên quan / mức độ P0-P2:** 

**DRI / reviewer độc lập / file-set sở hữu:** 

**Base SHA / Head SHA / receiving owner:** 

**Mục tiêu / thay đổi cụ thể:** 

**Nguồn dữ liệu, quyền sử dụng và phạm vi ảnh hưởng:** 

**Bằng chứng bàn giao từ đầu mối trước:** 
- [ ] Có SHA, đường dẫn file/manifest và người nhận xác nhận hợp lệ (hoặc N/A có lý do).
- [ ] Không còn file bắt buộc chỉ nằm trên máy Muse riêng.

**Kiểm thử đúng HEAD SHA:**
- [ ] Build/lint/tests chạy thật; kèm command và link log.
- [ ] Kiểm thử lỗi hồi quy và trường hợp dữ liệu lỗi/mạng lỗi.
- [ ] Kiểm thử bảo mật/privacy/RLS/secret scan tương ứng thay đổi.
- [ ] Kiểm thử hành trình desktop/mobile: Đăng ký/đăng nhập → hồ sơ nghề → tin tìm việc/tuyển dụng → lọc/tìm kiếm → ứng tuyển/Contact Gate; truy cập guest không thể đọc contact, profile claim có bằng chứng, user/human admin/AI admin phân quyền.
- [ ] Có screenshot/video URL/SHA, không dùng mockup thay cho runtime.

**Triển khai (không đánh dấu PASS trước khi website thực sự cập nhật):**
- [ ] TEST/staging phục vụ đúng full SHA và content/hash (ghi URL).
- [ ] Reviewer độc lập PASS trên đúng bản (ghi link).
- [ ] Bản trước có thể rollback an toàn (ghi artifact/plan).
- [ ] Đã giải quyết mọi P0; còn P1/P2 liệt kê rõ.
- [ ] Có phê duyệt phát hành nếu thay production/DB/permissions/secrets.

**Status:** BACKLOG | IN_PROGRESS | HANDOFF_READY | INTEGRATED | CI_PASS | TEST_DEPLOYED | QA_PASS | NO_GO | BLOCKED

**Rủi ro, blocker, người chịu trách nhiệm, hành động tiếp theo:**

**Không được tuyên bố LIVE khi chỉ CI PASS, PR merge hoặc chưa xác minh deployed HTML/source hash.**
