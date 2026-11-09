using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using XomNho.Api.Common;
using XomNho.Api.Domain;
using XomNho.Api.HangHoaQL;
using XomNho.Api.NhanVienQL;
using XomNho.Api.TonKho;

namespace XomNho.Tests;

/// <summary>UC_2.1, UC_2.2, UC_2.4 – quản lý tài khoản nhân viên.</summary>
public class NhanVienTests
{
    private static YeuCauThemNhanVien HopLe(string ten = "nguyenvanan", string sdt = "0987654321", string email = "nva@gmail.com") =>
        new("Nguyễn Văn An", "2000-07-25", sdt, email, ten, "MatKhau123");

    [Fact]
    public async Task Them_hop_le_sinh_ma_NV002_vai_tro_nhan_vien_trang_thai_hoat_dong()
    {
        using var mt = new MoiTruongThu();
        var ma = await mt.DvNhanVien().ThemAsync(HopLe(), default);

        Assert.Equal("NV002", ma);
        var nv = Assert.IsType<NhanVien>(mt.Lay(ma));
        Assert.Equal(TrangThaiTaiKhoan.HoatDong, nv.TrangThai);
        Assert.StartsWith("$2", nv.MatKhau); // mật khẩu được băm
    }

    [Fact]
    public async Task Bo_trong_bao_tung_truong()  // 6a
    {
        using var mt = new MoiTruongThu();
        var loi = await Assert.ThrowsAsync<LoiNghiepVuException>(() =>
            mt.DvNhanVien().ThemAsync(new YeuCauThemNhanVien(" ", "", null, "", "", ""), default));
        Assert.Equal(6, loi.Loi!.Count);
        Assert.All(loi.Loi.Values, v => Assert.Equal("Vui lòng nhập đầy đủ thông tin bắt buộc", v));
    }

    [Theory]
    [InlineData("hoTen", "Nguyễn Văn An1", "2000-07-25", "0987654321", "nva@gmail.com", "nguyenvanan", "MatKhau123", "Họ và tên không hợp lệ")]
    [InlineData("ngaySinh", "Nguyễn Văn An", "2015-07-25", "0987654321", "nva@gmail.com", "nguyenvanan", "MatKhau123", "Ngày sinh không hợp lệ")]
    [InlineData("tenDangNhap", "Nguyễn Văn An", "2000-07-25", "0987654321", "nva@gmail.com", "nguyen van an", "MatKhau123", "Tên đăng nhập không hợp lệ")]
    [InlineData("sdt", "Nguyễn Văn An", "2000-07-25", "987654321", "nva@gmail.com", "nguyenvanan", "MatKhau123", "Số điện thoại không hợp lệ")]
    [InlineData("email", "Nguyễn Văn An", "2000-07-25", "0987654321", "nva gmail.com", "nguyenvanan", "MatKhau123", "Email không hợp lệ")]
    [InlineData("matKhau", "Nguyễn Văn An", "2000-07-25", "0987654321", "nva@gmail.com", "nguyenvanan", "1234", "Mật khẩu không đúng quy tắc")]
    public async Task Sai_dinh_dang(string truong, string hoTen, string ngaySinh, string sdt, string email, string ten, string mk, string thongBao)
    {
        using var mt = new MoiTruongThu();
        var loi = await Assert.ThrowsAsync<LoiNghiepVuException>(() =>
            mt.DvNhanVien().ThemAsync(new YeuCauThemNhanVien(hoTen, ngaySinh, sdt, email, ten, mk), default));
        Assert.Equal(thongBao, loi.Loi![truong]);
    }

    [Theory]
    [InlineData("NHANVIEN1", "0987654321", "a@b.vn", "tenDangNhap", "Tên đăng nhập đã tồn tại")]   // không phân biệt hoa thường
    [InlineData("moi_1", "0912345678", "a@b.vn", "sdt", "Số điện thoại đã được sử dụng")]
    [InlineData("moi_1", "0987654321", "cq@xomnho.vn", "email", "Email đã được sử dụng")]       // trùng cả với Chủ quán
    public async Task Trung_du_lieu(string ten, string sdt, string email, string truong, string thongBao)  // 6f–6h
    {
        using var mt = new MoiTruongThu();
        var loi = await Assert.ThrowsAsync<LoiNghiepVuException>(() => mt.DvNhanVien().ThemAsync(HopLe(ten, sdt, email), default));
        Assert.Equal(thongBao, loi.Loi![truong]);
    }

