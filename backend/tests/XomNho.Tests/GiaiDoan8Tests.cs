using XomNho.Api.HeThongQL;

namespace XomNho.Tests;

/// <summary>Backup NFR-01: lịch sao lưu tự động hằng ngày.</summary>
public class LichSaoLuuTests
{
    private static readonly TimeOnly Gio = new(23, 30);

    [Theory]
    [InlineData("2026-11-10 08:00", "2026-11-10 23:30")]
    [InlineData("2026-11-10 23:29", "2026-11-10 23:30")]
    [InlineData("2026-11-10 23:30", "2026-11-11 23:30")]
    [InlineData("2026-11-30 23:45", "2026-12-01 23:30")]
    public void Lan_ke_tiep(string bayGio, string mongDoi) =>
        Assert.Equal(DateTime.Parse(mongDoi), LichSaoLuu.LanKeTiep(DateTime.Parse(bayGio), Gio));

    [Theory]
    [InlineData(null, "2026-11-10 08:00", true)]                 // chưa từng sao lưu
    [InlineData("2026-11-09 23:31", "2026-11-10 08:00", false)]  // đã chạy đúng lịch tối qua
    [InlineData("2026-11-09 21:00", "2026-11-10 08:00", true)]   // tối qua máy tắt trước 23:30
    [InlineData("2026-11-09 23:31", "2026-11-10 23:40", true)]   // khởi động sau giờ chạy hôm nay mà chưa chạy
    [InlineData("2026-11-10 23:31", "2026-11-10 23:40", false)]
    public void Sao_luu_bu_khi_khoi_dong(string? lanCuoi, string bayGio, bool canBu) =>
        Assert.Equal(canBu, LichSaoLuu.CanSaoLuuBu(lanCuoi is null ? null : DateTime.Parse(lanCuoi), DateTime.Parse(bayGio), Gio));

    [Fact]
    public void Gio_chay_sai_dinh_dang_dung_mac_dinh() =>
        Assert.Equal(new TimeOnly(23, 30), new TuyChonSaoLuu { GioChay = "abc" }.Gio);
}
