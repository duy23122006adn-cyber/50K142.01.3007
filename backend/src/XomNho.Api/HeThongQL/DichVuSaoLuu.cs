using System.Data;
using System.Data.Common;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using XomNho.Api.Common;
using XomNho.Api.Data;
using XomNho.Api.Domain;

namespace XomNho.Api.HeThongQL;

/// <summary>Tùy chọn sao lưu (appsettings: "SaoLuu").</summary>
public sealed class TuyChonSaoLuu
{
    public bool BatTuDong { get; set; } = true;
    /// <summary>Giờ chạy hằng ngày theo giờ Việt Nam, dạng HH:mm (Backup NFR-01: cuối ngày).</summary>
    public string GioChay { get; set; } = "23:30";
    /// <summary>Thư mục trên máy chạy SQL Server. Trống = thư mục sao lưu mặc định của SQL Server + "\XomNho".</summary>
    public string? ThuMuc { get; set; }
    /// <summary>Số ngày giữ bản sao lưu; bản cũ hơn bị xóa sau mỗi lần sao lưu thành công.</summary>
    public int SoNgayGiu { get; set; } = 14;

    public TimeOnly Gio => TimeOnly.TryParse(GioChay, out var g) ? g : new TimeOnly(23, 30);
}

/// <summary>Tính lịch chạy – tách riêng để kiểm thử.</summary>
public static class LichSaoLuu
{
    /// <summary>Lần chạy kế tiếp sau thời điểm hiện tại.</summary>
    public static DateTime LanKeTiep(DateTime bayGio, TimeOnly gio)
    {
        var homNay = bayGio.Date + gio.ToTimeSpan();
        return bayGio < homNay ? homNay : homNay.AddDays(1);
    }

    /// <summary>
    /// Sao lưu bù khi khởi động: lần sao lưu cuối cùng xảy ra trước mốc giờ chạy gần nhất đã qua
    /// (ví dụ máy tắt trước 23:30) hoặc chưa từng sao lưu.
    /// </summary>
    public static bool CanSaoLuuBu(DateTime? lanCuoi, DateTime bayGio, TimeOnly gio) =>
        lanCuoi is null || lanCuoi < LanKeTiep(bayGio, gio).AddDays(-1);
}

public sealed record BanSaoLuu(DateTime ThoiDiem, string TepTin, decimal DungLuongMB, bool TuDong);

public sealed record ThongTinSaoLuu(bool BatTuDong, string GioChay, int SoNgayGiu, string ThuMuc, DateTime? LanKeTiep, IReadOnlyList<BanSaoLuu> CacBan);

/// <summary>
/// Backup NFR-01: sao lưu toàn bộ CSDL ra tệp .bak trên máy chạy SQL Server, kiểm tra tệp bằng RESTORE VERIFYONLY,
/// xóa các bản cũ hơn <see cref="TuyChonSaoLuu.SoNgayGiu"/> ngày. Lịch sử đọc từ msdb (không cần bảng riêng).
/// </summary>
public sealed class DichVuSaoLuu(XomNhoDbContext db, IOptions<TuyChonSaoLuu> tuyChon, IDongHo dongHo, ILogger<DichVuSaoLuu> log)
{
    public const string DangChay = "Đang có một lần sao lưu khác, vui lòng thử lại sau.";
    public const string ThatBai = "Sao lưu dữ liệu thất bại";
    private const string TienToTen = "XomNho";
    private static readonly SemaphoreSlim Khoa = new(1, 1);
    private TuyChonSaoLuu Tc => tuyChon.Value;

    public async Task<BanSaoLuu> SaoLuuAsync(bool tuDong, CancellationToken ct)
    {
        if (!await Khoa.WaitAsync(0, ct)) throw new LoiNghiepVuException(StatusCodes.Status409Conflict, DangChay);
        try
        {
            await db.Database.OpenConnectionAsync(ct);
            try
            {
                var conn = db.Database.GetDbConnection();
                var thuMuc = await ThuMucAsync(conn, ct);
                var bayGio = dongHo.BayGio;
                var tep = $"{thuMuc.TrimEnd('\\', '/')}{(thuMuc.Contains('/') ? '/' : '\\')}{conn.Database}_{bayGio:yyyyMMdd_HHmmss}.bak";
                // Express (EngineEdition = 4) không hỗ trợ nén bản sao lưu.
                var nen = await GiaTriAsync<int>(conn, "SELECT CAST(SERVERPROPERTY('EngineEdition') AS int)", ct) != 4;
                var ten = $"{TienToTen} {(tuDong ? "tự động" : "thủ công")} {bayGio:dd/MM/yyyy HH:mm}";

                await ChayAsync(conn, $"BACKUP DATABASE @db TO DISK = @tep WITH INIT, CHECKSUM, NAME = @ten{(nen ? ", COMPRESSION" : "")}", ct,
                    ("@db", conn.Database), ("@tep", tep), ("@ten", ten));
                await ChayAsync(conn, "RESTORE VERIFYONLY FROM DISK = @tep WITH CHECKSUM", ct, ("@tep", tep));
                log.LogInformation("Đã sao lưu CSDL ra {Tep}.", tep);

                await XoaBanCuAsync(conn, ct);
                return (await CacBanAsync(conn, ct)).FirstOrDefault(b => b.TepTin == tep) ?? new BanSaoLuu(bayGio, tep, 0, tuDong);
            }
            finally
            {
                await db.Database.CloseConnectionAsync();
            }
        }
        catch (DbException ex)
        {
            log.LogError(ex, "Sao lưu CSDL thất bại.");
            throw new LoiNghiepVuException(StatusCodes.Status500InternalServerError, $"{ThatBai}: {ex.Message}");
        }
        finally
        {
            Khoa.Release();
        }
    }

