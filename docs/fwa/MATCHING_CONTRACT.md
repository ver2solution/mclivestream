# FWA Matching & Personalization V1: contract UI/API

- **Issue:** #58, lane Claude (MATCHING + PERSONALIZATION CODE)
- **Ngày:** 25/11/2026
- **Trạng thái:** SOURCE_DELIVERED khi PR mở. Chưa tích hợp vào trang nào và chưa deploy.
- **File-set do Claude sở hữu:** `js/matching.js`, `tests/test-matching-v1.mjs`, `docs/fwa/MATCHING_CONTRACT.md`.
- **Không đụng tới:** CSS, route/HTML, `js/app.js`, `js/auth-ui.js`, `js/claim.js`, `js/admin.js`, `data.js`, DB/RPC (đây là lane Codex / Human Admin).

## 1. Mục tiêu
Gợi ý **việc phù hợp** cho người tìm việc (mẫu live, host, MC), **ứng viên phù hợp** cho tin tuyển, và **người cùng nghề** để kết nối. Kết quả phải giải thích được và chỉ dựa trên thông tin người dùng tự điền.

## 2. Năm yếu tố và trọng số (tổng 100)
| Yếu tố | Trọng số | Khớp | Một phần | Không khớp / thiếu dữ liệu |
|---|---|---|---|---|
| `category` (lĩnh vực hàng) | 30 | trùng ít nhất 1 lĩnh vực | ứng viên "Chung / Đa ngành" được 15 | 0 |
| `province` (địa bàn) | 25 | cùng tỉnh/thành, hoặc một bên "Toàn quốc / Live online" | – | 0 |
| `shift` (ca làm) | 15 | trùng ca, hoặc một bên "linh hoạt" | – | 0 |
| `platform` (nền tảng) | 15 | trùng TikTok/Shopee/Facebook/Lazada/YouTube/Instagram/Tiki | – | 0 |
| `salary` (lương) | 15 | mức trần của tin ≥ mức tối thiểu ứng viên mong muốn (cùng đơn vị giờ/tháng) | ≥80% mong muốn được 8 | 0 |

- Thiếu dữ liệu thì yếu tố đó có `status: "unknown"` và 0 điểm, không bị phạt thêm, module không đoán bù.
- Lương tính theo ca/video, hoặc khác đơn vị (giờ so với tháng), thì coi là `unknown`. Module không tự quy đổi.
- `channels` của shop thường là nguồn đăng tin (TopCV, Threads, www.facebook.com), nên chỉ lấy TikTok/Shopee/Lazada/YouTube từ trường này. Facebook chỉ được tính khi xuất hiện trong `req`.
- Thứ tự xếp hạng: `score` giảm dần, rồi `coverage` (tổng trọng số các yếu tố đã biết), rồi `date` mới nhất, rồi `id`. Kết quả ổn định giữa các lần chạy.
- Mặc định `minScore = 1`: kết quả 0 điểm không được trả về.

## 3. Quy tắc riêng tư (bắt buộc, có test)
1. **Không đọc** để chấm điểm: giới tính, chiều cao, tuổi, cân nặng, ảnh, tên, rating, lượt xem, doanh thu, liên hệ, link nguồn, tôn giáo, dân tộc, hôn nhân, sức khoẻ (`SENSITIVE_FIELDS`).
2. Yêu cầu ngoại hình, giới tính hay tuổi trong tin tuyển (`req`) **bị bỏ qua**. Test xác nhận điểm không đổi.
3. **Đầu ra theo whitelist** (`PUBLIC_FIELDS`):
   - job: `id, name, product, province, district, salary, shifts, date, logo`
   - candidate: `id, name, title, province, cat, form, salary, shifts, status, date`

   Không có SĐT, email, Zalo, `src` hay ảnh, **với mọi vai trò, kể cả owner**.
