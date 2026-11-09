using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using XomNho.Api.Common;
using XomNho.Api.Domain;

namespace XomNho.Api.Data.CauHinhBang;

/// <summary>THIET_KE_DB_V2.md mục 3.6 – nạp sẵn 11 danh mục (UC_4.1 BR06).</summary>
public class DanhMucConfig : IEntityTypeConfiguration<DanhMuc>
{
    public void Configure(EntityTypeBuilder<DanhMuc> b)
    {
        b.ToTable("DanhMuc", t => t.HasCheckConstraint("CK_DanhMuc_TenDM", "LEN(LTRIM(RTRIM([TenDM]))) > 0"));
        b.HasKey(x => x.MaDM);
        b.Property(x => x.MaDM).HasColumnType("varchar(20)");
        b.Property(x => x.TenDM).HasColumnType("nvarchar(100)").IsRequired();
        b.HasIndex(x => x.TenDM).IsUnique().HasDatabaseName("UX_DanhMuc_TenDM");

        b.HasData(DanhSachCoDinh.DanhMuc.Select((ten, i) => new DanhMuc
        {
            MaDM = DinhDangMa.Tao(LoaiMa.DanhMuc, i + 1, default),
            TenDM = ten,
        }));
    }
}

/// <summary>THIET_KE_DB_V2.md mục 3.7.</summary>
public class HangHoaConfig : IEntityTypeConfiguration<HangHoa>
{
    public void Configure(EntityTypeBuilder<HangHoa> b)
    {
        var dvt = string.Join(", ", DanhSachCoDinh.DonViTinh.Select(d => $"N'{d}'"));
        b.ToTable("HangHoa", t =>
        {
            t.HasCheckConstraint("CK_HangHoa_TenHH", "LEN(LTRIM(RTRIM([TenHH]))) > 0");
            t.HasCheckConstraint("CK_HangHoa_DonViTinh", $"[DonViTinh] IN ({dvt})");
            t.HasCheckConstraint("CK_HangHoa_GiaNhap", "[GiaNhap] > 0");
            t.HasCheckConstraint("CK_HangHoa_GiaBan", "[GiaBan] > 0");
            t.HasCheckConstraint("CK_HangHoa_NguongHetHang", "[NguongCanhBaoHetHang] IS NULL OR [NguongCanhBaoHetHang] > 0");
            t.HasCheckConstraint("CK_HangHoa_NguongHetHan", "[NguongCanhBaoHetHan] IS NULL OR [NguongCanhBaoHetHan] > 0");
            t.HasCheckConstraint("CK_HangHoa_TrangThai",
                $"[TrangThai] IN (N'{TrangThaiHangHoa.DangKinhDoanh}', N'{TrangThaiHangHoa.NgungKinhDoanh}')");
        });
        b.HasKey(x => x.MaHH);
        b.Property(x => x.MaHH).HasColumnType("varchar(20)");
        b.Property(x => x.TenHH).HasColumnType("nvarchar(100)").IsRequired();
        b.Property(x => x.MaVach).HasColumnType("varchar(50)");
        b.Property(x => x.DonViTinh).HasColumnType("nvarchar(25)").IsRequired();
        b.Property(x => x.GiaNhap).HasColumnType("decimal(15,0)");
        b.Property(x => x.GiaBan).HasColumnType("decimal(15,0)");
        b.Property(x => x.TrangThai).HasColumnType("nvarchar(25)").HasDefaultValue(TrangThaiHangHoa.DangKinhDoanh);
        b.Property(x => x.MaDM).HasColumnType("varchar(20)");
        b.Property(x => x.PhienBan).IsRowVersion();

        b.HasOne(x => x.DanhMuc).WithMany().HasForeignKey(x => x.MaDM).OnDelete(DeleteBehavior.Restrict);
        b.HasIndex(x => x.TenHH).IsUnique().HasDatabaseName("UX_HangHoa_TenHH");
        b.HasIndex(x => x.MaVach).IsUnique().HasFilter("[MaVach] IS NOT NULL").HasDatabaseName("UX_HangHoa_MaVach");
    }
}

