using System.Text.Json;
using System.Text.RegularExpressions;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using XomNho.Api.Common;
using XomNho.Api.Data;
using XomNho.Api.Domain;

namespace XomNho.Api.BanHangQL;

// ------------------------------------------------------------------ DTO

public sealed record DongHoaDonTam(string? MaHH, string? TenHH, int SoLuong, decimal DonGia);

public sealed record YeuCauDongBoHoaDonTam(
    string? MaTam, DateTime? NgayGioBan, string? MaND, string? MaKH, IReadOnlyList<DongHoaDonTam>? Dong, decimal TienKhachDua);

public sealed record HoaDonTamDto(
    string MaTam, DateTime NgayGioBan, string MaND, string NguoiBan, decimal TongTien, decimal TienKhachDua,
    string TrangThai, string? LyDo, string? MaHD, DateTime NgayGioDongBo, DateTime? NgayGioXuLy, IReadOnlyList<DongHoaDonTam> Dong);

public sealed record YeuCauXuLyHoaDonTam(string? MaTam, string? LyDo);

/// <summary>
/// Giai đoạn 8c – bán hàng offline (NFR Availability-02, 03). Máy bán khi mất mạng lưu hóa đơn tạm (chỉ tiền mặt);
/// khi có mạng, máy gửi từng hóa đơn tạm lên đây:
/// <list type="bullet">
/// <item>đủ điều kiện → cấp hóa đơn chính thức theo ngày bán thật, thu tiền mặt, xuất kho FEFO;</item>
/// <item>không đủ tồn / giá đã đổi / hàng ngừng kinh doanh → "Chờ Chủ quán xử lý" và báo Chủ quán
/// (NFR: xung đột thì ưu tiên quyết định của Chủ quán).</item>
/// </list>
/// </summary>
public sealed partial class DichVuBanHang
{
    public const string KhongPhaiNguoiBan = "Hóa đơn tạm do người khác lập. Cần chính người bán hoặc Chủ quán đăng nhập để đồng bộ.";
    public const string LoaiThongBaoHoaDonTam = "Hóa đơn tạm";
    private static readonly JsonSerializerOptions JsonTam = new(JsonSerializerDefaults.Web);

    [GeneratedRegex("^TAM-[0-9]{6}-[A-Z0-9]{6}$")]
    private static partial Regex MaTamRegex();

    private sealed record DongGop(string MaHH, string TenHH, int SoLuong, decimal DonGia);

    // ================================================================ Đồng bộ (máy bán gửi lên)

