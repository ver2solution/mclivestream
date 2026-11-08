# Điểm thưởng tương tác bài báo — Thiết kế M5 (LOCAL, CHƯA DEPLOY, CHƯA CHẠY MIGRATION)

Ngày cập nhật: 2026-11-05, theo ý người dùng chốt lúc 00:02 ngày 2026-11-05.
File này chỉ là thiết kế + SQL mẫu ở local. Không deploy, không chạy trên
Supabase Dashboard, không thu tiền thật, không cộng điểm thật cho tài khoản nào.

## 0. Mô hình đã sửa theo ý người dùng — đọc kỹ trước khi code tiếp

Mô hình cũ dễ hiểu sai là ví = tài khoản mạng xã hội. Mô hình đúng là:

```
Tài khoản nền tảng Ver2Solution (Supabase Auth, email)
  → 1 ví duy nhất (wallet_accounts, 1 ví / 1 tài khoản Auth)
    → liên kết tối đa 1 tài khoản mạng xã hội (social_links, trạng thái active)
```

- Ví thuộc về tài khoản nền tảng, không thuộc về Facebook, TikTok hay Zalo.
- Tài khoản mạng xã hội chỉ là tài khoản liên kết để xác minh: bài share hay
  bình luận ngoài nền tảng đó có đúng là của người này không.
- 1 ví chỉ có tối đa 1 liên kết đang active, tính trên tổng số nền tảng, không
  phải 1 liên kết cho mỗi nền tảng. Đã liên kết Facebook thì không được liên
  kết thêm TikTok, Instagram, Zalo hay Threads cho tới khi hủy liên kết cũ.
- Lý do: share lên nhiều nền tảng có thể kéo thêm khách và sinh nhiều điểm.
  Nếu 1 người link 4-5 nick mạng xã hội, cùng 1 bài báo share 5 nơi sẽ nhân
  điểm lên 5 lần. Giới hạn 1 nick buộc mỗi người chọn kênh mạnh nhất của mình;
  hệ thống vẫn đa kênh vì nhiều người chọn các kênh khác nhau.
- Đổi kênh: hủy liên kết cũ trước, liên kết mới phải qua duyệt lại, lịch sử
  điểm cũ giữ nguyên, hạn mức ngày không reset khi đổi kênh.
- Thời gian chờ đổi kênh là ĐỀ XUẤT, CHƯA CHỐT: 30 ngày kể từ lần hủy liên kết
  trước, trừ khi admin duyệt ngoại lệ có ghi lý do. Cần người dùng chốt trước
  khi bật tính năng.

## 1. Hai nguồn tiền vào cùng 1 ví, nhưng sổ phải tách ra

Cùng 1 ví `wallet_accounts`, nhưng hiển thị 2 dòng số dư riêng:

| Nguồn | Vào ví khi nào | Hết hạn | Rút tiền mặt / chuyển nhượng |
|---|---|---|---|
| Xu nạp từ tiền mặt (`balance_coins`, đã có ở M4) | Chỉ sau khi admin hoặc cổng thanh toán xác nhận đã nhận tiền, đối soát khớp 1 yêu cầu `topup_request` đang pending | Không hết hạn theo kiểu điểm thưởng; hoàn theo chính sách hoàn tiền đã công bố | Không rút xu thành tiền mặt, trừ chính sách hoàn tiền sau này; không chuyển nhượng |
| Điểm thưởng tương tác (`reward_points`, thêm ở M5) | Chỉ sau khi sự kiện tương tác được duyệt (xem mục 4), không cộng ngay lúc bấm like/share | ĐỀ XUẤT, CHƯA CHỐT: 90 ngày kể từ ngày duyệt, tính từ sự kiện duyệt sớm nhất trước (trừ điểm sắp hết hạn trước) | Không rút tiền mặt, không đổi ngược thành xu nạp; chuyển nhượng chỉ theo mục 7 (tặng được đề xuất, bán chỉ qua trung gian nền tảng khi đã bật) |

