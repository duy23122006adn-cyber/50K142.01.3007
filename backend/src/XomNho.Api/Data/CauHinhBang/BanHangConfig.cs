using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using XomNho.Api.Domain;

namespace XomNho.Api.Data.CauHinhBang;

/// <summary>THIET_KE_DB_V2.md mục 3.11.</summary>
public class CaLamViecConfig : IEntityTypeConfiguration<CaLamViec>
{
    public void Configure(EntityTypeBuilder<CaLamViec> b)
    {
        b.ToTable("CaLamViec", t =>
        {
            t.HasCheckConstraint("CK_CaLamViec_TrangThai",
                $"[TrangThai] IN (N'{TrangThaiCa.DangHoatDong}', N'{TrangThaiCa.DangKetCa}', N'{TrangThaiCa.DaKetThuc}')");
            t.HasCheckConstraint("CK_CaLamViec_GioKetThuc",
                $"([TrangThai] = N'{TrangThaiCa.DaKetThuc}' AND [GioKetThuc] IS NOT NULL) OR ([TrangThai] <> N'{TrangThaiCa.DaKetThuc}' AND [GioKetThuc] IS NULL)");
        });
        b.HasKey(x => x.MaCa);
        b.Property(x => x.MaCa).HasColumnType("varchar(20)");
        b.Property(x => x.NgayLamViec).HasColumnType("date").HasDefaultValueSql("CAST(GETDATE() AS DATE)");
        b.Property(x => x.GioBatDau).HasColumnType("time(0)");
        b.Property(x => x.GioKetThuc).HasColumnType("time(0)");
        b.Property(x => x.TrangThai).HasColumnType("nvarchar(25)").HasDefaultValue(TrangThaiCa.DangHoatDong);
        b.Property(x => x.MaND).HasColumnType("varchar(20)");
        b.Property(x => x.PhienBan).IsRowVersion();
        // Q10: ca đã kết thúc lấy chính MaCa; mọi ca chưa kết thúc = 'DANG_MO' → UNIQUE chặn ca thứ hai.
        b.Property(x => x.KhoaCaMo).HasColumnType("varchar(20)")
            .HasComputedColumnSql($"CASE WHEN [TrangThai] = N'{TrangThaiCa.DaKetThuc}' THEN [MaCa] ELSE 'DANG_MO' END", stored: true);
        // Không dùng filter: SQL Server cấm filtered index trên cột tính toán (lỗi 10609); cột luôn khác NULL.
        b.HasIndex(x => x.KhoaCaMo).IsUnique().HasFilter(null).HasDatabaseName("UX_CaLamViec_KhoaCaMo");
        b.HasOne(x => x.NguoiDung).WithMany().HasForeignKey(x => x.MaND).OnDelete(DeleteBehavior.Restrict);
    }
}

/// <summary>THIET_KE_DB_V2.md mục 3.4.</summary>
public class KhachHangConfig : IEntityTypeConfiguration<KhachHang>
{
    public void Configure(EntityTypeBuilder<KhachHang> b)
    {
        b.ToTable("KhachHang", t =>
        {
            t.HasCheckConstraint("CK_KhachHang_HoTen", "LEN(LTRIM(RTRIM([HoTen]))) > 0");
            t.HasCheckConstraint("CK_KhachHang_SDT", "LEN([SDT]) = 10 AND [SDT] LIKE '0%' AND [SDT] NOT LIKE '%[^0-9]%'");
        });
        b.HasKey(x => x.MaKH);
        b.Property(x => x.MaKH).HasColumnType("varchar(20)");
        b.Property(x => x.HoTen).HasColumnType("nvarchar(50)").IsRequired();
        b.Property(x => x.SDT).HasColumnType("char(10)").IsRequired();
        b.Property(x => x.PhienBan).IsRowVersion();
        b.HasIndex(x => x.SDT).IsUnique().HasDatabaseName("UX_KhachHang_SDT");
        b.HasIndex(x => x.HoTen).HasDatabaseName("IX_KhachHang_HoTen");
    }
}

