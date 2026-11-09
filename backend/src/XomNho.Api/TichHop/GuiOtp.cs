namespace XomNho.Api.TichHop;

/// <summary>Gửi mã OTP qua SMS tới số điện thoại Chủ quán (UC_1 5.c.2, BR03).</summary>
public interface IGuiOtp
{
    Task GuiAsync(string soDienThoai, string maOtp, string tenDangNhapBiKhoa, CancellationToken ct = default);
}

/// <summary>
/// Bản GIẢ LẬP cho MVP (Q5): không gửi SMS thật, chỉ ghi log.
/// Thay bằng nhà cung cấp SMS thật ở Giai đoạn 8.
/// </summary>
public sealed class GuiOtpGiaLap(ILogger<GuiOtpGiaLap> log) : IGuiOtp
{
    public Task GuiAsync(string soDienThoai, string maOtp, string tenDangNhapBiKhoa, CancellationToken ct = default)
    {
        log.LogWarning("[GIẢ LẬP SMS] Gửi tới {SDT}: Mã mở khóa tài khoản {TenDangNhap} là {Ma} (hiệu lực 5 phút).",
            soDienThoai, tenDangNhapBiKhoa, maOtp);
        return Task.CompletedTask;
    }
}

/// <summary>Tùy chọn tích hợp (appsettings: "TichHop").</summary>
public sealed class TuyChonTichHop
{
    /// <summary>
    /// Chỉ bật ở môi trường phát triển/demo: trả mã OTP giả lập trong response để
    /// hiển thị trên màn hình thay cho tin nhắn SMS.
    /// </summary>
    public bool HienOtpGiaLap { get; set; }
}
