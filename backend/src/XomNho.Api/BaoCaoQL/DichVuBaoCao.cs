using System.Globalization;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using XomNho.Api.Common;
using XomNho.Api.Data;
using XomNho.Api.Domain;

namespace XomNho.Api.BaoCaoQL;

// ------------------------------------------------------------------ DTO

public sealed record DongLoiNhuan(string MaHH, string TenHH, decimal DoanhThu, decimal GiaVon, decimal LoiNhuan);

/// <summary>Màn hình 5.1.9.</summary>
public sealed record BaoCaoLoiNhuan(
    DateOnly TuNgay, DateOnly DenNgay, decimal TongDoanhThu, decimal TongGiaVon, decimal TongLoiNhuan, IReadOnlyList<DongLoiNhuan> Dong);

public sealed record DongDoanhThu(string MaHH, string TenHH, decimal DoanhThu);

/// <summary>Màn hình 5.2.9 – doanh thu theo phương thức thanh toán: tiền mặt, chuyển khoản, ghi nợ (UC_5.2 bước 7).</summary>
public sealed record BaoCaoDoanhThu(
    DateOnly TuNgay, DateOnly DenNgay, decimal TongDoanhThu, int SoDonHang,
    decimal TienMat, decimal ChuyenKhoan, decimal GhiNo, IReadOnlyList<DongDoanhThu> Dong);

public sealed record DongSoLuongBan(string MaHH, string TenHH, string NhomHang, string DonViTinh, int SoLuongBan);

/// <summary>Màn hình 5.3.9, 5.3.11, 5.3.12. <see cref="Top"/> = null (toàn bộ), "chay" hoặc "cham".</summary>
public sealed record BaoCaoSoLuongBan(DateOnly TuNgay, DateOnly DenNgay, string? Top, int? SoLuong, IReadOnlyList<DongSoLuongBan> Dong);

/// <summary>Màn hình 5.1.20, 5.2.20 – một dòng chỉ tiêu. Tỷ lệ = null khi chỉ tiêu kỳ so sánh bằng 0.</summary>
public sealed record KetQuaSoSanh(
    string ChiTieu, DateOnly TuNgay, DateOnly DenNgay, DateOnly TuNgaySoSanh, DateOnly DenNgaySoSanh,
    decimal KyBaoCao, decimal KySoSanh, decimal ChenhLech, decimal? TyLe);

public sealed record DongTonKho(string MaLo, string MaHH, string TenHH, string DonViTinh, int SoLuongTon, DateOnly HanSuDung, IReadOnlyList<string> TrangThai);

/// <summary>Màn hình 5.4.1 – tính tại thời điểm xem (BR03), chỉ đọc (BR06).</summary>
public sealed record BaoCaoTonKho(string TrangThai, DateOnly NgayXem, IReadOnlyList<DongTonKho> Dong);

public readonly record struct KyBaoCao(DateOnly TuNgay, DateOnly DenNgay)
{
    public bool GiaoNhau(KyBaoCao khac) => TuNgay <= khac.DenNgay && khac.TuNgay <= DenNgay;
}

/// <summary>
/// UC_5.1–5.4 Xem báo cáo và thống kê (chỉ Chủ quán). Theo SUA_BAO_CAO 3.9–3.12:
/// <list type="bullet">
/// <item>Hóa đơn "Đã thanh toán" và "Còn nợ" lập trong kỳ được tính theo ngày lập (BR05: ghi nợ tính theo ngày tạo đơn); "Đã hủy" không tính.</item>
/// <item>Phiếu đổi trả đã duyệt và xử lý hoàn tất được tính vào kỳ chứa ngày duyệt (Q19, UC_6.2 BR06):
/// trừ giá trị và giá vốn hàng trả, cộng giá trị và giá vốn hàng mới của phiếu đổi hàng.</item>
/// <item>Giá vốn = giá nhập lưu tại thời điểm bán / xuất hàng (Q20).</item>
/// </list>
/// </summary>
public sealed class DichVuBaoCao(XomNhoDbContext db, IDongHo dongHo)
{
    public const string KhongDeTrong = "Không được để trống!";
    public const string NgayBatDauLonHon = "Ngày bắt đầu không được lớn hơn ngày kết thúc!";
    public const string VuotNgayHienTai = "Kỳ báo cáo không được vượt quá ngày hiện tại!";
    public const string KhongCoDuLieu = "Không tìm thấy dữ liệu bán hàng!";
    public const string KhongCoDuLieuKySoSanh = "Không tìm thấy dữ liệu của kỳ so sánh!";
    public const string TrungKy = "Kỳ so sánh không được trùng kỳ báo cáo!";
    public const string KhongCoSanPham = "Không có sản phẩm phù hợp!";
    public const string ConHang = "Còn hàng";

