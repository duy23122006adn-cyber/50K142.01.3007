using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using XomNho.Api.XacThuc;

namespace XomNho.Api.NhanVienQL;

/// <summary>Quản lý tài khoản nhân viên – chỉ Chủ quán (UC_2.1, 2.2, 2.4).</summary>
[ApiController]
[Route("api/nhan-vien")]
[Authorize(Policy = ChinhSach.ChiChuQuan)]
public sealed class NhanVienController(DichVuNhanVien dichVu) : ControllerBase
{
    [HttpGet]
    public Task<List<NhanVienDong>> DanhSach([FromQuery] string? tuKhoa, CancellationToken ct) =>
        dichVu.DanhSachAsync(tuKhoa, ct);

    [HttpGet("{maND}")]
    public Task<ChiTietNhanVien> ChiTiet(string maND, CancellationToken ct) => dichVu.ChiTietAsync(maND, ct);

    [HttpPost]
    public async Task<PhanHoiThongBao> Them(YeuCauThemNhanVien yc, CancellationToken ct)
    {
        var ma = await dichVu.ThemAsync(yc, ct);
        return new PhanHoiThongBao($"Thêm tài khoản thành công (mã {ma})");
    }

    [HttpPut("{maND}")]
    public async Task<PhanHoiThongBao> Sua(string maND, YeuCauSuaNhanVien yc, CancellationToken ct)
    {
        await dichVu.SuaAsync(maND, yc, ct);
        return new PhanHoiThongBao("Sửa thông tin nhân viên thành công");
    }

    [HttpGet("{maND}/kiem-tra-xoa")]
    public Task<KetQuaKiemTraXoa> KiemTraXoa(string maND, CancellationToken ct) => dichVu.KiemTraXoaAsync(maND, ct);

    [HttpPost("{maND}/xoa")]
    public async Task<PhanHoiThongBao> Xoa(string maND, YeuCauXoa yc, CancellationToken ct) =>
        new(await dichVu.XoaAsync(maND, yc.CheDo, ct));
}