Khi mua dịch vụ Tăng chuyển đổi Livestream: trừ điểm thưởng sắp hết hạn
trước, rồi mới trừ xu nạp. Trang Ví phải hiển thị cả 2 dòng, không gộp thành
1 con số duy nhất gây hiểu nhầm điểm thưởng = tiền mặt đã nạp.

Dịch vụ đổi điểm trong M5 chỉ có 1 mã: `tang-chuyen-doi-livestream`.
Nội dung 1 suất dịch vụ gồm những gì và đổi bằng bao nhiêu điểm/xu là
CHƯA CHỐT, chưa ghi giá vào code hay SQL. Không được tự bịa giá đổi trước
khi người dùng chốt. Bảng điểm ở mục 3 cũng là ĐỀ XUẤT, chưa phải giá chốt.

## 2. Hoạt động nào được tính điểm, hoạt động nào không

### 2.1. Hoạt động trong nền tảng — không cần mạng xã hội, đo chính xác
Người dùng đã đăng nhập bằng tài khoản nền tảng, nên hệ thống biết chắc ai làm:
- Like bài báo ngay trên web: mỗi tài khoản chỉ like 1 lần cho 1 bài, tính
  trọn đời bài đó, không tính lại mỗi ngày.
- Bình luận bài báo ngay trên web: bình luận lưu kèm đúng `auth_user_id`,
  phải có nội dung thật, tối đa 1 bình luận tính điểm cho 1 bài trong 1 ngày.
- Hoạt động ẩn danh, không đăng nhập: KHÔNG tính điểm, dù trước đây trang
  đánh giá cho gửi không cần đăng nhập. Tính điểm bắt buộc phải đăng nhập.

### 2.2. Hoạt động ngoài nền tảng — chỉ tính khi đúng tài khoản đã liên kết
- Share bài báo lên mạng xã hội, bình luận vào bài đăng bài báo trên mạng xã
  hội: chỉ tính khi tài khoản đăng bài đó trùng đúng tài khoản mạng xã hội
  đang active của ví, bài đăng công khai, chứa link bài gốc kèm mã ví, và còn
  tồn tại khi kiểm tra lại.
- Share vào group cấm share/link, share bằng tài khoản không phải tài khoản
  đã liên kết, share bài đã xóa hoặc chuyển về riêng tư trước khi kiểm tra
  lại: KHÔNG tính, sự kiện bị thu hồi nếu đã duyệt nhầm.
- Không thưởng cho việc like Page trần, không bắt share vào group, không tự
  đăng bài thay người dùng lên mạng xã hội của họ. Chỉ thưởng cho chia sẻ
  bài viết có nội dung thật từ tài khoản của chính họ, để tránh bị tính là
  mồi tương tác hay spam.

### 2.3. Giới hạn thật theo nền tảng — không hứa tự động đếm hết
- Facebook, Threads, TikTok, Instagram: có link bài công khai để kiểm tra
  được bằng cách đọc trang công khai hoặc nộp link chứng minh, rồi admin
  duyệt hàng chờ ở giai đoạn đầu. Chưa có Facebook App Review thì không hứa
  tự động đếm like/share của từng người qua API.
- Zalo cá nhân: thường không có link bài công khai kiểm tra được kiểu trên.
  Giai đoạn đầu, share Zalo KHÔNG tính theo cùng cách chứng minh bằng link.
  Cần tính riêng bằng link theo dõi lượt bấm vào, hoặc tạm chưa tính điểm
  share ngoài cho Zalo, cho tới khi có cách kiểm chứng công khai đáng tin.
  Ghi rõ giới hạn này trên trang Ví, không ghi chung chung là "share mọi
  nền tảng đều tính điểm".

## 3. Bảng điểm ĐỀ XUẤT (chưa chốt) và trần ngày

