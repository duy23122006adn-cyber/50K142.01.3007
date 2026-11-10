# Kế hoạch triển khai: Hệ thống quản lý bán hàng tạp hóa Xóm Nhỏ

> Nguồn yêu cầu: `NHÓM_1_PTTKHTTT.docx` (SRS Nhóm 1, lớp 50K14.2).
> Nguyên tắc: code phải khớp với báo cáo. Khi các phần của báo cáo mâu thuẫn nhau, ưu tiên use case chi tiết và đặc tả màn hình hơn phần tổng quan, và chọn phương án ít phải sửa báo cáo nhất.
>
> Trạng thái hiện tại: **Giai đoạn 4 đã xong**, chờ duyệt trước khi sang Giai đoạn 5. Cách chạy: xem [README.md](README.md).

---

## 1. Công nghệ

| Phần | Công nghệ | Ngôn ngữ |
|---|---|---|
| Backend | ASP.NET Core Web API, .NET 10 (LTS), Entity Framework Core | C# |
| Frontend | React 19, Vite, Node 24 LTS | TypeScript (`.tsx`), CSS |
| Cơ sở dữ liệu | Microsoft SQL Server | T-SQL |

- Báo cáo không nêu tên công nghệ. SQL Server được chọn vì thiết kế vật lý viết bằng cú pháp T-SQL.
- Tên bảng và tên cột giữ nguyên như báo cáo (tiếng Việt không dấu: `HoaDon`, `MaHD`, ...).
- Migration chỉ chạy khi chủ dự án cho phép.

---

## 2. Các quyết định đã chốt (28 câu)

### Phạm vi và công nghệ

1. Stack như mục 1.
2. Web chạy trên server (cloud); khi phát triển thì chạy trên máy cá nhân.
3. Offline làm sau MVP.
4. Không làm chương trình khuyến mãi; chỉ dùng giá đã giảm tính sẵn vào giá bán (UC_6.5 BR7).
5. Tích hợp ngoài được giả lập: tạo mã QR kèm nút giả lập "ngân hàng xác nhận / thất bại"; SMS/Zalo chỉ ghi log.
6. Chỉ có "Thêm lô hàng" (UC_10.1); không làm nhập hàng hay nhà cung cấp.

### Phân quyền

7. Quyền Nhân viên lấy theo các UC. UC_3.3 (điều chỉnh tồn) và UC_4.4 (tìm kiếm hàng hóa) **chỉ Chủ quán** dùng được.
8. Không có vai trò "Người nhà"; người nhà dùng một tài khoản Nhân viên.
9. Mọi phiếu đổi trả đều phải duyệt. Chủ quán tự lập phiếu thì được tự duyệt.

### Ca làm việc và kết ca

10. Toàn quán chỉ có **1 ca mở tại một thời điểm**. Ca tự mở khi có người đăng nhập mà chưa có ca nào đang mở; người mở là người phụ trách ca. Hóa đơn ghi cả ca và người bán.
11. Khi ca ở trạng thái "Đang kết ca", khóa giao dịch của toàn quán. Chênh lệch kiểm kê được phân vào lô như sau: thiếu thì trừ lô có hạn gần nhất trước, thừa thì cộng vào lô có hạn xa nhất.
12. Không đối soát tiền mặt; kết ca chỉ đối soát hàng.

### Tồn kho và hàng hóa

13. Cảnh báo tính theo **lô**. Khi thêm lô mới, các cảnh báo hàng và hạn của lô cũ cùng mặt hàng chuyển sang "Đã xử lý".
14. Hàng tính là hết hạn khi **HSD < hôm nay**. Mọi lô đều phải có HSD (`HanSuDung` NOT NULL).
15. Thêm cột `MaVach` (cho phép trống, không được trùng). Danh mục và đơn vị tính là danh sách cố định, nạp sẵn.
16. Mở form thì hiển thị mã dự kiến; mã chỉ được chốt khi lưu thành công. Định dạng mã hàng là `HH-xxxx`.

### Bán hàng, đổi trả, báo cáo

17. Thời hạn đổi trả cố định **7 ngày**.
18. Hóa đơn nợ trả hết thì chuyển sang "Đã thanh toán" và được phép đổi trả.
19. Phần đổi trả được trừ vào doanh thu của **kỳ duyệt phiếu**. Hóa đơn "hoàn tất" gồm cả "Đã thanh toán" và "Còn nợ".
20. Thêm cột `GiaVon` vào `ChiTietHoaDon`, lưu giá nhập tại thời điểm bán.
21. Kỳ báo cáo cho phép ngày bắt đầu bằng ngày kết thúc, và không được có ngày trong tương lai.

### Công nợ và khách hàng

22. Hạn mức nợ cố định 1.000.000đ; thời hạn trả 30 ngày.
23. Khách bị chặn mua nợ khi có khoản nợ quá hạn, và tự được mua lại khi hết khoản quá hạn (kể cả sau khi hủy hóa đơn).
24. Khách quen bị xóa mềm (trạng thái "Đang hoạt động / Đã xóa"). Thêm lại khách cũ thì dùng lại bản ghi cũ.

### Tài khoản và bảo mật

25. OTP được gửi đến SĐT Chủ quán. Chủ quán báo mã cho người dùng; người dùng nhập mã trong vòng 5 phút. Nếu Chủ quán không báo mã thì coi như từ chối.
26. Tài khoản có 3 trạng thái: Hoạt động / Khóa tạm / Ngừng hoạt động. UC_2.2 không cho sửa trạng thái; muốn ngừng tài khoản thì dùng UC_2.4.
27. Dữ liệu nằm trên server nên đổi máy chỉ cần đăng nhập lại. Sao lưu hằng ngày làm sau MVP.
28. Lập thiết kế DB phiên bản 2: giữ mã nghiệp vụ làm khóa chính và nới cột mã lên VARCHAR(20).

