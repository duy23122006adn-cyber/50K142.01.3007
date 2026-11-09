using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using XomNho.Api.Domain;

namespace XomNho.Api.Data.CauHinhBang;

/// <summary>THIET_KE_DB_V2.md mục 3.1, 3.2.</summary>
public class NguoiDungConfig : IEntityTypeConfiguration<NguoiDung>
{
    public void Configure(EntityTypeBuilder<NguoiDung> b)
    {
        b.ToTable("NguoiDung", t =>
        {
            t.HasCheckConstraint("CK_NguoiDung_HoTen", "LEN(LTRIM(RTRIM([HoTen]))) > 0");
            t.HasCheckConstraint("CK_NguoiDung_NgaySinh", "[NgaySinh] < CAST(GETDATE() AS DATE)");
            t.HasCheckConstraint("CK_NguoiDung_SDT", "LEN([SDT]) = 10 AND [SDT] LIKE '0%' AND [SDT] NOT LIKE '%[^0-9]%'");
            t.HasCheckConstraint("CK_NguoiDung_Email", "[Email] LIKE '%_@_%._%' AND CHARINDEX(' ', [Email]) = 0");
            t.HasCheckConstraint("CK_NguoiDung_TenDangNhap",
                "LEN([TenDangNhap]) BETWEEN 4 AND 20 AND [TenDangNhap] COLLATE Latin1_General_BIN NOT LIKE '%[^A-Za-z0-9_]%'");
            t.HasCheckConstraint("CK_NguoiDung_TrangThai",
                $"[TrangThai] IN (N'{TrangThaiTaiKhoan.HoatDong}', N'{TrangThaiTaiKhoan.KhoaTam}', N'{TrangThaiTaiKhoan.NgungHoatDong}')");
            t.HasCheckConstraint("CK_NguoiDung_SoLanNhapSai", "[SoLanNhapSai] >= 0");
            t.HasCheckConstraint("CK_NguoiDung_SoLanSaiMatKhauHienTai", "[SoLanSaiMatKhauHienTai] >= 0");
        });
        b.UseTptMappingStrategy();

        b.HasKey(x => x.MaND);
        b.Property(x => x.MaND).HasColumnType("varchar(20)");
        b.Property(x => x.HoTen).HasColumnType("nvarchar(100)").IsRequired();
        b.Property(x => x.NgaySinh).HasColumnType("date");
        b.Property(x => x.SDT).HasColumnType("char(10)").IsRequired();
        b.Property(x => x.Email).HasColumnType("varchar(100)").IsRequired();
        // Collation CI để UNIQUE không phân biệt hoa thường (UC_2.1 BR03).
        b.Property(x => x.TenDangNhap).HasColumnType("varchar(20)").UseCollation("Latin1_General_CI_AS").IsRequired();
        b.Property(x => x.MatKhau).HasColumnType("varchar(255)").IsRequired();
        b.Property(x => x.TrangThai).HasColumnType("nvarchar(25)").HasDefaultValue(TrangThaiTaiKhoan.HoatDong);
        b.Property(x => x.SoLanNhapSai).HasDefaultValue(0);
        b.Property(x => x.SoLanSaiMatKhauHienTai).HasDefaultValue(0);
        b.Property(x => x.KhoaDoiMatKhauDen).HasColumnType("datetime2(0)");
        b.Property(x => x.PhienBan).IsRowVersion();

        b.HasIndex(x => x.SDT).IsUnique().HasDatabaseName("UX_NguoiDung_SDT");
        b.HasIndex(x => x.Email).IsUnique().HasDatabaseName("UX_NguoiDung_Email");
        b.HasIndex(x => x.TenDangNhap).IsUnique().HasDatabaseName("UX_NguoiDung_TenDangNhap");
    }
}

public class NhanVienConfig : IEntityTypeConfiguration<NhanVien>
{
    public void Configure(EntityTypeBuilder<NhanVien> b) => b.ToTable("NhanVien");
}

public class ChuQuanConfig : IEntityTypeConfiguration<ChuQuan>
{
    public void Configure(EntityTypeBuilder<ChuQuan> b) => b.ToTable("ChuQuan");
}

/// <summary>THIET_KE_DB_V2.md mục 3.23 – PhienDangNhap.</summary>
public class PhienDangNhapConfig : IEntityTypeConfiguration<PhienDangNhap>
{
    public void Configure(EntityTypeBuilder<PhienDangNhap> b)
    {
        b.ToTable("PhienDangNhap");
        b.HasKey(x => x.MaPhien);
        b.Property(x => x.MaPhien).HasDefaultValueSql("NEWID()");
        b.Property(x => x.MaND).HasColumnType("varchar(20)");
        b.Property(x => x.RefreshTokenHash).HasColumnType("varchar(255)").IsRequired();
        b.Property(x => x.ThoiDiemTao).HasColumnType("datetime2(0)").HasDefaultValueSql("SYSDATETIME()");
        b.Property(x => x.HetHan).HasColumnType("datetime2(0)");
        b.Property(x => x.ThoiDiemThuHoi).HasColumnType("datetime2(0)");
        b.HasOne(x => x.NguoiDung).WithMany().HasForeignKey(x => x.MaND).OnDelete(DeleteBehavior.Cascade);
        b.HasIndex(x => x.RefreshTokenHash).IsUnique().HasDatabaseName("UX_PhienDangNhap_RefreshTokenHash");
    }
}

/// <summary>THIET_KE_DB_V2.md mục 3.23 – MaXacThuc (OTP).</summary>
public class MaXacThucConfig : IEntityTypeConfiguration<MaXacThuc>
{
    public void Configure(EntityTypeBuilder<MaXacThuc> b)
    {
        b.ToTable("MaXacThuc", t => t.HasCheckConstraint("CK_MaXacThuc_SoLanNhapSai", "[SoLanNhapSai] >= 0"));
        b.HasKey(x => x.MaOTP);
        b.Property(x => x.MaOTP).UseIdentityColumn();
        b.Property(x => x.MaND).HasColumnType("varchar(20)");
        b.Property(x => x.MaBam).HasColumnType("varchar(255)").IsRequired();
        b.Property(x => x.ThoiDiemGui).HasColumnType("datetime2(0)").HasDefaultValueSql("SYSDATETIME()");
        b.Property(x => x.HetHan).HasColumnType("datetime2(0)");
        b.Property(x => x.ThoiDiemSuDung).HasColumnType("datetime2(0)");
        b.Property(x => x.SoLanNhapSai).HasDefaultValue(0);
        b.HasOne(x => x.NguoiDung).WithMany().HasForeignKey(x => x.MaND).OnDelete(DeleteBehavior.Cascade);
    }
}
