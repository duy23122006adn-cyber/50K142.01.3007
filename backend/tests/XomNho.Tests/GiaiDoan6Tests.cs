using Microsoft.AspNetCore.Http;
using XomNho.Api.CaLam;
using XomNho.Api.Common;
using XomNho.Api.Domain;

namespace XomNho.Tests;

/// <summary>UC_9.1 Lưu biên bản, UC_9.2 Xem biên bản.</summary>
public class KetCaTests
{
    /// <summary>Nước cam: LO-000001 (50, HSD +30 ngày), LO-000002 (20, HSD +200 ngày). Ca mở bởi NV001.</summary>
    private static async Task<(MoiTruongThu Mt, string MaCa)> CoCaAsync()
    {
        var mt = new MoiTruongThu();
        await mt.ThemHangAsync("Nước cam");
        await mt.ThemLoAsync("Nước cam", 50, 30);
        await mt.ThemLoAsync("Nước cam", 20, 200);
        mt.DangNhapLa("NV001");
        var ca = await mt.DvCa().DamBaoCaMoAsync("NV001", default);
        return (mt, ca.MaCa);
    }

    private static YeuCauLuuBienBan Luu(string maCa, params (string MaHH, int ThucTe, string? NguyenNhan)[] dong) =>
        new(maCa, dong.Select(d => new DongNhapKiemKe(d.MaHH, d.ThucTe, d.NguyenNhan)).ToList());

    [Fact]
    public async Task Bat_dau_ket_ca_khoa_giao_dich_huy_thi_mo_lai()  // BR07, 6a
    {
        var (mt, maCa) = await CoCaAsync();
        using var _ = mt;
        var bb = await mt.DvKetCa().BatDauAsync(new YeuCauMaCa(maCa), default);
        Assert.Equal(TrangThaiCa.DangKetCa, bb.TrangThaiCa);
        Assert.Equal((70, 70, 0), (bb.Dong.Single().SoLuongLyThuyet, bb.Dong.Single().SoLuongThucTe, bb.Dong.Single().ChenhLech));

        var loi = await Assert.ThrowsAsync<LoiNghiepVuException>(() => mt.BanAsync(null, ("HH-0001", 1)));
        Assert.Equal(DichVuCa.DangKetCa, loi.Message);
        await Assert.ThrowsAsync<LoiNghiepVuException>(() => mt.ThemLoAsync("Nước cam", 5, 100));

        await mt.DvKetCa().HuyAsync(new YeuCauMaCa(maCa), default);
        Assert.Equal(TrangThaiCa.DangHoatDong, (await mt.DvKetCa().HienTaiAsync(default))!.TrangThaiCa);
        await mt.BanAsync(null, ("HH-0001", 1)); // giao dịch được tiếp tục
    }

    [Fact]
    public async Task Ton_ly_thuyet_tinh_ca_giao_dich_trong_ca()  // BR08
    {
        var (mt, maCa) = await CoCaAsync();
        using var _ = mt;
        await mt.BanAsync(null, ("HH-0001", 4));
        var bb = await mt.DvKetCa().BatDauAsync(new YeuCauMaCa(maCa), default);
        Assert.Equal(66, bb.Dong.Single().SoLuongLyThuyet);
    }

    [Fact]
    public async Task Luu_khong_chenh_lech_ket_thuc_ca_va_ca_sau_tu_mo()  // bước 8–11, 3a, BR05
    {
        var (mt, maCa) = await CoCaAsync();
        using var _ = mt;
        await mt.DvKetCa().BatDauAsync(new YeuCauMaCa(maCa), default);
        mt.DongHo.Tien(TimeSpan.FromHours(8));
        var bb = await mt.DvKetCa().LuuAsync(Luu(maCa), default);

        Assert.Equal("BB-10112026-001", bb.MaBB);
        Assert.Equal((TrangThaiCa.DaKetThuc, false, new TimeOnly(16, 0)), (bb.TrangThaiCa, bb.CoChenhLech, bb.GioKetThuc));
        Assert.Equal("NV001", bb.MaNguoiKetCa);
        Assert.Null(await mt.DvKetCa().HienTaiAsync(default));

        await mt.BanAsync(null, ("HH-0001", 1)); // giao dịch mới tự mở ca mới
        var caMoi = (await mt.DvKetCa().HienTaiAsync(default))!;
        Assert.NotEqual(maCa, caMoi.MaCa);
    }

    [Fact]
    public async Task Chenh_lech_bat_buoc_nguyen_nhan_va_phan_vao_lo_theo_Q11()  // 7a, BR02, BR06, BR08, Q11
    {
        var (mt, maCa) = await CoCaAsync();
        using var _ = mt;
        await mt.DvKetCa().BatDauAsync(new YeuCauMaCa(maCa), default);

        var loi = await Assert.ThrowsAsync<LoiNghiepVuException>(() => mt.DvKetCa().LuuAsync(Luu(maCa, ("HH-0001", 67, "  ")), default));
        Assert.Equal(DichVuKetCa.ThieuNguyenNhan, loi.Loi!["nguyenNhan.HH-0001"]);
        Assert.Equal(TrangThaiCa.DangKetCa, (await mt.DvKetCa().HienTaiAsync(default))!.TrangThaiCa); // không lưu gì

        // Thiếu 3 → trừ lô HSD gần nhất (LO-000001).
        var bb = await mt.DvKetCa().LuuAsync(Luu(maCa, ("HH-0001", 67, "Thiếu 3 chai khi kiểm kê")), default);
        Assert.True(bb.CoChenhLech);
        Assert.Equal((70, 67, -3, "Thiếu 3 chai khi kiểm kê"), (bb.Dong[0].SoLuongLyThuyet, bb.Dong[0].SoLuongThucTe, bb.Dong[0].ChenhLech, bb.Dong[0].NguyenNhan));
        Assert.Equal((47, 20), (mt.Ton("LO-000001"), mt.Ton("LO-000002")));
    }

