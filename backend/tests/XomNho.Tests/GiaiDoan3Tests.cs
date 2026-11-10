using Microsoft.AspNetCore.Http;
using XomNho.Api.BanHangQL;
using XomNho.Api.Common;
using XomNho.Api.Domain;
using XomNho.Api.KhachHangQL;
using XomNho.Api.NhanVienQL;

namespace XomNho.Tests;

/// <summary>Q10, Q11 – ca làm việc.</summary>
public class CaLamViecTests
{
    [Fact]
    public async Task Dang_nhap_mo_ca_nguoi_dang_nhap_sau_dung_chung_ca()
    {
        using var mt = new MoiTruongThu();
        await mt.DichVu.DangNhapAsync("nhanvien1", MoiTruongThu.MatKhauNV);
        await mt.DichVu.DangNhapAsync("chuquan", MoiTruongThu.MatKhauCQ);

        var ca = Assert.Single(mt.Db.CaLamViec);
        Assert.Equal("NV001", ca.MaND);           // người mở ca = người phụ trách
        Assert.Equal("CA-10112026-001", ca.MaCa);
        Assert.Equal(TrangThaiCa.DangHoatDong, ca.TrangThai);
    }

    [Fact]
    public async Task Ca_dang_ket_ca_chan_ban_hang_va_them_lo()  // UC_9.1 BR07
    {
        using var mt = new MoiTruongThu();
        await mt.ThemHangAsync("Nước cam");
        await mt.ThemLoAsync("Nước cam", 10, 100);
        var ca = await mt.DvCa().DamBaoCaMoAsync("CQ001", default);
        ca.TrangThai = TrangThaiCa.DangKetCa;
        await mt.Db.SaveChangesAsync();

        var loi = await Assert.ThrowsAsync<LoiNghiepVuException>(() => mt.BanAsync(null, ("HH-0001", 1)));
        Assert.StartsWith("Ca làm việc đang kết ca", loi.Message);
        await Assert.ThrowsAsync<LoiNghiepVuException>(() => mt.ThemLoAsync("Nước cam", 5, 100));
    }
}

/// <summary>UC_8.1–8.3 – khách hàng.</summary>
public class KhachHangTests
{
    [Fact]
    public async Task Them_hop_le_ma_KH_000001_va_tu_bo_khoang_trang()  // BR02, BR04
    {
        using var mt = new MoiTruongThu();
        var kh = await mt.DvKhachHang().ThemAsync(new YeuCauKhachHang("  Nguyễn   Thị Lan ", "0905111222"), default);
        Assert.Equal("KH-000001", kh.MaKH);
        Assert.Equal("Nguyễn Thị Lan", kh.HoTen);
    }

    [Theory]
    [InlineData("", "", "hoTen", "Không được để trống thông tin bắt buộc")]
    [InlineData("Trần Thị Mai1", "0978123456", "hoTen", "Họ tên chỉ gồm chữ cái và khoảng trắng, tối đa 50 ký tự")]
    [InlineData("Nguyễn Thị Lan Nguyễn Thị Lan Nguyễn Thị Lan Nguyễn Thị Lan", "0978123456", "hoTen", "Họ tên chỉ gồm chữ cái và khoảng trắng, tối đa 50 ký tự")]
    [InlineData("Trần Thị Mai", "097812345", "sdt", "Số điện thoại gồm 10 chữ số và bắt đầu bằng 0")]
    public async Task Kiem_tra_du_lieu(string hoTen, string sdt, string truong, string tb)  // 5a–5c
    {
        using var mt = new MoiTruongThu();
        var loi = await Assert.ThrowsAsync<LoiNghiepVuException>(() => mt.DvKhachHang().ThemAsync(new YeuCauKhachHang(hoTen, sdt), default));
        Assert.Equal(tb, loi.Loi![truong]);
    }

