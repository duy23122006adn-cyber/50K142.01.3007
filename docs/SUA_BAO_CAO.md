# Danh sách chỉnh sửa báo cáo `NHÓM_1_PTTKHTTT.docx`

> Mục đích: sửa báo cáo cho khớp với 28 quyết định đã chốt ([KE_HOACH.md](../KE_HOACH.md)) và thiết kế CSDL phiên bản 2 ([THIET_KE_DB_V2.md](THIET_KE_DB_V2.md)).
> Cách dùng: tìm đoạn "Hiện tại" trong file Word (Ctrl+F), thay bằng đoạn "Sửa thành". Cột "Lý do" ghi số câu quyết định (Qn) hoặc lỗi tìm thấy.
> Tôi không sửa trực tiếp file Word. Bạn tự sửa trong Word.

**Mức ưu tiên:**

| Ký hiệu | Ý nghĩa |
|---|---|
| 🔴 | Mâu thuẫn trực tiếp với code sẽ viết. Nên sửa. |
| 🟡 | Chưa rõ hoặc sai lệch nhỏ. Nên sửa. |
| 🟢 | Lỗi chính tả hoặc đánh số. |

---

## 1. Chương OVERVIEW

### 1.1. 🟢 Mục tiêu kinh doanh: lỗi ký tự
- **Vị trí:** Business objectives → Mục tiêu kinh doanh → đoạn "Mục tiêu cuối cùng…"
- **Hiện tại:** "…việc kiểm soát ttiề11iề1 n, hàng và quyền truy cập…"
- **Sửa thành:** "…việc kiểm soát tiền, hàng và quyền truy cập…"

### 1.2. 🟡 Mục tiêu thứ năm: khuyến mãi
- **Vị trí:** Mục tiêu kinh doanh → đoạn "Mục tiêu thứ năm là quản lý khuyến mãi…"
- **Sửa thành:** giữ nguyên đoạn cũ, thêm vào cuối câu: "(Nội dung này thuộc giai đoạn phát triển sau. Phiên bản hiện tại áp dụng giá bán đã tính sẵn mức giảm của từng sản phẩm, xem UC_6.5 BR7.)"
- **Lý do:** Q4. Không có UC hay bảng nào cho khuyến mãi.

### 1.3. 🔴 User Scope: Chủ quán
- **Hiện tại:** "Chủ quán: có toàn quyền trên hệ thống, bao gồm xem báo cáo doanh thu và lợi nhuận, thiết lập giá, thiết lập hạn mức nợ và khuyến mãi, phân quyền, cấp và khóa tài khoản, cũng như quyết định các khoản hoàn tiền vượt mức cho phép."
- **Sửa thành:** "Chủ quán: có toàn quyền trên hệ thống, bao gồm xem báo cáo doanh thu và lợi nhuận, quản lý hàng hóa và thiết lập giá, quản lý lô hàng và điều chỉnh tồn kho, cấp và khóa tài khoản nhân viên, quản lý khách quen, hủy hóa đơn và duyệt phiếu đổi trả."
- **Lý do:** Q4, Q9, Q22. Hạn mức nợ cố định; mọi khoản hoàn tiền đều qua bước duyệt.

### 1.4. 🔴 User Scope: Người nhà
- **Hiện tại:** "Người nhà: dùng chung một tài khoản đăng nhập bằng mật khẩu để thay phiên nhau trông quán khi có việc bận."
- **Sửa thành:** "Người nhà: được cấp một tài khoản thuộc nhóm Nhân viên, dùng chung để thay phiên nhau trông quán khi có việc bận, với quyền hạn như Nhân viên."
- **Lý do:** Q8.

### 1.5. 🔴 User Scope: Nhân viên
- **Hiện tại:** "…Nhóm này chỉ được bán hàng, xem tồn kho, tạo hóa đơn nợ trong hạn mức cho phép, xử lý đổi trả và hoàn tiền trong mức cho phép…"
- **Sửa thành:** "…Nhóm này chỉ được bán hàng, tạo hóa đơn nợ trong hạn mức cho phép, thu nợ, tra cứu tồn kho, quản lý thông tin khách hàng, lập phiếu đổi trả (hoàn tiền sau khi Chủ quán duyệt) và kết ca…"
- **Lý do:** Q7, Q9.

### 1.6. 🔴 Out of scope: thời hạn đổi trả
- **Hiện tại:** "…hoặc đơn hàng đã quá 3–7 ngày kể từ ngày mua."
- **Sửa thành:** "…hoặc đơn hàng đã quá 7 ngày kể từ ngày lập hóa đơn (ngày lập hóa đơn tính là ngày thứ nhất)."
- **Lý do:** Q17, UC_6.2 BR01.

### 1.7. 🟡 Out of scope: thêm các mục đã loại
- **Sửa thành:** thêm 3 dòng:
  - "Hệ thống không quản lý nhà cung cấp và đơn nhập hàng; hàng nhập được ghi nhận dưới dạng lô hàng (UC_10.1)."
  - "Hệ thống không đối soát tiền mặt cuối ca; biên bản kết ca chỉ đối soát hàng hóa."
  - "Hệ thống không quản lý chương trình khuyến mãi trong phiên bản hiện tại."
- **Lý do:** Q4, Q6, Q12.

---

## 2. Chương OVERALL DESCRIPTION

### 2.1. 🟡 Business requirements: giám sát doanh số
- **Hiện tại:** "Giám sát doanh số: Cung cấp thông tin doanh số bán và tổng tiền thực thu theo từng nhân viên trong ca làm việc để chủ dễ theo dõi và đối soát"
- **Sửa thành:** "Giám sát giao dịch: Mỗi hóa đơn ghi nhận người bán và ca làm việc, giúp chủ quán truy vết khi có chênh lệch về tiền hoặc hàng."
- **Lý do:** Q12. Không có UC đối soát tiền; UC_9.2 BR04 không hiển thị tiền.

### 2.2. 🟡 Stakeholder requirements
- **Hiện tại (Chủ tiệm):** "Quản lý hoạt động nhập hàng, bán hàng, thanh toán và đổi trả hàng." / "Quản lý tài khoản, phân quyền và thiết lập ca làm việc cho nhân viên."
- **Sửa thành:** "Quản lý lô hàng nhập, bán hàng, thanh toán và đổi trả hàng." / "Quản lý tài khoản nhân viên."
- **Hiện tại (Nhân viên):** "Hỗ trợ tiếp nhận, kiểm tra hàng nhập và xử lý đổi trả theo quyền được cấp." / "Xem lịch làm việc, kiểm tra hàng hóa và thực hiện bàn giao ca."
- **Sửa thành:** "Lập phiếu đổi trả theo quyền được cấp." / "Kiểm kê hàng hóa cuối ca và lập biên bản kết ca."
- **Lý do:** Không có UC nào cho nhập hàng, thiết lập ca hay lịch làm việc (Q6, Q10).

---

## 3. Chương FUNCTIONAL REQUIREMENTS

### 3.1. 🟡 UC_1 Đăng nhập: cách xác nhận OTP
- **Hiện tại (Exception 5.c.3):** "Chủ quán xác nhận mã qua điện thoại trong vòng 5 phút"
- **Sửa thành:** "Chủ quán đồng ý mở khóa và cung cấp mã xác nhận cho người dùng; người dùng nhập mã xác nhận trên màn hình đăng nhập trong vòng 5 phút"
- **Hiện tại (5.d):** "Chủ quán từ chối xác nhận (tại bước 5.c.3)"
- **Sửa thành:** "Chủ quán từ chối cung cấp mã (tại bước 5.c.3)"
- **Hiện tại (BR03):** "…Chủ quán phải phản hồi trong vòng 5 phút, nếu từ chối hoặc quá thời hạn thì tài khoản vẫn bị khóa"
- **Sửa thành:** "…Mã có hiệu lực 5 phút; nếu Chủ quán không cung cấp mã hoặc mã hết hạn thì tài khoản vẫn bị khóa"
- **Lý do:** Q25. Khớp với màn hình 1.4 (người dùng nhập OTP).

