using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using XomNho.Api.Common;
using XomNho.Api.Data;
using XomNho.Api.Domain;

namespace XomNho.Api.CaLam;

public sealed record CaHienTai(string MaCa, DateOnly NgayLamViec, TimeOnly GioBatDau, string TrangThai, string MaND, string HoTenPhuTrach);

/// <summary>
/// Ca làm việc – Q10: toàn quán chỉ một ca chưa kết thúc; ca tự mở khi có người đăng nhập
/// (hoặc khi phát sinh giao dịch) mà chưa có ca nào đang mở. Q11 / UC_9.1 BR07: khi ca
/// "Đang kết ca" thì khóa giao dịch nhập, xuất, bán, hủy trên toàn cửa hàng.
/// </summary>
public sealed class DichVuCa(XomNhoDbContext db, ISinhMa sinhMa, IDongHo dongHo, ILogger<DichVuCa> log)
{
    public const string DangKetCa = "Ca làm việc đang kết ca. Tạm dừng giao dịch nhập, xuất, bán, hủy cho đến khi lưu biên bản.";

    public Task<CaLamViec?> CaChuaKetThucAsync(CancellationToken ct) =>
        db.CaLamViec.FirstOrDefaultAsync(c => c.TrangThai != TrangThaiCa.DaKetThuc, ct);

    public async Task<CaHienTai?> HienTaiAsync(CancellationToken ct)
    {
        return await db.CaLamViec.AsNoTracking()
            .Where(c => c.TrangThai != TrangThaiCa.DaKetThuc)
            .Select(c => new CaHienTai(c.MaCa, c.NgayLamViec, c.GioBatDau, c.TrangThai, c.MaND, c.NguoiDung.HoTen))
            .FirstOrDefaultAsync(ct);
    }

    /// <summary>Đảm bảo có ca đang mở; chưa có thì mở ca mới với người phụ trách là <paramref name="maND"/>.</summary>
    public async Task<CaLamViec> DamBaoCaMoAsync(string maND, CancellationToken ct)
    {
        var ca = await CaChuaKetThucAsync(ct);
        if (ca is not null) return ca;

        var bayGio = dongHo.BayGio;
        var giaoDichNgoai = db.Database.CurrentTransaction is not null;
        var tx = giaoDichNgoai ? null : await db.Database.BeginTransactionAsync(ct);
        try
        {
            ca = new CaLamViec
            {
                MaCa = await sinhMa.SinhMaAsync(LoaiMa.CaLamViec, ct),
                NgayLamViec = DateOnly.FromDateTime(bayGio),
                GioBatDau = TimeOnly.FromDateTime(bayGio),
                TrangThai = TrangThaiCa.DangHoatDong,
                MaND = maND,
            };
            db.CaLamViec.Add(ca);
            await db.SaveChangesAsync(ct);
            if (tx is not null) await tx.CommitAsync(ct);
            log.LogInformation("Mở ca {MaCa} – người phụ trách {MaND}.", ca.MaCa, maND);
            return ca;
        }
        catch (DbUpdateException ex) when (LoiTrungKhoa.TenChiMuc(ex) == "UX_CaLamViec_KhoaCaMo")
        {
            // Người khác vừa mở ca cùng lúc → dùng ca đó.
            if (tx is not null) await tx.RollbackAsync(ct);
            db.ChangeTracker.Entries<CaLamViec>().Where(e => e.State == EntityState.Added).ToList()
                .ForEach(e => e.State = EntityState.Detached);
            var caKhac = await CaChuaKetThucAsync(ct);
            if (caKhac is null) throw;
            return caKhac;
        }
        finally
        {
            if (tx is not null) await tx.DisposeAsync();
        }
    }

    /// <summary>Q10: mở ca khi đăng nhập. Lỗi mở ca không làm hỏng đăng nhập (ca sẽ tự mở ở giao dịch kế tiếp).</summary>
    public async Task ThuMoCaKhiDangNhapAsync(string maND, CancellationToken ct)
    {
        try
        {
            await DamBaoCaMoAsync(maND, ct);
        }
        catch (Exception ex) when (ex is not OperationCanceledException)
        {
            log.LogWarning(ex, "Không mở được ca khi {MaND} đăng nhập.", maND);
        }
    }

    /// <summary>
    /// Gọi trước mọi giao dịch nhập, xuất, bán, hủy: trả về ca đang hoạt động (tự mở nếu chưa có);
    /// từ chối nếu ca đang kết ca (UC_9.1 BR07).
    /// </summary>
    public async Task<CaLamViec> CaChoGiaoDichAsync(string maND, CancellationToken ct)
    {
        var ca = await DamBaoCaMoAsync(maND, ct);
        if (ca.TrangThai == TrangThaiCa.DangKetCa)
            throw new LoiNghiepVuException(StatusCodes.Status409Conflict, DangKetCa);
        return ca;
    }

    /// <summary>Chỉ kiểm tra khóa giao dịch, không mở ca mới (dùng cho thêm lô, điều chỉnh tồn).</summary>
    public async Task KiemTraKhongDangKetCaAsync(CancellationToken ct)
    {
        if (await db.CaLamViec.AnyAsync(c => c.TrangThai == TrangThaiCa.DangKetCa, ct))
            throw new LoiNghiepVuException(StatusCodes.Status409Conflict, DangKetCa);
    }
}

[ApiController]
[Route("api/ca")]
[Authorize]
public sealed class CaController(DichVuCa dichVu) : ControllerBase
{
    /// <summary>Ca đang mở của cửa hàng (hiển thị trên thanh tiêu đề). 204 nếu chưa có.</summary>
    [HttpGet("hien-tai")]
    public async Task<ActionResult<CaHienTai>> HienTai(CancellationToken ct)
    {
        var ca = await dichVu.HienTaiAsync(ct);
        return ca is null ? NoContent() : ca;
    }
}
