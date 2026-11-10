using System.Text;
using Microsoft.EntityFrameworkCore;
using XomNho.Api.Common;
using XomNho.Api.Data;
using XomNho.Api.Domain;
using XomNho.Api.TichHop;

namespace XomNho.Api.CongNoQL;

// ------------------------------------------------------------------ DTO

public sealed record HoaDonNoDong(string MaHD, DateTime NgayGioLap, decimal SoTien, DateOnly HanThanhToan, string TrangThaiNo);

public sealed record KhachQuenDong(string MaKH, string HoTen, string SDT, string TrangThaiNo, decimal DuNo);

public sealed record ChiTietKhachQuen(
    string MaKH, string HoTen, string SDT, string CCCD, string DiaChi, string TrangThaiNo, decimal DuNo,
    DateOnly? HanThanhToanCuNhat, bool QuyenMuaNo, IReadOnlyList<HoaDonNoDong> HoaDonChuaTra);

public sealed record YeuCauKhachQuen(string? HoTen, string? SDT, string? CCCD, string? DiaChi);

/// <summary>Màn hình 6.6.8 – "Kiểm tra công nợ".</summary>
public sealed record KiemTraGhiNo(
    string MaKH, string TenKhach, string SDT, decimal NoTruoc, decimal DonHienTai, decimal TongNoSauDon, decimal HanMuc,
    DateOnly? NgayNoCuNhat, DateOnly HanThanhToan);

public sealed record YeuCauThuNo(
    string? MaKH, IReadOnlyList<string>? MaHoaDon, string? PhuongThuc, string? TienKhachDua, string? KetQuaQrGiaLap);

/// <summary>Màn hình 7.2.6 – Phiếu thanh toán.</summary>
public sealed record PhieuThuNo(
    string MaPTT, string TenCuaHang, DateTime NgayGio, string MaKH, string TenKhach, string SDT,
    string MaNguoiThu, string NguoiThu, string PhuongThuc, IReadOnlyList<HoaDonNoDong> HoaDon,
    decimal TongTien, decimal DuNoConLai, decimal TienTraLai);

public sealed record YeuCauGuiPhieu(string? MaPTT, string? Kenh, string? SDT);

