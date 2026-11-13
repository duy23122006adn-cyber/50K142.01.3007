# Kiểm thử hệ thống Xóm Nhỏ

Test case được xây dựng từ đặc tả 34 use case trong báo cáo `NHÓM_1_PTTKHTTT.docx`, có đối chiếu các điều chỉnh trong `docs/SUA_BAO_CAO.md`. Mỗi test case ghi rõ nguồn: luồng chính, luồng thay thế, ngoại lệ hoặc BR.

Kết quả của lần chạy gần nhất nằm trong file **`docs/KiemThu_XomNho.xlsx`**:
- sheet *Tổng hợp* thống kê theo từng UC;
- mỗi nhóm chức năng có một sheet riêng;
- ảnh chụp màn hình của các test giao diện nằm ở `kiem-thu/ket-qua/anh/`.

## Thành phần

| File | Nội dung |
|---|---|
| `lib.mjs` | Gọi API, kiểm tra kết quả, chạy SQL trên CSDL kiểm thử để lùi ngày dữ liệu thử |
| `tc-01` … `tc-08` | Test case qua API, chia theo nhóm chức năng và chạy theo thứ tự |
| `chay.mjs` | Chạy toàn bộ test API, ghi `ket-qua/ket-qua-api.json` |
| `giao-dien.mjs` | Test trên giao diện bằng Microsoft Edge (headless), ghi `ket-qua/ket-qua-giao-dien.json` và ảnh chụp |
| `xuat-excel.mjs` | Gộp kết quả thành `docs/KiemThu_XomNho.xlsx` |

Chỉ cần Node 22 trở lên, Edge và `sqlcmd`, không cài thêm thư viện nào.

## Chạy lại

Bộ test chạy trên **CSDL riêng `XomNho_KiemThu`**, không đụng tới dữ liệu `XomNho` đang dùng.

1. Tạo CSDL kiểm thử (chỉ làm lần đầu). Lệnh này áp các migration đã có:
   ```powershell
   cd backend
   dotnet ef database update --project src/XomNho.Api --connection "Server=localhost;Database=XomNho_KiemThu;Trusted_Connection=True;TrustServerCertificate=True;"
   ```
2. Chạy backend kiểm thử ở cổng 5104:
   ```powershell
   $env:ASPNETCORE_ENVIRONMENT='Development'; $env:ASPNETCORE_URLS='http://localhost:5104'
   $env:ConnectionStrings__XomNho='Server=localhost;Database=XomNho_KiemThu;Trusted_Connection=True;TrustServerCertificate=True;'
   $env:SaoLuu__BatTuDong='false'
   $env:TichHop__NganHang__CheDo='GiaLap'   # luôn giả lập QR, kể cả khi appsettings.Development.local.json bật tài khoản thật
   dotnet run --project src/XomNho.Api --no-launch-profile
   ```
3. Chạy frontend kiểm thử ở cổng 5180, trỏ vào backend 5104:
   ```powershell
   cd frontend; $env:XOMNHO_API='http://localhost:5104'; npx vite --port 5180 --strictPort
   ```
4. Ở thư mục gốc dự án:
   ```powershell
   node kiem-thu/chay.mjs        # test qua API
   node kiem-thu/giao-dien.mjs   # test giao diện
   node kiem-thu/xuat-excel.mjs  # xuất Excel
   ```

Có thể chạy lại nhiều lần trên cùng CSDL vì mỗi lần chạy dùng tên và số điện thoại riêng. Luôn chạy **toàn bộ** `chay.mjs`, vì dữ liệu tạo ở nhóm trước được dùng cho nhóm sau.

## Các luồng phụ thuộc thời gian

Một số luồng chỉ xảy ra sau một khoảng thời gian: OTP quá 5 phút, đổi trả ở ngày thứ 7 và thứ 8, nợ quá 30 ngày hoặc sắp hết hạn, lô hết hạn. Để thử các luồng này, bộ test lùi ngày của **dữ liệu thử** trong CSDL kiểm thử bằng SQL. Chi tiết từng trường hợp được ghi ở cột "Tiền điều kiện".
