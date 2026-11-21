# Pull Request — AI Delivery Control V2
> Dùng cùng Issue/War Room hiện hành. Điền **bằng chứng thực**, không điền "đã xong" thay cho URL/SHA. Nếu chưa đủ, giữ Draft.

## Mục tiêu và trách nhiệm
- Issue liên quan:
- DRI (chịu trách nhiệm đến QA, không chỉ commit):
- Maker / Integrator / QA độc lập / Release owner:
- Mức ưu tiên: P0 / P1 / P2 / P3
- Trạng thái: ASSIGNED / IN_PROGRESS / HANDOFF / PR_BUILD / TEST / QA_PASS / RELEASED

## Artifact / Handoff
- Base branch + SHA:
- Nhánh + commit SHA:
- Danh sách file thay đổi:
- Link artifact/patch nếu nguồn nằm ở máy khác (không chứa secrets):
- Bên nhận đã xác minh có thể đọc/chạy artifact: [ ] Có [ ] Chưa

## Kiểm thử và bằng chứng
- Test command + kết quả:
- TEST URL + SHA/manifest (nếu có UI):
- Ảnh/video mobile + desktop (nếu UI):
- QA độc lập: reviewer + PASS / FAIL / CHƯA QA
- Security/data impact (Auth, PII, RLS, Xu, backup):
- Rollback:

## Blocker / next action
- BLOCKED? Không / Có (link comment ghi **đúng thao tác + lỗi**):
- DRI của bước kế tiếp:
- Owner có cần hành động? Không / Có — đúng một thao tác có căn cứ:

## Checklist trước khi release
- [ ] Có artifact remote, không chỉ local commit
- [ ] QA độc lập xác minh hành trình thực tế
- [ ] Có rollback và không lộ PII/secrets
- [ ] Đã qua release gate hiện hành (PR không tự cấp quyền production)