Lý do Shop cao hơn Mẫu trong bảng đề xuất: đích cuối là bán dịch vụ Tăng
chuyển đổi cho Shop, và share của Shop tiếp cận đúng chủ shop khác. Nếu người
dùng muốn đảo lại, chỉ cần đổi 2 cột Shop/Mẫu, cấu trúc trần và kiểm chứng
không đổi.

| Hành động | Shop | Mẫu | Giới hạn tính điểm |
|---|---|---|---|
| Like bài trên web | 1 điểm | 1 điểm | Tối đa 5 like tính điểm / ngày; mỗi bài chỉ 1 lần trọn đời |
| Bình luận có nội dung thật, từ 20 ký tự, không copy giống nhau qua nhiều bài | 10 điểm | 5 điểm | Tối đa 2 bình luận tính điểm / ngày; mỗi bài tối đa 1 lần / ngày |
| Chia sẻ bài công khai, đã xác minh theo mục 4 | 20 điểm | 10 điểm | Tối đa 2 share tính điểm / ngày; mỗi bài tối đa 1 lần / ngày |
| Trần ngày (tổng điểm thưởng duyệt trong ngày, theo giờ Việt Nam) | 50 điểm / ngày | 30 điểm / ngày | Vượt trần thì sự kiện vẫn lưu pending nhưng không duyệt thêm trong ngày đó |

Điểm share ở trạng thái chờ: sự kiện share chỉ duyệt sau khi bài share còn
công khai ở lần kiểm tra lại, đề xuất sau 24 giờ. Nếu bài bị xóa hoặc chuyển
về riêng tư trước lúc đó thì từ chối hoặc thu hồi.

## 4. Luồng đo đếm và duyệt — 5 bước, không bước nào tự cộng điểm từ client

1. **Đăng nhập nền tảng.** Chưa đăng nhập thì không tạo được sự kiện tính điểm.
   Hồ sơ Shop hoặc Mẫu phải ở trạng thái đã duyệt, không phải pending.
2. **Tạo sự kiện pending.** Client chỉ tạo `engagement_events` ở trạng thái
   `pending`, `points = 0`. Client không được tự ghi điểm, không được tự
   duyệt, không được tự cộng `reward_points` hay `balance_coins`.
3. **Nộp bằng chứng cho hoạt động ngoài nền tảng.** Người dùng bấm nút chia sẻ
   trên web để tạo link bài có mã ví, share lên tài khoản đã liên kết, rồi dán
   lại link bài share/bình luận đó vào web. Hệ thống lưu `evidence_url` và
   `evidence_hash` (băm của link đã chuẩn hóa) để chống dùng lại 1 link cho
   2 ví hoặc 2 lần.
4. **Kiểm chứng.** Admin hoặc Edge Function kiểm tra: tác giả có trùng tài
   khoản đã liên kết không, bài có công khai không, có chứa link bài gốc kèm
   mã ví không, link đã dùng chưa, ngày sự kiện có trong ngày tính điểm không
   (ngày theo Asia/Saigon, lưu ở `day_key`). Giai đoạn đầu duyệt tay hàng chờ;
   chưa tự động hóa hoàn toàn khi chưa có API chính thức.
5. **Cộng điểm và đổi dịch vụ.** Chỉ admin/Edge Function mới đổi sự kiện sang
   `approved` và cộng `reward_points`. Đổi dịch vụ: người dùng tạo
   `reward_redemptions` ở trạng thái `pending`, admin xác nhận đã giao dịch
   vụ rồi mới trừ điểm/xu và đổi sang `delivered`. Từ chối thì ghi rõ lý do,
   không xóa sự kiện gốc.

## 5. Chống gian lận — khóa ở database, không chỉ ở giao diện

- `social_links`: chỉ 1 dòng `active` cho 1 ví (partial unique index theo
  `wallet_id` khi `status = 'active'`), và chỉ 1 ví cho 1 tài khoản mạng xã
  hội đang active (partial unique index theo `provider, social_id` khi
  `status = 'active'`). Lịch sử hủy liên kết giữ lại ở trạng thái `unlinked`,
  không xóa, để tra cứu khi đổi kênh.