### 3.2. 🔴 UC_2.2 Sửa nhân viên: không sửa trạng thái
- **Hiện tại (Main flow bước 4):** "…gồm: họ tên, ngày sinh, số điện thoại, email và trạng thái làm việc."
- **Sửa thành:** "…gồm: họ tên, ngày sinh, số điện thoại, email; trạng thái làm việc chỉ hiển thị, không cho sửa."
- **Hiện tại (BR05):** "Các thông tin được phép chỉnh sửa gồm họ tên, ngày sinh, số điện thoại, email và trạng thái làm việc."
- **Sửa thành:** "Các thông tin được phép chỉnh sửa gồm họ tên, ngày sinh, số điện thoại và email. Việc ngừng hoạt động tài khoản được thực hiện qua UC_2.4."
- **Lý do:** Q26. Khớp với màn hình sửa nhân viên (trạng thái ở chế độ chỉ đọc).

### 3.2b. 🟡 UC_2.3 Đổi mật khẩu: bổ sung quy tắc đã có trên màn hình
- **Vị trí:** UC_2.3 → Business rules, Exception flows
- **Hiện tại:** UC không có quy tắc khóa, nhưng đặc tả màn hình 2.4.9 và 2.4.10 có: "Bạn đã nhập sai mật khẩu 5 lần liên tiếp. Chức năng đổi mật khẩu bị khóa trong 15 phút".
- **Thêm BR08:** "Nếu người dùng nhập sai mật khẩu hiện tại 5 lần liên tiếp, chức năng đổi mật khẩu của tài khoản bị khóa trong 15 phút. Số lần sai được đặt lại khi nhập đúng mật khẩu hiện tại."
- **Thêm Exception 4b4:** "Nếu đây là lần nhập sai thứ 5 liên tiếp, hệ thống hiển thị thông báo "Bạn đã nhập sai mật khẩu 5 lần liên tiếp. Chức năng đổi mật khẩu bị khóa trong 15 phút" và UC kết thúc."
- **Lý do:** Code làm theo đặc tả màn hình (chi tiết hơn); UC cần ghi thêm cho khớp.

### 3.3. 🟡 UC_2.4 Xóa tài khoản: làm rõ "ca chưa đối soát"
- **Hiện tại (BR03):** "Không được xóa hoặc ngừng hoạt động tài khoản nhân viên còn ca chưa được đối soát tồn kho."
- **Sửa thành:** "Không được xóa hoặc ngừng hoạt động tài khoản nhân viên đang phụ trách ca chưa ở trạng thái "Đã kết thúc"."
- **Lý do:** Q10. Trạng thái ca theo UC_9.1.

### 3.4. 🔴 UC_3.2 Xem cảnh báo tồn kho: quy tắc đóng cảnh báo
- **Hiện tại (BR05):** "…Nếu cảnh báo cùng loại của lô đs đã tồn tại…"
- **Sửa thành:** "…Nếu cảnh báo cùng loại của lô đó đã tồn tại…" 🟢
- **Hiện tại (BR06):** ba gạch đầu dòng hiện có.
- **Sửa thành:**
  - "Cảnh báo "Sắp hết hàng" và "Hết hàng" của một lô chuyển sang "Đã xử lý" khi Chủ quán thêm lô mới cho cùng mặt hàng (UC_10.1), hoặc khi số lượng tồn của lô được điều chỉnh lớn hơn ngưỡng cảnh báo hết hàng (UC_3.3)."
  - "Cảnh báo "Sắp hết hạn" và "Hết hạn" của một lô chuyển sang "Đã xử lý" khi Chủ quán thêm lô mới cho cùng mặt hàng có hạn sử dụng muộn hơn lô đó."
- **Lý do:** Q13. Bỏ câu "lô hàng tương ứng đã được xử lý Sắp hết hàng" vì đó là định nghĩa vòng lặp.

### 3.5. 🔴 UC_3.3 Điều chỉnh tồn kho: chỉ Chủ quán
- **Hiện tại:** Description "Là chủ quán/nhân viên…"; Actors "Chủ quán, Nhân viên"
- **Sửa thành:** Description "Là chủ quán, tôi muốn điều chỉnh tồn kho của từng lô hàng"; Actors "Chủ quán"
- **Lý do:** Q7.

### 3.6. 🟡 UC_4.1 Thêm hàng hóa: mã vạch và thời điểm cấp mã
- **Hiện tại (Main flow bước 2–3):** "…Mã hàng hóa, tên hàng hóa, danh mục, đơn vị tính, giá nhập, giá bán, ngưỡng cảnh báo hết hạn, ngưỡng cảnh báo hết hàng…"
- **Sửa thành:** thêm "mã vạch (không bắt buộc)" vào cả bước 2 và bước 3.
- **Hiện tại (BR04):** "Khi hệ thống hiển thị biểu mẫu tại bước 2 thì hệ thống tự cấp mã hóa đơn theo định dạng HH-xxxx…"
- **Sửa thành:** "Khi hiển thị biểu mẫu tại bước 2, hệ thống hiển thị mã hàng hóa dự kiến theo định dạng HH-xxxx, trong đó xxxx là số thứ tự bắt đầu từ 0001. Mã chỉ được ghi nhận khi lưu thành công. Mã hàng hóa là duy nhất và không cấp lại, kể cả khi hàng đã xóa hoặc ngừng kinh doanh."
- **Thêm BR07:** "Mã vạch không bắt buộc; nếu nhập thì không được trùng với hàng hóa khác."
- **Lý do:** Q15, Q16. Sửa luôn lỗi "mã hóa đơn" thành "mã hàng hóa".

### 3.7. 🟡 UC_4.2 Sửa hàng hóa
- **Hiện tại (Exception 5f):** "Chủ quán nhập "Ngưỡng cảnh báo hết hàng" là số âm hoặc không phải số"
- **Sửa thành:** "…nhỏ hơn hoặc bằng 0 hoặc không phải số"
- **Thêm:** "mã vạch" vào danh sách trường được sửa (bước 3), và BR07 giống UC_4.1.
- **Lý do:** Mâu thuẫn với BR03 (phải > 0); Q15.

### 3.8. 🟢 UC_4.4 Tìm kiếm hàng hóa
- **Sửa thành:** thêm "Mã vạch" vào danh sách thông tin chi tiết ở bước 7.
- **Lý do:** Q15.

### 3.9. 🔴 UC_5.1 Xem báo cáo lợi nhuận
- **Hiện tại (BR01):** "Kỳ báo cáo bắt buộc phải có ngày bắt đầu < hoặc = ngày kết thúc"
- **Sửa thành:** "Kỳ báo cáo bắt buộc phải có ngày bắt đầu nhỏ hơn hoặc bằng ngày kết thúc và không vượt quá ngày hiện tại."
- **Hiện tại (BR03):** "Chỉ tính các đơn hàng đã hoàn tất và ghi nợ. Các đơn đã hủy và trả hàng không được tính"
- **Sửa thành:** "Chỉ tính các hóa đơn ở trạng thái "Đã thanh toán" và "Còn nợ"; hóa đơn "Đã hủy" không được tính. Giá trị hàng trả và chênh lệch đổi hàng của phiếu đổi trả đã hoàn tất được trừ vào kỳ chứa ngày duyệt phiếu (UC_6.2 BR06)."
- **Thêm BR09:** "Giá vốn của mỗi dòng hóa đơn là giá nhập của hàng hóa tại thời điểm bán, được lưu cùng hóa đơn."
- **Lý do:** Q19, Q20, Q21.

