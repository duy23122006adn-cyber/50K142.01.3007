# Hệ thống quản lý bán hàng tạp hóa Xóm Nhỏ

Đồ án Phân tích & Thiết kế HTTT – Nhóm 1, lớp 50K14.2. Yêu cầu gốc: `NHÓM_1_PTTKHTTT.docx`.

| Tài liệu | Nội dung |
|---|---|
| [KE_HOACH.md](KE_HOACH.md) | 28 quyết định đã chốt, các giai đoạn, tiến độ |
| [docs/THIET_KE_DB_V2.md](docs/THIET_KE_DB_V2.md) | Thiết kế cơ sở dữ liệu phiên bản 2 |
| [docs/SUA_BAO_CAO.md](docs/SUA_BAO_CAO.md) | Những chỗ cần sửa trong báo cáo cho khớp với code |

## Cấu trúc

```
backend/
  src/XomNho.Api/        ASP.NET Core Web API (.NET 10, C#)
    Domain/              Thực thể – tên trùng tên bảng trong báo cáo
    Data/                DbContext, cấu hình bảng, migration, dữ liệu khởi tạo
    Common/              Quy tắc dùng chung, sinh mã, đồng hồ giờ VN, xử lý lỗi
    XacThuc/             UC_1 Đăng nhập, UC_2.3 Đổi mật khẩu, UC_11 Đăng xuất
    TichHop/             Tích hợp ngoài (OTP – đang giả lập)
  tests/XomNho.Tests/    Unit test (xUnit)
frontend/                React 19 + TypeScript (Vite)
docs/                    Tài liệu thiết kế
```

## Yêu cầu

- .NET SDK 10
- Node.js 24 LTS
- SQL Server (bản Developer/Express), đăng nhập bằng tài khoản Windows

## Chạy lần đầu

```powershell
# 1. Tạo database XomNho (chỉ cần chạy một lần, hoặc khi có migration mới)
cd backend
$env:ASPNETCORE_ENVIRONMENT = "Development"
dotnet tool restore
dotnet tool run dotnet-ef database update --project src/XomNho.Api

# 2. Chạy backend – http://localhost:5103
dotnet run --project src/XomNho.Api --launch-profile http

# 3. Chạy frontend (cửa sổ khác) – http://localhost:5173
cd frontend
npm install
npm run dev
```

Mở trình duyệt tại **http://localhost:5173**.

## Tài khoản mẫu (chỉ ở môi trường Development)

| Vai trò | Tên đăng nhập | Mật khẩu |
|---|---|---|
| Chủ quán | `chuquan` | `ChuQuan2026` |
| Nhân viên | `nhanvien1` | `NhanVien2026` |

Tài khoản được tạo tự động khi backend khởi động lần đầu (cấu hình `KhoiTao` trong `appsettings.Development.json`).

**Thử khóa tài khoản (UC_1):** nhập sai mật khẩu `nhanvien1` 10 lần. Màn hình chuyển sang "Nhập OTP", và ở môi trường Development, mã OTP giả lập hiện ngay trên màn hình thay cho tin nhắn SMS gửi Chủ quán.

## Dữ liệu mẫu (30 ngày hoạt động)

Lệnh dưới đây chỉ chạy ở môi trường Development, và chỉ chạy được một lần: nếu đã có dữ liệu mẫu, lệnh tự bỏ qua.

```powershell
cd backend
$env:ASPNETCORE_ENVIRONMENT = 'Development'
dotnet run --project src/XomNho.Api --launch-profile http -- --du-lieu-mau
```

Lệnh mô phỏng 30 ngày bán hàng tính lùi từ hôm nay, gồm:
- khoảng 30 nhân viên (2 người đã nghỉ việc) và 30 hàng hóa thuộc 11 danh mục, cùng các lô hàng (có lô sắp hết hạn và hết hạn);
- 30 khách hàng và 30 khách quen;
- mỗi ngày một ca và một biên bản kết ca, vài ngày có chênh lệch;
- hơn 100 hóa đơn (tiền mặt, chuyển khoản, ghi nợ), phiếu thu nợ, phiếu đổi trả ở đủ các trạng thái, hủy hóa đơn, điều chỉnh tồn.

Mọi thao tác đi qua các dịch vụ nghiệp vụ, nên mã chứng từ, FEFO, giá vốn, cảnh báo và công nợ đều nhất quán. Nhân viên mẫu đăng nhập bằng `nhanvien02` … `nhanvien30`, mật khẩu `NhanVien2026`.

## Kiểm thử

```powershell
cd backend
dotnet test
```

## Sao lưu và khôi phục (Backup NFR-01, NFR-02)