- `social_link_requests`: liên kết mới phải qua yêu cầu pending, admin duyệt
  mới tạo dòng active. Client không được tự insert dòng active.
- `engagement_events`: like chặn trùng trọn đời theo bài; comment/share chặn
  trùng theo bài + ngày; `evidence_hash` chặn dùng lại 1 link chứng minh.
  Client insert bắt buộc `status = 'pending'` và `points = 0`.
- `wallet_accounts`: không có policy UPDATE cho client (kế thừa M4). Mọi cộng
  trừ điểm/xu, duyệt sự kiện, duyệt đổi dịch vụ đều do admin/Edge Function.
- `reward_redemptions`: client chỉ tạo pending, không tự trừ điểm, không tự
  đổi sang delivered.
- Không dùng nhân vật ảo tạo lượt xem/bình luận/tương tác giả. Mọi điểm đều
  phải gắn với 1 sự kiện thật đã duyệt, có tài khoản nền tảng, có bài báo,
  có bằng chứng (đối với hoạt động ngoài nền tảng).

## 6. File tạo trong nhiệm vụ này và thứ tự chạy migration

- Mới: `docs-diem-thuong-tuong-tac-m5.md` — chính file này.
- Mới: `supabase-migration-reward-points-m5.sql` — bảng `social_link_requests`,
  `social_links`, `engagement_events`, `reward_redemptions`, `wallet_transfers`,
  cột `reward_points` cho `wallet_accounts`, RLS và index chống trùng. Chạy
  SAU M4, vì M5 tham chiếu `wallet_accounts` và dùng chung hàm `set_updated_at`
  của M4 (file M5 cũng tự tạo lại hàm này để không kẹt nếu chạy riêng).
- Mới: `js/reward.js` — bảng điểm đề xuất, tính ngày Asia/Saigon, kiểm tra
  bình luận tối thiểu 20 ký tự, kiểm tra trần ngày, tạo sự kiện pending và
  yêu cầu liên kết pending, tạo đơn đổi dịch vụ pending. Không có hàm cộng/
  trừ số dư, không có hàm duyệt sự kiện, không tự insert liên kết active.
- Mới: `tests/test-reward-points-m5.mjs` — kiểm tra file local, không gọi
  Supabase, không cộng điểm thật.
- KHÔNG sửa: `js/wallet.js`, `supabase-migration-marketing-wallet-m4.sql`,
  `vi-tien-ao.html`, các trang đã deploy, và không thêm file nào vào danh
  sách deploy v20. Trang Ví và các trang khác chưa hiển thị điểm thưởng cho
  tới khi người dùng chốt giá đổi và duyệt giao diện.

Thứ tự chạy khi nào người dùng cho phép (chưa chạy bây giờ):
1. M2/M3 shop (nếu chưa chạy).
2. M4 marketing + ví (nếu chưa chạy).
3. M5 trong nhiệm vụ này, rồi kiểm tra theo mục KIỂM TRA cuối file M5.
4. Test bằng tài khoản thật: đăng nhập, tạo sự kiện pending (điểm vẫn 0),
   tạo yêu cầu liên kết pending (chưa có dòng active), tạo đơn đổi pending
   (điểm/xu không đổi). Bước nào tự cộng điểm, tự active liên kết hoặc tự
   trừ điểm từ phía client là lỗi, phải dừng và sửa trước khi deploy.

## 7. Chuyển / tặng / bán tiền ảo giữa các tài khoản — bổ sung ngày 2026-11-05

Ý người dùng: mẫu livestream hoạt động tốt, có nhiều tiền ảo, có thể tặng
hoặc bán lấy tiền thật cho shop nào đó. Đây là thay đổi lớn so với khung M4
("xu không chuyển nhượng, không rút thành tiền mặt"), nên M5 tách 3 việc này
ra rất rõ, không gộp thành 1 nút "chuyển tiền" chung chung:

### 7.1. Tặng — chuyển miễn phí, không có tiền mặt đi kèm
- Người tặng tạo `wallet_transfers` ở trạng thái `pending`, ghi rõ người nhận
  (bằng tài khoản nền tảng đã duyệt, không tặng cho tài khoản ẩn danh hay
  tài khoản pending), loại số dư chuyển (`reward_points` hoặc `balance_coins`),
  số lượng, lời nhắn.
- Chỉ admin/Edge Function mới trừ bên tặng và cộng bên nhận sau khi kiểm tra:
  bên tặng đủ số dư, bên nhận đã duyệt, không tự tặng cho chính mình, không
  vượt trần chuyển trong ngày (ĐỀ XUẤT, CHƯA CHỐT: tối đa 200 điểm thưởng /
  ngày / tài khoản, và tối đa 3 người nhận khác nhau / ngày).
- Tặng là không hoàn lại sau khi đã duyệt, trừ khi chứng minh được gian lận
  hoặc nhầm tài khoản và admin can thiệp có ghi lý do. Bên nhận không cần
  trả gì, và việc tặng không tự động tạo thành đơn dịch vụ.
- Điểm thưởng đã tặng thì hết hạn theo ngày duyệt gốc của bên tặng hay ngày
  chuyển? ĐỀ XUẤT, CHƯA CHỐT: giữ nguyên ngày hết hạn gốc (tính từ ngày bên
  tặng được duyệt điểm), để tránh "rửa" hạn dùng bằng cách tặng qua lại.
  Cần chốt trước khi bật.

### 7.2. Bán lấy tiền thật — chỉ làm qua trung gian nền tảng, chưa bật ngay
- Bán khác tặng ở chỗ có tiền thật ngoài nền tảng. Nếu chỉ ghi "đã bán" rồi
  để 2 bên tự trả tiền ngoài, nền tảng không kiểm chứng được ai đã trả, ai
  chưa trả, rất dễ tranh chấp và rửa điểm: tạo nick ảo cày điểm rồi bán cho
  nick chính. Vì vậy M5 KHÔNG cho phép ghi nhận bán ngoài nền tảng thành
  giao dịch đã xác minh.
- Luồng bán đúng, ở dạng KHUNG CHỜ, chưa bật cho tới khi có cổng thanh toán:
  người bán đăng tin bán (số điểm/xu, giá muốn bán, không phải giá chốt của
  nền tảng), người mua đặt mua và thanh toán qua cổng của nền tảng, nền tảng
  giữ tiền ở trạng thái chờ, sau khi thanh toán đã đối soát khớp mới trừ bên
  bán và cộng bên mua, rồi mới giải ngân cho bên bán theo chính sách thanh
  toán. Phí nền tảng, thuế, thời gian giữ tiền và cách xử lý tranh chấp là
  CHƯA CHỐT, phải có văn bản chính sách trước khi bật, không tự bịa phí.
- Cho tới khi có cổng + chính sách đó, trong giao diện chỉ được ghi "Bán qua
  nền tảng — sắp mở", không cho tạo đơn bán thật, không cho tự thỏa thuận
  giá ngoài rồi bấm xác nhận đã trả tiền.

### 7.3. Cái gì được chuyển, cái gì không được chuyển
- Điểm thưởng (`reward_points`): ĐỀ XUẤT được tặng, và được bán qua trung gian
  nền tảng khi khung bán ở 7.2 đã bật. Không được rút trực tiếp thành tiền
  mặt từ nền tảng nếu không qua đơn bán đã đối soát.
- Xu nạp từ tiền mặt (`balance_coins`): RỦI RO CAO NHẤT, vì đây là giá trị đã
  nạp tiền thật. ĐỀ XUẤT: giai đoạn đầu KHÔNG cho tặng hay bán xu nạp, chỉ
  dùng xu nạp để mua dịch vụ cho chính tài khoản đó. Nếu sau này muốn mở,
  phải có xác minh danh tính mạnh hơn và trần riêng, không mở chung với điểm
  thưởng.