    [Fact]
    public async Task Thua_hang_cong_vao_lo_HSD_xa_nhat_thieu_nhieu_tru_qua_nhieu_lo()  // Q11
    {
        var (mt, maCa) = await CoCaAsync();
        using var _ = mt;
        await mt.DvKetCa().BatDauAsync(new YeuCauMaCa(maCa), default);
        await mt.DvKetCa().LuuAsync(Luu(maCa, ("HH-0001", 72, "Thừa 2 chai")), default);
        Assert.Equal((50, 22), (mt.Ton("LO-000001"), mt.Ton("LO-000002")));

        var ca2 = await mt.DvCa().DamBaoCaMoAsync("NV001", default);
        await mt.DvKetCa().BatDauAsync(new YeuCauMaCa(ca2.MaCa), default);
        await mt.DvKetCa().LuuAsync(Luu(ca2.MaCa, ("HH-0001", 10, "Vỡ thùng")), default);
        Assert.Equal((0, 10), (mt.Ton("LO-000001"), mt.Ton("LO-000002")));
        Assert.Contains(mt.Db.CanhBaoTonKho, c => c.MaLo == "LO-000001" && c.LoaiCanhBao == LoaiCanhBao.HetHang); // cảnh báo theo tồn mới
    }

    [Fact]
    public async Task Khong_luu_bien_ban_thu_hai_va_phai_dang_ket_ca()  // 8a, pre-condition
    {
        var (mt, maCa) = await CoCaAsync();
        using var _ = mt;
        var loi = await Assert.ThrowsAsync<LoiNghiepVuException>(() => mt.DvKetCa().LuuAsync(Luu(maCa), default));
        Assert.Equal(StatusCodes.Status409Conflict, loi.MaTrangThai);

        await mt.DvKetCa().BatDauAsync(new YeuCauMaCa(maCa), default);
        await mt.DvKetCa().LuuAsync(Luu(maCa), default);
        loi = await Assert.ThrowsAsync<LoiNghiepVuException>(() => mt.DvKetCa().LuuAsync(Luu(maCa), default));
        Assert.Equal(DichVuKetCa.CaDaKetThuc, loi.Message);
        Assert.Single(mt.Db.BienBanKetCa);
    }

    [Fact]
    public async Task Xem_bien_ban_nhan_vien_chi_xem_ca_minh_ket_chi_tiet_chi_dong_chenh()  // UC_9.2 BR01, BR03, BR08, 6a, 7a
    {
        var (mt, maCa) = await CoCaAsync();
        using var _ = mt;
        await mt.ThemHangAsync("Nước táo");
        await mt.ThemLoAsync("Nước táo", 10, 100);
        mt.DangNhapLa("CQ001");
        await mt.DvKetCa().BatDauAsync(new YeuCauMaCa(maCa), default);
        var bbCq = await mt.DvKetCa().LuuAsync(Luu(maCa, ("HH-0001", 69, "Thiếu 1")), default);

        mt.DongHo.Tien(TimeSpan.FromHours(1));
        mt.DangNhapLa("NV001");
        var ca2 = await mt.DvCa().DamBaoCaMoAsync("NV001", default);
        await mt.DvKetCa().BatDauAsync(new YeuCauMaCa(ca2.MaCa), default);
        var bbNv = await mt.DvKetCa().LuuAsync(Luu(ca2.MaCa), default);

        Assert.Equal([bbNv.MaBB], (await mt.DvKetCa().DanhSachAsync(null, null, false, default)).Select(b => b.MaBB));
        var loi = await Assert.ThrowsAsync<LoiNghiepVuException>(() => mt.DvKetCa().ChiTietAsync(bbCq.MaBB, true, default));
        Assert.Equal((StatusCodes.Status403Forbidden, "Bạn không có quyền xem biên bản này"), (loi.MaTrangThai, loi.Message));
        Assert.Empty((await mt.DvKetCa().ChiTietAsync(bbNv.MaBB, true, default)).Dong); // "Ca này không có chênh lệch"

        mt.DangNhapLa("CQ001");
        var ds = await mt.DvKetCa().DanhSachAsync(null, null, false, default);
        Assert.Equal([bbNv.MaBB, bbCq.MaBB], ds.Select(b => b.MaBB)); // mới nhất trước
        Assert.Equal([bbCq.MaBB], (await mt.DvKetCa().DanhSachAsync(null, null, true, default)).Select(b => b.MaBB));
        var ct = await mt.DvKetCa().ChiTietAsync(bbCq.MaBB, true, default);
        Assert.Equal("HH-0001", ct.Dong.Single().MaHH); // chỉ dòng chênh lệch, không có Nước táo
    }

    [Fact]
    public async Task Loc_tu_ngay_lon_hon_den_ngay_bao_loi()  // UC_9.2 3a
    {
        using var mt = new MoiTruongThu();
        var loi = await Assert.ThrowsAsync<LoiNghiepVuException>(() =>
            mt.DvKetCa().DanhSachAsync("2026-11-06", "2026-11-05", false, default));
        Assert.Equal("Từ ngày không được lớn hơn đến ngày", loi.Loi!["tuNgay"]);
        Assert.Empty(await mt.DvKetCa().DanhSachAsync("2026-11-01", "2026-11-02", false, default));
    }
}
