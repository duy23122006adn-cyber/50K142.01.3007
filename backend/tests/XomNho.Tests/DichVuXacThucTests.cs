using Microsoft.AspNetCore.Http;
using XomNho.Api.Common;
using XomNho.Api.Domain;
using XomNho.Api.XacThuc;

namespace XomNho.Tests;

/// <summary>UC_1 Đăng nhập.</summary>
public class DangNhapTests
{
    [Fact]
    public async Task Dang_nhap_thanh_cong_tra_token_va_vai_tro()
    {
        using var mt = new MoiTruongThu();
        var kq = await mt.DichVu.DangNhapAsync("chuquan", MoiTruongThu.MatKhauCQ);

        Assert.False(string.IsNullOrEmpty(kq.AccessToken));
        Assert.Equal(VaiTroNguoiDung.ChuQuan, kq.NguoiDung.VaiTro);
        Assert.True(await mt.DichVu.PhienConHieuLucAsync(LayMaPhien(mt)));
    }

    [Fact]
    public async Task Bo_trong_bao_khong_duoc_bo_trong_tung_truong()  // 5.a
    {
        using var mt = new MoiTruongThu();
        var loi = await Assert.ThrowsAsync<LoiNghiepVuException>(() => mt.DichVu.DangNhapAsync("  ", ""));

        Assert.Equal(StatusCodes.Status400BadRequest, loi.MaTrangThai);
        Assert.Equal("Không được bỏ trống!", loi.Loi!["tenDangNhap"]);
        Assert.Equal("Không được bỏ trống!", loi.Loi!["matKhau"]);
    }

    [Fact]
    public async Task Sai_mat_khau_dem_so_lan_va_bao_khong_thanh_cong()  // 5.b
    {
        using var mt = new MoiTruongThu();
        var loi = await Assert.ThrowsAsync<LoiNghiepVuException>(() => mt.DichVu.DangNhapAsync("nhanvien1", "sai12345"));

        Assert.Equal("Đăng nhập không thành công!", loi.Message);
        Assert.Equal(1, mt.Lay("NV001").SoLanNhapSai);
    }

    [Fact]
    public async Task Ten_dang_nhap_khong_ton_tai_khong_dem()  // BR06
    {
        using var mt = new MoiTruongThu();
        for (var i = 0; i < 12; i++)
            await Assert.ThrowsAsync<LoiNghiepVuException>(() => mt.DichVu.DangNhapAsync("khongco", "sai12345"));

        Assert.Equal(0, mt.Lay("NV001").SoLanNhapSai);
        Assert.Empty(mt.GuiOtp.DaGui);
    }

    [Fact]
    public async Task Sai_10_lan_lien_tiep_khoa_tam_va_gui_OTP_toi_SDT_chu_quan()  // 5.c, BR02, BR03
    {
        using var mt = new MoiTruongThu();
        for (var i = 1; i <= 9; i++)
        {
            var l = await Assert.ThrowsAsync<LoiNghiepVuException>(() => mt.DichVu.DangNhapAsync("nhanvien1", "sai12345"));
            Assert.Equal(StatusCodes.Status401Unauthorized, l.MaTrangThai);
        }

        var loi = await Assert.ThrowsAsync<LoiNghiepVuException>(() => mt.DichVu.DangNhapAsync("nhanvien1", "sai12345"));

        Assert.Equal(StatusCodes.Status423Locked, loi.MaTrangThai);
        Assert.Equal("Tài khoản đang bị khóa tạm thời!", loi.Message);
        Assert.Equal(TrangThaiTaiKhoan.KhoaTam, mt.Lay("NV001").TrangThai);
        var (sdt, ma, ten) = Assert.Single(mt.GuiOtp.DaGui);
        Assert.Equal(MoiTruongThu.SdtChuQuan, sdt);        // chỉ gửi tới SĐT Chủ quán
        Assert.Equal("nhanvien1", ten);
        Assert.Equal(ma, loi.DuLieuThem!["maOtpGiaLap"]);  // hiển thị giả lập ở môi trường demo
    }

