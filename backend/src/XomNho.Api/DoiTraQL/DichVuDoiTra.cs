using Microsoft.EntityFrameworkCore;
using XomNho.Api.BanHangQL;
using XomNho.Api.CaLam;
using XomNho.Api.Common;
using XomNho.Api.Data;
using XomNho.Api.Domain;
using XomNho.Api.TonKho;

namespace XomNho.Api.DoiTraQL;

// ------------------------------------------------------------------ DTO

/// <summary>Màn hình 6.2.10 – một mặt hàng trên hóa đơn gốc và số lượng còn được đổi trả (BR02).</summary>
public sealed record DongDoiTra(string MaHH, string TenHH, string DonViTinh, decimal DonGia, int DaMua, int DaDoiTra, int DangCho, int ConLai);

/// <summary>Bước 4–5: hóa đơn gốc và kết quả kiểm tra điều kiện đổi trả.</summary>
public sealed record HoaDonDoiTra(
    ChiTietHoaDonDto HoaDon, bool DuocDoiTra, string? TieuDeLoi, string? ThongBaoLoi, string ThoiHan, IReadOnlyList<DongDoiTra> Dong);

public sealed record DongYeuCauDoiTra(string? MaHH, int SoLuong, string? MaHHMoi, int? SoLuongMoi);

public sealed record YeuCauLapPhieu(
    string? MaHD, string? LoaiPhieu, IReadOnlyList<DongYeuCauDoiTra>? Dong,
    IReadOnlyList<string>? TinhTrang, bool LoiNhaSanXuat, string? MoTaLoi, string? LyDoDoiTra);

public sealed record DongPhieuDoiTra(
    string MaHH, string TenHH, string DonViTinh, int SoLuongTra, decimal GiaTriHoan,
    string? MaHHMoi, string? TenHHMoi, string? DonViTinhMoi, int? SoLuongMoi, decimal? DonGiaMoi, decimal? GiaTriHangMoi);

/// <summary>Bước 10 / 9.a.3 – số tiền dự kiến trước khi tạo phiếu.</summary>
public sealed record XemTruocPhieu(string LoaiPhieu, IReadOnlyList<DongPhieuDoiTra> Dong, decimal SoTienHoan, decimal GiaTriHangMoi,
    decimal ChenhLech, decimal TienHoanKhach, decimal CanThuThem);

public sealed record PhieuDoiTraDto(
    string MaPDT, string MaHD, string? TenKhach, string LoaiPhieu, DateTime NgayGioLap,
    string MaNguoiLap, string NguoiLap, string VaiTroNguoiLap, string LyDoDoiTra, string TinhTrangHang, string? MoTaLoi,
    IReadOnlyList<DongPhieuDoiTra> Dong, decimal SoTienHoan, decimal GiaTriHangMoi, decimal ChenhLech,
    decimal TienHoanKhach, decimal CanThuThem, string TrangThai, string TrangThaiXuLy,
    string? LyDoTuChoi, DateTime? NgayGioDuyet, string? NguoiDuyet, DateTime? NgayGioHoanTat, bool DaThuThem);

public sealed record PhieuDoiTraDong(
    string MaPDT, string MaHD, string? TenKhach, string LoaiPhieu, string NguoiLap, string VaiTroNguoiLap, DateTime NgayGioLap,
    string TrangThai, string TrangThaiXuLy);

public sealed record YeuCauXuLyPhieu(string? MaPDT, string? PhuongThuc, string? KetQuaQrGiaLap);
public sealed record YeuCauTuChoi(string? MaPDT, string? LyDo);

