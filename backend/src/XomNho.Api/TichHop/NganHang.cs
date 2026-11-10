using System.Globalization;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using XomNho.Api.Common;
using XomNho.Api.Data;
using XomNho.Api.Domain;

namespace XomNho.Api.TichHop;

/// <summary>
/// Tùy chọn chuyển khoản QR (appsettings "TichHop:NganHang") – Giai đoạn 8d.
/// <list type="bullet">
/// <item>"GiaLap" (mặc định): mã QR minh họa, người dùng tự chọn kết quả (Q5).</item>
/// <item>"VietQR": ảnh VietQR thật của tài khoản cửa hàng; tiền vào được xác nhận qua webhook của dịch vụ
/// theo dõi biến động số dư (SePay, Casso, PayOS…). Máy chủ tự đối chiếu, không tin kết quả trình duyệt gửi lên.</item>
/// </list>
/// </summary>
public sealed class TuyChonNganHang
{
    public const string GiaLap = "GiaLap";
    public const string VietQr = "VietQR";

    public string CheDo { get; set; } = GiaLap;
    /// <summary>Mã BIN hoặc mã viết tắt ngân hàng theo VietQR, ví dụ "970436" hoặc "VCB".</summary>
    public string? MaNganHang { get; set; }
    public string? SoTaiKhoan { get; set; }
    public string? TenTaiKhoan { get; set; }
    public string MauQr { get; set; } = "compact2";
    /// <summary>Giao dịch cũ hơn số phút này không dùng để xác nhận.</summary>
    public int PhutHieuLuc { get; set; } = 30;
    public TuyChonWebhook Webhook { get; set; } = new();

    public bool LaThat => CheDo == VietQr;
}

/// <summary>
/// Cách xác thực và đọc dữ liệu webhook. Mặc định khớp SePay
/// (header "Authorization: Apikey &lt;khóa&gt;", trường id / transferAmount / content).
/// Casso: TenHeader "secure-token", TienToToken "", TruongDanhSach "data", TruongSoTien "amount", TruongNoiDung "description".
/// </summary>
public sealed class TuyChonWebhook
{
    /// <summary>"Token": so khớp giá trị header; "HMAC": header chứa HMAC-SHA256 (hex) của thân yêu cầu.</summary>
    public string KieuXacThuc { get; set; } = "Token";
    public string TenHeader { get; set; } = "Authorization";
    public string TienToToken { get; set; } = "Apikey ";
    public string? KhoaBiMat { get; set; }
    /// <summary>Trống = thân là một giao dịch (hoặc mảng giao dịch); có giá trị = tên trường chứa mảng giao dịch.</summary>
    public string? TruongDanhSach { get; set; }
    public string TruongMaGiaoDich { get; set; } = "id";
    public string TruongSoTien { get; set; } = "transferAmount";
    public string TruongNoiDung { get; set; } = "content";
}

public sealed record ThongTinQr(
    string CheDo, string MaThamChieu, decimal SoTien, string? UrlAnh, string? NganHang, string? SoTaiKhoan, string? TenTaiKhoan);

public sealed record KetQuaXacNhanQr(bool ThanhCong, string MaGiaoDich, GiaoDichNganHang? GiaoDich);

public sealed record YeuCauTaoQr(decimal SoTien);

public sealed class DichVuQr(XomNhoDbContext db, IOptions<TuyChonNganHang> tuyChon, IDongHo dongHo, ILogger<DichVuQr> log)
{
    private TuyChonNganHang Tc => tuyChon.Value;
    private const string KyTu = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

    /// <summary>Mã tham chiếu "XN" + 8 ký tự, khách chuyển khoản với nội dung này để máy chủ đối chiếu.</summary>
    public ThongTinQr TaoQr(decimal soTien)
    {
        if (soTien <= 0) throw LoiNghiepVuException.KhongHopLe("Số tiền chuyển khoản phải lớn hơn 0.");
        var ma = "XN" + string.Concat(RandomNumberGenerator.GetItems<char>(KyTu, 8));
        if (!Tc.LaThat) return new ThongTinQr(TuyChonNganHang.GiaLap, ma, soTien, null, null, null, null);
        if (QuyTac.Trong(Tc.MaNganHang) || QuyTac.Trong(Tc.SoTaiKhoan))
            throw new LoiNghiepVuException(StatusCodes.Status500InternalServerError, "Chưa cấu hình tài khoản ngân hàng nhận tiền (TichHop:NganHang).");
        var url = $"https://img.vietqr.io/image/{Uri.EscapeDataString(Tc.MaNganHang!)}-{Uri.EscapeDataString(Tc.SoTaiKhoan!)}-{Uri.EscapeDataString(Tc.MauQr)}.png"
            + $"?amount={soTien.ToString("0", CultureInfo.InvariantCulture)}&addInfo={ma}&accountName={Uri.EscapeDataString(Tc.TenTaiKhoan ?? "")}";
        return new ThongTinQr(TuyChonNganHang.VietQr, ma, soTien, url, Tc.MaNganHang, Tc.SoTaiKhoan, Tc.TenTaiKhoan);
    }