    [Fact]
    public async Task Dang_nhap_thanh_cong_dat_lai_so_lan_sai()  // BR07
    {
        using var mt = new MoiTruongThu();
        for (var i = 0; i < 3; i++)
            await Assert.ThrowsAsync<LoiNghiepVuException>(() => mt.DichVu.DangNhapAsync("nhanvien1", "sai12345"));

        await mt.DichVu.DangNhapAsync("nhanvien1", MoiTruongThu.MatKhauNV);
        Assert.Equal(0, mt.Lay("NV001").SoLanNhapSai);
    }

    [Fact]
    public async Task Dang_bi_khoa_thi_dung_mat_khau_cung_khong_vao_duoc_va_gui_lai_OTP()  // BR04, 5.f
    {
        using var mt = new MoiTruongThu();
        await KhoaTaiKhoan(mt);

        var loi = await Assert.ThrowsAsync<LoiNghiepVuException>(() => mt.DichVu.DangNhapAsync("nhanvien1", MoiTruongThu.MatKhauNV));

        Assert.Equal(StatusCodes.Status423Locked, loi.MaTrangThai);
        Assert.Equal(2, mt.GuiOtp.DaGui.Count);
    }

    [Fact]
    public async Task Nhap_dung_OTP_trong_5_phut_thi_mo_khoa()  // 5.c.3–5.c.5, BR07
    {
        using var mt = new MoiTruongThu();
        await KhoaTaiKhoan(mt);
        mt.DongHo.Tien(TimeSpan.FromMinutes(4));

        await mt.DichVu.MoKhoaAsync("nhanvien1", mt.GuiOtp.DaGui[^1].Ma);

        var nd = mt.Lay("NV001");
        Assert.Equal(TrangThaiTaiKhoan.HoatDong, nd.TrangThai);
        Assert.Equal(0, nd.SoLanNhapSai);
        await mt.DichVu.DangNhapAsync("nhanvien1", MoiTruongThu.MatKhauNV);
    }

    [Fact]
    public async Task Qua_5_phut_thi_OTP_het_han_tai_khoan_van_khoa()  // 5.e
    {
        using var mt = new MoiTruongThu();
        await KhoaTaiKhoan(mt);
        mt.DongHo.Tien(TimeSpan.FromMinutes(5) + TimeSpan.FromSeconds(1));

        await Assert.ThrowsAsync<LoiNghiepVuException>(() => mt.DichVu.MoKhoaAsync("nhanvien1", mt.GuiOtp.DaGui[^1].Ma));
        Assert.Equal(TrangThaiTaiKhoan.KhoaTam, mt.Lay("NV001").TrangThai);
    }

    [Fact]
    public async Task Gui_lai_OTP_thi_ma_cu_mat_hieu_luc()
    {
        using var mt = new MoiTruongThu();
        await KhoaTaiKhoan(mt);
        var maCu = mt.GuiOtp.DaGui[^1].Ma;
        await Assert.ThrowsAsync<LoiNghiepVuException>(() => mt.DichVu.DangNhapAsync("nhanvien1", MoiTruongThu.MatKhauNV));
        var maMoi = mt.GuiOtp.DaGui[^1].Ma;

        if (maCu != maMoi)
            await Assert.ThrowsAsync<LoiNghiepVuException>(() => mt.DichVu.MoKhoaAsync("nhanvien1", maCu));
        await mt.DichVu.MoKhoaAsync("nhanvien1", maMoi);
    }

