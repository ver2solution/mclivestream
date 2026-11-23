# AGENTS.md — FWA engineering instructions (draft)
**Ngày 22/11/2026. Đây là nhánh đề xuất, chưa tự động áp dụng trên main.**

Trước mọi sửa đổi đọc [Engineering Delivery OS V1](docs/ops/ENGINEERING_DELIVERY_OS_V1_2026-11-22.md) và các GitHub Issues hiện hành. Ưu tiên #25/#3/#14/#8/#34: bảo vệ contact RLS, login/signup, profile claim, job flow, PC job marketplace/mobile PWA social cùng auth. Admin người thật tách Admin AI. KHÔNG mở traffic lớn khi lỗi đăng ký/contact còn P0.

- Không tự nhận hoàn thành khi chỉ có code trên máy cá nhân, demo tĩnh, báo cáo hoặc CI. DONE phải có artifact GitHub + SHA, người nhận ACK, build, TEST đúng SHA, QA độc lập; production phải qua gate riêng.
- 1 Issue = 1 DRI chính / một tập file sở hữu. Không sửa trùng phạm vi cùng lúc. DRI nhận bàn giao có nghĩa vụ trả receipt chấp nhận/từ chối.
- Đọc HEAD và deployed SHA trước khi test, không kiểm bản cũ thay cho bản mới. Mọi PR phải có mục tiêu, thay đổi, phép thử, bằng chứng, rollback.
- Bị chặn >15 phút phải báo chính xác lỗi, công đoạn, người xử lý; 60 phút có đầu ra hữu hình khi đang hoạt động; fallback chỉ khi AI dự phòng thật sự có quyền và phiên làm việc.
- Không ghi credentials, tokens, dữ liệu cá nhân, số điện thoại/email riêng vào repo/log; không đặt secrets/service_role tại frontend. Không tự đổi DNS, công khai private repo, migration dữ liệu thật, deploy production, sửa quyền admin hoặc chi tiền ngoài gate.
- Đây là lệnh trong repo; không phải bằng chứng các AI đã nhận/đang chạy. Các quyết định sản phẩm Owner đã chốt và an toàn dữ liệu vẫn ưu tiên cao hơn tài liệu đề xuất này.