    /// <summary>Bỏ dấu cách, gạch… vì ngân hàng có thể chèn ký tự vào nội dung chuyển khoản.</summary>
    public static string ChuanHoa(string s) => new(s.ToUpperInvariant().Where(char.IsAsciiLetterOrDigit).ToArray());

    /// <summary>Giao dịch tiền vào chưa dùng, nội dung chứa mã tham chiếu, đủ tiền, còn hiệu lực.</summary>
    private async Task<GiaoDichNganHang?> TimGiaoDichAsync(string? maThamChieu, decimal soTien, bool theoDoi, CancellationToken ct)
    {
        if (QuyTac.Trong(maThamChieu)) return null;
        var ma = ChuanHoa(maThamChieu!);
        var tu = dongHo.BayGio.AddMinutes(-Tc.PhutHieuLuc);
        var q = db.GiaoDichNganHang.Where(g => g.MaPTT == null && g.ThoiDiemNhan >= tu && g.SoTien >= soTien);
        if (!theoDoi) q = q.AsNoTracking();
        return (await q.OrderBy(g => g.ThoiDiemNhan).ToListAsync(ct)).FirstOrDefault(g => ChuanHoa(g.NoiDung).Contains(ma));
    }

    /// <summary>Màn hình QR hỏi định kỳ: tiền đã vào chưa.</summary>
    public async Task<bool> DaNhanAsync(string? maThamChieu, decimal soTien, CancellationToken ct) =>
        Tc.LaThat && await TimGiaoDichAsync(maThamChieu, soTien, theoDoi: false, ct) is not null;

    /// <summary>
    /// Dùng khi tạo phiếu thu chuyển khoản. Giả lập: theo kết quả người dùng chọn. Thật: phải có giao dịch khớp;
    /// người gọi gán <c>GiaoDich.MaPTT</c> để giao dịch không dùng được lần hai.
    /// </summary>
    public async Task<KetQuaXacNhanQr> XacNhanAsync(string? ketQuaGiaLap, string? maThamChieu, decimal soTien, CancellationToken ct)
    {
        if (!Tc.LaThat)
            return new KetQuaXacNhanQr(ketQuaGiaLap == "ThanhCong", $"QR{dongHo.BayGio:yyyyMMddHHmmss}{Random.Shared.Next(100, 999)}", null);
        var gd = await TimGiaoDichAsync(maThamChieu, soTien, theoDoi: true, ct);
        if (gd is null) return new KetQuaXacNhanQr(false, (maThamChieu ?? "QR").Trim(), null);
        return new KetQuaXacNhanQr(true, gd.MaGD.Length <= 50 ? gd.MaGD : gd.MaGD[..50], gd);
    }

    // ------------------------------------------------------------------ Webhook

    public bool XacThucWebhook(string? giaTriHeader, string than)
    {
        var w = Tc.Webhook;
        if (QuyTac.Trong(w.KhoaBiMat) || giaTriHeader is null) return false;
        if (w.KieuXacThuc.Equals("HMAC", StringComparison.OrdinalIgnoreCase))
        {
            var mong = Convert.ToHexString(HMACSHA256.HashData(Encoding.UTF8.GetBytes(w.KhoaBiMat!), Encoding.UTF8.GetBytes(than)));
            return CryptographicOperations.FixedTimeEquals(Encoding.ASCII.GetBytes(mong.ToLowerInvariant()),
                Encoding.ASCII.GetBytes(giaTriHeader.Trim().ToLowerInvariant()));
        }
        var mongToken = w.TienToToken + w.KhoaBiMat;
        return CryptographicOperations.FixedTimeEquals(Encoding.UTF8.GetBytes(mongToken), Encoding.UTF8.GetBytes(giaTriHeader.Trim()));
    }

