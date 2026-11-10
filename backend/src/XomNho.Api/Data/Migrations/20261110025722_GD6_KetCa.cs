using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace XomNho.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class GD6_KetCa : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "BienBanKetCa",
                columns: table => new
                {
                    MaBB = table.Column<string>(type: "varchar(20)", nullable: false),
                    NgayGioLuu = table.Column<DateTime>(type: "datetime2(0)", nullable: false, defaultValueSql: "SYSDATETIME()"),
                    MaCa = table.Column<string>(type: "varchar(20)", nullable: false),
                    MaND = table.Column<string>(type: "varchar(20)", nullable: false),
                    CoChenhLech = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_BienBanKetCa", x => x.MaBB);
                    table.ForeignKey(
                        name: "FK_BienBanKetCa_CaLamViec_MaCa",
                        column: x => x.MaCa,
                        principalTable: "CaLamViec",
                        principalColumn: "MaCa",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_BienBanKetCa_NguoiDung_MaND",
                        column: x => x.MaND,
                        principalTable: "NguoiDung",
                        principalColumn: "MaND",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "ChiTietBienBan",
                columns: table => new
                {
                    MaCTBB = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    MaBB = table.Column<string>(type: "varchar(20)", nullable: false),
                    MaHH = table.Column<string>(type: "varchar(20)", nullable: false),
                    SoLuongLyThuyet = table.Column<int>(type: "int", nullable: false),
                    SoLuongThucTe = table.Column<int>(type: "int", nullable: false),
                    ChenhLech = table.Column<int>(type: "int", nullable: false, computedColumnSql: "[SoLuongThucTe] - [SoLuongLyThuyet]", stored: true),
                    NguyenNhan = table.Column<string>(type: "nvarchar(255)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ChiTietBienBan", x => x.MaCTBB);
                    table.CheckConstraint("CK_CTBB_LyThuyet", "[SoLuongLyThuyet] >= 0");
                    table.CheckConstraint("CK_CTBB_NguyenNhan", "[SoLuongThucTe] = [SoLuongLyThuyet] OR LEN(LTRIM(RTRIM(ISNULL([NguyenNhan], N'')))) > 0");
                    table.CheckConstraint("CK_CTBB_ThucTe", "[SoLuongThucTe] >= 0");
                    table.ForeignKey(
                        name: "FK_ChiTietBienBan_BienBanKetCa_MaBB",
                        column: x => x.MaBB,
                        principalTable: "BienBanKetCa",
                        principalColumn: "MaBB",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_ChiTietBienBan_HangHoa_MaHH",
                        column: x => x.MaHH,
                        principalTable: "HangHoa",
                        principalColumn: "MaHH",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_BienBanKetCa_MaND",
                table: "BienBanKetCa",
                column: "MaND");

            migrationBuilder.CreateIndex(
                name: "IX_BienBanKetCa_NgayGioLuu",
                table: "BienBanKetCa",
                column: "NgayGioLuu");

            migrationBuilder.CreateIndex(
                name: "UX_BienBanKetCa_MaCa",
                table: "BienBanKetCa",
                column: "MaCa",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_ChiTietBienBan_MaHH",
                table: "ChiTietBienBan",
                column: "MaHH");

            migrationBuilder.CreateIndex(
                name: "UX_CTBB_MaBB_MaHH",
                table: "ChiTietBienBan",
                columns: new[] { "MaBB", "MaHH" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ChiTietBienBan");

            migrationBuilder.DropTable(
                name: "BienBanKetCa");
        }
    }
}
