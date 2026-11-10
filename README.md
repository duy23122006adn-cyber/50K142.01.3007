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

## Bán hàng offline (NFR Availability-02, 03)

- Khi mất mạng, màn hình Bán hàng vẫn hoạt động với **tiền mặt**:
  - giá và tồn lấy từ danh mục đã lưu trên máy, máy tự làm mới mỗi 5 phút khi còn mạng;
  - mỗi giao dịch thành một hóa đơn tạm `TAM-…` lưu trong trình duyệt.
- Khi có mạng lại, máy tự gửi hóa đơn tạm lên máy chủ:
  - hợp lệ thì được cấp hóa đơn chính thức;
  - nếu thiếu tồn, giá đã đổi hoặc hàng đã ngừng kinh doanh thì chuyển "Chờ Chủ quán xử lý" và báo ở chuông.
- Xem và xử lý tại **Quản lý bán hàng → Hóa đơn tạm (offline)**.
- **Mở lại trang khi đang mất mạng** chỉ hoạt động ở bản build, vì service worker `public/sw.js` không chạy với `npm run dev`. Chạy thử bản build:

  ```powershell
  cd frontend; npm run build; npm run preview
  ```

  Bản build chạy tại http://localhost:4173 và gọi API qua proxy giống bản phát triển.
- Phiên offline dùng người đăng nhập gần nhất trên máy. Có mạng lại thì hệ thống khôi phục phiên thật bằng cookie; cookie hết hạn thì phải đăng nhập lại để đồng bộ.

## Lưu ý bảo mật

- `appsettings.Development.json` chứa khóa JWT và mật khẩu mẫu **chỉ dùng cho máy phát triển**.
- Khi triển khai thật: đặt `Jwt__Key` bằng biến môi trường, không dùng mật khẩu mẫu, và để `TichHop:HienOtpGiaLap = false`.
