namespace XomNho.Api.Common;

/// <summary>Đồng hồ hệ thống theo giờ Việt Nam (UTC+7). Tách interface để kiểm thử.</summary>
public interface IDongHo
{
    DateTime BayGio { get; }
    DateOnly HomNay => DateOnly.FromDateTime(BayGio);
}

public sealed class DongHoVietNam : IDongHo
{
    private static readonly TimeZoneInfo MuiGio = TimeZoneInfo.FindSystemTimeZoneById("Asia/Ho_Chi_Minh");

    public DateTime BayGio
    {
        get
        {
            var gio = TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, MuiGio);
            // Bỏ phần lẻ dưới giây để khớp DATETIME2(0) trong DB.
            return new DateTime(gio.Year, gio.Month, gio.Day, gio.Hour, gio.Minute, gio.Second, DateTimeKind.Unspecified);
        }
    }
}
