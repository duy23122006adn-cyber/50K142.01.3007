using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using XomNho.Api.Domain;

namespace XomNho.Api.Data.CauHinhBang;

/// <summary>THIET_KE_DB_V2.md mục 3.5.</summary>
public class KhachQuenConfig : IEntityTypeConfiguration<KhachQuen>
{
    public void Configure(EntityTypeBuilder<KhachQuen> b)
    {
        b.ToTable("KhachQuen", t =>
        {
            t.HasCheckConstraint("CK_KhachQuen_CCCD", "LEN([CCCD]) = 12 AND [CCCD] NOT LIKE '%[^0-9]%'");
            t.HasCheckConstraint("CK_KhachQuen_DiaChi", "LEN(LTRIM(RTRIM([DiaChi]))) > 0");
            t.HasCheckConstraint("CK_KhachQuen_TrangThai",
                $"[TrangThai] IN (N'{TrangThaiKhachQuen.DangHoatDong}', N'{TrangThaiKhachQuen.DaXoa}')");
        });
        b.HasKey(x => x.MaKH);
        b.Property(x => x.MaKH).HasColumnType("varchar(20)");
        b.Property(x => x.CCCD).HasColumnType("char(12)").IsRequired();
        b.Property(x => x.DiaChi).HasColumnType("nvarchar(200)").IsRequired();
        b.Property(x => x.TrangThai).HasColumnType("nvarchar(25)").HasDefaultValue(TrangThaiKhachQuen.DangHoatDong);
        b.Property(x => x.QuyenMuaNo).HasDefaultValue(true);
        b.Property(x => x.PhienBan).IsRowVersion();
        b.HasOne(x => x.KhachHang).WithOne().HasForeignKey<KhachQuen>(x => x.MaKH).OnDelete(DeleteBehavior.Restrict);
        // UC_7.4/7.5 BR03: CCCD không trùng giữa các khách quen đang hoạt động.
        b.HasIndex(x => x.CCCD).IsUnique()
            .HasFilter($"[TrangThai] = N'{TrangThaiKhachQuen.DangHoatDong}'").HasDatabaseName("UX_KhachQuen_CCCD");
    }
}

/// <summary>THIET_KE_DB_V2.md mục 3.16.</summary>
public class HoaDonNoConfig : IEntityTypeConfiguration<HoaDonNo>
{
    public void Configure(EntityTypeBuilder<HoaDonNo> b)
    {
        b.ToTable("HoaDonNo");
        b.HasKey(x => x.MaHD);
        b.Property(x => x.MaHD).HasColumnType("varchar(20)");
        b.Property(x => x.HanThanhToan).HasColumnType("date");
        b.Property(x => x.MaKQ).HasColumnType("varchar(20)");
        b.HasOne(x => x.HoaDon).WithOne(h => h.GhiNo).HasForeignKey<HoaDonNo>(x => x.MaHD).OnDelete(DeleteBehavior.Restrict);
        b.HasOne(x => x.KhachQuen).WithMany().HasForeignKey(x => x.MaKQ).OnDelete(DeleteBehavior.Restrict);
        b.HasIndex(x => x.MaKQ).HasDatabaseName("IX_HoaDonNo_MaKQ");
    }
}

/// <summary>THIET_KE_DB_V2.md mục 3.22.</summary>
public class PhanBoThanhToanConfig : IEntityTypeConfiguration<PhanBoThanhToan>
{
    public void Configure(EntityTypeBuilder<PhanBoThanhToan> b)
    {
        b.ToTable("PhanBoThanhToan", t => t.HasCheckConstraint("CK_PhanBo_SoTien", "[SoTienPhanBo] > 0"));
        b.HasKey(x => new { x.MaPTT, x.MaHDNo });
        b.Property(x => x.MaPTT).HasColumnType("varchar(20)");
        b.Property(x => x.MaHDNo).HasColumnType("varchar(20)");
        b.Property(x => x.SoTienPhanBo).HasColumnType("decimal(15,0)");
        b.HasOne(x => x.PhieuThanhToan).WithMany(p => p.PhanBo).HasForeignKey(x => x.MaPTT).OnDelete(DeleteBehavior.Restrict);
        b.HasOne(x => x.HoaDonNo).WithMany().HasForeignKey(x => x.MaHDNo).OnDelete(DeleteBehavior.Restrict);
    }
}