    private static readonly StringComparer SoSanhTen = StringComparer.Create(new CultureInfo("vi-VN"), ignoreCase: true);

    // ================================================================ Kỳ báo cáo

    /// <summary>3a, 4a, BR01 (SUA_BAO_CAO 3.9–3.11: bắt đầu ≤ kết thúc, không vượt quá ngày hiện tại – Q21).</summary>
    public KyBaoCao DocKy(string? tuNgay, string? denNgay, string truongTu = "tuNgay", string truongDen = "denNgay")
    {
        var kt = new BoKiemTra();
        DateOnly tu = default, den = default;
        if (QuyTac.Trong(tuNgay)) kt.Kiem(truongTu, false, KhongDeTrong);
        else kt.Kiem(truongTu, QuyTac.DocNgay(tuNgay, out tu), "Ngày không hợp lệ (dd/mm/yyyy).");
        if (QuyTac.Trong(denNgay)) kt.Kiem(truongDen, false, KhongDeTrong);
        else kt.Kiem(truongDen, QuyTac.DocNgay(denNgay, out den), "Ngày không hợp lệ (dd/mm/yyyy).");
        if (!kt.CoLoi)
        {
            kt.Kiem(truongTu, tu <= den, NgayBatDauLonHon);
            if (!kt.CoLoi) kt.Kiem(truongDen, den <= dongHo.HomNay, VuotNgayHienTai);
        }
        kt.NemNeuCoLoi();
        return new KyBaoCao(tu, den);
    }

    // ================================================================ Tổng hợp số liệu một kỳ

    private sealed class SoLieuHang
    {
        public decimal DoanhThu;
        public decimal GiaVon;
        public int SoLuong;
    }

    private sealed class SoLieuKy
    {
        public int SoDonHang;
        public int SoPhieuDoiTra;
        public decimal TienMat;
        public decimal ChuyenKhoan;
        public decimal GhiNo;
        public Dictionary<string, SoLieuHang> TheoHang { get; } = [];

        /// <summary>5a / 13a: kỳ không có hóa đơn và không có phiếu đổi trả được tính vào kỳ.</summary>
        public bool CoDuLieu => SoDonHang > 0 || SoPhieuDoiTra > 0;
        public decimal DoanhThu => TheoHang.Values.Sum(h => h.DoanhThu);
        public decimal GiaVon => TheoHang.Values.Sum(h => h.GiaVon);
        public decimal LoiNhuan => DoanhThu - GiaVon; // UC_5.1 BR02

        public SoLieuHang Hang(string maHH)
        {
            if (!TheoHang.TryGetValue(maHH, out var h)) TheoHang[maHH] = h = new SoLieuHang();
            return h;
        }

        public void CongTien(string phuongThuc, decimal soTien)
        {
            switch (phuongThuc)
            {
                case PhuongThucThanhToan.ChuyenKhoanQr: ChuyenKhoan += soTien; break;
                case PhuongThucThanhToan.GhiNo: GhiNo += soTien; break;
                default: TienMat += soTien; break;
            }
        }
    }

