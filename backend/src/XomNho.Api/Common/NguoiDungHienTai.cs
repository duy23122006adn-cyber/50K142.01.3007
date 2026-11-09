using System.Security.Claims;

namespace XomNho.Api.Common;

/// <summary>Thông tin người dùng của request hiện tại (đọc từ JWT).</summary>
public interface INguoiDungHienTai
{
    string? MaND { get; }
    string? TenDangNhap { get; }
    string? VaiTro { get; }
    Guid? MaPhien { get; }
    string? DiaChiIP { get; }
}

public static class TenClaim
{
    public const string MaND = "sub";
    public const string TenDangNhap = "unique_name";
    public const string HoTen = "name";
    public const string VaiTro = "role";
    public const string MaPhien = "sid";
}

public sealed class NguoiDungHienTai(IHttpContextAccessor accessor) : INguoiDungHienTai
{
    private ClaimsPrincipal? User => accessor.HttpContext?.User;

    public string? MaND => User?.FindFirstValue(TenClaim.MaND);
    public string? TenDangNhap => User?.FindFirstValue(TenClaim.TenDangNhap);
    public string? VaiTro => User?.FindFirstValue(TenClaim.VaiTro);
    public Guid? MaPhien => Guid.TryParse(User?.FindFirstValue(TenClaim.MaPhien), out var g) ? g : null;
    public string? DiaChiIP => accessor.HttpContext?.Connection.RemoteIpAddress?.ToString();
}