/// <summary>THIET_KE_DB_V2.md mục 3.14.</summary>
public class HoaDonConfig : IEntityTypeConfiguration<HoaDon>
{
    public void Configure(EntityTypeBuilder<HoaDon> b)
    {
        var tt = string.Join(", ", TrangThaiHoaDon.TatCa.Select(x => $"N'{x}'"));
        b.ToTable("HoaDon", t =>
        {
            t.HasCheckConstraint("CK_HoaDon_TongTien", "[TongTien] > 0");
            t.HasCheckConstraint("CK_HoaDon_SoTienDaTra", "[SoTienDaTra] >= 0 AND [SoTienDaTra] <= [TongTien]");
            t.HasCheckConstraint("CK_HoaDon_TrangThai", $"[TrangThai] IN ({tt})");
        });
        b.HasKey(x => x.MaHD);
        b.Property(x => x.MaHD).HasColumnType("varchar(20)");
        b.Property(x => x.NgayGioLap).HasColumnType("datetime2(0)").HasDefaultValueSql("SYSDATETIME()");
        b.Property(x => x.TongTien).HasColumnType("decimal(15,0)");
        b.Property(x => x.SoTienDaTra).HasColumnType("decimal(15,0)").HasDefaultValue(0m);
        b.Property(x => x.TrangThai).HasColumnType("nvarchar(25)").IsRequired();
        b.Property(x => x.MaCa).HasColumnType("varchar(20)");
        b.Property(x => x.MaND).HasColumnType("varchar(20)");
        b.HasOne(x => x.CaLamViec).WithMany().HasForeignKey(x => x.MaCa).OnDelete(DeleteBehavior.Restrict);
        b.HasOne(x => x.NguoiDung).WithMany().HasForeignKey(x => x.MaND).OnDelete(DeleteBehavior.Restrict);
        b.HasIndex(x => x.NgayGioLap).HasDatabaseName("IX_HoaDon_NgayGioLap");
    }
}

/// <summary>Giai đoạn 8c – hóa đơn tạm bán offline.</summary>
public class HoaDonTamConfig : IEntityTypeConfiguration<HoaDonTam>
{
    public void Configure(EntityTypeBuilder<HoaDonTam> b)
    {
        var tt = string.Join(", ", TrangThaiHoaDonTam.TatCa.Select(x => $"N'{x}'"));
        b.ToTable("HoaDonTam", t =>
        {
            t.HasCheckConstraint("CK_HDT_TrangThai", $"[TrangThai] IN ({tt})");
            t.HasCheckConstraint("CK_HDT_TongTien", "[TongTien] > 0 AND [TienKhachDua] >= [TongTien]");
            t.HasCheckConstraint("CK_HDT_NoiDung", "ISJSON([NoiDung]) = 1");
            // Đã ghi nhận ⇔ có hóa đơn chính thức; chờ xử lý / đã hủy phải có lý do.
            t.HasCheckConstraint("CK_HDT_MaHD",
                $"([TrangThai] = N'{TrangThaiHoaDonTam.DaGhiNhan}' AND [MaHD] IS NOT NULL)"
                + $" OR ([TrangThai] <> N'{TrangThaiHoaDonTam.DaGhiNhan}' AND [MaHD] IS NULL AND LEN(LTRIM(RTRIM(ISNULL([LyDo], N'')))) > 0)");
        });
        b.HasKey(x => x.MaTam);
        b.Property(x => x.MaTam).HasColumnType("varchar(20)");
        b.Property(x => x.NgayGioBan).HasColumnType("datetime2(0)");
        b.Property(x => x.MaND).HasColumnType("varchar(20)");
        b.Property(x => x.MaKH).HasColumnType("varchar(20)");
        b.Property(x => x.NoiDung).HasColumnType("nvarchar(max)").IsRequired();
        b.Property(x => x.TongTien).HasColumnType("decimal(15,0)");
        b.Property(x => x.TienKhachDua).HasColumnType("decimal(15,0)");
        b.Property(x => x.TrangThai).HasColumnType("nvarchar(30)").IsRequired();
        b.Property(x => x.LyDo).HasColumnType("nvarchar(255)");
        b.Property(x => x.NgayGioDongBo).HasColumnType("datetime2(0)");
        b.Property(x => x.MaNguoiDongBo).HasColumnType("varchar(20)");
        b.Property(x => x.MaHD).HasColumnType("varchar(20)");
        b.Property(x => x.NgayGioXuLy).HasColumnType("datetime2(0)");
        b.Property(x => x.MaNguoiXuLy).HasColumnType("varchar(20)");
        b.Property(x => x.PhienBan).IsRowVersion();
        b.HasOne(x => x.NguoiDung).WithMany().HasForeignKey(x => x.MaND).OnDelete(DeleteBehavior.Restrict);
        b.HasOne<NguoiDung>().WithMany().HasForeignKey(x => x.MaNguoiDongBo).OnDelete(DeleteBehavior.Restrict);
        b.HasOne<NguoiDung>().WithMany().HasForeignKey(x => x.MaNguoiXuLy).OnDelete(DeleteBehavior.Restrict);
        b.HasOne<KhachHang>().WithMany().HasForeignKey(x => x.MaKH).OnDelete(DeleteBehavior.Restrict);
        b.HasOne(x => x.HoaDon).WithOne().HasForeignKey<HoaDonTam>(x => x.MaHD).OnDelete(DeleteBehavior.Restrict);
        b.HasIndex(x => x.MaHD).IsUnique().HasFilter("[MaHD] IS NOT NULL").HasDatabaseName("UX_HoaDonTam_MaHD");
        b.HasIndex(x => new { x.TrangThai, x.NgayGioBan }).HasDatabaseName("IX_HoaDonTam_TrangThai");
    }
}

