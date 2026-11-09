using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using XomNho.Api.Common;
using XomNho.Api.Domain;
using XomNho.Api.NhanVienQL;
using XomNho.Api.XacThuc;

namespace XomNho.Api.HangHoaQL;

public sealed record PhanHoiMa(string Ma);

/// <summary>Quản lý hàng hóa – chỉ Chủ quán (UC_4.1–4.4, Q7).</summary>
[ApiController]
[Route("api/hang-hoa")]
[Authorize(Policy = ChinhSach.ChiChuQuan)]
public sealed class HangHoaController(DichVuHangHoa dichVu) : ControllerBase
{
    [HttpGet("danh-muc")]
    public Task<List<DanhMucDong>> DanhMuc(CancellationToken ct) => dichVu.DanhMucAsync(ct);

    [HttpGet("don-vi-tinh")]
    public string[] DonViTinh() => DanhSachCoDinh.DonViTinh;

    /// <summary>Q16: hiển thị mã dự kiến khi mở biểu mẫu thêm.</summary>
    [HttpGet("ma-du-kien")]
    public async Task<PhanHoiMa> MaDuKien(CancellationToken ct) => new(await dichVu.MaDuKienAsync(ct));

    [HttpGet]
    public Task<KetQuaTrang<HangHoaDong>> TimKiem([FromQuery] string? tuKhoa, [FromQuery] int trang = 1, CancellationToken ct = default) =>
        dichVu.TimKiemAsync(tuKhoa, trang, ct);

    [HttpGet("goi-y")]
    public Task<List<HangHoaDong>> GoiY([FromQuery] string? tuKhoa, CancellationToken ct) => dichVu.GoiYAsync(tuKhoa, ct);

    [HttpGet("{maHH}")]
    public Task<ChiTietHangHoa> ChiTiet(string maHH, CancellationToken ct) => dichVu.ChiTietAsync(maHH, ct);

    [HttpPost]
    public async Task<PhanHoiMa> Them(YeuCauHangHoa yc, CancellationToken ct) => new(await dichVu.ThemAsync(yc, ct));

    [HttpPut("{maHH}")]
    public async Task<PhanHoiThongBao> Sua(string maHH, YeuCauHangHoa yc, CancellationToken ct)
    {
        await dichVu.SuaAsync(maHH, yc, ct);
        return new PhanHoiThongBao("Cập nhật hàng hóa thành công");
    }

    [HttpGet("{maHH}/kiem-tra-xoa")]
    public Task<KetQuaKiemTraXoaHangHoa> KiemTraXoa(string maHH, CancellationToken ct) => dichVu.KiemTraXoaAsync(maHH, ct);

    [HttpPost("{maHH}/xoa")]
    public async Task<PhanHoiThongBao> Xoa(string maHH, YeuCauXoa yc, CancellationToken ct) =>
        new(await dichVu.XoaAsync(maHH, yc.CheDo, ct));
}