    [Fact]
    public async Task Trung_SDT_bao_kem_khach_dang_dung_va_sua_khong_bao_trung_voi_chinh_minh()  // 5d, UC_8.2 BR04
    {
        using var mt = new MoiTruongThu();
        var lan = await mt.DvKhachHang().ThemAsync(new YeuCauKhachHang("Nguyễn Thị Lan", "0905123456"), default);
        var loi = await Assert.ThrowsAsync<LoiNghiepVuException>(() =>
            mt.DvKhachHang().ThemAsync(new YeuCauKhachHang("Trần Thị Mai", "0905123456"), default));
        Assert.Equal("Số điện thoại đã được đăng ký", loi.Loi!["sdt"]);
        Assert.Equal("Nguyễn Thị Lan", Assert.IsType<KhachHangDong>(loi.DuLieuThem!["khachTrung"]).HoTen);

        await mt.DvKhachHang().SuaAsync(lan.MaKH, new YeuCauKhachHang("Nguyễn Thị Lan Anh", "0905123456"), default);
    }

    [Theory]
    [InlineData("lan", 2)]
    [InlineData("0978123", 1)]           // một phần SĐT
    [InlineData("+84978123456", 1)]      // BR02: +84 ≡ 0
    [InlineData("", 3)]                  // 5a: bỏ trống → toàn bộ
    public async Task Tim_kiem_theo_ten_hoac_SDT(string tuKhoa, int soKetQua)  // BR01
    {
        using var mt = new MoiTruongThu();
        await mt.DvKhachHang().ThemAsync(new YeuCauKhachHang("Nguyễn Thị Lan", "0905123456"), default);
        await mt.DvKhachHang().ThemAsync(new YeuCauKhachHang("Lan Phạm", "0911222333"), default);
        await mt.DvKhachHang().ThemAsync(new YeuCauKhachHang("Trần Thị Mai", "0978123456"), default);
        Assert.Equal(soKetQua, (await mt.DvKhachHang().TimKiemAsync(tuKhoa, 1, default)).TongSo);
    }

    [Fact]
    public async Task Tu_khoa_co_ky_tu_khong_hop_le()  // 5b, BR03
    {
        using var mt = new MoiTruongThu();
        var loi = await Assert.ThrowsAsync<LoiNghiepVuException>(() => mt.DvKhachHang().TimKiemAsync("Lan@", 1, default));
        Assert.Equal("Thông tin chứa ký tự không hợp lệ", loi.Loi!["tuKhoa"]);
    }

    [Fact]
    public async Task Mat_hang_thuong_mua_toi_da_5_bo_qua_hoa_don_huy()  // BR04–BR06
    {
        using var mt = new MoiTruongThu();
        var kh = await mt.DvKhachHang().ThemAsync(new YeuCauKhachHang("Nguyễn Thị Lan", "0905123456"), default);
        Assert.Empty((await mt.DvKhachHang().ChiTietAsync(kh.MaKH, default)).MatHangThuongMua); // BR06
        await mt.ThemHangAsync("Nước cam");
        await mt.ThemHangAsync("Bia Tiger");
        await mt.ThemLoAsync("Nước cam", 50, 100);
        await mt.ThemLoAsync("Bia Tiger", 50, 100);
        await mt.BanAsync(kh.MaKH, ("HH-0001", 2), ("HH-0002", 5));
        await mt.BanAsync(kh.MaKH, ("HH-0001", 4));
        await mt.BanAsync(null, ("HH-0001", 10)); // khách vãng lai – không tính

        var ds = (await mt.DvKhachHang().ChiTietAsync(kh.MaKH, default)).MatHangThuongMua;
        Assert.Equal([("HH-0001", 6), ("HH-0002", 5)], ds.Select(x => (x.MaHH, x.SoLuongDaMua)));
    }
}

/// <summary>UC_6.5 – tạo hóa đơn bán hàng.</summary>
public class BanHangTests
{
    private static async Task<MoiTruongThu> CoHangAsync()
    {
        var mt = new MoiTruongThu();
        await mt.ThemHangAsync("Nước cam");          // HH-0001: giá bán 10.000, giá nhập 8.000
        await mt.ThemLoAsync("Nước cam", 5, 30);     // LO-000001 – hạn gần
        await mt.ThemLoAsync("Nước cam", 20, 200);   // LO-000002 – hạn xa
        return mt;
    }

