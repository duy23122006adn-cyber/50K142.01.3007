using Microsoft.AspNetCore.Http;
using XomNho.Api.BanHangQL;
using XomNho.Api.Common;
using XomNho.Api.CongNoQL;
using XomNho.Api.DoiTraQL;
using XomNho.Api.Domain;
using XomNho.Api.HangHoaQL;

namespace XomNho.Tests;

/// <summary>UC_6.3 Hủy hóa đơn bán hàng.</summary>
public class HuyHoaDonTests
{
    private static async Task<MoiTruongThu> CoHangAsync()
    {
        var mt = new MoiTruongThu();
        await mt.ThemHangAsync("Nước cam");
        await mt.ThemLoAsync("Nước cam", 50, 365); // LO-000001
        return mt;
    }

    [Fact]
    public async Task Huy_hoa_don_da_thanh_toan_hoan_kho_luu_nhat_ky_va_ban_sao()  // bước 13–18, BR06, BR07, BR11
    {
        using var mt = await CoHangAsync();
        var hd = await mt.BanAsync(null, ("HH-0001", 5));
        Assert.Equal(45, mt.Ton("LO-000001"));

        var kt = await mt.DvHuyHoaDon().KiemTraAsync(hd.MaHD, default);
        Assert.True(kt.DuocHuy);
        Assert.Equal((5, 50000m, 50000m), (kt.SoLuongHoanKho, kt.SoTienCanHoan, kt.GiamDoanhThu));

        await mt.DvHuyHoaDon().HuyAsync(new YeuCauHuyHoaDon(hd.MaHD, true, "  Khách   đổi ý "), default);
        Assert.Equal(50, mt.Ton("LO-000001"));
        Assert.Equal(TrangThaiHoaDon.DaHuy, (await mt.DvBanHang().ChiTietAsync(hd.MaHD, default)).TrangThai);

        var nk = await mt.DvHuyHoaDon().NhatKyAsync(hd.MaHD, default);
        Assert.Equal(("CQ001", "Khách đổi ý", 50000m, 50000m), (nk.MaNguoiHuy, nk.LyDoHuy, nk.TongTien, nk.SoTienCanHoan));
        Assert.Equal(TrangThaiHoaDon.DaThanhToan, nk.BanSao.TrangThai); // bản sao lúc chưa hủy
        Assert.Equal(5, nk.BanSao.Dong.Single().SoLuong);
    }

    [Fact]
    public async Task Khong_huy_lai_hoa_don_da_huy()  // BR01, BR12
    {
        using var mt = await CoHangAsync();
        var hd = await mt.BanAsync(null, ("HH-0001", 1));
        await mt.DvHuyHoaDon().HuyAsync(new YeuCauHuyHoaDon(hd.MaHD, true, "Lý do"), default);

        var kt = await mt.DvHuyHoaDon().KiemTraAsync(hd.MaHD, default);
        Assert.Equal((false, "Hóa đơn không đủ điều kiện hủy: đã bị hủy."), (kt.DuocHuy, kt.ThongBao));
        var loi = await Assert.ThrowsAsync<LoiNghiepVuException>(() =>
            mt.DvHuyHoaDon().HuyAsync(new YeuCauHuyHoaDon(hd.MaHD, true, "Lý do"), default));
        Assert.Equal("Hóa đơn không đủ điều kiện hủy: đã bị hủy.", loi.Message);
        Assert.Equal(50, mt.Ton("LO-000001")); // không hoàn kho lần hai
    }

    [Fact]
    public async Task Khach_da_nhan_hang_va_thieu_ly_do_khong_huy_duoc()  // 10.a, 12.a
    {
        using var mt = await CoHangAsync();
        var hd = await mt.BanAsync(null, ("HH-0001", 1));
        var loi = await Assert.ThrowsAsync<LoiNghiepVuException>(() =>
            mt.DvHuyHoaDon().HuyAsync(new YeuCauHuyHoaDon(hd.MaHD, false, "Lý do"), default));
        Assert.Equal(DichVuHuyHoaDon.KhachDaNhanHang, loi.Message);
        loi = await Assert.ThrowsAsync<LoiNghiepVuException>(() =>
            mt.DvHuyHoaDon().HuyAsync(new YeuCauHuyHoaDon(hd.MaHD, true, "   "), default));
        Assert.Equal("Vui lòng nhập lý do hủy.", loi.Loi!["lyDoHuy"]);
        Assert.Equal(TrangThaiHoaDon.DaThanhToan, (await mt.DvBanHang().ChiTietAsync(hd.MaHD, default)).TrangThai);
    }

