# Thiết kế cơ sở dữ liệu – Phiên bản 2

> Dự án: Hệ thống quản lý bán hàng tạp hóa Xóm Nhỏ
> Cơ sở: mục "Thiết kế vật lý cơ sở dữ liệu" trong `NHÓM_1_PTTKHTTT.docx`, cùng 28 quyết định đã chốt trong [KE_HOACH.md](../KE_HOACH.md).
> Hệ quản trị: Microsoft SQL Server. Đây là **tài liệu thiết kế**: chưa tạo database và chưa chạy migration.

**Ký hiệu trong cột "Thay đổi":**

| Ký hiệu | Ý nghĩa |
|---|---|
| — | Giữ nguyên như báo cáo |
| ✏️ | Sửa so với báo cáo |
| 🆕 | Thêm mới |
| (Qn) | Câu quyết định số n trong KE_HOACH.md |

---

## 1. Quy ước chung

| Quy ước | Nội dung |
|---|---|
| Tên bảng, tên cột | Giữ tiếng Việt không dấu như báo cáo |
| Collation database | `Vietnamese_CI_AS`: so sánh không phân biệt hoa thường, đúng với yêu cầu tìm kiếm của các UC |
| Mã nghiệp vụ | `VARCHAR(20)`, làm khóa chính (Q28). Báo cáo dùng `CHAR(10)`, quá ngắn cho các mã như `HD-03/11/2026.001` |
| Khóa thay thế | Bảng chi tiết và bảng nhật ký dùng `INT IDENTITY`. Báo cáo đã ghi các cột này là "Khóa thay thế" |
| Tiền | `DECIMAL(15,0)`, đơn vị VNĐ, không có phần thập phân |
| Thời gian | `DATETIME2(0)`, mặc định `SYSDATETIME()`, lưu theo giờ Việt Nam (UTC+7). Báo cáo dùng `DATETIME` |
| Giá trị liệt kê | `NVARCHAR(25)` kèm `CHECK (... IN (...))`, như báo cáo |
| Kiểm soát đồng thời | Các bảng hay bị sửa cùng lúc có cột `PhienBan ROWVERSION` (xem mục 6) |

### 1.1. Định dạng mã nghiệp vụ

Mã do hệ thống tự sinh qua bảng `BoDemMa`, không cấp lại và chỉ được chốt khi lưu thành công (Q16).

| Đối tượng | Định dạng | Ví dụ | Nguồn |
|---|---|---|---|
| Nhân viên | `NV` + 3 số | NV001 | UC_2.1 BR05 |
| Chủ quán | `CQ` + 3 số | CQ001 | Ví dụ trên màn hình Kết ca (*đề xuất*) |
| Khách hàng | `KH-` + 6 số | KH-000001 | UC_7.5 BR05, UC_8.1 BR04 |
| Danh mục | `DM` + 2 số | DM01 | *Đề xuất*: báo cáo chưa quy định |
| Hàng hóa | `HH-` + 4 số | HH-0001 | UC_4.1 BR04 |
| Lô hàng | `LO-` + 6 số | LO-000001 | UC_10.1 BR08 |
| Ca làm việc | `CA-ddmmyyyy-nnn` | CA-05112026-001 | Ví dụ trên màn hình Kết ca |
| Biên bản kết ca | `BB-ddmmyyyy-nnn` | BB-05112026-001 | Ví dụ ở UC_9.1 BR05 và trên màn hình |
| Hóa đơn | `HD-dd/mm/yyyy.nnn` | HD-03/11/2026.001 | UC_6.5 BR10 |
| Phiếu thanh toán nợ | `PTTN-dd/mm/yyyy.nnn` | PTTN-03/11/2026.001 | UC_7.3 BR06 |
| Phiếu thanh toán khác (bán hàng, đổi trả) | `PTT-dd/mm/yyyy.nnn` | PTT-03/11/2026.001 | *Đề xuất*: báo cáo chưa quy định |
| Phiếu đổi trả | `PDT-dd/mm/yyyy.nnn` | PDT-02/11/2026.001 | Ví dụ trên màn hình UC_6.2 |

- Các mã có thành phần ngày dùng số thứ tự bắt đầu lại từ 001 mỗi ngày. Khi vượt 999 thì tăng lên 4 chữ số.
- Mã dài nhất là `PTTN-dd/mm/yyyy.nnnn` với 20 ký tự, vừa với `VARCHAR(20)`.

---

## 2. Danh sách bảng

Tổng cộng 31 bảng: 23 bảng có trong báo cáo (đã chỉnh), 7 bảng mới và bảng HoaDonTam thêm ở Giai đoạn 8c.

| Nhóm | Bảng | Nguồn |
|---|---|---|
| Tài khoản | NguoiDung, NhanVien, ChuQuan, LichSuSuaNhanVien | Báo cáo |
| | PhienDangNhap, MaXacThuc | 🆕 |
| Khách hàng | KhachHang, KhachQuen | Báo cáo |
| Hàng hóa và kho | DanhMuc, HangHoa, LoHang, CanhBaoTonKho, PhieuDieuChinhTon | Báo cáo |
| Ca làm việc | CaLamViec, BienBanKetCa, ChiTietBienBan | Báo cáo |
| Bán hàng | HoaDon, HoaDonThanhToanNgay, HoaDonNo, ChiTietHoaDon, NhatKyHuy | Báo cáo |
| | HoaDonTam (bán offline) | 🆕 GĐ8c |
| Đổi trả | PhieuDoiTra, ChiTietDoiTra | Báo cáo |
| Thanh toán | PhieuThanhToan, PhanBoThanhToan | Báo cáo |
| Hệ thống | BoDemMa, CauHinh, NhatKyThaoTac, ThongBao, NhatKyGuiChungTu | 🆕 |

---

## 3. Đặc tả từng bảng

### 3.1. NguoiDung

| # | Cột | Kiểu | Ràng buộc | Ghi chú | Thay đổi |
|---|---|---|---|---|---|
| 1 | MaND | VARCHAR(20) | PK | CQ001, NV001 | ✏️ CHAR(10) → VARCHAR(20) |
| 2 | HoTen | NVARCHAR(100) | NOT NULL, `CHECK (LEN(LTRIM(RTRIM(HoTen))) > 0)` | | — |
| 3 | NgaySinh | DATE | NOT NULL, `CHECK (NgaySinh < CAST(GETDATE() AS DATE))` | | — |
| 4 | SDT | CHAR(10) | NOT NULL, **UNIQUE**, `CHECK (LEN(SDT) = 10 AND SDT LIKE '0%' AND SDT NOT LIKE '%[^0-9]%')` | 10 số, bắt đầu bằng 0 | ✏️ Sửa CHECK sai cú pháp; thêm UNIQUE (UC_2.1 BR03) |
| 5 | Email | VARCHAR(100) | NOT NULL, UNIQUE, `CHECK (Email LIKE '%_@_%._%' AND CHARINDEX(' ', Email) = 0)` | | — |
| 6 | TenDangNhap | VARCHAR(20) | NOT NULL, UNIQUE, `CHECK (LEN(TenDangNhap) BETWEEN 4 AND 20 AND TenDangNhap COLLATE Latin1_General_BIN NOT LIKE '%[^A-Za-z0-9_]%')` | Collation CI nên giá trị UNIQUE không phân biệt hoa thường | ✏️ Giới hạn 4–20 ký tự và tập ký tự (UC_2.1 BR02) |
| 7 | MatKhau | VARCHAR(255) | NOT NULL | Chỉ lưu chuỗi băm (BCrypt) | — |
| 8 | TrangThai | NVARCHAR(25) | NOT NULL, DEFAULT N'Hoạt động', `CHECK (TrangThai IN (N'Hoạt động', N'Khóa tạm', N'Ngừng hoạt động'))` | | ✏️ Q26 |
| 9 | SoLanNhapSai | INT | NOT NULL, DEFAULT 0, `CHECK (SoLanNhapSai >= 0)` | | — |
| 10 | SoLanSaiMatKhauHienTai | INT | NOT NULL, DEFAULT 0, `CHECK (SoLanSaiMatKhauHienTai >= 0)` | Số lần nhập sai mật khẩu hiện tại khi đổi mật khẩu | 🆕 Màn hình 2.4.9 |
| 11 | KhoaDoiMatKhauDen | DATETIME2(0) | NULL | Chức năng đổi mật khẩu bị khóa đến thời điểm này | 🆕 Màn hình 2.4.9, 2.4.10 |
| 12 | PhienBan | ROWVERSION | | Kiểm soát đồng thời | 🆕 |