    [Fact]
    public async Task Ban_tien_mat_tao_hoa_don_tru_kho_FEFO_va_ghi_gia_von()  // 14, 15, BR10, BR11, Q20
    {
        using var mt = await CoHangAsync();
        var hd = await mt.BanAsync(null, ("HH-0001", 7));

        Assert.Equal("HD-10/11/2026.001", hd.MaHD);
        Assert.Equal(TrangThaiHoaDon.DaThanhToan, hd.TrangThai);
        Assert.Equal(70000, hd.TongTienThanhToan);
        Assert.Equal("Tiền mặt", hd.PhuongThuc);
        Assert.Null(hd.TenKhach); // khách vãng lai
        var dong = Assert.Single(hd.Dong);   // giao diện gộp theo mặt hàng
        Assert.Equal(7, dong.SoLuong);

        var ct = mt.Db.ChiTietHoaDon.OrderBy(c => c.MaLo).ToList();  // DB tách theo lô
        Assert.Equal([("LO-000001", 5), ("LO-000002", 2)], ct.Select(c => (c.MaLo, c.SoLuong)));
        Assert.All(ct, c => Assert.Equal(8000, c.GiaVon));
        Assert.Equal(0, mt.Db.LoHang.Single(l => l.MaLo == "LO-000001").SoLuongTon);
        Assert.Equal(18, mt.Db.LoHang.Single(l => l.MaLo == "LO-000002").SoLuongTon);
        Assert.Equal("CQ001", mt.Db.HoaDon.Single().MaND); // BR9: người bán = người đăng nhập
    }

    [Fact]
    public async Task Khong_du_hang_tinh_theo_tong_cac_dong_cung_san_pham()  // 6.a, BR03
    {
        using var mt = await CoHangAsync();
        var gio = new List<DongGioHang> { new("HH-0001", 15), new("HH-0001", 15) };
        var loi = await Assert.ThrowsAsync<LoiNghiepVuException>(() =>
            mt.DvBanHang().ThanhToanAsync(new YeuCauThanhToan(null, gio, "Tiền mặt", "999999", null), default));
        Assert.Equal("Sản phẩm Nước cam không đủ hàng. Số lượng tồn hiện có: 25.", loi.Message);
        Assert.Empty(mt.Db.PhieuThanhToan); // không thu tiền khi chưa đủ hàng
    }

    [Fact]
    public async Task Lo_het_han_khong_duoc_ban()  // BR11
    {
        using var mt = await CoHangAsync();
        mt.DongHo.Tien(TimeSpan.FromDays(31)); // LO-000001 hết hạn
        var sp = Assert.Single(await mt.DvBanHang().SanPhamAsync("nước", null, default));
        Assert.Equal(20, sp.TonBanDuoc);
    }

    [Fact]
    public async Task Tien_khach_dua_chua_du_bi_chan()  // 12
    {
        using var mt = await CoHangAsync();
        var loi = await Assert.ThrowsAsync<LoiNghiepVuException>(() => mt.DvBanHang().ThanhToanAsync(
            new YeuCauThanhToan(null, [new DongGioHang("HH-0001", 2)], "Tiền mặt", "15000", null), default));
        Assert.Equal("Số tiền khách đưa chưa đủ.", loi.Loi!["tienKhachDua"]);
    }

    [Fact]
    public async Task QR_that_bai_ghi_nhan_khong_thanh_cong_khong_tao_hoa_don()  // 11.b
    {
        using var mt = await CoHangAsync();
        var gio = new List<DongGioHang> { new("HH-0001", 2) };
        var loi = await Assert.ThrowsAsync<LoiNghiepVuException>(() =>
            mt.DvBanHang().ThanhToanAsync(new YeuCauThanhToan(null, gio, "Chuyển khoản QR", null, "ThatBai"), default));
        Assert.Equal(StatusCodes.Status402PaymentRequired, loi.MaTrangThai);
        var ptt = Assert.Single(mt.Db.PhieuThanhToan);
        Assert.Equal(TrangThaiPhieuThanhToan.KhongThanhCong, ptt.TrangThai);
        await Assert.ThrowsAsync<LoiNghiepVuException>(() =>
            mt.DvBanHang().TaoHoaDonAsync(new YeuCauTaoHoaDon(ptt.MaPTT, null, gio), default)); // BR04
        Assert.Empty(mt.Db.HoaDon);
    }

