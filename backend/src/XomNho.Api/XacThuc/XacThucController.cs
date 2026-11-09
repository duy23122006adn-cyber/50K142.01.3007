using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;
using XomNho.Api.Common;

namespace XomNho.Api.XacThuc;

public sealed record YeuCauDangNhap(string? TenDangNhap, string? MatKhau);
public sealed record YeuCauMoKhoa(string? TenDangNhap, string? MaOtp);
public sealed record PhanHoiDangNhap(string AccessToken, DateTime HetHan, ThongTinNguoiDung NguoiDung);
public sealed record PhanHoiThongBao(string ThongBao);
public sealed record YeuCauDoiMatKhau(string? MatKhauHienTai, string? MatKhauMoi, string? XacNhanMatKhauMoi);

/// <summary>UC_1 Đăng nhập, UC_11 Đăng xuất.</summary>
[ApiController]
[Route("api/auth")]
[AllowAnonymous]
public sealed class XacThucController(
    DichVuXacThuc dichVu,
    INguoiDungHienTai hienTai,
    IOptions<TuyChonJwt> jwt) : ControllerBase
{
    public const string CookieRefresh = "xn_refresh";

    [HttpPost("dang-nhap")]
    public async Task<PhanHoiDangNhap> DangNhap(YeuCauDangNhap yc, CancellationToken ct)
    {
        var kq = await dichVu.DangNhapAsync(yc.TenDangNhap, yc.MatKhau, ct);
        GanCookieRefresh(kq.RefreshToken);
        return new PhanHoiDangNhap(kq.AccessToken, kq.HetHan, kq.NguoiDung);
    }

    [HttpPost("mo-khoa")]
    public async Task<PhanHoiThongBao> MoKhoa(YeuCauMoKhoa yc, CancellationToken ct)
    {
        await dichVu.MoKhoaAsync(yc.TenDangNhap, yc.MaOtp, ct);
        return new PhanHoiThongBao("Mở khóa tài khoản thành công. Vui lòng đăng nhập lại.");
    }

    [HttpPost("lam-moi")]
    public async Task<PhanHoiDangNhap> LamMoi(CancellationToken ct)
    {
        try
        {
            var kq = await dichVu.LamMoiAsync(Request.Cookies[CookieRefresh], ct);
            GanCookieRefresh(kq.RefreshToken);
            return new PhanHoiDangNhap(kq.AccessToken, kq.HetHan, kq.NguoiDung);
        }
        catch (LoiNghiepVuException)
        {
            XoaCookieRefresh();
            throw;
        }
    }

    [HttpPost("dang-xuat")]
    public async Task<PhanHoiThongBao> DangXuat(CancellationToken ct)
    {
        await dichVu.DangXuatAsync(hienTai.MaPhien, Request.Cookies[CookieRefresh], ct);
        XoaCookieRefresh();
        return new PhanHoiThongBao("Đăng xuất thành công.");
    }

    private void GanCookieRefresh(string token) =>
        Response.Cookies.Append(CookieRefresh, token, TuyChonCookie(DateTimeOffset.UtcNow.AddDays(jwt.Value.NgayRefreshToken)));

    private void XoaCookieRefresh() => Response.Cookies.Delete(CookieRefresh, TuyChonCookie(null));

    /// <summary>Cookie HttpOnly – JavaScript không đọc được refresh token.</summary>
    internal static CookieOptions TuyChonCookie(DateTimeOffset? hetHan) => new()
    {
        HttpOnly = true,
        Secure = true,
        SameSite = SameSiteMode.Strict,
        Path = "/api/auth",
        Expires = hetHan,
    };
}

/// <summary>Tài khoản cá nhân: thông tin, UC_2.3 Đổi mật khẩu.</summary>
[ApiController]
[Route("api/tai-khoan")]
[Authorize]
public sealed class TaiKhoanController(DichVuXacThuc dichVu, INguoiDungHienTai hienTai) : ControllerBase
{
    [HttpGet("toi")]
    public Task<ThongTinNguoiDung> Toi(CancellationToken ct) => dichVu.LayThongTinAsync(hienTai.MaND!, ct);

    [HttpGet("doi-mat-khau/trang-thai")]
    public Task<TrangThaiDoiMatKhau> TrangThaiDoiMatKhau(CancellationToken ct) =>
        dichVu.LayTrangThaiDoiMatKhauAsync(hienTai.MaND!, ct);

    [HttpPost("doi-mat-khau")]
    public async Task<PhanHoiThongBao> DoiMatKhau(YeuCauDoiMatKhau yc, CancellationToken ct)
    {
        await dichVu.DoiMatKhauAsync(hienTai.MaND!, yc.MatKhauHienTai, yc.MatKhauMoi, yc.XacNhanMatKhauMoi, ct);
        // BR06: mọi phiên đã bị thu hồi – xóa luôn cookie của phiên đang dùng.
        Response.Cookies.Delete(XacThucController.CookieRefresh, XacThucController.TuyChonCookie(null));
        return new PhanHoiThongBao("Đổi mật khẩu thành công");
    }
}