    [Fact]
    public async Task Huy_hoa_don_no_giam_cong_no_so_tien_can_hoan_0()  // 16.a, BR06, BR09
    {
        using var mt = await CongNoTests.CoHangVaKhachQuenAsync();
        var hd = await mt.GhiNoAsync("KH-000001", ("HH-0001", 9));
        var kt = await mt.DvHuyHoaDon().HuyAsync(new YeuCauHuyHoaDon(hd.MaHD, true, "Khách không lấy"), default);

        Assert.Equal((true, 0m, 90000m, 90000m), (kt.LaHoaDonNo, kt.SoTienCanHoan, kt.GiamDoanhThu, kt.GiamCongNo));
        var ct = await mt.DvCongNo().ChiTietKhachQuenAsync("KH-000001", default);
        Assert.Equal((0m, TrangThaiNo.KhongNo), (ct.DuNo, ct.TrangThaiNo));
        Assert.Equal(0m, (await mt.DvHuyHoaDon().NhatKyAsync(hd.MaHD, default)).SoTienCanHoan);
    }

    [Fact]
    public async Task Huy_hoa_don_no_qua_han_mo_lai_quyen_mua_no()  // Q23
    {
        using var mt = await CongNoTests.CoHangVaKhachQuenAsync();
        var hd = await mt.GhiNoAsync("KH-000001", ("HH-0001", 1));
        mt.DongHo.Tien(TimeSpan.FromDays(31));
        await mt.DvCongNo().CapNhatQuyenMuaNoAsync(null, default);
        Assert.False((await mt.DvCongNo().ChiTietKhachQuenAsync("KH-000001", default)).QuyenMuaNo);

        await mt.DvHuyHoaDon().HuyAsync(new YeuCauHuyHoaDon(hd.MaHD, true, "Ghi nhầm"), default);
        Assert.True((await mt.DvCongNo().ChiTietKhachQuenAsync("KH-000001", default)).QuyenMuaNo);
    }

    [Fact]
    public async Task Hoa_don_no_da_thu_no_khong_huy_duoc()  // BR01.2
    {
        using var mt = await CongNoTests.CoHangVaKhachQuenAsync();
        var hd = await mt.GhiNoAsync("KH-000001", ("HH-0001", 1));
        await mt.DvCongNo().ThuNoAsync(new YeuCauThuNo("KH-000001", [hd.MaHD], "Tiền mặt", "10000", null), default);
        var kt = await mt.DvHuyHoaDon().KiemTraAsync(hd.MaHD, default);
        Assert.Equal("Hóa đơn không đủ điều kiện hủy: đã có thanh toán công nợ.", kt.ThongBao);
    }

    [Fact]
    public async Task Hoa_don_co_phieu_doi_tra_cho_duyet_khong_huy_duoc()  // BR01.3
    {
        using var mt = await CoHangAsync();
        var hd = await mt.BanAsync(null, ("HH-0001", 2));
        await mt.DvDoiTra().LapPhieuAsync(DoiTraTests.Tra(hd.MaHD, 1), default);
        var kt = await mt.DvHuyHoaDon().KiemTraAsync(hd.MaHD, default);
        Assert.Equal("Hóa đơn không đủ điều kiện hủy: đã có phiếu đổi trả.", kt.ThongBao);
    }

    [Fact]
    public async Task Khong_huy_khi_ca_dang_ket_ca()  // UC_9.1 BR07
    {
        using var mt = await CoHangAsync();
        var hd = await mt.BanAsync(null, ("HH-0001", 1));
        mt.Db.CaLamViec.Single().TrangThai = TrangThaiCa.DangKetCa;
        await mt.Db.SaveChangesAsync();
        await Assert.ThrowsAsync<LoiNghiepVuException>(() =>
            mt.DvHuyHoaDon().HuyAsync(new YeuCauHuyHoaDon(hd.MaHD, true, "Lý do"), default));
    }
}