    [Fact]
    public async Task Sua_ghi_lich_su_truoc_sau_va_nguoi_sua()  // UC_2.2 BR06
    {
        using var mt = new MoiTruongThu();
        await mt.DvNhanVien().SuaAsync("NV001", new YeuCauSuaNhanVien("Trần Thị Mai Anh", "2000-03-15", "0912345678", "nv@xomnho.vn"), default);

        var ct = await mt.DvNhanVien().ChiTietAsync("NV001", default);
        Assert.Equal("Trần Thị Mai Anh", ct.HoTen);
        var ls = Assert.Single(ct.LichSu);
        Assert.Equal("CQ001", ls.MaCQ);
        Assert.Equal("Họ và tên: Trần Thị Mai", ls.NoiDungTruoc);
        Assert.Equal("Họ và tên: Trần Thị Mai Anh", ls.NoiDungSau);
    }

    [Fact]
    public async Task Sua_khong_thay_doi_thi_bao_va_khong_ghi_lich_su()  // 4b
    {
        using var mt = new MoiTruongThu();
        var loi = await Assert.ThrowsAsync<LoiNghiepVuException>(() =>
            mt.DvNhanVien().SuaAsync("NV001", new YeuCauSuaNhanVien("Trần Thị Mai", "2000-03-15", "0912345678", "nv@xomnho.vn"), default));
        Assert.Equal("Không có thông tin thay đổi", loi.Message);
        Assert.Empty(mt.Db.LichSuSuaNhanVien);
    }

    [Fact]
    public async Task Sua_trung_sdt_cua_nguoi_khac_bi_chan_nhung_giu_sdt_cu_cua_minh_thi_duoc()  // BR04
    {
        using var mt = new MoiTruongThu();
        var loi = await Assert.ThrowsAsync<LoiNghiepVuException>(() =>
            mt.DvNhanVien().SuaAsync("NV001", new YeuCauSuaNhanVien("Trần Thị Mai", "2000-03-15", MoiTruongThu.SdtChuQuan, "nv@xomnho.vn"), default));
        Assert.Equal("Số điện thoại đã được sử dụng", loi.Loi!["sdt"]);

        await mt.DvNhanVien().SuaAsync("NV001", new YeuCauSuaNhanVien("Trần Thị Mai", "2000-03-15", "0912345678", "mai@xomnho.vn"), default);
    }

    [Fact]
    public async Task Xoa_nhan_vien_chua_co_giao_dich_thi_xoa_han()  // BR04
    {
        using var mt = new MoiTruongThu();
        var kq = await mt.DvNhanVien().KiemTraXoaAsync("NV001", default);
        Assert.Equal(CheDoXoa.XoaHan, kq.CheDo);

        await mt.DvNhanVien().XoaAsync("NV001", kq.CheDo, default);
        Assert.False(await mt.Db.NguoiDung.AnyAsync(x => x.MaND == "NV001"));
    }

    [Fact]
    public async Task Ma_nhan_vien_da_xoa_khong_duoc_cap_lai()  // UC_2.1 BR05
    {
        using var mt = new MoiTruongThu();
        var ma1 = await mt.DvNhanVien().ThemAsync(HopLe(), default);
        await mt.DvNhanVien().XoaAsync(ma1, CheDoXoa.XoaHan, default);
        var ma2 = await mt.DvNhanVien().ThemAsync(HopLe(), default);
        Assert.NotEqual(ma1, ma2);
    }
}

