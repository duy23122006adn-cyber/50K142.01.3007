using Microsoft.AspNetCore.Http;
using XomNho.Api.BanHangQL;
using XomNho.Api.Common;
using XomNho.Api.CongNoQL;
using XomNho.Api.Domain;
using XomNho.Api.KhachHangQL;

namespace XomNho.Tests;

/// <summary>UC_7.4–7.6 – khách quen.</summary>
public class KhachQuenTests
{
    private static YeuCauKhachQuen Yc(string hoTen = "Trần Thị B", string sdt = "0903456789", string cccd = "079203001234", string diaChi = "71 Ngũ Hành Sơn") =>
        new(hoTen, sdt, cccd, diaChi);

    [Fact]
    public async Task Them_khach_quen_moi_du_no_0_duoc_mua_no_trang_thai_khong_no()  // UC_7.5 post-condition, BR05
    {
        using var mt = new MoiTruongThu();
        var ma = await mt.DvCongNo().ThemKhachQuenAsync(Yc(), default);
        Assert.Equal("KH-000001", ma);

        var ct = await mt.DvCongNo().ChiTietKhachQuenAsync(ma, default);
        Assert.Equal((0m, TrangThaiNo.KhongNo, true), (ct.DuNo, ct.TrangThaiNo, ct.QuyenMuaNo));
    }

    [Theory]
    [InlineData("", "0903456789", "079203001234", "x", "hoTen", "Không được để trống!")]
    [InlineData("Trần Thị B", "090345678", "079203001234", "x", "sdt", "Số điện thoại không hợp lệ!")]
    [InlineData("Trần Thị B", "0903456789", "12345", "x", "cccd", "CCCD không hợp lệ!")]
    [InlineData("Trần Thị B", "0903456789", "079203001234", " ", "diaChi", "Không được để trống!")]
    public async Task Kiem_tra_du_lieu(string hoTen, string sdt, string cccd, string diaChi, string truong, string tb)  // 6.a–6.d
    {
        using var mt = new MoiTruongThu();
        var loi = await Assert.ThrowsAsync<LoiNghiepVuException>(() => mt.DvCongNo().ThemKhachQuenAsync(Yc(hoTen, sdt, cccd, diaChi), default));
        Assert.Equal(tb, loi.Loi![truong]);
    }

    [Fact]
    public async Task Trung_SDT_va_CCCD_voi_khach_quen_dang_hoat_dong()  // 6.c, 6.e
    {
        using var mt = new MoiTruongThu();
        await mt.DvCongNo().ThemKhachQuenAsync(Yc(), default);
        var loi = await Assert.ThrowsAsync<LoiNghiepVuException>(() => mt.DvCongNo().ThemKhachQuenAsync(Yc(cccd: "079203009999"), default));
        Assert.Equal("Số điện thoại đã trùng!", loi.Loi!["sdt"]);
        loi = await Assert.ThrowsAsync<LoiNghiepVuException>(() => mt.DvCongNo().ThemKhachQuenAsync(Yc(sdt: "0911000111"), default));
        Assert.Equal("CCCD đã trùng!", loi.Loi!["cccd"]);
    }

    [Fact]
    public async Task Khach_hang_thuong_duoc_nang_cap_thanh_khach_quen_giu_ma_cu()  // Q24
    {
        using var mt = new MoiTruongThu();
        var kh = await mt.DvKhachHang().ThemAsync(new YeuCauKhachHang("Trần Thị B", "0903456789"), default);
        var ma = await mt.DvCongNo().ThemKhachQuenAsync(Yc(), default);
        Assert.Equal(kh.MaKH, ma);
        Assert.Single(mt.Db.KhachHang);
    }

