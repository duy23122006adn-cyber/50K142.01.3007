using System.Text.Encodings.Web;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.ChangeTracking;
using XomNho.Api.Common;
using XomNho.Api.Domain;

namespace XomNho.Api.Data;

public class XomNhoDbContext(
    DbContextOptions<XomNhoDbContext> options,
    INguoiDungHienTai? nguoiDungHienTai = null,
    IDongHo? dongHo = null) : DbContext(options)
{
    public DbSet<NguoiDung> NguoiDung => Set<NguoiDung>();
    public DbSet<NhanVien> NhanVien => Set<NhanVien>();
    public DbSet<ChuQuan> ChuQuan => Set<ChuQuan>();
    public DbSet<PhienDangNhap> PhienDangNhap => Set<PhienDangNhap>();
    public DbSet<MaXacThuc> MaXacThuc => Set<MaXacThuc>();
    public DbSet<NhatKyThaoTac> NhatKyThaoTac => Set<NhatKyThaoTac>();
    public DbSet<BoDemMa> BoDemMa => Set<BoDemMa>();
    public DbSet<CauHinh> CauHinh => Set<CauHinh>();

    // Giai đoạn 2
    public DbSet<LichSuSuaNhanVien> LichSuSuaNhanVien => Set<LichSuSuaNhanVien>();
    public DbSet<DanhMuc> DanhMuc => Set<DanhMuc>();
    public DbSet<HangHoa> HangHoa => Set<HangHoa>();
    public DbSet<LoHang> LoHang => Set<LoHang>();
    public DbSet<CanhBaoTonKho> CanhBaoTonKho => Set<CanhBaoTonKho>();
    public DbSet<PhieuDieuChinhTon> PhieuDieuChinhTon => Set<PhieuDieuChinhTon>();

    // Giai đoạn 3
    public DbSet<CaLamViec> CaLamViec => Set<CaLamViec>();
    public DbSet<KhachHang> KhachHang => Set<KhachHang>();
    public DbSet<HoaDon> HoaDon => Set<HoaDon>();
    public DbSet<HoaDonThanhToanNgay> HoaDonThanhToanNgay => Set<HoaDonThanhToanNgay>();
    public DbSet<ChiTietHoaDon> ChiTietHoaDon => Set<ChiTietHoaDon>();
    public DbSet<PhieuThanhToan> PhieuThanhToan => Set<PhieuThanhToan>();
    public DbSet<NhatKyGuiChungTu> NhatKyGuiChungTu => Set<NhatKyGuiChungTu>();
    public DbSet<HoaDonTam> HoaDonTam => Set<HoaDonTam>();
    public DbSet<GiaoDichNganHang> GiaoDichNganHang => Set<GiaoDichNganHang>();

    // Giai đoạn 4
    public DbSet<KhachQuen> KhachQuen => Set<KhachQuen>();
    public DbSet<HoaDonNo> HoaDonNo => Set<HoaDonNo>();
    public DbSet<PhanBoThanhToan> PhanBoThanhToan => Set<PhanBoThanhToan>();

    // Giai đoạn 5
    public DbSet<NhatKyHuy> NhatKyHuy => Set<NhatKyHuy>();
    public DbSet<PhieuDoiTra> PhieuDoiTra => Set<PhieuDoiTra>();
    public DbSet<ChiTietDoiTra> ChiTietDoiTra => Set<ChiTietDoiTra>();
    public DbSet<ThongBao> ThongBao => Set<ThongBao>();

    // Giai đoạn 6
    public DbSet<BienBanKetCa> BienBanKetCa => Set<BienBanKetCa>();
    public DbSet<ChiTietBienBan> ChiTietBienBan => Set<ChiTietBienBan>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        // Không phân biệt hoa thường khi so sánh/tìm kiếm (THIET_KE_DB_V2.md mục 1).
        modelBuilder.UseCollation("Vietnamese_CI_AS");
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(XomNhoDbContext).Assembly);
    }

    /// <summary>
    /// Transaction mức SERIALIZABLE trên SQL Server (chống hai thao tác đồng thời cùng đọc-rồi-ghi một khách hàng,
    /// ví dụ kiểm tra hạn mức nợ). Provider không quan hệ (InMemory khi kiểm thử) dùng transaction thường.
    /// </summary>
    public Task<Microsoft.EntityFrameworkCore.Storage.IDbContextTransaction> MoGiaoDichTuanTuAsync(CancellationToken ct) =>
        Database.IsRelational()
            ? Database.BeginTransactionAsync(System.Data.IsolationLevel.Serializable, ct)
            : Database.BeginTransactionAsync(ct);

    // ---------------------------------------------------------------- Nhật ký thao tác

    /// <summary>Các bảng không tự ghi nhật ký (chứa dữ liệu bí mật hoặc là chính bảng nhật ký).</summary>
    private static readonly HashSet<Type> BangKhongGhiNhatKy =
        [typeof(NhatKyThaoTac), typeof(PhienDangNhap), typeof(MaXacThuc), typeof(BoDemMa), typeof(CanhBaoTonKho), typeof(NhatKyGuiChungTu), typeof(ThongBao)];

    private static readonly HashSet<string> CotBiMat = ["MatKhau", "MaBam", "RefreshTokenHash", "PhienBan"];

    private static readonly JsonSerializerOptions JsonTiengViet = new()
    {
        Encoder = JavaScriptEncoder.UnsafeRelaxedJsonEscaping,
    };

    /// <summary>Ghi một dòng nhật ký nghiệp vụ (đăng nhập, mở khóa…). Được lưu ở lần SaveChanges kế tiếp.</summary>
    public void GhiNhatKy(string hanhDong, string? maND = null, string? tenDangNhap = null,
        string? bangDuLieu = null, string? maBanGhi = null, object? chiTiet = null)
    {
        NhatKyThaoTac.Add(new NhatKyThaoTac
        {
            ThoiDiem = dongHo?.BayGio ?? DateTime.Now,
            MaND = maND ?? nguoiDungHienTai?.MaND,
            TenDangNhap = tenDangNhap ?? nguoiDungHienTai?.TenDangNhap,
            HanhDong = hanhDong,
            BangDuLieu = bangDuLieu,
            MaBanGhi = maBanGhi,
            DuLieuMoi = chiTiet is null ? null : JsonSerializer.Serialize(chiTiet, JsonTiengViet),
            DiaChiIP = nguoiDungHienTai?.DiaChiIP,
        });
    }

    public override int SaveChanges(bool acceptAllChangesOnSuccess)
    {
        GhiNhatKyThayDoi();
        return base.SaveChanges(acceptAllChangesOnSuccess);
    }

    public override Task<int> SaveChangesAsync(bool acceptAllChangesOnSuccess, CancellationToken ct = default)
    {
        GhiNhatKyThayDoi();
        return base.SaveChangesAsync(acceptAllChangesOnSuccess, ct);
    }

    /// <summary>Tự động ghi NhatKyThaoTac cho mọi thêm/sửa/xóa (NFR Security-06).</summary>
    private void GhiNhatKyThayDoi()
    {
        ChangeTracker.DetectChanges();
        var thayDoi = ChangeTracker.Entries()
            .Where(e => e.State is EntityState.Added or EntityState.Modified or EntityState.Deleted)
            .Where(e => !BangKhongGhiNhatKy.Contains(e.Entity.GetType()))
            .ToList();

        foreach (var e in thayDoi)
        {
            var hanhDong = e.State switch
            {
                EntityState.Added => "Thêm",
                EntityState.Modified => "Sửa",
                _ => "Xóa",
            };

            Dictionary<string, object?>? cu = null, moi = null;
            if (e.State == EntityState.Modified)
            {
                var doi = e.Properties.Where(p => p.IsModified && !CotBiMat.Contains(p.Metadata.Name)).ToList();
                var doiMatKhau = e.Properties.Any(p => p.IsModified && p.Metadata.Name == "MatKhau");
                if (doi.Count == 0 && !doiMatKhau) continue;
                cu = doi.ToDictionary(p => p.Metadata.Name, p => p.OriginalValue);
                moi = doi.ToDictionary(p => p.Metadata.Name, p => p.CurrentValue);
                if (doiMatKhau) moi["MatKhau"] = "(đã thay đổi)";
            }
            else if (e.State == EntityState.Added)
            {
                moi = GiaTri(e);
            }
            else
            {
                cu = GiaTri(e);
            }

            NhatKyThaoTac.Add(new NhatKyThaoTac
            {
                ThoiDiem = dongHo?.BayGio ?? DateTime.Now,
                MaND = nguoiDungHienTai?.MaND,
                TenDangNhap = nguoiDungHienTai?.TenDangNhap,
                HanhDong = hanhDong,
                BangDuLieu = e.Metadata.GetTableName(),
                MaBanGhi = string.Join(",", e.Properties.Where(p => p.Metadata.IsPrimaryKey()).Select(p => p.CurrentValue)),
                DuLieuCu = cu is null ? null : JsonSerializer.Serialize(cu, JsonTiengViet),
                DuLieuMoi = moi is null ? null : JsonSerializer.Serialize(moi, JsonTiengViet),
                DiaChiIP = nguoiDungHienTai?.DiaChiIP,
            });
        }
    }

    private static Dictionary<string, object?> GiaTri(EntityEntry e) =>
        e.Properties
            .Where(p => !CotBiMat.Contains(p.Metadata.Name))
            .ToDictionary(p => p.Metadata.Name, p => p.CurrentValue);
}
