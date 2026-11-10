using System.Globalization;
using System.Text;
using System.Text.RegularExpressions;
using Microsoft.EntityFrameworkCore;
using XomNho.Api.CaLam;
using XomNho.Api.Common;
using XomNho.Api.Data;
using XomNho.Api.Domain;
using XomNho.Api.TichHop;
using XomNho.Api.TonKho;

namespace XomNho.Api.BanHangQL;

// ------------------------------------------------------------------ DTO

public sealed record SanPhamBan(string MaHH, string TenHH, string? MaVach, string DonViTinh, decimal GiaBan, int TonBanDuoc, string MaDM, string TenDM);
public sealed record DongGioHang(string? MaHH, int SoLuong);

public sealed record YeuCauThanhToan(
    string? MaKH, IReadOnlyList<DongGioHang>? Dong, string? PhuongThuc, string? TienKhachDua, string? KetQuaQrGiaLap);
public sealed record KetQuaThanhToan(string MaPTT, decimal SoTien, decimal TienTraLai, string PhuongThuc);

public sealed record YeuCauTaoHoaDon(string? MaPTT, string? MaKH, IReadOnlyList<DongGioHang>? Dong);
public sealed record YeuCauGuiHoaDon(string? MaHD, string? Kenh, string? SDT);

public sealed record DongHoaDon(string MaHH, string TenHH, string DonViTinh, int SoLuong, decimal DonGia, decimal ThanhTien);
public sealed record ChiTietHoaDonDto(
    string MaHD, string TenCuaHang, DateTime NgayGioLap, string MaNguoiBan, string NguoiBan,
    string? MaKH, string? TenKhach, string? SdtKhach, string LoaiHoaDon, string TrangThai,
    IReadOnlyList<DongHoaDon> Dong, decimal TongTienHang, decimal TongTienThanhToan, decimal SoTienDaTra,
    string PhuongThuc, decimal SoTienConNo);

public sealed record HoaDonDong(string MaHD, DateTime NgayGioLap, string? TenKhach, decimal TongTien, string TrangThai);

/// <summary>Điều kiện tìm kiếm lịch sử bán hàng (UC_6.1 BR01).</summary>
public sealed record DieuKienTimHoaDon(string? Ma, string? Khach, string? TuNgay, string? DenNgay, string? TrangThai);