    [Fact]
    public async Task Xoa_mem_chi_khi_het_no_va_them_lai_dung_lai_ho_so()  // UC_7.6 BR01–BR03, Q24
    {
        using var mt = await CongNoTests.CoHangVaKhachQuenAsync();
        await mt.GhiNoAsync("KH-000001", ("HH-0001", 2));
        var loi = await Assert.ThrowsAsync<LoiNghiepVuException>(() => mt.DvCongNo().XoaKhachQuenAsync("KH-000001", default));
        Assert.Equal("Không thể xóa khách quen còn dư nợ!", loi.Message);

        var hd = (await mt.DvCongNo().HoaDonChuaTraAsync("KH-000001", default)).Select(h => h.MaHD).ToList();
        await mt.DvCongNo().ThuNoAsync(new YeuCauThuNo("KH-000001", hd, "Tiền mặt", "100000", null), default);
        await mt.DvCongNo().XoaKhachQuenAsync("KH-000001", default);

        Assert.Empty(await mt.DvCongNo().TimKhachQuenAsync(null, null, default));
        Assert.Single(mt.Db.HoaDonNo); // BR03: lịch sử hóa đơn nợ vẫn còn
        await Assert.ThrowsAsync<LoiNghiepVuException>(() => mt.GhiNoAsync("KH-000001", ("HH-0001", 1))); // BR02

        Assert.Equal("KH-000001", await mt.DvCongNo().ThemKhachQuenAsync(Yc(), default));
    }

    [Fact]
    public async Task Sua_khach_quen_chi_kiem_tra_truong_da_doi()  // UC_7.4 BR05
    {
        using var mt = new MoiTruongThu();
        var ma = await mt.DvCongNo().ThemKhachQuenAsync(Yc(), default);
        await mt.DvCongNo().SuaKhachQuenAsync(ma, Yc(diaChi: "45 Lê Lợi"), default);
        Assert.Equal("45 Lê Lợi", (await mt.DvCongNo().ChiTietKhachQuenAsync(ma, default)).DiaChi);
    }
}

/// <summary>UC_7.1 Tạo hóa đơn nợ, UC_7.2 trạng thái nợ, UC_7.3 Phiếu thanh toán nợ.</summary>
public class CongNoTests
{
    /// <summary>Hàng HH-0001 giá 10.000 (tồn 500), khách quen KH-000001.</summary>
    internal static async Task<MoiTruongThu> CoHangVaKhachQuenAsync()
    {
        var mt = new MoiTruongThu();
        await mt.ThemHangAsync("Nước cam");
        await mt.ThemLoAsync("Nước cam", 500, 365);
        await mt.DvCongNo().ThemKhachQuenAsync(new YeuCauKhachQuen("Trần Thị B", "0903456789", "079203001234", "71 Ngũ Hành Sơn"), default);
        return mt;
    }

    private static string? MaLoi(LoiNghiepVuException e) => e.DuLieuThem?["maLoi"] as string;

    [Fact]
    public async Task Tao_hoa_don_no_con_no_han_30_ngay_tru_kho()  // UC_7.1 post-condition, BR03
    {
        using var mt = await CoHangVaKhachQuenAsync();
        var hd = await mt.GhiNoAsync("KH-000001", ("HH-0001", 7));

        Assert.Equal(TrangThaiHoaDon.ConNo, hd.TrangThai);
        Assert.Equal("Ghi nợ", hd.LoaiHoaDon);
        Assert.Equal(("Trần Thị B", 70000m, 0m), (hd.TenKhach, hd.SoTienConNo, hd.SoTienDaTra));
        Assert.Equal(new DateOnly(2026, 12, 10), hd.HanThanhToan);
        Assert.Equal(493, mt.Db.LoHang.Sum(l => l.SoLuongTon));
        Assert.Equal(70000, (await mt.DvCongNo().ChiTietKhachQuenAsync("KH-000001", default)).DuNo);
    }

    [Fact]
    public async Task Khach_chua_la_khach_quen_khong_duoc_ghi_no()  // 7.a, BR01
    {
        using var mt = await CoHangVaKhachQuenAsync();
        var kh = await mt.DvKhachHang().ThemAsync(new YeuCauKhachHang("Lê Văn C", "0911222333"), default);
        var loi = await Assert.ThrowsAsync<LoiNghiepVuException>(() => mt.GhiNoAsync(kh.MaKH, ("HH-0001", 1)));
        Assert.Equal(("Khách hàng chưa là khách quen, không thể ghi nợ!", "ChuaLaKhachQuen"), (loi.Message, MaLoi(loi)));
    }