    [Fact]
    public async Task Tai_khoan_ngung_hoat_dong_khong_dang_nhap_duoc()  // UC_2.4 BR04
    {
        using var mt = new MoiTruongThu();
        var nv = mt.Lay("NV001");
        nv.TrangThai = TrangThaiTaiKhoan.NgungHoatDong;
        mt.Db.Update(nv);
        await mt.Db.SaveChangesAsync();

        var loi = await Assert.ThrowsAsync<LoiNghiepVuException>(() => mt.DichVu.DangNhapAsync("nhanvien1", MoiTruongThu.MatKhauNV));
        Assert.Equal(StatusCodes.Status401Unauthorized, loi.MaTrangThai);
    }

    [Fact]
    public async Task Moi_lan_dang_nhap_deu_ghi_nhat_ky()  // NFR Security-06
    {
        using var mt = new MoiTruongThu();
        await mt.DichVu.DangNhapAsync("chuquan", MoiTruongThu.MatKhauCQ);
        await Assert.ThrowsAsync<LoiNghiepVuException>(() => mt.DichVu.DangNhapAsync("chuquan", "sai12345"));

        var hanhDong = mt.Db.NhatKyThaoTac.Select(x => x.HanhDong).ToList();
        Assert.Contains("Đăng nhập", hanhDong);
        Assert.Contains("Đăng nhập thất bại", hanhDong);
        Assert.DoesNotContain(mt.Db.NhatKyThaoTac.ToList(), x => (x.DuLieuMoi ?? "").Contains("$2"));  // không lộ hash mật khẩu
    }

    internal static async Task KhoaTaiKhoan(MoiTruongThu mt)
    {
        for (var i = 0; i < 10; i++)
            await Assert.ThrowsAsync<LoiNghiepVuException>(() => mt.DichVu.DangNhapAsync("nhanvien1", "sai12345"));
    }

    internal static Guid LayMaPhien(MoiTruongThu mt) => mt.Db.PhienDangNhap.OrderByDescending(p => p.ThoiDiemTao).First().MaPhien;
}

/// <summary>UC_2.3 Đổi mật khẩu, UC_11 Đăng xuất.</summary>
public class DoiMatKhauVaDangXuatTests
{
    private const string MoiHopLe = "MatKhauMoi1";

    [Fact]
    public async Task Bo_trong_bao_vui_long_nhap_day_du()  // 4a
    {
        using var mt = new MoiTruongThu();
        var loi = await Assert.ThrowsAsync<LoiNghiepVuException>(() => mt.DichVu.DoiMatKhauAsync("NV001", "", " ", null));
        Assert.Equal(3, loi.Loi!.Count);
        Assert.All(loi.Loi.Values, v => Assert.Equal("Vui lòng nhập đầy đủ thông tin", v));
    }

    [Theory]
    [InlineData("sai12345", MoiHopLe, MoiHopLe, "matKhauHienTai", "Mật khẩu hiện tại không chính xác")]     // 4b
    [InlineData(MoiTruongThu.MatKhauNV, "ngan1", "ngan1", "matKhauMoi", "Mật khẩu không đúng quy tắc")]      // 4c
    [InlineData(MoiTruongThu.MatKhauNV, MoiHopLe, "Khac12345", "xacNhanMatKhauMoi", "Mật khẩu xác nhận không khớp")] // 4d
    [InlineData(MoiTruongThu.MatKhauNV, MoiTruongThu.MatKhauNV, MoiTruongThu.MatKhauNV, "matKhauMoi", "Mật khẩu mới phải khác mật khẩu hiện tại")] // 4e
    public async Task Cac_luong_ngoai_le(string hienTai, string moi, string xacNhan, string truong, string thongBao)
    {
        using var mt = new MoiTruongThu();
        var loi = await Assert.ThrowsAsync<LoiNghiepVuException>(() => mt.DichVu.DoiMatKhauAsync("NV001", hienTai, moi, xacNhan));
        Assert.Equal(thongBao, loi.Loi![truong]);
    }

