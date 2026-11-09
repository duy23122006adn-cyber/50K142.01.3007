using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.JsonWebTokens;
using Microsoft.IdentityModel.Tokens;
using XomNho.Api.Common;
using XomNho.Api.Domain;

namespace XomNho.Api.XacThuc;

/// <summary>Cấu hình JWT (appsettings: "Jwt").</summary>
public sealed class TuyChonJwt
{
    public string Issuer { get; set; } = "XomNho";
    public string Audience { get; set; } = "XomNho";
    /// <summary>Khóa ký HMAC, tối thiểu 32 ký tự. Không đưa khóa thật vào Git.</summary>
    public string Key { get; set; } = "";
    public int PhutAccessToken { get; set; } = 15;
    public int NgayRefreshToken { get; set; } = 7;

    public SymmetricSecurityKey KhoaKy() => new(Encoding.UTF8.GetBytes(Key));
}

public sealed class DichVuToken(IOptions<TuyChonJwt> tuyChon, IDongHo dongHo)
{
    private readonly TuyChonJwt _jwt = tuyChon.Value;

    /// <summary>Tạo access token ngắn hạn chứa mã người dùng, vai trò và mã phiên.</summary>
    public (string Token, DateTime HetHan) TaoAccessToken(NguoiDung nd, Guid maPhien)
    {
        var hetHanUtc = DateTime.UtcNow.AddMinutes(_jwt.PhutAccessToken);
        var moTa = new SecurityTokenDescriptor
        {
            Issuer = _jwt.Issuer,
            Audience = _jwt.Audience,
            Expires = hetHanUtc,
            SigningCredentials = new SigningCredentials(_jwt.KhoaKy(), SecurityAlgorithms.HmacSha256),
            Subject = new ClaimsIdentity(
            [
                new Claim(TenClaim.MaND, nd.MaND),
                new Claim(TenClaim.TenDangNhap, nd.TenDangNhap),
                new Claim(TenClaim.HoTen, nd.HoTen),
                new Claim(TenClaim.VaiTro, nd.VaiTro),
                new Claim(TenClaim.MaPhien, maPhien.ToString()),
            ]),
        };
        var token = new JsonWebTokenHandler().CreateToken(moTa);
        return (token, dongHo.BayGio.AddMinutes(_jwt.PhutAccessToken));
    }

    /// <summary>Refresh token ngẫu nhiên; DB chỉ lưu chuỗi băm.</summary>
    public static string TaoRefreshToken() => Base64UrlEncoder.Encode(RandomNumberGenerator.GetBytes(32));

    public DateTime HetHanRefreshToken() => dongHo.BayGio.AddDays(_jwt.NgayRefreshToken);

    public static string Bam(string giaTri) =>
        Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(giaTri)));
}