    private async Task<SoLieuKy> TongHopAsync(KyBaoCao ky, CancellationToken ct)
    {
        var tu = ky.TuNgay.ToDateTime(TimeOnly.MinValue);
        var den = ky.DenNgay.AddDays(1).ToDateTime(TimeOnly.MinValue);
        var kq = new SoLieuKy();

        // Hóa đơn hoàn tất lập trong kỳ (BR03, BR05).
        var hoaDon = await db.HoaDon.AsNoTracking()
            .Where(h => h.TrangThai != TrangThaiHoaDon.DaHuy && h.NgayGioLap >= tu && h.NgayGioLap < den)
            .Select(h => new { h.MaHD, h.TongTien, LaNo = h.GhiNo != null })
            .ToListAsync(ct);
        kq.SoDonHang = hoaDon.Count;
        if (hoaDon.Count > 0)
        {
            var maHD = hoaDon.Select(h => h.MaHD).ToList();
            var phuongThuc = (await db.PhieuThanhToan.AsNoTracking()
                    .Where(p => p.MaHDTTN != null && maHD.Contains(p.MaHDTTN)
                        && p.LoaiPhieu == LoaiPhieuThanhToan.BanHang && p.TrangThai == TrangThaiPhieuThanhToan.ThanhCong)
                    .Select(p => new { p.MaHDTTN, p.PhuongThuc })
                    .ToListAsync(ct))
                .GroupBy(p => p.MaHDTTN!).ToDictionary(g => g.Key, g => g.First().PhuongThuc);
            foreach (var h in hoaDon)
                kq.CongTien(h.LaNo ? PhuongThucThanhToan.GhiNo : phuongThuc.GetValueOrDefault(h.MaHD, PhuongThucThanhToan.TienMat), h.TongTien);

            var dongBan = await db.ChiTietHoaDon.AsNoTracking()
                .Where(c => maHD.Contains(c.MaHD))
                .Select(c => new { c.MaHH, c.SoLuong, c.DonGia, c.GiaVon })
                .ToListAsync(ct);
            foreach (var c in dongBan)
            {
                var h = kq.Hang(c.MaHH);
                h.SoLuong += c.SoLuong;
                h.DoanhThu += c.SoLuong * c.DonGia;
                h.GiaVon += c.SoLuong * c.GiaVon;
            }
        }

        // Phiếu đổi trả đã duyệt, đã hoàn/thu tiền và cập nhật kho, có ngày duyệt trong kỳ (Q19).
        var phieu = await db.PhieuDoiTra.AsNoTracking()
            .Where(p => p.TrangThai == TrangThaiPhieuDoiTra.DaDuyet && p.NgayGioHoanTat != null
                && p.NgayGioDuyet >= tu && p.NgayGioDuyet < den)
            .Select(p => p.MaPDT)
            .ToListAsync(ct);
        kq.SoPhieuDoiTra = phieu.Count;
        if (phieu.Count > 0)
        {
            var dongDoiTra = await db.ChiTietDoiTra.AsNoTracking()
                .Where(c => phieu.Contains(c.MaPDT))
                .Select(c => new
                {
                    c.ChiTietHoaDon.MaHH, c.SoLuongTra, c.GiaTriHoan, GiaVonTra = c.ChiTietHoaDon.GiaVon,
                    c.MaHHMoi, c.SoLuongMoi, c.GiaTriHangMoi, c.GiaVonHangMoi,
                })
                .ToListAsync(ct);
            // Phiếu hoàn tất trước khi có cột GiaVonHangMoi: dùng giá nhập hiện tại của hàng mới.
            var giaNhap = await db.HangHoa.AsNoTracking().ToDictionaryAsync(h => h.MaHH, h => h.GiaNhap, ct);
            foreach (var c in dongDoiTra)
            {
                var tra = kq.Hang(c.MaHH);
                tra.SoLuong -= c.SoLuongTra;
                tra.DoanhThu -= c.GiaTriHoan;
                tra.GiaVon -= c.SoLuongTra * c.GiaVonTra;
                if (c.MaHHMoi is null) continue;
                var moi = kq.Hang(c.MaHHMoi);
                moi.SoLuong += c.SoLuongMoi ?? 0;
                moi.DoanhThu += c.GiaTriHangMoi ?? 0;
                moi.GiaVon += (c.SoLuongMoi ?? 0) * (c.GiaVonHangMoi ?? giaNhap.GetValueOrDefault(c.MaHHMoi));
            }

            // Tiền hoàn cho khách / thu thêm của phiếu, theo phương thức thực tế.
            var tien = await db.PhieuThanhToan.AsNoTracking()
                .Where(p => p.MaPDT != null && phieu.Contains(p.MaPDT) && p.TrangThai == TrangThaiPhieuThanhToan.ThanhCong)
                .Select(p => new { p.PhuongThuc, p.HuongTien, p.SoTien })
                .ToListAsync(ct);
            foreach (var p in tien)
                kq.CongTien(p.PhuongThuc, p.HuongTien == HuongTienTe.Chi ? -p.SoTien : p.SoTien);
        }
        return kq;
    }