/// <summary>UC_6.2 Xử lý đổi trả, UC_6.4 Duyệt phiếu đổi trả.</summary>
public class DoiTraTests
{
    internal static YeuCauLapPhieu Tra(string maHD, int soLuong, string maHH = "HH-0001") =>
        new(maHD, LoaiPhieuDoiTra.TraHang, [new DongYeuCauDoiTra(maHH, soLuong, null, null)],
            DichVuDoiTra.TinhTrangDat, false, null, "Khách mua nhầm");

    private static YeuCauLapPhieu Doi(string maHD, int soLuong, string maHHMoi, int soLuongMoi) =>
        new(maHD, LoaiPhieuDoiTra.DoiHang, [new DongYeuCauDoiTra("HH-0001", soLuong, maHHMoi, soLuongMoi)],
            DichVuDoiTra.TinhTrangDat, false, null, "Khách muốn đổi vị");

    /// <summary>HH-0001 Nước cam 10.000đ (LO-000001: 50), HH-0002 Nước táo 10.000đ, HH-0003 Sữa 25.000đ.</summary>
    private static async Task<MoiTruongThu> CoHangAsync()
    {
        var mt = new MoiTruongThu();
        await mt.ThemHangAsync("Nước cam");
        await mt.ThemLoAsync("Nước cam", 50, 365);
        await mt.ThemHangAsync("Nước táo");
        await mt.ThemLoAsync("Nước táo", 20, 365);
        await mt.DvHangHoa().ThemAsync(new YeuCauHangHoa("Sữa hộp", null, "DM09", "hộp", "20000", "25000", "5", "10"), default);
        await mt.ThemLoAsync("Sữa hộp", 3, 365);
        mt.DangNhapLa("NV001");
        return mt;
    }

    [Fact]
    public async Task Luong_tra_hang_lap_cho_duyet_duyet_hoan_tien_cong_kho()  // main flow 1–18
    {
        using var mt = await CoHangAsync();
        var hd = await mt.BanAsync(null, ("HH-0001", 3));
        Assert.Equal(47, mt.Ton("LO-000001"));

        var xem = await mt.DvDoiTra().HoaDonAsync(hd.MaHD, default);
        Assert.True(xem.DuocDoiTra);
        Assert.Equal(3, xem.Dong.Single().ConLai);

        var p = await mt.DvDoiTra().LapPhieuAsync(Tra(hd.MaHD, 2), default);
        Assert.Matches(@"^PDT-\d{2}/\d{2}/\d{4}\.001$", p.MaPDT);
        Assert.Equal((TrangThaiPhieuDoiTra.ChoDuyet, "Chờ kết quả", 20000m, 20000m), (p.TrangThai, p.TrangThaiXuLy, p.SoTienHoan, p.TienHoanKhach));
        Assert.Equal(47, mt.Ton("LO-000001")); // BR07: chờ duyệt chưa đổi tồn kho

        // Chưa duyệt thì chưa được hoàn tiền.
        await Assert.ThrowsAsync<LoiNghiepVuException>(() => mt.DvDoiTra().XuLyAsync(new YeuCauXuLyPhieu(p.MaPDT, null, null), default));

        mt.DangNhapLa("CQ001");
        p = await mt.DvDoiTra().DuyetAsync(p.MaPDT, default);
        Assert.Equal((TrangThaiPhieuDoiTra.DaDuyet, "Chờ hoàn tiền"), (p.TrangThai, p.TrangThaiXuLy));
        Assert.Contains(mt.Db.ThongBao, t => t.MaND == "NV001" && t.MaThamChieu == p.MaPDT); // BR08
        Assert.Equal(47, mt.Ton("LO-000001")); // UC_6.4 post-condition 4

        mt.DangNhapLa("NV001");
        p = await mt.DvDoiTra().XuLyAsync(new YeuCauXuLyPhieu(p.MaPDT, null, null), default);
        Assert.Equal("Hoàn tất", p.TrangThaiXuLy);
        Assert.Equal(49, mt.Ton("LO-000001"));
        var chi = mt.Db.PhieuThanhToan.Single(t => t.MaPDT == p.MaPDT);
        Assert.Equal((HuongTienTe.Chi, 20000m, LoaiPhieuThanhToan.DoiTra), (chi.HuongTien, chi.SoTien, chi.LoaiPhieu));

        // Không xử lý lại.
        await Assert.ThrowsAsync<LoiNghiepVuException>(() => mt.DvDoiTra().XuLyAsync(new YeuCauXuLyPhieu(p.MaPDT, null, null), default));
    }