### 3.10. 🔴 UC_5.2 Xem báo cáo doanh thu
- **Hiện tại (BR01):** "Kỳ báo cáo bắt buộc phải có ngày bắt đầu nhỏ hơn ngày kết thúc và không được vượt quá ngày hiện tại."
- **Sửa thành:** "…ngày bắt đầu nhỏ hơn hoặc bằng ngày kết thúc…"
- **Hiện tại (BR02):** "Doanh thu là tổng giá trị các đơn hàng đã hoàn tất trong kỳ, các đơn hàng đã hủy và trả hàng không được tính."
- **Sửa thành:** "Doanh thu là tổng giá trị các hóa đơn ở trạng thái "Đã thanh toán" và "Còn nợ" lập trong kỳ, trừ giá trị hàng trả và chênh lệch đổi hàng của các phiếu đổi trả hoàn tất có ngày duyệt trong kỳ. Hóa đơn "Đã hủy" không được tính."
- **Lý do:** Q19, Q21.

### 3.11. 🔴 UC_5.3 Xem báo cáo số lượng bán ra
- **Hiện tại (BR01):** "…ngày bắt đầu nhỏ hơn ngày kết thúc…"
- **Sửa thành:** "…ngày bắt đầu nhỏ hơn hoặc bằng ngày kết thúc…"
- **Hiện tại (BR02):** "…chỉ tính số lượng của các đơn hàng đã hoàn tất, đơn đã hủy không được tính"
- **Sửa thành:** "…chỉ tính số lượng trên các hóa đơn "Đã thanh toán" và "Còn nợ", trừ số lượng hàng trả của các phiếu đổi trả hoàn tất có ngày duyệt trong kỳ; hóa đơn "Đã hủy" không được tính"
- **Hiện tại (Exception 3a.1 và 4a.1):** "…và quay lại bước 5" 🟢
- **Sửa thành:** "…và quay lại bước 3"
- **Lý do:** Q19, Q21. Bước quay lại bị sai.

### 3.12. 🔴 UC_5.4 Xem báo cáo tồn kho
- **Hiện tại (BR02):**
  - "“Sắp hết hàng” khi số lượng tồn > 0 và ≤ mức tồn tối thiểu do chủ quy định"
  - "“Hết hạn” khi ngày hiện tại > hoặc = ngày hết hạn của sản phẩm và số lượng tồn >0"
- **Sửa thành:**
  - "“Sắp hết hàng” khi số lượng tồn của lô > 0 và ≤ ngưỡng cảnh báo hết hàng của mặt hàng"
  - "“Hết hàng” khi số lượng tồn của lô = 0"
  - "“Hết hạn” khi hạn sử dụng của lô nhỏ hơn ngày hiện tại và số lượng tồn > 0"
- **Hiện tại (Main flow bước 6):** "…tên sản phẩm, đơn vị tính, số lượng tồn, hạn sử dụng và trạng thái của từng sản phẩm"
- **Sửa thành:** "…mã lô, tên sản phẩm, đơn vị tính, số lượng tồn, hạn sử dụng và trạng thái của từng lô hàng"
- **Lý do:** Q13, Q14. Thống nhất với UC_3.2.

### 3.13. 🔴 UC_6.2 Xử lý đổi trả
- **Hiện tại (Pre-conditions):** "Nhân viên đã đăng nhập vào hệ thống."
- **Sửa thành:** "Nhân viên hoặc Chủ quán đã đăng nhập vào hệ thống."
- **Hiện tại (BR07):** "Phiếu đổi trả có các trạng thái: Chờ duyệt, Đã duyệt, Bị từ chối, Không hoàn tất."
- **Sửa thành:** "…Chờ duyệt, Đã duyệt, Từ chối, Không hoàn tất."
- **Hiện tại (BR08):** "Hóa đơn ở trạng thái nợ, không được đổi trả"
- **Sửa thành:** "Hóa đơn ở trạng thái "Còn nợ" không được đổi trả. Hóa đơn nợ đã được thanh toán đủ (trạng thái "Đã thanh toán") được đổi trả như hóa đơn thanh toán ngay."
- **Hiện tại (BR09):** "Thông tin trong phiếu đổi trả" (đang bỏ trống nội dung)
- **Sửa thành:** "Thông tin trong phiếu đổi trả gồm: mã phiếu, mã hóa đơn gốc, tên khách hàng, loại phiếu, các mặt hàng và số lượng đổi/trả, lý do đổi trả, tình trạng hàng, mô tả lỗi (nếu có), mặt hàng và số lượng đổi sang (nếu là đổi hàng), số tiền hoàn hoặc chênh lệch, người lập và thời gian lập."
- **Lý do:** Q9, Q18, thống nhất tên trạng thái; BR09 đang thiếu nội dung.

### 3.14. 🔴 UC_6.3 Hủy hóa đơn bán hàng
- **Hiện tại (BR01):** "Đang ở trạng thái Đã thanh toán hoặc “đã có hóa đơn nợ”"
- **Sửa thành:** "Đang ở trạng thái "Đã thanh toán" hoặc "Còn nợ""
- **Hiện tại (BR09):** "…Hệ thống không tự động mở khóa quyền mua nợ của khách, việc này do Chủ quán thực hiện riêng."
- **Sửa thành:** "…Sau khi hủy, quyền mua nợ của khách được hệ thống xác định lại theo UC_7.3 BR05."
- **Hiện tại (Post-condition 5):** "…và hệ thống ngừng nhắc nợ cho hóa đơn đó."
- **Sửa thành:** giữ nguyên câu, thêm: "Quyền mua nợ được xác định lại theo UC_7.3 BR05."
- **Đánh số BR:** đang nhảy từ BR09 sang BR11, cần đánh lại. 🟢
- **Lý do:** Q23. Không cần thêm UC khóa/mở quyền mua nợ thủ công.

### 3.15. 🟡 UC_6.4 Duyệt phiếu đổi trả
- **Hiện tại (BR01):** "Chỉ chủ quán mới có quyền duyệt hoặc từ chối phiếu đổi/trả. Nhân viên không được duyệt phiếu do mình lập."
- **Sửa thành:** "Chỉ Chủ quán mới có quyền duyệt hoặc từ chối phiếu đổi/trả. Phiếu do Chủ quán lập được Chủ quán tự duyệt."
- **Đánh số BR:** đang thiếu BR03, cần đánh lại. 🟢
- **Lý do:** Q9.

### 3.16. 🟡 UC_6.5 Tạo hóa đơn bán hàng: lô xuất, giá vốn, ca
- **Thêm BR12:** "Mỗi phần số lượng bán được ghi nhận kèm lô xuất và giá vốn (giá nhập tại thời điểm bán). Hóa đơn được gắn với ca làm việc đang mở và người bán."
- **Lý do:** Q10, Q20. Cần để hoàn đúng lô khi hủy hoặc đổi trả, và để tính lợi nhuận.

### 3.17. 🟢 UC_7.1 Tạo hóa đơn nợ
- **Hiện tại (BR05):** "Khi tạo hóa đơn nợ tại bước 10…"
- **Sửa thành:** "Khi tạo hóa đơn nợ tại bước 12…"
- **Thêm vào cuối BR03:** "Khách hàng có khoản nợ quá hạn bị khóa quyền mua nợ cho đến khi không còn khoản nợ quá hạn (UC_7.3 BR05)." 🟡
- **Lý do:** Bước bị sai; Q23.

### 3.18. 🟡 UC_7.3 Tạo phiếu thanh toán nợ
- **Hiện tại (BR03):** "Hóa đơn nợ được thanh toán đủ sẽ được đóng và cập nhật trạng thái không nợ"
- **Sửa thành:** "Hóa đơn nợ được thanh toán đủ chuyển sang trạng thái "Đã thanh toán"."
- **Hiện tại (BR05):** "Quyền mua nợ được mở khóa khi khách không còn khoản nợ quá hạn"
- **Sửa thành:** "Quyền mua nợ được hệ thống tự mở khóa khi khách không còn khoản nợ quá hạn, kể cả khi khoản nợ được giảm do hủy hóa đơn (UC_6.3)."
- **Lý do:** Q18, Q23.