    public async Task<HoaDonTamDto> DongBoTamAsync(YeuCauDongBoHoaDonTam yc, CancellationToken ct)
    {
        var maND = hienTai.MaND!;
        var maTam = yc.MaTam?.Trim().ToUpperInvariant() ?? "";
        if (!MaTamRegex().IsMatch(maTam)) throw LoiNghiepVuException.KhongHopLe("Mã hóa đơn tạm không hợp lệ.");
        // Gửi lại (mạng chập chờn) → trả kết quả đã có, không ghi nhận lần hai.
        if (await db.HoaDonTam.AsNoTracking().AnyAsync(x => x.MaTam == maTam, ct)) return await HoaDonTamAsync(maTam, ct);

        var nguoiBan = yc.MaND?.Trim() ?? "";
        if (nguoiBan != maND && hienTai.VaiTro != VaiTroNguoiDung.ChuQuan)
            throw new LoiNghiepVuException(StatusCodes.Status403Forbidden, KhongPhaiNguoiBan);
        if (!await db.NguoiDung.AnyAsync(n => n.MaND == nguoiBan, ct))
            throw LoiNghiepVuException.KhongHopLe("Không tìm thấy người bán của hóa đơn tạm.");

        var bayGio = dongHo.BayGio;
        if (yc.NgayGioBan is not { } ngayBan || ngayBan > bayGio.AddMinutes(10) || ngayBan < bayGio.AddDays(-30))
            throw LoiNghiepVuException.TheoTruong("ngayGioBan", "Thời điểm bán không hợp lệ (quá 30 ngày hoặc ở tương lai).");
        var gop = GopDong(yc.Dong);
        var tong = gop.Sum(d => d.SoLuong * d.DonGia);
        if (yc.TienKhachDua < tong) throw LoiNghiepVuException.TheoTruong("tienKhachDua", "Số tiền khách đưa chưa đủ.");
        var maKH = QuyTac.Trong(yc.MaKH) || !await db.KhachHang.AnyAsync(k => k.MaKH == yc.MaKH, ct) ? null : yc.MaKH;

        try
        {
            await using var tx = await db.MoGiaoDichTuanTuAsync(ct);
            // Ca đang kết ca → 409, máy giữ hóa đơn tạm và tự gửi lại sau.
            var ca = await dichVuCa.CaChoGiaoDichAsync(maND, ct);
            var lyDo = await LyDoChoXuLyAsync(gop, kiemGia: true, ct);
            var tam = new HoaDonTam
            {
                MaTam = maTam,
                NgayGioBan = new DateTime(ngayBan.Year, ngayBan.Month, ngayBan.Day, ngayBan.Hour, ngayBan.Minute, ngayBan.Second),
                MaND = nguoiBan,
                MaKH = maKH,
                NoiDung = JsonSerializer.Serialize(gop.Select(d => new DongHoaDonTam(d.MaHH, d.TenHH, d.SoLuong, d.DonGia)), JsonTam),
                TongTien = tong,
                TienKhachDua = yc.TienKhachDua,
                TrangThai = lyDo is null ? TrangThaiHoaDonTam.DaGhiNhan : TrangThaiHoaDonTam.ChoXuLy,
                LyDo = lyDo,
                NgayGioDongBo = bayGio,
                MaNguoiDongBo = maND,
            };
            if (lyDo is null) tam.MaHD = await GhiHoaDonTuTamAsync(tam, gop, ca, ct);
            else await BaoChuQuanAsync(tam, ct);
            db.HoaDonTam.Add(tam);
            await db.SaveChangesAsync(ct);
            await tx.CommitAsync(ct);
        }
        catch (LoiNghiepVuException)
        {
            db.ChangeTracker.Clear();
            throw;
        }
        catch (DbUpdateException ex) when (LoiTrungKhoa.TenChiMuc(ex) == "PK_HoaDonTam")
        {
            db.ChangeTracker.Clear(); // hai lần gửi cùng lúc – lần kia đã ghi nhận
            return await HoaDonTamAsync(maTam, ct);
        }
        catch (DbUpdateException)
        {
            db.ChangeTracker.Clear();
            throw new LoiNghiepVuException(StatusCodes.Status409Conflict, "Chưa đồng bộ được hóa đơn tạm, máy sẽ thử lại.");
        }
        return await HoaDonTamAsync(maTam, ct);
    }

    private static List<DongGop> GopDong(IReadOnlyList<DongHoaDonTam>? dong)
    {
        if (dong is null || dong.Count == 0 || dong.Any(d => QuyTac.Trong(d.MaHH) || d.SoLuong <= 0 || d.DonGia < 0))
            throw LoiNghiepVuException.KhongHopLe(GioRong);
        var gop = new List<DongGop>();
        foreach (var g in dong.GroupBy(d => d.MaHH!.Trim()))
        {
            if (g.Select(d => d.DonGia).Distinct().Count() > 1)
                throw LoiNghiepVuException.KhongHopLe("Một sản phẩm có nhiều đơn giá trong cùng hóa đơn tạm.");
            gop.Add(new DongGop(g.Key, g.First().TenHH?.Trim() ?? g.Key, g.Sum(d => d.SoLuong), g.First().DonGia));
        }
        if (gop.Sum(d => d.SoLuong * d.DonGia) <= 0) throw LoiNghiepVuException.KhongHopLe("Tổng tiền hóa đơn tạm phải lớn hơn 0.");
        return gop;
    }

