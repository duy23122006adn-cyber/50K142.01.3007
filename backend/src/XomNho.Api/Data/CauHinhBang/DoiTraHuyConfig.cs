using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using XomNho.Api.Domain;

namespace XomNho.Api.Data.CauHinhBang;

/// <summary>THIET_KE_DB_V2.md mục 3.18.</summary>
public class NhatKyHuyConfig : IEntityTypeConfiguration<NhatKyHuy>
{
    public void Configure(EntityTypeBuilder<NhatKyHuy> b)
    {
        b.ToTable("NhatKyHuy", t =>
        {
            t.HasCheckConstraint("CK_NhatKyHuy_LyDo", "LEN(LTRIM(RTRIM([LyDoHuy]))) > 0");
            t.HasCheckConstraint("CK_NhatKyHuy_TongTien", "[TongTien] > 0");
            t.HasCheckConstraint("CK_NhatKyHuy_SoTienCanHoan", "[SoTienCanHoan] >= 0 AND [SoTienCanHoan] <= [TongTien]");
            t.HasCheckConstraint("CK_NhatKyHuy_ChuaNhanHang", "[XacNhanChuaNhanHang] = 1");
            t.HasCheckConstraint("CK_NhatKyHuy_BanSao", "ISJSON([BanSaoHoaDon]) = 1");
        });
        b.HasKey(x => x.MaNK);
        b.Property(x => x.MaNK).UseIdentityColumn();
        b.Property(x => x.MaHD).HasColumnType("varchar(20)");
        b.Property(x => x.MaCQ).HasColumnType("varchar(20)");
        b.Property(x => x.LyDoHuy).HasColumnType("nvarchar(255)").IsRequired();
        b.Property(x => x.ThoiGianHuy).HasColumnType("datetime2(0)").HasDefaultValueSql("SYSDATETIME()");
        b.Property(x => x.TongTien).HasColumnType("decimal(15,0)");
        b.Property(x => x.SoTienCanHoan).HasColumnType("decimal(15,0)");
        b.Property(x => x.BanSaoHoaDon).HasColumnType("nvarchar(max)").IsRequired();
        b.HasIndex(x => x.MaHD).IsUnique().HasDatabaseName("UX_NhatKyHuy_MaHD");
        b.HasOne(x => x.HoaDon).WithMany().HasForeignKey(x => x.MaHD).OnDelete(DeleteBehavior.Restrict);
        b.HasOne(x => x.ChuQuan).WithMany().HasForeignKey(x => x.MaCQ).OnDelete(DeleteBehavior.Restrict);
    }
}