/// <summary>
/// UC_7.1 (kiểm tra ghi nợ), UC_7.2 Tìm kiếm khách quen, UC_7.3 Phiếu thanh toán nợ,
/// UC_7.4 Sửa, UC_7.5 Thêm, UC_7.6 Xóa khách quen.
/// </summary>
public sealed class DichVuCongNo(
    XomNhoDbContext db,
    ISinhMa sinhMa,
    IDongHo dongHo,
    INguoiDungHienTai hienTai,
    IThamSoHeThong thamSo,
    IGuiChungTu guiChungTu)
{
    public const string KhongDuocTrong = "Không được để trống!";
    public const string SdtSai = "Số điện thoại không hợp lệ!";
    public const string SdtTrung = "Số điện thoại đã trùng!";
    public const string CccdSai = "CCCD không hợp lệ!";
    public const string CccdTrung = "CCCD đã trùng!";
    public const string ChuaLaKhachQuen = "Khách hàng chưa là khách quen, không thể ghi nợ!";
    public const string QuaHan = "Khách hàng có khoản nợ quá hạn!";
    public const string VuotHanMuc = "Tổng nợ vượt quá hạn mức cho phép!";
    public const string KhongTimThayKhachQuen = "Không tìm thấy thông tin khách quen";

    // ================================================================ Trạng thái nợ (UC_7.2 BR02–BR05)

    private sealed record NoCuaKhach(decimal DuNo, DateOnly? NgayNoCuNhat, DateOnly? HanCuNhat, string TrangThai);

    /// <summary>Hóa đơn nợ chưa thanh toán: hóa đơn "Còn nợ" (không tính hóa đơn đã hủy / đã trả).</summary>
    private IQueryable<HoaDonNo> HoaDonConNo() =>
        db.HoaDonNo.Where(n => n.HoaDon.TrangThai == TrangThaiHoaDon.ConNo);

    private async Task<Dictionary<string, NoCuaKhach>> TinhNoAsync(List<string>? maKH, CancellationToken ct)
    {
        var q = HoaDonConNo();
        if (maKH is not null) q = q.Where(n => maKH.Contains(n.MaKQ));
        var dong = await q.Select(n => new { n.MaKQ, n.HoaDon.NgayGioLap, n.HanThanhToan, ConNo = n.HoaDon.TongTien - n.HoaDon.SoTienDaTra })
            .ToListAsync(ct);
        var nguongSap = await thamSo.LaySoAsync(KhoaCauHinh.SoNgaySapHetHanNo, ct);
        var soNgayNo = await thamSo.LaySoAsync(KhoaCauHinh.SoNgayNo, ct);

        return dong.GroupBy(d => d.MaKQ).ToDictionary(g => g.Key, g =>
        {
            var cuNhat = DateOnly.FromDateTime(g.Min(x => x.NgayGioLap));
            return new NoCuaKhach(g.Sum(x => x.ConNo), cuNhat, g.Min(x => x.HanThanhToan),
                TrangThaiTheoNgay(cuNhat, nguongSap, soNgayNo));
        });
    }

    /// <summary>BR02: 0–22 ngày "Còn hạn"; BR03: từ ngày 23 "Sắp hết hạn"; BR04: quá 30 ngày "Quá hạn".</summary>
    private string TrangThaiTheoNgay(DateOnly ngayLap, int nguongSap, int soNgayNo)
    {
        var daTraiQua = dongHo.HomNay.DayNumber - ngayLap.DayNumber;
        return daTraiQua > soNgayNo ? TrangThaiNo.QuaHan : daTraiQua >= nguongSap ? TrangThaiNo.SapHetHan : TrangThaiNo.ConHan;
    }

    private async Task<string> TrangThaiHoaDonAsync(DateTime ngayLap, CancellationToken ct) =>
        TrangThaiTheoNgay(DateOnly.FromDateTime(ngayLap),
            await thamSo.LaySoAsync(KhoaCauHinh.SoNgaySapHetHanNo, ct), await thamSo.LaySoAsync(KhoaCauHinh.SoNgayNo, ct));

    // ================================================================ UC_7.2 Tìm kiếm khách quen

    public async Task<List<KhachQuenDong>> TimKhachQuenAsync(string? tuKhoa, string? trangThaiNo, CancellationToken ct)
    {
        var q = db.KhachQuen.AsNoTracking().Where(k => k.TrangThai == TrangThaiKhachQuen.DangHoatDong);
        if (!QuyTac.Trong(tuKhoa))
        {
            var k = tuKhoa!.Trim();
            var thuong = k.ToLower();
            var so = k.Replace(" ", "");
            q = q.Where(x => x.KhachHang.HoTen.ToLower().Contains(thuong) || x.KhachHang.SDT.Contains(so)); // BR01
        }
        var ds = await q.OrderBy(x => x.MaKH)
            .Select(x => new { x.MaKH, x.KhachHang.HoTen, x.KhachHang.SDT }).ToListAsync(ct);
        var no = await TinhNoAsync(ds.Select(x => x.MaKH).ToList(), ct);

        var ketQua = ds.Select(x =>
        {
            var n = no.GetValueOrDefault(x.MaKH);
            return new KhachQuenDong(x.MaKH, x.HoTen, x.SDT.Trim(), n?.TrangThai ?? TrangThaiNo.KhongNo, n?.DuNo ?? 0); // BR05
        });
        if (!QuyTac.Trong(trangThaiNo)) ketQua = ketQua.Where(x => x.TrangThaiNo == trangThaiNo);
        return ketQua.ToList();
    }

    public async Task<ChiTietKhachQuen> ChiTietKhachQuenAsync(string maKH, CancellationToken ct)
    {
        var kq = await db.KhachQuen.AsNoTracking().Include(k => k.KhachHang)
            .FirstOrDefaultAsync(k => k.MaKH == maKH && k.TrangThai == TrangThaiKhachQuen.DangHoatDong, ct)
            ?? throw new LoiNghiepVuException(StatusCodes.Status404NotFound, KhongTimThayKhachQuen);
        var no = (await TinhNoAsync([maKH], ct)).GetValueOrDefault(maKH);
        return new ChiTietKhachQuen(kq.MaKH, kq.KhachHang.HoTen, kq.KhachHang.SDT.Trim(), kq.CCCD, kq.DiaChi,
            no?.TrangThai ?? TrangThaiNo.KhongNo, no?.DuNo ?? 0, no?.HanCuNhat, kq.QuyenMuaNo,
            await HoaDonChuaTraAsync(maKH, ct));
    }

    /// <summary>Các hóa đơn nợ chưa thanh toán, cũ nhất trước (UC_7.3 bước 8).</summary>
    public async Task<List<HoaDonNoDong>> HoaDonChuaTraAsync(string maKH, CancellationToken ct)
    {
        var ds = await HoaDonConNo().AsNoTracking().Where(n => n.MaKQ == maKH)
            .OrderBy(n => n.HoaDon.NgayGioLap).ThenBy(n => n.MaHD)
            .Select(n => new { n.MaHD, n.HoaDon.NgayGioLap, SoTien = n.HoaDon.TongTien - n.HoaDon.SoTienDaTra, n.HanThanhToan })
            .ToListAsync(ct);
        var kq = new List<HoaDonNoDong>();
        foreach (var x in ds) kq.Add(new HoaDonNoDong(x.MaHD, x.NgayGioLap, x.SoTien, x.HanThanhToan, await TrangThaiHoaDonAsync(x.NgayGioLap, ct)));
        return kq;
    }

    // ================================================================ UC_7.5 Thêm, UC_7.4 Sửa, UC_7.6 Xóa

    public async Task<string> ThemKhachQuenAsync(YeuCauKhachQuen yc, CancellationToken ct)
    {
        var (hoTen, sdt, cccd, diaChi) = KiemTraDinhDang(yc, null);

        await using var tx = await db.Database.BeginTransactionAsync(ct);
        var kh = await db.KhachHang.FirstOrDefaultAsync(k => k.SDT == sdt, ct);
        var kqCu = kh is null ? null : await db.KhachQuen.FirstOrDefaultAsync(k => k.MaKH == kh.MaKH, ct);

        // BR02: SĐT không trùng khách quen đang hoạt động.
        if (kqCu?.TrangThai == TrangThaiKhachQuen.DangHoatDong) throw LoiNghiepVuException.TheoTruong("sdt", SdtTrung);
        await KiemTraCccdAsync(cccd, kh?.MaKH, ct);

        if (kh is null)
        {
            // BR05: khách mới → cấp mã KH-xxxxxx.
            kh = new KhachHang { MaKH = await sinhMa.SinhMaAsync(LoaiMa.KhachHang, ct), HoTen = hoTen, SDT = sdt };
            db.KhachHang.Add(kh);
        }
        else
        {
            // SĐT đã là khách hàng thường / khách quen đã xóa → nâng cấp chính hồ sơ đó (Q24: dùng lại bản ghi cũ).
            kh.HoTen = hoTen;
        }

        if (kqCu is null)
            db.KhachQuen.Add(new KhachQuen { MaKH = kh.MaKH, CCCD = cccd, DiaChi = diaChi, TrangThai = TrangThaiKhachQuen.DangHoatDong, QuyenMuaNo = true });
        else
        {
            kqCu.CCCD = cccd;
            kqCu.DiaChi = diaChi;
            kqCu.TrangThai = TrangThaiKhachQuen.DangHoatDong;
            kqCu.QuyenMuaNo = true;
        }

        await LuuAsync(ct);
        await tx.CommitAsync(ct);
        return kh.MaKH;
    }

    public async Task SuaKhachQuenAsync(string maKH, YeuCauKhachQuen yc, CancellationToken ct)
    {
        var kq = await db.KhachQuen.Include(k => k.KhachHang)
            .FirstOrDefaultAsync(k => k.MaKH == maKH && k.TrangThai == TrangThaiKhachQuen.DangHoatDong, ct)
            ?? throw new LoiNghiepVuException(StatusCodes.Status404NotFound, KhongTimThayKhachQuen);
        var (hoTen, sdt, cccd, diaChi) = KiemTraDinhDang(yc, kq);

        // BR05: chỉ kiểm tra trùng với trường đã đổi.
        if (sdt != kq.KhachHang.SDT.Trim() && await db.KhachHang.AnyAsync(k => k.SDT == sdt && k.MaKH != maKH, ct))
            throw LoiNghiepVuException.TheoTruong("sdt", SdtTrung);
        if (cccd != kq.CCCD) await KiemTraCccdAsync(cccd, maKH, ct);

        kq.KhachHang.HoTen = hoTen;
        kq.KhachHang.SDT = sdt;
        kq.CCCD = cccd;
        kq.DiaChi = diaChi;
        await LuuAsync(ct);
    }

    /// <summary>UC_7.6: chỉ xóa khi dư nợ = 0; xóa mềm, giữ lịch sử (Q24, BR03).</summary>
    public async Task XoaKhachQuenAsync(string maKH, CancellationToken ct)
    {
        var kq = await db.KhachQuen.FirstOrDefaultAsync(k => k.MaKH == maKH && k.TrangThai == TrangThaiKhachQuen.DangHoatDong, ct)
            ?? throw new LoiNghiepVuException(StatusCodes.Status404NotFound, KhongTimThayKhachQuen);
        if (await HoaDonConNo().AnyAsync(n => n.MaKQ == maKH, ct))
            throw new LoiNghiepVuException(StatusCodes.Status409Conflict, "Không thể xóa khách quen còn dư nợ!");
        kq.TrangThai = TrangThaiKhachQuen.DaXoa;
        await LuuAsync(ct);
    }

    private (string HoTen, string Sdt, string Cccd, string DiaChi) KiemTraDinhDang(YeuCauKhachQuen yc, KhachQuen? cu)
    {
        var kt = new BoKiemTra();
        // BR01
        kt.Kiem("hoTen", !QuyTac.Trong(yc.HoTen), KhongDuocTrong)
          .Kiem("sdt", !QuyTac.Trong(yc.SDT), KhongDuocTrong)
          .Kiem("cccd", !QuyTac.Trong(yc.CCCD), KhongDuocTrong)
          .Kiem("diaChi", !QuyTac.Trong(yc.DiaChi), KhongDuocTrong);
        kt.NemNeuCoLoi(KhongDuocTrong);

        var hoTen = QuyTac.ChuanHoa(yc.HoTen!);
        var sdt = yc.SDT!.Replace(" ", "").Trim();
        var cccd = yc.CCCD!.Replace(" ", "").Trim();
        var diaChi = QuyTac.ChuanHoa(yc.DiaChi!);
        // BR02, BR03 (khi sửa: chỉ trường đã đổi – UC_7.4 BR05)
        if (cu is null || hoTen != cu.KhachHang.HoTen)
            kt.Kiem("hoTen", QuyTac.HoTenHopLe(hoTen, 50), "Họ tên chỉ gồm chữ cái và khoảng trắng, tối đa 50 ký tự");
        if (cu is null || sdt != cu.KhachHang.SDT.Trim())
            kt.Kiem("sdt", QuyTac.SoDienThoaiHopLe(sdt), SdtSai);
        if (cu is null || cccd != cu.CCCD)
            kt.Kiem("cccd", cccd.Length == 12 && cccd.All(char.IsAsciiDigit), CccdSai);
        kt.Kiem("diaChi", diaChi.Length <= 200, "Địa chỉ tối đa 200 ký tự");
        kt.NemNeuCoLoi();
        return (hoTen, sdt, cccd, diaChi);
    }

    private async Task KiemTraCccdAsync(string cccd, string? maBoQua, CancellationToken ct)
    {
        if (await db.KhachQuen.AnyAsync(k => k.CCCD == cccd && k.TrangThai == TrangThaiKhachQuen.DangHoatDong && k.MaKH != (maBoQua ?? ""), ct))
            throw LoiNghiepVuException.TheoTruong("cccd", CccdTrung);
    }

    private async Task LuuAsync(CancellationToken ct)
    {
        try
        {
            await db.SaveChangesAsync(ct);
        }
        catch (DbUpdateException ex) when (LoiTrungKhoa.TenChiMuc(ex) is { } chiMuc)
        {
            throw chiMuc switch
            {
                "UX_KhachHang_SDT" => LoiNghiepVuException.TheoTruong("sdt", SdtTrung),
                "UX_KhachQuen_CCCD" => LoiNghiepVuException.TheoTruong("cccd", CccdTrung),
                _ => new LoiNghiepVuException(StatusCodes.Status500InternalServerError, "Không thể lưu thông tin khách quen."),
            };
        }
    }

    // ================================================================ UC_7.1 Kiểm tra điều kiện ghi nợ (bước 7–10)

    /// <summary>
    /// 7.a: phải là khách quen đang hoạt động (BR01). 8.a: nợ cũ + đơn mới ≤ hạn mức (BR02).
    /// 9.a: khoản nợ cũ nhất chưa quá 30 ngày (BR03). Gọi trong transaction khi tạo hóa đơn để tính lại.
    /// </summary>
    public async Task<KiemTraGhiNo> KiemTraGhiNoAsync(string? maKH, decimal tongDon, CancellationToken ct)
    {
        var kq = await db.KhachQuen.AsNoTracking().Include(k => k.KhachHang)
            .FirstOrDefaultAsync(k => k.MaKH == maKH && k.TrangThai == TrangThaiKhachQuen.DangHoatDong, ct);
        if (kq is null) throw LoiGhiNo(ChuaLaKhachQuen, "ChuaLaKhachQuen");

        var no = (await TinhNoAsync([kq.MaKH], ct)).GetValueOrDefault(kq.MaKH);
        var noTruoc = no?.DuNo ?? 0;
        var hanMuc = await thamSo.LaySoAsync(KhoaCauHinh.HanMucNo, ct);
        if (noTruoc + tongDon > hanMuc) throw LoiGhiNo(VuotHanMuc, "VuotHanMuc");
        if (no?.TrangThai == TrangThaiNo.QuaHan) throw LoiGhiNo(QuaHan, "QuaHan");

        var soNgayNo = await thamSo.LaySoAsync(KhoaCauHinh.SoNgayNo, ct);
        return new KiemTraGhiNo(kq.MaKH, kq.KhachHang.HoTen, kq.KhachHang.SDT.Trim(), noTruoc, tongDon, noTruoc + tongDon,
            hanMuc, no?.NgayNoCuNhat, dongHo.HomNay.AddDays(soNgayNo));
    }

    private static LoiNghiepVuException LoiGhiNo(string thongBao, string maLoi) =>
        new(StatusCodes.Status409Conflict, thongBao, duLieuThem: new Dictionary<string, object?> { ["maLoi"] = maLoi });

    // ================================================================ UC_7.3 Phiếu thanh toán nợ

    /// <summary>Bước 6: khách đang có công nợ theo tên / SĐT.</summary>
    public async Task<List<KhachQuenDong>> KhachCoNoAsync(string? tuKhoa, CancellationToken ct)
    {
        var ds = await TimKhachQuenAsync(tuKhoa, null, ct);
        return ds.Where(x => x.DuNo > 0).ToList();
    }

    public async Task<PhieuThuNo> ThuNoAsync(YeuCauThuNo yc, CancellationToken ct)
    {
        var maND = hienTai.MaND!;
        if (yc.MaHoaDon is null || yc.MaHoaDon.Count == 0)
            throw LoiNghiepVuException.KhongHopLe("Vui lòng chọn hóa đơn nợ cần thanh toán.");
        var phuongThuc = yc.PhuongThuc?.Trim();
        if (phuongThuc is not (PhuongThucThanhToan.TienMat or PhuongThucThanhToan.ChuyenKhoanQr))
            throw LoiNghiepVuException.KhongHopLe("Phương thức thanh toán gồm Tiền mặt hoặc Chuyển khoản QR."); // BR01

        // Serializable: hai người cùng thu nợ một khách không trả trùng một hóa đơn.
        await using var tx = await db.MoGiaoDichTuanTuAsync(ct);
        var kq = await db.KhachQuen.Include(k => k.KhachHang).FirstOrDefaultAsync(k => k.MaKH == yc.MaKH, ct)
            ?? throw LoiNghiepVuException.KhongHopLe("Không tìm thấy khách hàng có công nợ!"); // BR04: kể cả bị khóa mua nợ
        var chuaTra = await HoaDonConNo().Include(n => n.HoaDon).Where(n => n.MaKQ == kq.MaKH)
            .OrderBy(n => n.HoaDon.NgayGioLap).ThenBy(n => n.MaHD).ToListAsync(ct);
        if (chuaTra.Count == 0) throw LoiNghiepVuException.KhongHopLe("Khách hàng không còn dư nợ.");

        // BR02: trả nguyên hóa đơn, theo thứ tự từ cũ nhất → phải là k hóa đơn đầu tiên.
        var chon = yc.MaHoaDon.Distinct().ToHashSet();
        var k = chon.Count;
        if (k > chuaTra.Count || !chuaTra.Take(k).All(n => chon.Contains(n.MaHD)))
            throw LoiNghiepVuException.KhongHopLe("Phải thanh toán theo thứ tự từ hóa đơn nợ cũ nhất, mỗi hóa đơn thanh toán đủ.");
        var duocTra = chuaTra.Take(k).ToList();
        var tong = duocTra.Sum(n => n.HoaDon.TongTien - n.HoaDon.SoTienDaTra);

        decimal tienTraLai = 0;
        var trangThai = TrangThaiPhieuThanhToan.ThanhCong;
        string? maGiaoDich = null;
        if (phuongThuc == PhuongThucThanhToan.TienMat)
        {
            if (!QuyTac.DocSoNguyen(yc.TienKhachDua, out var dua) || dua < tong)
                throw LoiNghiepVuException.TheoTruong("tienKhachDua", "Số tiền khách đưa chưa đủ.");
            tienTraLai = dua - tong;
        }
        else
        {
            maGiaoDich = $"QR{dongHo.BayGio:yyyyMMddHHmmss}{Random.Shared.Next(100, 999)}";
            if (yc.KetQuaQrGiaLap != "ThanhCong") trangThai = TrangThaiPhieuThanhToan.KhongThanhCong;
        }

        var bayGio = dongHo.BayGio;
        var ptt = new PhieuThanhToan
        {
            // BR06: mã PTTN chỉ cấp khi phiếu tạo thành công; lần QR lỗi dùng mã PTT thường.
            MaPTT = await sinhMa.SinhMaAsync(trangThai == TrangThaiPhieuThanhToan.ThanhCong ? LoaiMa.PhieuThanhToanNo : LoaiMa.PhieuThanhToan, ct),
            NgayGio = bayGio,
            LoaiPhieu = LoaiPhieuThanhToan.ThuNo,
            HuongTien = HuongTienTe.Thu,
            SoTien = tong,
            PhuongThuc = phuongThuc,
            TrangThai = trangThai,
            MaGiaoDichNganHang = maGiaoDich,
            MaND = maND,
            MaKQ = kq.MaKH,
        };
        db.PhieuThanhToan.Add(ptt);

        if (trangThai != TrangThaiPhieuThanhToan.ThanhCong)
        {
            await db.SaveChangesAsync(ct);
            await tx.CommitAsync(ct);
            throw new LoiNghiepVuException(StatusCodes.Status402PaymentRequired, "Thanh toán không thành công!"); // 12.a.4
        }

        // Bước 16 – BR03, Q18: đóng hóa đơn nợ đã trả → "Đã thanh toán".
        foreach (var n in duocTra)
        {
            var soTien = n.HoaDon.TongTien - n.HoaDon.SoTienDaTra;
            ptt.PhanBo.Add(new PhanBoThanhToan { MaHDNo = n.MaHD, SoTienPhanBo = soTien });
            n.HoaDon.SoTienDaTra = n.HoaDon.TongTien;
            n.HoaDon.TrangThai = TrangThaiHoaDon.DaThanhToan;
        }
        await db.SaveChangesAsync(ct);

        // BR05 (Q23): hết khoản quá hạn → mở khóa quyền mua nợ.
        await CapNhatQuyenMuaNoAsync([kq.MaKH], ct);
        await tx.CommitAsync(ct);

        var phieu = await PhieuThuNoAsync(ptt.MaPTT, ct);
        return phieu with { TienTraLai = tienTraLai };
    }

    public async Task<PhieuThuNo> PhieuThuNoAsync(string maPTT, CancellationToken ct)
    {
        var p = await db.PhieuThanhToan.AsNoTracking()
            .Include(x => x.NguoiDung).Include(x => x.KhachQuen!).ThenInclude(k => k.KhachHang)
            .Include(x => x.PhanBo).ThenInclude(b => b.HoaDonNo).ThenInclude(n => n.HoaDon)
            .FirstOrDefaultAsync(x => x.MaPTT == maPTT && x.LoaiPhieu == LoaiPhieuThanhToan.ThuNo, ct)
            ?? throw new LoiNghiepVuException(StatusCodes.Status404NotFound, "Không tìm thấy phiếu thanh toán");
        var tenCuaHang = await db.CauHinh.Where(c => c.MaCauHinh == KhoaCauHinh.TenCuaHang).Select(c => c.GiaTri).FirstOrDefaultAsync(ct)
            ?? ThamSoHeThong.MacDinh[KhoaCauHinh.TenCuaHang].GiaTri;
        var duNo = (await TinhNoAsync([p.MaKQ!], ct)).GetValueOrDefault(p.MaKQ!)?.DuNo ?? 0;
        return new PhieuThuNo(p.MaPTT, tenCuaHang, p.NgayGio, p.MaKQ!, p.KhachQuen!.KhachHang.HoTen, p.KhachQuen.KhachHang.SDT.Trim(),
            p.MaND, p.NguoiDung.HoTen, p.PhuongThuc,
            p.PhanBo.OrderBy(b => b.HoaDonNo.HoaDon.NgayGioLap)
                .Select(b => new HoaDonNoDong(b.MaHDNo, b.HoaDonNo.HoaDon.NgayGioLap, b.SoTienPhanBo, b.HoaDonNo.HanThanhToan, TrangThaiHoaDon.DaThanhToan))
                .ToList(),
            p.SoTien, duNo, 0);
    }

    /// <summary>UC_7.3 bước 18.a: gửi phiếu qua Zalo/SMS (giả lập).</summary>
    public async Task GuiPhieuAsync(YeuCauGuiPhieu yc, CancellationToken ct)
    {
        var p = await PhieuThuNoAsync(yc.MaPTT ?? "", ct);
        var kenh = yc.Kenh?.Trim();
        if (kenh is not ("SMS" or "Zalo")) throw LoiNghiepVuException.TheoTruong("kenh", "Vui lòng chọn kênh gửi SMS hoặc Zalo.");
        var sdt = (yc.SDT ?? "").Replace(" ", "").Trim();
        if (!QuyTac.SoDienThoaiHopLe(sdt)) throw LoiNghiepVuException.TheoTruong("sdt", "Số điện thoại không hợp lệ.");

        var nd = new StringBuilder($"{p.TenCuaHang} – PHIẾU THANH TOÁN {p.MaPTT}\n");
        foreach (var h in p.HoaDon) nd.AppendLine($"{h.MaHD}: {h.SoTien:N0} đ");
        nd.Append($"Tổng: {p.TongTien:N0} đ – Dư nợ còn lại: {p.DuNoConLai:N0} đ");
        var thanhCong = await guiChungTu.GuiAsync(kenh, sdt, nd.ToString(), ct);
        db.NhatKyGuiChungTu.Add(new NhatKyGuiChungTu
        {
            LoaiChungTu = "Phiếu thanh toán", MaChungTu = p.MaPTT, Kenh = kenh, SDTNhan = sdt,
            ThoiDiemGui = dongHo.BayGio, KetQua = thanhCong ? "Thành công" : "Không thành công", MaND = hienTai.MaND!,
        });
        await db.SaveChangesAsync(ct);
        if (!thanhCong)
            throw new LoiNghiepVuException(StatusCodes.Status502BadGateway, "Gửi phiếu thanh toán điện tử không thành công!");
    }

    // ================================================================ Q23: quyền mua nợ

    /// <summary>Khóa quyền mua nợ khi có khoản quá hạn; mở lại khi hết. Gọi sau thu nợ, hủy hóa đơn và hằng ngày.</summary>
    public async Task<int> CapNhatQuyenMuaNoAsync(List<string>? maKH, CancellationToken ct)
    {
        var q = db.KhachQuen.Where(k => k.TrangThai == TrangThaiKhachQuen.DangHoatDong);
        if (maKH is not null) q = q.Where(k => maKH.Contains(k.MaKH));
        var ds = await q.ToListAsync(ct);
        var no = await TinhNoAsync(ds.Select(k => k.MaKH).ToList(), ct);
        var soDoi = 0;
        foreach (var kq in ds)
        {
            var duocMua = no.GetValueOrDefault(kq.MaKH)?.TrangThai != TrangThaiNo.QuaHan;
            if (kq.QuyenMuaNo != duocMua) { kq.QuyenMuaNo = duocMua; soDoi++; }
        }
        await db.SaveChangesAsync(ct);
        return soDoi;
    }
}
