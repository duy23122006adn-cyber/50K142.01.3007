using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace XomNho.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class GD5_HuyDoiTra : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropCheckConstraint(
                name: "CK_PTT_BanHang",
                table: "PhieuThanhToan");

            migrationBuilder.DropCheckConstraint(
                name: "CK_PTT_ThuNo",
                table: "PhieuThanhToan");

            migrationBuilder.AddColumn<string>(
                name: "MaPDT",
                table: "PhieuThanhToan",
                type: "varchar(20)",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "NhatKyHuy",
                columns: table => new
                {
                    MaNK = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    MaHD = table.Column<string>(type: "varchar(20)", nullable: false),
                    MaCQ = table.Column<string>(type: "varchar(20)", nullable: false),
                    LyDoHuy = table.Column<string>(type: "nvarchar(255)", nullable: false),
                    ThoiGianHuy = table.Column<DateTime>(type: "datetime2(0)", nullable: false, defaultValueSql: "SYSDATETIME()"),
                    TongTien = table.Column<decimal>(type: "decimal(15,0)", nullable: false),
                    SoTienCanHoan = table.Column<decimal>(type: "decimal(15,0)", nullable: false),
                    XacNhanChuaNhanHang = table.Column<bool>(type: "bit", nullable: false),
                    BanSaoHoaDon = table.Column<string>(type: "nvarchar(max)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_NhatKyHuy", x => x.MaNK);
                    table.CheckConstraint("CK_NhatKyHuy_BanSao", "ISJSON([BanSaoHoaDon]) = 1");
                    table.CheckConstraint("CK_NhatKyHuy_ChuaNhanHang", "[XacNhanChuaNhanHang] = 1");
                    table.CheckConstraint("CK_NhatKyHuy_LyDo", "LEN(LTRIM(RTRIM([LyDoHuy]))) > 0");
                    table.CheckConstraint("CK_NhatKyHuy_SoTienCanHoan", "[SoTienCanHoan] >= 0 AND [SoTienCanHoan] <= [TongTien]");
                    table.CheckConstraint("CK_NhatKyHuy_TongTien", "[TongTien] > 0");
                    table.ForeignKey(
                        name: "FK_NhatKyHuy_ChuQuan_MaCQ",
                        column: x => x.MaCQ,
                        principalTable: "ChuQuan",
                        principalColumn: "MaND",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_NhatKyHuy_HoaDon_MaHD",
                        column: x => x.MaHD,
                        principalTable: "HoaDon",
                        principalColumn: "MaHD",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "PhieuDoiTra",
                columns: table => new
                {
                    MaPDT = table.Column<string>(type: "varchar(20)", nullable: false),
                    LoaiPhieu = table.Column<string>(type: "nvarchar(25)", nullable: false),
                    NgayGioLap = table.Column<DateTime>(type: "datetime2(0)", nullable: false, defaultValueSql: "SYSDATETIME()"),
                    LyDoDoiTra = table.Column<string>(type: "nvarchar(255)", nullable: false),
                    TrangThai = table.Column<string>(type: "nvarchar(25)", nullable: false, defaultValue: "Chờ duyệt"),
                    SoTienHoan = table.Column<decimal>(type: "decimal(15,0)", nullable: false, defaultValue: 0m),
                    ChenhLech = table.Column<decimal>(type: "decimal(15,0)", nullable: false, defaultValue: 0m),
                    LyDoTuChoi = table.Column<string>(type: "nvarchar(255)", nullable: true),
                    NgayGioDuyet = table.Column<DateTime>(type: "datetime2(0)", nullable: true),
                    NgayGioHoanTat = table.Column<DateTime>(type: "datetime2(0)", nullable: true),
                    MaHD = table.Column<string>(type: "varchar(20)", nullable: false),
                    MaND = table.Column<string>(type: "varchar(20)", nullable: false),
                    MaCQ = table.Column<string>(type: "varchar(20)", nullable: true),
                    PhienBan = table.Column<byte[]>(type: "rowversion", rowVersion: true, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PhieuDoiTra", x => x.MaPDT);
                    table.CheckConstraint("CK_PDT_Duyet", "([TrangThai] = N'Chờ duyệt' AND [MaCQ] IS NULL AND [NgayGioDuyet] IS NULL) OR ([TrangThai] <> N'Chờ duyệt' AND [MaCQ] IS NOT NULL AND [NgayGioDuyet] IS NOT NULL)");
                    table.CheckConstraint("CK_PDT_HoanTat", "[NgayGioHoanTat] IS NULL OR [TrangThai] = N'Đã duyệt'");
                    table.CheckConstraint("CK_PDT_LoaiPhieu", "[LoaiPhieu] IN (N'Đổi hàng', N'Trả hàng')");
                    table.CheckConstraint("CK_PDT_LyDo", "LEN(LTRIM(RTRIM([LyDoDoiTra]))) > 0");
                    table.CheckConstraint("CK_PDT_LyDoTuChoi", "[TrangThai] <> N'Từ chối' OR LEN(LTRIM(RTRIM(ISNULL([LyDoTuChoi], N'')))) > 0");
                    table.CheckConstraint("CK_PDT_SoTienHoan", "[SoTienHoan] >= 0");
                    table.CheckConstraint("CK_PDT_TrangThai", "[TrangThai] IN (N'Chờ duyệt', N'Đã duyệt', N'Từ chối', N'Không hoàn tất')");
                    table.ForeignKey(
                        name: "FK_PhieuDoiTra_ChuQuan_MaCQ",
                        column: x => x.MaCQ,
                        principalTable: "ChuQuan",
                        principalColumn: "MaND",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_PhieuDoiTra_HoaDon_MaHD",
                        column: x => x.MaHD,
                        principalTable: "HoaDon",
                        principalColumn: "MaHD",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_PhieuDoiTra_NguoiDung_MaND",
                        column: x => x.MaND,
                        principalTable: "NguoiDung",
                        principalColumn: "MaND",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "ThongBao",
                columns: table => new
                {
                    MaTB = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    MaND = table.Column<string>(type: "varchar(20)", nullable: false),
                    LoaiThongBao = table.Column<string>(type: "nvarchar(50)", nullable: false),
                    NoiDung = table.Column<string>(type: "nvarchar(500)", nullable: false),
                    MaThamChieu = table.Column<string>(type: "varchar(20)", nullable: true),
                    ThoiDiemTao = table.Column<DateTime>(type: "datetime2(0)", nullable: false, defaultValueSql: "SYSDATETIME()"),
                    DaDoc = table.Column<bool>(type: "bit", nullable: false, defaultValue: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ThongBao", x => x.MaTB);
                    table.ForeignKey(
                        name: "FK_ThongBao_NguoiDung_MaND",
                        column: x => x.MaND,
                        principalTable: "NguoiDung",
                        principalColumn: "MaND",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "ChiTietDoiTra",
                columns: table => new
                {
                    MaCTDT = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    MaPDT = table.Column<string>(type: "varchar(20)", nullable: false),
                    MaCTHD = table.Column<int>(type: "int", nullable: false),
                    SoLuongTra = table.Column<int>(type: "int", nullable: false),
                    GiaTriHoan = table.Column<decimal>(type: "decimal(15,0)", nullable: false),
                    TinhTrangHang = table.Column<string>(type: "nvarchar(100)", nullable: false),
                    LoiNhaSanXuat = table.Column<bool>(type: "bit", nullable: false, defaultValue: false),
                    MoTaLoi = table.Column<string>(type: "nvarchar(255)", nullable: true),
                    MaHHMoi = table.Column<string>(type: "varchar(20)", nullable: true),
                    SoLuongMoi = table.Column<int>(type: "int", nullable: true),
                    GiaTriHangMoi = table.Column<decimal>(type: "decimal(15,0)", nullable: true),
                    MaLoMoi = table.Column<string>(type: "varchar(20)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ChiTietDoiTra", x => x.MaCTDT);
                    table.CheckConstraint("CK_CTDT_GiaTriHangMoi", "[GiaTriHangMoi] IS NULL OR [GiaTriHangMoi] >= 0");
                    table.CheckConstraint("CK_CTDT_GiaTriHoan", "[GiaTriHoan] >= 0");
                    table.CheckConstraint("CK_CTDT_HangMoi", "([MaHHMoi] IS NULL AND [SoLuongMoi] IS NULL AND [GiaTriHangMoi] IS NULL) OR ([MaHHMoi] IS NOT NULL AND [SoLuongMoi] IS NOT NULL AND [GiaTriHangMoi] IS NOT NULL)");
                    table.CheckConstraint("CK_CTDT_MoTaLoi", "[LoiNhaSanXuat] = 0 OR LEN(LTRIM(RTRIM(ISNULL([MoTaLoi], N'')))) > 0");
                    table.CheckConstraint("CK_CTDT_SoLuongMoi", "[SoLuongMoi] IS NULL OR [SoLuongMoi] > 0");
                    table.CheckConstraint("CK_CTDT_SoLuongTra", "[SoLuongTra] > 0");
                    table.CheckConstraint("CK_CTDT_TinhTrang", "LEN(LTRIM(RTRIM([TinhTrangHang]))) > 0");
                    table.ForeignKey(
                        name: "FK_ChiTietDoiTra_ChiTietHoaDon_MaCTHD",
                        column: x => x.MaCTHD,
                        principalTable: "ChiTietHoaDon",
                        principalColumn: "MaCTHD",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_ChiTietDoiTra_HangHoa_MaHHMoi",
                        column: x => x.MaHHMoi,
                        principalTable: "HangHoa",
                        principalColumn: "MaHH",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_ChiTietDoiTra_LoHang_MaLoMoi",
                        column: x => x.MaLoMoi,
                        principalTable: "LoHang",
                        principalColumn: "MaLo",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_ChiTietDoiTra_PhieuDoiTra_MaPDT",
                        column: x => x.MaPDT,
                        principalTable: "PhieuDoiTra",
                        principalColumn: "MaPDT",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_PhieuThanhToan_MaPDT",
                table: "PhieuThanhToan",
                column: "MaPDT");

            migrationBuilder.AddCheckConstraint(
                name: "CK_PTT_BanHang",
                table: "PhieuThanhToan",
                sql: "[LoaiPhieu] <> N'Bán hàng' OR ([HuongTien] = N'Thu' AND [MaKQ] IS NULL AND [MaPDT] IS NULL)");

            migrationBuilder.AddCheckConstraint(
                name: "CK_PTT_DoiTra",
                table: "PhieuThanhToan",
                sql: "[LoaiPhieu] <> N'Đổi trả' OR ([MaPDT] IS NOT NULL AND [MaKQ] IS NULL AND [MaHDTTN] IS NULL)");

            migrationBuilder.AddCheckConstraint(
                name: "CK_PTT_ThuNo",
                table: "PhieuThanhToan",
                sql: "[LoaiPhieu] <> N'Thu nợ' OR ([HuongTien] = N'Thu' AND [MaKQ] IS NOT NULL AND [MaHDTTN] IS NULL AND [MaPDT] IS NULL)");

            migrationBuilder.CreateIndex(
                name: "IX_ChiTietDoiTra_MaHHMoi",
                table: "ChiTietDoiTra",
                column: "MaHHMoi");

            migrationBuilder.CreateIndex(
                name: "IX_ChiTietDoiTra_MaLoMoi",
                table: "ChiTietDoiTra",
                column: "MaLoMoi");

            migrationBuilder.CreateIndex(
                name: "IX_ChiTietDoiTra_MaPDT",
                table: "ChiTietDoiTra",
                column: "MaPDT");

            migrationBuilder.CreateIndex(
                name: "IX_CTDT_MaCTHD",
                table: "ChiTietDoiTra",
                column: "MaCTHD");

            migrationBuilder.CreateIndex(
                name: "IX_NhatKyHuy_MaCQ",
                table: "NhatKyHuy",
                column: "MaCQ");

            migrationBuilder.CreateIndex(
                name: "UX_NhatKyHuy_MaHD",
                table: "NhatKyHuy",
                column: "MaHD",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_PDT_MaHD",
                table: "PhieuDoiTra",
                column: "MaHD");

            migrationBuilder.CreateIndex(
                name: "IX_PDT_TrangThai_NgayGioLap",
                table: "PhieuDoiTra",
                columns: new[] { "TrangThai", "NgayGioLap" });

            migrationBuilder.CreateIndex(
                name: "IX_PhieuDoiTra_MaCQ",
                table: "PhieuDoiTra",
                column: "MaCQ");

            migrationBuilder.CreateIndex(
                name: "IX_PhieuDoiTra_MaND",
                table: "PhieuDoiTra",
                column: "MaND");

            migrationBuilder.CreateIndex(
                name: "IX_ThongBao_MaND_DaDoc",
                table: "ThongBao",
                columns: new[] { "MaND", "DaDoc" });

            migrationBuilder.AddForeignKey(
                name: "FK_PhieuThanhToan_PhieuDoiTra_MaPDT",
                table: "PhieuThanhToan",
                column: "MaPDT",
                principalTable: "PhieuDoiTra",
                principalColumn: "MaPDT",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_PhieuThanhToan_PhieuDoiTra_MaPDT",
                table: "PhieuThanhToan");

            migrationBuilder.DropTable(
                name: "ChiTietDoiTra");

            migrationBuilder.DropTable(
                name: "NhatKyHuy");

            migrationBuilder.DropTable(
                name: "ThongBao");

            migrationBuilder.DropTable(
                name: "PhieuDoiTra");

            migrationBuilder.DropIndex(
                name: "IX_PhieuThanhToan_MaPDT",
                table: "PhieuThanhToan");

            migrationBuilder.DropCheckConstraint(
                name: "CK_PTT_BanHang",
                table: "PhieuThanhToan");

            migrationBuilder.DropCheckConstraint(
                name: "CK_PTT_DoiTra",
                table: "PhieuThanhToan");

            migrationBuilder.DropCheckConstraint(
                name: "CK_PTT_ThuNo",
                table: "PhieuThanhToan");

            migrationBuilder.DropColumn(
                name: "MaPDT",
                table: "PhieuThanhToan");

            migrationBuilder.AddCheckConstraint(
                name: "CK_PTT_BanHang",
                table: "PhieuThanhToan",
                sql: "[LoaiPhieu] <> N'Bán hàng' OR ([HuongTien] = N'Thu' AND [MaKQ] IS NULL)");

            migrationBuilder.AddCheckConstraint(
                name: "CK_PTT_ThuNo",
                table: "PhieuThanhToan",
                sql: "[LoaiPhieu] <> N'Thu nợ' OR ([HuongTien] = N'Thu' AND [MaKQ] IS NOT NULL AND [MaHDTTN] IS NULL)");
        }
    }
}