/// <summary>UC_4.1–4.4 – hàng hóa.</summary>
public class HangHoaTests
{
    private static YeuCauHangHoa Yc(string ten = "Gạo ST25 10kg", string giaNhap = "45000", string giaBan = "55000",
        string? nguongHang = "5", string? nguongHan = "10", string maDM = "DM11", string dvt = "chai", string? maVach = null) =>
        new(ten, maVach, maDM, dvt, giaNhap, giaBan, nguongHang, nguongHan);

    [Fact]
    public async Task Them_hop_le_ma_HH_0001_va_xem_truoc_ma_ke_tiep()  // BR04, Q16
    {
        using var mt = new MoiTruongThu();
        var dv = mt.DvHangHoa();
        Assert.Equal("HH-0001", await dv.MaDuKienAsync(default));
        Assert.Equal("HH-0001", await dv.ThemAsync(Yc(), default));
        Assert.Equal("HH-0002", await dv.MaDuKienAsync(default));
    }

    [Fact]
    public async Task Bo_trong_cac_truong_bat_buoc()  // 5a
    {
        using var mt = new MoiTruongThu();
        var loi = await Assert.ThrowsAsync<LoiNghiepVuException>(() =>
            mt.DvHangHoa().ThemAsync(new YeuCauHangHoa("", null, "", "", "", "", null, null), default));
        foreach (var t in new[] { "tenHH", "maDM", "donViTinh", "giaNhap", "giaBan" })
            Assert.Equal("Không được để trống!", loi.Loi![t]);
        Assert.False(loi.Loi!.ContainsKey("nguongCanhBaoHetHang")); // ngưỡng không bắt buộc
    }

    [Theory]
    [InlineData("0", "55000", "5", "10", "giaNhap", "Giá nhập không hợp lệ!")]
    [InlineData("abc", "55000", "5", "10", "giaNhap", "Giá nhập không hợp lệ!")]
    [InlineData("45000", "-1", "5", "10", "giaBan", "Giá bán không hợp lệ!")]
    [InlineData("45000", "55000", "0", "10", "nguongCanhBaoHetHang", "Ngưỡng cảnh báo hết hàng không hợp lệ!")]
    [InlineData("45000", "55000", "5", "10/12/2026", "nguongCanhBaoHetHan", "Ngưỡng cảnh báo hết hạn không hợp lệ!")]
    public async Task Gia_va_nguong_phai_la_so_lon_hon_0(string giaNhap, string giaBan, string nHang, string nHan, string truong, string tb)  // 5c–5f, BR03
    {
        using var mt = new MoiTruongThu();
        var loi = await Assert.ThrowsAsync<LoiNghiepVuException>(() =>
            mt.DvHangHoa().ThemAsync(Yc(giaNhap: giaNhap, giaBan: giaBan, nguongHang: nHang, nguongHan: nHan), default));
        Assert.Equal(tb, loi.Loi![truong]);
    }

    [Fact]
    public async Task Ten_trung_khong_phan_biet_hoa_thuong()  // 5b, BR02
    {
        using var mt = new MoiTruongThu();
        await mt.DvHangHoa().ThemAsync(Yc(), default);
        var loi = await Assert.ThrowsAsync<LoiNghiepVuException>(() => mt.DvHangHoa().ThemAsync(Yc(ten: "gạo st25 10KG"), default));
        Assert.Equal("Tên hàng hóa đã tồn tại!", loi.Loi!["tenHH"]);
    }

    [Fact]
    public async Task Sua_chi_kiem_tra_truong_da_doi()  // UC_4.2 BR04
    {
        using var mt = new MoiTruongThu();
        var ma = await mt.DvHangHoa().ThemAsync(Yc(), default);
        await mt.DvHangHoa().SuaAsync(ma, Yc(giaBan: "60000"), default);   // giữ nguyên tên – không báo trùng với chính nó
        Assert.Equal(60000, (await mt.DvHangHoa().ChiTietAsync(ma, default)).GiaBan);
    }

