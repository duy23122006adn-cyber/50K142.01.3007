using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using XomNho.Api.Domain;

namespace XomNho.Api.Data.CauHinhBang;

/// <summary>THIET_KE_DB_V2.md mục 3.23 – NhatKyThaoTac (không FK tới NguoiDung).</summary>
public class NhatKyThaoTacConfig : IEntityTypeConfiguration<NhatKyThaoTac>
{
    public void Configure(EntityTypeBuilder<NhatKyThaoTac> b)
    {
        b.ToTable("NhatKyThaoTac");
        b.HasKey(x => x.MaNKTT);
        b.Property(x => x.MaNKTT).UseIdentityColumn();
        b.Property(x => x.ThoiDiem).HasColumnType("datetime2(0)").HasDefaultValueSql("SYSDATETIME()");
        b.Property(x => x.MaND).HasColumnType("varchar(20)");
        b.Property(x => x.TenDangNhap).HasColumnType("varchar(20)");
        b.Property(x => x.HanhDong).HasColumnType("nvarchar(50)").IsRequired();
        b.Property(x => x.BangDuLieu).HasColumnType("nvarchar(50)");
        b.Property(x => x.MaBanGhi).HasColumnType("varchar(50)");
        b.Property(x => x.DuLieuCu).HasColumnType("nvarchar(max)");
        b.Property(x => x.DuLieuMoi).HasColumnType("nvarchar(max)");
        b.Property(x => x.DiaChiIP).HasColumnType("varchar(45)");
        b.HasIndex(x => x.ThoiDiem).HasDatabaseName("IX_NhatKyThaoTac_ThoiDiem");
    }
}

/// <summary>THIET_KE_DB_V2.md mục 3.23 – BoDemMa.</summary>
public class BoDemMaConfig : IEntityTypeConfiguration<BoDemMa>
{
    public void Configure(EntityTypeBuilder<BoDemMa> b)
    {
        b.ToTable("BoDemMa", t => t.HasCheckConstraint("CK_BoDemMa_SoHienTai", "[SoHienTai] >= 0"));
        b.HasKey(x => new { x.TienTo, x.Ky });
        b.Property(x => x.TienTo).HasColumnType("varchar(10)");
        b.Property(x => x.Ky).HasColumnType("char(8)");
        b.Property(x => x.SoHienTai).HasDefaultValue(0);

        // Bộ đếm danh mục: đã nạp sẵn 11 mã DM01–DM11 (DanhMucConfig).
        b.HasData(new BoDemMa { TienTo = "DM", Ky = Common.DinhDangMa.KyToanCuc, SoHienTai = DanhSachCoDinh.DanhMuc.Length });
    }
}

/// <summary>THIET_KE_DB_V2.md mục 3.23 – CauHinh.</summary>
public class CauHinhConfig : IEntityTypeConfiguration<CauHinh>
{
    public void Configure(EntityTypeBuilder<CauHinh> b)
    {
        b.ToTable("CauHinh");
        b.HasKey(x => x.MaCauHinh);
        b.Property(x => x.MaCauHinh).HasColumnType("varchar(50)");
        b.Property(x => x.GiaTri).HasColumnType("nvarchar(200)").IsRequired();
        b.Property(x => x.MoTa).HasColumnType("nvarchar(255)");
    }
}
