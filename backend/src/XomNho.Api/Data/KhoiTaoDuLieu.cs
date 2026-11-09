using Microsoft.EntityFrameworkCore;
using XomNho.Api.Common;
using XomNho.Api.Domain;
using XomNho.Api.XacThuc;

namespace XomNho.Api.Data;

/// <summary>Thông tin tài khoản khởi tạo (appsettings: "KhoiTao:ChuQuan", "KhoiTao:NhanVienMau").</summary>
public sealed class TaiKhoanKhoiTao
{
    public string HoTen { get; set; } = "";
    public DateOnly NgaySinh { get; set; }
    public string SDT { get; set; } = "";
    public string Email { get; set; } = "";
    public string TenDangNhap { get; set; } = "";
    public string MatKhau { get; set; } = "";
}

/// <summary>
/// Nạp dữ liệu bắt buộc khi khởi động: bảng CauHinh và tài khoản Chủ quán đầu tiên.
/// Chỉ chạy khi database đã tồn tại và đã áp dụng đủ migration – không tự tạo database.
/// </summary>
public static class KhoiTaoDuLieu
{
    public static async Task ChayAsync(IServiceProvider sp, CancellationToken ct = default)
    {
        using var scope = sp.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<XomNhoDbContext>();
        var log = scope.ServiceProvider.GetRequiredService<ILoggerFactory>().CreateLogger("KhoiTaoDuLieu");
        var cauHinh = scope.ServiceProvider.GetRequiredService<IConfiguration>();
        var sinhMa = scope.ServiceProvider.GetRequiredService<ISinhMa>();

        try
        {
            if (!await db.Database.CanConnectAsync(ct))
            {
                log.LogWarning("Chưa có database. Bỏ qua bước khởi tạo dữ liệu (cần chạy migration trước).");
                return;
            }
            if ((await db.Database.GetPendingMigrationsAsync(ct)).Any())
            {
                log.LogWarning("Database còn migration chưa áp dụng. Bỏ qua bước khởi tạo dữ liệu.");
                return;
            }
        }
        catch (Exception ex)
        {
            log.LogWarning(ex, "Không kết nối được database. Bỏ qua bước khởi tạo dữ liệu.");
            return;
        }

        await using var tx = await db.Database.BeginTransactionAsync(ct);

        // 1. Tham số hệ thống.
        var daCo = await db.CauHinh.Select(c => c.MaCauHinh).ToListAsync(ct);
        foreach (var (khoa, (giaTri, moTa)) in ThamSoHeThong.MacDinh)
            if (!daCo.Contains(khoa))
                db.CauHinh.Add(new CauHinh { MaCauHinh = khoa, GiaTri = giaTri, MoTa = moTa });
        await db.SaveChangesAsync(ct);

        // 2. Tài khoản Chủ quán đầu tiên (UC_2.1 BR06: chức năng thêm tài khoản không tạo được Chủ quán).
        if (!await db.ChuQuan.AnyAsync(ct))
        {
            var tk = cauHinh.GetSection("KhoiTao:ChuQuan").Get<TaiKhoanKhoiTao>();
            if (tk is null || QuyTac.Trong(tk.TenDangNhap))
            {
                log.LogWarning("Chưa có tài khoản Chủ quán và thiếu cấu hình KhoiTao:ChuQuan.");
            }
            else
            {
                db.ChuQuan.Add(await TaoAsync<ChuQuan>(tk, LoaiMa.ChuQuan, sinhMa, ct));
                await db.SaveChangesAsync(ct);
                log.LogInformation("Đã tạo tài khoản Chủ quán {TenDangNhap}.", tk.TenDangNhap);
            }
        }

        // 3. Tài khoản nhân viên mẫu (chỉ cấu hình ở môi trường phát triển).
        var nvMau = cauHinh.GetSection("KhoiTao:NhanVienMau").Get<TaiKhoanKhoiTao>();
        if (nvMau is not null && !QuyTac.Trong(nvMau.TenDangNhap)
            && !await db.NguoiDung.AnyAsync(x => x.TenDangNhap == nvMau.TenDangNhap, ct))
        {
            db.NhanVien.Add(await TaoAsync<NhanVien>(nvMau, LoaiMa.NhanVien, sinhMa, ct));
            await db.SaveChangesAsync(ct);
            log.LogInformation("Đã tạo nhân viên mẫu {TenDangNhap}.", nvMau.TenDangNhap);
        }

        await tx.CommitAsync(ct);
    }

    private static async Task<T> TaoAsync<T>(TaiKhoanKhoiTao tk, LoaiMa loai, ISinhMa sinhMa, CancellationToken ct)
        where T : NguoiDung, new()
    {
        if (!QuyTac.MatKhauHopLe(tk.MatKhau))
            throw new InvalidOperationException($"Mật khẩu khởi tạo của {tk.TenDangNhap} không đạt quy tắc (≥ 8 ký tự, có chữ và số).");

        return new T
        {
            MaND = await sinhMa.SinhMaAsync(loai, ct),
            HoTen = tk.HoTen,
            NgaySinh = tk.NgaySinh,
            SDT = tk.SDT,
            Email = tk.Email,
            TenDangNhap = tk.TenDangNhap,
            MatKhau = DichVuXacThuc.BamMatKhau(tk.MatKhau),
            TrangThai = TrangThaiTaiKhoan.HoatDong,
        };
    }
}