/// <summary>THIET_KE_DB_V2.md mục 3.8.</summary>
public class LoHangConfig : IEntityTypeConfiguration<LoHang>
{
    public void Configure(EntityTypeBuilder<LoHang> b)
    {
        b.ToTable("LoHang", t => t.HasCheckConstraint("CK_LoHang_SoLuongTon", "[SoLuongTon] >= 0"));
        b.HasKey(x => x.MaLo);
        b.Property(x => x.MaLo).HasColumnType("varchar(20)");
        b.Property(x => x.MaHH).HasColumnType("varchar(20)");
        b.Property(x => x.SoLuongTon).HasDefaultValue(0);
        b.Property(x => x.HanSuDung).HasColumnType("date");
        b.Property(x => x.NgayNhap).HasColumnType("datetime2(0)").HasDefaultValueSql("SYSDATETIME()");
        b.Property(x => x.PhienBan).IsRowVersion();

        // UNIQUE (MaLo, MaHH) – khóa ngoại kép từ CanhBaoTonKho, PhieuDieuChinhTon.
        b.HasAlternateKey(x => new { x.MaLo, x.MaHH }).HasName("UX_LoHang_MaLo_MaHH");
        b.HasOne(x => x.HangHoa).WithMany(h => h.LoHang).HasForeignKey(x => x.MaHH).OnDelete(DeleteBehavior.Restrict);
        b.HasIndex(x => new { x.MaHH, x.HanSuDung }).IncludeProperties(x => x.SoLuongTon).HasDatabaseName("IX_LoHang_FEFO");
    }
}

/// <summary>THIET_KE_DB_V2.md mục 3.9.</summary>
public class CanhBaoTonKhoConfig : IEntityTypeConfiguration<CanhBaoTonKho>
{
    public void Configure(EntityTypeBuilder<CanhBaoTonKho> b)
    {
        var loai = string.Join(", ", Domain.LoaiCanhBao.TatCa.Select(x => $"N'{x}'"));
        b.ToTable("CanhBaoTonKho", t =>
        {
            t.HasCheckConstraint("CK_CanhBaoTonKho_LoaiCanhBao", $"[LoaiCanhBao] IN ({loai})");
            t.HasCheckConstraint("CK_CanhBaoTonKho_TrangThai",
                $"[TrangThai] IN (N'{TrangThaiCanhBao.ChuaXuLy}', N'{TrangThaiCanhBao.DaXuLy}')");
        });
        b.HasKey(x => x.MaCB);
        b.Property(x => x.MaCB).UseIdentityColumn();
        b.Property(x => x.LoaiCanhBao).HasColumnType("nvarchar(25)").IsRequired();
        b.Property(x => x.TrangThai).HasColumnType("nvarchar(25)").HasDefaultValue(TrangThaiCanhBao.ChuaXuLy);
        b.Property(x => x.MaLo).HasColumnType("varchar(20)");
        b.Property(x => x.MaHH).HasColumnType("varchar(20)");
        b.Property(x => x.ThoiDiemTao).HasColumnType("datetime2(0)").HasDefaultValueSql("SYSDATETIME()");
        b.Property(x => x.ThoiDiemCapNhat).HasColumnType("datetime2(0)").HasDefaultValueSql("SYSDATETIME()");
        b.Property(x => x.ThoiDiemXuLy).HasColumnType("datetime2(0)");

        b.HasOne(x => x.LoHang).WithMany()
            .HasForeignKey(x => new { x.MaLo, x.MaHH }).HasPrincipalKey(l => new { l.MaLo, l.MaHH })
            .OnDelete(DeleteBehavior.Restrict);

        // UC_3.2 BR05: mỗi lô chỉ có 1 cảnh báo "Chưa xử lý" cho mỗi loại.
        b.HasIndex(x => new { x.MaLo, x.LoaiCanhBao }).IsUnique()
            .HasFilter($"[TrangThai] = N'{TrangThaiCanhBao.ChuaXuLy}'").HasDatabaseName("UX_CanhBao_Mo");
    }
}