### 3.19. 🟢 UC_7.4 Sửa khách quen
- **Hiện tại (BR03):** "CCCD gồm 12 chữ số và không được trùng với khách hàng khác đang hoạt động"
- **Sửa thành:** "…không được trùng với khách quen khác đang hoạt động"
- **Lý do:** Thống nhất với UC_7.5 BR03.

### 3.20. 🟡 UC_7.6 Xóa khách quen
- **Thêm BR04:** "Xóa khách quen là chuyển trạng thái khách quen sang "Đã xóa"; hồ sơ khách hàng vẫn được giữ. Khi thêm lại khách hàng này làm khách quen (UC_7.5), hệ thống dùng lại hồ sơ cũ."
- **Lý do:** Q24. Giữ lịch sử hóa đơn nợ theo BR03.

### 3.21. 🟢 UC_8.2 Sửa thông tin khách hàng
- **Hiện tại (Main flow bước 1):** "Chủ quán tìm khách hàng cần sửa (UC_7.2)"
- **Sửa thành:** "Người dùng tìm khách hàng cần sửa (UC_8.3)"
- **Hiện tại (BR04):** "…hệ thống xem là trùng và báo lỗi theo luồng 7a."
- **Sửa thành:** "…báo lỗi theo luồng 6d."

### 3.22. 🔴 UC_9.1 Lưu biên bản: mở ca và phân bổ vào lô
- **Hiện tại (BR05):** "…theo định dạng BB - ngày làm việc (dd/mm/yyyy) . số thứ tự trong ngày gồm 3 chữ số (VD: BB-25072016-001)…"
- **Sửa thành:** "…theo định dạng BB-ddmmyyyy-nnn, trong đó ddmmyyyy là ngày làm việc và nnn là số thứ tự trong ngày (VD: BB-25072016-001)…" 🟢
- **Hiện tại (BR07):** "Khi ca ở "Đang kết ca", hệ thống không cho phát sinh giao dịch nhập, xuất, bán, hủy."
- **Sửa thành:** "Khi ca ở "Đang kết ca", hệ thống không cho phát sinh giao dịch nhập, xuất, bán, hủy trên toàn cửa hàng."
- **Thêm BR11 (mở ca):** "Tại mỗi thời điểm cửa hàng chỉ có một ca ở trạng thái "Đang hoạt động" hoặc "Đang kết ca". Khi người dùng đăng nhập mà chưa có ca nào đang mở, hệ thống tự mở ca mới với người phụ trách là người vừa đăng nhập, giờ bắt đầu là thời điểm đăng nhập. Người dùng đăng nhập khi đã có ca đang mở thì giao dịch được ghi vào ca đó, kèm người thực hiện. Người dùng chọn "Kết ca" để chuyển ca sang "Đang kết ca" và nhập số lượng kiểm kê thực tế."
- **Thêm BR12 (phân bổ vào lô):** "Khi cập nhật tồn kho theo kết quả kiểm kê: nếu thiếu hàng, hệ thống trừ dần từ lô có hạn sử dụng gần nhất; nếu thừa hàng, hệ thống cộng vào lô có hạn sử dụng xa nhất của mặt hàng đó."
- **Lý do:** Q10, Q11. Báo cáo chưa mô tả việc mở ca, trong khi mọi hóa đơn đều phải gắn với một ca.

### 3.23. 🟢 UC_10.1 Thêm lô hàng
- **Hiện tại (BR08):** "…hệ thống tự cấp mã hóa đơn theo định dạng LO-xxxxxx…"
- **Sửa thành:** "…hệ thống hiển thị mã lô dự kiến theo định dạng LO-xxxxxx…; mã chỉ được ghi nhận khi lưu thành công…"
- **Đánh số BR:** đang thiếu BR06, cần đánh lại.
- **Main flow:** bước 7 "…và kết thúc" đứng trước bước 8–9. Chuyển chữ "kết thúc" xuống bước cuối.
- **Lý do:** Q16, lỗi đánh máy.

---

## 4. Chương NON-FUNCTIONAL REQUIREMENTS

### 4.1. 🟡 Availability NFR-02
- **Hiện tại:** "Hỗ trợ chế độ Offline: vẫn bán hàng và ghi nhận hóa đơn bình thường khi mất mạng/mất điện…"
- **Sửa thành:** "Hỗ trợ chế độ Offline (giai đoạn sau): vẫn bán hàng và ghi nhận hóa đơn khi mất kết nối mạng…"
- **Lý do:** Q3. Khi mất điện, máy tính tắt nên không thể bán hàng.

### 4.2. 🔴 Security NFR-01
- **Hiện tại:** "…Nhân viên chỉ có quyền bán hàng, xem tồn kho và tạo hóa đơn nợ."
- **Sửa thành:** "…Nhân viên có quyền bán hàng, tạo hóa đơn nợ, thu nợ, tra cứu tồn kho, quản lý thông tin khách hàng, lập phiếu đổi trả và kết ca."
- **Lý do:** Q7. Khớp với danh sách UC.

### 4.3. 🔴 Security NFR-03
- **Hiện tại:** "Nhân viên chỉ được hoàn tiền ở mức cho phép (đơn hàng/mặt hàng giá trị rất nhỏ, không cần chủ quán phê duyệt). Vượt mức đó phải do Chủ quán quyết định."
- **Sửa thành:** "Mọi khoản hoàn tiền cho khách qua phiếu đổi trả chỉ được thực hiện sau khi Chủ quán duyệt phiếu (UC_6.4)."
- **Lý do:** Q9.

### 4.4. 🟡 Security NFR-04 (đã xác nhận)
- **Hiện tại:** "Nhân viên và Chủ quán được xem lịch sử đổi trả trong ca. Ngoài giờ làm việc chỉ Chủ quán được xem."
- **Sửa thành:** "Nhân viên chỉ xem được lịch sử đổi trả khi cửa hàng có ca đang mở; Chủ quán được xem mọi lúc."
- **Lý do:** Bạn đã xác nhận đề xuất này khi duyệt Giai đoạn 0. Dựa vào Q10.

### 4.5. 🟡 Backup NFR-02
- **Hiện tại:** "Hỗ trợ khôi phục dữ liệu nhanh chóng thông qua số điện thoại đăng ký khi thay đổi máy tính/điện thoại."
- **Sửa thành:** "Dữ liệu được lưu tập trung trên máy chủ; khi thay đổi máy tính/điện thoại, người dùng chỉ cần đăng nhập lại để tiếp tục sử dụng."
- **Lý do:** Q27.

### 4.6. 🟢 Supportability NFR-03: nói rõ cách làm
- **Thêm vào cuối:** "Khi hai thao tác cùng sửa một dữ liệu, thao tác của Chủ quán được ghi nhận; Nhân viên nhận thông báo dữ liệu đã thay đổi và tải lại."

---

## 5. Chương THIẾT KẾ KIẾN TRÚC HỆ THỐNG (đang trống)

Đề xuất nội dung để điền:

