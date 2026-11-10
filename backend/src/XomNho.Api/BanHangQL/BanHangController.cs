using Microsoft.AspNetCore.Mvc;
using XomNho.Api.Common;
using XomNho.Api.XacThuc;

namespace XomNho.Api.BanHangQL;

/// <summary>Bán hàng tại quầy (UC_6.5) – Chủ quán và Nhân viên.</summary>
[ApiController]
[Route("api/ban-hang")]
public sealed class BanHangController(DichVuBanHang dichVu) : ControllerBase
{
    [HttpGet("san-pham")]
    public Task<List<SanPhamBan>> SanPham([FromQuery] string? tuKhoa, [FromQuery] string? maDM, CancellationToken ct) =>
        dichVu.SanPhamAsync(tuKhoa, maDM, ct);

    [HttpPost("thanh-toan")]
    public Task<KetQuaThanhToan> ThanhToan(YeuCauThanhToan yc, CancellationToken ct) => dichVu.ThanhToanAsync(yc, ct);

    [HttpPost("hoa-don")]
    public Task<ChiTietHoaDonDto> TaoHoaDon(YeuCauTaoHoaDon yc, CancellationToken ct) => dichVu.TaoHoaDonAsync(yc, ct);

    /// <summary>UC_7.1 bước 7–10: kiểm tra điều kiện ghi nợ, trả thông tin "Kiểm tra công nợ".</summary>
    [HttpPost("kiem-tra-ghi-no")]
    public Task<CongNoQL.KiemTraGhiNo> KiemTraGhiNo(YeuCauGhiNo yc, CancellationToken ct) => dichVu.KiemTraGhiNoAsync(yc, ct);

    /// <summary>UC_7.1 bước 11–12: tạo hóa đơn nợ.</summary>
    [HttpPost("hoa-don-no")]
    public Task<ChiTietHoaDonDto> TaoHoaDonNo(YeuCauGhiNo yc, CancellationToken ct) => dichVu.TaoHoaDonNoAsync(yc, ct);

    [HttpPost("gui-hoa-don")]
    public async Task<PhanHoiThongBao> GuiHoaDon(YeuCauGuiHoaDon yc, CancellationToken ct)
    {
        await dichVu.GuiHoaDonAsync(yc, ct);
        return new PhanHoiThongBao("Gửi hóa đơn thành công");
    }
}

/// <summary>Lịch sử bán hàng (UC_6.1). Mã hóa đơn có dấu "/" nên truyền qua query string.</summary>
[ApiController]
[Route("api/hoa-don")]
public sealed class HoaDonController(DichVuBanHang dichVu) : ControllerBase
{
    [HttpGet]
    public Task<KetQuaTrang<HoaDonDong>> TimKiem(
        [FromQuery] string? ma, [FromQuery] string? khach, [FromQuery] string? tuNgay, [FromQuery] string? denNgay,
        [FromQuery] string? trangThai, [FromQuery] bool tatCa = false, [FromQuery] int trang = 1, CancellationToken ct = default) =>
        dichVu.TimKiemAsync(new DieuKienTimHoaDon(ma, khach, tuNgay, denNgay, trangThai), tatCa, trang, ct);

    [HttpGet("chi-tiet")]
    public Task<ChiTietHoaDonDto> ChiTiet([FromQuery] string ma, CancellationToken ct) => dichVu.ChiTietAsync(ma, ct);
}