/// <summary>THIET_KE_DB_V2.md mục 3.19.</summary>
public class PhieuDoiTraConfig : IEntityTypeConfiguration<PhieuDoiTra>
{
    public void Configure(EntityTypeBuilder<PhieuDoiTra> b)
    {
        var tt = string.Join(", ", TrangThaiPhieuDoiTra.TatCa.Select(x => $"N'{x}'"));
        b.ToTable("PhieuDoiTra", t =>
        {
            t.HasCheckConstraint("CK_PDT_LoaiPhieu", $"[LoaiPhieu] IN (N'{LoaiPhieuDoiTra.DoiHang}', N'{LoaiPhieuDoiTra.TraHang}')");
            t.HasCheckConstraint("CK_PDT_LyDo", "LEN(LTRIM(RTRIM([LyDoDoiTra]))) > 0");
            t.HasCheckConstraint("CK_PDT_TrangThai", $"[TrangThai] IN ({tt})");
            t.HasCheckConstraint("CK_PDT_SoTienHoan", "[SoTienHoan] >= 0");
            t.HasCheckConstraint("CK_PDT_Duyet",
                $"([TrangThai] = N'{TrangThaiPhieuDoiTra.ChoDuyet}' AND [MaCQ] IS NULL AND [NgayGioDuyet] IS NULL)"
                + $" OR ([TrangThai] <> N'{TrangThaiPhieuDoiTra.ChoDuyet}' AND [MaCQ] IS NOT NULL AND [NgayGioDuyet] IS NOT NULL)");
            t.HasCheckConstraint("CK_PDT_LyDoTuChoi",
                $"[TrangThai] <> N'{TrangThaiPhieuDoiTra.TuChoi}' OR LEN(LTRIM(RTRIM(ISNULL([LyDoTuChoi], N'')))) > 0");
            t.HasCheckConstraint("CK_PDT_HoanTat", $"[NgayGioHoanTat] IS NULL OR [TrangThai] = N'{TrangThaiPhieuDoiTra.DaDuyet}'");
        });
        b.HasKey(x => x.MaPDT);
        b.Property(x => x.MaPDT).HasColumnType("varchar(20)");
        b.Property(x => x.LoaiPhieu).HasColumnType("nvarchar(25)").IsRequired();
        b.Property(x => x.NgayGioLap).HasColumnType("datetime2(0)").HasDefaultValueSql("SYSDATETIME()");
        b.Property(x => x.LyDoDoiTra).HasColumnType("nvarchar(255)").IsRequired();
        b.Property(x => x.TrangThai).HasColumnType("nvarchar(25)").HasDefaultValue(TrangThaiPhieuDoiTra.ChoDuyet);
        b.Property(x => x.SoTienHoan).HasColumnType("decimal(15,0)").HasDefaultValue(0m);
        b.Property(x => x.ChenhLech).HasColumnType("decimal(15,0)").HasDefaultValue(0m);
        b.Property(x => x.LyDoTuChoi).HasColumnType("nvarchar(255)");
        b.Property(x => x.NgayGioDuyet).HasColumnType("datetime2(0)");
        b.Property(x => x.NgayGioHoanTat).HasColumnType("datetime2(0)");
        b.Property(x => x.MaHD).HasColumnType("varchar(20)");
        b.Property(x => x.MaND).HasColumnType("varchar(20)");
        b.Property(x => x.MaCQ).HasColumnType("varchar(20)");
        b.Property(x => x.PhienBan).IsRowVersion();
        b.HasOne(x => x.HoaDon).WithMany().HasForeignKey(x => x.MaHD).OnDelete(DeleteBehavior.Restrict);
        b.HasOne(x => x.NguoiDung).WithMany().HasForeignKey(x => x.MaND).OnDelete(DeleteBehavior.Restrict);
        b.HasOne(x => x.ChuQuan).WithMany().HasForeignKey(x => x.MaCQ).OnDelete(DeleteBehavior.Restrict);
        b.HasIndex(x => x.MaHD).HasDatabaseName("IX_PDT_MaHD");
        b.HasIndex(x => new { x.TrangThai, x.NgayGioLap }).HasDatabaseName("IX_PDT_TrangThai_NgayGioLap");
        // Báo cáo UC_5.1–5.3: phiếu đổi trả tính vào kỳ chứa ngày duyệt (Q19).
        b.HasIndex(x => x.NgayGioDuyet).HasDatabaseName("IX_PDT_NgayGioDuyet");
    }
}

