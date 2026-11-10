using Microsoft.AspNetCore.Http;
using XomNho.Api.BanHangQL;
using XomNho.Api.BaoCaoQL;
using XomNho.Api.Common;
using XomNho.Api.CongNoQL;
using XomNho.Api.Domain;
using XomNho.Api.DoiTraQL;
using XomNho.Api.HangHoaQL;

namespace XomNho.Tests;

/// <summary>UC_5.1–5.4 Xem báo cáo và thống kê.</summary>
public class BaoCaoTests
{
    private const string Ngay10 = "2026-11-10";
    private const string Ngay11 = "2026-11-11";

    /// <summary>
    /// Ngày 10/11 (nước cam, nước táo: nhập 8.000đ, bán 10.000đ; sữa hộp: nhập 20.000đ, bán 25.000đ):
    /// HĐ1 tiền mặt 3 cam, HĐ2 QR 2 táo, HĐ3 ghi nợ 1 cam, HĐ4 1 táo rồi hủy.
    /// Ngày 11/11: đổi 1 cam của HĐ1 lấy 1 sữa (thu thêm 15.000đ tiền mặt), duyệt và hoàn tất trong ngày 11/11.
    /// "Bánh quy" đang kinh doanh nhưng không bán được.
    /// </summary>
    private static async Task<MoiTruongThu> CoGiaoDichAsync()
    {
        var mt = new MoiTruongThu();
        await mt.ThemHangAsync("Nước cam");
        await mt.ThemLoAsync("Nước cam", 50, 365);
        await mt.ThemHangAsync("Nước táo");
        await mt.ThemLoAsync("Nước táo", 20, 365);
        await mt.DvHangHoa().ThemAsync(new YeuCauHangHoa("Sữa hộp", null, "DM10", "hộp", "20000", "25000", "1", "10"), default);
        await mt.ThemLoAsync("Sữa hộp", 3, 365);
        await mt.ThemHangAsync("Bánh quy");
        await mt.ThemLoAsync("Bánh quy", 30, 365);

        var hd1 = await mt.BanAsync(null, ("HH-0001", 3));
        var gio = new List<DongGioHang> { new("HH-0002", 2) };
        var qr = await mt.DvBanHang().ThanhToanAsync(new YeuCauThanhToan(null, gio, PhuongThucThanhToan.ChuyenKhoanQr, null, "ThanhCong"), default);
        await mt.DvBanHang().TaoHoaDonAsync(new YeuCauTaoHoaDon(qr.MaPTT, null, gio), default);
        var kq = await mt.DvCongNo().ThemKhachQuenAsync(new YeuCauKhachQuen("Trần Thị B", "0903456789", "079203001234", "71 Ngũ Hành Sơn"), default);
        await mt.GhiNoAsync(kq, ("HH-0001", 1));
        var hd4 = await mt.BanAsync(null, ("HH-0002", 1));
        await mt.DvHuyHoaDon().HuyAsync(new YeuCauHuyHoaDon(hd4.MaHD, true, "Khách không lấy"), default);

        mt.DongHo.Tien(TimeSpan.FromDays(1));
        var p = await mt.DvDoiTra().LapPhieuAsync(new YeuCauLapPhieu(hd1.MaHD, LoaiPhieuDoiTra.DoiHang,
            [new DongYeuCauDoiTra("HH-0001", 1, "HH-0003", 1)], DichVuDoiTra.TinhTrangDat, false, null, "Khách muốn đổi"), default);
        await mt.DvDoiTra().DuyetAsync(p.MaPDT, default); // Q9: Chủ quán tự duyệt
        await mt.DvDoiTra().XuLyAsync(new YeuCauXuLyPhieu(p.MaPDT, PhuongThucThanhToan.TienMat, null), default);
        return mt;
    }

    private static DichVuBaoCao Dv(MoiTruongThu mt) => new(mt.Db, mt.DongHo);