    [Fact]
    public async Task Tim_kiem_khop_mot_phan_sap_xep_A_Z()  // UC_4.4 BR01, BR02
    {
        using var mt = new MoiTruongThu();
        await mt.ThemHangAsync("Nước cam");
        await mt.ThemHangAsync("Bia Tiger");
        await mt.ThemHangAsync("Nước suối");

        var kq = await mt.DvHangHoa().TimKiemAsync("Nước", 1, default);
        Assert.Equal(["Nước cam", "Nước suối"], kq.DanhSach.Select(x => x.TenHH));
    }

    [Fact]
    public async Task Xoa_hang_chua_co_giao_dich_thi_xoa_han()  // BR01
    {
        using var mt = new MoiTruongThu();
        var ma = await mt.ThemHangAsync("Nước cam");
        var kq = await mt.DvHangHoa().KiemTraXoaAsync(ma, default);
        Assert.Equal(CheDoXoa.XoaHan, kq.CheDo);
        await mt.DvHangHoa().XoaAsync(ma, kq.CheDo, default);
        Assert.False(await mt.Db.HangHoa.AnyAsync(x => x.MaHH == ma));
    }

    [Fact]
    public async Task Xoa_hang_con_ton_bi_chan()  // 5a, BR02
    {
        using var mt = new MoiTruongThu();
        var ma = await mt.ThemHangAsync("Nước cam");
        await mt.ThemLoAsync("Nước cam", 10, 100);
        var loi = await Assert.ThrowsAsync<LoiNghiepVuException>(() => mt.DvHangHoa().KiemTraXoaAsync(ma, default));
        Assert.Equal("Hàng hóa còn tồn kho, vui lòng điều chỉnh số lượng về 0", loi.Message);
    }

    [Fact]
    public async Task Xoa_hang_da_co_lo_va_ton_bang_0_thi_ngung_kinh_doanh_va_an_khoi_tim_kiem()  // BR01
    {
        using var mt = new MoiTruongThu();
        var ma = await mt.ThemHangAsync("Nước cam");
        var maLo = await mt.ThemLoAsync("Nước cam", 10, 100);
        await mt.DvTonKho().DieuChinhAsync(maLo, new YeuCauDieuChinh("0", null, "Hỏng hết"), default);

        var kq = await mt.DvHangHoa().KiemTraXoaAsync(ma, default);
        Assert.Equal(CheDoXoa.NgungKinhDoanh, kq.CheDo);
        await mt.DvHangHoa().XoaAsync(ma, kq.CheDo, default);

        Assert.Equal(TrangThaiHangHoa.NgungKinhDoanh, (await mt.DvHangHoa().ChiTietAsync(ma, default)).TrangThai);
        Assert.Empty((await mt.DvHangHoa().TimKiemAsync("Nước", 1, default)).DanhSach);
        Assert.Empty((await mt.DvTonKho().TimKiemAsync("Nước", 1, default)).DanhSach);
        await Assert.ThrowsAsync<LoiNghiepVuException>(() => mt.ThemLoAsync("Nước cam", 5, 100)); // UC_10.1 BR07
    }
}

/// <summary>UC_10.1 Thêm lô hàng, UC_3.1–3.3 tồn kho và cảnh báo.</summary>
public class TonKhoTests
{
    private static List<CanhBaoTonKho> CanhBaoMo(MoiTruongThu mt, string maLo) =>
        mt.Db.CanhBaoTonKho.Where(c => c.MaLo == maLo && c.TrangThai == TrangThaiCanhBao.ChuaXuLy).ToList();

    [Fact]
    public async Task Them_lo_ten_phai_trung_khop_hang_dang_kinh_doanh()  // 5b, BR03
    {
        using var mt = new MoiTruongThu();
        await mt.ThemHangAsync("Nước cam");
        Assert.Equal("LO-000001", await mt.ThemLoAsync("NƯỚC CAM", 40, 200));

        var loi = await Assert.ThrowsAsync<LoiNghiepVuException>(() => mt.ThemLoAsync("Nước ca", 40, 200));
        Assert.Equal("Vui lòng chọn hàng hóa đang kinh doanh có tên trùng khớp.", loi.Loi!["tenHangHoa"]);
    }