    [Fact]
    public async Task So_luong_con_doi_tra_tru_ca_phieu_cho_duyet()  // BR02, 6.a
    {
        using var mt = await CoHangAsync();
        var hd = await mt.BanAsync(null, ("HH-0001", 2));
        await mt.DvDoiTra().LapPhieuAsync(Tra(hd.MaHD, 1), default);

        var dong = (await mt.DvDoiTra().HoaDonAsync(hd.MaHD, default)).Dong.Single();
        Assert.Equal((2, 0, 1, 1), (dong.DaMua, dong.DaDoiTra, dong.DangCho, dong.ConLai));
        var loi = await Assert.ThrowsAsync<LoiNghiepVuException>(() => mt.DvDoiTra().LapPhieuAsync(Tra(hd.MaHD, 2), default));
        Assert.Equal("Số lượng trả không hợp lệ. Số lượng còn được đổi trả: 1.", loi.Loi!["soLuong.HH-0001"]);
    }

    [Fact]
    public async Task Phieu_bi_tu_choi_tra_lai_so_luong_va_bat_buoc_ly_do()  // 13.a, UC_6.4 6a, BR04
    {
        using var mt = await CoHangAsync();
        var hd = await mt.BanAsync(null, ("HH-0001", 1));
        var p = await mt.DvDoiTra().LapPhieuAsync(Tra(hd.MaHD, 1), default);
        mt.DangNhapLa("CQ001");

        var loi = await Assert.ThrowsAsync<LoiNghiepVuException>(() => mt.DvDoiTra().TuChoiAsync(new YeuCauTuChoi(p.MaPDT, " "), default));
        Assert.Equal("Vui lòng nhập lý do từ chối.", loi.Loi!["lyDo"]);

        p = await mt.DvDoiTra().TuChoiAsync(new YeuCauTuChoi(p.MaPDT, "Hàng đã qua sử dụng"), default);
        Assert.Equal((TrangThaiPhieuDoiTra.TuChoi, "Hàng đã qua sử dụng", "Kết thúc"), (p.TrangThai, p.LyDoTuChoi, p.TrangThaiXuLy));
        Assert.Contains(mt.Db.ThongBao, t => t.NoiDung == "Phiếu đổi trả bị từ chối. Lý do: Hàng đã qua sử dụng.");
        Assert.Equal(1, (await mt.DvDoiTra().HoaDonAsync(hd.MaHD, default)).Dong.Single().ConLai);

        // BR02: không duyệt lại phiếu đã từ chối.
        await Assert.ThrowsAsync<LoiNghiepVuException>(() => mt.DvDoiTra().DuyetAsync(p.MaPDT, default));
    }

    [Fact]
    public async Task Hoa_don_qua_7_ngay_da_huy_con_no_khong_duoc_doi_tra()  // BR01, BR08, 5.a
    {
        using var mt = await CoHangAsync();
        var hd = await mt.BanAsync(null, ("HH-0001", 1));
        mt.DongHo.Tien(TimeSpan.FromDays(6)); // ngày lập là ngày 1 → hôm nay là ngày 7
        Assert.True((await mt.DvDoiTra().HoaDonAsync(hd.MaHD, default)).DuocDoiTra);
        mt.DongHo.Tien(TimeSpan.FromDays(1)); // ngày 8
        var xem = await mt.DvDoiTra().HoaDonAsync(hd.MaHD, default);
        Assert.Equal((false, "Hóa đơn đã hết hạn"), (xem.DuocDoiTra, xem.ThongBaoLoi));
        var loi = await Assert.ThrowsAsync<LoiNghiepVuException>(() => mt.DvDoiTra().LapPhieuAsync(Tra(hd.MaHD, 1), default));
        Assert.Equal("Hóa đơn đã hết hạn", loi.Message);
    }

