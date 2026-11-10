using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using XomNho.Api.Domain;

namespace XomNho.Api.Data.CauHinhBang;

/// <summary>THIET_KE_DB_V2.md mục 3.12.</summary>
public class BienBanKetCaConfig : IEntityTypeConfiguration<BienBanKetCa>
{
    public void Configure(EntityTypeBuilder<BienBanKetCa> b)
    {
        b.ToTable("BienBanKetCa");
        b.HasKey(x => x.MaBB);
        b.Property(x => x.MaBB).HasColumnType("varchar(20)");
        b.Property(x => x.NgayGioLuu).HasColumnType("datetime2(0)").HasDefaultValueSql("SYSDATETIME()");
        b.Property(x => x.MaCa).HasColumnType("varchar(20)");
        b.Property(x => x.MaND).HasColumnType("varchar(20)");
        // BR05: mỗi ca tối đa một biên bản – cũng chặn hai người cùng lưu (8a).
        b.HasIndex(x => x.MaCa).IsUnique().HasDatabaseName("UX_BienBanKetCa_MaCa");
        b.HasIndex(x => x.NgayGioLuu).HasDatabaseName("IX_BienBanKetCa_NgayGioLuu");
        b.HasOne(x => x.CaLamViec).WithMany().HasForeignKey(x => x.MaCa).OnDelete(DeleteBehavior.Restrict);
        b.HasOne(x => x.NguoiDung).WithMany().HasForeignKey(x => x.MaND).OnDelete(DeleteBehavior.Restrict);
    }
}

/// <summary>THIET_KE_DB_V2.md mục 3.13.</summary>
public class ChiTietBienBanConfig : IEntityTypeConfiguration<ChiTietBienBan>
{
    public void Configure(EntityTypeBuilder<ChiTietBienBan> b)
    {
        b.ToTable("ChiTietBienBan", t =>
        {
            t.HasCheckConstraint("CK_CTBB_LyThuyet", "[SoLuongLyThuyet] >= 0");
            t.HasCheckConstraint("CK_CTBB_ThucTe", "[SoLuongThucTe] >= 0");
            // UC_9.1 BR02, BR06: dòng chênh lệch bắt buộc có nguyên nhân.
            t.HasCheckConstraint("CK_CTBB_NguyenNhan",
                "[SoLuongThucTe] = [SoLuongLyThuyet] OR LEN(LTRIM(RTRIM(ISNULL([NguyenNhan], N'')))) > 0");
        });
        b.HasKey(x => x.MaCTBB);
        b.Property(x => x.MaCTBB).UseIdentityColumn();
        b.Property(x => x.MaBB).HasColumnType("varchar(20)");
        b.Property(x => x.MaHH).HasColumnType("varchar(20)");
        b.Property(x => x.ChenhLech).HasComputedColumnSql("[SoLuongThucTe] - [SoLuongLyThuyet]", stored: true);
        b.Property(x => x.NguyenNhan).HasColumnType("nvarchar(255)");
        b.HasIndex(x => new { x.MaBB, x.MaHH }).IsUnique().HasDatabaseName("UX_CTBB_MaBB_MaHH");
        b.HasOne(x => x.BienBanKetCa).WithMany(x => x.ChiTiet).HasForeignKey(x => x.MaBB).OnDelete(DeleteBehavior.Restrict);
        b.HasOne(x => x.HangHoa).WithMany().HasForeignKey(x => x.MaHH).OnDelete(DeleteBehavior.Restrict);
    }
}
