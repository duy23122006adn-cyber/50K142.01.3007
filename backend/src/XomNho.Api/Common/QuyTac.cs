using System.Text.RegularExpressions;

namespace XomNho.Api.Common;

/// <summary>Các quy tắc định dạng dùng chung, lấy từ Business rules trong báo cáo.</summary>
public static partial class QuyTac
{
    /// <summary>"Giá trị chỉ có khoảng trắng được xem là để trống" (UC_2.1 BR01, UC_2.3 BR01, UC_8.1 BR01).</summary>
    public static bool Trong(string? giaTri) => string.IsNullOrWhiteSpace(giaTri);

    /// <summary>UC_2.1 BR04, UC_2.3 BR02: tối thiểu 8 ký tự, gồm cả chữ và số.</summary>
    public static bool MatKhauHopLe(string? matKhau) =>
        matKhau is not null
        && matKhau.Length >= 8
        && matKhau.Any(char.IsLetter)
        && matKhau.Any(char.IsDigit);

    /// <summary>UC_2.1 BR02: 4–20 ký tự, chỉ chữ cái không dấu, chữ số, dấu gạch dưới.</summary>
    public static bool TenDangNhapHopLe(string? ten) => ten is not null && TenDangNhapRegex().IsMatch(ten);

    /// <summary>Đúng 10 chữ số, bắt đầu bằng 0 (UC_2.1 BR02, UC_7.5 BR02, UC_8.1 BR03).</summary>
    public static bool SoDienThoaiHopLe(string? sdt) => sdt is not null && SoDienThoaiRegex().IsMatch(sdt);

    /// <summary>UC_2.1 BR02: dạng tên@tênmiền.đuôi, không khoảng trắng, tối đa 100 ký tự.</summary>
    public static bool EmailHopLe(string? email) =>
        email is not null && email.Length <= 100 && EmailRegex().IsMatch(email);

    /// <summary>Che bớt số điện thoại khi hiển thị: 0905123456 → 090****456.</summary>
    public static string CheSoDienThoai(string sdt) =>
        sdt.Length == 10 ? $"{sdt[..3]}****{sdt[7..]}" : "**********";

    [GeneratedRegex("^[A-Za-z0-9_]{4,20}$")]
    private static partial Regex TenDangNhapRegex();

    [GeneratedRegex("^0[0-9]{9}$")]
    private static partial Regex SoDienThoaiRegex();

    [GeneratedRegex(@"^[^@\s]+@[^@\s]+\.[^@\s]+$")]
    private static partial Regex EmailRegex();
}
