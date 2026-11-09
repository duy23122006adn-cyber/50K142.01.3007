using System.Globalization;
using System.Text.RegularExpressions;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;

namespace XomNho.Api.Common;

/// <summary>Gom lỗi theo từng trường; mỗi trường chỉ giữ lỗi đầu tiên (đúng thứ tự luồng ngoại lệ trong UC).</summary>
public sealed class BoKiemTra
{
    private readonly Dictionary<string, string> _loi = new();

    public bool CoLoi => _loi.Count > 0;
    public bool CoLoiTai(string truong) => _loi.ContainsKey(truong);

    /// <summary>Ghi lỗi nếu điều kiện sai và trường chưa có lỗi.</summary>
    public BoKiemTra Kiem(string truong, bool hopLe, string thongBao)
    {
        if (!hopLe && !_loi.ContainsKey(truong)) _loi[truong] = thongBao;
        return this;
    }

    public void NemNeuCoLoi(string? thongBaoChung = null)
    {
        if (CoLoi) throw LoiNghiepVuException.KhongHopLe(thongBaoChung ?? _loi.Values.First(), _loi);
    }
}

/// <summary>Kết quả phân trang (UC_3.1 BR02, UC_4.4 BR02: 20 dòng/trang).</summary>
public sealed record KetQuaTrang<T>(IReadOnlyList<T> DanhSach, int TongSo, int Trang, int SoDongMoiTrang)
{
    public int SoTrang => TongSo == 0 ? 1 : (int)Math.Ceiling(TongSo / (double)SoDongMoiTrang);
}

public static class PhanTrang
{
    public static async Task<KetQuaTrang<T>> LayTrangAsync<T>(IQueryable<T> truyVan, int trang, int soDong, CancellationToken ct)
    {
        trang = Math.Max(1, trang);
        var tong = await truyVan.CountAsync(ct);
        var ds = await truyVan.Skip((trang - 1) * soDong).Take(soDong).ToListAsync(ct);
        return new KetQuaTrang<T>(ds, tong, trang, soDong);
    }
}

public static partial class QuyTac
{
    /// <summary>
    /// Đọc số nguyên do người dùng nhập ("45000", "45.000", "45 000").
    /// Trả false nếu không phải số, có dấu âm hoặc phần thập phân.
    /// </summary>
    public static bool DocSoNguyen(string? giaTri, out long so)
    {
        so = 0;
        if (Trong(giaTri)) return false;
        var s = giaTri!.Trim().Replace(" ", "").Replace(".", "").Replace(",", "");
        return SoNguyenRegex().IsMatch(s) && long.TryParse(s, NumberStyles.None, CultureInfo.InvariantCulture, out so);
    }

    /// <summary>Đọc ngày dạng yyyy-MM-dd (ô input date) hoặc dd/MM/yyyy.</summary>
    public static bool DocNgay(string? giaTri, out DateOnly ngay) =>
        DateOnly.TryParseExact(giaTri?.Trim(), ["yyyy-MM-dd", "dd/MM/yyyy", "d/M/yyyy"],
            CultureInfo.InvariantCulture, DateTimeStyles.None, out ngay);

    /// <summary>Họ tên chỉ gồm chữ cái (kể cả tiếng Việt có dấu) và khoảng trắng (màn hình 2.2.5, UC_8.1 BR02).</summary>
    public static bool HoTenHopLe(string? hoTen, int doDaiToiDa) =>
        hoTen is not null && hoTen.Trim().Length <= doDaiToiDa && HoTenRegex().IsMatch(hoTen.Trim());

    /// <summary>Gộp khoảng trắng thừa, bỏ khoảng trắng đầu/cuối.</summary>
    public static string ChuanHoa(string giaTri) => KhoangTrangRegex().Replace(giaTri.Trim(), " ");

    [GeneratedRegex("^[0-9]+$")]
    private static partial Regex SoNguyenRegex();

    [GeneratedRegex(@"^[\p{L}\p{M}]+( [\p{L}\p{M}]+)*$")]
    private static partial Regex HoTenRegex();

    [GeneratedRegex(@"\s+")]
    private static partial Regex KhoangTrangRegex();
}

/// <summary>Nhận diện lỗi vi phạm UNIQUE của SQL Server (2601, 2627) – xử lý tranh chấp khi nhiều người lưu cùng lúc.</summary>
public static class LoiTrungKhoa
{
    public static string? TenChiMuc(DbUpdateException ex)
    {
        if (ex.InnerException is not SqlException sql || (sql.Number != 2601 && sql.Number != 2627)) return null;
        var m = Regex.Match(sql.Message, @"(?:index|constraint) '([^']+)'");
        return m.Success ? m.Groups[1].Value : "";
    }
}