/// <summary>THIET_KE_DB_V2.md mục 3.15.</summary>
public class HoaDonThanhToanNgayConfig : IEntityTypeConfiguration<HoaDonThanhToanNgay>
{
    public void Configure(EntityTypeBuilder<HoaDonThanhToanNgay> b)
    {
        b.ToTable("HoaDonThanhToanNgay");
        b.HasKey(x => x.MaHD);
        b.Property(x => x.MaHD).HasColumnType("varchar(20)");
        b.Property(x => x.MaKH).HasColumnType("varchar(20)");
        b.HasOne(x => x.HoaDon).WithOne(h => h.ThanhToanNgay).HasForeignKey<HoaDonThanhToanNgay>(x => x.MaHD)
            .OnDelete(DeleteBehavior.Restrict);
        b.HasOne(x => x.KhachHang).WithMany().HasForeignKey(x => x.MaKH).OnDelete(DeleteBehavior.Restrict);
    }
}

/// <summary>THIET_KE_DB_V2.md mục 3.17.</summary>
public class ChiTietHoaDonConfig : IEntityTypeConfiguration<ChiTietHoaDon>
{
    public void Configure(EntityTypeBuilder<ChiTietHoaDon> b)
    {
        b.ToTable("ChiTietHoaDon", t =>
        {
            t.HasCheckConstraint("CK_CTHD_SoLuong", "[SoLuong] > 0");
            t.HasCheckConstraint("CK_CTHD_DonGia", "[DonGia] >= 0");
            t.HasCheckConstraint("CK_CTHD_GiaVon", "[GiaVon] >= 0");
        });
        b.HasKey(x => x.MaCTHD);
        b.Property(x => x.MaCTHD).UseIdentityColumn();
        b.Property(x => x.MaHD).HasColumnType("varchar(20)");
        b.Property(x => x.MaHH).HasColumnType("varchar(20)");
        b.Property(x => x.MaLo).HasColumnType("varchar(20)");
        b.Property(x => x.DonGia).HasColumnType("decimal(15,0)");
        b.Property(x => x.GiaVon).HasColumnType("decimal(15,0)");
        b.Property(x => x.ThanhTien).HasColumnType("decimal(25,0)").HasComputedColumnSql("[SoLuong] * [DonGia]", stored: true);

        b.HasOne(x => x.HoaDon).WithMany(h => h.ChiTiet).HasForeignKey(x => x.MaHD).OnDelete(DeleteBehavior.Restrict);
        b.HasOne(x => x.HangHoa).WithMany().HasForeignKey(x => x.MaHH).OnDelete(DeleteBehavior.Restrict);
        b.HasOne(x => x.LoHang).WithMany()
            .HasForeignKey(x => new { x.MaLo, x.MaHH }).HasPrincipalKey(l => new { l.MaLo, l.MaHH })
            .OnDelete(DeleteBehavior.Restrict);
        b.HasIndex(x => x.MaHD).HasDatabaseName("IX_CTHD_MaHD");
    }
}