    private async Task<SoLieuKy> TongHopCoDuLieuAsync(KyBaoCao ky, string thongBaoKhongCo, CancellationToken ct)
    {
        var s = await TongHopAsync(ky, ct);
        if (!s.CoDuLieu) throw new LoiNghiepVuException(StatusCodes.Status404NotFound, thongBaoKhongCo); // 5a, 13a
        return s;
    }

    private sealed record ThongTinHang(string MaHH, string TenHH, string NhomHang, string DonViTinh, bool DangKinhDoanh);

    private async Task<Dictionary<string, ThongTinHang>> ThongTinHangAsync(CancellationToken ct) =>
        await db.HangHoa.AsNoTracking()
            .Select(h => new ThongTinHang(h.MaHH, h.TenHH, h.DanhMuc.TenDM, h.DonViTinh, h.TrangThai == TrangThaiHangHoa.DangKinhDoanh))
            .ToDictionaryAsync(h => h.MaHH, ct);

    // ================================================================ UC_5.1

    public async Task<BaoCaoLoiNhuan> LoiNhuanAsync(string? tuNgay, string? denNgay, CancellationToken ct)
    {
        var ky = DocKy(tuNgay, denNgay);
        var s = await TongHopCoDuLieuAsync(ky, KhongCoDuLieu, ct);
        var hang = await ThongTinHangAsync(ct);
        var dong = s.TheoHang
            .Select(x => new DongLoiNhuan(x.Key, hang[x.Key].TenHH, x.Value.DoanhThu, x.Value.GiaVon, x.Value.DoanhThu - x.Value.GiaVon))
            .OrderByDescending(d => d.LoiNhuan).ThenBy(d => d.TenHH, SoSanhTen)
            .ToList();
        return new BaoCaoLoiNhuan(ky.TuNgay, ky.DenNgay, s.DoanhThu, s.GiaVon, s.LoiNhuan, dong);
    }

    // ================================================================ UC_5.2

    public async Task<BaoCaoDoanhThu> DoanhThuAsync(string? tuNgay, string? denNgay, CancellationToken ct)
    {
        var ky = DocKy(tuNgay, denNgay);
        var s = await TongHopCoDuLieuAsync(ky, KhongCoDuLieu, ct);
        var hang = await ThongTinHangAsync(ct);
        var dong = s.TheoHang
            .Select(x => new DongDoanhThu(x.Key, hang[x.Key].TenHH, x.Value.DoanhThu))
            .OrderByDescending(d => d.DoanhThu).ThenBy(d => d.TenHH, SoSanhTen)
            .ToList();
        return new BaoCaoDoanhThu(ky.TuNgay, ky.DenNgay, s.DoanhThu, s.SoDonHang, s.TienMat, s.ChuyenKhoan, s.GhiNo, dong);
    }

    // ================================================================ UC_5.1, 5.2 bước 8–15: so sánh

    public const string ChiTieuLoiNhuan = "loi-nhuan";
    public const string ChiTieuDoanhThu = "doanh-thu";