    [Theory]
    [InlineData(null, Ngay10, "tuNgay", DichVuBaoCao.KhongDeTrong)]                 // 3a
    [InlineData(Ngay10, " ", "denNgay", DichVuBaoCao.KhongDeTrong)]                 // 3a
    [InlineData(Ngay11, Ngay10, "tuNgay", DichVuBaoCao.NgayBatDauLonHon)]           // 4a
    [InlineData(Ngay10, "2026-11-12", "denNgay", DichVuBaoCao.VuotNgayHienTai)]     // BR01 (Q21)
    public void Ky_bao_cao_khong_hop_le(string? tu, string? den, string truong, string thongBao)
    {
        using var mt = new MoiTruongThu();
        mt.DongHo.Tien(TimeSpan.FromDays(1)); // hôm nay 11/11
        var loi = Assert.Throws<LoiNghiepVuException>(() => Dv(mt).DocKy(tu, den));
        Assert.Equal(thongBao, loi.Loi![truong]);
    }

    [Fact]
    public void Ky_mot_ngay_hop_le()  // Q21: bắt đầu = kết thúc
    {
        using var mt = new MoiTruongThu();
        Assert.Equal(new KyBaoCao(new DateOnly(2026, 11, 10), new DateOnly(2026, 11, 10)), Dv(mt).DocKy("10/11/2026", Ngay10));
    }

    [Fact]
    public async Task Doanh_thu_khong_tinh_hoa_don_huy_ghi_no_tinh_theo_ngay_tao()  // UC_5.2 bước 7, BR02, BR04
    {
        using var mt = await CoGiaoDichAsync();
        var bc = await Dv(mt).DoanhThuAsync(Ngay10, Ngay10, default);
        Assert.Equal((60000m, 3), (bc.TongDoanhThu, bc.SoDonHang));
        Assert.Equal((30000m, 20000m, 10000m), (bc.TienMat, bc.ChuyenKhoan, bc.GhiNo));
        Assert.Equal([("Nước cam", 40000m), ("Nước táo", 20000m)], bc.Dong.Select(d => (d.TenHH, d.DoanhThu)));
    }

    [Fact]
    public async Task Doi_tra_tinh_vao_ky_chua_ngay_duyet()  // Q19, UC_6.2 BR06
    {
        using var mt = await CoGiaoDichAsync();
        // Kỳ chỉ có phiếu đổi trả: −1 cam (10.000đ) + 1 sữa (25.000đ), thu thêm 15.000đ tiền mặt.
        var bc = await Dv(mt).DoanhThuAsync(Ngay11, Ngay11, default);
        Assert.Equal((15000m, 0, 15000m, 0m, 0m), (bc.TongDoanhThu, bc.SoDonHang, bc.TienMat, bc.ChuyenKhoan, bc.GhiNo));

        var gop = await Dv(mt).DoanhThuAsync(Ngay10, Ngay11, default);
        Assert.Equal((75000m, 45000m), (gop.TongDoanhThu, gop.TienMat));
        Assert.Equal(gop.TongDoanhThu, gop.TienMat + gop.ChuyenKhoan + gop.GhiNo);
    }

    [Fact]
    public async Task Loi_nhuan_dung_gia_von_luc_ban_va_luc_xuat_hang_moi()  // UC_5.1 BR02, Q20
    {
        using var mt = await CoGiaoDichAsync();
        // Giá nhập đổi sau khi bán không làm thay đổi số liệu đã có.
        var cam = mt.Db.HangHoa.Single(h => h.MaHH == "HH-0001");
        cam.GiaNhap = 9500;
        await mt.Db.SaveChangesAsync();

        var ngay10 = await Dv(mt).LoiNhuanAsync(Ngay10, Ngay10, default);
        Assert.Equal((60000m, 48000m, 12000m), (ngay10.TongDoanhThu, ngay10.TongGiaVon, ngay10.TongLoiNhuan));

        var ngay11 = await Dv(mt).LoiNhuanAsync(Ngay11, Ngay11, default);
        Assert.Equal((15000m, 12000m, 3000m), (ngay11.TongDoanhThu, ngay11.TongGiaVon, ngay11.TongLoiNhuan));
        var sua = ngay11.Dong.Single(d => d.MaHH == "HH-0003");
        Assert.Equal((25000m, 20000m, 5000m), (sua.DoanhThu, sua.GiaVon, sua.LoiNhuan));
        Assert.Equal(20000m, mt.Db.ChiTietDoiTra.Single().GiaVonHangMoi);
    }