Vai trò của người dùng xác định qua bảng con `NhanVien` hoặc `ChuQuan` (kế thừa TPT, như báo cáo).

### 3.2. NhanVien, ChuQuan

| Bảng | Cột | Kiểu | Ràng buộc | Thay đổi |
|---|---|---|---|---|
| NhanVien | MaND | VARCHAR(20) | PK, FK → NguoiDung(MaND) ON DELETE CASCADE | ✏️ Kiểu dữ liệu |
| ChuQuan | MaND | VARCHAR(20) | PK, FK → NguoiDung(MaND) | ✏️ Kiểu dữ liệu |

### 3.3. LichSuSuaNhanVien

| # | Cột | Kiểu | Ràng buộc | Ghi chú | Thay đổi |
|---|---|---|---|---|---|
| 1 | MaLS | INT IDENTITY | PK | Khóa thay thế | ✏️ |
| 2 | MaNV | VARCHAR(20) | NOT NULL, FK → NhanVien(MaND) ON DELETE CASCADE | | ✏️ |
| 3 | HoTenNV | NVARCHAR(100) | NOT NULL | Lưu tên tại thời điểm sửa | 🆕 UC_2.2 BR06 |
| 4 | MaCQ | VARCHAR(20) | NOT NULL, FK → ChuQuan(MaND) | | ✏️ |
| 5 | HoTenCQ | NVARCHAR(100) | NOT NULL | Lưu tên tại thời điểm sửa | 🆕 UC_2.2 BR06 |
| 6 | ThoiDiemSua | DATETIME2(0) | NOT NULL, DEFAULT SYSDATETIME() | | — |
| 7 | NoiDungTruoc | NVARCHAR(1000) | NOT NULL | | — |
| 8 | NoiDungSau | NVARCHAR(1000) | NOT NULL | | — |

Nhân viên chỉ bị xóa cứng khi chưa có hóa đơn và chưa có ca (UC_2.4). Khi đó lịch sử sửa của người đó bị xóa theo (CASCADE); các thao tác vẫn còn lại trong `NhatKyThaoTac`.

### 3.4. KhachHang

| # | Cột | Kiểu | Ràng buộc | Thay đổi |
|---|---|---|---|---|
| 1 | MaKH | VARCHAR(20) | PK | ✏️ |
| 2 | HoTen | NVARCHAR(50) | NOT NULL, `CHECK (LEN(LTRIM(RTRIM(HoTen))) > 0)` | ✏️ 100 → 50 (UC_8.1 BR02) |
| 3 | SDT | CHAR(10) | NOT NULL, UNIQUE, `CHECK (LEN(SDT) = 10 AND SDT LIKE '0%' AND SDT NOT LIKE '%[^0-9]%')` | — |
| 4 | PhienBan | ROWVERSION | | 🆕 |

Quy tắc "họ tên chỉ gồm chữ cái tiếng Việt và khoảng trắng" được kiểm tra ở tầng ứng dụng, vì `LIKE` không biểu diễn gọn được chữ có dấu.

### 3.5. KhachQuen

| # | Cột | Kiểu | Ràng buộc | Ghi chú | Thay đổi |
|---|---|---|---|---|---|
| 1 | MaKH | VARCHAR(20) | PK, FK → KhachHang(MaKH) | | ✏️ |
| 2 | CCCD | CHAR(12) | NOT NULL, `CHECK (LEN(CCCD) = 12 AND CCCD NOT LIKE '%[^0-9]%')` | Duy nhất qua chỉ mục có lọc (bên dưới) | ✏️ Bỏ UNIQUE toàn bảng |
| 3 | DiaChi | NVARCHAR(200) | NOT NULL, `CHECK (LEN(LTRIM(RTRIM(DiaChi))) > 0)` | | — |
| 4 | TrangThai | NVARCHAR(25) | NOT NULL, DEFAULT N'Đang hoạt động', `CHECK (TrangThai IN (N'Đang hoạt động', N'Đã xóa'))` | Xóa mềm | ✏️ Q24 |
| 5 | QuyenMuaNo | BIT | NOT NULL, **DEFAULT 1** | 0 khi có khoản nợ quá hạn | ✏️ Q23, UC_7.5 |
| 6 | PhienBan | ROWVERSION | | | 🆕 |

- **Chỉ mục:** `UNIQUE INDEX UX_KhachQuen_CCCD ON KhachQuen(CCCD) WHERE TrangThai = N'Đang hoạt động'`. Như vậy CCCD chỉ phải duy nhất trong số khách quen đang hoạt động (UC_7.4, UC_7.5 BR03).
- **Không lưu `DuNo`:** dư nợ được tính qua view `v_DuNoKhachQuen` (mục 5) để không bị lệch số liệu.
- **Thêm lại khách quen đã xóa:** cập nhật chính dòng cũ về `TrangThai = N'Đang hoạt động'` (Q24).

### 3.6. DanhMuc

| # | Cột | Kiểu | Ràng buộc | Thay đổi |
|---|---|---|---|---|
| 1 | MaDM | VARCHAR(20) | PK | ✏️ |
| 2 | TenDM | NVARCHAR(100) | NOT NULL, UNIQUE, `CHECK (LEN(LTRIM(RTRIM(TenDM))) > 0)` | — |

Dữ liệu nạp sẵn là 11 danh mục theo UC_4.1 BR06. Không có chức năng thêm/sửa danh mục (Q15).

### 3.7. HangHoa

| # | Cột | Kiểu | Ràng buộc | Ghi chú | Thay đổi |
|---|---|---|---|---|---|
| 1 | MaHH | VARCHAR(20) | PK | HH-0001 | ✏️ |
| 2 | TenHH | NVARCHAR(100) | NOT NULL, **UNIQUE**, `CHECK (LEN(LTRIM(RTRIM(TenHH))) > 0)` | | ✏️ Thêm UNIQUE (UC_4.1 BR02) |
| 3 | MaVach | VARCHAR(50) | NULL | Duy nhất khi có giá trị (chỉ mục có lọc) | 🆕 Q15 |
| 4 | DonViTinh | NVARCHAR(25) | NOT NULL, `CHECK (DonViTinh IN (N'gói', N'cái', N'chai', N'lon', N'hộp', N'lốc', N'thùng'))` | | ✏️ UC_4.1 BR05 |
| 5 | GiaNhap | DECIMAL(15,0) | NOT NULL, `CHECK (GiaNhap > 0)` | | ✏️ `>= 0` → `> 0` (BR03) |
| 6 | GiaBan | DECIMAL(15,0) | NOT NULL, `CHECK (GiaBan > 0)` | Giá đã giảm, nếu có (Q4) | — |
| 7 | NguongCanhBaoHetHang | INT | NULL, `CHECK (NguongCanhBaoHetHang > 0)` | NULL = chưa thiết lập, không sinh cảnh báo | ✏️ BR03, Pre-condition UC_3.2 |
| 8 | NguongCanhBaoHetHan | INT | NULL, `CHECK (NguongCanhBaoHetHan > 0)` | Số ngày | ✏️ như trên |
| 9 | TrangThai | NVARCHAR(25) | NOT NULL, DEFAULT N'Đang kinh doanh', `CHECK (TrangThai IN (N'Đang kinh doanh', N'Ngừng kinh doanh'))` | | — |
| 10 | MaDM | VARCHAR(20) | NOT NULL, FK → DanhMuc(MaDM) | | ✏️ |
| 11 | PhienBan | ROWVERSION | | | 🆕 |