4. Module không gọi mạng, DB hay storage, không mutate dữ liệu đầu vào, và không export hàm ghi, duyệt, claim hay cấp quyền.
5. Contact Gate vẫn **phải** nằm ở server (#3/#14, lane Codex). Module này không thay thế và không nới lỏng Contact Gate.

## 4. Vai trò người xem (`opts.viewer.role`)
| role | Hành vi trong module |
|---|---|
| `guest` (mặc định, hoặc khi role không hợp lệ) | tối đa `GUEST_LIMIT = 5` kết quả, `gated: true` để UI hiện CTA đăng ký |
| `member` | tối đa `limit` kết quả (mặc định 10, trần 50) |
| `human_admin`, `ai_admin`, `owner` | đọc như `member`. Module **không** cấp thêm quyền nào |

Vai trò ở đây chỉ để UI quyết định giới hạn hiển thị. Phân quyền thật (Human Admin tách AI Admin, duyệt claim) là việc của server RPC (`is_admin()` và các RPC claim). AI Admin không có đường nào qua module này để duyệt, claim hay ghi dữ liệu.

## 5. API JS (`window.V2SMatch` / `require('js/matching.js')`)
```js
// Người tìm việc tự điền (form hồ sơ). Trường lạ bị bỏ qua.
const prefs = V2SMatch.preferencesFromInput({
  categories: ['thoi-trang'],      // id trong CATEGORY_LABEL hoặc chữ tự do ("Mỹ phẩm", "Chung / Đa ngành")
  province: 'TP. Hồ Chí Minh',     // hoặc 'Toàn quốc / Live online'
  shifts: ['toi'],                 // 'sang' | 'chieu' | 'toi' | 'fulltime' | 'Ca linh hoạt'
  platforms: ['TikTok', 'Shopee'],
  salaryMin: 100000, salaryUnit: 'hour'   // 'hour' | 'month'
});
V2SMatch.recommendJobs(prefs, V20_DATA.shops, { viewer: { role: 'member' }, limit: 10 });
V2SMatch.recommendCandidates(shopRecord, V20_DATA.models, { viewer: { role: 'member' } });
V2SMatch.recommendPeers(prefs, V20_DATA.models, { excludeId: 'th-03', viewer: { role: 'member' } });
```
Hình dạng kết quả:
```json
{
  "version": "match-v1-2026-11-25",
  "viewerRole": "member",
  "gated": false,
  "total": 276,
  "items": [{
    "card": { "id": "sh-..", "name": "..", "province": "..", "salary": "..", "shifts": [] },
    "score": 70, "coverage": 85,
    "reasons": [{ "factor": "province", "label": "Địa bàn", "weight": 25, "earned": 25, "status": "match", "detail": "Cùng tỉnh/thành" }]
  }]
}
```
`status` ∈ `match | partial | mismatch | unknown`. UI nên hiện 2–3 lý do `match` đầu tiên, ví dụ "Cùng tỉnh/thành · Trùng ca: toi", và có thể hiện các yếu tố `unknown` dưới dạng gợi ý "Bổ sung ca làm để gợi ý chính xác hơn".

## 6. Đề xuất API server (cho Codex, chưa triển khai)
`GET /api/match/jobs?limit=10` lấy prefs từ hồ sơ **của chính user đã đăng nhập** ở server, không nhận prefs của người khác qua query. Endpoint trả đúng hình dạng ở §5. Guest gọi được nhưng bị giới hạn 5 kết quả. Server chạy cùng thuật toán (port từ `js/matching.js`, giữ nguyên test vector ở `tests/test-matching-v1.mjs`) và **không bao giờ join bảng contact**.

## 7. Tích hợp (khi Codex nhận bàn giao)
1. Thêm `<script src="js/matching.js" defer></script>` sau `js/data.js` ở trang feed hoặc hồ sơ.
2. Gọi `recommendJobs` / `recommendCandidates` và render `card` cùng `reasons`.
3. Truyền `viewer.role` theo phiên auth thật. Không chắc role thì không truyền, module sẽ coi là guest.

## 8. Kiểm thử
```bash
node tests/test-matching-v1.mjs
```
Kỳ vọng `62 PASS / 0 FAIL`. Bộ test phủ parser, chấm điểm, dữ liệu trống, giới hạn guest, rò rỉ liên hệ ở cả 5 vai trò, thuộc tính nhạy cảm, "không có hàm ghi", và chạy toàn bộ 246 models × 313 shops của `data.js` thật.

## 9. Rollback
File mới, chưa trang nào nạp. Rollback bằng cách revert PR hoặc xoá 3 file. Không có migration hay dữ liệu cần khôi phục.

## 10. Ngoài phạm vi / việc tiếp theo
- Gợi ý bài viết liên quan trong feed: chưa làm.
- Regression test claim profile và Human Admin / AI Admin ở tầng server: chưa có quyền chạy RPC thật, nên ghi `UNKNOWN`. `tests/test-claim-v2.mjs` hiện có vẫn là bộ hồi quy phía client.