    [Fact]
    public async Task Khong_co_giao_dich_thi_bao_khong_tim_thay()  // 5a
    {
        using var mt = await CoGiaoDichAsync();
        var loi = await Assert.ThrowsAsync<LoiNghiepVuException>(() => Dv(mt).LoiNhuanAsync("2026-11-01", "2026-11-09", default));
        Assert.Equal((StatusCodes.Status404NotFound, DichVuBaoCao.KhongCoDuLieu), (loi.MaTrangThai, loi.Message));
    }

    [Fact]
    public async Task So_sanh_chenh_lech_va_ty_le()  // bước 8–15, BR06–BR08, 12b, 13a
    {
        using var mt = await CoGiaoDichAsync();
        var ss = await Dv(mt).SoSanhAsync(DichVuBaoCao.ChiTieuDoanhThu, Ngay11, Ngay11, Ngay10, Ngay10, default);
        Assert.Equal(("Doanh thu", 15000m, 60000m, -45000m, -75.0m), (ss.ChiTieu, ss.KyBaoCao, ss.KySoSanh, ss.ChenhLech, ss.TyLe));

        ss = await Dv(mt).SoSanhAsync(DichVuBaoCao.ChiTieuLoiNhuan, Ngay10, Ngay10, Ngay11, Ngay11, default);
        Assert.Equal((12000m, 3000m, 9000m, 300.0m), (ss.KyBaoCao, ss.KySoSanh, ss.ChenhLech, ss.TyLe));

        var loi = await Assert.ThrowsAsync<LoiNghiepVuException>(() =>
            Dv(mt).SoSanhAsync(DichVuBaoCao.ChiTieuLoiNhuan, Ngay10, Ngay11, Ngay11, Ngay11, default));
        Assert.Equal(DichVuBaoCao.TrungKy, loi.Loi!["kySoSanh"]);

        loi = await Assert.ThrowsAsync<LoiNghiepVuException>(() =>
            Dv(mt).SoSanhAsync(DichVuBaoCao.ChiTieuLoiNhuan, Ngay10, Ngay10, "2026-11-01", "2026-11-05", default));
        Assert.Equal(DichVuBaoCao.KhongCoDuLieuKySoSanh, loi.Message);

        loi = await Assert.ThrowsAsync<LoiNghiepVuException>(() =>
            Dv(mt).SoSanhAsync(DichVuBaoCao.ChiTieuLoiNhuan, Ngay10, Ngay10, null, Ngay11, default));
        Assert.Equal(DichVuBaoCao.KhongDeTrong, loi.Loi!["tuNgaySoSanh"]); // 11a
    }