**Chỉ mục:**
- `UNIQUE INDEX UX_HangHoa_MaVach ON HangHoa(MaVach) WHERE MaVach IS NOT NULL`
- `INDEX IX_HangHoa_TenHH (TenHH)`

### 3.8. LoHang

| # | Cột | Kiểu | Ràng buộc | Ghi chú | Thay đổi |
|---|---|---|---|---|---|
| 1 | MaLo | VARCHAR(20) | PK | LO-000001 | ✏️ |
| 2 | MaHH | VARCHAR(20) | NOT NULL, FK → HangHoa(MaHH) | | ✏️ |
| 3 | SoLuongTon | INT | NOT NULL, DEFAULT 0, `CHECK (SoLuongTon >= 0)` | | — |
| 4 | HanSuDung | DATE | **NOT NULL** | | ✏️ Q14 |
| 5 | NgayNhap | DATETIME2(0) | NOT NULL, DEFAULT SYSDATETIME() | Thời điểm thêm lô | 🆕 |
| 6 | PhienBan | ROWVERSION | | | 🆕 |

**Ràng buộc và chỉ mục:**
- `UNIQUE (MaLo, MaHH)`: phục vụ khóa ngoại kép từ `CanhBaoTonKho` và `PhieuDieuChinhTon`, để bảo đảm mã hàng ghi trên cảnh báo/phiếu đúng là mã hàng của lô.
- `INDEX IX_LoHang_FEFO (MaHH, HanSuDung) INCLUDE (SoLuongTon)`: dùng để chọn lô có hạn gần nhất khi bán (UC_6.5 BR11).

### 3.9. CanhBaoTonKho

| # | Cột | Kiểu | Ràng buộc | Ghi chú | Thay đổi |
|---|---|---|---|---|---|
| 1 | MaCB | INT IDENTITY | PK | | ✏️ |
| 2 | LoaiCanhBao | NVARCHAR(25) | NOT NULL, `CHECK (LoaiCanhBao IN (N'Sắp hết hàng', N'Hết hàng', N'Sắp hết hạn', N'Hết hạn'))` | | ✏️ 'Cận hạn' → 'Sắp hết hạn' |
| 3 | TrangThai | NVARCHAR(25) | NOT NULL, DEFAULT N'Chưa xử lý', `CHECK (TrangThai IN (N'Chưa xử lý', N'Đã xử lý'))` | | — |
| 4 | MaLo | VARCHAR(20) | **NOT NULL** | Mọi cảnh báo đều gắn với lô | ✏️ Q13 |
| 5 | MaHH | VARCHAR(20) | NOT NULL | | — |
| 6 | ThoiDiemTao | DATETIME2(0) | NOT NULL, DEFAULT SYSDATETIME() | | 🆕 |
| 7 | ThoiDiemCapNhat | DATETIME2(0) | NOT NULL, DEFAULT SYSDATETIME() | Cập nhật khi cảnh báo được ghi đè (UC_3.2 BR05) | 🆕 |
| 8 | ThoiDiemXuLy | DATETIME2(0) | NULL | | 🆕 |

**Khóa ngoại và chỉ mục:**
- `FOREIGN KEY (MaLo, MaHH) REFERENCES LoHang(MaLo, MaHH)`
- `UNIQUE INDEX UX_CanhBao_Mo ON CanhBaoTonKho(MaLo, LoaiCanhBao) WHERE TrangThai = N'Chưa xử lý'`: mỗi lô chỉ có 1 cảnh báo "Chưa xử lý" cho mỗi loại (UC_3.2 BR05).

### 3.10. PhieuDieuChinhTon

| # | Cột | Kiểu | Ràng buộc | Ghi chú | Thay đổi |
|---|---|---|---|---|---|
| 1 | MaPDC | INT IDENTITY | PK | | ✏️ |
| 2 | NgayGio | DATETIME2(0) | NOT NULL, DEFAULT SYSDATETIME() | | — |
| 3 | MaLo | VARCHAR(20) | NOT NULL | Điều chỉnh theo lô (UC_3.3) | 🆕 |
| 4 | MaHH | VARCHAR(20) | NOT NULL | | — |
| 5 | SoLuongHeThong | INT | NOT NULL, `CHECK (SoLuongHeThong >= 0)` | | — |
| 6 | SoLuongThucTe | INT | NOT NULL, `CHECK (SoLuongThucTe >= 0)` | | ✏️ Đổi tên từ `SoLuongTon` |
| 7 | ChenhLech | AS (SoLuongThucTe - SoLuongHeThong) PERSISTED | | Cột tính toán (UC_3.3 BR06) | 🆕 |
| 8 | HanSuDungCu | DATE | NOT NULL | | 🆕 |
| 9 | HanSuDungMoi | DATE | NOT NULL | Bằng HanSuDungCu nếu không sửa | 🆕 |
| 10 | LyDo | NVARCHAR(255) | NOT NULL, `CHECK (LEN(LTRIM(RTRIM(LyDo))) > 0)` | | — |
| 11 | MaCQ | VARCHAR(20) | NOT NULL, FK → ChuQuan(MaND) | Chỉ Chủ quán điều chỉnh (Q7) | — |

**Khóa ngoại:** `FOREIGN KEY (MaLo, MaHH) REFERENCES LoHang(MaLo, MaHH)`.

### 3.11. CaLamViec

| # | Cột | Kiểu | Ràng buộc | Ghi chú | Thay đổi |
|---|---|---|---|---|---|
| 1 | MaCa | VARCHAR(20) | PK | CA-05112026-001 | ✏️ |
| 2 | NgayLamViec | DATE | NOT NULL, DEFAULT CAST(GETDATE() AS DATE) | | — |
| 3 | GioBatDau | TIME(0) | NOT NULL | | — |
| 4 | GioKetThuc | TIME(0) | NULL | Có giá trị khi ca "Đã kết thúc" | — |
| 5 | TrangThai | NVARCHAR(25) | NOT NULL, DEFAULT N'Đang hoạt động', `CHECK (TrangThai IN (N'Đang hoạt động', N'Đang kết ca', N'Đã kết thúc'))` | | ✏️ Theo UC_9.1 |
| 6 | MaND | VARCHAR(20) | NOT NULL, FK → NguoiDung(MaND) | Người mở ca = người phụ trách (Q10) | — |
| 7 | KhoaCaMo | AS (CASE WHEN TrangThai = N'Đã kết thúc' THEN MaCa ELSE 'DANG_MO' END) PERSISTED | **UNIQUE** | Bảo đảm toàn quán chỉ có 1 ca chưa kết thúc (Q10) | 🆕 |
| 8 | PhienBan | ROWVERSION | | | 🆕 |

