using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using XomNho.Api.Common;
using XomNho.Api.HangHoaQL;
using XomNho.Api.XacThuc;

namespace XomNho.Api.TonKho;

/// <summary>Quản lý tồn kho: UC_3.1 (Chủ quán, Nhân viên), UC_3.2, UC_3.3 (chỉ Chủ quán).</summary>
[ApiController]
[Route("api/ton-kho")]
public sealed class TonKhoController(DichVuTonKho dichVu) : ControllerBase
{
    [HttpGet]
    public Task<KetQuaTrang<LoTonKhoDong>> TimKiem([FromQuery] string? tuKhoa, [FromQuery] int trang = 1, CancellationToken ct = default) =>
        dichVu.TimKiemAsync(tuKhoa, trang, ct);

    [HttpGet("canh-bao")]
    [Authorize(Policy = ChinhSach.ChiChuQuan)]
    public Task<KetQuaCanhBao> CanhBao([FromQuery] string? loai, [FromQuery] bool caDaXuLy = false, CancellationToken ct = default) =>
        dichVu.CanhBaoAsync(loai, caDaXuLy, ct);

    [HttpGet("lo/{maLo}")]
    [Authorize(Policy = ChinhSach.ChiChuQuan)]
    public Task<LoDieuChinh> LayLo(string maLo, CancellationToken ct) => dichVu.LayLoDieuChinhAsync(maLo, ct);

    [HttpPost("lo/{maLo}/dieu-chinh")]
    [Authorize(Policy = ChinhSach.ChiChuQuan)]
    public async Task<PhanHoiThongBao> DieuChinh(string maLo, YeuCauDieuChinh yc, CancellationToken ct)
    {
        await dichVu.DieuChinhAsync(maLo, yc, ct);
        return new PhanHoiThongBao("Điều chỉnh tồn kho thành công");
    }
}

/// <summary>Quản lý lô hàng – chỉ Chủ quán (UC_10.1).</summary>
[ApiController]
[Route("api/lo-hang")]
[Authorize(Policy = ChinhSach.ChiChuQuan)]
public sealed class LoHangController(DichVuTonKho dichVu) : ControllerBase
{
    [HttpGet]
    public Task<KetQuaTrang<LoHangDong>> DanhSach([FromQuery] int trang = 1, CancellationToken ct = default) =>
        dichVu.DanhSachLoAsync(trang, ct);

    [HttpGet("ma-du-kien")]
    public async Task<PhanHoiMa> MaDuKien(CancellationToken ct) => new(await dichVu.MaLoDuKienAsync(ct));

    [HttpPost]
    public async Task<PhanHoiMa> Them(YeuCauThemLo yc, CancellationToken ct) => new(await dichVu.ThemLoAsync(yc, ct));
}