- Backend tự sao lưu toàn bộ CSDL mỗi ngày lúc `SaoLuu:GioChay` (mặc định 23:30). Nếu máy tắt đúng giờ đó, backend sao lưu bù khoảng 30 giây sau lần khởi động kế tiếp.
- Tệp `.bak` nằm trên **máy chạy SQL Server**:
  - mặc định: `<thư mục sao lưu của SQL Server>\XomNho`;
  - đổi bằng `SaoLuu:ThuMuc`. Tài khoản dịch vụ SQL Server phải có quyền ghi vào thư mục đó.
- Mỗi tệp được kiểm tra bằng `RESTORE VERIFYONLY`. Bản cũ hơn `SaoLuu:SoNgayGiu` ngày (mặc định 14) bị xóa.
- Chủ quán xem các bản sao lưu và bấm "Sao lưu ngay" tại **Tài khoản cá nhân → Sao lưu dữ liệu**.
- Nếu sao lưu tự động thất bại, Chủ quán nhận thông báo ở chuông trên thanh tiêu đề.
- Nên chép thư mục sao lưu sang nơi khác (ổ ngoài, dịch vụ lưu trữ đám mây) để phòng hỏng máy chủ.
- Azure SQL Database không hỗ trợ sao lưu ra tệp; khi dùng dịch vụ này, tắt `SaoLuu:BatTuDong` và dùng tính năng sao lưu sẵn có của Azure.

**Khôi phục** (người quản trị máy chủ thực hiện):

1. Dừng backend.
2. Chạy lệnh sau (thay tên tệp):

   ```powershell
   sqlcmd -S . -E -Q "RESTORE DATABASE XomNho FROM DISK = N'C:\...\XomNho\XomNho_20261110_233000.bak' WITH REPLACE"
   ```

3. Chạy lại backend.

Người dùng đổi máy tính hoặc điện thoại không cần khôi phục gì: dữ liệu nằm trên máy chủ, chỉ cần đăng nhập lại (Q27).

## Tích hợp thật (Giai đoạn 8d – mặc định đang giả lập)

Mọi tích hợp đều bật bằng cấu hình trong `appsettings.json`, mục `TichHop`. Khóa bí mật nên đặt bằng biến môi trường, ví dụ `TichHop__NganHang__Webhook__KhoaBiMat`.

**Chuyển khoản QR có xác nhận tự động** (`TichHop:NganHang`):

1. Điền tài khoản nhận tiền:
   - `CheDo = "VietQR"`;
   - `MaNganHang`: mã BIN, ví dụ `970436`, hoặc mã viết tắt, ví dụ `VCB`;
   - `SoTaiKhoan`, `TenTaiKhoan`.

   Màn hình thanh toán sẽ hiện ảnh VietQR thật kèm số tiền và nội dung `XN…`.
2. Đăng ký một dịch vụ theo dõi biến động số dư (SePay, Casso, PayOS…).
   - Trỏ webhook về `https://<tên-miền>/api/tich-hop/ngan-hang/webhook`. Máy chủ phải có HTTPS công khai.
   - Đặt `Webhook:KhoaBiMat` bằng khóa của dịch vụ.
3. Mặc định cấu hình đọc theo dạng của SePay (header `Authorization: Apikey <khóa>`, các trường `id` / `transferAmount` / `content`). Với Casso, sửa các mục sau:

   | Mục | Giá trị |
   |---|---|
   | `TenHeader` | `secure-token` |
   | `TienToToken` | `""` |
   | `TruongDanhSach` | `data` |
   | `TruongSoTien` | `amount` |
   | `TruongNoiDung` | `description` |

   Dịch vụ ký nội dung bằng HMAC thì đặt `KieuXacThuc = "HMAC"`.

Khi có tiền vào, màn hình QR tự nhận biết và hoàn tất thanh toán. Máy chủ chỉ ghi nhận khi có giao dịch khớp mã tham chiếu, đủ số tiền và còn hạn `PhutHieuLuc`. Mỗi giao dịch chỉ dùng được cho một lần thanh toán.

**SMS / Zalo / OTP** (`TichHop:TinNhan`):

- Đặt `CheDo = "Http"`.
- `Url`: API gửi tin của nhà cung cấp.
- `TenHeaderKhoa` / `Khoa`: header xác thực.
- `MauThan`: mẫu JSON của thân yêu cầu, có thể dùng các chỗ thay `{sdt}`, `{kenh}`, `{noiDung}`.

Mỗi nhà cung cấp có định dạng riêng, nên chỉ cần sửa `MauThan` cho khớp. Gửi hóa đơn điện tử và OTP mở khóa dùng chung cấu hình này. Khi bật `Http` thì đặt `HienOtpGiaLap = false`.

## Lưu ý bảo mật

- `appsettings.Development.json` chứa khóa JWT và mật khẩu mẫu **chỉ dùng cho máy phát triển**.
- Khi triển khai thật: đặt `Jwt__Key` bằng biến môi trường, không dùng mật khẩu mẫu, và để `TichHop:HienOtpGiaLap = false`.