/// <summary>THIET_KE_DB_V2.md mục 3.20.</summary>
public class ChiTietDoiTraConfig : IEntityTypeConfiguration<ChiTietDoiTra>
{
    public void Configure(EntityTypeBuilder<ChiTietDoiTra> b)
    {
        b.ToTable("ChiTietDoiTra", t =>
        {
            t.HasCheckConstraint("CK_CTDT_SoLuongTra", "[SoLuongTra] > 0");
            t.HasCheckConstraint("CK_CTDT_GiaTriHoan", "[GiaTriHoan] >= 0");
            t.HasCheckConstraint("CK_CTDT_TinhTrang", "LEN(LTRIM(RTRIM([TinhTrangHang]))) > 0");
            t.HasCheckConstraint("CK_CTDT_SoLuongMoi", "[SoLuongMoi] IS NULL OR [SoLuongMoi] > 0");
            t.HasCheckConstraint("CK_CTDT_GiaTriHangMoi", "[GiaTriHangMoi] IS NULL OR [GiaTriHangMoi] >= 0");
            t.HasCheckConstraint("CK_CTDT_HangMoi",
                "([MaHHMoi] IS NULL AND [SoLuongMoi] IS NULL AND [GiaTriHangMoi] IS NULL)"
                + " OR ([MaHHMoi] IS NOT NULL AND [SoLuongMoi] IS NOT NULL AND [GiaTriHangMoi] IS NOT NULL)");
            t.HasCheckConstraint("CK_CTDT_MoTaLoi", "[LoiNhaSanXuat] = 0 OR LEN(LTRIM(RTRIM(ISNULL([MoTaLoi], N'')))) > 0");
            t.HasCheckConstraint("CK_CTDT_GiaVonHangMoi", "[GiaVonHangMoi] IS NULL OR ([MaHHMoi] IS NOT NULL AND [GiaVonHangMoi] >= 0)");
        });
        b.HasKey(x => x.MaCTDT);
        b.Property(x => x.MaCTDT).UseIdentityColumn();
        b.Property(x => x.MaPDT).HasColumnType("varchar(20)");
        b.Property(x => x.GiaTriHoan).HasColumnType("decimal(15,0)");
        b.Property(x => x.TinhTrangHang).HasColumnType("nvarchar(100)").IsRequired();
        b.Property(x => x.LoiNhaSanXuat).HasDefaultValue(false);
        b.Property(x => x.MoTaLoi).HasColumnType("nvarchar(255)");
        b.Property(x => x.MaHHMoi).HasColumnType("varchar(20)");
        b.Property(x => x.GiaTriHangMoi).HasColumnType("decimal(15,0)");
        b.Property(x => x.GiaVonHangMoi).HasColumnType("decimal(15,0)");
        b.Property(x => x.MaLoMoi).HasColumnType("varchar(20)");
        b.HasOne(x => x.PhieuDoiTra).WithMany(p => p.ChiTiet).HasForeignKey(x => x.MaPDT).OnDelete(DeleteBehavior.Restrict);
        b.HasOne(x => x.ChiTietHoaDon).WithMany().HasForeignKey(x => x.MaCTHD).OnDelete(DeleteBehavior.Restrict);
        b.HasOne(x => x.HangHoaMoi).WithMany().HasForeignKey(x => x.MaHHMoi).OnDelete(DeleteBehavior.Restrict);
        b.HasOne<LoHang>().WithMany().HasForeignKey(x => x.MaLoMoi).OnDelete(DeleteBehavior.Restrict);
        b.HasIndex(x => x.MaCTHD).HasDatabaseName("IX_CTDT_MaCTHD");
    }
}

/// <summary>THIET_KE_DB_V2.md mục 4 – ThongBao.</summary>
public class ThongBaoConfig : IEntityTypeConfiguration<ThongBao>
{
    public void Configure(EntityTypeBuilder<ThongBao> b)
    {
        b.ToTable("ThongBao");
        b.HasKey(x => x.MaTB);
        b.Property(x => x.MaTB).UseIdentityColumn();
        b.Property(x => x.MaND).HasColumnType("varchar(20)");
        b.Property(x => x.LoaiThongBao).HasColumnType("nvarchar(50)").IsRequired();
        b.Property(x => x.NoiDung).HasColumnType("nvarchar(500)").IsRequired();
        b.Property(x => x.MaThamChieu).HasColumnType("varchar(20)");
        b.Property(x => x.ThoiDiemTao).HasColumnType("datetime2(0)").HasDefaultValueSql("SYSDATETIME()");
        b.Property(x => x.DaDoc).HasDefaultValue(false);
        b.HasOne<NguoiDung>().WithMany().HasForeignKey(x => x.MaND).OnDelete(DeleteBehavior.Cascade);
        b.HasIndex(x => new { x.MaND, x.DaDoc }).HasDatabaseName("IX_ThongBao_MaND_DaDoc");
    }
}
