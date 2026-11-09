using System.Data;
using System.Globalization;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;
using XomNho.Api.Data;

namespace XomNho.Api.Common;

/// <summary>Loại mã nghiệp vụ – THIET_KE_DB_V2.md mục 1.1.</summary>
public enum LoaiMa
{
    ChuQuan, NhanVien, KhachHang, DanhMuc, HangHoa, LoHang,
    CaLamViec, BienBan, HoaDon, PhieuThanhToanNo, PhieuThanhToan, PhieuDoiTra,
}

/// <summary>Quy tắc định dạng mã (hàm thuần, dễ kiểm thử).</summary>
public static class DinhDangMa
{
    public const string KyToanCuc = "00000000";

    public static string TienTo(LoaiMa loai) => loai switch
    {
        LoaiMa.ChuQuan => "CQ",
        LoaiMa.NhanVien => "NV",
        LoaiMa.KhachHang => "KH",
        LoaiMa.DanhMuc => "DM",
        LoaiMa.HangHoa => "HH",
        LoaiMa.LoHang => "LO",
        LoaiMa.CaLamViec => "CA",
        LoaiMa.BienBan => "BB",
        LoaiMa.HoaDon => "HD",
        LoaiMa.PhieuThanhToanNo => "PTTN",
        LoaiMa.PhieuThanhToan => "PTT",
        LoaiMa.PhieuDoiTra => "PDT",
        _ => throw new ArgumentOutOfRangeException(nameof(loai)),
    };

    /// <summary>Mã đánh số lại mỗi ngày hay đánh số liên tục.</summary>
    public static bool DemTheoNgay(LoaiMa loai) => loai is
        LoaiMa.CaLamViec or LoaiMa.BienBan or LoaiMa.HoaDon
        or LoaiMa.PhieuThanhToanNo or LoaiMa.PhieuThanhToan or LoaiMa.PhieuDoiTra;

    public static string Ky(LoaiMa loai, DateOnly ngay) =>
        DemTheoNgay(loai) ? ngay.ToString("yyyyMMdd", CultureInfo.InvariantCulture) : KyToanCuc;

    /// <summary>
    /// Ghép mã. Định dạng "D3" tự mở rộng thành 4 chữ số trở lên khi số thứ tự &gt; 999
    /// (UC_6.5 BR10).
    /// </summary>
    public static string Tao(LoaiMa loai, int so, DateOnly ngay)
    {
        var tt = TienTo(loai);
        var ddMMyyyy = ngay.ToString("ddMMyyyy", CultureInfo.InvariantCulture);
        var dd_MM_yyyy = ngay.ToString("dd/MM/yyyy", CultureInfo.InvariantCulture);

        return loai switch
        {
            LoaiMa.ChuQuan or LoaiMa.NhanVien => $"{tt}{so:D3}",            // NV001 (UC_2.1 BR05)
            LoaiMa.DanhMuc => $"{tt}{so:D2}",                                 // DM01 (đề xuất)
            LoaiMa.KhachHang or LoaiMa.LoHang => $"{tt}-{so:D6}",            // KH-000001, LO-000001
            LoaiMa.HangHoa => $"{tt}-{so:D4}",                                // HH-0001 (UC_4.1 BR04)
            LoaiMa.CaLamViec or LoaiMa.BienBan => $"{tt}-{ddMMyyyy}-{so:D3}", // CA-05112026-001
            _ => $"{tt}-{dd_MM_yyyy}.{so:D3}",                               // HD-03/11/2026.001
        };
    }
}

public interface ISinhMa
{
    /// <summary>
    /// Cấp mã mới. BẮT BUỘC gọi trong transaction đang mở cùng lệnh INSERT bản ghi, để
    /// nếu lưu thất bại thì số thứ tự cũng được hoàn lại (UC_2.1 BR08, UC_6.5 BR10).
    /// </summary>
    Task<string> SinhMaAsync(LoaiMa loai, CancellationToken ct = default);

    /// <summary>Xem trước mã kế tiếp, không tăng bộ đếm (Q16).</summary>
    Task<string> XemTruocAsync(LoaiMa loai, CancellationToken ct = default);
}

/// <summary>Sinh mã bằng bảng BoDemMa trên SQL Server (MERGE + HOLDLOCK).</summary>
public sealed class SinhMaSqlServer(XomNhoDbContext db, IDongHo dongHo) : ISinhMa
{
    private const string SqlTang = """
        MERGE dbo.BoDemMa WITH (HOLDLOCK) AS t
        USING (SELECT @TienTo AS TienTo, @Ky AS Ky) AS s
            ON t.TienTo = s.TienTo AND t.Ky = s.Ky
        WHEN MATCHED THEN UPDATE SET SoHienTai = t.SoHienTai + 1
        WHEN NOT MATCHED THEN INSERT (TienTo, Ky, SoHienTai) VALUES (s.TienTo, s.Ky, 1)
        OUTPUT inserted.SoHienTai;
        """;

    public async Task<string> SinhMaAsync(LoaiMa loai, CancellationToken ct = default)
    {
        var tx = db.Database.CurrentTransaction
            ?? throw new InvalidOperationException("Phải sinh mã trong transaction đang mở.");

        var ngay = dongHo.HomNay;
        var so = await ChayAsync(SqlTang, loai, ngay, tx, ct);
        return DinhDangMa.Tao(loai, so, ngay);
    }

    public async Task<string> XemTruocAsync(LoaiMa loai, CancellationToken ct = default)
    {
        var ngay = dongHo.HomNay;
        var ky = DinhDangMa.Ky(loai, ngay);
        var tienTo = DinhDangMa.TienTo(loai);
        var hienTai = await db.BoDemMa.AsNoTracking()
            .Where(b => b.TienTo == tienTo && b.Ky == ky)
            .Select(b => (int?)b.SoHienTai)
            .FirstOrDefaultAsync(ct) ?? 0;
        return DinhDangMa.Tao(loai, hienTai + 1, ngay);
    }

    private async Task<int> ChayAsync(string sql, LoaiMa loai, DateOnly ngay, IDbContextTransaction tx, CancellationToken ct)
    {
        var conn = db.Database.GetDbConnection();
        await using var cmd = conn.CreateCommand();
        cmd.Transaction = tx.GetDbTransaction();
        cmd.CommandText = sql;

        var pTienTo = cmd.CreateParameter();
        pTienTo.ParameterName = "@TienTo";
        pTienTo.DbType = DbType.AnsiString;
        pTienTo.Value = DinhDangMa.TienTo(loai);
        cmd.Parameters.Add(pTienTo);

        var pKy = cmd.CreateParameter();
        pKy.ParameterName = "@Ky";
        pKy.DbType = DbType.AnsiStringFixedLength;
        pKy.Value = DinhDangMa.Ky(loai, ngay);
        cmd.Parameters.Add(pKy);

        var ketQua = await cmd.ExecuteScalarAsync(ct);
        return Convert.ToInt32(ketQua, CultureInfo.InvariantCulture);
    }
}