    /// <summary>Null nếu ghi nhận được ngay; ngược lại là lý do cần Chủ quán xử lý.</summary>
    private async Task<string?> LyDoChoXuLyAsync(List<DongGop> gop, bool kiemGia, CancellationToken ct)
    {
        var ma = gop.Select(d => d.MaHH).ToList();
        var homNay = dongHo.HomNay;
        var hang = await db.HangHoa.AsNoTracking().Where(h => ma.Contains(h.MaHH)).ToDictionaryAsync(h => h.MaHH, ct);
        var ton = await db.LoHang.AsNoTracking()
            .Where(l => ma.Contains(l.MaHH) && l.HanSuDung >= homNay && l.SoLuongTon > 0)
            .GroupBy(l => l.MaHH).Select(g => new { g.Key, Ton = g.Sum(l => l.SoLuongTon) })
            .ToDictionaryAsync(x => x.Key, x => x.Ton, ct);
        var lyDo = new List<string>();
        foreach (var d in gop)
        {
            if (!hang.TryGetValue(d.MaHH, out var h) || h.TrangThai != TrangThaiHangHoa.DangKinhDoanh)
            {
                lyDo.Add($"{d.TenHH} đã ngừng kinh doanh");
                continue;
            }
            if (kiemGia && h.GiaBan != d.DonGia) lyDo.Add($"Giá {h.TenHH} đã đổi (lúc bán {d.DonGia:N0}đ, hiện {h.GiaBan:N0}đ)");
            var co = ton.GetValueOrDefault(d.MaHH);
            if (co < d.SoLuong) lyDo.Add($"{h.TenHH} không đủ tồn (cần {d.SoLuong}, còn {co})");
        }
        if (lyDo.Count == 0) return null;
        var chuoi = string.Join("; ", lyDo);
        return chuoi.Length <= 255 ? chuoi : chuoi[..252] + "...";
    }

    /// <summary>Hóa đơn chính thức lấy ngày giờ bán thật: mã theo ngày bán, phiếu thu tiền mặt, xuất kho FEFO với giá khách đã trả.</summary>
    private async Task<string> GhiHoaDonTuTamAsync(HoaDonTam tam, List<DongGop> gop, CaLamViec ca, CancellationToken ct)
    {
        var ma = gop.Select(d => d.MaHH).ToList();
        var hang = await db.HangHoa.AsNoTracking().Where(h => ma.Contains(h.MaHH)).ToDictionaryAsync(h => h.MaHH, ct);
        var dong = gop.Select(d => new DongDaTinh(hang[d.MaHH], d.SoLuong, d.SoLuong * d.DonGia)).ToList();
        var ngay = DateOnly.FromDateTime(tam.NgayGioBan);
        var hd = new HoaDon
        {
            MaHD = await sinhMa.SinhMaTheoNgayAsync(LoaiMa.HoaDon, ngay, ct),
            NgayGioLap = tam.NgayGioBan,
            TongTien = tam.TongTien,
            SoTienDaTra = tam.TongTien,
            TrangThai = TrangThaiHoaDon.DaThanhToan,
            MaCa = ca.MaCa,
            MaND = tam.MaND,
            ThanhToanNgay = new HoaDonThanhToanNgay { MaKH = tam.MaKH },
        };
        await XuatKhoAsync(hd, dong, ct, gop.ToDictionary(d => d.MaHH, d => d.DonGia));
        db.HoaDon.Add(hd);
        db.PhieuThanhToan.Add(new PhieuThanhToan
        {
            MaPTT = await sinhMa.SinhMaTheoNgayAsync(LoaiMa.PhieuThanhToan, ngay, ct),
            NgayGio = tam.NgayGioBan,
            LoaiPhieu = LoaiPhieuThanhToan.BanHang,
            HuongTien = HuongTienTe.Thu,
            SoTien = tam.TongTien,
            PhuongThuc = PhuongThucThanhToan.TienMat,
            MaND = tam.MaND,
            MaHDTTN = hd.MaHD,
        });
        return hd.MaHD;
    }