    [Fact]
    public async Task Hoa_don_no_chua_tra_khong_doi_tra_tra_het_thi_duoc()  // BR08, Q18
    {
        using var mt = await CongNoTests.CoHangVaKhachQuenAsync();
        var hd = await mt.GhiNoAsync("KH-000001", ("HH-0001", 2));
        Assert.Equal("Hóa đơn nợ.", (await mt.DvDoiTra().HoaDonAsync(hd.MaHD, default)).ThongBaoLoi);
        await mt.DvCongNo().ThuNoAsync(new YeuCauThuNo("KH-000001", [hd.MaHD], "Tiền mặt", "20000", null), default);
        Assert.True((await mt.DvDoiTra().HoaDonAsync(hd.MaHD, default)).DuocDoiTra);
    }

    [Fact]
    public async Task Tinh_trang_hang_va_mo_ta_loi_nha_san_xuat()  // BR03, BR10, 8.a, 8.b
    {
        using var mt = await CoHangAsync();
        var hd = await mt.BanAsync(null, ("HH-0001", 2));
        var yc = Tra(hd.MaHD, 1) with { TinhTrang = ["Còn nguyên vẹn"] };
        var loi = await Assert.ThrowsAsync<LoiNghiepVuException>(() => mt.DvDoiTra().LapPhieuAsync(yc, default));
        Assert.Equal(DichVuDoiTra.HangKhongDuDieuKien, loi.Message);

        loi = await Assert.ThrowsAsync<LoiNghiepVuException>(() => mt.DvDoiTra().LapPhieuAsync(yc with { LoiNhaSanXuat = true }, default));
        Assert.Equal("Vui lòng ghi rõ mô tả lỗi do nhà sản xuất.", loi.Loi!["moTaLoi"]);

        var p = await mt.DvDoiTra().LapPhieuAsync(yc with { LoiNhaSanXuat = true, MoTaLoi = "Nắp chai bị hở" }, default);
        Assert.Equal(("Còn nguyên vẹn, Lỗi do nhà sản xuất", "Nắp chai bị hở"), (p.TinhTrangHang, p.MoTaLoi));
    }

    [Fact]
    public async Task Doi_hang_gia_cao_hon_thu_them_tien_mat_cong_cu_tru_moi()  // 9.a, 14.a.4–14.a.6, BR05, BR06
    {
        using var mt = await CoHangAsync();
        var hd = await mt.BanAsync(null, ("HH-0001", 2));
        var xem = await mt.DvDoiTra().XemTruocAsync(Doi(hd.MaHD, 1, "HH-0003", 1), default);
        Assert.Equal((10000m, 25000m, 15000m, 15000m, 0m), (xem.SoTienHoan, xem.GiaTriHangMoi, xem.ChenhLech, xem.CanThuThem, xem.TienHoanKhach));

        var p = await mt.DvDoiTra().LapPhieuAsync(Doi(hd.MaHD, 1, "HH-0003", 1), default);
        mt.DangNhapLa("CQ001");
        p = await mt.DvDoiTra().DuyetAsync(p.MaPDT, default);
        Assert.Equal("Chờ thu thêm", p.TrangThaiXuLy);

        mt.DangNhapLa("NV001");
        var loi = await Assert.ThrowsAsync<LoiNghiepVuException>(() => mt.DvDoiTra().XuLyAsync(new YeuCauXuLyPhieu(p.MaPDT, null, null), default));
        Assert.Equal(StatusCodes.Status400BadRequest, loi.MaTrangThai);

        p = await mt.DvDoiTra().XuLyAsync(new YeuCauXuLyPhieu(p.MaPDT, "Tiền mặt", null), default);
        Assert.Equal("Hoàn tất", p.TrangThaiXuLy);
        Assert.Equal((49, 2), (mt.Ton("LO-000001"), mt.Ton("LO-000003")));
        var thu = mt.Db.PhieuThanhToan.Single(t => t.MaPDT == p.MaPDT);
        Assert.Equal((HuongTienTe.Thu, 15000m), (thu.HuongTien, thu.SoTien));
        Assert.Equal("LO-000003", mt.Db.ChiTietDoiTra.Single().MaLoMoi);
    }