    [Fact]
    public async Task QR_thanh_cong_co_khach_hang_va_tao_lai_khong_nhan_doi()
    {
        using var mt = await CoHangAsync();
        var kh = await mt.DvKhachHang().ThemAsync(new YeuCauKhachHang("Nguyễn Thị Lan", "0905123456"), default);
        var gio = new List<DongGioHang> { new("HH-0001", 2) };
        var tt = await mt.DvBanHang().ThanhToanAsync(new YeuCauThanhToan(kh.MaKH, gio, "Chuyển khoản QR", null, "ThanhCong"), default);

        var hd = await mt.DvBanHang().TaoHoaDonAsync(new YeuCauTaoHoaDon(tt.MaPTT, kh.MaKH, gio), default);
        var lai = await mt.DvBanHang().TaoHoaDonAsync(new YeuCauTaoHoaDon(tt.MaPTT, kh.MaKH, gio), default);

        Assert.Equal(hd.MaHD, lai.MaHD);
        Assert.Single(mt.Db.HoaDon);
        Assert.Equal("Chuyển khoản QR", hd.PhuongThuc);
        Assert.Equal("Nguyễn Thị Lan", hd.TenKhach);
        Assert.Equal(23, mt.Db.LoHang.Sum(l => l.SoLuongTon));
    }

    [Fact]
    public async Task So_thu_tu_hoa_don_bat_dau_lai_moi_ngay()  // BR10
    {
        using var mt = await CoHangAsync();
        Assert.EndsWith(".001", (await mt.BanAsync(null, ("HH-0001", 1))).MaHD);
        Assert.EndsWith(".002", (await mt.BanAsync(null, ("HH-0001", 1))).MaHD);
        mt.DongHo.Tien(TimeSpan.FromDays(1));
        Assert.Equal("HD-11/11/2026.001", (await mt.BanAsync(null, ("HH-0001", 1))).MaHD);
    }

    [Fact]
    public async Task Gui_hoa_don_dien_tu_loi_khong_anh_huong_hoa_don()  // 16.a, BR6, BR8
    {
        using var mt = await CoHangAsync();
        var hd = await mt.BanAsync(null, ("HH-0001", 1));
        var dv = mt.DvBanHang();

        var loi = await Assert.ThrowsAsync<LoiNghiepVuException>(() => dv.GuiHoaDonAsync(new YeuCauGuiHoaDon(hd.MaHD, "SMS", ""), default));
        Assert.Equal("Khách hàng chưa có số điện thoại. Vui lòng nhập số điện thoại.", loi.Loi!["sdt"]);

        mt.GuiChungTu.ThanhCong = false;
        await Assert.ThrowsAsync<LoiNghiepVuException>(() => dv.GuiHoaDonAsync(new YeuCauGuiHoaDon(hd.MaHD, "Zalo", "0905888999"), default));
        Assert.Equal(TrangThaiHoaDon.DaThanhToan, mt.Db.HoaDon.Single().TrangThai);

        mt.GuiChungTu.ThanhCong = true;
        await dv.GuiHoaDonAsync(new YeuCauGuiHoaDon(hd.MaHD, "Zalo", "0905888999"), default);
        Assert.Equal(["Không thành công", "Thành công"], mt.Db.NhatKyGuiChungTu.OrderBy(x => x.MaGui).Select(x => x.KetQua));
        Assert.Empty(mt.Db.KhachHang); // BR8: không lưu SĐT vào hồ sơ khách
    }

    [Fact]
    public async Task Ban_het_lo_sinh_canh_bao_het_hang()  // UC_3.2 BR04
    {
        using var mt = await CoHangAsync();
        await mt.BanAsync(null, ("HH-0001", 5));
        Assert.Contains(mt.Db.CanhBaoTonKho, c => c.MaLo == "LO-000001" && c.LoaiCanhBao == LoaiCanhBao.HetHang);
    }
}

/// <summary>UC_6.1 – lịch sử bán hàng; UC_2.4 với dữ liệu ca/hóa đơn thật.</summary>
public class LichSuBanHangTests
{
    private static async Task<MoiTruongThu> CoHoaDonAsync()
    {
        var mt = new MoiTruongThu();
        await mt.ThemHangAsync("Nước cam");
        await mt.ThemLoAsync("Nước cam", 100, 100);
        var kh = await mt.DvKhachHang().ThemAsync(new YeuCauKhachHang("Nguyễn Thị Lan", "0905123456"), default);
        await mt.BanAsync(kh.MaKH, ("HH-0001", 2));
        await mt.BanAsync(null, ("HH-0001", 1));
        return mt;
    }