    [Theory]
    [InlineData("0", 10, "soLuong", "Số lượng không hợp lệ!")]
    [InlineData("-5", 10, "soLuong", "Số lượng không hợp lệ!")]
    [InlineData("40", -1, "hanSuDung", "Hạn sử dụng phải từ ngày hiện tại trở đi!")]
    public async Task Them_lo_kiem_tra_so_luong_va_han_su_dung(string soLuong, int hsdSauSoNgay, string truong, string tb)  // 5c, 5d
    {
        using var mt = new MoiTruongThu();
        await mt.ThemHangAsync("Nước cam");
        var loi = await Assert.ThrowsAsync<LoiNghiepVuException>(() => mt.DvTonKho().ThemLoAsync(
            new YeuCauThemLo("Nước cam", soLuong, mt.DongHo.HomNay.AddDays(hsdSauSoNgay).ToString("yyyy-MM-dd")), default));
        Assert.Equal(tb, loi.Loi![truong]);
    }

    [Fact]
    public async Task Lo_moi_it_hang_va_can_han_sinh_canh_bao()  // UC_3.2 BR01, BR02
    {
        using var mt = new MoiTruongThu();
        await mt.ThemHangAsync("Nước cam", nguongHang: "5", nguongHan: "10");
        var maLo = await mt.ThemLoAsync("Nước cam", 3, 7);

        var loai = CanhBaoMo(mt, maLo).Select(c => c.LoaiCanhBao).Order().ToList();
        Assert.Equal([LoaiCanhBao.SapHetHan, LoaiCanhBao.SapHetHang], loai);
    }

    [Fact]
    public async Task Nhap_lo_moi_dong_canh_bao_hang_va_canh_bao_han_cua_lo_cu_co_HSD_som_hon()  // UC_10.1 bước 9, BR06
    {
        using var mt = new MoiTruongThu();
        await mt.ThemHangAsync("Nước cam", nguongHang: "5", nguongHan: "10");
        var loCu = await mt.ThemLoAsync("Nước cam", 3, 7);
        Assert.Equal(2, CanhBaoMo(mt, loCu).Count);

        await mt.ThemLoAsync("Nước cam", 40, 200);

        Assert.Empty(CanhBaoMo(mt, loCu));
        Assert.All(mt.Db.CanhBaoTonKho.Where(c => c.MaLo == loCu), c => Assert.NotNull(c.ThoiDiemXuLy));
    }

    [Fact]
    public async Task Canh_bao_dang_mo_cung_loai_khong_tao_trung()  // BR05
    {
        using var mt = new MoiTruongThu();
        await mt.ThemHangAsync("Nước cam", nguongHang: "5", nguongHan: null);
        var maLo = await mt.ThemLoAsync("Nước cam", 4, 300);
        await mt.DvTonKho().DieuChinhAsync(maLo, new YeuCauDieuChinh("3", null, "Kiểm kê"), default);

        Assert.Single(mt.Db.CanhBaoTonKho.Where(c => c.MaLo == maLo && c.LoaiCanhBao == LoaiCanhBao.SapHetHang));
    }

    [Fact]
    public async Task Quet_hang_ngay_sinh_canh_bao_het_han_khi_qua_HSD()  // BR03, BR04
    {
        using var mt = new MoiTruongThu();
        await mt.ThemHangAsync("Sữa tươi", nguongHang: null, nguongHan: "3");
        var maLo = await mt.ThemLoAsync("Sữa tươi", 10, 1);
        mt.DongHo.Tien(TimeSpan.FromDays(2)); // HSD < hôm nay

        await mt.DvCanhBao().QuetHangNgayAsync(default);

        Assert.Contains(CanhBaoMo(mt, maLo), c => c.LoaiCanhBao == LoaiCanhBao.HetHan);
        var kq = await mt.DvTonKho().CanhBaoAsync(LoaiCanhBao.HetHan, false, default);
        Assert.Equal(-1, Assert.Single(kq.DanhSach).SoNgayConLai); // BR08
    }

