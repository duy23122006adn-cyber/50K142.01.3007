using System.Text;
using System.Text.Encodings.Web;
using System.Text.Json;
using Microsoft.Extensions.Options;
using XomNho.Api.Common;

namespace XomNho.Api.TichHop;

/// <summary>
/// Tùy chọn gửi tin (appsettings "TichHop:TinNhan") – Giai đoạn 8d.
/// "GiaLap" (mặc định): chỉ ghi log (Q5). "Http": gọi HTTP API của nhà cung cấp SMS/Zalo theo mẫu thân JSON cấu hình,
/// thay {sdt}, {kenh}, {noiDung}. "eSMS": gửi SMS qua eSMS.vn (SendMultipleMessage_V4_post_json, thành công khi CodeResult = "100").
/// Dùng chung cho gửi hóa đơn điện tử và OTP mở khóa.
/// </summary>
public sealed class TuyChonTinNhan
{
    public string CheDo { get; set; } = "GiaLap";
    public string? Url { get; set; }
    public string? TenHeaderKhoa { get; set; } = "Authorization";
    public string? Khoa { get; set; }
    public string MauThan { get; set; } = """{"phone":"{sdt}","channel":"{kenh}","message":"{noiDung}"}""";
    public int GiayCho { get; set; } = 10;

    /// <summary>
    /// Nội dung tin OTP: {ma} = mã OTP, {tenDangNhap} = tài khoản bị khóa. Với eSMS, nội dung phải khớp mẫu (template)
    /// đã đăng ký với brandname; ở Sandbox phải đúng mẫu thử "{ma} la ma xac minh dang ky Baotrixemay cua ban".
    /// </summary>
    public string MauOtp { get; set; } = "Xom Nho: ma mo khoa tai khoan {tenDangNhap} la {ma} (hieu luc 5 phut).";
    public TuyChonEsms Esms { get; set; } = new();

    public bool LaEsms => CheDo.Equals("eSMS", StringComparison.OrdinalIgnoreCase);
    public bool LaThat => CheDo.Equals("Http", StringComparison.OrdinalIgnoreCase) || LaEsms;
}

/// <summary>Cấu hình eSMS.vn (TichHop:TinNhan:Esms). ApiKey/SecretKey lấy ở menu "Quản lý API" – KHÔNG đưa lên GitHub.</summary>
public sealed class TuyChonEsms
{
    public string Url { get; set; } = "https://rest.esms.vn/MainService.svc/json/SendMultipleMessage_V4_post_json/";
    public string? ApiKey { get; set; }
    public string? SecretKey { get; set; }
    /// <summary>Brandname đã đăng ký với eSMS (Sandbox dùng "Baotrixemay").</summary>
    public string Brandname { get; set; } = "Baotrixemay";
    /// <summary>"2" = tin chăm sóc khách hàng (CSKH) qua brandname.</summary>
    public string SmsType { get; set; } = "2";
    /// <summary>true: eSMS chỉ kiểm tra yêu cầu, không trừ tiền, tin không gửi tới máy.</summary>
    public bool Sandbox { get; set; } = true;
}

public sealed class GuiTinHttp(IHttpClientFactory http, IOptions<TuyChonTinNhan> tuyChon, ILogger<GuiTinHttp> log)
{
    private static string Json(string s) => JsonEncodedText.Encode(s, JavaScriptEncoder.UnsafeRelaxedJsonEscaping).ToString();

    /// <summary>Trả true khi nhà cung cấp trả mã 2xx; lỗi mạng / quá thời gian chờ → false (luồng nghiệp vụ tự xử lý gửi thất bại).</summary>
    public async Task<bool> GuiAsync(string kenh, string soDienThoai, string noiDung, CancellationToken ct)
    {
        var tc = tuyChon.Value;
        if (tc.LaEsms) return await GuiEsmsAsync(tc, soDienThoai, noiDung, ct);
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

    /// <summary>eSMS trả HTTP 200 cả khi lỗi; chỉ CodeResult = "100" mới là eSMS đã nhận yêu cầu gửi.</summary>
    private async Task<bool> GuiEsmsAsync(TuyChonTinNhan tc, string soDienThoai, string noiDung, CancellationToken ct)
    {
        var e = tc.Esms;
        if (QuyTac.Trong(e.ApiKey) || QuyTac.Trong(e.SecretKey))
        {
            log.LogError("Chưa cấu hình TichHop:TinNhan:Esms:ApiKey / SecretKey.");
            return false;
        }
        var than = JsonSerializer.Serialize(new Dictionary<string, string>
        {
            ["ApiKey"] = e.ApiKey!,
            ["SecretKey"] = e.SecretKey!,
            ["Phone"] = soDienThoai,
            ["Content"] = noiDung,
            ["Brandname"] = e.Brandname,
            ["SmsType"] = e.SmsType,
            ["IsUnicode"] = "0",
            ["Sandbox"] = e.Sandbox ? "1" : "0",
            ["RequestId"] = Guid.NewGuid().ToString("N"),
        });
        using var han = CancellationTokenSource.CreateLinkedTokenSource(ct);
        han.CancelAfter(TimeSpan.FromSeconds(Math.Max(1, tc.GiayCho)));
        try
        {
            using var phanHoi = await http.CreateClient(nameof(GuiTinHttp))
                .PostAsync(e.Url, new StringContent(than, Encoding.UTF8, "application/json"), han.Token);
            var noiDungPhanHoi = await phanHoi.Content.ReadAsStringAsync(han.Token);
            string? ma = null, loi = null;
            try
            {
                using var doc = JsonDocument.Parse(noiDungPhanHoi);
                if (doc.RootElement.TryGetProperty("CodeResult", out var m)) ma = m.ToString();
                if (doc.RootElement.TryGetProperty("ErrorMessage", out var l)) loi = l.ToString();
            }
            catch (JsonException) { }
            if (ma == "100")
            {
                log.LogInformation("eSMS đã nhận tin tới {SDT}{Sandbox}.", soDienThoai, e.Sandbox ? " (Sandbox – không gửi thật)" : "");
                return true;
            }
            log.LogWarning("eSMS từ chối tin tới {SDT}: CodeResult={Ma} {Loi}", soDienThoai, ma ?? $"HTTP {(int)phanHoi.StatusCode}", loi);
            return false;
        }
        catch (Exception ex) when (ex is HttpRequestException or TaskCanceledException)
        {
            log.LogWarning(ex, "Gửi eSMS tới {SDT} thất bại.", soDienThoai);
            return false;
        }
    }
}

public sealed class GuiChungTuHttp(GuiTinHttp gui) : IGuiChungTu
{
    public Task<bool> GuiAsync(string kenh, string soDienThoai, string noiDung, CancellationToken ct = default) =>
        gui.GuiAsync(kenh, soDienThoai, noiDung, ct);
}

public sealed class GuiOtpHttp(GuiTinHttp gui, IOptions<TuyChonTinNhan> tuyChon) : IGuiOtp
{
    /// <summary>Nội dung không dấu (MauOtp) để tránh tin nhắn Unicode (đắt hơn, dễ bị cắt).</summary>
    public Task GuiAsync(string soDienThoai, string maOtp, string tenDangNhapBiKhoa, CancellationToken ct = default) =>
        gui.GuiAsync("SMS", soDienThoai, tuyChon.Value.MauOtp.Replace("{ma}", maOtp).Replace("{tenDangNhap}", tenDangNhapBiKhoa), ct);
}
