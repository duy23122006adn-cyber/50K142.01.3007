using Microsoft.AspNetCore.Diagnostics;
using Microsoft.EntityFrameworkCore;

namespace XomNho.Api.Common;

/// <summary>
/// Lỗi nghiệp vụ trả về cho giao diện. Thông báo dùng đúng câu chữ trong báo cáo.
/// JSON trả về: { thongBao, loi: { truong: thongBao }, ...duLieuThem }.
/// </summary>
public sealed class LoiNghiepVuException : Exception
{
    public int MaTrangThai { get; }
    public IReadOnlyDictionary<string, string>? Loi { get; }
    public IReadOnlyDictionary<string, object?>? DuLieuThem { get; }

    public LoiNghiepVuException(
        int maTrangThai,
        string thongBao,
        IReadOnlyDictionary<string, string>? loi = null,
        IReadOnlyDictionary<string, object?>? duLieuThem = null) : base(thongBao)
    {
        MaTrangThai = maTrangThai;
        Loi = loi;
        DuLieuThem = duLieuThem;
    }

    public static LoiNghiepVuException KhongHopLe(string thongBao, IReadOnlyDictionary<string, string>? loi = null)
        => new(StatusCodes.Status400BadRequest, thongBao, loi);

    public static LoiNghiepVuException TheoTruong(string truong, string thongBao)
        => new(StatusCodes.Status400BadRequest, thongBao, new Dictionary<string, string> { [truong] = thongBao });
}

/// <summary>Chuyển mọi exception thành JSON thống nhất.</summary>
public sealed class XuLyLoiToanCuc(ILogger<XuLyLoiToanCuc> log) : IExceptionHandler
{
    public async ValueTask<bool> TryHandleAsync(HttpContext http, Exception ex, CancellationToken ct)
    {
        int ma;
        var body = new Dictionary<string, object?>();

        switch (ex)
        {
            case LoiNghiepVuException lnv:
                ma = lnv.MaTrangThai;
                body["thongBao"] = lnv.Message;
                if (lnv.Loi is not null) body["loi"] = lnv.Loi;
                if (lnv.DuLieuThem is not null)
                    foreach (var (k, v) in lnv.DuLieuThem) body[k] = v;
                break;

            case DbUpdateConcurrencyException:
                // NFR Supportability-03: dữ liệu bị người khác sửa trước.
                ma = StatusCodes.Status409Conflict;
                body["thongBao"] = "Dữ liệu đã thay đổi, vui lòng tải lại.";
                break;

            default:
                log.LogError(ex, "Lỗi chưa xử lý tại {Path}", http.Request.Path);
                ma = StatusCodes.Status500InternalServerError;
                body["thongBao"] = "Đã xảy ra lỗi hệ thống. Vui lòng thử lại sau.";
                break;
        }

        http.Response.StatusCode = ma;
        await http.Response.WriteAsJsonAsync(body, ct);
        return true;
    }
}
