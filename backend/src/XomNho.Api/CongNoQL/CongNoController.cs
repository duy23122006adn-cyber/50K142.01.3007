using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using XomNho.Api.HangHoaQL;
using XomNho.Api.XacThuc;

namespace XomNho.Api.CongNoQL;

/// <summary>
/// Quản lý công nợ: UC_7.2 Tìm kiếm khách quen, UC_7.3 Phiếu thanh toán nợ (Chủ quán, Nhân viên);
/// UC_7.4 Sửa, UC_7.5 Thêm, UC_7.6 Xóa khách quen (chỉ Chủ quán).
/// </summary>
[ApiController]
[Route("api/cong-no")]
public sealed class CongNoController(DichVuCongNo dichVu) : ControllerBase
{
    [HttpGet("khach-quen")]
    public Task<List<KhachQuenDong>> TimKhachQuen([FromQuery] string? tuKhoa, [FromQuery] string? trangThai, CancellationToken ct) =>
        dichVu.TimKhachQuenAsync(tuKhoa, trangThai, ct);

    [HttpGet("khach-quen/{maKH}")]
    public Task<ChiTietKhachQuen> ChiTiet(string maKH, CancellationToken ct) => dichVu.ChiTietKhachQuenAsync(maKH, ct);

    [HttpPost("khach-quen")]
    [Authorize(Policy = ChinhSach.ChiChuQuan)]
    public async Task<PhanHoiMa> Them(YeuCauKhachQuen yc, CancellationToken ct) => new(await dichVu.ThemKhachQuenAsync(yc, ct));

    [HttpPut("khach-quen/{maKH}")]
    [Authorize(Policy = ChinhSach.ChiChuQuan)]
    public async Task<PhanHoiThongBao> Sua(string maKH, YeuCauKhachQuen yc, CancellationToken ct)
    {
        await dichVu.SuaKhachQuenAsync(maKH, yc, ct);
        return new PhanHoiThongBao("Cập nhật thông tin khách quen thành công!");
    }

    [HttpPost("khach-quen/{maKH}/xoa")]
    [Authorize(Policy = ChinhSach.ChiChuQuan)]
    public async Task<PhanHoiThongBao> Xoa(string maKH, CancellationToken ct)
    {
        await dichVu.XoaKhachQuenAsync(maKH, ct);
        return new PhanHoiThongBao("Xóa khách quen thành công");
    }

    [HttpGet("khach-co-no")]
    public Task<List<KhachQuenDong>> KhachCoNo([FromQuery] string? tuKhoa, CancellationToken ct) => dichVu.KhachCoNoAsync(tuKhoa, ct);

    [HttpGet("khach-quen/{maKH}/hoa-don-chua-tra")]
    public Task<List<HoaDonNoDong>> HoaDonChuaTra(string maKH, CancellationToken ct) => dichVu.HoaDonChuaTraAsync(maKH, ct);

    [HttpPost("thu-no")]
    public Task<PhieuThuNo> ThuNo(YeuCauThuNo yc, CancellationToken ct) => dichVu.ThuNoAsync(yc, ct);

    /// <summary>Mã phiếu có dấu "/" nên truyền qua query string.</summary>
    [HttpGet("phieu")]
    public Task<PhieuThuNo> Phieu([FromQuery] string ma, CancellationToken ct) => dichVu.PhieuThuNoAsync(ma, ct);

    [HttpPost("gui-phieu")]
    public async Task<PhanHoiThongBao> GuiPhieu(YeuCauGuiPhieu yc, CancellationToken ct)
    {
        await dichVu.GuiPhieuAsync(yc, ct);
        return new PhanHoiThongBao("Gửi phiếu thanh toán điện tử thành công!");
    }
}
