using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace XomNho.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class GD7_BaoCao : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<decimal>(
                name: "GiaVonHangMoi",
                table: "ChiTietDoiTra",
                type: "decimal(15,0)",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_PDT_NgayGioDuyet",
                table: "PhieuDoiTra",
                column: "NgayGioDuyet");

            migrationBuilder.AddCheckConstraint(
                name: "CK_CTDT_GiaVonHangMoi",
                table: "ChiTietDoiTra",
                sql: "[GiaVonHangMoi] IS NULL OR ([MaHHMoi] IS NOT NULL AND [GiaVonHangMoi] >= 0)");

            // Phiếu đổi hàng đã hoàn tất trước GĐ7: lấy giá nhập hiện tại của hàng mới làm giá vốn.
            migrationBuilder.Sql("""
                UPDATE c SET c.GiaVonHangMoi = h.GiaNhap
                FROM ChiTietDoiTra c
                JOIN PhieuDoiTra p ON p.MaPDT = c.MaPDT
                JOIN HangHoa h ON h.MaHH = c.MaHHMoi
                WHERE c.MaHHMoi IS NOT NULL AND c.GiaVonHangMoi IS NULL AND p.NgayGioHoanTat IS NOT NULL;
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_PDT_NgayGioDuyet",
                table: "PhieuDoiTra");

            migrationBuilder.DropCheckConstraint(
                name: "CK_CTDT_GiaVonHangMoi",
                table: "ChiTietDoiTra");

            migrationBuilder.DropColumn(
                name: "GiaVonHangMoi",
                table: "ChiTietDoiTra");
        }
    }
}
