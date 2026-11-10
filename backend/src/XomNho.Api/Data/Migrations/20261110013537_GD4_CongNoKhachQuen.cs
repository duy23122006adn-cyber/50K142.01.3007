using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace XomNho.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class GD4_CongNoKhachQuen : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropCheckConstraint(
                name: "CK_PTT_BanHang",
                table: "PhieuThanhToan");

            migrationBuilder.AddColumn<string>(
                name: "MaKQ",
                table: "PhieuThanhToan",
                type: "varchar(20)",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "KhachQuen",
                columns: table => new
                {
                    MaKH = table.Column<string>(type: "varchar(20)", nullable: false),
                    CCCD = table.Column<string>(type: "char(12)", nullable: false),
                    DiaChi = table.Column<string>(type: "nvarchar(200)", nullable: false),
                    TrangThai = table.Column<string>(type: "nvarchar(25)", nullable: false, defaultValue: "Đang hoạt động"),
                    QuyenMuaNo = table.Column<bool>(type: "bit", nullable: false, defaultValue: true),
                    PhienBan = table.Column<byte[]>(type: "rowversion", rowVersion: true, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_KhachQuen", x => x.MaKH);
                    table.CheckConstraint("CK_KhachQuen_CCCD", "LEN([CCCD]) = 12 AND [CCCD] NOT LIKE '%[^0-9]%'");
                    table.CheckConstraint("CK_KhachQuen_DiaChi", "LEN(LTRIM(RTRIM([DiaChi]))) > 0");
                    table.CheckConstraint("CK_KhachQuen_TrangThai", "[TrangThai] IN (N'Đang hoạt động', N'Đã xóa')");
                    table.ForeignKey(
                        name: "FK_KhachQuen_KhachHang_MaKH",
                        column: x => x.MaKH,
                        principalTable: "KhachHang",
                        principalColumn: "MaKH",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "HoaDonNo",
                columns: table => new
                {
                    MaHD = table.Column<string>(type: "varchar(20)", nullable: false),
                    HanThanhToan = table.Column<DateOnly>(type: "date", nullable: false),
                    MaKQ = table.Column<string>(type: "varchar(20)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_HoaDonNo", x => x.MaHD);
                    table.ForeignKey(
                        name: "FK_HoaDonNo_HoaDon_MaHD",
                        column: x => x.MaHD,
                        principalTable: "HoaDon",
                        principalColumn: "MaHD",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_HoaDonNo_KhachQuen_MaKQ",
                        column: x => x.MaKQ,
                        principalTable: "KhachQuen",
                        principalColumn: "MaKH",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "PhanBoThanhToan",
                columns: table => new
                {
                    MaPTT = table.Column<string>(type: "varchar(20)", nullable: false),
                    MaHDNo = table.Column<string>(type: "varchar(20)", nullable: false),
                    SoTienPhanBo = table.Column<decimal>(type: "decimal(15,0)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PhanBoThanhToan", x => new { x.MaPTT, x.MaHDNo });
                    table.CheckConstraint("CK_PhanBo_SoTien", "[SoTienPhanBo] > 0");
                    table.ForeignKey(
                        name: "FK_PhanBoThanhToan_HoaDonNo_MaHDNo",
                        column: x => x.MaHDNo,
                        principalTable: "HoaDonNo",
                        principalColumn: "MaHD",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_PhanBoThanhToan_PhieuThanhToan_MaPTT",
                        column: x => x.MaPTT,
                        principalTable: "PhieuThanhToan",
                        principalColumn: "MaPTT",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_PhieuThanhToan_MaKQ",
                table: "PhieuThanhToan",
                column: "MaKQ");

            migrationBuilder.AddCheckConstraint(
                name: "CK_PTT_BanHang",
                table: "PhieuThanhToan",
                sql: "[LoaiPhieu] <> N'Bán hàng' OR ([HuongTien] = N'Thu' AND [MaKQ] IS NULL)");

            migrationBuilder.AddCheckConstraint(
                name: "CK_PTT_ThuNo",
                table: "PhieuThanhToan",
                sql: "[LoaiPhieu] <> N'Thu nợ' OR ([HuongTien] = N'Thu' AND [MaKQ] IS NOT NULL AND [MaHDTTN] IS NULL)");

            migrationBuilder.CreateIndex(
                name: "IX_HoaDonNo_MaKQ",
                table: "HoaDonNo",
                column: "MaKQ");

            migrationBuilder.CreateIndex(
                name: "UX_KhachQuen_CCCD",
                table: "KhachQuen",
                column: "CCCD",
                unique: true,
                filter: "[TrangThai] = N'Đang hoạt động'");

            migrationBuilder.CreateIndex(
                name: "IX_PhanBoThanhToan_MaHDNo",
                table: "PhanBoThanhToan",
                column: "MaHDNo");

            migrationBuilder.AddForeignKey(
                name: "FK_PhieuThanhToan_KhachQuen_MaKQ",
                table: "PhieuThanhToan",
                column: "MaKQ",
                principalTable: "KhachQuen",
                principalColumn: "MaKH",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_PhieuThanhToan_KhachQuen_MaKQ",
                table: "PhieuThanhToan");

            migrationBuilder.DropTable(
                name: "PhanBoThanhToan");

            migrationBuilder.DropTable(
                name: "HoaDonNo");

            migrationBuilder.DropTable(
                name: "KhachQuen");

            migrationBuilder.DropIndex(
                name: "IX_PhieuThanhToan_MaKQ",
                table: "PhieuThanhToan");

            migrationBuilder.DropCheckConstraint(
                name: "CK_PTT_BanHang",
                table: "PhieuThanhToan");

            migrationBuilder.DropCheckConstraint(
                name: "CK_PTT_ThuNo",
                table: "PhieuThanhToan");

            migrationBuilder.DropColumn(
                name: "MaKQ",
                table: "PhieuThanhToan");

            migrationBuilder.AddCheckConstraint(
                name: "CK_PTT_BanHang",
                table: "PhieuThanhToan",
                sql: "[LoaiPhieu] <> N'Bán hàng' OR [HuongTien] = N'Thu'");
        }
    }
}