    [Fact]
    public async Task Doi_hang_QR_that_bai_roi_khong_hoan_tat()  // 14.a.7.3.a
    {
        using var mt = await CoHangAsync();
        var hd = await mt.BanAsync(null, ("HH-0001", 1));
        var p = await mt.DvDoiTra().LapPhieuAsync(Doi(hd.MaHD, 1, "HH-0003", 1), default);
        mt.DangNhapLa("CQ001");
        await mt.DvDoiTra().DuyetAsync(p.MaPDT, default);

        var loi = await Assert.ThrowsAsync<LoiNghiepVuException>(() =>
            mt.DvDoiTra().XuLyAsync(new YeuCauXuLyPhieu(p.MaPDT, "Chuyển khoản QR", "ThatBai"), default));
        Assert.Equal((StatusCodes.Status402PaymentRequired, "Thanh toán chưa thành công"), (loi.MaTrangThai, loi.Message));
        Assert.Equal(TrangThaiPhieuThanhToan.KhongThanhCong, mt.Db.PhieuThanhToan.Single(t => t.MaPDT == p.MaPDT).TrangThai);

        p = await mt.DvDoiTra().KhongHoanTatAsync(p.MaPDT, default);
        Assert.Equal((TrangThaiPhieuDoiTra.KhongHoanTat, "Kết thúc"), (p.TrangThai, p.TrangThaiXuLy));
        Assert.Equal((49, 3), (mt.Ton("LO-000001"), mt.Ton("LO-000003"))); // tồn kho không đổi
        // Phiếu không hoàn tất không giữ số lượng.
        Assert.Equal(1, (await mt.DvDoiTra().HoaDonAsync(hd.MaHD, default)).Dong.Single().ConLai);
    }

    [Fact]
    public async Task Doi_hang_giu_khoan_thu_khi_cap_nhat_kho_loi_va_thuc_hien_lai()  // 16.a
    {
        using var mt = await CoHangAsync();
        var hd = await mt.BanAsync(null, ("HH-0001", 1));
        var p = await mt.DvDoiTra().LapPhieuAsync(Doi(hd.MaHD, 1, "HH-0003", 3), default);
        mt.DangNhapLa("CQ001");
        await mt.DvDoiTra().DuyetAsync(p.MaPDT, default);

        // Sau khi lập phiếu, hàng mới bị bán hết một phần → cập nhật kho thất bại.
        await mt.BanAsync(null, ("HH-0003", 1));
        var loi = await Assert.ThrowsAsync<LoiNghiepVuException>(() =>
            mt.DvDoiTra().XuLyAsync(new YeuCauXuLyPhieu(p.MaPDT, "Chuyển khoản QR", "ThanhCong"), default));
        Assert.StartsWith(DichVuDoiTra.CapNhatKhongThanhCong, loi.Message);
        Assert.Equal(49, mt.Ton("LO-000001")); // hoàn tác cộng hàng cũ
        Assert.True((await mt.DvDoiTra().PhieuAsync(p.MaPDT, default)).DaThuThem); // khoản thu giữ nguyên

        await mt.ThemLoAsync("Sữa hộp", 5, 200);
        p = await mt.DvDoiTra().XuLyAsync(new YeuCauXuLyPhieu(p.MaPDT, null, null), default); // không thu lại
        Assert.Equal("Hoàn tất", p.TrangThaiXuLy);
        Assert.Single(mt.Db.PhieuThanhToan.Where(t => t.MaPDT == p.MaPDT));
    }