    [Fact]
    public async Task Dieu_chinh_ton_ghi_phieu_cap_nhat_ton_va_kiem_tra_du_lieu()  // UC_3.3
    {
        using var mt = new MoiTruongThu();
        await mt.ThemHangAsync("Nước cam");
        var maLo = await mt.ThemLoAsync("Nước cam", 44, 200);
        var dv = mt.DvTonKho();

        var loi = await Assert.ThrowsAsync<LoiNghiepVuException>(() => dv.DieuChinhAsync(maLo, new YeuCauDieuChinh("-4", null, ""), default));
        Assert.Equal("Không được để trống", loi.Loi!["lyDo"]);           // 11a
        Assert.Equal("Giá trị không hợp lệ!", loi.Loi!["soLuongThucTe"]); // 11b

        var quaKhu = mt.DongHo.HomNay.AddDays(-1).ToString("yyyy-MM-dd");
        loi = await Assert.ThrowsAsync<LoiNghiepVuException>(() => dv.DieuChinhAsync(maLo, new YeuCauDieuChinh("40", quaKhu, "x"), default));
        Assert.Equal("Hạn sử dụng phải từ ngày hiện tại trở đi!", loi.Loi!["hanSuDung"]); // 11c

        await dv.DieuChinhAsync(maLo, new YeuCauDieuChinh("40", null, "Kiểm kê thực tế thiếu 4 chai so với hệ thống."), default);
        var phieu = Assert.Single(mt.Db.PhieuDieuChinhTon);
        Assert.Equal(44, phieu.SoLuongHeThong);
        Assert.Equal(40, phieu.SoLuongThucTe);
        Assert.Equal(40, mt.Db.LoHang.Single(l => l.MaLo == maLo).SoLuongTon);
    }

    [Fact]
    public async Task Lo_co_canh_bao_sap_het_han_khong_duoc_sua_HSD_lo_het_han_khong_duoc_dieu_chinh()  // BR05
    {
        using var mt = new MoiTruongThu();
        await mt.ThemHangAsync("Sữa tươi", nguongHang: null, nguongHan: "5");
        var maLo = await mt.ThemLoAsync("Sữa tươi", 10, 3);
        var hsdMoi = mt.DongHo.HomNay.AddDays(30).ToString("yyyy-MM-dd");

        var loi = await Assert.ThrowsAsync<LoiNghiepVuException>(() =>
            mt.DvTonKho().DieuChinhAsync(maLo, new YeuCauDieuChinh("10", hsdMoi, "Sửa hạn"), default));
        Assert.True(loi.Loi!.ContainsKey("hanSuDung"));
        await mt.DvTonKho().DieuChinhAsync(maLo, new YeuCauDieuChinh("9", null, "Vỡ 1 hộp"), default); // sửa số lượng vẫn được

        mt.DongHo.Tien(TimeSpan.FromDays(4));
        await mt.DvCanhBao().QuetHangNgayAsync(default);
        Assert.True((await mt.DvTonKho().LayLoDieuChinhAsync(maLo, default)).KhoaToanBo);
        await Assert.ThrowsAsync<LoiNghiepVuException>(() =>
            mt.DvTonKho().DieuChinhAsync(maLo, new YeuCauDieuChinh("8", null, "x"), default));
    }

    [Fact]
    public async Task Tim_kiem_ton_kho_theo_ten_hoac_ma_hang()  // UC_3.1 BR01
    {
        using var mt = new MoiTruongThu();
        var ma = await mt.ThemHangAsync("Nước cam");
        await mt.ThemHangAsync("Bia Tiger");
        await mt.ThemLoAsync("Nước cam", 10, 100);
        await mt.ThemLoAsync("Bia Tiger", 10, 100);

        Assert.Single((await mt.DvTonKho().TimKiemAsync("nƯỚc", 1, default)).DanhSach);
        Assert.Single((await mt.DvTonKho().TimKiemAsync(ma, 1, default)).DanhSach);
        Assert.Equal(2, (await mt.DvTonKho().TimKiemAsync("", 1, default)).TongSo);
    }
}
