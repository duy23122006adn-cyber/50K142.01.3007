using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace XomNho.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class GD1_TaiKhoanVaHeThong : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "BoDemMa",
                columns: table => new
                {
                    TienTo = table.Column<string>(type: "varchar(10)", nullable: false),
                    Ky = table.Column<string>(type: "char(8)", nullable: false),
                    SoHienTai = table.Column<int>(type: "int", nullable: false, defaultValue: 0)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_BoDemMa", x => new { x.TienTo, x.Ky });
                    table.CheckConstraint("CK_BoDemMa_SoHienTai", "[SoHienTai] >= 0");
                });

            migrationBuilder.CreateTable(
                name: "CauHinh",
                columns: table => new
                {
                    MaCauHinh = table.Column<string>(type: "varchar(50)", nullable: false),
                    GiaTri = table.Column<string>(type: "nvarchar(200)", nullable: false),
                    MoTa = table.Column<string>(type: "nvarchar(255)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CauHinh", x => x.MaCauHinh);
                });

            migrationBuilder.CreateTable(
                name: "NguoiDung",
                columns: table => new
                {
                    MaND = table.Column<string>(type: "varchar(20)", nullable: false),
                    HoTen = table.Column<string>(type: "nvarchar(100)", nullable: false),
                    NgaySinh = table.Column<DateOnly>(type: "date", nullable: false),
                    SDT = table.Column<string>(type: "char(10)", nullable: false),
                    Email = table.Column<string>(type: "varchar(100)", nullable: false),
                    TenDangNhap = table.Column<string>(type: "varchar(20)", nullable: false, collation: "Latin1_General_CI_AS"),
                    MatKhau = table.Column<string>(type: "varchar(255)", nullable: false),
                    TrangThai = table.Column<string>(type: "nvarchar(25)", nullable: false, defaultValue: "Hoạt động"),
                    SoLanNhapSai = table.Column<int>(type: "int", nullable: false, defaultValue: 0),
                    SoLanSaiMatKhauHienTai = table.Column<int>(type: "int", nullable: false, defaultValue: 0),
                    KhoaDoiMatKhauDen = table.Column<DateTime>(type: "datetime2(0)", nullable: true),
                    PhienBan = table.Column<byte[]>(type: "rowversion", rowVersion: true, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_NguoiDung", x => x.MaND);
                    table.CheckConstraint("CK_NguoiDung_Email", "[Email] LIKE '%_@_%._%' AND CHARINDEX(' ', [Email]) = 0");
                    table.CheckConstraint("CK_NguoiDung_HoTen", "LEN(LTRIM(RTRIM([HoTen]))) > 0");
                    table.CheckConstraint("CK_NguoiDung_NgaySinh", "[NgaySinh] < CAST(GETDATE() AS DATE)");
                    table.CheckConstraint("CK_NguoiDung_SDT", "LEN([SDT]) = 10 AND [SDT] LIKE '0%' AND [SDT] NOT LIKE '%[^0-9]%'");
                    table.CheckConstraint("CK_NguoiDung_SoLanNhapSai", "[SoLanNhapSai] >= 0");
                    table.CheckConstraint("CK_NguoiDung_SoLanSaiMatKhauHienTai", "[SoLanSaiMatKhauHienTai] >= 0");
                    table.CheckConstraint("CK_NguoiDung_TenDangNhap", "LEN([TenDangNhap]) BETWEEN 4 AND 20 AND [TenDangNhap] COLLATE Latin1_General_BIN NOT LIKE '%[^A-Za-z0-9_]%'");
                    table.CheckConstraint("CK_NguoiDung_TrangThai", "[TrangThai] IN (N'Hoạt động', N'Khóa tạm', N'Ngừng hoạt động')");
                });

            migrationBuilder.CreateTable(
                name: "NhatKyThaoTac",
                columns: table => new
                {
                    MaNKTT = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    ThoiDiem = table.Column<DateTime>(type: "datetime2(0)", nullable: false, defaultValueSql: "SYSDATETIME()"),
                    MaND = table.Column<string>(type: "varchar(20)", nullable: true),
                    TenDangNhap = table.Column<string>(type: "varchar(20)", nullable: true),
                    HanhDong = table.Column<string>(type: "nvarchar(50)", nullable: false),
                    BangDuLieu = table.Column<string>(type: "nvarchar(50)", nullable: true),
                    MaBanGhi = table.Column<string>(type: "varchar(50)", nullable: true),
                    DuLieuCu = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    DuLieuMoi = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    DiaChiIP = table.Column<string>(type: "varchar(45)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_NhatKyThaoTac", x => x.MaNKTT);
                });

            migrationBuilder.CreateTable(
                name: "ChuQuan",
                columns: table => new
                {
                    MaND = table.Column<string>(type: "varchar(20)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ChuQuan", x => x.MaND);
                    table.ForeignKey(
                        name: "FK_ChuQuan_NguoiDung_MaND",
                        column: x => x.MaND,
                        principalTable: "NguoiDung",
                        principalColumn: "MaND",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "MaXacThuc",
                columns: table => new
                {
                    MaOTP = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    MaND = table.Column<string>(type: "varchar(20)", nullable: false),
                    MaBam = table.Column<string>(type: "varchar(255)", nullable: false),
                    ThoiDiemGui = table.Column<DateTime>(type: "datetime2(0)", nullable: false, defaultValueSql: "SYSDATETIME()"),
                    HetHan = table.Column<DateTime>(type: "datetime2(0)", nullable: false),
                    ThoiDiemSuDung = table.Column<DateTime>(type: "datetime2(0)", nullable: true),
                    SoLanNhapSai = table.Column<int>(type: "int", nullable: false, defaultValue: 0)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MaXacThuc", x => x.MaOTP);
                    table.CheckConstraint("CK_MaXacThuc_SoLanNhapSai", "[SoLanNhapSai] >= 0");
                    table.ForeignKey(
                        name: "FK_MaXacThuc_NguoiDung_MaND",
                        column: x => x.MaND,
                        principalTable: "NguoiDung",
                        principalColumn: "MaND",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "NhanVien",
                columns: table => new
                {
                    MaND = table.Column<string>(type: "varchar(20)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_NhanVien", x => x.MaND);
                    table.ForeignKey(
                        name: "FK_NhanVien_NguoiDung_MaND",
                        column: x => x.MaND,
                        principalTable: "NguoiDung",
                        principalColumn: "MaND",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "PhienDangNhap",
                columns: table => new
                {
                    MaPhien = table.Column<Guid>(type: "uniqueidentifier", nullable: false, defaultValueSql: "NEWID()"),
                    MaND = table.Column<string>(type: "varchar(20)", nullable: false),
                    RefreshTokenHash = table.Column<string>(type: "varchar(255)", nullable: false),
                    ThoiDiemTao = table.Column<DateTime>(type: "datetime2(0)", nullable: false, defaultValueSql: "SYSDATETIME()"),
                    HetHan = table.Column<DateTime>(type: "datetime2(0)", nullable: false),
                    ThoiDiemThuHoi = table.Column<DateTime>(type: "datetime2(0)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PhienDangNhap", x => x.MaPhien);
                    table.ForeignKey(
                        name: "FK_PhienDangNhap_NguoiDung_MaND",
                        column: x => x.MaND,
                        principalTable: "NguoiDung",
                        principalColumn: "MaND",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_MaXacThuc_MaND",
                table: "MaXacThuc",
                column: "MaND");

            migrationBuilder.CreateIndex(
                name: "UX_NguoiDung_Email",
                table: "NguoiDung",
                column: "Email",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "UX_NguoiDung_SDT",
                table: "NguoiDung",
                column: "SDT",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "UX_NguoiDung_TenDangNhap",
                table: "NguoiDung",
                column: "TenDangNhap",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_NhatKyThaoTac_ThoiDiem",
                table: "NhatKyThaoTac",
                column: "ThoiDiem");

            migrationBuilder.CreateIndex(
                name: "IX_PhienDangNhap_MaND",
                table: "PhienDangNhap",
                column: "MaND");

            migrationBuilder.CreateIndex(
                name: "UX_PhienDangNhap_RefreshTokenHash",
                table: "PhienDangNhap",
                column: "RefreshTokenHash",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "BoDemMa");

            migrationBuilder.DropTable(
                name: "CauHinh");

            migrationBuilder.DropTable(
                name: "ChuQuan");

            migrationBuilder.DropTable(
                name: "MaXacThuc");

            migrationBuilder.DropTable(
                name: "NhanVien");

            migrationBuilder.DropTable(
                name: "NhatKyThaoTac");

            migrationBuilder.DropTable(
                name: "PhienDangNhap");

            migrationBuilder.DropTable(
                name: "NguoiDung");
        }
    }
}
