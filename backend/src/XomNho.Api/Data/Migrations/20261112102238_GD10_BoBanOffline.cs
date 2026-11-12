using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace XomNho.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class GD10_BoBanOffline : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "HoaDonTam");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "HoaDonTam",
                columns: table => new
                {
                    MaTam = table.Column<string>(type: "varchar(20)", nullable: false),
                    MaHD = table.Column<string>(type: "varchar(20)", nullable: true),
                    MaND = table.Column<string>(type: "varchar(20)", nullable: false),
                    LyDo = table.Column<string>(type: "nvarchar(255)", nullable: true),
                    MaKH = table.Column<string>(type: "varchar(20)", nullable: true),
                    MaNguoiDongBo = table.Column<string>(type: "varchar(20)", nullable: false),
                    MaNguoiXuLy = table.Column<string>(type: "varchar(20)", nullable: true),
                    NgayGioBan = table.Column<DateTime>(type: "datetime2(0)", nullable: false),
                    NgayGioDongBo = table.Column<DateTime>(type: "datetime2(0)", nullable: false),
                    NgayGioXuLy = table.Column<DateTime>(type: "datetime2(0)", nullable: true),
                    NoiDung = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    PhienBan = table.Column<byte[]>(type: "rowversion", rowVersion: true, nullable: false),
                    TienKhachDua = table.Column<decimal>(type: "decimal(15,0)", nullable: false),
                    TongTien = table.Column<decimal>(type: "decimal(15,0)", nullable: false),
                    TrangThai = table.Column<string>(type: "nvarchar(30)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_HoaDonTam", x => x.MaTam);
                    table.CheckConstraint("CK_HDT_MaHD", "([TrangThai] = N'Đã ghi nhận' AND [MaHD] IS NOT NULL) OR ([TrangThai] <> N'Đã ghi nhận' AND [MaHD] IS NULL AND LEN(LTRIM(RTRIM(ISNULL([LyDo], N'')))) > 0)");
                    table.CheckConstraint("CK_HDT_NoiDung", "ISJSON([NoiDung]) = 1");
                    table.CheckConstraint("CK_HDT_TongTien", "[TongTien] > 0 AND [TienKhachDua] >= [TongTien]");
                    table.CheckConstraint("CK_HDT_TrangThai", "[TrangThai] IN (N'Đã ghi nhận', N'Chờ Chủ quán xử lý', N'Đã hủy')");
                    table.ForeignKey(
                        name: "FK_HoaDonTam_HoaDon_MaHD",
                        column: x => x.MaHD,
                        principalTable: "HoaDon",
                        principalColumn: "MaHD",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_HoaDonTam_KhachHang_MaKH",
                        column: x => x.MaKH,
                        principalTable: "KhachHang",
                        principalColumn: "MaKH",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_HoaDonTam_NguoiDung_MaND",
                        column: x => x.MaND,
                        principalTable: "NguoiDung",
                        principalColumn: "MaND",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_HoaDonTam_NguoiDung_MaNguoiDongBo",
                        column: x => x.MaNguoiDongBo,
                        principalTable: "NguoiDung",
                        principalColumn: "MaND",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_HoaDonTam_NguoiDung_MaNguoiXuLy",
                        column: x => x.MaNguoiXuLy,
                        principalTable: "NguoiDung",
                        principalColumn: "MaND",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_HoaDonTam_MaKH",
                table: "HoaDonTam",
                column: "MaKH");

            migrationBuilder.CreateIndex(
                name: "IX_HoaDonTam_MaND",
                table: "HoaDonTam",
                column: "MaND");

            migrationBuilder.CreateIndex(
                name: "IX_HoaDonTam_MaNguoiDongBo",
                table: "HoaDonTam",
                column: "MaNguoiDongBo");

            migrationBuilder.CreateIndex(
                name: "IX_HoaDonTam_MaNguoiXuLy",
                table: "HoaDonTam",
                column: "MaNguoiXuLy");

            migrationBuilder.CreateIndex(
                name: "IX_HoaDonTam_TrangThai",
                table: "HoaDonTam",
                columns: new[] { "TrangThai", "NgayGioBan" });

            migrationBuilder.CreateIndex(
                name: "UX_HoaDonTam_MaHD",
                table: "HoaDonTam",
                column: "MaHD",
                unique: true,
                filter: "[MaHD] IS NOT NULL");
        }
    }
}