    [Fact]
    public async Task Tong_no_vuot_1_trieu_bi_chan()  // 8.a, BR02
    {
        using var mt = await CoHangVaKhachQuenAsync();
        await mt.GhiNoAsync("KH-000001", ("HH-0001", 60));                // 600.000
        await mt.GhiNoAsync("KH-000001", ("HH-0001", 40));                // tổng đúng 1.000.000 – vẫn được
        var loi = await Assert.ThrowsAsync<LoiNghiepVuException>(() => mt.GhiNoAsync("KH-000001", ("HH-0001", 1)));
        Assert.Equal(("Tổng nợ vượt quá hạn mức cho phép!", "VuotHanMuc"), (loi.Message, MaLoi(loi)));
        Assert.Equal(2, mt.Db.HoaDon.Count()); // không tạo, không trừ kho
    }

    [Theory]
    [InlineData(22, "Còn hạn")]
    [InlineData(23, "Sắp hết hạn")]
    [InlineData(30, "Sắp hết hạn")]
    [InlineData(31, "Quá hạn")]
    public async Task Trang_thai_no_theo_so_ngay(int soNgay, string trangThai)  // UC_7.2 BR02–BR04
    {
        using var mt = await CoHangVaKhachQuenAsync();
        await mt.GhiNoAsync("KH-000001", ("HH-0001", 1));
        mt.DongHo.Tien(TimeSpan.FromDays(soNgay));
        var ds = await mt.DvCongNo().TimKhachQuenAsync(null, trangThai, default);
        Assert.Equal("KH-000001", Assert.Single(ds).MaKH);
    }

    [Fact]
    public async Task No_qua_han_chan_ghi_no_va_khoa_quyen_mua_no()  // 9.a, BR03, Q23
    {
        using var mt = await CoHangVaKhachQuenAsync();
        await mt.GhiNoAsync("KH-000001", ("HH-0001", 1));
        mt.DongHo.Tien(TimeSpan.FromDays(31));

        var loi = await Assert.ThrowsAsync<LoiNghiepVuException>(() => mt.GhiNoAsync("KH-000001", ("HH-0001", 1)));
        Assert.Equal(("Khách hàng có khoản nợ quá hạn!", "QuaHan"), (loi.Message, MaLoi(loi)));
        await mt.DvCongNo().CapNhatQuyenMuaNoAsync(null, default);
        Assert.False((await mt.DvCongNo().ChiTietKhachQuenAsync("KH-000001", default)).QuyenMuaNo);
    }

    [Fact]
    public async Task Thu_no_phai_theo_thu_tu_cu_nhat_va_tra_du_hoa_don()  // UC_7.3 BR02
    {
        using var mt = await CoHangVaKhachQuenAsync();
        var hd1 = await mt.GhiNoAsync("KH-000001", ("HH-0001", 1));
        mt.DongHo.Tien(TimeSpan.FromHours(1));
        var hd2 = await mt.GhiNoAsync("KH-000001", ("HH-0001", 2));

        var loi = await Assert.ThrowsAsync<LoiNghiepVuException>(() =>
            mt.DvCongNo().ThuNoAsync(new YeuCauThuNo("KH-000001", [hd2.MaHD], "Tiền mặt", "999999", null), default));
        Assert.StartsWith("Phải thanh toán theo thứ tự", loi.Message);

        var phieu = await mt.DvCongNo().ThuNoAsync(new YeuCauThuNo("KH-000001", [hd1.MaHD], "Tiền mặt", "50000", null), default);
        Assert.Equal("PTTN-10/11/2026.001", phieu.MaPTT);   // BR06
        Assert.Equal((10000m, 20000m, 40000m), (phieu.TongTien, phieu.DuNoConLai, phieu.TienTraLai));
        Assert.Equal(TrangThaiHoaDon.DaThanhToan, mt.Db.HoaDon.Single(h => h.MaHD == hd1.MaHD).TrangThai); // BR03, Q18
        Assert.Equal(10000, Assert.Single(mt.Db.PhanBoThanhToan).SoTienPhanBo);
    }