    public async Task<ThongTinSaoLuu> ThongTinAsync(CancellationToken ct)
    {
        await db.Database.OpenConnectionAsync(ct);
        try
        {
            var conn = db.Database.GetDbConnection();
            return new ThongTinSaoLuu(Tc.BatTuDong, Tc.Gio.ToString("HH:mm"), Tc.SoNgayGiu, await ThuMucAsync(conn, ct, taoMoi: false),
                Tc.BatTuDong ? LichSaoLuu.LanKeTiep(dongHo.BayGio, Tc.Gio) : null, await CacBanAsync(conn, ct));
        }
        finally
        {
            await db.Database.CloseConnectionAsync();
        }
    }

    /// <summary>Thời điểm sao lưu thành công gần nhất (dùng để sao lưu bù khi khởi động).</summary>
    public async Task<DateTime?> LanCuoiAsync(CancellationToken ct)
    {
        await db.Database.OpenConnectionAsync(ct);
        try
        {
            var conn = db.Database.GetDbConnection();
            var kq = await GiaTriAsync<object>(conn,
                "SELECT MAX(backup_finish_date) FROM msdb.dbo.backupset WHERE database_name = DB_NAME() AND type = 'D' AND name LIKE @ten",
                ct, ("@ten", TienToTen + " %"));
            return kq is DateTime d ? d : null;
        }
        finally
        {
            await db.Database.CloseConnectionAsync();
        }
    }

    /// <summary>Báo cho mọi Chủ quán khi sao lưu tự động thất bại (chuông thông báo).</summary>
    public async Task BaoLoiAsync(string noiDung, CancellationToken ct)
    {
        db.ChangeTracker.Clear();
        foreach (var ma in await db.ChuQuan.Where(c => c.TrangThai != TrangThaiTaiKhoan.NgungHoatDong).Select(c => c.MaND).ToListAsync(ct))
            db.ThongBao.Add(new ThongBao { MaND = ma, LoaiThongBao = "Sao lưu", NoiDung = noiDung, ThoiDiemTao = dongHo.BayGio });
        await db.SaveChangesAsync(ct);
    }

    // ------------------------------------------------------------------ SQL

    private async Task<string> ThuMucAsync(DbConnection conn, CancellationToken ct, bool taoMoi = true)
    {
        if (!QuyTac.Trong(Tc.ThuMuc)) return Tc.ThuMuc!.Trim();
        var macDinh = await GiaTriAsync<string>(conn, "SELECT CAST(SERVERPROPERTY('InstanceDefaultBackupPath') AS nvarchar(4000))", ct);
        var thuMuc = $"{macDinh.TrimEnd('\\', '/')}{(macDinh.Contains('/') ? '/' : '\\')}{TienToTen}";
        if (taoMoi) await ChayAsync(conn, "EXEC master.dbo.xp_create_subdir @thuMuc", ct, ("@thuMuc", thuMuc));
        return thuMuc;
    }

    /// <summary>Chỉ xóa đúng các tệp do hệ thống này tạo (tra theo lịch sử msdb), không quét cả thư mục.</summary>
    private async Task XoaBanCuAsync(DbConnection conn, CancellationToken ct)
    {
        var moc = dongHo.BayGio.AddDays(-Math.Max(1, Tc.SoNgayGiu));
        foreach (var b in (await CacBanAsync(conn, ct, toiDa: 1000)).Where(b => b.ThoiDiem < moc))
        {
            try
            {
                await ChayAsync(conn, "EXEC master.dbo.xp_delete_file 0, @tep", ct, ("@tep", b.TepTin));
            }
            catch (DbException ex)
            {
                log.LogWarning(ex, "Không xóa được bản sao lưu cũ {Tep}.", b.TepTin);
            }
        }
    }