    public async Task<KetQuaSoSanh> SoSanhAsync(string? chiTieu, string? tuNgay, string? denNgay,
        string? tuNgaySoSanh, string? denNgaySoSanh, CancellationToken ct)
    {
        if (chiTieu is not (ChiTieuLoiNhuan or ChiTieuDoanhThu))
            throw LoiNghiepVuException.KhongHopLe("Chỉ tiêu so sánh không hợp lệ.");
        var ky = DocKy(tuNgay, denNgay);
        var kySoSanh = DocKy(tuNgaySoSanh, denNgaySoSanh, "tuNgaySoSanh", "denNgaySoSanh"); // 11a, 12a
        if (kySoSanh.GiaoNhau(ky)) throw LoiNghiepVuException.TheoTruong("kySoSanh", TrungKy); // 12b, BR08

        var a = await TongHopCoDuLieuAsync(ky, KhongCoDuLieu, ct);
        var b = await TongHopCoDuLieuAsync(kySoSanh, KhongCoDuLieuKySoSanh, ct); // 13a
        var laLoiNhuan = chiTieu == ChiTieuLoiNhuan;
        var giaTriA = laLoiNhuan ? a.LoiNhuan : a.DoanhThu;
        var giaTriB = laLoiNhuan ? b.LoiNhuan : b.DoanhThu;
        var chenh = giaTriA - giaTriB; // UC_5.1 BR06, UC_5.2 BR05
        // UC_5.1 BR07, UC_5.2 BR06: chênh lệch / kỳ so sánh × 100. Mẫu số lấy trị tuyệt đối để dấu của tỷ lệ cùng dấu chênh lệch.
        decimal? tyLe = giaTriB == 0 ? null : Math.Round(chenh / Math.Abs(giaTriB) * 100, 1, MidpointRounding.AwayFromZero);
        return new KetQuaSoSanh(laLoiNhuan ? "Lợi nhuận" : "Doanh thu", ky.TuNgay, ky.DenNgay, kySoSanh.TuNgay, kySoSanh.DenNgay,
            giaTriA, giaTriB, chenh, tyLe);
    }

    // ================================================================ UC_5.3

    public const string TopBanChay = "chay";
    public const string TopBanCham = "cham";

    public async Task<BaoCaoSoLuongBan> SoLuongBanAsync(string? tuNgay, string? denNgay, string? top, string? soLuong, CancellationToken ct)
    {
        var ky = DocKy(tuNgay, denNgay);
        top = QuyTac.Trong(top) ? null : top!.Trim();
        int? n = null;
        if (top is not null)
        {
            if (top is not (TopBanChay or TopBanCham)) throw LoiNghiepVuException.KhongHopLe("Loại danh sách không hợp lệ.");
            // Bước 10: số lượng sản phẩm mong muốn.
            if (!int.TryParse(soLuong?.Trim(), NumberStyles.None, CultureInfo.InvariantCulture, out var so) || so <= 0)
                throw LoiNghiepVuException.TheoTruong("soLuong", "Số lượng sản phẩm mong muốn phải là số nguyên lớn hơn 0.");
            n = so;
        }

        var s = await TongHopCoDuLieuAsync(ky, KhongCoDuLieu, ct);
        var hang = await ThongTinHangAsync(ct);
        DongSoLuongBan Dong(ThongTinHang h) =>
            new(h.MaHH, h.TenHH, h.NhomHang, h.DonViTinh, s.TheoHang.GetValueOrDefault(h.MaHH)?.SoLuong ?? 0);

        // BR05: top bán chậm gồm cả hàng đang kinh doanh không bán được trong kỳ (số lượng = 0).
        var cacDong = hang.Values
            .Where(h => s.TheoHang.ContainsKey(h.MaHH) || (top == TopBanCham && h.DangKinhDoanh))
            .Select(Dong);
        var ketQua = (top == TopBanCham
                ? cacDong.OrderBy(d => d.SoLuongBan).ThenBy(d => d.TenHH, SoSanhTen)          // BR04: tăng dần
                : cacDong.OrderByDescending(d => d.SoLuongBan).ThenBy(d => d.TenHH, SoSanhTen)) // BR04: giảm dần
            .Take(n ?? int.MaxValue)
            .ToList();
        return new BaoCaoSoLuongBan(ky.TuNgay, ky.DenNgay, top, n, ketQua);
    }

    // ================================================================ UC_5.4