    private async Task BaoChuQuanAsync(HoaDonTam tam, CancellationToken ct)
    {
        var nguoiBan = await db.NguoiDung.AsNoTracking().Where(n => n.MaND == tam.MaND).Select(n => n.HoTen).FirstAsync(ct);
        var noiDung = $"Hóa đơn tạm {tam.MaTam} (bán offline bởi {nguoiBan}, {tam.TongTien:N0}đ) cần xử lý: {tam.LyDo}";
        foreach (var maCQ in await db.ChuQuan.Where(c => c.TrangThai != TrangThaiTaiKhoan.NgungHoatDong).Select(c => c.MaND).ToListAsync(ct))
            db.ThongBao.Add(new ThongBao
            {
                MaND = maCQ, LoaiThongBao = LoaiThongBaoHoaDonTam, MaThamChieu = tam.MaTam, ThoiDiemTao = dongHo.BayGio,
                NoiDung = noiDung.Length <= 500 ? noiDung : noiDung[..497] + "...",
            });
    }

    // ================================================================ Chủ quán xử lý

    /// <summary>Ghi nhận hóa đơn tạm đang chờ: dùng giá khách đã trả; vẫn phải đủ tồn (Chủ quán điều chỉnh tồn trước nếu cần).</summary>
    public async Task<HoaDonTamDto> GhiNhanTamAsync(YeuCauXuLyHoaDonTam yc, CancellationToken ct)
    {
        var maND = hienTai.MaND!;
        try
        {
            await using var tx = await db.MoGiaoDichTuanTuAsync(ct);
            var tam = await LayChoXuLyAsync(yc.MaTam, ct);
            var ca = await dichVuCa.CaChoGiaoDichAsync(maND, ct);
            var gop = DocNoiDung(tam).Select(d => new DongGop(d.MaHH!, d.TenHH ?? d.MaHH!, d.SoLuong, d.DonGia)).ToList();
            if (await LyDoChoXuLyAsync(gop, kiemGia: false, ct) is { } conVuong)
                throw new LoiNghiepVuException(StatusCodes.Status409Conflict,
                    $"Chưa ghi nhận được: {conVuong}. Vui lòng điều chỉnh tồn kho trước, hoặc hủy hóa đơn tạm.");
            tam.MaHD = await GhiHoaDonTuTamAsync(tam, gop, ca, ct);
            tam.TrangThai = TrangThaiHoaDonTam.DaGhiNhan;
            tam.NgayGioXuLy = dongHo.BayGio;
            tam.MaNguoiXuLy = maND;
            await db.SaveChangesAsync(ct);
            await tx.CommitAsync(ct);
            return await HoaDonTamAsync(tam.MaTam, ct);
        }
        catch (LoiNghiepVuException)
        {
            db.ChangeTracker.Clear();
            throw;
        }
        catch (DbUpdateException)
        {
            db.ChangeTracker.Clear();
            throw new LoiNghiepVuException(StatusCodes.Status409Conflict, "Hóa đơn tạm vừa được xử lý hoặc chưa lưu được, vui lòng tải lại.");
        }
    }

    public async Task<HoaDonTamDto> HuyTamAsync(YeuCauXuLyHoaDonTam yc, CancellationToken ct)
    {
        var lyDo = QuyTac.ChuanHoa(yc.LyDo ?? "");
        if (lyDo.Length == 0) throw LoiNghiepVuException.TheoTruong("lyDo", "Vui lòng nhập lý do hủy.");
        var tam = await LayChoXuLyAsync(yc.MaTam, ct);
        var chuoi = $"Hủy: {lyDo} (trước đó: {tam.LyDo})";
        tam.LyDo = chuoi.Length <= 255 ? chuoi : chuoi[..252] + "...";
        tam.TrangThai = TrangThaiHoaDonTam.DaHuy;
        tam.NgayGioXuLy = dongHo.BayGio;
        tam.MaNguoiXuLy = hienTai.MaND;
        try
        {
            await db.SaveChangesAsync(ct);
        }
        catch (DbUpdateConcurrencyException)
        {
            db.ChangeTracker.Clear();
            throw new LoiNghiepVuException(StatusCodes.Status409Conflict, "Hóa đơn tạm vừa được xử lý, vui lòng tải lại.");
        }
        return await HoaDonTamAsync(tam.MaTam, ct);
    }