    private async Task<List<BanSaoLuu>> CacBanAsync(DbConnection conn, CancellationToken ct, int toiDa = 30)
    {
        var moc = dongHo.BayGio.AddDays(-Math.Max(1, Tc.SoNgayGiu));
        await using var cmd = Lenh(conn, $"""
            SELECT TOP ({toiDa}) b.backup_finish_date, m.physical_device_name,
                   CAST(COALESCE(b.compressed_backup_size, b.backup_size) / 1048576.0 AS decimal(12,1)), b.name
            FROM msdb.dbo.backupset b
            JOIN msdb.dbo.backupmediafamily m ON m.media_set_id = b.media_set_id
            WHERE b.database_name = DB_NAME() AND b.type = 'D' AND b.name LIKE @ten AND b.is_damaged = 0
              AND (@tatCa = 1 OR b.backup_finish_date >= @moc)
            ORDER BY b.backup_finish_date DESC
            """, ("@ten", TienToTen + " %"), ("@tatCa", toiDa > 30 ? 1 : 0), ("@moc", moc));
        var kq = new List<BanSaoLuu>();
        await using var r = await cmd.ExecuteReaderAsync(ct);
        while (await r.ReadAsync(ct))
            kq.Add(new BanSaoLuu(r.GetDateTime(0), r.GetString(1), r.GetDecimal(2), r.GetString(3).Contains("tự động")));
        return kq;
    }

    private static DbCommand Lenh(DbConnection conn, string sql, params (string Ten, object GiaTri)[] thamSo)
    {
        var cmd = conn.CreateCommand();
        cmd.CommandText = sql;
        cmd.CommandType = CommandType.Text;
        cmd.CommandTimeout = 900;
        foreach (var (ten, giaTri) in thamSo)
        {
            var p = cmd.CreateParameter();
            p.ParameterName = ten;
            p.Value = giaTri;
            cmd.Parameters.Add(p);
        }
        return cmd;
    }

    private static async Task ChayAsync(DbConnection conn, string sql, CancellationToken ct, params (string, object)[] thamSo)
    {
        await using var cmd = Lenh(conn, sql, thamSo);
        await cmd.ExecuteNonQueryAsync(ct);
    }

    private static async Task<T> GiaTriAsync<T>(DbConnection conn, string sql, CancellationToken ct, params (string, object)[] thamSo)
    {
        await using var cmd = Lenh(conn, sql, thamSo);
        var kq = await cmd.ExecuteScalarAsync(ct);
        return kq is DBNull or null ? default! : (T)kq;
    }
}

/// <summary>Sao lưu tự động hằng ngày lúc <see cref="TuyChonSaoLuu.GioChay"/>; khi khởi động thì sao lưu bù nếu đã lỡ lịch.</summary>
public sealed class SaoLuuNen(IServiceScopeFactory scopeFactory, IOptions<TuyChonSaoLuu> tuyChon, IDongHo dongHo, ILogger<SaoLuuNen> log)
    : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stop)
    {
        if (!tuyChon.Value.BatTuDong) return;
        try
        {
            await Task.Delay(TimeSpan.FromSeconds(30), stop);
            await ChayAsync(chiKhiLo: true, stop);
            while (!stop.IsCancellationRequested)
            {
                var bayGio = dongHo.BayGio;
                await Task.Delay(LichSaoLuu.LanKeTiep(bayGio, tuyChon.Value.Gio) - bayGio, stop);
                await ChayAsync(chiKhiLo: false, stop);
            }
        }
        catch (OperationCanceledException)
        {
            // Ứng dụng đang tắt.
        }
    }

    private async Task ChayAsync(bool chiKhiLo, CancellationToken stop)
    {
        using var scope = scopeFactory.CreateScope();
        var dv = scope.ServiceProvider.GetRequiredService<DichVuSaoLuu>();
        try
        {
            if (chiKhiLo && !LichSaoLuu.CanSaoLuuBu(await dv.LanCuoiAsync(stop), dongHo.BayGio, tuyChon.Value.Gio)) return;
            await dv.SaoLuuAsync(tuDong: true, stop);
        }
        catch (Exception ex) when (ex is not OperationCanceledException)
        {
            log.LogError(ex, "Sao lưu tự động thất bại.");
            try
            {
                await dv.BaoLoiAsync($"Sao lưu dữ liệu tự động lúc {dongHo.BayGio:HH:mm dd/MM/yyyy} thất bại. Vui lòng kiểm tra máy chủ hoặc sao lưu thủ công.", stop);
            }
            catch (Exception ex2) when (ex2 is not OperationCanceledException)
            {
                log.LogWarning(ex2, "Không gửi được thông báo lỗi sao lưu.");
            }
        }
    }
}

[ApiController]
[Route("api/sao-luu")]
[Authorize(Policy = ChinhSach.ChiChuQuan)]
public sealed class SaoLuuController(DichVuSaoLuu dichVu) : ControllerBase
{
    [HttpGet]
    public Task<ThongTinSaoLuu> ThongTin(CancellationToken ct) => dichVu.ThongTinAsync(ct);

    /// <summary>Sao lưu ngay (Chủ quán bấm thủ công).</summary>
    [HttpPost]
    public Task<BanSaoLuu> SaoLuuNgay(CancellationToken ct) => dichVu.SaoLuuAsync(tuDong: false, ct);
}