    [Fact]
    public async Task Doi_thanh_cong_thi_dang_xuat_moi_phien_va_dang_nhap_bang_mat_khau_moi()  // BR06
    {
        using var mt = new MoiTruongThu();
        await mt.DichVu.DangNhapAsync("nhanvien1", MoiTruongThu.MatKhauNV);
        await mt.DichVu.DangNhapAsync("nhanvien1", MoiTruongThu.MatKhauNV);   // 2 phiên (2 máy)

        await mt.DichVu.DoiMatKhauAsync("NV001", MoiTruongThu.MatKhauNV, MoiHopLe, MoiHopLe);

        foreach (var p in mt.Db.PhienDangNhap.ToList())
            Assert.False(await mt.DichVu.PhienConHieuLucAsync(p.MaPhien));
        await Assert.ThrowsAsync<LoiNghiepVuException>(() => mt.DichVu.DangNhapAsync("nhanvien1", MoiTruongThu.MatKhauNV));
        await mt.DichVu.DangNhapAsync("nhanvien1", MoiHopLe);
    }

    [Fact]
    public async Task Sai_mat_khau_hien_tai_5_lan_khoa_doi_mat_khau_15_phut()  // màn hình 2.4.9, 2.4.10
    {
        using var mt = new MoiTruongThu();
        for (var i = 0; i < 4; i++)
            await Assert.ThrowsAsync<LoiNghiepVuException>(() => mt.DichVu.DoiMatKhauAsync("NV001", "sai12345", MoiHopLe, MoiHopLe));

        var lan5 = await Assert.ThrowsAsync<LoiNghiepVuException>(() => mt.DichVu.DoiMatKhauAsync("NV001", "sai12345", MoiHopLe, MoiHopLe));
        Assert.Equal(StatusCodes.Status423Locked, lan5.MaTrangThai);
        Assert.StartsWith("Bạn đã nhập sai mật khẩu 5 lần liên tiếp", lan5.Message);

        // Đang khóa: kể cả nhập đúng cũng bị chặn.
        var dangKhoa = await Assert.ThrowsAsync<LoiNghiepVuException>(() =>
            mt.DichVu.DoiMatKhauAsync("NV001", MoiTruongThu.MatKhauNV, MoiHopLe, MoiHopLe));
        Assert.Equal("Chức năng đổi mật khẩu đang bị khóa trong 15 phút.", dangKhoa.Message);
        Assert.True((await mt.DichVu.LayTrangThaiDoiMatKhauAsync("NV001")).BiKhoa);

        // Hết 15 phút thì đổi được.
        mt.DongHo.Tien(TimeSpan.FromMinutes(15) + TimeSpan.FromSeconds(1));
        await mt.DichVu.DoiMatKhauAsync("NV001", MoiTruongThu.MatKhauNV, MoiHopLe, MoiHopLe);
    }

    [Fact]
    public async Task Dang_xuat_thu_hoi_phien_hien_tai()  // UC_11
    {
        using var mt = new MoiTruongThu();
        var kq = await mt.DichVu.DangNhapAsync("chuquan", MoiTruongThu.MatKhauCQ);
        var maPhien = DangNhapTests.LayMaPhien(mt);

        await mt.DichVu.DangXuatAsync(maPhien, null);

        Assert.False(await mt.DichVu.PhienConHieuLucAsync(maPhien));
        await Assert.ThrowsAsync<LoiNghiepVuException>(() => mt.DichVu.LamMoiAsync(kq.RefreshToken));
    }

    [Fact]
    public async Task Lam_moi_token_xoay_vong_refresh_token()
    {
        using var mt = new MoiTruongThu();
        var kq = await mt.DichVu.DangNhapAsync("chuquan", MoiTruongThu.MatKhauCQ);

        var moi = await mt.DichVu.LamMoiAsync(kq.RefreshToken);

        Assert.NotEqual(kq.RefreshToken, moi.RefreshToken);
        await Assert.ThrowsAsync<LoiNghiepVuException>(() => mt.DichVu.LamMoiAsync(kq.RefreshToken)); // token cũ hết dùng được
    }
}