/// <summary>THIET_KE_DB_V2.md mục 3.10.</summary>
public class PhieuDieuChinhTonConfig : IEntityTypeConfiguration<PhieuDieuChinhTon>
{
    public void Configure(EntityTypeBuilder<PhieuDieuChinhTon> b)
    {
        b.ToTable("PhieuDieuChinhTon", t =>
        {
            t.HasCheckConstraint("CK_PDC_SoLuongHeThong", "[SoLuongHeThong] >= 0");
            t.HasCheckConstraint("CK_PDC_SoLuongThucTe", "[SoLuongThucTe] >= 0");
            t.HasCheckConstraint("CK_PDC_LyDo", "LEN(LTRIM(RTRIM([LyDo]))) > 0");
        });
        b.HasKey(x => x.MaPDC);
        b.Property(x => x.MaPDC).UseIdentityColumn();
        b.Property(x => x.NgayGio).HasColumnType("datetime2(0)").HasDefaultValueSql("SYSDATETIME()");
        b.Property(x => x.MaLo).HasColumnType("varchar(20)");
        b.Property(x => x.MaHH).HasColumnType("varchar(20)");
        b.Property(x => x.ChenhLech).HasComputedColumnSql("[SoLuongThucTe] - [SoLuongHeThong]", stored: true);
        b.Property(x => x.HanSuDungCu).HasColumnType("date");
        b.Property(x => x.HanSuDungMoi).HasColumnType("date");
        b.Property(x => x.LyDo).HasColumnType("nvarchar(255)").IsRequired();
        b.Property(x => x.MaCQ).HasColumnType("varchar(20)");

        b.HasOne(x => x.LoHang).WithMany()
            .HasForeignKey(x => new { x.MaLo, x.MaHH }).HasPrincipalKey(l => new { l.MaLo, l.MaHH })
            .OnDelete(DeleteBehavior.Restrict);
        b.HasOne(x => x.ChuQuan).WithMany().HasForeignKey(x => x.MaCQ).OnDelete(DeleteBehavior.Restrict);
    }
}

/// <summary>THIET_KE_DB_V2.md mục 3.3.</summary>
public class LichSuSuaNhanVienConfig : IEntityTypeConfiguration<LichSuSuaNhanVien>
{
    public void Configure(EntityTypeBuilder<LichSuSuaNhanVien> b)
    {
        b.ToTable("LichSuSuaNhanVien");
        b.HasKey(x => x.MaLS);
        b.Property(x => x.MaLS).UseIdentityColumn();
        b.Property(x => x.MaNV).HasColumnType("varchar(20)");
        b.Property(x => x.HoTenNV).HasColumnType("nvarchar(100)").IsRequired();
        b.Property(x => x.MaCQ).HasColumnType("varchar(20)");
        b.Property(x => x.HoTenCQ).HasColumnType("nvarchar(100)").IsRequired();
        b.Property(x => x.ThoiDiemSua).HasColumnType("datetime2(0)").HasDefaultValueSql("SYSDATETIME()");
        b.Property(x => x.NoiDungTruoc).HasColumnType("nvarchar(1000)").IsRequired();
        b.Property(x => x.NoiDungSau).HasColumnType("nvarchar(1000)").IsRequired();

        b.HasOne(x => x.NhanVien).WithMany().HasForeignKey(x => x.MaNV).OnDelete(DeleteBehavior.Cascade);
        b.HasOne(x => x.ChuQuan).WithMany().HasForeignKey(x => x.MaCQ).OnDelete(DeleteBehavior.Restrict);
    }
}
