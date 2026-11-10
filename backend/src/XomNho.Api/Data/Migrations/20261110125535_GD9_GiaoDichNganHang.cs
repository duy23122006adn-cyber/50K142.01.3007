using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace XomNho.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class GD9_GiaoDichNganHang : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "GiaoDichNganHang",
                columns: table => new
                {
                    MaGD = table.Column<string>(type: "varchar(100)", nullable: false),
                    SoTien = table.Column<decimal>(type: "decimal(15,0)", nullable: false),
                    NoiDung = table.Column<string>(type: "nvarchar(500)", nullable: false),
                    ThoiDiemNhan = table.Column<DateTime>(type: "datetime2(0)", nullable: false),
                    DuLieuGoc = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    MaPTT = table.Column<string>(type: "varchar(20)", nullable: true),
                    PhienBan = table.Column<byte[]>(type: "rowversion", rowVersion: true, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_GiaoDichNganHang", x => x.MaGD);
                    table.CheckConstraint("CK_GDNH_SoTien", "[SoTien] > 0");
                    table.ForeignKey(
                        name: "FK_GiaoDichNganHang_PhieuThanhToan_MaPTT",
                        column: x => x.MaPTT,
                        principalTable: "PhieuThanhToan",
                        principalColumn: "MaPTT",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_GDNH_ThoiDiemNhan",
                table: "GiaoDichNganHang",
                column: "ThoiDiemNhan");

            migrationBuilder.CreateIndex(
                name: "UX_GDNH_MaPTT",
                table: "GiaoDichNganHang",
                column: "MaPTT",
                unique: true,
                filter: "[MaPTT] IS NOT NULL");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "GiaoDichNganHang");
        }
    }
}