/// <summary>
/// UC_6.5 Tạo hóa đơn bán hàng (thanh toán trực tiếp) và UC_6.1 Tìm kiếm lịch sử bán hàng.
/// Luồng: kiểm tra giỏ (bước 5–7) → thanh toán (10–13) → tạo hóa đơn + trừ kho trong cùng giao dịch (14–15)
/// → gửi hóa đơn điện tử tùy chọn (16).
/// </summary>
public sealed partial class DichVuBanHang(
    XomNhoDbContext db,
    ISinhMa sinhMa,
    IDongHo dongHo,
    INguoiDungHienTai hienTai,
    IThamSoHeThong thamSo,
    DichVuCa dichVuCa,
    DichVuCanhBao canhBao,
    IGuiChungTu guiChungTu)
{
    public const string GioRong = "Giỏ hàng chưa có sản phẩm";
    public const string QrThatBai = "Thanh toán chưa thành công. Vui lòng thanh toán lại hoặc hủy giao dịch.";
    public const string ChuaTheTaoHoaDon = "Chưa thể tạo hóa đơn. Khoản thanh toán đã được ghi nhận, vui lòng thử lại.";
    public const string KhongTimThayHoaDon = "Không tìm thấy hóa đơn";

    // ================================================================ Danh mục sản phẩm (bước 2–4)

    /// <summary>Hàng đang kinh doanh kèm tồn bán được (lô còn hạn, còn hàng). Từ khóa khớp tên hoặc đúng mã vạch.</summary>
    public async Task<List<SanPhamBan>> SanPhamAsync(string? tuKhoa, string? maDM, CancellationToken ct)
    {
        var homNay = dongHo.HomNay;
        var q = db.HangHoa.AsNoTracking().Where(h => h.TrangThai == TrangThaiHangHoa.DangKinhDoanh);
        if (!QuyTac.Trong(maDM)) q = q.Where(h => h.MaDM == maDM);
        if (!QuyTac.Trong(tuKhoa))
        {
            var k = tuKhoa!.Trim();
            var thuong = k.ToLower();
            q = q.Where(h => h.TenHH.ToLower().Contains(thuong) || h.MaVach == k || h.MaHH == k);
        }
        return await q.OrderBy(h => h.TenHH).Take(200)
            .Select(h => new SanPhamBan(h.MaHH, h.TenHH, h.MaVach, h.DonViTinh, h.GiaBan,
                h.LoHang.Where(l => l.HanSuDung >= homNay && l.SoLuongTon > 0).Sum(l => (int?)l.SoLuongTon) ?? 0,
                h.MaDM, h.DanhMuc.TenDM))
            .ToListAsync(ct);
    }

    // ================================================================ Kiểm tra giỏ hàng (bước 5–7)

    private sealed record DongDaTinh(HangHoa HangHoa, int SoLuong, decimal ThanhTien);

    /// <summary>
    /// BR01/BR7: giá lấy từ giá bán hiện hành (đã tính sẵn giảm giá). BR03: kiểm tra theo tổng số lượng
    /// khi cùng sản phẩm nằm nhiều dòng; chỉ tính lô còn hạn (BR11).
    /// </summary>
    private async Task<(List<DongDaTinh> Dong, decimal TongTien)> TinhGioHangAsync(IReadOnlyList<DongGioHang>? dong, CancellationToken ct)
    {
        if (dong is null || dong.Count == 0 || dong.All(d => d.SoLuong <= 0 || QuyTac.Trong(d.MaHH)))
            throw LoiNghiepVuException.KhongHopLe(GioRong);
        if (dong.Any(d => d.SoLuong <= 0))
            throw LoiNghiepVuException.KhongHopLe("Số lượng sản phẩm phải lớn hơn 0.");

        var gop = dong.GroupBy(d => d.MaHH!.Trim()).Select(g => (MaHH: g.Key, SoLuong: g.Sum(x => x.SoLuong))).ToList();
        var maCanLay = gop.Select(g => g.MaHH).ToList();
        var homNay = dongHo.HomNay;
        var hangHoa = await db.HangHoa.AsNoTracking()
            .Where(h => maCanLay.Contains(h.MaHH) && h.TrangThai == TrangThaiHangHoa.DangKinhDoanh)
            .ToDictionaryAsync(h => h.MaHH, ct);
        var ton = await db.LoHang.AsNoTracking()
            .Where(l => maCanLay.Contains(l.MaHH) && l.HanSuDung >= homNay && l.SoLuongTon > 0)
            .GroupBy(l => l.MaHH).Select(g => new { g.Key, Ton = g.Sum(l => l.SoLuongTon) })
            .ToDictionaryAsync(x => x.Key, x => x.Ton, ct);

        var ketQua = new List<DongDaTinh>();
        foreach (var (ma, sl) in gop)
        {
            if (!hangHoa.TryGetValue(ma, out var h))
                throw LoiNghiepVuException.KhongHopLe($"Sản phẩm {ma} không còn kinh doanh.");
            var tonCo = ton.GetValueOrDefault(ma);
            if (sl > tonCo) throw LoiKhongDuHang(h, tonCo); // 6.a
            ketQua.Add(new DongDaTinh(h, sl, h.GiaBan * sl));
        }
        return (ketQua, ketQua.Sum(d => d.ThanhTien));
    }

    private static LoiNghiepVuException LoiKhongDuHang(HangHoa h, int tonCo) => new(
        StatusCodes.Status409Conflict,
        $"Sản phẩm {h.TenHH} không đủ hàng. Số lượng tồn hiện có: {tonCo}.",
        duLieuThem: new Dictionary<string, object?> { ["maHH"] = h.MaHH, ["tonHienCo"] = tonCo, ["donViTinh"] = h.DonViTinh });

    // ================================================================ Thanh toán (bước 10–13)

    public async Task<KetQuaThanhToan> ThanhToanAsync(YeuCauThanhToan yc, CancellationToken ct)
    {
        var maND = hienTai.MaND!;
        await dichVuCa.CaChoGiaoDichAsync(maND, ct);
        var (_, tong) = await TinhGioHangAsync(yc.Dong, ct);
        if (!QuyTac.Trong(yc.MaKH) && !await db.KhachHang.AnyAsync(k => k.MaKH == yc.MaKH, ct))
            throw LoiNghiepVuException.KhongHopLe("Không tìm thấy khách hàng phù hợp.");

        var phuongThuc = yc.PhuongThuc?.Trim();
        decimal tienTraLai = 0;
        string? maGiaoDich = null;
        string trangThai = TrangThaiPhieuThanhToan.ThanhCong;

        if (phuongThuc == PhuongThucThanhToan.TienMat)
        {
            // 12: Nhân viên xác nhận đã thu đủ tiền mặt.
            if (!QuyTac.DocSoNguyen(yc.TienKhachDua, out var dua))
                throw LoiNghiepVuException.TheoTruong("tienKhachDua", "Vui lòng nhập số tiền khách đưa.");
            if (dua < tong)
                throw LoiNghiepVuException.TheoTruong("tienKhachDua", "Số tiền khách đưa chưa đủ.");
            tienTraLai = dua - tong;
        }
        else if (phuongThuc == PhuongThucThanhToan.ChuyenKhoanQr)
        {
            // 11.a: QR giả lập (Q5) – kết quả "ngân hàng" do người dùng chọn trên màn hình demo.
            maGiaoDich = $"QR{dongHo.BayGio:yyyyMMddHHmmss}{Random.Shared.Next(100, 999)}";
            if (yc.KetQuaQrGiaLap != "ThanhCong") trangThai = TrangThaiPhieuThanhToan.KhongThanhCong;
        }
        else
        {
            throw LoiNghiepVuException.KhongHopLe("Hình thức thanh toán không hợp lệ.");
        }

        await using var tx = await db.Database.BeginTransactionAsync(ct);
        var ptt = new PhieuThanhToan
        {
            MaPTT = await sinhMa.SinhMaAsync(LoaiMa.PhieuThanhToan, ct),
            NgayGio = dongHo.BayGio,
            LoaiPhieu = LoaiPhieuThanhToan.BanHang,
            HuongTien = HuongTienTe.Thu,
            SoTien = tong,
            PhuongThuc = phuongThuc,
            TrangThai = trangThai,
            MaGiaoDichNganHang = maGiaoDich,
            MaND = maND,
        };
        db.PhieuThanhToan.Add(ptt);
        await db.SaveChangesAsync(ct);
        await tx.CommitAsync(ct);

        // 11.b.1: ghi nhận lần thanh toán "Không thành công" rồi báo lỗi.
        if (trangThai != TrangThaiPhieuThanhToan.ThanhCong)
            throw new LoiNghiepVuException(StatusCodes.Status402PaymentRequired, QrThatBai,
                duLieuThem: new Dictionary<string, object?> { ["maPTT"] = ptt.MaPTT });

        return new KetQuaThanhToan(ptt.MaPTT, tong, tienTraLai, phuongThuc);
    }

    // ================================================================ Tạo hóa đơn (bước 14–15)

    public async Task<ChiTietHoaDonDto> TaoHoaDonAsync(YeuCauTaoHoaDon yc, CancellationToken ct)
    {
        var maND = hienTai.MaND!;
        var ptt = await db.PhieuThanhToan.FirstOrDefaultAsync(p => p.MaPTT == yc.MaPTT, ct);
        if (ptt is null || ptt.LoaiPhieu != LoaiPhieuThanhToan.BanHang || ptt.TrangThai != TrangThaiPhieuThanhToan.ThanhCong)
            throw LoiNghiepVuException.KhongHopLe("Chưa có khoản thanh toán thành công cho giao dịch này."); // BR04
        if (ptt.MaHDTTN is not null)
            return await ChiTietAsync(ptt.MaHDTTN, ct); // đã tạo rồi (bấm "Thử lại" hai lần)

        try
        {
            await using var tx = await db.Database.BeginTransactionAsync(ct);
            var ca = await dichVuCa.CaChoGiaoDichAsync(maND, ct);
            var (dong, tong) = await TinhGioHangAsync(yc.Dong, ct);
            if (tong != ptt.SoTien)
                throw LoiNghiepVuException.KhongHopLe("Giá trị giỏ hàng không khớp với khoản đã thanh toán. Vui lòng kiểm tra lại.");

            var bayGio = dongHo.BayGio;
            var hd = new HoaDon
            {
                MaHD = await sinhMa.SinhMaAsync(LoaiMa.HoaDon, ct), // BR10: chỉ cấp khi tạo thành công
                NgayGioLap = bayGio,
                TongTien = tong,
                SoTienDaTra = tong,
                TrangThai = TrangThaiHoaDon.DaThanhToan,
                MaCa = ca.MaCa,
                MaND = maND, // BR9
                ThanhToanNgay = new HoaDonThanhToanNgay { MaKH = QuyTac.Trong(yc.MaKH) ? null : yc.MaKH },
            };

            // BR11 + Q20: xuất kho theo lô có HSD gần nhất, ghi lô và giá vốn từng phần.
            var homNay = dongHo.HomNay;
            foreach (var d in dong)
            {
                var cacLo = await db.LoHang
                    .Where(l => l.MaHH == d.HangHoa.MaHH && l.HanSuDung >= homNay && l.SoLuongTon > 0)
                    .OrderBy(l => l.HanSuDung).ThenBy(l => l.MaLo).ToListAsync(ct);
                var canXuat = d.SoLuong;
                foreach (var lo in cacLo)
                {
                    if (canXuat == 0) break;
                    var lay = Math.Min(canXuat, lo.SoLuongTon);
                    lo.SoLuongTon -= lay;
                    canXuat -= lay;
                    hd.ChiTiet.Add(new ChiTietHoaDon
                    {
                        MaHH = d.HangHoa.MaHH, MaLo = lo.MaLo, SoLuong = lay,
                        DonGia = d.HangHoa.GiaBan, GiaVon = d.HangHoa.GiaNhap,
                    });
                    await canhBao.DanhGiaLoAsync(lo, d.HangHoa, xetHang: true, xetHan: false, capNhatNeuDaCo: true, ct);
                }
                if (canXuat > 0) throw LoiKhongDuHang(d.HangHoa, d.SoLuong - canXuat);
            }

            db.HoaDon.Add(hd);
            ptt.MaHDTTN = hd.MaHD;
            await db.SaveChangesAsync(ct);
            await tx.CommitAsync(ct);
            return await ChiTietAsync(hd.MaHD, ct);
        }
        catch (LoiNghiepVuException)
        {
            db.ChangeTracker.Clear();
            throw;
        }
        catch (Exception ex) when (ex is DbUpdateException)
        {
            // 14.a: hoàn tác tạo hóa đơn và trừ kho; khoản thanh toán vẫn giữ để thử lại.
            db.ChangeTracker.Clear();
            throw new LoiNghiepVuException(StatusCodes.Status409Conflict, ChuaTheTaoHoaDon,
                duLieuThem: new Dictionary<string, object?> { ["maPTT"] = yc.MaPTT });
        }
    }

    // ================================================================ Gửi hóa đơn điện tử (bước 16)

    public async Task GuiHoaDonAsync(YeuCauGuiHoaDon yc, CancellationToken ct)
    {
        var hd = await ChiTietAsync(yc.MaHD ?? "", ct);
        var kenh = yc.Kenh?.Trim();
        if (kenh is not ("SMS" or "Zalo")) throw LoiNghiepVuException.TheoTruong("kenh", "Vui lòng chọn kênh gửi SMS hoặc Zalo.");
        // 16.a.1: chưa có SĐT → yêu cầu nhập. BR8: SĐT nhập ở đây không lưu vào hồ sơ khách.
        var sdt = (yc.SDT ?? "").Replace(" ", "").Trim();
        if (sdt.Length == 0)
            throw LoiNghiepVuException.TheoTruong("sdt", "Khách hàng chưa có số điện thoại. Vui lòng nhập số điện thoại.");
        if (!QuyTac.SoDienThoaiHopLe(sdt)) throw LoiNghiepVuException.TheoTruong("sdt", "Số điện thoại không hợp lệ.");

        var thanhCong = await guiChungTu.GuiAsync(kenh, sdt, NoiDungHoaDon(hd), ct);
        db.NhatKyGuiChungTu.Add(new NhatKyGuiChungTu
        {
            LoaiChungTu = "Hóa đơn", MaChungTu = hd.MaHD, Kenh = kenh, SDTNhan = sdt,
            ThoiDiemGui = dongHo.BayGio, KetQua = thanhCong ? "Thành công" : "Không thành công", MaND = hienTai.MaND!,
        });
        await db.SaveChangesAsync(ct);
        // BR6: lỗi gửi không ảnh hưởng trạng thái hóa đơn và tồn kho.
        if (!thanhCong)
            throw new LoiNghiepVuException(StatusCodes.Status502BadGateway, "Gửi hóa đơn không thành công. Vui lòng chọn gửi lại hoặc bỏ qua.");
    }

    private static string NoiDungHoaDon(ChiTietHoaDonDto hd)
    {
        var sb = new StringBuilder();
        sb.AppendLine($"{hd.TenCuaHang} – HÓA ĐƠN {hd.MaHD}");
        sb.AppendLine($"Ngày lập: {hd.NgayGioLap:dd/MM/yyyy HH:mm}");
        foreach (var d in hd.Dong) sb.AppendLine($"{d.TenHH} x{d.SoLuong} = {d.ThanhTien:N0} đ");
        sb.Append($"Tổng: {hd.TongTienThanhToan:N0} đ – {hd.TrangThai}");
        return sb.ToString();
    }

    // ================================================================ UC_6.1 Lịch sử bán hàng

    public async Task<KetQuaTrang<HoaDonDong>> TimKiemAsync(DieuKienTimHoaDon dk, bool tatCa, int trang, CancellationToken ct)
    {
        var q = db.HoaDon.AsNoTracking();
        if (!tatCa) q = ApDungDieuKien(q, dk);
        var soDong = await thamSo.LaySoAsync(KhoaCauHinh.SoDongMoiTrang, ct);
        // BR03: mới nhất trước.
        return await PhanTrang.LayTrangAsync(
            q.OrderByDescending(h => h.NgayGioLap).ThenByDescending(h => h.MaHD)
             .Select(h => new HoaDonDong(h.MaHD, h.NgayGioLap,
                 h.ThanhToanNgay != null && h.ThanhToanNgay.KhachHang != null ? h.ThanhToanNgay.KhachHang.HoTen : null,
                 h.TongTien, h.TrangThai)),
            trang, soDong, ct);
    }

    /// <summary>BR01, BR02 – kiểm tra điều kiện và lọc (AND mọi điều kiện).</summary>
    private IQueryable<HoaDon> ApDungDieuKien(IQueryable<HoaDon> q, DieuKienTimHoaDon dk)
    {
        var kt = new BoKiemTra();
        if (QuyTac.Trong(dk.Ma) && QuyTac.Trong(dk.Khach) && QuyTac.Trong(dk.TuNgay) && QuyTac.Trong(dk.DenNgay) && QuyTac.Trong(dk.TrangThai))
            throw LoiNghiepVuException.KhongHopLe("Vui lòng nhập ít nhất một điều kiện.");

        var ma = dk.Ma?.Trim();
        if (!QuyTac.Trong(ma)) kt.Kiem("ma", MaHoaDonRegex().IsMatch(ma!), "Mã hóa đơn phải có dạng HD-dd/mm/yyyy.nnn.");

        var homNay = dongHo.HomNay;
        const string NgaySai = "Ngày lập phải là ngày hợp lệ theo dd/mm/yyyy và không ở tương lai.";
        DateOnly? tu = null, den = null;
        if (!QuyTac.Trong(dk.TuNgay))
        {
            kt.Kiem("tuNgay", QuyTac.DocNgay(dk.TuNgay, out var d) && d <= homNay, NgaySai);
            tu = d;
        }
        if (!QuyTac.Trong(dk.DenNgay))
        {
            kt.Kiem("denNgay", QuyTac.DocNgay(dk.DenNgay, out var d) && d <= homNay, NgaySai);
            den = d;
        }
        if (tu is not null && den is not null && !kt.CoLoi)
            kt.Kiem("denNgay", tu <= den, "Ngày bắt đầu không được sau ngày kết thúc.");
        if (!QuyTac.Trong(dk.TrangThai))
            kt.Kiem("trangThai", TrangThaiHoaDon.TatCa.Contains(dk.TrangThai), "Trạng thái không hợp lệ.");
        kt.NemNeuCoLoi();

        if (!QuyTac.Trong(ma)) q = q.Where(h => h.MaHD == ma);
        if (!QuyTac.Trong(dk.Khach))
        {
            // Ô tên/SĐT: chỉ gồm chữ số (bỏ khoảng trắng, gạch ngang) → tìm theo SĐT; ngược lại theo tên.
            var k = dk.Khach!.Trim();
            var chuSo = k.Replace(" ", "").Replace("-", "");
            if (chuSo.All(char.IsDigit))
                q = q.Where(h => h.ThanhToanNgay != null && h.ThanhToanNgay.KhachHang != null && h.ThanhToanNgay.KhachHang.SDT.Contains(chuSo));
            else
            {
                var thuong = k.ToLower();
                q = q.Where(h => h.ThanhToanNgay != null && h.ThanhToanNgay.KhachHang != null
                    && h.ThanhToanNgay.KhachHang.HoTen.ToLower().Contains(thuong));
            }
        }
        if (tu is not null)
        {
            var batDau = tu.Value.ToDateTime(TimeOnly.MinValue);
            q = q.Where(h => h.NgayGioLap >= batDau);
        }
        // Chỉ nhập "Từ ngày" → tìm đúng một ngày; có "Đến ngày" → khoảng ngày.
        var ngayCuoi = den ?? tu;
        if (ngayCuoi is not null)
        {
            var ketThuc = ngayCuoi.Value.AddDays(1).ToDateTime(TimeOnly.MinValue);
            q = q.Where(h => h.NgayGioLap < ketThuc);
        }
        if (!QuyTac.Trong(dk.TrangThai)) q = q.Where(h => h.TrangThai == dk.TrangThai);
        return q;
    }

    /// <summary>BR04 – chi tiết hóa đơn.</summary>
    public async Task<ChiTietHoaDonDto> ChiTietAsync(string maHD, CancellationToken ct)
    {
        var hd = await db.HoaDon.AsNoTracking()
            .Include(h => h.NguoiDung)
            .Include(h => h.ThanhToanNgay!).ThenInclude(t => t.KhachHang)
            .Include(h => h.ChiTiet).ThenInclude(c => c.HangHoa)
            .FirstOrDefaultAsync(h => h.MaHD == maHD, ct)
            ?? throw new LoiNghiepVuException(StatusCodes.Status404NotFound, KhongTimThayHoaDon);

        var tenCuaHang = await db.CauHinh.Where(c => c.MaCauHinh == KhoaCauHinh.TenCuaHang).Select(c => c.GiaTri).FirstOrDefaultAsync(ct)
            ?? ThamSoHeThong.MacDinh[KhoaCauHinh.TenCuaHang].GiaTri;
        var phuongThuc = await db.PhieuThanhToan.AsNoTracking()
            .Where(p => p.MaHDTTN == maHD && p.TrangThai == TrangThaiPhieuThanhToan.ThanhCong && p.LoaiPhieu == LoaiPhieuThanhToan.BanHang)
            .Select(p => p.PhuongThuc).FirstOrDefaultAsync(ct);

        // Gộp các dòng cùng mặt hàng, cùng đơn giá (đã tách theo lô khi xuất kho).
        var dong = hd.ChiTiet
            .GroupBy(c => new { c.MaHH, c.HangHoa.TenHH, c.HangHoa.DonViTinh, c.DonGia })
            .Select(g => new DongHoaDon(g.Key.MaHH, g.Key.TenHH, g.Key.DonViTinh, g.Sum(c => c.SoLuong), g.Key.DonGia,
                g.Sum(c => c.SoLuong) * g.Key.DonGia))
            .OrderBy(d => d.TenHH).ToList();

        var kh = hd.ThanhToanNgay?.KhachHang;
        var laNo = hd.ThanhToanNgay is null;
        return new ChiTietHoaDonDto(
            hd.MaHD, tenCuaHang, hd.NgayGioLap, hd.MaND, hd.NguoiDung.HoTen,
            kh?.MaKH, kh?.HoTen, kh?.SDT.Trim(),
            laNo ? "Ghi nợ" : "Thanh toán ngay", hd.TrangThai, dong,
            dong.Sum(d => d.ThanhTien), hd.TongTien, hd.SoTienDaTra,
            laNo ? PhuongThucThanhToan.GhiNo : phuongThuc ?? "—",
            hd.TrangThai == TrangThaiHoaDon.ConNo ? hd.TongTien - hd.SoTienDaTra : 0);
    }

    [GeneratedRegex(@"^HD-\d{2}/\d{2}/\d{4}\.\d{3,}$")]
    private static partial Regex MaHoaDonRegex();
}