**Ràng buộc:** `CHECK ((TrangThai = N'Đã kết thúc' AND GioKetThuc IS NOT NULL) OR (TrangThai <> N'Đã kết thúc' AND GioKetThuc IS NULL))`

**Giải thích `KhoaCaMo`:**
- Ca đã kết thúc lấy giá trị là chính `MaCa` của nó, nên các ca đã kết thúc không bao giờ trùng nhau.
- Mọi ca đang mở đều có cùng giá trị `'DANG_MO'`, nên ràng buộc UNIQUE chặn được ca thứ hai. Cách này không cần filtered index (filtered index không dùng được trên cột tính toán).

### 3.12. BienBanKetCa

| # | Cột | Kiểu | Ràng buộc | Ghi chú | Thay đổi |
|---|---|---|---|---|---|
| 1 | MaBB | VARCHAR(20) | PK | BB-05112026-001 | ✏️ |
| 2 | NgayGioLuu | DATETIME2(0) | NOT NULL, DEFAULT SYSDATETIME() | Cũng là giờ kết thúc ca | — |
| 3 | MaCa | VARCHAR(20) | NOT NULL, UNIQUE, FK → CaLamViec(MaCa) | Mỗi ca tối đa 1 biên bản | — |
| 4 | MaND | VARCHAR(20) | NOT NULL, FK → NguoiDung(MaND) | **Người kết ca** (có thể khác người mở ca) | 🆕 UC_9.1 BR09, UC_9.2 BR01 |
| 5 | CoChenhLech | BIT | NOT NULL | Có ít nhất 1 dòng chênh lệch ≠ 0 (UC_9.2 BR06) | ✏️ Thay cho `CoThatThoat` trong thiết kế logic |

### 3.13. ChiTietBienBan

| # | Cột | Kiểu | Ràng buộc | Ghi chú | Thay đổi |
|---|---|---|---|---|---|
| 1 | MaCTBB | INT IDENTITY | PK | | ✏️ |
| 2 | MaBB | VARCHAR(20) | NOT NULL, FK → BienBanKetCa(MaBB) | | ✏️ |
| 3 | MaHH | VARCHAR(20) | NOT NULL, FK → HangHoa(MaHH) | | ✏️ |
| 4 | SoLuongLyThuyet | INT | NOT NULL, `CHECK (SoLuongLyThuyet >= 0)` | | — (thiết kế logic ghi `SoLuongHeThong`) |
| 5 | SoLuongThucTe | INT | NOT NULL, `CHECK (SoLuongThucTe >= 0)` | | — |
| 6 | ChenhLech | AS (SoLuongThucTe - SoLuongLyThuyet) PERSISTED | | | 🆕 |
| 7 | NguyenNhan | NVARCHAR(255) | NULL | | — |

**Ràng buộc:**
- `UNIQUE (MaBB, MaHH)`
- `CHECK (SoLuongThucTe = SoLuongLyThuyet OR LEN(LTRIM(RTRIM(ISNULL(NguyenNhan, N'')))) > 0)`: dòng có chênh lệch thì bắt buộc ghi nguyên nhân (UC_9.1 BR02).

### 3.14. HoaDon

| # | Cột | Kiểu | Ràng buộc | Ghi chú | Thay đổi |
|---|---|---|---|---|---|
| 1 | MaHD | VARCHAR(20) | PK | HD-03/11/2026.001 | ✏️ |
| 2 | NgayGioLap | DATETIME2(0) | NOT NULL, DEFAULT SYSDATETIME() | | — |
| 3 | TongTien | DECIMAL(15,0) | NOT NULL, `CHECK (TongTien > 0)` | Bằng tổng thành tiền các dòng | 🆕 Có trong thiết kế logic và ERD |
| 4 | SoTienDaTra | DECIMAL(15,0) | NOT NULL, DEFAULT 0, `CHECK (SoTienDaTra >= 0)` | | — |
| 5 | TrangThai | NVARCHAR(25) | NOT NULL, `CHECK (TrangThai IN (N'Đã thanh toán', N'Còn nợ', N'Đã hủy'))` | Hóa đơn nợ trả đủ chuyển sang "Đã thanh toán" (Q18) | — |
| 6 | MaCa | VARCHAR(20) | NOT NULL, FK → CaLamViec(MaCa) | | ✏️ |
| 7 | MaND | VARCHAR(20) | NOT NULL, FK → NguoiDung(MaND) | **Người bán** (UC_6.5 BR9) | 🆕 Có trong sơ đồ lớp |

**Ràng buộc và chỉ mục:**
- `CHECK (SoTienDaTra <= TongTien)`
- `INDEX IX_HoaDon_NgayGioLap (NgayGioLap)`: phục vụ báo cáo và tìm kiếm lịch sử.

### 3.15. HoaDonThanhToanNgay

| # | Cột | Kiểu | Ràng buộc | Thay đổi |
|---|---|---|---|---|
| 1 | MaHD | VARCHAR(20) | PK, FK → HoaDon(MaHD) | ✏️ |
| 2 | MaKH | VARCHAR(20) | NULL, FK → KhachHang(MaKH) | NULL nếu là khách vãng lai |

### 3.16. HoaDonNo

| # | Cột | Kiểu | Ràng buộc | Ghi chú | Thay đổi |
|---|---|---|---|---|---|
| 1 | MaHD | VARCHAR(20) | PK, FK → HoaDon(MaHD) | | ✏️ |
| 2 | HanThanhToan | DATE | NOT NULL | Ngày lập + 30 ngày (UC_7.1 BR03) | — |
| 3 | MaKQ | VARCHAR(20) | NOT NULL, FK → KhachQuen(MaKH) | | — (logic và ERD ghi `MaKH`) |

- **Chỉ mục:** `INDEX IX_HoaDonNo_MaKQ (MaKQ)`.
- **Không lưu `SoTienConNo`:** UC_7.3 BR02 không cho trả một phần, nên số tiền còn nợ = `HoaDon.TongTien` khi trạng thái là "Còn nợ", và bằng 0 trong các trường hợp khác.

### 3.17. ChiTietHoaDon

| # | Cột | Kiểu | Ràng buộc | Ghi chú | Thay đổi |
|---|---|---|---|---|---|
| 1 | MaCTHD | INT IDENTITY | PK | | ✏️ |
| 2 | MaHD | VARCHAR(20) | NOT NULL, FK → HoaDon(MaHD) | | ✏️ |
| 3 | MaHH | VARCHAR(20) | NOT NULL | | ✏️ |
| 4 | MaLo | VARCHAR(20) | NOT NULL | **Lô đã xuất** | 🆕 Để bán theo hạn gần nhất và hoàn đúng lô |
| 5 | SoLuong | INT | NOT NULL, `CHECK (SoLuong > 0)` | | — |
| 6 | DonGia | DECIMAL(15,0) | NOT NULL, `CHECK (DonGia >= 0)` | Giá bán tại thời điểm lập | — |
| 7 | GiaVon | DECIMAL(15,0) | NOT NULL, `CHECK (GiaVon >= 0)` | Giá nhập tại thời điểm bán | 🆕 Q20 |
| 8 | ThanhTien | AS (SoLuong * DonGia) PERSISTED | | | 🆕 Có trong thiết kế logic |

**Khóa ngoại và chỉ mục:**
- `FOREIGN KEY (MaLo, MaHH) REFERENCES LoHang(MaLo, MaHH)`
- `INDEX IX_CTHD_MaHD (MaHD)`, `INDEX IX_CTHD_MaHH (MaHH)`

Nếu một mặt hàng phải lấy từ nhiều lô, mỗi lô là một dòng chi tiết. Giao diện và hóa đơn in ra gộp các dòng này theo mặt hàng.