/// <summary>
/// UC_6.2 Xử lý đổi trả và UC_6.4 Duyệt phiếu đổi trả.
/// Vòng đời: Chờ duyệt → (Từ chối) | Đã duyệt → hoàn/thu tiền + cập nhật kho (NgayGioHoanTat) | Không hoàn tất.
/// </summary>
public sealed class DichVuDoiTra(
    XomNhoDbContext db,
    ISinhMa sinhMa,
    IDongHo dongHo,
    INguoiDungHienTai hienTai,
    DichVuBanHang banHang,
    DichVuCa dichVuCa,
    DichVuCanhBao canhBao)
{
    public const int SoNgayDoiTra = 7; // Q17
    public const string HangKhongDuDieuKien = "Hàng không đủ điều kiện đổi trả.";
    public const string CapNhatKhongThanhCong = "Cập nhật không thành công";
    public static readonly string[] TinhTrangDat = ["Còn nguyên vẹn", "Chưa mở bao bì", "Chưa qua sử dụng"];
    public const string TinhTrangLoiNsx = "Lỗi do nhà sản xuất";

    private static readonly string[] TrangThaiGiuSoLuong = [TrangThaiPhieuDoiTra.ChoDuyet, TrangThaiPhieuDoiTra.DaDuyet];

    // ================================================================ Bước 4–5: hóa đơn và điều kiện

    public async Task<HoaDonDoiTra> HoaDonAsync(string? maHD, CancellationToken ct)
    {
        var hd = await banHang.ChiTietAsync(maHD ?? "", ct);
        var (tieuDe, thongBao) = KiemTraDieuKien(hd.TrangThai, hd.NgayGioLap);
        var dong = await DongConLaiAsync(hd.MaHD, ct);
        var hanCuoi = DateOnly.FromDateTime(hd.NgayGioLap).AddDays(SoNgayDoiTra - 1);
        return new HoaDonDoiTra(hd, tieuDe is null, tieuDe, thongBao,
            tieuDe is null ? $"Còn trong hạn {SoNgayDoiTra} ngày (đến hết {hanCuoi:dd/MM/yyyy})." : "", dong);
    }

    /// <summary>BR01, BR08 (+Q18): thứ tự kiểm tra hủy → còn nợ → quá hạn. Trả (tiêu đề, thông báo) hoặc (null, null).</summary>
    private (string? TieuDe, string? ThongBao) KiemTraDieuKien(string trangThai, DateTime ngayGioLap)
    {
        if (trangThai == TrangThaiHoaDon.DaHuy) return ("Hóa đơn đã hủy · không được đổi trả", "Hóa đơn đã bị hủy.");
        if (trangThai == TrangThaiHoaDon.ConNo) return ("Hóa đơn còn nợ · không được đổi trả", "Hóa đơn nợ.");
        // Ngày lập là ngày 1 → hạn cuối = ngày lập + 6.
        if (dongHo.HomNay > DateOnly.FromDateTime(ngayGioLap).AddDays(SoNgayDoiTra - 1))
            return ($"Hóa đơn hết thời hạn {SoNgayDoiTra} ngày", "Hóa đơn đã hết hạn");
        return (null, null);
    }

    private sealed record DongCTHD(int MaCTHD, string MaHH, string TenHH, string DonViTinh, decimal DonGia, int SoLuong, int DaDuyet, int DangCho);

    private async Task<List<DongCTHD>> DongCTHDAsync(string maHD, CancellationToken ct) =>
        await db.ChiTietHoaDon.AsNoTracking().Where(c => c.MaHD == maHD)
            .OrderBy(c => c.MaCTHD)
            .Select(c => new DongCTHD(c.MaCTHD, c.MaHH, c.HangHoa.TenHH, c.HangHoa.DonViTinh, c.DonGia, c.SoLuong,
                db.ChiTietDoiTra.Where(d => d.MaCTHD == c.MaCTHD && d.PhieuDoiTra.TrangThai == TrangThaiPhieuDoiTra.DaDuyet)
                    .Sum(d => (int?)d.SoLuongTra) ?? 0,
                db.ChiTietDoiTra.Where(d => d.MaCTHD == c.MaCTHD && d.PhieuDoiTra.TrangThai == TrangThaiPhieuDoiTra.ChoDuyet)
                    .Sum(d => (int?)d.SoLuongTra) ?? 0))
            .ToListAsync(ct);

    /// <summary>BR02: còn đổi trả = đã mua − đã đổi trả (đã duyệt) − đang xin đổi trả (chờ duyệt). Gộp theo mặt hàng.</summary>
    private async Task<List<DongDoiTra>> DongConLaiAsync(string maHD, CancellationToken ct) =>
        (await DongCTHDAsync(maHD, ct))
            .GroupBy(c => new { c.MaHH, c.TenHH, c.DonViTinh, c.DonGia })
            .Select(g => new DongDoiTra(g.Key.MaHH, g.Key.TenHH, g.Key.DonViTinh, g.Key.DonGia,
                g.Sum(c => c.SoLuong), g.Sum(c => c.DaDuyet), g.Sum(c => c.DangCho),
                g.Sum(c => c.SoLuong - c.DaDuyet - c.DangCho)))
            .OrderBy(d => d.TenHH).ToList();

    // ================================================================ Bước 6–11 / 9.a: tính và lập phiếu

    public async Task<XemTruocPhieu> XemTruocAsync(YeuCauLapPhieu yc, CancellationToken ct)
    {
        var (_, xem) = await TinhPhieuAsync(yc, ct);
        return xem;
    }

    private sealed record DongPhanBo(DongCTHD Cthd, int SoLuong, HangHoa? HangMoi, int? SoLuongMoi);

    private async Task<(List<DongPhanBo> PhanBo, XemTruocPhieu Xem)> TinhPhieuAsync(YeuCauLapPhieu yc, CancellationToken ct)
    {
        var hd = await db.HoaDon.AsNoTracking().FirstOrDefaultAsync(h => h.MaHD == yc.MaHD, ct)
            ?? throw new LoiNghiepVuException(StatusCodes.Status404NotFound, DichVuBanHang.KhongTimThayHoaDon);
        var (_, loiDieuKien) = KiemTraDieuKien(hd.TrangThai, hd.NgayGioLap);
        if (loiDieuKien is not null) throw new LoiNghiepVuException(StatusCodes.Status409Conflict, loiDieuKien); // 5.a, BR08

        var loai = yc.LoaiPhieu?.Trim();
        if (loai is not (LoaiPhieuDoiTra.TraHang or LoaiPhieuDoiTra.DoiHang))
            throw LoiNghiepVuException.KhongHopLe("Vui lòng chọn hình thức xử lý Trả hàng hoặc Đổi hàng.");
        var doi = loai == LoaiPhieuDoiTra.DoiHang;
        var yeuCau = (yc.Dong ?? []).Where(d => !QuyTac.Trong(d.MaHH)).ToList();
        if (yeuCau.Count == 0) throw LoiNghiepVuException.KhongHopLe("Vui lòng chọn mặt hàng cần đổi trả.");
        if (yeuCau.GroupBy(d => d.MaHH!.Trim()).Any(g => g.Count() > 1))
            throw LoiNghiepVuException.KhongHopLe("Mỗi mặt hàng chỉ chọn một lần.");

        var cthd = await DongCTHDAsync(hd.MaHD, ct);
        var kt = new BoKiemTra();
        var phanBo = new List<DongPhanBo>();
        foreach (var d in yeuCau)
        {
            var ma = d.MaHH!.Trim();
            var cacDong = cthd.Where(c => c.MaHH == ma).ToList();
            if (cacDong.Count == 0) throw LoiNghiepVuException.KhongHopLe($"Mặt hàng {ma} không có trên hóa đơn.");
            var conLai = cacDong.Sum(c => c.SoLuong - c.DaDuyet - c.DangCho);
            // 6.a, BR02
            if (d.SoLuong <= 0 || d.SoLuong > conLai)
            {
                kt.Kiem($"soLuong.{ma}", false, $"Số lượng trả không hợp lệ. Số lượng còn được đổi trả: {conLai}.");
                continue;
            }

            // Phân bổ số lượng trả vào các dòng (lô) của hóa đơn gốc theo thứ tự dòng.
            var canTra = d.SoLuong;
            var dauTien = true;
            foreach (var c in cacDong)
            {
                var con = c.SoLuong - c.DaDuyet - c.DangCho;
                if (con <= 0 || canTra == 0) continue;
                var lay = Math.Min(con, canTra);
                canTra -= lay;
                phanBo.Add(new DongPhanBo(c, lay, null, dauTien && doi ? d.SoLuongMoi : null));
                dauTien = false;
            }
        }
        kt.NemNeuCoLoi();

        // 9.a: hàng mới – giá niêm yết hiện tại (BR05), phải đủ tồn kho lúc lập phiếu (BR06).
        if (doi)
        {
            if (yeuCau.Any(d => QuyTac.Trong(d.MaHHMoi) || d.SoLuongMoi is null or <= 0))
                throw LoiNghiepVuException.KhongHopLe("Vui lòng chọn hàng mới và số lượng đổi cho từng mặt hàng.");
            var maMoi = yeuCau.Select(d => d.MaHHMoi!.Trim()).Distinct().ToList();
            var hangMoi = await db.HangHoa.AsNoTracking()
                .Where(h => maMoi.Contains(h.MaHH) && h.TrangThai == TrangThaiHangHoa.DangKinhDoanh)
                .ToDictionaryAsync(h => h.MaHH, ct);
            var homNay = dongHo.HomNay;
            var ton = await db.LoHang.AsNoTracking()
                .Where(l => maMoi.Contains(l.MaHH) && l.HanSuDung >= homNay && l.SoLuongTon > 0)
                .GroupBy(l => l.MaHH).Select(g => new { g.Key, Ton = g.Sum(l => l.SoLuongTon) })
                .ToDictionaryAsync(x => x.Key, x => x.Ton, ct);
            foreach (var g in yeuCau.GroupBy(d => d.MaHHMoi!.Trim()))
            {
                if (!hangMoi.TryGetValue(g.Key, out var h))
                    throw LoiNghiepVuException.KhongHopLe($"Hàng mới {g.Key} không còn kinh doanh.");
                var can = g.Sum(x => x.SoLuongMoi!.Value);
                var co = ton.GetValueOrDefault(g.Key);
                if (can > co) // 9.b.2.a
                    throw new LoiNghiepVuException(StatusCodes.Status409Conflict,
                        $"Hàng mới không đủ tồn kho. Yêu cầu {can} {h.DonViTinh}, tồn hiện có {co} {h.DonViTinh}.",
                        duLieuThem: new Dictionary<string, object?> { ["maHH"] = h.MaHH, ["tonHienCo"] = co });
            }
            for (var i = 0; i < phanBo.Count; i++)
                if (phanBo[i].SoLuongMoi is not null)
                    phanBo[i] = phanBo[i] with { HangMoi = hangMoi[yeuCau.First(d => d.MaHH!.Trim() == phanBo[i].Cthd.MaHH).MaHHMoi!.Trim()] };
        }

        var dongXem = phanBo.GroupBy(p => p.Cthd.MaHH).Select(g =>
        {
            var c = g.First().Cthd;
            var moi = g.FirstOrDefault(p => p.HangMoi is not null);
            return new DongPhieuDoiTra(c.MaHH, c.TenHH, c.DonViTinh, g.Sum(p => p.SoLuong), g.Sum(p => p.SoLuong * p.Cthd.DonGia),
                moi?.HangMoi?.MaHH, moi?.HangMoi?.TenHH, moi?.HangMoi?.DonViTinh, moi?.SoLuongMoi, moi?.HangMoi?.GiaBan,
                moi is null ? null : moi.HangMoi!.GiaBan * moi.SoLuongMoi!.Value);
        }).ToList();
        var soTienHoan = dongXem.Sum(d => d.GiaTriHoan);       // BR04
        var giaTriMoi = dongXem.Sum(d => d.GiaTriHangMoi ?? 0);
        var chenhLech = doi ? giaTriMoi - soTienHoan : 0;     // BR05
        var (hoan, thu) = TienCuaPhieu(loai, soTienHoan, chenhLech);
        return (phanBo, new XemTruocPhieu(loai, dongXem, soTienHoan, giaTriMoi, chenhLech, hoan, thu));
    }

    private static (decimal TienHoanKhach, decimal CanThuThem) TienCuaPhieu(string loai, decimal soTienHoan, decimal chenhLech) =>
        loai == LoaiPhieuDoiTra.TraHang ? (soTienHoan, 0) : (Math.Max(0, -chenhLech), Math.Max(0, chenhLech));

    /// <summary>Bước 7–8 (BR03, BR10): kết quả kiểm tra tình trạng hàng.</summary>
    private static (string TinhTrang, string? MoTaLoi) KiemTraTinhTrang(YeuCauLapPhieu yc)
    {
        var chon = (yc.TinhTrang ?? []).Select(x => x.Trim()).Where(x => TinhTrangDat.Contains(x)).Distinct().ToList();
        if (yc.LoiNhaSanXuat)
        {
            var moTa = QuyTac.ChuanHoa(yc.MoTaLoi ?? "");
            if (moTa.Length == 0) throw LoiNghiepVuException.TheoTruong("moTaLoi", "Vui lòng ghi rõ mô tả lỗi do nhà sản xuất.");
            if (moTa.Length > 255) throw LoiNghiepVuException.TheoTruong("moTaLoi", "Mô tả lỗi tối đa 255 ký tự.");
            return (string.Join(", ", chon.Append(TinhTrangLoiNsx)), moTa);
        }
        if (chon.Count < TinhTrangDat.Length) throw new LoiNghiepVuException(StatusCodes.Status409Conflict, HangKhongDuDieuKien); // 8.b
        return (string.Join(", ", chon), null);
    }

    public async Task<PhieuDoiTraDto> LapPhieuAsync(YeuCauLapPhieu yc, CancellationToken ct)
    {
        var (tinhTrang, moTaLoi) = KiemTraTinhTrang(yc);
        var lyDo = QuyTac.ChuanHoa(yc.LyDoDoiTra ?? "");
        if (lyDo.Length == 0) throw LoiNghiepVuException.TheoTruong("lyDoDoiTra", "Vui lòng nhập lý do đổi trả.");
        if (lyDo.Length > 255) throw LoiNghiepVuException.TheoTruong("lyDoDoiTra", "Lý do đổi trả tối đa 255 ký tự.");

        // Tuần tự: hai người cùng lập phiếu trên một hóa đơn không vượt số lượng còn đổi trả.
        await using var tx = await db.MoGiaoDichTuanTuAsync(ct);
        var (phanBo, xem) = await TinhPhieuAsync(yc, ct);
        var phieu = new PhieuDoiTra
        {
            MaPDT = await sinhMa.SinhMaAsync(LoaiMa.PhieuDoiTra, ct),
            LoaiPhieu = xem.LoaiPhieu,
            NgayGioLap = dongHo.BayGio,
            LyDoDoiTra = lyDo,
            TrangThai = TrangThaiPhieuDoiTra.ChoDuyet, // bước 11 / 9.a.4
            SoTienHoan = xem.SoTienHoan,
            ChenhLech = xem.ChenhLech,
            MaHD = yc.MaHD!,
            MaND = hienTai.MaND!,
        };
        foreach (var p in phanBo)
            phieu.ChiTiet.Add(new ChiTietDoiTra
            {
                MaCTHD = p.Cthd.MaCTHD,
                SoLuongTra = p.SoLuong,
                GiaTriHoan = p.SoLuong * p.Cthd.DonGia,
                TinhTrangHang = tinhTrang,
                LoiNhaSanXuat = yc.LoiNhaSanXuat,
                MoTaLoi = moTaLoi,
                MaHHMoi = p.HangMoi?.MaHH,
                SoLuongMoi = p.HangMoi is null ? null : p.SoLuongMoi,
                GiaTriHangMoi = p.HangMoi is null ? null : p.HangMoi.GiaBan * p.SoLuongMoi!.Value,
            });
        db.PhieuDoiTra.Add(phieu);
        await db.SaveChangesAsync(ct);
        await tx.CommitAsync(ct);
        return await PhieuAsync(phieu.MaPDT, ct);
    }

    // ================================================================ Xem phiếu, danh sách

    public async Task<PhieuDoiTraDto> PhieuAsync(string? maPDT, CancellationToken ct)
    {
        var p = await db.PhieuDoiTra.AsNoTracking()
            .Include(x => x.NguoiDung).Include(x => x.ChuQuan)
            .Include(x => x.HoaDon).ThenInclude(h => h.ThanhToanNgay!).ThenInclude(t => t.KhachHang)
            .Include(x => x.HoaDon).ThenInclude(h => h.GhiNo!).ThenInclude(n => n.KhachQuen).ThenInclude(k => k.KhachHang)
            .Include(x => x.ChiTiet).ThenInclude(c => c.ChiTietHoaDon).ThenInclude(c => c.HangHoa)
            .Include(x => x.ChiTiet).ThenInclude(c => c.HangHoaMoi)
            .FirstOrDefaultAsync(x => x.MaPDT == maPDT, ct)
            ?? throw new LoiNghiepVuException(StatusCodes.Status404NotFound, "Không tìm thấy phiếu đổi trả.");
        var daThu = await DaThuThemAsync(p.MaPDT, ct);
        var dong = p.ChiTiet.GroupBy(c => c.ChiTietHoaDon.MaHH).Select(g =>
        {
            var h = g.First().ChiTietHoaDon.HangHoa;
            var moi = g.FirstOrDefault(c => c.MaHHMoi is not null);
            return new DongPhieuDoiTra(h.MaHH, h.TenHH, h.DonViTinh, g.Sum(c => c.SoLuongTra), g.Sum(c => c.GiaTriHoan),
                moi?.MaHHMoi, moi?.HangHoaMoi?.TenHH, moi?.HangHoaMoi?.DonViTinh, moi?.SoLuongMoi,
                moi is null ? null : moi.GiaTriHangMoi / moi.SoLuongMoi, moi?.GiaTriHangMoi);
        }).OrderBy(d => d.TenHH).ToList();
        var (hoan, thu) = TienCuaPhieu(p.LoaiPhieu, p.SoTienHoan, p.ChenhLech);
        var dau = p.ChiTiet.FirstOrDefault();
        var kh = p.HoaDon.ThanhToanNgay?.KhachHang ?? p.HoaDon.GhiNo?.KhachQuen.KhachHang;
        return new PhieuDoiTraDto(p.MaPDT, p.MaHD, kh?.HoTen, p.LoaiPhieu, p.NgayGioLap,
            p.MaND, p.NguoiDung.HoTen, TenVaiTro(p.NguoiDung), p.LyDoDoiTra, dau?.TinhTrangHang ?? "", dau?.MoTaLoi,
            dong, p.SoTienHoan, dong.Sum(d => d.GiaTriHangMoi ?? 0), p.ChenhLech, hoan, thu,
            p.TrangThai, TrangThaiXuLy(p, daThu), p.LyDoTuChoi, p.NgayGioDuyet, p.ChuQuan?.HoTen, p.NgayGioHoanTat, daThu);
    }

    private static string TenVaiTro(NguoiDung nd) => nd is ChuQuan ? "Chủ quán" : "Nhân viên";

    /// <summary>Trạng thái xử lý hiển thị trên các màn hình 6.2.17–6.2.38.</summary>
    private static string TrangThaiXuLy(PhieuDoiTra p, bool daThuThem) => p.TrangThai switch
    {
        TrangThaiPhieuDoiTra.ChoDuyet => "Chờ kết quả",
        TrangThaiPhieuDoiTra.TuChoi or TrangThaiPhieuDoiTra.KhongHoanTat => "Kết thúc",
        _ when p.NgayGioHoanTat is not null => "Hoàn tất",
        _ when p.LoaiPhieu == LoaiPhieuDoiTra.TraHang => "Chờ hoàn tiền",
        _ when p.ChenhLech > 0 && !daThuThem => "Chờ thu thêm",
        _ when p.ChenhLech < 0 => "Chờ hoàn chênh lệch",
        _ => "Chờ cập nhật kho",
    };

    private Task<bool> DaThuThemAsync(string maPDT, CancellationToken ct) =>
        db.PhieuThanhToan.AnyAsync(t => t.MaPDT == maPDT && t.HuongTien == HuongTienTe.Thu
            && t.TrangThai == TrangThaiPhieuThanhToan.ThanhCong, ct);

    /// <summary>
    /// UC_6.4 bước 2 + BR09: mặc định phiếu "Chờ duyệt", mới nhất trước.
    /// <paramref name="dangXuLy"/>: phiếu chờ duyệt hoặc đã duyệt chưa hoàn tất (màn hình Xử lý đổi trả).
    /// </summary>
    public async Task<List<PhieuDoiTraDong>> DanhSachAsync(string? trangThai, bool dangXuLy, bool chiCuaToi, CancellationToken ct)
    {
        var q = db.PhieuDoiTra.AsNoTracking();
        if (dangXuLy)
            q = q.Where(p => p.TrangThai == TrangThaiPhieuDoiTra.ChoDuyet
                || (p.TrangThai == TrangThaiPhieuDoiTra.DaDuyet && p.NgayGioHoanTat == null));
        else if (!QuyTac.Trong(trangThai))
        {
            if (!TrangThaiPhieuDoiTra.TatCa.Contains(trangThai)) throw LoiNghiepVuException.KhongHopLe("Trạng thái không hợp lệ.");
            q = q.Where(p => p.TrangThai == trangThai);
        }
        else q = q.Where(p => p.TrangThai == TrangThaiPhieuDoiTra.ChoDuyet);
        if (chiCuaToi) q = q.Where(p => p.MaND == hienTai.MaND);

        var ds = await q.OrderByDescending(p => p.NgayGioLap).ThenByDescending(p => p.MaPDT).Take(200)
            .Select(p => new
            {
                Phieu = p,
                p.NguoiDung,
                TenKhach = p.HoaDon.ThanhToanNgay != null && p.HoaDon.ThanhToanNgay.KhachHang != null ? p.HoaDon.ThanhToanNgay.KhachHang.HoTen
                    : p.HoaDon.GhiNo != null ? p.HoaDon.GhiNo.KhachQuen.KhachHang.HoTen : null,
                DaThu = db.PhieuThanhToan.Any(t => t.MaPDT == p.MaPDT && t.HuongTien == HuongTienTe.Thu
                    && t.TrangThai == TrangThaiPhieuThanhToan.ThanhCong),
            })
            .ToListAsync(ct);
        return ds.Select(x => new PhieuDoiTraDong(x.Phieu.MaPDT, x.Phieu.MaHD, x.TenKhach, x.Phieu.LoaiPhieu,
            x.NguoiDung.HoTen, TenVaiTro(x.NguoiDung), x.Phieu.NgayGioLap, x.Phieu.TrangThai, TrangThaiXuLy(x.Phieu, x.DaThu))).ToList();
    }

    // ================================================================ UC_6.4 Duyệt / từ chối

    public async Task<PhieuDoiTraDto> DuyetAsync(string? maPDT, CancellationToken ct) =>
        await QuyetDinhAsync(maPDT, true, null, ct);

    public async Task<PhieuDoiTraDto> TuChoiAsync(YeuCauTuChoi yc, CancellationToken ct)
    {
        var lyDo = QuyTac.ChuanHoa(yc.LyDo ?? "");
        if (lyDo.Length == 0) throw LoiNghiepVuException.TheoTruong("lyDo", "Vui lòng nhập lý do từ chối."); // 6a3a, BR04
        if (lyDo.Length > 255) throw LoiNghiepVuException.TheoTruong("lyDo", "Lý do từ chối tối đa 255 ký tự.");
        return await QuyetDinhAsync(yc.MaPDT, false, lyDo, ct);
    }

    private async Task<PhieuDoiTraDto> QuyetDinhAsync(string? maPDT, bool duyet, string? lyDo, CancellationToken ct)
    {
        var p = await db.PhieuDoiTra.FirstOrDefaultAsync(x => x.MaPDT == maPDT, ct)
            ?? throw new LoiNghiepVuException(StatusCodes.Status404NotFound, "Không tìm thấy phiếu đổi trả.");
        if (p.TrangThai != TrangThaiPhieuDoiTra.ChoDuyet) // BR02
            throw new LoiNghiepVuException(StatusCodes.Status409Conflict, $"Phiếu đã ở trạng thái \"{p.TrangThai}\", không thể duyệt hoặc từ chối lại.");

        // BR07: lưu người xử lý, thời gian, kết quả (+ lý do). BR05: không sửa nội dung phiếu.
        p.TrangThai = duyet ? TrangThaiPhieuDoiTra.DaDuyet : TrangThaiPhieuDoiTra.TuChoi;
        p.MaCQ = hienTai.MaND!;
        p.NgayGioDuyet = dongHo.BayGio;
        p.LyDoTuChoi = lyDo;
        // Bước 8, BR08: gửi kết quả cho người lập phiếu.
        db.ThongBao.Add(new ThongBao
        {
            MaND = p.MaND,
            LoaiThongBao = "Kết quả duyệt phiếu",
            NoiDung = duyet ? $"Phiếu {p.MaPDT} đã được duyệt. Vui lòng hoàn tất xử lý với khách."
                : $"Phiếu đổi trả bị từ chối. Lý do: {lyDo}.",
            MaThamChieu = p.MaPDT,
            ThoiDiemTao = dongHo.BayGio,
        });
        try
        {
            await db.SaveChangesAsync(ct);
        }
        catch (DbUpdateConcurrencyException)
        {
            db.ChangeTracker.Clear();
            throw new LoiNghiepVuException(StatusCodes.Status409Conflict, "Phiếu vừa được người khác xử lý. Vui lòng tải lại.");
        }
        return await PhieuAsync(p.MaPDT, ct);
    }

    // ================================================================ UC_6.2 bước 14–17 / 14.a: hoàn tất sau khi duyệt

    /// <summary>
    /// Phiếu trả: xác nhận đã hoàn tiền → cộng kho. Phiếu đổi: thu thêm (tiền mặt / QR) nếu chênh lệch &gt; 0,
    /// hoàn chênh lệch nếu &lt; 0; rồi cộng hàng cũ, trừ hàng mới. Khoản thu thêm được giữ nếu cập nhật kho lỗi (16.a).
    /// </summary>
    public async Task<PhieuDoiTraDto> XuLyAsync(YeuCauXuLyPhieu yc, CancellationToken ct)
    {
        var maND = hienTai.MaND!;
        await dichVuCa.KiemTraKhongDangKetCaAsync(ct); // UC_9.1 BR07
        var p = await db.PhieuDoiTra.AsNoTracking().FirstOrDefaultAsync(x => x.MaPDT == yc.MaPDT, ct)
            ?? throw new LoiNghiepVuException(StatusCodes.Status404NotFound, "Không tìm thấy phiếu đổi trả.");
        KiemTraChoXuLy(p);

        // 14.a.4–14.a.7: thu thêm chênh lệch (giao dịch riêng – khoản thu giữ lại nếu bước sau lỗi).
        if (p.ChenhLech > 0 && !await DaThuThemAsync(p.MaPDT, ct))
        {
            var phuongThuc = yc.PhuongThuc?.Trim();
            if (phuongThuc is not (PhuongThucThanhToan.TienMat or PhuongThucThanhToan.ChuyenKhoanQr))
                throw LoiNghiepVuException.KhongHopLe("Vui lòng chọn hình thức thu Tiền mặt hoặc Chuyển khoản QR."); // 14.a.5
            var thanhCong = phuongThuc == PhuongThucThanhToan.TienMat || yc.KetQuaQrGiaLap == "ThanhCong";
            await using var txThu = await db.MoGiaoDichTuanTuAsync(ct); // sinh mã PTT cần transaction
            if (await DaThuThemAsync(p.MaPDT, ct)) // hai người cùng bấm: không thu hai lần
                throw new LoiNghiepVuException(StatusCodes.Status409Conflict, "Khoản chênh lệch đã được thu. Vui lòng tải lại phiếu.");
            db.PhieuThanhToan.Add(new PhieuThanhToan
            {
                MaPTT = await sinhMa.SinhMaAsync(LoaiMa.PhieuThanhToan, ct),
                NgayGio = dongHo.BayGio,
                LoaiPhieu = LoaiPhieuThanhToan.DoiTra,
                HuongTien = HuongTienTe.Thu,
                SoTien = p.ChenhLech,
                PhuongThuc = phuongThuc,
                TrangThai = thanhCong ? TrangThaiPhieuThanhToan.ThanhCong : TrangThaiPhieuThanhToan.KhongThanhCong,
                MaGiaoDichNganHang = phuongThuc == PhuongThucThanhToan.ChuyenKhoanQr
                    ? $"QR{dongHo.BayGio:yyyyMMddHHmmss}{Random.Shared.Next(100, 999)}" : null,
                MaND = maND,
                MaPDT = p.MaPDT,
            });
            await db.SaveChangesAsync(ct);
            await txThu.CommitAsync(ct);
            if (!thanhCong) // 14.a.7.3.a.1
                throw new LoiNghiepVuException(StatusCodes.Status402PaymentRequired, "Thanh toán chưa thành công");
        }

        try
        {
            await using var tx = await db.MoGiaoDichTuanTuAsync(ct);
            var phieu = await db.PhieuDoiTra
                .Include(x => x.ChiTiet).ThenInclude(c => c.ChiTietHoaDon).ThenInclude(c => c.LoHang).ThenInclude(l => l.HangHoa)
                .Include(x => x.ChiTiet).ThenInclude(c => c.HangHoaMoi)
                .FirstAsync(x => x.MaPDT == p.MaPDT, ct);
            KiemTraChoXuLy(phieu); // kiểm tra lại trong giao dịch (hai người cùng bấm)

            // Bước 14 / 14.a.3: hoàn tiền cho khách (thực hiện ngoài hệ thống, ghi nhận khoản chi).
            var (hoan, _) = TienCuaPhieu(phieu.LoaiPhieu, phieu.SoTienHoan, phieu.ChenhLech);
            if (hoan > 0)
                db.PhieuThanhToan.Add(new PhieuThanhToan
                {
                    MaPTT = await sinhMa.SinhMaAsync(LoaiMa.PhieuThanhToan, ct),
                    NgayGio = dongHo.BayGio,
                    LoaiPhieu = LoaiPhieuThanhToan.DoiTra,
                    HuongTien = HuongTienTe.Chi,
                    SoTien = hoan,
                    PhuongThuc = PhuongThucThanhToan.TienMat,
                    MaND = maND,
                    MaPDT = phieu.MaPDT,
                });

            // Bước 16 / BR06: cộng lại hàng trả vào đúng lô đã bán; đổi hàng thì trừ hàng mới theo FEFO.
            foreach (var c in phieu.ChiTiet)
            {
                var lo = c.ChiTietHoaDon.LoHang;
                lo.SoLuongTon += c.SoLuongTra;
                await canhBao.DongCanhBaoHangKhiDuHangAsync(lo, lo.HangHoa, ct);
                await canhBao.DanhGiaLoAsync(lo, lo.HangHoa, xetHang: true, xetHan: true, capNhatNeuDaCo: true, ct);
            }
            foreach (var c in phieu.ChiTiet.Where(c => c.MaHHMoi is not null))
                c.MaLoMoi = await XuatHangMoiAsync(c.HangHoaMoi!, c.SoLuongMoi!.Value, ct);

            phieu.NgayGioHoanTat = dongHo.BayGio; // bước 17
            await db.SaveChangesAsync(ct);
            await tx.CommitAsync(ct);
        }
        catch (LoiNghiepVuException)
        {
            db.ChangeTracker.Clear();
            throw;
        }
        catch (DbUpdateException)
        {
            // 16.a.1: hoàn tác cập nhật kho; khoản đã thu thành công vẫn giữ nguyên.
            db.ChangeTracker.Clear();
            throw new LoiNghiepVuException(StatusCodes.Status409Conflict, CapNhatKhongThanhCong);
        }
        return await PhieuAsync(p.MaPDT, ct);
    }

    private static void KiemTraChoXuLy(PhieuDoiTra p)
    {
        // BR07 + UC_6.4 BR06: chỉ phiếu "Đã duyệt" mới được hoàn tiền / thu thêm / cập nhật kho.
        if (p.TrangThai != TrangThaiPhieuDoiTra.DaDuyet)
            throw new LoiNghiepVuException(StatusCodes.Status409Conflict,
                p.TrangThai == TrangThaiPhieuDoiTra.ChoDuyet ? "Phiếu chưa được Chủ quán duyệt." : $"Phiếu đã ở trạng thái \"{p.TrangThai}\".");
        if (p.NgayGioHoanTat is not null)
            throw new LoiNghiepVuException(StatusCodes.Status409Conflict, "Phiếu đã được xử lý hoàn tất.");
    }

    /// <summary>Xuất hàng mới theo FEFO (chỉ lô còn hạn). Trả về lô đầu tiên đã xuất.</summary>
    private async Task<string> XuatHangMoiAsync(HangHoa h, int soLuong, CancellationToken ct)
    {
        var homNay = dongHo.HomNay;
        var cacLo = await db.LoHang.Where(l => l.MaHH == h.MaHH && l.HanSuDung >= homNay && l.SoLuongTon > 0)
            .OrderBy(l => l.HanSuDung).ThenBy(l => l.MaLo).ToListAsync(ct);
        var can = soLuong;
        string? dau = null;
        foreach (var lo in cacLo)
        {
            if (can == 0) break;
            var lay = Math.Min(can, lo.SoLuongTon);
            lo.SoLuongTon -= lay;
            can -= lay;
            dau ??= lo.MaLo;
            await canhBao.DanhGiaLoAsync(lo, h, xetHang: true, xetHan: false, capNhatNeuDaCo: true, ct);
        }
        if (can > 0)
            throw new LoiNghiepVuException(StatusCodes.Status409Conflict,
                $"{CapNhatKhongThanhCong}. Hàng mới không đủ tồn kho. Yêu cầu {soLuong} {h.DonViTinh}, tồn hiện có {soLuong - can} {h.DonViTinh}.",
                duLieuThem: new Dictionary<string, object?> { ["maHH"] = h.MaHH });
        return dau!;
    }

    /// <summary>14.a.7.3.a.3: không thanh toán lại → phiếu "Không hoàn tất".</summary>
    public async Task<PhieuDoiTraDto> KhongHoanTatAsync(string? maPDT, CancellationToken ct)
    {
        var p = await db.PhieuDoiTra.FirstOrDefaultAsync(x => x.MaPDT == maPDT, ct)
            ?? throw new LoiNghiepVuException(StatusCodes.Status404NotFound, "Không tìm thấy phiếu đổi trả.");
        KiemTraChoXuLy(p);
        if (p.ChenhLech <= 0 || await DaThuThemAsync(p.MaPDT, ct))
            throw new LoiNghiepVuException(StatusCodes.Status409Conflict, "Chỉ phiếu đổi hàng chưa thu được tiền chênh lệch mới chuyển sang Không hoàn tất.");
        p.TrangThai = TrangThaiPhieuDoiTra.KhongHoanTat;
        await db.SaveChangesAsync(ct);
        return await PhieuAsync(p.MaPDT, ct);
    }
}