    private static Task<KetQuaTrang<HoaDonDong>> Tim(MoiTruongThu mt, string? ma = null, string? khach = null,
        string? tu = null, string? den = null, string? tt = null) =>
        mt.DvBanHang().TimKiemAsync(new DieuKienTimHoaDon(ma, khach, tu, den, tt), false, 1, default);

    [Theory]
    [InlineData(null, null, null, null, null, "Vui lòng nhập ít nhất một điều kiện.")]
    [InlineData("HD-03-11", null, null, null, null, "Mã hóa đơn phải có dạng HD-dd/mm/yyyy.nnn.")]
    [InlineData(null, null, "2026-11-11", null, null, "Ngày lập phải là ngày hợp lệ theo dd/mm/yyyy và không ở tương lai.")]
    [InlineData(null, null, "2026-11-10", "2026-11-01", null, "Ngày bắt đầu không được sau ngày kết thúc.")]
    public async Task Dieu_kien_khong_hop_le(string? ma, string? khach, string? tu, string? den, string? tt, string tb)  // 4.a, BR02
    {
        using var mt = await CoHoaDonAsync();
        var loi = await Assert.ThrowsAsync<LoiNghiepVuException>(() => Tim(mt, ma, khach, tu, den, tt));
        Assert.Equal(tb, loi.Message);
    }

    [Fact]
    public async Task Tim_theo_ma_ten_SDT_ngay_trang_thai()  // BR01–BR03
    {
        using var mt = await CoHoaDonAsync();
        Assert.Equal(1, (await Tim(mt, ma: "HD-10/11/2026.001")).TongSo);
        Assert.Equal(1, (await Tim(mt, khach: "lan")).TongSo);
        Assert.Equal(1, (await Tim(mt, khach: "0905-123")).TongSo);  // chỉ chữ số → theo SĐT
        Assert.Equal(2, (await Tim(mt, tu: "10/11/2026")).TongSo);   // một ngày
        Assert.Equal(2, (await Tim(mt, tt: "Đã thanh toán")).TongSo);
        Assert.Equal(0, (await Tim(mt, tt: "Đã hủy")).TongSo);

        var ds = (await Tim(mt, tu: "2026-11-10")).DanhSach;
        Assert.Equal("HD-10/11/2026.002", ds[0].MaHD); // mới nhất trước
        Assert.Null(ds[0].TenKhach);                   // khách vãng lai
    }

    [Fact]
    public async Task Chi_tiet_hoa_don_du_thong_tin_BR04()
    {
        using var mt = await CoHoaDonAsync();
        var hd = await mt.DvBanHang().ChiTietAsync("HD-10/11/2026.001", default);
        Assert.Equal("Tạp hóa Xóm Nhỏ", hd.TenCuaHang);
        Assert.Equal("Nguyễn Văn An", hd.NguoiBan);
        Assert.Equal(("Nguyễn Thị Lan", "0905123456"), (hd.TenKhach, hd.SdtKhach));
        Assert.Equal("Thanh toán ngay", hd.LoaiHoaDon);
        Assert.Equal(20000, hd.SoTienDaTra);
    }

    [Fact]
    public async Task Nhan_vien_da_lap_hoa_don_chi_duoc_ngung_hoat_dong_dang_trong_ca_thi_bi_chan()  // UC_2.4 BR02, BR04
    {
        using var mt = new MoiTruongThu();
        await mt.ThemHangAsync("Nước cam");
        await mt.ThemLoAsync("Nước cam", 10, 100);
        await mt.DichVu.DangNhapAsync("nhanvien1", MoiTruongThu.MatKhauNV); // NV001 mở ca

        var loi = await Assert.ThrowsAsync<LoiNghiepVuException>(() => mt.DvNhanVien().KiemTraXoaAsync("NV001", default));
        Assert.Equal("Không thể xử lý tài khoản nhân viên đang trong ca", loi.Message);

        var ca = mt.Db.CaLamViec.Single();
        ca.TrangThai = TrangThaiCa.DaKetThuc;
        ca.GioKetThuc = new TimeOnly(17, 0);
        await mt.Db.SaveChangesAsync();
        Assert.Equal(CheDoXoa.NgungHoatDong, (await mt.DvNhanVien().KiemTraXoaAsync("NV001", default)).CheDo);
    }
}