### 3.18. NhatKyHuy

| # | Cột | Kiểu | Ràng buộc | Ghi chú | Thay đổi |
|---|---|---|---|---|---|
| 1 | MaNK | INT IDENTITY | PK | | ✏️ |
| 2 | MaHD | VARCHAR(20) | NOT NULL, UNIQUE, FK → HoaDon(MaHD) | | ✏️ |
| 3 | MaCQ | VARCHAR(20) | NOT NULL, FK → ChuQuan(MaND) | | ✏️ |
| 4 | LyDoHuy | NVARCHAR(255) | NOT NULL, `CHECK (LEN(LTRIM(RTRIM(LyDoHuy))) > 0)` | | — |
| 5 | ThoiGianHuy | DATETIME2(0) | NOT NULL, DEFAULT SYSDATETIME() | | — |
| 6 | TongTien | DECIMAL(15,0) | NOT NULL, `CHECK (TongTien > 0)` | | 🆕 Có trong thiết kế logic |
| 7 | SoTienCanHoan | DECIMAL(15,0) | NOT NULL, `CHECK (SoTienCanHoan >= 0 AND SoTienCanHoan <= TongTien)` | | — |
| 8 | XacNhanChuaNhanHang | BIT | NOT NULL, `CHECK (XacNhanChuaNhanHang = 1)` | Chỉ hủy được khi khách chưa nhận hàng | ✏️ |
| 9 | BanSaoHoaDon | NVARCHAR(MAX) | NOT NULL, `CHECK (ISJSON(BanSaoHoaDon) = 1)` | Bản sao chi tiết hóa đơn tại thời điểm hủy, dạng JSON | 🆕 UC_6.3 BR11 |

### 3.19. PhieuDoiTra

| # | Cột | Kiểu | Ràng buộc | Ghi chú | Thay đổi |
|---|---|---|---|---|---|
| 1 | MaPDT | VARCHAR(20) | PK | PDT-02/11/2026.001 | ✏️ |
| 2 | LoaiPhieu | NVARCHAR(25) | NOT NULL, `CHECK (LoaiPhieu IN (N'Đổi hàng', N'Trả hàng'))` | | — |
| 3 | NgayGioLap | DATETIME2(0) | NOT NULL, DEFAULT SYSDATETIME() | | — |
| 4 | LyDoDoiTra | NVARCHAR(255) | NOT NULL, `CHECK (LEN(LTRIM(RTRIM(LyDoDoiTra))) > 0)` | | 🆕 UC_6.4 bước 4 |
| 5 | TrangThai | NVARCHAR(25) | NOT NULL, DEFAULT N'Chờ duyệt', `CHECK (TrangThai IN (N'Chờ duyệt', N'Đã duyệt', N'Từ chối', N'Không hoàn tất'))` | | ✏️ Thêm "Không hoàn tất" |
| 6 | SoTienHoan | DECIMAL(15,0) | NOT NULL, DEFAULT 0, `CHECK (SoTienHoan >= 0)` | Tổng giá trị hàng trả | 🆕 Có trong logic và chuẩn hóa |
| 7 | ChenhLech | DECIMAL(15,0) | NOT NULL, DEFAULT 0 | > 0: thu thêm; < 0: hoàn lại (UC_6.2 BR05) | 🆕 như trên |
| 8 | LyDoTuChoi | NVARCHAR(255) | NULL | | — |
| 9 | NgayGioDuyet | DATETIME2(0) | NULL | | — |
| 10 | NgayGioHoanTat | DATETIME2(0) | NULL | Thời điểm đã hoàn/thu tiền và cập nhật kho | 🆕 |
| 11 | MaHD | VARCHAR(20) | NOT NULL, FK → HoaDon(MaHD) | | ✏️ |
| 12 | MaND | VARCHAR(20) | NOT NULL, FK → NguoiDung(MaND) | Người lập | ✏️ |
| 13 | MaCQ | VARCHAR(20) | NULL, FK → ChuQuan(MaND) | Người duyệt | ✏️ |
| 14 | PhienBan | ROWVERSION | | | 🆕 |

**Ràng buộc:**
- `CHECK ((TrangThai = N'Chờ duyệt' AND MaCQ IS NULL AND NgayGioDuyet IS NULL) OR (TrangThai <> N'Chờ duyệt' AND MaCQ IS NOT NULL AND NgayGioDuyet IS NOT NULL))`
- `CHECK (TrangThai <> N'Từ chối' OR LEN(LTRIM(RTRIM(ISNULL(LyDoTuChoi, N'')))) > 0)`: từ chối thì phải có lý do (UC_6.4 BR04).
- `CHECK (NgayGioHoanTat IS NULL OR TrangThai = N'Đã duyệt')`

**Vòng đời phiếu:**

```
Chờ duyệt ──► Từ chối
    │
    └──► Đã duyệt ──► (đặt NgayGioHoanTat) hoàn tất
             │
             └──► Không hoàn tất  (thu thêm tiền thất bại và không thanh toán lại)
```

### 3.20. ChiTietDoiTra

| # | Cột | Kiểu | Ràng buộc | Ghi chú | Thay đổi |
|---|---|---|---|---|---|
| 1 | MaCTDT | INT IDENTITY | PK | | ✏️ |
| 2 | MaPDT | VARCHAR(20) | NOT NULL, FK → PhieuDoiTra(MaPDT) | | ✏️ |
| 3 | MaCTHD | INT | NOT NULL, FK → ChiTietHoaDon(MaCTHD) | Dòng hóa đơn gốc, qua đó biết lô để hoàn | ✏️ |
| 4 | SoLuongTra | INT | NOT NULL, `CHECK (SoLuongTra > 0)` | | — |
| 5 | GiaTriHoan | DECIMAL(15,0) | NOT NULL, `CHECK (GiaTriHoan >= 0)` | Theo giá trên hóa đơn gốc (UC_6.2 BR04) | 🆕 Có trong logic |
| 6 | TinhTrangHang | NVARCHAR(50) | NOT NULL, `CHECK (LEN(LTRIM(RTRIM(TinhTrangHang))) > 0)` | | — |
| 7 | LoiNhaSanXuat | BIT | NOT NULL, DEFAULT 0 | | — |
| 8 | MoTaLoi | NVARCHAR(255) | NULL | | — |
| 9 | MaHHMoi | VARCHAR(20) | NULL, FK → HangHoa(MaHH) | Chỉ dùng cho phiếu đổi hàng | — |
| 10 | SoLuongMoi | INT | NULL, `CHECK (SoLuongMoi > 0)` | | — |
| 11 | GiaTriHangMoi | DECIMAL(15,0) | NULL, `CHECK (GiaTriHangMoi >= 0)` | Giá niêm yết lúc lập phiếu × số lượng | 🆕 Có trong logic |
| 12 | MaLoMoi | VARCHAR(20) | NULL, FK → LoHang(MaLo) | Lô xuất hàng mới, ghi lúc hoàn tất | 🆕 |
| 13 | GiaVonHangMoi | DECIMAL(15,0) | NULL | Giá nhập một đơn vị hàng mới lúc xuất hàng, ghi lúc hoàn tất (báo cáo lợi nhuận, Q20) | 🆕 GĐ7 |

