using System.Text.Encodings.Web;
using System.Text.Json;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using XomNho.Api.CaLam;
using XomNho.Api.Common;
using XomNho.Api.CongNoQL;
using XomNho.Api.Data;
using XomNho.Api.Domain;
using XomNho.Api.TonKho;
using XomNho.Api.XacThuc;

namespace XomNho.Api.BanHangQL;

/// <summary>Bước 8, 13: điều kiện hủy và số liệu hiển thị khi xác nhận.</summary>
public sealed record KiemTraHuy(
    string MaHD, bool DuocHuy, string? ThongBao, bool LaHoaDonNo,
    int SoLuongHoanKho, decimal SoTienCanHoan, decimal GiamDoanhThu, decimal GiamCongNo);

public sealed record YeuCauHuyHoaDon(string? MaHD, bool KhachChuaNhanHang, string? LyDoHuy);

public sealed record NhatKyHuyDto(
    string MaHD, string MaNguoiHuy, string NguoiHuy, DateTime ThoiGianHuy, string LyDoHuy,
    decimal TongTien, decimal SoTienCanHoan, ChiTietHoaDonDto BanSao);

/// <summary>UC_6.3 Hủy hóa đơn bán hàng – chỉ Chủ quán.</summary>
public sealed class DichVuHuyHoaDon(
    XomNhoDbContext db,
    IDongHo dongHo,
    INguoiDungHienTai hienTai,
    DichVuBanHang banHang,
    DichVuCa dichVuCa,
    DichVuCanhBao canhBao,
    DichVuCongNo congNo)
{
    public const string KhachDaNhanHang = "Khách đã nhận hàng, không thể hủy hóa đơn.";
    public const string HuyKhongThanhCong = "Hủy hóa đơn không thành công. Vui lòng thử lại.";

    private static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web)
    {
        Encoder = JavaScriptEncoder.UnsafeRelaxedJsonEscaping,
    };

    public async Task<KiemTraHuy> KiemTraAsync(string? maHD, CancellationToken ct)
    {
        var hd = await db.HoaDon.AsNoTracking().Include(h => h.GhiNo).Include(h => h.ChiTiet)
            .FirstOrDefaultAsync(h => h.MaHD == maHD, ct)
            ?? throw new LoiNghiepVuException(StatusCodes.Status404NotFound, DichVuBanHang.KhongTimThayHoaDon);
        var lyDo = await LyDoKhongDuocHuyAsync(hd, ct);
        var laNo = hd.GhiNo is not null;
        return new KiemTraHuy(hd.MaHD, lyDo is null, lyDo is null ? null : $"Hóa đơn không đủ điều kiện hủy: {lyDo}.", laNo,
            hd.ChiTiet.Sum(c => c.SoLuong),
            laNo ? 0 : hd.TongTien,                               // BR06
            hd.TongTien,                                          // BR08
            hd.TrangThai == TrangThaiHoaDon.ConNo ? hd.TongTien - hd.SoTienDaTra : 0); // BR09
    }

    /// <summary>BR01 – trả về (lý do) hoặc null nếu được hủy. Thứ tự lý do theo BR01.</summary>
    private async Task<string?> LyDoKhongDuocHuyAsync(HoaDon hd, CancellationToken ct)
    {
        if (hd.TrangThai == TrangThaiHoaDon.DaHuy) return "đã bị hủy";
        if (hd.GhiNo is not null && await db.PhanBoThanhToan.AnyAsync(
                p => p.MaHDNo == hd.MaHD && p.PhieuThanhToan.TrangThai == TrangThaiPhieuThanhToan.ThanhCong, ct))
            return "đã có thanh toán công nợ";
        // "Kể cả phiếu đang chờ duyệt". Phiếu bị từ chối / không hoàn tất không làm thay đổi hóa đơn nên không tính.
        if (await db.PhieuDoiTra.AnyAsync(p => p.MaHD == hd.MaHD
                && (p.TrangThai == TrangThaiPhieuDoiTra.ChoDuyet || p.TrangThai == TrangThaiPhieuDoiTra.DaDuyet), ct))
            return "đã có phiếu đổi trả";
        return null;
    }

    public async Task<KiemTraHuy> HuyAsync(YeuCauHuyHoaDon yc, CancellationToken ct)
    {
        if (!yc.KhachChuaNhanHang) throw new LoiNghiepVuException(StatusCodes.Status409Conflict, KhachDaNhanHang); // 10.a, BR02
        var lyDoHuy = QuyTac.ChuanHoa(yc.LyDoHuy ?? "");
        if (lyDoHuy.Length == 0) throw LoiNghiepVuException.TheoTruong("lyDoHuy", "Vui lòng nhập lý do hủy."); // 12.a, BR04
        if (lyDoHuy.Length > 255) throw LoiNghiepVuException.TheoTruong("lyDoHuy", "Lý do hủy tối đa 255 ký tự.");
        await dichVuCa.KiemTraKhongDangKetCaAsync(ct); // UC_9.1 BR07: khóa giao dịch hủy khi đang kết ca

        // Bản sao chi tiết hóa đơn tại thời điểm hủy (BR11) – lấy trước khi đổi trạng thái.
        var banSao = await banHang.ChiTietAsync(yc.MaHD ?? "", ct);
        try
        {
            await using var tx = await db.MoGiaoDichTuanTuAsync(ct);
            var hd = await db.HoaDon.Include(h => h.GhiNo)
                .Include(h => h.ChiTiet).ThenInclude(c => c.LoHang).ThenInclude(l => l.HangHoa)
                .FirstAsync(h => h.MaHD == banSao.MaHD, ct);
            var lyDo = await LyDoKhongDuocHuyAsync(hd, ct); // kiểm tra lại trong giao dịch
            if (lyDo is not null)
                throw new LoiNghiepVuException(StatusCodes.Status409Conflict, $"Hóa đơn không đủ điều kiện hủy: {lyDo}.");

            var laNo = hd.GhiNo is not null;
            var giamCongNo = hd.TrangThai == TrangThaiHoaDon.ConNo ? hd.TongTien - hd.SoTienDaTra : 0;
            hd.TrangThai = TrangThaiHoaDon.DaHuy; // bước 15, BR05

            // Bước 16, BR07: hoàn toàn bộ số lượng về đúng lô đã xuất; đánh giá lại cảnh báo của lô.
            foreach (var c in hd.ChiTiet)
            {
                c.LoHang.SoLuongTon += c.SoLuong;
                await canhBao.DongCanhBaoHangKhiDuHangAsync(c.LoHang, c.LoHang.HangHoa, ct);
                await canhBao.DanhGiaLoAsync(c.LoHang, c.LoHang.HangHoa, xetHang: true, xetHan: true, capNhatNeuDaCo: true, ct);
            }

            db.NhatKyHuy.Add(new NhatKyHuy
            {
                MaHD = hd.MaHD,
                MaCQ = hienTai.MaND!,
                LyDoHuy = lyDoHuy,
                ThoiGianHuy = dongHo.BayGio,
                TongTien = hd.TongTien,
                SoTienCanHoan = laNo ? 0 : hd.TongTien, // BR06
                XacNhanChuaNhanHang = true,
                BanSaoHoaDon = JsonSerializer.Serialize(banSao, Json),
            });
            await db.SaveChangesAsync(ct);

            // 16.a, BR09: công nợ giảm (hóa đơn "Đã hủy" không còn tính nợ); Q23: xác định lại quyền mua nợ.
            if (hd.GhiNo is not null) await congNo.CapNhatQuyenMuaNoAsync([hd.GhiNo.MaKQ], ct);
            await tx.CommitAsync(ct);

            return new KiemTraHuy(hd.MaHD, true, null, laNo, hd.ChiTiet.Sum(c => c.SoLuong),
                laNo ? 0 : hd.TongTien, hd.TongTien, giamCongNo);
        }
        catch (LoiNghiepVuException)
        {
            db.ChangeTracker.Clear();
            throw;
        }
        catch (DbUpdateException)
        {
            // 15.a: hoàn tác mọi thay đổi.
            db.ChangeTracker.Clear();
            throw new LoiNghiepVuException(StatusCodes.Status409Conflict, HuyKhongThanhCong);
        }
    }

    /// <summary>BR12: xem lại thông tin hủy cùng bản sao hóa đơn.</summary>
    public async Task<NhatKyHuyDto> NhatKyAsync(string? maHD, CancellationToken ct)
    {
        var nk = await db.NhatKyHuy.AsNoTracking().Include(n => n.ChuQuan).FirstOrDefaultAsync(n => n.MaHD == maHD, ct)
            ?? throw new LoiNghiepVuException(StatusCodes.Status404NotFound, "Hóa đơn chưa có nhật ký hủy.");
        var banSao = JsonSerializer.Deserialize<ChiTietHoaDonDto>(nk.BanSaoHoaDon, Json)!;
        return new NhatKyHuyDto(nk.MaHD, nk.MaCQ, nk.ChuQuan.HoTen, nk.ThoiGianHuy, nk.LyDoHuy, nk.TongTien, nk.SoTienCanHoan, banSao);
    }
}

[ApiController]
[Route("api/huy-hoa-don")]
[Authorize(Policy = ChinhSach.ChiChuQuan)]
public sealed class HuyHoaDonController(DichVuHuyHoaDon dichVu) : ControllerBase
{
    /// <summary>Mã hóa đơn có dấu "/" nên truyền qua query string.</summary>
    [HttpGet("kiem-tra")]
    public Task<KiemTraHuy> KiemTra([FromQuery] string ma, CancellationToken ct) => dichVu.KiemTraAsync(ma, ct);

    [HttpPost]
    public Task<KiemTraHuy> Huy(YeuCauHuyHoaDon yc, CancellationToken ct) => dichVu.HuyAsync(yc, ct);
}

/// <summary>Nhật ký hủy – xem được từ lịch sử bán hàng (cả hai vai trò, BR12).</summary>
[ApiController]
[Route("api/hoa-don/nhat-ky-huy")]
public sealed class NhatKyHuyController(DichVuHuyHoaDon dichVu) : ControllerBase
{
    [HttpGet]
    public Task<NhatKyHuyDto> Xem([FromQuery] string ma, CancellationToken ct) => dichVu.NhatKyAsync(ma, ct);
}