    /// <summary>Ghi các giao dịch tiền vào (bỏ qua giao dịch đã có, tiền ra, thiếu trường). Trả số giao dịch mới.</summary>
    public async Task<int> NhanWebhookAsync(string than, CancellationToken ct)
    {
        var w = Tc.Webhook;
        using var doc = JsonDocument.Parse(than);
        var goc = doc.RootElement;
        if (!QuyTac.Trong(w.TruongDanhSach) && goc.ValueKind == JsonValueKind.Object && goc.TryGetProperty(w.TruongDanhSach!, out var mang))
            goc = mang;
        var cacGd = goc.ValueKind == JsonValueKind.Array ? goc.EnumerateArray().ToList() : [goc];

        var moi = 0;
        foreach (var e in cacGd)
        {
            if (e.ValueKind != JsonValueKind.Object) continue;
            var ma = DocChuoi(e, w.TruongMaGiaoDich);
            var noiDung = DocChuoi(e, w.TruongNoiDung) ?? "";
            if (QuyTac.Trong(ma) || !DocSo(e, w.TruongSoTien, out var soTien) || soTien <= 0) continue;
            // SePay gửi cả tiền ra (transferType = "out") – chỉ nhận tiền vào.
            if (DocChuoi(e, "transferType") is { } loai && loai.Equals("out", StringComparison.OrdinalIgnoreCase)) continue;
            ma = ma!.Length <= 100 ? ma : ma[..100];
            if (await db.GiaoDichNganHang.AnyAsync(g => g.MaGD == ma, ct)) continue;
            db.GiaoDichNganHang.Add(new GiaoDichNganHang
            {
                MaGD = ma,
                SoTien = decimal.Round(soTien, 0),
                NoiDung = noiDung.Length <= 500 ? noiDung : noiDung[..500],
                ThoiDiemNhan = dongHo.BayGio,
                DuLieuGoc = e.GetRawText(),
            });
            moi++;
        }
        if (moi > 0) await db.SaveChangesAsync(ct);
        log.LogInformation("Webhook ngân hàng: {Moi} giao dịch mới.", moi);
        return moi;
    }

    private static string? DocChuoi(JsonElement e, string truong) =>
        e.TryGetProperty(truong, out var v) ? v.ValueKind switch
        {
            JsonValueKind.String => v.GetString(),
            JsonValueKind.Number => v.GetRawText(),
            _ => null,
        } : null;

    private static bool DocSo(JsonElement e, string truong, out decimal so)
    {
        so = 0;
        if (!e.TryGetProperty(truong, out var v)) return false;
        return v.ValueKind == JsonValueKind.Number ? v.TryGetDecimal(out so)
            : v.ValueKind == JsonValueKind.String && decimal.TryParse(v.GetString(), NumberStyles.Number, CultureInfo.InvariantCulture, out so);
    }
}

[ApiController]
[Route("api/tich-hop")]
public sealed class TichHopController(DichVuQr dichVuQr) : ControllerBase
{
    /// <summary>Tạo mã QR cho một khoản thu (bán hàng, thu nợ, thu thêm khi đổi hàng).</summary>
    [HttpPost("qr")]
    public ThongTinQr TaoQr(YeuCauTaoQr yc) => dichVuQr.TaoQr(yc.SoTien);

    [HttpGet("qr/trang-thai")]
    public async Task<object> TrangThai([FromQuery] string ma, [FromQuery] decimal soTien, CancellationToken ct) =>
        new { daNhan = await dichVuQr.DaNhanAsync(ma, soTien, ct) };

    /// <summary>Dịch vụ theo dõi số dư gọi vào khi có tiền vào tài khoản. Xác thực bằng khóa bí mật cấu hình.</summary>
    [HttpPost("ngan-hang/webhook")]
    [AllowAnonymous]
    public async Task<IActionResult> Webhook([FromServices] IOptions<TuyChonNganHang> tuyChon, CancellationToken ct)
    {
        if (!tuyChon.Value.LaThat) return NotFound();
        using var doc = new StreamReader(Request.Body, Encoding.UTF8);
        var than = await doc.ReadToEndAsync(ct);
        if (!dichVuQr.XacThucWebhook(Request.Headers[tuyChon.Value.Webhook.TenHeader].FirstOrDefault(), than))
            return Unauthorized(new { success = false });
        try
        {
            var moi = await dichVuQr.NhanWebhookAsync(than, ct);
            return Ok(new { success = true, moi });
        }
        catch (JsonException)
        {
            return BadRequest(new { success = false, thongBao = "Dữ liệu không phải JSON hợp lệ." });
        }
    }
}