**Ràng buộc:**
- `CHECK ((MaHHMoi IS NULL AND SoLuongMoi IS NULL AND GiaTriHangMoi IS NULL) OR (MaHHMoi IS NOT NULL AND SoLuongMoi IS NOT NULL AND GiaTriHangMoi IS NOT NULL))`
- `CHECK (GiaVonHangMoi IS NULL OR (MaHHMoi IS NOT NULL AND GiaVonHangMoi >= 0))`
- Bảng PhieuDoiTra có thêm chỉ mục `IX_PDT_NgayGioDuyet` (báo cáo tính phiếu vào kỳ chứa ngày duyệt, Q19).
- `CHECK (LoiNhaSanXuat = 0 OR LEN(LTRIM(RTRIM(ISNULL(MoTaLoi, N'')))) > 0)`: lỗi nhà sản xuất thì bắt buộc mô tả lỗi (UC_6.2 BR10).

### 3.21. PhieuThanhToan

| # | Cột | Kiểu | Ràng buộc | Ghi chú | Thay đổi |
|---|---|---|---|---|---|
| 1 | MaPTT | VARCHAR(20) | PK | PTTN-… (thu nợ) hoặc PTT-… (loại khác) | ✏️ |
| 2 | NgayGio | DATETIME2(0) | NOT NULL, DEFAULT SYSDATETIME() | | — |
| 3 | LoaiPhieu | NVARCHAR(25) | NOT NULL, `CHECK (LoaiPhieu IN (N'Bán hàng', N'Thu nợ', N'Đổi trả'))` | | 🆕 |
| 4 | HuongTien | NVARCHAR(10) | NOT NULL, DEFAULT N'Thu', `CHECK (HuongTien IN (N'Thu', N'Chi'))` | "Chi" = hoàn tiền cho khách | 🆕 |
| 5 | SoTien | DECIMAL(15,0) | NOT NULL, `CHECK (SoTien > 0)` | | — |
| 6 | PhuongThuc | NVARCHAR(25) | NOT NULL, `CHECK (PhuongThuc IN (N'Tiền mặt', N'Chuyển khoản QR'))` | | ✏️ Tên giá trị |
| 7 | TrangThai | NVARCHAR(25) | NOT NULL, DEFAULT N'Thành công', `CHECK (TrangThai IN (N'Thành công', N'Không thành công', N'Đã hủy'))` | Ghi lại cả lần QR thất bại (UC_6.5 11.b.1) | ✏️ |
| 8 | MaGiaoDichNganHang | VARCHAR(50) | NULL | Mã tham chiếu QR (giả lập trong MVP) | 🆕 |
| 9 | MaND | VARCHAR(20) | NOT NULL, FK → NguoiDung(MaND) | Người thu hoặc chi | ✏️ |
| 10 | MaKQ | VARCHAR(20) | NULL, FK → KhachQuen(MaKH) | Có khi thu nợ | — |
| 11 | MaHDTTN | VARCHAR(20) | NULL, FK → HoaDonThanhToanNgay(MaHD) | Cho phép NULL tạm thời; gắn vào khi hóa đơn tạo xong | — |
| 12 | MaPDT | VARCHAR(20) | NULL, FK → PhieuDoiTra(MaPDT) | Có khi đổi trả | — |

**Ràng buộc** (thay cho 3 khóa ngoại "lỏng" trong báo cáo):

```sql
CHECK (
  (LoaiPhieu = N'Thu nợ'  AND HuongTien = N'Thu' AND MaKQ IS NOT NULL AND MaHDTTN IS NULL AND MaPDT IS NULL)
  OR (LoaiPhieu = N'Bán hàng' AND HuongTien = N'Thu' AND MaKQ IS NULL AND MaPDT IS NULL)
  OR (LoaiPhieu = N'Đổi trả'  AND MaPDT IS NOT NULL AND MaKQ IS NULL AND MaHDTTN IS NULL)
)
```

**Vì sao `MaHDTTN` được phép NULL khi `LoaiPhieu = N'Bán hàng'`:** UC_6.5 ghi nhận thanh toán trước rồi mới tạo hóa đơn. Luồng 14.a yêu cầu giữ khoản thanh toán nếu việc tạo hóa đơn thất bại; sau khi thử lại thành công, hệ thống gắn `MaHDTTN` vào phiếu.

### 3.22. PhanBoThanhToan

| # | Cột | Kiểu | Ràng buộc | Ghi chú | Thay đổi |
|---|---|---|---|---|---|
| 1 | MaPTT | VARCHAR(20) | PK (1/2), FK → PhieuThanhToan(MaPTT) | | ✏️ |
| 2 | MaHDNo | VARCHAR(20) | PK (2/2), FK → HoaDonNo(MaHD) | | ✏️ Báo cáo vật lý ghi `MaHD`, logic ghi `MaHDNo` |
| 3 | SoTienPhanBo | DECIMAL(15,0) | NOT NULL, `CHECK (SoTienPhanBo > 0)` | Bằng `TongTien` của hóa đơn nợ (không trả một phần) | — |

### 3.23. Bảng mới

#### BoDemMa: bộ đếm sinh mã 🆕

| # | Cột | Kiểu | Ràng buộc | Ghi chú |
|---|---|---|---|---|
| 1 | TienTo | VARCHAR(10) | PK (1/2) | NV, CQ, KH, DM, HH, LO, CA, BB, HD, PTTN, PTT, PDT |
| 2 | Ky | CHAR(8) | PK (2/2) | `yyyyMMdd` với mã đếm theo ngày; `'00000000'` với mã đếm toàn cục |
| 3 | SoHienTai | INT | NOT NULL, DEFAULT 0, `CHECK (SoHienTai >= 0)` | |

- Lấy số mới bằng `UPDATE ... WITH (UPDLOCK, HOLDLOCK)` trong **cùng transaction** với lệnh INSERT bản ghi nghiệp vụ.
- Nếu transaction lỗi thì số đếm cũng rollback, nên số đó không bị tiêu (UC_2.1 BR08, UC_6.5 BR10).
- Số đếm không bao giờ giảm, kể cả khi bản ghi bị xóa, nên mã không bị cấp lại (UC_2.1 BR05).

#### CauHinh: tham số hệ thống 🆕

| # | Cột | Kiểu | Ràng buộc |
|---|---|---|---|
| 1 | MaCauHinh | VARCHAR(50) | PK |
| 2 | GiaTri | NVARCHAR(200) | NOT NULL |
| 3 | MoTa | NVARCHAR(255) | NULL |

Dữ liệu nạp sẵn. Không có màn hình sửa, vì các giá trị này đã cố định theo Q17 và Q22:

| MaCauHinh | GiaTri | Nguồn |
|---|---|---|
| TenCuaHang | Tạp hóa Xóm Nhỏ | Nội dung hóa đơn (UC_6.5 BR05) |
| HanMucNo | 1000000 | UC_7.1 BR02 |
| SoNgayNo | 30 | UC_7.1 BR03 |
| SoNgaySapHetHanNo | 23 | UC_7.2 BR03 |
| SoNgayDoiTra | 7 | UC_6.2 BR01 |
| SoLanSaiToiDa | 10 | UC_1 BR02 |
| ThoiHanOtpPhut | 5 | UC_1 BR03 |
| SoDongMoiTrang | 20 | UC_3.1, UC_4.4 |
| SoLanSaiDoiMatKhau | 5 | Màn hình 2.4.9 |
| PhutKhoaDoiMatKhau | 15 | Màn hình 2.4.9 |

#### NhatKyThaoTac: audit log 🆕 (NFR Security-06)

