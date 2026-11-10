namespace XomNho.Api.TichHop;

/// <summary>Gửi hóa đơn / phiếu điện tử qua SMS hoặc Zalo (UC_6.5 16.a, UC_7.1 14.a, UC_7.3 18.a).</summary>
public interface IGuiChungTu
{
    /// <summary>Trả true nếu gửi thành công.</summary>
    Task<bool> GuiAsync(string kenh, string soDienThoai, string noiDung, CancellationToken ct = default);
}

/// <summary>
/// Bản GIẢ LẬP (Q5): chỉ ghi log. Để thử luồng "Gửi không thành công", nhập số điện thoại
/// kết thúc bằng "000" – bản giả lập sẽ báo thất bại.
/// </summary>
public sealed class GuiChungTuGiaLap(ILogger<GuiChungTuGiaLap> log) : IGuiChungTu
{
    public Task<bool> GuiAsync(string kenh, string soDienThoai, string noiDung, CancellationToken ct = default)
    {
        var thanhCong = !soDienThoai.EndsWith("000", StringComparison.Ordinal);
        log.LogWarning("[GIẢ LẬP {Kenh}] Gửi tới {SDT} – {KetQua}:\n{NoiDung}",
            kenh, soDienThoai, thanhCong ? "thành công" : "THẤT BẠI (giả lập)", noiDung);
        return Task.FromResult(thanhCong);
    }
}