- Tài khoản bị khóa vì gian lận: số dư còn lại bị đóng băng, không được tặng
  hay bán để tẩu tán điểm trước khi bị xử lý. Admin phải có nút đóng băng
  ví, ghi rõ trong `wallet_accounts.status = 'frozen'` (đã có ở M4).

### 7.4. Chống gian lận riêng cho chuyển/tặng/bán
- 1 ví chỉ tặng cho tài khoản nền tảng đã duyệt, không tặng cho chính mình,
  không tặng vòng tròn qua lại để vượt trần ngày (admin phải nhìn được chuỗi
  chuyển trong lịch sử, không chỉ từng giao dịch lẻ).
- Điểm thưởng mới duyệt chưa đủ "tuổi" thì chưa được tặng/bán ngay: ĐỀ XUẤT,
  CHƯA CHỐT: điểm phải qua 7 ngày kể từ ngày duyệt mới được chuyển, để có
  thời gian phát hiện share/bình luận giả và thu hồi trước khi điểm chạy
  sang tài khoản khác.
- Mọi giao dịch chuyển đều là nhật ký không sửa: `wallet_transfers` client
  chỉ tạo pending, không có policy UPDATE/DELETE cho client, giống M4.
- Người nhận điểm tặng/bán vẫn phải tuân thủ trần ngày và quy tắc đổi dịch
  vụ như điểm tự kiếm, không được dùng điểm nhận để vượt trần kiếm điểm.

## 8. Việc còn CHƯA chốt, không được tự quyết thay người dùng

- Giá đổi 1 suất dịch vụ Tăng chuyển đổi Livestream bằng bao nhiêu điểm/xu,
  và 1 suất gồm những gì.
- Thời gian chờ đổi tài khoản mạng xã hội (đề xuất 30 ngày) và thời hạn hết
  hạn điểm thưởng (đề xuất 90 ngày).
- Cách tính điểm share Zalo khi không có link công khai kiểm chứng được.
- Giao diện trang Ví hiển thị 2 dòng số dư và hàng chờ duyệt như thế nào.
- Chuyển/tặng: trần ngày (đề xuất 200 điểm thưởng / ngày), số người nhận
  tối đa / ngày, và điểm tặng có giữ nguyên hạn gốc không.
- Bán qua nền tảng: phí nền tảng, thời gian giữ tiền, cách xử lý tranh chấp,
  và xu nạp có được bán không (đề xuất giai đoạn đầu là không).

## 9. Viết lại theo sổ cái (D1) + thu hồi điểm (D3) — 06/11/2026

- **D1 — viết lại M5 theo sổ cái (đã chốt):** nguồn sự thật cho số dư điểm
  thưởng là bảng `points_ledger` (bất biến, `idempotency_key` UNIQUE,
  `balance_after` sau mỗi dòng). Mọi cộng/trừ điểm đi qua hàm
  `append_points_ledger()` trong cùng 1 transaction (ghi ledger + cập nhật
  `wallet_balances` + mirror 3 cột `wallet_accounts`). 3 cột mirror giữ lại
  để hiển thị, không xóa. Trang quản trị hiển thị lịch sử điểm từ sổ cái.
- **D3 — thu hồi điểm khi bình luận bị xóa (đã chốt):** bình luận bị xóa vì
  spam/vi phạm trong 7 ngày kể từ lúc cộng điểm thì thu hồi đúng số điểm đã
  cộng (1 dòng ledger âm, `type=reclaim`, `points_status=reclaimed`). Xóa sau
  7 ngày thì không thu hồi (điểm đã "chín"). Xóa vì người dùng tự gỡ thì không
  thu hồi. Số dư chặn ở 0 khi thu hồi, phần thiếu ghi vào `reason` của dòng
  ledger. Xóa bình luận chỉ bằng hàm `delete_comment()` (xóa mềm), không xóa
  cứng dòng trên Dashboard.