    [Fact]
    public async Task Doi_hang_gia_thap_hon_hoan_chenh_lech_va_ngang_gia()  // BR05
    {
        using var mt = await CoHangAsync();
        var hd = await mt.BanAsync(null, ("HH-0003", 2)); // 2 hộp sữa 50.000đ
        var yc = new YeuCauLapPhieu(hd.MaHD, LoaiPhieuDoiTra.DoiHang, [new DongYeuCauDoiTra("HH-0003", 1, "HH-0001", 2)],
            DichVuDoiTra.TinhTrangDat, false, null, "Đổi sang nước");
        var p = await mt.DvDoiTra().LapPhieuAsync(yc, default);
        Assert.Equal((-5000m, 5000m, 0m), (p.ChenhLech, p.TienHoanKhach, p.CanThuThem));

        var ngang = await mt.DvDoiTra().LapPhieuAsync(
            yc with { Dong = [new DongYeuCauDoiTra("HH-0003", 1, "HH-0003", 1)] }, default);
        Assert.Equal((0m, 0m, 0m), (ngang.ChenhLech, ngang.TienHoanKhach, ngang.CanThuThem));

        mt.DangNhapLa("CQ001");
        await mt.DvDoiTra().DuyetAsync(p.MaPDT, default);
        Assert.Equal("Chờ hoàn chênh lệch", (await mt.DvDoiTra().PhieuAsync(p.MaPDT, default)).TrangThaiXuLy);
        await mt.DvDoiTra().XuLyAsync(new YeuCauXuLyPhieu(p.MaPDT, null, null), default);
        Assert.Equal(5000m, mt.Db.PhieuThanhToan.Single(t => t.MaPDT == p.MaPDT && t.HuongTien == HuongTienTe.Chi).SoTien);

        await mt.DvDoiTra().DuyetAsync(ngang.MaPDT, default);
        Assert.Equal("Chờ cập nhật kho", (await mt.DvDoiTra().PhieuAsync(ngang.MaPDT, default)).TrangThaiXuLy);
        await mt.DvDoiTra().XuLyAsync(new YeuCauXuLyPhieu(ngang.MaPDT, null, null), default);
        Assert.Empty(mt.Db.PhieuThanhToan.Where(t => t.MaPDT == ngang.MaPDT)); // không phát sinh tiền
    }

    [Fact]
    public async Task Hang_moi_khong_du_ton_kho_luc_lap_phieu()  // 9.b.2
    {
        using var mt = await CoHangAsync();
        var hd = await mt.BanAsync(null, ("HH-0001", 1));
        var loi = await Assert.ThrowsAsync<LoiNghiepVuException>(() =>
            mt.DvDoiTra().XemTruocAsync(Doi(hd.MaHD, 1, "HH-0003", 4), default));
        Assert.Equal("Hàng mới không đủ tồn kho. Yêu cầu 4 hộp, tồn hiện có 3 hộp.", loi.Message);
    }

    [Fact]
    public async Task Danh_sach_cho_duyet_moi_nhat_truoc_va_nhan_vien_chi_thay_phieu_cua_minh()  // UC_6.4 BR09
    {
        using var mt = await CoHangAsync();
        var hd = await mt.BanAsync(null, ("HH-0001", 3));
        var p1 = await mt.DvDoiTra().LapPhieuAsync(Tra(hd.MaHD, 1), default);
        mt.DongHo.Tien(TimeSpan.FromMinutes(5));
        mt.DangNhapLa("CQ001");
        var p2 = await mt.DvDoiTra().LapPhieuAsync(Tra(hd.MaHD, 1), default);

        var ds = await mt.DvDoiTra().DanhSachAsync(null, dangXuLy: false, chiCuaToi: false, default);
        Assert.Equal([p2.MaPDT, p1.MaPDT], ds.Select(x => x.MaPDT));
        Assert.Equal("Chủ quán", ds[0].VaiTroNguoiLap);

        // Q9: Chủ quán tự duyệt phiếu mình lập.
        await mt.DvDoiTra().DuyetAsync(p2.MaPDT, default);
        mt.DangNhapLa("NV001");
        var cuaToi = await mt.DvDoiTra().DanhSachAsync(null, dangXuLy: true, chiCuaToi: true, default);
        Assert.Equal([p1.MaPDT], cuaToi.Select(x => x.MaPDT));
    }
}