    [Fact]
    public async Task Thu_het_no_qua_han_thi_mo_lai_quyen_mua_no()  // BR04, BR05, Q23
    {
        using var mt = await CoHangVaKhachQuenAsync();
        var hd = await mt.GhiNoAsync("KH-000001", ("HH-0001", 3));
        mt.DongHo.Tien(TimeSpan.FromDays(40));
        await mt.DvCongNo().CapNhatQuyenMuaNoAsync(null, default);
        Assert.False((await mt.DvCongNo().ChiTietKhachQuenAsync("KH-000001", default)).QuyenMuaNo);

        await mt.DvCongNo().ThuNoAsync(new YeuCauThuNo("KH-000001", [hd.MaHD], "Chuyển khoản QR", null, "ThanhCong"), default);

        var ct = await mt.DvCongNo().ChiTietKhachQuenAsync("KH-000001", default);
        Assert.Equal((true, TrangThaiNo.KhongNo), (ct.QuyenMuaNo, ct.TrangThaiNo));
        await mt.GhiNoAsync("KH-000001", ("HH-0001", 1)); // mua nợ lại được
    }

    [Fact]
    public async Task Thu_no_QR_that_bai_khong_dong_hoa_don()  // 12.a.4
    {
        using var mt = await CoHangVaKhachQuenAsync();
        var hd = await mt.GhiNoAsync("KH-000001", ("HH-0001", 3));
        var loi = await Assert.ThrowsAsync<LoiNghiepVuException>(() =>
            mt.DvCongNo().ThuNoAsync(new YeuCauThuNo("KH-000001", [hd.MaHD], "Chuyển khoản QR", null, "ThatBai"), default));
        Assert.Equal(StatusCodes.Status402PaymentRequired, loi.MaTrangThai);
        Assert.Equal(TrangThaiHoaDon.ConNo, mt.Db.HoaDon.Single().TrangThai);
        Assert.Equal(TrangThaiPhieuThanhToan.KhongThanhCong, mt.Db.PhieuThanhToan.Single().TrangThai);
    }

    [Fact]
    public async Task Lich_su_va_chi_tiet_khach_tinh_ca_hoa_don_no()  // UC_6.1 BR03, UC_8.3 BR05
    {
        using var mt = await CoHangVaKhachQuenAsync();
        var hd = await mt.GhiNoAsync("KH-000001", ("HH-0001", 4));

        var ds = await mt.DvBanHang().TimKiemAsync(new DieuKienTimHoaDon(null, "trần thị b", null, null, "Còn nợ"), false, 1, default);
        Assert.Equal(hd.MaHD, Assert.Single(ds.DanhSach).MaHD);
        Assert.Equal("Trần Thị B", ds.DanhSach[0].TenKhach);
        var mh = Assert.Single((await mt.DvKhachHang().ChiTietAsync("KH-000001", default)).MatHangThuongMua);
        Assert.Equal(4, mh.SoLuongDaMua);
    }

    [Fact]
    public async Task Gui_phieu_thanh_toan_ghi_nhat_ky()  // 18.a
    {
        using var mt = await CoHangVaKhachQuenAsync();
        var hd = await mt.GhiNoAsync("KH-000001", ("HH-0001", 1));
        var phieu = await mt.DvCongNo().ThuNoAsync(new YeuCauThuNo("KH-000001", [hd.MaHD], "Tiền mặt", "10000", null), default);

        mt.GuiChungTu.ThanhCong = false;
        var loi = await Assert.ThrowsAsync<LoiNghiepVuException>(() => mt.DvCongNo().GuiPhieuAsync(new YeuCauGuiPhieu(phieu.MaPTT, "Zalo", "0903456789"), default));
        Assert.Equal("Gửi phiếu thanh toán điện tử không thành công!", loi.Message);
        Assert.Equal("Phiếu thanh toán", mt.Db.NhatKyGuiChungTu.Single().LoaiChungTu);
    }
}