    [Fact]
    public async Task So_luong_ban_va_top_ban_chay_ban_cham()  // UC_5.3 BR02–BR05
    {
        using var mt = await CoGiaoDichAsync();
        var bc = await Dv(mt).SoLuongBanAsync(Ngay10, Ngay11, null, null, default);
        // Cam: 3 + 1 (ghi nợ) − 1 (đổi trả); táo: 2 (hóa đơn hủy không tính); sữa: 1 (hàng đổi mới).
        Assert.Equal([("Nước cam", 3), ("Nước táo", 2), ("Sữa hộp", 1)], bc.Dong.Select(d => (d.TenHH, d.SoLuongBan)));
        Assert.Equal(("Nước giải khát", "chai"), (bc.Dong[0].NhomHang, bc.Dong[0].DonViTinh));

        var chay = await Dv(mt).SoLuongBanAsync(Ngay10, Ngay11, DichVuBaoCao.TopBanChay, "2", default);
        Assert.Equal(["Nước cam", "Nước táo"], chay.Dong.Select(d => d.TenHH));

        var cham = await Dv(mt).SoLuongBanAsync(Ngay10, Ngay11, DichVuBaoCao.TopBanCham, "3", default);
        Assert.Equal([("Bánh quy", 0), ("Sữa hộp", 1), ("Nước táo", 2)], cham.Dong.Select(d => (d.TenHH, d.SoLuongBan)));

        var loi = await Assert.ThrowsAsync<LoiNghiepVuException>(() => Dv(mt).SoLuongBanAsync(Ngay10, Ngay11, DichVuBaoCao.TopBanCham, "0", default));
        Assert.True(loi.Loi!.ContainsKey("soLuong"));
    }

    [Fact]
    public async Task Ton_kho_theo_lo_va_bo_loc()  // UC_5.4 BR01–BR06
    {
        using var mt = new MoiTruongThu();
        await mt.ThemHangAsync("Mì tôm");          // ngưỡng hết hàng 5, sắp hết hạn 10 ngày
        await mt.ThemLoAsync("Mì tôm", 3, 5);      // LO-000001: sắp hết hàng + sắp hết hạn
        await mt.ThemHangAsync("Bánh quy");
        await mt.ThemLoAsync("Bánh quy", 2, 100);  // LO-000002: bán hết, rồi có lô mới
        await mt.BanAsync(null, ("HH-0002", 2));
        await mt.ThemLoAsync("Bánh quy", 20, 200); // LO-000003
        await mt.ThemHangAsync("Kẹo dẻo");
        await mt.ThemLoAsync("Kẹo dẻo", 10, 1);    // LO-000004: hết hạn sau 3 ngày
        await mt.ThemHangAsync("Nước suối");
        await mt.ThemLoAsync("Nước suối", 1, 300); // LO-000005: bán hết, không có lô mới
        await mt.BanAsync(null, ("HH-0004", 1));
        mt.DongHo.Tien(TimeSpan.FromDays(3));
        var soCanhBao = mt.Db.CanhBaoTonKho.Count();

        var tatCa = await Dv(mt).TonKhoAsync("Tất cả", default);
        Assert.Equal(
            [
                ("LO-000003", 20, "Còn hàng"),
                ("LO-000004", 10, "Hết hạn"),
                ("LO-000001", 3, "Sắp hết hàng, Sắp hết hạn"),
                ("LO-000005", 0, "Hết hàng"),
            ],
            tatCa.Dong.Select(d => (d.MaLo, d.SoLuongTon, string.Join(", ", d.TrangThai))));

        Assert.Equal(["LO-000004"], (await Dv(mt).TonKhoAsync(LoaiCanhBao.HetHan, default)).Dong.Select(d => d.MaLo));
        Assert.Equal(["LO-000001"], (await Dv(mt).TonKhoAsync(LoaiCanhBao.SapHetHan, default)).Dong.Select(d => d.MaLo));
        Assert.Equal(["LO-000001"], (await Dv(mt).TonKhoAsync(LoaiCanhBao.SapHetHang, default)).Dong.Select(d => d.MaLo));
        Assert.Equal(["LO-000005"], (await Dv(mt).TonKhoAsync(LoaiCanhBao.HetHang, default)).Dong.Select(d => d.MaLo)); // LO-000002 đã có lô mới
        Assert.Equal(soCanhBao, mt.Db.CanhBaoTonKho.Count()); // BR06: chỉ xem

        await Assert.ThrowsAsync<LoiNghiepVuException>(() => Dv(mt).TonKhoAsync("Còn hàng", default));
    }
}
