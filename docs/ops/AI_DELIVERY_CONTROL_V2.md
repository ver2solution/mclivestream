# AI Delivery Control V2 — Quy trình bàn giao và chống tắc nghẽn
Ngày ban hành: 21/11/2026 (Asia/Ho_Chi_Minh). Phạm vi: mọi AI/human tham gia repo này. Đây là **quy trình dự thảo trong PR**, chỉ coi có hiệu lực trong mã nguồn khi PR được review và merge; không thay thế branch protection, quyền cấp phát, chính sách dữ liệu hoặc gate release hiện tại.

## 1. Một người chịu trách nhiệm ĐẾN ĐÍCH
- Mỗi task có **DRI** (directly responsible individual) nhận trách nhiệm từ ASSIGNED đến TEST/QA; không kết thúc việc bằng cách gửi câu “đã code xong”, ảnh mockup hay “đã giao cho X”.
- Vai trò rõ ràng: **Maker** tạo code/asset; **Integrator** bảo đảm artifact ở repo/nhánh & chạy build; **QA độc lập** test URL và chức năng; **Release owner** quyết định phát hành theo gate. Một người có thể có nhiều vai trò ở task rủi ro thấp, nhưng không tự QA độc lập cho thay đổi P0/production.
- Task ghi một DRI, một next-action owner, nhánh/PR, yêu cầu nghiệm thu, mức P0–P3. WIP tối đa 1 hạng mục đang lập trình/AI; tránh tranh cùng file.

## 2. Bảy trạng thái — không được nhảy bước hoặc ghi PASS bằng lời
| State | Điều kiện chứng minh |
|---|---|
| ASSIGNED | Issue/section có DRI, scope, acceptance test |
| IN_PROGRESS | Commit/artifact hoặc log thực thi có timestamp |
| HANDOFF | Người nhận **xác nhận đọc được** patch/files, base SHA, loại artifact và cách chạy |
| PR_BUILD | Remote branch + PR + build/test output; commit local **không tính** |
| TEST | Link TEST + SHA/manifest + hành trình kiểm thử; không lấy URL production cũ làm bằng chứng |
| QA_PASS | Reviewer độc lập kết luận PASS các acceptance & security gate; FAIL phải ghi lỗi |
| RELEASED | Deployment URL + SHA + live smoke test + rollback note; cần quyền release hợp lệ |

BLOCKED không phải trạng thái DONE: là **cờ tạm thời** gắn vào bất kỳ bước nào, có người chịu trách nhiệm gỡ.

## 3. Hợp đồng bàn giao — chống mắc kẹt tại local
Bên giao ghi: repo, task, base SHA/ref, local SHA, danh sách file changed, artifact patch/source (không chứa credentials/PII), checksum nếu có, cách test và expected result, nơi lưu artifact mà bên nhận truy cập được.
Bên nhận phải xác minh thực sự nhận được artifact; nếu chưa, vẫn thuộc trách nhiệm DRI gốc.
- Có quyền push: dùng branch được phép, tạo PR.
- Không có credential push: xuất patch bằng `git format-patch` hoặc `git diff --binary`, bàn giao qua kênh file được cấp quyền để integrator có quyền GitHub thực hiện. **Hash commit local hay screenshot không thay được file code.**
- Không đưa token, mật khẩu hay dữ liệu khách hàng thật vào patch/Issue/PR.
- Không được yêu cầu Owner chạy git push thủ công nếu integrator có công cụ làm thay.

## 4. Báo lỗi trước khi nó thành trễ tiến độ
Gặp lỗi ⇒ ghi vào Issue đang dùng ngay ở lần check-in kế tiếp; không giấu lỗi để chờ báo cáo cuối ngày.
Mẫu duy nhất:
```text
BLOCKED: [Task + Step + P0/P1/P2/P3]
DRI: [...]  |  Next owner: [...]
Where: [repo/branch/SHA/URL]  |  Since: [ICT time]
Expected vs Actual: [...]
Proof: [error/log/screenshot; redact secrets]
Attempts: [đã thử giải pháp gì, kết quả]
Fallback: [ai có quyền/công cụ tiếp quản + artifact path]
Needs Owner: NONE hoặc đúng 1 thao tác login/2FA/quyền/chi phí/release có lý do
Next checkpoint: [lượt check-in đã có]
```
Nếu thiếu bằng chứng, không coi blocker hợp lệ. Không mở War Room/cron trùng lặp; dùng Issue hiện hành.

