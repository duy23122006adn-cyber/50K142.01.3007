using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using XomNho.Api.Common;
using XomNho.Api.Data;
using XomNho.Api.Domain;
using XomNho.Api.XacThuc;

namespace XomNho.Api.DoiTraQL;

public sealed record YeuCauMaPhieu(string? MaPDT);

/// <summary>UC_6.2 Xử lý đổi trả – Chủ quán và Nhân viên.</summary>
[ApiController]
[Route("api/doi-tra")]
public sealed class DoiTraController(DichVuDoiTra dichVu, INguoiDungHienTai hienTai) : ControllerBase
{
    /// <summary>Mã hóa đơn có dấu "/" nên truyền qua query string.</summary>
    [HttpGet("hoa-don")]
    public Task<HoaDonDoiTra> HoaDon([FromQuery] string ma, CancellationToken ct) => dichVu.HoaDonAsync(ma, ct);

    [HttpPost("xem-truoc")]
    public Task<XemTruocPhieu> XemTruoc(YeuCauLapPhieu yc, CancellationToken ct) => dichVu.XemTruocAsync(yc, ct);

    [HttpPost("phieu")]
    public Task<PhieuDoiTraDto> LapPhieu(YeuCauLapPhieu yc, CancellationToken ct) => dichVu.LapPhieuAsync(yc, ct);

    [HttpGet("phieu")]
    public Task<PhieuDoiTraDto> Phieu([FromQuery] string ma, CancellationToken ct) => dichVu.PhieuAsync(ma, ct);

    /// <summary>Phiếu chờ duyệt hoặc đã duyệt chưa hoàn tất. Nhân viên chỉ thấy phiếu mình lập.</summary>
    [HttpGet("dang-xu-ly")]
    public Task<List<PhieuDoiTraDong>> DangXuLy(CancellationToken ct) =>
        dichVu.DanhSachAsync(null, dangXuLy: true, chiCuaToi: hienTai.VaiTro != VaiTroNguoiDung.ChuQuan, ct);

    [HttpPost("xu-ly")]
    public Task<PhieuDoiTraDto> XuLy(YeuCauXuLyPhieu yc, CancellationToken ct) => dichVu.XuLyAsync(yc, ct);

    [HttpPost("khong-hoan-tat")]
    public Task<PhieuDoiTraDto> KhongHoanTat(YeuCauMaPhieu yc, CancellationToken ct) => dichVu.KhongHoanTatAsync(yc.MaPDT, ct);
}

/// <summary>UC_6.4 Duyệt phiếu đổi trả – chỉ Chủ quán.</summary>
[ApiController]
[Route("api/duyet-doi-tra")]
[Authorize(Policy = ChinhSach.ChiChuQuan)]
public sealed class DuyetDoiTraController(DichVuDoiTra dichVu) : ControllerBase
{
    [HttpGet]
    public Task<List<PhieuDoiTraDong>> DanhSach([FromQuery] string? trangThai, CancellationToken ct) =>
        dichVu.DanhSachAsync(trangThai, dangXuLy: false, chiCuaToi: false, ct);

    [HttpPost("duyet")]
    public Task<PhieuDoiTraDto> Duyet(YeuCauMaPhieu yc, CancellationToken ct) => dichVu.DuyetAsync(yc.MaPDT, ct);

    [HttpPost("tu-choi")]
    public Task<PhieuDoiTraDto> TuChoi(YeuCauTuChoi yc, CancellationToken ct) => dichVu.TuChoiAsync(yc, ct);
}

public sealed record ThongBaoDong(int MaTB, string LoaiThongBao, string NoiDung, string? MaThamChieu, DateTime ThoiDiemTao, bool DaDoc);
public sealed record DanhSachThongBao(int SoChuaDoc, IReadOnlyList<ThongBaoDong> DanhSach);
public sealed record YeuCauDaDoc(int? MaTB);

/// <summary>Thông báo của người đang đăng nhập (UC_6.4 BR08: kết quả duyệt gửi người lập phiếu).</summary>
[ApiController]
[Route("api/thong-bao")]
public sealed class ThongBaoController(XomNhoDbContext db, INguoiDungHienTai hienTai) : ControllerBase
{
    [HttpGet]
    public async Task<DanhSachThongBao> DanhSach(CancellationToken ct)
    {
        var q = db.ThongBao.AsNoTracking().Where(t => t.MaND == hienTai.MaND);
        var ds = await q.OrderByDescending(t => t.ThoiDiemTao).ThenByDescending(t => t.MaTB).Take(20)
            .Select(t => new ThongBaoDong(t.MaTB, t.LoaiThongBao, t.NoiDung, t.MaThamChieu, t.ThoiDiemTao, t.DaDoc))
            .ToListAsync(ct);
        return new DanhSachThongBao(await q.CountAsync(t => !t.DaDoc, ct), ds);
    }

    /// <summary>Đánh dấu đã đọc một thông báo, hoặc tất cả nếu không truyền mã.</summary>
    [HttpPost("da-doc")]
    public async Task<NoContentResult> DaDoc(YeuCauDaDoc yc, CancellationToken ct)
    {
        var ds = await db.ThongBao.Where(t => t.MaND == hienTai.MaND && !t.DaDoc && (yc.MaTB == null || t.MaTB == yc.MaTB)).ToListAsync(ct);
        foreach (var t in ds) t.DaDoc = true;
        await db.SaveChangesAsync(ct);
        return NoContent();
    }
}