| # | Cột | Kiểu | Ràng buộc | Ghi chú |
|---|---|---|---|---|
| 1 | MaNKTT | BIGINT IDENTITY | PK | |
| 2 | ThoiDiem | DATETIME2(0) | NOT NULL, DEFAULT SYSDATETIME() | |
| 3 | MaND | VARCHAR(20) | NULL | **Không đặt FK**, để nhật ký vẫn còn khi tài khoản bị xóa |
| 4 | TenDangNhap | VARCHAR(20) | NULL | |
| 5 | HanhDong | NVARCHAR(50) | NOT NULL | Thêm, Sửa, Xóa, Đăng nhập, Đăng nhập lỗi, Duyệt, Hủy, ... |
| 6 | BangDuLieu | NVARCHAR(50) | NULL | |
| 7 | MaBanGhi | VARCHAR(50) | NULL | |
| 8 | DuLieuCu | NVARCHAR(MAX) | NULL | JSON |
| 9 | DuLieuMoi | NVARCHAR(MAX) | NULL | JSON |
| 10 | DiaChiIP | VARCHAR(45) | NULL | |

#### PhienDangNhap 🆕 (UC_2.3 BR06, UC_11)

| # | Cột | Kiểu | Ràng buộc | Ghi chú |
|---|---|---|---|---|
| 1 | MaPhien | UNIQUEIDENTIFIER | PK, DEFAULT NEWID() | |
| 2 | MaND | VARCHAR(20) | NOT NULL, FK → NguoiDung(MaND) ON DELETE CASCADE | |
| 3 | RefreshTokenHash | VARCHAR(255) | NOT NULL | |
| 4 | ThoiDiemTao | DATETIME2(0) | NOT NULL, DEFAULT SYSDATETIME() | |
| 5 | HetHan | DATETIME2(0) | NOT NULL | |
| 6 | ThoiDiemThuHoi | DATETIME2(0) | NULL | Đăng xuất hoặc đổi mật khẩu thì ghi giá trị vào đây |

Mọi request đều kiểm tra phiên chưa bị thu hồi. Đổi mật khẩu sẽ thu hồi **tất cả** phiên của tài khoản đó.

#### MaXacThuc: OTP mở khóa 🆕 (UC_1 5.c, Q25)

| # | Cột | Kiểu | Ràng buộc | Ghi chú |
|---|---|---|---|---|
| 1 | MaOTP | INT IDENTITY | PK | |
| 2 | MaND | VARCHAR(20) | NOT NULL, FK → NguoiDung(MaND) ON DELETE CASCADE | Tài khoản bị khóa |
| 3 | MaBam | VARCHAR(255) | NOT NULL | Chỉ lưu chuỗi băm của OTP |
| 4 | ThoiDiemGui | DATETIME2(0) | NOT NULL, DEFAULT SYSDATETIME() | |
| 5 | HetHan | DATETIME2(0) | NOT NULL | Thời điểm gửi + 5 phút |
| 6 | ThoiDiemSuDung | DATETIME2(0) | NULL | |
| 7 | SoLanNhapSai | INT | NOT NULL, DEFAULT 0 | *Đề xuất*: khóa OTP sau 5 lần nhập sai, chống dò mã |

Khi gửi lại OTP (UC_1 5.f.2), các OTP cũ chưa dùng của tài khoản đó bị vô hiệu.

#### ThongBao 🆕 (UC_6.4 BR08)

| # | Cột | Kiểu | Ràng buộc | Ghi chú |
|---|---|---|---|---|
| 1 | MaTB | INT IDENTITY | PK | |
| 2 | MaND | VARCHAR(20) | NOT NULL, FK → NguoiDung(MaND) ON DELETE CASCADE | Người nhận |
| 3 | LoaiThongBao | NVARCHAR(50) | NOT NULL | Ví dụ "Kết quả duyệt phiếu" |
| 4 | NoiDung | NVARCHAR(500) | NOT NULL | |
| 5 | MaThamChieu | VARCHAR(20) | NULL | Ví dụ mã phiếu đổi trả |
| 6 | ThoiDiemTao | DATETIME2(0) | NOT NULL, DEFAULT SYSDATETIME() | |
| 7 | DaDoc | BIT | NOT NULL, DEFAULT 0 | |

#### NhatKyGuiChungTu 🆕 (UC_6.5 16.a.2.a.1, UC_7.1 14.a, UC_7.3 18.a)

| # | Cột | Kiểu | Ràng buộc | Ghi chú |
|---|---|---|---|---|
| 1 | MaGui | INT IDENTITY | PK | |
| 2 | LoaiChungTu | NVARCHAR(25) | NOT NULL, `CHECK (LoaiChungTu IN (N'Hóa đơn', N'Phiếu thanh toán'))` | |
| 3 | MaChungTu | VARCHAR(20) | NOT NULL | |
| 4 | Kenh | NVARCHAR(10) | NOT NULL, `CHECK (Kenh IN (N'SMS', N'Zalo'))` | |
| 5 | SDTNhan | CHAR(10) | NOT NULL | Chỉ lưu ở nhật ký này, không lưu vào hồ sơ khách (UC_6.5 BR8) |
| 6 | ThoiDiemGui | DATETIME2(0) | NOT NULL, DEFAULT SYSDATETIME() | |
| 7 | KetQua | NVARCHAR(25) | NOT NULL, `CHECK (KetQua IN (N'Thành công', N'Không thành công'))` | |
| 8 | MaND | VARCHAR(20) | NOT NULL, FK → NguoiDung(MaND) | |

#### HoaDonTam 🆕 GĐ8c (NFR Availability-02, 03 – bán offline)

Hóa đơn bán tiền mặt khi mất mạng, do máy bán gửi lên khi có mạng trở lại. `MaTam` do máy bán tạo và dùng làm khóa chống trùng: gửi lại nhiều lần chỉ ghi nhận một lần.

| # | Cột | Kiểu | Ràng buộc | Ghi chú |
|---|---|---|---|---|
| 1 | MaTam | VARCHAR(20) | PK | `TAM-yyMMdd-XXXXXX` |
| 2 | NgayGioBan | DATETIME2(0) | NOT NULL | Giờ bán thật trên máy; hóa đơn chính thức lấy giờ này và mã theo ngày này |
| 3 | MaND | VARCHAR(20) | NOT NULL, FK → NguoiDung | Người bán |
| 4 | MaKH | VARCHAR(20) | NULL, FK → KhachHang | |
| 5 | NoiDung | NVARCHAR(MAX) | NOT NULL, `CHECK (ISJSON(NoiDung) = 1)` | Các dòng {maHH, tenHH, soLuong, donGia} – giá khách đã trả |
| 6 | TongTien | DECIMAL(15,0) | NOT NULL | |
| 7 | TienKhachDua | DECIMAL(15,0) | NOT NULL | `CHECK (TongTien > 0 AND TienKhachDua >= TongTien)` |
| 8 | TrangThai | NVARCHAR(30) | NOT NULL, `CHECK (… IN (N'Đã ghi nhận', N'Chờ Chủ quán xử lý', N'Đã hủy'))` | |
| 9 | LyDo | NVARCHAR(255) | NULL | Lý do chờ xử lý / lý do hủy |
| 10 | NgayGioDongBo | DATETIME2(0) | NOT NULL | |
| 11 | MaNguoiDongBo | VARCHAR(20) | NOT NULL, FK → NguoiDung | Người bán hoặc Chủ quán |
| 12 | MaHD | VARCHAR(20) | NULL, FK → HoaDon, UNIQUE (lọc NOT NULL) | Hóa đơn chính thức |
| 13 | NgayGioXuLy, MaNguoiXuLy | DATETIME2(0), VARCHAR(20) | NULL | Chủ quán ghi nhận / hủy |
| 14 | PhienBan | ROWVERSION | | |