    private async Task<HoaDonTam> LayChoXuLyAsync(string? maTam, CancellationToken ct)
    {
        var tam = await db.HoaDonTam.FirstOrDefaultAsync(x => x.MaTam == maTam, ct)
            ?? throw new LoiNghiepVuException(StatusCodes.Status404NotFound, "Không tìm thấy hóa đơn tạm.");
        if (tam.TrangThai != TrangThaiHoaDonTam.ChoXuLy)
            throw new LoiNghiepVuException(StatusCodes.Status409Conflict, $"Hóa đơn tạm đã ở trạng thái \"{tam.TrangThai}\".");
        return tam;
    }

    // ================================================================ Xem

    /// <summary>Nhân viên chỉ thấy hóa đơn tạm mình bán; Chủ quán thấy tất cả.</summary>
    public async Task<List<HoaDonTamDto>> DanhSachTamAsync(string? trangThai, CancellationToken ct)
    {
        var q = db.HoaDonTam.AsNoTracking().Include(x => x.NguoiDung).AsQueryable();
        if (hienTai.VaiTro != VaiTroNguoiDung.ChuQuan) q = q.Where(x => x.MaND == hienTai.MaND);
        if (!QuyTac.Trong(trangThai)) q = q.Where(x => x.TrangThai == trangThai);
        return (await q.OrderByDescending(x => x.NgayGioBan).Take(200).ToListAsync(ct)).Select(Dto).ToList();
    }

    public async Task<HoaDonTamDto> HoaDonTamAsync(string maTam, CancellationToken ct)
    {
        var tam = await db.HoaDonTam.AsNoTracking().Include(x => x.NguoiDung).FirstOrDefaultAsync(x => x.MaTam == maTam, ct)
            ?? throw new LoiNghiepVuException(StatusCodes.Status404NotFound, "Không tìm thấy hóa đơn tạm.");
        if (hienTai.VaiTro != VaiTroNguoiDung.ChuQuan && tam.MaND != hienTai.MaND && tam.MaNguoiDongBo != hienTai.MaND)
            throw new LoiNghiepVuException(StatusCodes.Status403Forbidden, "Bạn không có quyền xem hóa đơn tạm này.");
        return Dto(tam);
    }

    private static List<DongHoaDonTam> DocNoiDung(HoaDonTam tam) =>
        JsonSerializer.Deserialize<List<DongHoaDonTam>>(tam.NoiDung, JsonTam) ?? [];

    private static HoaDonTamDto Dto(HoaDonTam x) => new(
        x.MaTam, x.NgayGioBan, x.MaND, x.NguoiDung.HoTen, x.TongTien, x.TienKhachDua, x.TrangThai, x.LyDo, x.MaHD,
        x.NgayGioDongBo, x.NgayGioXuLy, DocNoiDung(x));
}

[ApiController]
[Route("api/ban-hang/hoa-don-tam")]
public sealed class HoaDonTamController(DichVuBanHang dichVu) : ControllerBase
{
    /// <summary>Máy bán gửi hóa đơn tạm khi có mạng trở lại.</summary>
    [HttpPost]
    public Task<HoaDonTamDto> DongBo(YeuCauDongBoHoaDonTam yc, CancellationToken ct) => dichVu.DongBoTamAsync(yc, ct);

    [HttpGet]
    public Task<List<HoaDonTamDto>> DanhSach([FromQuery] string? trangThai, CancellationToken ct) => dichVu.DanhSachTamAsync(trangThai, ct);

    [HttpGet("chi-tiet")]
    public Task<HoaDonTamDto> ChiTiet([FromQuery] string ma, CancellationToken ct) => dichVu.HoaDonTamAsync(ma, ct);

    [HttpPost("ghi-nhan")]
    [Authorize(Policy = ChinhSach.ChiChuQuan)]
    public Task<HoaDonTamDto> GhiNhan(YeuCauXuLyHoaDonTam yc, CancellationToken ct) => dichVu.GhiNhanTamAsync(yc, ct);

    [HttpPost("huy")]
    [Authorize(Policy = ChinhSach.ChiChuQuan)]
    public Task<HoaDonTamDto> Huy(YeuCauXuLyHoaDonTam yc, CancellationToken ct) => dichVu.HuyTamAsync(yc, ct);
}