## 5. Cơ chế tháo nghẽn
- Khi phát hiện blocker: chủ động xác minh lỗi, thử ít nhất một cách được phép; chuyển artifact cho integrator hoặc agent có quyền khác. **Không đợi Owner trả lời** khi có giải pháp trong phạm vi đã ủy quyền.
- Ở lượt giám sát đầu sau khi blocker xuất hiện, DRI ghi trạng thái + fallback; nếu vẫn thiếu tiến triển ở lượt kế tiếp, producer chuyển người thực thi hoặc giảm scope để ra bản TEST có thể nghiệm thu.
- Mốc 2h/4h (nếu đã có giám sát tương ứng): 2h nhắc + yêu cầu artifact; 4h chuyển người thực thi khi không có blocker cấp quyền thật. **Chỉ áp dụng khi lịch tự động/human check-in đang chạy**; tài liệu không tạo ra giám sát tự động.
- P0 security/data loss cần dừng thao tác rủi ro ngay, báo người có quyền trong các kênh đã có; không bypass bằng cách đổi credential/branch/prod.
- Nếu chủ đầu việc rời đi, người mới xác nhận nhận artifact + next step trong cùng Issue trước khi đổi DRI.

## 6. Cửa kiểm soát và quyền Owner
- **AI tự quyết** thiết kế theo brief, refactor nhỏ, test, branch/PR, fallback TEST, review.
- **Gate kỹ thuật bắt buộc** với migration/xóa dữ liệu production: verified backup + restore thử trên môi trường cô lập + security review + rollback + quyền hợp lệ. Không dùng SQL dump thiếu dữ liệu/Auth/Storage như tuyên bố phục hồi đầy đủ.
- **Owner chỉ quyết** mục tiêu kinh doanh, chi phí, quyền mới, 2FA/OAuth, secrets, thay Owner/admin, dữ liệu rủi ro cao và phát hành production khi gate hiện hành bắt buộc.
- Không tự merge/deploy production chỉ vì prompt nói “toàn quyền”. Thay đổi chưa đạt gate ⇒ tiếp tục làm branch/test an toàn.

## 7. Báo cáo quản trị 1 màn hình
Mỗi lượt báo:
```text
TASK | DRI | STAGE | LAST PROOF (URL/SHA) | BLOCKED? | NEXT OWNER | NEXT ACTION
```
Báo tách: DONE thực tế / đang làm / đang chặn / cần Owner. Owner không phải duyệt code, chỉ thấy tác động sản phẩm, rủi ro và quyết định business.

## 8. Checklist nghiệm thu trước khi ghi QA_PASS / RELEASED
- [ ] Chạy được hành trình thực tế trên desktop và mobile; có URL/SHA chứng minh đúng bản
- [ ] Test đã PASS, không chỉ có tên test hoặc tự tuyên bố
- [ ] Không sửa chồng module, không mất dữ liệu, không lộ secrets/PII
- [ ] Ghi rollback rõ, người phụ trách release rõ
- [ ] Bên nhận xác nhận đã nhận đủ artifact tại handoff
- [ ] Blocker tồn đọng không bị che giấu

**Quy tắc cứng:** “Local commit”, “đã giao”, “đã lên PR”, “deploy passed” không đồng nghĩa “Người dùng đang sử dụng được”.
## Phụ lục FWA — ranh giới dự án
- Desktop: sàn nghề livestream; mobile/PWA: giao diện mạng xã hội nghề livestream, cùng Auth/DB/domain; không tạo app thứ hai.
- Luồng P0: bảo mật Contact Gate/auth/backup V5-00 và PR S1 trước khi bật growth hàng loạt.
- S1 phải bàn giao patch/code có thể truy cập, base SHA, SHA code, PR và URL TEST. Không đưa tính năng chưa có backend thành tính năng live.
- Không đụng production DB khi thiếu backup/restore verified; không tạo hồ sơ giả, không tự gán quyền hồ sơ do trùng thông tin.
- Giữ admin người thật, admin AI và User ở ba khu phân quyền; không sửa chồng admin AI.