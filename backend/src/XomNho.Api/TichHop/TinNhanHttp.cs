using System.Text;
using System.Text.Encodings.Web;
using System.Text.Json;
using Microsoft.Extensions.Options;
using XomNho.Api.Common;

namespace XomNho.Api.TichHop;

/// <summary>
/// Tùy chọn gửi tin (appsettings "TichHop:TinNhan") – Giai đoạn 8d.
/// "GiaLap" (mặc định): chỉ ghi log (Q5). "Http": gọi HTTP API của nhà cung cấp SMS/Zalo theo mẫu thân JSON cấu hình,
/// thay {sdt}, {kenh}, {noiDung}. Dùng chung cho gửi hóa đơn điện tử và OTP mở khóa.
/// </summary>
public sealed class TuyChonTinNhan
{
    public string CheDo { get; set; } = "GiaLap";
    public string? Url { get; set; }
    public string? TenHeaderKhoa { get; set; } = "Authorization";
    public string? Khoa { get; set; }
    public string MauThan { get; set; } = """{"phone":"{sdt}","channel":"{kenh}","message":"{noiDung}"}""";
    public int GiayCho { get; set; } = 10;

    public bool LaThat => CheDo.Equals("Http", StringComparison.OrdinalIgnoreCase);
}

public sealed class GuiTinHttp(IHttpClientFactory http, IOptions<TuyChonTinNhan> tuyChon, ILogger<GuiTinHttp> log)
{
    private static string Json(string s) => JsonEncodedText.Encode(s, JavaScriptEncoder.UnsafeRelaxedJsonEscaping).ToString();

    /// <summary>Trả true khi nhà cung cấp trả mã 2xx; lỗi mạng / quá thời gian chờ → false (luồng nghiệp vụ tự xử lý gửi thất bại).</summary>
    public async Task<bool> GuiAsync(string kenh, string soDienThoai, string noiDung, CancellationToken ct)
    {
        var tc = tuyChon.Value;
        if (QuyTac.Trong(tc.Url))
        {
            log.LogError("Chưa cấu hình TichHop:TinNhan:Url.");
            return false;
        }
        var than = tc.MauThan.Replace("{sdt}", Json(soDienThoai)).Replace("{kenh}", Json(kenh)).Replace("{noiDung}", Json(noiDung));
        using var yeuCau = new HttpRequestMessage(HttpMethod.Post, tc.Url) { Content = new StringContent(than, Encoding.UTF8, "application/json") };
        if (!QuyTac.Trong(tc.TenHeaderKhoa) && !QuyTac.Trong(tc.Khoa)) yeuCau.Headers.TryAddWithoutValidation(tc.TenHeaderKhoa!, tc.Khoa);
        using var han = CancellationTokenSource.CreateLinkedTokenSource(ct);
        han.CancelAfter(TimeSpan.FromSeconds(Math.Max(1, tc.GiayCho)));
        try
        {
            using var phanHoi = await http.CreateClient(nameof(GuiTinHttp)).SendAsync(yeuCau, han.Token);
            if (!phanHoi.IsSuccessStatusCode) log.LogWarning("Gửi {Kenh} tới {SDT} thất bại: HTTP {Ma}.", kenh, soDienThoai, (int)phanHoi.StatusCode);
            return phanHoi.IsSuccessStatusCode;
        }
        catch (Exception ex) when (ex is HttpRequestException or TaskCanceledException)
        {
            log.LogWarning(ex, "Gửi {Kenh} tới {SDT} thất bại.", kenh, soDienThoai);
            return false;
        }
    }
}

public sealed class GuiChungTuHttp(GuiTinHttp gui) : IGuiChungTu
{
    public Task<bool> GuiAsync(string kenh, string soDienThoai, string noiDung, CancellationToken ct = default) =>
        gui.GuiAsync(kenh, soDienThoai, noiDung, ct);
}

public sealed class GuiOtpHttp(GuiTinHttp gui) : IGuiOtp
{
    /// <summary>Nội dung không dấu để tránh tin nhắn Unicode (đắt hơn, dễ bị cắt).</summary>
    public Task GuiAsync(string soDienThoai, string maOtp, string tenDangNhapBiKhoa, CancellationToken ct = default) =>
        gui.GuiAsync("SMS", soDienThoai, $"Xom Nho: ma mo khoa tai khoan {tenDangNhapBiKhoa} la {maOtp} (hieu luc 5 phut).", ct);
}