**Ràng buộc:** `CHECK ((TrangThai = N'Đã ghi nhận' AND MaHD IS NOT NULL) OR (TrangThai <> N'Đã ghi nhận' AND MaHD IS NULL AND LyDo không rỗng))`.

---

## 4. Quan hệ giữa các bảng

```
NguoiDung 1─1 NhanVien | ChuQuan                      (kế thừa)
NguoiDung 1─n CaLamViec, HoaDon (người bán), PhieuDoiTra (người lập), PhieuThanhToan,
              BienBanKetCa (người kết ca), PhienDangNhap, MaXacThuc, ThongBao
NhanVien  1─n LichSuSuaNhanVien n─1 ChuQuan
ChuQuan   1─n PhieuDieuChinhTon, NhatKyHuy, PhieuDoiTra (người duyệt)

KhachHang 1─1 KhachQuen                                (kế thừa)
KhachHang 1─n HoaDonThanhToanNgay
KhachQuen 1─n HoaDonNo, PhieuThanhToan (thu nợ)

DanhMuc 1─n HangHoa 1─n LoHang 1─n CanhBaoTonKho
                          LoHang 1─n PhieuDieuChinhTon, ChiTietHoaDon

CaLamViec 1─n HoaDon
CaLamViec 1─0..1 BienBanKetCa 1─n ChiTietBienBan n─1 HangHoa

HoaDon 1─1 HoaDonThanhToanNgay | HoaDonNo             (kế thừa)
HoaDon 1─n ChiTietHoaDon
HoaDon 1─0..1 NhatKyHuy
HoaDon 1─n PhieuDoiTra 1─n ChiTietDoiTra n─1 ChiTietHoaDon

PhieuThanhToan n─n HoaDonNo (qua PhanBoThanhToan)
PhieuThanhToan n─0..1 HoaDonThanhToanNgay | PhieuDoiTra
```

---

## 5. View (số liệu dẫn xuất, không lưu)

### `v_DuNoKhachQuen`: dư nợ và trạng thái nợ (UC_7.2, UC_7.1)

| Cột | Cách tính |
|---|---|
| MaKH | Mã khách quen |
| DuNo | Tổng `HoaDon.TongTien` của các hóa đơn nợ đang "Còn nợ" |
| NgayNoCuNhat | Ngày lập nhỏ nhất trong các hóa đơn còn nợ |
| HanThanhToanCuNhat | `HanThanhToan` nhỏ nhất trong các hóa đơn còn nợ |
| TrangThaiNo | Không nợ (DuNo = 0) / Còn hạn (khoản cũ nhất 0–22 ngày) / Sắp hết hạn (23–30 ngày) / Quá hạn (> 30 ngày) |

### `v_TonKhoHangHoa`: tồn kho theo mặt hàng

| Cột | Cách tính |
|---|---|
| TongTon | Tổng `SoLuongTon` của mọi lô (UC_5.4 BR01) |
| TonBanDuoc | Tổng `SoLuongTon` của các lô có `HanSuDung >= hôm nay` (UC_10.1 bước 8) |

---

## 6. Quy tắc bảo đảm ở tầng ứng dụng

Các quy tắc dưới đây cần đọc nhiều bảng hoặc phụ thuộc thời điểm, nên CHECK không diễn đạt được. Tầng ứng dụng thực hiện chúng trong transaction.

| Quy tắc | Cách làm |
|---|---|
| Bán hàng theo hạn gần nhất (UC_6.5 BR11) | Chọn lô có `HanSuDung >= hôm nay`, sắp theo `HanSuDung`, rồi `MaLo`. Trừ kho bằng `UPDATE LoHang SET SoLuongTon -= @n WHERE MaLo = @lo AND SoLuongTon >= @n`; nếu 0 dòng bị ảnh hưởng thì báo hết hàng (an toàn khi nhiều quầy bán cùng lúc). |
| Hạn mức nợ 1.000.000đ (UC_7.1) | Khóa dòng `KhachQuen` bằng `UPDLOCK` trong lúc kiểm tra dư nợ và tạo hóa đơn nợ. |
| Một ca mở (Q10) | Cột `CaLamViec.KhoaCaMo` UNIQUE. Đăng nhập mà chưa có ca nào đang mở thì tự tạo ca mới. |
| Khóa giao dịch khi "Đang kết ca" (UC_9.1 BR07, Q11) | Mọi thao tác bán, hủy, thêm lô, điều chỉnh tồn đều kiểm tra trạng thái ca hiện tại. |
| Tồn lý thuyết (UC_9.1 BR08) | Lấy tổng tồn hệ thống của mặt hàng tại lúc chuyển sang "Đang kết ca". Vì hệ thống ghi nhận mọi lần nhập/xuất/bán/hủy, con số này đúng bằng "tồn đầu ca + nhập − xuất". |
| Phân bổ chênh lệch kiểm kê (Q11) | Thiếu thì trừ dần từ lô có hạn gần nhất; thừa thì cộng vào lô có hạn xa nhất. |
| Cảnh báo tồn kho (UC_3.2, Q13) | Tính lại sau mỗi lần tồn kho thay đổi và chạy job mỗi ngày. Thêm lô mới thì chuyển các cảnh báo của lô cũ cùng mặt hàng sang "Đã xử lý". |
| Quyền mua nợ (Q23) | Job hằng ngày đặt `QuyenMuaNo = 0` khi khách có khoản quá hạn. Sau khi thu nợ hoặc hủy hóa đơn, nếu không còn khoản quá hạn thì đặt lại `QuyenMuaNo = 1`. |
| Ưu tiên dữ liệu Chủ quán (NFR Supportability-03) | Dùng cột `ROWVERSION`. Khi xung đột: request của Chủ quán được ghi đè, request của Nhân viên nhận thông báo "Dữ liệu đã thay đổi, vui lòng tải lại". |
| Thời hạn đổi trả 7 ngày (UC_6.2 BR01) | `DATEDIFF(day, NgayGioLap, thời điểm lập phiếu) <= 6`, vì ngày lập hóa đơn là ngày thứ 1. |
| Số lượng còn được đổi trả (UC_6.2 BR02) | Số lượng đã mua − số lượng trên phiếu đã duyệt − số lượng trên phiếu đang chờ duyệt. |

---

## 7. Tóm tắt thay đổi so với báo cáo

| Loại | Số lượng | Nội dung chính |
|---|---|---|
| Sửa lỗi | 2 | CHECK sai cú pháp ở `NguoiDung.SDT`; cột mã `CHAR(10)` không chứa nổi mã thật |
| Thống nhất tên | 7 | `SoLuongThucTe`, `MaHDNo`, `MaKQ`, 'Sắp hết hạn', 'Từ chối', 'Chuyển khoản QR', trạng thái ca |
| Khớp quy tắc nghiệp vụ | 12 | Trạng thái tài khoản và khách quen, UNIQUE SĐT và tên hàng, giá và ngưỡng > 0, HSD bắt buộc, `QuyenMuaNo` mặc định 1, ... |
| Cột thêm | 21 | `HoaDon.MaND/TongTien`, `ChiTietHoaDon.MaLo/GiaVon/ThanhTien`, `HangHoa.MaVach`, `BienBanKetCa.MaND`, ... |
| Bảng thêm | 7 | BoDemMa, CauHinh, NhatKyThaoTac, PhienDangNhap, MaXacThuc, ThongBao, NhatKyGuiChungTu |
| View | 2 | `v_DuNoKhachQuen`, `v_TonKhoHangHoa` |

Phần ước lượng dung lượng trong báo cáo cần tính lại sau khi chốt thiết kế này, vì độ dài cột mã và số bảng đã thay đổi.