---

## 3. Các giai đoạn

Thứ tự phụ thuộc: Tài khoản → Hàng hóa → Lô/Tồn kho → Ca làm việc → Khách hàng → Bán hàng → Công nợ → Hủy/Đổi trả → Kết ca → Báo cáo → Tích hợp thật

| GĐ | Nội dung | Use case | Trạng thái |
|---|---|---|---|
| **0** | Thiết kế DB phiên bản 2 ([docs/THIET_KE_DB_V2.md](docs/THIET_KE_DB_V2.md)) và danh sách chỗ cần sửa trong báo cáo ([docs/SUA_BAO_CAO.md](docs/SUA_BAO_CAO.md)). Chưa có code. | — | ✅ Đã duyệt |
| 1 | Nền tảng: khung dự án, các bảng lõi, đăng nhập (khóa sau 10 lần sai, OTP giả lập), đổi mật khẩu, đăng xuất, phân quyền, nhật ký thao tác, bộ sinh mã | UC_1, 2.3, 11 | ✅ Xong (56 unit test, 22 bước E2E) |
| 2 | Quản lý nhân viên, hàng hóa, lô hàng, tìm kiếm và điều chỉnh tồn, cảnh báo tồn kho (kèm tác vụ kiểm tra hằng ngày) | UC_2.1, 2.2, 2.4, 4.1–4.4, 10.1, 3.1–3.3 | ✅ Xong (96 unit test, 30 bước E2E) |
| 3 | Tự mở ca, quản lý khách hàng, bán hàng (tiền mặt + QR giả lập), lịch sử bán hàng | UC_8.1–8.3, 6.5, 6.1 | ✅ Xong (126 unit test, 25 bước E2E) |
| 4 | Khách quen và công nợ: hóa đơn nợ từ màn hình bán hàng, tìm/thêm/sửa/xóa khách quen, thu nợ theo thứ tự cũ nhất (tiền mặt + QR giả lập), tự khóa/mở quyền mua nợ | UC_7.1–7.6 | ✅ Xong (148 unit test, 34 bước E2E) |
| 5 | Hủy hóa đơn, đổi trả và duyệt phiếu | UC_6.3, 6.2, 6.4 | ☐ |
| 6 | Kết ca và biên bản | UC_9.1, 9.2 | ☐ |
| 7 | Báo cáo lợi nhuận, doanh thu, số lượng bán, tồn kho | UC_5.1–5.4 | ☐ |
| 8 | Sau MVP: QR ngân hàng thật, SMS/Zalo, OTP qua SMS, đọc to số tiền, sao lưu, offline, đồng bộ điện thoại | — | ☐ |

---

## 4. Phạm vi MVP

**Có trong MVP (giai đoạn 1–7):** toàn bộ 34 use case trong báo cáo. Riêng các tích hợp ngoài (ngân hàng, SMS/Zalo, OTP) được giả lập.

**Làm sau MVP (giai đoạn 8):**
- QR có xác nhận tự động từ ngân hàng.
- Gửi hóa đơn điện tử qua SMS/Zalo.
- OTP qua SMS thật.
- Đọc to số tiền.
- Sao lưu tự động.
- Chế độ offline.
- Đồng bộ thời gian thực với điện thoại.

**Không làm:** khuyến mãi, nhập hàng/nhà cung cấp, đối soát tiền mặt cuối ca, vai trò "Người nhà".

---

## 5. Chỗ cần sửa trong báo cáo (tóm tắt)

Danh sách chi tiết, kèm câu chữ hiện tại và câu chữ đề xuất: [docs/SUA_BAO_CAO.md](docs/SUA_BAO_CAO.md).

| Phần trong báo cáo | Cần sửa |
|---|---|
| Out of scope | Thời hạn đổi trả "3–7 ngày" → "7 ngày" |
| User Scope | Bỏ "thiết lập hạn mức nợ", "hoàn tiền trong mức cho phép"; ghi rõ người nhà dùng tài khoản Nhân viên |
| Mục tiêu kinh doanh 5 (khuyến mãi) | Ghi rõ là giai đoạn sau |
| NFR Availability-02 | "mất mạng/mất điện" → "mất mạng" |
| NFR Security-01, Security-03 | Liệt kê lại quyền Nhân viên theo các UC; bỏ "hoàn tiền không cần duyệt" |
| NFR Backup-02 | Diễn giải lại việc khôi phục dữ liệu |
| UC_2.2 | Bỏ "trạng thái làm việc" khỏi danh sách trường được sửa |
| UC_3.3 | Bỏ "Nhân viên" khỏi Actors |
| UC_5.2, UC_5.3 BR01 | Đổi "<" thành "≤" |
| UC_5.1 BR03, UC_5.2 BR02 | Sửa câu "đơn trả hàng không được tính" cho khớp UC_6.2 BR06 |
| UC_5.4 BR02 | Cảnh báo tính theo lô; hết hạn khi HSD < hôm nay |
| UC_6.3 BR09 | Quyền mua nợ được tính lại theo UC_7.3 BR05 |
| Kết ca (Business rules) | Thêm quy tắc mở ca và quy tắc phân bổ chênh lệch kiểm kê vào lô |
| Màn hình U10, U14, U15 | Chỉ Chủ quán |
| Màn hình Kết ca | Ví dụ mã hàng `HH-000004` → `HH-0004` |
| Thiết kế CSDL vật lý | Cập nhật theo DB phiên bản 2 |
| Chương "Thiết kế kiến trúc hệ thống" | Điền nội dung (đang trống) |