/// <summary>THIET_KE_DB_V2.md mục 3.21 (Giai đoạn 3: phiếu bán hàng; cột MaKQ, MaPDT thêm ở giai đoạn sau).</summary>
public class PhieuThanhToanConfig : IEntityTypeConfiguration<PhieuThanhToan>
{
    public void Configure(EntityTypeBuilder<PhieuThanhToan> b)
    {
        b.ToTable("PhieuThanhToan", t =>
        {
            t.HasCheckConstraint("CK_PTT_SoTien", "[SoTien] > 0");
            t.HasCheckConstraint("CK_PTT_LoaiPhieu",
                $"[LoaiPhieu] IN (N'{LoaiPhieuThanhToan.BanHang}', N'{LoaiPhieuThanhToan.ThuNo}', N'{LoaiPhieuThanhToan.DoiTra}')");
            t.HasCheckConstraint("CK_PTT_HuongTien", $"[HuongTien] IN (N'{HuongTienTe.Thu}', N'{HuongTienTe.Chi}')");
            t.HasCheckConstraint("CK_PTT_PhuongThuc",
                $"[PhuongThuc] IN (N'{PhuongThucThanhToan.TienMat}', N'{PhuongThucThanhToan.ChuyenKhoanQr}')");
            t.HasCheckConstraint("CK_PTT_TrangThai",
                $"[TrangThai] IN (N'{TrangThaiPhieuThanhToan.ThanhCong}', N'{TrangThaiPhieuThanhToan.KhongThanhCong}', N'{TrangThaiPhieuThanhToan.DaHuy}')");
            t.HasCheckConstraint("CK_PTT_BanHang",
                $"[LoaiPhieu] <> N'{LoaiPhieuThanhToan.BanHang}' OR ([HuongTien] = N'{HuongTienTe.Thu}' AND [MaKQ] IS NULL AND [MaPDT] IS NULL)");
            t.HasCheckConstraint("CK_PTT_ThuNo",
                $"[LoaiPhieu] <> N'{LoaiPhieuThanhToan.ThuNo}' OR ([HuongTien] = N'{HuongTienTe.Thu}' AND [MaKQ] IS NOT NULL AND [MaHDTTN] IS NULL AND [MaPDT] IS NULL)");
            t.HasCheckConstraint("CK_PTT_DoiTra",
                $"[LoaiPhieu] <> N'{LoaiPhieuThanhToan.DoiTra}' OR ([MaPDT] IS NOT NULL AND [MaKQ] IS NULL AND [MaHDTTN] IS NULL)");
        });
        b.HasKey(x => x.MaPTT);
        b.Property(x => x.MaPTT).HasColumnType("varchar(20)");
        b.Property(x => x.NgayGio).HasColumnType("datetime2(0)").HasDefaultValueSql("SYSDATETIME()");
        b.Property(x => x.LoaiPhieu).HasColumnType("nvarchar(25)").IsRequired();
        b.Property(x => x.HuongTien).HasColumnType("nvarchar(10)").HasDefaultValue(HuongTienTe.Thu);
        b.Property(x => x.SoTien).HasColumnType("decimal(15,0)");
        b.Property(x => x.PhuongThuc).HasColumnType("nvarchar(25)").IsRequired();
        b.Property(x => x.TrangThai).HasColumnType("nvarchar(25)").HasDefaultValue(TrangThaiPhieuThanhToan.ThanhCong);
        b.Property(x => x.MaGiaoDichNganHang).HasColumnType("varchar(50)");
        b.Property(x => x.MaND).HasColumnType("varchar(20)");
        b.Property(x => x.MaHDTTN).HasColumnType("varchar(20)");
        b.Property(x => x.MaKQ).HasColumnType("varchar(20)");
        b.HasOne(x => x.NguoiDung).WithMany().HasForeignKey(x => x.MaND).OnDelete(DeleteBehavior.Restrict);
        b.HasOne(x => x.HoaDonThanhToanNgay).WithMany().HasForeignKey(x => x.MaHDTTN).OnDelete(DeleteBehavior.Restrict);
        b.HasOne(x => x.KhachQuen).WithMany().HasForeignKey(x => x.MaKQ).OnDelete(DeleteBehavior.Restrict);
        b.Property(x => x.MaPDT).HasColumnType("varchar(20)");
        b.HasOne(x => x.PhieuDoiTra).WithMany().HasForeignKey(x => x.MaPDT).OnDelete(DeleteBehavior.Restrict);
    }
}

/// <summary>THIET_KE_DB_V2.md mục 3.23 – NhatKyGuiChungTu.</summary>
public class NhatKyGuiChungTuConfig : IEntityTypeConfiguration<NhatKyGuiChungTu>
{
    public void Configure(EntityTypeBuilder<NhatKyGuiChungTu> b)
    {
        b.ToTable("NhatKyGuiChungTu", t =>
        {
            t.HasCheckConstraint("CK_NKGCT_LoaiChungTu", "[LoaiChungTu] IN (N'Hóa đơn', N'Phiếu thanh toán')");
            t.HasCheckConstraint("CK_NKGCT_Kenh", "[Kenh] IN (N'SMS', N'Zalo')");
            t.HasCheckConstraint("CK_NKGCT_KetQua", "[KetQua] IN (N'Thành công', N'Không thành công')");
        });
        b.HasKey(x => x.MaGui);
        b.Property(x => x.MaGui).UseIdentityColumn();
        b.Property(x => x.LoaiChungTu).HasColumnType("nvarchar(25)").IsRequired();
        b.Property(x => x.MaChungTu).HasColumnType("varchar(20)").IsRequired();
        b.Property(x => x.Kenh).HasColumnType("nvarchar(10)").IsRequired();
        b.Property(x => x.SDTNhan).HasColumnType("char(10)").IsRequired();
        b.Property(x => x.ThoiDiemGui).HasColumnType("datetime2(0)").HasDefaultValueSql("SYSDATETIME()");
        b.Property(x => x.KetQua).HasColumnType("nvarchar(25)").IsRequired();
        b.Property(x => x.MaND).HasColumnType("varchar(20)");
        b.HasOne<NguoiDung>().WithMany().HasForeignKey(x => x.MaND).OnDelete(DeleteBehavior.Restrict);
    }
}
