using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

#pragma warning disable CA1814 // Prefer jagged arrays over multidimensional

namespace XomNho.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class GD2_HangHoaTonKhoNhanVien : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "DanhMuc",
                columns: table => new
                {
                    MaDM = table.Column<string>(type: "varchar(20)", nullable: false),
                    TenDM = table.Column<string>(type: "nvarchar(100)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_DanhMuc", x => x.MaDM);
                    table.CheckConstraint("CK_DanhMuc_TenDM", "LEN(LTRIM(RTRIM([TenDM]))) > 0");
                });

            migrationBuilder.CreateTable(
                name: "LichSuSuaNhanVien",
                columns: table => new
                {
                    MaLS = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    MaNV = table.Column<string>(type: "varchar(20)", nullable: false),
                    HoTenNV = table.Column<string>(type: "nvarchar(100)", nullable: false),
                    MaCQ = table.Column<string>(type: "varchar(20)", nullable: false),
                    HoTenCQ = table.Column<string>(type: "nvarchar(100)", nullable: false),
                    ThoiDiemSua = table.Column<DateTime>(type: "datetime2(0)", nullable: false, defaultValueSql: "SYSDATETIME()"),
                    NoiDungTruoc = table.Column<string>(type: "nvarchar(1000)", nullable: false),
                    NoiDungSau = table.Column<string>(type: "nvarchar(1000)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_LichSuSuaNhanVien", x => x.MaLS);
                    table.ForeignKey(
                        name: "FK_LichSuSuaNhanVien_ChuQuan_MaCQ",
                        column: x => x.MaCQ,
                        principalTable: "ChuQuan",
                        principalColumn: "MaND",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_LichSuSuaNhanVien_NhanVien_MaNV",
                        column: x => x.MaNV,
                        principalTable: "NhanVien",
                        principalColumn: "MaND",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "HangHoa",
                columns: table => new
                {
                    MaHH = table.Column<string>(type: "varchar(20)", nullable: false),
                    TenHH = table.Column<string>(type: "nvarchar(100)", nullable: false),
                    MaVach = table.Column<string>(type: "varchar(50)", nullable: true),
                    DonViTinh = table.Column<string>(type: "nvarchar(25)", nullable: false),
                    GiaNhap = table.Column<decimal>(type: "decimal(15,0)", nullable: false),
                    GiaBan = table.Column<decimal>(type: "decimal(15,0)", nullable: false),
                    NguongCanhBaoHetHang = table.Column<int>(type: "int", nullable: true),
                    NguongCanhBaoHetHan = table.Column<int>(type: "int", nullable: true),
                    TrangThai = table.Column<string>(type: "nvarchar(25)", nullable: false, defaultValue: "Đang kinh doanh"),
                    MaDM = table.Column<string>(type: "varchar(20)", nullable: false),
                    PhienBan = table.Column<byte[]>(type: "rowversion", rowVersion: true, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_HangHoa", x => x.MaHH);
                    table.CheckConstraint("CK_HangHoa_DonViTinh", "[DonViTinh] IN (N'gói', N'cái', N'chai', N'lon', N'hộp', N'lốc', N'thùng')");
                    table.CheckConstraint("CK_HangHoa_GiaBan", "[GiaBan] > 0");
                    table.CheckConstraint("CK_HangHoa_GiaNhap", "[GiaNhap] > 0");
                    table.CheckConstraint("CK_HangHoa_NguongHetHan", "[NguongCanhBaoHetHan] IS NULL OR [NguongCanhBaoHetHan] > 0");
                    table.CheckConstraint("CK_HangHoa_NguongHetHang", "[NguongCanhBaoHetHang] IS NULL OR [NguongCanhBaoHetHang] > 0");
                    table.CheckConstraint("CK_HangHoa_TenHH", "LEN(LTRIM(RTRIM([TenHH]))) > 0");
                    table.CheckConstraint("CK_HangHoa_TrangThai", "[TrangThai] IN (N'Đang kinh doanh', N'Ngừng kinh doanh')");
                    table.ForeignKey(
                        name: "FK_HangHoa_DanhMuc_MaDM",
                        column: x => x.MaDM,
                        principalTable: "DanhMuc",
                        principalColumn: "MaDM",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "LoHang",
                columns: table => new
                {
                    MaLo = table.Column<string>(type: "varchar(20)", nullable: false),
                    MaHH = table.Column<string>(type: "varchar(20)", nullable: false),
                    SoLuongTon = table.Column<int>(type: "int", nullable: false, defaultValue: 0),
                    HanSuDung = table.Column<DateOnly>(type: "date", nullable: false),
                    NgayNhap = table.Column<DateTime>(type: "datetime2(0)", nullable: false, defaultValueSql: "SYSDATETIME()"),
                    PhienBan = table.Column<byte[]>(type: "rowversion", rowVersion: true, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_LoHang", x => x.MaLo);
                    table.UniqueConstraint("UX_LoHang_MaLo_MaHH", x => new { x.MaLo, x.MaHH });
                    table.CheckConstraint("CK_LoHang_SoLuongTon", "[SoLuongTon] >= 0");
                    table.ForeignKey(
                        name: "FK_LoHang_HangHoa_MaHH",
                        column: x => x.MaHH,
                        principalTable: "HangHoa",
                        principalColumn: "MaHH",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "CanhBaoTonKho",
                columns: table => new
                {
                    MaCB = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    LoaiCanhBao = table.Column<string>(type: "nvarchar(25)", nullable: false),
                    TrangThai = table.Column<string>(type: "nvarchar(25)", nullable: false, defaultValue: "Chưa xử lý"),
                    MaLo = table.Column<string>(type: "varchar(20)", nullable: false),
                    MaHH = table.Column<string>(type: "varchar(20)", nullable: false),
                    ThoiDiemTao = table.Column<DateTime>(type: "datetime2(0)", nullable: false, defaultValueSql: "SYSDATETIME()"),
                    ThoiDiemCapNhat = table.Column<DateTime>(type: "datetime2(0)", nullable: false, defaultValueSql: "SYSDATETIME()"),
                    ThoiDiemXuLy = table.Column<DateTime>(type: "datetime2(0)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CanhBaoTonKho", x => x.MaCB);
                    table.CheckConstraint("CK_CanhBaoTonKho_LoaiCanhBao", "[LoaiCanhBao] IN (N'Sắp hết hàng', N'Hết hàng', N'Sắp hết hạn', N'Hết hạn')");
                    table.CheckConstraint("CK_CanhBaoTonKho_TrangThai", "[TrangThai] IN (N'Chưa xử lý', N'Đã xử lý')");
                    table.ForeignKey(
                        name: "FK_CanhBaoTonKho_LoHang_MaLo_MaHH",
                        columns: x => new { x.MaLo, x.MaHH },
                        principalTable: "LoHang",
                        principalColumns: new[] { "MaLo", "MaHH" },
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "PhieuDieuChinhTon",
                columns: table => new
                {
                    MaPDC = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    NgayGio = table.Column<DateTime>(type: "datetime2(0)", nullable: false, defaultValueSql: "SYSDATETIME()"),
                    MaLo = table.Column<string>(type: "varchar(20)", nullable: false),
                    MaHH = table.Column<string>(type: "varchar(20)", nullable: false),
                    SoLuongHeThong = table.Column<int>(type: "int", nullable: false),
                    SoLuongThucTe = table.Column<int>(type: "int", nullable: false),
                    ChenhLech = table.Column<int>(type: "int", nullable: false, computedColumnSql: "[SoLuongThucTe] - [SoLuongHeThong]", stored: true),
                    HanSuDungCu = table.Column<DateOnly>(type: "date", nullable: false),
                    HanSuDungMoi = table.Column<DateOnly>(type: "date", nullable: false),
                    LyDo = table.Column<string>(type: "nvarchar(255)", nullable: false),
                    MaCQ = table.Column<string>(type: "varchar(20)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PhieuDieuChinhTon", x => x.MaPDC);
                    table.CheckConstraint("CK_PDC_LyDo", "LEN(LTRIM(RTRIM([LyDo]))) > 0");
                    table.CheckConstraint("CK_PDC_SoLuongHeThong", "[SoLuongHeThong] >= 0");
                    table.CheckConstraint("CK_PDC_SoLuongThucTe", "[SoLuongThucTe] >= 0");
                    table.ForeignKey(
                        name: "FK_PhieuDieuChinhTon_ChuQuan_MaCQ",
                        column: x => x.MaCQ,
                        principalTable: "ChuQuan",
                        principalColumn: "MaND",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_PhieuDieuChinhTon_LoHang_MaLo_MaHH",
                        columns: x => new { x.MaLo, x.MaHH },
                        principalTable: "LoHang",
                        principalColumns: new[] { "MaLo", "MaHH" },
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.InsertData(
                table: "BoDemMa",
                columns: new[] { "Ky", "TienTo", "SoHienTai" },
                values: new object[] { "00000000", "DM", 11 });

            migrationBuilder.InsertData(
                table: "DanhMuc",
                columns: new[] { "MaDM", "TenDM" },
                values: new object[,]
                {
                    { "DM01", "Gia vị" },
                    { "DM02", "Bánh kẹo & Đồ ăn vặt" },
                    { "DM03", "Mì tôm" },
                    { "DM04", "Bún & Phở khô" },
                    { "DM05", "Bột giặt / Nước giặt" },
                    { "DM06", "Nước xả" },
                    { "DM07", "Sữa tắm" },
                    { "DM08", "Dầu gội" },
                    { "DM09", "Nước giải khát" },
                    { "DM10", "Sữa & Sản phẩm từ sữa" },
                    { "DM11", "Gạo & Nông sản khô" }
                });

            migrationBuilder.CreateIndex(
                name: "IX_CanhBaoTonKho_MaLo_MaHH",
                table: "CanhBaoTonKho",
                columns: new[] { "MaLo", "MaHH" });

            migrationBuilder.CreateIndex(
                name: "UX_CanhBao_Mo",
                table: "CanhBaoTonKho",
                columns: new[] { "MaLo", "LoaiCanhBao" },
                unique: true,
                filter: "[TrangThai] = N'Chưa xử lý'");

            migrationBuilder.CreateIndex(
                name: "UX_DanhMuc_TenDM",
                table: "DanhMuc",
                column: "TenDM",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_HangHoa_MaDM",
                table: "HangHoa",
                column: "MaDM");

            migrationBuilder.CreateIndex(
                name: "UX_HangHoa_MaVach",
                table: "HangHoa",
                column: "MaVach",
                unique: true,
                filter: "[MaVach] IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "UX_HangHoa_TenHH",
                table: "HangHoa",
                column: "TenHH",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_LichSuSuaNhanVien_MaCQ",
                table: "LichSuSuaNhanVien",
                column: "MaCQ");

            migrationBuilder.CreateIndex(
                name: "IX_LichSuSuaNhanVien_MaNV",
                table: "LichSuSuaNhanVien",
                column: "MaNV");

            migrationBuilder.CreateIndex(
                name: "IX_LoHang_FEFO",
                table: "LoHang",
                columns: new[] { "MaHH", "HanSuDung" })
                .Annotation("SqlServer:Include", new[] { "SoLuongTon" });

            migrationBuilder.CreateIndex(
                name: "IX_PhieuDieuChinhTon_MaCQ",
                table: "PhieuDieuChinhTon",
                column: "MaCQ");

            migrationBuilder.CreateIndex(
                name: "IX_PhieuDieuChinhTon_MaLo_MaHH",
                table: "PhieuDieuChinhTon",
                columns: new[] { "MaLo", "MaHH" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "CanhBaoTonKho");

            migrationBuilder.DropTable(
                name: "LichSuSuaNhanVien");

            migrationBuilder.DropTable(
                name: "PhieuDieuChinhTon");

            migrationBuilder.DropTable(
                name: "LoHang");

            migrationBuilder.DropTable(
                name: "HangHoa");

            migrationBuilder.DropTable(
                name: "DanhMuc");

            migrationBuilder.DeleteData(
                table: "BoDemMa",
                keyColumns: new[] { "Ky", "TienTo" },
                keyValues: new object[] { "00000000", "DM" });
        }
    }
}
