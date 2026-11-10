using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace XomNho.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class GD3_CaKhachHangBanHang : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "CaLamViec",
                columns: table => new
                {
                    MaCa = table.Column<string>(type: "varchar(20)", nullable: false),
                    NgayLamViec = table.Column<DateOnly>(type: "date", nullable: false, defaultValueSql: "CAST(GETDATE() AS DATE)"),
                    GioBatDau = table.Column<TimeOnly>(type: "time(0)", nullable: false),
                    GioKetThuc = table.Column<TimeOnly>(type: "time(0)", nullable: true),
                    TrangThai = table.Column<string>(type: "nvarchar(25)", nullable: false, defaultValue: "Đang hoạt động"),
                    MaND = table.Column<string>(type: "varchar(20)", nullable: false),
                    KhoaCaMo = table.Column<string>(type: "varchar(20)", nullable: true, computedColumnSql: "CASE WHEN [TrangThai] = N'Đã kết thúc' THEN [MaCa] ELSE 'DANG_MO' END", stored: true),
                    PhienBan = table.Column<byte[]>(type: "rowversion", rowVersion: true, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CaLamViec", x => x.MaCa);
                    table.CheckConstraint("CK_CaLamViec_GioKetThuc", "([TrangThai] = N'Đã kết thúc' AND [GioKetThuc] IS NOT NULL) OR ([TrangThai] <> N'Đã kết thúc' AND [GioKetThuc] IS NULL)");
                    table.CheckConstraint("CK_CaLamViec_TrangThai", "[TrangThai] IN (N'Đang hoạt động', N'Đang kết ca', N'Đã kết thúc')");
                    table.ForeignKey(
                        name: "FK_CaLamViec_NguoiDung_MaND",
                        column: x => x.MaND,
                        principalTable: "NguoiDung",
                        principalColumn: "MaND",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "KhachHang",
                columns: table => new
                {
                    MaKH = table.Column<string>(type: "varchar(20)", nullable: false),
                    HoTen = table.Column<string>(type: "nvarchar(50)", nullable: false),
                    SDT = table.Column<string>(type: "char(10)", nullable: false),
                    PhienBan = table.Column<byte[]>(type: "rowversion", rowVersion: true, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_KhachHang", x => x.MaKH);
                    table.CheckConstraint("CK_KhachHang_HoTen", "LEN(LTRIM(RTRIM([HoTen]))) > 0");
                    table.CheckConstraint("CK_KhachHang_SDT", "LEN([SDT]) = 10 AND [SDT] LIKE '0%' AND [SDT] NOT LIKE '%[^0-9]%'");
                });

            migrationBuilder.CreateTable(
                name: "NhatKyGuiChungTu",
                columns: table => new
                {
                    MaGui = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    LoaiChungTu = table.Column<string>(type: "nvarchar(25)", nullable: false),
                    MaChungTu = table.Column<string>(type: "varchar(20)", nullable: false),
                    Kenh = table.Column<string>(type: "nvarchar(10)", nullable: false),
                    SDTNhan = table.Column<string>(type: "char(10)", nullable: false),
                    ThoiDiemGui = table.Column<DateTime>(type: "datetime2(0)", nullable: false, defaultValueSql: "SYSDATETIME()"),
                    KetQua = table.Column<string>(type: "nvarchar(25)", nullable: false),
                    MaND = table.Column<string>(type: "varchar(20)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_NhatKyGuiChungTu", x => x.MaGui);
                    table.CheckConstraint("CK_NKGCT_Kenh", "[Kenh] IN (N'SMS', N'Zalo')");
                    table.CheckConstraint("CK_NKGCT_KetQua", "[KetQua] IN (N'Thành công', N'Không thành công')");
                    table.CheckConstraint("CK_NKGCT_LoaiChungTu", "[LoaiChungTu] IN (N'Hóa đơn', N'Phiếu thanh toán')");
                    table.ForeignKey(
                        name: "FK_NhatKyGuiChungTu_NguoiDung_MaND",
                        column: x => x.MaND,
                        principalTable: "NguoiDung",
                        principalColumn: "MaND",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "HoaDon",
                columns: table => new
                {
                    MaHD = table.Column<string>(type: "varchar(20)", nullable: false),
                    NgayGioLap = table.Column<DateTime>(type: "datetime2(0)", nullable: false, defaultValueSql: "SYSDATETIME()"),
                    TongTien = table.Column<decimal>(type: "decimal(15,0)", nullable: false),
                    SoTienDaTra = table.Column<decimal>(type: "decimal(15,0)", nullable: false, defaultValue: 0m),
                    TrangThai = table.Column<string>(type: "nvarchar(25)", nullable: false),
                    MaCa = table.Column<string>(type: "varchar(20)", nullable: false),
                    MaND = table.Column<string>(type: "varchar(20)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_HoaDon", x => x.MaHD);
                    table.CheckConstraint("CK_HoaDon_SoTienDaTra", "[SoTienDaTra] >= 0 AND [SoTienDaTra] <= [TongTien]");
                    table.CheckConstraint("CK_HoaDon_TongTien", "[TongTien] > 0");
                    table.CheckConstraint("CK_HoaDon_TrangThai", "[TrangThai] IN (N'Đã thanh toán', N'Còn nợ', N'Đã hủy')");
                    table.ForeignKey(
                        name: "FK_HoaDon_CaLamViec_MaCa",
                        column: x => x.MaCa,
                        principalTable: "CaLamViec",
                        principalColumn: "MaCa",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_HoaDon_NguoiDung_MaND",
                        column: x => x.MaND,
                        principalTable: "NguoiDung",
                        principalColumn: "MaND",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "ChiTietHoaDon",
                columns: table => new
                {
                    MaCTHD = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    MaHD = table.Column<string>(type: "varchar(20)", nullable: false),
                    MaHH = table.Column<string>(type: "varchar(20)", nullable: false),
                    MaLo = table.Column<string>(type: "varchar(20)", nullable: false),
                    SoLuong = table.Column<int>(type: "int", nullable: false),
                    DonGia = table.Column<decimal>(type: "decimal(15,0)", nullable: false),
                    GiaVon = table.Column<decimal>(type: "decimal(15,0)", nullable: false),
                    ThanhTien = table.Column<decimal>(type: "decimal(25,0)", nullable: false, computedColumnSql: "[SoLuong] * [DonGia]", stored: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ChiTietHoaDon", x => x.MaCTHD);
                    table.CheckConstraint("CK_CTHD_DonGia", "[DonGia] >= 0");
                    table.CheckConstraint("CK_CTHD_GiaVon", "[GiaVon] >= 0");
                    table.CheckConstraint("CK_CTHD_SoLuong", "[SoLuong] > 0");
                    table.ForeignKey(
                        name: "FK_ChiTietHoaDon_HangHoa_MaHH",
                        column: x => x.MaHH,
                        principalTable: "HangHoa",
                        principalColumn: "MaHH",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_ChiTietHoaDon_HoaDon_MaHD",
                        column: x => x.MaHD,
                        principalTable: "HoaDon",
                        principalColumn: "MaHD",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_ChiTietHoaDon_LoHang_MaLo_MaHH",
                        columns: x => new { x.MaLo, x.MaHH },
                        principalTable: "LoHang",
                        principalColumns: new[] { "MaLo", "MaHH" },
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "HoaDonThanhToanNgay",
                columns: table => new
                {
                    MaHD = table.Column<string>(type: "varchar(20)", nullable: false),
                    MaKH = table.Column<string>(type: "varchar(20)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_HoaDonThanhToanNgay", x => x.MaHD);
                    table.ForeignKey(
                        name: "FK_HoaDonThanhToanNgay_HoaDon_MaHD",
                        column: x => x.MaHD,
                        principalTable: "HoaDon",
                        principalColumn: "MaHD",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_HoaDonThanhToanNgay_KhachHang_MaKH",
                        column: x => x.MaKH,
                        principalTable: "KhachHang",
                        principalColumn: "MaKH",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "PhieuThanhToan",
                columns: table => new
                {
                    MaPTT = table.Column<string>(type: "varchar(20)", nullable: false),
                    NgayGio = table.Column<DateTime>(type: "datetime2(0)", nullable: false, defaultValueSql: "SYSDATETIME()"),
                    LoaiPhieu = table.Column<string>(type: "nvarchar(25)", nullable: false),
                    HuongTien = table.Column<string>(type: "nvarchar(10)", nullable: false, defaultValue: "Thu"),
                    SoTien = table.Column<decimal>(type: "decimal(15,0)", nullable: false),
                    PhuongThuc = table.Column<string>(type: "nvarchar(25)", nullable: false),
                    TrangThai = table.Column<string>(type: "nvarchar(25)", nullable: false, defaultValue: "Thành công"),
                    MaGiaoDichNganHang = table.Column<string>(type: "varchar(50)", nullable: true),
                    MaND = table.Column<string>(type: "varchar(20)", nullable: false),
                    MaHDTTN = table.Column<string>(type: "varchar(20)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PhieuThanhToan", x => x.MaPTT);
                    table.CheckConstraint("CK_PTT_BanHang", "[LoaiPhieu] <> N'Bán hàng' OR [HuongTien] = N'Thu'");
                    table.CheckConstraint("CK_PTT_HuongTien", "[HuongTien] IN (N'Thu', N'Chi')");
                    table.CheckConstraint("CK_PTT_LoaiPhieu", "[LoaiPhieu] IN (N'Bán hàng', N'Thu nợ', N'Đổi trả')");
                    table.CheckConstraint("CK_PTT_PhuongThuc", "[PhuongThuc] IN (N'Tiền mặt', N'Chuyển khoản QR')");
                    table.CheckConstraint("CK_PTT_SoTien", "[SoTien] > 0");
                    table.CheckConstraint("CK_PTT_TrangThai", "[TrangThai] IN (N'Thành công', N'Không thành công', N'Đã hủy')");
                    table.ForeignKey(
                        name: "FK_PhieuThanhToan_HoaDonThanhToanNgay_MaHDTTN",
                        column: x => x.MaHDTTN,
                        principalTable: "HoaDonThanhToanNgay",
                        principalColumn: "MaHD",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_PhieuThanhToan_NguoiDung_MaND",
                        column: x => x.MaND,
                        principalTable: "NguoiDung",
                        principalColumn: "MaND",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_CaLamViec_MaND",
                table: "CaLamViec",
                column: "MaND");

            migrationBuilder.CreateIndex(
                name: "UX_CaLamViec_KhoaCaMo",
                table: "CaLamViec",
                column: "KhoaCaMo",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_ChiTietHoaDon_MaHH",
                table: "ChiTietHoaDon",
                column: "MaHH");

            migrationBuilder.CreateIndex(
                name: "IX_ChiTietHoaDon_MaLo_MaHH",
                table: "ChiTietHoaDon",
                columns: new[] { "MaLo", "MaHH" });

            migrationBuilder.CreateIndex(
                name: "IX_CTHD_MaHD",
                table: "ChiTietHoaDon",
                column: "MaHD");

            migrationBuilder.CreateIndex(
                name: "IX_HoaDon_MaCa",
                table: "HoaDon",
                column: "MaCa");

            migrationBuilder.CreateIndex(
                name: "IX_HoaDon_MaND",
                table: "HoaDon",
                column: "MaND");

            migrationBuilder.CreateIndex(
                name: "IX_HoaDon_NgayGioLap",
                table: "HoaDon",
                column: "NgayGioLap");

            migrationBuilder.CreateIndex(
                name: "IX_HoaDonThanhToanNgay_MaKH",
                table: "HoaDonThanhToanNgay",
                column: "MaKH");

            migrationBuilder.CreateIndex(
                name: "IX_KhachHang_HoTen",
                table: "KhachHang",
                column: "HoTen");

            migrationBuilder.CreateIndex(
                name: "UX_KhachHang_SDT",
                table: "KhachHang",
                column: "SDT",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_NhatKyGuiChungTu_MaND",
                table: "NhatKyGuiChungTu",
                column: "MaND");

            migrationBuilder.CreateIndex(
                name: "IX_PhieuThanhToan_MaHDTTN",
                table: "PhieuThanhToan",
                column: "MaHDTTN");

            migrationBuilder.CreateIndex(
                name: "IX_PhieuThanhToan_MaND",
                table: "PhieuThanhToan",
                column: "MaND");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ChiTietHoaDon");

            migrationBuilder.DropTable(
                name: "NhatKyGuiChungTu");

            migrationBuilder.DropTable(
                name: "PhieuThanhToan");

            migrationBuilder.DropTable(
                name: "HoaDonThanhToanNgay");

            migrationBuilder.DropTable(
                name: "HoaDon");

            migrationBuilder.DropTable(
                name: "KhachHang");

            migrationBuilder.DropTable(
                name: "CaLamViec");
        }
    }
}