    /// <summary>
    /// BR02, BR05 (SUA_BAO_CAO 3.12): trạng thái xét theo từng lô của hàng đang kinh doanh.
    /// Lô đã bán hết chỉ hiện "Hết hàng" khi chưa có lô nào của cùng mặt hàng được nhập sau nó
    /// (giống cảnh báo "Hết hàng" được đóng khi thêm lô mới – UC_3.2 BR06).
    /// </summary>
    public async Task<BaoCaoTonKho> TonKhoAsync(string? trangThai, CancellationToken ct)
    {
        var loc = QuyTac.Trong(trangThai) || trangThai!.Trim() == "Tất cả" ? null : trangThai.Trim();
        if (loc is not null && !LoaiCanhBao.TatCa.Contains(loc))
            throw LoiNghiepVuException.TheoTruong("trangThai", "Trạng thái tồn kho không hợp lệ.");

        var homNay = dongHo.HomNay;
        var cacLo = await db.LoHang.AsNoTracking()
            .Where(l => l.HangHoa.TrangThai == TrangThaiHangHoa.DangKinhDoanh)
            .Select(l => new
            {
                l.MaLo, l.MaHH, l.HangHoa.TenHH, l.HangHoa.DonViTinh, l.SoLuongTon, l.HanSuDung, l.NgayNhap,
                l.HangHoa.NguongCanhBaoHetHang, l.HangHoa.NguongCanhBaoHetHan,
            })
            .ToListAsync(ct);
        var loMoiNhat = cacLo.GroupBy(l => l.MaHH)
            .ToDictionary(g => g.Key, g => g.OrderByDescending(l => l.NgayNhap).ThenByDescending(l => l.MaLo, StringComparer.Ordinal).First().MaLo);

        var dong = new List<DongTonKho>();
        foreach (var l in cacLo)
        {
            var tt = new List<string>();
            if (l.SoLuongTon == 0)
            {
                if (loMoiNhat[l.MaHH] != l.MaLo) continue;
                tt.Add(LoaiCanhBao.HetHang);
            }
            else
            {
                if (l.NguongCanhBaoHetHang is int nguong && l.SoLuongTon <= nguong) tt.Add(LoaiCanhBao.SapHetHang);
                var conLai = l.HanSuDung.DayNumber - homNay.DayNumber; // BR02: số ngày còn lại
                if (conLai < 0) tt.Add(LoaiCanhBao.HetHan);             // Q14: HSD < hôm nay
                else if (l.NguongCanhBaoHetHan is int m && conLai <= m) tt.Add(LoaiCanhBao.SapHetHan);
            }
            if (loc is not null && !tt.Contains(loc)) continue;
            dong.Add(new DongTonKho(l.MaLo, l.MaHH, l.TenHH, l.DonViTinh, l.SoLuongTon, l.HanSuDung, tt.Count == 0 ? [ConHang] : tt));
        }
        dong = dong.OrderBy(d => d.TenHH, SoSanhTen).ThenBy(d => d.HanSuDung).ThenBy(d => d.MaLo, StringComparer.Ordinal).ToList();
        return new BaoCaoTonKho(loc ?? "Tất cả", homNay, dong);
    }
}

[ApiController]
[Route("api/bao-cao")]
[Authorize(Policy = ChinhSach.ChiChuQuan)]
public sealed class BaoCaoController(DichVuBaoCao dichVu) : ControllerBase
{
    [HttpGet("loi-nhuan")]
    public Task<BaoCaoLoiNhuan> LoiNhuan([FromQuery] string? tuNgay, [FromQuery] string? denNgay, CancellationToken ct) =>
        dichVu.LoiNhuanAsync(tuNgay, denNgay, ct);

    [HttpGet("doanh-thu")]
    public Task<BaoCaoDoanhThu> DoanhThu([FromQuery] string? tuNgay, [FromQuery] string? denNgay, CancellationToken ct) =>
        dichVu.DoanhThuAsync(tuNgay, denNgay, ct);

    [HttpGet("so-sanh")]
    public Task<KetQuaSoSanh> SoSanh([FromQuery] string? chiTieu, [FromQuery] string? tuNgay, [FromQuery] string? denNgay,
        [FromQuery] string? tuNgaySoSanh, [FromQuery] string? denNgaySoSanh, CancellationToken ct) =>
        dichVu.SoSanhAsync(chiTieu, tuNgay, denNgay, tuNgaySoSanh, denNgaySoSanh, ct);

    [HttpGet("so-luong-ban")]
    public Task<BaoCaoSoLuongBan> SoLuongBan([FromQuery] string? tuNgay, [FromQuery] string? denNgay,
        [FromQuery] string? top, [FromQuery] string? soLuong, CancellationToken ct) =>
        dichVu.SoLuongBanAsync(tuNgay, denNgay, top, soLuong, ct);

    [HttpGet("ton-kho")]
    public Task<BaoCaoTonKho> TonKho([FromQuery] string? trangThai, CancellationToken ct) => dichVu.TonKhoAsync(trangThai, ct);
}