- **Mô tả hệ thống:** Website gồm phần giao diện (React, TypeScript) chạy trên trình duyệt, gọi đến dịch vụ máy chủ (ASP.NET Core Web API, C#). Máy chủ lưu dữ liệu trong Microsoft SQL Server, truy cập qua Entity Framework Core.
- **Kiến trúc:** client–server ba lớp: giao diện, xử lý nghiệp vụ, dữ liệu. Phía máy chủ chia module theo nhóm chức năng: Tài khoản, Hàng hóa, Tồn kho, Bán hàng, Công nợ, Khách hàng, Kết ca, Báo cáo.
- **Ràng buộc phần mềm:**
  - Trình duyệt Chrome, Edge hoặc Cốc Cốc phiên bản mới.
  - Máy chủ chạy .NET 10 và SQL Server.
  - Máy quét mã vạch loại giả lập bàn phím (cắm USB là dùng được).

---

## 6. Chương PHÂN TÍCH SƠ ĐỒ LỚP và MÔ TẢ CƠ SỞ DỮ LIỆU

| # | Vị trí | Sửa |
|---|---|---|
| 6.1 🔴 | Thiết kế vật lý (toàn bộ) | Thay bằng nội dung [THIET_KE_DB_V2.md](THIET_KE_DB_V2.md) mục 3 |
| 6.2 🟡 | Thiết kế logic và Chuẩn hóa | Đổi tên cho thống nhất: ChiTietBienBan `SoLuongHeThong` → `SoLuongLyThuyet`; PhieuDieuChinhTon `SoLuongTon` → `SoLuongThucTe`; HoaDonNo và PhieuThanhToan dùng `MaKQ`; PhanBoThanhToan dùng `MaHDNo`. Thêm 7 bảng mới và các cột mới. |
| 6.3 🟡 | Sơ đồ CSDL (ERD) | Khóa chính KhachQuen là `MaKH` (không phải `MaKQ`); CaLamViec nối với NguoiDung (không phải NhanVien); thêm các cột và bảng mới |
| 6.4 🟡 | Sơ đồ lớp | HoaDon thêm quan hệ "lập" (người bán) đã có; ChiTietHoaDon thêm quan hệ với LoHang; CaLamViec thêm phương thức mở ca |
| 6.5 🟡 | Ước lượng dung lượng | Tính lại với cột mã VARCHAR(20) và các bảng mới |

---

## 7. Phần GIAO DIỆN

| # | Vị trí | Hiện tại | Sửa thành |
|---|---|---|---|
| 7.1 🔴 | Danh sách màn hình U10 "Điều chỉnh tồn kho" | Chủ quán, Nhân viên | Chủ quán |
| 7.2 🔴 | U14 "Xem chi tiết hàng hóa", U15 "Tìm kiếm hàng hóa" | Chủ quán, Nhân viên | Chủ quán |
| 7.3 🟢 | Đặc tả màn hình Kết ca: mã hàng ví dụ | HH-000004, HH-000005 | HH-0004, HH-0005 |
| 7.4 🟡 | Màn hình Thêm/Sửa hàng hóa | — | Thêm ô "Mã vạch" |
| 7.5 🟡 | Màn hình Báo cáo tồn kho | Cột theo sản phẩm | Thêm cột "Mã lô" |

---

## 8. Danh sách UC và sơ đồ use case

| # | Vị trí | Hiện tại | Sửa thành |
|---|---|---|---|
| 8.1 🟢 | Bảng danh sách use case, dòng 33 | Mã "10" | "10.1" |
| 8.2 🟡 | Sơ đồ use case | Không có "Quản lý lô hàng"; "10. Đăng xuất" | Thêm "10. Quản lý lô hàng"; đổi thành "11. Đăng xuất" |
| 8.3 🟢 | Bảng ánh xạ UC – màn hình (nhóm U20–U37) | Có dòng 1.1 và 1.2 | Xóa 2 dòng này (không có UC_1.1, UC_1.2) |
| 8.4 🟢 | Tiêu đề mục 3.6 | "Tạo hóa đơn nợ" | "Quản lý công nợ" (khớp Functional Scope) |

---

## 9. Bổ sung phát sinh khi code Giai đoạn 2

| # | Vị trí | Hiện tại | Sửa thành / cách đã làm | Mức |
|---|---|---|---|---|
| 9.1 | UC_2.1 BR02 + màn hình 2.2.5 | Màn hình có lỗi "Họ và tên không hợp lệ", BR không nêu quy tắc | Thêm vào BR02: "Họ và tên chỉ gồm chữ cái (kể cả tiếng Việt có dấu) và khoảng trắng, tối đa 100 ký tự." | 🟡 |
| 9.2 | UC_2.1 BR02 + màn hình 2.2.6 | Màn hình có lỗi "Ngày sinh không hợp lệ" (ví dụ năm 2015), BR không nêu quy tắc | Thêm vào BR02: "Ngày sinh phải trước ngày hiện tại và nhân viên đủ 15 tuổi." (*đề xuất: tuổi lao động tối thiểu*) | 🟡 |
| 9.3 | UC_2.1 luồng 6e | "Mật khẩu không đủ mạnh" | "Mật khẩu không đúng quy tắc" (khớp màn hình 2.2.10 và UC_2.3) | 🟢 |
| 9.4 | UC_2.1 luồng 8a | "Không thể lưu tài khoản, vui lòng thử lại sau" | "Thêm tài khoản không thành công. Vui lòng thử lại sau" (khớp màn hình 2.2.14) | 🟢 |
| 9.5 | UC_4.1 BR01, BR03 | BR03 ghi các ngưỡng "phải > 0", nhưng luồng 5a không bắt buộc nhập ngưỡng | Ghi rõ: "Ngưỡng cảnh báo không bắt buộc; nếu nhập thì phải > 0. Để trống thì mặt hàng không sinh cảnh báo tương ứng." | 🟡 |
| 9.6 | UC_4.3 BR01 và luồng 5b, màn hình 4.5.3 | BR01: hàng đã có giao dịch thì chuyển "Ngừng kinh doanh"; 5b và 4.5.3: "không được phép xóa" | Gộp lại: "Hàng đã phát sinh giao dịch (đã nhập lô hoặc đã bán) thì không được xóa vĩnh viễn. Hệ thống thông báo và, khi Chủ quán đồng ý, chuyển hàng sang “Ngừng kinh doanh”." | 🔴 |
| 9.7 | Màn hình 10.1, 10.2 | Mã lô ví dụ `LH-000001` | `LO-000001` (theo UC_10.1 BR08) | 🟢 |
| 9.8 | UC_3.2 BR02, BR03 | Không nói rõ lô đã hết hàng có sinh cảnh báo hạn hay không | Thêm: "Cảnh báo “Sắp hết hạn” và “Hết hạn” chỉ sinh cho lô còn hàng (số lượng tồn > 0)", thống nhất với UC_5.4 BR02 | 🟡 |
| 9.9 | UC_3.2 BR04 | "kiểm tra định kỳ mỗi ngày" | Ghi rõ giờ: "kiểm tra định kỳ lúc 00:05 mỗi ngày và khi khởi động hệ thống" | 🟢 |
| 9.10 | UC_3.2 main flow | Không nói danh sách có gồm cảnh báo đã xử lý không | Mặc định chỉ hiện cảnh báo "Chưa xử lý"; có tùy chọn hiện cả cảnh báo đã xử lý | 🟢 |

## 10. Bổ sung phát sinh khi code Giai đoạn 3

| # | Vị trí | Hiện tại | Sửa thành / cách đã làm | Mức |
|---|---|---|---|---|
| 10.1 | UC_8.3 BR02 và BR03 | BR02 cho phép "+84", BR03 lại cấm mọi ký tự ngoài chữ, số, khoảng trắng (tức cấm "+") | Thêm vào BR03: "…ngoại trừ tiền tố “+84” ở đầu số điện thoại (BR02)" | 🟡 |
| 10.2 | Kết ca – BR11 (quy tắc mở ca, mục 3.22) | Ca tự mở khi đăng nhập | Bổ sung: "…hoặc khi phát sinh giao dịch bán hàng mà cửa hàng chưa có ca đang mở (trường hợp ca vừa kết thúc trong lúc người dùng vẫn đăng nhập)" | 🟡 |
| 10.3 | UC_2.4 BR02, BR03 | "đang trong ca", "còn ca chưa đối soát" chưa định nghĩa | "Đang trong ca": nhân viên là người phụ trách ca ở trạng thái "Đang hoạt động". "Còn ca chưa đối soát": phụ trách ca ở trạng thái "Đang kết ca". "Có lịch sử ca": đã từng phụ trách ca | 🟡 |
| 10.4 | UC_6.1 BR01 và màn hình 6.1.1 | BR01: phải nhập ít nhất 1 điều kiện; màn hình 6.1.1 lại hiện "Tất cả hóa đơn" trước khi tìm | Giữ cả hai: mở màn hình thì hiện danh sách tất cả hóa đơn (mới nhất trước); bấm "Tìm kiếm" mà không có điều kiện thì báo "Vui lòng nhập ít nhất một điều kiện." | 🟢 |
| 10.5 | UC_6.1 BR02 – ngày lập | "có thể là một ngày hoặc một khoảng ngày" | Ghi rõ: chỉ nhập "Từ ngày" thì tìm đúng ngày đó; nhập cả hai thì tìm theo khoảng | 🟢 |
| 10.6 | Màn hình 6.5.1 | Tab lọc "Đồ uống / Thực phẩm / Hàng khác" | Tab lọc theo 11 danh mục của UC_4.1 BR06 (chỉ hiện danh mục đang có hàng) | 🟢 |
| 10.7 | UC_6.5 bước 10–14 | Không quy định mã cho khoản thu bán hàng | Mỗi lần thu (kể cả QR thất bại) tạo một phiếu thanh toán mã `PTT-dd/mm/yyyy.nnn`; hóa đơn chỉ tạo khi phiếu "Thành công" | 🟢 |
| 10.8 | UC_6.5 bước 6, 11.a | "Chính sách giảm giá" và "mã QR" | Giá bán đã gồm giảm giá (Q4). QR là bản giả lập: màn hình có nút chọn kết quả "Ngân hàng xác nhận / Thanh toán thất bại" (Q5) | 🟢 |

## 11. Bổ sung phát sinh khi code Giai đoạn 4

| # | Vị trí | Hiện tại | Sửa thành / cách đã làm | Mức |
|---|---|---|---|---|
| 11.1 | UC_7.5 BR (thêm khách quen) | Không nói trường hợp SĐT đã thuộc một khách hàng thường (UC_8.1) | Thêm: "Nếu SĐT đã thuộc một khách hàng chưa là khách quen, hệ thống nâng khách hàng đó thành khách quen và giữ nguyên mã KH. Nếu là khách quen đã xóa thì kích hoạt lại (Q24)." | 🟡 |
| 11.2 | UC_7.2 BR – trạng thái nợ | "Còn hạn (0–22 ngày), Sắp hết hạn (23–30), Quá hạn (> 30)" chưa nói tính từ mốc nào | Ghi rõ: "Số ngày tính từ ngày lập hóa đơn nợ cũ nhất chưa thanh toán đến hôm nay. Không còn hóa đơn nợ → “Không nợ”." | 🟡 |
| 11.3 | UC_7.1 bước 7–9, màn hình 6.6.5–6.6.7 | Không quy định thứ tự kiểm tra khi khách vi phạm nhiều điều kiện | Thứ tự: chưa là khách quen → vượt hạn mức → có nợ quá hạn; hiện thông báo của điều kiện đầu tiên vi phạm | 🟢 |
| 11.4 | Màn hình 6.6.12, 6.6.13 (luồng hóa đơn nợ) | "Gửi phiếu thanh toán điện tử thành công / không thành công" | "Gửi hóa đơn điện tử thành công / không thành công" (đang gửi hóa đơn, không phải phiếu thanh toán) | 🟢 |
| 11.5 | Màn hình 7.2.7 (luồng thu nợ) | Tiêu đề thẻ "Gửi hóa đơn điện tử" | "Gửi phiếu thanh toán điện tử" (code đang giữ đúng chữ của báo cáo) | 🟢 |
| 11.6 | Màn hình 7.4.2 | Tiêu đề "Sửa thông tin khách quen" trên màn hình Thêm khách quen | "Thêm khách quen" | 🟢 |
| 11.7 | Màn hình 7.3.1, 7.4.1, 7.4.2 | "Hiển thị cứng 4 quy tắc kiểm tra" nhưng không ghi nội dung | Điền 4 quy tắc: Họ tên (bắt buộc, chỉ chữ và khoảng trắng, ≤ 50 ký tự); SĐT (bắt buộc, 10 số, bắt đầu bằng 0, không trùng); CCCD (bắt buộc, 12 số, không trùng khách quen đang hoạt động); Địa chỉ (bắt buộc, ≤ 200 ký tự) | 🟢 |
| 11.8 | Màn hình 7.1.1 | Chỉ có 4 tab trạng thái, không có "Tất cả" | Mở màn hình thì hiện tất cả khách quen; bấm một tab để lọc, bấm lại tab đó để bỏ lọc | 🟢 |
| 11.9 | UC_7.3 bước 12.a (QR thất bại) | Không nói lần thu thất bại có lưu không | Lưu một phiếu thanh toán "Không thành công" với mã `PTT-…` thường; mã `PTTN-…` chỉ cấp cho phiếu thành công (BR06) | 🟢 |
| 11.10 | Màn hình 6.6.4 | "Kết quả tìm kiếm: 1 khách quen" | "Kết quả tìm kiếm: 1 khách hàng" – ô tìm trả về mọi khách hàng, khách chưa là khách quen sẽ nhận thông báo 6.6.5 khi bấm "Chọn" | 🟢 |

## 12. Bổ sung phát sinh khi code Giai đoạn 5

| # | Vị trí | Hiện tại | Sửa thành / cách đã làm | Mức |
|---|---|---|---|---|
| 12.1 | UC_6.2 main flow, UC_6.4 bước 4 | UC_6.4 hiển thị "Lý do đổi trả" nhưng UC_6.2 không có bước nhập lý do | Thêm vào bước 9: "Nhân viên nhập lý do đổi trả (bắt buộc) và chọn hình thức xử lý." Màn hình 6.2.16 có thêm ô "Lý do đổi trả" | 🟡 |
| 12.2 | UC_6.2 BR02 | "đã đổi trả", "đang xin đổi trả" chưa định nghĩa theo trạng thái phiếu | "Đã đổi trả" = tổng số lượng trên phiếu "Đã duyệt"; "đang xin" = phiếu "Chờ duyệt". Phiếu "Từ chối" và "Không hoàn tất" không giữ số lượng | 🟡 |
| 12.3 | UC_6.3 BR01.3 | "Chưa có phiếu đổi trả, kể cả phiếu đang chờ duyệt" | Thêm: "Phiếu bị từ chối hoặc không hoàn tất không làm thay đổi hóa đơn nên không chặn việc hủy" | 🟡 |
| 12.4 | UC_6.2 post-condition, màn hình 6.2.13 → 6.2.20 | Hàng lỗi do nhà sản xuất (ví dụ nắp chai rò dầu) vẫn được cộng lại vào tồn kho bán | **Đã chốt: giữ như báo cáo** – hàng trả, kể cả hàng lỗi nhà sản xuất, được cộng lại vào lô đã bán. Chủ quán điều chỉnh tồn (UC_3.3) khi trả hàng lỗi cho nhà cung cấp. Thêm câu này vào post-condition UC_6.2 cho rõ | 🟡 |
| 12.5 | NFR-04 | "Ngoài giờ làm việc chỉ Chủ quán được xem lịch sử đổi trả" | **Đã chốt và đã làm (Giai đoạn 8d):** "giờ làm việc" = cửa hàng có ca ở trạng thái "Đang hoạt động" hoặc "Đang kết ca". Sửa NFR thành: "Nhân viên chỉ được xem phiếu đổi trả khi cửa hàng có ca đang mở; khi không có ca nào đang mở, chỉ Chủ quán được xem." | 🟡 |
| 12.6 | Màn hình 6.2.17, 6.2.25, 6.2.33, 6.2.36 | Mã phiếu ví dụ `PT-03/11/2026.001`, `PD-03/11/2026.001` | `PDT-03/11/2026.001` (khớp màn hình 6.4 và thiết kế CSDL) | 🟢 |
| 12.7 | Màn hình 6.2.8, 6.2.9 | 6.2.8 (hóa đơn còn nợ) có tiêu đề "Hóa đơn đã hủy · không được đổi trả"; 6.2.9 hiện thông báo "Hóa đơn đã bị hủy." | Tiêu đề "Hóa đơn còn nợ · không được đổi trả", thông báo "Hóa đơn nợ." | 🟢 |
| 12.8 | Màn hình 6.3.22, 6.3.24 | "Không tự mở khóa mua nợ" / "Quyền mua nợ không tự mở khóa" | "Quyền mua nợ được hệ thống xác định lại" (theo Q23 và mục 3.14) | 🟢 |
| 12.9 | Màn hình 6.2.34 (đổi ngang giá đã duyệt) | "Tải lại kết quả duyệt… khi kho đã được cập nhật" – không nói ai cập nhật kho | Nhân viên bấm "Xác nhận đổi hàng" để giao hàng mới và cập nhật kho (giống bước 14 "xác nhận trên hệ thống") | 🟢 |
| 12.10 | UC_6.2 bước 6, 9.a.1 | Không nói một phiếu có nhiều mặt hàng không | Một phiếu có thể gồm nhiều mặt hàng của cùng hóa đơn (màn hình 6.2.10 có ô chọn từng dòng). Phiếu đổi: mỗi mặt hàng trả chọn một hàng mới. Tình trạng hàng ghi chung cho cả phiếu | 🟢 |
| 12.11 | UC_6.4 luồng 8a, màn hình 6.4.8 | Mất mạng thì lưu tạm và tự gửi khi có mạng | Làm sau MVP cùng chế độ offline (Q3). Kết quả duyệt được lưu ngay vào CSDL và hiện ở chuông thông báo của người lập phiếu | 🟢 |
| 12.12 | UC_6.4 BR08, phần Giao diện | Không có màn hình nhận kết quả duyệt | Thêm chuông thông báo trên thanh tiêu đề; bấm vào thông báo mở phiếu đổi trả | 🟢 |
| 12.13 | Màn hình 6.2.1 | Không có cách mở lại phiếu đã gửi duyệt sau khi rời màn hình | Thêm khối "Phiếu đổi trả đang xử lý" dưới danh sách hóa đơn (phiếu chờ duyệt hoặc đã duyệt chưa hoàn tất; Nhân viên chỉ thấy phiếu mình lập) | 🟢 |
| 12.14 | UC_6.2 luồng 14.a.7.3.a.1 | "Thành toán không thành công" | "Thanh toán chưa thành công" (khớp màn hình 6.2.29) | 🟢 |

## 13. Bổ sung phát sinh khi code Giai đoạn 6

| # | Vị trí | Hiện tại | Sửa thành / cách đã làm | Mức |
|---|---|---|---|---|
| 13.1 | Màn hình 9.1.1 | Không có nút đưa ca sang "Đang kết ca"; cột "Tồn thực tế" ghi "Dữ liệu từ hệ thống" | Thêm màn hình ca "Đang hoạt động" có nút "Kết ca" (hỏi xác nhận vì sẽ khóa giao dịch toàn quán, mục 3.22). Cột "Tồn thực tế" là ô nhập, mặc định bằng tồn lý thuyết | 🟡 |
| 13.2 | UC_9.1 BR09 | Không nói biên bản gồm những mặt hàng nào | Gồm mọi mặt hàng đã từng có lô: đang kinh doanh, hoặc ngừng kinh doanh nhưng còn tồn. Mặt hàng chưa nhập lô nào không có trong biên bản | 🟡 |
| 13.3 | UC_9.1 BR08 | Không nói tồn có tính lô đã hết hạn không | Tồn lý thuyết là tổng tồn mọi lô, kể cả lô đã hết hạn (hàng vẫn nằm trong quán, cần đếm khi kiểm kê) | 🟡 |
| 13.4 | Màn hình 9.1.1, 9.2.4 | Mã hàng ví dụ `HH-000004` | `HH-0004` (theo UC_4.1 BR04, Q16) | 🟢 |
| 13.5 | UC_9.1 BR05 | Số thứ tự biên bản "trong ngày" theo ngày làm việc | Đếm theo ngày lưu biên bản. Hai ngày này chỉ khác nhau khi ca kéo dài qua nửa đêm | 🟢 |
| 13.6 | Màn hình 9.2.1 | Bảng danh sách không có cột thao tác | Thêm cột "Hành động" với nút "Xem" để mở chi tiết (UC_9.2 bước 5) | 🟢 |
| 13.7 | Màn hình 9.1.3 | Sau khi đóng thông báo chỉ ở lại biên bản | Thêm nút "Xem biên bản" chuyển sang danh sách biên bản (UC_9.2) | 🟢 |

## 14. Bổ sung phát sinh khi code Giai đoạn 7

Bổ sung cho các mục 3.9–3.12 (đã chốt từ Giai đoạn 0).

| # | Vị trí | Hiện tại | Sửa thành / cách đã làm | Mức |
|---|---|---|---|---|
| 14.1 | UC_5.1, 5.2, 5.3 luồng 5a | "Trong kỳ báo cáo không có giao dịch bán hàng" | "Trong kỳ báo cáo không có hóa đơn nào và không có phiếu đổi trả hoàn tất nào có ngày duyệt trong kỳ." Kỳ chỉ có phiếu đổi trả vẫn hiện báo cáo (doanh thu có thể âm), để cộng các kỳ lại vẫn khớp tổng | 🟡 |
| 14.2 | UC_5.1 BR08, UC_5.2 BR07, luồng 12b | "Kỳ so sánh không được trùng với kỳ báo cáo" | "Kỳ so sánh không được có ngày nào chung với kỳ báo cáo." Ví dụ kỳ báo cáo tháng 11 thì không so sánh với quý 4 cùng năm | 🟡 |
| 14.3 | UC_5.1 BR07, UC_5.2 BR06 | Tỷ lệ = chênh lệch / kỳ so sánh × 100 | Thêm: "Nếu chỉ tiêu kỳ so sánh bằng 0 thì không tính tỷ lệ (hiển thị “—”). Mẫu số lấy giá trị tuyệt đối để tỷ lệ cùng dấu với mức chênh lệch." Tỷ lệ làm tròn 1 chữ số thập phân (như ví dụ “+18,4%”) | 🟡 |
| 14.4 | UC_5.3 BR02 (bổ sung mục 3.11), BR05 | Chỉ nói trừ hàng trả; "sản phẩm không bán được" chưa nói gồm hàng nào | Số lượng bán = số lượng trên hóa đơn − hàng trả + hàng đổi mới của phiếu đổi trả hoàn tất có ngày duyệt trong kỳ. Top bán chậm gồm mọi hàng **đang kinh doanh**; hàng ngừng kinh doanh chỉ xuất hiện nếu có bán trong kỳ | 🟡 |
| 14.5 | UC_5.2 bước 7 | Không nói hóa đơn ghi nợ đã trả hết và tiền đổi trả tính vào phương thức nào | Hóa đơn ghi nợ luôn tính vào "Ghi nợ" (theo BR04, kể cả khi khách đã trả hết). Tiền hoàn / thu thêm của phiếu đổi trả tính vào phương thức thực tế (tiền mặt hoặc chuyển khoản). Tổng ba phương thức bằng tổng doanh thu | 🟡 |
| 14.6 | UC_5.1–5.3 BR01 (Q21) | Không có thông báo khi kỳ vượt quá ngày hiện tại | *Đề xuất* thông báo "Kỳ báo cáo không được vượt quá ngày hiện tại!". Lịch không cho chọn ngày, tháng, quý trong tương lai; tháng / quý đang diễn ra được tính đến hết hôm nay | 🟡 |
| 14.7 | UC_5.4 BR02 (bổ sung mục 3.12), màn hình 5.4.1 | Không nói lô đã bán hết từ lâu có hiện "Hết hàng" mãi không; lô bình thường hiện trạng thái gì | Lô đã bán hết chỉ hiện "Hết hàng" khi mặt hàng chưa có lô nào nhập sau nó (giống cảnh báo "Hết hàng" được đóng khi thêm lô mới, mục 3.4). Lô không thuộc trạng thái nào hiện "Còn hàng" ở tab "Tất cả". Một lô có thể có hai trạng thái (ví dụ "Sắp hết hàng, Sắp hết hạn"). Chỉ gồm hàng đang kinh doanh | 🟡 |
| 14.8 | Thiết kế CSDL – bảng ChiTietDoiTra | Không lưu giá vốn của hàng đổi mới | Thêm cột `GiaVonHangMoi DECIMAL(15,0) NULL` = giá nhập lúc xuất hàng mới, để báo cáo lợi nhuận tính đúng giá vốn (giống `ChiTietHoaDon.GiaVon`, Q20). Phiếu hoàn tất trước khi có cột được điền bằng giá nhập hiện tại | 🟡 |
| 14.9 | UC_5.1, 5.2 luồng 13a1 | "Không tìm thấy dữ liệu của kỳ so sánh" | "Không tìm thấy dữ liệu của kỳ so sánh!" (khớp màn hình 5.1.21, 5.2.21) | 🟢 |
| 14.10 | Phần Giao diện, mục báo cáo doanh thu | Tiêu đề "5.3.3. Màn hình Báo cáo doanh thu: chọn xem theo quý" | "5.2.3. …" | 🟢 |
| 14.11 | Màn hình 5.3.9, 5.3.11, 5.4.1 | Ví dụ "Gạo ST25 / Thực phẩm khô / Kg", "Mỳ tôm / Kg" | Dùng nhóm hàng và đơn vị tính trong danh sách cố định (UC_4.1 BR05, BR06), ví dụ "Gạo & Nông sản khô / gói", "Mì tôm / gói". Màn hình 5.4.1 thêm cột "Mã lô" (mục 3.12) | 🟢 |

## 15. Bổ sung phát sinh khi code Giai đoạn 8

| # | Vị trí | Hiện tại | Sửa thành / cách đã làm | Mức |
|---|---|---|---|---|
| 15.1 | NFR Usability-02, phần tích hợp "Bộ phát âm thanh (loa)" | "Tích hợp tính năng đọc to số tiền khi tính tiền" – không nói đọc lúc nào | "Hệ thống đọc to: tổng tiền cần thanh toán khi chuyển sang bước thanh toán; số tiền đã nhận và tiền trả lại khi thu tiền mặt; số tiền đã nhận khi chuyển khoản thành công (bán hàng, thu nợ, thu thêm khi đổi hàng); số tiền hoàn lại khách khi đổi trả. Người dùng bật/tắt đọc to trên từng máy." Dùng giọng đọc tiếng Việt có sẵn của trình duyệt | 🟡 |
| 15.2 | NFR Backup and Recovery-01 | "Dữ liệu được sao lưu tự động hằng ngày (cuối ngày)" | Thêm: "Sao lưu lúc 23:30 hằng ngày (cấu hình được), giữ bản sao lưu 14 ngày gần nhất. Nếu máy chủ tắt vào giờ sao lưu thì hệ thống sao lưu bù ngay khi khởi động lại. Sao lưu thất bại thì Chủ quán nhận thông báo." *Đề xuất* thêm màn hình "Sao lưu dữ liệu" (chỉ Chủ quán, mở từ Tài khoản cá nhân): xem các bản sao lưu và nút "Sao lưu ngay". Báo cáo hiện chưa có màn hình này | 🟡 |

| 15.3 | Phần tích hợp "Đồng bộ với thiết bị di động" | "Đồng bộ dữ liệu theo thời gian thực giữa máy tính tại quầy và điện thoại" – không nói cách làm | "Điện thoại của Chủ quán mở cùng website (giao diện tự co cho màn hình nhỏ, menu dạng ngăn kéo). Dữ liệu chỉ có một nơi là máy chủ; khi một máy thay đổi dữ liệu, các máy đang mở web được báo ngay và tự cập nhật màn hình. Thanh tiêu đề hiện trạng thái “Trực tuyến / Mất kết nối”." Không làm ứng dụng di động riêng (đúng Out of scope) | 🟡 |

| 15.4 | NFR Availability-02, 03 | "Vẫn bán hàng và ghi nhận hóa đơn bình thường khi mất mạng… Dữ liệu hóa đơn được lưu tạm cục bộ… tự động đồng bộ" | Ghi rõ phạm vi: "Khi mất mạng, máy bán vẫn bán hàng **thanh toán tiền mặt**; chuyển khoản QR, ghi nợ, đổi trả, hủy hóa đơn, thu nợ, kết ca và thêm lô cần có mạng. Hóa đơn bán lúc mất mạng là **hóa đơn tạm** (mã `TAM-…`), được lưu trên máy và tự gửi lên máy chủ khi có mạng; mã hóa đơn chính thức `HD-dd/mm/yyyy.nnn` được cấp lúc đồng bộ, theo ngày bán thật." *Đề xuất* thêm màn hình "Hóa đơn tạm (offline)" trong Quản lý bán hàng | 🟡 |
| 15.5 | NFR Concurrency ("ưu tiên dữ liệu Chủ quán khi xung đột"), UC_6.5 BR10 | Không nói xử lý thế nào khi hóa đơn bán offline không còn hợp lệ lúc đồng bộ | "Khi đồng bộ, nếu không đủ tồn (máy khác đã bán), giá bán đã đổi hoặc hàng đã ngừng kinh doanh, hóa đơn tạm chuyển sang “Chờ Chủ quán xử lý” và Chủ quán nhận thông báo. Chủ quán “Ghi nhận” (theo giá khách đã trả; điều chỉnh tồn trước nếu thiếu) hoặc “Hủy” kèm lý do." Hóa đơn tạm chỉ được đồng bộ bởi chính người bán hoặc Chủ quán | 🟡 |
| 15.6 | UC_9.1 (kết ca) | Không nói về hàng bán offline chưa đồng bộ | Thêm: "Máy còn hóa đơn tạm chưa đồng bộ thì không lưu được biên bản kết ca trên máy đó." Hạn chế còn lại: máy khác không biết hóa đơn tạm của một máy đang mất mạng, nên kết ca ở máy khác có thể lệch đúng số hàng đó (ghi nguyên nhân trong biên bản) | 🟡 |

| 15.7 | Phần tích hợp "Chuyển khoản QR qua ngân hàng", UC_6.5 bước 11 | Không nói cách hệ thống biết khách đã chuyển khoản | "Mã QR là VietQR của tài khoản cửa hàng, kèm số tiền và nội dung chuyển khoản là mã tham chiếu riêng của giao dịch. Dịch vụ theo dõi biến động số dư báo tiền vào cho hệ thống; hệ thống đối chiếu mã tham chiếu và số tiền rồi mới ghi nhận thanh toán. Mỗi giao dịch ngân hàng chỉ dùng cho một lần thanh toán." Bản hiện tại chạy giả lập cho tới khi cấu hình tài khoản thật (README) | 🟡 |

## Thống kê

Đếm theo từng mục đánh số. Một số mục có thêm vài lỗi 🟢 nhỏ nằm bên trong, không đếm riêng.

| Mức | Số mục |
|---|---|
| 🔴 Mâu thuẫn với code | 19 |
| 🟡 Chưa rõ hoặc lệch nhỏ | 48 |
| 🟢 Chính tả, đánh số | 35 |
| Chương Kiến trúc (điền mới) | 1 |
